// ---- mobile-ux-v39-rework-js ----
(function(){
  const toolbar=document.getElementById('toolbar');
  if(!toolbar) return;

  const toolBtns=[...toolbar.querySelectorAll('button[data-tool]')];
  const build=document.getElementById('buildBtn');
  const altar=document.getElementById('altarBtn');
  const speed=document.getElementById('speedBtn');
  const sound=document.getElementById('soundBtn');
  const debug=document.getElementById('debugBtn'); // v52: 이걸 다시 넣지 않아서 ?test=1 디버그 버튼이 사라져 있었습니다.
  if(!toolBtns.length) return;

  // 모바일 하단 핵심 메뉴:
  // [몬스터] [장애물] [명령] [배속] [기타]
  // 건설(길 만들기)은 하단 툴바에서 제거하지만 기존 게임 기능/로직은 건드리지 않는다.
  const primary=document.createElement('div');
  primary.className='ux-primary';
  primary.setAttribute('aria-label','전투 핵심 메뉴');

  const monster=toolBtns.find(b=>b.dataset.tool==='monster');
  const obstacle=toolBtns.find(b=>b.dataset.tool==='obstacle');
  const command=toolBtns.find(b=>b.dataset.tool==='command');
  [monster,obstacle,command].forEach(b=>{ if(b) primary.appendChild(b); });

  // 기존 speedBtn을 그대로 재사용하여 기존 배속 로직/상태를 유지한다.
  if(speed){
    speed.classList.add('ux-bottom-speed');
    speed.classList.remove('speed-toggle');
    speed.setAttribute('aria-label','배속');
    speed.title='게임 속도 전환';
    speed.innerHTML='<span id="speedIcon">⏩</span><span class="tlabel">배속</span>';
  }

  const more=document.createElement('button');
  more.type='button';
  more.className='ux-more-toggle';
  more.innerHTML='<span>☰</span><small>기타</small>';
  more.setAttribute('aria-expanded','false');
  more.setAttribute('aria-label','성장 및 기타 메뉴');

  const secondary=document.createElement('div');
  secondary.className='ux-secondary hidden';

  // 기타에는 배속을 넣지 않는다. 배속은 하단 고정 버튼으로 분리한다.
  // (debug 버튼은 평소엔 display:none 이고, ?test=1 → "디버그 모드로 시작"을 눌렀을 때만 나타납니다.)
  [build,altar,sound,debug].forEach(b=>{ if(b) secondary.appendChild(b); });
  if(debug) debug.addEventListener('click',function(){ secondary.classList.add('hidden'); more.classList.remove('open'); more.setAttribute('aria-expanded','false'); });

  more.addEventListener('click',function(e){
    e.preventDefault();
    e.stopPropagation();
    const open=!secondary.classList.contains('hidden');
    secondary.classList.toggle('hidden',open);
    more.classList.toggle('open',!open);
    more.setAttribute('aria-expanded',String(!open));
  });

  // 기존 toolbar 자식만 재배치한다. 각 버튼에 이미 연결된 기존 이벤트 리스너는 유지된다.
  toolbar.innerHTML='';
  toolbar.appendChild(primary);
  if(speed) toolbar.appendChild(speed);
  toolbar.appendChild(more);
  toolbar.appendChild(secondary);

  // 다른 곳을 누르면 기타 메뉴 닫기
  document.addEventListener('click',function(e){
    if(!toolbar.contains(e.target)){
      secondary.classList.add('hidden');
      more.classList.remove('open');
      more.setAttribute('aria-expanded','false');
    }
  },true);

  // 기존 상태와 선택 표시를 동기화
  setInterval(function(){
    try{
      if(typeof state==='undefined' || !state) return;
      [monster,obstacle,command].forEach(b=>{
        if(b) b.classList.toggle('active',state.activeTool===b.dataset.tool);
      });
    }catch(_){}
  },350);

  // 기존 패널 안내는 그대로 유지
  // fix: 원래는 이 안내 문구(kicker/action)를 #panelBox '안'에 넣었는데,
  // 전투 중 renderPanel()이 panelBox.innerHTML을 통째로 다시 그릴 때마다
  // (약 0.3초 주기) 이 요소들이 사라졌다가 여기서 다시 0.5초 주기로 재삽입되면서
  // panelBox의 내용 높이가 미세하게 흔들리고, overflow-y:auto인 panelBox의
  // 스크롤 위치가 매번 맨 위로 리셋됐다 (= "패널이 혼자 스크롤되는" 떨림 현상).
  // panelBox '밖', #panelWrap 안에 고정 배치해서 panelBox가 아무리 다시 그려져도
  // 이 안내 문구는 절대 건드리지 않도록 분리한다.
  const panelWrap=document.getElementById('panelWrap');
  const panelBoxEl=document.getElementById('panelBox');
  function updatePanelCue(){
    if(!panelWrap || !panelBoxEl || typeof state==='undefined' || !state) return;
    let kicker=panelWrap.querySelector('.ux-panel-kicker');
    if(!kicker){
      kicker=document.createElement('div');
      kicker.className='ux-panel-kicker';
      panelWrap.insertBefore(kicker,panelBoxEl);
    }
    const tool=state.activeTool||'dig';
    const map={
      dig:['⛏️','건설','길을 만들 타일을 터치하세요.'],
      monster:['👾','몬스터','몬스터를 고른 뒤 배치할 타일을 터치하세요.'],
      obstacle:['🧱','장애물','장애물을 고른 뒤 설치할 타일을 터치하세요.'],
      command:['🎯','명령','몬스터의 행동 방식을 선택하세요.']
    };
    const x=map[tool]||map.dig;
    kicker.textContent=x[0]+' '+x[1];
    let action=panelWrap.querySelector('.ux-panel-action');
    if(!action){
      action=document.createElement('div');
      action.className='ux-panel-action';
      panelWrap.appendChild(action); // panelBoxEl 다음(패널 바깥 하단)에 위치
    }
    action.textContent='다음 행동 · '+x[2];
  }
  setInterval(updatePanelCue,500);
})();

