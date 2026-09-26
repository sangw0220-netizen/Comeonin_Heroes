"use strict";
"use strict";

// ===== Supabase / online player & result integration (Google 로그인 필수) =====
const DUNGEON_NICKNAME_KEY='dungeon_defense_nickname_v1'; // 화면 표시용 캐시일 뿐, 신원 판별에는 사용하지 않습니다.
const DEFAULT_NICKNAME='이름없는 마왕';
let supabaseClient=null;
let currentPlayerId=null;   // Supabase Auth user.id (uuid) — 이제 이것이 곧 플레이어 식별자입니다.
let currentNickname='';
let supabaseReady=false;
let debugModeActive=false;  // ?test=1 화면에서 "디버그 모드로 시작"을 눌렀을 때 true
// true면 이번 세션은 "테스트로 바로 시작" 또는 "디버그 모드로 시작"으로 들어온 세션입니다.
// 이 경우 영구 성장(마왕의 성장)은 메모리 위에서만 존재하고, localStorage에도 Supabase에도
// 저장되지 않습니다 — 즉 탭을 닫거나 새로고침하면 그냥 사라집니다.
// (?test=1이 URL에 붙어있어도, 실제로 Google 로그인으로 시작했다면 이 값은 false입니다.)
let isLocalOnlySession=false;
let authListenerBound=false;
let pendingAutoStart=false; // 로그인 모달이 떠 있는 상태에서 로그인이 완료되면 자동으로 게임을 시작할지 여부

function initSupabase(){
  try{
    const url=window.DUNGEON_SUPABASE_URL||'';
    const key=window.DUNGEON_SUPABASE_PUBLISHABLE_KEY||'';
    if(!url || !key || key.includes('PASTE_YOUR_')){
      console.warn('[Supabase] Publishable Key is not configured.');
      return false;
    }
    if(!window.supabase || typeof window.supabase.createClient!=='function'){
      console.warn('[Supabase] CDN library was not loaded.');
      return false;
    }
    // persistSession: 로그인 세션을 브라우저에 저장해서, 다음에 같은 주소로 다시 접속하면
    //                 로그인 없이 자동으로 이어지도록 합니다.
    // autoRefreshToken: 세션이 만료되기 전에 자동으로 갱신합니다.
    supabaseClient=window.supabase.createClient(url,key,{
      auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
    supabaseReady=true;
    return true;
  }catch(err){
    console.warn('[Supabase] initialization failed:',err);
    supabaseClient=null;
    supabaseReady=false;
    return false;
  }
}

function normalizeNickname(value){
  return String(value||'').replace(/\s+/g,' ').trim().slice(0,12);
}

// 로그인된 Google 계정(user)을 바탕으로 players 테이블에 등록/조회하고
// currentPlayerId / currentNickname을 채웁니다. player_id = Supabase Auth user.id 입니다.
async function handleAuthSession(session){
  const user=session && session.user;
  if(!user) return null;
  currentPlayerId=user.id;
  isLocalOnlySession=false; // 실제 Google 로그인 세션: 영구 성장은 Supabase 계정 기준으로 동작
  debugModeActive=false;

  const meta=user.user_metadata||{};
  const googleName=normalizeNickname(meta.full_name||meta.name||(user.email?user.email.split('@')[0]:''));

  let nickname='';
  try{
    const {data,error}=await supabaseClient
      .from('players')
      .select('nickname')
      .eq('player_id',user.id)
      .maybeSingle();
    if(!error && data && data.nickname) nickname=normalizeNickname(data.nickname);
  }catch(err){
    console.warn('[Supabase] player lookup failed:',err);
  }

  // 예전에 구글 프로필 이름을 못 가져와 기본값('이름없는 마왕')으로 저장됐던 경우,
  // 지금 구글 이름을 가져올 수 있다면 자동으로 다시 채워 넣습니다.
  const needsSync = (!nickname || nickname==='이름없는 마왕' || nickname==='이름없는마왕') && googleName;
  if(needsSync || !nickname){
    nickname=googleName||DEFAULT_NICKNAME;
    try{
      const {error}=await supabaseClient
        .from('players')
        .upsert({player_id:user.id,nickname},{onConflict:'player_id'});
      if(error) console.warn('[Supabase] player upsert failed:',error);
    }catch(err){
      console.warn('[Supabase] player upsert failed:',err);
    }
  }

  currentNickname=nickname;
  try{ localStorage.setItem(DUNGEON_NICKNAME_KEY,nickname); }catch(_){}
  await syncMetaFromSupabase();
  await loadMawangFromSupabase();
  return {playerId:currentPlayerId,nickname:currentNickname};
}

async function saveGameResultToSupabase(wave,score,playTime){
  // 게스트/테스트/디버그 판은 온라인 랭킹과 Supabase 기록에 절대 반영하지 않습니다.
  if(isLocalOnlySession || debugModeActive) return {saved:false,reason:'local-only'};
  if(!currentPlayerId || !supabaseReady || !supabaseClient) return {saved:false,reason:'offline'};
  try{
    const {error}=await supabaseClient.from('game_results').insert({
      player_id:currentPlayerId,
      wave:Math.max(0,Math.floor(Number(wave)||0)),
      score:Math.max(0,Math.floor(Number(score)||0)),
      play_time:Math.max(0,Math.floor(Number(playTime)||0))
    });
    if(error) throw error;
    return {saved:true};
  }catch(err){
    console.warn('[Supabase] game result save failed:',err);
    return {saved:false,reason:'error',error:err};
  }
}

function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function formatPlayTime(sec){
  const s=Math.max(0,Math.floor(Number(sec)||0));
  return `${Math.floor(s/60)}분 ${String(s%60).padStart(2,'0')}초`;
}

const RANKING_LIMIT=20;

// game_results에서 점수 상위 기록을 가져와 players와 조인해 닉네임까지 붙입니다.
// 각 플레이어의 "최고 기록"만 보여주기 위해, 가져온 뒤 player_id 기준으로 1건씩만 남깁니다.
async function fetchRanking(){
  if(!supabaseReady) initSupabase();
  if(!supabaseReady || !supabaseClient) return {ok:false,reason:'offline',rows:[]};
  try{
    const {data,error}=await supabaseClient
      .from('game_results')
      .select('player_id,wave,score,play_time,players(nickname)')
      .order('score',{ascending:false})
      .limit(200);
    if(error) throw error;

    const bestByPlayer=new Map();
    for(const row of (data||[])){
      const pid=row.player_id;
      const prev=bestByPlayer.get(pid);
      if(!prev || row.score>prev.score) bestByPlayer.set(pid,row);
    }
    const rows=Array.from(bestByPlayer.values())
      .sort((a,b)=>b.score-a.score)
      .slice(0,RANKING_LIMIT)
      .map(row=>({
        playerId:row.player_id,
        nickname:(row.players&&row.players.nickname)?row.players.nickname:DEFAULT_NICKNAME,
        score:row.score,
        wave:row.wave,
        playTime:row.play_time
      }));
    return {ok:true,rows};
  }catch(err){
    console.warn('[Supabase] ranking fetch failed:',err);
    return {ok:false,reason:'error',error:err,rows:[]};
  }
}

async function openRankingScreen(){
  const overlay=document.getElementById('rankingOverlay');
  const status=document.getElementById('rankingStatus');
  const list=document.getElementById('rankingList');
  if(!overlay||!list) return;

  overlay.classList.remove('hidden');
  list.innerHTML='';
  if(status){status.textContent='랭킹을 불러오는 중…';status.className='ranking-status';}

  const {ok,rows,reason}=await fetchRanking();

  if(!ok){
    if(status){
      status.textContent=reason==='offline'
        ? '온라인 랭킹 기능이 아직 설정되지 않았습니다.'
        : '랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      status.className='ranking-status';
    }
    return;
  }

  if(status) status.textContent='';

  if(!rows.length){
    list.innerHTML='<div class="ranking-empty">아직 등록된 기록이 없습니다. 첫 번째 랭커가 되어보세요!</div>';
    return;
  }

  list.innerHTML=rows.map((row,i)=>{
    const mine=currentPlayerId && row.playerId===currentPlayerId;
    return `<div class="ranking-row${mine?' me':''}">
      <div class="ranking-rank">${i+1}</div>
      <div class="ranking-name">👑 ${escapeHtml(row.nickname)}</div>
      <div class="ranking-stats"><b>${row.score.toLocaleString()}점</b><br>웨이브 ${row.wave} · ${formatPlayTime(row.playTime)}</div>
    </div>`;
  }).join('');
}

function closeRankingScreen(){
  const overlay=document.getElementById('rankingOverlay');
  if(overlay) overlay.classList.add('hidden');
}

const rankingCloseBtn=document.getElementById('rankingCloseBtn');
if(rankingCloseBtn) rankingCloseBtn.addEventListener('click',closeRankingScreen);

function wireAuthListener(){
  if(authListenerBound || !supabaseReady) return;
  authListenerBound=true;
  supabaseClient.auth.onAuthStateChange(async (event,session)=>{
    if(event==='SIGNED_IN' && session){
      const status=document.getElementById('nicknameStatus');
      if(status){status.textContent='로그인 확인 중…';status.className='nickname-status';}
      const result=await handleAuthSession(session);
      if(pendingAutoStart && result){
        pendingAutoStart=false;
        closeNicknameScreen();
        startGame();
      }
    }else if(event==='SIGNED_OUT'){
      currentPlayerId=null;
      currentNickname='';
      metaSyncEnabled=false;
      if(metaSyncTimer){ clearTimeout(metaSyncTimer); metaSyncTimer=null; }
    }
  });
}

async function signInWithGoogle(){
  const btn=document.getElementById('googleLoginBtn');
  const status=document.getElementById('nicknameStatus');
  if(!supabaseReady && !initSupabase()){
    if(status){status.textContent='온라인 로그인 기능이 아직 설정되지 않았습니다.';status.className='nickname-status error';}
    return;
  }
  wireAuthListener();
  pendingAutoStart=true;
  if(btn) btn.disabled=true;
  if(status){status.textContent='Google 로그인 창으로 이동합니다…';status.className='nickname-status';}
  const {error}=await supabaseClient.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:window.location.href}
  });
  if(error){
    pendingAutoStart=false;
    if(btn) btn.disabled=false;
    if(status){status.textContent='로그인에 실패했습니다: '+error.message;status.className='nickname-status error';}
  }
}

// startBtn / restartBtn 클릭 시 호출됩니다.
// 이미 로그인되어 있으면 로그인 화면 없이 바로 게임을 시작하고,
// 로그인되어 있지 않으면 Google 로그인 모달을 띄웁니다.
// 테스트용: 주소 끝에 ?test=1 을 붙여서 열면 로그인 없이 바로 시작할 수 있는 버튼이 나타납니다.
// (일반 플레이어에게는 절대 보이지 않습니다. 이 모드로 낸 점수는 온라인 랭킹에 저장되지 않습니다.)
function isTestMode(){
  try{ return new URLSearchParams(location.search).get('test')==='1'; }catch(_){ return false; }
}

function guestStart(){
  // 로그인 없이 즐기는 일회성 플레이.
  // 영혼/마왕의 성장은 이번 탭의 메모리에만 유지되며
  // localStorage / Supabase / 랭킹에는 저장하지 않습니다.
  debugModeActive=false;
  isLocalOnlySession=true;
  metaSyncEnabled=false;
  if(metaSyncTimer){ clearTimeout(metaSyncTimer); metaSyncTimer=null; }
  metaProgress=normalizeMetaData(null);
  resetMawangForLocalSession();
  currentPlayerId=null;
  currentNickname='게스트 마왕';
  closeNicknameScreen();
  startGame();
}

function testStart(){
  isLocalOnlySession=true; // 테스트 세션: 영구 성장은 메모리에만, 탭 닫으면 소멸
  metaSyncEnabled=false;
  metaProgress=normalizeMetaData(null); // 계정 캐시를 물려받지 않고 항상 빈 상태로 시작
  resetMawangForLocalSession();
  currentPlayerId='test-'+Math.random().toString(36).slice(2,10);
  currentNickname='테스트 마왕';
  closeNicknameScreen();
  startGame();
}

// 테스트 모드에서만 노출되는 디버그 모드 진입: 로그인 없이 바로 시작하면서
// 상단 툴바에 디버그(🐞) 버튼을 활성화합니다. 랭킹에도, 영구 성장(영혼)에도 반영되지 않습니다.
function debugStart(){
  debugModeActive=true;
  isLocalOnlySession=true; // 디버그 세션: 영구 성장은 메모리에만, 탭 닫으면 소멸
  metaSyncEnabled=false;
  metaProgress=normalizeMetaData(null); // 계정 캐시를 물려받지 않고 항상 빈 상태로 시작
  resetMawangForLocalSession();
  currentPlayerId='debug-'+Math.random().toString(36).slice(2,10);
  currentNickname='디버그 마왕';
  closeNicknameScreen();
  startGame();
  if(els.debugBtn) els.debugBtn.style.display='flex';
}

async function attemptStart(){
  if(currentPlayerId){ if(!mawangLoaded) await loadMawangFromSupabase(); startGame(); return; }
  if(!supabaseReady) initSupabase();
  wireAuthListener();

  if(supabaseReady){
    try{
      const {data,error}=await supabaseClient.auth.getSession();
      if(!error && data && data.session){
        const result=await handleAuthSession(data.session);
        if(result){ startGame(); return; }
      }
    }catch(err){
      console.warn('[Supabase] session check failed:',err);
    }
  }
  openNicknameScreen();
}

function openNicknameScreen(){
  const overlay=document.getElementById('nicknameOverlay');
  const status=document.getElementById('nicknameStatus');
  const btn=document.getElementById('googleLoginBtn');
  const testBtn=document.getElementById('testSkipBtn');
  const debugBtnLogin=document.getElementById('debugSkipBtn');
  if(!overlay) return startGame();

  if(status){
    status.textContent=supabaseReady
      ? '계속하려면 Google 계정으로 로그인해주세요.'
      : '온라인 로그인 기능이 아직 설정되지 않았습니다.';
    status.className='nickname-status'+(supabaseReady?'':' error');
  }
  if(btn) btn.disabled=!supabaseReady;
  if(testBtn) testBtn.style.display=isTestMode()?'block':'none';
  if(debugBtnLogin) debugBtnLogin.style.display=isTestMode()?'block':'none';
  overlay.classList.remove('hidden');
}

function closeNicknameScreen(){
  const overlay=document.getElementById('nicknameOverlay');
  if(overlay) overlay.classList.add('hidden');
}

document.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'){
    const mg=document.getElementById('metaGrowthOverlay');
    if(mg && !mg.classList.contains('hidden')) closeMetaGrowth();
  }
});

initSupabase();
wireAuthListener();
// v27 ALTAR SYSTEM: gold sink / weighted random rewards / build mutation

const BASE_GRID=15;
let GRID=BASE_GRID;
let CORE_R=8, CORE_C=8;
let ENTRANCES=[];
let currentCellPx=12;

const TICK_MS=200; // v38.6: 논리 시뮬레이션 1스텝 길이(ms). 이동/공격/경직 등 모든 밸런스의 기준값입니다.
                   //        배속은 "스텝을 더 자주 돌리는" 방식으로만 처리하며, 한 프레임에 2스텝 이상은 진행하지 않습니다.
const DIG_COST=8;
const WALL_DIG_COST=5;
const BUILD_TIME=60;
// v26 밸런스 패스: 초반은 여유 있게, 후반은 준비 시간을 조금씩 줄여 반복 피로를 낮춥니다.
function buildTimeForWave(wave){
  const w=Math.max(1,wave||1);
  if(w<=5) return BUILD_TIME;
  if(w<=15) return 50;
  if(w<=30) return 45;
  return 40;
}
const SPAWN_INTERVAL_START=4.8;
const SPAWN_INTERVAL_MIN=1.5;
const MAX_TIER=99;
const CORE_MAX_HP=180;
const ROCK_WEIGHT=8;
const HERO_DIG_TIME=3.0;
const VISION_RANGE=6;
const REVEAL_RADIUS=2;
/* v40: 게임 시작 시 플레이어가 마력의 핵 위치를 직접 고릅니다.
   - 핵은 CORE_FOOTPRINT_SIZE × CORE_FOOTPRINT_SIZE 공간을 확보해야 합니다.
   - 용사 침입구에서 일정 거리 이상 떨어져야 합니다.
   크기를 바꾸고 싶으면 CORE_FOOTPRINT_SIZE만 수정하면 됩니다. */
const CORE_FOOTPRINT_SIZE=6;                   // 6 = 6×6
/* 짝수 크기는 정확한 중앙이 없으므로, 누른 칸을 기준으로 위/왼쪽에 조금 덜,
   아래/오른쪽에 조금 더 뻗는 방식으로 범위를 잡습니다.
   예) 6일 때 누른 칸 기준 -2 ~ +3 (총 6칸) */
const CORE_OFFSET_LOW=-Math.floor((CORE_FOOTPRINT_SIZE-1)/2);
const CORE_OFFSET_HIGH=CORE_OFFSET_LOW+CORE_FOOTPRINT_SIZE-1;
/* 침입구와 핵 '영역 가장자리' 사이의 최소 거리입니다.
   (영역이 커졌으므로 중심이 아니라 가장자리 기준으로 재야 실제 여유가 보장됩니다.) */
const CORE_MIN_DIST_FROM_ENTRANCE=3;
function coreFootprintCells(r,c){
  const out=[];
  for(let dr=CORE_OFFSET_LOW;dr<=CORE_OFFSET_HIGH;dr++){
    for(let dc=CORE_OFFSET_LOW;dc<=CORE_OFFSET_HIGH;dc++){
      out.push([r+dr,c+dc]);
    }
  }
  return out;
}
/* 핵을 (r,c)에 놓을 수 있는지 판정합니다.
   불가능하면 사유 문자열을, 가능하면 null을 반환합니다. */
function corePlacementBlockReason(r,c){
  if(!state||!state.grid) return '아직 준비 중입니다.';
  const sizeText=`${CORE_FOOTPRINT_SIZE}×${CORE_FOOTPRINT_SIZE}`;
  // 영역이 맵 밖으로 나가면 안 됩니다.
  if(r+CORE_OFFSET_LOW<0||c+CORE_OFFSET_LOW<0||
     r+CORE_OFFSET_HIGH>GRID-1||c+CORE_OFFSET_HIGH>GRID-1){
    return `맵 가장자리에는 놓을 수 없습니다. (${sizeText} 공간 필요)`;
  }
  const spawns=(Array.isArray(state.heroSpawnPoints)&&state.heroSpawnPoints.length)
    ? state.heroSpawnPoints
    : (state.heroSpawnPoint?[state.heroSpawnPoint]:[]);
  const cells=coreFootprintCells(r,c);
  for(const [rr,cc] of cells){
    const t=state.grid[rr]&&state.grid[rr][cc];
    if(!t) return `맵 가장자리에는 놓을 수 없습니다. (${sizeText} 공간 필요)`;
    if(t.isEntrance) return '용사 침입구와 겹칠 수 없습니다.';
  }
  for(const sp of spawns){
    let nearest=Infinity;
    for(const [rr,cc] of cells){
      const d=Math.max(Math.abs(sp.r-rr),Math.abs(sp.c-cc));
      if(d<nearest) nearest=d;
    }
    if(nearest<CORE_MIN_DIST_FROM_ENTRANCE) return '용사 침입구와 너무 가깝습니다.';
  }
  return null;
}
function canPlaceCoreAt(r,c){ return corePlacementBlockReason(r,c)===null; }
let gameSpeed=1;

const AURA_RADIUS=1;
const STATUE_RANGE=2, STATUE_ATK=7, STATUE_COOLDOWN=1.0;
const SPIKE_DMG=16;
const FLAME_DMG=9;
const FLAME_BURN_DPS=2.2;
const LAVA_DPS=5.5; // v72: 용암지대 - 독보다 강한 지속 피해
const POISON_DURATION_MS=5000;
const POISON_TICK_MS=1000;
const LIGHTNING_STUN_CHANCE=0.20;
const LIGHTNING_STUN_MS=1000;
const WEB_STUN_CHANCE=0.20;
const WEB_STUN_MS=1000;
const LIGHTNING_DMG=13;
const LIGHTNING_RANGE=2;
const FROST_STUN_TICKS=3;
const FROST_SLOW_MS=2600;
const WEB_PASS_TIME=1.2;
const BARRICADE_DIG_TIME=5.0;
const POISON_DPS=2;
const PIT_ROOT_MS=2200;
const PIT_DAMAGE=5;
// 개성형 장애물 4종 밸런스 상수
const FLAME_SPRAYER_DMG=18;
const FLAME_SPRAYER_BURN_DPS=4;
const FLAME_SPRAYER_BURN_MS=3000;
const FLAME_SPRAYER_COOLDOWN_MS=4000;
const FLAME_SPRAYER_RANGE=3;
const FLAME_SPRAYER_KNOCK_TILES=1;
const HARPOON_DMG=10;
const HARPOON_PULL_TILES=2;
const HARPOON_COOLDOWN_MS=5000;
const HARPOON_STUN_MS=500;
const HARPOON_RANGE=3;
const HARPOON_REHIT_IMMUNE_MS=3000;
const MIMIC_HOLD_MS=2000;
const MIMIC_TOTAL_DMG=18;
const MIMIC_VULN_MUL=1.20;
const MIMIC_COOLDOWN_MS=7000;
const MIMIC_TICK_MS=500;
const MIMIC_REHIT_IMMUNE_MS=3000;
const RUNE_GATE_OPEN_MS=3000;
const RUNE_GATE_CLOSED_MS=3000;
const RUNE_GATE_STABILITY=3;
const RUNE_GATE_SEAL_DMG=12;
// Legacy aliases retained only for old save/runtime compatibility paths.
const GUST_KNOCK_TILES=FLAME_SPRAYER_KNOCK_TILES;
const MAGNET_PULL_TILES=HARPOON_PULL_TILES;
const MAGNET_PULL_INTERVAL_MS=HARPOON_COOLDOWN_MS;
const STUN_CAGE_MS=MIMIC_HOLD_MS;
const STUN_CAGE_FX_MS=1100;
const BRIDGE_HITS_TO_COLLAPSE=RUNE_GATE_STABILITY;
const BRIDGE_COLLAPSE_DMG=RUNE_GATE_SEAL_DMG;
const CURSE_ATK_MUL=0.78;
const MONSTER_CURSE_ATK_MUL=0.78;
const MONSTER_CURSE_MS=2800;
const HEALER_PULSE_SEC=2.4;
const HEALER_RANGE=2;

const OBSTACLE_SPRITES={
  spike:"assets/images/obstacles/icons/spike.png",
  flame:"assets/images/obstacles/icons/flame.png",
  lightning:"assets/images/obstacles/icons/lightning.png",
  poison:"assets/images/obstacles/icons/poison.png",
  barricade:"assets/images/obstacles/icons/barricade.png",
  pit:"assets/images/obstacles/icons/pit.png",
  statue:"assets/images/obstacles/icons/statue.png",
  frost:"assets/images/obstacles/icons/frost.png",
  web:"assets/images/obstacles/icons/web.png",
  curse:"assets/images/obstacles/icons/curse.png",
  // 리메이크 장애물 자산
  gust:"assets/images/obstacles/remade/gust.png",
  magnet:"assets/images/obstacles/remade/magnet.png",
  stun_cage:"assets/images/obstacles/remade/stun_cage.png",
  stun_cage_alt:"assets/images/obstacles/remade/stun_cage_alt.png",
  collapse_bridge:"assets/images/obstacles/remade/collapse_bridge.png",
  collapse_bridge_alt:"assets/images/obstacles/remade/collapse_bridge_alt.png"
};

