"use strict";
function chainTriggerNearbyTraps(h,cr,cc,budget){
  const dmgTypes={spike:1,flame:1,lightning:1};
  const relicActive=!!(state.archetypeActive && state.archetypeActive.chainBlast);
  const rlv=trapChainLevel();
  const extraMawangChain=Math.min(.24,mawangSkillRate('trap_chain',.08));
  const chance=relicActive?1:(rlv>=3?0.5:rlv>=2?0.3:0)+extraMawangChain;
  if(chance<=0) return;
  const radius=(relicActive||rlv>=3)?3:2; // "연쇄 범위 +0.5"는 정수 격자라 반경 2→3으로 구현
  const maxTargets=2+(rlv>=4?1:0);
  if(!budget) budget={left:rlv>=5?5:maxTargets};
  let triggered=0;
  for(let r=cr-radius;r<=cr+radius;r++){
    for(let c=cc-radius;c<=cc+radius;c++){
      if(triggered>=maxTargets || budget.left<=0) return;
      if(r===cr&&c===cc) continue;
      if(!inBounds(r,c)) continue;
      if(Math.abs(r-cr)+Math.abs(c-cc)>radius) continue;
      const t=state.grid[r][c];
      if(t && t.obstacle && dmgTypes[t.obstacle] && isObstacleRoot(r,c) && Math.random()<chance){
        activateObstacle(h,t,'chain',true);
        triggered++; budget.left--;
        if(rlv>=5 && budget.left>0) chainTriggerNearbyTraps(h,r,c,budget); // 완전 연쇄: 유발된 함정도 재귀적으로 연쇄
      }
    }
  }
}
function chainTriggerEnabled(){
  return !!(state.archetypeActive && state.archetypeActive.chainBlast) || trapChainLevel()>=2;
}
// v48: 다리가 무너지는 순간, 그 2x2 칸 위에 서 있는 용사를 가장 가까운 안전한 칸으로 밀어냅니다.
// 이게 없으면 용사가 방금 벽(barricade)으로 변한 칸 위에 그대로 남는데, barricade의 둔화 효과가
// 매 틱 다시 걸리면서 움직일 차례 자체를 영영 못 얻는 상태(=멈춰버림)에 빠질 수 있습니다.
function evacuateHeroFromCollapsedBridge(h){
  if(!h) return;
  const startKey=h.r+'_'+h.c;
  const visited=new Set([startKey]);
  const queue=[[h.r,h.c,0]];
  let head=0;
  while(head<queue.length){
    const [r,c,d]=queue[head++];
    if(d>0){
      const t=state.grid[r]?.[c];
      if(t && (t.type==='floor'||t.type==='core') && t.obstacle!=='barricade' && t.obstacle!=='pit' && !(t.obstacle==='collapse_bridge'&&runeGateIsBlocking(t)) && !monsterAt(r,c)){
        h.prevR=h.r; h.prevC=h.c; h.r=r; h.c=c; h.lastMoveAt=performance.now();
        h.barricadeSlowUntil=0; // 방금 벗어났으니 굳어있던 둔화 효과도 함께 풀어줍니다.
        return;
      }
    }
    if(d>=6) continue; // 6칸 넘게 뒤져야 한다면 이 던전 구조 자체가 막혀 있다는 뜻이라 중단합니다.
    for(const [nr,nc] of neighbors4(r,c)){
      const key=nr+'_'+nc;
      if(visited.has(key)) continue;
      visited.add(key);
      queue.push([nr,nc,d+1]);
    }
  }
}
/* v61 · 장애물 발동 애니메이션 신호.
   침공 중 지도 칸은 "변경 신호(_mapDirty)"나 벽 파기 중일 때만 다시 그려지기 때문에, triggerFxUntil 만 설정하면
   발동 프레임/펄스가 화면에 반영되지 않았습니다(기존 신규 장애물의 발동 연출도 마찬가지).
   시작 시점과 종료 시점에 지도 갱신을 요청해서 재생/복귀가 정확히 반영되게 합니다. */
function markObstacleTrigger(tile,ms){
  if(!tile) return 0;
  const until=performance.now()+ms; tile.triggerFxUntil=until;
  if(typeof state!=='undefined' && state){ state._mapDirty=true; setTimeout(()=>{ if(state) state._mapDirty=true; },ms+40); }
  return until;
}
function cardinalDirection(dr,dc){
  if(Math.abs(dr)>=Math.abs(dc)&&dr!==0) return {r:Math.sign(dr),c:0};
  if(dc!==0) return {r:0,c:Math.sign(dc)};
  return {r:0,c:1};
}
function obstacleDirection(tile,fr=0,fc=1){
  const r=Math.sign(Number(tile?.obstacleDirR)||0),c=Math.sign(Number(tile?.obstacleDirC)||0);
  return r?{r,c:0}:c?{r:0,c}:{r:fr,c:fc};
}
function flameSprayerTargets(root,rootTile,range){
  const d=obstacleDirection(rootTile,0,1),cells=new Set([root.r+'_'+root.c]);
  for(let k=1;k<=range;k++){
    const r=root.r+d.r*k,c=root.c+d.c*k;
    if(!inBounds(r,c)) break;
    const tile=state.grid[r]?.[c];
    if(!tile || tile.type==='rock' || tile.obstacle==='barricade' || (tile.obstacle==='collapse_bridge'&&runeGateIsBlocking(tile))) break;
    cells.add(r+'_'+c);
  }
  return state.heroes.filter(h=>h.hp>0&&cells.has(h.r+'_'+h.c));
}
function triggerFlameSprayer(root,rootTile,lv,now=performance.now()){
  if(!rootTile||now<(rootTile.gustNextAt||0)) return false;
  const range=FLAME_SPRAYER_RANGE+(lv>=5?1:0)+(lv>=10?1:0);
  const targets=flameSprayerTargets(root,rootTile,range);
  if(!targets.length) return false;
  const cooldown=Math.max(3000,FLAME_SPRAYER_COOLDOWN_MS-(lv-1)*90);
  rootTile.gustNextAt=now+cooldown;
  const d=obstacleDirection(rootTile,0,1),globalMul=trapAmplifyMul()*trapMasteryAttackDmgMul()*mawangObstacleMultiplier();
  const base=Math.max(1,Math.round(FLAME_SPRAYER_DMG*lerpLv(lv,1,2.25)*globalMul));
  const burnDps=FLAME_SPRAYER_BURN_DPS*lerpLv(lv,1,2.15)*globalMul;
  const burnMs=FLAME_SPRAYER_BURN_MS+(lv>=5?500:0)+(lv>=10?500:0);
  const knock=FLAME_SPRAYER_KNOCK_TILES+(lv>=10?1:0);
  // Farthest-first prevents a front target from blocking every hero behind it during knockback.
  targets.sort((a,b)=>(b.r*d.r+b.c*d.c)-(a.r*d.r+a.c*d.c));
  for(const h of targets){
    h.hp-=base;h.lastTrapHitAt=now;
    h.flameBurnUntil=Math.max(h.flameBurnUntil||0,now+burnMs);
    h.flameBurnDps=Math.max(h.flameBurnDps||0,burnDps);
    state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:base,color:'#ff8b45'},{type:'floatText',r:h.r,c:h.c,text:'🔥 화상',color:'#ffae55'});
    if(h.hp>0&&typeof physicalForceMove==='function') physicalForceMove(h,d.r,d.c,knock,{source:'gust',damage:1,launch:false});
    sayHero(h,pickHeroDialogue('trapFlame'),'trapHit',1000,true);
  }
  markObstacleTrigger(rootTile,1000);Sound.trap('gust');
  const fxTarget=targets[0]||null;
  state.fxEvents.push(
    {type:'trapFlameJet',r:root.r,c:root.c,dr:d.r,dc:d.c,range,lv,toR:fxTarget?fxTarget.r:null,toC:fxTarget?fxTarget.c:null},
    {type:'obstacleBurst',r:root.r,c:root.c,ob:'gust',text:'🔥',footprint:1}
  );
  return true;
}
function harpoonPullOneStep(h,rootR,rootC){
  if(!h||h.hp<=0) return false;
  const currentDist=Math.abs(rootR-h.r)+Math.abs(rootC-h.c),candidates=[];
  for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const nr=h.r+dr,nc=h.c+dc,nt=state.grid[nr]?.[nc];
    if(!nt||(nt.type!=='floor'&&nt.type!=='core')||nt.obstacle==='barricade'||(nt.obstacle==='collapse_bridge'&&runeGateIsBlocking(nt))) continue;
    if(monsterAt(nr,nc)||(isHeroAt(nr,nc)&&!(nr===h.r&&nc===h.c))) continue;
    const d=Math.abs(rootR-nr)+Math.abs(rootC-nc);
    if(d<currentDist)candidates.push({r:nr,c:nc,d});
  }
  if(!candidates.length)return false;
  candidates.sort((a,b)=>a.d-b.d);const step=candidates[0],nt=state.grid[step.r]?.[step.c];
  if(nt?.obstacle==='pit'){
    const res=resolveAbyssPitForcedContact(h,step.r,step.c,{source:'magnet',fromR:h.r,fromC:h.c});
    if(res?.resolved)return true;
  }
  h.prevR=h.r;h.prevC=h.c;h.lastStepR=step.r-h.r;h.lastStepC=step.c-h.c;h.r=step.r;h.c=step.c;h.lastMoveAt=performance.now();h.stuckTicks=0;
  if(nt?.obstacle&&nt.obstacle!=='magnet')activateObstacle(h,nt,'forced',true);
  return true;
}
function selectHarpoonTarget(root,rootTile,range){
  const d=obstacleDirection(rootTile,0,1),now=performance.now();
  for(let k=1;k<=range;k++){
    const r=root.r+d.r*k,c=root.c+d.c*k;if(!inBounds(r,c))break;
    const tile=state.grid[r]?.[c];
    if(!tile||tile.type==='rock'||tile.obstacle==='barricade'||(tile.obstacle==='collapse_bridge'&&runeGateIsBlocking(tile)))break;
    const target=state.heroes.find(h=>h.hp>0&&h.r===r&&h.c===c&&(h.harpoonImmuneUntil||0)<=now);
    if(target)return target;
  }
  return null;
}
function triggerHarpoonPulse(root,rootTile,lv,now=performance.now()){
  if(!rootTile||now<(rootTile.harpoonNextAt||0))return false;
  const range=HARPOON_RANGE+(lv>=5?1:0),target=selectHarpoonTarget(root,rootTile,range);if(!target)return false;
  const harpoonTargetR=target.r,harpoonTargetC=target.c;
  rootTile.harpoonNextAt=now+Math.max(3500,HARPOON_COOLDOWN_MS-(lv-1)*165);
  const face=obstacleDirection(rootTile,0,1);rootTile.harpoonDirR=face.r;rootTile.harpoonDirC=face.c;
  const globalMul=trapAmplifyMul()*trapMasteryAttackDmgMul()*mawangObstacleMultiplier();
  const dmg=Math.max(1,Math.round(HARPOON_DMG*lerpLv(lv,1,2.4)*globalMul));
  target.hp-=dmg;target.lastTrapHitAt=now;target.harpoonImmuneUntil=Math.max(target.harpoonImmuneUntil||0,now+HARPOON_REHIT_IMMUNE_MS);
  let moved=0;for(let i=0;i<HARPOON_PULL_TILES+(lv>=10?1:0)&&target.hp>0;i++){if(!harpoonPullOneStep(target,root.r,root.c))break;moved++;}
  const stunMs=HARPOON_STUN_MS+(lv>=5?250:0)+(lv>=10?250:0);target.stunTicks=Math.max(target.stunTicks||0,Math.ceil(stunMs/TICK_MS));
  state.fxEvents.push({type:'damageNumber',r:target.r,c:target.c,amount:dmg,color:'#c9a0ff'},{type:'floatText',r:target.r,c:target.c,text:moved?'🪝 견인!':'🪝 작살!',color:'#d9b7ff'});
  markObstacleTrigger(rootTile,1000);Sound.trap('magnet');sayHero(target,pickHeroDialogue('trapMagnet'),'trapHit',1100,true);
  state.fxEvents.push(
    {type:'trapHarpoon',fromR:root.r,fromC:root.c,toR:harpoonTargetR,toC:harpoonTargetC,lv},
    {type:'obstacleBurst',r:root.r,c:root.c,ob:'magnet',text:'🪝',footprint:1}
  );
  return true;
}
// Compatibility name retained for old callers / AI code.
function triggerMagnetPulse(root,rootTile,lv,now){return triggerHarpoonPulse(root,rootTile,lv,now);}
function runeGateClosedMs(tile){return RUNE_GATE_CLOSED_MS+Math.round((obstacleLevel(tile)-1)*(1000/(OBSTACLE_LEVEL_MAX-1)));}
function runeGateIsBlocking(tile,now=performance.now()){
  if(!tile||tile.obstacle!=='collapse_bridge')return false;
  if(tile.runeGatePermanent)return true;
  const start=Number(tile.runeGateCycleStartedAt)||0;if(!start)return false;
  const closedMs=runeGateClosedMs(tile),cycle=RUNE_GATE_OPEN_MS+closedMs,phase=((now-start)%cycle+cycle)%cycle;
  return phase>=RUNE_GATE_OPEN_MS;
}
function processRuneGateState(r,c,tile,lv,now=performance.now()){
  if(!tile||tile.obstacle!=='collapse_bridge')return;
  if(!tile.runeGateCycleStartedAt)tile.runeGateCycleStartedAt=now;
  const closed=runeGateIsBlocking(tile,now);
  if(!!tile.runeGateClosed===closed)return;
  tile.runeGateClosed=closed;state._mapDirty=true;state._rangesDirty=true;dungeonStructureInvalidate();
  state.fxEvents.push(
    {type:'trapRuneGate',r,c,state:closed?'closed':'open',lv},
    {type:'floatText',r,c,text:closed?'🌀 봉쇄':'🌀 개방',color:closed?'#d49bff':'#a9e7ff'}
  );
  if(closed){for(const h of state.heroes){if(h.hp>0&&h.r===r&&h.c===c)evacuateHeroFromCollapsedBridge(h);}}
}
function applyCursePulse(h,rootTile,lv,now,force=false){
  if(!h||h.hp<=0)return false;
  if(!force&&now<(h.obstacleCurseNextPulseAt||0))return false;
  const rlv=trapResearchLevel('curse');
  const duration=lerpLv(lv,CURSE_PULSE_MIN_MS,CURSE_PULSE_MAX_MS)*Math.min(1.25,trapMasteryControlDurMul());
  const baseMul=lerpLv(lv,.90,.72);
  const researchPenalty=(rlv-1)*.02;
  h.obstacleCurseUntil=now+duration;
  h.obstacleCurseMul=Math.max(.62,baseMul-researchPenalty);
  h.obstacleCurseHealMul=lv>=10?.70:(rlv>=3?.82:.90);
  h.obstacleCurseNextPulseAt=now+CURSE_PULSE_INTERVAL_MS;
  if(rlv>=4)h.obstacleCurseDefPenalty=0.05;
  if(rlv>=5)h.obstacleCurseLv5=true;
  if(now-(h.obstacleCurseFxAt||0)>700){
    state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'☠ 저주',color:'#43e78b'});
    h.obstacleCurseFxAt=now;
  }
  return true;
}

function applyTimedObstaclePoison(h,damage,now=performance.now(),source='poison'){
  if(!h||h.hp<=0) return false;
  h.obstaclePoisonUntil=Math.max(h.obstaclePoisonUntil||0,now+POISON_DURATION_MS);
  h.obstaclePoisonTickDamage=Math.max(h.obstaclePoisonTickDamage||0,Math.max(1,damage));
  if(!h.obstaclePoisonNextTickAt||h.obstaclePoisonNextTickAt<now) h.obstaclePoisonNextTickAt=now+POISON_TICK_MS;
  h.obstaclePoisonSource=source;
  return true;
}
function resolveAbyssPitForcedContact(h,r,c,options={}){
  const tile=state?.grid?.[r]?.[c]; if(!h||h.hp<=0||tile?.obstacle!=='pit') return null;
  const root=obstacleRootPos(r,c)||{r,c},rootTile=state.grid[root.r]?.[root.c]||tile,lv=obstacleLevel(rootTile),now=performance.now();
  const pitResearch=trapResearchLevel('pit');
  if(h.isBoss){
    const pct=Math.min(.45,lerpLv(lv,.22,.36)+(pitResearch-1)*.015+(state.archetypeActive&&state.archetypeActive.pitMaze?0.06:0));
    const dmg=Math.max(1,Math.round(h.maxHp*pct));
    h.hp-=dmg;h.lastTrapHitAt=now;h.stunTicks=Math.max(h.stunTicks||0,Math.round((800+(pitResearch-1)*100)/TICK_MS));
    state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:dmg,color:'#c5acff'},{type:'floatText',r:h.r,c:h.c,text:'심연 충격!',color:'#d9c9ff'});
    Sound.trap('pit');
    return {resolved:true,fall:false,blocked:true};
  }
  const fromR=options.fromR??h.r,fromC=options.fromC??h.c;
  h.prevR=h.r;h.prevC=h.c;h.r=r;h.c=c;h.environmentDeath=true;h.lastTrapHitAt=now;h.hp=0;h.killerMawang=false;delete h.killerMonsterId;
  if(typeof physicalInterrupt==='function') physicalInterrupt(h);
  if(typeof physicalNewFlight==='function') physicalNewFlight(h,fromR,fromC,r,c,{fall:true,launch:!!options.launch});
  state.physicalRingOuts=(state.physicalRingOuts||0)+1;
  state.fxEvents.push({type:'floatText',r,c,text:'낙사!',color:'#c5acff'},{type:'obstacleBurst',r,c,ob:'pit',text:'🕳'});
  Sound.trap('pit');
  return {resolved:true,fall:true,blocked:false};
}
function heroObstacleMoveMul(h,now=performance.now()){
  let mul=1;
  if(h.frostSlowUntil&&now<h.frostSlowUntil) mul=Math.min(mul,h.frostSlowMul||.8);
  if(h.webSlowUntil&&now<h.webSlowUntil) mul=Math.min(mul,h.webSlowMul||.75);
  if(h.monsterSlowUntil&&now<h.monsterSlowUntil) mul=Math.min(mul,.75);
  return Math.max(.2,Math.min(1,mul));
}
function heroMovementAllowedThisStep(h){
  const serial=state?._heroMoveSerial||0;
  if(h._movePermitSerial===serial) return h._movePermitResult!==false;
  h._movePermitSerial=serial;
  const mul=heroObstacleMoveMul(h);
  if(mul>=.999){h._movePermitResult=true;return true;}
  h._moveSlowCredit=(h._moveSlowCredit||0)+mul;
  const ok=h._moveSlowCredit>=1;
  if(ok)h._moveSlowCredit-=1;
  h._movePermitResult=ok;
  return ok;
}

