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
function activateObstacle(h,tile,trigger='contact',chained=false){
  if(!h||h.hp<=0||!tile?.obstacle) return false;
  const root=obstacleRootPos(h.r,h.c) || obstacleRootPos(tile.obstacleRootR??h.r,tile.obstacleRootC??h.c) || {r:h.r,c:h.c};
  const rootTile=state.grid[root.r]?.[root.c] || tile;
  const ob=OBSTACLE_TYPES.find(o=>o.id===rootTile.obstacle); if(!ob) return false;
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
  if(!chained){ h.obstacleContactKey=key; h.obstacleContactUntil=now+(ob.id==='poison'?650:ob.id==='web'?700:ob.id==='flame'?1000:ob.id==='lightning'?1300:900); }
  // v35 함정 연구소 "은폐술" Lv.5(기습 함정): 용사가 어떤 함정 종류를 처음 만나는 순간 그 함정의 효과가 강화됩니다.
  let isAmbush=false;
  if(!chained){
    if(!h.metTrapTypes) h.metTrapTypes=new Set();
    if(!h.metTrapTypes.has(ob.id)){ isAmbush=true; h.metTrapTypes.add(ob.id); }
  }
  const ambushMul=1+(isAmbush?trapAmbushBonus():0);
  const affected=state.heroes.filter(x=>x.hp>0&&Math.abs(x.r-h.r)+Math.abs(x.c-h.c)<=range);
  for(const x of affected) x.lastTrapHitAt=now;
  state.fxEvents.push({type:'obstacleImpact',r:root.r+0.5,c:root.c+0.5,ob:ob.id,strong:lv>=5,label:lv>=10?'LV.10!':'LV.'+lv,key:'h'+h.id,footprint:2});

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
    }
    Sound.trap('spike'); state.fxEvents.push({type:'obstacleBurst',r:root.r+0.5,c:root.c+0.5,ob:'spike',text:'✦',footprint:2});
    if(chainTriggerEnabled() && !chained) chainTriggerNearbyTraps(h,h.r,h.c);
    return true;
  }
  if(ob.id==='flame'){
    const rlv=trapResearchLevel('flame');
    const burnVulnBonus=rlv>=4?0.10:0, burnBonusMs=rlv>=3?1000:0;
    const globalMul=(1+(rlv-1)*0.05)*trapAmplifyMul()*trapMasteryAttackDmgMul()*ambushMul*mawangObstacleMultiplier();
    const base=FLAME_DMG*lerpLv(lv,1,4)*globalMul;
    for(const x of affected){
      const d=Math.abs(x.r-h.r)+Math.abs(x.c-h.c);
      let dmg=Math.max(1,Math.round(base*(d===0?1:d===1?.65:.35)));
      if(burnVulnBonus && x.flameBurnUntil && x.flameBurnUntil>now) dmg=Math.round(dmg*(1+burnVulnBonus));
      x.hp-=dmg;
      const curseCombo=state.archetypeActive && state.archetypeActive.fireCurse && x.monsterCurseUntil && x.monsterCurseUntil>now;
      x.flameBurnUntil=now+((lv>=10?5200:lv>=5?3800:2600)*(curseCombo?2:1))+burnBonusMs;
      x.flameBurnDps=FLAME_BURN_DPS*lerpLv(lv,1,4)*globalMul;
      if(rlv>=5) x.obstacleFlameLv5=true; // 지옥불: 이 화상으로 사망하면 processHeroTick에서 소규모 폭발 처리
      state.fxEvents.push({type:'damageNumber',r:x.r,c:x.c,amount:dmg,color:'#ff9b3d'});
    }
    Sound.trap('flame'); state.fxEvents.push({type:'obstacleSpecial',r:root.r+0.5,c:root.c+0.5,ob:'flame',footprint:2});
    if(chainTriggerEnabled() && !chained) chainTriggerNearbyTraps(h,h.r,h.c);
    return true;
  }
  if(ob.id==='lightning'){
    const rlv=trapResearchLevel('lightning');
    const firstTargetBonus=rlv>=3?0.08:0, shockVulnBonus=rlv>=4?0.10:0;
    const resonanceMul=1+(state.trapLightningResonanceUntil&&now<state.trapLightningResonanceUntil?0.25:0);
    const globalMul=(1+(rlv-1)*0.04)*trapAmplifyMul()*trapMasteryAttackDmgMul()*ambushMul*resonanceMul;
    const maxTargets=lv>=10?4:lv>=5?3:2;
    const targets=state.heroes.filter(x=>x.hp>0&&Math.abs(x.r-h.r)+Math.abs(x.c-h.c)<=range).sort((a,b)=>Math.abs(a.r-h.r)+Math.abs(a.c-h.c)- (Math.abs(b.r-h.r)+Math.abs(b.c-h.c))).slice(0,maxTargets);
    targets.forEach((x,i)=>{
      let dmg=Math.max(1,Math.round(LIGHTNING_DMG*lerpLv(lv,1,4)*(1-i*.14)*globalMul));
      if(i===0 && firstTargetBonus) dmg=Math.round(dmg*(1+firstTargetBonus));
      if(shockVulnBonus && x.obstacleShockVulnUntil && x.obstacleShockVulnUntil>now) dmg=Math.round(dmg*(1+shockVulnBonus));
      x.hp-=dmg;
      if(shockVulnBonus) x.obstacleShockVulnUntil=now+2000;
      state.fxEvents.push({type:'damageNumber',r:x.r,c:x.c,amount:dmg,color:'#8fe7ff'});
      state.fxEvents.push({type:'obstacleBurst',r:x.r,c:x.c,ob:'lightning',text:'⚡'});
    });
    if(rlv>=5 && targets.length>=3) state.trapLightningResonanceUntil=now+6000; // 낙뢰 공명: 다음 낙뢰 피해 +25%
    Sound.trap('lightning');
    if(chainTriggerEnabled() && !chained) chainTriggerNearbyTraps(h,h.r,h.c);
    return true;
  }
  if(ob.id==='poison'){
    if(!chained){ if(!h.metTrapTypes) h.metTrapTypes=new Set(); }
    Sound.trap('poison');
    state.fxEvents.push({type:'obstacleSpecial',r:root.r+0.5,c:root.c+0.5,ob:'poison',footprint:2});
    const rlv=trapResearchLevel('poison');
    if(rlv>=4){ for(const x of affected){ x.hp-=Math.round(6*ambushMul); state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:'-6',color:'#78f06b'}); } } // 농축 맹독: 첫 접촉 고정 피해
    return true;
  }
  if(ob.id==='barricade'){
    for(const x of affected){x.barricadeSlowUntil=now+700;x.barricadeSlowMul=lerpLv(lv,.82,.55);}
    Sound.trap('barricade');
    state.fxEvents.push({type:'obstacleBurst',r:root.r+0.5,c:root.c+0.5,ob:'barricade',text:'🛡',footprint:2});
    return true;
  }
  if(ob.id==='pit'){
    const rlv=trapResearchLevel('pit');
    const rootBonusMs=rlv>=2?300:0, dmgResearchMul=(rlv>=4?1.15:1)*trapMasteryDefenseEffectMul();
    for(const x of affected){
      x.pitRootUntil=Math.max(x.pitRootUntil||0,now+(lv>=10?4200:lv>=5?3000:PIT_ROOT_MS)+rootBonusMs);
      x.hp-=Math.round(PIT_DAMAGE*lerpLv(lv,1,4)*dmgResearchMul*trapAmplifyMul()*ambushMul);
      x.obstaclePitLv5=rlv>=5; x.obstaclePitSlowAfter=rlv>=3;
      state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:'⛓ 속박!',color:'#b993ff'});
    }
    Sound.trap('pit');
    state.fxEvents.push({type:'obstacleSpecial',r:root.r+0.5,c:root.c+0.5,ob:'pit',footprint:2});
    return true;
  }
  if(ob.id==='statue'){
    Sound.trap('statue');
    state.fxEvents.push({type:'obstacleAuraPulse',r:root.r+0.5,c:root.c+0.5,ob:'statue',lv,footprint:2});
    return true;
  }
  if(ob.id==='frost'){
    const rlv=trapResearchLevel('frost');
    const slowBonus=1-(rlv-1)*0.05*trapMasteryControlEffectMul(); // 감속 효과 강화 = 배율을 더 낮춤
    const durBonusMs=(rlv>=3?500:0)*trapMasteryControlDurMul();
    for(const x of affected){
      const alreadyChilled=(x.frostSlowUntil&&x.frostSlowUntil>now)||(x.webSlowUntil&&x.webSlowUntil>now);
      x.frostSlowUntil=Math.max(x.frostSlowUntil||0,now+lerpLv(lv,FROST_SLOW_MS,5200)*trapMasteryControlDurMul()+durBonusMs);
      x.frostSlowMul=Math.max(.1,lerpLv(lv,.68,.35)*slowBonus-(rlv>=4?0.10:0));
      x.stunTicks=Math.max(x.stunTicks||0,Math.round(lerpLv(lv,0,6)));
      if((state.archetypeActive && state.archetypeActive.glacial && alreadyChilled) || (rlv>=5 && alreadyChilled)){
        x.stunTicks=Math.max(x.stunTicks||0,25);
        state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:'🧊완전 동결!',color:'#66d9ff'});
      } else state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:lv>=10?'❄ 절대빙결!':'❄ 둔화',color:'#66d9ff'});
    }
    Sound.trap('frost');state.fxEvents.push({type:'obstacleSpecial',r:root.r+0.5,c:root.c+0.5,ob:'frost',footprint:2});return true;
  }
  if(ob.id==='web'){
    const rlv=trapResearchLevel('web');
    const slowSec=lerpLv(lv,1.5,4.5)*trapMasteryControlDurMul()+(rlv>=3?1:0);
    const captureChance=rlv>=4?0.15:0;
    for(const x of affected){
      const alreadyChilled=(x.frostSlowUntil&&x.frostSlowUntil>now)||(x.webSlowUntil&&x.webSlowUntil>now);
      x.webSlowUntil=Math.max(x.webSlowUntil||0,now+slowSec*1000);
      x.webSlowMul=Math.max(.1,lerpLv(lv,.68,.32)*trapMasteryControlEffectMul()-(rlv-1)*0.05);
      if(lv>=10)x.webRootUntil=Math.max(x.webRootUntil||0,now+1200);
      if(captureChance && Math.random()<captureChance) x.webRootUntil=Math.max(x.webRootUntil||0,now+500);
      if(rlv>=5) x.obstacleWebLv5=true; // 거미왕의 은총: 속박 중 받는 피해 +20% (다른 함정 피해 계산부에서 참조)
      if((state.archetypeActive && state.archetypeActive.glacial && alreadyChilled)){
        x.stunTicks=Math.max(x.stunTicks||0,25);
        state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:'🧊완전 동결!',color:'#eee8f4'});
      } else state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:lv>=10?'🕸 속박!':'🕸 느려짐',color:'#eee8f4'});
    }
    Sound.trap('web');
    state.fxEvents.push({type:'obstacleBurst',r:root.r+0.5,c:root.c+0.5,ob:'web',text:'🕸',footprint:2});return true;
  }
  if(ob.id==='curse'){
    const rlv=trapResearchLevel('curse');
    const curseMulBonus=(rlv-1)*0.04;
    for(const x of affected){
      x.obstacleCurseUntil=now+lerpLv(lv,3000,6500)*trapMasteryControlDurMul();
      x.obstacleCurseMul=Math.max(.2,lerpLv(lv,.82,.55)*trapMasteryControlEffectMul()-curseMulBonus);
      if(lv>=10)x.obstacleHealMul=.5;
      if(rlv>=3) x.obstacleHealMul=Math.min(x.obstacleHealMul??1,0.9);
      if(rlv>=4) x.obstacleCurseDefPenalty=0.05;
      if(rlv>=5) x.obstacleCurseLv5=true; // 죽음의 낙인: 저주 상태+체력25%이하면 받는 피해 +15%(다른 피해 계산부에서 참조)
        state.fxEvents.push({type:'floatText',r:x.r,c:x.c,text:'☠ 저주!',color:'#43e78b'});
    }
    Sound.trap('curse');
    state.fxEvents.push({type:'obstacleAuraPulse',r:root.r+0.5,c:root.c+0.5,ob:'curse',lv,footprint:2});return true;
  }
  return false;
}