const OBSTACLE_LEVEL_MAX=10;
// 레벨 1→10 사이를 선형 보간합니다. lv=1이면 a, lv=10이면 b를 반환하며 중간 레벨도 점진적으로 성능이 오릅니다.
function lerpLv(lv,a,b){ lv=Math.max(1,Math.min(OBSTACLE_LEVEL_MAX,Number(lv)||1)); return a+(lv-1)*(b-a)/(OBSTACLE_LEVEL_MAX-1); }
function obstacleUpgradeCost(ob,currentLevel){ if(!ob||currentLevel>=OBSTACLE_LEVEL_MAX)return Infinity; return Math.max(40,Math.round(ob.cost*(3.0+currentLevel*0.55))); }
// v35 함정 연구소: 함정공학(설치비 감소)·내구 연구(내구도 증가) 공통 연구 효과를 적용한 실제 값입니다.
function obstaclePlaceCost(ob){ return ob?Math.max(1,Math.round(ob.cost*trapEngineeringCostMul())):0; }
function obstacleMaxHpFor(ob,level){ return ob?Math.round(ob.cost*(1+(Math.max(1,level)-1)*0.35)*trapDurabilityMul()):0; }
// v35 함정 연구소 "마왕의 성소"(수호진 연구 Lv.5): 수호진 범위 내 몬스터가 받는 치명적 피해를
// 몬스터당 1회, 최대 HP의 20%에서 생존시킵니다.
function applyStatueSanctuary(m,dmg){
  if(!m || m.statueSanctuarySpent) return dmg;
  if(trapResearchLevel('statue')<5) return dmg;
  if((m.hp-dmg)>0) return dmg;
  const nearStatue=(state.auraPositions?.statue||[]).some(p=>{
    const ot=state.grid[p.r]?.[p.c];
    return Math.abs(p.r-m.r)+Math.abs(p.c-m.c)<=obstacleRange('statue',ot);
  });
  if(!nearStatue) return dmg;
  m.statueSanctuarySpent=true;
  const floorHp=Math.max(1,Math.round(m.maxHp*0.2));
  state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'🛡️성소!',color:'#ffe08a'});
  return Math.max(0,m.hp-floorHp);
}
function obstacleLevel(tile){return Math.max(1,Math.min(OBSTACLE_LEVEL_MAX,Number(tile?.obstacleLevel)||1));}
function obstacleLevelName(lv){return lv>=10?'대악마급':lv>=5?'상급':lv>=3?'강화형':'초급';}
function obstacleSpecialText(id,lv){
  const texts={
    spike:lv>=10?'Lv.10 처형 가시: 체력 30% 이하 용사에게 추가 피해 + 출혈 4초':lv>=5?'Lv.5 파열 가시: 추가 출혈 2초':'Lv.1 기본 가시 피해',
    flame:lv>=10?'Lv.10 용암핵: 밟고 있는 동안 매우 강한 화염 피해':'Lv.1~9 용암지대: 밟고 있는 동안 지속 화염 피해',
    lightning:lv>=10?'Lv.10 천벌 십자진: 십자 영역 전격 피해 · 20% 기절':'십자 영역 전격 피해 · 20% 기절',
    poison:lv>=10?'Lv.10 역병독: 밟으면 5초간 1초마다 강한 독 피해':'밟으면 5초간 1초마다 독 피해',
    barricade:lv>=10?'Lv.10 철벽: 매우 높은 내구도 · 직접 공격으로 파괴':'1×1 철벽: 용사가 직접 공격해 파괴',
    pit:lv>=10?'Lv.10 심연구덩이: 강제 이동으로 빠지면 낙사 · 보스는 큰 피해':'2×2 심연구덩이: 용사가 경로상 회피 · 밀쳐져 닿으면 낙사',
    statue:lv>=10?'Lv.10 수호 대석상: 범위 4칸 · 피해 감소 + 지속 회복':lv>=5?'Lv.5 수호 석상: 범위 3칸 · 방어 강화 + 피해 감소':'Lv.1 주변 몬스터 지원',
    frost:lv>=10?'Lv.10 극빙판: 위에서 이동속도 크게 감소':'Lv.1 빙판: 이동속도 -20% · 레벨에 따라 강화',
    web:lv>=10?'Lv.10 거미둥지: 강한 감속 · 20% 기절 · 기절 시 5초 중독':'2×2 거미둥지: 감속 · 20% 기절 · 기절 시 5초 중독',
    curse:lv>=10?'Lv.10 심연의 토템: 범위 3칸 · 공격력 대폭 감소 + 회복 감소':lv>=5?'Lv.5 저주 성역: 범위 2칸 · 공격력 감소 강화':'Lv.1 기본 공격력 약화'
  }; return texts[id]||'';
}

const OBSTACLE_TYPES=[
  {id:'spike',name:'가시 지옥',icon:'🔺',kind:'attack',cost:50,range:1,color:'rgba(224,73,95,.55)',desc:'바닥에서 날카로운 가시가 솟아나 지나가는 용사에게 큰 피해를 줍니다.',short:'가시 지옥',sprite:OBSTACLE_SPRITES.spike},
  {id:'flame',name:'용암지대',icon:'🌋',kind:'attack',cost:72,range:0,color:'rgba(255,118,92,.55)',desc:'1×1 용암지대입니다. 용사가 위에 서 있는 동안 독늪보다 강한 화염 피해를 지속적으로 받습니다.',short:'용암지대',sprite:OBSTACLE_SPRITES.flame},
  {id:'lightning',name:'낙뢰지옥',icon:'⚡',kind:'attack',cost:90,range:0,color:'rgba(110,190,255,.6)',desc:'십자형 5칸 전격 지대입니다. 범위에 들어온 용사는 전격 피해를 받고 20% 확률로 기절합니다.',short:'낙뢰지옥',sprite:OBSTACLE_SPRITES.lightning},
  {id:'poison',name:'독늪',icon:'☠️',kind:'attack',cost:58,range:0,color:'rgba(120,200,90,.55)',desc:'1×1 독늪입니다. 한 번 밟으면 5초 동안 1초마다 독 피해를 받습니다.',short:'독늪',sprite:OBSTACLE_SPRITES.poison},
  {id:'barricade',name:'철벽',icon:'🛡️',kind:'defense',cost:68,range:0,color:'rgba(190,150,100,.55)',desc:'1×1 철벽입니다. 길을 완전히 막으며 용사는 직접 공격해서 부숴야 합니다. 근처에 몬스터가 있으면 몬스터를 먼저 공격합니다.',short:'철벽',sprite:OBSTACLE_SPRITES.barricade},
  {id:'pit',name:'심연구덩이',icon:'🕳️',kind:'defense',cost:64,range:0,color:'rgba(140,110,220,.55)',desc:'2×2 심연구덩이입니다. 용사는 스스로 피해 지나가며, 넉백이나 밀치기로 구덩이에 닿으면 낙사합니다. 보스 영웅은 낙사하지 않고 큰 피해만 받습니다.',short:'심연구덩이',sprite:OBSTACLE_SPRITES.pit},
  {id:'statue',name:'수호진',icon:'🗿',kind:'defense',cost:110,range:2,color:'rgba(183,107,242,.55)',desc:'바닥에 새겨진 수호 마법진이 주변 몬스터의 방어력과 생존력을 강화합니다.',short:'수호진',sprite:OBSTACLE_SPRITES.statue},
  {id:'frost',name:'빙판',icon:'❄️',kind:'debuff',cost:54,range:0,color:'rgba(102,200,255,.55)',desc:'1×1 빙판입니다. 위를 걷는 용사는 이동속도가 Lv.1 기준 20% 느려지며 레벨이 오를수록 감속이 강해집니다.',short:'빙판',sprite:OBSTACLE_SPRITES.frost},
  {id:'web',name:'거미둥지',icon:'🕸️',kind:'debuff',cost:44,range:0,color:'rgba(210,210,220,.45)',desc:'2×2 거미둥지입니다. 위를 걷는 용사는 느려지며 20% 확률로 기절합니다. 기절한 용사는 5초 동안 독 상태가 됩니다.',short:'거미둥지',sprite:OBSTACLE_SPRITES.web},
  {id:'curse',name:'저주의 밀바닥',icon:'💀',kind:'debuff',cost:72,range:1,color:'rgba(150,60,90,.6)',desc:'범위 안 용사에게 주기적으로 짧은 저주를 걸어 공격력과 회복 효율을 낮춥니다. 저주는 계속 이어지지 않고 재발동 사이에 숨 돌릴 틈이 있습니다.',short:'저주의 밀바닥',sprite:OBSTACLE_SPRITES.curse},
  // 리메이크 장애물
  {id:'gust',name:'화염 분사기',icon:'🔥',kind:'attack',cost:85,range:3,color:'rgba(255,138,74,.58)',desc:'벽 설치형 화염 장치. 입구가 아닌 어느 벽에도 부착할 수 있고 상·하·좌·우 방향을 지정합니다. 지정 방향 직선으로 화염을 뿜어 피해·화상·넉백을 줍니다.',short:'화염 분사기',sprite:OBSTACLE_SPRITES.gust},
  {id:'magnet',name:'사슬 작살탑',icon:'🪝',kind:'debuff',cost:95,range:3,color:'rgba(183,107,242,.6)',desc:'벽 설치형 견인 장치. 입구가 아닌 어느 벽에도 부착할 수 있고 방향을 지정합니다. 지정 방향 직선 사거리 안 영웅을 작살로 맞혀 벽 쪽으로 끌어당기고 경직시킵니다.',short:'사슬 작살탑',sprite:OBSTACLE_SPRITES.magnet},
  {id:'stun_cage',name:'미믹 상자',icon:'📦',kind:'debuff',cost:90,range:0,color:'rgba(224,73,95,.55)',desc:'1×1 포획형 장애물. 밟은 영웅을 물고 고정해 지속 피해를 주며, 붙잡힌 동안 몬스터와 마왕에게 받는 피해가 증가합니다.',short:'미믹 상자',sprite:OBSTACLE_SPRITES.stun_cage,spriteAlt:OBSTACLE_SPRITES.stun_cage_alt},
  {id:'collapse_bridge',name:'봉쇄 룬문',icon:'🌀',kind:'defense',cost:130,range:0,color:'rgba(176,122,255,.55)',desc:'1×1 전장 제어 관문. 전투 중 3초 개방/3초 봉쇄를 반복하며, 영웅이 통과할 때 안정도가 감소해 3회 통과 후 영구 봉인됩니다.',short:'봉쇄 룬문',sprite:OBSTACLE_SPRITES.collapse_bridge,spriteAlt:OBSTACLE_SPRITES.collapse_bridge_alt}
];

/* ==========================================================================
   v61 · 장애물 프레임 애니메이션 (스프라이트 시트)
   sheet  : 프레임을 가로로 이어 붙인 PNG (정사각형 프레임 × frames 장)
   mode   : 'loop'    = 평상시 계속 반복 재생
            'trigger' = 평소엔 첫 프레임에 정지, 발동(밟힘/피격) 때 한 번 재생 (root 타일의 triggerFxUntil 사용)
   seq    : 재생할 프레임 번호 순서(0부터). 생략하면 0..frames-1
   durs   : seq 각 프레임을 보여주는 시간(ms). 길이는 seq와 같아야 합니다.
   hold   : (trigger) 재생이 끝난 뒤 마지막 프레임을 유지(발동 시간이 끝나 클래스가 빠질 때까지)
   scale  : 애니메이션 레이어 배율(기본 1). 시트의 타일이 캔버스를 꽉 채우면 1, 여백이 있으면 그만큼 키워 원본 크기에 맞춥니다.
   시트가 로드되기 전/실패 시에는 기존 정지 그림(sprite)이 그대로 보입니다.
   ========================================================================== */
const OBSTACLE_ANIMS={
  flame:    {sheet:'assets/images/obstacles/animations/obstacle_anim_flame.png',    frames:5, mode:'loop',    durs:[150,140,150,140,150]},          // 불꽃 일렁임
  poison:   {sheet:'assets/images/obstacles/animations/obstacle_anim_poison.png',   frames:5, mode:'loop',    durs:[420,320,320,340,420]},          // 거품 발생 → 터짐
  lightning:{sheet:'assets/images/obstacles/animations/obstacle_anim_lightning.png',frames:5, mode:'loop',    durs:[1100,90,130,110,900]},          // 대부분 어둡다가 순간 번쩍
  pit:      {sheet:'assets/images/obstacles/animations/obstacle_anim_pit.png',      frames:6, mode:'loop',    durs:[260,240,240,240,240,260]},      // 소용돌이 회전
  frost:    {sheet:'assets/images/obstacles/animations/obstacle_anim_frost.png',    frames:5, mode:'loop',    durs:[520,420,420,420,520]},          // 빛 이동/결정 반짝임
  statue:   {sheet:'assets/images/obstacles/animations/obstacle_anim_statue.png',   frames:5, mode:'loop',    durs:[520,360,520,360,520]},          // 룬 빛 맥동
  curse:    {sheet:'assets/images/obstacles/animations/obstacle_anim_curse.png',    frames:6, mode:'loop',    durs:[360,360,360,360,360,480]},      // 저주 기운 상승/소멸
  web:      {sheet:'assets/images/obstacles/animations/obstacle_anim_web.png',      frames:4, mode:'loop',    durs:[900,240,240,720]},              // 거미줄 흔들림
  spike:    {sheet:'assets/images/obstacles/animations/obstacle_anim_spike.png',    frames:4, mode:'trigger', seq:[1,2,3], durs:[90,300,180]},        // 솟기 시작 → 완전히 솟음 → 내려감
  barricade:{sheet:'assets/images/obstacles/animations/obstacle_anim_barricade.png',frames:4, mode:'trigger', seq:[1,2,3], durs:[70,110,120]},        // 충격(밀림) → 최대 밀림 → 복귀
  // ── 원본 그림(전체 화면 타일)을 그대로 두고 움직이는 부분만 얹은 시트: 타일이 캔버스를 꽉 채웁니다 ──
  gust:     {sheet:'assets/images/obstacles/remade/animations/gust.png',     frames:10, mode:'trigger', seq:[0,1,2,3,4,5,6,7,8,9], durs:[80,80,90,100,120,140,140,120,100,80]},
  magnet:   {sheet:'assets/images/obstacles/remade/animations/magnet.png',   frames:10, mode:'trigger', seq:[0,1,2,3,4,5,6,7,8,9], durs:[70,70,80,90,110,130,140,120,100,90]},
  stun_cage:{sheet:'assets/images/obstacles/remade/animations/stun_cage.png',frames:10, mode:'trigger', seq:[0,1,2,3,4,5,6,7,8,9], durs:[80,80,90,100,120,140,160,140,110,80], hold:true},
  collapse_bridge:{sheet:'assets/images/obstacles/remade/animations/collapse_bridge.png',frames:10, mode:'loop', seq:[0,1,2,3,4,5,6,7,8,9], durs:[600,600,600,600,600,600,600,600,600,600]}
};
function obstacleAnimSeq(a){ return a.seq||Array.from({length:a.frames},(_,i)=>i); }
function obstacleAnimTotalMs(a){ return a.durs.reduce((s,x)=>s+x,0); }
// 발동형 애니메이션이 끝날 때까지 root 타일의 triggerFxUntil 을 유지할 시간(ms)
const OBSTACLE_TRIGGER_FX_MS={};
for(const _id of Object.keys(OBSTACLE_ANIMS)){ const _a=OBSTACLE_ANIMS[_id]; if(_a.mode==='trigger' && _a.signal!=='custom') OBSTACLE_TRIGGER_FX_MS[_id]=obstacleAnimTotalMs(_a); }

/* v38.6.3 · 마을 습격 준비 단계 장애물 이미지 보호
   장애물 스프라이트는 HTML 내부에 포함된 원본 data:image를 그대로 사용합니다.
   준비 카운트다운 중 반복되는 renderUI 때문에 이미지 src를 매번 재설정하지 않고,
   실제 장애물 종류가 바뀌거나 이미지 DOM이 새로 만들어졌을 때만 한 번 연결합니다. */
// v46: opts로 "대기/발동" 2프레임 장애물의 순간 전환(alt)이나, 완전히 다른 스프라이트로
// 강제 교체(srcOverride — 예: 붕락교가 영구히 무너진 뒤의 모습)를 지정할 수 있습니다.
function applyObstacleSpriteImage(img,ob,opts){
  if(!img || !ob) return;
  img.loading='eager';
  img.decoding='async';
  img.draggable=false;
  const useAlt=!!(opts && opts.alt && ob.spriteAlt);
  const src=(opts && opts.srcOverride) || (useAlt?ob.spriteAlt:ob.sprite) || '';
  const key=(opts && opts.srcOverride) || ob.id+(useAlt?':alt':'');
  if(img.dataset.obstacleSpriteId!==key || !img.getAttribute('src')){
    img.setAttribute('src',src);
    img.dataset.obstacleSpriteId=key;
  }
}

const TOOL_INFO={
  dig:{icon:'⛏',title:'파기',desc:'던전 바닥과 맞닿은 암벽을 파서 새로운 통로를 만듭니다. 기존처럼 드래그로 연속해서 파낼 수 있습니다.'},
  monster:{icon:'👾',title:'몬스터 소환',desc:'아래 목록에서 몬스터를 누르면 마력의 핵 근처의 안전한 통로에 자동으로 소환됩니다.'},
  command:{icon:'🎯',title:'몬스터 명령',desc:'배치된 몬스터들의 행동 성향을 공격·수비·중립으로 전환합니다. 명령은 현재 전장의 모든 몬스터에게 즉시 적용됩니다.'},
  obstacle:{icon:'🧱',title:'벽 / 장애물',desc:'벽 파기·벽 생성과 함정/장애물 설치·제거를 한 메뉴에서 관리합니다.'},
};
const MONSTER_COMMAND_META={
  attack:{icon:'⚔️',name:'공격 명령',desc:'입구까지 캠핑하지 않고 던전 전방에 요격선을 형성합니다. 한 용사에게 전군이 몰리지 않도록 추격 인원을 분산해 압박합니다.'},
  defense:{icon:'🛡️',name:'수비 명령',desc:'평소에는 핵 주변 3칸의 방어선을 지킵니다. 직접 공격받으면 잠시 공격자를 추적한 뒤 방어선으로 복귀합니다.'},
  neutral:{icon:'⚖️',name:'중립 명령',desc:'탱커·수호형·힐러는 핵 주변을 지키고, 나머지는 입구를 침범하지 않는 전방 요격 행동을 사용합니다.'},
};
function monsterCommandLabel(command){
  return MONSTER_COMMAND_META[command]?.name || MONSTER_COMMAND_META.defense.name;
}
function normalizeMonsterCommand(command){
  return ['attack','defense','neutral'].includes(command) ? command : 'defense';
}
function isMonsterDefensiveType(m){
  return !!m && (
    m.special==='tank' ||
    m.special==='guard' ||
    m.role==='tank' ||
    m.role==='healer'
  );
}
function monsterUsesDefenseBehavior(m){
  const command=normalizeMonsterCommand(state?.monsterCommand);
  if(command==='defense') return true;
  if(command==='attack') return false;
  return isMonsterDefensiveType(m);
}

// v87: 명령 AI 전선 제한.
// 공격 명령이 용사 스폰 입구까지 밀고 가 농성하던 문제를 막기 위해,
// 입구 주변에는 교전 금지 완충지대를 두고 공격형 유닛의 전진선을 던전 중간 지점으로 제한합니다.
// 수비 명령의 마왕은 별도의 더 좁은 핵 방어 반경을 사용합니다.
const MONSTER_COMMAND_ATTACK_SPAWN_BUFFER_MAX=4;
const MONSTER_COMMAND_MAX_CHASERS_PER_HERO=4;
const MONSTER_COMMAND_DEFENSE_LEASH_RADIUS=3;
const MONSTER_COMMAND_DEFENSE_ENGAGE_MARGIN=2;
const MAWANG_DEFENSE_LEASH_RADIUS=3;
const MAWANG_DEFENSE_ENGAGE_MARGIN=2;
function activeHeroSpawnPoints(){
  if(Array.isArray(state?.heroSpawnPoints)&&state.heroSpawnPoints.length) return state.heroSpawnPoints;
  if(state?.heroSpawnPoint) return [state.heroSpawnPoint];
  return Array.isArray(typeof ENTRANCES!=='undefined'?ENTRANCES:null)?ENTRANCES:[];
}
function nearestHeroSpawnDistance(r,c){
  const points=activeHeroSpawnPoints();
  if(!points.length) return Infinity;
  let best=Infinity;
  for(const p of points){
    if(!p) continue;
    best=Math.min(best,Math.abs(r-p.r)+Math.abs(c-p.c));
  }
  return best;
}
function monsterAttackSpawnBufferRadius(){
  const points=activeHeroSpawnPoints();
  if(!points.length) return 0;
  let coreToEntrance=Infinity;
  for(const p of points) coreToEntrance=Math.min(coreToEntrance,Math.abs(CORE_R-p.r)+Math.abs(CORE_C-p.c));
  if(!Number.isFinite(coreToEntrance)) return 0;
  return Math.max(2,Math.min(MONSTER_COMMAND_ATTACK_SPAWN_BUFFER_MAX,Math.floor(coreToEntrance*.30)));
}
function monsterAttackAdvanceRadius(){
  const points=activeHeroSpawnPoints();
  if(!points.length) return MONSTER_LEASH_RADIUS+2;
  let coreToEntrance=Infinity;
  for(const p of points) coreToEntrance=Math.min(coreToEntrance,Math.abs(CORE_R-p.r)+Math.abs(CORE_C-p.c));
  if(!Number.isFinite(coreToEntrance)) return MONSTER_LEASH_RADIUS+2;
  const buffer=monsterAttackSpawnBufferRadius();
  const desired=Math.max(3,Math.round(coreToEntrance*.65));
  const beforeSpawn=Math.max(3,coreToEntrance-buffer-1);
  return Math.max(3,Math.min(beforeSpawn,desired));
}
function heroInsideMonsterAttackZone(h){
  if(!h||h.hp<=0) return false;
  if(nearestHeroSpawnDistance(h.r,h.c)<=monsterAttackSpawnBufferRadius()) return false;
  const coreDist=Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C);
  return coreDist<=monsterAttackAdvanceRadius()+2;
}
function monsterCellAllowedByAttackCommand(r,c){
  if(nearestHeroSpawnDistance(r,c)<=monsterAttackSpawnBufferRadius()) return false;
  return Math.abs(r-CORE_R)+Math.abs(c-CORE_C)<=monsterAttackAdvanceRadius();
}
function monsterAttackChaseSlotAvailable(m,h){
  if(!m||!h) return false;
  if(m.targetHeroId===h.id) return true;
  let assigned=0;
  for(const o of state?.monsters||[]){
    if(o===m||o.hp<=0) continue;
    if(o.targetHeroId===h.id) assigned++;
  }
  return assigned<MONSTER_COMMAND_MAX_CHASERS_PER_HERO;
}
function mawangDefenseHeroAllowed(h){
  if(!h||h.hp<=0) return false;
  return Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C)<=MAWANG_DEFENSE_LEASH_RADIUS+MAWANG_DEFENSE_ENGAGE_MARGIN;
}
function mawangDefenseCellAllowed(r,c){
  return Math.abs(r-CORE_R)+Math.abs(c-CORE_C)<=MAWANG_DEFENSE_LEASH_RADIUS;
}
function setMonsterCommand(command){
  if(!state) return false;
  const next=normalizeMonsterCommand(command);
  if(state.monsterCommand===next){
    state.selected={kind:'tool',tool:'command'};
    renderUI();
    return false;
  }
  state.monsterCommand=next;
  if(mawangProfile){ mawangProfile.command=next; saveMawangProfile(); }
  addLog(`<span class="hl-gold">🎯 ${monsterCommandLabel(next)}</span> — ${MONSTER_COMMAND_META[next].desc}`);
  Sound.ui();
  state.selected={kind:'tool',tool:'command'};
  renderUI();
  return true;
}
const PRIEST_HEAL_RANGE=3;
const PRIEST_HEAL_AMT=4;
const START_GOLD=200;
const WALL_BUILD_COST=15;
// 몬스터 생성 제한(동시 배치 가능한 최대 마리 수). 웨이브 클리어 카드로 늘릴 수 있습니다.
const MONSTER_CAP_START=10;
const MONSTER_CAP_CARD_BONUS=2;
// 웨이브가 진행될수록 몬스터 소환 비용이 완만하게 오릅니다(최대 +30%).
// 후반에 '비싸져서 아무것도 못 하는' 구간을 줄이고, 성장 카드는 계속 의미를 갖게 합니다.
const MONSTER_COST_INFLATION_PER_WAVE=0.015;
const MONSTER_COST_INFLATION_MAX=0.30;
// 같은 종류의 몬스터를 반복 소환할수록 해당 몬스터의 소환 비용이 조금씩 증가합니다.
// 첫 소환은 기본가, 2번째부터 +8%씩 누적되며 최대 +80%까지만 증가합니다.
const SAME_MONSTER_COST_STEP=0.08;
const SAME_MONSTER_COST_MAX=0.80;
const MONSTER_TIER_HP_GROWTH=1.36;
const MONSTER_TIER_ATK_GROWTH=1.27;
const MONSTER_TIER_DEF_GROWTH=1.75;
function monsterCostInflationMul(){
  const wave=(state&&state.wave)||0;
  return 1+Math.min(MONSTER_COST_INFLATION_MAX, Math.max(0, wave-1)*MONSTER_COST_INFLATION_PER_WAVE);
}
function monsterCost(mt){
  if(!mt) return 0;
  // 같은 종류를 몇 번 소환했는지에 따라 해당 종류만 비용이 상승합니다.
  const sameCount=state?.monsterPurchaseCounts?.[mt.id]||0;
  const sameTypeMul=1+Math.min(SAME_MONSTER_COST_MAX, sameCount*SAME_MONSTER_COST_STEP);
  let mul=(state&&state.monsterCostMul||1)*monsterCostInflationMul()*sameTypeMul;
  if(state){
    if(state.monsterCostDiscountWaves>0) mul*=(1-(state.monsterCostDiscountRatio||0));
    if(state.contractExpensiveStrongWaves>0) mul*=3;
  }
  return Math.max(1, Math.round(mt.cost*mul));
}
const KILLS_PER_LEVEL=9;
const MONSTER_LEVEL_PROGRESS_PER_KILL=2; // v71: 처치 1회당 레벨 진행도 2. 기존 대비 정확히 2배 성장 속도.
const HERO_REGEN_PER_LEVEL=0.12;
const HERO_DEF_PER_LEVEL=0.55;
const HERO_LEVEL_SIZE_MUL=0.035;
const HERO_LEVEL_SIZE_CAP=0.6;
/* 전투 화면 시인성(v40): 몬스터/용사/마왕 토큰의 "보이는 크기"에만 곱해지는 배율입니다.
   이동·사거리·충돌 판정은 전부 격자(r,c) 기준이라 이 값을 바꿔도 게임 밸런스는 그대로입니다.
   캐릭터가 더 크게 보이길 원하면 이 숫자만 올리면 됩니다(1.0 = 기존 크기). */