function activateObstacle(h,tile,trigger='contact',chained=false){
  if(!h||h.hp<=0||!tile?.obstacle) return false;
  if(typeof physicalDef==='function' && physicalDef(tile.obstacle)) return armPhysicalTrap(tile);
  const root=obstacleRootPos(tile.obstacleRootR??h.r,tile.obstacleRootC??h.c) || obstacleRootPos(h.r,h.c) || {r:h.r,c:h.c};
  const rootTile=state.grid[root.r]?.[root.c] || tile;
  const ob=OBSTACLE_TYPES.find(o=>o.id===rootTile.obstacle); if(!ob) return false;
  const center=typeof obstacleFxCenter==='function'?obstacleFxCenter(root.r,root.c,ob.id,rootTile):{r:root.r+.5,c:root.c+.5};
  const visualFootprint=typeof obstacleVisualFootprint==='function'?obstacleVisualFootprint(ob.id,rootTile):2;
  // 그림자 도적 등 trapIgnoreChance를 가진 용사는 일정 확률로 함정을 완전히 무시하고 지나갑니다.
  // (연쇄로 유발된 함정은 본인이 직접 밟은 게 아니라서 이 판정을 적용하지 않습니다.)
  if(!chained){
    const ht=heroTypeOf(h);
    if(ht && ht.trapIgnoreChance && Math.random()<ht.trapIgnoreChance){
      state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'회피!',color:'#c9a8ff'});
      return false;
    }
  }
  const lv=obstacleLevel(rootTile), range=obstacleRange(ob.id,rootTile), now=performance.now();
  const key=root.r+'_'+root.c+'_'+ob.id+'_'+lv;
  if(!chained && h.obstacleContactKey===key && now<(h.obstacleContactUntil||0)) return false;
  if(!chained){ h.obstacleContactKey=key; h.obstacleContactUntil=now+(ob.id==='poison'?650:ob.id==='web'?700:ob.id==='flame'?1000:ob.id==='lightning'?1300:ob.id==='magnet'?500:ob.id==='gust'?1100:ob.id==='stun_cage'?1600:900); }
  // v35 함정 연구소 "은폐술" Lv.5(기습 함정): 용사가 어떤 함정 종류를 처음 만나는 순간 그 함정의 효과가 강화됩니다.
  let isAmbush=false;
  if(!chained){
    if(!h.metTrapTypes) h.metTrapTypes=new Set();
    if(!h.metTrapTypes.has(ob.id)){ isAmbush=true; h.metTrapTypes.add(ob.id); }
  }
  const ambushMul=1+(isAmbush?trapAmbushBonus():0);
  const affected=state.heroes.filter(x=>x.hp>0&&obstacleDistanceToHero(root.r,root.c,x.r,x.c)<=range);
  const redesigned=['gust','magnet','stun_cage','collapse_bridge'].includes(ob.id);
  if(!redesigned) for(const x of affected) x.lastTrapHitAt=now;
  if(!redesigned && OBSTACLE_TRIGGER_FX_MS[ob.id]) markObstacleTrigger(rootTile,OBSTACLE_TRIGGER_FX_MS[ob.id]); // 리메이크 장애물은 각 고유 발동 타이밍에서 직접 신호
  state.fxEvents.push({type:'obstacleImpact',r:center.r,c:center.c,ob:ob.id,strong:lv>=5,label:lv>=10?'LV.10!':'LV.'+lv,key:'h'+h.id,footprint:visualFootprint});

  if(ob.id==='spike'){
    const rlv=trapResearchLevel('spike');
    const armorPenBonus=rlv>=4?0.08:0, executeBonus=rlv>=5?0.20:0, bleedBonusMs=rlv>=3?500:0;
    const globalMul=(1+(rlv-1)*0.04)*trapAmplifyMul()*trapMasteryAttackDmgMul()*ambushMul*mawangObstacleMultiplier();
    const base=SPIKE_DMG*lerpLv(lv,1,4)*globalMul;
    for(const x of affected){
      const d=Math.abs(x.r-h.r)+Math.abs(x.c-h.c),fall=d===0?1:d===1?.55:.3;
      let dmg=Math.max(1,Math.round(base*fall));
      if(lv>=10&&x.hp<=x.maxHp*.3)dmg=Math.round(dmg*1.5);
      if(armorPenBonus && (x.def||0)>=3) dmg=Math.round(dmg*(1+armorPenBonus));
      if(executeBonus && x.hp<=x.maxHp*.2) dmg=Math.round(dmg*(1+executeBonus));
      x.hp-=dmg; if(lv>=5)x.obstacleBleedUntil=now+(lv>=10?4000:2200)+bleedBonusMs;
      state.fxEvents.push({type:'damageNumber',r:x.r,c:x.c,amount:dmg,color:'#ff6873'});
      sayHero(x,pickHeroDialogue('trapSpike'),'trapHit',1200,true);
    }
    Sound.trap('spike'); state.fxEvents.push({type:'obstacleBurst',r:root.r+0.5,c:root.c+0.5,ob:'spike',text:'✦',footprint:2});
    if(chainTriggerEnabled() && !chained) chainTriggerNearbyTraps(h,h.r,h.c);
    return true;
  }
  if(ob.id==='flame'){
    // v72 용암지대: 진입 순간 폭발/잔류 화상이 아니라, 실제로 밟고 있는 동안 지속 피해를 받습니다.
    if(!chained){
      Sound.trap('flame');
      state.fxEvents.push({type:'obstacleSpecial',r:center.r,c:center.c,ob:'flame',footprint:visualFootprint});
      sayHero(h,pickHeroDialogue('trapFlame'),'trapHit',1000,true);
    }
    return true;
  }
  if(ob.id==='lightning'){
    if(!chained && now<(rootTile.lightningNextPulseAt||0)) return false;
    if(!chained) rootTile.lightningNextPulseAt=now+1300;
    const rlv=trapResearchLevel('lightning');
    const resonanceMul=1+(state.trapLightningResonanceUntil&&now<state.trapLightningResonanceUntil?0.25:0);
    const globalMul=(1+(rlv-1)*0.04)*trapAmplifyMul()*trapMasteryAttackDmgMul()*ambushMul*resonanceMul;
    const targets=affected;
    for(const x of targets){
      const dmg=Math.max(1,Math.round(LIGHTNING_DMG*lerpLv(lv,1,2.5)*globalMul));
      x.hp-=dmg;
      if(Math.random()<LIGHTNING_STUN_CHANCE){
        x.stunTicks=Math.max(x.stunTicks||0,Math.round(LIGHTNING_STUN_MS/TICK_MS));
        state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:'⚡ 기절!',color:'#b9f2ff'});
      }
      state.fxEvents.push({type:'damageNumber',r:x.r,c:x.c,amount:dmg,color:'#8fe7ff'},{type:'obstacleBurst',r:x.r,c:x.c,ob:'lightning',text:'⚡'});
      sayHero(x,pickHeroDialogue('trapLightning'),'trapHit',1000,true);
    }
    if(rlv>=5 && targets.length>=3) state.trapLightningResonanceUntil=now+6000;
    if(targets.length) Sound.trap('lightning');
    return true;
  }
  if(ob.id==='poison'){
    const rlv=trapResearchLevel('poison');
    const tick=Math.max(1,Math.round(POISON_DPS*lerpLv(lv,1,2.4)*(1+(rlv-1)*.05)*trapAmplifyMul()*trapMasteryAttackDmgMul()*ambushMul));
    for(const x of affected){
      applyTimedObstaclePoison(x,tick,now,'poison');
      state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:'☠ 중독 5초',color:'#78f06b'});
      sayHero(x,pickHeroDialogue('trapPoison'),'trapHit',1000,true);
    }
    if(affected.length){Sound.trap('poison');state.fxEvents.push({type:'obstacleSpecial',r:center.r,c:center.c,ob:'poison',footprint:visualFootprint});}
    return true;
  }
  if(ob.id==='barricade'){
    // 철벽은 이동 디버프 함정이 아니라 실제 공격으로 파괴해야 하는 구조물입니다.
    if(!chained) sayHero(h,pickHeroDialogue('trapBarricade'),'trapHit',1000,true);
    return true;
  }
  if(ob.id==='pit'){
    // 정상 이동 AI는 심연구덩이를 통행 불가로 취급합니다. 낙사는 강제 이동 처리에서만 발생합니다.
    return false;
  }
  if(ob.id==='statue'){
    Sound.trap('statue');
    state.fxEvents.push({type:'obstacleAuraPulse',r:root.r+0.5,c:root.c+0.5,ob:'statue',lv,footprint:2});
    return true;
  }
  if(ob.id==='frost'){
    const rlv=trapResearchLevel('frost');
    const slow=Math.max(.2,lerpLv(lv,.80,.45)-(rlv-1)*.025-((state.archetypeActive&&state.archetypeActive.glacial)?0.06:0));
    for(const x of affected){
      x.frostSlowUntil=Math.max(x.frostSlowUntil||0,now+900);
      x.frostSlowMul=Math.min(x.frostSlowMul||1,slow);
      state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:`❄ 이동속도 -${Math.round((1-slow)*100)}%`,color:'#66d9ff'});
      sayHero(x,pickHeroDialogue('trapFrost'),'trapHit',900,true);
    }
    if(affected.length)Sound.trap('frost');
    state.fxEvents.push({type:'obstacleSpecial',r:center.r,c:center.c,ob:'frost',footprint:visualFootprint});return true;
  }
  if(ob.id==='web'){
    const rlv=trapResearchLevel('web');
    const slow=Math.max(.25,lerpLv(lv,.75,.42)-(rlv-1)*.02-((state.archetypeActive&&state.archetypeActive.glacial)?0.06:0));
    const poisonTick=Math.max(1,Math.round(POISON_DPS*lerpLv(lv,.8,1.8)*(1+(rlv-1)*.08)*trapAmplifyMul()));
    for(const x of affected){
      x.webSlowUntil=Math.max(x.webSlowUntil||0,now+1200);
      x.webSlowMul=Math.min(x.webSlowMul||1,slow);
      if(Math.random()<WEB_STUN_CHANCE){
        x.stunTicks=Math.max(x.stunTicks||0,Math.round(WEB_STUN_MS/TICK_MS));
        applyTimedObstaclePoison(x,poisonTick,now,'web');
        state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:'🕸 기절 + 중독!',color:'#d8f0dc'});
      }else state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:`🕸 이동속도 -${Math.round((1-slow)*100)}%`,color:'#eee8f4'});
      sayHero(x,pickHeroDialogue('trapWeb'),'trapHit',900,true);
    }
    if(affected.length)Sound.trap('web');
    state.fxEvents.push({type:'obstacleBurst',r:center.r,c:center.c,ob:'web',text:'🕸',footprint:visualFootprint});return true;
  }
  if(ob.id==='curse'){
    const curseTargets=state.heroes.filter(x=>x.hp>0&&obstacleDistanceToHero(root.r,root.c,x.r,x.c)<=range);
    let applied=0;
    for(const x of curseTargets){
      if(applyCursePulse(x,rootTile,lv,now,false)){applied++;sayHero(x,pickHeroDialogue('trapCurse'),'trapHit',1000,true);}
    }
    if(applied){Sound.trap('curse');markObstacleTrigger(rootTile,420);}
    state.fxEvents.push({type:'obstacleAuraPulse',r:root.r+0.5,c:root.c+0.5,ob:'curse',lv,footprint:2});return true;
  }
  // 리메이크 장애물 — 각 고유 컨셉 효과를 처리합니다.
  if(ob.id==='gust') return triggerFlameSprayer(root,rootTile,lv,now);
  if(ob.id==='magnet') return triggerHarpoonPulse(root,rootTile,lv,now);
  if(ob.id==='stun_cage'){
    if(now<(rootTile.mimicNextAt||0))return false;
    if(now<(h.mimicRehitImmuneUntil||0))return false;
    const dur=Math.round(lerpLv(lv,MIMIC_HOLD_MS,3000)),total=Math.round(lerpLv(lv,MIMIC_TOTAL_DMG,36)*trapAmplifyMul()*trapMasteryAttackDmgMul()*mawangObstacleMultiplier());
    rootTile.mimicNextAt=now+Math.max(5200,MIMIC_COOLDOWN_MS-(lv-1)*200);
    h.mimicHoldUntil=Math.max(h.mimicHoldUntil||0,now+dur);h.mimicNextTickAt=now;h.mimicTickDamage=Math.max(1,Math.round(total/Math.max(1,Math.ceil(dur/MIMIC_TICK_MS))));h.mimicRehitImmuneUntil=Math.max(h.mimicRehitImmuneUntil||0,now+dur+MIMIC_REHIT_IMMUNE_MS);
    h.mimicVulnerabilityUntil=Math.max(h.mimicVulnerabilityUntil||0,now+dur);h.mimicVulnerabilityMul=Math.max(h.mimicVulnerabilityMul||1,lerpLv(lv,MIMIC_VULN_MUL,1.35));h.lastTrapHitAt=now;
    markObstacleTrigger(rootTile,dur);Sound.trap('stun_cage');
    state.fxEvents.push(
      {type:'trapMimicChomp',r:h.r,c:h.c,duration:dur,lv},
      {type:'floatText',r:h.r,c:h.c,text:`👅 포획! 받는 피해 +${Math.round((h.mimicVulnerabilityMul-1)*100)}%`,color:'#ff8fd0'},
      {type:'obstacleBurst',r:root.r,c:root.c,ob:'stun_cage',text:'📦',footprint:1}
    );
    sayHero(h,pickHeroDialogue('trapStunCage'),'trapHit',1400,true);return true;
  }
  if(ob.id==='collapse_bridge'){
    if(runeGateIsBlocking(rootTile,now))return false;
    rootTile.runeGateTouches=(rootTile.runeGateTouches||0)+1;const need=RUNE_GATE_STABILITY;
    state.fxEvents.push({type:'floatText',r:root.r,c:root.c,text:`🌀 안정도 ${Math.max(0,need-rootTile.runeGateTouches)}/${need}`,color:'#b889ff'});
    if(rootTile.runeGateTouches>=need){
      rootTile.runeGatePermanent=true;rootTile.runeGateClosed=true;state._mapDirty=true;state._rangesDirty=true;dungeonStructureInvalidate();markObstacleTrigger(rootTile,900);
      const seal=Math.max(1,Math.round(RUNE_GATE_SEAL_DMG*lerpLv(lv,1,2)*trapAmplifyMul()));h.hp-=seal;h.lastTrapHitAt=now;
      state.fxEvents.push(
        {type:'trapRuneGate',r:root.r,c:root.c,state:'sealed',lv},
        {type:'damageNumber',r:h.r,c:h.c,amount:seal,color:'#cf9aff'},
        {type:'floatText',r:root.r,c:root.c,text:'🌀 영구 봉인!',color:'#e1b2ff'}
      );
      if(h.hp>0)evacuateHeroFromCollapsedBridge(h);
    }
    Sound.trap('collapse_bridge');return true;
  }
  return false;
}

function handleHeroTileEnter(h, tile){
  if(tile?.obstacle) activateObstacle(h,tile,'contact');
  if(typeof physicalNotifyEntry==='function') physicalNotifyEntry(h);
}

function midwaveDifficultyScale(){
  const w=state?.wave||0;
  return (w>=11 && w<=20) ? MIDWAVE_DIFFICULTY_MUL : 1;
}
function heroPower(h){ return Math.max(1,(h.atk*1.4)+(h.def*1.2)+(h.maxHp/18)); }
function monsterPower(m){ return Math.max(1,(m.atk*1.5)+(m.def*1.4)+(m.maxHp/22)); }
function findThreateningMonster(h){
  let best=null,bestD=Infinity,bestIdx=Infinity;
  const range=heroMonsterSightRange(h);
  const spatial=typeof getMonsterCombatSpatialIndex==='function'?getMonsterCombatSpatialIndex():state?._monsterCombatSpatial;
  const candidates=combatSpatialCandidates(spatial,h.r,h.c,range);
  if(candidates){
    for(const item of candidates){
      const m=item.e,d=Math.abs(m.r-h.r)+Math.abs(m.c-h.c);
      if(d<=range&&(d<bestD||(d===bestD&&item.i<bestIdx))&&!losBlocked(h.r,h.c,m.r,m.c)){best=m;bestD=d;bestIdx=item.i;}
    }
  }else{
    for(let i=0;i<state.monsters.length;i++){
      const m=state.monsters[i],d=Math.abs(m.r-h.r)+Math.abs(m.c-h.c);
      if(d<=range&&d<bestD&&!losBlocked(h.r,h.c,m.r,m.c)){best=m;bestD=d;bestIdx=i;}
    }
  }
  return {monster:best,dist:bestD};
}
function findFleeTarget(h, threat){
  // v88 combat-opt: 후보 배열을 만들고 정렬하지 않고, 같은 순서로 점수를 계산하며 최댓값만 유지합니다.
  // Math.random() 호출 횟수/순서와 동률 시 먼저 나온 칸을 유지하므로 기존 도주 결과 규칙은 같습니다.
  let best=null,bestScore=-Infinity;
  const baseDist=threat?Math.abs(threat.r-h.r)+Math.abs(threat.c-h.c):0;
  for(let r=1;r<GRID-1;r++) for(let c=1;c<GRID-1;c++){
    const t=state.grid[r][c];
    if(t.type!=='floor'||t.obstacle==='barricade'||t.obstacle==='pit'||(t.obstacle==='collapse_bridge'&&runeGateIsBlocking(t))||monsterAt(r,c)||isHeroAt(r,c)) continue;
    const dThreat=threat?Math.abs(r-threat.r)+Math.abs(c-threat.c):0;
    const dStart=Math.abs(r-h.r)+Math.abs(c-h.c);
    // 너무 멀리 달리지 않고, 위협에서 충분히 떨어진 내부 공간을 선택
    if(dThreat<Math.max(3,baseDist+3)||dStart<2) continue;
    const score=dThreat*2-dStart*.35+Math.random()*1.5;
    if(score>bestScore){ bestScore=score; best=[r,c]; }
  }
  return best;
}
function startFlee(h,threat){
  if(h.fleeing||!threat) return;
  h.fleeing=true;
  h.fleeTarget=findFleeTarget(h,threat);
  h.fleeTicks=0;
  h.digging=false; h.digProgress=0; h.digKind=null;
  sayHero(h,pickHeroDialogue('flee'),'flee',2200,true);
  addLog(`${HERO_TYPES.find(x=>x.id===h.typeId)?.name||'용사'}가 강력한 몬스터를 피해 잠시 후퇴합니다.`);
}

function coreDetected(h){
  const d=Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C);
  return d<=HERO_SIGHT_RANGE && !losBlocked(h.r,h.c,CORE_R,CORE_C);
}
// v88 combat-opt · 균일 가중치 격자 최단경로 공용 BFS.
// 기존 Map/Set 기반 다익스트라와 동일한 상→하→좌→우 탐색 순서/동률 규칙을 유지하면서,
// 문자열 키·전체 dist 재스캔을 제거해 유닛 수가 많을 때 전투 프레임 비용을 낮춥니다.
function gridPathStepToGoal(startR,startC,goalCells,passable,allowStartGoal=false){
  const total=GRID*GRID, start=startR*GRID+startC;
  const goalMask=new Uint8Array(total);
  for(const g of goalCells||[]){
    const r=g?.[0],c=g?.[1];
    if(r>=0&&r<GRID&&c>=0&&c<GRID) goalMask[r*GRID+c]=1;
  }
  const parent=new Int16Array(total); parent.fill(-2);
  const queue=new Uint16Array(total);
  let head=0,tail=0,found=-1;
  queue[tail++]=start; parent[start]=-1;
  while(head<tail){
    const idx=queue[head++], r=(idx/GRID)|0, c=idx-r*GRID;
    if(goalMask[idx] && (allowStartGoal || idx!==start)){ found=idx; break; }
    const visit=(nr,nc)=>{
      const ni=nr*GRID+nc;
      if(parent[ni]!==-2 || !passable(nr,nc)) return;
      parent[ni]=idx; queue[tail++]=ni;
    };
    if(r>0) visit(r-1,c);
    if(r<GRID-1) visit(r+1,c);
    if(c>0) visit(r,c-1);
    if(c<GRID-1) visit(r,c+1);
  }
  if(found<0 || found===start) return null;
  let step=found;
  while(parent[step]>=0 && parent[step]!==start) step=parent[step];
  if(step===start) return null;
  return [((step/GRID)|0),step%GRID];
}