function handleHeroTileEnter(h, tile){
  if(!tile?.obstacle) return;
  activateObstacle(h,tile,'contact');
}

function midwaveDifficultyScale(){
  const w=state?.wave||0;
  return (w>=11 && w<=20) ? MIDWAVE_DIFFICULTY_MUL : 1;
}
function heroPower(h){ return Math.max(1,(h.atk*1.4)+(h.def*1.2)+(h.maxHp/18)); }
function monsterPower(m){ return Math.max(1,(m.atk*1.5)+(m.def*1.4)+(m.maxHp/22)); }
function findThreateningMonster(h){
  let best=null,bestD=Infinity;
  const range=heroMonsterSightRange(h);
  for(const m of state.monsters){
    const d=Math.abs(m.r-h.r)+Math.abs(m.c-h.c);
    if(d<=range && d<bestD){ best=m; bestD=d; }
  }
  return {monster:best,dist:bestD};
}
function findFleeTarget(h, threat){
  const candidates=[];
  const baseDist=threat?Math.abs(threat.r-h.r)+Math.abs(threat.c-h.c):0;
  for(let r=1;r<GRID-1;r++) for(let c=1;c<GRID-1;c++){
    const t=state.grid[r][c];
    if(t.type!=='floor'||t.obstacle==='barricade'||monsterAt(r,c)||isHeroAt(r,c)) continue;
    const dThreat=threat?Math.abs(r-threat.r)+Math.abs(c-threat.c):0;
    const dStart=Math.abs(r-h.r)+Math.abs(c-h.c);
    // 너무 멀리 달리지 않고, 위협에서 충분히 떨어진 내부 공간을 선택
    if(dThreat<Math.max(3,baseDist+3)||dStart<2) continue;
    candidates.push({r,c,score:dThreat*2-dStart*.35+Math.random()*1.5});
  }
  candidates.sort((a,b)=>b.score-a.score);
  if(candidates.length) return [candidates[0].r,candidates[0].c];
  return null;
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
// 목표 칸까지 가는 다음 한 걸음을 계산합니다.
// 용사는 장애물을 미리 인지하거나 위험도를 계산해 우회하지 않습니다.
// 모든 통행 가능한 장애물 칸을 일반 바닥과 동일한 비용으로 취급하며,
// 물리적으로 통행을 막는 barricade만 실제 장벽으로 취급합니다.
function pathStepToGoal(h,goalCells){
  const goals=new Set(goalCells.map(([r,c])=>r+'_'+c));
  const dist=new Map(), prev=new Map();
  const startKey=h.r+'_'+h.c;
  dist.set(startKey,0);
  const visited=new Set();
  let curKey=startKey, cur=[h.r,h.c];
  while(true){
    visited.add(curKey);
    if(goals.has(curKey) && curKey!==startKey) break;
    for(const [nr,nc] of neighbors4(cur[0],cur[1])){
      const t=state.grid[nr]?.[nc];
      if(!t || (t.type!=='floor'&&t.type!=='core') || t.obstacle==='barricade') continue;
      const key=nr+'_'+nc;
      if(visited.has(key)) continue;
      // 장애물에 대한 사전 회피 비용을 적용하지 않습니다.
      const nd=dist.get(curKey)+1;
      if(nd<(dist.has(key)?dist.get(key):Infinity)){ dist.set(key,nd); prev.set(key,cur); }
    }
    // 방문하지 않은 노드 중 누적 비용이 가장 낮은 곳으로 이동(단순 다익스트라).
    // 격자가 16×16으로 작아 매 틱 전체 스캔해도 부담이 없습니다.
    let nextKey=null,best=Infinity;
    for(const [k,d] of dist){
      if(visited.has(k)) continue;
      if(d<best){ best=d; nextKey=k; }
    }
    if(nextKey===null) return null; // 목표에 도달하는 경로가 없음
    cur=nextKey.split('_').map(Number);
    curKey=nextKey;
  }
  // 시작점에서 목표까지의 경로를 역추적해서 첫 한 걸음만 반환합니다.
  let step=cur, prevStep=prev.get(curKey);
  while(prevStep && !(prevStep[0]===h.r&&prevStep[1]===h.c)){
    step=prevStep; prevStep=prev.get(prevStep[0]+'_'+prevStep[1]);
  }
  return (step[0]===h.r&&step[1]===h.c)?null:step;
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
      if(t.type==='floor' && t.obstacle!=='barricade' && !monsterAt(nr,nc) && !(nr===h.prevR&&nc===h.prevC)) return [nr,nc];
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
  return profile;
}
function chooseHeroObstacleRouteStep(h){
  const target=[[CORE_R,CORE_C]];
  const profile=heroDungeonResponseProfile(h);
  return {profile, step:null};
}
function processHeroTick(h,dt){
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
    const t=state.monsters.filter(m=>m.hp>0&&Math.abs(m.r-h.r)+Math.abs(m.c-h.c)<=4)
      .sort((a,b)=>(Math.abs(a.r-h.r)+Math.abs(a.c-h.c))-(Math.abs(b.r-h.r)+Math.abs(b.c-h.c)))[0];
    if(t){
      const dmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1)*.55));
      t.hp-=dmg;
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
  if(h.frostSlowUntil&&now<h.frostSlowUntil) { /* 이동/공격 배율은 아래 AI 분기에서 참조 */ }
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
      h.prevR=h.r; h.prevC=h.c; h.lastStepR=step[0]-h.r; h.lastStepC=step[1]-h.c; h.r=step[0]; h.c=step[1]; h.lastMoveAt=performance.now();
      handleHeroTileEnter(h,state.grid[h.r][h.c]); return;
    }
    const nbrs=neighbors4(h.r,h.c).filter(([r,c])=>{
      const t=state.grid[r][c];
      return (t.type==='floor'||t.type==='core') && t.obstacle!=='barricade' && !(r===h.prevR&&c===h.prevC);
    });
    if(nbrs.length){
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
    h.prevR=h.r; h.prevC=h.c; h.lastStepR=partyStep[0]-h.r; h.lastStepC=partyStep[1]-h.c; h.r=partyStep[0]; h.c=partyStep[1]; h.stuckTicks=0; h.lastMoveAt=performance.now();
    handleHeroTileEnter(h,state.grid[h.r][h.c]);
    if(performance.now()>=(h.nextDialogueAt||0)) heroSay(h,'move');
    return;
  }

  if(h.typeId==='priest'){
    let target=null,bestFrac=1;
    for(const o of state.heroes){ if(o===h||o.hp<=0) continue; const d=Math.abs(o.r-h.r)+Math.abs(o.c-h.c); if(d<=PRIEST_HEAL_RANGE&&o.hp<o.maxHp){const frac=o.hp/o.maxHp;if(frac<bestFrac){bestFrac=frac;target=o;}} }
    if(target){ const healMul=(target.obstacleHealPenaltyUntil&&performance.now()<target.obstacleHealPenaltyUntil)?0.45:1; const healAmt=Math.max(1,Math.round(PRIEST_HEAL_AMT*healMul)); target.hp=Math.min(target.maxHp,target.hp+healAmt); target.lastHealAt=performance.now(); state.fxEvents.push({type:'floatText',r:target.r,c:target.c,text:'+'+healAmt,color:'#73d99a'},{type:'spellImpact',r:target.r,c:target.c,spell:'holy'}); Sound.magic('holy'); }
  }
  const near=(kind)=>state.auraPositions[kind]&&state.auraPositions[kind].some(p=>{const ot=state.grid[p.r]?.[p.c];return Math.abs(p.r-h.r)+Math.abs(p.c-h.c)<=obstacleRange(kind,ot);});
  let auraCurseMul=1; const cursePos=state.auraPositions.curse.find(p=>Math.abs(p.r-h.r)+Math.abs(p.c-h.c)<=obstacleRange('curse',state.grid[p.r]?.[p.c])); if(cursePos){ const curseTile=state.grid[cursePos.r][cursePos.c]; const cl=obstacleLevel(curseTile); auraCurseMul=cl>=10?.52:cl>=5?.64:CURSE_ATK_MUL; if(cl>=10) h.obstacleHealPenaltyUntil=performance.now()+350; }
  // 디버프 몬스터(거미·흑마법사)에게 물린 용사는 저주 지속시간 동안 공격력이 낮아집니다.
  const monsterCurseMul=(h.monsterCurseUntil && performance.now()<h.monsterCurseUntil)?MONSTER_CURSE_ATK_MUL:1;
  const curseMul=auraCurseMul*monsterCurseMul;

  // 용사가 마왕을 발견한 경우: 가장 가까운 마왕을 실제 전투 대상으로 삼습니다.
  // 마왕이 쓰러져도 핵이 즉시 파괴되는 것은 아니며, 일정 시간 후 중앙에서 부활합니다.
  const mw=state.mawang;
  if(mw && mw.hp>0 && !mw.dead){
    const md=Math.abs(mw.r-h.r)+Math.abs(mw.c-h.c);
    const mawangSight=(h.range||1)+4;
    if(md<=mawangSight){
      if(md<=1){
        const nowMw=performance.now();
        const atkDelay=1.0*(1+mawangSkillRate('authority',.04));
        if(nowMw-(h.lastMawangAttackAt||0)>=atkDelay*1000){
          h.lastMawangAttackAt=nowMw;
          const mwStats=mawangCurrentStats();
          const dmg=Math.max(1,Math.round(h.atk*(h.partySynergy||1))-mwStats.def);
          mw.hp-=dmg;
          state.fxEvents.push({type:'damageNumber',r:mw.r,c:mw.c,amount:dmg,color:'#ff9b6e'});
          state.fxEvents.push({type:'spark',r:mw.r,c:mw.c,color:'#ffd166'});
          if(mw.hp<=0){ killMawang(mw); }
        }
        return;
      }
      const stepToMawang=pathStepToGoal(h,[[mw.r,mw.c]]);
      if(stepToMawang){
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
        m.hp-=applyStatueSanctuary(m,d); hits.push(d);
        if(m.hp<=0) break;
      }
      h.lastAttackAt=now;
      hits.forEach(d=>state.fxEvents.push({type:'damageNumber',r:m.r,c:m.c,amount:d,color:dist<=1?'#ff5868':'#cbd4e1'}));
      if(m.hp<=0) h.heroKills=(h.heroKills||0)+1;
      if((h.range||1)>1) Sound.heroRanged(); else Sound.heroAttack();
      if(dist<=1){ const dR=Math.sign(m.r-h.r),dC=Math.sign(m.c-h.c); const dmgBack=Math.max(1,m.atk-(h.def||0)); h.hp-=dmgBack;
        const meleeFxReady=now-(h.lastMeleeFxAt||0)>=280;
        if(meleeFxReady){
          h.lastMeleeFxAt=now;
          state.fxEvents.push({type:'punch',key:'h'+h.id,dr:dR,dc:dC,mode:'attacker'},{type:'punch',key:'m'+m.id,dr:dR,dc:dC,mode:'defender'},{type:'battleHit',r:m.r,c:m.c,color:'#ff5868',strong:dmg>Math.max(8,m.maxHp*.10),damage:dmg});
        }else{
          state.fxEvents.push({type:'battleHit',r:m.r,c:m.c,color:'#ff5868',strong:dmg>Math.max(8,m.maxHp*.10),damage:dmg});
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
    if((h.range||1)>1) Sound.heroRanged(); else Sound.heroAttack();
    m.hp-=applyStatueSanctuary(m,dmg); h.lastAttackAt=now;
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
    if(dist<=1){ const dR=Math.sign(m.r-h.r),dC=Math.sign(m.c-h.c); const dmgBack=Math.max(1,m.atk-(h.def||0)); h.hp-=dmgBack; m.lastAttackAt=now; if(h.hp<=0)h.killerMonsterId=m.id;
      const meleeFxReady=now-(h.lastMeleeFxAt||0)>=280;
      if(meleeFxReady){
        h.lastMeleeFxAt=now;
        state.fxEvents.push({type:'punch',key:'h'+h.id,dr:dR,dc:dC,mode:'attacker'},{type:'punch',key:'m'+m.id,dr:dR,dc:dC,mode:'defender'},{type:'battleHit',r:m.r,c:m.c,color:'#ff5868',strong:dmg>Math.max(8,m.maxHp*.10),damage:dmg},{type:'spark',r:h.r,c:h.c,color:'#ff6873'},{type:'damageNumber',r:h.r,c:h.c,amount:dmgBack,color:'#ff6873'});
      }else{
        state.fxEvents.push({type:'battleHit',r:m.r,c:m.c,color:'#ff5868',strong:dmg>Math.max(8,m.maxHp*.10),damage:dmg});
      }
    }
    else { state.fxEvents.push({type:'projectile',fromR:h.r,fromC:h.c,toR:m.r,toC:m.c,color:RANGED_COLOR[h.typeId]||'#e0e0e0',owner:'hero',typeId:h.typeId,kind:rangedProjectileKind('hero',h.typeId)}); if(h.typeId==='mage') Sound.magic('arcane'); }
    return;
  }

  // 핵 탐지: 충분히 가까우면 랜덤 목표보다 핵을 최우선 목표로 삼습니다.
  // 핵을 발견했더라도, 근처(위협 감지 반경)에 몬스터가 있다면 핵보다 몬스터를 먼저 상대합니다.
  if(threatInfo.monster){
    const now2=performance.now();
    if(now2>=(h.nextDialogueAt||0)) heroSay(h,'combat');
    const step=pathStepToGoal(h,[[threatInfo.monster.r,threatInfo.monster.c]]);
    if(step){
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
    const coreGoals=neighbors4(CORE_R,CORE_C).filter(([r,c])=>{const t=state.grid[r][c];return t.type==='floor'&&t.obstacle!=='barricade';});
    const coreStep=pathStepToGoal(h,coreGoals);
    if(coreStep){ h.prevR=h.r;h.prevC=h.c;h.r=coreStep[0];h.c=coreStep[1];h.stuckTicks=0;h.lastMoveAt=performance.now(); handleHeroTileEnter(h,state.grid[h.r][h.c]); return; }
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
    if(performance.now()>=(h.soundNextDigAt||0)){ Sound.dig(); h.soundNextDigAt=performance.now()+520; }
    h.digProgress+=dt;
    const digHt=heroTypeOf(h);
    const digTimeMul=(digHt&&digHt.digTimeMul)||1;
    let need;
    if(h.digKind==='obstacle'){
      const rootTile=obstacleRootTile(h.digTargetR,h.digTargetC);
      const ob=rootTile?.obstacle;
      if(!ob){ h.digging=false; h.digProgress=0; h.digKind=null; return; }
      need=obstacleBreakTime(ob,h,rootTile);
      // 장애물 파괴 진행도를 실제 내구도에도 반영하여 HP 바가 실질적인 상태를 보여주도록 합니다.
      if(rootTile && rootTile.obstacleMaxHp>0){
        const beforeHp=rootTile.obstacleHp||rootTile.obstacleMaxHp;
        const damagePerMs=rootTile.obstacleMaxHp/Math.max(1,need*1000);
        const dealt=Math.min(beforeHp,damagePerMs*dt*1000);
        rootTile.obstacleHp=Math.max(0,beforeHp-dealt);
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
      h.prevR=h.r;h.prevC=h.c;h.lastStepR=h.digTargetR-h.r;h.lastStepC=h.digTargetC-h.c;h.r=h.digTargetR;h.c=h.digTargetC;h.showedQuestion=false;h.lastMoveAt=performance.now();
      if(Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C)<=1&&!h.coreFound){h.coreFound=true;sayHero(h,'!','alert',1200,true);setTimeout(()=>{if(state&&state.heroes.includes(h)&&h.hp>0)sayHero(h,pickHeroDialogue('coreFound'),'normal',2400,true);},950);}
      handleHeroTileEnter(h,state.grid[h.r][h.c]); h.digging=false;h.digProgress=0;h.digKind=null;
      if(performance.now()>=(h.nextDialogueAt||0)&&!h.coreFound)heroSay(h,'move');
    }
    return;
  }

  if(h.webSlowUntil && performance.now()<h.webSlowUntil){ if(performance.now()-(h.webFxAt||0)>500){state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'web',text:'🕸'});h.webFxAt=performance.now();} return; }

  // 핵을 찾지 못한 상태에서도 무작위 좌표를 배회하지 않고,
  // 암벽을 뚫는 비용까지 고려한 A* 경로로 핵을 향합니다.
  // 이렇게 하면 시야 밖에 핵이 있어도 결국 핵으로 수렴합니다.
  h.wanderTicks=(h.wanderTicks||0)+dt; h.stuckTicks=(h.stuckTicks||0)+dt;

  function heroCoreRouteStep(){
    const startKey=h.r+'_'+h.c;
    const goalKey=CORE_R+'_'+CORE_C;
    if(startKey===goalKey) return null;

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
      const danger={spike:4.8,poison:5.4,frost:3.8,web:2.9,curse:4.3,statue:5.0,flame:5.0,barricade:6.5}[t.obstacle]||3.5;
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
        let cur=current;
        let prev=came.get(cur);
        if(!prev) return null;
        while(prev && prev!==startKey){ cur=prev; prev=came.get(cur); }
        return parseKey(cur);
      }
      closed.add(current);
      for(const [nr,nc] of neighbors4(cr,cc)){
        if(!inBounds(nr,nc)) continue;
        const nt=state.grid[nr][nc];
        if(nt.type==='rock' && nt.isEntrance) continue;
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
    const danger={spike:4.8,poison:5.4,frost:3.8,web:2.9,curse:4.3,statue:5.0,flame:5.0,barricade:6.5}[tile.obstacle]||3.5;
    h.dungeonIntent=(responseProfile.role==='breaker'?'장애물 돌파':danger>=4.8?'위험 구간 회피/판단':'장애물 대응');
  } else {
    h.dungeonIntent=responseProfile.role==='scout'?'안전한 경로 탐색':'핵으로 전진';
  }
  if(tile.type==='rock'){
    h.digging=true;h.digKind=tile.obstacle?'wallObstacle':'rock';h.digTargetR=tr;h.digTargetC=tc;h.digProgress=0;return;
  }
  if(tile.obstacle){
    const obId=tile.obstacle;
    const profile=heroDungeonResponseProfile(h); const detected=(obId==='barricade') || Math.random()<Math.min(.98,Math.max(.05,obstacleDetectChance(h,obId)+profile.detectBonus));
    if(detected){
      state.dungeonStats.obstaclesSeen=(state.dungeonStats.obstaclesSeen||0)+1;
      // 돌기둥은 실제로 길을 막으므로 발견하면 파괴합니다.
      // 나머지 장애물은 '발견 = 경고'로만 처리하고 먼저 밟게 하여 장애물 효과가 반드시 체감되도록 합니다.
      if(obId==='barricade'){
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
  h.prevR=h.r;h.prevC=h.c;h.lastStepR=tr-h.r;h.lastStepC=tc-h.c;h.r=tr;h.c=tc;h.stuckTicks=0;h.showedQuestion=false;h.lastMoveAt=performance.now();
  if(Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C)<=1&&!h.coreFound){h.coreFound=true;sayHero(h,'!','alert',1200,true);setTimeout(()=>{if(state&&state.heroes.includes(h)&&h.hp>0)sayHero(h,pickHeroDialogue('coreFound'),'normal',2400,true);},950);}else{heroSay(h,'move');}
  handleHeroTileEnter(h,tile);
}


function obstacleRange(kind, tile){
  const baseTile=tile || (state ? findObstacleTileByKind(kind) : null);
  // 모든 장애물의 기본 범위는 설치된 2x2 영역 자체입니다.
  // 즉 Lv.1에서는 장애물 바깥 1칸까지 퍼지지 않고, Lv.5부터 +1칸, Lv.10부터 +2칸 확장됩니다.
  const base=0;
  const lv=obstacleLevel(baseTile);
  const local=Math.min(4,base+(lv>=10?2:lv>=5?1:0));
  return Math.max(0,local+(state?.obstacleRangeBonus||0)+mawangSkillLevel('maze_master'));
}
function obstacleDistanceToHero(rootR,rootC,heroR,heroC){
  // 2x2 장애물의 실제 점유 영역(rootR~rootR+1, rootC~rootC+1)을 기준으로
  // 영웅 타일과 가장 가까운 거리(장애물 내부는 0) 를 계산합니다.
  const dr=Math.max(rootR-heroR,0,heroR-(rootR+1));
  const dc=Math.max(rootC-heroC,0,heroC-(rootC+1));
  return Math.hypot(dr,dc);
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

function processObstacleVisualsAndZones(dt){
  const now=performance.now();
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const tile=state.grid[r][c],ob=tile.obstacle;if(!ob || !isObstacleRoot(r,c))continue;
    const lv=obstacleLevel(tile),range=obstacleRange(ob,tile);
    for(const h of state.heroes){
      if(h.hp<=0)continue; const d=obstacleDistanceToHero(r,c,h.r,h.c); if(d>range)continue;
      if(ob==='poison'){
        const rlv=trapResearchLevel('poison');
        const dps=POISON_DPS*lerpLv(lv,1,4)*(1+(rlv-1)*0.05)*trapAmplifyMul()*trapMasteryAttackDmgMul();
        const beforeHp=h.hp;
        h.hp-=dps*dt;h.obstaclePoisonUntil=now+900+(rlv>=3?1000:0);h.lastTrapHitAt=now;
        if(now-(h.obstaclePoisonFxAt||0)>650){state.fxEvents.push({type:'obstacleSpecial',r:h.r,c:h.c,ob:'poison'});state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'☠ -'+Math.max(1,Math.round(dps*.6)),color:'#78f06b'});h.obstaclePoisonFxAt=now;}
        // v35 함정 연구소 "역병의 원천"(독늪 연구 Lv.5): 중독으로 사망하면 주변 1칸의 용사에게 중독을 전염시킵니다.
        if(h.hp<=0 && beforeHp>0 && rlv>=5){
          const near=state.heroes.find(o=>o!==h&&o.hp>0&&Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=1);
          if(near){ near.poisonSpreadUntil=now+3000; near.poisonSpreadDps=dps*0.6; state.fxEvents.push({type:'floatText',r:near.r,c:near.c,text:'☠전염!',color:'#78f06b'}); }
        }
      }
      else if(ob==='flame'||ob==='lightning'||ob==='pit'||ob==='spike'){ activateObstacle(h,tile,'stay'); }
      else if(ob==='barricade'){h.barricadeSlowUntil=now+450;h.barricadeSlowMul=lerpLv(lv,.82,.55);}
      else if(ob==='frost'){h.frostSlowUntil=now+900;h.frostSlowMul=lerpLv(lv,.68,.35);h.stunTicks=Math.max(h.stunTicks||0,Math.round(lerpLv(lv,0,6)*0.17));}
      else if(ob==='web'){h.webSlowUntil=now+(lv>=10?3200:lv>=5?2100:1200);h.webSlowMul=lv>=10?.32:lv>=5?.5:.68;if(lv>=10)h.webRootUntil=Math.max(h.webRootUntil||0,now+700);if(now-(h.webFxAt||0)>650){state.fxEvents.push({type:'obstacleBurst',r:h.r,c:h.c,ob:'web',text:'🕸'});h.webFxAt=now;}}
      else if(ob==='curse'){h.obstacleCurseUntil=now+lerpLv(lv,1200,2400);h.obstacleCurseMul=lerpLv(lv,.82,.55);if(lv>=10)h.obstacleHealMul=.5;if(now-(h.obstacleCurseFxAt||0)>900){state.fxEvents.push({type:'obstacleAuraPulse',r:h.r,c:h.c,ob:'curse',lv});h.obstacleCurseFxAt=now;}}
    }
    if(ob==='statue' && now-(tile.obstacleFxAt||0)>1100){state.fxEvents.push({type:'obstacleAuraPulse',r,c,ob:'statue',lv});tile.obstacleFxAt=now;}
  }
}

function collectAuraPositions(){
  const out={statue:[],curse:[],barricade:[]};
  for(let r=0;r<GRID;r++){
    for(let c=0;c<GRID;c++){
      const ob=state.grid[r][c].obstacle;
      if(ob && isObstacleRoot(r,c) && out[ob]) out[ob].push({r,c});
    }
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
let _loopLastAt=0, _logicAcc=0, _lastRenderAt=0;
function gameLoop(now){
  requestAnimationFrame(gameLoop);
  if(!_loopLastAt) _loopLastAt=now;
  const elapsed=Math.min(400, now-_loopLastAt); // 탭 전환 등으로 크게 밀린 시간은 잘라냅니다.
  _loopLastAt=now;
  syncTokenMoveDuration();
  if(!state||!state.running||state.gameOver) return;
  const stepMs=TICK_MS/Math.max(1,gameSpeed);
  const paused=(state.phase==='cardSelect' || state.phase==='waveTransition' || state.phase==='eventSelect');
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
  // 토큰 위치는 '논리 스텝'에서만 바뀌므로, 스텝 직후에는 즉시 렌더링하고
  // 그 사이에는 이펙트 갱신용으로 약 20fps만 유지해 모바일 성능을 지킵니다.
  if(stepped || now-_lastRenderAt>=50){ _lastRenderAt=now; renderUI(); }
}
// 하위 호환용(외부에서 tick()을 호출하는 코드가 있을 경우 1스텝만 안전하게 진행)
function tick(){
  if(!state||!state.running||state.gameOver) return;
  if(state.phase==='cardSelect' || state.phase==='waveTransition' || state.phase==='eventSelect'){ renderUI(); return; }
  simulateStep(TICK_MS/1000);
  renderUI();
}
// --- v21~v22 아키타입(빌드 규칙) 시스템: 몬스터/장애물 구성이 조건을 충족하면 규칙 자체가 바뀝니다. ---
const ARCHETYPE_DEFS=[
  {key:'sniper',icon:'🏹',name:'저격 군단',relicFlag:'relicSniperLegion',
    rule:'같은 용사를 2마리 이상이 동시 조준 중이면, 체력 25% 이하일 때 다음 피격에 즉시 처형',
    reqs:[{label:'원거리(사거리2+) 몬스터',get:c=>c.rangedCount,need:3,cuttable:true}]},
  {key:'glacial',icon:'🧊',name:'빙하 감옥',relicFlag:'relicGlacialPrison',
    rule:'이미 둔화·빙결 상태인 용사가 냉기/거미줄에 재차 걸리면 장시간 완전 동결',
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
    reqs:[{label:'독가스/저주 함정 합계',get:c=>c.poisonCurseTraps,need:3,cuttable:true}]},
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
    rule:'구덩이에 속박된 용사 주변의 스파이크 함정이 주기적으로 자동 발동',
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
    rule:'저주 걸린 용사가 화염 피해를 받으면 화상 지속시간이 2배로 증폭됩니다',
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
  processObstacleVisualsAndZones(dt);
  for(const p of state.auraPositions.statue){
    processStatue(p.r,p.c,state.grid[p.r][p.c],dt);
  }

  if(state.mawang && !state.mawang.dead){ processMawangTick(state.mawang,dt); }
  for(const m of state.monsters) processMonsterTick(m,dt);
  for(const h of state.heroes) processHeroTick(h,dt);

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
      pushDeathFx(h.r,h.c,'#e0495f');
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
          if(killer.kills%KILLS_PER_LEVEL===0 && killer.tier<MAX_TIER){
            levelUpMonster(killer);
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

function chooseHeroEntranceForStage(stageIndex){
  if(!state) return null;
  const candidates=[];
  for(let c=0;c<GRID;c++){ candidates.push([0,c],[GRID-1,c]); }
  for(let r=1;r<GRID-1;r++){ candidates.push([r,0],[r,GRID-1]); }
  const current=Array.isArray(state.heroSpawnPoints)?state.heroSpawnPoints:[];
  const shuffled=candidates.slice().sort(()=>Math.random()-.5);
  const picks=[];
  for(const pos of shuffled){
    if(current.some(sp=>sp.r===pos[0]&&sp.c===pos[1])) continue;
    if(picks.some(x=>Math.abs(x[0]-pos[0])+Math.abs(x[1]-pos[1])<Math.max(3,Math.floor(GRID*.12)))) continue;
    picks.push(pos);
    if(picks.length>=3) break;
  }
  while(picks.length<3){
    const pos=candidates[Math.floor(Math.random()*candidates.length)];
    if(!picks.some(x=>x[0]===pos[0]&&x[1]===pos[1])) picks.push(pos);
  }

  // 기존 3개 침입구 표시를 모두 제거합니다.
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(state.grid[r][c] && state.grid[r][c].isEntrance){
      state.grid[r][c].isEntrance=false;
    }
  }
  const points=picks.map(([r,c])=>({r,c}));
  points.forEach(point=>{
    state.grid[point.r][point.c]={type:'floor',isEntrance:true,breached:true,obstacle:null};
    state.fxEvents.push({type:'spawnBurst',r:point.r,c:point.c,color:'rgba(224,73,95,.95)'});
  });
  state.heroSpawnPoints=points.map(sp=>({...sp}));
  state.heroSpawnPoint={...points[0]};
  state.heroSpawnStage=stageIndex;
  state._mapDirty=true;
  state._rangesDirty=true;
  state._panelDirty=true;
  ENTRANCES=points.map(sp=>({...sp}));
  addLog(`<span class="hl-red">🚪 새로운 용사 침입구 3곳이 발견되었습니다!</span> — ${stageIndex*10+1}~${stageIndex*10+10}웨이브 동안 이곳에서 침입합니다.`);
  return points;
}

function startWave(){
  state.phase='invasion';
  state.wave++;
  state.invasionTimer=0;
  // 11, 21, 31...웨이브 시작 시 용사 침입구를 새로 랜덤 지정합니다.
  if(state.wave>1 && state.wave%10===1){
    chooseHeroEntranceForStage(Math.floor((state.wave-1)/10));
  }
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
  state.waveHeroesTotal=Math.max(1,Math.round((2+Math.floor(state.wave*1.5)+(state.stageEvent?.id==='panic'?2:0))*.92*riskMul*contractMul*midwaveMul));
  state.nextWaveRiskMul=1;
  if(state.contractHeroRiskWaves>0) state.contractHeroRiskWaves--;
  state.nextWaveRewardMul=state.nextWaveRewardMul||1;
  state.wavePattern=BOSS_PROFILES[state.wave] ? {id:'boss_'+state.wave,name:BOSS_PROFILES[state.wave].name,speedMul:0.92,types:BOSS_PROFILES[state.wave].types} : getEncounterPattern(state.wave);
  state.currentBossName=BOSS_PROFILES[state.wave]?.name || null;
  const patternSpeed=state.wavePattern?.speedMul||1;
  state.spawnInterval=Math.max(SPAWN_INTERVAL_MIN,(SPAWN_INTERVAL_START-state.wave*0.10)*state.stageSpawnMul*patternSpeed);
  if(state.currentBossName) addLog(`<span class="hl-gold">☠️ ${state.currentBossName}</span>이(가) ${state.wave}웨이브의 최종 관문으로 출현합니다.`);
  else if(state.wavePattern) addLog(`<span class="hl-red">⚔️ ${state.wavePattern.name}</span>이(가) 침입을 시작합니다.`);
  state.waveHeroesSpawned=0;
  state.bossSpawnedThisWave=false;
  state.bossesSpawnedThisWave=0;
  setStageBackground(state.wave);
  state.spawnCooldown=1.2;
  state.spawnInterval=Math.max(SPAWN_INTERVAL_MIN, (SPAWN_INTERVAL_START-state.wave*0.10)*state.stageSpawnMul);
  if(state.wave>1 && state.wave%10===1){ Sound.setStageMusic(Math.floor((state.wave-1)/10)); Sound.expand(); }
  Sound.waveStart();
  showWaveBanner(`웨이브 ${state.wave} 시작!`);
  addLog(`<span class="hl-red">웨이브 ${state.wave} 시작!</span> 용사 ${state.waveHeroesTotal}명이 몰려옵니다.`);
}

let waveTransitionTimer=null;
let waveCardTimer=null;
let defeatTimer=null;
let gameSessionId=0;
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
  Sound.waveClear();
  if(state.wave%5===0) reviveMawangOnWaveClear();
  showWaveBanner(`웨이브 ${state.wave} 클리어!`);
  addLog(`<span class="hl-gold">웨이브 ${state.wave} 클리어!</span> 골드 <span class="hl-gold">+${waveBonus}G</span> · 핵 회복 <span class="hl-gold">+${coreHeal}</span>`);
  if(state.wave%10===0) { Sound.expand(); expandDungeon(); }
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