const TOKEN_VIEW_SCALE=1.3;
/* v40: 용사 침입구 개수는 웨이브에 따라 늘어납니다.
   1~20웨이브=1곳, 21~40=2곳, 41~60=3곳, 61~80=4곳, 81~=5곳(최대). */
const HERO_SPAWN_MAX_POINTS=5;
const HERO_SPAWN_WAVES_PER_POINT=20;
function heroSpawnCountForWave(wave){
  const w=Math.max(1, wave|0);
  return Math.min(HERO_SPAWN_MAX_POINTS, Math.floor((w-1)/HERO_SPAWN_WAVES_PER_POINT)+1);
}
const HERO_SIGHT_RANGE=5;              // 용사가 마력핵을 발견하는 거리(기존)
const RANGED_LOS_CHECK=true;
// 몬스터는 마력핵 방어구역을 벗어나지 않도록 행동 반경을 제한합니다.
const MONSTER_HUNT_RADIUS_DEFAULT=7;   // 몬스터가 용사를 발견하고 추적을 시작하는 기본 거리(기존 MONSTER_HUNT_RADIUS와 동일값).
                                        // 몬스터별로 다르게 주고 싶으면 MONSTER_TYPES 항목에 huntRadius를 추가하면 됩니다.
const MONSTER_LEASH_RADIUS=7;

// ===== v35 발견 거리(Detection Range) 시스템 =====
// 몬스터→용사, 용사→몬스터, 용사→함정 세 방향의 "인지 거리"를 명시적인 값으로 분리했습니다.
// 몬스터→용사(MONSTER_HUNT_RADIUS_DEFAULT), 용사→몬스터(HERO_MONSTER_SIGHT_RANGE)는
// 기존에 하드코딩돼 있던 값을 그대로 기본값으로 유지해서 기존 밸런스는 바뀌지 않습니다.
// 용사→함정(HERO_TRAP_SIGHT_RANGE)은 이번에 새로 추가된 개념입니다.
const HERO_MONSTER_SIGHT_RANGE=3;      // 용사가 "위협적인 몬스터"를 인지하는 거리(겁쟁이 도주 판단, 근처 몬스터 우선 교전 판단에 사용)
const HERO_TRAP_SIGHT_RANGE=0;         // 장애물 사전 인지/우회 비활성화
const HERO_TRAP_FORGET_MARGIN=0;       // 장애물 사전 인지/기억을 사용하지 않음
const HERO_TRAP_AVOID_WEIGHT=0;        // 장애물 사전 회피 비용 비활성화
                                        // 값이 클수록 더 적극적으로 우회하지만, 다른 길이 없으면 결국 지나갑니다(완전 차단 아님).
// 밟으면 용사에게 해로운 함정만 회피 대상입니다. 바리케이드는 이미 물리적으로 통행 불가라 제외,
// 수호진(statue)은 몬스터를 강화하는 지원형이라 용사에게 직접적인 해가 없어서 제외했습니다.
const HERO_HARMFUL_OBSTACLES=new Set(['spike','flame','lightning','poison','pit','frost','web','curse']);

function monsterHuntRadius(m){
  const mt=monsterTypeOfId(m.typeId);
  return (mt && mt.huntRadius) || MONSTER_HUNT_RADIUS_DEFAULT;
}
function heroMonsterSightRange(h){
  const ht=heroTypeOf(h);
  return (ht && ht.monsterSightRange) || HERO_MONSTER_SIGHT_RANGE;
}
function heroTrapSightRange(h){
  // 전투 중 용사는 장애물을 인지하거나 우회하지 않습니다.
  // 장애물은 실제로 밟았을 때의 피해/상태이상/파괴 규칙만 적용됩니다.
  return 0;
}

const TIER_COLORS=['#9c94b8','#5fd08a','#5aa9e6','#b76bf2','#e0b64a'];

const CARD_TYPES=[
  {id:'goldPerSec', icon:'💰', name:'황금의 흐름', desc:'초당 획득 골드 +1', rarity:'희귀', cls:'legendary'},
  {id:'upgrade', icon:'⬆️', name:'전군 강화', desc:'현재 모든 몬스터가 1단계 강화', rarity:'강화', cls:'arcane'},
  {id:'newMonster', icon:'🃏', name:'새로운 몬스터 발견', desc:'고급 몬스터 1종 영구 해금', rarity:'발견', cls:'arcane'},
  {id:'freeobst',icon:'🏛️', name:'새로운 장애물', desc:'강력한 장애물 1개를 무료 설치', rarity:'전술', cls:'nature'},
  {id:'coreFortify',icon:'💎',name:'핵의 강화',desc:'마력의 핵 최대 HP +25 · 즉시 +25 회복',rarity:'수호',cls:'legendary'},
  {id:'coreMend',icon:'💚',name:'응급 복구',desc:'마력의 핵 HP 22% 즉시 회복',rarity:'수호',cls:'nature'},
  {id:'monsterDiscount',icon:'🏷️',name:'악마의 계약',desc:'몬스터 소환 비용 10% 영구 감소',rarity:'경제',cls:'arcane'},
  {id:'freeGuards',icon:'👾',name:'핵의 수호자들',desc:'핵 주변에 무작위 몬스터 2마리 즉시 소환',rarity:'소환',cls:'arcane'},
  {id:'trapMastery',icon:'⭕',name:'룬 증폭',desc:'모든 장애물 효과 범위 +1',rarity:'전술',cls:'legendary'},
  {id:'bloodRitual',icon:'🩸',name:'피의 의식',desc:'모든 몬스터 공격력 +8%',rarity:'공격',cls:'legendary'},
  {id:'arcaneShield',icon:'🛡️',name:'마력 결계',desc:'마력의 핵이 받는 피해 10% 감소',rarity:'수호',cls:'arcane'},
  {id:'quickBuilder',icon:'⏩',name:'신속한 개척',desc:'다음 준비 시간이 10초 단축',rarity:'건설',cls:'nature'},
  {id:'goldCache',icon:'💰',name:'비밀 금고',desc:'즉시 골드 100G 획득',rarity:'경제',cls:'legendary'},
  {id:'tierRandom',icon:'🎲',name:'불안정한 진화',desc:'무작위 몬스터 1마리 +2단계 강화',rarity:'변이',cls:'arcane'},
  {id:'monsterCapUp',icon:'👥',name:'군세 확장',desc:'몬스터 생성 제한 +'+MONSTER_CAP_CARD_BONUS+'마리',rarity:'건설',cls:'legendary'}
];

const SPRITE_DATA={
  druid:"assets/images/characters/heroes/druid.png",
  miko:"assets/images/characters/heroes/miko.png",
  bard:"assets/images/characters/heroes/bard.png",
  alchemist:"assets/images/characters/heroes/alchemist.png",
  ice_mage:"assets/images/characters/heroes/ice_mage.png",
  spirit_caller:"assets/images/characters/heroes/spirit_caller.png",
  lancer:"assets/images/characters/heroes/lancer.png",
  martial_artist:"assets/images/characters/heroes/martial_artist.png",
  dual_wielder:"assets/images/characters/heroes/dual_wielder.png",
  curse_caster:"assets/images/characters/heroes/curse_caster.png",
  dark_knight:"assets/images/characters/heroes/dark_knight.png",
  ironclad:"assets/images/characters/heroes/ironclad.png",
  slime:"assets/images/characters/monsters/slime.png",goblin:"assets/images/characters/monsters/goblin.png",skeleton:"assets/images/characters/monsters/skeleton.png",wolf:"assets/images/characters/monsters/wolf.png",orc:"assets/images/characters/monsters/orc.png",spider:"assets/images/characters/monsters/spider.png",fire:"assets/images/characters/monsters/fire.png",darkmage:"assets/images/characters/monsters/darkmage.png",dragon:"assets/images/characters/monsters/dragon.png",golem:"assets/images/characters/monsters/golem.png",swordsman:"assets/images/characters/heroes/swordsman.png",archer:"assets/images/characters/heroes/archer.png",mage:"assets/images/characters/heroes/mage.png",paladin:"assets/images/characters/heroes/paladin.png",assassin:"assets/images/characters/heroes/assassin.png",berserker:"assets/images/characters/heroes/berserker.png",priest:"assets/images/characters/heroes/priest.png",gunslinger:"assets/images/characters/heroes/gunslinger.png",dragoon:"assets/images/characters/heroes/dragoon.png",summoner:"assets/images/characters/heroes/summoner.png", skeleton_archer:"assets/images/characters/monsters/skeleton_archer.png", slime_king:"assets/images/characters/monsters/slime_king.png", berserker_orc:"assets/images/characters/monsters/berserker_orc.png", skeleton_warrior:"assets/images/characters/monsters/skeleton_warrior.png", grim_reaper:"assets/images/characters/monsters/grim_reaper.png", flame_spirit:"assets/images/characters/monsters/flame_spirit.png", ice_golem:"assets/images/characters/monsters/ice_golem.png", dark_sorcerer:"assets/images/characters/monsters/dark_sorcerer.png", rock_colossus:"assets/images/characters/monsters/rock_colossus.png", lich_lord:"assets/images/characters/monsters/lich_lord.png"};
SPRITE_DATA.shieldbearer="assets/images/characters/heroes/shieldbearer.png";
SPRITE_DATA.hunter="assets/images/characters/heroes/hunter.png";
SPRITE_DATA.miner="assets/images/characters/heroes/miner.png";
SPRITE_DATA.archmage="assets/images/characters/heroes/archmage.png";
SPRITE_DATA.swordsaint="assets/images/characters/heroes/swordsaint.png";
SPRITE_DATA.vampire="assets/images/characters/heroes/vampire.png";
SPRITE_DATA.shadowrogue="assets/images/characters/heroes/shadowrogue.png";
SPRITE_DATA.dragonslayer="assets/images/characters/heroes/dragonslayer.png";
SPRITE_DATA.goblin_archer="assets/images/characters/monsters/goblin_archer.png";
SPRITE_DATA.ghost_sniper="assets/images/characters/monsters/ghost_sniper.png";
SPRITE_DATA.angry_orc="assets/images/characters/monsters/angry_orc.png";
SPRITE_DATA.blood_berserker="assets/images/characters/monsters/blood_berserker.png";
SPRITE_DATA.shadow_goblin="assets/images/characters/monsters/shadow_goblin.png";
SPRITE_DATA.nightstalker="assets/images/characters/monsters/nightstalker.png";
SPRITE_DATA.bone_priest="assets/images/characters/monsters/bone_priest.png";
SPRITE_DATA.fallen_seraph="assets/images/characters/monsters/fallen_seraph.png";
SPRITE_DATA.cursed_shaman="assets/images/characters/monsters/cursed_shaman.png";
// v60: 신규 몬스터 12종 (시트 A)
SPRITE_DATA.lizardman="assets/images/characters/monsters/monster_lizardman.png";
SPRITE_DATA.minotaur="assets/images/characters/monsters/monster_minotaur.png";
SPRITE_DATA.spiked_turtle="assets/images/characters/monsters/monster_spiked_turtle.png";
SPRITE_DATA.bomb_goblin="assets/images/characters/monsters/monster_bomb_goblin.png";
SPRITE_DATA.vine_archer="assets/images/characters/monsters/monster_vine_archer.png";
SPRITE_DATA.wisp="assets/images/characters/monsters/monster_wisp.png";
SPRITE_DATA.frost_witch="assets/images/characters/monsters/monster_frost_witch.png";
SPRITE_DATA.lightning_mage="assets/images/characters/monsters/monster_lightning_mage.png";
SPRITE_DATA.goblin_shaman="assets/images/characters/monsters/monster_goblin_shaman.png";
SPRITE_DATA.swamp_hag="assets/images/characters/monsters/monster_swamp_hag.png";
SPRITE_DATA.thief_rat="assets/images/characters/monsters/monster_thief_rat.png";
SPRITE_DATA.frenzied_bear="assets/images/characters/monsters/monster_frenzied_bear.png";
// v51: 왕국 정예 영웅 12종 (중반~후반 웨이브 전용)
SPRITE_DATA.horseman="assets/images/characters/heroes/hero_horseman.png";
SPRITE_DATA.pikeman="assets/images/characters/heroes/hero_pikeman.png";
SPRITE_DATA.sun_lancer="assets/images/characters/heroes/hero_sun_lancer.png";
SPRITE_DATA.griffon_knight="assets/images/characters/heroes/hero_griffon_knight.png";
SPRITE_DATA.royal_elite="assets/images/characters/heroes/hero_royal_elite.png";
SPRITE_DATA.royal_lance="assets/images/characters/heroes/hero_royal_lance.png";
SPRITE_DATA.dragon_rider="assets/images/characters/heroes/hero_dragon_rider.png";
SPRITE_DATA.royal_guard="assets/images/characters/heroes/hero_royal_guard.png";
SPRITE_DATA.battle_mage="assets/images/characters/heroes/hero_battle_mage.png";
SPRITE_DATA.rune_guardian="assets/images/characters/heroes/hero_rune_guardian.png";
SPRITE_DATA.imperial_magus="assets/images/characters/heroes/hero_imperial_magus.png";
SPRITE_DATA.royal_longbow="assets/images/characters/heroes/hero_royal_longbow.png";


// ── 몬스터 역할(빌드) 체계 ──
// 영웅처럼 몬스터도 역할(role)을 가집니다. role은 배지 표시와 대략적인 컨셉을 담당하고,
// 실제 전투 메커니즘은 기존처럼 special 필드가 담당합니다(역할과 대개 일치하도록 매핑).
const ROLE_INFO={
  warrior:  {name:'전사',   icon:'⚔️', color:'#e0495f', desc:'근접에서 꾸준히 싸우는 표준형 딜러입니다.'},
  tank:     {name:'탱커',   icon:'🛡️', color:'#51bde8', desc:'매우 높은 체력/방어로 앞에서 버티며 시간을 법니다.'},
  ranged:   {name:'원거리 딜러', icon:'🏹', color:'#5fd08a', desc:'사거리 안에서 안전하게 물리 공격을 가합니다.'},
  mage:     {name:'마법 딜러', icon:'🔮', color:'#b79bff', desc:'광역/원거리 마법 피해로 다수의 적을 노립니다.'},
  debuff:   {name:'디버프',   icon:'☠️', color:'#8b6bf2', desc:'적중 시 용사에게 저주를 걸어 공격력을 낮춥니다.'},
  healer:   {name:'힐러',    icon:'✚',  color:'#73d99a', desc:'주기적으로 주변 아군 몬스터의 체력을 회복시킵니다.'},
  berserker:{name:'버서커',  icon:'🔥', color:'#ff765c', desc:'체력이 낮아질수록 공격력이 폭발적으로 증가합니다.'},
  assassin: {name:'암살자',  icon:'🗡️', color:'#ffd166', desc:'체력이 낮은 용사를 확실하게 끝장냅니다.'},
};
function roleBadgeHtml(role){
  const r=ROLE_INFO[role]; if(!r) return '';
  return `<span class="role-badge" style="display:inline-block;margin-top:3px;padding:1px 6px;border-radius:8px;font-size:8px;font-weight:700;color:#100c1a;background:${r.color};">${r.icon} ${r.name}</span>`;
}
// mt에 role(주 역할)과 role2(부 역할, 선택)가 있으면 두 배지를 모두 렌더링합니다.
function roleBadgesHtml(mt){
  if(!mt) return '';
  let html=roleBadgeHtml(mt.role);
  if(mt.role2) html+=roleBadgeHtml(mt.role2);
  return html;
}

const MONSTER_TYPES=[
  {id:'slime',    grade:'D', name:'슬라임',    desc:'가장 약하지만 숫자로 승부.',        cost:15,  hp:44,  atk:4,  def:0, role:'warrior'},
  {id:'goblin',   grade:'D', name:'고블린',    desc:'작지만 단체로 위협적이다.',        cost:26, hp:60, atk:6, def:0, role:'warrior'},
  {id:'skeleton', grade:'C', name:'해골전사',  desc:'죽어서도 검을 놓지 않는다.',       cost:40, hp:84, atk:7, def:2, role:'warrior', cardOnly:true},
  {id:'wolf',     grade:'C', name:'늑대',      desc:'빠른 속도로 달려와 초반을 흔든다.',cost:48, hp:80, atk:10, def:1, role:'warrior', cardOnly:true, huntRadius:10 /* 예시: 멀리서도 먼저 달려듦 */},
  {id:'spider',   grade:'B', name:'거미',      desc:'맹독을 뿌려 용사의 공격력을 떨어뜨리는 원거리 디버퍼.', cost:58, hp:88, atk:8, def:1, range:2, special:'curse', role:'debuff', huntRadius:4 /* 예시: 숨어있다가 가까이 와야 반응 */},
  {id:'orc',      grade:'B', name:'오크전사',  desc:'튼튼한 체력으로 전선을 지키는 방벽형.', cost:85, hp:160, atk:10, def:5, special:'tank', role:'tank'},
  {id:'fire',     grade:'B', name:'불의 정령', desc:'주변 용사까지 함께 불태우는 마법형 딜러.', cost:95, hp:104, atk:15, def:1, range:2, special:'splash', role:'mage'},
  {id:'darkmage', grade:'B', name:'흑마법사',  desc:'저주의 마법으로 용사의 힘을 봉인한다.', cost:115, hp:116, atk:15, def:1, range:2, special:'curse', role:'debuff', cardOnly:true},
  {id:'golem',    grade:'S', name:'골렘',      desc:'거대한 몸집으로 모든 걸 막아서는 최전방 탱커.', cost:160,hp:360,atk:12, def:10, special:'tank', role:'tank'},
  {id:'dragon',   grade:'S', name:'드래곤',    desc:'압도적 체력의 최후 보스급 만능 전사.', cost:230,hp:330,atk:23, def:4, role:'warrior', cardOnly:true},
  {id:'skeleton_archer', grade:'B', name:'망령 궁수',     desc:'후방에서 긴 사거리로 용사를 저격하는 원거리 딜러.', cost:110,  hp:76,  atk:15, def:1, range:3, special:'ranged', role:'ranged', cardOnly:true},
  {id:'slime_king',      grade:'S', name:'슬라임 킹',     desc:'거대한 점액으로 버티는 왕실 슬라임 탱커.', cost:190, hp:400, atk:15, def:6, range:1, special:'tank', role:'tank', cardOnly:true},
  {id:'berserker_orc',   grade:'A', name:'광폭 오크',     desc:'체력이 낮아질수록 공격력이 폭발적으로 오르는 버서커.', cost:160, hp:210, atk:21, def:3, range:1, special:'rage', role:'berserker', cardOnly:true},
  {id:'skeleton_warrior',grade:'A', name:'해골 수호기사', desc:'방패와 갑주로 버티는 중장형 언데드 탱커.', cost:170, hp:250, atk:14, def:8, range:1, special:'guard', role:'tank', cardOnly:true},
  {id:'grim_reaper',     grade:'A', name:'그림 리퍼',     desc:'약해진 용사를 확실히 끝장내는 암살자.', cost:200, hp:184,  atk:20, def:4, range:1, special:'execute', role:'assassin', cardOnly:true},
  {id:'flame_spirit',    grade:'A', name:'화염 정령',     desc:'근처의 용사까지 휩쓰는 폭발성 화염 마법 딜러.', cost:150,  hp:144,  atk:19, def:2, range:2, special:'splash', role:'mage', cardOnly:true},
  {id:'ice_golem',       grade:'S', name:'빙결 골렘',     desc:'느리지만 압도적인 체력과 방어력을 가진 얼음 탱커.', cost:210, hp:410, atk:13, def:9, range:1, special:'frost', role:'tank', cardOnly:true},
  {id:'dark_sorcerer',   grade:'A', name:'암흑술사',      desc:'거리를 유지하며 강한 암흑 마법을 퍼붓는 마법 딜러.', cost:190, hp:156,  atk:22, def:3, range:3, special:'ranged', role:'mage', cardOnly:true},
  {id:'rock_colossus',   grade:'SS', name:'바위 거인',     desc:'거대한 몸으로 버티는 최상급 수호 탱커.', cost:260, hp:540, atk:16, def:11, range:1, special:'tank', role:'tank', cardOnly:true},
  {id:'lich_lord',       grade:'SS', name:'리치 군주',     desc:'죽음의 마법으로 공격하고 스스로 회복하며, 주변 언데드 아군을 치유하는 힐러. 공격이 적중한 용사에게 저주를 걸어 공격력을 낮춥니다.', cost:280, hp:270, atk:25, def:5, range:3, special:'lifesteal', role:'healer', role2:'debuff', debuffOnHit:true, cardOnly:true},
  {id:'goblin_archer',   grade:'C', name:'고블린 궁수병', desc:'작지만 민첩한 고블린 궁수병. 멀리서 화살을 날려 적을 괴롭힌다.', cost:50, hp:52, atk:9, def:0, range:3, special:'ranged', role:'ranged'},
  {id:'ghost_sniper',    grade:'SS', name:'망령 저격수',   desc:'죽음 이후에도 사라지지 않은 영혼. 멀리서 영혼의 총으로 적을 저격한다.', cost:240, hp:200, atk:34, def:3, range:4, special:'ranged', role:'ranged', cardOnly:true},
  {id:'angry_orc',       grade:'B', name:'성난 오크 투사', desc:'거칠고 무식한 오크 투사. 거대한 창으로 전방의 적을 찔러낸다. 체력이 낮아질수록 공격 속도가 빨라진다.', cost:70, hp:116, atk:13, def:2, special:'rage', role:'berserker'},
  {id:'blood_berserker', grade:'SS', name:'혈투의 광전사 대장', desc:'피로 물든 전장을 사랑하는 광전사 대장. 주변의 오크들을 더욱 흉폭하게 만든다. 전투 중 일정 시간마다 체력을 회복한다.', cost:250, hp:340, atk:33, def:6, special:'rage', role:'berserker', cardOnly:true},
  {id:'shadow_goblin',   grade:'B', name:'그림자 고블린', desc:'어둠 속에 숨어드는 고블린 암살자. 빠른 속도로 적의 뒤로 이동해 공격한다. 은신 상태에서 더 큰 피해를 입힌다.', cost:65, hp:68, atk:14, def:0, special:'execute', role:'assassin'},
  {id:'nightstalker',    grade:'S', name:'심연의 나이트스토커', desc:'심연에서 기어 나온 나이트스토커. 어둠 속에서 모습을 감추고 기습한다. 일정 시간마다 주변의 어둠을 확산시켜 시야를 제한한다.', cost:230, hp:236, atk:36, def:4, special:'execute', role:'assassin', cardOnly:true},
  {id:'bone_priest',     grade:'B', name:'뼈사제', desc:'뼈로 이루어진 사제. 죽은 자들을 불러내 전투에 가담시킨다. 주변의 적을 약화시키는 저주를 건다.', cost:90, hp:120, atk:6, def:2, range:2, special:'lifesteal', role:'healer'},
  {id:'fallen_seraph',   grade:'S', name:'타락한 세라핌', desc:'타락한 천사의 형태. 빛이 아닌 어둠의 힘으로 적을 공격한다. 주변의 아군 몬스터에게 공격력과 방어력을 증가시킨다.', cost:250, hp:300, atk:20, def:5, range:2, special:'lifesteal', role:'healer', cardOnly:true},
  {id:'cursed_shaman',   grade:'A', name:'저주받은 무녀', desc:'영혼을 저주하는 무녀. 부적과 의식을 통해 적을 괴롭힌다. 저주에 걸린 적은 지속적인 피해를 입는다.', cost:230, hp:190, atk:20, def:2, range:2, special:'curse', role:'debuff', cardOnly:true},

  // ── v60 · 신규 몬스터 12종 (역할군 보강). 기본 해금 5종 + 카드 해금 7종 ──
  // ▸ 전사
  {id:'lizardman',      grade:'B', name:'리자드맨 전사', desc:'비늘 갑옷과 창으로 무장한 도마뱀 전사. 균형 잡힌 근접전을 펼치며 창끝에 출혈을 남기고, 성장하면 무리의 사기를 끌어올린다.', cost:88,  hp:128, atk:14, def:3, range:1, role:'warrior', cardOnly:true},
  {id:'minotaur',       grade:'A', name:'미노타우로스',  desc:'거대한 도끼를 휘두르는 미궁의 수호자. 뿔로 들이받고 돌진해 용사들을 기절시킨다.', cost:175, hp:240, atk:22, def:5, range:1, role:'warrior', cardOnly:true},
  // ▸ 탱커
  {id:'spiked_turtle',  grade:'C', name:'가시거북',      desc:'가시 돋친 등껍질로 버티는 작은 수호자. 껍질 속에 웅크려 피해를 줄이고, 진흙을 뿜어 용사의 발을 늦춘다.', cost:52,  hp:104, atk:5,  def:5, range:1, special:'tank', role:'tank', cardOnly:true},
  // ▸ 원거리 딜러
  {id:'bomb_goblin',    grade:'B', name:'폭탄 고블린',   desc:'화염병과 폭탄을 던지는 광기의 고블린. 폭발이 번져 뭉쳐 있는 용사들을 한꺼번에 태운다.', cost:100, hp:70,  atk:14, def:0, range:3, special:'splash', role:'ranged'},
  {id:'vine_archer',    grade:'A', name:'덩굴 사수',     desc:'덩굴로 엮은 활을 든 숲의 사수. 덩굴 화살과 가시 그물로 용사를 속박한다.', cost:178, hp:124, atk:19, def:2, range:4, special:'ranged', role:'ranged', cardOnly:true},
  // ▸ 마법 딜러
  {id:'wisp',           grade:'C', name:'도깨비불',      desc:'푸른 불꽃으로 떠다니는 장난꾸러기 도깨비. 작지만 불꽃 파편이 번져 주변의 용사까지 태운다.', cost:44,  hp:42,  atk:9,  def:0, range:2, special:'splash', role:'mage'},
  {id:'frost_witch',    grade:'B', name:'서리 마녀',     desc:'얼음 지팡이로 용사의 발을 얼리는 마녀. 서리와 눈보라로 움직임을 늦추고 절대영도로 얼어붙게 한다.', cost:108, hp:102, atk:15, def:1, range:3, special:'frost', role:'mage', cardOnly:true},
  {id:'lightning_mage', grade:'A', name:'번개 술사',     desc:'전류가 튀는 지팡이를 든 술사. 연쇄 번개로 용사들을 지지고 잠시 마비시킨다.', cost:172, hp:138, atk:21, def:2, range:3, role:'mage', cardOnly:true},
  // ▸ 힐러
  {id:'goblin_shaman',  grade:'B', name:'고블린 샤먼',   desc:'북과 뼈 지팡이를 든 부족 주술사. 치유 부적으로 주변 아군을 회복시키고, 성장하면 북소리로 사기를 북돋는다.', cost:95,  hp:110, atk:7,  def:2, range:2, role:'healer'},
  // ▸ 디버프
  {id:'swamp_hag',      grade:'B', name:'늪 마귀',       desc:'늪지의 진흙과 이끼를 두른 마녀. 발밑을 수렁으로 만들어 용사의 발을 늦추고 묶는다.', cost:102, hp:112, atk:12, def:2, range:3, role:'debuff'},
  // ▸ 암살자
  {id:'thief_rat',      grade:'C', name:'도둑 쥐',       desc:'두건을 쓴 재빠른 쥐 도적. 약해진 용사의 뒤를 노려 단검으로 끝장낸다.', cost:46,  hp:48,  atk:11, def:0, range:1, special:'execute', role:'assassin'},
  // ▸ 버서커
  {id:'frenzied_bear',  grade:'S', name:'광폭 곰',       desc:'분노로 눈이 붉게 물든 거대한 곰. 체력이 낮아질수록 미쳐 날뛰며, 포효로 용사들을 기절시킨다.', cost:215, hp:380, atk:26, def:5, range:1, special:'rage', role:'berserker', cardOnly:true},
];