// 목표 칸까지 가는 다음 한 걸음을 계산합니다.
// 용사는 장애물을 미리 인지하거나 위험도를 계산해 우회하지 않습니다.
// 모든 통행 가능한 장애물 칸을 일반 바닥과 동일한 비용으로 취급하며,
// 물리적으로 통행을 막는 barricade/pit만 실제 장벽으로 취급합니다.
function pathStepToGoal(h,goalCells){
  return gridPathStepToGoal(h.r,h.c,goalCells,(r,c)=>{
    const t=state.grid[r]?.[c];
    return !!t && (t.type==='floor'||t.type==='core') && t.obstacle!=='barricade' && t.obstacle!=='pit' && !(t.obstacle==='collapse_bridge'&&runeGateIsBlocking(t));
  },false);
}
function partyFollowStep(h){
  if(!h.partyId || h.partyLeaderId===h.id || h.fleeing || h.digging) return null;
  const leader=state.heroes.find(x=>x.id===h.partyLeaderId);
  if(!leader || leader.hp<=0 || leader.fleeing) return null;
  const d=Math.abs(h.r-leader.r)+Math.abs(h.c-leader.c);
  if(d<=1){
    const nr=h.r+Math.sign(leader.lastStepR||0), nc=h.c+Math.sign(leader.lastStepC||0);
    if(Math.abs(leader.lastStepR||0)+Math.abs(leader.lastStepC||0)===1 && inBounds(nr,nc)){
      const t=state.grid[nr][nc];
      if(t.type==='floor' && t.obstacle!=='barricade' && t.obstacle!=='pit' && !(t.obstacle==='collapse_bridge'&&runeGateIsBlocking(t)) && !monsterAt(nr,nc) && !(nr===h.prevR&&nc===h.prevC)) return [nr,nc];
    }
    return null;
  }
  if(d>2){
    return pathStepToGoal(h,[[leader.r,leader.c]]);
  }
  return null;
}
function heroDungeonResponseProfile(h){
  const ht=heroTypeOf(h)||{};
  const profile={detectBonus:0,avoidBias:1,breakBias:1,role:'balanced'};
  if(h.typeId==='miner'){ profile.detectBonus=.22; profile.avoidBias=.65; profile.breakBias=.45; profile.role='breaker'; }
  else if(h.typeId==='hunter'){ profile.detectBonus=.16; profile.avoidBias=1.35; profile.breakBias=1.0; profile.role='scout'; }
  else if(h.typeId==='mage'||h.typeId==='archmage'){ profile.detectBonus=.08; profile.avoidBias=1.18; profile.breakBias=1.0; profile.role='cautious'; }
  else if(h.typeId==='shieldbearer'||h.typeId==='paladin'){ profile.detectBonus=.05; profile.avoidBias=.92; profile.breakBias=.85; profile.role='frontline'; }
  else if(h.typeId==='assassin'||h.typeId==='shadow_rogue'){ profile.detectBonus=-.10; profile.avoidBias=1.06; profile.breakBias=.92; profile.role='stealth'; }
  else if(h.typeId==='druid'||h.typeId==='miko'||h.typeId==='bard'||h.typeId==='alchemist'){ profile.detectBonus=.06; profile.avoidBias=1.10; profile.breakBias=1.0; profile.role='support'; }
  else if(h.typeId==='ice_mage'||h.typeId==='spirit_caller'||h.typeId==='curse_caster'){ profile.detectBonus=.08; profile.avoidBias=1.16; profile.breakBias=1.0; profile.role='backline'; }
  else if(h.typeId==='lancer'||h.typeId==='martial_artist'||h.typeId==='dual_wielder'||h.typeId==='dark_knight'){ profile.detectBonus=.02; profile.avoidBias=.95; profile.breakBias=.90; profile.role='assault'; }
  else if(h.typeId==='ironclad'){ profile.detectBonus=.08; profile.avoidBias=.82; profile.breakBias=.82; profile.role='fortress'; }
  // v51: 왕국 정예 영웅
  else if(['horseman','pikeman','griffon_knight','sun_lancer','royal_lance','dragon_rider'].includes(h.typeId)){ profile.detectBonus=.04; profile.avoidBias=.92; profile.breakBias=.85; profile.role='assault'; }
  else if(h.typeId==='royal_elite'||h.typeId==='royal_guard'){ profile.detectBonus=.06; profile.avoidBias=.85; profile.breakBias=.80; profile.role='fortress'; }
  else if(h.typeId==='battle_mage'||h.typeId==='royal_longbow'){ profile.detectBonus=.10; profile.avoidBias=1.20; profile.breakBias=1.0; profile.role='backline'; }
  else if(h.typeId==='rune_guardian'||h.typeId==='imperial_magus'){ profile.detectBonus=.08; profile.avoidBias=1.12; profile.breakBias=1.0; profile.role='support'; }
  return profile;
}
function chooseHeroObstacleRouteStep(h){
  const target=[[CORE_R,CORE_C]];
  const profile=heroDungeonResponseProfile(h);
  return {profile, step:null};
}
/* ==========================================================================
   v48 · 원거리 유닛 전투 연출 보정
   [문제] 근접 몬스터가 바로 옆 칸까지 붙으면(dist<=1) 궁수/마법사도 근접 연출(런지+타격)만 나오고
          화살/마법 투사체가 사라졌습니다. 또한 용사가 마왕을 공격할 때는 숫자+스파크뿐이었습니다.
   [수정] 원거리 유닛은 거리와 상관없이 항상 투사체를 쏘고, 마왕 공격에도 투사체/런지/타격 연출을 붙입니다.
   ========================================================================== */
/* ==========================================================================
   v49 · 벽 파괴 중복 방지
   [문제] 한 용사가 벽을 파는 중에 다른 용사가 같은 벽을 또 파기 시작해서, 벽 위 빨간 게이지가
          두 용사의 진행도로 번갈아 덮어써지며 중복돼 보였습니다.
   [수정] 이미 다른 용사가 파고 있는 벽(또는 같은 바리케이드)은 새로 파지 않고 뒤에서 대기합니다.
          앞선 용사가 완료/중단(도주·전투·사망)하면 다음 틱에 자연스럽게 이어받습니다.
   ========================================================================== */
function heroDigTargetKey(kind,r,c){
  // 바리케이드 같은 다칸 장애물은 어느 칸을 노리든 같은 대상으로 취급합니다(루트 기준).
  if(kind==='obstacle'){ const root=obstacleRootPos(r,c)||{r,c}; return 'o'+root.r+'_'+root.c; }
  return 'c'+r+'_'+c;
}
function findHeroDiggingSameTarget(h,kind,r,c){
  const key=heroDigTargetKey(kind,r,c);
  for(const o of state.heroes){
    if(o===h || o.hp<=0 || !o.digging || o.digTargetR==null) continue;
    // 넉백 등으로 대상에서 멀어진 용사는 실제로 파고 있다고 볼 수 없으므로 대기 대상에서 제외합니다.
    if(Math.abs(o.r-o.digTargetR)+Math.abs(o.c-o.digTargetC)>2) continue;
    if(heroDigTargetKey(o.digKind,o.digTargetR,o.digTargetC)===key) return o;
  }
  return null;
}
function heroWaitBehindDigger(h){
  h.waitingBehindDigger=true;
  h.dungeonIntent='앞선 용사가 벽을 파는 중 · 대기';
  h.stuckTicks=0; h.showedQuestion=false;
  const now=performance.now();
  if(now-(h.waitBubbleAt||0)>4000){ h.waitBubbleAt=now; sayHero(h,'…','normal',1200,false); }
}

function isRangedHeroUnit(h){
  if(!h || (h.range||1)<=1) return false;
  const ht=heroTypeOf(h);
  // 창기병(melee)·철벽기사(tank)는 사거리가 2지만 창/방패로 싸우는 근접형이라 제외합니다.
  return !(ht && (ht.role==='melee' || ht.role==='tank'));
}
/* ==========================================================================
   v53 · 용사의 전투 대상 우선순위 (마왕 vs 몬스터)
   [문제] 마왕이 시야(사거리+4칸) 안에 들어오면, 바로 앞에 몬스터가 있어도 무시하고
          마왕에게 걸어가거나 마왕만 공격했습니다(마왕 처리 블록이 몬스터 전투 블록보다 앞에서 return).
   [수정] 공격 사거리 안에 몬스터가 있으면 몬스터를 먼저 상대합니다.
          - 마왕이 아직 사거리 밖이면 → 눈앞의 몬스터 먼저
          - 마왕도 사거리 안이면 → 더 가까운 쪽(같으면 몬스터)
   ========================================================================== */
function heroPrefersMonsterOverMawang(h,mawangDist){
  const f=findMonsterForHero(h);
  if(!f.monster) return false;
  if(mawangDist>(h.range||1)) return true;
  return f.dist<=mawangDist;
}

/* ==========================================================================
   v55 · 탱커 넉백 — "진열을 무너뜨리는" 방패 타격
   HERO_TYPES 의 knockbackChance(확률) 를 가진 영웅(방패병·팔라딘·철벽기사·왕국 수호대)이
   몬스터를 일반 공격할 때마다 해당 확률로 몬스터를 영웅 반대 방향으로 밀쳐냅니다.
   - 뒤가 벽/장애물/다른 몬스터·영웅/핵 자리면 밀리지 않습니다.
   - 밀려난 몬스터는 잠깐 경직(HERO_KNOCKBACK_STAGGER 초)되어 바로 되돌아오지 못합니다.
   - 같은 몬스터가 연달아 밀려 무한 저글링되지 않도록 몬스터별 재적용 대기시간을 둡니다.
   ========================================================================== */
const HERO_KNOCKBACK_TILES=1;
const HERO_KNOCKBACK_STAGGER=0.5;
const HERO_KNOCKBACK_MONSTER_CD_MS=1200;
function tryHeroKnockback(h,m,now){
  const ht=heroTypeOf(h); const p=ht&&ht.knockbackChance;
  if(!p||!m||m.hp<=0) return false;
  if(m.knockbackCdUntil&&now<m.knockbackCdUntil) return false;
  if(Math.random()>=p) return false;
  const dr=m.r-h.r, dc=m.c-h.c; if(dr===0&&dc===0) return false;
  // 대각선 위치에서도 한 축으로만 밀어냅니다(세로 우선).
  let pr=0,pc=0; if(Math.abs(dr)>=Math.abs(dc)) pr=Math.sign(dr); else pc=Math.sign(dc);
  const r0=m.r,c0=m.c;
  for(let k=0;k<HERO_KNOCKBACK_TILES;k++){
    const rr=m.r+pr, cc=m.c+pc; const t=state.grid[rr]?.[cc];
    if(!t || t.type!=='floor' || t.obstacle || (rr===CORE_R&&cc===CORE_C) || monsterAt(rr,cc) || state.heroes.some(x=>x.hp>0&&x.r===rr&&x.c===cc)) break;
    m.r=rr; m.c=cc;
  }
  if(m.r===r0&&m.c===c0) return false;
  if(typeof markMonsterCombatSpatialDirty==='function') markMonsterCombatSpatialDirty();
  m.knockbackCdUntil=now+HERO_KNOCKBACK_MONSTER_CD_MS;
  m.moveCooldown=Math.max(m.moveCooldown||0,HERO_KNOCKBACK_STAGGER);
  state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'밀려남!',color:'#7fc8ff'},{type:'spark',r:r0,c:c0,color:'#7fc8ff'});
  return true;
}

/* ==========================================================================
   v56 · 관통 공격 — 뭉쳐 있는 몬스터를 한 번에 꿰뚫는 일반 공격
   HERO_TYPES 의 pierceTiles(칸 수)를 가진 영웅(용기사·검성·흑기사·드래곤 슬레이어·창기병·왕국 랜스 기사단)이
   몬스터를 일반 공격하면, 주 대상 뒤 같은 방향으로 최대 pierceTiles 칸까지 늘어선 몬스터에게도
   pierceDmgMul(기본 75%) 만큼의 피해를 줍니다.
   - 벽/바리케이드 뒤로는 관통하지 않습니다.
   - 관통 대상에는 공격력 기반 기본 피해만 적용됩니다(검성 최대HP%, 드래곤 슬레이어 대형 보너스 등 고유 추가피해는 주 대상 전용).
   ========================================================================== */
function tryHeroPierce(h,m,baseHit,now){
  const ht=heroTypeOf(h); const tiles=ht&&ht.pierceTiles;
  if(!tiles||!m) return 0;
  const mul=ht.pierceDmgMul||0.75;
  const dr=Math.sign(m.r-h.r), dc=Math.sign(m.c-h.c); if(dr===0&&dc===0) return 0;
  let hits=0, kills=0;
  for(let k=1;k<=tiles;k++){
    const rr=m.r+dr*k, cc=m.c+dc*k;
    if(!inBounds(rr,cc) || !isPassableForLOS(rr,cc)) break;
    for(const o of state.monsters){
      if(o===m||o.hp<=0||o.r!==rr||o.c!==cc) continue;
      const defBuff=(o.skillDefBuffUntil&&now<o.skillDefBuffUntil)?(o.skillDefBuffMul||1):1;
      let dmg=Math.max(1,Math.round(baseHit*mul)-(o.def+(o.mawangDefBonus||0))*defBuff);
      if(o.skillShieldUntil&&now<o.skillShieldUntil) dmg=Math.max(1,Math.round(dmg*(o.skillShieldMul||1)));
      dmg=Math.max(1,applyStatueSanctuary(o,dmg));
      o.hp-=dmg; if(typeof markHeroAggro==='function') markHeroAggro(o,h); hits++;
      state.fxEvents.push(heroMeleeBattleHitEvent(h,o.r,o.c,dmg,dr,dc,'#ffd166',false),{type:'damageNumber',r:o.r,c:o.c,amount:dmg,color:'#ffd166'});
      if(o.hp<=0){ h.heroKills=(h.heroKills||0)+1; kills++; }
    }
  }
  if(kills && h.heroKills>=4 && (h.level||1)<99) heroLevelUp(h);
  return hits;
}

// v51: 방어 버프(guard)로 줄어든 받는 피해 배율 (반격 피해에도 적용)
function heroGuardMul(h){ const now=performance.now(),guard=(h.guardUntil&&now<h.guardUntil)?(1-Math.min(.8,h.guardReduction||0)):1,vuln=(h.mimicVulnerabilityUntil&&now<h.mimicVulnerabilityUntil)?(h.mimicVulnerabilityMul||MIMIC_VULN_MUL):1; return guard*vuln; }
function isRangedMonsterUnit(m){ return !!m && (m.range||1)>1; }
function heroProjectileFx(h,tr,tc){
  return {type:'projectile',fromR:h.r,fromC:h.c,toR:tr,toC:tc,color:RANGED_COLOR[h.typeId]||'#e0e0e0',owner:'hero',typeId:h.typeId,kind:rangedProjectileKind('hero',h.typeId)};
}

