"use strict";
if(els.soundBtn){
  els.soundBtn.addEventListener('click',()=>{
    const muted=Sound.toggle();
    els.soundBtn.classList.toggle('muted',muted);
    els.soundIcon.textContent=muted?'🔇':'🔊';
    if(!muted) Sound.startMusic();
  });
}
// 모바일 브라우저는 화면 전환/백그라운드 복귀 후 오디오를 다시 잠글 수 있으므로
// 첫 입력뿐 아니라 이후 사용자 제스처에서도 가볍게 재활성화를 시도합니다.
const resumeGameAudio=()=>{ try{ Sound.unlock(); }catch(_){ } };
window.addEventListener('pointerdown',resumeGameAudio,{passive:true});
window.addEventListener('touchend',resumeGameAudio,{passive:true});
window.addEventListener('keydown',resumeGameAudio);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) resumeGameAudio(); });
window.addEventListener('pageshow',resumeGameAudio);

const STAGE_BACKGROUNDS = [
  {icon:'🌲', title:'1~10단계 · 어둠의 숲', sub:'잠든 숲의 고대 유적'},
  {icon:'🔥', title:'11~20단계 · 용암 동굴', sub:'붉게 끓어오르는 지하 화맥'},
  {icon:'❄️', title:'21~30단계 · 얼음 황야', sub:'혹한의 수정 협곡'},
  {icon:'☀️', title:'31~40단계 · 잊힌 신전', sub:'하늘에 남겨진 고대 성소'},
  {icon:'🌊', title:'41~50단계 · 지하 호수', sub:'심해의 푸른 동굴'},
  {icon:'🏰', title:'51~60단계 · 고대 성채', sub:'무너진 왕국의 최후 방어선'},
  {icon:'☘️', title:'61~70단계 · 맹독의 늪', sub:'독기가 흐르는 폐허 숲'},
  {icon:'🏜️', title:'71~80단계 · 잊혀진 사막', sub:'모래에 잠긴 왕조의 유적'},
  {icon:'🌑', title:'81~90단계 · 그림자 성', sub:'영원한 밤의 마왕성 외곽'},
  {icon:'⛅', title:'91~100단계 · 하늘의 성', sub:'구름 위에 떠오른 신성 도시'},
  {icon:'🐋', title:'101~110단계 · 심연의 바다', sub:'바닷속 고대 왕국'},
  {icon:'⛰️', title:'111~120단계 · 불멸의 협곡', sub:'끝없이 이어지는 붉은 절벽'},
  {icon:'🌌', title:'121~130단계 · 별의 폐허', sub:'별빛이 무너지는 우주 유적'},
  {icon:'🔮', title:'131~140단계 · 마력의 황무지', sub:'폭주한 마력이 뒤틀린 땅'},
  {icon:'😈', title:'141~150단계 · 지옥의 대지', sub:'마왕의 심장부로 향하는 길'},
  {icon:'∞', title:'151단계 이후 · 무한의 심연', sub:'끝이 존재하지 않는 미지의 세계'},
];
const STAGE_BG_DATA = [
  'assets/images/backgrounds/stage_01.jpg',
  'assets/images/backgrounds/stage_02.jpg',
  'assets/images/backgrounds/stage_03.jpg',
  'assets/images/backgrounds/stage_04.jpg',
  'assets/images/backgrounds/stage_05.jpg',
  'assets/images/backgrounds/stage_06.jpg',
  'assets/images/backgrounds/stage_07.jpg',
  'assets/images/backgrounds/stage_08.jpg',
  'assets/images/backgrounds/stage_09.jpg',
  'assets/images/backgrounds/stage_10.jpg',
  'assets/images/backgrounds/stage_11.jpg',
  'assets/images/backgrounds/stage_12.jpg',
  'assets/images/backgrounds/stage_13.jpg',
  'assets/images/backgrounds/stage_14.jpg',
  'assets/images/backgrounds/stage_15.jpg',
  'assets/images/backgrounds/stage_16.jpg',
];
function configureStageEvent(){
  const events=[
    {id:'mana', icon:'🔮', name:'마력 공명', text:'이번 웨이브 동안 몬스터 공격력 +15%', monsterAtk:1.15},
    {id:'redmoon', icon:'🌙', name:'붉은 달', text:'용사의 공격력 +15%, 처치 보상 +20%', heroAtk:1.15},
    {id:'goldvein', icon:'💰', name:'황금 광맥', text:'웨이브 클리어 보상 +60G', gold:60},
    {id:'silence', icon:'🌫️', name:'고요한 미궁', text:'용사 출몰 간격 +22%', spawn:1.22},
    {id:'panic', icon:'👁️', name:'공포의 메아리', text:'용사 수 +2, 처치 보상 +15%', heroHp:1.08},
    {id:'ward', icon:'🛡️', name:'수호 결계', text:'마력의 핵이 받는 피해 35% 감소', core:0.65}
  ];
  // 고정 6연속 순환 대신, 직전 이벤트만 제외한 랜덤 선택으로 웨이브마다 변주를 만듭니다.
  // 세이브/새로 시작해도 이벤트가 한 번에 같은 패턴으로 반복되지 않습니다.
  const lastId=state.stageEventLastId||null;
  const candidates=events.filter(x=>x.id!==lastId);
  const e=(candidates.length?candidates:events)[Math.floor(Math.random()*(candidates.length?candidates.length:events.length))];
  state.stageEvent=e; state.stageEventText=e.text;
  state.stageEventLastId=e.id;
  state.stageEventHistory=(state.stageEventHistory||[]).concat(e.id).slice(-8);
  state.stageHeroAtkMul=e.heroAtk||1; state.stageHeroHpMul=e.heroHp||1; state.stageSpawnMul=e.spawn||1; state.stageMonsterAtkMul=e.monsterAtk||1; state.stageCoreDmgMul=e.core||1; state.stageWaveGoldBonus=e.gold||0;
  addLog(`<span class="hl-gold">${e.icon} ${e.name}</span> — ${e.text}`);
}

function setStageBackground(wave){
  const idx=Math.min(STAGE_BACKGROUNDS.length-1, Math.floor(Math.max(1,wave-1)/10));
  const data=STAGE_BACKGROUNDS[idx]||STAGE_BACKGROUNDS[0];
  const bg=STAGE_BG_DATA[idx]||STAGE_BG_DATA[0];
  if(els.stageBackdrop){
    els.stageBackdrop.style.backgroundImage=`url(\"${bg}\")`;
    els.stageBackdrop.style.backgroundPosition='center center';
  }
  if(els.stageBadgeIcon) els.stageBadgeIcon.textContent=data.icon;
  if(els.stageBadgeText) els.stageBadgeText.textContent=data.title;
  if(els.stageBadgeSub) els.stageBadgeSub.textContent=data.sub;
}

function addLog(html){
  if(!els.log) return;
  const d=document.createElement('div'); d.innerHTML=html;
  els.log.appendChild(d); els.log.scrollTop=els.log.scrollHeight;
  while(els.log.children.length>50) els.log.removeChild(els.log.firstChild);
}
const GOLD_INCOME_MULT=0.5; // 기존 대비 골드 획득량 50% 감소
function addGold(amount, raw=false){
  amount=Math.max(0, Number(amount)||0);
  const gained=raw ? amount : Math.max(0, Math.round(amount*GOLD_INCOME_MULT));
  state.gold+=gained;
  state.totalGoldEarned=(state.totalGoldEarned||0)+gained;
  return gained;
}
if(els.logToggle&&els.log){ els.logToggle.addEventListener('click',()=>{
  const collapsed=els.log.classList.toggle('collapsed');
  if(els.logToggleArrow) els.logToggleArrow.textContent = collapsed ? '▸' : '▾';
  if(!collapsed) els.log.scrollTop=els.log.scrollHeight;
  requestAnimationFrame(()=>{ applyBoardSize(); });
}); }

function isDiggable(r,c){
  const t=state.grid[r][c];
  if(t.type!=='rock' || t.obstacle) return false;
  if(t.isEntrance) return false;
  return neighbors4(r,c).some(([nr,nc])=>{
    const nt=state.grid[nr][nc];
    return nt.type==='floor'||nt.type==='core';
  });
}
function monsterAt(r,c){ return state.monsters.find(m=>m.r===r&&m.c===c) || null; }

/* v67 · 전투 공간 인덱스
   한 진영이 같은 논리 틱 동안 움직이지 않는 구간에만 사용합니다.
   대상 선택의 동률 규칙은 기존 배열 순서를 유지합니다. */
function buildCombatSpatialIndex(list){
  const cells=Array.from({length:GRID*GRID},()=>null);
  for(let i=0;i<list.length;i++){
    const e=list[i]; if(!e||!Number.isFinite(e.r)||!Number.isFinite(e.c))continue;
    const r=Math.max(0,Math.min(GRID-1,e.r|0)),c=Math.max(0,Math.min(GRID-1,e.c|0)),k=r*GRID+c;
    (cells[k]||(cells[k]=[])).push({e,i});
  }
  return {list,cells};
}
function prepareHeroCombatSpatialIndex(){ if(state){state._heroCombatSpatial=buildCombatSpatialIndex(state.heroes||[]);state._heroCombatSpatialDirty=false;} }
function prepareMonsterCombatSpatialIndex(){ if(state){state._monsterCombatSpatial=buildCombatSpatialIndex(state.monsters||[]);state._monsterCombatSpatialDirty=false;} }
function markHeroCombatSpatialDirty(){ if(state)state._heroCombatSpatialDirty=true; }
function markMonsterCombatSpatialDirty(){ if(state)state._monsterCombatSpatialDirty=true; }
function getHeroCombatSpatialIndex(){ if(!state)return null;if(state._heroCombatSpatialDirty)prepareHeroCombatSpatialIndex();return state._heroCombatSpatial; }
function getMonsterCombatSpatialIndex(){ if(!state)return null;if(state._monsterCombatSpatialDirty)prepareMonsterCombatSpatialIndex();return state._monsterCombatSpatial; }
function clearCombatSpatialIndexes(){ if(state){state._heroCombatSpatial=null;state._monsterCombatSpatial=null;state._heroCombatSpatialDirty=false;state._monsterCombatSpatialDirty=false;} }
function combatSpatialCandidates(index,r,c,range){
  if(!index||!index.cells||range==null) return null;
  const out=[],rr0=Math.max(0,Math.floor(r-range)),rr1=Math.min(GRID-1,Math.ceil(r+range)),cc0=Math.max(0,Math.floor(c-range)),cc1=Math.min(GRID-1,Math.ceil(c+range));
  for(let rr=rr0;rr<=rr1;rr++) for(let cc=cc0;cc<=cc1;cc++){
    if(Math.abs(rr-r)+Math.abs(cc-c)>range) continue;
    const bucket=index.cells[rr*GRID+cc]; if(bucket) for(const item of bucket) out.push(item);
  }
  return out;
}

/* ---------------- mobile viewport height fix ---------------- */
function setVh(){ document.documentElement.style.setProperty('--vh', (window.innerHeight*0.01)+'px'); }
setVh();
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', ()=>{ setVh(); setTimeout(()=>{ applyBoardSize(); renderUI(); },250); });

/* ---------------- board sizing (DOM grid, comfortable tap size, scrolls if needed) ---------------- */
let zoomLevel=1;
const MIN_ZOOM=1, MAX_ZOOM=3.2;
const MIN_CELL_PX=10;
function isZoomedNow(){ return zoomLevel>1.02; }
function fitCellPx(){
  const availW = Math.max(120, els.frame.clientWidth - 10);
  const availH = Math.max(120, els.frame.clientHeight - 10);
  const avail = Math.min(availW, availH);
  // 기본 화면에서는 전체 맵이 가로로 잘리지 않도록 컨테이너에 정확히 맞춥니다. 확대는 zoomLevel이 담당합니다.
  return Math.max(MIN_CELL_PX, Math.floor(avail/GRID));
}
function applyBoardSize(){
  // 마을 습격은 15x15 좌표계를 로직에만 사용하고, 화면은 48px x 15 = 720px 전용 전장으로 고정합니다.
  // 이 분기는 state.phase==='village'일 때만 동작하므로 기존 던전 보드 크기/줌 동작에는 영향을 주지 않습니다.
  const villageScene=!!(state && state.phase==='village' && state.village);
  if(villageScene){
    const pad=12;
    const availW=Math.max(180, (els.frame?.clientWidth||720) - pad);
    const availH=Math.max(180, (els.frame?.clientHeight||720) - pad);
    const fitPx=Math.floor(Math.min(availW, availH)/GRID);
    currentCellPx=Math.max(24, Math.min(48, fitPx));
    const size=GRID*currentCellPx;
    els.map.style.gridTemplateColumns=`repeat(${GRID}, ${currentCellPx}px)`;
    els.map.style.gridTemplateRows=`repeat(${GRID}, ${currentCellPx}px)`;
    els.map.style.width=size+'px'; els.map.style.height=size+'px';
    els.boardInner.style.width=size+'px'; els.boardInner.style.height=size+'px';
    els.boardInner.style.margin='0 auto';
    els.rangeLayer.style.width=size+'px'; els.rangeLayer.style.height=size+'px';
    els.tokenLayer.style.width=size+'px'; els.tokenLayer.style.height=size+'px';
    els.frame.classList.remove('zoomed');
    els.boardInner.classList.remove('zoomed');
    return;
  }

  // 던전은 기존 동작을 그대로 유지합니다.
  // 데스크톱은 기존처럼 보드가 플레이 영역 안에 맞도록 유지합니다.
  // 모바일은 기본 셀을 약 18% 키워 터치/시인성을 확보하고,
  // 필요할 경우 보드 자체를 스크롤/팬할 수 있게 합니다.
  const isMobile = window.matchMedia('(max-width:600px)').matches;
  const base=fitCellPx();
  currentCellPx = Math.max(10, Math.round(base*zoomLevel));
  if(!isZoomedNow() && !isMobile){
    const maxByW=Math.max(10, Math.floor((els.frame.clientWidth-10)/GRID));
    const maxByH=Math.max(10, Math.floor((els.frame.clientHeight-10)/GRID));
    currentCellPx=Math.min(currentCellPx,maxByW,maxByH);
  }
  const size = GRID*currentCellPx;
  els.map.style.gridTemplateColumns=`repeat(${GRID}, ${currentCellPx}px)`;
  els.map.style.gridTemplateRows=`repeat(${GRID}, ${currentCellPx}px)`;
  els.map.style.width=size+'px'; els.map.style.height=size+'px';
  els.boardInner.style.width=size+'px'; els.boardInner.style.height=size+'px';
  els.rangeLayer.style.width=size+'px'; els.rangeLayer.style.height=size+'px';
  els.tokenLayer.style.width=size+'px'; els.tokenLayer.style.height=size+'px';
  const zoomed=isZoomedNow();
  els.frame.classList.toggle('zoomed', zoomed);
  els.boardInner.classList.toggle('zoomed', zoomed);
}

// v73: 모바일에서 하단 패널이 접히거나 펼쳐져 보드 영역의 실제 크기가 바뀌면
// 기존 cell 크기를 그대로 두지 않고 새 viewport에 맞춰 다시 계산합니다.
// 수동 줌 상태에서는 현재 보고 있던 지점이 갑자기 튀지 않도록 중심 좌표를 보존합니다.
let _boardLayoutResizeRaf=0;
function refitBoardForLayoutChange(){
  if(!els?.frame || !els?.boardInner) return;
  const oldPx=Math.max(1,currentCellPx||1);
  const wasZoomed=isZoomedNow();
  const centerCol=(els.frame.scrollLeft + els.frame.clientWidth/2)/oldPx;
  const centerRow=(els.frame.scrollTop + els.frame.clientHeight/2)/oldPx;
  applyBoardSize();
  if(wasZoomed){
    const newPx=Math.max(1,currentCellPx||1);
    els.frame.scrollLeft=Math.max(0,centerCol*newPx-els.frame.clientWidth/2);
    els.frame.scrollTop=Math.max(0,centerRow*newPx-els.frame.clientHeight/2);
  }
}
function scheduleBoardLayoutRefit(delay=0){
  const run=()=>{
    if(_boardLayoutResizeRaf) cancelAnimationFrame(_boardLayoutResizeRaf);
    _boardLayoutResizeRaf=requestAnimationFrame(()=>{
      _boardLayoutResizeRaf=0;
      refitBoardForLayoutChange();
    });
  };
  if(delay>0) setTimeout(run,delay); else run();
}

// panel collapse 외에도 모바일 주소창/회전/레이아웃 변화로 board-frame 높이가 변할 수 있으므로
// 실제 viewport 크기 변경을 관찰해 자동으로 재맞춤합니다.
if(typeof ResizeObserver==='function'){
  const _boardFrameResizeObserver=new ResizeObserver(()=>{
    if(window.matchMedia('(max-width:600px)').matches) scheduleBoardLayoutRefit();
  });
  if(els?.frame) _boardFrameResizeObserver.observe(els.frame);
}

function centerZoomOnCore(){
  requestAnimationFrame(()=>{
    const px=currentCellPx;
    els.frame.scrollLeft = Math.max(0, CORE_C*px - els.frame.clientWidth/2 + px/2);
    els.frame.scrollTop = Math.max(0, CORE_R*px - els.frame.clientHeight/2 + px/2);
  });
}
function setZoomLevel(next, anchorClientX, anchorClientY){
  const prevPx = currentCellPx;
  const prevScrollL = els.frame.scrollLeft, prevScrollT = els.frame.scrollTop;
  const rect = els.frame.getBoundingClientRect();
  const ax = (anchorClientX!=null ? anchorClientX-rect.left : els.frame.clientWidth/2) + prevScrollL;
  const ay = (anchorClientY!=null ? anchorClientY-rect.top : els.frame.clientHeight/2) + prevScrollT;
  zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
  applyBoardSize();
  const scale = currentCellPx/prevPx;
  els.frame.scrollLeft = ax*scale - (anchorClientX!=null ? anchorClientX-rect.left : els.frame.clientWidth/2);
  els.frame.scrollTop = ay*scale - (anchorClientY!=null ? anchorClientY-rect.top : els.frame.clientHeight/2);
}
function isFullscreenActive(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}
function requestFullscreenBtn(){
  try{
    const el=document.documentElement;
    const req=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen;
    if(req){ const p=req.call(el); if(p && typeof p.catch==='function') p.catch(()=>{}); }
  }catch(err){ /* 전체화면을 지원하지 않는 환경이면 조용히 무시합니다. */ }
}
function exitFullscreenBtn(){
  try{
    const exit=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen||document.msExitFullscreen;
    if(exit){ const p=exit.call(document); if(p && typeof p.catch==='function') p.catch(()=>{}); }
  }catch(err){ /* 무시 */ }
}
function updateFullscreenBtn(){
  const active=isFullscreenActive();
  els.zoomBtn.textContent = active ? '🗗' : '⛶';
  els.zoomBtn.classList.toggle('active', active);
  els.zoomBtn.title = active ? '탭하면 전체화면을 해제합니다' : '탭하면 화면을 전체화면으로 전환합니다';
}
els.zoomBtn.addEventListener('click',()=>{
  Sound.ui();
  if(isFullscreenActive()) exitFullscreenBtn(); else requestFullscreenBtn();
});
['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange'].forEach(evt=>{
  document.addEventListener(evt, ()=>{ updateFullscreenBtn(); requestAnimationFrame(()=>{ applyBoardSize(); renderUI(); }); });
});
updateFullscreenBtn();
window.addEventListener('resize', ()=>{ setVh(); applyBoardSize(); renderUI(); });

/* pinch-to-zoom with two fingers */
let pinchActive=false, pinchStartDist=0, pinchStartZoom=1;
function touchDist(t0,t1){ const dx=t0.clientX-t1.clientX, dy=t0.clientY-t1.clientY; return Math.hypot(dx,dy); }
els.frame.addEventListener('touchstart',(e)=>{
  if(e.touches.length===2){
    pinchActive=true; pointerDown=false; startCell=null;
    pinchStartDist=touchDist(e.touches[0],e.touches[1]);
    pinchStartZoom=zoomLevel;
    e.preventDefault();
  }
},{passive:false});
els.frame.addEventListener('touchmove',(e)=>{
  if(pinchActive && e.touches.length===2){
    const d=touchDist(e.touches[0],e.touches[1]);
    const midX=(e.touches[0].clientX+e.touches[1].clientX)/2;
    const midY=(e.touches[0].clientY+e.touches[1].clientY)/2;
    setZoomLevel(pinchStartZoom*(d/pinchStartDist), midX, midY);
    e.preventDefault();
  }
},{passive:false});
els.frame.addEventListener('touchend',(e)=>{
  if(e.touches.length<2) pinchActive=false;
},{passive:false});