// v88 combat-opt: 고정 몬스터 정의의 ID 인덱스. 전투 중 반복 선형 탐색만 줄이며 데이터는 그대로 공유합니다.
const MONSTER_TYPE_BY_ID=new Map(MONSTER_TYPES.map(x=>[x.id,x]));
function monsterTypeOfId(id){ return MONSTER_TYPE_BY_ID.get(id); }

// v66 · 몬스터 근접 공격의 사운드/타격 FX 무기 분류. 실제 외형/설명에 맞춰 검·창·둔기로 재사용합니다.
const MONSTER_MELEE_AUDIO_TYPE={
  slime:'blunt', goblin:'sword', skeleton:'sword', wolf:'sword', orc:'blunt', golem:'blunt', dragon:'blunt',
  slime_king:'blunt', berserker_orc:'blunt', skeleton_warrior:'sword', grim_reaper:'sword', ice_golem:'blunt',
  rock_colossus:'blunt', angry_orc:'spear', blood_berserker:'blunt', shadow_goblin:'sword', nightstalker:'sword',
  lizardman:'spear', minotaur:'blunt', spiked_turtle:'blunt', thief_rat:'sword', frenzied_bear:'sword'
};
function monsterMeleeAudioType(m){
  if(!m) return 'blunt';
  if(MONSTER_MELEE_AUDIO_TYPE[m.typeId]) return MONSTER_MELEE_AUDIO_TYPE[m.typeId];
  const mt=monsterTypeOfId(m.typeId);
  if(mt?.role==='assassin') return 'sword';
  if(mt?.role==='tank'||mt?.role==='berserker') return 'blunt';
  return 'sword';
}

/* ---------------- monster skills ----------------
   각 몬스터는 Lv.1 / Lv.5 / Lv.10에 서로 다른 대표 스킬을 획득합니다.
   skill은 전투 자동화에 맞춰 '조건 충족 → 짧은 캐스팅 → 효과' 구조로 처리합니다.
*/
const SKILL_KIND_STYLE={
  fire:{color:'#ff8c42', glyph:'🔥'},
  ice:{color:'#78dfff', glyph:'❄️'},
  dark:{color:'#bd8cff', glyph:'☠️'},
  holy:{color:'#ffe59a', glyph:'✨'},
  steel:{color:'#cbd4e1', glyph:'⚔️'},
  arcane:{color:'#a98bff', glyph:'🔮'},
  earth:{color:'#d3a76d', glyph:'🪨'},
  poison:{color:'#7be36f', glyph:'☠️'},
  acid:{color:'#b6ff5c', glyph:'🧪'},
  heal:{color:'#73d99a', glyph:'✚'},
  wind:{color:'#bff2d8', glyph:'🏹'},
  bullet:{color:'#ffe066', glyph:'🔫'},
  wraith:{color:'#a07bd6', glyph:'☠️'},
  storm:{color:'#7fd6ff', glyph:'🐉'},
  rage:{color:'#ff5a3d', glyph:'🔥'},
  nature:{color:'#8fd36a', glyph:'🌿'},
  song:{color:'#f0c36a', glyph:'🎵'},
  spirit:{color:'#68e5ff', glyph:'🌀'},
  fear:{color:'#c6a6ff', glyph:'👁️'},
  guard:{color:'#7fc8ff', glyph:'🛡️'},
  curse:{color:'#b76bf2', glyph:'☠️'},
};
function skillStyle(kind){ return SKILL_KIND_STYLE[kind] || {color:'#c9b8ff', glyph:'✦'}; }
const MONSTER_SKILLS={
  slime:{
    1:{name:'점액 투척',icon:'🫧',kind:'poison',cooldown:9,cast:0.8,range:3,mult:1.8},
    5:{name:'산성 폭발',icon:'🧪',kind:'poison',cooldown:12,cast:1.1,range:3,aoe:1.25,mult:2.15,debuff:'def'},
    10:{name:'킹 슬라임 낙하',icon:'👑',kind:'acid',cooldown:16,cast:1.5,range:4,aoe:1.65,mult:3.4,stun:1.0}
  },
  goblin:{
    1:{name:'비열한 급습',icon:'🗡️',kind:'steel',cooldown:8,cast:0.7,range:2,mult:2.0},
    5:{name:'고블린 투창',icon:'🏹',kind:'steel',cooldown:10,cast:0.9,range:4,mult:2.5,bleed:2},
    10:{name:'고블린 군세',icon:'⚔️',kind:'steel',cooldown:15,cast:1.3,range:4,aoe:1.35,mult:3.0,summon:true}
  },
  skeleton:{
    1:{name:'망자의 일격',icon:'💀',kind:'dark',cooldown:9,cast:0.9,range:2,mult:2.1},
    5:{name:'저주받은 검무',icon:'☠️',kind:'dark',cooldown:12,cast:1.1,range:2,aoe:1.1,mult:2.35,debuff:'atk'},
    10:{name:'죽음의 행진',icon:'🦴',kind:'dark',cooldown:17,cast:1.5,range:4,aoe:1.7,mult:3.2,lifeSteal:0.3}
  },
  wolf:{
    1:{name:'포식자의 돌진',icon:'🐺',kind:'steel',cooldown:8,cast:0.6,range:3,mult:2.25,leap:true},
    5:{name:'광란의 이빨',icon:'🩸',kind:'rage',cooldown:11,cast:0.8,range:2,mult:2.7,execute:true},
    10:{name:'야성 폭주',icon:'🌙',kind:'rage',cooldown:15,cast:1.0,range:3,aoe:1.2,mult:3.5,berserk:0.18}
  },
  spider:{
    1:{name:'맹독 거미줄',icon:'🕸️',kind:'poison',cooldown:8,cast:0.8,range:4,mult:1.6,slow:0.25},
    5:{name:'독성 폭산',icon:'☣️',kind:'poison',cooldown:12,cast:1.0,range:4,aoe:1.25,mult:2.2,debuff:'atk'},
    10:{name:'거미여왕의 지배',icon:'🕷️',kind:'poison',cooldown:17,cast:1.4,range:5,aoe:1.8,mult:3.0,slow:0.45,root:1.0}
  },
  orc:{
    1:{name:'분노의 강타',icon:'🪓',kind:'steel',cooldown:9,cast:0.8,range:2,mult:2.2,knock:1},
    5:{name:'전장의 포효',icon:'📣',kind:'rage',cooldown:13,cast:1.0,range:4,aoe:2.0,mult:0,buffAtk:0.18},
    10:{name:'오크 대분쇄',icon:'💥',kind:'earth',cooldown:18,cast:1.5,range:2,aoe:1.7,mult:3.8,knock:2}
  },
  fire:{
    1:{name:'화염 탄',icon:'🔥',kind:'fire',cooldown:8,cast:0.8,range:4,mult:2.0},
    5:{name:'불꽃 연쇄',icon:'🌟',kind:'fire',cooldown:11,cast:1.0,range:5,aoe:1.25,mult:2.45,chain:2},
    10:{name:'지옥불 폭발',icon:'☀️',kind:'fire',cooldown:16,cast:1.5,range:5,aoe:1.9,mult:3.6,burn:4}
  },
  darkmage:{
    1:{name:'암흑탄',icon:'🌑',kind:'dark',cooldown:8,cast:0.9,range:5,mult:2.1,debuff:'atk'},
    5:{name:'공허의 속박',icon:'⛓️',kind:'dark',cooldown:12,cast:1.1,range:5,mult:2.3,root:1.2},
    10:{name:'종말의 저주',icon:'🕳️',kind:'dark',cooldown:18,cast:1.6,range:5,aoe:1.6,mult:3.7,debuff:'atk',dot:6}
  },
  golem:{
    1:{name:'대지의 충격',icon:'🪨',kind:'earth',cooldown:11,cast:1.0,range:2,aoe:1.2,mult:2.1,knock:1},
    5:{name:'암석 갑주',icon:'🛡️',kind:'earth',cooldown:14,cast:1.2,range:3,aoe:1.8,mult:0,selfShield:0.22},
    10:{name:'지각 붕괴',icon:'🌋',kind:'earth',cooldown:19,cast:1.8,range:4,aoe:2.0,mult:4.0,stun:1.2}
  },
  dragon:{
    1:{name:'화염 브레스',icon:'🐉',kind:'fire',cooldown:10,cast:1.0,range:5,aoe:1.4,mult:2.5,burn:3},
    5:{name:'용의 포효',icon:'👹',kind:'fire',cooldown:14,cast:1.3,range:5,aoe:2.0,mult:0,buffAtk:0.20},
    10:{name:'멸망의 브레스',icon:'☄️',kind:'fire',cooldown:20,cast:1.8,range:6,aoe:2.3,mult:4.8,burn:8}
  },
  skeleton_archer:{
    1:{name:'망령의 화살',icon:'🏹',kind:'dark',cooldown:8,cast:0.8,range:6,mult:2.2},
    5:{name:'죽음의 연사',icon:'🏹',kind:'dark',cooldown:11,cast:1.0,range:6,aoe:1.15,mult:2.5,shots:3},
    10:{name:'영혼 관통',icon:'👻',kind:'dark',cooldown:16,cast:1.3,range:7,mult:4.0,armorPierce:0.35}
  },
  slime_king:{
    1:{name:'왕의 점액포',icon:'👑',kind:'acid',cooldown:10,cast:1.0,range:4,aoe:1.5,mult:2.2,slow:0.25},
    5:{name:'점액 장판',icon:'🫧',kind:'poison',cooldown:13,cast:1.1,range:4,aoe:2.0,mult:2.4,root:1.0},
    10:{name:'슬라임 왕국',icon:'👑',kind:'acid',cooldown:19,cast:1.6,range:5,aoe:2.2,mult:4.0,selfHeal:0.25}
  },
  berserker_orc:{
    1:{name:'광전의 도끼',icon:'🪓',kind:'rage',cooldown:8,cast:0.7,range:2,mult:2.4},
    5:{name:'피의 질주',icon:'🩸',kind:'rage',cooldown:12,cast:1.0,range:3,mult:3.0,lifeSteal:0.2},
    10:{name:'오크 대학살',icon:'💢',kind:'rage',cooldown:17,cast:1.4,range:3,aoe:1.5,mult:4.4,lifeSteal:0.28,berserk:0.25}
  },
  skeleton_warrior:{
    1:{name:'방패 강타',icon:'🛡️',kind:'steel',cooldown:10,cast:0.8,range:2,mult:2.0,stun:0.7},
    5:{name:'불굴의 방진',icon:'⚔️',kind:'steel',cooldown:14,cast:1.1,range:3,aoe:1.8,mult:0,selfShield:0.30},
    10:{name:'죽음의 철벽',icon:'🏰',kind:'steel',cooldown:19,cast:1.5,range:3,aoe:1.8,mult:3.0,selfShield:0.45,buffDef:0.25}
  },
  grim_reaper:{
    1:{name:'사신의 낫',icon:'☠️',kind:'dark',cooldown:8,cast:0.8,range:2,mult:2.4,execute:true},
    5:{name:'영혼 수확',icon:'💀',kind:'dark',cooldown:12,cast:1.0,range:3,mult:3.2,lifeSteal:0.35,execute:true},
    10:{name:'사망 선고',icon:'🕯️',kind:'dark',cooldown:18,cast:1.4,range:5,aoe:1.1,mult:5.0,execute:true,mark:true}
  },
  flame_spirit:{
    1:{name:'화염 구슬',icon:'🔥',kind:'fire',cooldown:8,cast:0.8,range:5,mult:2.3},
    5:{name:'불의 파동',icon:'🌋',kind:'fire',cooldown:12,cast:1.0,range:5,aoe:1.4,mult:2.8,burn:3},
    10:{name:'태양 폭발',icon:'☀️',kind:'fire',cooldown:17,cast:1.5,range:6,aoe:2.0,mult:4.2,burn:7}
  },
  ice_golem:{
    1:{name:'빙결 파동',icon:'❄️',kind:'ice',cooldown:10,cast:0.9,range:3,aoe:1.2,mult:2.0,stun:0.7},
    5:{name:'빙벽 생성',icon:'🧊',kind:'ice',cooldown:14,cast:1.2,range:4,aoe:1.6,mult:0,slow:0.45,selfShield:0.15},
    10:{name:'절대영도',icon:'❄️',kind:'ice',cooldown:20,cast:1.7,range:5,aoe:2.4,mult:4.0,stun:1.8}
  },
  dark_sorcerer:{
    1:{name:'암흑 창',icon:'🜏',kind:'dark',cooldown:8,cast:0.8,range:6,mult:2.5},
    5:{name:'공허 폭우',icon:'🌑',kind:'dark',cooldown:12,cast:1.1,range:6,aoe:1.3,mult:3.0,dot:4},
    10:{name:'심연의 붕괴',icon:'🕳️',kind:'dark',cooldown:18,cast:1.6,range:7,aoe:2.0,mult:4.5,dot:8}
  },
  rock_colossus:{
    1:{name:'거인의 주먹',icon:'✊',kind:'earth',cooldown:10,cast:0.9,range:2,mult:2.5,knock:1},
    5:{name:'산맥의 포효',icon:'⛰️',kind:'earth',cooldown:15,cast:1.2,range:4,aoe:2.0,mult:0,buffDef:0.20},
    10:{name:'대지 종말',icon:'🌋',kind:'earth',cooldown:21,cast:1.9,range:5,aoe:2.6,mult:5.0,stun:1.5,knock:2}
  },
  lich_lord:{
    1:{name:'영혼 흡수',icon:'💀',kind:'dark',cooldown:9,cast:0.9,range:5,mult:2.2,lifeSteal:0.35},
    5:{name:'죽음의 파동',icon:'☠️',kind:'dark',cooldown:13,cast:1.1,range:5,aoe:1.5,mult:2.7,lifeSteal:0.25,debuff:'atk'},
    10:{name:'망자의 군주',icon:'👑',kind:'dark',cooldown:19,cast:1.7,range:6,aoe:2.3,mult:4.4,lifeSteal:0.4,buffAtk:0.22,healAll:0.10}
  },
  goblin_archer:{
    1:{name:'속사',icon:'🏹',kind:'wind',cooldown:7,cast:0.6,range:4,mult:1.8},
    5:{name:'다중 사격',icon:'🎯',kind:'wind',cooldown:11,cast:0.9,range:5,aoe:1.1,mult:2.3},
    10:{name:'화살비',icon:'🌧️',kind:'wind',cooldown:16,cast:1.3,range:6,aoe:1.8,mult:3.2}
  },
  ghost_sniper:{
    1:{name:'영혼 저격',icon:'👻',kind:'bullet',cooldown:9,cast:0.9,range:6,mult:2.8,crit:0.25},
    5:{name:'관통탄',icon:'🔫',kind:'bullet',cooldown:13,cast:1.2,range:7,mult:3.4,crit:0.35,pierce:true},
    10:{name:'처형의 일격',icon:'💥',kind:'bullet',cooldown:19,cast:1.7,range:8,mult:5.0,crit:0.5,pierce:true}
  },
  angry_orc:{
    1:{name:'분노의 찌르기',icon:'🔱',kind:'rage',cooldown:8,cast:0.7,range:1,mult:2.0},
    5:{name:'광폭화',icon:'💢',kind:'rage',cooldown:12,cast:1.0,range:1,mult:2.5,buffAtk:0.25},
    10:{name:'최후의 돌격',icon:'🌋',kind:'rage',cooldown:17,cast:1.4,range:2,aoe:1.3,mult:3.6,buffAtk:0.4}
  },
  blood_berserker:{
    1:{name:'피의 도끼질',icon:'🪓',kind:'rage',cooldown:8,cast:0.8,range:1,mult:2.3,lifeSteal:0.2},
    5:{name:'광란의 연격',icon:'🔥',kind:'rage',cooldown:12,cast:1.1,range:2,aoe:1.2,mult:2.9,lifeSteal:0.25},
    10:{name:'최후의 격노',icon:'💢',kind:'rage',cooldown:20,cast:1.6,range:2,aoe:1.7,mult:4.6,lifeSteal:0.35,buffAtk:0.3}
  },
  shadow_goblin:{
    1:{name:'기습',icon:'🗡️',kind:'wraith',cooldown:8,cast:0.6,range:1,mult:2.4},
    5:{name:'그림자 이동',icon:'🌑',kind:'wraith',cooldown:12,cast:0.9,range:3,mult:2.9,crit:0.3},
    10:{name:'암흑 처형',icon:'☠️',kind:'wraith',cooldown:17,cast:1.3,range:3,mult:4.2,crit:0.4}
  },
  nightstalker:{
    1:{name:'심연의 발톱',icon:'🖤',kind:'wraith',cooldown:9,cast:0.8,range:1,mult:2.6},
    5:{name:'어둠 확산',icon:'🌫️',kind:'wraith',cooldown:13,cast:1.1,range:4,aoe:1.4,mult:3.1,debuff:'def'},
    10:{name:'심연의 심판',icon:'👁️',kind:'fear',cooldown:19,cast:1.6,range:4,aoe:2.0,mult:4.7,stun:1.0}
  },
  bone_priest:{
    1:{name:'저주의 지팡이',icon:'🦴',kind:'curse',cooldown:9,cast:0.9,range:3,mult:1.6,debuff:'atk'},
    5:{name:'백골 치유',icon:'✚',kind:'heal',cooldown:12,cast:1.1,range:3,aoe:1.3,mult:0,healAll:0.12},
    10:{name:'망자의 축복',icon:'💀',kind:'heal',cooldown:18,cast:1.6,range:4,aoe:1.8,mult:0,healAll:0.2,buffDef:0.15}
  },
  fallen_seraph:{
    1:{name:'타락한 깃털',icon:'🪶',kind:'dark',cooldown:9,cast:0.9,range:3,mult:2.2},
    5:{name:'어둠의 축복',icon:'✨',kind:'heal',cooldown:13,cast:1.2,range:4,aoe:1.5,mult:0,healAll:0.15,buffAtk:0.15},
    10:{name:'심판의 날개',icon:'😇',kind:'dark',cooldown:20,cast:1.7,range:5,aoe:2.1,mult:4.2,healAll:0.2,buffDef:0.2}
  },
  cursed_shaman:{
    1:{name:'저주 부적',icon:'🏮',kind:'curse',cooldown:8,cast:0.8,range:3,mult:1.9,debuff:'atk'},
    5:{name:'악령 강령',icon:'👻',kind:'fear',cooldown:12,cast:1.1,range:4,aoe:1.4,mult:2.4,debuff:'atk',fear:0.25},
    10:{name:'죽음의 의식',icon:'💀',kind:'curse',cooldown:18,cast:1.6,range:5,aoe:2.0,mult:3.8,debuff:'atk',fear:0.4}
  },

  // ── v60 · 신규 몬스터 스킬 (출혈·기절·둔화·속박·화상·방어막·아군 강화·회복·처형·격분 등 구현된 효과만 사용) ──
  lizardman:{
    1:{name:'창날 찌르기',icon:'🔱',kind:'steel',cooldown:8,cast:0.7,range:2,mult:2.1,bleed:2},
    5:{name:'비늘 방어',icon:'🛡️',kind:'steel',cooldown:12,cast:0.9,range:2,mult:2.4,selfShield:0.25},
    10:{name:'리자드 군세',icon:'🦎',kind:'steel',cooldown:16,cast:1.3,range:3,aoe:1.3,mult:3.1,buffAtk:0.15}
  },
  minotaur:{
    1:{name:'뿔 들이받기',icon:'🐂',kind:'earth',cooldown:9,cast:0.7,range:2,mult:2.3,stun:0.6},
    5:{name:'분쇄 돌진',icon:'💢',kind:'earth',cooldown:12,cast:1.0,range:3,aoe:1.2,mult:2.8,stun:0.8},
    10:{name:'미궁의 왕',icon:'👑',kind:'earth',cooldown:17,cast:1.5,range:4,aoe:1.8,mult:3.9,stun:1.0}
  },
  spiked_turtle:{
    1:{name:'껍질 웅크리기',icon:'🐢',kind:'earth',cooldown:10,cast:0.8,range:2,mult:1.6,selfShield:0.30},
    5:{name:'진흙 뿜기',icon:'🟤',kind:'earth',cooldown:11,cast:0.9,range:3,mult:1.8,slow:true},
    10:{name:'거북 진영',icon:'🛡️',kind:'earth',cooldown:16,cast:1.3,range:3,aoe:1.3,mult:2.2,buffDef:0.20,selfShield:0.30}
  },
  bomb_goblin:{
    1:{name:'화염병',icon:'🍾',kind:'fire',cooldown:9,cast:0.8,range:4,aoe:1.1,mult:1.9,burn:3},
    5:{name:'연쇄 폭탄',icon:'💣',kind:'fire',cooldown:12,cast:1.0,range:4,aoe:1.2,mult:2.4,burn:3},
    10:{name:'대폭발',icon:'💥',kind:'fire',cooldown:17,cast:1.5,range:5,aoe:1.7,mult:3.5,burn:4}
  },
  vine_archer:{
    1:{name:'속박의 화살',icon:'🏹',kind:'nature',cooldown:9,cast:0.8,range:5,mult:2.1,root:0.8},
    5:{name:'가시 그물',icon:'🕸️',kind:'nature',cooldown:12,cast:1.1,range:5,aoe:1.2,mult:2.4,slow:true},
    10:{name:'대지의 속박',icon:'🌿',kind:'nature',cooldown:17,cast:1.5,range:6,aoe:1.6,mult:3.3,root:1.4}
  },
  wisp:{
    1:{name:'마력탄',icon:'🔵',kind:'arcane',cooldown:8,cast:0.8,range:3,mult:1.9},
    5:{name:'불꽃 분열',icon:'✨',kind:'fire',cooldown:11,cast:1.0,range:3,aoe:1.0,mult:2.3},
    10:{name:'도깨비 축제',icon:'🎆',kind:'fire',cooldown:16,cast:1.4,range:4,aoe:1.5,mult:3.2,burn:3}
  },
  frost_witch:{
    1:{name:'서리 화살',icon:'❄️',kind:'ice',cooldown:8,cast:0.8,range:4,mult:2.1,slow:true},
    5:{name:'눈보라',icon:'🌨️',kind:'ice',cooldown:12,cast:1.1,range:4,aoe:1.4,mult:2.6,slow:true},
    10:{name:'절대영도',icon:'🧊',kind:'ice',cooldown:18,cast:1.6,range:5,aoe:2.0,mult:3.7,stun:0.8}
  },
  lightning_mage:{
    1:{name:'스파크',icon:'⚡',kind:'storm',cooldown:8,cast:0.7,range:4,mult:2.0,stun:0.3},
    5:{name:'연쇄 번개',icon:'🌩️',kind:'storm',cooldown:12,cast:1.0,range:4,aoe:1.5,mult:2.6},
    10:{name:'뇌우',icon:'⛈️',kind:'storm',cooldown:18,cast:1.6,range:5,aoe:2.2,mult:3.8,stun:0.5}
  },
  goblin_shaman:{
    1:{name:'뼈 지팡이 강타',icon:'🦴',kind:'steel',cooldown:9,cast:0.8,range:2,mult:1.6},
    5:{name:'치유 부적',icon:'✚',kind:'heal',cooldown:12,cast:1.1,range:4,aoe:1.3,mult:0,healAll:0.12},
    10:{name:'부족의 축복',icon:'🥁',kind:'heal',cooldown:18,cast:1.6,range:4,aoe:1.8,mult:0,healAll:0.20,buffAtk:0.20}
  },
  swamp_hag:{
    1:{name:'진흙 던지기',icon:'🟫',kind:'poison',cooldown:8,cast:0.8,range:4,mult:1.8,slow:true},
    5:{name:'늪 지대',icon:'🌫️',kind:'poison',cooldown:12,cast:1.1,range:4,aoe:1.3,mult:2.3,slow:true},
    10:{name:'수렁',icon:'🕳️',kind:'poison',cooldown:17,cast:1.5,range:5,aoe:2.0,mult:3.2,root:1.2}
  },
  thief_rat:{
    1:{name:'뒤통수',icon:'🗡️',kind:'steel',cooldown:8,cast:0.6,range:1,mult:2.3,execute:true},
    5:{name:'연속 찌르기',icon:'🗡️',kind:'steel',cooldown:11,cast:0.8,range:2,mult:2.7,bleed:2,execute:true},
    10:{name:'쥐떼 습격',icon:'🐀',kind:'steel',cooldown:16,cast:1.2,range:3,aoe:1.2,mult:3.3,execute:true}
  },
  frenzied_bear:{
    1:{name:'발톱 할퀴기',icon:'🐾',kind:'rage',cooldown:8,cast:0.7,range:2,mult:2.3,bleed:2},
    5:{name:'광폭화',icon:'🔥',kind:'rage',cooldown:12,cast:0.9,range:2,mult:2.8,berserk:0.3},
    10:{name:'곰의 포효',icon:'🐻',kind:'rage',cooldown:17,cast:1.4,range:3,aoe:1.8,mult:3.8,stun:0.6,berserk:0.3}
  }
};
function getMonsterSkill(m){
  const table=MONSTER_SKILLS[m.typeId]; if(!table) return null;
  const lv=m.tier||1;
  return lv>=10 ? table[10] : lv>=5 ? table[5] : table[1];
}
function monsterSkillEligible(m,skill){
  if(!skill || (m.skillCooldown||0)>0 || m.castingSkill) return false;
  const range=skill.range||Math.max(1,m.range||1);
  return state.heroes.some(h=>h.hp>0 && Math.abs(h.r-m.r)+Math.abs(h.c-m.c)<=range && !losBlocked(m.r,m.c,h.r,h.c));
}
function findMonsterSkillTarget(m,skill){
  const range=skill.range||Math.max(1,m.range||1); let best=null,bestScore=-Infinity;
  for(const h of state.heroes){
    if(h.hp<=0) continue;
    const d=Math.abs(h.r-m.r)+Math.abs(h.c-m.c); if(d>range || losBlocked(m.r,m.c,h.r,h.c)) continue;
    let score=100-d*8 + (h.isBoss?18:0) + ((1-h.hp/Math.max(1,h.maxHp))*35);
    if(skill.execute && h.hp<h.maxHp*.35) score+=40;
    if(skill.debuff==='atk' && h.atk>8) score+=18;
    if(score>bestScore){bestScore=score;best=h;}
  }
  return best;
}
function startMonsterSkill(m){
  const skill=getMonsterSkill(m); if(!monsterSkillEligible(m,skill)) return false;
  const target=findMonsterSkillTarget(m,skill); if(!target) return false;
  m.castingSkill={...skill,elapsed:0,targetId:target.id,uid:++spellCastUid};
  const meta=monsterMetaStats(m.typeId);
  m.skillCooldown=skill.cooldown*(meta.skillCooldownMul||1);
  m.skillTarget={r:target.r,c:target.c,id:target.id};
  Sound.skill(skill.kind,skill.cast);
  state.fxEvents.push({type:'skillCast',r:m.r,c:m.c,spell:mcIsHealSkill(skill)?'holy':skill.kind,duration:skill.cast*1000,monster:true,icon:skill.icon,ring:!(mcIsDarkSkill(skill)||mcIsHealSkill(skill))});
  state.fxEvents.push({type:'monsterSkillName',r:m.r,c:m.c,text:skill.icon+' '+skill.name});
  return true;
}
function finishMonsterSkill(m){
  const s=m.castingSkill; if(!s) return;
  const target=state.heroes.find(h=>h.id===s.targetId&&h.hp>0&&!losBlocked(m.r,m.c,h.r,h.c)) || state.heroes.find(h=>h.hp>0&&Math.abs(h.r-m.r)+Math.abs(h.c-m.c)<=(s.range||4)&&!losBlocked(m.r,m.c,h.r,h.c));
  m.castingSkill=null;
  if(!target) return;
  const center={r:target.r,c:target.c};
  const targets=state.heroes.filter(h=>h.hp>0&&Math.abs(h.r-center.r)+Math.abs(h.c-center.c)<=(s.aoe||0));
  const hitTargets=(s.aoe?targets:[target]).filter(Boolean);
  let totalDamage=0;
  for(const h of hitTargets){
    let mult=s.mult||0;
    mult*=monsterMetaStats(m.typeId).skillDamageMul||1;
    if(s.execute&&h.hp<h.maxHp*.35) mult*=1.6;
    const base=Math.max(1,Math.round(m.atk*mult));
    const resist=(h.def||0)*(s.armorPierce?1-s.armorPierce:1);
    let dmg=Math.max(1,Math.round(base-resist));
    if(s.berserk) dmg=Math.round(dmg*(1+s.berserk));
    h.hp-=dmg; totalDamage+=dmg;
    state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:dmg,color:skillStyle(s.kind).color});
    state.fxEvents.push({type:'spark',r:h.r,c:h.c,color:skillStyle(s.kind).color});
    if(h.hp<=0) h.killerMonsterId=m.id;
    if(s.debuff==='atk') h.monsterSkillCurseUntil=performance.now()+4200;
    if(s.slow) h.monsterSlowUntil=performance.now()+3800;
    if(s.root) h.monsterRootUntil=performance.now()+s.root*1000;
    if(s.stun) h.stunTicks=Math.max(h.stunTicks||0,Math.round(s.stun*1000/TICK_MS));
    if(s.knock && h.hp>0 && typeof physicalForceMove==='function'){
      let kr=Math.sign(h.r-m.r),kc=Math.sign(h.c-m.c);
      if(kr)kc=0;else if(!kc)kc=1;
      physicalForceMove(h,kr,kc,s.knock,{source:m.typeId||'monster_knock',damage:Math.max(4,Math.round(m.atk*.25)),launch:false});
    }
    if(s.bleed) h.monsterBleedUntil=performance.now()+s.bleed*1000;
    if(s.dot||s.burn){ h.monsterSkillDotUntil=performance.now()+(s.dot||s.burn)*1000; h.monsterSkillDotDmg=Math.max(2,Math.round(m.atk*.06)); }
  }
  if(s.lifeSteal){ m.hp=Math.min(m.maxHp,m.hp+Math.max(1,Math.round(totalDamage*s.lifeSteal))); }
  if(s.selfHeal){ m.hp=Math.min(m.maxHp,m.hp+Math.round(m.maxHp*s.selfHeal)); }
  if(s.selfShield) m.skillShieldUntil=performance.now()+6000, m.skillShieldMul=1-s.selfShield;
  if(s.buffAtk){ for(const o of state.monsters){if(o!==m&&o.hp>0&&Math.abs(o.r-m.r)+Math.abs(o.c-m.c)<=3)o.skillAtkBuffUntil=performance.now()+7000,o.skillAtkBuffMul=1+s.buffAtk;} }
  if(s.buffDef){ for(const o of state.monsters){if(o!==m&&o.hp>0&&Math.abs(o.r-m.r)+Math.abs(o.c-m.c)<=3)o.skillDefBuffUntil=performance.now()+7000,o.skillDefBuffMul=1+s.buffDef;} }
  if(s.healAll){ for(const o of state.monsters){if(o.hp>0&&Math.abs(o.r-m.r)+Math.abs(o.c-m.c)<=4){const heal=Math.max(3,Math.round(o.maxHp*s.healAll));o.hp=Math.min(o.maxHp,o.hp+heal);state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'+'+heal,color:'#8effb0'});}} }
  if(s.summon){
    const cap=state.monsterCap||MONSTER_CAP_START;
    const candidates=neighbors4(m.r,m.c).filter(([r,c])=>{const t=state.grid[r][c];return state.monsters.length<cap&&t&&(t.type==='floor'||t.type==='core')&&!t.isEntrance&&!t.obstacle&&!monsterAt(r,c)&&!isHeroAt(r,c);});
    const spot=candidates[0];
    if(spot){
      const sm=createMonsterEntity(spot[0],spot[1],m.tier>=10?'goblin':'slime',{tier:1,invested:0,playSound:false,log:false,atkMul:.75,hpMul:.75});
      if(sm){ state.fxEvents.push({type:'spawnBurst',r:spot[0],c:spot[1],color:'rgba(224,182,74,.85)'}); addLog('고블린 군세가 지원병을 불러냈습니다.'); }
    }
  }
  state.fxEvents.push({type:'monsterSkillImpact',r:center.r,c:center.c,spell:mcIsHealSkill(s)?'holy':s.kind,radius:s.aoe||0.9,icon:s.icon});
  addLog(`<span class="hl-gold">${s.icon} ${s.name}</span> 발동! ${hitTargets.length}명의 용사에게 ${totalDamage} 피해`);
}