function processHeroTick(h,dt){
  // A trap kill must reach the shared reward cleanup without regeneration or another action.
  if(!h || h.hp<=0 || h.environmentDeath) return;
  if(typeof physicalHeroLocked==='function' && physicalHeroLocked(h)) return;
  if(typeof physicalConsumeLanding==='function' && physicalConsumeLanding(h)) return;
  // v49: 대기 표시는 매 틱 초기화합니다. 계속 대기 중이면 아래 로직에서 다시 켜지고, 끝났다면 정상 문구로 돌아갑니다.
  if(h.waitingBehindDigger){ h.waitingBehindDigger=false; h.dungeonIntent='핵으로 전진'; }
  if(h.hp<h.maxHp){ h.hp=Math.min(h.maxHp, h.hp + HERO_REGEN_PER_LEVEL*(h.level||1)*dt); }
  const now=performance.now();

  // 드루이드: 8초 동안 1초마다 주변 아군에게 지속 회복
  if(h.regenAuraUntil && now<h.regenAuraUntil && now>=(h.regenAuraNext||0)){
    h.regenAuraNext=now+1000;
    const heal=Math.round(10+(h.level||1)*1.2);
    for(const o of state.heroes){
      if(o.hp<=0||Math.abs(o.r-h.r)+Math.abs(o.c-h.c)>2) continue;
      o.hp=Math.min(o.maxHp,o.hp+heal);
      state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'+'+heal,color:'#8fd36a'});
    }
    state.fxEvents.push({type:'spellImpact',r:h.r,c:h.c,spell:'heal'});
  }

  // 정령사: 20초 동안 1초마다 가장 가까운 몬스터에게 정령 피해
  if(h.spiritSummonUntil && now<h.spiritSummonUntil && now>=(h.spiritNext||0)){
    h.spiritNext=now+1000;
    // v88 combat-opt: filter+sort 배열 생성 대신 동일한 배열 순서로 가장 가까운 대상만 선택합니다.
    let t=null,bestSpiritDist=Infinity;
    for(const cand of state.monsters){
      if(cand.hp<=0) continue;
      const d=Math.abs(cand.r-h.r)+Math.abs(cand.c-h.c);
      if(d<=4 && d<bestSpiritDist){ t=cand; bestSpiritDist=d; }
    }
    if(t){
      const dmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*.55));
      t.hp-=dmg; if(typeof markHeroAggro==='function') markHeroAggro(t,h);
      state.fxEvents.push({type:'damageNumber',r:t.r,c:t.c,amount:dmg,color:'#68e5ff'});
      state.fxEvents.push({type:'projectile',fromR:h.r,fromC:h.c,toR:t.r,toC:t.c,color:'#68e5ff',owner:'hero',typeId:h.typeId,kind:rangedProjectileKind('hero',h.typeId)});
      if(t.hp<=0) h.heroKills=(h.heroKills||0)+1;
    }
  }

  const tileHere=state.grid[h.r][h.c];
  if(h.monsterBleedUntil&&now<h.monsterBleedUntil){ h.hp-=Math.max(1,Math.round(h.maxHp*.004)); }
  if(h.monsterSkillDotUntil&&now<h.monsterSkillDotUntil){ h.hp-=Math.max(1,h.monsterSkillDotDmg||2); }
  if(h.obstacleBleedUntil&&now<h.obstacleBleedUntil) h.hp-=Math.max(.4,(h.maxHp||100)*.004)*dt;
  if(h.poisonSpreadUntil&&now<h.poisonSpreadUntil) h.hp-=Math.max(.3,h.poisonSpreadDps||1)*dt; // v35 독늪 연구 Lv.5 전염
  if(h.obstaclePoisonUntil&&now<h.obstaclePoisonUntil&&now>=(h.obstaclePoisonNextTickAt||0)){
    const dmg=Math.max(1,Math.round(h.obstaclePoisonTickDamage||POISON_DPS)),beforePoisonHp=h.hp;
    h.hp-=dmg;h.lastTrapHitAt=now;h.obstaclePoisonNextTickAt=now+POISON_TICK_MS;
    state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:dmg,color:'#78f06b'},{type:'obstacleSpecial',r:h.r,c:h.c,ob:'poison'});
    if(h.hp<=0&&beforePoisonHp>0&&trapResearchLevel('poison')>=5){
      const spread=Math.max(1,Math.round(dmg*.6));
      for(const o of state.heroes){if(o!==h&&o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=1){applyTimedObstaclePoison(o,spread,now,'poison_spread');state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'☠ 전염!',color:'#78f06b'});}}
    }
  }
  if(h.flameBurnUntil&&now<h.flameBurnUntil){
    const beforeHp=h.hp;
    h.hp-=Math.max(.3,(h.flameBurnDps||FLAME_BURN_DPS))*dt;
    // v35 함정 연구소 "지옥불"(화염 연구 Lv.5): 화상으로 사망하면 주변 1칸에 소규모 폭발 피해를 남깁니다.
    if(h.hp<=0 && beforeHp>0 && h.obstacleFlameLv5){
      const aoeDmg=Math.max(1,Math.round(FLAME_DMG*0.5*trapAmplifyMul()));
      for(const o of state.heroes){
        if(o===h||o.hp<=0) continue;
        if(Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=1){ o.hp-=aoeDmg; state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'-'+aoeDmg,color:'#ff9b3d'}); }
      }
      state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'flame',text:'💥',footprint:1});
    }
  }
  if(h.mimicHoldUntil&&now<h.mimicHoldUntil&&now>=(h.mimicNextTickAt||0)){
    const dmg=Math.max(1,Math.round(h.mimicTickDamage||1));h.hp-=dmg;h.lastTrapHitAt=now;h.mimicNextTickAt=now+MIMIC_TICK_MS;
    state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:dmg,color:'#ff79c6'},{type:'obstacleBurst',r:h.r,c:h.c,ob:'stun_cage',text:'👅',footprint:1});
  }
  if(h.hp<=0) return;
  // v35 함정 연구소 "불안정 지반"(구덩이 연구 Lv.3)/"함몰의 심연"(Lv.5):
  // 구덩이에서 막 풀려난 순간을 감지해서, Lv.3이면 짧게 휘청이고(추가 경직), Lv.5면 40% 확률로 다시 짧게 구속합니다.
  if(h.pitRootUntil>0 && now>=h.pitRootUntil && h.pitWasRooted && !h.pitReleaseHandled){
    h.pitReleaseHandled=true; h.pitWasRooted=false;
    if(h.obstaclePitSlowAfter) h.stunTicks=Math.max(h.stunTicks||0,2);
    if(h.obstaclePitLv5 && Math.random()<0.4){
      h.pitRootUntil=now+600; h.pitWasRooted=true; h.pitReleaseHandled=false;
      state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'⛓ 재구속!',color:'#b993ff'});
    }
  }
  if(h.pitRootUntil&&now<h.pitRootUntil){
    h.pitWasRooted=true; h.pitReleaseHandled=false;
    if(now-(h.pitFxAt||0)>500){state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'pit',text:'⛓'});h.pitFxAt=now;}
    if(state.archetypeActive && state.archetypeActive.pitMaze && now-(h.pitMazeTickAt||0)>1200){
      h.pitMazeTickAt=now;
      for(const [nr,nc] of neighbors4(h.r,h.c)){
        const nt=state.grid[nr]?.[nc];
        if(nt && nt.obstacle==='spike'){ activateObstacle(h,nt,'chain',true); break; }
      }
    }
    return;
  }
  // v92: 미믹 상자에 붙잡힌 동안 이동/공격/스킬 시전을 모두 중지합니다.
  if(h.mimicHoldUntil&&now<h.mimicHoldUntil){
    if(now-(h.cageFxAt||0)>500){state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'stun_cage',text:'👅'});h.cageFxAt=now;}
    return;
  }
  if(h.barricadeSlowUntil&&now<h.barricadeSlowUntil){ if(now-(h.barricadeFxAt||0)>450){state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'barricade',text:'🛡'});h.barricadeFxAt=now;} return; }
  if(h.webRootUntil&&now<h.webRootUntil){ if(now-(h.webFxAt||0)>450){state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'web',text:'🕸'});h.webFxAt=now;} return; }
  if(h.barricadeSlowUntil&&now<h.barricadeSlowUntil){ if(now-(h.barricadeFxAt||0)>450){state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'barricade',text:'🪨'});h.barricadeFxAt=now;} return; }
  if(h.stunTicks>0){ h.stunTicks--; return; }
  h.skillCooldown=Math.max(0,(h.skillCooldown||0)-dt);
  if(h.castingSkill){
    h.castingSkill.elapsed=(h.castingSkill.elapsed||0)+dt;
    if(h.castingSkill.elapsed >= h.castingSkill.cast){ finishHeroSkill(h); }
    return;
  }
  if(skillEligible(h) && Math.random()<Math.min(.18,dt*.9)){ if(startHeroSkill(h)) return; }

  // 겁쟁이는 자신보다 훨씬 강한 적을 발견하면 잠시 후퇴하지만,
  // 다시 마음을 다잡을 때까지 잠깐의 재도전 유예시간을 둡니다.
  h.fleeCooldown=Math.max(0,(h.fleeCooldown||0)-dt);
  const threatInfo=findThreateningMonster(h);
  if(!h.fleeing && h.fleeCooldown<=0 && h.coward && threatInfo.monster && monsterPower(threatInfo.monster)>heroPower(h)*1.65){
    startFlee(h,threatInfo.monster);
  }

  // 도주 중이어도 던전 밖으로 나가지 않습니다.
  // 내부의 안전한 지점으로 잠시 우회한 뒤 다시 핵/몬스터 사냥에 복귀합니다.
  if(h.fleeing){
    h.fleeTicks=(h.fleeTicks||0)+dt;
    if(h.fleeTicks>=4.5){
      h.fleeing=false;
      h.fleeTarget=null;
      h.fleeTicks=0;
      h.fleeCooldown=4.5;
      h.showedQuestion=false;
      sayHero(h,'...','normal',1100,true);
      return;
    }
    const target=h.fleeTarget;
    const step=target?pathStepToGoal(h,[target]):null;
    if(step){
      if(!heroMovementAllowedThisStep(h)) return;
      h.prevR=h.r; h.prevC=h.c; h.lastStepR=step[0]-h.r; h.lastStepC=step[1]-h.c; h.r=step[0]; h.c=step[1]; h.lastMoveAt=performance.now();
      handleHeroTileEnter(h,state.grid[h.r][h.c]); return;
    }
    const nbrs=neighbors4(h.r,h.c).filter(([r,c])=>{
      const t=state.grid[r][c];
      return (t.type==='floor'||t.type==='core') && t.obstacle!=='barricade' && t.obstacle!=='pit' && !(r===h.prevR&&c===h.prevC);
    });
    if(nbrs.length){
      if(!heroMovementAllowedThisStep(h)) return;
      const step=nbrs[Math.floor(Math.random()*nbrs.length)];
      h.prevR=h.r;h.prevC=h.c;h.lastStepR=step[0]-h.r;h.lastStepC=step[1]-h.c;h.r=step[0];h.c=step[1];
      handleHeroTileEnter(h,state.grid[h.r][h.c]);
    }
    return;
  }

  // 파티원은 적이나 핵을 우선 처리하고, 그 외에는 리더와 같은 방향을 따라갑니다.
  const partyEnemy=findMonsterInRange(h.r,h.c,h.range||1).monster;
  h.targetMonsterId=partyEnemy ? partyEnemy.id : null;
  const partyCoreSeen=coreDetected(h);
  const partyStep=(!partyEnemy && !partyCoreSeen) ? partyFollowStep(h) : null;
  if(partyStep){
    if(!heroMovementAllowedThisStep(h)) return;
    h.prevR=h.r; h.prevC=h.c; h.lastStepR=partyStep[0]-h.r; h.lastStepC=partyStep[1]-h.c; h.r=partyStep[0]; h.c=partyStep[1]; h.stuckTicks=0; h.lastMoveAt=performance.now();
    handleHeroTileEnter(h,state.grid[h.r][h.c]);
    if(performance.now()>=(h.nextDialogueAt||0)) heroSay(h,'move');
    return;
  }

  if(h.typeId==='priest'){
    let target=null,bestFrac=1;
    for(const o of state.heroes){ if(o===h||o.hp<=0) continue; const d=Math.abs(o.r-h.r)+Math.abs(o.c-h.c); if(d<=PRIEST_HEAL_RANGE&&o.hp<o.maxHp){const frac=o.hp/o.maxHp;if(frac<bestFrac){bestFrac=frac;target=o;}} }
    if(target){
      const healNow=performance.now();
      const hardPenalty=(target.obstacleHealPenaltyUntil&&healNow<target.obstacleHealPenaltyUntil)?0.45:1;
      const curseHeal=(target.obstacleCurseUntil&&healNow<target.obstacleCurseUntil)?(target.obstacleCurseHealMul||1):1;
      const healMul=hardPenalty*curseHeal;
      const healAmt=Math.max(1,Math.round(PRIEST_HEAL_AMT*healMul)); target.hp=Math.min(target.maxHp,target.hp+healAmt); target.lastHealAt=healNow; state.fxEvents.push({type:'floatText',r:target.r,c:target.c,text:'+'+healAmt,color:'#73d99a'},{type:'spellImpact',r:target.r,c:target.c,spell:'holy'}); if(Sound.heal) Sound.heal(); else Sound.magic('holy');
    }
  }
  const near=(kind)=>state.auraPositions[kind]&&state.auraPositions[kind].some(p=>{const ot=state.grid[p.r]?.[p.c];return Math.abs(p.r-h.r)+Math.abs(p.c-h.c)<=obstacleRange(kind,ot);});
  // 저주의 밀바닥은 이제 상시 오라가 아니라 짧은 펄스형 디버프입니다.
  const curseNow=performance.now();
  const auraCurseMul=(h.obstacleCurseUntil&&curseNow<h.obstacleCurseUntil)?(h.obstacleCurseMul||CURSE_ATK_MUL):1;
  // 디버프 몬스터(거미·흑마법사)에게 물린 용사는 저주 지속시간 동안 공격력이 낮아집니다.
  const monsterCurseMul=(h.monsterCurseUntil && curseNow<h.monsterCurseUntil)?MONSTER_CURSE_ATK_MUL:1;
  const curseMul=auraCurseMul*monsterCurseMul;

  // 용사가 마왕을 발견한 경우: 가장 가까운 마왕을 실제 전투 대상으로 삼습니다.
  // 마왕이 쓰러져도 핵이 즉시 파괴되는 것은 아니며, 일정 시간 후 중앙에서 부활합니다.
  const mw=state.mawang;
  if(mw && mw.hp>0 && !mw.dead){
    const md=Math.abs(mw.r-h.r)+Math.abs(mw.c-h.c);
    const mawangSight=(h.range||1)+4;
    if(md<=mawangSight && !heroPrefersMonsterOverMawang(h,md)){ // v53: 사거리 안의 몬스터가 있으면 먼저 상대
      const atkRange=h.range||1;
      if(md<=atkRange && !losBlocked(h.r,h.c,mw.r,mw.c)){ // v57: 벽에 가려진 마왕은 사거리 안이어도 공격하지 않고 접근합니다
        // v54: 마법사 계열은 마왕에게도 시전형 범위 마법을 씁니다.
        if(isCasterHero(h)){ startCasterSpell(h,{r:mw.r,c:mw.c,isMawang:true},curseMul); return; }
        const nowMw=performance.now();
        const atkDelay=1.0*(1+mawangSkillRate('authority',.04));
        if(nowMw-(h.lastMawangAttackAt||0)>=atkDelay*1000){
          h.lastMawangAttackAt=nowMw;
          const mwStats=mawangCurrentStats();
          const dmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1))-mwStats.def);
          mw.hp-=dmg; if(typeof markHeroAggro==='function') markHeroAggro(mw,h);
          // v48: 마왕을 공격할 때도 몬스터 공격과 같은 연출(원거리=투사체, 근접=런지+타격)을 보여줍니다.
          const mwDR=Math.sign(mw.r-h.r), mwDC=Math.sign(mw.c-h.c);
          if(isRangedHeroUnit(h)){
            state.fxEvents.push(heroProjectileFx(h,mw.r,mw.c),{type:'punch',key:'mawang',dr:mwDR,dc:mwDC,mode:'defender'});
            Sound.heroRanged(rangedProjectileKind('hero',h.typeId)); if(h.typeId==='mage') Sound.magic('arcane');
          }else{
            state.fxEvents.push({type:'punch',key:'h'+h.id,dr:mwDR,dc:mwDC,mode:'attacker'},{type:'punch',key:'mawang',dr:mwDR,dc:mwDC,mode:'defender'},heroMeleeBattleHitEvent(h,mw.r,mw.c,dmg,mwDR,mwDC,'#ff5868',dmg>Math.max(12,mw.maxHp*.12)));
            Sound.heroAttack(heroMeleeWeaponType(h.typeId));
          }
          state.fxEvents.push({type:'damageNumber',r:mw.r,c:mw.c,amount:dmg,color:'#ff9b6e'});
          state.fxEvents.push({type:'spark',r:mw.r,c:mw.c,color:'#ffd166'});
          if(mw.hp<=0){ killMawang(mw); }
        }
        return;
      }
      const stepToMawang=pathStepToGoal(h,[[mw.r,mw.c]]);
      if(stepToMawang){
        if(!heroMovementAllowedThisStep(h)) return;
        h.prevR=h.r;h.prevC=h.c;h.lastStepR=stepToMawang[0]-h.r;h.lastStepC=stepToMawang[1]-h.c;h.r=stepToMawang[0];h.c=stepToMawang[1];h.stuckTicks=0;h.lastMoveAt=performance.now();
        handleHeroTileEnter(h,state.grid[h.r][h.c]);
        return;
      }
    }
  }

  const {monster:m,dist}=findMonsterForHero(h);
  if(m){
    // 겁쟁이가 도망치기로 결정했다면 공격하지 않습니다.
    if(h.fleeing) return;
    const now=performance.now();
    if(now>=(h.nextDialogueAt||0)) heroSay(h,'combat');
    const heroType=heroTypeOf(h);
    const skillDefBuff=(m.skillDefBuffUntil&&performance.now()<m.skillDefBuffUntil)?(m.skillDefBuffMul||1):1;
    const allyAtkBuffMul=(h.attackBuffUntil&&now<h.attackBuffUntil)?(h.attackBuffMul||1):1;
    // v54: 마법사 계열은 즉발 타격 대신 "시전 → 범위 폭발"로 공격합니다. (시전 중에는 위쪽 castingSkill 처리에서 대기)
    if(isCasterHero(h)){ startCasterSpell(h,m,curseMul*allyAtkBuffMul); return; }
    let dmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*curseMul*allyAtkBuffMul)-(m.def+(m.mawangDefBonus||0))*skillDefBuff);
    if(state.archetypeActive && state.archetypeActive.mazeArchitect && dungeonZoneAt(h.r,h.c)==='deadend'){
      dmg=Math.max(1,Math.round(dmg*0.7));
    }
    if(m.skillShieldUntil&&performance.now()<m.skillShieldUntil) dmg=Math.max(1,Math.round(dmg*(m.skillShieldMul||1)));

    // 권법가: 연속 공격할수록 타격력이 증가합니다.
    if(h.typeId==='martial_artist'){
      if(now-(h.lastAttackAt||0)>1800) h.comboStack=0;
      h.comboStack=Math.min(5,(h.comboStack||0)+1);
      dmg=Math.round(dmg*(1+h.comboStack*.10));
    }

    // 이도류 검사: 일반 공격도 2연타하며 20% 확률로 방어력을 무시합니다.
    if(h.typeId==='dual_wielder'){
      const hits=[];
      for(let i=0;i<2;i++){
        const ignore=Math.random()<.20;
        const d=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*curseMul*allyAtkBuffMul)-(ignore?0:(m.def+(m.mawangDefBonus||0))*skillDefBuff));
        m.hp-=applyStatueSanctuary(m,d); if(typeof markHeroAggro==='function') markHeroAggro(m,h); hits.push(d);
        if(m.hp<=0) break;
      }
      h.lastAttackAt=now;
      hits.forEach(d=>state.fxEvents.push({type:'damageNumber',r:m.r,c:m.c,amount:d,color:dist<=1?'#ff5868':'#cbd4e1'}));
      if(m.hp<=0) h.heroKills=(h.heroKills||0)+1;
      if((h.range||1)>1) Sound.heroRanged(rangedProjectileKind('hero',h.typeId)); else Sound.heroAttack(heroMeleeWeaponType(h.typeId));
      if(dist<=1){ const dR=Math.sign(m.r-h.r),dC=Math.sign(m.c-h.c); const dmgBack=Math.max(1,Math.round((m.atk-(h.def||0))*heroGuardMul(h))); h.hp-=dmgBack;
        const meleeFxReady=now-(h.lastMeleeFxAt||0)>=280;
        if(meleeFxReady){
          h.lastMeleeFxAt=now;
          state.fxEvents.push({type:'punch',key:'h'+h.id,dr:dR,dc:dC,mode:'attacker'},{type:'punch',key:'m'+m.id,dr:dR,dc:dC,mode:'defender'},heroMeleeBattleHitEvent(h,m.r,m.c,dmg,dR,dC,'#ff5868',dmg>Math.max(8,m.maxHp*.10)));
        }else{
          state.fxEvents.push(heroMeleeBattleHitEvent(h,m.r,m.c,dmg,dR,dC,'#ff5868',dmg>Math.max(8,m.maxHp*.10)));
        }
      }
      else state.fxEvents.push({type:'projectile',fromR:h.r,fromC:h.c,toR:m.r,toC:m.c,color:RANGED_COLOR[h.typeId]||'#e0e0e0',owner:'hero',typeId:h.typeId,kind:rangedProjectileKind('hero',h.typeId)});
      return;
    }

    // 사냥꾼(정밀 사격): 사거리 안의 적에게 일반 공격 피해 +15%.
    if(heroType&&heroType.rangedBonus) dmg=Math.round(dmg*(1+heroType.rangedBonus));
    // 검성(일섬): 몬스터 최대 HP의 5%만큼 추가 피해(최대 30, 최고 HP 우선 타겟).
    if(heroType&&heroType.maxHpDmgPct){
      const bonus=Math.min(heroType.maxHpDmgCap||9999, Math.round((m.maxHp||m.hp)*heroType.maxHpDmgPct));
      dmg+=bonus;
    }
    // 드래곤 슬레이어(용살의 일격): 고체력(HP 임계값 이상) 몬스터에게 +25% 피해, 몬스터별 5초 쿨다운.
    if(heroType&&heroType.bigMonsterAtkBonus && (m.maxHp||m.hp)>=heroType.bigMonsterHpThreshold){
      h.bigMonsterCd=h.bigMonsterCd||{};
      const lastHit=h.bigMonsterCd[m.id]||0;
      if(now-lastHit>=(heroType.bigMonsterCooldown||5000)){
        dmg=Math.round(dmg*(1+heroType.bigMonsterAtkBonus));
        h.bigMonsterCd[m.id]=now;
      }
    }
    if((h.range||1)>1) Sound.heroRanged(rangedProjectileKind('hero',h.typeId)); else Sound.heroAttack(heroMeleeWeaponType(h.typeId));
    m.hp-=applyStatueSanctuary(m,dmg); if(typeof markHeroAggro==='function') markHeroAggro(m,h); h.lastAttackAt=now;
    if(state.archetypeActive && state.archetypeActive.unbrokenLine && (m.special==='tank'||m.special==='guard')){
      state.throneHP=Math.min(state.maxThroneHP,state.throneHP+1);
      state.fxEvents.push({type:'floatText',r:CORE_R,c:CORE_C,text:'+1',color:'#7ee3a7'});
    }
    if(state.archetypeActive && state.archetypeActive.sanctuary && m.hp<=m.maxHp*0.1 && !(m.sanctuarySaveUntil&&now<m.sanctuarySaveUntil)){
      const healer=state.monsters.find(o=>o!==m&&o.hp>0&&o.role==='healer'&&Math.abs(o.r-m.r)+Math.abs(o.c-m.c)<=HEALER_RANGE);
      if(healer){
        const give=Math.max(1,Math.min(Math.round(healer.hp*0.3),Math.round(m.maxHp*0.25)));
        healer.hp=Math.max(1,healer.hp-give);
        m.hp=Math.min(m.maxHp,Math.max(m.hp,0)+give);
        m.sanctuarySaveUntil=now+8000;
        state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'🩹수호!',color:'#73d99a'});
      }
    }
    // 흡혈귀(피의 갈증): 입힌 피해의 20%를 HP로 회복(최대 12).
    if(heroType&&heroType.lifestealPct){
      const heal=Math.min(heroType.lifestealCap||9999, Math.round(dmg*heroType.lifestealPct));
      if(heal>0){ h.hp=Math.min(h.maxHp,h.hp+heal); state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'+'+heal,color:'#73d99a'}); }
    }
    if(m.hp<=0){ h.heroKills=(h.heroKills||0)+1; if(h.heroKills>=4&&h.level<99) heroLevelUp(h); }
    state.fxEvents.push({type:'damageNumber',r:m.r,c:m.c,amount:dmg,color:dist<=1?'#ff5868':'#ffd166'},{type:'spark',r:m.r,c:m.c,color:dist<=1?'#ff5868':'#ffd166'});
    if(dist<=1){ const dR=Math.sign(m.r-h.r),dC=Math.sign(m.c-h.c); const dmgBack=Math.max(1,Math.round((m.atk-(h.def||0))*heroGuardMul(h))); h.hp-=dmgBack; m.lastAttackAt=now; if(h.hp<=0)h.killerMonsterId=m.id;
      const meleeFxReady=now-(h.lastMeleeFxAt||0)>=280;
      if(isRangedHeroUnit(h)){
        // v48: 원거리 용사는 적이 바로 옆에 붙어도 화살/마법을 그대로 발사합니다.
        state.fxEvents.push(heroProjectileFx(h,m.r,m.c));
        if(h.typeId==='mage') Sound.magic('arcane');
        if(meleeFxReady){
          h.lastMeleeFxAt=now;
          state.fxEvents.push({type:'punch',key:'m'+m.id,dr:dR,dc:dC,mode:'defender'},{type:'spark',r:h.r,c:h.c,color:'#ff6873'},{type:'damageNumber',r:h.r,c:h.c,amount:dmgBack,color:'#ff6873'});
        }
      }else if(meleeFxReady){
        h.lastMeleeFxAt=now;
        state.fxEvents.push({type:'punch',key:'h'+h.id,dr:dR,dc:dC,mode:'attacker'},{type:'punch',key:'m'+m.id,dr:dR,dc:dC,mode:'defender'},heroMeleeBattleHitEvent(h,m.r,m.c,dmg,dR,dC,'#ff5868',dmg>Math.max(8,m.maxHp*.10)),{type:'spark',r:h.r,c:h.c,color:'#ff6873'},{type:'damageNumber',r:h.r,c:h.c,amount:dmgBack,color:'#ff6873'});
      }else{
        state.fxEvents.push(heroMeleeBattleHitEvent(h,m.r,m.c,dmg,dR,dC,'#ff5868',dmg>Math.max(8,m.maxHp*.10)));
      }
    }
    else if(!isRangedHeroUnit(h)){
      // v51: 창/랜스처럼 사거리가 2인 근접형 영웅은 마법탄 대신 찌르기 연출(런지+타격)을 씁니다.
      const dR2=Math.sign(m.r-h.r), dC2=Math.sign(m.c-h.c);
      if(now-(h.lastMeleeFxAt||0)>=280){
        h.lastMeleeFxAt=now;
        state.fxEvents.push({type:'punch',key:'h'+h.id,dr:dR2,dc:dC2,mode:'attacker'},{type:'punch',key:'m'+m.id,dr:dR2,dc:dC2,mode:'defender'});
      }
      state.fxEvents.push(heroMeleeBattleHitEvent(h,m.r,m.c,dmg,dR2,dC2,'#ff5868',dmg>Math.max(8,m.maxHp*.10)));
    }
    else { state.fxEvents.push({type:'projectile',fromR:h.r,fromC:h.c,toR:m.r,toC:m.c,color:RANGED_COLOR[h.typeId]||'#e0e0e0',owner:'hero',typeId:h.typeId,kind:rangedProjectileKind('hero',h.typeId)}); if(h.typeId==='mage') Sound.magic('arcane'); }
    tryHeroPierce(h,m,Math.round(h.atk*(h.partySynergy||1)*curseMul*allyAtkBuffMul),now); // v56: 관통
    tryHeroKnockback(h,m,now); // v55: 탱커 넉백
    return;
  }

  // 핵 탐지: 충분히 가까우면 랜덤 목표보다 핵을 최우선 목표로 삼습니다.
  // 핵을 발견했더라도, 근처(위협 감지 반경)에 몬스터가 있다면 핵보다 몬스터를 먼저 상대합니다.
  if(threatInfo.monster){
    const now2=performance.now();
    if(now2>=(h.nextDialogueAt||0)) heroSay(h,'combat');
    const step=pathStepToGoal(h,[[threatInfo.monster.r,threatInfo.monster.c]]);
    if(step){
      if(!heroMovementAllowedThisStep(h)) return;
      h.prevR=h.r;h.prevC=h.c;h.lastStepR=step[0]-h.r;h.lastStepC=step[1]-h.c;h.r=step[0];h.c=step[1];h.stuckTicks=0;h.lastMoveAt=now2;
      handleHeroTileEnter(h,state.grid[h.r][h.c]);
      return;
    }
  }

  const coreDist=Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C);
  if(coreDist<=1){
    if(!h.coreFound){ h.coreFound=true; sayHero(h,'!','alert',1200,true); setTimeout(()=>{ if(state&&state.heroes.includes(h)&&h.hp>0) sayHero(h,pickHeroDialogue('coreFound'),'normal',2400,true); },950); }
    // v35: 핵은 데미지가 아니라 "타격 횟수"로 닳습니다. 공격 1회 = 내구도 1 감소(최대 180).
    // 기존의 피해감소 계열 효과(수호 결계, 마력 결계 등)는 이제 "이번 타격을 완전히 막을 확률"로 작동합니다.
    const blockMul=(state.stageCoreDmgMul||1)*(1-(state.coreDamageReduction||0));
    const blockChance=Math.max(0,Math.min(1,1-blockMul));
    let hitBlocked=false;
    if(state.relicCoreBastion && Math.random()<0.05){
      state.fxEvents.push({type:'floatText',r:CORE_R,c:CORE_C,text:'방벽!',color:'#8fe7ff'});
      addLog('<span class="hl-gold">🛡️ 핵의 방벽</span> — 공격을 완전히 막아냈습니다!');
      hitBlocked=true;
    } else if(blockChance>0 && Math.random()<blockChance){
      state.fxEvents.push({type:'floatText',r:CORE_R,c:CORE_C,text:'막음!',color:'#8fe7ff'});
      hitBlocked=true;
    }
    if(!hitBlocked){
      state.throneHP=Math.max(0,state.throneHP-1);
      Sound.coreHit();
      if(state.coreReflectWaves>0 && state.coreReflectRatio>0){
        const reflect=Math.max(1,Math.round(h.atk*state.coreReflectRatio));
        h.hp-=reflect;
        state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'-'+reflect,color:'#c8b3ff'});
      }
    }
    state.fxEvents.push({type:'coreHit'},{type:'floatText',r:CORE_R,c:CORE_C,text:hitBlocked?'0':'-1',color:'#ff6873'});
    return;
  }
  if(coreDetected(h)){
    if(!h.coreFound){ h.coreFound=true; sayHero(h,'!','alert',1200,true); setTimeout(()=>{ if(state&&state.heroes.includes(h)&&h.hp>0) sayHero(h,pickHeroDialogue('coreFound'),'normal',2400,true); },950); }
    const coreGoals=neighbors4(CORE_R,CORE_C).filter(([r,c])=>{const t=state.grid[r][c];return t.type==='floor'&&t.obstacle!=='barricade'&&t.obstacle!=='pit'&&!(t.obstacle==='collapse_bridge'&&runeGateIsBlocking(t));});
    const coreStep=pathStepToGoal(h,coreGoals);
    if(coreStep){ if(!heroMovementAllowedThisStep(h)) return; h.prevR=h.r;h.prevC=h.c;h.r=coreStep[0];h.c=coreStep[1];h.stuckTicks=0;h.lastMoveAt=performance.now(); handleHeroTileEnter(h,state.grid[h.r][h.c]); return; }
  }

  // 장애물을 부수는 중 몬스터가 사거리에 들어오면 즉시 중단하고 전투를 우선합니다.
  if(h.digging && h.digKind==='obstacle'){
    const interrupt=findMonsterForHero(h);
    if(interrupt.monster){
      h.digging=false; h.digProgress=0; h.digKind=null; h.digTargetR=null; h.digTargetC=null;
      h.showedQuestion=false;
      sayHero(h,'!','alert',1000,true);
      addLog(`${HERO_TYPES.find(x=>x.id===h.typeId)?.name||'용사'}가 장애물 파괴를 멈추고 몬스터를 공격합니다.`);
    }
  }

  if(h.digging){
    const activeRootTile=h.digKind==='obstacle'?obstacleRootTile(h.digTargetR,h.digTargetC):null;
    const attackingIronWall=activeRootTile?.obstacle==='barricade'||(activeRootTile?.obstacle==='collapse_bridge'&&activeRootTile.runeGatePermanent);
    if(!attackingIronWall && performance.now()>=(h.soundNextDigAt||0)){ Sound.dig(); h.soundNextDigAt=performance.now()+520; }
    if(!attackingIronWall) h.digProgress+=dt;
    const digHt=heroTypeOf(h);
    const digTimeMul=(digHt&&digHt.digTimeMul)||1;
    let need;
    if(h.digKind==='obstacle'){
      const rootTile=obstacleRootTile(h.digTargetR,h.digTargetC);
      const ob=rootTile?.obstacle;
      if(!ob){ h.digging=false; h.digProgress=0; h.digKind=null; return; }
      // v49: 아래에서 root를 쓰는데 선언이 없어 ReferenceError가 매 틱 발생하고 바리케이드가 절대 부서지지 않던 버그 수정
      const root=obstacleRootPos(h.digTargetR,h.digTargetC) || {r:h.digTargetR,c:h.digTargetC};
      need=obstacleBreakTime(ob,h,rootTile);
      if(ob==='barricade'||(ob==='collapse_bridge'&&rootTile.runeGatePermanent)){
        const attackNow=performance.now();
        if(attackNow>=(h.obstacleAttackNextAt||0)){
          h.obstacleAttackNextAt=attackNow+Math.max(430,760-((h.level||1)*4));
          const beforeHp=rootTile.obstacleHp||rootTile.obstacleMaxHp;
          const dealt=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*.9));
          rootTile.obstacleHp=Math.max(0,beforeHp-dealt);
          markObstacleTrigger(rootTile,OBSTACLE_TRIGGER_FX_MS[ob]||300);syncObstacleFootprint(root.r,root.c);
          const dr=Math.sign(root.r-h.r),dc=Math.sign(root.c-h.c);
          state.fxEvents.push({type:'damageNumber',r:root.r,c:root.c,amount:dealt,color:'#ffc27a'},{type:'battleHit',r:root.r,c:root.c,color:'#d4c2a8',strong:dealt>12,damage:dealt,dr,dc,weaponType:isRangedHeroUnit(h)?'spear':heroMeleeWeaponType(h.typeId),attackerType:h.typeId});
          if(isRangedHeroUnit(h)) Sound.heroRanged(rangedProjectileKind('hero',h.typeId)); else Sound.heroAttack(heroMeleeWeaponType(h.typeId));
        }
        if(rootTile.obstacleHp>0){h.digProgress=0;return;}
        h.digProgress=1;need=1;
      }else if(rootTile && rootTile.obstacleMaxHp>0){
        // 다른 파괴 가능 장애물은 기존 시간 기반 해체 규칙을 유지합니다.
        const beforeHp=rootTile.obstacleHp||rootTile.obstacleMaxHp;
        const damagePerMs=rootTile.obstacleMaxHp/Math.max(1,need*1000);
        const dealt=Math.min(beforeHp,damagePerMs*dt*1000);
        rootTile.obstacleHp=Math.max(0,beforeHp-dealt);
        if(OBSTACLE_TRIGGER_FX_MS[ob]) markObstacleTrigger(rootTile,OBSTACLE_TRIGGER_FX_MS[ob]);
        syncObstacleFootprint(root.r,root.c);
        if(dealt>=0.01 && Math.random()<0.10) state.fxEvents.push({type:'damageNumber',r:root.r,c:root.c,amount:dealt,color:'#ff9b3d'});
      }
    } else {
      need=(h.digKind==='wallObstacle'||h.digKind==='barricade'?BARRICADE_DIG_TIME:h.digKind==='web'?WEB_PASS_TIME:HERO_DIG_TIME)*digTimeMul;
    }
    if(h.digProgress>=need){
      const target=state.grid[h.digTargetR][h.digTargetC];
      if(h.digKind==='obstacle'){
        const root=obstacleRootPos(h.digTargetR,h.digTargetC) || {r:h.digTargetR,c:h.digTargetC};
        const rootTile=state.grid[root.r][root.c];
        const ob=OBSTACLE_TYPES.find(o=>o.id===rootTile.obstacle);
        const brokenOb=rootTile.obstacle;
        const reviveChance=state.relicTrapReviveChance||0;
        if(reviveChance>0 && brokenOb!=='barricade' && Math.random()<reviveChance){
          rootTile.obstacleHp=rootTile.obstacleMaxHp;
          syncObstacleFootprint(root.r,root.c);
          state.fxEvents.push({type:'obstacleBurst',r:root.r,c:root.c,ob:brokenOb,text:'♻️',footprint:2});
          addLog(`<span class="hl-gold">🪤 불멸의 함정</span> — ${ob?.name||'함정'}이 파괴를 버텨내고 재생했습니다!`);
        } else {
          if(state.relicRecoilingWall && brokenOb==='barricade'){
            const recoil=Math.max(1,Math.round((rootTile.obstacleMaxHp||30)*0.2));
            h.hp-=recoil;
            state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'-'+recoil,color:'#ff9b3d'});
            addLog(`<span class="hl-red">🧱 역류하는 벽</span> — 바리케이드가 무너지며 ${recoil}의 반격 피해를 입혔습니다.`);
          }
          state.fxEvents.push({type:'obstacleBreak',r:root.r,c:root.c,ob:brokenOb,text:'💥',footprint:2});
          clearObstacleFootprint(root.r,root.c);
          state.dungeonStats.obstaclesBroken=(state.dungeonStats.obstaclesBroken||0)+1;
          addLog(`<span class="hl">${HERO_TYPES.find(x=>x.id===h.typeId)?.name||'용사'}</span>가 ${ob?.name||'장애물'}을(를) 부쉈습니다.`);
        }
      } else if(h.digKind==='rock'||h.digKind==='wallObstacle'){
        state.grid[h.digTargetR][h.digTargetC]={type:'floor',isEntrance:false,obstacle:null};
        addLog(h.digKind==='wallObstacle'?'용사가 벽에 설치된 장애물을 부쉈습니다.':'용사가 던전 벽을 부쉈습니다.');
      } else if(h.digKind==='barricade'){
        target.obstacle=null; addLog('용사가 돌기둥을 부쉈습니다.');
      }
      state._mapDirty=true;
      state._rangesDirty=true;
      state._archetypeDirty=true;
      state._auraDirty=true;
      dungeonStructureInvalidate();
      h.prevR=h.r;h.prevC=h.c;h.lastStepR=h.digTargetR-h.r;h.lastStepC=h.digTargetC-h.c;h.r=h.digTargetR;h.c=h.digTargetC;h.showedQuestion=false;h.lastMoveAt=performance.now();
      if(Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C)<=1&&!h.coreFound){h.coreFound=true;sayHero(h,'!','alert',1200,true);setTimeout(()=>{if(state&&state.heroes.includes(h)&&h.hp>0)sayHero(h,pickHeroDialogue('coreFound'),'normal',2400,true);},950);}
      handleHeroTileEnter(h,state.grid[h.r][h.c]); h.digging=false;h.digProgress=0;h.digKind=null;
      if(performance.now()>=(h.nextDialogueAt||0)&&!h.coreFound)heroSay(h,'move');
    }
    return;
  }


  // 핵을 찾지 못한 상태에서도 무작위 좌표를 배회하지 않고,
  // 암벽을 뚫는 비용까지 고려한 A* 경로로 핵을 향합니다.
  // 이렇게 하면 시야 밖에 핵이 있어도 결국 핵으로 수렴합니다.
  h.wanderTicks=(h.wanderTicks||0)+dt; h.stuckTicks=(h.stuckTicks||0)+dt;

  function heroCoreRouteStep(){
    const startKey=h.r+'_'+h.c;
    const goalKey=CORE_R+'_'+CORE_C;
    if(startKey===goalKey) return null;
    const routeVersion=state.dungeonLayoutVersion||0;
    const cached=h._coreRouteCache;
    if(cached&&cached.version===routeVersion&&cached.r===h.r&&cached.c===h.c&&cached.steps?.length){
      const next=cached.steps.shift(); cached.r=next[0]; cached.c=next[1]; return next;
    }

    const open=[];
    const came=new Map();
    const gScore=new Map([[startKey,0]]);
    const fScore=new Map([[startKey,Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C)]]);
    const closed=new Set();
    const keyOf=(r,c)=>r+'_'+c;
    const parseKey=k=>k.split('_').map(Number);
    const terrainCost=(r,c)=>{
      const t=state.grid[r][c];
      if(t.type==='core') return 1;
      if(t.type==='rock') return t.obstacle ? 5.5 : 3;
      if(!t.obstacle) return 1;
      const ht=heroTypeOf(h)||{};
      const danger={spike:4.8,poison:4.5,frost:2.8,web:4.0,curse:4.3,statue:5.0,flame:6.0,lightning:5.5,pit:99,barricade:7.0,gust:6.2,magnet:5.2,stun_cage:6.0,collapse_bridge:runeGateIsBlocking(t)?8.5:2.2}[t.obstacle]||3.5;
      // 광부/숙련형은 장애물을 직접 처리하는 편을 선호합니다.
      if(ht.digTimeMul && ht.digTimeMul<1) return Math.max(1.3,danger*0.58);
      // 사냥꾼은 위험을 빨리 발견하고, 함정이 많은 길을 적극 회피합니다.
      if(ht.targetPriority==='lowestHp' || h.typeId==='hunter') return danger+1.3;
      // 방패병/팔라딘은 안전한 우회를 조금 덜 선호하지만, 고위험 함정은 피합니다.
      if(h.typeId==='shieldbearer'||h.typeId==='paladin') return danger*0.88;
      return danger;
    };
    const pushOpen=(key)=>{
      const f=fScore.get(key);
      let i=open.length;
      while(i>0 && (fScore.get(open[i-1])??Infinity)>f) i--;
      open.splice(i,0,key);
    };
    pushOpen(startKey);

    while(open.length){
      const current=open.shift();
      if(closed.has(current)) continue;
      const [cr,cc]=parseKey(current);
      if(current===goalKey){
        const rev=[]; let cur=current,prev=came.get(cur);
        if(!prev) return null;
        while(cur!==startKey){ rev.push(parseKey(cur)); cur=prev; prev=came.get(cur); if(cur!==startKey&&!prev) break; }
        rev.reverse();
        const next=rev.shift();
        if(next) h._coreRouteCache={version:routeVersion,r:next[0],c:next[1],steps:rev};
        return next||null;
      }
      closed.add(current);
      for(const [nr,nc] of neighbors4(cr,cc)){
        if(!inBounds(nr,nc)) continue;
        const nt=state.grid[nr][nc];
        if(nt.type==='chasm' || nt.obstacle==='pit' || (nt.type==='rock' && nt.isEntrance)) continue;
        const nk=keyOf(nr,nc);
        if(closed.has(nk)) continue;
        const tentative=(gScore.get(current)??Infinity)+terrainCost(nr,nc);
        if(tentative < (gScore.get(nk)??Infinity)){
          came.set(nk,current);
          gScore.set(nk,tentative);
          fScore.set(nk,tentative+Math.abs(nr-CORE_R)+Math.abs(nc-CORE_C));
          pushOpen(nk);
        }
      }
    }
    return null;
  }

  let step=heroCoreRouteStep();

  // 예외적으로 경로 계산이 실패하면 기존의 개척 로직을 보조 수단으로 사용합니다.
  if(!step){
    if(h.stuckTicks>=2&&!h.showedQuestion){sayHero(h,'?','question',1800,true);h.showedQuestion=true;}
    if(h.stuckTicks>5){h.stuckTicks=0;h.showedQuestion=false;}
    return;
  }
  const [tr,tc]=step;const tile=state.grid[tr][tc];
  const responseProfile=heroDungeonResponseProfile(h);
  if(tile.obstacle){
    const danger={spike:4.8,poison:4.5,frost:2.8,web:4.0,curse:4.3,statue:5.0,flame:6.0,lightning:5.5,pit:99,barricade:7.0}[tile.obstacle]||3.5;
    h.dungeonIntent=(responseProfile.role==='breaker'?'장애물 돌파':danger>=4.8?'위험 구간 회피/판단':'장애물 대응');
  } else {
    h.dungeonIntent=responseProfile.role==='scout'?'안전한 경로 탐색':'핵으로 전진';
  }
  if(tile.type==='rock'){
    // v49: 다른 용사가 이미 이 벽을 파는 중이면 시작하지 않고 뒤에서 기다립니다.
    if(findHeroDiggingSameTarget(h,'rock',tr,tc)){ heroWaitBehindDigger(h); return; }
    h.digging=true;h.digKind=tile.obstacle?'wallObstacle':'rock';h.digTargetR=tr;h.digTargetC=tc;h.digProgress=0;return;
  }
  if(tile.obstacle){
    const obId=tile.obstacle;
    if(obId==='collapse_bridge'&&runeGateIsBlocking(tile)){
      if(tile.runeGatePermanent){
        if(findHeroDiggingSameTarget(h,'obstacle',tr,tc)){heroWaitBehindDigger(h);return;}
        h.digging=true;h.digKind='obstacle';h.digTargetR=tr;h.digTargetC=tc;h.digProgress=0;h.showedQuestion=false;h.dungeonIntent='영구 봉인 룬문 파괴';
        sayHero(h,'!','alert',900,true);return;
      }
      h.dungeonIntent='룬문 개방 대기';h.stuckTicks=Math.min(h.stuckTicks,1.5);return;
    }
    const profile=heroDungeonResponseProfile(h); const detected=(obId==='barricade') || Math.random()<Math.min(.98,Math.max(.05,obstacleDetectChance(h,obId)+profile.detectBonus));
    if(detected){
      state.dungeonStats.obstaclesSeen=(state.dungeonStats.obstaclesSeen||0)+1;
      // 돌기둥은 실제로 길을 막으므로 발견하면 파괴합니다.
      // 나머지 장애물은 '발견 = 경고'로만 처리하고 먼저 밟게 하여 장애물 효과가 반드시 체감되도록 합니다.
      if(obId==='barricade'){
        // v49: 같은 바리케이드를 이미 다른 용사가 부수는 중이면 대기합니다.
        if(findHeroDiggingSameTarget(h,'obstacle',tr,tc)){ heroWaitBehindDigger(h); return; }
        h.digging=true;h.digKind='obstacle';h.digTargetR=tr;h.digTargetC=tc;h.digProgress=0;h.showedQuestion=false;
        sayHero(h,'?','question',1300,true);
        addLog(`${HERO_TYPES.find(x=>x.id===h.typeId)?.name||'용사'}가 바리케이드를 발견하고 파괴를 시작합니다.`);
        return;
      }
      addLog(`${HERO_TYPES.find(x=>x.id===h.typeId)?.name||'용사'}가 ${OBSTACLE_TYPES.find(o=>o.id===obId)?.name||'장애물'}을 발견했지만 돌파를 시도합니다.`);
    } else {
      state.dungeonStats.obstaclesMissed=(state.dungeonStats.obstaclesMissed||0)+1;
      addLog(`${HERO_TYPES.find(x=>x.id===h.typeId)?.name||'용사'}가 장애물을 발견하지 못한 채 지나갑니다.`);
    }
  }
  if(!heroMovementAllowedThisStep(h)) return;
  h.prevR=h.r;h.prevC=h.c;h.lastStepR=tr-h.r;h.lastStepC=tc-h.c;h.r=tr;h.c=tc;h.stuckTicks=0;h.showedQuestion=false;h.lastMoveAt=performance.now();
  if(Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C)<=1&&!h.coreFound){h.coreFound=true;sayHero(h,'!','alert',1200,true);setTimeout(()=>{if(state&&state.heroes.includes(h)&&h.hp>0)sayHero(h,pickHeroDialogue('coreFound'),'normal',2400,true);},950);}else{heroSay(h,'move');}
  handleHeroTileEnter(h,tile);
}


