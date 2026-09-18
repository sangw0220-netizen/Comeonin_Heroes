// ---- mobile-ux-v38-release-js ----
(function(){
  const coach=document.getElementById('firstPlayCoach');
  if(!coach) return;
  const title=document.getElementById('fpcTitle');
  const desc=document.getElementById('fpcDesc');
  const step=document.getElementById('fpcStep');
  const next=document.getElementById('fpcNext');
  const close=document.getElementById('fpcClose');
  const hide=document.getElementById('fpcHide');
  const dots=[...coach.querySelectorAll('.fpc-dot')];
  let idx=0;
  const steps=[
    ['던전의 길을 먼저 만들어보세요','타일을 탭해 벽을 파면 용사가 지나갈 수 있는 길이 생깁니다.','다음 안내'],
    ['몬스터를 배치해보세요','하단의 👾 몬스터를 누르고 원하는 타일을 탭하면 몬스터가 배치됩니다.','다음 안내'],
    ['장애물로 길목을 막아보세요','하단의 🧱 장애물을 눌러 용사의 이동을 방해하거나 전투를 유리하게 만들 수 있습니다.','다음 안내'],
    ['이제 웨이브를 시작하세요','준비가 끝났다면 상단의 카운트다운 영역을 눌러 침공을 바로 시작할 수 있습니다.','확인했습니다']
  ];
  function render(){
    const x=steps[idx]; step.textContent=(idx+1)+' / '+steps.length; title.textContent=x[0]; desc.textContent=x[1]; next.textContent=x[2]; dots.forEach((d,i)=>d.classList.toggle('on',i<=idx));
  }
  function hideCoach(){ coach.classList.remove('show'); document.querySelectorAll('.ux-coach-pulse').forEach(e=>e.classList.remove('ux-coach-pulse')); }
  function showCoach(){
    if(typeof state==='undefined' || !state) return;
    if(localStorage.getItem('dd_v38_8_firstplay_done')==='1') return;
    idx=0; render(); coach.classList.add('show');
  }
  next.addEventListener('click',function(){
    if(idx<steps.length-1){idx++;render();}
    else {localStorage.setItem('dd_v38_8_firstplay_done','1');hideCoach();}
  });
  close.addEventListener('click',hideCoach);
  hide.addEventListener('click',hideCoach);
  /* Start/login flow may occur asynchronously, so observe the first active game state. */
  let lastState=false;
  setInterval(function(){
    const active=(typeof state!=='undefined' && !!state);
    if(active && !lastState && localStorage.getItem('dd_v38_8_firstplay_done')!=='1') setTimeout(showCoach,450);
    lastState=active;
  },500);
  render();
})();

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

  // 기존 온보딩은 기능상 건드리지 않는다. 다만 제거된 하단 건설 버튼을 가리키지 않도록
  // 첫 단계는 기존 게임의 실제 파기 안내만 유지한다.
  const coach=document.getElementById('firstPlayCoach');
  if(!coach) return;
  const title=document.getElementById('fpcTitle');
  const desc=document.getElementById('fpcDesc');
  const step=document.getElementById('fpcStep');
  const next=document.getElementById('fpcNext');
  let current=1, hiddenThisGame=false, prevMonsterCount=null, prevObstacleCount=null, started=false;

  const steps={
    1:{t:'먼저 길을 만들어보세요',d:'⛏️ 벽 타일을 한 번 터치해서 던전 통로를 만들어보세요.',focus:()=>null},
    2:{t:'몬스터를 배치해보세요',d:'👾 몬스터를 선택하고, 던전에 배치하세요.',focus:()=>monster},
    3:{t:'장애물을 설치해보세요',d:'🧱 장애물을 선택하고, 용사의 길목에 설치하세요.',focus:()=>obstacle},
    4:{t:'이제 웨이브를 시작하세요',d:'⚔️ 준비가 끝났다면 상단의 웨이브 버튼을 눌러 전투를 시작하세요.',focus:()=>document.getElementById('phaseBtn')}
  };

  function focusStep(){
    document.querySelectorAll('.ux-focus').forEach(x=>x.classList.remove('ux-focus'));
    const f=steps[current]&&steps[current].focus();
    if(f) f.classList.add('ux-focus');
    if(title) title.textContent=steps[current].t;
    if(desc) desc.textContent=steps[current].d;
    if(step) step.textContent=current+' / 4';
    coach.querySelectorAll('.fpc-dot').forEach((d,i)=>d.classList.toggle('on',i===current-1));
    if(next) next.textContent=current===4?'안내 닫기':'다음 안내';
  }
  function show(){
    if(hiddenThisGame || localStorage.getItem('dd_v38_9_firstplay_done')==='1') return;
    coach.style.display='block';
    focusStep();
  }
  function finish(){
    current=5;
    coach.style.display='none';
    document.querySelectorAll('.ux-focus').forEach(x=>x.classList.remove('ux-focus'));
    localStorage.setItem('dd_v38_9_firstplay_done','1');
  }
  if(next) next.addEventListener('click',function(){
    if(current>=4) finish();
    else { current++; focusStep(); }
  });
  const close=document.getElementById('fpcClose');
  if(close) close.addEventListener('click',()=>{
    hiddenThisGame=true;
    coach.style.display='none';
    document.querySelectorAll('.ux-focus').forEach(x=>x.classList.remove('ux-focus'));
  });
  const hide=document.getElementById('fpcHide');
  if(hide) hide.addEventListener('click',()=>{
    hiddenThisGame=true;
    coach.style.display='none';
    document.querySelectorAll('.ux-focus').forEach(x=>x.classList.remove('ux-focus'));
  });

  document.addEventListener('click',function(e){
    if(hiddenThisGame || typeof state==='undefined' || !state) return;
    if(current===1 && e.target.closest && e.target.closest('.cell')){
      current=2; focusStep();
    }else if(current===2 && typeof state.monsters!=='undefined' && (state.monsters.length||0)>0){
      current=3; focusStep();
    }else if(current===3 && typeof state.obstacles!=='undefined' && Object.keys(state.obstacles||{}).length>0){
      current=4; focusStep();
    }
  },true);

  let lastStateRef=null;
  setInterval(function(){
    try{
      if(typeof state==='undefined' || !state || !state.running) return;
      if(!started || state!==lastStateRef){
        started=true;
        lastStateRef=state;
        current=1;
        prevMonsterCount=state.monsters?.length||0;
        prevObstacleCount=Object.keys(state.obstacles||{}).length;
        show();
      }
      const mc=state.monsters?.length||0;
      const oc=Object.keys(state.obstacles||{}).length;
      if(current===2 && mc>prevMonsterCount){ current=3; focusStep(); }
      if(current===3 && oc>prevObstacleCount){ current=4; focusStep(); }
      if(current===4 && state.phase!=='build'){ finish(); }
      prevMonsterCount=mc;
      prevObstacleCount=oc;
    }catch(_){}
  },350);
})();