function monsterSkillsPanelHtml(m){
  const table=MONSTER_SKILLS[m.typeId];
  if(!table) return `<div class="panel-hint" style="margin-top:6px;"><b style="color:var(--gold)">⚔️ 스킬</b><br>등록된 고유 스킬 정보가 없습니다.</div>`;
  const lv=m.tier||1;
  const rows=[1,5,10].map(level=>{
    const s=table[level];
    const unlocked=lv>=level;
    const current=unlocked && ((level===10&&lv>=10)||(level===5&&lv>=5&&lv<10)||(level===1&&lv<5));
    const cls=current?'skill-row current':unlocked?'skill-row unlocked':'skill-row locked';
    const status=current?'현재':'해금됨';
    return `<div class="${cls}">
      <div class="skill-row-main"><span class="skill-level">Lv.${level}</span><span class="skill-icon">${s.icon}</span><b>${s.name}</b><span class="skill-status">${unlocked?status:'🔒 미해금'}</span></div>
      <div class="skill-row-meta">시전 ${Number(s.cast||0).toFixed(1)}초 · 재사용 ${Number(s.cooldown||0).toFixed(0)}초${s.aoe?` · 범위 ${s.aoe}`:''}</div>
    </div>`;
  }).join('');
  return `<div class="panel-hint skill-panel" style="margin-top:6px;"><b style="color:var(--gold)">✨ 보유 스킬</b><div class="skill-list">${rows}</div></div>`;
}
function heroSkillsPanelHtml(h){
  const base=HERO_SKILLS[h.typeId];
  const lv=h.level||1;
  if(h.typeId==='mage'){
    const variants=[
      {level:6, skill:HERO_SKILLS.mage},
      {level:12, skill:MAGE_SKILL_T2},
      {level:20, skill:MAGE_SKILL_T3}
    ];
    const rows=variants.map(v=>{
      const unlocked=lv>=v.level;
      const current=unlocked && ((v.level===20&&lv>=20)||(v.level===12&&lv<20)||(v.level===6&&lv<12));
      return `<div class="skill-row ${current?'current':unlocked?'unlocked':'locked'}"><div class="skill-row-main"><span class="skill-level">Lv.${v.level}</span><span class="skill-icon">${v.skill.icon}</span><b>${v.skill.name}</b><span class="skill-status">${unlocked?(current?'현재':'해금됨'):'🔒 미해금'}</span></div><div class="skill-row-meta">시전 ${Number(v.skill.cast).toFixed(1)}초 · 재사용 ${Number(v.skill.cooldown).toFixed(0)}초 · 범위 ${spellAreaLabel(v.skill.cast)}</div></div>`;
    }).join('');
    return `<div class="panel-hint skill-panel" style="margin-top:6px;"><b style="color:var(--gold)">✨ 보유 스킬</b><div class="skill-list">${rows}</div></div>`;
  }
  if(!base) return `<div class="panel-hint skill-panel" style="margin-top:6px;"><b style="color:var(--gold)">✨ 보유 스킬</b><br>현재 이 영웅에게 등록된 고유 스킬이 없습니다.</div>`;
  const unlocked=lv>=base.unlock;
  return `<div class="panel-hint skill-panel" style="margin-top:6px;"><b style="color:var(--gold)">✨ 보유 스킬</b><div class="skill-list"><div class="skill-row ${unlocked?'current':'locked'}"><div class="skill-row-main"><span class="skill-level">Lv.${base.unlock}</span><span class="skill-icon">${base.icon}</span><b>${base.name}</b><span class="skill-status">${unlocked?'현재':'🔒 미해금'}</span></div><div class="skill-row-meta">시전 ${Number(base.cast||0).toFixed(1)}초 · 재사용 ${Number(base.cooldown||0).toFixed(0)}초${(heroTypeOf(h)&&heroTypeOf(h).caster&&base.mult>0)?' · 범위 '+spellAreaLabel(base.areaCast??base.cast):''}</div></div></div></div>`;
}

function getAvailableMonsterTypes(){const unlocked=state&&state.unlockedMonsterIds?state.unlockedMonsterIds:[];return MONSTER_TYPES.filter(mt=>!mt.cardOnly||unlocked.includes(mt.id));}

const HERO_TYPES=[
  {id:'swordsman', name:'검사',     hpMult:1.0, atkMult:1.0, rewardMult:1.0, range:1, unlockAt:0},
  {id:'archer',    name:'궁수',     hpMult:0.8, atkMult:1.1, rewardMult:1.0, range:2, unlockAt:0},
  {id:'mage',      name:'마법사',   hpMult:0.85,atkMult:1.10,rewardMult:1.1, range:5, unlockAt:6, caster:true},
  {id:'assassin',  name:'암살자',   hpMult:0.7, atkMult:1.3, rewardMult:1.1, range:1, unlockAt:2},
  {id:'paladin',   name:'팔라딘',   hpMult:1.6, atkMult:0.9, rewardMult:1.3, range:1, unlockAt:2, knockbackChance:0.30},
  {id:'priest',    name:'사제',     hpMult:1.0, atkMult:0.8, rewardMult:1.1, range:1, unlockAt:3},
  {id:'berserker', name:'광전사',   hpMult:1.3, atkMult:1.35,rewardMult:1.4, range:1, unlockAt:3},
  {id:'gunslinger',name:'건슬링어', hpMult:0.9, atkMult:1.4, rewardMult:1.2, range:2, unlockAt:4},
  {id:'summoner',  name:'소환사',   hpMult:0.9, atkMult:1.0, rewardMult:1.3, range:1, unlockAt:5},
  {id:'dragoon',   name:'용기사',   hpMult:1.4, atkMult:1.3, rewardMult:1.6, range:1, unlockAt:6, pierceTiles:2, pierceDmgMul:0.75},
  // ── 신규 영웅 8종 ──
  {id:'shieldbearer', name:'방패병',       hpMult:1.75,atkMult:0.80,rewardMult:1.25,range:1, unlockAt:3,
    dmgReduction:0.25, digTimeMul:1.20, knockbackChance:0.30},
  {id:'hunter',        name:'사냥꾼',       hpMult:0.80,atkMult:1.20,rewardMult:1.10,range:3, unlockAt:4,
    rangedBonus:0.15, monsterSightRange:5 /* 예시: 몬스터를 더 멀리서 알아챔 */},
  {id:'miner',         name:'광부',         hpMult:1.20,atkMult:0.70,rewardMult:1.00,range:1, unlockAt:2,
    digTimeMul:0.5},
  {id:'archmage',      name:'대현자',       hpMult:0.80,atkMult:1.15,rewardMult:1.30,range:5, unlockAt:6, caster:true,
    purify:true, purifyRange:3},
  {id:'swordsaint',    name:'검성',         hpMult:1.15,atkMult:1.55,rewardMult:1.40,range:1, unlockAt:8,
    maxHpDmgPct:0.05, maxHpDmgCap:30, pierceTiles:2, pierceDmgMul:0.75},
  {id:'vampire',       name:'흡혈귀',       hpMult:1.10,atkMult:1.15,rewardMult:1.50,range:1, unlockAt:10,
    lifestealPct:0.20, lifestealCap:12},
  {id:'shadowrogue',   name:'그림자 도적',   hpMult:0.65,atkMult:1.15,rewardMult:1.30,range:1, unlockAt:7,
    moveSpeedMul:1.35, trapIgnoreChance:0.40, trapSightRange:5 /* 예시: 함정을 더 멀리서 알아채고 잘 피함 */},
  {id:'dragonslayer',  name:'드래곤 슬레이어',hpMult:1.35,atkMult:1.45,rewardMult:1.80,range:1, unlockAt:15,
    bigMonsterAtkBonus:0.25, bigMonsterHpThreshold:100, bigMonsterCooldown:5000, pierceTiles:2, pierceDmgMul:0.75},

  // ── 신규 영웅 12종 : 힐러/서포터/CC 원거리/개성형 근접/디버프/탱커 ──
  {id:'druid',          name:'드루이드',       hpMult:1.35,atkMult:0.75,rewardMult:1.35,range:3,   unlockAt:8,  role:'healer', support:true},
  {id:'miko',           name:'무녀',           hpMult:1.00,atkMult:0.85,rewardMult:1.25,range:3,   unlockAt:8,  role:'healer', support:true},
  {id:'bard',           name:'음유시인',       hpMult:0.90,atkMult:0.70,rewardMult:1.30,range:3,   unlockAt:10, role:'support', support:true},
  {id:'alchemist',      name:'연금술사',       hpMult:0.95,atkMult:0.75,rewardMult:1.35,range:3,   unlockAt:9,  role:'support', support:true},
  {id:'ice_mage',       name:'빙결술사',       hpMult:0.85,atkMult:1.20,rewardMult:1.35,range:5,   unlockAt:10, role:'rangedCC', caster:true},
  {id:'spirit_caller',  name:'정령사',         hpMult:0.90,atkMult:1.00,rewardMult:1.45,range:5,   unlockAt:12, role:'rangedSummon', caster:true},
  {id:'lancer',         name:'창기병',         hpMult:1.40,atkMult:1.30,rewardMult:1.45,range:2,   unlockAt:11, role:'melee', pierceTiles:2, pierceDmgMul:0.75},
  {id:'martial_artist', name:'권법가',         hpMult:1.20,atkMult:1.10,rewardMult:1.35,range:1,   unlockAt:10, role:'melee'},
  {id:'dual_wielder',  name:'이도류 검사',     hpMult:1.10,atkMult:1.40,rewardMult:1.45,range:1,   unlockAt:12, role:'melee'},
  {id:'curse_caster',  name:'저주술사',       hpMult:0.85,atkMult:1.00,rewardMult:1.45,range:5,   unlockAt:13, role:'debuffer', caster:true},
  {id:'dark_knight',   name:'흑기사',         hpMult:1.50,atkMult:1.20,rewardMult:1.60,range:1,   unlockAt:14, role:'ccMelee', pierceTiles:2, pierceDmgMul:0.75},
  {id:'ironclad',      name:'철벽기사',       hpMult:1.80,atkMult:0.80,rewardMult:1.55,range:2,   unlockAt:15, role:'tank', knockbackChance:0.30},

  // ── v51 · 왕국 정예 영웅 12종 : 중반(21~)~후반(66~) 웨이브 전용 강자들 ──
  // 기준: 일반 영웅 최고치(검성 1.15/1.55, 드래곤 슬레이어 1.35/1.45)보다 등장 웨이브가 늦을수록 더 강해집니다.
  // 사거리 2 이상이어도 role:'melee'/'tank'인 영웅은 창/방패로 싸우는 근접형이라 화살 대신 근접 연출을 씁니다.
  // ▸ 기마/창 계열 (근접 돌파)
  {id:'horseman',       name:'기병',              hpMult:1.35,atkMult:1.25,rewardMult:1.60,range:1, unlockAt:21, role:'melee',
    dmgReduction:0.05, moveSpeedMul:1.30},
  {id:'pikeman',        name:'왕국 창기병',       hpMult:1.50,atkMult:1.30,rewardMult:1.75,range:2, unlockAt:26, role:'melee',
    dmgReduction:0.10},
  {id:'griffon_knight', name:'그리폰 기사단',     hpMult:1.45,atkMult:1.50,rewardMult:2.10,range:1, unlockAt:41, role:'melee',
    trapIgnoreChance:0.55, moveSpeedMul:1.30 /* 하늘을 나는 기수: 지상 장애물을 55% 확률로 무시 */},
  {id:'sun_lancer',     name:'태양의 창기병',     hpMult:1.65,atkMult:1.60,rewardMult:2.30,range:2, unlockAt:46, role:'melee',
    dmgReduction:0.10, moveSpeedMul:1.15},
  {id:'royal_lance',    name:'왕국 랜스 기사단',  hpMult:1.60,atkMult:1.65,rewardMult:2.20,range:2, unlockAt:51, role:'melee',
    dmgReduction:0.10, moveSpeedMul:1.15, pierceTiles:3, pierceDmgMul:0.75},
  {id:'dragon_rider',   name:'용기병',            hpMult:2.00,atkMult:1.75,rewardMult:2.60,range:1, unlockAt:66, role:'melee',
    dmgReduction:0.10, bigMonsterAtkBonus:0.20, bigMonsterHpThreshold:100 /* 최상위 정예: 큰 몬스터에게 +20% */},
  // ▸ 정예 근접/방어
  {id:'royal_elite',    name:'왕국 정예병',       hpMult:1.70,atkMult:1.35,rewardMult:1.90,range:1, unlockAt:26, role:'melee',
    dmgReduction:0.15},
  {id:'royal_guard',    name:'왕국 수호대',       hpMult:2.30,atkMult:0.90,rewardMult:1.90,range:1, unlockAt:31, role:'tank',
    dmgReduction:0.30, digTimeMul:1.25, knockbackChance:0.30},
  // ▸ 원거리/마법/지원
  {id:'royal_longbow',  name:'왕국 장궁병',       hpMult:1.00,atkMult:1.65,rewardMult:1.90,range:5, unlockAt:21, role:'rangedDps',
    rangedBonus:0.10, monsterSightRange:6},
  {id:'battle_mage',    name:'전투 마도사',       hpMult:1.05,atkMult:1.70,rewardMult:1.90,range:5, unlockAt:36, role:'rangedDps', caster:true},
  {id:'rune_guardian',  name:'룬 수호자',         hpMult:1.50,atkMult:0.90,rewardMult:2.00,range:3, unlockAt:36, role:'support', support:true},
  {id:'imperial_magus', name:'황실 근위 마도단',  hpMult:1.40,atkMult:1.00,rewardMult:2.30,range:3, unlockAt:46, role:'healer',  support:true},
];
// v88 combat-opt: 전투 틱에서 반복되는 선형 HERO_TYPES.find()를 O(1) 조회로 치환합니다.
// HERO_TYPES 자체는 변경하지 않으므로 UI/데이터/밸런스는 기존과 동일합니다.
const HERO_TYPE_BY_ID=new Map(HERO_TYPES.map(x=>[x.id,x]));
function heroTypeOf(h){ return h?HERO_TYPE_BY_ID.get(h.typeId):undefined; }