function obstacleRange(kind, tile){
  const baseTile=tile || (state ? findObstacleTileByKind(kind) : null),lv=obstacleLevel(baseTile);
  if(['flame','lightning','poison','barricade','pit','frost','web','stun_cage','collapse_bridge'].includes(kind)) return 0;
  if(kind==='gust') return FLAME_SPRAYER_RANGE+(lv>=5?1:0)+(lv>=10?1:0);
  if(kind==='magnet') return HARPOON_RANGE+(lv>=5?1:0);
  const local=Math.min(4,(lv>=10?2:lv>=5?1:0));
  return Math.max(0,local+(state?.obstacleRangeBonus||0)+mawangSkillLevel('maze_master'));
}
function obstacleDistanceToHero(rootR,rootC,heroR,heroC){
  const rootTile=state?.grid?.[rootR]?.[rootC];
  const obId=rootTile?.obstacle;
  const fp=(typeof obstacleFootprintCells==='function'&&obId)?obstacleFootprintCells(rootR,rootC,obId):{cells:[[rootR,rootC]]};
  let best=Infinity;
  for(const [rr,cc] of fp.cells){
    if(!inBounds(rr,cc)) continue;
    best=Math.min(best,Math.hypot(rr-heroR,cc-heroC));
  }
  return best;
}
function findObstacleTileByKind(kind){
  if(!state) return null;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const t=state.grid[r][c]; if(t.obstacle===kind && isObstacleRoot(r,c)) return t;
  }
  return null;
}
function obstacleRangeAt(r,c){
  const t=obstacleRootTile(r,c);
  return obstacleRange(t?.obstacle,t);
}