/* =====================================================================
   v40 신규 온보딩 튜토리얼 (4단계)
   ---------------------------------------------------------------------
   예전에는 v38용/v39용 튜토리얼 코드가 둘 다 살아 있어서 같은
   #firstPlayCoach 요소를 서로 다르게 조작하며 충돌했습니다.
   (한쪽은 classList 'show'로, 다른 쪽은 style.display로 제어)
   여기서 하나로 통합하고, 안내 순서도 새로 정의합니다.

   1) 몬스터 버튼 → 몬스터 카드를 골라 배치
   2) 장애물 버튼 → 장애물을 골라 설치
   3) 배속 버튼 + 상단 웨이브 타이머 → 빠르게 진행
   4) 마왕 캐릭터 → 영구 성장 RPG 캐릭터라는 설명

   각 단계는 "해당 행동을 실제로 하면" 자동으로 다음으로 넘어가고,
   [다음 안내] 버튼으로도 넘어갈 수 있습니다.
   ===================================================================== */
(function(){
  const coach=document.getElementById('firstPlayCoach');
  if(!coach) return;

  const elTitle=document.getElementById('fpcTitle');
  const elDesc =document.getElementById('fpcDesc');
  const elStep =document.getElementById('fpcStep');
  const btnNext=document.getElementById('fpcNext');
  const btnClose=document.getElementById('fpcClose');
  const btnHide =document.getElementById('fpcHide');

  const DONE_KEY='dd_v40_tutorial_done';
  const TOTAL=4;

  let current=0;            // 0 = 아직 시작 안 함, 1..4 = 진행 중
  let hiddenThisRun=false;  // 이번 판에서만 숨김
  let lastStateRef=null;
  let startPending=false;   // 핵 배치가 끝나면 튜토리얼을 시작해야 함
  let prevMonsters=0, prevObstacles=0;

  function isDone(){
    try{ return localStorage.getItem(DONE_KEY)==='1'; }catch(_){ return false; }
  }
  function markDone(){
    try{ localStorage.setItem(DONE_KEY,'1'); }catch(_){}
  }

  /* 하이라이트 대상은 화면 구성이 바뀌어도 안전하게 찾도록 함수로 둡니다.
     (하단 툴바는 위쪽 v39 코드가 DOM을 재배치하므로 매번 다시 찾아야 합니다.) */
  const STEPS={
    1:{
      title:'몬스터를 배치해보세요',
      desc:'👾 <b>몬스터</b> 버튼을 누른 뒤 원하는 몬스터 카드를 고르고, 던전 안의 빈 칸을 터치하면 배치됩니다.',
      targets:()=>[document.querySelector('#toolbar [data-tool="monster"]')]
    },
    2:{
      title:'장애물로 길목을 막아보세요',
      desc:'🧱 <b>장애물</b> 버튼을 누르고 설치할 장애물을 고른 뒤, 빈 칸을 터치하면 설치됩니다. 용사의 이동을 방해하고 전투를 유리하게 만듭니다.',
      targets:()=>[document.querySelector('#toolbar [data-tool="obstacle"]')]
    },
    3:{
      title:'웨이브를 빠르게 진행할 수 있어요',
      desc:'⏩ <b>배속</b> 버튼으로 게임 속도를 올릴 수 있고, 상단의 <b>용사 난입까지 남은 시간</b>을 누르면 기다리지 않고 웨이브를 바로 시작할 수 있습니다.',
      targets:()=>[document.getElementById('speedBtn'), document.getElementById('phaseBtn')]
    },
    4:{
      title:'마왕은 계속 성장하는 캐릭터입니다',
      desc:'👑 <b>마왕</b>은 직접 싸우는 RPG 캐릭터로, 용사를 처치하면 경험치를 얻어 레벨이 오릅니다. 게임이 끝난 뒤 <b>‘마왕의 성장’</b> 메뉴에서 스킬·장비를 영구적으로 강화할 수 있어요.',
      targets:()=>[document.querySelector('#tokenLayer .mawang-token')]
    }
  };

  function clearHighlight(){
    document.querySelectorAll('.ux-focus').forEach(el=>el.classList.remove('ux-focus'));
  }
  function applyHighlight(){
    clearHighlight();
    const step=STEPS[current];
    if(!step) return;
    (step.targets()||[]).forEach(el=>{ if(el) el.classList.add('ux-focus'); });
  }
  function render(){
    const step=STEPS[current];
    if(!step) return;
    if(elStep)  elStep.textContent=current+' / '+TOTAL;
    if(elTitle) elTitle.textContent=step.title;
    if(elDesc)  elDesc.innerHTML=step.desc;
    if(btnNext) btnNext.textContent=(current>=TOTAL?'안내 닫기':'다음 안내');
    coach.querySelectorAll('.fpc-dot').forEach((d,i)=>d.classList.toggle('on', i<=current-1));
    applyHighlight();
    repositionCoach();
  }
  function show(){
    coach.classList.add('show');
    coach.style.display='block';
  }
  function hide(){
    coach.classList.remove('show');
    coach.style.display='none';
    clearHighlight();
  }
  function begin(){
    if(hiddenThisRun || isDone()) return;
    // v40: 핵 배치 단계가 끝나기 전에는 튜토리얼을 띄우지 않습니다.
    if(typeof state!=='undefined' && state && (state.phase==='placeCore' || state.corePlaced===false)) return;
    current=1; show(); render();
  }
  function goto(n){
    if(current<=0) return;
    current=n;
    if(current>TOTAL){ finish(); return; }
    render();
  }
  function finish(){
    current=0;
    markDone();
    hide();
  }
  function skipThisRun(){
    current=0;
    hiddenThisRun=true;
    hide();
  }
  // 웨이브가 시작되면 전투 화면을 가리지 않도록 튜토리얼을 이번 판에서 즉시 숨깁니다.
  // 완료 처리(localStorage)는 하지 않으므로, 아직 튜토리얼을 끝내지 않은 유저는 다음 새 게임에서 다시 볼 수 있습니다.
  window.hideFirstPlayTutorialForWave=function(){
    if(current>0 || startPending){
      startPending=false;
      skipThisRun();
    }else{
      hide();
    }
  };

  /* v40.1: 팝업 위치를 화면 하단에 고정된 값이 아니라, 현재 툴바 윗변을 기준으로
     매번 다시 계산합니다. 이전에는 CSS의 고정 bottom 값을 썼는데, 몬스터/장애물
     패널이 카드 높이에 맞춰 늘어나는 기능이 추가되면서 패널이 팝업 밑으로
     파고들어 카드를 가리는 문제가 있었습니다(패널이 커진 만큼 팝업도 위로 밀려나야 함). */
  /* v40.2: 안내 팝업을 하단(패널 위)이 아니라, 핵 설치 안내(#corePlaceHint)와 같은
     보드 상단에 띄우도록 변경했습니다. 패널/툴바는 항상 보드 '아래'에 있으므로,
     보드 위쪽에 고정하면 패널이 아무리 커져도 구조적으로 절대 겹치지 않습니다.
     (지난번의 '패널이 팝업을 가림' 문제를 다시 겪지 않도록 아예 겹칠 수 없는 위치로 옮긴 것) */
  function repositionCoach(){
    const boardFrame=document.getElementById('board-frame');
    if(!boardFrame) return;
    const r=boardFrame.getBoundingClientRect();
    if(r.width===0 && r.height===0) return; // 아직 레이아웃 전
    const gap=10;
    const topPx=Math.max(8, Math.round(r.top+gap));
    const newTop=topPx+'px';
    // v40.4: 값이 실제로 바뀌었을 때만 스타일을 다시 씁니다.
    // 0.35초마다 무조건 style을 다시 쓰면(레이아웃이 그대로여도) 불필요한 리페인트가
    // 계속 발생하는데, 일부 환경에서 이게 보드 위 토큰(몬스터/마왕) 렌더링과
    // 충돌해 화면에 안 보이는 문제가 있었습니다. 값이 같으면 아예 건드리지 않습니다.
    if(coach.dataset.posTop===newTop) return;
    coach.dataset.posTop=newTop;
    coach.style.setProperty('top', newTop, 'important');
    coach.style.setProperty('bottom', 'auto', 'important');
  }

  if(btnNext)  btnNext.addEventListener('click', ()=>goto(current+1));
  if(btnClose) btnClose.addEventListener('click', skipThisRun);
  if(btnHide)  btnHide.addEventListener('click', skipThisRun);

  /* 마왕 토큰은 게임이 시작된 뒤에 생성되므로, 4단계에서 대상이 늦게 나타날 수 있습니다.
     하이라이트가 비어 있으면 잠시 뒤 다시 시도합니다. */
  function ensureHighlightLater(){
    if(current!==4) return;
    if(!document.querySelector('#tokenLayer .mawang-token.ux-focus')) applyHighlight();
  }

  /* 장애물은 state.obstacles가 아니라 각 타일(grid[r][c].obstacle)에 저장됩니다.
     기존 튜토리얼 코드는 존재하지 않는 state.obstacles를 세고 있어서
     "장애물을 설치하면 다음 단계로" 감지가 동작하지 않았습니다. */
  function countObstacles(){
    if(!state||!state.grid) return 0;
    let n=0;
    for(let r=0;r<state.grid.length;r++){
      const row=state.grid[r];
      if(!row) continue;
      for(let c=0;c<row.length;c++){ if(row[c]&&row[c].obstacle) n++; }
    }
    return n;
  }

  setInterval(function(){
    try{
      if(current>0) repositionCoach();

      if(typeof state==='undefined' || !state || !state.running) return;

      // 새 게임이 시작되면 튜토리얼을 처음부터 다시 판단합니다.
      if(state!==lastStateRef){
        lastStateRef=state;
        hiddenThisRun=false;
        prevMonsters=(state.monsters&&state.monsters.length)||0;
        prevObstacles=countObstacles();
        current=0;
        hide();
        startPending=!isDone();
        return;
      }

      /* v40: 핵 배치가 끝나기 전에는 기다렸다가, 끝나는 즉시 1단계를 띄웁니다.
         (begin()을 한 번만 호출하면 배치 중일 때 영영 시작되지 않습니다.) */
      if(startPending){
        if(hiddenThisRun||isDone()){ startPending=false; return; }
        if(state.phase==='placeCore'||state.corePlaced===false) return;
        startPending=false;
        prevMonsters=(state.monsters&&state.monsters.length)||0;
        prevObstacles=countObstacles();
        setTimeout(function(){ begin(); repositionCoach(); },500);
        return;
      }
      if(current<=0) return;

      const mc=(state.monsters&&state.monsters.length)||0;
      const oc=countObstacles();

      // 실제로 그 행동을 하면 자동으로 다음 단계로 넘어갑니다.
      if(current===1 && mc>prevMonsters) goto(2);
      else if(current===2 && oc>prevObstacles) goto(3);
      else if(current===3 && state.phase!=='build') goto(4);

      prevMonsters=mc;
      prevObstacles=oc;
      ensureHighlightLater();
    }catch(_){}
  },350);
})();