const HERO_MELEE_WEAPON_TYPE={
  swordsman:'sword', assassin:'sword', paladin:'blunt', priest:'blunt', berserker:'blunt', summoner:'blunt', dragoon:'spear',
  shieldbearer:'blunt', miner:'blunt', swordsaint:'sword', vampire:'sword', shadowrogue:'sword', dragonslayer:'sword',
  lancer:'spear', martial_artist:'blunt', dual_wielder:'sword', dark_knight:'sword', ironclad:'blunt',
  horseman:'spear', pikeman:'spear', griffon_knight:'sword', sun_lancer:'spear', royal_lance:'spear', dragon_rider:'spear',
  royal_elite:'sword', royal_guard:'blunt'
};
function heroMeleeWeaponType(typeId){ return HERO_MELEE_WEAPON_TYPE[typeId]||'sword'; }
function heroMeleeImpactColor(typeId,fallback){
  if(fallback) return fallback;
  const t=heroMeleeWeaponType(typeId);
  return t==='spear' ? '#7ae8ff' : t==='blunt' ? '#ffc36a' : '#ff6977';
}
const HERO_MELEE_SKILL_FX={
  swordsman:{variant:'blade-burst',accent:'#dfe8ff'},
  assassin:{variant:'shadow-step',accent:'#ae88ff'},
  paladin:{variant:'holy-slam',accent:'#ffe48a'},
  berserker:{variant:'blood-roar',accent:'#ff845f'},
  dragoon:{variant:'dragon-lance',accent:'#ff9b62'},
  lancer:{variant:'rush-thrust',accent:'#9ce8ff'},
  martial_artist:{variant:'combo-burst',accent:'#ffd572'},
  dual_wielder:{variant:'twin-tempest',accent:'#b3f1ff'},
  dark_knight:{variant:'dread-cleave',accent:'#cb9bff'},
  horseman:{variant:'cavalry-charge',accent:'#ffc47f'},
  pikeman:{variant:'phalanx-drive',accent:'#a7ebff'},
  griffon_knight:{variant:'sky-dive',accent:'#d8f7ff'},
  sun_lancer:{variant:'solar-lance',accent:'#ffe16d'},
  royal_lance:{variant:'royal-charge',accent:'#d6edff'},
  dragon_rider:{variant:'dragon-flare',accent:'#ffa167'},
  royal_elite:{variant:'royal-slash',accent:'#dccdff'},
  ironclad:{variant:'shield-breaker',accent:'#8abaf9'},
  royal_guard:{variant:'guard-bastion',accent:'#9fcdff'}
};
function heroMeleeSkillFx(typeId){ return HERO_MELEE_SKILL_FX[typeId]||null; }
function heroMeleeBattleHitEvent(h,r,c,damage,dr,dc,color,strong,extra){
  const ev={type:'battleHit',r,c,damage,dr,dc,strong:!!strong,color:heroMeleeImpactColor(h&&h.typeId,color),weaponType:heroMeleeWeaponType(h&&h.typeId),attackerType:h&&h.typeId||''};
  if(extra) Object.assign(ev,extra);
  return ev;
}
function heroMeleeSkillImpactEvent(h,s,r,c,delay=0){
  const meta=heroMeleeSkillFx(h&&h.typeId);
  if(!meta||!s||!((s.mult||0)>0)) return null;
  return {
    type:'heroMeleeSkillImpact',
    r,c,delay,icon:s.icon||'',skillName:s.name||'',variant:meta.variant,accent:meta.accent,
    color:skillStyle(s.kind).color,weaponType:heroMeleeWeaponType(h.typeId),attackerType:h.typeId,
    radius:Math.max(.82,s.area?(spellAreaSpan(s.area)-1.05)/2:(s.aoe||.85))
  };
}

const HERO_SKILLS={
  swordsman:{name:'파쇄참',icon:'⚔️',cast:1.8,cooldown:9,range:2,aoe:1.0,mult:2.2,kind:'steel',unlock:2},
  archer:{name:'폭우의 화살',icon:'🏹',cast:2.2,cooldown:11,range:5,aoe:1.25,mult:1.8,kind:'wind',fx:'arrow_rain',unlock:3},
  mage:{name:'아케인 버스트',icon:'🔮',cast:3.0,areaCast:2.0,cooldown:11,range:5,aoe:1.35,mult:6.0,kind:'arcane',fx:'arcane_burst',unlock:6},
  assassin:{name:'그림자 급습',icon:'🗡️',cast:1.5,cooldown:8,range:3,aoe:.8,mult:2.7,kind:'dark',unlock:3},
  paladin:{name:'성역 강타',icon:'✨',cast:2.5,cooldown:13,range:3,aoe:1.35,mult:1.9,kind:'holy',unlock:3},
  priest:{name:'대회복',icon:'✚',cast:2.2,cooldown:12,range:4,aoe:2.2,mult:0,kind:'heal',unlock:4,heal:true},
  berserker:{name:'광전사의 포효',icon:'🔥',cast:1.7,cooldown:11,range:2,aoe:1.2,mult:2.0,kind:'rage',unlock:4},
  gunslinger:{name:'마력 난사',icon:'🔫',cast:2.0,cooldown:10,range:5,aoe:1.0,mult:2.0,kind:'bullet',fx:'mana_barrage',unlock:4},
  summoner:{name:'망령 폭주',icon:'☠️',cast:3.0,cooldown:14,range:4,aoe:1.6,mult:2.5,kind:'wraith',fx:'wraith_swarm',unlock:5},
  dragoon:{name:'용창 강습',icon:'🐉',cast:2.6,cooldown:12,range:3,aoe:1.1,mult:2.8,kind:'storm',unlock:6},

  druid:{name:'자연의 회복',icon:'🌿',cast:2.4,cooldown:18,range:3,aoe:2.0,mult:0,kind:'nature',fx:'nature_regen',unlock:8,regen:true},
  miko:{name:'신의 가호',icon:'🌸',cast:2.0,cooldown:16,range:3,aoe:2.0,mult:0,kind:'holy',fx:'divine_blessing',unlock:8,miko:true},
  bard:{name:'영웅의 노래',icon:'🎵',cast:2.2,cooldown:20,range:3,aoe:2.5,mult:0,kind:'song',fx:'heroic_anthem',unlock:10,bard:true},
  alchemist:{name:'포션 투척',icon:'🧪',cast:1.8,cooldown:14,range:3,aoe:1.0,mult:1.35,kind:'acid',fx:'potion_burst',unlock:9,alchemist:true},
  ice_mage:{name:'얼음 창격',icon:'❄️',cast:2.0,cooldown:11,range:5,aoe:.9,mult:8,kind:'ice',fx:'ice_lance',unlock:10,freeze:true},
  spirit_caller:{name:'정령 소환',icon:'🌀',cast:2.6,cooldown:29,range:4,aoe:1.0,mult:0,kind:'spirit',fx:'spirit_summon',unlock:12,spirit:true},
  lancer:{name:'돌진 창격',icon:'🏇',cast:1.8,cooldown:14,range:3,aoe:.75,mult:1.80,kind:'storm',unlock:11,lancer:true},
  martial_artist:{name:'연속 타격',icon:'👊',cast:1.4,cooldown:12,range:1,aoe:.8,mult:2.40,kind:'steel',unlock:10,martial:true},
  dual_wielder:{name:'쌍검 난무',icon:'⚔️',cast:1.4,cooldown:10,range:3,aoe:.8,mult:.90,kind:'steel',unlock:12,dual:true},
  curse_caster:{name:'광역 저주',icon:'☠️',cast:2.5,cooldown:18,range:5,aoe:1.4,mult:10,kind:'curse',fx:'mass_curse',unlock:13,curse:true},
  dark_knight:{name:'공포의 일격',icon:'👁️',cast:1.8,cooldown:16,range:3,aoe:1.0,mult:1.70,kind:'fear',unlock:14,fear:true},
  ironclad:{name:'도발',icon:'🛡️',cast:1.6,cooldown:20,range:4,aoe:4.0,mult:0,kind:'guard',unlock:15,taunt:true},

  // ── v51 · 왕국 정예 영웅 스킬 (ext = 확장 효과. 아래 applyHeroSkill* 함수가 처리합니다) ──
  // ext 옵션: stun(초) · knock(칸) · line(관통 칸수) · pierceDef(방어 무시 비율) · slowSec/slowMul · burnSec/burnPct(공격력 비율)
  //          defBreak{sec,mul} · selfGuard{sec,red} · selfAtk{sec,mul} · allyHealPct · allyAoe · allyGuard{sec,red} · allyAtk{sec,mul}
  //          cleanse · support(true면 적을 때리지 않는 순수 지원 스킬)
  horseman:{name:'기마 돌격',icon:'🐎',cast:1.4,cooldown:12,range:4,aoe:.8,mult:2.1,kind:'storm',unlock:20,
    ext:{stun:1.0,knock:1}},
  pikeman:{name:'방진 창격',icon:'🔱',cast:1.6,cooldown:13,range:3,aoe:1.2,mult:1.9,kind:'steel',unlock:25,
    ext:{selfGuard:{sec:5,red:.30}}},
  griffon_knight:{name:'급강하 습격',icon:'🦅',cast:1.2,cooldown:11,range:5,aoe:.9,mult:2.6,kind:'wind',unlock:40,
    ext:{stun:.8,pierceDef:.30}},
  sun_lancer:{name:'태양창 강림',icon:'☀️',cast:1.8,cooldown:14,range:4,aoe:1.4,mult:2.4,kind:'holy',unlock:45,
    ext:{burnSec:6,burnPct:.12,allyHealPct:.08,allyAoe:2.5}},
  royal_lance:{name:'랜스 차지',icon:'🏇',cast:1.8,cooldown:13,range:4,aoe:.8,mult:2.5,kind:'storm',unlock:50,
    ext:{line:3,pierceDef:.60,stun:.6,knock:1}},
  dragon_rider:{name:'용염 브레스',icon:'🐲',cast:2.4,cooldown:15,range:4,aoe:1.9,mult:2.7,kind:'fire',unlock:65,
    ext:{burnSec:6,burnPct:.15}},
  royal_elite:{name:'정예의 일격',icon:'⚜️',cast:1.5,cooldown:12,range:2,aoe:1.0,mult:2.3,kind:'steel',unlock:25,
    ext:{selfAtk:{sec:6,mul:1.25}}},
  royal_guard:{name:'방벽 전개',icon:'🛡️',cast:1.6,cooldown:20,range:4,aoe:3.0,mult:0,kind:'guard',unlock:30,
    ext:{support:true,allyAoe:3.0,allyGuard:{sec:6,red:.30},selfGuard:{sec:6,red:.50}}},
  royal_longbow:{name:'관통 사격',icon:'🏹',cast:1.8,cooldown:11,range:6,aoe:.8,mult:2.4,kind:'wind',fx:'piercing_shot',unlock:20,
    ext:{line:4,pierceDef:.50,slowSec:3,slowMul:.70}},
  battle_mage:{name:'마력 폭발',icon:'💥',cast:3.0,cooldown:12,range:5,aoe:1.6,mult:14,kind:'arcane',fx:'mana_blast',unlock:35,
    ext:{defBreak:{sec:6,mul:.70}}},
  rune_guardian:{name:'룬 결계',icon:'🔰',cast:2.0,cooldown:17,range:4,aoe:2.5,mult:0,kind:'arcane',fx:'rune_barrier',unlock:35,
    ext:{support:true,allyAoe:2.5,allyGuard:{sec:7,red:.35},allyHealPct:.06}},
  imperial_magus:{name:'성광의 치유',icon:'🌟',cast:2.2,cooldown:15,range:4,aoe:2.5,mult:0,kind:'holy',fx:'radiant_heal',unlock:45,
    ext:{support:true,allyAoe:2.5,allyHealPct:.18,allyAtk:{sec:6,mul:1.15},cleanse:true,hurtBelow:.85}},
};
/* ==========================================================================
   v54 · 마법사 시전(캐스팅) 시스템
   - 마법사 계열(HERO_TYPES.caster)은 5칸 안에서 적을 탐지하면 곧바로 마법 시전을 시작합니다.
   - 기본 마법도 시전 시간이 있고(1~3초), 스킬은 2~5초. 시전 중에는 제자리에서 움직이지 않습니다.
   - 마법은 범위 공격이며, 캐스팅 시간이 길수록 범위가 넓어집니다 (아래 spellAreaByCast).
   ========================================================================== */
const MAGE_SKILL_T2={name:'메테오 샤워',icon:'☄️',cast:3.8,cooldown:16,range:5,aoe:1.8,mult:11.5,kind:'fire',fx:'meteor_shower',unlock:12};
const MAGE_SKILL_T3={name:'종말의 혜성',icon:'☄️',cast:5.2,cooldown:21,range:5,aoe:2.3,mult:18,kind:'fire',fx:'doom_comet',unlock:20};
// 시전 시간 → 범위 반경(칸). 거리² <= 반경² 인 칸이 맞습니다.
//   ≤1.3초 : 3×3(9칸) · ≤2.2초 : 3×3+십자 끝(13칸, 약 4×4) · ≤3.6초 : 5×5 모서리 제외(21칸) · 그 이상 : 5×5(25칸)
function spellAreaByCast(cast){ return cast<=1.3?1.5 : cast<=2.2?2.0 : cast<=3.6?2.3 : 2.9; }
function spellAreaSpan(area){ return area<1.6?3:5; }
function spellAreaLabel(cast){ const a=spellAreaByCast(cast); return a<1.6?'3×3':a<2.1?'약 4×4':a<2.5?'약 5×5':'5×5'; }
// 기본 마법. v61: 초반 마법사(mage)는 플레이어가 대응할 시간을 확보하도록 최소 3초를 시전합니다.
// areaCast는 기존 착탄 범위를 유지하기 위한 기준 시전 시간으로, 캐스팅 연장 때문에 범위까지 커지는 것을 방지합니다.
const CASTER_BASIC_SPELLS={
  mage:          {name:'마력탄',    icon:'🔮',cast:3.0,areaCast:1.0,mult:2.6,kind:'arcane',fx:'arcane_bolt'},
  archmage:      {name:'성광 폭발', icon:'✨',cast:1.6,mult:6.4,kind:'holy',fx:'holy_burst'},
  ice_mage:      {name:'서리 화살', icon:'❄️',cast:1.2,mult:4.2,kind:'ice',fx:'frost_arrow',ext:{slowSec:1.5,slowMul:.8}},
  spirit_caller: {name:'정령탄',    icon:'🌀',cast:1.2,mult:3.6,kind:'spirit',fx:'spirit_orb'},
  curse_caster:  {name:'저주탄',    icon:'☠️',cast:1.2,mult:3.6,kind:'curse',fx:'curse_bolt'},
  battle_mage:   {name:'마력 화살', icon:'💥',cast:1.0,mult:4.0,kind:'arcane',fx:'battle_bolt'}
};
// v58 · 마법진 이펙트용: 시전마다 고유 번호를 붙이고, 마법진과 실제 폭발이 같은 중심 규칙을 쓰도록 공용화합니다.
let spellCastUid=0;
// v59 · 시전 이펙트 종류: 저주/흑마법 = 보라색 마법진, 힐러의 회복 = 성스러운 황금색 물결(마법진 없음)
const MC_DARK_KINDS=['dark','curse','wraith'];
function mcIsDarkSkill(s){ return !!s && MC_DARK_KINDS.includes(s.kind) && (s.mult||0)>0; }
function mcIsHealSkill(s){
  return !!s && !!(s.heal||s.regen||s.miko||s.kind==='heal'
    ||(s.ext&&s.ext.support&&s.ext.allyHealPct&&!s.ext.allyGuard)
    ||(s.healAll&&!((s.mult||0)>0)));
}
function mcColor(kind){ return MC_DARK_KINDS.includes(kind)?'#b46cf0':skillStyle(kind).color; }
// 착탄 범위(반경) → 마법진 지름(칸). 3×3 → 약 3.2칸, 약 4×4 → 4.4칸, 약 5×5 → 5.0칸, 5×5 → 5.8칸
function spellCircleCells(area){ return area<1.6?3.2 : area<2.1?4.4 : area<2.5?5.0 : 5.8; }
// 폭발 중심: 대상이 아직 살아 있고 시전자에게 보이면 그 현재 위치(추적), 아니면 마지막으로 본 위치.
function spellCastCenter(h,tg){
  const center=tg||{r:h.r,c:h.c};
  const live=(center.id!=null)?state.monsters.find(x=>x.id===center.id&&x.hp>0):null;
  if(live){ if(!losBlocked(h.r,h.c,live.r,live.c)) return {...center,r:live.r,c:live.c}; return center; }
  const mw=state.mawang;
  if(center.mawang&&mw&&mw.hp>0&&!mw.dead&&!losBlocked(h.r,h.c,mw.r,mw.c)) return {...center,r:mw.r,c:mw.c};
  return center;
}
function isCasterHero(h){ const ht=heroTypeOf(h); return !!(ht&&ht.caster&&CASTER_BASIC_SPELLS[h.typeId]); }
const SPELL_FALLING_FX=new Set(['meteor_shower','doom_comet','arrow_rain']);
const SPELL_STATIONARY_FX=new Set(['spirit_summon']);
function isFallingSpellFx(fx){ return !!fx && SPELL_FALLING_FX.has(fx); }
function isStationarySpellFx(fx){ return !!fx && SPELL_STATIONARY_FX.has(fx); }
function spellTravelDurationMs(fromR,fromC,toR,toC,fx){
  if(!fx) return 0;
  if(isFallingSpellFx(fx)) return fx==='doom_comet' ? 820 : 680;
  const cells=Math.hypot((toR??fromR)-fromR,(toC??fromC)-fromC);
  return Math.round(Math.max(260,Math.min(620,180+cells*88)));
}
function queueHeroSpellTravelFx(h,s,center){
  if(!h||!s||!s.fx||!center||isStationarySpellFx(s.fx)) return 0;
  const duration=spellTravelDurationMs(h.r,h.c,center.r,center.c,s.fx);
  const payload={fromR:h.r,fromC:h.c,toR:center.r,toC:center.c,spell:s.kind,fx:s.fx,color:skillStyle(s.kind).color,duration};
  if(isFallingSpellFx(s.fx)){
    state.fxEvents.push({type:'spellDrop',...payload,count:s.fx==='meteor_shower'?4:1,spread:s.fx==='meteor_shower'?0.8:0});
  }else{
    state.fxEvents.push({type:'spellProjectile',...payload});
  }
  return duration;
}
const HERO_RETALIATE_AGGRO_MS=7000;
function markHeroAggro(target,h,durationMs=HERO_RETALIATE_AGGRO_MS){
  if(!target||!h||h.hp<=0) return;
  const now=performance.now();
  target.provokedByHeroId=h.id;
  target.provokedUntil=now+Math.max(1000,Number(durationMs)||HERO_RETALIATE_AGGRO_MS);
  target.lastDamagedByHeroAt=now;
}
function heroAggroTarget(target){
  if(!target||!state||!Array.isArray(state.heroes)) return null;
  const now=performance.now();
  if(target.provokedByHeroId==null || now>=(target.provokedUntil||0)){
    target.provokedByHeroId=null; target.provokedUntil=0; return null;
  }
  const h=state.heroes.find(o=>o.id===target.provokedByHeroId&&o.hp>0);
  if(!h){ target.provokedByHeroId=null; target.provokedUntil=0; return null; }
  return h;
}
// 기본 마법 시전 시작. tgt = 몬스터 엔티티 또는 {r,c,isMawang:true}. castMul = 저주/버프 등 공격력 보정.
function startCasterSpell(h,tgt,castMul){
  const sp=CASTER_BASIC_SPELLS[h.typeId]; if(!sp||h.castingSkill) return false;
  const area=spellAreaByCast(sp.areaCast??sp.cast);
  h.castingSkill={name:sp.name,icon:sp.icon,cast:sp.cast,elapsed:0,range:h.range,aoe:area,mult:sp.mult,kind:sp.kind,heal:false,
    regen:false,miko:false,bard:false,alchemist:false,freeze:false,spirit:false,lancer:false,martial:false,dual:false,curse:false,fear:false,taunt:false,
    ext:sp.ext||null,area,basic:true,castMul:castMul||1,fx:sp.fx||null,uid:++spellCastUid};
  h.skillTarget={r:tgt.r,c:tgt.c,id:tgt.isMawang?null:tgt.id,mawang:!!tgt.isMawang};
  Sound.skill(sp.kind,sp.cast);
  state.fxEvents.push({type:'skillCast',r:h.r,c:h.c,spell:sp.kind,duration:sp.cast*1000,icon:sp.icon,ring:false,fx:sp.fx||null});
  return true;
}

function getHeroSkill(h){
  const base=HERO_SKILLS[h.typeId]; if(!base || (h.level||1)<base.unlock) return null;
  if(h.typeId!=='mage') return base;
  const lv=h.level||1;
  if(lv>=MAGE_SKILL_T3.unlock) return MAGE_SKILL_T3;
  if(lv>=MAGE_SKILL_T2.unlock) return MAGE_SKILL_T2;
  return base;
}
function heroNeedsSupportSkill(h){
  return ['druid','miko','bard'].includes(h.typeId);
}
function skillEligible(h){
  const s=getHeroSkill(h);
  if(!s) return false;
  if((h.skillCooldown||0)>0 || h.castingSkill) return false;
  if(s.ext && s.ext.support){
    // v51: 회복형은 다친 아군이 사거리 안에 있을 때, 방어형은 교전 중(몬스터가 사거리 안)이고 아군이 함께 있을 때만 씁니다.
    const R=s.range||3, A=s.ext.allyAoe||s.aoe||2.5;
    if(s.ext.allyHealPct && !s.ext.allyGuard) return state.heroes.some(o=>o.hp>0&&o.hp<o.maxHp*(s.ext.hurtBelow||.85)&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=R);
    // v57: 벽에 가려진 몬스터는 발견하지 못한 것으로 봅니다(시야 확보된 몬스터만 교전 대상).
    return state.monsters.some(m=>m.hp>0&&Math.abs(m.r-h.r)+Math.abs(m.c-h.c)<=R&&!losBlocked(h.r,h.c,m.r,m.c))
        && state.heroes.some(o=>o!==h&&o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=A);
  }
  if(heroNeedsSupportSkill(h) || s.taunt){
    if(h.typeId==='bard') return state.heroes.some(o=>o!==h&&o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=s.aoe);
    if(s.taunt) return state.monsters.some(m=>m.hp>0&&Math.abs(m.r-h.r)+Math.abs(m.c-h.c)<=s.range&&!losBlocked(h.r,h.c,m.r,m.c)) || state.heroes.some(o=>o!==h&&o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=s.range);
    return state.heroes.some(o=>o!==h&&o.hp>0&&o.hp<o.maxHp*.90&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=s.range);
  }
  if(h.typeId==='priest'){
    return state.heroes.some(o=>o!==h&&o.hp>0&&o.hp<o.maxHp*.72&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=s.range);
  }
  // v57: 사거리 안이어도 벽에 가려져 보이지 않는 몬스터에게는 스킬을 시전하지 않습니다.
  return state.monsters.some(m=>m.hp>0&&Math.abs(m.r-h.r)+Math.abs(m.c-h.c)<=s.range&&!losBlocked(h.r,h.c,m.r,m.c));
}
function startHeroSkill(h){
  const s=getHeroSkill(h); if(!s || !skillEligible(h)) return false;
  h.castingSkill={name:s.name,icon:s.icon,cast:s.cast,elapsed:0,range:s.range,aoe:s.aoe,mult:s.mult,kind:s.kind,heal:!!s.heal,
    regen:!!s.regen,miko:!!s.miko,bard:!!s.bard,alchemist:!!s.alchemist,freeze:!!s.freeze,spirit:!!s.spirit,lancer:!!s.lancer,
    martial:!!s.martial,dual:!!s.dual,curse:!!s.curse,fear:!!s.fear,taunt:!!s.taunt,ext:s.ext||null,fx:s.fx||null,
    area:(heroTypeOf(h)&&heroTypeOf(h).caster&&s.mult>0&&!s.spirit)?spellAreaByCast(s.areaCast??s.cast):null,
    uid:++spellCastUid};
  h.skillCooldown=s.cooldown;
  h.skillTarget=null;
  if(s.ext && s.ext.support){
    h.skillTarget={r:h.r,c:h.c};
  } else if(heroNeedsSupportSkill(h) || s.heal){
    let t=null,best=Infinity;
    for(const o of state.heroes){
      if(o===h||o.hp<=0) continue;
      const d=Math.abs(o.r-h.r)+Math.abs(o.c-h.c);
      const ok=h.typeId==='bard' ? d<=s.aoe : d<=s.range&&o.hp<o.maxHp*.90;
      if(ok&&d<best){best=d;t=o;}
    }
    h.skillTarget=t?{r:t.r,c:t.c,id:t.id}:null;
  } else if(s.taunt){
    h.skillTarget={r:h.r,c:h.c};
  } else {
    let t=null,best=Infinity;
    for(const m of state.monsters){
      const d=Math.abs(m.r-h.r)+Math.abs(m.c-h.c);
      if(m.hp>0&&d<=s.range&&d<best&&!losBlocked(h.r,h.c,m.r,m.c)){best=d;t=m;}
    }
    h.skillTarget=t?{r:t.r,c:t.c,id:t.id}:null;
    // v57: 볼 수 있는 대상이 없으면 허공에 시전하지 않고 취소합니다(쿨타임도 소모하지 않음).
    if(!h.skillTarget){ h.castingSkill=null; h.skillCooldown=0; return false; }
  }
  sayHero(h,s.name,'skill',Math.max(1500,s.cast*1000),true);
  h.lastSkillName=s.name;
  Sound.skill(s.kind,s.cast);
  state.fxEvents.push({type:'skillCast',r:h.r,c:h.c,spell:mcIsHealSkill(s)?'holy':s.kind,duration:s.cast*1000,icon:s.icon,ring:!((heroTypeOf(h)&&heroTypeOf(h).caster)||mcIsHealSkill(s)),fx:s.fx||null});
  return true;
}
/* ==========================================================================
   v51 · 신규 영웅 스킬 확장 효과 (HERO_SKILLS[...].ext 옵션 처리)
   ========================================================================== */