function processStatue(r,c,tile,dt){
  tile.statueCooldown=(tile.statueCooldown||0)-dt;
  const lv=obstacleLevel(tile);
  const range=obstacleRange('statue',tile);
  if(tile.statueCooldown<=0){
    state.fxEvents.push({type:'obstacleAuraPulse',r:r+0.5,c:c+0.5,ob:'statue',lv,footprint:2});
    tile.statueCooldown=1.15;
  }
}

let _combatObstacleRootCache={state:null,grid:null,version:-1,roots:[]};
function combatObstacleRoots(){
  const version=state?.dungeonLayoutVersion||0,grid=state?.grid;
  if(_combatObstacleRootCache.state===state&&_combatObstacleRootCache.grid===grid&&_combatObstacleRootCache.version===version) return _combatObstacleRootCache.roots;
  const roots=[];
  if(grid) for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
    const tile=grid[r][c],ob=tile?.obstacle; if(ob&&isObstacleRoot(r,c)) roots.push({r,c,tile});
  }
  _combatObstacleRootCache={state,grid,version,roots}; return roots;
}
function processObstacleVisualsAndZones(dt){
  const now=performance.now();
  for(const root of combatObstacleRoots()){
    const r=root.r,c=root.c,tile=root.tile,ob=tile.obstacle;if(!ob)continue;
    if(typeof physicalDef==='function' && physicalDef(ob)) continue;
    const lv=obstacleLevel(tile),range=obstacleRange(ob,tile);
    if(ob==='collapse_bridge'){processRuneGateState(r,c,tile,lv,now);continue;}
    if(ob==='gust'){triggerFlameSprayer({r,c},tile,lv,now);continue;}
    if(ob==='magnet'){triggerHarpoonPulse({r,c},tile,lv,now);continue;}
    for(const h of state.heroes){
      if(h.hp<=0)continue; const d=obstacleDistanceToHero(r,c,h.r,h.c); if(d>range)continue;
      if(ob==='poison'){
        if(!(h.obstaclePoisonUntil&&now<h.obstaclePoisonUntil)){
          const rlv=trapResearchLevel('poison');
          const tick=Math.max(1,Math.round(POISON_DPS*lerpLv(lv,1,2.4)*(1+(rlv-1)*.05)*trapAmplifyMul()*trapMasteryAttackDmgMul()));
          applyTimedObstaclePoison(h,tick,now,'poison');
        }
      }
      else if(ob==='flame'){
        const rlv=trapResearchLevel('flame');
        const cursedLava=(state.archetypeActive&&state.archetypeActive.fireCurse&&h.obstacleCurseUntil&&now<h.obstacleCurseUntil)?1.25:1;
        const dps=LAVA_DPS*lerpLv(lv,1,2.6)*(1+(rlv-1)*.05)*trapAmplifyMul()*trapMasteryAttackDmgMul()*mawangObstacleMultiplier()*cursedLava;
        const beforeLavaHp=h.hp;
        h.hp-=dps*dt;h.lastTrapHitAt=now;
        if(rlv>=5 && h.hp<=0 && beforeLavaHp>0){
          const burst=Math.max(1,Math.round(LAVA_DPS*lerpLv(lv,1,2.0)*trapAmplifyMul()));
          for(const o of state.heroes){if(o!==h&&o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=1){o.hp-=burst;state.fxEvents.push({type:'damageNumber',r:o.r,c:o.c,amount:burst,color:'#ff8b45'});}}
          state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'flame',text:'💥',footprint:1});
        }
        if(now-(h.flameBurnFxAt||0)>650){state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:Math.max(1,Math.round(dps*.65)),color:'#ff8b45'},{type:'obstacleSpecial',r:h.r,c:h.c,ob:'flame'});h.flameBurnFxAt=now;}
      }
      else if(ob==='lightning'||ob==='spike'){ activateObstacle(h,tile,'stay'); }
      else if(ob==='pit'){ /* 정상 이동으로는 진입하지 않으며 강제 이동에서만 낙사 처리 */ }
      else if(ob==='barricade'){ /* 철벽은 통행 차단 + 직접 공격 파괴 */ }
      else if(ob==='frost'){
        const rlv=trapResearchLevel('frost');h.frostSlowUntil=now+650;h.frostSlowMul=Math.max(.2,lerpLv(lv,.80,.45)-(rlv-1)*.025-((state.archetypeActive&&state.archetypeActive.glacial)?0.06:0));
      }
      else if(ob==='web'){
        const rlv=trapResearchLevel('web');h.webSlowUntil=now+850;h.webSlowMul=Math.max(.25,lerpLv(lv,.75,.42)-(rlv-1)*.02-((state.archetypeActive&&state.archetypeActive.glacial)?0.06:0));
        if(now-(h.webFxAt||0)>850){state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'web',text:'🕸'});h.webFxAt=now;}
      }
      else if(ob==='curse'){
        if(applyCursePulse(h,tile,lv,now,false)){
          state.fxEvents.push({type:'obstacleAuraPulse',r:h.r,c:h.c,ob:'curse',lv});
          markObstacleTrigger(tile,320);
        }
      }
    }
    if(ob==='statue' && now-(tile.obstacleFxAt||0)>1100){state.fxEvents.push({type:'obstacleAuraPulse',r,c,ob:'statue',lv});tile.obstacleFxAt=now;}
  }
}

function collectAuraPositions(){
  const out={statue:[],curse:[],barricade:[]};
  for(const root of combatObstacleRoots()){
    const ob=root.tile?.obstacle; if(ob&&out[ob]) out[ob].push({r:root.r,c:root.c});
  }
  return out;
}

/* ---------------- economy: day cycle ---------------- */
/* ---------------- main logic loop ---------------- */
/* ==========================================================================
   v38.6 · 이동 버그 수정: 시뮬레이션(논리 틱)과 화면 렌더링을 완전히 분리합니다.

   [기존 문제]
   - v38.5는 틱 주기를 50ms로 줄이고 3배속에서 한 프레임에 3스텝을 몰아서 돌렸습니다.
     그 결과 (1) 용사/몬스터가 한 프레임에 여러 칸을 이동해 순간이동처럼 보이고,
     (2) 틱 수 기준으로 동작하던 용사 이동/공격/경직이 4배 빨라져 움직임이 부자연스러웠습니다.
   [수정]
   - 논리 스텝 길이는 항상 TICK_MS(=200ms)로 고정해 원래 밸런스를 복구합니다.
   - 배속은 "스텝 사이의 실제 대기시간"만 줄입니다. (3배속 -> 약 66.7ms마다 1스텝)
   - 한 애니메이션 프레임에는 최대 1스텝만 진행하므로 절대 두 칸을 한 번에 건너뛰지 않습니다.
   - 토큰 CSS 이동 시간(--tok-move)을 스텝의 실제 길이와 똑같이 맞춰, 칸과 칸 사이를
     끊김 없이 미끄러지듯 이동하게 만듭니다.
   ========================================================================== */