/* =====================================================================
   v40 — 마력의 핵 배치 단계 안내 배너
   보드 위에 "핵을 놓을 자리를 고르세요" 안내를 띄우고,
   배치가 끝나면(phase가 build로 바뀌면) 자동으로 사라집니다.
   ===================================================================== */
(function(){
  const frame=document.getElementById('board-frame');
  if(!frame) return;

  let hint=null;
  function ensureHint(){
    if(hint&&hint.isConnected) return hint;
    hint=document.createElement('div');
    hint.id='corePlaceHint';
    hint.innerHTML='<div class="cph-title">🔮 마력의 핵을 놓을 자리를 고르세요</div>'+
                   '<div class="cph-desc">초록색으로 표시된 칸을 터치하면 그 자리에 핵이 세워집니다.<br>핵은 <b>6×6 공간</b>이 필요하고, <b>용사 침입구 근처</b>에는 놓을 수 없어요.</div>';
    frame.appendChild(hint);
    return hint;
  }
  function removeHint(){
    if(hint&&hint.isConnected) hint.remove();
    hint=null;
  }

  setInterval(function(){
    try{
      if(typeof state==='undefined'||!state||!state.running){ removeHint(); return; }
      if(state.phase==='placeCore') ensureHint();
      else removeHint();
    }catch(_){ }
  },200);
})();