/* ---------------- toolbar ---------------- */
function showToolInfo(tool){
  if(!state) return;
  state.selected={kind:'tool', tool};
  renderUI();
}

// v64: 하단 도구 패널은 현재 도구 선택 상태와 별개로 접고 펼칠 수 있습니다.
// 패널을 접어도 activeTool은 유지되므로, 플레이 화면에 집중하면서도
// 몬스터/장애물 배치나 명령 상태는 그대로 이어집니다.
function isBottomToolPanelCollapsed(){
  return !!(els.panelWrap && els.panelWrap.classList.contains('tool-panel-collapsed'));
}
function setBottomToolPanelCollapsed(collapsed){
  if(!els.panelWrap) return;
  const isCollapsed=!!collapsed;
  els.panelWrap.classList.toggle('tool-panel-collapsed',isCollapsed);
  els.panelWrap.setAttribute('aria-hidden',isCollapsed?'true':'false');

  const activeTool=state&&state.activeTool;
  els.toolbar.querySelectorAll('button[data-tool]').forEach(b=>{
    b.setAttribute('aria-expanded',String(!isCollapsed && b.dataset.tool===activeTool));
  });

  // 패널은 max-height/transform 애니메이션으로 약 0.22초 동안 움직입니다.
  // 첫 프레임 + 전환 종료 시점에 보드를 다시 맞춰, 접힌 공간을 즉시 게임 화면이 사용하게 합니다.
  if(window.matchMedia('(max-width:600px)').matches){
    scheduleBoardLayoutRefit();
    scheduleBoardLayoutRefit(80);
    scheduleBoardLayoutRefit(240);
  }
}

const panelCollapseHandle=document.getElementById('panelCollapseHandle');
if(panelCollapseHandle){
  panelCollapseHandle.addEventListener('click',(e)=>{
    e.preventDefault();
    e.stopPropagation();
    if(isBottomToolPanelCollapsed()) return;
    Sound.ui();
    setBottomToolPanelCollapsed(true);
  });
}

