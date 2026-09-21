"use strict";
/* Physical traps v1.1. Local eight-frame sprite atlases with vector fallback.
   No dependencies, remote image downloads, storage writes or account migrations.
   Gameplay uses simulation seconds; wall plates and trajectories are rendered separately.
   All public helpers deliberately retain the original project's classic-script globals. */
const PHYSICAL_DIRS=[
  {r:-1,c:0,angle:-90,icon:'↑',name:'북'},
  {r:0,c:1,angle:0,icon:'→',name:'동'},
  {r:1,c:0,angle:90,icon:'↓',name:'남'},
  {r:0,c:-1,angle:180,icon:'←',name:'서'}
];
const PHYSICAL_TRAPS={
  wall_crusher:{id:'wall_crusher',name:'압살벽',short:'압살벽',icon:'⚙',kind:'attack',mount:'wall',cost:110,damage:48,windup:.6,recover:.6,cooldown:3.6,color:'#ffb169',
    desc:'벽 1칸에 설치. 정면 1~3칸 뒤에 맞은편 벽이 필요합니다. 예고 후 통로를 철판으로 압착합니다.'},
  wall_pusher:{id:'wall_pusher',name:'벽 충격기',short:'벽 충격기',icon:'➜',kind:'debuff',mount:'wall',cost:80,damage:9,windup:.2,recover:.5,cooldown:2.8,push:3,color:'#72d5ec',
    desc:'통로를 바라보는 벽 1칸. 앞칸의 용사를 선택 방향으로 3칸 밀어내며, 벽 충돌·심연·장외 낙사를 유발합니다.'},
  spring_launcher:{id:'spring_launcher',name:'투척 발판',short:'투척 발판',icon:'↗',kind:'debuff',mount:'floor',cost:65,damage:7,windup:.2,recover:.5,cooldown:2.4,push:4,color:'#e7c66d',
    desc:'빈 바닥 1칸. 용사를 선택 방향으로 4칸 튀겨냅니다. 벽은 넘지 못하며, 심연과 지도 밖으로 날려 보낼 수 있습니다.'},
  pendulum:{id:'pendulum',name:'진자 절단기',short:'진자 절단기',icon:'⚔',kind:'attack',mount:'corridor',cost:90,damage:34,windup:.6,recover:.7,cooldown:2.7,color:'#c0a5ef',
    desc:'좌우 지지벽이 있는 1칸 통로. 화살표는 통로 축입니다. 추가 흰둘리며 중앙과 앞뒤 통로를 베어냅니다.'},
  abyss:{id:'abyss',name:'심연 균열',short:'심연 균열',icon:'◎',kind:'defense',mount:'terrain',cost:95,damage:0,color:'#ac85f4',fixed:true,
    desc:'바닥 1칸을 통행 불가 심연으로 바꿉니다. 밀려난 일반 용사는 낙사합니다. 기존 길을 끊는 위치와 핵/입구 주변은 설치 불가.'}
};
function physicalDef(id){ return PHYSICAL_TRAPS[id]||null; }
function physicalClock(){ return state?.physicalClock||0; }
function physicalDir(tile){ return PHYSICAL_DIRS[((tile?.physicalDir??state?.physicalDirection??1)%4+4)%4]; }
function physicalIsFloor(r,c){ const t=state?.grid?.[r]?.[c]; return !!t && (t.type==='floor'||t.type==='core') && t.obstacle!=='barricade'; }
function physicalIsWall(r,c){ const t=state?.grid?.[r]?.[c]; return !!t && t.type==='rock' && !t.isEntrance; }
function physicalOccupied(r,c){
  return state.heroes.some(h=>h.hp>0&&h.r===r&&h.c===c) || state.monsters.some(m=>m.hp>0&&m.r===r&&m.c===c) || (state.mawang&&!state.mawang.dead&&state.mawang.r===r&&state.mawang.c===c);
}
function physicalHeroLocked(h){ return (h.physicalLockUntil||0)>physicalClock()+1e-7; }
function physicalGeometry(r,c,id,dirIndex){
  const def=physicalDef(id), dir=PHYSICAL_DIRS[dirIndex]||PHYSICAL_DIRS[1];
  if(!def) return {ok:false,cells:[],reason:'Unknown trap'};
  const bad=reason=>({ok:false,cells:[],reason});
  const ordinary=(nr,nc)=>physicalIsFloor(nr,nc)&&state.grid[nr][nc].type!=='core'&&!state.grid[nr][nc].isEntrance;
  if(def.mount==='wall'){
    if(!physicalIsWall(r,c)) return bad('벽에 설치하세요.');
    const cells=[];
    if(id==='wall_pusher'){
      const nr=r+dir.r,nc=c+dir.c;
      return ordinary(nr,nc)?{ok:true,cells:[[nr,nc]],reach:1}:bad('화살표 앞에 통로가 필요합니다.');
    }
    for(let k=1;k<=4;k++){
      const nr=r+dir.r*k,nc=c+dir.c*k;
      if(physicalIsWall(nr,nc) && cells.length) return {ok:true,cells,reach:cells.length};
      if(k===4 || !ordinary(nr,nc)) break;
      cells.push([nr,nc]);
    }
    return bad('정면 1~3칸 통로 뒤에 맞은편 벽이 필요합니다.');
  }
  if(id==='pendulum'){
    if(!ordinary(r,c) || !physicalIsWall(r+dir.c,c-dir.r) || !physicalIsWall(r-dir.c,c+dir.r)) return bad('통로 양옆의 지지벽이 필요합니다. 방향을 바꿔 보세요.');
    return {ok:true,cells:[-1,0,1].map(k=>[r+dir.r*k,c+dir.c*k]).filter(([nr,nc])=>ordinary(nr,nc)),reach:1};
  }
  return {ok:true,cells:[[r,c]],reach:1};
}
function physicalReachable(skipR=-1,skipC=-1){
  const visited=new Set(), q=[[CORE_R,CORE_C]]; let head=0;
  while(head<q.length){
    const [r,c]=q[head++],key=r+'_'+c;
    if(visited.has(key)||(r===skipR&&c===skipC)||!physicalIsFloor(r,c)) continue;
    visited.add(key);
    for(const p of neighbors4(r,c)) q.push(p);
  }
  return visited;
}
let physicalPlacementCache={};
function physicalAbyssConnected(r,c){
  // Cache only topology, never occupancy or economy. Invalidation is shared with old wall tools.
  const sig=(state._physicalTopologyVersion||0)+':'+state.wave+':'+state.phase+':'+GRID+':'+CORE_R+':'+CORE_C;
  if(physicalPlacementCache.state!==state||physicalPlacementCache.grid!==state.grid||physicalPlacementCache.sig!==sig){
    physicalPlacementCache={state,grid:state.grid,sig,base:physicalReachable(),results:new Map()};
  }
  const cache=physicalPlacementCache,key=r+'_'+c;
  if(cache.results.has(key)) return cache.results.get(key);
  let ok=false;
  if(cache.base.has(key)) ok=physicalReachable(r,c).size===cache.base.size-1;
  cache.results.set(key,ok); return ok;
}
function physicalPlacement(r,c,id,dir=state?.physicalDirection??1){
  const def=physicalDef(id),t=state?.grid?.[r]?.[c];
  const bad=reason=>({ok:false,reason,cells:[]});
  if(!def||!t||!Number.isInteger(r)||!Number.isInteger(c)) return bad('지도 안에 설치하세요.');
  if(t.obstacle||t.isEntrance||t.rubbleWall||t.type==='core'||physicalOccupied(r,c)) return bad('비어 있는 칸을 선택하세요.');
  if(def.mount!=='wall' && t.type!=='floor') return bad('빈 바닥에 설치하세요.');
  if(id==='abyss'){
    if(Math.abs(r-CORE_R)+Math.abs(c-CORE_C)<=2) return bad('핵 2칸 이내는 보호 구역입니다.');
    if(neighbors4(r,c).some(([nr,nc])=>state.grid[nr][nc].isEntrance)) return bad('입구 바로 옆에는 설치할 수 없습니다.');
    if(!physicalAbyssConnected(r,c)) return bad('기존 통로를 끊을 수 없습니다. 우회로를 먼저 만드세요.');
  }
  return physicalGeometry(r,c,id,dir);
}
function placePhysicalTrap(r,c,id,free=false){
  if(!state||state.phase!=='build') return false;
  const def=physicalDef(id); if(!def) return false;
  if(state.contractNoObstacleWaves>0&&!free){ physicalNotice('침묵의 맹약: 이번 준비 단계에는 설치 불가'); return false; }
  const check=physicalPlacement(r,c,id); if(!check.ok){ physicalNotice(check.reason); return false; }
  const cost=obstaclePlaceCost(def); if(!free&&state.gold<cost){physicalNotice('골드가 부족합니다.');return false;}
  const tile=state.grid[r][c];
  if(!free) state.gold-=cost;
  tile.physicalBaseType=tile.type; tile.obstacle=id; tile.obstacleRootR=r; tile.obstacleRootC=c; tile.obstacleLevel=1;
  tile.physicalDir=state.physicalDirection??1; tile.obstacleMaxHp=obstacleMaxHpFor(def,1); tile.obstacleHp=tile.obstacleMaxHp;
  if(id==='abyss') tile.type='chasm';
  tile.physicalRuntime=null;
  state.obstaclePlacements=(state.obstaclePlacements||0)+1;
  dungeonStructureInvalidate(); Sound.obstacle();
  physicalNotice(def.name+' 설치 완료');
  return true;
}
function clearPhysicalTrap(r,c){
  const tile=state?.grid?.[r]?.[c]; if(!physicalDef(tile?.obstacle)) return false;
  const restored={...tile,type:tile.physicalBaseType||'floor',obstacle:null};
  for(const k of Object.keys(restored)) if(k.startsWith('physical')||k.startsWith('obstacle')||k==='triggerFxUntil') delete restored[k];
  restored.obstacle=null; state.grid[r][c]=restored;
  dungeonStructureInvalidate(); return true;
}
function upgradePhysicalTrap(r,c){
  const tile=state?.grid?.[r]?.[c],def=physicalDef(tile?.obstacle);
  if(!def||def.fixed||state.phase!=='build') return false;
  const lv=obstacleLevel(tile),cost=obstacleUpgradeCost(def,lv);
  if(lv>=10||state.gold<cost) return false;
  state.gold-=cost;tile.obstacleLevel=lv+1;tile.obstacleMaxHp=obstacleMaxHpFor(def,lv+1);tile.obstacleHp=tile.obstacleMaxHp;
  dungeonStructureInvalidate();Sound.level();return true;
}
function rotatePhysicalTrap(r,c,dir){
  const tile=state?.grid?.[r]?.[c],def=physicalDef(tile?.obstacle);
  if(!def||def.fixed||state.phase!=='build') return false;
  const index=((dir%4)+4)%4,geo=physicalGeometry(r,c,def.id,index);
  if(!geo.ok){physicalNotice(geo.reason);return false;}
  tile.physicalDir=index;tile.physicalRuntime=null;dungeonStructureInvalidate();return true;
}
function physicalNotice(text){
  if(state){ state.physicalNotice=text; state._panelDirty=true; }
  if(typeof addLog==='function') addLog('<span class="hl-gold">'+text+'</span>');
}
function physicalTargets(cells){
  const keys=new Set(cells.map(p=>p[0]+'_'+p[1]));
  return state.heroes.filter(h=>h.hp>0&&!physicalHeroLocked(h)&&keys.has(h.r+'_'+h.c));
}
function armPhysicalTrap(tile){
  const def=physicalDef(tile?.obstacle); if(!def||def.fixed||state?.phase!=='invasion') return false;
  const r=tile.obstacleRootR,c=tile.obstacleRootC;
  if(state.grid[r]?.[c]!==tile) return false;
  const now=physicalClock(),rt=tile.physicalRuntime||(tile.physicalRuntime={readyAt:0});
  if(rt.armedAt!=null || now+1e-7<(rt.readyAt||0)) return false;
  const geo=physicalGeometry(r,c,def.id,tile.physicalDir);
  if(!geo.ok||!physicalTargets(geo.cells).length) return false;
  rt.armedAt=now;rt.strikeAt=now+def.windup;rt.fault=false;
  state._mapDirty=true;return true;
}
function physicalConsumeLanding(h){
  if(!h?.physicalLandingPending||physicalHeroLocked(h))return false;
  // Landing consumes this movement turn, so a floor launcher can arm before the next turn.
  h.physicalLandingPending=false;physicalNotifyEntry(h);return true;
}
function physicalNotifyEntry(h){
  if(!h||h.hp<=0||state?.phase!=='invasion')return;
  // Arming at tile entry, after movement, gives one complete simulation tick of warning.
  for(let r=Math.max(0,h.r-4);r<=Math.min(GRID-1,h.r+4);r++)for(let c=Math.max(0,h.c-4);c<=Math.min(GRID-1,h.c+4);c++){
    const t=state.grid[r][c],def=physicalDef(t.obstacle);
    if(def&&!def.fixed)armPhysicalTrap(t);
  }
}
function physicalDamage(h,amount,source){
  if(!h||h.hp<=0) return 0;
  const dmg=Math.max(1,Math.round(amount));
  h.hp-=dmg;h.lastTrapHitAt=performance.now();h.lastPhysicalSource=source;
  if(h.hp<=0){ delete h.killerMonsterId;h.killerMawang=false; }
  state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:dmg,color:'#ffb169'});
  return dmg;
}
function physicalInterrupt(h){
  h.digging=false;h.digProgress=0;h.digKind=null;h.digTargetR=null;h.digTargetC=null;
  h.castingSkill=null;h.targetMonsterId=null;h.waitingBehindDigger=false;h.stuckTicks=0;
  h.barricadeSlowUntil=0;h.obstacleContactKey=null;
}
function physicalNewFlight(h,fromR,fromC,toR,toC,options={}){
  const duration=options.fall?.9:options.launch?.7:.45;
  const f={id:(state._physicalFlightSeq=(state._physicalFlightSeq||0)+1),heroId:h.id,typeId:h.typeId,isBoss:!!h.isBoss,
    fromR,fromC,toR,toC,start:physicalClock(),bornAt:performance.now(),duration,fall:!!options.fall,launch:!!options.launch};
  (state.physicalFlights||(state.physicalFlights=[])).push(f);
  if(!options.fall){
    h.physicalLockUntil=Math.max(h.physicalLockUntil||0,physicalClock()+duration);
    h.physicalLandingPending=true;
  }
  return f;
}
function physicalFall(h,toR,toC,options={}){
  if(!h||h.hp<=0) return false;
  if(h.isBoss){
    // Keep a boss at its last valid coordinate. Never index the grid outside its bounds.
    if(physicalClock()+1e-7>=(h.physicalEdgeGuardUntil||0)){
      physicalDamage(h,h.maxHp*.20,options.source||'abyss');
      h.physicalEdgeGuardUntil=physicalClock()+2;
      h.physicalLockUntil=Math.max(h.physicalLockUntil||0,physicalClock()+.4);
      state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'낙사 저항!',color:'#e7c66d'});
    }
    return false;
  }
  h.environmentDeath=true;h.lastTrapHitAt=performance.now();h.lastPhysicalSource=options.source||'abyss';
  h.hp=0;h.killerMawang=false;delete h.killerMonsterId;physicalInterrupt(h);
  const fallFlight=physicalNewFlight(h,options.fromR??h.r,options.fromC??h.c,toR,toC,{fall:true,launch:options.launch});
  const hole=state.grid[toR]?.[toC];
  if(hole?.obstacle==='abyss'){
    // Start the source sheet's energy burst as the falling sprite reaches the hole.
    const lead=fallFlight.duration*.65;
    const rt=hole.physicalRuntime||(hole.physicalRuntime={});
    rt.spriteBurst={at:physicalClock()+lead,bornAt:performance.now()+lead*1000/Math.max(1,gameSpeed)};
  }
  state.physicalRingOuts=(state.physicalRingOuts||0)+1;
  state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'낙사!',color:'#c5acff'});
  return true;
}
function physicalForceMove(h,dr,dc,steps,options={}){
  if(!state||!h||h.hp<=0||h._physicalResolving||physicalHeroLocked(h)) return {moved:0,blocked:true};
  if(!Number.isFinite(steps)||!Number.isFinite(dr)||!Number.isFinite(dc)) return {moved:0,blocked:true};
  // A push is one cardinal ray, never a diagonal or a teleport through a wall.
  dr=Math.sign(dr);dc=Math.sign(dc);if(dr)dc=0;if(!dr&&!dc)return {moved:0};
  let distance=Math.min(GRID*2,Math.max(0,Math.floor(steps)));
  if(!distance)return {moved:0};
  if(h.isBoss) distance=Math.max(1,Math.floor(distance*.5));
  const fromR=h.r,fromC=h.c,visited=new Set();let moved=0,fall=false,blocked=false;
  h._physicalResolving=true;physicalInterrupt(h);
  try{
    for(let k=0;k<distance && h.hp>0;k++){
      const nr=h.r+dr,nc=h.c+dc,nt=state.grid[nr]?.[nc];
      if(!inBounds(nr,nc)||nt?.type==='chasm'){
        fall=physicalFall(h,nr,nc,{...options,fromR,fromC});blocked=!fall;break;
      }
      if(!nt||nt.type!=='floor'||nt.isEntrance&&options.protectEntrance||nt.obstacle==='barricade'){
        physicalDamage(h,options.damage||8,options.source);blocked=true;break;
      }
      if(state.monsters.some(m=>m.hp>0&&m.r===nr&&m.c===nc)||(state.mawang&&!state.mawang.dead&&state.mawang.r===nr&&state.mawang.c===nc)||state.heroes.some(o=>o!==h&&o.hp>0&&o.r===nr&&o.c===nc)){
        blocked=true;break;
      }
      h.prevR=h.r;h.prevC=h.c;h.r=nr;h.c=nc;h.lastStepR=dr;h.lastStepC=dc;h.lastMoveAt=performance.now();moved++;
      // Ground pushes sweep floor traps; launched units only contact their landing tile.
      if(!options.launch && nt.obstacle && !physicalDef(nt.obstacle) && nt.obstacle!==options.source){
        const root=obstacleRootPos(nr,nc),key=root?root.r+'_'+root.c:'';
        if(root&&!visited.has(key)){visited.add(key);activateObstacle(h,state.grid[root.r][root.c],'forced',true);}
      }
    }
    if(!fall&&options.launch&&h.hp>0&&moved){
      const target=obstacleRootTile(h.r,h.c);
      if(target&&!physicalDef(target.obstacle)&&target.obstacle!==options.source) activateObstacle(h,target,'forced',true);
    }
    if(!fall&&moved) physicalNewFlight(h,fromR,fromC,h.r,h.c,{launch:!!options.launch});
    if(!fall&&!moved) h.physicalLockUntil=Math.max(h.physicalLockUntil||0,physicalClock()+.2);
  }finally{ delete h._physicalResolving; }
  return {moved,fall,blocked};
}
function physicalStrike(tile,def,geo){
  const targets=physicalTargets(geo.cells),lv=obstacleLevel(tile),dir=physicalDir(tile);
  const mul=lerpLv(lv,1,2.8)*trapAmplifyMul()*trapMasteryAttackDmgMul()*mawangObstacleMultiplier();
  // Farthest-first prevents artificial blocking when a pusher affects a packed lane later.
  targets.sort((a,b)=>(b.r*dir.r+b.c*dir.c)-(a.r*dir.r+a.c*dir.c));
  for(const h of targets){
    physicalDamage(h,def.damage*mul,def.id);
    if(h.hp<=0) continue;
    if(def.push) physicalForceMove(h,dir.r,dir.c,def.push+(lv>=5?1:0)+(lv>=10?1:0),{source:def.id,damage:12*mul,launch:def.id==='spring_launcher'});
    else { h.physicalImpactKind=def.id;h.physicalImpactUntil=physicalClock()+.4;physicalInterrupt(h);h.physicalLockUntil=Math.max(h.physicalLockUntil||0,physicalClock()+(h.isBoss?.2:lv>=5?.6:.4)); }
  }
  if(targets.length){
    state.dungeonStats=state.dungeonStats||{};
    state.dungeonStats.obstaclesTriggered=(state.dungeonStats.obstaclesTriggered||0)+1;
    Sound.trap(def.push?'gust':'spike');
  }
}
function processPhysicalTraps(dt){
  if(state?.phase==='build'){
    for(const row of state.grid)for(const t of row)if(t.physicalRuntime)t.physicalRuntime.armedAt=null;
  }
  if(!state||state.phase!=='invasion'||!Number.isFinite(dt)||dt<=0) return;
  state.physicalClock=(state.physicalClock||0)+dt;state.physicalStamp=performance.now();
  const now=physicalClock();
  for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
    const t=state.grid[r][c],def=physicalDef(t.obstacle);if(!def||def.fixed)continue;
    const rt=t.physicalRuntime||(t.physicalRuntime={readyAt:0});
    const geo=physicalGeometry(r,c,def.id,t.physicalDir);
    rt.fault=!geo.ok;
    if(!geo.ok){rt.armedAt=null;continue;}
    if(rt.armedAt!=null && now+1e-7>=rt.strikeAt){
      physicalStrike(t,def,geo);rt.armedAt=null;rt.firedAt=now;rt.firedRealAt=performance.now();rt.firedSpeed=Math.max(1,gameSpeed);rt.readyAt=now+def.cooldown;
    } else if(rt.armedAt==null && now+1e-7>=(rt.readyAt||0)) armPhysicalTrap(t);
  }
}
function physicalOwnsToken(key){
  return !!state?.physicalFlights?.some(f=>'h'+f.heroId===key && (f.fall || physicalClock()<f.start+f.duration));
}
function physicalVisualClock(){
  if(state?.phase!=='invasion') return physicalClock();
  return physicalClock()+Math.min(TICK_MS/1000,Math.max(0,performance.now()-(state.physicalStamp||performance.now()))/1000*Math.max(1,gameSpeed));
}
function physicalCellClass(cls,r,c,t){
  if(physicalDef(t.obstacle)) cls+=' physical-trap';
  if(t.type==='chasm') cls+=' physical-chasm';
  if(state?.phase==='build'&&state.activeTool==='obstacle'&&physicalDef(state.selectedObstacleType)){
    cls=cls.replace(/\bobstacle-target\b/g,'');
    if(physicalPlacement(r,c,state.selectedObstacleType).ok) cls+=' physical-target';
  }
  return cls;
}
// Vector artwork remains a safe fallback while the supplied PNG atlas loads.
function physicalIcon(id,color){
  const designs={
    wall_crusher:'<rect x="7" y="13" width="19" height="38" rx="3"/><path d="M26 25h17m-17 14h17"/><path d="M44 11v42m0-42l11 7v28l-11 7"/>',
    wall_pusher:'<rect x="5" y="15" width="19" height="34" rx="4"/><path d="M24 32h23m-10-13l13 13-13 13"/>',
    spring_launcher:'<path d="M9 50h44M17 44l25-7-24-7 25-7"/><path d="M9 22l38-12 7 8-39 13z"/>',
    pendulum:'<circle cx="32" cy="9" r="4"/><path d="M32 13v25M19 38h26l9 11-22 11-22-11z"/>',
    abyss:'<ellipse cx="32" cy="34" rx="25" ry="18"/><ellipse cx="32" cy="34" rx="16" ry="10"/><path d="M12 12l6 9m29-12l-7 12M16 52l-6 7m34-9l10 8"/>'
  };
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="12" fill="#171322"/><g fill="#333344" stroke="'+color+'" stroke-width="3" stroke-linejoin="round">'+designs[id]+'</g></svg>');
}
for(const def of Object.values(PHYSICAL_TRAPS)){
  def.physical=true;def.footprint=1;def.range=0;def.spriteFallback=physicalIcon(def.id,def.color);def.sprite=def.spriteFallback;
  if(!OBSTACLE_TYPES.some(o=>o.id===def.id)) OBSTACLE_TYPES.push(def);
}
let physicalLayer=null,physicalLayerGrid=null,physicalLayerState=null;
const physicalDeviceEls=new Map(),physicalFlightEls=new Map();
function physicalEnsureLayer(){
  if(!els.boardInner) return null;
  if(!physicalLayer||!physicalLayer.isConnected){
    physicalLayer=document.createElement('div');physicalLayer.id='physicalTrapLayer';physicalLayer.setAttribute('aria-hidden','true');els.boardInner.appendChild(physicalLayer);
    physicalDeviceEls.clear();physicalFlightEls.clear();
  }
  if(physicalLayerState!==state||physicalLayerGrid!==state?.grid){
    physicalLayer.replaceChildren();physicalDeviceEls.clear();physicalFlightEls.clear();physicalLayerState=state;physicalLayerGrid=state?.grid;
  }
  return physicalLayer;
}
function physicalDeviceMarkup(id){
  const common='<div class="pt-zones"></div><div class="pt-orient"><div class="pt-vector-art">';
  let art='';
  if(id==='wall_crusher'||id==='wall_pusher') art='<div class="pt-housing"><i></i><i></i></div><div class="pt-shaft"></div><div class="pt-head"></div>';
  if(id==='spring_launcher') art='<div class="pt-plinth"></div><div class="pt-spring"></div><div class="pt-flap"></div>';
  if(id==='pendulum') art='<div class="pt-bridge"></div><div class="pt-pivot"></div><div class="pt-arm"><div class="pt-blade"></div></div>';
  if(id==='abyss') art='<div class="pt-hole"></div><div class="pt-rift"></div><div class="pt-dust"><i></i><i></i><i></i></div>';
  return common+art+'</div><div class="pt-sheet-viewport"><div class="pt-sheet-frame"></div></div></div><span class="pt-arrow"></span><span class="pt-level"></span><span class="pt-charge"></span>';
}
function renderPhysicalTraps(){
  const layer=physicalEnsureLayer();if(!layer)return;
  const visible=!!state && state.phase!=='village';layer.hidden=!visible;
  if(!visible){ if(state)state.physicalFlights=[]; return; }
  const px=currentCellPx,now=physicalVisualClock(),seen=new Set();
  layer.style.setProperty('--pt-cell',px+'px');
  for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
    const t=state.grid[r][c],def=physicalDef(t.obstacle);if(!def)continue;
    const key=r+'_'+c;seen.add(key);let node=physicalDeviceEls.get(key);
    if(!node||node.dataset.trap!==def.id){
      if(node)node.remove();node=document.createElement('div');node.className='pt-device pt-'+def.id;node.dataset.trap=def.id;node.innerHTML=physicalDeviceMarkup(def.id);physicalDeviceEls.set(key,node);layer.appendChild(node);
    }
    node._ptTile=t;node._ptRow=r;node._ptCol=c;
    node.style.left=c*px+'px';node.style.top=r*px+'px';node.style.width=px+'px';node.style.height=px+'px';
    node.style.setProperty('--pt-color',def.color);node.style.setProperty('--pt-angle',physicalDir(t).angle+'deg');
    const rt=t.physicalRuntime||{},geo=physicalGeometry(r,c,def.id,t.physicalDir),armed=rt.armedAt!=null;
    const age=rt.firedAt==null?Infinity:Math.max(0,now-rt.firedAt),hit=age<def.recover;
    const selected=state.selected?.kind==='tile'&&state.selected.r===r&&state.selected.c===c;
    node.classList.toggle('pt-armed',armed);node.classList.toggle('pt-hit',hit);node.classList.toggle('pt-fault',!geo.ok);node.classList.toggle('pt-selected',selected);
    node._ptFault=!geo.ok;physicalPaintSprite(node,now);
    const warningProgress=armed?Math.min(1,Math.max(0,(now-rt.armedAt)/def.windup)):0;
    // Advance before the logical hit, reach full extension exactly when damage is resolved.
    const stroke=armed?Math.pow(warningProgress,5)*.88:hit?Math.max(0,1-age/def.recover):0;
    node.style.setProperty('--pt-stroke',(stroke*(def.id==='wall_crusher'?geo.reach||1:1)*px)+'px');
    node.style.setProperty('--pt-flap-angle',(hit?-68*stroke:armed?8:0)+'deg');
    node.style.setProperty('--pt-swing',(armed?-72*Math.sin(Math.PI*warningProgress):hit?72*Math.sin(Math.PI*Math.min(1,age/def.recover)):Math.sin(now*1.6+r)*8)+'deg');
    node.querySelector('.pt-arrow').textContent=def.fixed?'':physicalDir(t).icon;
    node.querySelector('.pt-level').textContent=def.fixed?'':String(obstacleLevel(t));
    const fraction=armed?Math.min(1,Math.max(0,(now-rt.armedAt)/def.windup)):Math.min(1,Math.max(0,1-((rt.readyAt||0)-now)/(def.cooldown||1)));
    node.style.setProperty('--pt-charge',fraction);
    const zoneSig=JSON.stringify(geo.cells);
    if(node.dataset.zones!==zoneSig){
      node.dataset.zones=zoneSig;const zones=node.querySelector('.pt-zones');zones.replaceChildren();
      if(!def.fixed)for(const [nr,nc] of geo.cells){const e=document.createElement('i');e.style.left=(nc-c)*100+'%';e.style.top=(nr-r)*100+'%';zones.appendChild(e);}
    }
  }
  for(const [key,node] of physicalDeviceEls)if(!seen.has(key)){node.remove();physicalDeviceEls.delete(key);}
  // A placement ray, including the destination hole, makes direction unambiguous on touch.
  let preview=layer.querySelector('.pt-preview');if(!preview){preview=document.createElement('div');preview.className='pt-preview';layer.appendChild(preview);}
  preview.replaceChildren();
  if(state.phase==='build'&&state.physicalHover&&physicalDef(state.selectedObstacleType)){
    const {r,c}=state.physicalHover,def=physicalDef(state.selectedObstacleType),geo=physicalPlacement(r,c,def.id);
    if(geo.ok){
      let cells=geo.cells;
      if(def.push){
        const d=physicalDir(),start=def.mount==='wall'?{r:r+d.r,c:c+d.c}:{r,c};cells=[];
        for(let k=0;k<=def.push;k++){
          const nr=start.r+d.r*k,nc=start.c+d.c*k,t=state.grid[nr]?.[nc];
          if(!t||t.type==='rock'||t.type==='core'||t.obstacle==='barricade')break;
          cells.push([nr,nc]);if(t.type==='chasm'||(k>0&&physicalOccupied(nr,nc)))break;
        }
      }
      for(const [nr,nc] of cells){const e=document.createElement('i');e.style.left=nc*px+'px';e.style.top=nr*px+'px';preview.appendChild(e);}
    }
  }
  const flightSeen=new Set();
  state.physicalFlights=(state.physicalFlights||[]).filter(f=>{
    let p=(now-f.start)/f.duration;
    // Final-death cosmetics may finish while the wave result pauses gameplay.
    if(f.fall&&state.phase!=='invasion')p=Math.max(p,(performance.now()-f.bornAt)*Math.max(1,gameSpeed)/(f.duration*1000));
    if(p>=1){physicalFlightEls.get(f.id)?.remove();physicalFlightEls.delete(f.id);return false;}
    p=Math.max(0,p);flightSeen.add(f.id);let node=physicalFlightEls.get(f.id);
    if(!node){node=document.createElement('div');node.className='pt-flight';const img=document.createElement('img');img.src=SPRITE_DATA[f.typeId]||'';img.alt='';node.appendChild(img);physicalFlightEls.set(f.id,node);layer.appendChild(node);}
    const travel=f.fall?Math.min(1,p/.65):p,curve=1-Math.pow(1-travel,2);
    const arc=f.launch?Math.sin(Math.PI*travel)*px*1.1:0;
    const fallProgress=f.fall?Math.max(0,(p-.5)/.5):0;
    node.style.width=px*(f.isBoss?1.8:1.3)*TOKEN_VIEW_SCALE+'px';node.style.height=node.style.width;
    node.style.left=((f.fromC+(f.toC-f.fromC)*curve+.5)*px)+'px';node.style.top=((f.fromR+(f.toR-f.fromR)*curve+.5)*px-arc+fallProgress*px*.4)+'px';
    node.style.transform='translate(-50%,-50%) rotate('+(f.fall?p*140:f.launch?-Math.sin(p*Math.PI)*25:0)+'deg) scale('+Math.max(.03,1-fallProgress)+')';
    node.style.opacity=String(1-fallProgress);return true;
  });
  for(const [id,node] of physicalFlightEls)if(!flightSeen.has(id)){node.remove();physicalFlightEls.delete(id);}
  if(typeof tokenEls!=='undefined'){
    const heroesByKey=new Map(state.heroes.map(h=>['h'+h.id,h]));
    for(const [key,node] of Object.entries(tokenEls)){
      const h=heroesByKey.get(key);
      node.classList.toggle('physical-flying',physicalOwnsToken(key));
      node.classList.toggle('physical-crushed',!!h&&h.physicalImpactKind==='wall_crusher'&&(h.physicalImpactUntil||0)>physicalClock());
      node.classList.toggle('physical-sliced',!!h&&h.physicalImpactKind==='pendulum'&&(h.physicalImpactUntil||0)>physicalClock());
      node.style.setProperty('--pt-impact-ms',Math.max(100,400/Math.max(1,gameSpeed))+'ms');
    }
  }
}
function physicalDirectionButtons(current,disabled=false){
  return '<div class="pt-direction-group" role="group" aria-label="방향 선택">'+PHYSICAL_DIRS.map((d,i)=>'<button type="button" data-pt-dir="'+i+'" aria-pressed="'+(i===current)+'" aria-label="'+d.name+'쪽" '+(disabled?'disabled':'')+'>'+d.icon+'</button>').join('')+'</div>';
}
function updatePhysicalBuildControls(){
  const box=els.panelBox;if(!box||!state)return;
  updatePhysicalShopFilter(box);
  let controls=box.querySelector('#physicalBuildControls');
  const def=physicalDef(state.selectedObstacleType),show=state.phase==='build'&&state.selected?.kind==='tool'&&state.selected.tool==='obstacle'&&def;
  if(!show){controls?.remove();return;}
  const sig=def.id+':'+(state.physicalDirection??1)+':'+(state.physicalNotice||'');
  if(controls?.dataset.sig===sig)return;
  if(!controls){controls=document.createElement('div');controls.id='physicalBuildControls';box.prepend(controls);}
  controls.dataset.sig=sig;
  controls.innerHTML='<div class="pt-control-title">'+def.name+' <small>1칸 '+(def.mount==='wall'?'벽 부착':def.fixed?'지형':'바닥')+'</small></div>'+(def.fixed?'':physicalDirectionButtons(state.physicalDirection??1))+'<p>'+def.desc+'</p><p class="pt-note">'+(state.physicalNotice||'초록 테두리: 설치 가능 · R: 방향 회전')+'</p>';
  controls.querySelectorAll('[data-pt-dir]').forEach(btn=>btn.addEventListener('click',()=>setPhysicalDirection(Number(btn.dataset.ptDir))));
}
function updatePhysicalShopFilter(box){
  let bar=box.querySelector('#physicalShopFilter');
  const list=box.querySelector('.shop-list'),active=state.selected?.kind==='tool'&&state.selected.tool==='obstacle'&&list;
  if(!active){bar?.remove();return;}
  if(!bar){
    bar=document.createElement('div');bar.id='physicalShopFilter';bar.className='pt-shop-filter';
    bar.innerHTML='<button type="button" data-pt-filter="all">전체</button><button type="button" data-pt-filter="physical">벽·지형 5종</button>';
    box.insertBefore(bar,list);
    bar.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
      state.physicalShopOnly=btn.dataset.ptFilter==='physical';list.scrollLeft=0;updatePhysicalShopFilter(box);
    }));
  }
  bar.querySelectorAll('button').forEach(btn=>btn.setAttribute('aria-pressed',String((btn.dataset.ptFilter==='physical')===!!state.physicalShopOnly)));
  for(const card of list.querySelectorAll('[data-place]')){
    const id=card.dataset.place,keep=!state.physicalShopOnly||!!physicalDef(id)||id.startsWith('__');
    if(keep)card.style.removeProperty('display');else card.style.display='none';
  }
}
function setPhysicalDirection(dir){
  if(!state||state.phase!=='build')return;
  state.physicalDirection=((dir%4)+4)%4;state.physicalNotice='';state._mapDirty=true;state._rangesDirty=true;
  updatePhysicalBuildControls();
}
function renderPhysicalPanel(){
  const sel=state?.selected;if(sel?.kind!=='tile')return false;
  const r=sel.r,c=sel.c,tile=state.grid[r]?.[c],def=physicalDef(tile?.obstacle);if(!def)return false;
  const box=els.panelBox,lv=obstacleLevel(tile),cost=obstacleUpgradeCost(def,lv),build=state.phase==='build';
  const geo=physicalGeometry(r,c,def.id,tile.physicalDir);
  const sig=[r,c,def.id,lv,tile.physicalDir,build,state.gold>=cost,geo.ok,state.physicalNotice].join(':');
  if(box.dataset.physicalSig===sig&&box.querySelector('.pt-details'))return true;
  box.dataset.physicalSig=sig;
  box.innerHTML='<section class="pt-details"><h3>'+def.name+(def.fixed?'':' · Lv.'+lv)+'</h3><p>'+def.desc+'</p>'+
    (def.fixed?'<p>통행 불가 · 낙사 지형 · 강화 없음</p>':
      '<p>예고 '+def.windup+'초 · 재사용 '+def.cooldown+'초 (게임 시간)</p><p>'+(!geo.ok?'작동 중지: '+geo.reason:'작동 조건 충족')+'</p>'+physicalDirectionButtons(tile.physicalDir,!build)+
      '<button type="button" class="action-btn" id="ptUpgrade" '+(!build||lv>=10||state.gold<cost?'disabled':'')+'>'+ (lv>=10?'최대 레벨':'강화 → Lv.'+(lv+1)+' · '+cost+'G')+'</button>')+
    '<p class="pt-note">보스: 밀치기 거리 ½, 낙사 대신 최대 HP 20% 피해 (2초 유예). 아군은 피해를 받지 않습니다.</p><p class="pt-note">공통 연구 적용 · 신규 개별 영구 연구는 없음</p>'+
    '<button type="button" class="action-btn" id="ptRemove" '+(!build?'disabled':'')+'>'+ (def.fixed?'심연 메우기':'장애물 제거')+' · 무료</button></section>';
  box.querySelectorAll('[data-pt-dir]').forEach(btn=>btn.addEventListener('click',()=>{rotatePhysicalTrap(r,c,Number(btn.dataset.ptDir));state._panelDirty=true;renderPhysicalPanel();}));
  box.querySelector('#ptUpgrade')?.addEventListener('click',()=>{upgradePhysicalTrap(r,c);renderPhysicalPanel();});
  box.querySelector('#ptRemove')?.addEventListener('click',()=>{if(state.phase!=='build')return;clearPhysicalTrap(r,c);state.selected={kind:'tool',tool:'obstacle'};state._panelDirty=true;renderPanel();});
  return true;
}
if(typeof document!=='undefined'){
  document.addEventListener('keydown',e=>{
    if(e.key.toLowerCase()!=='r'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'')||e.target?.isContentEditable)return;
    if(state?.phase!=='build')return;
    if(state.selected?.kind==='tile'&&physicalDef(state.grid[state.selected.r]?.[state.selected.c]?.obstacle)){
      const {r,c}=state.selected,t=state.grid[r][c];rotatePhysicalTrap(r,c,(t.physicalDir+1)%4);
    }else if(state.activeTool==='obstacle'&&physicalDef(state.selectedObstacleType))setPhysicalDirection((state.physicalDirection??1)+1);
  });
  els.map?.addEventListener('pointermove',e=>{if(state?.phase==='build'&&physicalDef(state.selectedObstacleType))state.physicalHover=cellFromEvent(e.clientX,e.clientY);});
  els.map?.addEventListener('pointerleave',()=>{if(state)state.physicalHover=null;});
}