let _tokMoveMs=-1;
function syncTokenMoveDuration(){
  const ms=Math.max(40,Math.round(TICK_MS/Math.max(1,gameSpeed)));
  if(ms===_tokMoveMs) return;
  _tokMoveMs=ms;
  document.documentElement.style.setProperty('--tok-move', ms+'ms');
}
let _loopLastAt=0, _logicAcc=0, _lastRenderAt=0, _lastVisualRenderAt=0;
function renderCombatVisualFrame(){
  // 논리 상태가 바뀌지 않은 프레임에는 전체 UI를 다시 계산하지 않습니다.
  // CSS 토큰 이동은 브라우저가 자체 보간하고, 시간 기반의 짧은 상태표시와 물리 함정/비행체/대기 FX만 처리합니다.
  if(typeof syncTokenTransientVisuals==='function') syncTokenTransientVisuals();
  if(typeof renderPhysicalTraps==='function') renderPhysicalTraps();
  if(state?.fxEvents?.length && typeof processFxEvents==='function') processFxEvents();
}
function gameLoop(now){
  requestAnimationFrame(gameLoop);
  if(!_loopLastAt) _loopLastAt=now;
  const elapsed=Math.min(400, now-_loopLastAt); // 탭 전환 등으로 크게 밀린 시간은 잘라냅니다.
  _loopLastAt=now;
  syncTokenMoveDuration();
  // 물리 함정 스프라이트는 별도 requestAnimationFrame 루프를 만들지 않고 메인 루프에 합칩니다.
  if(typeof physicalAnimateSpritesFrame==='function') physicalAnimateSpritesFrame();
  if(!state||!state.running||state.gameOver) return;
  const stepMs=TICK_MS/Math.max(1,gameSpeed);
  const paused=(state.phase==='cardSelect' || state.phase==='waveTransition' || state.phase==='eventSelect' || state.phase==='placeCore');
  let stepped=false;
  if(paused){
    _logicAcc=0;
  } else {
    _logicAcc=Math.min(_logicAcc+elapsed, stepMs*2);
    if(_logicAcc>=stepMs){
      _logicAcc-=stepMs;
      simulateStep(TICK_MS/1000);
      stepped=true;
    }
  }
  // 논리 스텝에서만 전체 UI/토큰 상태를 동기화합니다. 논리 스텝 사이의 20fps 프레임은
  // 물리 함정/비행체/대기 FX만 갱신해 모바일 DOM 부하를 크게 줄입니다.
  if(stepped){
    _lastRenderAt=now; _lastVisualRenderAt=now; renderUI();
  }else if(now-_lastVisualRenderAt>=50){
    _lastVisualRenderAt=now; renderCombatVisualFrame();
  }
}
// 하위 호환용(외부에서 tick()을 호출하는 코드가 있을 경우 1스텝만 안전하게 진행)
function tick(){
  if(!state||!state.running||state.gameOver) return;
  if(state.phase==='cardSelect' || state.phase==='waveTransition' || state.phase==='eventSelect' || state.phase==='placeCore'){ renderUI(); return; }
  simulateStep(TICK_MS/1000);
  renderUI();
}
// --- v21~v22 아키타입(빌드 규칙) 시스템: 몬스터/장애물 구성이 조건을 충족하면 규칙 자체가 바뀝니다. ---
const ARCHETYPE_DEFS=[
  {key:'sniper',icon:'🏹',name:'저격 군단',relicFlag:'relicSniperLegion',
    rule:'같은 용사를 2마리 이상이 동시 조준 중이면, 체력 25% 이하일 때 다음 피격에 즉시 처형',
    reqs:[{label:'원거리(사거리2+) 몬스터',get:c=>c.rangedCount,need:3,cuttable:true}]},
  {key:'glacial',icon:'🧊',name:'빙하 감옥',relicFlag:'relicGlacialPrison',
    rule:'빙판과 거미둥지의 이동속도 감소 효과가 추가로 6%p 강화됩니다',
    reqs:[{label:'냉기/거미줄 함정',get:c=>c.ccTraps,need:3,cuttable:true}]},
  {key:'packFury',icon:'🐺',name:'광란의 무리',relicFlag:'relicPackFury',
    rule:'동료가 죽을 때마다 반경 2칸 몬스터 전원 4초간 공격력 +40%(갱신형)',
    reqs:[{label:'생존 몬스터',get:c=>c.aliveCount,need:6,cuttable:true}]},
  {key:'unbrokenLine',icon:'🧱',name:'불패의 전선',relicFlag:'relicUnbrokenLine',
    rule:'탱커가 용사를 타격할 때마다 핵 체력 +1 회복',
    reqs:[{label:'탱커/수호형 몬스터',get:c=>c.tankCount,need:2,cuttable:true},
          {label:'방어 시설(바리케이드/석상)',get:c=>c.defenseTraps,need:1,cuttable:false}]},
  {key:'plague',icon:'☠️',name:'역병 지대',relicFlag:'relicPlagueZone',
    rule:'중독·저주 상태로 죽은 용사는 그 자리에서 폭발해 인접 용사에게 중독/저주를 전염시킵니다',
    reqs:[{label:'독늪/저주 함정 합계',get:c=>c.poisonCurseTraps,need:3,cuttable:true}]},
  {key:'chainBlast',icon:'💥',name:'연쇄 폭발',relicFlag:'relicChainBlast',
    rule:'직격형 함정(스파이크·화염·번개)이 발동하면 반경 2칸의 다른 직격형 함정도 함께 자동 발동',
    reqs:[{label:'직격형 함정(스파이크/화염/번개)',get:c=>c.damageTraps,need:3,cuttable:true}]},
  {key:'berserkCult',icon:'🩸',name:'광전사 결사',relicFlag:'relicBerserkCult',
    rule:'광폭 몬스터 한 마리가 격노(체력 50%↓)에 들어가면 다른 광폭 몬스터 전원도 즉시 함께 격노',
    reqs:[{label:'광폭(rage) 몬스터',get:c=>c.rageCount,need:2,cuttable:true}]},
  {key:'shadowExec',icon:'🗡️',name:'그림자 처형단',relicFlag:'relicShadowExec',
    rule:'다른 몬스터가 용사를 체력 25% 이하로 깎으면, 처형자 몬스터가 그 용사를 즉시 암살',
    reqs:[{label:'즉사(execute) 몬스터',get:c=>c.executeCount,need:1,cuttable:false},
          {label:'생존 몬스터',get:c=>c.aliveCount,need:3,cuttable:true}]},
  {key:'sanctuary',icon:'🩹',name:'수호 성소',relicFlag:'relicSanctuary',
    rule:'힐러 범위 안 몬스터가 즉사할 위기(체력 10%↓)에 처하면 힐러가 체력을 나눠줘 1회 죽음을 막습니다',
    reqs:[{label:'힐러형 몬스터',get:c=>c.healerCount,need:1,cuttable:false},
          {label:'생존 몬스터',get:c=>c.aliveCount,need:3,cuttable:true}]},
  {key:'pitMaze',icon:'🕳️',name:'함정의 미궁',relicFlag:'relicPitMaze',
    rule:'심연구덩이에 밀린 보스 영웅이 받는 심연 피해가 최대 HP의 6%p만큼 추가됩니다',
    reqs:[{label:'구덩이 함정',get:c=>c.pitTraps,need:2,cuttable:true}]},
  {key:'auraResonance',icon:'🏛️',name:'오라 공명',relicFlag:'relicAuraResonance',
    rule:'용사를 처치하면 반경 2칸 몬스터 전원이 소량 회복(석상·저주의 오라 공명)',
    reqs:[{label:'수호 석상',get:c=>c.statueCount,need:1,cuttable:false},
          {label:'저주 토템',get:c=>c.curseCount,need:1,cuttable:false}]},
  {key:'mazeArchitect',icon:'⛏️',name:'미궁 건축가',relicFlag:'relicMazeArchitect',
    rule:'막다른 길에 갇혀 길을 헤매는 용사는 일시적으로 공격력이 감소합니다',
    reqs:[{label:'개척한 통로',get:c=>c.tilesDug,need:40,cuttable:true},
          {label:'막다른 길',get:c=>c.deadends,need:3,cuttable:false}]},
  {key:'goldMerc',icon:'💰',name:'황금 용병단',relicFlag:'relicGoldMerc',
    rule:'몬스터가 전사하면 투자한 골드의 일부를 즉시 환급받습니다',
    reqs:[{label:'배치 몬스터 투자 골드',get:c=>c.investedGold,need:500,cuttable:true}]},
  {key:'fireCurse',icon:'🔥',name:'화염 저주 결계',relicFlag:'relicFireCurse',
    rule:'저주 걸린 용사가 용암지대 위에 있으면 용암 지속 피해가 25% 증가합니다',
    reqs:[{label:'화염 함정',get:c=>c.flameTraps,need:1,cuttable:false},
          {label:'저주 토템',get:c=>c.curseCount,need:1,cuttable:false}]},
  {key:'undeadPact',icon:'🧛',name:'불사의 계약',relicFlag:'relicUndeadPact',
    rule:'흡혈형 몬스터가 죽기 직전(체력 10%↓ 피격) 근처에 힐러가 있으면, 죽는 대신 체력 1로 되살아납니다(몬스터별 판당 1회)',
    reqs:[{label:'흡혈형 몬스터',get:c=>c.lifestealCount,need:1,cuttable:false},
          {label:'힐러형 몬스터',get:c=>c.healerCount,need:1,cuttable:false}]},
];
function archetypeReqMet(req,counts,cut){
  const need=req.cuttable?Math.max(1,req.need-cut):req.need;
  return (req.get(counts)||0)>=need;
}
function archetypeIsActive(def,counts,cut){
  if(!state[def.relicFlag]) return false;
  return def.reqs.every(r=>archetypeReqMet(r,counts,cut));
}
function updateArchetypeState(){
  const cut=state.archetypeThresholdCut||0;
  const c={rangedCount:0,tankCount:0,aliveCount:state.monsters.length,rageCount:0,executeCount:0,healerCount:0,lifestealCount:0,investedGold:0};
  for(const m of state.monsters){
    if((m.range||1)>=2) c.rangedCount++;
    if(m.special==='tank'||m.special==='guard') c.tankCount++;
    if(m.special==='rage') c.rageCount++;
    if(m.special==='execute') c.executeCount++;
    if(m.role==='healer') c.healerCount++;
    if(m.special==='lifesteal') c.lifestealCount++;
    c.investedGold+=(m.invested||0);
  }
  c.ccTraps=0; c.defenseTraps=0; c.poisonCurseTraps=0; c.damageTraps=0; c.pitTraps=0;
  c.statueCount=0; c.curseCount=0; c.flameTraps=0;
  for(let r=0;r<GRID;r++)for(let cc=0;cc<GRID;cc++){
    const ob=state.grid[r][cc].obstacle;
    if(!ob || !isObstacleRoot(r,cc)) continue;
    if(ob==='frost'||ob==='web') c.ccTraps++;
    if(ob==='barricade'||ob==='statue') c.defenseTraps++;
    if(ob==='poison'||ob==='curse') c.poisonCurseTraps++;
    if(ob==='spike'||ob==='flame'||ob==='lightning') c.damageTraps++;
    if(ob==='pit') c.pitTraps++;
    if(ob==='statue') c.statueCount++;
    if(ob==='curse') c.curseCount++;
    if(ob==='flame') c.flameTraps++;
  }
  c.tilesDug=state.tilesDug||0;
  const struct=computeDungeonStructure();
  c.deadends=(struct&&struct.zones&&struct.zones.deadend)||0;
  state.archetypeCounts=c;
  const active={};
  for(const def of ARCHETYPE_DEFS) active[def.key]=archetypeIsActive(def,c,cut);
  state.archetypeActive=active;
  // 광전사 결사: 광폭 몬스터 중 하나라도 격노 조건(체력 50%↓)을 만족하면 전염 플래그
  state.archetypeRageTrigger=active.berserkCult && state.monsters.some(m=>m.special==='rage'&&m.hp<=m.maxHp*0.5);
}

function simulateStep(dt){
  if(state.goldPerSec>0){
    const earned=state.goldPerSec*dt*GOLD_INCOME_MULT;
    state.gold+=earned;
    state.totalGoldEarned=(state.totalGoldEarned||0)+earned;
  }

  if(state.phase==='build'){
    // v38.6: 마을 습격 예고 중에는 준비시간 대신 '습격까지 남은 시간'이 흐릅니다.
    //        이 동안에는 평소처럼 몬스터/장애물을 배치할 수 있습니다.
    if(state.villagePrepTimer!=null){
      state.villagePrepTimer-=dt;
      if(state.villagePrepTimer<=0){
        state.villagePrepTimer=null;
        if(typeof startVillageRaid==='function') startVillageRaid();
      }
    }
    // 마을 습격 결과창이 열린 동안에는 복귀 연출만 보여주고 준비시간은 흐르지 않습니다.
    else if(!state._villageReturnLock){
      state.buildTimer-=dt;
      if(state.buildTimer<=0){
        startWave();
      }
    }
  } else {
    state.invasionTimer+=dt;
    if(state.waveHeroesSpawned<state.waveHeroesTotal){
      state.spawnCooldown-=dt;
      if(state.spawnCooldown<=0){
        const spawned=spawnHeroParty(state.waveHeroesTotal-state.waveHeroesSpawned);
        if(spawned>0){
          state.waveHeroesSpawned=Math.min(state.waveHeroesTotal,state.waveHeroesSpawned+spawned);
          state.spawnInterval=Math.max(SPAWN_INTERVAL_MIN,state.spawnInterval-0.025);
          state.spawnCooldown=state.spawnInterval;
        } else {
          state.spawnCooldown=0.4;
        }
      }
    }
  }

  if(state.relicSymbioticChain && state.monsters.length>1){
    const now=performance.now();
    if(now-(state._symbioTickAt||0)>1000){
      state._symbioTickAt=now;
      for(const m of state.monsters){
        if(m.hp>=m.maxHp) continue;
        const neighbor=state.monsters.find(o=>o!==m&&Math.abs(o.r-m.r)+Math.abs(o.c-m.c)===1&&o.hp>m.hp);
        if(neighbor){
          const share=Math.max(1,Math.round(neighbor.hp*0.02));
          neighbor.hp-=share; m.hp=Math.min(m.maxHp,m.hp+share);
          state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'+'+share,color:'#7ee3a7'});
        }
      }
    }
  }
  if(state.relicLastStand && !state.lastStandTriggered && state.maxThroneHP>0 && state.throneHP/state.maxThroneHP<=0.3){
    state.lastStandTriggered=true;
    state.globalMonsterAtkMul=(state.globalMonsterAtkMul||1)*1.25;
    addLog('<span class="hl-red">🌪️ 최후의 저항</span> — 핵이 위태로워지자 몬스터들이 각성해 공격력이 폭증합니다!');
    state.fxEvents.push({type:'coreHit'});
  }
  const logicNow=performance.now();
  if(state._archetypeDirty || !state.archetypeActive || logicNow-(state._archetypeTickAt||0)>=420){
    updateArchetypeState();
    state._archetypeTickAt=logicNow;
    state._archetypeDirty=false;
  }
  if(state._auraDirty || !state.auraPositions || logicNow-(state._auraTickAt||0)>=520){
    state.auraPositions=collectAuraPositions();
    state._auraTickAt=logicNow;
    state._auraDirty=false;
  }
  if(typeof processPhysicalTraps==='function') processPhysicalTraps(dt);
  processObstacleVisualsAndZones(dt);
  for(const p of state.auraPositions.statue){
    processStatue(p.r,p.c,state.grid[p.r][p.c],dt);
  }

  // 몬스터 AI 단계 동안 용사 위치는 고정이므로 한 번 만든 격자 인덱스를 공유합니다.
  if(typeof prepareHeroCombatSpatialIndex==='function') prepareHeroCombatSpatialIndex();
  if(state.mawang && !state.mawang.dead){ processMawangTick(state.mawang,dt); }
  for(const m of state.monsters) processMonsterTick(m,dt);
  // 용사 AI 단계에서는 몬스터 이동이 끝난 뒤의 위치를 한 번 인덱싱해 재사용합니다.
  if(typeof prepareMonsterCombatSpatialIndex==='function') prepareMonsterCombatSpatialIndex();
  state._heroMoveSerial=(state._heroMoveSerial||0)+1;
  for(const h of state.heroes) processHeroTick(h,dt);
  if(typeof clearCombatSpatialIndexes==='function') clearCombatSpatialIndexes();

  const _corpseSpawns=[];
  state.monsters=state.monsters.filter(m=>{
    if(m.hp<=0 && state.archetypeActive && state.archetypeActive.undeadPact && m.special==='lifesteal' && !m.undeadPactUsed){
      const healerNear=state.monsters.some(o=>o!==m&&o.hp>0&&o.role==='healer'&&Math.abs(o.r-m.r)+Math.abs(o.c-m.c)<=HEALER_RANGE);
      if(healerNear){
        m.hp=1; m.undeadPactUsed=true;
        state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'🧛부활!',color:'#c46cff'});
        addLog(`<span class="hl-gold">🧛 불사의 계약</span> — ${MONSTER_TYPES.find(x=>x.id===m.typeId)?.name||'몬스터'}가 죽음의 문턱에서 되살아났습니다.`);
        return true;
      }
    }
    if(m.hp<=0){
      pushDeathFx(m.r,m.c,'#ff6873');
      finalizeMonsterLifetime(m);
      addLog('몬스터가 전사했습니다.');
      state._archetypeDirty=true;
      state._panelDirty=true;
      if(state.archetypeActive && state.archetypeActive.goldMerc && (m.invested||0)>0){
        const refund=Math.round(m.invested*0.3);
        if(refund>0){ addGold(refund); state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'+'+refund+'G',color:'#e0b64a'}); }
      }
      if(state.archetypeActive && state.archetypeActive.packFury){
        const furyNow=performance.now();
        for(const o of state.monsters){
          if(o===m||o.hp<=0) continue;
          if(Math.abs(o.r-m.r)+Math.abs(o.c-m.c)<=2){
            const curMul=(o.skillAtkBuffUntil&&o.skillAtkBuffUntil>furyNow)?(o.skillAtkBuffMul||1):1;
            o.skillAtkBuffMul=Math.max(curMul,1.4); o.skillAtkBuffUntil=Math.max(o.skillAtkBuffUntil||0,furyNow+4000);
          }
        }
      }
      if(state.relicCorpseReviveChance>0 && Math.random()<state.relicCorpseReviveChance){
        _corpseSpawns.push({r:m.r,c:m.c});
      }
      if(state.selected&&state.selected.kind==='monster'&&state.selected.id===m.id) state.selected=null;
      state._panelDirty=true;
      return false;
    }
    return true;
  });
  for(const p of _corpseSpawns){
    if(state.monsters.length>=(state.monsterCap||MONSTER_CAP_START)) break;
    if(monsterAt(p.r,p.c)) continue;
    const risen=createMonsterEntity(p.r,p.c,'skeleton_archer',{tier:1,log:false,playSound:false});
    if(risen){ state.fxEvents.push({type:'spawnBurst',r:p.r,c:p.c,color:'rgba(150,60,90,.8)'}); addLog('<span class="hl-gold">💀 되살아나는 군세</span> — 쓰러진 자리에서 해골이 일어났습니다.'); }
  }
  state.heroes=state.heroes.filter(h=>{
    if(h.escaped){
      state.heroesEscaped=(state.heroesEscaped||0)+1;
      addLog('<span class="hl-gold">용사 한 명이 공포에 질려 던전을 탈출했습니다.</span>');
      return false;
    }
    if(h.hp<=0){
      if(!h.environmentDeath) pushDeathFx(h.r,h.c,'#e0495f');
      state._panelDirty=true;
      showTransientHeroBubble(h.r,h.c,pickHeroDialogue('death'),'death',2300);
      addGold(h.reward); state.killCount++;
      const ht=HERO_TYPES.find(x=>x.id===h.typeId);
      addLog(`${h.isBoss?'<span class="hl-red">용사 대장</span>을':`${ht.name}을(를)`} 처치했습니다. 골드 <span class="hl-gold">+${h.reward}G</span>`);
      if(h.isBoss && state.wave%10===0){ state.bossDefeated=(state.bossDefeated||0)+1; state.bossName=state.currentBossName; }
      if(state.relicTrapKillGold>0 && h.lastTrapHitAt && performance.now()-h.lastTrapHitAt<600){
        addGold(state.relicTrapKillGold);
        state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'+'+state.relicTrapKillGold+'G',color:'#e0b64a'});
      }
      if(h.killerMawang){
        const xpGain=20+(h.level||1)*7+(h.isBoss?45:0);
        state._mawangKills=(state._mawangKills||0)+1;
        mawangGainXp(xpGain,h);
        addLog(`<span class="hl-gold">👑 마왕 처치 경험</span> — XP +${xpGain}`);
      }
      if(h.killerMonsterId){
        const killer=state.monsters.find(x=>x.id===h.killerMonsterId);
        if(killer){
          if(buildTagCount('blood')) killer.hp=Math.min(killer.maxHp,killer.hp+(state.buildBonuses.blood||6));
          killer.kills=(killer.kills||0)+1;
          // 몬스터 실제 처치 수는 그대로 기록하고, 레벨 진행도만 처치당 2씩 올려 기존보다 정확히 2배 빠르게 성장합니다.
          if(killer.tier<MAX_TIER){
            killer.levelProgress=Math.max(0,Number(killer.levelProgress)||0)+MONSTER_LEVEL_PROGRESS_PER_KILL;
            while(killer.levelProgress>=KILLS_PER_LEVEL && killer.tier<MAX_TIER){
              killer.levelProgress-=KILLS_PER_LEVEL;
              levelUpMonster(killer);
            }
            if(killer.tier>=MAX_TIER) killer.levelProgress=0;
          }
          if(state.relicVeteranExecutioner && killer.kills>=15 && !killer.veteranBoosted){
            killer.veteranBoosted=true; killer.atk=Math.round(killer.atk*1.2); killer.maxHp=Math.round(killer.maxHp*1.15); killer.hp=Math.min(killer.maxHp,killer.hp+Math.round(killer.maxHp*0.15));
            addLog(`<span class="hl-gold">🎖️ 노련한 처형자</span> — ${MONSTER_TYPES.find(x=>x.id===killer.typeId)?.name||'몬스터'}가 역전의 용사가 되었습니다!`);
          }
          if(state.relicMarksmanMark && (killer.range||1)>=2 && Math.random()<0.25){
            killer.lastAttackAt=0;
          }
        }
      }
      if(state.archetypeActive && state.archetypeActive.plague && ((h.obstaclePoisonUntil&&performance.now()<h.obstaclePoisonUntil+3000) || (h.obstacleCurseUntil&&performance.now()<h.obstacleCurseUntil+3000))){
        const plagueNow=performance.now();
        for(const o of state.heroes){
          if(o===h||o.hp<=0) continue;
          if(Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=1){
            o.obstaclePoisonUntil=plagueNow+900;
            o.monsterCurseUntil=plagueNow+MONSTER_CURSE_MS;
            o.hp-=Math.max(1,Math.round(o.maxHp*0.03));
            state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'☠️전염',color:'#78f06b'});
          }
        }
        state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'poison',text:'☠️'});
      }
      if(state.archetypeActive && state.archetypeActive.auraResonance){
        for(const m of state.monsters){
          if(m.hp<m.maxHp && Math.abs(m.r-h.r)+Math.abs(m.c-h.c)<=2){
            m.hp=Math.min(m.maxHp,m.hp+Math.round(m.maxHp*0.04));
          }
        }
      }
      return false;
    }
    return true;
  });

  if(state.throneHP<=0){ state.throneHP=0; endGame(); return; }

  if(state.phase==='invasion' && state.waveHeroesSpawned>=state.waveHeroesTotal && state.heroes.length===0){
    finishWave();
    return;
  }
}