els.toolbar.querySelectorAll('button[data-tool]').forEach(btn=>{
  let ignoreClickUntil=0;
  const activateTool=(e)=>{
    if(e){ e.preventDefault(); e.stopPropagation(); }
    Sound.ui();
    const tool=btn.dataset.tool;

    if(state){
      const sameToolPanel=state.activeTool===tool &&
        state.selected?.kind==='tool' && state.selected.tool===tool;

      // 이미 열려 있는 같은 도구 버튼을 다시 누르면 패널만 접습니다.
      // 접힌 상태에서 같은 버튼을 누르면 기존 패널을 그대로 다시 펼칩니다.
      if(sameToolPanel){
        setBottomToolPanelCollapsed(!isBottomToolPanelCollapsed());
        return;
      }

      // 다른 도구로 전환하거나, 타일/몬스터 상세 화면에서 도구 버튼을 누르면
      // 패널을 열고 해당 도구 패널을 보여줍니다.
      setBottomToolPanelCollapsed(false);
      els.toolbar.querySelectorAll('button[data-tool]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTool=tool;
      showToolInfo(tool);
    } else {
      els.toolbar.querySelectorAll('button[data-tool]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      pendingTool=tool;
      setBottomToolPanelCollapsed(false);
    }
  };
  btn.addEventListener('click',(e)=>{
    // 터치 pointerup 직후 브라우저가 합성 click을 한 번 더 보내는 경우가 있어
    // 토글이 두 번 실행되지 않도록 해당 click만 무시합니다.
    if(performance.now()<ignoreClickUntil){
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    activateTool(e);
  });
  btn.addEventListener('pointerup',(e)=>{
    if(e.pointerType==='touch' || e.pointerType==='pen'){
      ignoreClickUntil=performance.now()+500;
      activateTool(e);
    }
  });
});
let pendingTool='dig';
els.phaseBtn.addEventListener('click', ()=>{
  Sound.ui();
  if(state && state.selected?.kind==='altar') closeAltar();
  if(state && state.running && !state.gameOver && state.phase==='build'){
    if(state.villagePrepTimer!=null){
      // v38.6: 마을 습격 예고 중에는 즉시 진격 버튼으로 동작합니다.
      state.villagePrepTimer=0;
      addLog('<span class="hl-gold">🏘️ 즉시 진격!</span> 원정군이 마을로 향합니다.');
      renderUI();
      return;
    }
    state.buildTimer=0;
    addLog('<span class="hl-red">용사들을 서둘러 불러들입니다!</span>');
    renderUI();
  }
});

const villageRaidLaunchBtn=document.getElementById('villageRaidLaunchBtn');
if(villageRaidLaunchBtn){
  villageRaidLaunchBtn.addEventListener('click',()=>{
    Sound.ui();
    if(typeof window.requestVillageRaid==='function') window.requestVillageRaid();
  });
}

/* ---------------- altar controls ---------------- */
if(els.altarBtn){
  els.altarBtn.addEventListener('click',()=>{
    Sound.ui();
    if(state && state.selected?.kind==='altar') closeAltar();
    else openAltar();
  });
}

document.addEventListener('click',(e)=>{
  if(e.target && e.target.id==='useMonsterTicketBtn'){
    if(!state||state.phase!=='build'||(state.monsterSummonTickets||0)<=0) return;
    const cap=state.monsterCap||MONSTER_CAP_START; if(state.monsters.length>=cap) return;
    const pool=getAvailableMonsterTypes(); if(!pool.length) return;
    const mt=pool[Math.floor(Math.random()*pool.length)]; const spot=findMonsterSpawnNearCore()||findRandomEmptyFloor(); if(!spot) return;
    const m=createMonsterEntity(spot[0],spot[1],mt.id,{tier:1,invested:0}); if(m){ state.monsterSummonTickets--; addLog(`<span class="hl-gold">🎫 소환권</span> — ${mt.name}이(가) 무료로 소환되었습니다.`); renderUI(); }
  }
});

/* ---------------- build DOM grid (created once) ---------------- */
let cellEls=[];
function buildMapDOM(){
  els.map.innerHTML='';
  cellEls=[];
  for(let r=0;r<GRID;r++){
    const rowArr=[];
    for(let c=0;c<GRID;c++){
      const d=document.createElement('div');
      d.className='cell';
      rowArr.push(d);
      els.map.appendChild(d);
    }
    cellEls.push(rowArr);
  }
}

/* ---------------- interactions ---------------- */
let pointerDown=false, dragMoved=false, startCell=null;
function cellFromEvent(clientX,clientY){
  const rect=els.map.getBoundingClientRect();
  const px=currentCellPx;
  const x=clientX-rect.left, y=clientY-rect.top;
  const c=Math.floor(x/px), r=Math.floor(y/px);
  if(!inBounds(r,c)) return null;
  return {r,c};
}
function attemptDig(r,c){
  if(!state || state.phase!=='build') return false;
  if(state.grid[r][c].type!=='rock' || state.grid[r][c].obstacle) return false;
  if(!isDiggable(r,c)) return false;
  if(state.gold<DIG_COST) return false;
  state.gold-=DIG_COST;
  state.grid[r][c]={type:'floor', isEntrance:false, obstacle:null};
  Sound.digBreak();
  state.tilesDug=(state.tilesDug||0)+1;
  dungeonStructureInvalidate();
  return true;
}
function placeWall(r,c){
  if(!state || state.phase!=='build') return false;
  const tile=state.grid[r][c];
  if(tile.type!=='floor' || tile.isEntrance || tile.obstacle || tile.rubbleWall) return false;
  if(monsterAt(r,c)) return false;
  if(state.gold<WALL_BUILD_COST) return false;
  state.gold-=WALL_BUILD_COST;
  state.grid[r][c]={type:'rock',isEntrance:false,obstacle:null,playerWall:true};
  state.wallsBuilt=(state.wallsBuilt||0)+1;
  Sound.wallBuild();
  state.fxEvents.push({type:'spawnBurst',r,c,color:'rgba(170,160,190,.9)'});
  addLog(`<span class="hl">벽</span>을 건설했습니다. 골드 <span class="hl-gold">-${WALL_BUILD_COST}G</span>`);
  dungeonStructureInvalidate();
  return true;
}
function digPlayerWall(r,c){
  if(!state || state.phase!=='build') return false;
  if(!inBounds(r,c)) return false;
  const tile=state.grid[r][c];
  if(!tile || tile.type!=='rock' || tile.isEntrance || tile.obstacle) return false;
  if(monsterAt(r,c)) return false;

  // [장애물 > 벽 파기]는 기존 암벽과 플레이어가 만든 벽 모두 5G를 사용합니다.
  if(tile.playerWall!==true){
    if(!isDiggable(r,c)) return false;
    if(state.gold<WALL_DIG_COST) return false;
    state.gold-=WALL_DIG_COST;
    state.tilesDug=(state.tilesDug||0)+1;
    addLog(`<span class="hl">기존 암벽</span>을 파냈습니다. 골드 <span class="hl-gold">-${WALL_DIG_COST}G</span>`);
  } else {
    if(state.gold<WALL_DIG_COST) return false;
    state.gold-=WALL_DIG_COST;
    addLog(`<span class="hl">건설한 벽</span>을 파냈습니다. 골드 <span class="hl-gold">-${WALL_DIG_COST}G</span>`);
  }

  state.grid[r][c]={type:'floor',isEntrance:false,obstacle:null};
  Sound.digBreak();
  state.fxEvents.push({type:'spawnBurst',r,c,color:'rgba(170,160,190,.78)'});

  state._mapDirty=true;
  state._rangesDirty=true;
  state._archetypeDirty=true;
  state._auraDirty=true;
  state._panelDirty=true;
  dungeonStructureInvalidate();
  return true;
}
const OBSTACLE_DETECT_CHANCE={spike:.62,flame:.56,lightning:.72,poison:.48,barricade:1,pit:.70,statue:.88,frost:.68,web:.74,curse:.78};
const OBSTACLE_BREAK_TIME={spike:2.2,flame:2.8,lightning:2.4,poison:2.6,barricade:4.8,pit:2.8,statue:4.4,frost:2.4,web:2.0,curse:3.8,
  gust:2.2,magnet:2.4,stun_cage:3.6,collapse_bridge:5.2};
function obstacleDetectChance(h,obId){
  let chance=OBSTACLE_DETECT_CHANCE[obId]??0.65;
  if(h.typeId==='shadowrogue') chance=Math.max(0.28,chance-0.18);
  if(h.typeId==='miner') chance=Math.min(.92,chance+.12);
  if(h.typeId==='hunter') chance=Math.min(.90,chance+.08);
  return Math.max(0,Math.min(1,chance));
}
function obstacleBreakTime(obId,h,tile){
  const base=OBSTACLE_BREAK_TIME[obId]??3;
  const lv=obstacleLevel(tile);
  const durabilityMul=1+(lv-1)*0.055;
  const ht=heroTypeOf(h);
  return base*durabilityMul*(ht?.digTimeMul||1);
}
const OBSTACLE_FOOTPRINT_SIZE=2;
const OBSTACLE_FOOTPRINT_KIND={
  flame:'single',poison:'single',barricade:'single',frost:'single',
  gust:'single',magnet:'single',stun_cage:'single',collapse_bridge:'single',
  pit:'square2',web:'square2',lightning:'cross'
};
function obstacleFootprintKind(obId,tile=null){
  if(tile?.wasBridge && obId==='collapse_bridge') return 'single';
  return OBSTACLE_FOOTPRINT_KIND[obId]||'square2';
}
function obstacleAnchor(r,c,obId=null){
  const id=obId||state?.selectedObstacleType||state?.grid?.[r]?.[c]?.obstacle||'';
  if(obstacleFootprintKind(id)==='square2') return {r:Math.max(0,Math.min(GRID-2,r)),c:Math.max(0,Math.min(GRID-2,c))};
  return {r,c};
}
function obstacleRootPos(r,c){
  const t=state?.grid?.[r]?.[c]; if(!t?.obstacle) return null;
  const rr=Number.isInteger(t.obstacleRootR)?t.obstacleRootR:r;
  const cc=Number.isInteger(t.obstacleRootC)?t.obstacleRootC:c;
  return state?.grid?.[rr]?.[cc]?.obstacle ? {r:rr,c:cc} : {r,c};
}
function obstacleRootTile(r,c){const root=obstacleRootPos(r,c);return root?state.grid[root.r][root.c]:null;}
function isObstacleRoot(r,c){const t=state?.grid?.[r]?.[c];return !!t?.obstacle&&(t.obstacleRootR??r)===r&&(t.obstacleRootC??c)===c;}
function obstacleFootprintCells(r,c,obId=null){
  const existing=state?.grid?.[r]?.[c]?.obstacle;
  const existingRoot=existing?obstacleRootPos(r,c):null;
  if(existingRoot){ r=existingRoot.r;c=existingRoot.c;obId=state.grid[r][c].obstacle; }
  const id=obId||state?.selectedObstacleType||existing||'';
  const root=obstacleAnchor(r,c,id),kind=obstacleFootprintKind(id,state?.grid?.[root.r]?.[root.c]);
  let cells=[];
  if(kind==='single') cells=[[root.r,root.c]];
  else if(kind==='cross') cells=[[root.r,root.c],[root.r-1,root.c],[root.r+1,root.c],[root.r,root.c-1],[root.r,root.c+1]];
  else for(let rr=root.r;rr<root.r+2;rr++)for(let cc=root.c;cc<root.c+2;cc++)cells.push([rr,cc]);
  return {root,cells,kind};
}
function obstacleFootprintLabel(obId){ const k=obstacleFootprintKind(obId); return k==='single'?'1×1':k==='cross'?'십자형 5칸':'2×2'; }
function obstacleVisualFootprint(obId,tile=null){
  const kind=obstacleFootprintKind(obId,tile);
  return kind==='square2'?2:(kind==='cross'?3:1);
}
function obstacleVisualBox(obId,tile=null){
  const kind=obstacleFootprintKind(obId,tile);
  if(kind==='cross') return {w:3,h:3,x:-1,y:-1,clip:'polygon(33.333% 0%, 66.667% 0%, 66.667% 33.333%, 100% 33.333%, 100% 66.667%, 66.667% 66.667%, 66.667% 100%, 33.333% 100%, 33.333% 66.667%, 0% 66.667%, 0% 33.333%, 33.333% 33.333%)'};
  if(kind==='single') return {w:1,h:1,x:0,y:0,clip:'inset(0 round 5px)'};
  return {w:2,h:2,x:0,y:0,clip:'inset(0 round 5px)'};
}
function obstacleFxCenter(rootR,rootC,obId,tile=null){ return obstacleFootprintKind(obId,tile)==='square2'?{r:rootR+.5,c:rootC+.5}:{r:rootR,c:rootC}; }
function canPlaceObstacleAt(r,c,obId=null){
  if(!state||!inBounds(r,c)) return false;
  const id=obId||state.selectedObstacleType||'';
  if(isWallMountedObstacle(id)){
    const t=state.grid[r]?.[c];
    // 화염 분사기/사슬 작살탑은 반대 벽이나 제작 벽 여부와 무관하게
    // 입구가 아닌 어느 일반 벽에도 설치할 수 있습니다. 방향은 설치/설치 후 별도로 지정합니다.
    if(!t||t.type!=='rock'||t.isEntrance||t.rubbleWall||t.obstacle)return false;
    if(monsterAt(r,c)||isHeroAt(r,c))return false;
    return true;
  }
  const {cells,kind}=obstacleFootprintCells(r,c,id);
  if(kind==='cross' && cells.some(([rr,cc])=>!inBounds(rr,cc))) return false;
  for(const [rr,cc] of cells){
    const t=state.grid[rr]?.[cc];
    if(!t||t.type!=='floor'||t.isEntrance||t.rubbleWall||t.obstacle)return false;
    if(isHeroAt(rr,cc)||(rr===CORE_R&&cc===CORE_C))return false;
  }
  return true;
}
function syncObstacleFootprint(rootR,rootC){
  const root=state?.grid?.[rootR]?.[rootC]; if(!root?.obstacle) return;
  if(typeof physicalDef==='function' && physicalDef(root.obstacle)) return;
  // 같은 루트를 가리키던 과거 점유 셀을 먼저 비워 형태 변경/붕락교 변환 시 고아 셀이 남지 않게 합니다.
  for(let rr=0;rr<GRID;rr++)for(let cc=0;cc<GRID;cc++){
    if(rr===rootR&&cc===rootC) continue;
    const t=state.grid[rr]?.[cc];
    if(t?.obstacle && t.obstacleRootR===rootR && t.obstacleRootC===rootC){
      t.obstacle=null;delete t.obstacleRootR;delete t.obstacleRootC;delete t.obstacleLevel;delete t.obstacleHp;delete t.obstacleMaxHp;
    }
  }
  const {cells}=obstacleFootprintCells(rootR,rootC,root.obstacle);
  for(const [rr,cc] of cells){
    const t=state.grid[rr]?.[cc]; if(!t) continue;
    t.obstacle=root.obstacle;t.obstacleRootR=rootR;t.obstacleRootC=rootC;
    t.obstacleLevel=root.obstacleLevel||1;t.obstacleHp=root.obstacleHp??0;t.obstacleMaxHp=root.obstacleMaxHp??0;
    if(root.wasBridge){t.wasBridge=true;t.bridgeCollapsed=!!root.bridgeCollapsed;}
  }
}
function clearObstacleFootprint(r,c){
  const root=obstacleRootPos(r,c); if(!root)return false;
  const rootTile=state.grid[root.r][root.c];
  if(typeof physicalDef==='function' && physicalDef(rootTile.obstacle)) return clearPhysicalTrap(root.r,root.c);
  const clearedId=rootTile.obstacle;
  for(let rr=0;rr<GRID;rr++)for(let cc=0;cc<GRID;cc++){
    const t=state.grid[rr]?.[cc];
    if(t?.obstacle===clearedId&&(t.obstacleRootR??rr)===root.r&&(t.obstacleRootC??cc)===root.c){
      t.obstacle=null;delete t.obstacleRootR;delete t.obstacleRootC;delete t.obstacleLevel;delete t.obstacleHp;delete t.obstacleMaxHp;delete t.statueCooldown;delete t.obstacleFxAt;for(const k of ['obstacleDirR','obstacleDirC','gustNextAt','harpoonNextAt','harpoonDirR','harpoonDirC','harpoonImmuneUntil','mimicNextAt','mimicRehitImmuneUntil','runeGateCycleStartedAt','runeGateClosed','runeGatePermanent','runeGateTouches']) delete t[k];
    }
  }
  return true;
}
const WALL_MOUNT_OBSTACLES=new Set(['gust','magnet']);
const OBSTACLE_MOUNT_DIRS=[
  {r:-1,c:0,name:'위',icon:'↑'},
  {r:0,c:1,name:'오른쪽',icon:'→'},
  {r:1,c:0,name:'아래',icon:'↓'},
  {r:0,c:-1,name:'왼쪽',icon:'←'}
];
function isWallMountedObstacle(obId){return WALL_MOUNT_OBSTACLES.has(obId);}
function obstacleMountDirectionIndex(){
  const n=Number(state?.selectedObstacleDirection);
  return Number.isInteger(n)?((n%4)+4)%4:1;
}
function obstacleMountDirectionVector(index=obstacleMountDirectionIndex()){
  return OBSTACLE_MOUNT_DIRS[((Number(index)||0)%4+4)%4]||OBSTACLE_MOUNT_DIRS[1];
}
function mountedObstacleFacingOpen(r,c,dirIndex=obstacleMountDirectionIndex()){
  const d=obstacleMountDirectionVector(dirIndex),nr=r+d.r,nc=c+d.c,t=state?.grid?.[nr]?.[nc];
  if(!t||!inBounds(nr,nc))return false;
  return (t.type==='floor'||t.type==='core')&&!t.rubbleWall&&t.obstacle!=='barricade';
}
function countPlacedObstacleRoots(obId){
  if(!state?.grid)return 0;
  let count=0;
  for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
    const t=state.grid[r]?.[c];
    if(t?.obstacle===obId && (t.obstacleRootR??r)===r && (t.obstacleRootC??c)===c) count++;
  }
  return count;
}
const RUNE_GATE_MAX_PLACED=2;
function placeObstacle(r,c,obId,free=false){
  if(typeof physicalDef==='function' && physicalDef(obId)) return placePhysicalTrap(r,c,obId,free);
  if(!state || state.phase!=='build') return false;
  if(state.contractNoObstacleWaves>0 && !free){ addLog('<span class="hl-red">⛓️ 침묵의 맹약</span> — 이번 준비 단계엔 새 함정을 설치할 수 없습니다.'); return false; }
  const ob=OBSTACLE_TYPES.find(o=>o.id===obId); if(!ob||obId==='__wall__') return false;
  if(obId==='collapse_bridge' && countPlacedObstacleRoots('collapse_bridge')>=RUNE_GATE_MAX_PLACED){
    addLog('<span class="hl-red">🌀 봉쇄 룬문</span>은 던전에 최대 2개까지만 설치할 수 있습니다.');
    return false;
  }
  const {root}=obstacleFootprintCells(r,c,obId); if(!canPlaceObstacleAt(root.r,root.c,obId)) return false;
  if(!free&&state.gold<obstaclePlaceCost(ob))return false;
  if(!free)state.gold-=obstaclePlaceCost(ob);
  const tile=state.grid[root.r][root.c];tile.obstacle=obId;tile.obstacleRootR=root.r;tile.obstacleRootC=root.c;tile.obstacleLevel=1;tile.obstacleHp=obstacleMaxHpFor(ob,1);tile.obstacleMaxHp=obstacleMaxHpFor(ob,1);
  // v92: 새 장애물별 런타임 상태는 설치 시 초기화합니다.
  for(const k of ['obstacleDirR','obstacleDirC','gustNextAt','harpoonNextAt','harpoonDirR','harpoonDirC','harpoonImmuneUntil','mimicNextAt','mimicRehitImmuneUntil','runeGateCycleStartedAt','runeGateClosed','runeGatePermanent','runeGateTouches']) delete tile[k];
  if(isWallMountedObstacle(obId)){
    const dirIndex=obstacleMountDirectionIndex(),d=obstacleMountDirectionVector(dirIndex);
    tile.obstacleDir=dirIndex;tile.obstacleDirR=d.r;tile.obstacleDirC=d.c;
    if(obId==='magnet'){tile.harpoonDirR=d.r;tile.harpoonDirC=d.c;}
  }
  if(obId==='collapse_bridge'){tile.runeGateTouches=0;tile.runeGateClosed=false;tile.runeGatePermanent=false;tile.runeGateCycleStartedAt=0;}
  syncObstacleFootprint(root.r,root.c);
  state.obstaclePlacements=(state.obstaclePlacements||0)+1;Sound.obstacle();
  state.fxEvents.push({type:'spawnBurst',r:root.r,c:root.c,color:'rgba(224,182,74,.9)',footprint:obstacleVisualFootprint(obId,tile)});
  addLog(`<span class="hl">${ob.name}</span>을(를) ${isWallMountedObstacle(obId)?'벽에 '+obstacleMountDirectionVector(tile.obstacleDir).name+' 방향으로':obstacleFootprintLabel(obId)+' 빈 바닥에'} ${free?'무료로 ':''}설치했습니다.`);
  dungeonStructureInvalidate();return true;
}
function upgradeObstacle(r,c){
  if(typeof physicalDef==='function' && physicalDef(obstacleRootTile(r,c)?.obstacle)) return upgradePhysicalTrap(r,c);
  if(!state||state.phase!=='build')return false;const root=obstacleRootPos(r,c);if(!root)return false;
  const tile=state.grid[root.r]?.[root.c];if(!tile?.obstacle)return false;const ob=OBSTACLE_TYPES.find(o=>o.id===tile.obstacle);if(!ob)return false;
  const lv=obstacleLevel(tile);if(lv>=OBSTACLE_LEVEL_MAX)return false;const cost=obstacleUpgradeCost(ob,lv);if(state.gold<cost)return false;
  state.gold-=cost;tile.obstacleLevel=lv+1;tile.obstacleMaxHp=obstacleMaxHpFor(ob,tile.obstacleLevel);tile.obstacleHp=tile.obstacleMaxHp;syncObstacleFootprint(root.r,root.c);
  Sound.level();state.fxEvents.push({type:'monsterUpgrade',r:root.r,c:root.c,tier:tile.obstacleLevel,footprint:obstacleVisualFootprint(ob.id,tile)});state.fxEvents.push({type:'floatText',r:root.r,c:root.c,text:'장애물 Lv.'+tile.obstacleLevel+' 강화!',color:'#e0b64a'});
  addLog(`<span class="hl-gold">${ob.name}</span>이(가) Lv.${tile.obstacleLevel}로 강화되었습니다! ${['flame','lightning','poison','barricade','pit','frost','web'].includes(ob.id)?'효과가 강화됩니다.':'범위 '+obstacleRange(ob.id,tile)+'칸'}`);dungeonStructureInvalidate();return true;
}
function clearObstacle(r,c){
  if(!state||state.phase!=='build')return;const tile=state.grid[r][c];if(tile.obstacle&&clearObstacleFootprint(r,c)){dungeonStructureInvalidate();addLog('장애물을 제거했습니다.');}
}
function pointerStart(x,y){
  if(!state||!state.running||state.gameOver) return;
  const cell=cellFromEvent(x,y); if(!cell) return;
  pointerDown=true; dragMoved=false; startCell=cell;
  if(!isZoomedNow() && state.activeTool==='dig' && state.phase==='build'){ attemptDig(cell.r,cell.c); renderUI(); }
}
function pointerMove(x,y){
  if(!pointerDown||!state||!state.running) return;
  const cell=cellFromEvent(x,y); if(!cell) return;
  if(cell.r!==startCell.r||cell.c!==startCell.c) dragMoved=true;
  if(!isZoomedNow() && state.activeTool==='dig' && state.phase==='build'){ attemptDig(cell.r,cell.c); renderUI(); }
}
function pointerEnd(){
  if(!pointerDown) return;
  pointerDown=false;
  // v40: 핵 배치 단계에서는 탭이 오직 '핵 놓기'로만 쓰입니다.
  if(state && state.running && state.phase==='placeCore'){
    const sc=startCell;
    startCell=null;
    if(!dragMoved && sc) placeCoreAt(sc.r,sc.c);
    return;
  }
  if(!dragMoved && startCell && state && state.running){
    const {r,c}=startCell;
    const tile=state.grid[r][c];
    const mOnTile=monsterAt(r,c);
    const tool=state.activeTool;
    const canBuild = state.phase==='build';

    // [장애물 > 벽 파기]는 기존 암벽 + 생성한 벽을 모두 처리하며, 셀 선택보다 최우선으로 처리합니다.
    // 벽을 클릭했을 때 선택 패널이 열리는 기존 경로를 완전히 차단하고,
    // 같은 모드에서 여러 벽을 연속으로 파낼 수 있게 합니다.
    if(tool==='obstacle' && state.selectedObstacleType==='__wall_dig__' && canBuild){
      const removed=digPlayerWall(r,c);
      startCell=null;
      // 제거 여부와 관계없이 같은 [벽 파기] 모드를 유지합니다.
      state.selected={kind:'tool',tool:'obstacle'};
      state.selectedObstacleType='__wall_dig__';
      state._panelDirty=true;
      state._mapDirty=true;
      // 셀 한 번만 갱신하고, 전체 UI/사거리 재렌더링은 다음 tick에서 처리합니다.
      renderMapCells();
      return;
    }

    if(mOnTile && tool!=='obstacle'){
      selectCell(r,c);
    } else if(!canBuild){
      if(tile.type==='floor' && !tile.isEntrance){
        addLog('<span class="hl-red">침공이 시작되어 더 이상 던전을 수정할 수 없습니다.</span>');
      }
      selectCell(r,c);
    } else if(tool==='monster'){
      // 몬스터 도구에서는 이미 존재하는 몬스터만 선택합니다.
      // 빈 바닥/암벽을 클릭해도 몬스터 생성 화면을 다시 띄우거나 선택 상태를 바꾸지 않습니다.
      if(mOnTile) selectCell(r,c);
      else { startCell=null; return; }
    } else if(tool==='obstacle'){
      if(state.selectedObstacleType==='__wall_dig__'){
        // 위의 최우선 처리에서 이미 return 합니다.
        state.selected={kind:'tool',tool:'obstacle'};
      } else if(state.selectedObstacleType==='__clear__'){
        if(tile.obstacle) clearObstacle(r,c);
        else if(tile.type==='floor' && !tile.isEntrance) selectCell(r,c);
        else selectCell(r,c);
      } else if(typeof physicalDef==='function' && physicalDef(state.selectedObstacleType) && !tile.obstacle){
        placePhysicalTrap(r,c,state.selectedObstacleType);
        showToolInfo('obstacle');
      } else if(isWallMountedObstacle(state.selectedObstacleType) && tile.type==='rock' && !tile.isEntrance && !tile.rubbleWall && !tile.obstacle){
        placeObstacle(r,c,state.selectedObstacleType); showToolInfo('obstacle');
      } else if(tile.type==='floor' && !tile.isEntrance){
        if(tile.obstacle){ selectCell(r,c); }
        else if(state.selectedObstacleType==='__wall__') placeWall(r,c);
        else if(state.selectedObstacleType){ placeObstacle(r,c,state.selectedObstacleType); showToolInfo('obstacle'); }
        else { selectCell(r,c); }
      } else if(tile.type==='rock' && !tile.isEntrance && tile.obstacle){
        selectCell(r,c);
      } else {
        selectCell(r,c);
      }
    } else if(isZoomedNow() && tool==='dig'){
      const dug=attemptDig(r,c);
      if(!dug){
        if(tile.type!=='rock' || !isDiggable(r,c)) selectCell(r,c);
      }
    } else if(tool==='dig'){
      if(tile.type!=='rock' || !isDiggable(r,c)) selectCell(r,c);
      else { attemptDig(r,c); selectCell(r,c); }
    } else {
      selectCell(r,c);
    }
  }
  startCell=null;
  renderUI();
}
let panLastX=0, panLastY=0;
let touchPanActive=false, touchPanMoved=false;
els.map.addEventListener('mousedown',(e)=>{ pointerStart(e.clientX,e.clientY); panLastX=e.clientX; panLastY=e.clientY; });
window.addEventListener('mousemove',(e)=>{
  if(pointerDown && isZoomedNow()){
    els.frame.scrollLeft -= (e.clientX-panLastX);
    els.frame.scrollTop -= (e.clientY-panLastY);
    panLastX=e.clientX; panLastY=e.clientY;
  }
  pointerMove(e.clientX,e.clientY);
});
window.addEventListener('mouseup',pointerEnd);
els.map.addEventListener('touchstart',(e)=>{
  if(e.touches.length>1) return;
  const t=e.touches[0];
  pointerStart(t.clientX,t.clientY);
  panLastX=t.clientX; panLastY=t.clientY;
  touchPanActive=isZoomedNow();
  touchPanMoved=false;
  if(!isZoomedNow()) e.preventDefault();
},{passive:false});
els.map.addEventListener('touchmove',(e)=>{
  if(e.touches.length>1) return;
  const t=e.touches[0];
  if(touchPanActive){
    const dx=t.clientX-panLastX, dy=t.clientY-panLastY;
    if(Math.abs(dx)+Math.abs(dy)>2) touchPanMoved=true;
    if(touchPanMoved){
      els.frame.scrollLeft -= dx;
      els.frame.scrollTop -= dy;
      panLastX=t.clientX; panLastY=t.clientY;
      e.preventDefault();
    }
  }else{
    pointerMove(t.clientX,t.clientY);
    e.preventDefault();
  }
},{passive:false});
els.map.addEventListener('touchend',(e)=>{
  if(e.touches.length>0) return;
  if(touchPanMoved){
    pointerDown=false; startCell=null; dragMoved=true;
    touchPanMoved=false; touchPanActive=false;
    renderUI();
  }else{
    pointerEnd();
    if(!isZoomedNow()) e.preventDefault();
    touchPanMoved=false; touchPanActive=false;
  }
},{passive:false});

function selectCell(r,c){
  const m=monsterAt(r,c);
  if(m){ state.selected={kind:'monster', id:m.id}; }
  else { state.selected={kind:'tile', r, c}; }
  renderUI();
}

/* ---------------- build actions ---------------- */
function findMonsterSpawnNearCore(){
  const candidates=[];
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(r===CORE_R && c===CORE_C) continue;
    const t=state.grid[r][c];
    if(t.type!=='floor' || t.isEntrance || t.obstacle || monsterAt(r,c) || (state.mawang&&state.mawang.r===r&&state.mawang.c===c)) continue;
    const d=Math.abs(r-CORE_R)+Math.abs(c-CORE_C);
    if(d>=1 && d<=5) candidates.push({r,c,d});
  }
  candidates.sort((a,b)=>a.d-b.d || Math.random()-.5);
  if(candidates.length) return [candidates[0].r,candidates[0].c];
  const fallback=findRandomEmptyFloor();
  return fallback || null;
}
function spawnMonsterFromList(typeId){
  if(!state || state.phase!=='build') return false;
  if(state.contractNoSummonWaves>0) return false;
  const mt=MONSTER_TYPES.find(m=>m.id===typeId);
  if(!mt || state.gold<monsterCost(mt)) return false;
  const spot=findMonsterSpawnNearCore();
  if(!spot) return false;
  const ok=placeMonster(spot[0],spot[1],typeId);
  if(ok){ state.selectedMonsterType=typeId; }
  return ok;
}
function monsterTierStats(mt,tier,opts={}){
  const t=Math.max(1,Math.min(MAX_TIER,tier||1));
  const meta=monsterMetaStats(mt.id,opts);
  const hp=Math.round(mt.hp*Math.pow(MONSTER_TIER_HP_GROWTH,t-1)*meta.hpMul*(state.globalMonsterHpMul||1));
  const atk=Math.round(mt.atk*Math.pow(MONSTER_TIER_ATK_GROWTH,t-1)*meta.atkMul);
  const def=mt.def+meta.defBonus+Math.round((t-1)*MONSTER_TIER_DEF_GROWTH);
  return {hp,atk,def};
}

function createMonsterEntity(r,c,typeId,opts={}){
  if(!state) return null;
  const mt=MONSTER_TYPES.find(m=>m.id===typeId);
  if(!mt) return null;
  const tier=opts.tier||1;
  const tierStats=monsterTierStats(mt,tier,opts);
  const hp=opts.hp!=null?opts.hp:tierStats.hp;
  const atk=opts.atk!=null?opts.atk:tierStats.atk;
  const def=opts.def!=null?opts.def:tierStats.def;
  const now=performance.now();
  const id=state.monsterSeq++;
  const m={id,r,c,typeId,tier,hp,maxHp:hp,atk,def,invested:opts.invested!=null?opts.invested:mt.cost,
    range:mt.range||1,special:mt.special||null,role:mt.role||null,role2:mt.role2||null,debuffOnHit:!!mt.debuffOnHit,kills:0,levelProgress:0,
    moveCooldown:opts.moveCooldown!=null?opts.moveCooldown:Math.random()*0.5,lastAttackAt:0,spawnedAt:now};
  state.monsters.push(m);
  state._archetypeDirty=true;
  state._panelDirty=true;
  state.totalMonsterSpawns=(state.totalMonsterSpawns||0)+1;
  state.monsterSpawnCounts[typeId]=(state.monsterSpawnCounts[typeId]||0)+1;
  updateBestMonsterSeen(typeId,tier);
  if(opts.playSound!==false) Sound.monsterSpawn();
  state.fxEvents.push({type:'spawnBurst',r,c});
  if(state.monsters.length>=3){
    const synergies=[];
    if(state.monsters.some(x=>x.special==='tank')&&state.monsters.some(x=>x.typeId==='spider')) synergies.push('전선+저주');
    if(state.monsters.some(x=>x.special==='ranged')&&state.monsters.some(x=>x.special==='tank')) synergies.push('포병+방벽');
    if(state.monsters.some(x=>x.special==='rage')&&state.monsters.some(x=>x.special==='guard')) synergies.push('광전+수호');
    if(state.monsters.some(x=>x.role==='healer')&&state.monsters.some(x=>x.special==='tank')) synergies.push('치유+중장');
    if(synergies.length && state._lastSynergyLog!==synergies.join('|')){ state._lastSynergyLog=synergies.join('|'); addLog(`<span class="hl-gold">🔗 몬스터 연계 발견!</span> ${synergies.join(' · ')}`); }
  }
  if(opts.log!==false) addLog(`<span class="hl">${mt.name}</span>을(를) 소환했습니다.`);
  return m;
}

function placeMonster(r,c,typeId){
  if(!state || state.phase!=='build') return false;
  if(state.contractNoSummonWaves>0){ addLog('<span class="hl-red">🚫 고립의 맹약</span> — 이번 준비 단계엔 새 몬스터를 소환할 수 없습니다.'); return false; }
  const tile=state.grid[r][c];
  if(tile.type!=='floor'||tile.isEntrance) return false;
  if(monsterAt(r,c)) return false;
  const mt=MONSTER_TYPES.find(m=>m.id===typeId);
  if(!mt) return false;
  const cap=state.monsterCap||MONSTER_CAP_START;
  if(state.monsters.length>=cap){
    addLog(`<span class="hl-red">몬스터 생성 제한(${cap}마리)에 도달했습니다.</span> 웨이브 클리어 카드로 제한을 늘릴 수 있습니다.`);
    return false;
  }
  let cost=monsterCost(mt);
  if(state.relicSmugglersEye && Math.random()<0.25) cost=Math.max(1,Math.round(cost*0.5));
  if(state.gold<cost) return false;
  state.gold-=cost;
  const m=createMonsterEntity(r,c,typeId,{invested:cost});
  if(!m) return false;
  // 실제 결제에 성공한 경우에만 해당 종류의 반복 소환 횟수를 올립니다.
  state.monsterPurchaseCounts[typeId]=(state.monsterPurchaseCounts[typeId]||0)+1;
  if(state.contractExpensiveStrongWaves>0){
    m.atk=Math.round(m.atk*(state.contractExpensiveStrongAtkMul||1));
  }
  return true;
}
function updateBestMonsterSeen(typeId,tier){
  if(tier>(state.maxMonsterTierSeen||0)){
    state.maxMonsterTierSeen=tier;
    state.bestMonsterTypeId=typeId;
  }
}
function finalizeMonsterLifetime(m,at=performance.now()){
  const lived=Math.max(0,at-(m.spawnedAt||at));
  if(lived>(state.maxMonsterLifetimeMs||0)){
    state.maxMonsterLifetimeMs=lived;
    state.longestMonsterTypeId=m.typeId;
    state.longestMonsterTier=m.tier||1;
  }
}

// B등급 이하(B/C/D)는 강화 비용을 크게 낮추는 대신, 강화로 얻는 성장폭도 함께 낮춥니다.
// (고급 몬스터는 비싸지만 강화 보람이 크고, 저급 몬스터는 싸게 막 굴릴 수 있지만 천장이 낮음)
function isLowGradeMonster(grade){ return grade==='B'||grade==='C'||grade==='D'; }
function gradeUpgradeCostFactor(grade){ return isLowGradeMonster(grade)?0.5:1; }
function gradeUpgradeGrowthFactor(grade){ return isLowGradeMonster(grade)?0.65:1; }
function recalcMonsterTier(m,newTier){
  const base=MONSTER_TYPES.find(x=>x.id===m.typeId);
  m.tier=Math.max(1,Math.min(MAX_TIER,newTier));
  // 소환/강화가 완전히 같은 성장 공식을 사용하도록 통일했습니다.
  // 등급은 '강화 비용'과 성장 보정에만 관여하고, 같은 Lv라면 실제 능력치 곡선은 동일합니다.
  const growthFactor=gradeUpgradeGrowthFactor(base.grade);
  const rawHpGrowth=Math.pow(MONSTER_TIER_HP_GROWTH,m.tier-1);
  const rawAtkGrowth=Math.pow(MONSTER_TIER_ATK_GROWTH,m.tier-1);
  // B/C/D는 같은 레벨이어도 성장폭만 65%로 적용합니다. 여기에 영구 몬스터 성장 보너스를 곱합니다.
  const hpGrowth=1+(rawHpGrowth-1)*growthFactor;
  const atkGrowth=1+(rawAtkGrowth-1)*growthFactor;
  const meta=monsterMetaStats(base.id);
  m.maxHp=Math.round(base.hp*hpGrowth*meta.hpMul*(state.globalMonsterHpMul||1));
  m.hp=m.maxHp;
  m.atk=Math.round(base.atk*atkGrowth*meta.atkMul);
  m.def=base.def+meta.defBonus+Math.round((m.tier-1)*MONSTER_TIER_DEF_GROWTH*growthFactor);
  updateBestMonsterSeen(m.typeId,m.tier);
  if(typeof applyBuildEvolutionToMonster==='function') applyBuildEvolutionToMonster(m,true);
}
function levelUpMonster(m){
  if(m.tier>=MAX_TIER) return;
  recalcMonsterTier(m, m.tier+1);
  const base=MONSTER_TYPES.find(x=>x.id===m.typeId);
  Sound.level();
  state.fxEvents.push({type:'spawnBurst', r:m.r, c:m.c, color:'rgba(224,182,74,.95)'});
  state.fxEvents.push({type:'floatText', r:m.r, c:m.c, text:'LV.'+m.tier+' 강화!', color:'#e0b64a'});
  addLog(`<span class="hl-gold">${base.name}</span>이(가) 전투 경험으로 ${m.tier}단계 강화되었습니다!`);
}
function evolveMonster(id){
  const m=state.monsters.find(x=>x.id===id); if(!m||m.tier>=MAX_TIER) return;
  const base=MONSTER_TYPES.find(x=>x.id===m.typeId);
  const costFactor=gradeUpgradeCostFactor(base.grade);
  const cost=Math.round(monsterCost(base)*3*0.8*costFactor*Math.pow(1.45,m.tier)); // 강화 비용 20% 하향 + B등급 이하 추가 하향
  if(state.gold<cost) return;
  state.gold-=cost;
  recalcMonsterTier(m, m.tier+1);
  m.invested+=cost;
  Sound.level();
  state.fxEvents.push({type:'monsterUpgrade', r:m.r, c:m.c, tier:m.tier});
  state.fxEvents.push({type:'floatText', r:m.r, c:m.c, text:'LV.'+m.tier+' 강화!', color:'#e0b64a'});
  addLog(`<span class="hl-gold">${base.name}</span>이(가) ${m.tier}단계로 강화되었습니다!`);
}
function sellMonster(id){
  const idx=state.monsters.findIndex(x=>x.id===id); if(idx===-1) return;
  const m=state.monsters[idx];
  finalizeMonsterLifetime(m);
  const refund=Math.floor(m.invested*0.5);
  state.gold+=refund;
  state.monsters.splice(idx,1);
  addLog(`몬스터를 판매해 골드 <span class="hl-gold">+${refund}</span> 회수했습니다.`);
  state.selected=null;
}

/* ---------------- start / end ---------------- */
els.startBtn.addEventListener('click', attemptStart);
if(els.metaGrowthBtn) els.metaGrowthBtn.addEventListener('click', ()=>openMetaGrowth());
if(els.metaGrowthCloseBtn) els.metaGrowthCloseBtn.addEventListener('click', closeMetaGrowth);
if(els.metaGrowthOverlay) els.metaGrowthOverlay.addEventListener('click',(e)=>{ if(e.target===els.metaGrowthOverlay) closeMetaGrowth(); });
document.querySelectorAll('#metaGrowthOverlay .meta-tab').forEach(btn=>btn.addEventListener('click',()=>{ metaGrowthTab=btn.dataset.metaTab||'unlock'; metaGrowthGradeFilter='all'; renderMetaGrowth(); Sound.ui(); }));

const googleLoginBtn=document.getElementById('googleLoginBtn');
if(googleLoginBtn) googleLoginBtn.addEventListener('click', signInWithGoogle);

const guestStartBtn=document.getElementById('guestStartBtn');
if(guestStartBtn) guestStartBtn.addEventListener('click', guestStart);

const testSkipBtn=document.getElementById('testSkipBtn');
if(testSkipBtn) testSkipBtn.addEventListener('click', testStart);

const debugSkipBtn=document.getElementById('debugSkipBtn');
if(debugSkipBtn) debugSkipBtn.addEventListener('click', debugStart);

function isMobileDevice(){
  try{
    const ua=navigator.userAgent||'';
    if(/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return true;
    if(window.matchMedia && window.matchMedia('(pointer:coarse)').matches) return true;
  }catch(_){}
  return false;
}
function requestFullscreenSafe(){
  if(!isMobileDevice()) return; // PC에서는 자동 전체화면을 걸지 않습니다.
  try{
    const el=document.documentElement;
    const req=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen;
    if(req && !document.fullscreenElement && !document.webkitFullscreenElement){
      const p=req.call(el);
      if(p && typeof p.catch==='function') p.catch(()=>{});
    }
  }catch(err){ /* 전체화면을 지원하지 않는 환경이면 조용히 무시합니다. */ }
}
function startGame(){
  const session=++gameSessionId;
  requestFullscreenSafe();
  Sound.unlock();
  Sound.startMusic();
  Sound.ui();
  if(waveTransitionTimer){ clearTimeout(waveTransitionTimer); waveTransitionTimer=null; }
  if(waveCardTimer){ clearTimeout(waveCardTimer); waveCardTimer=null; }
  if(waveBannerTimer){ clearTimeout(waveBannerTimer); waveBannerTimer=null; }
  if(defeatTimer){ clearTimeout(defeatTimer); defeatTimer=null; }
  // v38.6: 이전 게임에 남아 있던 마을 습격 예약/연출을 모두 정리합니다.
  if(typeof villageOutroTimer!=='undefined' && villageOutroTimer){ clearTimeout(villageOutroTimer); villageOutroTimer=null; }
  if(typeof hideVillageOverlay==='function') hideVillageOverlay();
  { const _vt=document.getElementById('villageToast'); if(_vt) _vt.classList.remove('show'); }
  if(typeof setVillageBackdrop==='function') setVillageBackdrop(false);
  if(els.defeatTransition) els.defeatTransition.classList.remove('show');
  if(els.waveTransition) els.waveTransition.classList.remove('show');
  els.waveBanner.classList.remove('show');

  // 이전 게임의 DOM/이펙트/선택 상태를 완전히 폐기
  if(els.tokenLayer) els.tokenLayer.innerHTML='';
  if(els.rangeLayer) els.rangeLayer.innerHTML='';
  if(els.map) els.map.innerHTML='';
  tokenEls={};
  cellEls=[];
  pointerDown=false; dragMoved=false; startCell=null;
  state=null;

  // 항상 새 16×16 던전으로 시작
  metaProgress=loadMeta(); renderStartMetaSummary();
  mawangProfile=normalizeMawangData(mawangProfile||loadMawangLocal());
  state=freshState();
  state.mawang=createMawangEntity(CORE_R,CORE_C);
  state.activeTool=pendingTool;
  // 새 게임은 항상 하단 도구 패널이 열린 상태로 시작합니다.
  setBottomToolPanelCollapsed(false);
  state.running=true;
  state.gameSessionId=session;
  state.startedAt=performance.now();
  zoomLevel=1;
  applyBoardSize();
  buildMapDOM();
  setStageBackground(1);
  els.overlay.classList.add('hidden');
  els.cardOverlay.classList.add('hidden');
  if(els.altarPanel) els.altarPanel.classList.add('hidden');
  els.altarBtn.classList.remove('active');
  addLog(`던전 건설을 시작합니다. <span class="hl-gold">1분</span> 뒤 첫 웨이브가 시작됩니다.`);
  renderUI();
}

function dungeonRatingLabel(score){
  if(score>=92) return 'SS'; if(score>=82) return 'S'; if(score>=72) return 'A'; if(score>=60) return 'B'; if(score>=45) return 'C'; return 'D';
}
function evaluateDungeon(state){
  if(!state) return {title:'미정',score:0,ratings:{layout:'D',trap:'D',defense:'D',control:'D'},notes:[]};
  const st=computeDungeonStructure()||{zones:{}};
  const zones=st.zones||{};
  let rooms=zones.room||0, corridors=zones.corridor||0, junctions=zones.junction||0, deadends=zones.deadend||0;
  let obstacleCount=0;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) if(state.grid[r][c].obstacle) obstacleCount++;
  const branch=Math.min(1,(junctions+rooms*.35)/(Math.max(1,corridors+rooms)));
  const structureScore=Math.round(Math.min(100,35+branch*45+Math.min(20,deadends*.8)));
  const seen=(state.dungeonStats?.obstaclesSeen||0), missed=(state.dungeonStats?.obstaclesMissed||0), broken=(state.dungeonStats?.obstaclesBroken||0);
  const trigger=(state.dungeonStats?.trapTriggers||0);
  const trapScore=Math.round(Math.min(100,40+Math.min(30,obstacleCount*2.2)+Math.min(20,trigger*2)+Math.min(15,(seen/(seen+missed||1))*15)));
  const defenseScore=Math.round(Math.min(100,45+(state.killCount||0)*1.4-Math.max(0,(state.heroesEscaped||0))*5));
  const controlScore=Math.round(Math.min(100,40+Math.min(30,broken*2)+Math.min(20,seen*1.5)+Math.min(10,junctions*1.2)));
  const score=Math.round(structureScore*.28+trapScore*.27+defenseScore*.25+controlScore*.20);
  let title='균형 잡힌 마왕성';
  if(trapScore>=85&&trapScore>=structureScore) title='함정 지배의 던전';
  else if(structureScore>=85&&branch>.45) title='미궁형 마왕성';
  else if(defenseScore>=85) title='철벽 요새';
  else if(controlScore>=82) title='동선 통제형 던전';
  const notes=[];
  if(junctions>=3) notes.push('갈림길을 적극 활용했습니다.');
  if(deadends>=3) notes.push('막다른 길을 위험 구간으로 활용할 여지가 큽니다.');
  if(obstacleCount>=6) notes.push('장애물 밀도가 높아 용사의 판단을 흔듭니다.');
  if(missed>broken&&seen>2) notes.push('발견되지 않은 함정이 많아 은닉형 설계가 잘 작동했습니다.');
  if(!notes.length) notes.push('공간 구조와 전투 배치의 균형을 더 다듬어 보세요.');
  return {title,score,rooms,corridors,junctions,deadends,obstacleCount,seen,missed,broken,trigger,ratings:{layout:dungeonRatingLabel(structureScore),trap:dungeonRatingLabel(trapScore),defense:dungeonRatingLabel(defenseScore),control:dungeonRatingLabel(controlScore)},notes};
}

function endGame(){
  if(state.gameOver) return;
  Sound.gameOver();
  Sound.defeatTransition();
  Sound.stopMusic();
  state.gameOver=true; state.running=false;
  const earnedSouls=awardRunSouls();
  const dungeonEval=evaluateDungeon(state);
  if(waveTransitionTimer){ clearTimeout(waveTransitionTimer); waveTransitionTimer=null; }
  if(els.waveTransition) els.waveTransition.classList.remove('show');
  if(els.defeatTransition) els.defeatTransition.classList.add('show');
  const now=performance.now();
  for(const m of state.monsters) finalizeMonsterLifetime(m,now);
  const playSec=Math.max(0,Math.floor((now-(state.startedAt||now))/1000));

  // 온라인 랭킹용 결과 저장: 웨이브 + 던전 평가 점수 + 플레이타임
  // 저장 실패가 게임 종료 화면을 막지 않도록 비동기로 처리합니다.
  saveGameResultToSupabase(state.wave,dungeonEval.score,playSec)
    .then(result=>{
      if(!result.saved && result.reason!=='offline') console.warn('[Supabase] 결과 저장 실패');
    })
    .catch(err=>console.warn('[Supabase] 결과 저장 예외:',err));
  const min=Math.floor(playSec/60), sec=playSec%60;
  const playText=`${min}분 ${String(sec).padStart(2,'0')}초`;
  let mostSpawnId=null, mostSpawnCount=0;
  for(const [id,count] of Object.entries(state.monsterSpawnCounts||{})){
    if(count>mostSpawnCount){mostSpawnCount=count;mostSpawnId=id;}
  }
  const bestBase=state.bestMonsterTypeId?MONSTER_TYPES.find(x=>x.id===state.bestMonsterTypeId):null;
  const longestBase=state.longestMonsterTypeId?MONSTER_TYPES.find(x=>x.id===state.longestMonsterTypeId):null;
  const mostBase=mostSpawnId?MONSTER_TYPES.find(x=>x.id===mostSpawnId):null;
  const lifeSec=Math.floor((state.maxMonsterLifetimeMs||0)/1000);
  els.modalBox.style.width='min(94vw, 680px)';
  els.modalBox.style.maxWidth='min(94vw, 680px)';
  els.modalBox.style.padding='22px 14px';
  els.modalBox.innerHTML=`
    <div class="big-emoji">🏆</div>
    <h2 class="display">던전 운영 기록</h2>
    <div style="text-align:center;font-size:8px;color:#544d6b;margin-bottom:6px;">build: ranking-fix-v2</div>
    <p style="text-align:center;margin-bottom:5px;color:var(--muted);">마력의 핵이 파괴되었습니다.</p><p style="text-align:center;margin:0 0 10px;color:var(--violet-bright);font-size:11px;font-weight:800;">👑 ${currentNickname||DEFAULT_NICKNAME}</p>
    <div class="achievement-grid">
      <div class="achievement-card"><div class="ak">⏱️ 플레이타임</div><div class="av">${playText}</div></div>
      <div class="achievement-card"><div class="ak">💀 도달 웨이브</div><div class="av">웨이브 ${state.wave}</div></div>
      <div class="achievement-card"><div class="ak">⚔️ 물리친 용사</div><div class="av">${state.killCount}명</div><div class="as">침입 ${state.heroesSpawned}명 · 탈출 ${state.heroesEscaped||0}명</div></div>
      <div class="achievement-card"><div class="ak">👾 총 몬스터 소환</div><div class="av">${state.totalMonsterSpawns}마리</div></div>
      <div class="achievement-card"><div class="ak">🌟 최고 단계 몬스터</div><div class="av">${bestBase?bestBase.name:'-'} ${state.maxMonsterTierSeen||0}단계</div></div>
      <div class="achievement-card"><div class="ak">📈 최다 소환 몬스터</div><div class="av">${mostBase?mostBase.name:'-'} ${mostSpawnCount}마리</div></div>
      <div class="achievement-card"><div class="ak">🛡️ 최장 생존 몬스터</div><div class="av">${longestBase?longestBase.name:'-'} Lv.${state.longestMonsterTier||1}</div><div class="as">생존 ${lifeSec}초</div></div>
      <div class="achievement-card"><div class="ak">⛏️ 개척한 타일</div><div class="av">${state.tilesDug||0}칸</div></div>
      <div class="achievement-card"><div class="ak">🧱 설치한 장애물</div><div class="av">${state.obstaclePlacements||0}개</div></div>
      <div class="achievement-card"><div class="ak">🏗️ 건설한 벽</div><div class="av">${state.wallsBuilt||0}개</div></div>
      <div class="achievement-card"><div class="ak">😱 도망친 겁쟁이</div><div class="av">${state.heroesEscaped||0}명</div></div>
      <div class="achievement-card"><div class="ak">🗺️ 던전 확장</div><div class="av">${state.dungeonExpansions||0}회 · ${GRID}×${GRID}</div></div>
      <div class="achievement-card"><div class="ak">💰 최종 골드</div><div class="av">${Math.floor(state.gold).toLocaleString()}G</div></div>
      <div class="achievement-card"><div class="ak">👑 판 종료 영혼</div><div class="av">${debugModeActive?'디버그 모드':'+'+earnedSouls+' 영혼'}</div><div class="as">${debugModeActive?'디버그 판은 영혼이 지급되지 않습니다':'누적 '+metaProgress.souls.toLocaleString()+' 영혼 · 다음 판 영구 강화'}</div></div>
      <div class="achievement-card" style="grid-column:1/-1;"><div class="ak">🏰 던전 평가 · ${dungeonEval.title}</div><div class="av">${dungeonEval.score}점 · ${dungeonEval.ratings.layout} 구조 / ${dungeonEval.ratings.trap} 함정 / ${dungeonEval.ratings.defense} 방어 / ${dungeonEval.ratings.control} 통제</div><div class="as">방 ${dungeonEval.rooms} · 통로 ${dungeonEval.corridors} · 교차로 ${dungeonEval.junctions} · 막다른길 ${dungeonEval.deadends} · 장애물 ${dungeonEval.obstacleCount} · 발견 ${dungeonEval.seen} · 놓침 ${dungeonEval.missed} · 파괴 ${dungeonEval.broken}</div><div class="as">${dungeonEval.notes.join(' · ')}</div></div>
    <div class="achievement-card" style="grid-column:1/-1;"><div class="ak">🧩 이번 판 빌드</div><div class="av">${Object.keys(state.buildTags||{}).length?Object.keys(state.buildTags).map(x=>`<span class="build-tag">${x}</span>`).join(''):'아직 빌드 카드가 없습니다.'}</div></div>
    </div>
    <div class="result-actions">
      <button class="cta" id="restartBtn">다시 도전하기</button>
      <button class="cta secondary" id="metaGrowthEndBtn">🔮 마왕의 성장</button>
      ${isLocalOnlySession
        ? '<div style="margin-top:6px;color:var(--muted);font-size:8.5px;line-height:1.4;text-align:center;">🎮 한판해보기 결과는 랭킹과 온라인 기록에 저장되지 않습니다.</div>'
        : '<button class="cta secondary" id="rankingBtn">🏆 랭킹 순위 보기</button>'}
    </div>`;
  const session=gameSessionId;
  if(defeatTimer) clearTimeout(defeatTimer);
  defeatTimer=setTimeout(()=>{
    defeatTimer=null;
    if(session!==gameSessionId) return;
    if(els.defeatTransition) els.defeatTransition.classList.remove('show');
    els.overlay.classList.remove('hidden');
    const retry=document.getElementById('restartBtn');
    if(retry) retry.addEventListener('click', attemptStart, {once:true});
    const metaGrowthEndBtn=document.getElementById('metaGrowthEndBtn');
    if(metaGrowthEndBtn) metaGrowthEndBtn.addEventListener('click', ()=>openMetaGrowth());
    const rankingBtn=document.getElementById('rankingBtn');
    if(rankingBtn) rankingBtn.addEventListener('click', openRankingScreen);
  }, 1050);
}

/* ---------------- dungeon expansion / dynamic walls ---------------- */
function isHeroAt(r,c){ return state.heroes.some(h=>h.r===r&&h.c===c); }
function isMonsterAt(r,c){ return state.monsters.some(m=>m.r===r&&m.c===c); }
function randomEdgeSpawn(){
  const candidates=[];
  for(let c=0;c<GRID;c++){ candidates.push([0,c],[GRID-1,c]); }
  for(let r=1;r<GRID-1;r++){ candidates.push([r,0],[r,GRID-1]); }
  // 핵/기존 용사/몬스터가 있는 칸은 피합니다.
  const valid=candidates.filter(([r,c])=>!isHeroAt(r,c)&&!isMonsterAt(r,c)&&!(r===CORE_R&&c===CORE_C));
  const pick=valid[Math.floor(Math.random()*valid.length)]||candidates[0];
  return {r:pick[0],c:pick[1]};
}
/* v38.6 · 버그 수정
   이 함수는 원래 expandDungeon() 본문 안에 선언되어 있어서 그 함수 바깥에서는 존재하지 않았습니다.
   그 결과 마을 습격에서 복귀할 때 restoreDungeonObstacleVisuals()가
   ReferenceError로 중단되어 장애물 이미지/사거리 표시가 복구되지 않고,
   배경 복구와 준비시간 재개까지 통째로 건너뛰던 문제가 있었습니다. */
function tokenLayerPersistentCleanup(){ if(!els.tokenLayer) return; els.tokenLayer.querySelectorAll('.obstacle-persistent').forEach(e=>e.remove()); }

function expandDungeon(){
  if(!state || GRID>=30) return;
  const oldGrid=state.grid;
  const oldGridSize=GRID;
  const oldCoreR=CORE_R, oldCoreC=CORE_C;
  GRID=oldGridSize+2;
  CORE_R=oldCoreR+1; CORE_C=oldCoreC+1;
  const newGrid=[];
  for(let r=0;r<GRID;r++){
    const row=[];
    for(let c=0;c<GRID;c++){
      if(r===CORE_R&&c===CORE_C) row.push({type:'core'});
      else row.push({type:'rock'});
    }
    newGrid.push(row);
  }
  for(let r=0;r<oldGridSize;r++) for(let c=0;c<oldGridSize;c++){
    newGrid[r+1][c+1]=oldGrid[r][c];
    if(newGrid[r+1][c+1].type==='core') newGrid[r+1][c+1]={type:'floor',isEntrance:false,obstacle:null};
  }
  // v38.6.4 · 버그 수정: 던전 확장 시 모든 타일이 (+1,+1)만큼 이동하는데,
  // 장애물 타일에 저장된 obstacleRootR/obstacleRootC는 "절대 좌표"라서 함께 보정해주지 않으면
  // isObstacleRoot(r,c)가 더 이상 참이 되지 않아 장애물 스프라이트(이미지)가 사라집니다.
  // (마을 습격도 10웨이브마다 함께 발생해서 "습격 후 이미지가 안 보인다"로 보였지만,
  //  실제 원인은 습격이 아니라 매 10웨이브마다 실행되는 이 던전 확장이었습니다.)
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const t=newGrid[r][c];
    if(!t || !t.obstacle) continue;
    if(Number.isInteger(t.obstacleRootR)) t.obstacleRootR++;
    if(Number.isInteger(t.obstacleRootC)) t.obstacleRootC++;
  }
  // 핵은 새 중심 위치에 하나만 둡니다.
  newGrid[CORE_R][CORE_C]={type:'core'};
  state.grid=newGrid;
  for(const h of state.heroes){ h.r++; h.c++; h.spawnR++; h.spawnC++; h.wanderR=Math.min(GRID-1,(h.wanderR||0)+1); h.wanderC=Math.min(GRID-1,(h.wanderC||0)+1); }

  tokenLayerPersistentCleanup();
  const px=currentCellPx;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const ob=state.grid[r][c].obstacle;
    if(['poison','web','curse','flame','lightning','barricade','frost','pit','statue'].includes(ob)){
      const el=document.createElement('div'); el.className='obstacle-persistent '+ob; el.dataset.obFxKey=r+'_'+c; el.style.left=(c*px+px/2)+'px'; el.style.top=(r*px+px/2)+'px';
      if(ob==='web') el.textContent='✣'; else if(ob==='curse') el.textContent='☠'; else if(ob==='flame') el.textContent='🔥'; else if(ob==='lightning') el.textContent='⚡'; else if(ob==='barricade') el.textContent='🛡'; else if(ob==='frost') el.textContent='❄'; else if(ob==='pit') el.textContent='⛓'; else if(ob==='statue') el.textContent='◉';
      el.style.fontSize=Math.max(12,px*.45)+'px'; el.style.textAlign='center'; el.style.lineHeight=px+'px'; els.tokenLayer.appendChild(el);
    }
  }

  for(const m of state.monsters){ m.r++; m.c++; }
  if(state.mawang){ state.mawang.r++; state.mawang.c++; }
  // 던전이 확장되면 고정 침입구 3곳도 기존 타일과 함께 1칸 이동합니다.
  if(Array.isArray(state.heroSpawnPoints)&&state.heroSpawnPoints.length){
    for(const sp of state.heroSpawnPoints){
      sp.r++; sp.c++;
      state.grid[sp.r][sp.c]={type:'floor',isEntrance:true,breached:true,obstacle:null};
    }
    state.heroSpawnPoint=state.heroSpawnPoints[0];
    ENTRANCES=state.heroSpawnPoints.map(sp=>({...sp}));
  } else if(state.heroSpawnPoint){
    state.heroSpawnPoint.r++;
    state.heroSpawnPoint.c++;
    const sp=state.heroSpawnPoint;
    state.grid[sp.r][sp.c]={type:'floor',isEntrance:true,breached:true,obstacle:null};
    ENTRANCES=[{...sp}];
  } else {
    ENTRANCES=[];
  }
  state.dungeonExpansions=(state.dungeonExpansions||0)+1;
  dungeonStructureInvalidate();
  buildMapDOM();
  applyBoardSize();
  addLog(`<span class="hl-gold">던전 확장!</span> 던전 크기가 ${GRID}×${GRID}로 커졌습니다.`);
  showWaveBanner(`던전 확장! ${GRID}×${GRID}`);
}
/* ---------------- entities continued below ---------------- */
/* ---------------- entities ---------------- */
const WANDER_RETARGET_SEC=16;
// v67 · 1~10웨이브 초보 보호 구간.
// 초반에는 HP/공격력뿐 아니라 방어력·용사 수·스폰 압력까지 함께 낮춥니다.
// 11웨이브 이후 기존 난이도 곡선은 그대로 유지합니다.
function earlyWaveEnemyMul(wave){
  const w=Math.max(1,wave|0);
  if(w>10) return .90;
  return 0.45+(w-1)*(.72-.45)/9;
}
function earlyWaveDefenseMul(wave){
  const w=Math.max(1,wave|0);
  if(w>10) return 1;
  return 0.52+(w-1)*(.76-.52)/9;
}
function earlyWaveCountMul(wave){
  return wave<=10 ? .68 : 1;
}
function earlyWaveSpawnIntervalMul(wave){
  return wave<=10 ? 1.24 : 1;
}
function heroBaseStats(wave){
  const mul=earlyWaveEnemyMul(wave);
  return { hp:Math.round((22+wave*7)*mul), atk:+((4+wave*1.4)*mul).toFixed(2), reward:8+wave*3.0 };
}