/* Obstacle card thumbnails v1.0.0
 * UI only: do not change OBSTACLE_TYPES, OBSTACLE_ANIMS, map sprites or footprints.
 * Append once after the existing scripts; the guard prevents duplicate observers.
 * A sprite sheet is displayed through a one-frame CSS viewport, not as a full <img>.
 */
(function installObstacleCardIcons(){
  'use strict';
  if(typeof window==='undefined' || typeof document==='undefined') return;
  if(window.ObstacleCardIcons) return;

  const VERSION='1.0.0';
  const IDS=['gust','magnet','stun_cage','rockfall','collapse_bridge'];
  const imageCache=new Map(), results=new Map();
  const mounted=new WeakMap(), warned=new Set();
  const settings=Object.create(null);
  const cardSelector='.shop-item[data-place], #trapResearchGrid .meta-monster-card';
  let generation=0;

  function obstacle(id){
    return typeof OBSTACLE_TYPES!=='undefined' ? OBSTACLE_TYPES.find(x=>x.id===id) : null;
  }
  function animation(id){
    return typeof OBSTACLE_ANIMS!=='undefined' ? OBSTACLE_ANIMS[id] : null;
  }
  function positiveInt(value){
    const n=Number(value);
    return Number.isInteger(n) && n>0 ? n : null;
  }
  function options(id){
    const external=window.DUNGEON_OBSTACLE_CARD_IMAGES || {};
    return Object.assign({},external[id] || {},settings[id] || {});
  }
  function absoluteURL(src){
    if(typeof src!=='string' || !src.trim()) return '';
    try{
      const u=new URL(src,document.baseURI);
      if(!['http:','https:','file:','blob:','data:'].includes(u.protocol)) return '';
      if(u.protocol==='data:' && !/^data:image\//i.test(src)) return '';
      return u.href;
    }catch(_){ return ''; }
  }
  function candidates(ob){
    const cfg=options(ob.id),anim=animation(ob.id),out=[];
    const frame=Number.isInteger(cfg.frame) && cfg.frame>=0 ? cfg.frame : 0;
    const add=(src,spec)=>{
      const url=absoluteURL(src);
      if(url && !out.some(x=>x.url===url)) out.push(Object.assign({url,frame},spec));
    };
    if(cfg.sheet) add(cfg.sheet,{kind:'sheet',frames:cfg.frames,columns:cfg.columns,rows:cfg.rows,
      frameWidth:cfg.frameWidth,frameHeight:cfg.frameHeight});
    if(anim && anim.sheet) add(anim.sheet,{kind:'sheet',frames:anim.frames,
      columns:anim.columns,rows:anim.rows,frameWidth:anim.frameWidth,frameHeight:anim.frameHeight});
    // The supplied bridge has no OBSTACLE_ANIMS entry. This is a documented optional
    // file convention, NOT a change to its map animation or collapse behaviour.
    if(!anim || !anim.sheet) add('assets/images/obstacle_anim_'+ob.id+'.png',{kind:'sheet'});
    if(ob.sprite) add(ob.sprite,{kind:'sprite',frame:0});
    return out;
  }
  function loadImage(url){
    if(imageCache.has(url)) return imageCache.get(url);
    const task=new Promise(resolve=>{
      const img=new Image();
      let done=false;
      const finish=value=>{
        if(done) return;
        done=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(value);
      };
      const timer=setTimeout(()=>finish({ok:false,reason:'timeout'}),8000);
      img.decoding='async';
      img.onload=()=>finish({ok:img.naturalWidth>0 && img.naturalHeight>0,
        width:img.naturalWidth,height:img.naturalHeight,src:img.currentSrc || img.src,reason:'empty image'});
      img.onerror=()=>finish({ok:false,reason:'load failed'});
      img.src=url;
    });
    imageCache.set(url,task);
    return task;
  }
  // Known legacy sheets contain square frames in one strip. Explicit grid metadata
  // also supports rectangular frames and multirow atlases without guessing a grid.
  function layout(width,height,spec){
    if(!(width>0 && height>0)) return null;
    let cols=positiveInt(spec.columns),rows=positiveInt(spec.rows);
    const fw=positiveInt(spec.frameWidth),fh=positiveInt(spec.frameHeight);
    const count=positiveInt(spec.frames);
    if(fw || fh){
      if(!fw || !fh || width%fw || height%fh) return null;
      cols=width/fw;rows=height/fh;
    }else if(cols || rows){
      cols=cols || 1;rows=rows || 1;
    }else if(count && width===height*count){
      cols=count;rows=1;
    }else if(count && height===width*count){
      cols=1;rows=count;
    }else{
      const hCount=width/height,vCount=height/width;
      // Some projects replaced obstacle_*.png with a strip at the original path.
      // Only very wide/tall original images (3+ square frames) are auto-sliced.
      // A normal 2:1 single bridge picture is kept intact; explicit sheet paths
      // support two-frame strips as well.
      const min=spec.kind==='sheet'?2:3;
      if(Number.isInteger(hCount) && hCount>=min && hCount<=64){cols=hCount;rows=1;}
      else if(Number.isInteger(vCount) && vCount>=min && vCount<=64){cols=1;rows=vCount;}
      else if(spec.kind==='sprite' || count===1){cols=1;rows=1;}
      else return null; // Unknown contact-sheet grid: use a fallback, never all frames.
    }
    if(width%cols || height%rows || cols*rows>256) return null;
    const index=Number.isInteger(spec.frame) && spec.frame>=0 ? spec.frame : 0;
    const total=count && (spec.columns || spec.rows || fw) ? Math.min(count,cols*rows) : cols*rows;
    if(index>=total) return null;
    return {columns:cols,rows,frame:index,frameWidth:width/cols,frameHeight:height/rows};
  }
  function resolve(ob){
    const list=candidates(ob),key=JSON.stringify(list);
    const old=results.get(ob.id);
    if(old && old.key===key) return old;
    const record={key,status:'loading',attempts:[],value:null};
    record.promise=(async()=>{
      for(const spec of list){
        const im=await loadImage(spec.url);
        const box=im.ok ? layout(im.width,im.height,spec) : null;
        record.attempts.push({src:spec.url,ok:!!box,reason:box?'':im.ok?'frame layout needs metadata':im.reason});
        if(!box) continue;
        record.value=Object.assign({src:im.src || spec.url,kind:spec.kind},box);
        record.status=spec.kind==='sheet'?'sheet':'sprite';
        return record.value;
      }
      record.status='missing';
      if(!warned.has(ob.id)){
        warned.add(ob.id);
        console.warn('[ObstacleCardIcons] '+ob.id+': no usable card image. Check the asset paths or configure the frame grid.',record.attempts);
      }
      return null;
    })();
    results.set(ob.id,record);
    return record;
  }
  function paint(holder,value,ob){
    if(!holder.isConnected) return;
    if(!value){
      holder.dataset.imageState='missing';
      holder.title=ob.name+' - \uC774\uBBF8\uC9C0 \uD30C\uC77C \uD655\uC778 \uD544\uC694';
      return;
    }
    const layer=holder.querySelector('.ob-card-thumbnail-frame');
    const col=value.frame%value.columns,row=Math.floor(value.frame/value.columns);
    const ratio=value.frameWidth/value.frameHeight;
    layer.style.width=(ratio>=1?100:ratio*100)+'%';
    layer.style.height=(ratio>=1?100/ratio:100)+'%';
    layer.style.backgroundImage='url('+JSON.stringify(value.src)+')';
    layer.style.backgroundSize=(value.columns*100)+'% '+(value.rows*100)+'%';
    layer.style.backgroundPosition=(value.columns>1?col*100/(value.columns-1):0)+'% '+
      (value.rows>1?row*100/(value.rows-1):0)+'%';
    holder.dataset.frame=String(value.frame);
    holder.dataset.columns=String(value.columns);holder.dataset.rows=String(value.rows);
    holder.dataset.imageSource=value.src;
    holder.dataset.imageState='ready';
    holder.dataset.sourceKind=value.kind;
    holder.title=ob.name;
  }
  function mount(card,ob,meta){
    const host=meta ? card.querySelector('.meta-monster-icon') : card;
    if(!host) return;
    let holder=host.querySelector('.ob-card-thumbnail');
    const record=resolve(ob);
    const stamp=record.key+'|'+generation;
    if(holder && holder.dataset.cardObstacle===ob.id && mounted.get(holder)===stamp) return;
    if(!holder){
      const old=meta ? host.querySelector('img') : card.querySelector('.si-icon');
      holder=document.createElement('span');
      holder.className=(meta?'ob-card-meta-icon':'si-icon')+' ob-card-thumbnail';
      holder.setAttribute('role','img');
      holder.setAttribute('aria-label',ob.name);
      const fallback=document.createElement('span');
      fallback.className='ob-card-thumbnail-fallback';fallback.setAttribute('aria-hidden','true');
      const layer=document.createElement('span');
      layer.className='ob-card-thumbnail-frame';layer.setAttribute('aria-hidden','true');
      holder.append(fallback,layer);
      if(old) old.replaceWith(holder);else host.prepend(holder);
    }
    mounted.set(holder,stamp);
    holder.dataset.cardObstacle=ob.id;holder.dataset.imageState='loading';
    holder.querySelector('.ob-card-thumbnail-fallback').textContent=ob.icon || '?';
    // Do not touch card containers, event handlers, scroll offsets, or game state.
    record.promise.then(value=>{
      if(mounted.get(holder)===stamp) paint(holder,value,ob);
    });
  }
  function scan(root){
    if(!root || !root.querySelectorAll) return;
    const cards=[];
    if(root.matches && root.matches(cardSelector)) cards.push(root);
    cards.push(...root.querySelectorAll(cardSelector));
    for(const card of cards){
      const meta=!!card.closest('#trapResearchGrid');
      let id;
      if(meta){
        const name=card.querySelector('.meta-monster-name');
        const label=name ? name.textContent.trim() : '';
        id=IDS.find(key=>{const ob=obstacle(key);return ob && (label===ob.name || label.endsWith(' '+ob.name));});
      }else{
        const list=card.closest('.shop-list');
        if(!list || list.dataset.shopKey!=='tool:obstacle') continue;
        id=card.dataset.place;
      }
      if(!IDS.includes(id)) continue;
      const ob=obstacle(id);
      if(ob) mount(card,ob,meta);
    }
  }
  function installStyles(){
    if(document.getElementById('obstacleCardThumbnailStyles')) return;
    const style=document.createElement('style');style.id='obstacleCardThumbnailStyles';
    style.textContent=`
      .shop-item .ob-card-thumbnail.si-icon,
      #trapResearchGrid .ob-card-thumbnail {
        position:relative;display:inline-block;overflow:hidden;box-sizing:border-box;
        padding:0;vertical-align:middle;pointer-events:none;user-select:none;
      }
      #trapResearchGrid .ob-card-meta-icon {width:calc(100% - 4px);height:calc(100% - 4px);flex:0 0 auto;}
      .ob-card-thumbnail > .ob-card-thumbnail-frame {
        position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        display:block;background-repeat:no-repeat;image-rendering:pixelated;opacity:0;
        pointer-events:none;animation:none;
      }
      .ob-card-thumbnail > .ob-card-thumbnail-fallback {
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        font-size:24px;line-height:1;pointer-events:none;
      }
      .ob-card-thumbnail[data-image-state="ready"] > .ob-card-thumbnail-frame {opacity:1;}
      .ob-card-thumbnail[data-image-state="ready"] > .ob-card-thumbnail-fallback {visibility:hidden;}
    `;
    document.head.appendChild(style);
  }
  function refresh(retry){
    if(retry===true){imageCache.clear();results.clear();warned.clear();generation++;}
    scan(document.getElementById('panelBox'));
    scan(document.getElementById('metaGrowthContent'));
  }
  function start(){
    installStyles();
    for(const id of ['panelBox','metaGrowthContent']){
      const root=document.getElementById(id);if(!root) continue;
      const watcher=new MutationObserver(records=>{
        // Only card creation/replacement matters. Ignore our own thumbnail nodes,
        // text updates (price/timer), and style/class changes to avoid redraw loops.
        const changed=records.some(r=>Array.from(r.addedNodes).some(n=>
          n.nodeType===1 && !n.matches('.ob-card-thumbnail, .ob-card-thumbnail *')));
        if(changed) scan(root);
      });
      watcher.observe(root,{childList:true,subtree:true});
    }
    refresh();
  }
  window.ObstacleCardIcons={
    version:VERSION,
    refresh,
    configure(id,config){
      if(!IDS.includes(id)) throw new Error('Unsupported obstacle card: '+id);
      if(!config || typeof config!=='object') throw new TypeError('Expected card image options');
      settings[id]=Object.assign({},config);results.delete(id);generation++;refresh();
    },
    inspect(){
      return IDS.map(id=>{
        const r=results.get(id);
        return {id,status:r?r.status:'not requested',image:r&&r.value?Object.assign({},r.value):null,
          attempts:r?r.attempts.map(x=>Object.assign({},x)):[]};
      });
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();


/* Collapse bridge art integration v1.0.0
 * Append after the game scripts (included at the end of js/patches.js).
 * Rendering only: the existing activateObstacle owns hit counts, damage,
 * evacuation, and the conversion into a 2x2 barricade. Never do those twice.
 */
(function installCollapseBridgeArt(){
  'use strict';
  if(typeof window==='undefined' || typeof document==='undefined') return;
  if(window.CollapseBridgeArt) return;
  if(typeof OBSTACLE_TYPES==='undefined' || typeof renderMapCells!=='function' ||
     typeof activateObstacle!=='function'){
    console.warn('[CollapseBridgeArt] Load this patch after the game scripts.');
    return;
  }

  const ASSETS=Object.freeze({
    normal:'assets/images/obstacle_collapse_bridge.png',
    destroyed:'assets/images/obstacle_collapse_bridge_alt.png',
    sheet:'assets/images/obstacle_anim_collapse_bridge.png',
    icon:'assets/images/obstacle_collapse_bridge_icon.png'
  });
  const FRAME_SIZE=256, FRAME_COUNT=8;
  const COLLAPSE_SEQUENCE=Object.freeze([3,4,5,6,7]);
  const COLLAPSE_DURATIONS=Object.freeze([110,140,160,180,160]);
  const COLLAPSE_MS=COLLAPSE_DURATIONS.reduce((a,b)=>a+b,0);
  const visuals=new Map();
  const playing=new Map();
  let sheetReady=false, sheetStatus='loading', raf=null;

  function game(){return typeof state==='undefined'?null:state;}
  function inDungeon(s){return !!s && !!s.grid && !s.village && s.phase!=='village';}
  function isBridge(t){
    return !!t && (t.obstacle==='collapse_bridge' || (t.obstacle==='barricade' && !!t.wasBridge));
  }
  function isRoot(t,r,c){return (t.obstacleRootR??r)===r && (t.obstacleRootC??c)===c;}
  function speed(){
    const n=typeof gameSpeed==='undefined'?1:Number(gameSpeed);
    return Number.isFinite(n)?Math.max(0,n):1;
  }
  function neededHits(tile){
    const lv=typeof obstacleLevel==='function'?obstacleLevel(tile):Math.max(1,Number(tile?.obstacleLevel)||1);
    const base=typeof BRIDGE_HITS_TO_COLLAPSE==='undefined'?3:BRIDGE_HITS_TO_COLLAPSE;
    return base+(lv>=10?2:lv>=5?1:0);
  }
  function crackFrame(hits,need){
    hits=Math.max(0,Number(hits)||0);
    need=Math.max(2,Number(need)||3);
    return hits===0?0:Math.min(2,Math.ceil(hits*2/(need-1)));
  }
  function collapseFrame(elapsedMs){
    let elapsed=Math.max(0,Number(elapsedMs)||0);
    for(let i=0;i<COLLAPSE_SEQUENCE.length;i++){
      if(elapsed<COLLAPSE_DURATIONS[i]) return COLLAPSE_SEQUENCE[i];
      elapsed-=COLLAPSE_DURATIONS[i];
    }
    return 7;
  }
  function frameFor(tile){
    if(!isBridge(tile)) return null;
    if(tile.wasBridge || tile.bridgeCollapsed){
      const runtime=playing.get(tile);
      return runtime?collapseFrame(runtime.elapsed):7;
    }
    return crackFrame(tile.bridgeHits,neededHits(tile));
  }
  function valid(record){
    const s=game();
    return inDungeon(s) && record.owner===s && record.grid===s.grid &&
      s.grid[record.r]?.[record.c]===record.tile && isBridge(record.tile) &&
      isRoot(record.tile,record.r,record.c);
  }
  function dropVisual(record){
    if(record.node) record.node.remove();
    if(record.cell) record.cell.classList.remove('bridge-art-ready');
  }
  function paint(record){
    if(!valid(record) || !record.node?.isConnected) return;
    const frame=frameFor(record.tile);
    if(record.node.dataset.frame!==String(frame)){
      record.node.style.backgroundPosition=(frame*100/(FRAME_COUNT-1))+'% 0%';
      record.node.dataset.frame=String(frame);
    }
    const phase=playing.has(record.tile)?'collapsing':record.tile.wasBridge?'settled':frame?'cracked':'intact';
    if(record.node.dataset.phase!==phase)record.node.dataset.phase=phase;
  }
  function refresh(){
    const s=game();
    if(!inDungeon(s) || typeof cellEls==='undefined' || !cellEls.length){
      for(const record of visuals.values())dropVisual(record);
      visuals.clear();
      for(const [tile,record] of playing)if(!valid(record))playing.delete(tile);
      return;
    }
    const seen=new Set(),px=typeof currentCellPx==='number'?currentCellPx:0;
    for(let r=0;r<s.grid.length;r++)for(let c=0;c<s.grid[r].length;c++){
      const tile=s.grid[r][c],cell=cellEls[r]?.[c];
      if(!isBridge(tile)||!isRoot(tile,r,c)||!cell) continue;
      const key=r+'_'+c;seen.add(key);
      let record=visuals.get(key);
      if(record && (record.tile!==tile || record.cell!==cell || !record.node?.isConnected)){
        dropVisual(record);visuals.delete(key);record=null;
      }
      if(!sheetReady){cell.classList.remove('bridge-art-ready');continue;}
      if(!record){
        const node=document.createElement('div');
        node.className='collapse-bridge-visual';node.setAttribute('aria-hidden','true');
        node.style.backgroundImage='url('+JSON.stringify(ASSETS.sheet)+')';
        node.dataset.rootRow=String(r);node.dataset.rootCol=String(c);node.dataset.footprint='2';
        cell.appendChild(node);
        record={node,cell,tile,owner:s,grid:s.grid,r,c};visuals.set(key,record);
      }
      // A single sprite spans four cells. Member cells never create a second sprite.
      record.node.style.width=(px>0?2*px+'px':'200%');
      record.node.style.height=(px>0?2*px+'px':'200%');
      cell.classList.add('bridge-art-ready');
      paint(record);
    }
    for(const [key,record] of visuals)if(!seen.has(key)||!valid(record)){
      dropVisual(record);visuals.delete(key);
    }
    for(const [tile,record] of playing)if(!valid(record))playing.delete(tile);
  }
  function update(now){
    const stamp=Number.isFinite(now)?now:performance.now();
    const s=game(),paused=!!(s&&(s.paused||s.isPaused))||document.hidden;
    for(const [tile,record] of playing){
      if(!valid(record)){playing.delete(tile);continue;}
      const delta=Math.min(200,Math.max(0,stamp-record.lastStamp));
      record.lastStamp=stamp;
      if(!paused)record.elapsed+=delta*speed();
      if(record.elapsed>=COLLAPSE_MS)playing.delete(tile);
    }
    for(const [key,record] of visuals){
      if(!valid(record)||!record.node.isConnected){dropVisual(record);visuals.delete(key);continue;}
      paint(record);
    }
  }
  function schedule(){
    if(raf!==null||playing.size===0)return;
    raf=requestAnimationFrame(now=>{raf=null;update(now);schedule();});
  }
  function startCollapse(tile,r,c){
    const s=game();
    if(!inDungeon(s)||!isBridge(tile)||playing.has(tile))return;
    playing.set(tile,{tile,r,c,owner:s,grid:s.grid,lastStamp:performance.now(),elapsed:0});
    // The original code switches to barricade immediately; keep drawing the bridge
    // sequence until it settles rather than replacing it with the generic barricade art.
    s._mapDirty=true;
    refresh();schedule();
  }
  function clearBridgeFields(tile){
    for(const key of ['wasBridge','bridgeCollapsed','bridgeHits','justCollapsedUntil','triggerFxUntil'])delete tile[key];
    playing.delete(tile);
  }
  function snapshotMembers(r,c){
    const s=game();
    if(!s?.grid)return [];
    const root=typeof obstacleRootPos==='function'?obstacleRootPos(r,c):{r,c};
    if(!root)return [];
    const rootTile=s.grid[root.r]?.[root.c];
    if(!isBridge(rootTile))return [];
    const entries=[],id=rootTile.obstacle;
    for(let rr=root.r;rr<root.r+2;rr++)for(let cc=root.c;cc<root.c+2;cc++){
      const tile=s.grid[rr]?.[cc];
      if(tile && tile.obstacle===id && (tile.obstacleRootR??root.r)===root.r && (tile.obstacleRootC??root.c)===root.c)
        entries.push({tile,r:rr,c:cc,id,rootR:root.r,rootC:root.c});
    }
    return entries;
  }

  // Bind the delivered PNGs to the exact identifiers used by the original game.
  const bridge=OBSTACLE_TYPES.find(ob=>ob.id==='collapse_bridge');
  if(bridge){bridge.sprite=ASSETS.normal;bridge.spriteAlt=ASSETS.destroyed;bridge.cardSprite=ASSETS.icon;}
  if(typeof OBSTACLE_SPRITES!=='undefined'){
    OBSTACLE_SPRITES.collapse_bridge=ASSETS.normal;
    OBSTACLE_SPRITES.collapse_bridge_alt=ASSETS.destroyed;
  }

  const originalActivate=activateObstacle;
  activateObstacle=function(h,tile){
    const s=game();
    let root=null,rootTile=null;
    if(s&&h&&tile?.obstacle==='collapse_bridge'){
      root=obstacleRootPos(tile.obstacleRootR??h.r,tile.obstacleRootC??h.c)||obstacleRootPos(h.r,h.c);
      rootTile=root?s.grid[root.r]?.[root.c]:null;
    }
    const before=!!rootTile && !rootTile.wasBridge && !rootTile.bridgeCollapsed;
    const result=originalActivate.apply(this,arguments);
    if(rootTile&&game()===s){
      if(before&&rootTile.wasBridge&&rootTile.bridgeCollapsed)startCollapse(rootTile,root.r,root.c);
      else if(result){s._mapDirty=true;refresh();}
    }
    return result;
  };

  // 'alt' used to display the destroyed picture even on a harmless bridge footstep.
  // Before collapse, damage stages come from the sheet, with an intact still fallback.
  if(typeof applyObstacleSpriteImage==='function'){
    const originalSprite=applyObstacleSpriteImage;
    applyObstacleSpriteImage=function(img,ob,opts){
      if(ob?.id==='collapse_bridge'&&!opts?.srcOverride)opts=Object.assign({},opts,{alt:false});
      return originalSprite.call(this,img,ob,opts);
    };
  }
  const originalMap=renderMapCells;
  renderMapCells=function(){const result=originalMap.apply(this,arguments);refresh();return result;};

  if(typeof clearObstacleFootprint==='function'){
    const originalClear=clearObstacleFootprint;
    clearObstacleFootprint=function(r,c){
      const s=game(),members=snapshotMembers(r,c);
      const result=originalClear.apply(this,arguments);
      if(result&&s===game()){
        for(const entry of members){
          const t=s.grid[entry.r]?.[entry.c];
          if(t!==entry.tile)continue;
          const own=t.obstacle===entry.id&&(t.obstacleRootR??entry.rootR)===entry.rootR&&(t.obstacleRootC??entry.rootC)===entry.rootC;
          if(!t.obstacle||own){
            // Also tolerate the pre-2x2-fix clear routine that left three members behind.
            if(own){t.obstacle=null;for(const key of ['obstacleRootR','obstacleRootC','obstacleLevel','obstacleHp','obstacleMaxHp'])delete t[key];}
            clearBridgeFields(t);
          }
        }
        if(members.length){s._mapDirty=true;refresh();}
      }
      return result;
    };
  }
  if(typeof placeObstacle==='function'){
    const originalPlace=placeObstacle;
    placeObstacle=function(r,c,id){
      const s=game(),result=originalPlace.apply(this,arguments);
      if(result&&s===game()){
        // Clear stale bridge markers when reusing the same cells, not on a failed placement.
        const root=obstacleRootPos(r,c);
        if(root)for(let rr=root.r;rr<root.r+2;rr++)for(let cc=root.c;cc<root.c+2;cc++){
          const tile=s.grid[rr]?.[cc];
          if(tile?.obstacle===id&&(tile.obstacleRootR??rr)===root.r&&(tile.obstacleRootC??cc)===root.c)clearBridgeFields(tile);
        }
        refresh();
      }
      return result;
    };
  }

  const style=document.createElement('style');style.id='collapseBridgeArtStyles';
  style.textContent=`
    #map .cell.obstacle-root .collapse-bridge-visual {
      position:absolute;left:0;top:0;width:200%;height:200%;z-index:4;
      display:block;box-sizing:border-box;pointer-events:none;user-select:none;
      background-size:800% 100%;background-position:0% 0%;background-repeat:no-repeat;
      image-rendering:auto;animation:none!important;transform:none!important;
    }
    #map .cell.ob-collapse_bridge.bridge-art-ready > .obstacle-icon,
    #map .cell.ob-collapse_bridge.bridge-art-ready > .obstacle-anim {display:none!important;}
    #map .cell.ob-collapse_bridge > .obstacle-icon {
      width:200%;height:200%;left:0;top:0;object-fit:contain;
      transform:none!important;animation:none!important;filter:none!important;
    }
    #map .cell.ob-collapse_bridge.bridge-art-ready .ob-lv-badge {z-index:5;}
  `;
  document.head.appendChild(style);

  // Cards use a real one-frame PNG. They must not display the entire 8-frame strip.
  const card={sheet:ASSETS.icon,frames:1,columns:1,rows:1,frame:0};
  window.DUNGEON_OBSTACLE_CARD_IMAGES=Object.assign({},window.DUNGEON_OBSTACLE_CARD_IMAGES,{collapse_bridge:card});
  if(window.ObstacleCardIcons)window.ObstacleCardIcons.configure('collapse_bridge',card);

  const sheet=new Image();sheet.decoding='async';
  sheet.onload=()=>{
    sheetReady=sheet.naturalWidth===FRAME_COUNT*FRAME_SIZE&&sheet.naturalHeight===FRAME_SIZE;
    sheetStatus=sheetReady?'ready':'invalid-size';
    if(!sheetReady)console.warn('[CollapseBridgeArt] Expected a 2048x256 PNG; using still sprites.');
    refresh();
  };
  sheet.onerror=()=>{sheetReady=false;sheetStatus='missing';refresh();console.warn('[CollapseBridgeArt] Sheet missing; using still sprites.');};
  sheet.src=ASSETS.sheet;

  window.CollapseBridgeArt={
    version:'1.0.0',ASSETS,FRAME_SIZE,FRAME_COUNT,COLLAPSE_MS,
    crackFrame,collapseFrame,frameFor,refresh,
    update, // Visual clock only; never applies gameplay damage or terrain changes.
    inspect(){return {sheet:sheetStatus,active:playing.size,visible:visuals.size,
      bridges:[...visuals.values()].map(v=>({r:v.r,c:v.c,frame:frameFor(v.tile),phase:v.node.dataset.phase}))};}
  };
  refresh();
})();
