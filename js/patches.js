// ---- mobile-ux-v39-rework-js ----
(function(){
  const toolbar=document.getElementById('toolbar');
  if(!toolbar) return;

  const toolBtns=[...toolbar.querySelectorAll('button[data-tool]')];
  const build=document.getElementById('buildBtn');
  const altar=document.getElementById('altarBtn');
  const speed=document.getElementById('speedBtn');
  const sound=document.getElementById('soundBtn');
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
  [build,altar,sound].forEach(b=>{ if(b) secondary.appendChild(b); });

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
    coach.style.setProperty('top', topPx+'px', 'important');
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