/* v65 · 마을 습격 후속 효과
   마을에서 파괴한 시설은 다음 5웨이브 동안 용사 원정대 구성/능력치에 영향을 줍니다. */
const VILLAGE_RAID_CASTER_IDS=new Set(['mage','archmage','ice_mage','spirit_caller','curse_caster','battle_mage','imperial_magus']);
function villageRaidWaveMods(wave){
  const w=Math.max(1,Math.floor(Number(wave)||1));
  const active=(state&&Array.isArray(state.villageRaidEffects)?state.villageRaidEffects:[]).filter(e=>w>=(e.startWave||0)&&w<=(e.untilWave||0));
  const mods={heroCountMul:1,heroHpMul:1,heroAtkMul:1,heroDefMul:1,rewardMul:1,spawnIntervalMul:1,casterChanceMul:1,active};
  for(const e of active){
    if(e.kind==='heroCountMul') mods.heroCountMul*=e.value;
    else if(e.kind==='heroHpMul') mods.heroHpMul*=e.value;
    else if(e.kind==='heroAtkMul') mods.heroAtkMul*=e.value;
    else if(e.kind==='heroDefMul') mods.heroDefMul*=e.value;
    else if(e.kind==='rewardMul') mods.rewardMul*=e.value;
    else if(e.kind==='spawnIntervalMul') mods.spawnIntervalMul*=e.value;
    else if(e.kind==='casterChanceMul') mods.casterChanceMul*=e.value;
  }
  mods.heroCountMul=Math.max(.55,mods.heroCountMul);
  mods.heroHpMul=Math.max(.70,mods.heroHpMul);
  mods.heroAtkMul=Math.max(.72,mods.heroAtkMul);
  mods.heroDefMul=Math.max(.55,mods.heroDefMul);
  mods.spawnIntervalMul=Math.min(1.45,mods.spawnIntervalMul);
  mods.casterChanceMul=Math.max(.20,mods.casterChanceMul);
  return mods;
}
function villageRaidPruneEffects(wave){
  if(!state||!Array.isArray(state.villageRaidEffects)) return;
  state.villageRaidEffects=state.villageRaidEffects.filter(e=>(e.untilWave||0)>=wave);
}
function villageRaidAdjustHeroType(type,pool,isBoss){
  if(!type||isBoss) return type;
  const mods=villageRaidWaveMods(state?.wave||1);
  if(!VILLAGE_RAID_CASTER_IDS.has(type.id)||mods.casterChanceMul>=.999||Math.random()<mods.casterChanceMul) return type;
  const alt=(pool||[]).filter(h=>h&&!VILLAGE_RAID_CASTER_IDS.has(h.id));
  return alt.length?alt[Math.floor(Math.random()*alt.length)]:type;
}
function rerollWanderTarget(h){
  h.wanderR=Math.floor(Math.random()*GRID);
  h.wanderC=Math.floor(Math.random()*GRID);
  h.wanderTicks=0;
}
function partySizeForWave(wave, remaining){
  let maxParty=1;
  if(wave>=20) maxParty=5;
  else if(wave>=15) maxParty=4;
  else if(wave>=11) maxParty=4;
  else if(wave===10) maxParty=3;
  else if(wave>=3) maxParty=2;
  return Math.max(1,Math.min(5,maxParty,remaining));
}
function pickPartyEdgeSpawnCells(count){
  // 현재 활성화된 침입구 전부를 실제 스폰 좌표로 사용합니다.
  // (v40: 침입구 개수가 웨이브에 따라 1~5개로 늘어나므로 예전의 3개 고정 제한을 없앴습니다.)
  // 중요: 침입구가 rock으로 남아 있어도 spawnHero()가 해당 칸을 floor로 바꾸므로
  // 여기서는 rock 여부 때문에 스폰 후보를 탈락시키지 않습니다.
  const anchors=(Array.isArray(state?.heroSpawnPoints)&&state.heroSpawnPoints.length)
    ? state.heroSpawnPoints.slice()
    : (state?.heroSpawnPoint?[state.heroSpawnPoint]:[]);
  if(!anchors.length || !state?.grid) return [];

  const result=[];
  const used=new Set();
  const add=(r,c,force=false)=>{
    if(r<0||r>=GRID||c<0||c>=GRID) return false;
    const key=r+'_'+c;
    if(used.has(key)) return false;
    if(r===CORE_R&&c===CORE_C) return false;
    const tile=state.grid[r]?.[c];
    if(!tile) return false;
    if(!force && (isHeroAt(r,c)||isMonsterAt(r,c))) return false;
    used.add(key); result.push([r,c]); return true;
  };

  // 1순위: 세 침입구 자체. 웨이브 시작 시 용사가 반드시 이 중 한 곳에서 생성되도록 합니다.
  const ordered=anchors.slice().sort(()=>Math.random()-.5);
  for(const a of ordered){
    if(result.length>=count) break;
    add(a.r,a.c,true);
  }

  // 침입구가 이미 다른 유닛으로 막혀 있는 경우에만 주변 바닥 칸을 보조 사용합니다.
  if(result.length<count){
    for(const a of ordered){
      for(let radius=1;radius<=3 && result.length<count;radius++){
        for(let dr=-radius;dr<=radius && result.length<count;dr++){
          for(let dc=-radius;dc<=radius && result.length<count;dc++){
            if(Math.max(Math.abs(dr),Math.abs(dc))!==radius) continue;
            add(a.r+dr,a.c+dc,false);
          }
        }
      }
    }
  }
  return result.slice(0,Math.max(1,count));
}