function heroSkillPushMonster(h,m,tiles=1){
  const r0=m.r,c0=m.c;
  for(let k=0;k<tiles;k++){
    const dr=Math.sign(m.r-h.r),dc=Math.sign(m.c-h.c);
    const rr=m.r+dr,cc=m.c+dc;
    const t=state.grid[rr]?.[cc];
    if(t&&(t.type==='floor'||t.type==='core')&&!t.obstacle&&!monsterAt(rr,cc)&&!(rr===CORE_R&&cc===CORE_C)){m.r=rr;m.c=cc;} else break;
  }
  if((m.r!==r0||m.c!==c0)&&typeof markMonsterCombatSpatialDirty==='function') markMonsterCombatSpatialDirty();
}
// 피해를 준 각 몬스터에게 거는 부가 효과
function applyHeroSkillTargetExt(h,s,m,now,delayMs=0){
  const x=s.ext; if(!x || m.hp<=0) return;
  if(x.stun){
    m.stunTicks=Math.max(m.stunTicks||0,Math.round(x.stun*1000/TICK_MS));
    state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'기절!',color:'#ffd166',delay:delayMs});
  }
  if(x.slowSec){ m.skillSlowUntil=now+x.slowSec*1000; m.skillSlowMul=x.slowMul||.7; }
  if(x.burnSec){
    m.skillDotUntil=Math.max(m.skillDotUntil||0,now+x.burnSec*1000);
    m.skillDotDps=Math.max(m.skillDotDps||0,Math.max(1,Math.round(h.atk*(x.burnPct||.1))));
    state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'화상',color:'#ff8c42',delay:delayMs});
  }
  if(x.defBreak){
    m.skillDefBuffUntil=now+x.defBreak.sec*1000; m.skillDefBuffMul=x.defBreak.mul;
    state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'방어↓',color:'#a98bff',delay:delayMs});
  }
  if(x.knock && !s.lancer) heroSkillPushMonster(h,m,x.knock);
}
// 시전자 본인/주변 아군에게 주는 부가 효과 (공격형 스킬 끝에 적용)
function applyHeroSkillSelfExt(h,s,now){
  const x=s.ext; if(!x) return;
  if(x.selfGuard){
    const cur=(h.guardUntil&&now<h.guardUntil)?(h.guardReduction||0):0;
    h.guardUntil=now+x.selfGuard.sec*1000; h.guardReduction=Math.max(cur,x.selfGuard.red);
    state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'방어 태세',color:'#7fc8ff'});
  }
  if(x.selfAtk){
    const cur=(h.attackBuffUntil&&now<h.attackBuffUntil)?(h.attackBuffMul||1):1; // 아직 유효한 기존 버프만 비교
    h.attackBuffUntil=now+x.selfAtk.sec*1000; h.attackBuffMul=Math.max(cur,x.selfAtk.mul);
    state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'공격↑',color:'#ffd166'});
  }
  if(x.allyHealPct){
    const R=x.allyAoe||2.5;
    for(const o of state.heroes){
      if(o.hp<=0||Math.abs(o.r-h.r)+Math.abs(o.c-h.c)>R) continue;
      const heal=Math.max(1,Math.round(o.maxHp*x.allyHealPct)); o.hp=Math.min(o.maxHp,o.hp+heal); o.lastHealAt=now;
      state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'+'+heal,color:'#73d99a'});
    }
  }
}
// 순수 지원 스킬: 주변 아군 치유/방어막/공격 강화/상태이상 정화
function applyHeroSupportSkill(h,s,now){
  const x=s.ext, R=x.allyAoe||s.aoe||2.5;
  const allies=state.heroes.filter(o=>o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=R);
  for(const o of allies){
    if(x.allyHealPct){
      const heal=Math.max(1,Math.round(o.maxHp*x.allyHealPct)); o.hp=Math.min(o.maxHp,o.hp+heal); o.lastHealAt=now;
      state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'+'+heal,color:'#73d99a'});
    }
    if(x.allyGuard){
      const cur=(o.guardUntil&&now<o.guardUntil)?(o.guardReduction||0):0;
      o.guardUntil=now+x.allyGuard.sec*1000; o.guardReduction=Math.max(cur,x.allyGuard.red);
      state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'🛡 가호',color:'#7fc8ff'});
    }
    if(x.allyAtk){
      const cur=(o.attackBuffUntil&&now<o.attackBuffUntil)?(o.attackBuffMul||1):1;
      o.attackBuffUntil=now+x.allyAtk.sec*1000; o.attackBuffMul=Math.max(cur,x.allyAtk.mul);
    }
    if(x.cleanse){
      // 함정이 남기는 지속 상태이상(둔화/화상/독/출혈)을 정화합니다. 구속·기절은 정화하지 않습니다.
      o.frostSlowUntil=0; o.webSlowUntil=0; o.flameBurnUntil=0; o.poisonSpreadUntil=0; o.obstacleBleedUntil=0;
      state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'정화',color:'#ffe59a'});
    }
  }
  if(x.selfGuard){
    const cur=(h.guardUntil&&now<h.guardUntil)?(h.guardReduction||0):0;
    h.guardUntil=now+x.selfGuard.sec*1000; h.guardReduction=Math.max(cur,x.selfGuard.red);
  }
  state.fxEvents.push({type:'skillAoe',r:h.r,c:h.c,spell:s.kind,radius:R,icon:s.icon,fx:s.fx||null});
  if(x.allyHealPct && Sound.heal) Sound.heal(); else if(Sound.buff) Sound.buff();
  addLog(`<span class="hl-gold">${s.name}</span> 발동! 아군 ${allies.length}명에게 효과`);
}

function finishHeroSkill(h){
  const c=h.castingSkill; if(!c) return;
  const s=c; h.castingSkill=null;
  const now=performance.now();

  // v51: 룬 수호자/황실 근위 마도단/왕국 수호대 같은 순수 지원 스킬
  if(s.ext && s.ext.support){ applyHeroSupportSkill(h,s,now); return; }

  // 지속 재생: 8초 동안 1초마다 주변 아군을 회복
  if(s.regen){
    h.regenAuraUntil=now+8000;
    h.regenAuraNext=now;
    state.fxEvents.push({type:'skillAoe',r:h.r,c:h.c,spell:'holy',radius:s.aoe,icon:s.icon,fx:s.fx||null});
    if(Sound.heal) Sound.heal();
    addLog(`<span class="hl-gold">${s.name}</span> 발동! 주변 아군에게 8초간 자연의 재생`);
    return;
  }

  // 무녀: 즉시 회복 + 짧은 공격력 버프
  if(s.miko){
    const targets=state.heroes.filter(o=>o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=s.aoe);
    for(const o of targets){
      const heal=Math.round(12+(h.level||1)*1.8);
      o.hp=Math.min(o.maxHp,o.hp+heal);
      o.attackBuffUntil=now+8000; o.attackBuffMul=1.25;
      state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'+'+heal,color:'#73d99a'});
    }
    state.fxEvents.push({type:'skillAoe',r:h.r,c:h.c,spell:'holy',radius:s.aoe,icon:s.icon,fx:s.fx||null});
    if(Sound.heal) Sound.heal();
    return;
  }

  // 음유시인: 공격/이동 보조 오라
  if(s.bard){
    const targets=state.heroes.filter(o=>o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=s.aoe);
    for(const o of targets){
      o.attackBuffUntil=now+8000; o.attackBuffMul=1.15;
      o.moveSpeedBuffUntil=now+8000; o.moveSpeedMul=1.25;
      state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'♪ 가호',color:'#f0c36a'});
    }
    state.fxEvents.push({type:'skillAoe',r:h.r,c:h.c,spell:'song',radius:s.aoe,icon:s.icon,fx:s.fx||null});
    if(Sound.buff) Sound.buff();
    return;
  }

  // 연금술사: 적에게 방어력 감소 + 주변 아군 소량 회복
  if(s.alchemist){
    const center=h.skillTarget||{r:h.r,c:h.c};
    const targets=state.monsters.filter(m=>m.hp>0&&Math.abs(m.r-center.r)+Math.abs(m.c-center.c)<=s.aoe);
    const baseDmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*s.mult));
    for(const m of targets){
      const dmg=Math.max(1,baseDmg-Math.round(m.def*.5));
      m.hp-=dmg; markHeroAggro(m,h); m.skillDefBuffUntil=now+6000; m.skillDefBuffMul=.70;
      state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'-'+dmg,color:'#b6ff5c'},{type:'floatText',r:m.r,c:m.c,text:'방어↓',color:'#b6ff5c'});
      if(m.hp<=0) h.heroKills=(h.heroKills||0)+1;
    }
    for(const o of state.heroes){
      if(o.hp<=0||Math.abs(o.r-h.r)+Math.abs(o.c-h.c)>s.aoe) continue;
      const heal=Math.round(8+(h.level||1)*.8); o.hp=Math.min(o.maxHp,o.hp+heal);
      state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'+'+heal,color:'#73d99a'});
    }
    state.fxEvents.push({type:'skillAoe',r:center.r,c:center.c,spell:'acid',radius:s.aoe,icon:s.icon,fx:s.fx||null});
    return;
  }

  // 정령사: 20초간 독립적인 정령 화력 지원
  if(s.spirit){
    h.spiritSummonUntil=now+20000; h.spiritNext=now;
    state.fxEvents.push({type:'heroSpellImpact',r:h.r,c:h.c,spell:'spirit',fx:s.fx||'spirit_summon',radius:1.6,icon:s.icon});
    addLog(`<span class="hl-gold">${s.name}</span> 발동! 정령이 20초간 전투를 지원합니다.`);
    return;
  }

  // 철벽기사: 5초 도발 + 피해 감소
  if(s.taunt){
    h.tauntUntil=now+5000; h.tauntDamageReduction=.40;
    state.fxEvents.push({type:'skillAoe',r:h.r,c:h.c,spell:'guard',radius:s.aoe,icon:s.icon,fx:s.fx||null});
    addLog(`<span class="hl-gold">${s.name}</span> 발동! 주변 몬스터가 철벽기사를 공격합니다.`);
    return;
  }

  // 기존 사제 회복
  if(s.heal){
    const targets=state.heroes.filter(o=>o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=s.aoe);
    for(const o of targets){ const heal=Math.round(8+(h.level||1)*2.2); o.hp=Math.min(o.maxHp,o.hp+heal); o.lastHealAt=now; state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'+'+heal,color:'#73d99a'}); }
    state.fxEvents.push({type:'skillAoe',r:h.r,c:h.c,spell:'holy',radius:s.aoe,icon:s.icon,fx:s.fx||null}); return;
  }

  let center=h.skillTarget || {r:h.r,c:h.c};
  // 마법은 시전이 끝나는 순간 대상이 아직 살아 있고 보이면 그 현재 위치를 중심으로 폭발합니다(이동 중이어도 빗나가지 않도록).
  // 대상이 시전 도중 벽 뒤로 숨으면 추적하지 않고 마지막으로 본 위치에 떨어집니다. (마법진 이펙트도 같은 함수로 위치를 정합니다)
  if(s.area) center=spellCastCenter(h,center);
  // v57: 폭발 범위 안이라도 폭발 중심에서 벽에 가려진 칸에는 닿지 않습니다.
  const inSpellArea=(r,c)=>{ const dr=r-center.r,dc=c-center.c; if(dr*dr+dc*dc>s.area*s.area) return false; return (dr===0&&dc===0)||!losBlocked(center.r,center.c,r,c); };
  const spellFxDelay=s.fx ? queueHeroSpellTravelFx(h,s,center) : 0;
  let targets=s.area
    ? state.monsters.filter(m=>m.hp>0&&inSpellArea(m.r,m.c))
    : state.monsters.filter(m=>m.hp>0&&Math.abs(m.r-center.r)+Math.abs(m.c-center.c)<=s.aoe);

  // 창기병: 중심 대상 + 같은 방향 최대 2칸까지 관통
  if(s.lancer && h.skillTarget){
    const primary=state.monsters.find(m=>m.id===h.skillTarget.id) || targets[0];
    targets=primary?[primary]:[];
    if(primary){
      const dr=Math.sign(primary.r-h.r),dc=Math.sign(primary.c-h.c);
      for(let k=1;k<=2;k++){
        const rr=primary.r+dr*k,cc=primary.c+dc*k;
        const m=state.monsters.find(x=>x.hp>0&&x.r===rr&&x.c===cc);
        if(m&&!targets.includes(m)) targets.push(m);
      }
    }
  }

  // v51: 관통 사격/랜스 차지 — 주 대상 + 같은 방향 최대 N칸까지 관통 (창기병 방식의 일반화)
  if(!s.lancer && s.ext && s.ext.line && h.skillTarget){
    const primary=state.monsters.find(m=>m.id===h.skillTarget.id) || targets[0];
    targets=primary?[primary]:[];
    if(primary){
      const dr=Math.sign(primary.r-h.r),dc=Math.sign(primary.c-h.c);
      for(let k=1;k<=s.ext.line;k++){
        const rr=primary.r+dr*k,cc=primary.c+dc*k;
        const m=state.monsters.find(x=>x.hp>0&&x.r===rr&&x.c===cc);
        if(m&&!targets.includes(m)) targets.push(m);
      }
    }
  }

  // 기본 피해
  if(s.dual){
    for(const m of targets){
      for(let hit=0;hit<2;hit++){
        const ignore=Math.random()<.20;
        const def=ignore?0:m.def;
        const dmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*s.mult)-def);
        m.hp-=dmg; markHeroAggro(m,h);
        state.fxEvents.push({type:'damageNumber',r:m.r,c:m.c,amount:dmg,color:'#cbd4e1',delay:spellFxDelay});
        state.fxEvents.push(heroMeleeBattleHitEvent(h,m.r,m.c,dmg,Math.sign(m.r-h.r),Math.sign(m.c-h.c),'#cbd4e1',dmg>Math.max(10,(m.maxHp||0)*.10),{delay:spellFxDelay,skill:true,skillVariant:'twin-tempest'}));
        if(m.hp<=0){h.heroKills=(h.heroKills||0)+1;break;}
      }
    }
  } else {
    const baseDmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*(s.castMul||1)*s.mult));
    for(const m of targets){
      let dmg=Math.max(1,baseDmg-(m.def*(s.lancer ? .7 : (s.ext&&s.ext.pierceDef ? 1-s.ext.pierceDef : 1))));
      if(s.basic) dmg=Math.max(1,applyStatueSanctuary(m,dmg)); // 기본 마법은 기존 즉발 공격처럼 수호 석상 보호를 받습니다
      m.hp-=dmg; markHeroAggro(m,h);
      state.fxEvents.push({type:'damageNumber',r:m.r,c:m.c,amount:dmg,color:skillStyle(s.kind).color,delay:spellFxDelay});
      if(heroMeleeSkillFx(h.typeId)) state.fxEvents.push(heroMeleeBattleHitEvent(h,m.r,m.c,dmg,Math.sign(m.r-h.r),Math.sign(m.c-h.c),skillStyle(s.kind).color,dmg>Math.max(10,(m.maxHp||0)*.10),{delay:spellFxDelay,skill:true,skillVariant:heroMeleeSkillFx(h.typeId).variant}));
      if(s.area) state.fxEvents.push({type:'spellImpact',r:m.r,c:m.c,spell:s.kind,delay:spellFxDelay});
      if(m.hp<=0) h.heroKills=(h.heroKills||0)+1;
      if(s.freeze){
        m.frostStacks=(m.frostStacks||0)+1;
        m.skillSlowUntil=now+4000; m.skillSlowMul=.65;
        if(m.frostStacks>=3){m.stunTicks=Math.max(m.stunTicks,Math.round(2.0*1000/TICK_MS));m.frostStacks=0;state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'빙결!',color:'#78dfff',delay:spellFxDelay});}
      }
      if(s.curse){
        m.healBlockedUntil=now+8000;
        m.skillDotUntil=now+8000;
        m.skillDotDps=Math.max(1,Math.round(h.atk*.10));
        state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'치유 차단',color:'#b76bf2',delay:spellFxDelay});
      }
      if(s.fear){
        m.fearUntil=now+3000;
        state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'공포!',color:'#c6a6ff',delay:spellFxDelay});
      }
      if(s.lancer){
        const dr=Math.sign(m.r-h.r),dc=Math.sign(m.c-h.c);
        const rr=m.r+dr,cc=m.c+dc;
        const t=state.grid[rr]?.[cc];
        if(t&&(t.type==='floor'||t.type==='core')&&!t.obstacle&&!monsterAt(rr,cc)&&!(rr===CORE_R&&cc===CORE_C)){m.r=rr;m.c=cc;if(typeof markMonsterCombatSpatialDirty==='function')markMonsterCombatSpatialDirty();}
      }
      if(s.ext) applyHeroSkillTargetExt(h,s,m,now,spellFxDelay); // v51
    }
  }
  if(s.ext) applyHeroSkillSelfExt(h,s,now); // v51
  if(s.area){
    // v54: 범위에 마왕이 들어 있으면 마왕도 함께 맞습니다.
    const mw=state.mawang;
    if(mw && mw.hp>0 && !mw.dead && inSpellArea(mw.r,mw.c)){
      const mwDmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*(s.castMul||1)*s.mult)-mawangCurrentStats().def);
      mw.hp-=mwDmg; markHeroAggro(mw,h);
      state.fxEvents.push({type:'damageNumber',r:mw.r,c:mw.c,amount:mwDmg,color:'#ff9b6e',delay:spellFxDelay},{type:'spark',r:mw.r,c:mw.c,color:'#ffd166',delay:spellFxDelay});
      if(mw.hp<=0) killMawang(mw);
    }
    h.lastAttackAt=now;
    if(h.heroKills>=4&&(h.level||1)<99) heroLevelUp(h);
    // 기본 캐스터는 시전 시작음은 startCasterSpell에서, 실제 착탄음은 heroSpellImpact에서 재생합니다.
    // 여기서 다시 재생하면 착탄 전에 소리가 중복되어 타이밍이 어긋납니다.
  }
  // 범위 표시는 실제 적중 범위와 같은 크기(3×3 / 5×5 폭)로 그립니다.
  const meleeSkillImpact=heroMeleeSkillImpactEvent(h,s,center.r,center.c,spellFxDelay);
  if(meleeSkillImpact) state.fxEvents.push(meleeSkillImpact);
  if(s.fx){
    state.fxEvents.push({type:'heroSpellImpact',r:center.r,c:center.c,spell:s.kind,fx:s.fx,radius:s.area?(spellAreaSpan(s.area)-1.1)/2:s.aoe,icon:s.icon,delay:spellFxDelay});
  } else if(!meleeSkillImpact){
    state.fxEvents.push({type:'skillAoe',r:center.r,c:center.c,spell:s.kind,radius:s.area?(spellAreaSpan(s.area)-1.1)/2:s.aoe,icon:s.icon,delay:spellFxDelay});
  }
  if(!s.basic) addLog(`<span class="hl-gold">${s.name}</span> 발동! ${targets.length}마리에게 효과`);
}

const HERO_DIALOGUE_MIN_MS=3000;
const HERO_DIALOGUE_MAX_MS=5500;
const HERO_DIALOGUES={
  spawn:['드디어 도착했다!','여기가 던전인가?','좋아, 안으로 들어가자!','이번엔 보물을 찾겠어!','다들 준비됐지?','생각보다 으스스한데…','길은 곧 찾을 수 있겠지.','마왕은 어디에 숨어 있지?','이번 임무는 쉽게 끝나겠어.','자, 출발이다!','이 기운… 평범한 던전이 아니야.','오늘은 반드시 이름을 남기겠어.','들어가는 순간부터 전투다.','동료들, 간격 유지!','이번엔 물러서지 않는다.','발밑 조심해!','정찰부터 시작하자.','보물 냄새가 나는군.','심장이 벌써 뛰기 시작했어.','좋아, 첫발을 내딛는다!'],
  move:['이쪽인가?','조금만 더 가보자.','흠… 길이 복잡하군.','여긴 처음 보는 곳인데?','계속 전진하자.','분명 안쪽에 뭔가 있어.','이 길로 가면 되겠지.','서두르자!','아직 멀었나?','냄새가 심상치 않아.','발자국이 남아 있어.','누군가 앞서간 흔적이야.','왼쪽 길은 위험해 보여.','잠깐, 소리가 들렸다.','통로가 점점 좁아지는군.','조금만 더 깊이 들어가자.','이 던전은 살아 있는 것 같아.','빛이 보인다!','길을 기억해 둬.','느낌상 중심부가 가까워.'],
  combat:['적이다!','몬스터 발견!','저 녀석부터 쓰러뜨려!','전투 준비!','드디어 싸울 상대가 나왔군!','내 앞을 막지 마라!','좋아, 상대해주지!','모두 공격!','이번엔 내가 간다!','여기서 끝내주마!','대형을 무너뜨려!','저 녀석이 핵심이다!','뒤를 맡아줘!','지금이다, 몰아붙여!','한 마리씩 정리한다!','이번엔 내가 선두다!','도망치지 마!','검을 뽑아라!','이 거리라면 충분해!','좋아, 실력 차이를 보여주지!'],
  death:['이, 이럴 수가…','아직… 끝낼 수 없는데…','여기서 쓰러지다니…','모두에게 미안해…','마왕의 얼굴도 못 봤는데…','내가… 부족했어.','더는 못 싸우겠어…','이번엔 내가 졌군…','뒤를 부탁한다…','이걸로 끝인가…','몸이 움직이지 않아…','마지막까지 함께하고 싶었는데…','내 검이 여기까지인가…','다음에는 반드시…','이런 결말은 싫어…','동료들을 지켜주고 싶었어…','내 이름을 기억해 줘…','조금만 더 버틸 수 있었다면…','핵은… 꼭 파괴해 줘…','미안하다… 먼저 간다…'],
  coreFound:['저기다!','마력의 핵을 찾았다!','저 빛… 핵이 틀림없어!','드디어 중심부다!','마왕의 심장인가?!','저곳만 돌파하면 된다!','찾았다! 저게 핵이야!','모두 저쪽이다!','던전의 핵을 발견했다!','이제 끝이 보인다!','저게 던전의 근원인가!','엄청난 마력이 느껴진다!','드디어 목표를 확인했다!','저 핵만 깨면 된다!','중심부가 눈앞이야!','저 빛을 놓치지 마!','모두 집중해!','저것이 던전을 움직이는군!','마력이 너무 강해…','좋아, 마지막 돌파다!'],
  levelup:['더 강해졌어!','좋아, 힘이 올라왔다!','한 단계 성장했군!','이제 전보다 강하다!','좋아! 감각이 더 선명해!','내 힘을 시험해보자!','레벨 업!','이 정도 적은 상대도 안 돼!','힘이 차오른다!','다음 단계로 간다!','한계가 조금 더 멀어졌군!','새로운 힘이 느껴진다!','이제 더 깊이 갈 수 있어!','다시 싸운다면 이길 수 있다!','검이 훨씬 가벼워졌어!','마력이 한층 안정됐다!','좋아, 다음 상대를 찾아보자!','내가 얼마나 강해졌는지 시험해보자!','성장의 감각이 익숙해지고 있어!','아직 올라갈 길은 멀다!'],
  flee:['저건 너무 강해!','일단 후퇴하자!','상대가 안 돼!','도망쳐!','이건 무리야!','살아서 돌아가야 해!','다른 길로 가자!','저 녀석과는 못 싸워!','후퇴한다!','다음에 다시 상대하자!','잠깐 숨을 고르자!','정면승부는 아직 이르다!','한 걸음 물러서서 다시 보자!','놈의 패턴을 파악해야 해!','지금은 살아남는 게 먼저야!','통로를 바꾸자!','힘을 아껴야 한다!','조금만 쉬면 다시 싸울 수 있어!','저 몬스터의 약점을 찾자!','좋아, 다음에는 반드시 이긴다!'],
  // 리메이크 장애물 전용 리액션 — 맞는 순간 용사가 놀라거나 당황하는 대사입니다.
  trapGust:['으악!?','바람이!?','밀려난다!','이런, 통제가 안 돼!','뒤로 날아갔다!','대형이 무너졌어!','발이 땅에서 떨어졌어!','무슨 바람이야 이게!'],
  trapMagnet:['끌려간다!','뭐가 당기고 있어!','버틸 수가 없어!','발이 안 떨어져!','저항해봐도 소용없다!','자꾸 끌려들어가!'],
  trapStunCage:['철창이!?','움직일 수가 없어!','갇혔다!','이거 놔!','꼼짝을 못 하겠어!','함정이었나!'],
  trapBridgeCollapse:['다리가!?','바닥이 꺼진다!','떨어진다!!','발밑을 조심해!','이런, 길이 무너졌어!','다시 돌아가야겠어!'],
  // v51: 기존 10종 함정에도 개별 리액션을 추가합니다.
  trapSpike:['으악!','가시다!','발밑에서!','따가워!','이런, 방심했다!'],
  trapFlame:['뜨거워!','불이야!','타는 것 같아!','으아, 뜨겁다!'],
  trapLightning:['찌릿!','번개다!','몸이 저려!','감전됐다!'],
  trapPoison:['독이다!','몸이 이상해!','숨쉬기 힘들어!','독기가 퍼진다!'],
  trapBarricade:['막혔다!','이런 벽이!','돌파해야겠어!','길이 막혔어!'],
  trapPit:['떨어진다!','발이 빠졌어!','구덩이다!','바닥이 없어!'],
  trapFrost:['몸이 얼어붙어!','차갑다!','움직임이 느려져!','발이 얼었어!'],
  trapWeb:['거미줄이!','끈적거려!','발이 붙었어!','움직일 수가 없어!'],
  trapCurse:['저주받았다!','힘이 빠진다!','몸이 무거워!','기분 나쁜 기운이!']
};
function pickHeroDialogue(kind){const arr=HERO_DIALOGUES[kind]||HERO_DIALOGUES.move;return arr[Math.floor(Math.random()*arr.length)];}
function randomHeroDialogueDelay(){return HERO_DIALOGUE_MIN_MS+Math.random()*(HERO_DIALOGUE_MAX_MS-HERO_DIALOGUE_MIN_MS);}
function sayHero(h,text,kind='normal',duration=2200,force=false){if(!h)return false;const now=performance.now();if(h.bubbleUntil>now && !force)return false;if(kind!=='skill' && !force && now<(h.nextDialogueAt||0))return false;h.bubbleText=text;h.bubbleKind=kind;h.bubbleUntil=now+duration;return true;}
function heroSay(h,kind,force=false){const now=performance.now();if(!force&&now<(h.nextDialogueAt||0))return false;if(sayHero(h,pickHeroDialogue(kind),'normal',2200,false)){h.lastDialogueAt=now;h.nextDialogueAt=now+randomHeroDialogueDelay();return true;}return false;}
function showTransientHeroBubble(r,c,text,kind='normal',duration=1800){
  const px=currentCellPx;
  const el=document.createElement('div');
  el.className='speech-bubble show '+kind;
  el.textContent=text;
  el.style.left=(c*px+px/2)+'px';
  el.style.top=(r*px+px*0.15)+'px';
  els.tokenLayer.appendChild(el);
  setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),180);},duration);
}
function heroLevelUp(h){
  if((h.level||1)>=99) return;
  h.level=(h.level||1)+1;
  h.heroKills=0;
  h.maxHp+=6;
  h.hp=Math.min(h.maxHp,h.hp+10);
  h.atk+=1;
  h.def+=0.35;
  sayHero(h,pickHeroDialogue('levelup'),'levelup',2400,true);
  const ht=HERO_TYPES.find(x=>x.id===h.typeId);
  addLog(`<span class="hl-gold">${ht?ht.name:'용사'}</span>가 레벨 ${h.level}로 성장했습니다!`);
}