/* v40: 웨이브에 맞는 침입구 개수를 맞춰줍니다.
   기존 침입구는 그대로 두고 부족한 만큼만 새로 추가합니다(최대 5곳).
   예전에는 10웨이브마다 침입구 3곳을 통째로 다른 위치로 옮겼지만,
   이제는 21/41/61/81웨이브에서 한 곳씩 "늘어나기만" 합니다. */
function syncHeroEntrancesForWave(wave){
  if(!state||!state.grid) return null;
  const want=heroSpawnCountForWave(wave);
  const current=Array.isArray(state.heroSpawnPoints)?state.heroSpawnPoints.slice():[];
  if(current.length>=want) return current;

  const candidates=[];
  for(let c=0;c<GRID;c++){ candidates.push([0,c],[GRID-1,c]); }
  for(let r=1;r<GRID-1;r++){ candidates.push([r,0],[r,GRID-1]); }
  const shuffled=candidates.slice().sort(()=>Math.random()-.5);

  const minGap=Math.max(3,Math.floor(GRID*.12));
  const added=[];
  const farEnough=(pos,list)=>!list.some(sp=>{
    const rr=Array.isArray(sp)?sp[0]:sp.r, cc=Array.isArray(sp)?sp[1]:sp.c;
    return Math.abs(rr-pos[0])+Math.abs(cc-pos[1])<minGap;
  });

  for(const pos of shuffled){
    if(current.length+added.length>=want) break;
    if(!farEnough(pos,current)||!farEnough(pos,added)) continue;
    added.push(pos);
  }
  // 간격 조건 때문에 자리를 못 찾으면 조건을 풀고 채웁니다.
  while(current.length+added.length<want){
    const pos=candidates[Math.floor(Math.random()*candidates.length)];
    const dup=current.some(sp=>sp.r===pos[0]&&sp.c===pos[1])||added.some(p=>p[0]===pos[0]&&p[1]===pos[1]);
    if(!dup) added.push(pos);
  }
  if(!added.length) return current;

  added.forEach(([r,c])=>{
    state.grid[r][c]={type:'floor',isEntrance:true,breached:true,obstacle:null};
    state.fxEvents.push({type:'spawnBurst',r,c,color:'rgba(224,73,95,.95)'});
  });

  const points=current.concat(added.map(([r,c])=>({r,c})));
  state.heroSpawnPoints=points.map(sp=>({...sp}));
  state.heroSpawnPoint={...points[0]};
  state._mapDirty=true;
  state._rangesDirty=true;
  state._panelDirty=true;
  ENTRANCES=points.map(sp=>({...sp}));
  addLog(`<span class="hl-red">🚪 새로운 용사 침입구가 열렸습니다!</span> — 이제 침입구는 총 <b>${points.length}곳</b>입니다.`);
  return points;
}

function startWave(){
  // 전투 시작과 동시에 온보딩 팝업을 닫아 보드와 전투 화면을 가리지 않게 합니다.
  if(typeof window.hideFirstPlayTutorialForWave==='function') window.hideFirstPlayTutorialForWave();
  state.phase='invasion';
  state.wave++;
  state.invasionTimer=0;
  // v40: 매 웨이브마다 현재 웨이브에 맞는 침입구 개수를 확인하고,
  // 부족하면 새 침입구를 추가합니다(21/41/61/81웨이브에서 1곳씩, 최대 5곳).
  syncHeroEntrancesForWave(state.wave);
  configureStageEvent();
  // v20: 건설 단계(build)에서만 의미있는 웨이브 한정 계약/카드 보너스를 여기서 소모합니다.
  if(state.contractNoObstacleWaves>0) state.contractNoObstacleWaves--;
  if(state.contractNoSummonWaves>0) state.contractNoSummonWaves--;
  if(state.monsterCostDiscountWaves>0) state.monsterCostDiscountWaves--;
  if(state.contractExpensiveStrongWaves>0) state.contractExpensiveStrongWaves--;
  if(state.tempMonsterCapWaves>0){
    state.tempMonsterCapWaves--;
    if(state.tempMonsterCapWaves<=0 && state.tempMonsterCapAmt>0){
      state.monsterCap=Math.max(metaMonsterCap(),(state.monsterCap||MONSTER_CAP_START)-state.tempMonsterCapAmt);
      state.tempMonsterCapAmt=0;
    }
  }
  const riskMul=state.nextWaveRiskMul||1;
  const contractMul=(state.contractHeroRiskWaves>0)?(state.contractHeroRiskMul||1):1;
  // 기존 웨이브 구조는 유지합니다. 11~20웨이브는 전투 압력을 약 50% 낮춥니다.
  const midwaveMul=midwaveDifficultyScale();
  if(typeof villageRaidPruneEffects==='function') villageRaidPruneEffects(state.wave);
  const villageMods=typeof villageRaidWaveMods==='function'?villageRaidWaveMods(state.wave):{heroCountMul:1,spawnIntervalMul:1,active:[]};
  const earlyCountMul=(typeof earlyWaveCountMul==='function')?earlyWaveCountMul(state.wave):1;
  const panicBonus=state.stageEvent?.id==='panic'?(state.wave<=10?1:2):0;
  state.waveHeroesTotal=Math.max(1,Math.round((2+Math.floor(state.wave*1.5)+panicBonus)*.92*riskMul*contractMul*midwaveMul*earlyCountMul*villageMods.heroCountMul));
  state.nextWaveRiskMul=1;
  if(state.contractHeroRiskWaves>0) state.contractHeroRiskWaves--;
  state.nextWaveRewardMul=state.nextWaveRewardMul||1;
  state.wavePattern=BOSS_PROFILES[state.wave] ? {id:'boss_'+state.wave,name:BOSS_PROFILES[state.wave].name,speedMul:0.92,types:BOSS_PROFILES[state.wave].types} : getEncounterPattern(state.wave);
  state.currentBossName=BOSS_PROFILES[state.wave]?.name || null;
  const patternSpeed=state.wavePattern?.speedMul||1;
  const earlySpawnMul=(typeof earlyWaveSpawnIntervalMul==='function')?earlyWaveSpawnIntervalMul(state.wave):1;
  state.spawnInterval=Math.max(SPAWN_INTERVAL_MIN,(SPAWN_INTERVAL_START-state.wave*0.10)*state.stageSpawnMul*patternSpeed*earlySpawnMul);
  if(state.currentBossName) addLog(`<span class="hl-gold">☠️ ${state.currentBossName}</span>이(가) ${state.wave}웨이브의 최종 관문으로 출현합니다.`);
  else if(state.wavePattern) addLog(`<span class="hl-red">⚔️ ${state.wavePattern.name}</span>이(가) 침입을 시작합니다.`);
  state.waveHeroesSpawned=0;
  state.bossSpawnedThisWave=false;
  state.bossesSpawnedThisWave=0;
  setStageBackground(state.wave);
  state.spawnCooldown=1.2;
  state.spawnInterval=Math.max(SPAWN_INTERVAL_MIN, (SPAWN_INTERVAL_START-state.wave*0.10)*state.stageSpawnMul*earlySpawnMul*(villageMods.spawnIntervalMul||1));
  if(villageMods.active&&villageMods.active.length){
    const names=[...new Set(villageMods.active.map(e=>e.name).filter(Boolean))];
    if(names.length) addLog(`<span class="hl-gold">🏘️ 마을 약탈 효과</span> — ${names.join(' · ')} 적용 중`);
  }
  if(state.wave>1 && state.wave%10===1){ Sound.setStageMusic(Math.floor((state.wave-1)/10)); Sound.expand(); }
  Sound.waveStart();
  showWaveBanner(`웨이브 ${state.wave} 시작!`);
  addLog(`<span class="hl-red">웨이브 ${state.wave} 시작!</span> 용사 ${state.waveHeroesTotal}명이 몰려옵니다.`);
}

let waveTransitionTimer=null;
let waveCardTimer=null;
let defeatTimer=null;
let gameSessionId=0;

function waveClearMonsterProgressGain(wave){
  const w=Math.max(1,Number(wave)||1);
  // v83: 기존 생존 경험치보다 정확히 +50% 증가.
  // 기존 1~6:+2 / 7~12:+3 / 13~18:+4 / 이후:+5
  // 변경 1~6:+3 / 7~12:+4.5 / 13~18:+6 / 이후:+7.5
  const base=Math.max(2, Math.min(5, 2 + Math.floor((w-1)/6)));
  return base*1.5;
}
function grantWaveClearMonsterXp(){
  const alive=(state.monsters||[]).filter(m=>m && m.hp>0);
  if(!alive.length) return;
  const gain=waveClearMonsterProgressGain(state.wave||1);
  let affected=0, leveled=0;
  for(const m of alive){
    if(m.tier>=MAX_TIER){ m.levelProgress=0; continue; }
    affected++;
    m.levelProgress=Math.max(0,Number(m.levelProgress)||0)+gain;
    while(m.levelProgress>=KILLS_PER_LEVEL && m.tier<MAX_TIER){
      m.levelProgress-=KILLS_PER_LEVEL;
      levelUpMonster(m);
      leveled++;
    }
    if(m.tier>=MAX_TIER) m.levelProgress=0;
  }
  if(affected>0){
    addLog(`<span class="hl-gold">🧪 생존 경험</span> — 웨이브를 버틴 몬스터 ${affected}마리에게 경험치 +${gain}${leveled?` · ${leveled}마리 강화!`:''}`);
  }
}
function finishWave(){
  state.phase='waveTransition';
  const stageBonus=state.stageWaveGoldBonus||0;
  const coreHeal=(state.permaNoCoreHeal||state.contractNoCoreHealWaves>0)?0:Math.max(8,Math.round(state.maxThroneHP*0.08)+Math.round(state.relicCoreHealBonus||0));
  if(state.contractNoCoreHealWaves>0) state.contractNoCoreHealWaves--;
  state.throneHP=Math.min(state.maxThroneHP,state.throneHP+coreHeal);
  // v20: 침공 단계에서 소모되는 웨이브 한정 카드/유물 보너스를 여기서 원복합니다.
  if(state.tempObstacleRangeWaves>0){
    state.tempObstacleRangeWaves--;
    if(state.tempObstacleRangeWaves<=0 && state.tempObstacleRangeAmt>0){
      state.obstacleRangeBonus=Math.max(0,(state.obstacleRangeBonus||0)-state.tempObstacleRangeAmt);
      state.tempObstacleRangeAmt=0;
    }
  }
  if(state.coreReflectWaves>0) state.coreReflectWaves--;
  state.fxEvents.push({type:'coreHeal',r:CORE_R,c:CORE_C,amount:coreHeal});
  Sound.magic('holy');
  const waveBonus=Math.round((65 + state.wave*15 + stageBonus)*(state.nextWaveRewardMul||1)*(state.relicRewardMul||1)*(state.contractRewardMul||1)*metaRewardMul());
  state.contractRewardMul=1;
  addGold(waveBonus);
  state.waveGoldEarned=(state.waveGoldEarned||0)+waveBonus; state.nextWaveRewardMul=1;
  grantWaveClearMonsterXp();
  Sound.waveClear();
  if(state.wave%5===0) reviveMawangOnWaveClear();
  showWaveBanner(`웨이브 ${state.wave} 클리어!`);
  addLog(`<span class="hl-gold">웨이브 ${state.wave} 클리어!</span> 골드 <span class="hl-gold">+${waveBonus}G</span> · 핵 회복 <span class="hl-gold">+${coreHeal}</span>`);
  if(state.wave%10===0) { /* v49: 던전 크기를 15x15로 고정 — 더 이상 10웨이브마다 커지지 않습니다. */ }
  els.waveTransition.querySelector('.wt-title').textContent=`웨이브 ${state.wave} 클리어!`;
  const subEl=els.waveTransition.querySelector('.wt-sub'); if(subEl){ subEl.textContent=state.stageEvent?`${state.stageEvent.icon} ${state.stageEvent.name} 종료`:'던전이 잠시 숨을 고릅니다…'; }
  els.waveTransition.classList.add('show');
  renderUI();
  if(waveTransitionTimer) clearTimeout(waveTransitionTimer);
  if(waveCardTimer) clearTimeout(waveCardTimer);
  const session=gameSessionId;
  waveTransitionTimer=setTimeout(()=>{
    waveTransitionTimer=null;
    if(session!==gameSessionId || !state || state.gameOver) return;
    els.waveTransition.classList.remove('show');
    waveCardTimer=setTimeout(()=>{
      waveCardTimer=null;
      if(session!==gameSessionId || !state || state.gameOver) return;
      if(state.wave%5===0){ openRewardSelect(); }
      else { state.phase='build'; state.buildTimer=buildTimeForWave(state.wave); renderUI(); }
    },360);
  },1150);
}

let waveBannerTimer=null;
function showWaveBanner(text){
  els.waveBanner.textContent=text;
  els.waveBanner.classList.remove('show');
  void els.waveBanner.offsetWidth;
  els.waveBanner.classList.add('show');
  if(waveBannerTimer) clearTimeout(waveBannerTimer);
  waveBannerTimer=setTimeout(()=>els.waveBanner.classList.remove('show'), 2200);
}

/* ==================== v20: Card / Relic / Contract Reward System ==================== */
const RUN_REWARD_CARDS=[
{id:'rcRepair',icon:'🔧',name:'함정 재장전',rarity:'전술 카드',desc:'설치된 함정을 모두 정비해 즉시 최상의 상태로 되돌립니다.',effect:'설치된 함정 전체 내구도 100% 회복',apply(){let n=0;for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){const t=state.grid[r][c];if(t.obstacle&&isObstacleRoot(r,c)&&t.obstacleHp<t.obstacleMaxHp){t.obstacleHp=t.obstacleMaxHp;syncObstacleFootprint(r,c);n++;}}addLog(`<span class="hl-gold">🔧 함정 재장전</span> — 함정 ${n}개가 정비되었습니다.`);}},
{id:'rcAmbush',icon:'🗡️',name:'기습 용병',rarity:'전술 카드',desc:'대가 없이 숙련된 몬스터 한 마리가 즉시 전장에 합류합니다.',effect:'2단계로 강화된 몬스터 1마리 무료 즉시 소환',apply(){const pool=['berserker_orc','skeleton_warrior','flame_spirit','grim_reaper'];const typeId=pool[Math.floor(Math.random()*pool.length)];const spot=findMonsterSpawnNearCore()||findRandomEmptyFloor();if(spot){const m=createMonsterEntity(spot[0],spot[1],typeId,{tier:2,invested:0});if(m)addLog(`<span class="hl-gold">🗡️ 기습 용병</span> — ${MONSTER_TYPES.find(x=>x.id===typeId)?.name}이(가) 무료로 합류했습니다.`);}}},
{id:'rcReflect',icon:'🛡️',name:'핵의 역장',rarity:'전술 카드',desc:'다음 한 번의 웨이브 동안 핵을 두르는 역장이 피해를 되돌려줍니다.',effect:'다음 1웨이브 핵 피해의 30%를 공격자에게 반사',apply(){state.coreReflectWaves=1;state.coreReflectRatio=0.3;addLog('<span class="hl-gold">🛡️ 핵의 역장</span>이 전개되었습니다.');}},
{id:'rcOverload',icon:'⚡',name:'함정 과부하',rarity:'전술 카드',desc:'다음 웨이브 한정으로 모든 함정을 과충전시켜 사정거리를 넓힙니다.',effect:'다음 1웨이브 동안 모든 함정 범위 +1',apply(){state.tempObstacleRangeWaves=1;state.tempObstacleRangeAmt=1;state.obstacleRangeBonus=(state.obstacleRangeBonus||0)+1;addLog('<span class="hl-gold">⚡ 함정 과부하</span> — 함정 범위가 넓어졌습니다.');}},
{id:'rcLootRaid',icon:'💰',name:'전리품 강탈',rarity:'전술 카드',desc:'즉시 자금을 확보하고, 다음 웨이브 준비 비용을 크게 낮춥니다.',effect:'즉시 +120G · 다음 1웨이브 몬스터 소환 비용 25% 할인',apply(){addGold(120);state.monsterCostDiscountWaves=1;state.monsterCostDiscountRatio=0.25;addLog('<span class="hl-gold">💰 전리품 강탈</span> — 골드 +120G, 다음 소환이 저렴해집니다.');}},
{id:'rcNecroCall',icon:'🧟',name:'사령 소집',rarity:'전술 카드',desc:'죽음의 힘을 빌려 해골 병사들을 즉시 불러냅니다.',effect:'해골 궁수 · 해골 수호기사 각 1마리 무료 소환',apply(){const spots=[];for(let i=0;i<2;i++){const s=findMonsterSpawnNearCore()||findRandomEmptyFloor();if(s)spots.push(s);}const types=['skeleton_archer','skeleton_warrior'];let n=0;spots.forEach((s,i)=>{if(state.monsters.length>=(state.monsterCap||MONSTER_CAP_START))return;if(createMonsterEntity(s[0],s[1],types[i]||types[0],{tier:1,invested:0}))n++;});addLog(`<span class="hl-gold">🧟 사령 소집</span> — 해골 ${n}마리가 일어났습니다.`);}},
{id:'rcTotalWar',icon:'🌀',name:'총력전 준비',rarity:'전술 카드',desc:'다음 웨이브에 한해 던전의 수용 한계를 임시로 끌어올립니다.',effect:'다음 1웨이브 동안 몬스터 제한 +4',apply(){state.tempMonsterCapWaves=1;state.tempMonsterCapAmt=4;state.monsterCap=(state.monsterCap||MONSTER_CAP_START)+4;addLog('<span class="hl-gold">🌀 총력전 준비</span> — 몬스터 제한이 임시로 늘어났습니다.');}},
{id:'rcSoulPact',icon:'🕯️',name:'영혼 계약',rarity:'전술 카드',desc:'마왕에게 영혼 일부를 미리 서약받습니다. 판이 끝날 때 정산됩니다.',effect:'이번 판 최종 영혼 획득량 +15 확정',apply(){state.pendingSoulBonus=(state.pendingSoulBonus||0)+15;addLog('<span class="hl-gold">🕯️ 영혼 계약</span> — 판 종료 시 영혼 +15가 보장됩니다.');}}
];