/* ---------------- v18.1+ 용사 조합 / 웨이브 패턴 / 정예 시스템 ---------------- */
const HERO_ENCOUNTER_PATTERNS=[
  {id:'balanced', name:'왕국 정찰대', minWave:1, types:['swordsman','archer','miner'], speedMul:1.0},
  {id:'arcane', name:'마법 원정대', minWave:6, types:['mage','priest','archer'], speedMul:.98},
  {id:'holy', name:'성기사 원정대', minWave:5, types:['shieldbearer','paladin','priest'], speedMul:1.05},
  {id:'assault', name:'돌격대', minWave:6, types:['berserker','swordsman','assassin'], speedMul:.90},
  {id:'hunter', name:'사냥꾼 분대', minWave:7, types:['hunter','archer','gunslinger'], speedMul:1.02},
  {id:'shadow', name:'그림자 습격대', minWave:8, types:['shadowrogue','assassin','hunter'], speedMul:.88},
  {id:'nature', name:'자연의 순례단', minWave:8, types:['druid','miko','priest','archer'], speedMul:1.02},
  {id:'support', name:'왕국 지원대', minWave:9, types:['bard','alchemist','priest','hunter'], speedMul:1.00},
  {id:'frost', name:'빙결 원정대', minWave:10, types:['ice_mage','spirit_caller','mage','archmage'], speedMul:.96},
  {id:'cavalry', name:'기동 돌격대', minWave:11, types:['lancer','martial_artist','dual_wielder','berserker','dragoon'], speedMul:.92},
  {id:'curse', name:'저주 추격대', minWave:13, types:['curse_caster','dark_knight','archmage','assassin'], speedMul:.90},
  {id:'ironwall', name:'철벽 방위대', minWave:15, types:['ironclad','shieldbearer','priest','dark_knight'], speedMul:1.06},
  {id:'elite_guard', name:'왕실 친위대', minWave:10, types:['shieldbearer','swordsaint','paladin','priest'], speedMul:1.10},
  {id:'dragonhunt', name:'용 사냥 원정대', minWave:15, types:['dragonslayer','hunter','swordsaint','archer'], speedMul:.94},
  {id:'endgame', name:'최종 원정군', minWave:20, types:['dragonslayer','swordsaint','archmage','vampire','shieldbearer'], speedMul:1.08},
  // v51: 왕국 정예 영웅 원정대
  {id:'royal_cavalry', name:'왕국 기병대',   minWave:21, types:['horseman','pikeman','royal_lance','griffon_knight'], speedMul:.94},
  {id:'royal_phalanx', name:'왕국 방진',     minWave:26, types:['royal_elite','royal_guard','pikeman','imperial_magus'], speedMul:1.04},
  {id:'royal_arcane',  name:'황실 마도단',   minWave:36, types:['battle_mage','rune_guardian','imperial_magus','royal_longbow'], speedMul:.96},
  {id:'sun_crusade',   name:'태양 성전군',   minWave:46, types:['sun_lancer','royal_guard','imperial_magus','royal_elite'], speedMul:1.00},
  {id:'sky_dragon',    name:'천공 용기사단', minWave:66, types:['dragon_rider','griffon_knight','royal_lance','battle_mage','dragoon'], speedMul:.92},
];
const ELITE_ENCOUNTER_NAMES=['철벽의 방패기사','핏빛 광전사','심연의 대현자','그림자 추적자','왕실 사냥꾼','용사단 부단장'];
const BOSS_PROFILES={
  10:{name:'성기사단장',bossId:'paladin',types:['shieldbearer','paladin','priest'],bonus:{hp:1.12,atk:1.18}},
  20:{name:'대마법사',bossId:'archmage',types:['archmage','mage','priest'],bonus:{hp:1.08,atk:1.28}},
  30:{name:'검성',bossId:'swordsaint',types:['swordsaint','swordsman','shieldbearer'],bonus:{hp:1.20,atk:1.24}},
  40:{name:'드래곤 슬레이어',bossId:'dragonslayer',types:['dragonslayer','hunter','berserker'],bonus:{hp:1.18,atk:1.30}},
  50:{name:'공허의 마왕',bossId:'vampire',types:['vampire','shadowrogue','archmage'],bonus:{hp:1.30,atk:1.35}},
  // v35: 웨이브 50(공허의 마왕)이 원래 최종보스였지만, 그 이상 가는 유저를 위해 10웨이브 단위로
  // 보스를 더 추가했습니다. 전부 이미 존재하는 용사 타입을 재사용해서 새 스프라이트/스킬 없이
  // 이름표와 배율만 얹은 "postgame" 보스입니다. 배율은 50웨이브보다 계속 더 세게 올라갑니다.
  60:{name:'타락한 근위대장',bossId:'dark_knight',types:['dark_knight','shieldbearer','dragoon'],bonus:{hp:1.35,atk:1.38}},
  70:{name:'불멸의 성벽',bossId:'ironclad',types:['ironclad','priest','shieldbearer'],bonus:{hp:1.42,atk:1.42}},
  80:{name:'천 개의 창',bossId:'lancer',types:['lancer','dragoon','berserker'],bonus:{hp:1.50,atk:1.48}},
  90:{name:'역병의 대군주',bossId:'curse_caster',types:['curse_caster','spirit_caller','archmage'],bonus:{hp:1.58,atk:1.55}},
  100:{name:'빙하기의 재림',bossId:'ice_mage',types:['ice_mage','swordsaint','dragonslayer'],bonus:{hp:1.68,atk:1.62}},
};

// 웨이브별 보스 영웅 최대 소환 수
// 10/20/30웨이브: 1명
// 40웨이브: 2명
// 50웨이브: 3명
// 60웨이브 이상: 4명
function bossCountForWave(wave){
  if(!BOSS_PROFILES[wave]) return 0;
  if(wave<=30) return 1;
  if(wave===40) return 2;
  if(wave===50) return 3;
  return 4;
}
/* ==========================================================================
   v50 · 웨이브 구간별 용사 등장 풀
   기존에는 영웅마다 정해진 unlockAt(해금 웨이브) 이후로는 계속 누적해서 등장했습니다.
   이제 아래 표에 적힌 구간마다 "그 구간에 등장하는 용사"를 정확히 지정합니다(누적 아님).
   - 표에 없는 웨이브(100 초과)는 마지막 구간 풀을 그대로 사용합니다.
   - 보스(BOSS_PROFILES)는 웨이브 풀과 무관하게 지정된 보스가 그대로 등장하고, 호위만 이 풀을 따릅니다.
   - 같은 용사를 구간 안에서 두 번 적어도 풀은 집합이므로 한 번으로 취급합니다.
   ========================================================================== */