function inBounds(r,c){ return r>=0&&r<GRID&&c>=0&&c<GRID; }
function neighbors4(r,c){
  const out=[];
  if(r>0) out.push([r-1,c]);
  if(r<GRID-1) out.push([r+1,c]);
  if(c>0) out.push([r,c-1]);
  if(c<GRID-1) out.push([r,c+1]);
  return out;
}

let state=null;

/* =====================================================================
   ⚠️ 데이터 안전 원칙 (이 섹션 및 Supabase players/game_results/player_meta
   테이블을 건드리는 모든 앞으로의 작업에 적용) ⚠️

   원칙: 어떤 업데이트를 하더라도 기존에 로그인해서 쌓은 계정 기록
   (영혼, 해금한 몬스터, 몬스터 강화 레벨, 랭킹 기록, 닉네임)이
   초기화되거나 오염되어서는 절대 안 된다.

   지켜야 할 것:
   1) MONSTER_TYPES의 몬스터 id는 절대 변경/재사용하지 않는다.
      monsterLevels / unlockedMonsterIds가 id로 저장되므로, id를 바꾸면
      그 몬스터에 대한 기존 유저의 기록이 고아가 되어 사라진 것처럼 보인다.
      (표시용 name/desc/그림은 자유롭게 바꿔도 안전하다.)
   2) META_DEFAULT/normalizeMetaData에 새 필드를 추가할 때는 항상
      "없으면 기본값, 있으면 유지"로 병합한다. 절대 통째로 덮어쓰지 않는다.
   3) game_results 테이블은 insert만 한다. update/delete 금지(랭킹 히스토리 보존).
   4) player_meta / players 테이블에 대해 Supabase SQL Editor에서
      DROP TABLE, TRUNCATE, 조건 없는 DELETE를 실행하지 않는다.
      컬럼 추가(ALTER TABLE ... ADD COLUMN)는 안전하다.
   5) RLS 정책을 수정할 때는 반드시 "본인 소유 행만 select/insert/update"가
      유지되는지 확인한다. 정책이 잘못되면 데이터가 삭제된 게 아니라
      "안 보이기만" 해도 마치 날아간 것처럼 보이므로 헷갈리기 쉽다.
   6) 로그인 계정(player_meta)과 테스트/디버그 세션(isLocalOnlySession)의
      저장소를 절대 다시 합치지 않는다. 계정 데이터는 오직 Supabase가
      source of truth이고, localStorage는 그 캐시일 뿐 서버로 역주입되지
      않는다. 테스트/디버그 진행도는 탭을 닫으면 사라지는 게 의도된 동작이다.
   ===================================================================== */

/* ---------------- v35 permanent monster meta progression ---------------- */
// 저장 구조: localStorage는 즉시 반영되는 로컬 캐시(오프라인/테스트용)이고,
// 실제 계정으로 로그인한 경우에는 Supabase의 player_meta 테이블과 동기화되어
// 여러 기기에서도 같은 영구 성장을 이어갈 수 있습니다. (아래 syncMetaFromSupabase 참고)
const META_KEY='dungeon_defense_v18_meta';
const META_DEFAULT={souls:0,runs:0,unlockedMonsterIds:[],monsterLevels:{},trapResearch:{},commonResearch:{}};
function normalizeMetaData(d){
  const base=JSON.parse(JSON.stringify(META_DEFAULT));
  if(!d || typeof d!=='object') return base;
  return {
    ...base,
    ...d,
    souls:Math.max(0,Math.floor(Number(d.souls)||0)),
    runs:Math.max(0,Math.floor(Number(d.runs)||0)),
    unlockedMonsterIds:Array.isArray(d.unlockedMonsterIds)?d.unlockedMonsterIds:[],
    monsterLevels:{...base.monsterLevels,...(d.monsterLevels||{})},
    trapResearch:{...base.trapResearch,...(d.trapResearch||{})},       // v35 함정 연구소: 함정별 영구 연구 레벨(1~5)
    commonResearch:{...base.commonResearch,...(d.commonResearch||{})}  // v35 함정 연구소: 공통 연구 5종의 영구 레벨(1~5)
  };
}
function loadMeta(){
  // 테스트/디버그(isLocalOnlySession) 세션은 로컬 캐시(META_KEY)를 절대 건드리지 않고
  // 메모리에 있는 현재 진행도를 그대로 씁니다 — 그래야 패널을 열거나 새 판을 시작할 때마다
  // 계정 캐시로 되돌아가지 않고 "탭을 닫으면 사라지는" 격리된 상태가 유지됩니다.
  if(isLocalOnlySession) return normalizeMetaData(typeof metaProgress!=='undefined'?metaProgress:null);
  try{
    const raw=localStorage.getItem(META_KEY);
    if(!raw) return normalizeMetaData(null);
    return normalizeMetaData(JSON.parse(raw));
  }catch(_){ return normalizeMetaData(null); }
}
function saveMeta(){
  if(isLocalOnlySession){ scheduleMetaSync(); return; } // 테스트/디버그: localStorage에도 쓰지 않음(메모리만)
  try{ localStorage.setItem(META_KEY,JSON.stringify(metaProgress)); }catch(_){}
  scheduleMetaSync();
}
let metaProgress=loadMeta();

// ---- Supabase 동기화 (로그인 계정 전용, 테스트/디버그 모드는 로컬에만 저장) ----
let metaSyncEnabled=false;
let metaSyncTimer=null;
let metaSyncInFlight=false;
let metaSyncDirty=false;

function metaSyncAllowed(){
  return supabaseReady && !!supabaseClient && !!currentPlayerId && !isLocalOnlySession && !debugModeActive;
}

// player_meta 테이블에 현재 metaProgress를 저장합니다.
// immediate=true면 (로그인 직후 최초 마이그레이션 등) 동기화 활성화 여부와 상관없이 강제로 저장합니다.
async function pushMetaToSupabase(immediate){
  if(!immediate && !metaSyncEnabled) return;
  if(!metaSyncAllowed()) return;
  metaSyncInFlight=true;
  try{
    const {error}=await supabaseClient
      .from('player_meta')
      .upsert({player_id:currentPlayerId,data:metaProgress,updated_at:new Date().toISOString()},{onConflict:'player_id'});
    if(error) console.warn('[Supabase] meta save failed:',error);
  }catch(err){
    console.warn('[Supabase] meta save failed:',err);
  }finally{
    metaSyncInFlight=false;
    if(metaSyncDirty){ metaSyncDirty=false; scheduleMetaSync(); }
  }
}

// saveMeta()가 호출될 때마다(영혼 소비, 레벨업 등) 서버 저장을 예약합니다.
// 짧은 시간에 여러 번 바뀌어도 네트워크 요청은 한 번만 나가도록 살짝 지연(디바운스)시킵니다.
function scheduleMetaSync(){
  if(!metaSyncEnabled) return;
  if(metaSyncInFlight){ metaSyncDirty=true; return; }
  if(metaSyncTimer) clearTimeout(metaSyncTimer);
  metaSyncTimer=setTimeout(()=>{ metaSyncTimer=null; pushMetaToSupabase(false); },1200);
}

// 로그인 성공 후(handleAuthSession) 호출됩니다.
// Supabase(player_meta)가 유일한 진실입니다.
// - 서버에 기록이 있으면: 그걸로 로컬 캐시(META_KEY)를 덮어써서 다른 기기에서도 이어할 수 있게 합니다.
// - 서버에 기록이 없으면(이 계정의 첫 로그인): 로컬에 뭐가 남아있었든 절대 참고하지 않고
//   항상 빈 상태(영혼 0)로 시작해서 그대로 서버에 새 기록을 만듭니다.
//   → 로그인 전에 어떤 식으로든 로컬에 쌓였던 값이 계정 기록으로 올라가는 경우는 없습니다.
// 테스트/디버그 모드(isLocalOnlySession)에서는 애초에 호출되지 않습니다(metaSyncAllowed()가 막음).
async function syncMetaFromSupabase(){
  metaSyncEnabled=false;
  if(!metaSyncAllowed()) return;
  try{
    const {data,error}=await supabaseClient
      .from('player_meta')
      .select('data')
      .eq('player_id',currentPlayerId)
      .maybeSingle();
    if(error) throw error;
    metaProgress = (data && data.data) ? normalizeMetaData(data.data) : normalizeMetaData(null);
    try{ localStorage.setItem(META_KEY,JSON.stringify(metaProgress)); }catch(_){}
    metaSyncEnabled=true;
    if(!data || !data.data) await pushMetaToSupabase(true); // 최초 로그인: 빈 기록을 서버에 생성
    renderStartMetaSummary();
    const overlay=document.getElementById('metaGrowthOverlay');
    if(overlay && !overlay.classList.contains('hidden')) renderMetaGrowth();
  }catch(err){
    console.warn('[Supabase] meta load failed:',err);
  }
}

/* ===== v37 마왕 RPG 영구 데이터 / Supabase =====
   마왕은 player_meta와 분리된 mawang_profiles 테이블에 저장합니다.
   테이블이 아직 생성되지 않은 환경에서는 localStorage/메모리로 안전하게 폴백합니다. */
const MAWANG_LOCAL_KEY='dungeon_defense_mawang_v1';
const MAWANG_MAX_LEVEL=99;
const MAWANG_EQUIP_MAX_LEVEL=30;
const MAWANG_DEFAULT={
  level:1, xp:0, skillPoints:0,
  stats:{str:10,vit:10,int:8,agi:8,dom:5},
  skills:{},
  equipment:{weapon:1,armor:1,accessory:1,boots:1,gloves:1},
  command:'defense'
};
let mawangProfile=JSON.parse(JSON.stringify(MAWANG_DEFAULT));
let mawangSyncEnabled=false;
let mawangSyncTimer=null;
let mawangSyncInFlight=false;
let mawangSyncDirty=false;
let mawangLoaded=false;
let mawangSubTab='status';

function cloneMawangDefault(){ return JSON.parse(JSON.stringify(MAWANG_DEFAULT)); }
function normalizeMawangData(d){
  const base=cloneMawangDefault();
  if(!d || typeof d!=='object') return base;
  const stats={...base.stats,...(d.stats||{})};
  const equipment={...base.equipment,...(d.equipment||{})};
  const skills={...(d.skills||{})};
  const clampInt=(v,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(v)||0)));
  return {
    level:Math.max(1,Math.min(MAWANG_MAX_LEVEL,clampInt(d.level,1,MAWANG_MAX_LEVEL))),
    xp:Math.max(0,Math.floor(Number(d.xp)||0)),
    skillPoints:Math.max(0,Math.floor(Number(d.skillPoints)||0)),
    stats:{
      str:Math.max(1,Math.floor(Number(stats.str)||10)), vit:Math.max(1,Math.floor(Number(stats.vit)||10)),
      int:Math.max(1,Math.floor(Number(stats.int)||8)), agi:Math.max(1,Math.floor(Number(stats.agi)||8)),
      dom:Math.max(1,Math.floor(Number(stats.dom)||5))
    },
    skills,
    equipment:{
      weapon:Math.max(1,Math.min(MAWANG_EQUIP_MAX_LEVEL,clampInt(equipment.weapon,1,MAWANG_EQUIP_MAX_LEVEL))),
      armor:Math.max(1,Math.min(MAWANG_EQUIP_MAX_LEVEL,clampInt(equipment.armor,1,MAWANG_EQUIP_MAX_LEVEL))),
      accessory:Math.max(1,Math.min(MAWANG_EQUIP_MAX_LEVEL,clampInt(equipment.accessory,1,MAWANG_EQUIP_MAX_LEVEL))),
      boots:Math.max(1,Math.min(MAWANG_EQUIP_MAX_LEVEL,clampInt(equipment.boots,1,MAWANG_EQUIP_MAX_LEVEL))),
      gloves:Math.max(1,Math.min(MAWANG_EQUIP_MAX_LEVEL,clampInt(equipment.gloves,1,MAWANG_EQUIP_MAX_LEVEL)))
    },
    command:normalizeMonsterCommand(d.command||'defense')
  };
}
function loadMawangLocal(){
  if(isLocalOnlySession) return normalizeMawangData(mawangProfile);
  try{
    const raw=localStorage.getItem(MAWANG_LOCAL_KEY);
    return raw?normalizeMawangData(JSON.parse(raw)):cloneMawangDefault();
  }catch(_){ return cloneMawangDefault(); }
}
function saveMawangLocal(){
  if(isLocalOnlySession) return;
  try{ localStorage.setItem(MAWANG_LOCAL_KEY,JSON.stringify(mawangProfile)); }catch(_){ }
}
function mawangSyncAllowed(){
  return supabaseReady && !!supabaseClient && !!currentPlayerId && !isLocalOnlySession && !debugModeActive;
}
async function pushMawangToSupabase(immediate=false){
  if(!immediate && !mawangSyncEnabled) return;
  if(!mawangSyncAllowed()) return;
  mawangSyncInFlight=true;
  try{
    const payload={
      player_id:currentPlayerId,
      level:mawangProfile.level,
      xp:mawangProfile.xp,
      skill_points:mawangProfile.skillPoints,
      stats:mawangProfile.stats,
      skills:mawangProfile.skills,
      equipment:mawangProfile.equipment,
      command:mawangProfile.command,
      updated_at:new Date().toISOString()
    };
    const {error}=await supabaseClient.from('mawang_profiles').upsert(payload,{onConflict:'player_id'});
    if(error) console.warn('[Supabase] mawang save failed:',error);
  }catch(err){ console.warn('[Supabase] mawang save failed:',err); }
  finally{
    mawangSyncInFlight=false;
    if(mawangSyncDirty){ mawangSyncDirty=false; scheduleMawangSync(); }
  }
}
function scheduleMawangSync(){
  if(!mawangSyncEnabled) return;
  if(mawangSyncInFlight){ mawangSyncDirty=true; return; }
  if(mawangSyncTimer) clearTimeout(mawangSyncTimer);
  mawangSyncTimer=setTimeout(()=>{ mawangSyncTimer=null; pushMawangToSupabase(false); },900);
}
function saveMawangProfile(immediate=false){
  mawangProfile=normalizeMawangData(mawangProfile);
  saveMawangLocal();
  if(immediate) pushMawangToSupabase(true); else scheduleMawangSync();
}
async function loadMawangFromSupabase(){
  mawangLoaded=false;
  mawangSyncEnabled=false;
  if(!mawangSyncAllowed()){
    mawangProfile=loadMawangLocal();
    mawangLoaded=true;
    return mawangProfile;
  }
  try{
    const {data,error}=await supabaseClient.from('mawang_profiles').select('level,xp,skill_points,stats,skills,equipment,command').eq('player_id',currentPlayerId).maybeSingle();
    if(error) throw error;
    if(data){
      mawangProfile=normalizeMawangData({level:data.level,xp:data.xp,skillPoints:data.skill_points,stats:data.stats,skills:data.skills,equipment:data.equipment,command:data.command});
    }else{
      mawangProfile=cloneMawangDefault();
      await pushMawangToSupabase(true);
    }
    saveMawangLocal();
    mawangSyncEnabled=true;
  }catch(err){
    console.warn('[Supabase] mawang load failed. local fallback:',err);
    mawangProfile=loadMawangLocal();
    mawangSyncEnabled=false;
  }
  mawangLoaded=true;
  const overlay=document.getElementById('metaGrowthOverlay');
  if(overlay && !overlay.classList.contains('hidden')) renderMetaGrowth();
  renderStartMetaSummary();
  return mawangProfile;
}
function resetMawangForLocalSession(){
  mawangProfile=cloneMawangDefault();
  mawangSyncEnabled=false;
  mawangLoaded=true;
}

const MAWANG_SKILL_BRANCHES=[
  {id:'attack',icon:'⚔️',name:'파멸의 군주',desc:'마왕 자신이 직접 용사를 찢어발기는 공격 특화 트리',nodes:[
    {id:'blood_edge',name:'피의 칼날',max:3,cost:1,desc:'마왕 공격력 +4% / 랭크',effect:'atk',rankText:r=>`공격력 +${r*4}%`},
    {id:'cruel_precision',name:'잔혹한 정밀',max:3,cost:1,req:'blood_edge',desc:'치명타 확률 +3%p / 랭크',effect:'crit',rankText:r=>`치명타 +${r*3}%p`},
    {id:'execution_aura',name:'처형의 기세',max:3,cost:1,req:'cruel_precision',desc:'체력 30% 이하 용사에게 주는 피해 +8% / 랭크',effect:'execute',rankText:r=>`처형 피해 +${r*8}%`},
    {id:'hell_slash',name:'지옥참격',max:3,cost:1,req:'execution_aura',desc:'일반 공격 시 10% + 4%p/랭크 확률로 주변 용사에게 45% 추가 피해',effect:'splash',rankText:r=>`발동 확률 ${10+r*4}%`},
    {id:'king_slayer',name:'용사 사냥꾼',max:3,cost:1,req:'hell_slash',desc:'보스/대장 용사에게 주는 피해 +8% / 랭크',effect:'boss',rankText:r=>`대장 피해 +${r*8}%`},
    {id:'annihilation',name:'멸절의 일격',max:1,cost:3,req:'king_slayer',capstone:true,desc:'20초마다 가까운 용사들을 향해 공격력 350%의 광역 참격을 자동 발동합니다.',effect:'capstone_attack',rankText:r=>r?'자동 멸절 참격':'미습득'}
  ]},
  {id:'support',icon:'👾',name:'군세의 지배자',desc:'마왕이 존재하는 것만으로 주변 몬스터가 강해지는 지휘 트리',nodes:[
    {id:'dark_orders',name:'암흑의 명령',max:3,cost:1,desc:'마왕 주변 5칸 내 몬스터 공격력 +4% / 랭크',effect:'mon_atk',rankText:r=>`주변 몬스터 ATK +${r*4}%`},
    {id:'war_cry',name:'마왕의 함성',max:3,cost:1,req:'dark_orders',desc:'주변 몬스터 이동 속도 +3% / 랭크',effect:'mon_speed',rankText:r=>`이동 속도 +${r*3}%`},
    {id:'iron_will',name:'검은 철의 의지',max:3,cost:1,req:'war_cry',desc:'주변 몬스터 방어력 +2 / 랭크',effect:'mon_def',rankText:r=>`주변 DEF +${r*2}`},
    {id:'blood_supply',name:'피의 보급',max:3,cost:1,req:'iron_will',desc:'주변 몬스터 초당 HP 재생 +0.35% / 랭크',effect:'mon_regen',rankText:r=>`초당 회복 +${(r*.35).toFixed(2)}%`},
    {id:'summon_bond',name:'군세의 결속',max:3,cost:1,req:'blood_supply',desc:'몬스터 생성 제한 +1 / 1랭크마다. 시작부터 적용',effect:'cap',rankText:r=>`몬스터 상한 +${r}`},
    {id:'legion_lord',name:'군단령',max:1,cost:3,req:'summon_bond',capstone:true,desc:'25초마다 주변 몬스터에게 8초간 공격력 +25%, 방어력 +10%를 부여합니다.',effect:'capstone_support',rankText:r=>r?'자동 군단령':'미습득'}
  ]},
  {id:'obstacle',icon:'🧱',name:'지옥의 건축가',desc:'함정과 벽을 전투의 무기로 바꾸는 던전 지배 트리',nodes:[
    {id:'trap_amplify',name:'함정 증폭',max:3,cost:1,desc:'장애물 피해/디버프 효과 +4% / 랭크',effect:'trap',rankText:r=>`장애물 효과 +${r*4}%`},
    {id:'maze_master',name:'미궁의 지배',max:3,cost:1,req:'trap_amplify',desc:'장애물 효과 범위 +1칸 / 랭크',effect:'range',rankText:r=>`범위 보너스 +${r}칸`},
    {id:'wall_domain',name:'성벽 영역',max:3,cost:1,req:'maze_master',desc:'마왕/몬스터가 플레이어 생성 벽 인접 시 공격력 +5% / 랭크',effect:'wall_atk',rankText:r=>`벽 인접 피해 +${r*5}%`},
    {id:'trap_chain',name:'함정 연쇄',max:3,cost:1,req:'wall_domain',desc:'함정 연쇄가 없을 때도 8% / 랭크 확률로 연쇄 발동',effect:'chain',rankText:r=>`추가 연쇄 ${r*8}%`},
    {id:'hazard_command',name:'위험 지령',max:3,cost:1,req:'trap_chain',desc:'장애물 피해 +3%, 지속 디버프 +0.5초 / 랭크',effect:'hazard',rankText:r=>`피해 +${r*3}%`},
    {id:'hell_bloom',name:'지옥의 발아',max:1,cost:3,req:'hazard_command',capstone:true,desc:'18초마다 마왕 근처에서 가장 가까운 용사에게 닿는 함정을 자동으로 한번 발동시킵니다.',effect:'capstone_trap',rankText:r=>r?'자동 함정 개화':'미습득'}
  ]},
  {id:'authority',icon:'👑',name:'마왕의 권능',desc:'체력·마나·기동력과 스킬 운용의 기반을 강화하는 종합 트리',nodes:[
    {id:'arcane_core',name:'심연의 핵',max:3,cost:1,desc:'최대 마나 +12 / 랭크',effect:'mana',rankText:r=>`최대 마나 +${r*12}`},
    {id:'spell_focus',name:'마법 집중',max:3,cost:1,req:'arcane_core',desc:'스킬 위력 +5% / 랭크',effect:'skill',rankText:r=>`스킬 위력 +${r*5}%`},
    {id:'swift_mind',name:'신속한 사고',max:3,cost:1,req:'spell_focus',desc:'자동 스킬 재사용 대기시간 -4% / 랭크',effect:'cooldown',rankText:r=>`쿨다운 -${r*4}%`},
    {id:'dark_regen',name:'암흑 재생',max:3,cost:1,req:'swift_mind',desc:'마왕 최대 HP의 0.35%를 초당 회복 / 랭크',effect:'regen',rankText:r=>`초당 HP +${(r*.35).toFixed(2)}%`},
    {id:'authority',name:'왕의 위압',max:3,cost:1,req:'dark_regen',desc:'용사가 마왕을 공격하는 속도 감소 +4% / 랭크',effect:'guard',rankText:r=>`피격 속도 -${r*4}%`},
    {id:'demon_king',name:'진정한 마왕',max:1,cost:3,req:'authority',capstone:true,desc:'공격력/방어력/최대 HP/마나 +8%를 모두 얻습니다.',effect:'capstone_all',rankText:r=>r?'모든 전투 능력 +8%':'미습득'}
  ]}
];