/* Supplied sprite-sheet integration: render only changed frame positions between UI ticks. */
function physicalPaintSprite(node,now=physicalVisualClock()){
  if(typeof PhysicalTrapSprites==='undefined'||!state||!node?._ptTile)return;
  const tile=node._ptTile,def=physicalDef(tile.obstacle);if(!def)return;
  const realNow=performance.now();
  const ambientNow=state.phase==='build'?realNow/1000:now;
  PhysicalTrapSprites.paint(node,def.id,tile.physicalRuntime||{},now,{
    windup:def.windup,recover:def.recover,fault:node._ptFault,
    ambientNow,seed:(node._ptRow*13+node._ptCol*7)*.071,
    finishCosmetics:state.phase!=='invasion',realNow,speed:gameSpeed
  });
}
function physicalSpriteAnimationFrame(){
  requestAnimationFrame(physicalSpriteAnimationFrame);
  if(typeof document==='undefined'||document.hidden||!state||!physicalLayer||physicalLayer.hidden||!physicalLayer.isConnected)return;
  const now=physicalVisualClock();
  for(const node of physicalDeviceEls.values())physicalPaintSprite(node,now);
}
if(typeof document!=='undefined' && typeof PhysicalTrapSprites!=='undefined'){
  PhysicalTrapSprites.preload((id,status)=>{
    const def=physicalDef(id);if(!def)return;
    def.sprite=status.iconReady?PhysicalTrapSprites.iconURL(id):def.spriteFallback;
    // Preserve stable shop DOM and its mobile scroll position while icons finish loading.
    for(const img of document.querySelectorAll('.shop-item[data-place="'+id+'"] .si-icon')){
      if(img.getAttribute('src')!==def.sprite)img.setAttribute('src',def.sprite);
    }
    if(state){state._mapDirty=true;state._panelDirty=true;}
  });
  requestAnimationFrame(physicalSpriteAnimationFrame);
}