const HERO_WAVE_POOLS_BASE=[
  {from:0,  to:5,   ids:['swordsman','archer']},
  {from:6,  to:10,  ids:['swordsman','archer','mage','miner']},
  {from:11, to:15,  ids:['swordsman','archer','mage','miner','paladin','assassin','priest']},
  {from:16, to:20,  ids:['swordsman','archer','mage','miner','paladin','assassin','priest','berserker','shieldbearer','hunter']},
  {from:21, to:25,  ids:['priest','berserker','shieldbearer','hunter','gunslinger','archmage']},
  {from:26, to:30,  ids:['priest','berserker','shieldbearer','hunter','gunslinger','archmage','dragoon']},
  {from:31, to:35,  ids:['priest','berserker','shieldbearer','hunter','gunslinger','archmage','shadowrogue','swordsaint']},
  {from:36, to:40,  ids:['priest','berserker','shieldbearer','hunter','gunslinger','archmage','shadowrogue','swordsaint','druid','miko']},
  {from:41, to:45,  ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist']},
  {from:46, to:50,  ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist','ice_mage','lancer','spirit_caller']},
  {from:51, to:55,  ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist','ice_mage','lancer','spirit_caller','martial_artist','dual_wielder']},
  {from:56, to:60,  ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist','ice_mage','lancer','spirit_caller','martial_artist','dual_wielder','curse_caster','dark_knight']},
  {from:61, to:65,  ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist','ice_mage','lancer','spirit_caller','martial_artist','dual_wielder','curse_caster','dark_knight','ironclad']},
  {from:66, to:70,  ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist','ice_mage','lancer','spirit_caller','martial_artist','dual_wielder','curse_caster','dark_knight','ironclad','dragonslayer']},
  {from:71, to:80,  ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist','ice_mage','lancer','spirit_caller','martial_artist','dual_wielder','curse_caster','dark_knight','ironclad','dragonslayer','dragoon']},
  {from:81, to:90,  ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist','ice_mage','lancer','spirit_caller','martial_artist','dual_wielder','curse_caster','dark_knight','ironclad','dragonslayer','dragoon']},
  {from:91, to:100, ids:['shadowrogue','swordsaint','druid','miko','vampire','bard','alchemist','ice_mage','lancer','spirit_caller','martial_artist','dual_wielder','curse_caster','dark_knight','ironclad','dragonslayer','dragoon','archmage','paladin','miner']},
];
// v51: 왕국 정예 영웅은 기본 표(위)를 건드리지 않고, 등장 시작 웨이브부터 각 구간 풀에 덧붙입니다.
const HERO_WAVE_POOL_ADDONS=[
  {from:21, ids:['horseman','royal_longbow']},
  {from:26, ids:['royal_elite','pikeman']},
  {from:31, ids:['royal_guard']},
  {from:36, ids:['battle_mage','rune_guardian']},
  {from:41, ids:['griffon_knight']},
  {from:46, ids:['sun_lancer','imperial_magus']},
  {from:51, ids:['royal_lance']},
  {from:66, ids:['dragon_rider']},
];
const HERO_WAVE_POOLS=HERO_WAVE_POOLS_BASE.map(row=>({
  from:row.from, to:row.to,
  ids:[...row.ids, ...HERO_WAVE_POOL_ADDONS.filter(a=>row.from>=a.from).flatMap(a=>a.ids)]
}));
function heroPoolIdsForWave(wave){
  const w=Math.max(0,Math.floor(Number(wave)||0));
  let row=HERO_WAVE_POOLS.find(p=>w>=p.from && w<=p.to);
  if(!row) row=HERO_WAVE_POOLS[HERO_WAVE_POOLS.length-1];
  const ids=[...new Set(row.ids)].filter(id=>HERO_TYPES.some(h=>h.id===id));
  return ids.length?ids:['swordsman'];
}
function heroPoolTypesForWave(wave){
  const ids=heroPoolIdsForWave(wave);
  return HERO_TYPES.filter(h=>ids.includes(h.id));
}

function getEncounterPattern(wave){
  const pool=heroPoolIdsForWave(wave);
  // 웨이브 풀과 2종 이상 겹치는 기존 원정대 패턴(이름/이동속도/시너지 연출)만 후보로 삼고,
  // 풀 전체를 쓰는 범용 원정대도 항상 후보에 넣어 어떤 패턴에도 없는 용사(예: 광부)도 등장할 수 있게 합니다.
  const fits=HERO_ENCOUNTER_PATTERNS.filter(x=>x.types.filter(id=>pool.includes(id)).length>=2);
  const generic={id:'wavepool',name:'용사 원정대',minWave:wave,types:pool.slice(),speedMul:1.0};
  const candidates=[...fits,generic];
  return candidates[Math.floor(Math.random()*candidates.length)];
}
function pickEncounterHeroType(pattern,wave,usedIds){
  const poolIds=heroPoolIdsForWave(wave);
  const isBossPattern=!!(pattern&&typeof pattern.id==='string'&&pattern.id.startsWith('boss_'));
  const inPattern=(pattern?.types||[]).filter(id=>poolIds.includes(id));
  // 패턴 밖의 용사도 등장할 수 있도록 일반 웨이브의 파티 슬롯 일부(25%)는 풀 전체에서 뽑습니다.
  const wildcard=!isBossPattern && inPattern.length && Math.random()<0.25;
  const base=(inPattern.length && !wildcard)?inPattern:poolIds;
  const fresh=base.filter(id=>!usedIds.has(id));
  const finalPool=fresh.length?fresh:base;
  return finalPool[Math.floor(Math.random()*finalPool.length)]||'swordsman';
}
function applyPartySynergy(heroMembers, patternId, isBossWave=false){
  if(!heroMembers.length) return;
  const ids=new Set(heroMembers.map(h=>h.typeId));
  let label='';
  if(ids.has('shieldbearer')&&ids.has('paladin')&&ids.has('priest')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.12;}); label='성기사 진형: 방어/회복 강화';
  } else if(ids.has('mage')&&ids.has('archmage')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.14;}); label='마법 연계: 주문 피해 강화';
  } else if(ids.has('hunter')&&ids.has('archer')&&ids.has('gunslinger')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.10;}); label='원거리 집중: 사격 강화';
  } else if(ids.has('assassin')&&ids.has('shadowrogue')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.12;}); label='그림자 습격: 기습 강화';
  } else if(ids.has('dragonslayer')&&ids.has('swordsaint')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.16;}); label='용 사냥 연합: 대형 적 특화';
  } else if(ids.has('berserker')&&ids.has('swordsman')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.08;}); label='돌격 진형: 근접 피해 강화';
  } else if(ids.has('druid')&&ids.has('miko')&&ids.has('priest')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.08;}); label='치유 성단: 회복 효과 강화';
  } else if(ids.has('bard')&&ids.has('alchemist')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.06;}); label='지원 연계: 버프/디버프 강화';
  } else if(ids.has('ice_mage')&&ids.has('spirit_caller')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.08;}); label='정령 빙결 연계: 마법 피해 강화';
  } else if(ids.has('lancer')&&ids.has('martial_artist')&&ids.has('dual_wielder')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.10;}); label='기동 돌격: 근접 피해 강화';
  } else if(ids.has('curse_caster')&&ids.has('dark_knight')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.10;}); label='공포 저주: 디버프 강화';
  } else if(ids.has('ironclad')&&ids.has('priest')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.08;}); label='철벽 수호: 방어/회복 강화';
  } else if(ids.has('royal_elite')&&ids.has('royal_guard')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.10;}); label='왕국 방진: 정예 전열 강화';
  } else if(ids.has('battle_mage')&&ids.has('rune_guardian')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.10;}); label='룬 마도 연계: 마법 증폭';
  } else if(ids.has('sun_lancer')&&ids.has('imperial_magus')){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.12;}); label='태양의 가호: 성광 강화';
  } else if(['horseman','pikeman','griffon_knight','sun_lancer','royal_lance','dragon_rider'].filter(id=>ids.has(id)).length>=2){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.10;}); label='기마 돌격: 기동 타격 강화';
  } else if(heroMembers.length>=3){
    heroMembers.forEach(h=>{h.partySynergy=(h.partySynergy||1)*1.04;}); label='원정대 결속: 전원 소폭 강화';
  }
  if(label) addLog(`<span class="hl-gold">🤝 ${label}</span>`);
  if(isBossWave) addLog(`<span class="hl-red">☠️ ${patternId||'특수'} 원정군이 보스를 호위합니다.</span>`);
}

/* v64 · 초반 마법사 난이도 완화.
   기본 마법사는 1~5웨이브에서 제외하고 6웨이브부터 등장합니다.
   6~10웨이브에는 공격력을 추가로 낮춘 상태를 유지하고, 20웨이브까지 서서히 회복합니다.
   기본 주문/아케인 버스트/메테오/혜성의 피해량과 재사용 주기도 함께 완화해 첫 등장부터 광역 마법이 과도하게 강하지 않도록 조정했습니다. */
const EARLY_MAGE_NERF={mul:0.78, holdUntil:10, fullAt:20};
function earlyCasterAtkMul(type,level){
  if(!type||type.id!=='mage') return 1;
  const n=EARLY_MAGE_NERF;
  if(level<=n.holdUntil) return n.mul;
  if(level>=n.fullAt) return 1;
  return n.mul+(1-n.mul)*((level-n.holdUntil)/(n.fullAt-n.holdUntil));
}
function spawnHero(isBoss, partyId=null, partyLeaderId=null, spawnCell=null, forcedTypeId=null, elite=false, bossProfile=null){
  const anchor=(spawnCell&&Array.isArray(state?.heroSpawnPoints)&&state.heroSpawnPoints.some(sp=>sp.r===spawnCell[0]&&sp.c===spawnCell[1])) ? {r:spawnCell[0],c:spawnCell[1]} : (state?.heroSpawnPoint||state?.heroSpawnPoints?.[0]);
  const e=spawnCell?{r:spawnCell[0],c:spawnCell[1]}:(anchor?{r:anchor.r,c:anchor.c}:randomEdgeSpawn());
  const isMainSpawn=!!(anchor&&e.r===anchor.r&&e.c===anchor.c);
  const spawnTile=state.grid[e.r][e.c];
  Sound.heroSpawn();
  // 판 시작 때 정한 주 침입구는 계속 '용사 출입구'로 유지합니다.
  // 파티의 보조 용사는 출입구 주변 칸에서 함께 등장합니다.
  if(spawnTile.type==='rock'){
    state.grid[e.r][e.c]={type:'floor', isEntrance:isMainSpawn, breached:true, obstacle:null};
    addLog(`<span class="hl-red">쿠구궁! ${isMainSpawn?'용사 침입구에서':'침입구 주변에서'} 용사가 등장했습니다!</span>`);
  } else {
    spawnTile.isEntrance=isMainSpawn;
    spawnTile.breached=!isMainSpawn;
  }
  const pool=heroPoolTypesForWave(state.wave); // v50: 웨이브 구간별 등장 풀 사용
  let type=(forcedTypeId&&HERO_TYPES.find(h=>h.id===forcedTypeId))||pool[Math.floor(Math.random()*pool.length)];
  type=villageRaidAdjustHeroType(type,pool,isBoss);
  const raidMods=villageRaidWaveMods(state.wave);
  const b=heroBaseStats(state.wave);
  const majorBoss=(state.wave%10===0&&isBoss);
  // v67: 첫 보스인 10웨이브 성기사단장은 초반 보호 구간에 맞춰 한 단계 더 약화합니다.
  // 20/30웨이브와 40웨이브 이후 보스 배율은 기존 값을 유지합니다.
  const earlyMajorBossNerf=(majorBoss && state.wave===10) ? 0.55 : (majorBoss && state.wave<=30 ? 0.70 : 1);
  const earlyMajorBossHpNerf=(majorBoss && state.wave===10) ? 0.30 : earlyMajorBossNerf;
  const level=Math.min(99,Math.max(1,state.wave+(isBoss?2:0)+(majorBoss?2:0)+(elite?1:0)));
  const coward=Math.random()<0.18;
  const now=performance.now();
  const id=state.heroSeq++;
  const midwaveMul=midwaveDifficultyScale();
  const hero={
    id, r:e.r, c:e.c, spawnR:e.r, spawnC:e.c, typeId:type.id, range:type.range,
    hp:Math.round(b.hp*type.hpMult*(isBoss?(majorBoss?4.5:3):(elite?1.75:1))*((state.stageHeroHpMul||1))*midwaveMul*(bossProfile?.bonus?.hp||1)*earlyMajorBossHpNerf*raidMods.heroHpMul),
    atk:Math.round(b.atk*type.atkMult*earlyCasterAtkMul(type,level)*(isBoss?(majorBoss?3.0:2.2):(elite?1.35:1))*(state.stageHeroAtkMul||1)*midwaveMul*(bossProfile?.bonus?.atk||1)*earlyMajorBossNerf*raidMods.heroAtkMul),
    def:Math.max(1,Math.round(level*HERO_DEF_PER_LEVEL*earlyWaveDefenseMul(state.wave)*midwaveMul*earlyMajorBossNerf*raidMods.heroDefMul)),
    reward:Math.round(b.reward*type.rewardMult*(isBoss?(majorBoss?6:4):(elite?2.2:1))*(state.stageEvent?.id==='redmoon'?1.2:(state.stageEvent?.id==='panic'?1.15:1))*raidMods.rewardMul),
    isBoss, majorBoss, elite:false, bossProfileId:null, partySynergy:1, level, coward, fleeing:false, escaped:false, fleeTarget:null, fleeTicks:0, fleeCooldown:0,
    partyId, partyLeaderId:partyLeaderId||id, partyRole:(partyLeaderId&&partyLeaderId!==id)?'member':'leader',
    digging:false, digKind:null, digProgress:0, digTargetR:null, digTargetC:null,
    lastAttackAt:0, lastHealAt:0, stunTicks:0, prevR:null, prevC:null, heroKills:0, coreFound:false, stuckTicks:0, soundNextDigAt:0, skillCooldown:1.8+Math.random()*2.5, castingSkill:null, skillTarget:null, lastSkillName:null,
    lastDialogueAt:0, lastCombatDialogueAt:0, nextDialogueAt:0, bubbleText:null, bubbleKind:'normal', bubbleUntil:0,
    showedQuestion:false, showedCoreAlert:false, lastMoveAt:0, lastStepR:0, lastStepC:0, spawnedAt:now,
  };
  hero.maxHp=hero.hp;
  rerollWanderTarget(hero);
  if(coward) state.cowardCount=(state.cowardCount||0)+1;
  sayHero(hero,pickHeroDialogue('spawn'),'normal',2600,true);
  hero.lastDialogueAt=now;
  hero.nextDialogueAt=now+randomHeroDialogueDelay();
  state.heroes.push(hero);
  state.heroesSpawned=(state.heroesSpawned||0)+1;
  state.fxEvents.push({type:'spawnBurst', r:e.r, c:e.c, color:'rgba(224,73,95,.9)'});
  if(isBoss){
    if(majorBoss) addLog(`<span class="hl-gold">☠️ ${bossProfile?.name||type.name} · ${type.name} 대재앙급 용사</span>가 등장했습니다! (Lv.${level}) 보상 대폭 증가`);
    else addLog(`<span class="hl-red">${type.name} 용사 대장</span>이 등장했습니다! (Lv.${level})`);
  } else if(elite){
    addLog(`<span class="hl-gold">⭐ ${ELITE_ENCOUNTER_NAMES[state.wave%ELITE_ENCOUNTER_NAMES.length]}</span> ${type.name} 정예 용사가 등장했습니다! (Lv.${level})`);
  }
  else if(coward) addLog(`${type.name} 용사가 조심스럽게 침입했습니다.`);
}
function spawnHeroParty(remaining){
  const size=partySizeForWave(state.wave,remaining);
  const partyId='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  let cells=pickPartyEdgeSpawnCells(size);
  if(!cells.length && state.heroSpawnPoint){
    cells=[ [state.heroSpawnPoint.r, state.heroSpawnPoint.c] ];
  }
  if(!cells.length) return 0;

  const bossProfile=BOSS_PROFILES[state.wave]||null;
  const pattern=state.wavePattern || (bossProfile ? {id:'boss_'+state.wave,name:bossProfile.name,minWave:state.wave,types:bossProfile.types} : getEncounterPattern(state.wave));
  const usedIds=new Set();
  const members=[];
  let leaderId=null;

  // 보스 웨이브는 웨이브 전체에서 정해진 수만 보스로 지정합니다.
  // 여러 파티가 생성되더라도 보스 수가 누적되어 초과하지 않도록 누적 카운터를 사용합니다.
  const bossCap=bossCountForWave(state.wave);
  const bossesAlreadySpawned=state.bossesSpawnedThisWave||0;
  const bossesRemaining=Math.max(0,bossCap-bossesAlreadySpawned);
  const bossSlotsForParty=bossProfile ? Math.min(cells.length,bossesRemaining) : 0;

  for(let i=0;i<cells.length;i++){
    // 보스는 파티의 뒤쪽 슬롯부터 배정하여 일반 용사/보스가 자연스럽게 섞이도록 합니다.
    const isBoss=!!(bossProfile && bossSlotsForParty>0 && i>=cells.length-bossSlotsForParty);
    // 1~10웨이브는 정예 배율을 제거해 초반 갑작스러운 난이도 스파이크를 막습니다.
    const isElite=!isBoss && state.wave>=11 && ((state.wave%5===0 && i===cells.length-1) || (state.wave%7===0 && i===0 && size>=3));
    let forcedId;

    if(isBoss){
      forcedId=(bossProfile?.bossId && HERO_TYPES.some(x=>x.id===bossProfile.bossId&&state.wave>=x.unlockAt))
        ? bossProfile.bossId
        : (pattern.types.find(id=>{
            const h=HERO_TYPES.find(x=>x.id===id);
            return h&&state.wave>=h.unlockAt;
          })||'swordsman');
    } else {
      forcedId=pickEncounterHeroType(pattern,state.wave,usedIds);
    }

    usedIds.add(forcedId);
    const before=state.heroSeq;
    spawnHero(isBoss,partyId,leaderId,cells[i],forcedId,isElite,bossProfile);
    const h=state.heroes.find(x=>x.id===before);
    if(h) members.push(h);
    if(isBoss){
      state.bossesSpawnedThisWave=(state.bossesSpawnedThisWave||0)+1;
      state.bossSpawnedThisWave=true;
    }
    if(leaderId===null) leaderId=before;
  }

  for(const h of members) h.partyLeaderId=leaderId;
  applyPartySynergy(members,pattern.name,!!bossProfile);

  if(pattern && !bossProfile){
    addLog(`<span class="hl-red">⚔️ ${pattern.name}</span> 등장! [${members.map(h=>heroTypeOf(h)?.name||'용사').join(' · ')}]`);
  }

  if(bossProfile){
    const spawnedBosses=members.filter(h=>h.isBoss).length;
    addLog(`<span class="hl-gold">☠️ ${bossProfile.name}</span> ${members.length}인 원정군 등장! · 이번 웨이브 보스 ${spawnedBosses}명 (누적 ${state.bossesSpawnedThisWave}/${bossCap}명)`);
  } else if(size>1){
    addLog(`<span class="hl-red">파티 침입!</span> ${size}명의 용사가 함께 진입했습니다.`);
  }

  return members.length;
}

function findAdjacentHero(r,c){
  const spatial=typeof getHeroCombatSpatialIndex==='function'?getHeroCombatSpatialIndex():state?._heroCombatSpatial,candidates=combatSpatialCandidates(spatial,r,c,1);
  if(candidates){ let best=null,bestIdx=Infinity; for(const item of candidates){const h=item.e;if(Math.abs(h.r-r)+Math.abs(h.c-c)<=1&&item.i<bestIdx){best=h;bestIdx=item.i;}} return best; }
  for(const h of state.heroes){ if(Math.abs(h.r-r)+Math.abs(h.c-c)<=1) return h; } return null;
}

/* ---------------- 디버그 모드: 웨이브/골드/단계 제한 없이 즉시 스폰 ---------------- */
function debugSpawnHero(typeId){
  if(!state || !state.running){ alert('게임을 먼저 시작하세요.'); return; }
  const type=HERO_TYPES.find(h=>h.id===typeId);
  if(!type) return;
  const e=randomEdgeSpawn();
  const spawnTile=state.grid[e.r][e.c];
  Sound.heroSpawn();
  if(spawnTile.type==='rock'){
    state.grid[e.r][e.c]={type:'floor', isEntrance:false, breached:true, obstacle:null};
  } else {
    spawnTile.isEntrance=false;
    spawnTile.breached=false;
  }
  const level=Math.max(1,Math.min(99, parseInt(els.debugHeroLevel && els.debugHeroLevel.value,10)||5));
  const isBoss=!!(els.debugAsBoss && els.debugAsBoss.checked);
  const b=heroBaseStats(level);
  const majorBoss=false;
  const coward=false;
  const now=performance.now();
  const id=state.heroSeq++;
  const hero={
    id, r:e.r, c:e.c, spawnR:e.r, spawnC:e.c, typeId:type.id, range:type.range,
    hp:Math.round(b.hp*type.hpMult*(isBoss?3:1)),
    atk:Math.round(b.atk*type.atkMult*earlyCasterAtkMul(type,level)*(isBoss?2.2:1)),
    def:Math.round(level*HERO_DEF_PER_LEVEL),
    reward:Math.round(b.reward*type.rewardMult*(isBoss?4:1)),
    isBoss, majorBoss, elite:false, bossProfileId:null, partySynergy:1, level, coward, fleeing:false, escaped:false, fleeTarget:null, fleeTicks:0, fleeCooldown:0,
    partyId:null, partyLeaderId:null, partyRole:'leader',
    digging:false, digKind:null, digProgress:0, digTargetR:null, digTargetC:null,
    lastAttackAt:0, lastHealAt:0, stunTicks:0, prevR:null, prevC:null, heroKills:0, coreFound:false, stuckTicks:0, soundNextDigAt:0, skillCooldown:1.8+Math.random()*2.5, castingSkill:null, skillTarget:null, lastSkillName:null,
    lastDialogueAt:0, lastCombatDialogueAt:0, nextDialogueAt:0, bubbleText:null, bubbleKind:'normal', bubbleUntil:0,
    showedQuestion:false, showedCoreAlert:false, lastMoveAt:0, lastStepR:0, lastStepC:0, spawnedAt:now,
  };
  hero.partyLeaderId=id;
  hero.maxHp=hero.hp;
  rerollWanderTarget(hero);
  sayHero(hero,pickHeroDialogue('spawn'),'normal',2600,true);
  hero.lastDialogueAt=now;
  hero.nextDialogueAt=now+randomHeroDialogueDelay();
  state.heroes.push(hero);
  state.fxEvents.push({type:'spawnBurst', r:e.r, c:e.c, color:'rgba(224,73,95,.9)'});
  addLog(`<span class="hl-gold">[디버그]</span> ${type.name} (Lv.${level}${isBoss?', 대장':''}) 소환`);
  updateDebugCounts();
}
function debugSpawnMonster(typeId){
  if(!state || !state.running){ alert('게임을 먼저 시작하세요.'); return; }
  const mt=MONSTER_TYPES.find(m=>m.id===typeId);
  if(!mt) return;
  const spot=findMonsterSpawnNearCore();
  if(!spot){ alert('빈 바닥 타일이 없습니다.'); return; }
  const [r,c]=spot;
  if(monsterAt(r,c)) return;
  const now=performance.now();
  const id=state.monsterSeq++;
  state.monsters.push({
    id, r, c, typeId, tier:1,
    hp:mt.hp, maxHp:mt.hp, atk:mt.atk, def:mt.def, invested:mt.cost,
    range:mt.range||1, special:mt.special||null, role:mt.role||null, role2:mt.role2||null, debuffOnHit:!!mt.debuffOnHit, kills:0, levelProgress:0,
    moveCooldown:Math.random()*0.5, lastAttackAt:0, spawnedAt:now,
  });
  state.totalMonsterSpawns=(state.totalMonsterSpawns||0)+1;
  state.monsterSpawnCounts[typeId]=(state.monsterSpawnCounts[typeId]||0)+1;
  updateBestMonsterSeen(typeId,1);
  Sound.monsterSpawn();
  state.fxEvents.push({type:'spawnBurst', r, c});
  addLog(`<span class="hl-gold">[디버그]</span> ${mt.name} 소환`);
  updateDebugCounts();
}
function updateDebugCounts(){
  if(els.debugHeroCount) els.debugHeroCount.textContent=state?`(${state.heroes.length})`:'';
  if(els.debugMonsterCount) els.debugMonsterCount.textContent=state?`(${state.monsters.length})`:'';
}
function populateDebugPanel(){
  if(els.debugHeroGrid && !els.debugHeroGrid.childElementCount){
    for(const type of HERO_TYPES){
      const btn=document.createElement('button');
      btn.className='debug-unit-btn';
      btn.title=type.name;
      const img=SPRITE_DATA[type.id];
      btn.innerHTML=(img?`<img src="${img}" alt="${type.name}"/>`:`<span style="font-size:26px;">🗡</span>`)+`<span>${type.name}</span>`;
      btn.addEventListener('click',()=>debugSpawnHero(type.id));
      els.debugHeroGrid.appendChild(btn);
    }
  }
  if(els.debugMonsterGrid && !els.debugMonsterGrid.childElementCount){
    for(const mt of MONSTER_TYPES){
      const btn=document.createElement('button');
      btn.className='debug-unit-btn';
      btn.title=mt.name;
      const img=SPRITE_DATA[mt.id];
      btn.innerHTML=(img?`<img src="${img}" alt="${mt.name}"/>`:`<span style="font-size:26px;">👾</span>`)+`<span>${mt.name}</span>`;
      btn.addEventListener('click',()=>debugSpawnMonster(mt.id));
      els.debugMonsterGrid.appendChild(btn);
    }
  }
  updateDebugCounts();
}
function renderBuildPanel(){
  if(!els.buildList) return;
  if(!state){ els.buildList.innerHTML='<div class="build-desc">게임을 시작하면 진행도가 표시됩니다.</div>'; return; }
  updateArchetypeState();
  const counts=state.archetypeCounts||{};
  const cut=state.archetypeThresholdCut||0;
  let html='';
  for(const def of ARCHETYPE_DEFS){
    const owned=!!state[def.relicFlag];
    const active=!!(state.archetypeActive&&state.archetypeActive[def.key]);
    const statusText=active?'⚡ 발동 중':owned?'대기 중':'미보유';
    let reqHtml='';
    for(const req of def.reqs){
      const need=req.cuttable?Math.max(1,req.need-cut):req.need;
      const cur=req.get(counts)||0;
      const met=cur>=need;
      const pct=Math.max(0,Math.min(100,Math.round(cur/need*100)));
      reqHtml+=`<div class="bi-req-row ${met?'met':''}"><span class="bi-req-label">${req.label}</span><span class="bi-req-bar"><span class="bi-req-fill" style="width:${pct}%"></span></span><span class="bi-req-num">${cur}/${need}</span></div>`;
    }
    html+=`<div class="build-item ${owned?'owned':''} ${active?'active-now':''}"><div class="bi-head"><span class="bi-icon">${def.icon}</span><span class="bi-name">${def.name}</span><span class="bi-status">${statusText}</span></div><div class="bi-rule">${def.rule}</div><div class="bi-req">${reqHtml}</div></div>`;
  }
  els.buildList.innerHTML=html;
}
if(els.buildBtn){
  els.buildBtn.addEventListener('click',(e)=>{
    e.preventDefault();
    if(!els.buildOverlay) return;
    const open=els.buildOverlay.classList.contains('hidden');
    if(open){
      renderBuildPanel();
      els.buildOverlay.classList.remove('hidden');
      els.buildBtn.classList.add('active');
    } else {
      els.buildOverlay.classList.add('hidden');
      els.buildBtn.classList.remove('active');
    }
  });
}
if(els.buildCloseBtn){
  els.buildCloseBtn.addEventListener('click',()=>{
    els.buildOverlay.classList.add('hidden');
    els.buildBtn.classList.remove('active');
  });
}
if(els.buildOverlay){
  els.buildOverlay.addEventListener('click',(e)=>{
    if(e.target===els.buildOverlay){
      els.buildOverlay.classList.add('hidden');
      if(els.buildBtn) els.buildBtn.classList.remove('active');
    }
  });
}
if(els.debugBtn){
  els.debugBtn.addEventListener('click',()=>{
    const open=els.debugOverlay.classList.contains('hidden');
    if(open){
      populateDebugPanel();
      els.debugOverlay.classList.remove('hidden');
      els.debugBtn.classList.add('active');
    } else {
      els.debugOverlay.classList.add('hidden');
      els.debugBtn.classList.remove('active');
    }
  });
}
if(els.debugCloseBtn){
  els.debugCloseBtn.addEventListener('click',()=>{
    els.debugOverlay.classList.add('hidden');
    els.debugBtn.classList.remove('active');
  });
}
if(els.debugAddGold){
  els.debugAddGold.addEventListener('click',()=>{
    if(!state || !state.running){ alert('게임을 먼저 시작하세요.'); return; }
    addGold(1000,true);
    addLog(`<span class="hl-gold">[디버그]</span> 골드 +1,000G`);
    renderUI();
  });
}
if(els.debugClearHeroes){
  els.debugClearHeroes.addEventListener('click',()=>{
    if(state){ state.heroes=[]; updateDebugCounts(); }
  });
}
if(els.debugClearMonsters){
  els.debugClearMonsters.addEventListener('click',()=>{
    if(state){ state.monsters=[]; updateDebugCounts(); }
  });
}
function isPassableForLOS(r,c){
  if(!inBounds(r,c)) return false;
  const t=state.grid[r][c];
  if(t.type==='rock') return false;
  if(t.obstacle==='barricade') return false;
  if(t.obstacle==='collapse_bridge' && typeof runeGateIsBlocking==='function' && runeGateIsBlocking(t)) return false;
  return true;
}
function losBlocked(r1,c1,r2,c2){
  const dr=r2-r1, dc=c2-c1;
  if(Math.abs(dr)+Math.abs(dc)<=1) return false;
  // 두 칸 사이의 직선 경로상에 있는 모든 칸을 샘플링해서 벽(록/바리케이드)이 있는지 검사합니다.
  // 기존에는 가로/세로/정확히 45도 대각선만 제대로 검사되어, 그 외의 각도(예: 원거리 몬스터의 비스듬한 사격)는
  // 중간의 벽을 무시하고 공격이 통과하는 버그가 있었습니다.
  const steps=Math.max(Math.abs(dr),Math.abs(dc));
  for(let i=1;i<steps;i++){
    const t=i/steps;
    const rr=Math.round(r1+dr*t);
    const cc=Math.round(c1+dc*t);
    if((rr===r1&&cc===c1)||(rr===r2&&cc===c2)) continue;
    if(!isPassableForLOS(rr,cc)) return true;
  }
  return false;
}
function findMonsterInRange(r,c,range){
  let best=null,bestD=Infinity,bestIdx=Infinity;
  const spatial=typeof getMonsterCombatSpatialIndex==='function'?getMonsterCombatSpatialIndex():state?._monsterCombatSpatial;
  const candidates=combatSpatialCandidates(spatial,r,c,range);
  if(candidates){
    for(const item of candidates){
      const m=item.e,d=Math.abs(m.r-r)+Math.abs(m.c-c);
      if(d<=range && (d<bestD||(d===bestD&&item.i<bestIdx)) && !losBlocked(r,c,m.r,m.c)){ bestD=d; best=m; bestIdx=item.i; }
    }
  }else{
    for(let i=0;i<state.monsters.length;i++){
      const m=state.monsters[i],d=Math.abs(m.r-r)+Math.abs(m.c-c);
      if(d<=range && d<bestD && !losBlocked(r,c,m.r,m.c)){ bestD=d; best=m; bestIdx=i; }
    }
  }
  return {monster:best, dist:bestD};
}
// 사냥꾼(HP 최저 우선), 검성(HP 최고 우선) 등 특수 타겟팅 영웅을 위한 선택 함수.
// 우선순위가 없는 일반 영웅은 기존과 동일하게 가장 가까운 적을 선택합니다.
function findMonsterForHero(h){
  const range=h.range||1;
  const ht=heroTypeOf(h);
  const priority=ht&&ht.targetPriority;
  if(!priority) return findMonsterInRange(h.r,h.c,range);
  let best=null,bestD=Infinity,bestVal=null,bestIdx=Infinity;
  const spatial=typeof getMonsterCombatSpatialIndex==='function'?getMonsterCombatSpatialIndex():state?._monsterCombatSpatial;
  const candidates=combatSpatialCandidates(spatial,h.r,h.c,range);
  const scan=candidates||state.monsters.map((e,i)=>({e,i}));
  for(const item of scan){
    const m=item.e,d=Math.abs(m.r-h.r)+Math.abs(m.c-h.c);
    if(d>range||m.hp<=0||losBlocked(h.r,h.c,m.r,m.c)) continue;
    const val = priority==='lowestHp' ? m.hp : (priority==='highestHp' ? -m.hp : d);
    if(best===null || val<bestVal || (val===bestVal&&d<bestD) || (val===bestVal&&d===bestD&&item.i<bestIdx)){ best=m; bestVal=val; bestD=d; bestIdx=item.i; }
  }
  return {monster:best, dist:bestD};
}
function pushDeathFx(r,c,color){ state.deathFx.push({r,c,color,start:performance.now()}); }

function monsterCanEngageHeroByCommand(m,h){
  if(!m||!h||h.hp<=0) return false;
  const command=normalizeMonsterCommand(state?.monsterCommand);
  // v87: 도발/피격 어그로도 명령의 활동구역을 무시하지 못합니다.
  // 공격/중립 공격형은 입구 안전구역과 전진선 안에서만 교전하고,
  // 수비형은 핵 방어구역 안에서만 교전합니다.
  const defensive=command==='defense' || (command==='neutral' && isMonsterDefensiveType(m));
  if(!defensive) return heroInsideMonsterAttackZone(h);
  const monsterCoreDist=Math.abs(m.r-CORE_R)+Math.abs(m.c-CORE_C);
  const heroCoreDist=Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C);
  return monsterCoreDist<=MONSTER_COMMAND_DEFENSE_LEASH_RADIUS && heroCoreDist<=MONSTER_COMMAND_DEFENSE_LEASH_RADIUS+MONSTER_COMMAND_DEFENSE_ENGAGE_MARGIN;
}

function findHeroInMonsterRange(m){
  const range=m.range||1; let best=null,bestD=Infinity,bestIdx=Infinity;
  // 명령의 활동 범위를 먼저 적용한 뒤 도발자를 최우선 타겟으로 선택합니다.
  let taunter=null,taunterDist=Infinity,taunterIdx=Infinity; const tauntNow=performance.now();
  const spatial=typeof getHeroCombatSpatialIndex==='function'?getHeroCombatSpatialIndex():state?._heroCombatSpatial;
  const tauntCandidates=combatSpatialCandidates(spatial,m.r,m.c,4)||state.heroes.map((e,i)=>({e,i}));
  for(const item of tauntCandidates){
    const h=item.e;
    if(!monsterCanEngageHeroByCommand(m,h)||!h.tauntUntil||tauntNow>=h.tauntUntil) continue;
    const td=Math.abs(h.r-m.r)+Math.abs(h.c-m.c);
    if(td<=4&&(td<taunterDist||(td===taunterDist&&item.i<taunterIdx))){taunter=h;taunterDist=td;taunterIdx=item.i;}
  }
  if(taunter) return {hero:taunter,dist:taunterDist};
  const candidates=combatSpatialCandidates(spatial,m.r,m.c,range)||state.heroes.map((e,i)=>({e,i}));
  for(const item of candidates){
    const h=item.e;
    if(!monsterCanEngageHeroByCommand(m,h)) continue;
    const d=Math.abs(h.r-m.r)+Math.abs(h.c-m.c);
    if(d<=range&&(d<bestD||(d===bestD&&item.i<bestIdx))&&!losBlocked(m.r,m.c,h.r,h.c)){best=h;bestD=d;bestIdx=item.i;}
  }
  return {hero:best,dist:bestD};
}
function monsterSynergyMultiplier(m){
  let mul=1;
  // v88 combat-opt: filter/map 중간 배열을 만들지 않고 한 번의 순회로 동일한 이웃 목록/ID 집합을 구성합니다.
  const near=[], nearbyIds=new Set();
  for(const o of state.monsters){
    if(o===m || Math.abs(o.r-m.r)+Math.abs(o.c-m.c)>2) continue;
    near.push(o); nearbyIds.add(o.typeId);
  }
  // 기존 빌드 시너지
  if(near.length>=2 && buildTagCount('swarm')) mul*=1+(state.buildBonuses.swarm||0);
  if(m.typeId==='spider'||m.special==='curse'||m.special==='lifesteal') mul*=1+(state.buildBonuses.poison||0)*0.65;
  if(m.special==='frost') mul*=1+(state.buildBonuses.frost||0)*0.55;
  if(m.special==='tank'||m.special==='guard') mul*=1+(state.buildBonuses.fort||0)*0.45;
  if(buildTagCount('maze')){
    const wallNear=state.grid[Math.max(0,m.r-1)]?.[m.c]?.playerWall || state.grid[Math.min(GRID-1,m.r+1)]?.[m.c]?.playerWall || state.grid[m.r]?.[Math.max(0,m.c-1)]?.playerWall || state.grid[m.r]?.[Math.min(GRID-1,m.c+1)]?.playerWall;
    if(wallNear) mul*=1+(state.buildBonuses.maze||0);
  }
  if(buildTagCount('ancient')) mul*=1.04;
  // 몬스터 조합 시너지: 실제 보유 몬스터 조합에 따라 역할이 연결됩니다.
  if((m.special==='tank'||m.special==='guard') && (nearbyIds.has('spider')||nearbyIds.has('darkmage'))) mul*=1.10; // 전선 + 저주
  if((m.special==='ranged'||m.role==='mage') && nearbyIds.has('golem')) mul*=1.10; // 포병 + 방벽
  if((m.special==='rage'||m.role==='berserker') && nearbyIds.has('skeleton_warrior')) mul*=1.12; // 광전사 + 수호기사
  if(m.typeId==='spider' && (nearbyIds.has('slime')||nearbyIds.has('goblin'))) mul*=1.10; // 저주 + 물량
  if((m.typeId==='lich_lord'||m.role==='healer') && near.some(o=>o.special==='tank'||o.special==='guard')) mul*=1.12; // 리치 + 탱커
  if(m.typeId==='flame_spirit' && nearbyIds.has('ice_golem')) mul*=1.08; // 상반 속성 긴장
  if(m.typeId==='dragon' && near.some(o=>['rock_colossus','golem','ice_golem'].includes(o.typeId))) mul*=1.08;
  for(const o of near){
    if((m.special==='tank'&&o.special==='ranged')||(m.special==='ranged'&&o.special==='tank')) mul=Math.max(mul,1.18);
    else if((m.special==='rage'&&o.special==='execute')||(m.special==='execute'&&o.special==='rage')) mul=Math.max(mul,1.12);
    else if(m.typeId===o.typeId) mul=Math.max(mul,1.08);
  }
  // 강화된 빌드 마스터리: 같은 계열을 3장 이상 모으면 해당 역할이 추가로 성장합니다.
  if(m.typeId==='spider'||m.special==='curse'||m.special==='lifesteal') mul*=1+buildMastery('poison');
  if(m.special==='frost') mul*=1+buildMastery('frost');
  if(m.special==='tank'||m.special==='guard') mul*=1+buildMastery('fort');
  if(near.length>=2) mul*=1+buildMastery('swarm');
  if(buildTagCount('maze')){
    const wallNear=state.grid[Math.max(0,m.r-1)]?.[m.c]?.playerWall || state.grid[Math.min(GRID-1,m.r+1)]?.[m.c]?.playerWall || state.grid[m.r]?.[Math.max(0,m.c-1)]?.playerWall || state.grid[m.r]?.[Math.min(GRID-1,m.c+1)]?.playerWall;
    if(wallNear) mul*=1+buildMastery('maze');
  }
  if(buildMastery('ancient')) mul*=1+buildMastery('ancient')*.5;
  // 카드 2종 혼합 연계. activeBuildCombos()의 임시 배열을 만들지 않고 같은 정의 순서로 바로 판정합니다.
  for(const combo of BUILD_COMBOS){
    if(buildTagCount(combo.a)<1 || (combo.b && buildTagCount(combo.b)<1)) continue;
    if(combo.id==='plagueFrost' && (m.special==='frost'||m.special==='curse'||m.typeId==='spider'||m.special==='lifesteal')) mul*=1.12;
    else if(combo.id==='frozenFortress' && (m.special==='tank'||m.special==='guard')) mul*=1.12;
    else if(combo.id==='bloodSwarm' && near.length>=2) mul*=1.10;
    else if(combo.id==='labyrinthSwarm'){
      const wallNear=state.grid[Math.max(0,m.r-1)]?.[m.c]?.playerWall || state.grid[Math.min(GRID-1,m.r+1)]?.[m.c]?.playerWall || state.grid[m.r]?.[Math.max(0,m.c-1)]?.playerWall || state.grid[m.r]?.[Math.min(GRID-1,m.c+1)]?.playerWall;
      if(wallNear) mul*=1.10;
    } else if(combo.id==='poisonBlood' && (m.special==='curse'||m.special==='lifesteal'||m.typeId==='spider')) mul*=1.10;
    else if(combo.id==='fortMaze'){
      const wallNear=state.grid[Math.max(0,m.r-1)]?.[m.c]?.playerWall || state.grid[Math.min(GRID-1,m.r+1)]?.[m.c]?.playerWall || state.grid[m.r]?.[Math.max(0,m.c-1)]?.playerWall || state.grid[m.r]?.[Math.min(GRID-1,m.c+1)]?.playerWall;
      if(wallNear) mul*=1.10;
    } else if(combo.id==='ancientAny') mul*=1.08;
  }
  return Math.min(2.45,mul);
}
function processMonsterTick(m,dt){
  const now=performance.now();

  // 빙결술사 슬로우
  if(m.skillSlowUntil && now<m.skillSlowUntil){
    m.moveCooldown=Math.max(m.moveCooldown,0.22);
  }
  // 저주술사 지속 피해
  if(m.skillDotUntil && now<m.skillDotUntil){
    m.hp-=Math.max(.2,(m.skillDotDps||1)*dt);
  }
  // 저주술사의 치유 차단은 아래 힐러 처리에서도 확인합니다.

  // 흑기사 공포: 잠시 공격하지 않고 용사에게서 멀어집니다.
  if(m.fearUntil && now<m.fearUntil){
    m.fearMoveCooldown=(m.fearMoveCooldown||0)-dt;
    if(m.fearMoveCooldown<=0){
      m.fearMoveCooldown=.35;
      let src=null,srcD=Infinity; for(const hero of state.heroes){if(hero.hp<=0)continue;const d=Math.abs(hero.r-m.r)+Math.abs(hero.c-m.c);if(d<srcD){src=hero;srcD=d;}}
      if(src){
        const choices=neighbors4(m.r,m.c).filter(([r,c])=>{
          const t=state.grid[r]?.[c];
          return t&&(t.type==='floor'||t.type==='core')&&!t.obstacle&&!monsterAt(r,c);
        });
        choices.sort((a,b)=>(Math.abs(b[0]-src.r)+Math.abs(b[1]-src.c))-(Math.abs(a[0]-src.r)+Math.abs(a[1]-src.c)));
        if(choices[0]){m.r=choices[0][0];m.c=choices[0][1];}
      }
    }
    return;
  }

  m.skillCooldown=Math.max(0,(m.skillCooldown||0)-dt);
  const mbcd=monsterBuildSkillCooldownMul(m);
  if(m.skillCooldown>0&&mbcd<1)m.skillCooldown=Math.max(0,m.skillCooldown-dt*(1/mbcd-1));
  if(m.castingSkill){
    m.castingSkill.elapsed=(m.castingSkill.elapsed||0)+dt;
    if(m.castingSkill.elapsed>=m.castingSkill.cast) finishMonsterSkill(m);
    return;
  }
  const monsterSkill=getMonsterSkill(m);
  if(monsterSkillEligible(m,monsterSkill) && Math.random()<Math.min(.14,dt*.75)){ if(startMonsterSkill(m)) return; }
  const near=(kind)=>state.auraPositions[kind]&&state.auraPositions[kind].some(p=>{const ot=state.grid[p.r]?.[p.c];return Math.abs(p.r-m.r)+Math.abs(p.c-m.c)<=obstacleRange(kind,ot);});
  const supportPos=state.auraPositions.statue?.find(p=>Math.abs(p.r-m.r)+Math.abs(p.c-m.c)<=obstacleRange('statue',state.grid[p.r]?.[p.c]));
  let statueDefMul=1, statueDmgMul=1, statueHeal=0;
  if(supportPos){
    const sl=obstacleLevel(state.grid[supportPos.r][supportPos.c]);
    // v35 함정 연구소: 수호 문양(Lv.2)/철벽 공명(Lv.4)은 방어 보너스를, 회복 결계(Lv.3)는 추가 회복을 줍니다.
    const srlv=trapResearchLevel('statue');
    const statueDefBonus=(srlv>=2?0.04:0)+(srlv>=4?0.08:0);
    statueDefMul=lerpLv(sl,1.10,1.35)*(1+statueDefBonus)*trapMasteryDefenseEffectMul();
    statueDmgMul=lerpLv(sl,1.03,1.12);
    statueHeal=lerpLv(sl,.6,2.4)*trapMasteryDefenseEffectMul()+(srlv>=3?1.0:0);
    if(m.hp<m.maxHp) m.hp=Math.min(m.maxHp,m.hp+statueHeal*dt);
  }
  // v35 함정 연구소: 철벽 연구 Lv.4(요새벽)는 주변 몬스터 방어력을, Lv.5(철벽 진지)는 받는 피해를 줄여줍니다.
  m.barricadeDefMul=1; m.barricadeDmgReduction=0;
  if(near('barricade')){
    const brlv=trapResearchLevel('barricade');
    if(brlv>=4) m.barricadeDefMul=1+0.05+trapMasteryDefenseMonsterDefBonus();
    if(brlv>=5) m.barricadeDmgReduction=0.10;
  }
  // v88 combat-opt: 같은 논리 틱/같은 위치에서 마왕 지원 배율을 여러 번 재계산하지 않습니다.
  const mwSupportTick=mawangSupportMultiplier(m);
  if(mwSupportTick.regen>0 && m.hp<m.maxHp) m.hp=Math.min(m.maxHp,m.hp+m.maxHp*mwSupportTick.regen*dt);
  if(mwSupportTick.def>0) m.mawangDefBonus=mwSupportTick.def; else m.mawangDefBonus=0;
  // 힐러(리치 군주 등): 주기적으로 주변 아군 몬스터를 치유합니다.
  if(m.role==='healer'){
    m.healCooldown=(m.healCooldown||0)-dt;
    if(m.healCooldown<=0){
      m.healCooldown=HEALER_PULSE_SEC;
      const healAmt=Math.max(4,Math.round(m.atk*0.5));
      let healedAny=false;
      for(const o of state.monsters){
        if(o===m||o.hp<=0) continue;
        if(Math.abs(o.r-m.r)+Math.abs(o.c-m.c)>HEALER_RANGE) continue;
        if(o.hp>=o.maxHp) continue;
        if(o.healBlockedUntil && performance.now()<o.healBlockedUntil) continue;
        o.hp=Math.min(o.maxHp,o.hp+healAmt);
        healedAny=true;
        state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'+'+healAmt,color:'#73d99a'});
      }
      if(m.hp<m.maxHp){ m.hp=Math.min(m.maxHp,m.hp+Math.round(healAmt*0.6)); healedAny=true; }
      if(healedAny) state.fxEvents.push({type:'spellImpact',r:m.r,c:m.c,spell:'holy'});
    }
  }
  const ti=findHeroInMonsterRange(m), h=ti.hero, dist=ti.dist;
  if(h){
    m.targetHeroId=h.id;
    // 대현자(마력 정화): 주변 몬스터에게 걸린 수호 석상 버프를 무효화합니다.
    const heroSpatial=typeof getHeroCombatSpatialIndex==='function'?getHeroCombatSpatialIndex():state?._heroCombatSpatial;
    const purifyCandidates=combatSpatialCandidates(heroSpatial,m.r,m.c,3);
    let archmageNear=false;
    const purifyScan=purifyCandidates||state.heroes.map((e,i)=>({e,i}));
    for(const item of purifyScan){
      const o=item.e;
      if(o.hp<=0) continue;
      const ot=heroTypeOf(o);
      if(ot?.purify && Math.abs(o.r-m.r)+Math.abs(o.c-m.c)<=(ot.purifyRange||3)){ archmageNear=true; break; }
    }
    let atkMul=statueDmgMul;
    if(archmageNear) atkMul=1;
    if(m.special==='rage'&&(m.hp<=m.maxHp*0.5||state.archetypeRageTrigger))atkMul*=1.45;
    if(m.special==='execute'&&h.hp<=h.maxHp*0.3)atkMul*=1.6;
    const synergyMul=monsterSynergyMultiplier(m);
    const mwSupport=mwSupportTick;
    const skillAtkBuff=(m.skillAtkBuffUntil&&performance.now()<m.skillAtkBuffUntil)?(m.skillAtkBuffMul||1):1;
    let dmg=Math.max(1,Math.round(m.atk*atkMul*synergyMul*(state.stageMonsterAtkMul||1)*skillAtkBuff*monsterBuildCombatMultiplier(m)*mwSupport.atk)-h.def);
    if(statueDefMul>1) dmg=Math.max(1,Math.round(dmg/statueDefMul));
    if(m.barricadeDefMul>1) dmg=Math.max(1,Math.round(dmg/m.barricadeDefMul));
    if(m.barricadeDmgReduction) dmg=Math.max(1,Math.round(dmg*(1-m.barricadeDmgReduction)));
    // 방패병(철벽 방진): 몬스터에게 받는 피해 25% 감소.
    const hDefType=heroTypeOf(h);
    if(hDefType&&hDefType.dmgReduction) dmg=Math.max(1,Math.round(dmg*(1-hDefType.dmgReduction)));
    if(h.tauntUntil&&performance.now()<h.tauntUntil) dmg=Math.max(1,Math.round(dmg*(1-(h.tauntDamageReduction||0))));
    // v51: 왕국 수호대/룬 수호자/왕국 창기병 등이 거는 방어 버프
    if(h.guardUntil&&performance.now()<h.guardUntil) dmg=Math.max(1,Math.round(dmg*(1-Math.min(.8,h.guardReduction||0))));
    if(state.archetypeActive && state.archetypeActive.sniper && (m.range||1)>=2 && h.hp<=h.maxHp*0.25){
      const focusAllies=state.monsters.filter(o=>o!==m && (o.range||1)>=2 && o.targetHeroId===h.id).length;
      if(focusAllies>=1){ dmg=Math.max(dmg,h.hp); state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'🏹처형!',color:'#ff2d55'}); }
    }
    // v35 함정 연구소 캡스톤: 거미왕의 은총(web Lv.5)은 속박 중인 용사가, 죽음의 낙인(curse Lv.5)은
    // 저주+저체력 용사가 몬스터에게 받는 피해를 추가로 늘립니다.
    if(h.obstacleWebLv5 && h.webRootUntil && performance.now()<h.webRootUntil) dmg=Math.round(dmg*1.2);
    if(h.obstacleCurseLv5 && h.obstacleCurseUntil && performance.now()<h.obstacleCurseUntil && h.hp<=h.maxHp*0.25) dmg=Math.round(dmg*1.15);
    if(h.mimicVulnerabilityUntil && performance.now()<h.mimicVulnerabilityUntil) dmg=Math.max(1,Math.round(dmg*(h.mimicVulnerabilityMul||MIMIC_VULN_MUL)));
    if((m.range||1)>1) Sound.monsterRanged(rangedProjectileKind('monster',m.typeId,m.special)); else Sound.monsterAttack(monsterMeleeAudioType(m));
    h.hp-=dmg; m.lastAttackAt=performance.now();
    if(dist<=1){
      const dR=Math.sign(h.r-m.r),dC=Math.sign(h.c-m.c); const back=Math.max(1,h.atk-m.def); m.hp-=back;
      const meleeFxReady=now-(m.lastMeleeFxAt||0)>=280;
      if(isRangedMonsterUnit(m)){
        // v48: 원거리 몬스터(궁수/마법사/정령 등)도 용사가 붙어도 투사체를 발사합니다.
        state.fxEvents.push({type:'projectile',fromR:m.r,fromC:m.c,toR:h.r,toC:h.c,color:monsterProjectileColor(m.typeId),owner:'monster',typeId:m.typeId,special:m.special,kind:rangedProjectileKind('monster',m.typeId,m.special)});
        if(meleeFxReady){
          m.lastMeleeFxAt=now;
          state.fxEvents.push({type:'punch',key:'h'+h.id,dr:dR,dc:dC,mode:'defender'});
        }
      }else if(meleeFxReady){
        m.lastMeleeFxAt=now;
        state.fxEvents.push({type:'punch',key:'m'+m.id,dr:dR,dc:dC,mode:'attacker'},{type:'punch',key:'h'+h.id,dr:dR,dc:dC,mode:'defender'},{type:'battleHit',r:h.r,c:h.c,color:'#ff6873',strong:dmg>Math.max(8,h.maxHp*.10),damage:dmg,dr:dR,dc:dC,weaponType:monsterMeleeAudioType(m),attackerType:m.typeId});
      }else{
        state.fxEvents.push({type:'battleHit',r:h.r,c:h.c,color:'#ff6873',strong:dmg>Math.max(8,h.maxHp*.10),damage:dmg,dr:dR,dc:dC,weaponType:monsterMeleeAudioType(m),attackerType:m.typeId});
      }
    }else state.fxEvents.push({type:'projectile',fromR:m.r,fromC:m.c,toR:h.r,toC:h.c,color:monsterProjectileColor(m.typeId),owner:'monster',typeId:m.typeId,special:m.special,kind:rangedProjectileKind('monster',m.typeId,m.special)});
      if((m.range||1)>1 || m.special==='lifesteal' || m.special==='frost' || m.special==='splash') state.fxEvents.push({type:'spell',fromR:m.r,fromC:m.c,toR:h.r,toC:h.c,spell:(m.special==='frost'?'ice':m.special==='lifesteal'?'dark':m.special==='splash'?'fire':m.special==='curse'?'dark':'arcane')});
      // 원거리/마법 일반 공격은 발사음은 monsterRanged(), 실제 착탄음은 projectile 도착 시점에 재생합니다.
    state.fxEvents.push({type:'spark',r:h.r,c:h.c,color:'#ff6873'},{type:'spark',r:m.r,c:m.c,color:'#ffd166'},{type:'damageNumber',r:h.r,c:h.c,amount:dmg,color:'#ff6873'});
    if(h.hp<=0)h.killerMonsterId=m.id;
    if(state.archetypeActive && state.archetypeActive.shadowExec && h.hp>0 && h.hp<=h.maxHp*0.25 && m.special!=='execute'){
      const reaper=state.monsters.find(o=>o.special==='execute'&&o.hp>0);
      if(reaper){
        h.hp=0; h.killerMonsterId=reaper.id;
        reaper.kills=(reaper.kills||0)+1;
        state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'🗡️암살!',color:'#c46cff'});
      }
    }
    if(m.special==='splash'){const sd=Math.max(1,Math.round(dmg*0.45));for(const o of state.heroes){if(o!==h&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=1){const splash=(o.mimicVulnerabilityUntil&&performance.now()<o.mimicVulnerabilityUntil)?Math.max(1,Math.round(sd*(o.mimicVulnerabilityMul||MIMIC_VULN_MUL))):sd;o.hp-=splash;state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'-'+splash,color:'#ff9f43'});if(o.hp<=0)o.killerMonsterId=m.id;}}}
    if(m.special==='lifesteal')m.hp=Math.min(m.maxHp,m.hp+Math.max(1,Math.floor(dmg*0.35)));
    // 디버프형(거미·흑마법사) 및 겸업 힐러(리치 군주): 적중 시 용사에게 저주를 걸어 일정 시간 공격력을 낮춥니다.
    if(m.special==='curse' || m.debuffOnHit){
      h.monsterCurseUntil=performance.now()+MONSTER_CURSE_MS;
      state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'저주!',color:'#43e78b'});
    }
    return;
  }
  const mwSpeedBonus=mwSupportTick.speed;
  m.moveCooldown-=dt;if(m.moveCooldown>0)return;m.moveCooldown=(0.42+Math.random()*0.32)/Math.max(0.1,mwSpeedBonus)/((m.skillSlowUntil&&performance.now()<m.skillSlowUntil)?(m.skillSlowMul||1):1);

  // 명령에 따라 몬스터의 활동 범위를 결정합니다.
  // 수비: 기존 핵 중심 행동을 그대로 유지합니다.
  // 공격: 핵 방어 반경 제한을 없애고 던전 전체에서 가장 가까운 용사를 추적합니다.
  // 중립: 탱커/수호형/힐러는 수비, 나머지는 공격 행동을 사용합니다.
  const passable=(r,c)=>{
    if(!inBounds(r,c)) return false;
    const t=state.grid[r][c];
    return (t.type==='floor'||t.type==='core') && t.obstacle!=='barricade';
  };
  const defenseBehavior=monsterUsesDefenseBehavior(m);
  const coreDistance=Math.abs(m.r-CORE_R)+Math.abs(m.c-CORE_C);
  let chaseTarget=null, chaseDist=Infinity;
  const provoked=(typeof heroAggroTarget==='function')?heroAggroTarget(m):null;
  if(provoked && monsterCanEngageHeroByCommand(m,provoked)){
    chaseTarget=provoked;
    chaseDist=Math.abs(provoked.r-m.r)+Math.abs(provoked.c-m.c);
  }
  for(const hero of state.heroes){
    if(provoked && chaseTarget===provoked) break;
    if(hero.hp<=0 || !monsterCanEngageHeroByCommand(m,hero)) continue;
    if(!defenseBehavior && !monsterAttackChaseSlotAvailable(m,hero)) continue;
    const d=Math.abs(hero.r-m.r)+Math.abs(hero.c-m.c);
    if(defenseBehavior){
      if(d<=monsterHuntRadius(m) && d<chaseDist){
        chaseTarget=hero; chaseDist=d;
      }
    } else if(d<chaseDist){
      chaseTarget=hero; chaseDist=d;
    }
  }

  // 이전 버전에서 이미 입구 근처까지 나간 공격형 몬스터도 새 명령 규칙에 맞춰 전선 안으로 복귀시킵니다.
  if(!defenseBehavior && !monsterCellAllowedByAttackCommand(m.r,m.c)){
    const retreatGoals=neighbors4(CORE_R,CORE_C).filter(([r,c])=>{
      const t=state.grid[r]?.[c];
      return t&&(t.type==='floor'||t.type==='core')&&t.obstacle!=='barricade'&&!monsterAt(r,c);
    });
    const retreatStep=retreatGoals.length?pathStepToGoal(m,retreatGoals):null;
    if(retreatStep){m.r=retreatStep[0];m.c=retreatStep[1];return;}
  }

  // 수비형 몬스터만 핵 방어구역 밖으로 나가면 핵 주변으로 복귀합니다.
  const coreGoals=neighbors4(CORE_R,CORE_C).filter(([r,c])=>{
    const t=state.grid[r][c];
    return (t.type==='floor'||t.type==='core') && t.obstacle!=='barricade' && !monsterAt(r,c);
  });

  m.targetHeroId=chaseTarget?chaseTarget.id:null;
  const targetGoals=chaseTarget
    ? [[chaseTarget.r,chaseTarget.c]]
    : (defenseBehavior && coreDistance>MONSTER_COMMAND_DEFENSE_LEASH_RADIUS ? coreGoals : []);

  if(targetGoals.length){
    // v88 combat-opt: 기존 문자열 Set/Map BFS와 동일한 상→하→좌→우 최단경로를 고정 배열 BFS로 계산합니다.
    const cur=typeof gridPathStepToGoal==='function'
      ? gridPathStepToGoal(m.r,m.c,targetGoals,passable,true)
      : pathStepToGoal(m,targetGoals);
    if(cur){
      const nextCoreDist=Math.abs(cur[0]-CORE_R)+Math.abs(cur[1]-CORE_C);
      const moveAllowed=defenseBehavior
        ? (nextCoreDist<=MONSTER_COMMAND_DEFENSE_LEASH_RADIUS || (coreDistance>MONSTER_COMMAND_DEFENSE_LEASH_RADIUS && nextCoreDist<coreDistance))
        : monsterCellAllowedByAttackCommand(cur[0],cur[1]);
      if(moveAllowed){
        m.r=cur[0]; m.c=cur[1];
        return;
      }
    }
  }

  // 통로가 전혀 없으면 기존의 가벼운 배회로 폴백합니다.
  const floorN=neighbors4(m.r,m.c).filter(([r,c])=>{
    if(!passable(r,c)) return false;
    const nextCoreDist=Math.abs(r-CORE_R)+Math.abs(c-CORE_C);
    return defenseBehavior
      ? (nextCoreDist<=MONSTER_COMMAND_DEFENSE_LEASH_RADIUS || (coreDistance>MONSTER_COMMAND_DEFENSE_LEASH_RADIUS && nextCoreDist<coreDistance))
      : monsterCellAllowedByAttackCommand(r,c);
  });
  if(floorN.length && Math.random()<0.6){
    const pick=floorN[Math.floor(Math.random()*floorN.length)]; m.r=pick[0]; m.c=pick[1];
  }
}

/* =====================================================================
   v40 — 마력의 핵 직접 배치
   게임을 시작하면 phase='placeCore' 상태로 들어가고,
   플레이어가 맵의 빈 칸을 눌러 핵 위치를 정합니다.
   확정되면 3×3 공간이 열리고 마왕이 그 자리로 이동한 뒤 건설 단계가 시작됩니다.
   ===================================================================== */
function placeCoreAt(r,c){
  if(!state||state.phase!=='placeCore'||state.corePlaced) return false;
  const reason=corePlacementBlockReason(r,c);
  if(reason){
    addLog(`<span class="hl-red">여기에는 마력의 핵을 놓을 수 없습니다.</span> ${reason}`);
    Sound.ui();
    return false;
  }

  // 3×3 공간을 열고 중앙에 핵을 놓습니다.
  for(const [rr,cc] of coreFootprintCells(r,c)){
    state.grid[rr][cc]={type:'floor',isEntrance:false,obstacle:null};
  }
  state.grid[r][c]={type:'core'};
  CORE_R=r; CORE_C=c;

  // 마왕을 새 핵 위치로 옮깁니다(아직 없으면 생성).
  if(state.mawang){ state.mawang.r=r; state.mawang.c=c; }
  else state.mawang=createMawangEntity(r,c);

  state.corePlaced=true;
  state.phase='build';
  state.buildTimer=buildTimeForWave(1);
  state._mapDirty=true;
  state._rangesDirty=true;
  state._panelDirty=true;
  state.selected=null;
  state.fxEvents.push({type:'spawnBurst',r,c,color:'rgba(224,182,74,.98)'});
  Sound.ui();
  addLog(`<span class="hl-gold">🔮 마력의 핵을 설치했습니다.</span> 이제 던전을 파고 몬스터를 배치하세요. <span class="hl-gold">1분</span> 뒤 첫 웨이브가 시작됩니다.`);
  buildMapDOM();
  centerZoomOnCore();
  renderUI();
  return true;
}
