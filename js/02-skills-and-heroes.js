"use strict";
function mawangSkillLevel(id){ return Math.max(0,Math.floor(Number(mawangProfile.skills?.[id])||0)); }
function mawangSkillDef(id){ for(const b of MAWANG_SKILL_BRANCHES){const n=b.nodes.find(x=>x.id===id);if(n)return n;} return null; }
function mawangSkillBranch(id){ return MAWANG_SKILL_BRANCHES.find(b=>b.nodes.some(n=>n.id===id))||null; }
function mawangCanLearn(id){
  const n=mawangSkillDef(id); if(!n)return false;
  const lv=mawangSkillLevel(id); if(lv>=n.max)return false;
  if((mawangProfile.skillPoints||0)<n.cost)return false;
  if(n.req && mawangSkillLevel(n.req)<=0)return false;
  if(n.capstone && n.req && mawangSkillLevel(n.req)<3)return false;
  return true;
}
function learnMawangSkill(id){
  const n=mawangSkillDef(id); if(!mawangCanLearn(id)) return false;
  mawangProfile.skills[id]=mawangSkillLevel(id)+1;
  mawangProfile.skillPoints=Math.max(0,mawangProfile.skillPoints-n.cost);
  if(state && id==='summon_bond'){ state.monsterCap=(state.monsterCap||MONSTER_CAP_START)+1; }
  saveMawangProfile();
  Sound.level();
  if(state){ state._panelDirty=true; state._mawangStatsDirty=true; state._rangesDirty=true; }
  addLog(`<span class="hl-gold">👑 마왕 스킬</span> — ${n.name} Lv.${mawangSkillLevel(id)} 습득!`);
  return true;
}
function mawangEquipLevel(slot){ return Math.max(1,Math.min(MAWANG_EQUIP_MAX_LEVEL,Number(mawangProfile.equipment?.[slot])||1)); }
function mawangEquipCost(slot,lv){
  const s=Math.max(1,Number(lv)||1);
  return Math.round(35 + s*22 + Math.pow(s,1.18)*8);
}
function upgradeMawangEquipment(slot){
  const lv=mawangEquipLevel(slot); if(lv>=MAWANG_EQUIP_MAX_LEVEL)return false;
  const cost=mawangEquipCost(slot,lv);
  if(Number(metaProgress.souls||0)<cost)return false;
  metaProgress.souls-=cost;
  mawangProfile.equipment[slot]=lv+1;
  saveMeta(); saveMawangProfile(); Sound.level();
  if(state){ state._panelDirty=true; state._mawangStatsDirty=true; }
  addLog(`<span class="hl-gold">👑 ${MAWANG_EQUIPMENT_DEFS[slot].name}</span>이(가) Lv.${lv+1}로 강화되었습니다. 영혼 <span class="hl-gold">-${cost}</span>`);
  return true;
}
function mawangXpToNext(lv){ if(lv>=MAWANG_MAX_LEVEL)return Infinity; return Math.floor(80*Math.pow(lv,1.34)); }
function mawangXpProgress(){
  const lv=mawangProfile.level;
  if(lv>=MAWANG_MAX_LEVEL)return {current:0,next:0,pct:100};
  const next=mawangXpToNext(lv);
  return {current:mawangProfile.xp,next,pct:Math.max(0,Math.min(100,(mawangProfile.xp/Math.max(1,next))*100))};
}
const MAWANG_XP_GAIN_MUL=0.30; // v38: 마왕 성장 속도 -70%
function mawangGainXp(amount,hero){
  if(!amount || mawangProfile.level>=MAWANG_MAX_LEVEL) return false;
  let changed=false;
  mawangProfile.xp+=Math.max(0,Math.floor(amount*MAWANG_XP_GAIN_MUL));
  while(mawangProfile.level<MAWANG_MAX_LEVEL){
    const need=mawangXpToNext(mawangProfile.level);
    if(mawangProfile.xp<need)break;
    mawangProfile.xp-=need;
    mawangProfile.level++;
    mawangProfile.skillPoints++;
    mawangProfile.stats.str+=2;
    mawangProfile.stats.vit+=2;
    mawangProfile.stats.int+=1;
    mawangProfile.stats.agi+=1;
    mawangProfile.stats.dom+=1;
    changed=true;
    if(state){
      state.fxEvents.push({type:'spawnBurst',r:state.mawang?.r??CORE_R,c:state.mawang?.c??CORE_C,color:'rgba(224,182,74,.98)'});
      state.fxEvents.push({type:'floatText',r:state.mawang?.r??CORE_R,c:state.mawang?.c??CORE_C,text:'👑 LEVEL UP!',color:'#f5cf70'});
    }
    Sound.level();
    addLog(`<span class="hl-gold">👑 마왕이 Lv.${mawangProfile.level}로 성장했습니다!</span> 스탯이 증가하고 스킬 포인트 +1`);
  }
  saveMawangProfile();
  if(state){ state._panelDirty=true; state._mawangStatsDirty=true; }
  return changed;
}
const MAWANG_EQUIPMENT_DEFS={
  weapon:{icon:'⚔️',name:'무기',stat:'공격력',desc:lv=>`기본 공격력 +${(lv-1)*3}`},
  armor:{icon:'🛡️',name:'방어구',stat:'방어력',desc:lv=>`방어력 +${(lv-1)*2} · 최대 HP +${(lv-1)*18}`},
  accessory:{icon:'💠',name:'장식구',stat:'마나 / 스킬',desc:lv=>`최대 마나 +${(lv-1)*9} · 스킬 위력 +${((lv-1)*1.25).toFixed(2)}%`},
  boots:{icon:'🥾',name:'신발',stat:'이동속도',desc:lv=>`이동속도 +${((lv-1)*2).toFixed(0)}%`},
  gloves:{icon:'🧤',name:'장갑',stat:'공격속도',desc:lv=>`공격속도 +${((lv-1)*1.8).toFixed(1)}%`}
};
function mawangSkillRate(id,base){ return mawangSkillLevel(id)*base; }
function mawangHasSkill(id){ return mawangSkillLevel(id)>0; }
function mawangNearWall(r,c){
  for(const [nr,nc] of neighbors4(r,c)) if(state.grid[nr]?.[nc]?.playerWall) return true;
  return false;
}
function mawangSupportRange(){
  const dom=Number(mawangProfile?.stats?.dom)||5;
  return 5 + Math.floor(Math.max(0,dom-5)/3);
}
function mawangObstacleMultiplier(){
  const mul=(1+mawangSkillRate('trap_amplify',.04))*(1+mawangSkillRate('hazard_command',.03));
  return mul*(mawangHasSkill('demon_king')?1.08:1);
}
const MAWANG_POWER_MUL=0.50; // v38: 마왕 전체 능력치 -50%
function killMawang(m){
  if(!m || m.dead) return;
  m.hp=0; m.dead=true; m.downedUntil=0; m.targetHeroId=null; m.castingSkill=null;
  if(state){
    state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'💀 DOWN',color:'#ff667a'});
    pushDeathFx(m.r,m.c,'#ff667a');
    state._panelDirty=true;
  }
  const next=(state?Math.ceil(Math.max(1,state.wave)/5)*5:5);
  addLog(`<span class="hl-red">👑 마왕이 쓰러졌습니다.</span> <span class="hl-gold">${next}웨이브</span>를 클리어하면 부활합니다.`);
}
function reviveMawangOnWaveClear(){
  const m=state&&state.mawang;
  if(!m || !m.dead) return;
  const st=mawangCurrentStats();
  m.maxHp=st.maxHp; m.maxMana=st.maxMana; m.atk=st.atk; m.def=st.def; m.level=st.level;
  m.hp=Math.max(1,Math.round(st.maxHp*0.35)); // 소폭 회복된 상태로 부활
  m.mana=Math.round(st.maxMana*0.35);
  m.dead=false; m.downedUntil=0; m.moveCooldown=.2; m.attackCooldown=0;
  m.skillTimers={annihilation:0,legion:0,hellBloom:0};
  m.r=CORE_R; m.c=CORE_C;
  state.fxEvents.push({type:'spawnBurst',r:CORE_R,c:CORE_C,color:'rgba(224,73,95,.98)'});
  addLog(`<span class="hl-gold">👑 마왕 부활</span> — 마력의 핵에서 체력 ${Math.round(m.hp)}(35%)로 다시 일어섰습니다.`);
  state._panelDirty=true;
}
function mawangCurrentStats(){
  const p=mawangProfile||MAWANG_DEFAULT, lv=p.level||1, s=p.stats||MAWANG_DEFAULT.stats, e=p.equipment||MAWANG_DEFAULT.equipment;
  const atkBase=20+s.str*2.2+lv*1.5+(e.weapon-1)*3;
  const defBase=6+s.vit*.8+(e.armor-1)*2;
  const hpBase=180+s.vit*12+lv*14+(e.armor-1)*18;
  const manaBase=60+s.int*7+lv*2+(e.accessory-1)*9+mawangSkillRate('arcane_core',12);
  const skillMul=(1+mawangSkillRate('spell_focus',.05))*(1+(e.accessory-1)*.0125)*(mawangHasSkill('demon_king')?1.08:1);
  const atkMul=(1+mawangSkillRate('blood_edge',.04))*(mawangHasSkill('demon_king')?1.08:1);
  const hpMul=mawangHasSkill('demon_king')?1.08:1;
  const defMul=mawangHasSkill('demon_king')?1.08:1;
  const crit=Math.min(.6,.05+mawangSkillRate('cruel_precision',.03)+s.agi*.002);
  const atkSpeed=Math.max(.28,(1.22-s.agi*.008)) / (1+(e.gloves-1)*.018);
  const moveInterval=Math.max(.24,(.72-s.agi*.0038)) / (1+(e.boots-1)*.02) / (1+mawangSkillRate('war_cry',.03));
  // v38: 마왕 전투력 전체 -50%
  const maxHp=Math.round(hpBase*hpMul*MAWANG_POWER_MUL), atk=Math.round(atkBase*atkMul*MAWANG_POWER_MUL), def=Math.round(defBase*defMul*MAWANG_POWER_MUL), maxMana=Math.round(manaBase), skillPower=skillMul;
  const regenPct=.0015+mawangSkillRate('dark_regen',.0035);
  return {level:lv,str:s.str,vit:s.vit,int:s.int,agi:s.agi,dom:s.dom,maxHp,atk,def,maxMana,skillPower,crit,attackInterval:atkSpeed,moveInterval,regenPct,range:1};
}
function createMawangEntity(r,c){
  const st=mawangCurrentStats();
  return {id:'mawang',r,c,hp:st.maxHp,maxHp:st.maxHp,mana:st.maxMana,maxMana:st.maxMana,atk:st.atk,def:st.def,level:st.level,moveCooldown:.15,attackCooldown:0,lastAttackAt:0,targetHeroId:null,downedUntil:0,skillTimers:{annihilation:0,legion:0,hellBloom:0},lastStatsLevel:st.level};
}
function refreshMawangEntityStats(m){
  if(!m)return;
  const st=mawangCurrentStats();
  const hpRatio=m.maxHp>0?m.hp/m.maxHp:1;
  m.maxHp=st.maxHp; m.hp=Math.min(st.maxHp,Math.max(1,Math.round(st.maxHp*hpRatio)));
  m.maxMana=st.maxMana; m.mana=Math.min(st.maxMana,m.mana??st.maxMana); m.atk=st.atk; m.def=st.def; m.level=st.level;
}
function findHeroForMawang(m){
  let best=null,bestD=Infinity;
  const command=normalizeMonsterCommand(state?.monsterCommand||mawangProfile.command||'defense');
  const defensive=command==='defense';
  for(const h of state.heroes){
    if(h.hp<=0)continue;
    const d=Math.abs(h.r-m.r)+Math.abs(h.c-m.c);
    if(defensive){
      const hd=Math.abs(h.r-CORE_R)+Math.abs(h.c-CORE_C);
      if(hd>MONSTER_LEASH_RADIUS+2) continue;
      if(d<bestD){best=h;bestD=d;}
    }else if(d<bestD){best=h;bestD=d;}
  }
  return {hero:best,dist:bestD};
}
function mawangAttackHero(m,h,dist){
  const now=performance.now();
  const st=mawangCurrentStats();
  if(m.attackCooldown>0)return false;
  const crit=Math.random()<st.crit;
  let dmg=Math.max(1,Math.round(st.atk*st.skillPower*(crit?1.85:1))-h.def);
  if(h.isBoss)dmg=Math.round(dmg*(1+mawangSkillRate('king_slayer',.08)));
  if(h.hp<=h.maxHp*.3)dmg=Math.round(dmg*(1+mawangSkillRate('execution_aura',.08)));
  if(mawangNearWall(m.r,m.c))dmg=Math.round(dmg*(1+mawangSkillRate('wall_domain',.05)));
  h.hp-=dmg;
  h.lastMawangHitAt=now;
  m.lastAttackAt=now;
  m.attackCooldown=Math.max(.12,st.attackInterval);
  if(h.hp<=0)h.killerMawang=true;
  state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:dmg,color:crit?'#ffd166':'#e84b64'});
  state.fxEvents.push({type:'spark',r:h.r,c:h.c,color:crit?'#fff0a6':'#ff6873'});
  if(dist<=1){
    const dR=Math.sign(h.r-m.r), dC=Math.sign(h.c-m.c);
    const meleeFxReady=now-(m.lastMeleeFxAt||0)>=220;
    if(meleeFxReady){
      m.lastMeleeFxAt=now;
      // 다른 근접 몬스터/용사와 동일한 전진→타격→복귀 연출을 사용합니다.
      state.fxEvents.push(
        {type:'punch',key:'mawang',dr:dR,dc:dC,mode:'attacker'},
        {type:'punch',key:'h'+h.id,dr:dR,dc:dC,mode:'defender'},
        {type:'battleHit',r:h.r,c:h.c,color:'#b21f4c',strong:crit||dmg>Math.max(12,h.maxHp*.12),damage:dmg}
      );
    }else{
      state.fxEvents.push({type:'battleHit',r:h.r,c:h.c,color:'#b21f4c',strong:crit||dmg>Math.max(12,h.maxHp*.12),damage:dmg});
    }
  } else state.fxEvents.push({type:'projectile',fromR:m.r,fromC:m.c,toR:h.r,toC:h.c,color:'#d84b72',owner:'mawang',typeId:'mawang',kind:'blade'});
  if(crit) state.fxEvents.push({type:'floatText',r:h.r,c:h.c,text:'CRIT!',color:'#ffd166'});
  if(mawangHasSkill('hell_slash') && Math.random()<.10+mawangSkillRate('hell_slash',.04)){
    for(const o of state.heroes){
      if(o===h||o.hp<=0)continue;
      if(Math.abs(o.r-h.r)+Math.abs(o.c-h.c)<=1){
        const splash=Math.max(1,Math.round(dmg*.45)); o.hp-=splash; if(o.hp<=0)o.killerMawang=true;
        state.fxEvents.push({type:'floatText',r:o.r,c:o.c,text:'-'+splash,color:'#f46a85'});
      }
    }
  }
  if(dist<=1) Sound.mawangAttack();
  else Sound.monsterAttack();
  return true;
}
function mawangAutoAnnihilation(m){
  if(!mawangHasSkill('annihilation'))return;
  const now=performance.now();
  if(m.skillTimers.annihilation && now<m.skillTimers.annihilation)return;
  const target=state.heroes.filter(h=>h.hp>0).sort((a,b)=>(Math.abs(a.r-m.r)+Math.abs(a.c-m.c))-(Math.abs(b.r-m.r)+Math.abs(b.c-m.c)))[0];
  if(!target || Math.abs(target.r-m.r)+Math.abs(target.c-m.c)>4)return;
  m.skillTimers.annihilation=now+20000/(1-mawangSkillRate('swift_mind',.04));
  const st=mawangCurrentStats();
  const dmg=Math.max(5,Math.round(st.atk*3.5*st.skillPower));
  for(const h of state.heroes){ if(h.hp<=0)continue; if(Math.abs(h.r-target.r)+Math.abs(h.c-target.c)<=1){h.hp-=dmg;if(h.hp<=0)h.killerMawang=true;state.fxEvents.push({type:'damageNumber',r:h.r,c:h.c,amount:dmg,color:'#ff5b73'});} }
  state.fxEvents.push({type:'monsterSkillImpact',r:target.r,c:target.c,spell:'dark',radius:1.2,icon:'☠'});
  addLog(`<span class="hl-gold">👑 멸절의 일격</span> — 마왕의 광역 참격이 폭발했습니다.`);
  Sound.magic('dark');
}
function mawangAutoLegion(){
  if(!mawangHasSkill('legion_lord'))return;
  const now=performance.now(), m=state.mawang;
  if(m.skillTimers.legion && now<m.skillTimers.legion)return;
  m.skillTimers.legion=now+25000/(1-mawangSkillRate('swift_mind',.04));
  let count=0;
  for(const o of state.monsters){
    if(o.hp<=0||Math.abs(o.r-m.r)+Math.abs(o.c-m.c)>mawangSupportRange())continue;
    o.skillAtkBuffUntil=now+8000; o.skillAtkBuffMul=Math.max(o.skillAtkBuffMul||1,1.25); o.mawangDefBuffUntil=now+8000; count++;
  }
  if(count){state.fxEvents.push({type:'spellImpact',r:m.r,c:m.c,spell:'dark'});addLog(`<span class="hl-gold">👑 군단령</span> — 주변 몬스터 ${count}마리가 각성합니다.`);Sound.magic('dark');}
}
function mawangAutoHellBloom(m){
  if(!mawangHasSkill('hell_bloom'))return;
  const now=performance.now();
  if(m.skillTimers.hellBloom && now<m.skillTimers.hellBloom)return;
  const target=state.heroes.filter(h=>h.hp>0&&Math.abs(h.r-m.r)+Math.abs(h.c-m.c)<=5).sort((a,b)=>(Math.abs(a.r-m.r)+Math.abs(a.c-m.c))-(Math.abs(b.r-m.r)+Math.abs(b.c-m.c)))[0];
  if(!target)return;
  const radius=2;
  let picked=null;
  for(let r=target.r-radius;r<=target.r+radius && !picked;r++)for(let c=target.c-radius;c<=target.c+radius;c++){
    const t=state.grid[r]?.[c];
    if(t?.obstacle && isObstacleRoot(r,c) && ['spike','flame','lightning','poison','curse'].includes(t.obstacle)){picked={r,c,t};break;}
  }
  if(!picked)return;
  // activateObstacle requires a hero on the target tile. Use the nearest hero as the trigger source.
  m.skillTimers.hellBloom=now+18000/(1-mawangSkillRate('swift_mind',.04));
  activateObstacle(target,picked.t,'mawang',true);
  state.fxEvents.push({type:'floatText',r:picked.r,c:picked.c,text:'🌹 개화!',color:'#f06a88'});
}
function processMawangTick(m,dt){
  const nowTick=performance.now();
  if(!m) return;
  if(m.dead || m.hp<=0) return;
  refreshMawangEntityStats(m);
  const st=mawangCurrentStats();
  m.attackCooldown=Math.max(0,(m.attackCooldown||0)-dt);
  // 마왕은 RPG 캐릭터이지만 핵 파괴 조건과 분리된 플레이어 전용 유닛입니다.
  m.hp=Math.min(m.maxHp,m.hp+m.maxHp*st.regenPct*dt);
  m.mana=Math.min(m.maxMana,(m.mana??m.maxMana)+2*dt);
  mawangAutoAnnihilation(m); mawangAutoLegion(); mawangAutoHellBloom(m);
  const {hero,dist}=findHeroForMawang(m);
  m.targetHeroId=hero?.id??null;
  if(hero){
    if(dist<=st.range){ mawangAttackHero(m,hero,dist); return; }
    m.moveCooldown-=dt;
    if(m.moveCooldown>0)return;
    m.moveCooldown=st.moveInterval;
    const step=pathStepToGoal(m,[[hero.r,hero.c]]);
    if(step){m.prevR=m.r;m.prevC=m.c;m.r=step[0];m.c=step[1];return;}
  }else{
    m.moveCooldown-=dt;
    if(m.moveCooldown>0)return;
    m.moveCooldown=st.moveInterval;
  }
  const defenseBehavior=normalizeMonsterCommand(state.monsterCommand)==='defense';
  const coreDistance=Math.abs(m.r-CORE_R)+Math.abs(m.c-CORE_C);
  if(defenseBehavior && coreDistance>MONSTER_LEASH_RADIUS){
    const goals=neighbors4(CORE_R,CORE_C).filter(([r,c])=>{const t=state.grid[r]?.[c];return t&&(t.type==='floor'||t.type==='core')&&t.obstacle!=='barricade'&&!monsterAt(r,c);});
    const step=goals.length?pathStepToGoal(m,goals):null;
    if(step){m.r=step[0];m.c=step[1];return;}
  }
  const passable=(r,c)=>{const t=state.grid[r]?.[c];return !!t&&(t.type==='floor'||t.type==='core')&&t.obstacle!=='barricade';};
  const choices=neighbors4(m.r,m.c).filter(([r,c])=>passable(r,c)&&!monsterAt(r,c));
  if(choices.length && Math.random()<.35){const p=choices[Math.floor(Math.random()*choices.length)];m.r=p[0];m.c=p[1];}
}
function mawangSupportMultiplier(m){
  if(state&&state.mawang&&state.mawang.dead) return {atk:1,def:0,speed:1,regen:0};
  if(!m||!state?.mawang)return {atk:1,def:0,regen:0,speed:1};
  const mm=state.mawang, range=mawangSupportRange();
  const d=Math.abs(m.r-mm.r)+Math.abs(m.c-mm.c);
  if(d>range)return {atk:1,def:0,regen:0,speed:1};
  return {atk:1+mawangSkillRate('dark_orders',.04),def:mawangSkillRate('iron_will',2)+(m.mawangDefBuffUntil&&performance.now()<m.mawangDefBuffUntil?Math.round(m.def*.10):0),regen:mawangSkillRate('blood_supply',.0035),speed:1+mawangSkillRate('war_cry',.03)};
}

window.addEventListener('beforeunload',()=>{
  if(metaSyncTimer){ clearTimeout(metaSyncTimer); metaSyncTimer=null; pushMetaToSupabase(true); }
  if(mawangSyncTimer){ clearTimeout(mawangSyncTimer); mawangSyncTimer=null; pushMawangToSupabase(true); }
});

/* 영구 몬스터 성장 설정.
   전투 중 tier(Lv.1~10)와 별개로 계정에 저장되는 장기 성장입니다. */
const MONSTER_META_MAX_LEVEL=10;
const MONSTER_META_UNLOCK_COST={D:0,C:100,B:250,A:500,S:800,SS:1200};
const MONSTER_META_GRADE_ICON={D:'⚪',C:'🟢',B:'🔵',A:'🟣',S:'🟡',SS:'🟠'};
function monsterMetaLevel(typeId){
  return Math.max(1,Math.min(MONSTER_META_MAX_LEVEL,Number(metaProgress.monsterLevels?.[typeId])||1));
}
function monsterMetaUnlocked(typeId){
  const mt=MONSTER_TYPES.find(x=>x.id===typeId);
  if(!mt) return false;
  return !mt.cardOnly || getPermanentUnlockedMonsterIds().includes(typeId);
}
function monsterMetaUnlockCost(mt){ return MONSTER_META_UNLOCK_COST[mt?.grade]??500; }
function monsterMetaUpgradeCost(mt,level){
  const lv=Math.max(1,Number(level)||1);
  const gradeMul={D:.70,C:.80,B:1,A:1.15,S:1.30,SS:1.45}[mt?.grade]||1;
  return Math.max(25,Math.round(30*gradeMul*Math.pow(1.45,lv-1)));
}
function monsterMetaStats(typeId,opts={}){
  const lv=monsterMetaLevel(typeId);
  const factor=1+(lv-1)*0.04;
  const defBonus=Math.floor((lv-1)*0.35);
  return {
    hpMul:factor*(opts.hpMul||1),
    atkMul:factor*(opts.atkMul||1),
    defBonus,
    level:lv,
    skillCooldownMul:lv>=5?0.95:1,
    skillDamageMul:lv>=10?1.10:1
  };
}
// 참고: 이전 버전에 "마왕 능력"(시작 골드/코어 체력/몬스터 상한/보상/행운) 강화를 위한
// 자리만 마련해두고 실제로 영혼을 써서 올릴 수 있는 UI가 없어 항상 기본값만 반환하는
// 죽은 코드였습니다. 지금은 기본값 상수로 정리했고, 추후 "마왕 능력" 탭을 만들면
// metaProgress에 필드를 추가해서 이 함수들이 그 값을 반영하도록 확장하면 됩니다.
function metaStartGold(){return START_GOLD;}
function metaCoreHP(){return CORE_MAX_HP;}
function metaMonsterCap(){return MONSTER_CAP_START;}
function metaRewardMul(){return 1;}
function metaLuck(){return 0;}
function getPermanentUnlockedMonsterIds(){return Array.isArray(metaProgress.unlockedMonsterIds)?metaProgress.unlockedMonsterIds:[];}
function permanentlyUnlockMonster(id){
  if(!id)return false;
  if(!Array.isArray(metaProgress.unlockedMonsterIds)) metaProgress.unlockedMonsterIds=[];
  if(metaProgress.unlockedMonsterIds.includes(id)) return false;
  metaProgress.unlockedMonsterIds.push(id);
  saveMeta();
  return true;
}
function permanentUpgradeMonster(id){
  const mt=MONSTER_TYPES.find(x=>x.id===id);
  if(!mt || !monsterMetaUnlocked(id)) return false;
  const lv=monsterMetaLevel(id);
  if(lv>=MONSTER_META_MAX_LEVEL) return false;
  const cost=monsterMetaUpgradeCost(mt,lv);
  if(metaProgress.souls<cost) return false;
  metaProgress.souls-=cost;
  if(!metaProgress.monsterLevels) metaProgress.monsterLevels={};
  metaProgress.monsterLevels[id]=lv+1;
  saveMeta();
  Sound.level();
  return true;
}
function unlockMonsterWithSouls(id){
  const mt=MONSTER_TYPES.find(x=>x.id===id);
  if(!mt || !mt.cardOnly || monsterMetaUnlocked(id)) return false;
  const cost=monsterMetaUnlockCost(mt);
  if(metaProgress.souls<cost) return false;
  metaProgress.souls-=cost;
  permanentlyUnlockMonster(id);
  if(!metaProgress.monsterLevels) metaProgress.monsterLevels={};
  if(!metaProgress.monsterLevels[id]) metaProgress.monsterLevels[id]=1;
  saveMeta();
  Sound.level();
  return true;
}
function metaGradeRank(g){ return ({D:0,C:1,B:2,A:3,S:4,SS:5}[g]??0); }
function metaGradeClass(g){ return 'g-'+String(g||'D').toLowerCase(); }

/* ---------------- v35 함정 연구소(Trap Research Lab) ----------------
   전투 중 함정 강화(Lv.1~10)와는 별개로, 영혼(soul)을 써서 영구히 강화되는 연구입니다.
   몬스터 영구 성장과 같은 영혼 지갑을 공유합니다(의도된 설계 — 마왕이 몬스터에 투자할지
   함정에 투자할지 매판 선택하게 만들기 위함).
   연구 레벨은 전투 중 Lv.1~10과 헷갈리지 않도록 Lv.1~5로 분리했습니다. */
const TRAP_RESEARCH_MAX_LEVEL=5;

// 함정별 연구 비용 등급 (설치 골드 비용 기준: ~55G=일반, 56~85G=중요, 86G+=핵심)
const TRAP_RESEARCH_TIER={
  spike:'normal', frost:'normal', web:'normal',
  poison:'major', barricade:'major', pit:'major', flame:'major', curse:'major',
  lightning:'core', statue:'core'
};
const TRAP_RESEARCH_TIER_COST={ normal:[80,150,280,450], major:[100,180,320,520], core:[120,220,380,600] };
const COMMON_RESEARCH_COST=[80,160,300,500];

const TRAP_RESEARCH_CATEGORY={
  spike:'attack', flame:'attack', lightning:'attack', poison:'attack',
  barricade:'defense', pit:'defense', statue:'defense',
  frost:'control', web:'control', curse:'control'
};
const TRAP_MASTERY_META={
  attack:{icon:'🔥',name:'파괴의 계승',desc:'공격형 함정(가시·화염·번개·독) 연구를 3/6/9회 진행하면 해당 함정들의 피해가 추가로 강해집니다.'},
  defense:{icon:'🛡️',name:'요새의 계승',desc:'방어형 함정(철벽·구덩이·수호진) 연구를 3/6/9회 진행하면 내구도·효과·주변 몬스터 방어력이 강화됩니다.'},
  control:{icon:'☠️',name:'제어의 계승',desc:'제어형 함정(빙판·거미둥지·저주) 연구를 3/6/9회 진행하면 지속시간·효과가 강화되고, 제어당한 적은 피해를 더 받습니다.'}
};

// 개별 함정 연구 Lv.2~5 설명(표시용). Lv.1은 기본 상태라 별도 항목이 없습니다.
const TRAP_RESEARCH_TIERS={
  spike:[
    {name:'가시 연마',desc:'가시 피해 +4%'},
    {name:'파열 연구',desc:'출혈 지속시간 +0.5초'},
    {name:'관통 가시',desc:'방어력이 높은 용사에게 주는 피해 +8%'},
    {name:'처형의 가시',desc:'체력 20% 이하 용사에게 주는 피해 +20%'}
  ],
  flame:[
    {name:'화염 증폭',desc:'화상 피해 +5%'},
    {name:'불씨 잔류',desc:'화상 지속시간 +1초'},
    {name:'고열',desc:'화상 상태 용사에게 주는 직접 피해 +10%'},
    {name:'지옥불',desc:'화상 상태 용사가 죽으면 주변 1칸에 화염 피해'}
  ],
  lightning:[
    {name:'전류 증폭',desc:'번개 피해 +4%'},
    {name:'연쇄 회로',desc:'첫 대상에게 주는 피해 +8%'},
    {name:'과전류',desc:'번개에 맞은 용사는 2초 동안 번개 피해 +10%'},
    {name:'낙뢰 공명',desc:'한 번에 3명 이상 맞히면 다음 낙뢰 피해 +25%'}
  ],
  poison:[
    {name:'맹독 정제',desc:'독 피해 +5%'},
    {name:'독성 잔류',desc:'중독 지속시간 +1초'},
    {name:'농축 맹독',desc:'첫 접촉 시 추가 피해 +6'},
    {name:'역병의 원천',desc:'중독으로 사망한 용사 주변 1칸에 중독 전염'}
  ],
  barricade:[
    {name:'강철 보강',desc:'내구도 +6%'},
    {name:'재보강',desc:'내구도 25% 이하가 되면 1회 10% 회복'},
    {name:'요새벽',desc:'범위 내 몬스터 방어력 +5%'},
    {name:'철벽 진지',desc:'범위 내 몬스터가 받는 피해 -10%'}
  ],
  pit:[
    {name:'깊은 구덩이',desc:'구속 지속시간 +0.3초'},
    {name:'불안정 지반',desc:'구덩이에서 벗어난 용사 이동속도 -15%(2초)'},
    {name:'심연의 압력',desc:'구속 시 피해 +15%'},
    {name:'함몰의 심연',desc:'벗어난 용사가 40% 확률로 짧게 재구속'}
  ],
  statue:[
    {name:'수호 문양',desc:'방어 보너스 +4%'},
    {name:'회복 결계',desc:'범위 내 몬스터 추가 지속 회복'},
    {name:'철벽 공명',desc:'방어 보너스 추가 +8%'},
    {name:'마왕의 성소',desc:'범위 내 몬스터가 치명적 피해를 1회 20% HP로 생존'}
  ],
  frost:[
    {name:'냉기 강화',desc:'감속 효과 +5%'},
    {name:'한기',desc:'둔화 지속시간 +0.5초'},
    {name:'동상',desc:'접촉 시 감속 효과 추가 -10%'},
    {name:'영구동토',desc:'이미 감속된 용사가 다시 밟으면 짧은 빙결'}
  ],
  web:[
    {name:'점착액 강화',desc:'감속 효과 +5%'},
    {name:'거미줄 증식',desc:'지속시간 +1초'},
    {name:'포획',desc:'15% 확률로 0.5초 이동 정지'},
    {name:'거미왕의 은총',desc:'속박 중인 용사가 받는 피해 +20%'}
  ],
  curse:[
    {name:'저주 강화',desc:'공격력 감소 효과 +4%'},
    {name:'회복 억제',desc:'용사 회복량 추가 -10%'},
    {name:'심화 저주',desc:'저주 상태 용사 방어력 -5%'},
    {name:'죽음의 낙인',desc:'저주 상태에서 체력 25% 이하가 되면 받는 피해 +15%'}
  ]
};

const COMMON_RESEARCH_DEFS={
  engineering:{icon:'⚙️',name:'함정공학',desc:'모든 함정 설치 비용이 감소합니다.',
    tiers:[{name:'경량화 I',desc:'설치 비용 -2%'},{name:'경량화 II',desc:'설치 비용 -4%(누적)'},{name:'경량화 III',desc:'설치 비용 -6%(누적)'},{name:'양산 체계',desc:'설치 비용 -8%(누적)'}]},
  amplify:{icon:'🔮',name:'마력 증폭',desc:'모든 함정의 효과(피해·디버프)가 소폭 강화됩니다.',
    tiers:[{name:'마력 주입 I',desc:'모든 함정 효과 +2%'},{name:'마력 주입 II',desc:'+4%(누적)'},{name:'마력 주입 III',desc:'+6%(누적)'},{name:'마력 폭주',desc:'+8%(누적)'}]},
  durability:{icon:'🧱',name:'내구 연구',desc:'모든 함정의 최대 내구도가 증가합니다.',
    tiers:[{name:'내구 강화 I',desc:'함정 내구도 +3%'},{name:'내구 강화 II',desc:'+6%(누적)'},{name:'내구 강화 III',desc:'+9%(누적)'},{name:'대악마 합금',desc:'+12%(누적)'}]},
  stealth:{icon:'👁️',name:'은폐술',desc:'용사가 함정을 더 늦게 알아채게 만듭니다.',
    tiers:[{name:'위장 I',desc:'용사의 함정 발견 거리 -0.3칸'},{name:'위장 II',desc:'-0.6칸(누적)'},{name:'위장 III',desc:'-0.9칸(누적)'},{name:'기습 함정',desc:'용사가 처음 접촉하는 함정의 효과 +25%'}]},
  chain:{icon:'⛓️',name:'연쇄술',desc:'직격형 함정(가시·화염·번개)이 서로 연쇄 발동합니다.',
    tiers:[{name:'공명 배선 I',desc:'연쇄 발동 확률 30%'},{name:'공명 배선 II',desc:'확률 50% · 연쇄 범위 +0.5'},{name:'다중 배선',desc:'최대 연쇄 대상 +1'},{name:'완전 연쇄',desc:'연쇄로 유발된 함정도 50% 확률로 재연쇄(최대 5회)'}]}
};

function trapResearchLevel(id){
  return Math.max(1,Math.min(TRAP_RESEARCH_MAX_LEVEL, Number(metaProgress.trapResearch?.[id])||1));
}
function trapResearchTierKey(id){ return TRAP_RESEARCH_TIER[id]||'major'; }
function trapResearchUpgradeCost(id,level){
  const lv=Math.max(1,Number(level)||1);
  if(lv>=TRAP_RESEARCH_MAX_LEVEL) return Infinity;
  const table=TRAP_RESEARCH_TIER_COST[trapResearchTierKey(id)]||TRAP_RESEARCH_TIER_COST.major;
  return table[lv-1]??Infinity;
}
function upgradeTrapResearch(id){
  if(!TRAP_RESEARCH_TIERS[id]) return false;
  const lv=trapResearchLevel(id);
  if(lv>=TRAP_RESEARCH_MAX_LEVEL) return false;
  const cost=trapResearchUpgradeCost(id,lv);
  if(metaProgress.souls<cost) return false;
  metaProgress.souls-=cost;
  if(!metaProgress.trapResearch) metaProgress.trapResearch={};
  metaProgress.trapResearch[id]=lv+1;
  saveMeta();
  Sound.level();
  return true;
}
function commonResearchLevel(key){
  return Math.max(1,Math.min(TRAP_RESEARCH_MAX_LEVEL, Number(metaProgress.commonResearch?.[key])||1));
}
function commonResearchUpgradeCost(key,level){
  const lv=Math.max(1,Number(level)||1);
  if(lv>=TRAP_RESEARCH_MAX_LEVEL) return Infinity;
  return COMMON_RESEARCH_COST[lv-1]??Infinity;
}
function upgradeCommonResearch(key){
  if(!COMMON_RESEARCH_DEFS[key]) return false;
  const lv=commonResearchLevel(key);
  if(lv>=TRAP_RESEARCH_MAX_LEVEL) return false;
  const cost=commonResearchUpgradeCost(key,lv);
  if(metaProgress.souls<cost) return false;
  metaProgress.souls-=cost;
  if(!metaProgress.commonResearch) metaProgress.commonResearch={};
  metaProgress.commonResearch[key]=lv+1;
  saveMeta();
  Sound.level();
  return true;
}

// ---- 공통 연구 효과 접근자 ----
function trapEngineeringCostMul(){ return 1-(commonResearchLevel('engineering')-1)*0.02; } // lv1=1.00 ~ lv5=0.92
function trapAmplifyMul(){ return 1+(commonResearchLevel('amplify')-1)*0.02; }             // lv1=1.00 ~ lv5=1.08
function trapDurabilityMul(){ return 1+(commonResearchLevel('durability')-1)*0.03; }        // lv1=1.00 ~ lv5=1.12
function trapStealthReduction(){ return Math.min(3,commonResearchLevel('stealth')-1)*0.3; } // lv1=0 ~ lv4/5=0.9칸
function trapAmbushBonus(){ return commonResearchLevel('stealth')>=5?0.25:0; }
function trapChainLevel(){ return commonResearchLevel('chain'); }

// ---- 계열 마스터리(별도 구매 없이, 해당 계열 연구를 많이 할수록 자동으로 강해집니다) ----
function trapMasteryCount(category){
  return Object.keys(TRAP_RESEARCH_CATEGORY).filter(id=>TRAP_RESEARCH_CATEGORY[id]===category)
    .reduce((sum,id)=>sum+(trapResearchLevel(id)-1),0);
}
function trapMasteryTier(category){ const n=trapMasteryCount(category); return n>=9?3:n>=6?2:n>=3?1:0; }
function trapMasteryAttackDmgMul(){ return 1+[0,.03,.07,.13][trapMasteryTier('attack')]; }
function trapMasteryDefenseDurMul(){ return 1+(trapMasteryTier('defense')>=1?.05:0); }
function trapMasteryDefenseEffectMul(){ return 1+(trapMasteryTier('defense')>=2?.08:0); }
function trapMasteryDefenseMonsterDefBonus(){ return trapMasteryTier('defense')>=3?.05:0; }
function trapMasteryControlDurMul(){ return 1+(trapMasteryTier('control')>=1?.10:0); }
function trapMasteryControlDmgTakenBonus(){ return trapMasteryTier('control')>=2?.05:0; }
function trapMasteryControlEffectMul(){ return 1+(trapMasteryTier('control')>=3?.10:0); }

function renderStartMetaSummary(){
  const el=document.getElementById('startMetaSummary');
  if(!el)return;
  const unlocked=getPermanentUnlockedMonsterIds().length;
  el.textContent=`🔮 영혼 ${Number(metaProgress.souls||0).toLocaleString()} · 👑 마왕 Lv.${mawangProfile.level||1} · 해금 몬스터 ${unlocked}종 · 육성 가능한 몬스터 ${MONSTER_TYPES.filter(monsterMetaUnlocked).length}종`;
}
let metaGrowthTab='unlock';
let metaGrowthGradeFilter='all';
function renderMetaGrowth(){
  metaProgress=loadMeta();
  const soulEl=document.getElementById('metaGrowthSoulText');
  const content=document.getElementById('metaGrowthContent');
  const overlay=document.getElementById('metaGrowthOverlay');
  if(soulEl) soulEl.textContent=`🔮 ${Number(metaProgress.souls||0).toLocaleString()}`;
  renderStartMetaSummary();
  if(!content)return;

  document.querySelectorAll('#metaGrowthOverlay .meta-tab').forEach(b=>b.classList.toggle('active',b.dataset.metaTab===metaGrowthTab));

  const allGrades=['all','D','C','B','A','S','SS'];
  const filterHtml=`<div class="meta-filter-row">${allGrades.map(g=>`<button class="meta-filter ${metaGrowthGradeFilter===g?'active':''}" data-meta-grade="${g}">${g==='all'?'전체':g+'급'}</button>`).join('')}</div>`;

  if(metaGrowthTab==='unlock'){
    const locked=MONSTER_TYPES
      .filter(mt=>mt.cardOnly && !monsterMetaUnlocked(mt.id))
      .filter(mt=>metaGrowthGradeFilter==='all'||mt.grade===metaGrowthGradeFilter)
      .sort((a,b)=>metaGradeRank(a.grade)-metaGradeRank(b.grade)||a.cost-b.cost||a.name.localeCompare(b.name,'ko'));
    const unlockedCount=MONSTER_TYPES.filter(mt=>mt.cardOnly && monsterMetaUnlocked(mt.id)).length;
    content.innerHTML=`
      <div class="meta-section-note"><b style="color:#fff">몬스터 카드 해금</b><br>해금한 몬스터는 이후 모든 판에서 몬스터 목록과 웨이브 보상 카드의 후보가 됩니다. 해금 자체는 영혼만 사용하며 전투 중 자원은 사용하지 않습니다.</div>
      ${filterHtml}
      <div class="meta-section-note" style="margin-top:0;color:#8fd3a4;">✅ 카드 해금 ${unlockedCount} / ${MONSTER_TYPES.filter(x=>x.cardOnly).length}</div>
      <div class="meta-monster-grid" id="metaUnlockGrid"></div>`;
    const grid=content.querySelector('#metaUnlockGrid');
    if(!locked.length){ grid.innerHTML='<div class="meta-empty" style="grid-column:1/-1;">이 등급에서 아직 해금할 몬스터가 없습니다.<br>다른 등급을 확인해보세요.</div>'; }
    locked.forEach(mt=>{
      const cost=monsterMetaUnlockCost(mt);
      const can=metaProgress.souls>=cost;
      const card=document.createElement('div'); card.className='meta-monster-card locked';
      card.innerHTML=`
        <div class="meta-monster-top">
          <div class="meta-monster-icon"><img src="${typeof SPRITE_DATA!=='undefined'&&SPRITE_DATA[mt.id]?SPRITE_DATA[mt.id]:''}" alt="" onerror="this.remove()"></div>
          <div class="meta-monster-info">
            <div class="meta-monster-name">${mt.name}</div>
            <span class="meta-grade ${metaGradeClass(mt.grade)}">${mt.grade}급</span>
            <div class="meta-monster-desc">${mt.desc}</div>
          </div>
        </div>
        <div class="meta-lock-body">
          <div class="meta-lock-cost"><span>🔮 해금 비용</span><span class="meta-cost">${cost.toLocaleString()} 영혼</span></div>
          <button class="meta-action" ${can?'':'disabled'}>🔓 카드 해금</button>
        </div>`;
      const btn=card.querySelector('.meta-action');
      btn?.addEventListener('click',()=>{
        if(unlockMonsterWithSouls(mt.id)){
          metaGrowthGradeFilter='all';
          renderMetaGrowth();
        }
      });
      grid.appendChild(card);
    });
  }else if(metaGrowthTab==='upgrade'){
    const monsters=MONSTER_TYPES
      .filter(mt=>monsterMetaUnlocked(mt.id))
      .filter(mt=>metaGrowthGradeFilter==='all'||mt.grade===metaGrowthGradeFilter)
      .sort((a,b)=>metaGradeRank(b.grade)-metaGradeRank(a.grade)||a.cost-b.cost||a.name.localeCompare(b.name,'ko'));
    content.innerHTML=`
      <div class="meta-section-note"><b style="color:#fff">몬스터 영구 강화</b><br>영구 레벨은 매 판 초기화되지 않습니다. 전투 중 Lv.1~10 강화와 별개로, 기본 HP·공격력·방어력을 강화하고 Lv.5에서 스킬 재사용 대기시간, Lv.10에서 스킬 피해 보너스를 해금합니다.</div>
      ${filterHtml}
      <div class="meta-monster-grid" id="metaUpgradeGrid"></div>`;
    const grid=content.querySelector('#metaUpgradeGrid');
    if(!monsters.length){ grid.innerHTML='<div class="meta-empty" style="grid-column:1/-1;">해금된 몬스터가 없습니다.</div>'; }
    monsters.forEach(mt=>{
      const lv=monsterMetaLevel(mt.id);
      const max=lv>=MONSTER_META_MAX_LEVEL;
      const nextCost=max?0:monsterMetaUpgradeCost(mt,lv);
      const statsNow=monsterMetaStats(mt.id);
      const statsNext=max?statsNow:monsterMetaStats(mt.id,{hpMul:1.0,atkMul:1.0});
      const currentHp=Math.round(mt.hp*statsNow.hpMul);
      const currentAtk=Math.round(mt.atk*statsNow.atkMul);
      const nextHp=max?currentHp:Math.round(mt.hp*(1+lv*0.04));
      const nextAtk=max?currentAtk:Math.round(mt.atk*(1+lv*0.04));
      const can=metaProgress.souls>=nextCost;
      const milestone=lv>=10?'✨ Lv.10 스킬 피해 +10%':lv>=5?'⚡ Lv.5 스킬 재사용 대기시간 -5%':'다음 특성: Lv.5 스킬 재사용 대기시간 -5%';
      const card=document.createElement('div'); card.className=`meta-monster-card ${max?'maxed':''}`;
      card.innerHTML=`
        <div class="meta-monster-top">
          <div class="meta-monster-icon"><img src="${typeof SPRITE_DATA!=='undefined'&&SPRITE_DATA[mt.id]?SPRITE_DATA[mt.id]:''}" alt="" onerror="this.remove()"></div>
          <div class="meta-monster-info">
            <div class="meta-monster-name">${mt.name}</div>
            <span class="meta-grade ${metaGradeClass(mt.grade)}">${mt.grade}급 · 영구 육성</span>
            <div class="meta-monster-desc">${mt.desc}</div>
          </div>
        </div>
        <div class="meta-level-row"><span class="meta-level-badge">영구 Lv. <b>${lv}</b> / ${MONSTER_META_MAX_LEVEL}</span><span style="font-size:8px;color:${max?'#ffe08a':'#9187b3'}">${max?'MAX':'다음 강화 준비'}</span></div>
        <div class="meta-progress"><div class="meta-progress-fill" style="width:${lv/MONSTER_META_MAX_LEVEL*100}%"></div></div>
        <div class="meta-stat-line">
          <div class="meta-stat">HP<b>+${Math.round((statsNow.hpMul-1)*100)}%</b></div>
          <div class="meta-stat">ATK<b>+${Math.round((statsNow.atkMul-1)*100)}%</b></div>
          <div class="meta-stat">DEF<b>+${statsNow.defBonus}</b></div>
        </div>
        <div class="meta-milestone"><b>${milestone}</b>${!max?`<br>다음 Lv. ${Math.round((lv)*4)}% → ${Math.round((lv+1)*4)}% 기본 성장` : '<br>모든 영구 성장 효과가 최대치입니다.'}</div>
        <button class="meta-action" ${max||!can?'disabled':''}>${max?'👑 최대 레벨':'🔮 '+nextCost.toLocaleString()+' 영혼으로 Lv.'+(lv+1)}</button>`;
      const btn=card.querySelector('.meta-action');
      btn?.addEventListener('click',()=>{
        if(permanentUpgradeMonster(mt.id)) renderMetaGrowth();
      });
      grid.appendChild(card);
    });
  }else if(metaGrowthTab==='traps'){
    renderTrapResearchTab(content);
  }else if(metaGrowthTab==='mawang'){
    renderMawangGrowthTab(content);
  }
  content.querySelectorAll('.meta-filter').forEach(b=>b.addEventListener('click',()=>{metaGrowthGradeFilter=b.dataset.metaGrade||'all';renderMetaGrowth();}));
}
let trapResearchSubTab='trap';
function renderTrapResearchTab(content){
  const subTabHtml=`<div class="meta-tabs" style="margin:0 0 8px;">
      <button class="meta-tab ${trapResearchSubTab==='trap'?'active':''}" data-trap-sub="trap">🪤 개별 함정</button>
      <button class="meta-tab ${trapResearchSubTab==='common'?'active':''}" data-trap-sub="common">🧪 공통 연구</button>
      <button class="meta-tab ${trapResearchSubTab==='mastery'?'active':''}" data-trap-sub="mastery">👑 계열 마스터리</button>
    </div>`;
  let body='';
  if(trapResearchSubTab==='trap'){
    body=`<div class="meta-section-note"><b style="color:#fff">함정 개별 연구</b><br>전투 중 함정 Lv.1~10 강화와는 별개로, 영혼을 써서 영구히 강화되는 연구입니다(연구 Lv.1~5). 몬스터 영구 성장과 같은 영혼을 공유합니다.</div>
      <div class="meta-monster-grid" id="trapResearchGrid"></div>`;
  }else if(trapResearchSubTab==='common'){
    body=`<div class="meta-section-note"><b style="color:#fff">공통 연구</b><br>모든 함정에 동시에 적용되는 다섯 가지 연구입니다.</div>
      <div class="meta-monster-grid" id="commonResearchGrid"></div>`;
  }else{
    body=`<div class="meta-section-note"><b style="color:#fff">계열 마스터리</b><br>따로 영혼을 쓰지 않습니다 — 같은 계열의 함정 연구를 많이 진행할수록 자동으로 강해집니다.</div>
      <div class="meta-monster-grid" id="trapMasteryGrid"></div>`;
  }
  content.innerHTML=subTabHtml+body;
  content.querySelectorAll('[data-trap-sub]').forEach(b=>b.addEventListener('click',()=>{trapResearchSubTab=b.dataset.trapSub;renderMetaGrowth();Sound.ui();}));

  if(trapResearchSubTab==='trap'){
    const grid=content.querySelector('#trapResearchGrid');
    OBSTACLE_TYPES.forEach(ob=>{
      const lv=trapResearchLevel(ob.id);
      const max=lv>=TRAP_RESEARCH_MAX_LEVEL;
      const nextCost=max?0:trapResearchUpgradeCost(ob.id,lv);
      const can=metaProgress.souls>=nextCost;
      const tierName={normal:'일반',major:'중요',core:'핵심'}[trapResearchTierKey(ob.id)];
      const tiers=TRAP_RESEARCH_TIERS[ob.id]||[];
      const curTier=lv>=2?tiers[lv-2]:null;
      const nextTier=!max?tiers[lv-1]:null;
      const card=document.createElement('div'); card.className=`meta-monster-card ${max?'maxed':''}`;
      card.innerHTML=`
        <div class="meta-monster-top">
          <div class="meta-monster-icon"><img src="${ob.sprite||''}" alt="" onerror="this.remove()"></div>
          <div class="meta-monster-info">
            <div class="meta-monster-name">${ob.icon} ${ob.name}</div>
            <span class="meta-grade ${metaGradeClass(tierName==='일반'?'D':tierName==='중요'?'B':'S')}">${tierName} 등급</span>
            <div class="meta-monster-desc">${ob.desc}</div>
          </div>
        </div>
        <div class="meta-level-row"><span class="meta-level-badge">연구 Lv. <b>${lv}</b> / ${TRAP_RESEARCH_MAX_LEVEL}</span><span style="font-size:8px;color:${max?'#ffe08a':'#9187b3'}">${max?'MAX':'다음 연구 준비'}</span></div>
        <div class="meta-progress"><div class="meta-progress-fill" style="width:${lv/TRAP_RESEARCH_MAX_LEVEL*100}%"></div></div>
        <div class="meta-milestone">${curTier?`<b>✅ ${curTier.name}</b><br>${curTier.desc}`:'<b>기본 상태</b><br>아직 연구를 진행하지 않았습니다.'}${nextTier?`<br><br><b style="color:#c9b8ff">다음: ${nextTier.name}</b><br>${nextTier.desc}`:''}</div>
        <button class="meta-action" ${max||!can?'disabled':''}>${max?'👑 최대 레벨':'🔮 '+nextCost.toLocaleString()+' 영혼으로 연구'}</button>`;
      const btn=card.querySelector('.meta-action');
      btn?.addEventListener('click',()=>{ if(upgradeTrapResearch(ob.id)) renderMetaGrowth(); });
      grid.appendChild(card);
    });
  }else if(trapResearchSubTab==='common'){
    const grid=content.querySelector('#commonResearchGrid');
    Object.keys(COMMON_RESEARCH_DEFS).forEach(key=>{
      const def=COMMON_RESEARCH_DEFS[key];
      const lv=commonResearchLevel(key);
      const max=lv>=TRAP_RESEARCH_MAX_LEVEL;
      const nextCost=max?0:commonResearchUpgradeCost(key,lv);
      const can=metaProgress.souls>=nextCost;
      const curTier=lv>=2?def.tiers[lv-2]:null;
      const nextTier=!max?def.tiers[lv-1]:null;
      const card=document.createElement('div'); card.className=`meta-monster-card ${max?'maxed':''}`;
      card.innerHTML=`
        <div class="meta-monster-top">
          <div class="meta-monster-icon" style="font-size:28px;display:flex;align-items:center;justify-content:center;">${def.icon}</div>
          <div class="meta-monster-info">
            <div class="meta-monster-name">${def.name}</div>
            <div class="meta-monster-desc">${def.desc}</div>
          </div>
        </div>
        <div class="meta-level-row"><span class="meta-level-badge">연구 Lv. <b>${lv}</b> / ${TRAP_RESEARCH_MAX_LEVEL}</span><span style="font-size:8px;color:${max?'#ffe08a':'#9187b3'}">${max?'MAX':'다음 연구 준비'}</span></div>
        <div class="meta-progress"><div class="meta-progress-fill" style="width:${lv/TRAP_RESEARCH_MAX_LEVEL*100}%"></div></div>
        <div class="meta-milestone">${curTier?`<b>✅ ${curTier.name}</b><br>${curTier.desc}`:'<b>기본 상태</b><br>아직 연구를 진행하지 않았습니다.'}${nextTier?`<br><br><b style="color:#c9b8ff">다음: ${nextTier.name}</b><br>${nextTier.desc}`:''}</div>
        <button class="meta-action" ${max||!can?'disabled':''}>${max?'👑 최대 레벨':'🔮 '+nextCost.toLocaleString()+' 영혼으로 연구'}</button>`;
      const btn=card.querySelector('.meta-action');
      btn?.addEventListener('click',()=>{ if(upgradeCommonResearch(key)) renderMetaGrowth(); });
      grid.appendChild(card);
    });
  }else{
    const grid=content.querySelector('#trapMasteryGrid');
    Object.keys(TRAP_MASTERY_META).forEach(cat=>{
      const meta=TRAP_MASTERY_META[cat];
      const count=trapMasteryCount(cat);
      const tier=trapMasteryTier(cat);
      const maxCount=Object.keys(TRAP_RESEARCH_CATEGORY).filter(id=>TRAP_RESEARCH_CATEGORY[id]===cat).length*(TRAP_RESEARCH_MAX_LEVEL-1);
      const nextThreshold=tier>=3?maxCount:[3,6,9][tier];
      const card=document.createElement('div'); card.className=`meta-monster-card ${tier>=3?'maxed':''}`;
      card.innerHTML=`
        <div class="meta-monster-top">
          <div class="meta-monster-icon" style="font-size:28px;display:flex;align-items:center;justify-content:center;">${meta.icon}</div>
          <div class="meta-monster-info">
            <div class="meta-monster-name">${meta.name}</div>
            <div class="meta-monster-desc">${meta.desc}</div>
          </div>
        </div>
        <div class="meta-level-row"><span class="meta-level-badge">연구 횟수 <b>${count}</b> / ${maxCount}</span><span style="font-size:8px;color:${tier>=3?'#ffe08a':'#9187b3'}">${tier>=3?'MAX 단계':'단계 '+tier+'/3'}</span></div>
        <div class="meta-progress"><div class="meta-progress-fill" style="width:${Math.min(100,count/maxCount*100)}%"></div></div>
        <div class="meta-milestone">${tier>=3?'<b>✅ 최종 단계 달성</b>':`<b>다음 단계까지 연구 ${nextThreshold-count}회 더 필요</b>`}<br>해당 계열 함정(${Object.keys(TRAP_RESEARCH_CATEGORY).filter(id=>TRAP_RESEARCH_CATEGORY[id]===cat).map(id=>OBSTACLE_TYPES.find(o=>o.id===id)?.name).join('·')})의 연구를 진행하면 자동으로 올라갑니다.</div>`;
      grid.appendChild(card);
    });
  }
}

function renderMawangGrowthTab(content){
  const st=mawangCurrentStats();
  const xp=mawangXpProgress();
  const command=normalizeMonsterCommand(mawangProfile.command||'defense');
  const cmdMeta=MONSTER_COMMAND_META[command]||MONSTER_COMMAND_META.defense;
  const sub=`<div class="mawang-subtabs">
    <button class="mawang-subtab ${mawangSubTab==='status'?'active':''}" data-mawang-sub="status">📊 스테이터스</button>
    <button class="mawang-subtab ${mawangSubTab==='skills'?'active':''}" data-mawang-sub="skills">🌳 스킬 트리</button>
    <button class="mawang-subtab ${mawangSubTab==='equipment'?'active':''}" data-mawang-sub="equipment">🎒 장비창</button>
  </div>`;
  content.innerHTML=sub+`<div class="mawang-growth" id="mawangGrowthBody"></div>`;
  const body=content.querySelector('#mawangGrowthBody');
  if(mawangSubTab==='status'){
    body.innerHTML=`<div class="mawang-summary">
      <div class="mawang-portrait"><img src="${window.MAWANG_SPRITE_DATA}" alt="마왕"></div>
      <div>
        <div class="mawang-summary-title">👑 마왕</div>
        <div class="mawang-summary-sub">플레이어 전용 RPG 캐릭터 · 최대 Lv.${MAWANG_MAX_LEVEL}<br>용사를 직접 처치하면 경험치를 얻고 레벨과 스킬 포인트가 증가합니다.</div>
        <div class="mawang-level-line"><span>Lv.${mawangProfile.level}</span><span>${mawangProfile.level>=MAWANG_MAX_LEVEL?'MAX':`${xp.current.toLocaleString()} / ${xp.next.toLocaleString()} XP`}</span></div>
        <div class="mawang-xp"><div style="width:${xp.pct}%"></div></div>
        <div class="mawang-stat-grid">
          <div class="mawang-stat">공격력 <b>${st.atk}</b></div>
          <div class="mawang-stat">방어력 <b>${st.def}</b></div>
          <div class="mawang-stat">HP <b>${st.maxHp}</b></div>
          <div class="mawang-stat">마나 <b>${st.maxMana}</b></div>
          <div class="mawang-stat">치명타 <b>${Math.round(st.crit*100)}%</b></div>
          <div class="mawang-stat">스킬 위력 <b>×${st.skillPower.toFixed(2)}</b></div>
        </div>
        <div class="mawang-command">🎯 현재 명령: <b style="color:#fff">${cmdMeta.name}</b><br>${cmdMeta.desc}</div>
      </div>
    </div>
    <div class="mawang-inline-note">기본 성장: 레벨업마다 <b style="color:#f7d58f">힘 +2 · 체력 +2 · 지능 +1 · 민첩 +1 · 지배 +1</b>. 지배 수치가 높을수록 마왕의 몬스터 지원 범위가 넓어집니다. 장비는 영혼으로 강화하며 모든 장비의 최대 레벨은 ${MAWANG_EQUIP_MAX_LEVEL}입니다.</div>
    <div class="mawang-inline-note">원본 스탯 — 💪 힘 ${st.str||mawangProfile.stats.str} · ❤️ 체력 ${st.vit||mawangProfile.stats.vit} · 🧠 지능 ${st.int||mawangProfile.stats.int} · ⚡ 민첩 ${st.agi||mawangProfile.stats.agi} · 👑 지배 ${st.dom||mawangProfile.stats.dom}</div>
    <div class="mawang-inline-note">장비 현황 — ⚔️ 무기 Lv.${mawangEquipLevel('weapon')} · 🛡️ 방어구 Lv.${mawangEquipLevel('armor')} · 💠 장식구 Lv.${mawangEquipLevel('accessory')} · 🥾 신발 Lv.${mawangEquipLevel('boots')} · 🧤 장갑 Lv.${mawangEquipLevel('gloves')}</div>`;
  }else if(mawangSubTab==='skills'){
    body.innerHTML=`<div class="mawang-skill-header"><div><b style="color:#fff">마왕 스킬 포인트</b><div class="mawang-skill-note">레벨업마다 +1. 노드에 표시된 비용만큼 사용합니다. 한 계열의 이전 노드를 먼저 찍어야 다음 노드가 열립니다.</div></div><div class="mawang-sp">SP ${mawangProfile.skillPoints}</div></div><div class="mawang-tree"></div>`;
    const tree=body.querySelector('.mawang-tree');
    MAWANG_SKILL_BRANCHES.forEach(branch=>{
      const wrap=document.createElement('div');wrap.className='mawang-branch';
      wrap.innerHTML=`<div class="mawang-branch-head"><div class="mawang-branch-title">${branch.icon} ${branch.name}</div><div class="mawang-branch-desc">${branch.desc}</div></div><div class="mawang-skill-nodes"></div>`;
      const nodes=wrap.querySelector('.mawang-skill-nodes');
      branch.nodes.forEach(n=>{
        const lv=mawangSkillLevel(n.id), max=lv>=n.max, can=mawangCanLearn(n.id), lockedReq=n.req&&mawangSkillLevel(n.req)<=0;
        const card=document.createElement('div');card.className='mawang-skill-card'+(n.capstone?' capstone':'')+(lockedReq?' locked':'');
        const reqText=n.capstone ? `선행 ${mawangSkillDef(n.req)?.name||n.req} Lv.3` : n.req ? `선행 ${mawangSkillDef(n.req)?.name||n.req} Lv.1` : '선행 조건 없음';
        card.innerHTML=`<div class="mawang-skill-name">${n.name}</div><div class="mawang-skill-rank">${n.capstone?'ULTIMATE ':''}${lv}/${n.max}</div><div class="mawang-skill-desc">${n.desc}<br><span style="color:#d8c58e">현재: ${n.rankText(lv)}</span></div><div class="mawang-skill-foot"><div class="mawang-skill-prereq">${reqText}</div><button class="mawang-skill-btn" ${(!can||max)?'disabled':''}>${max?'MAX':'SP '+n.cost+'로 습득'}</button></div>`;
        card.querySelector('button').addEventListener('click',()=>{ if(learnMawangSkill(n.id)) renderMetaGrowth(); });
        nodes.appendChild(card);
      });
      tree.appendChild(wrap);
    });
  }else{
    body.innerHTML=`<div class="mawang-skill-header"><div><b style="color:#fff">장비 강화</b><div class="mawang-skill-note">전투 중 얻은/보유한 영혼을 사용합니다. 부위별 레벨이 독립적으로 상승합니다.</div></div><div class="mawang-sp">🔮 ${Number(metaProgress.souls||0).toLocaleString()}</div></div><div class="mawang-equip-grid"></div>`;
    const grid=body.querySelector('.mawang-equip-grid');
    Object.entries(MAWANG_EQUIPMENT_DEFS).forEach(([slot,def])=>{
      const lv=mawangEquipLevel(slot), max=lv>=MAWANG_EQUIP_MAX_LEVEL, cost=max?0:mawangEquipCost(slot,lv), can=!max&&metaProgress.souls>=cost;
      const nextLv=Math.min(MAWANG_EQUIP_MAX_LEVEL,lv+1);
      const card=document.createElement('div');card.className='mawang-equip-card '+slot;
      const current=def.desc(lv), next=max?'MAX 도달':def.desc(nextLv);
      card.innerHTML=`<div class="mawang-equip-title"><span>${def.icon} ${def.name}</span><span class="mawang-equip-lv">Lv.${lv} / ${MAWANG_EQUIP_MAX_LEVEL}</span></div><div class="mawang-equip-effect">주 능력치: ${def.stat}<br>${current}</div><div class="mawang-equip-next">다음: <b>${next}</b></div><button class="mawang-equip-btn" ${can?'':'disabled'}>${max?'👑 최대 레벨':'🔮 '+cost.toLocaleString()+' 영혼으로 강화'}</button>`;
      card.querySelector('button').addEventListener('click',()=>{ if(upgradeMawangEquipment(slot)) renderMetaGrowth(); });
      grid.appendChild(card);
    });
  }
  content.querySelectorAll('[data-mawang-sub]').forEach(b=>b.addEventListener('click',()=>{mawangSubTab=b.dataset.mawangSub||'status';renderMetaGrowth();Sound.ui();}));
}

function openMetaGrowth(targetTab=null){
  metaProgress=loadMeta();
  metaGrowthTab=targetTab||'unlock';
  metaGrowthGradeFilter='all';
  trapResearchSubTab='trap';
  const overlay=document.getElementById('metaGrowthOverlay');
  if(!overlay)return;
  overlay.classList.remove('hidden');
  renderMetaGrowth();
  Sound.ui();
}
function closeMetaGrowth(){
  const overlay=document.getElementById('metaGrowthOverlay');
  if(overlay) overlay.classList.add('hidden');
  renderStartMetaSummary();
  Sound.ui();
}
function awardRunSouls(){
  if(!state) return 0;
  // 디버그 모드(무제한 골드/즉시 소환 등 치트 도구)로 진행한 판은 영구 성장 재화인
  // 영혼을 지급하지 않습니다. 그래야 디버그 모드로 영혼을 무한정 파밍해서
  // 정상 진행도를 오염시키는 걸 막을 수 있습니다.
  if(debugModeActive){ state.runSouls=0; return 0; }
  // v35 영혼 획득 공식 재조정: 이전엔 처치 수 비중(kills*1.7)이 너무 커서 몬스터를
  // 많이 소환해 버티기만 해도 영혼이 과도하게 쌓였습니다(웨이브10에 약 330 정도).
  // 이제는 "얼마나 깊은 웨이브까지 갔는가"가 핵심 지표가 되도록 웨이브 비중을 높이고,
  // 처치 수는 거의 영향이 없는 보조 지표로만 남겼습니다(웨이브10 기준 약 45~55 수준).
  const soulBase=Math.max(5,Math.floor(state.wave*4.5+state.killCount*0.05+(state.bossDefeated||0)*15));
  const souls=Math.max(5,Math.floor(soulBase*(state.contractSoulMul||1))+Math.round(state.pendingSoulBonus||0));
  state.runSouls=souls; metaProgress.souls+=souls; metaProgress.runs+=1; saveMeta(); return souls;
}

const V18_BUILD_CARDS=[
  {id:'venomPact',icon:'☠️',name:'맹독의 계약',desc:'독가스 주변 몬스터 공격력 +20%.',rarity:'빌드',cls:'nature',tag:'poison'},
  {id:'frostChain',icon:'❄️',name:'빙결 연쇄',desc:'냉기결정 주변 몬스터가 공격 시 둔화 적에게 +25% 피해.',rarity:'빌드',cls:'arcane',tag:'frost'},
  {id:'fortressDoctrine',icon:'🧱',name:'요새 교리',desc:'돌기둥 근처 몬스터 최대 HP +30%.',rarity:'빌드',cls:'legendary',tag:'fort'},
  {id:'swarmDoctrine',icon:'👥',name:'군세 교리',desc:'주변 몬스터가 2마리 이상이면 공격력 +18%.',rarity:'빌드',cls:'arcane',tag:'swarm'},
  {id:'corpseFeast',icon:'🩸',name:'시체 포식',desc:'용사 처치 시 몬스터에게 추가 회복 6.',rarity:'빌드',cls:'legendary',tag:'blood'},
  {id:'labyrinthArchitect',icon:'🗺️',name:'미궁 설계자',desc:'플레이어가 건설한 벽 근처 몬스터 공격력 +15%.',rarity:'건설',cls:'nature',tag:'maze'},
  {id:'riskyBargain',icon:'🎲',name:'위험한 거래',desc:'다음 웨이브 용사 수 +35%, 대신 웨이브 보상 +60%.',rarity:'위험',cls:'legendary',tag:'risk'},
  {id:'ancientPact',icon:'👁️',name:'고대의 맹약',desc:'몬스터 최대 수 +3, 소환 비용 +18%, 모든 몬스터 공격력 +12%.',rarity:'고대',cls:'legendary',tag:'ancient'}
];


const BUILD_STAGE_DEFS={
  poison:[['맹독의 씨앗','독과 저주를 중심으로 성장'],['맹독의 각성','독 피해와 중독 효율 증가'],['역병 군단','중독된 적을 더욱 빠르게 무너뜨립니다'],['역병 군주','독성 공격과 스킬이 크게 강화됩니다'],['대재앙의 독','독 빌드의 최종 각성']],
  frost:[['서리의 씨앗','감속과 빙결을 중심으로 성장'],['빙결의 각성','빙결 대상에 대한 압박 강화'],['절대영도','느려진 적에게 추가 압박'],['빙결 군주','빙결 스킬의 영향력이 크게 증가'],['절대빙점','빙결 빌드의 최종 각성']],
  fort:[['수비 진형','탱커와 방어선을 중심으로 성장'],['철벽 진형','전선의 생존력 강화'],['요새화','벽 근처 몬스터가 더욱 단단해짐'],['철벽 성채','수비형 몬스터의 스킬이 강화됨'],['마왕성 요새','요새 빌드의 최종 각성']],
  swarm:[['군세의 씨앗','수와 배치로 전력을 키움'],['군세의 각성','인접 몬스터가 서로 강화'],['끝없는 군단','다수 배치의 위력이 크게 증가'],['군단의 지배자','군세 몬스터의 스킬이 빨라짐'],['무한군단','군세 빌드의 최종 각성']],
  blood:[['포식의 씨앗','처치와 회복을 중심으로 성장'],['흡혈의 각성','처치가 생존력으로 연결'],['피의 굶주림','흡혈·처형 효과 강화'],['혈마의 군세','전투 지속력이 크게 증가'],['피의 대공','포식 빌드의 최종 각성']],
  maze:[['미궁의 씨앗','벽과 통로 활용에 특화'],['미궁의 각성','벽 근처 전투력 강화'],['미궁 설계자','벽을 활용한 전투가 강화'],['미궁 성채','벽 근처 스킬이 더욱 강력해짐'],['미궁의 지배자','미궁 빌드의 최종 각성']],
  risk:[['도박의 씨앗','위험을 감수하고 더 큰 보상을 노림'],['위험 감지','불리한 웨이브를 역전할 준비'],['광기의 도박','위험 보상 효율 강화'],['운명 뒤집기','절체절명의 순간에 강해짐'],['존망의 승부','도박 빌드의 최종 각성']],
  ancient:[['고대의 씨앗','모든 빌드를 조금씩 증폭'],['고대의 각성','연계 빌드 강화'],['태고의 권능','고대 몬스터가 강해짐'],['고대의 군주','모든 빌드 효과 추가 증폭'],['태초의 마왕','고대 빌드의 최종 각성']]
};
const MONSTER_BUILD_AFFINITY={slime:['blood','swarm'],goblin:['swarm','maze'],skeleton:['blood','ancient'],wolf:['blood','swarm'],spider:['poison','maze'],orc:['fort','swarm'],fire:['ancient','poison'],darkmage:['poison','ancient'],golem:['fort','frost'],dragon:['ancient','fort'],skeleton_archer:['blood','maze'],slime_king:['blood','swarm'],berserker_orc:['blood','swarm'],skeleton_warrior:['fort','blood'],grim_reaper:['blood','poison'],flame_spirit:['poison','ancient'],ice_golem:['frost','fort'],dark_sorcerer:['poison','ancient'],rock_colossus:['fort','maze'],lich_lord:['poison','blood']};
function buildStage(tag){const n=buildTagCount(tag);return n>=12?5:n>=8?4:n>=5?3:n>=3?2:n>=1?1:0;}
function buildStageInfo(tag){const defs=BUILD_STAGE_DEFS[tag]||[];const st=buildStage(tag);return {stage:st,name:st&&defs[st-1]?defs[st-1][0]:'미활성',desc:st&&defs[st-1]?defs[st-1][1]:'카드를 획득하면 빌드가 시작됩니다.'};}
function monsterBuildAffinity(m){const tags=MONSTER_BUILD_AFFINITY[m.typeId]||[];let best=null;for(const tag of tags){const st=buildStage(tag);if(st&&(!best||st>best.stage))best={tag,stage:st};}return best;}
function applyBuildEvolutionToMonster(m,announce=true){const a=monsterBuildAffinity(m);if(!a){m.buildAwakeningKey='';return null;}const key=a.tag+':'+a.stage+':'+(m.tier>=10?10:m.tier>=5?5:1);const prev=m.buildAwakeningKey||'';m.buildAwakeningKey=key;if(announce&&key!==prev&&(m.tier>=5||a.stage>=3)){const meta=BUILD_TAG_META[a.tag]||{icon:'◆'};const stage=buildStageInfo(a.tag);state.fxEvents.push({type:'spawnBurst',r:m.r,c:m.c,color:'rgba(183,155,255,.95)'});state.fxEvents.push({type:'monsterSkillName',r:m.r,c:m.c,text:meta.icon+' '+stage.name});addLog(`<span class="hl-gold">${meta.icon} ${MONSTER_TYPES.find(x=>x.id===m.typeId)?.name||'몬스터'} 빌드 각성!</span> ${stage.name}`);}return a;}
function monsterBuildCombatMultiplier(m){const a=monsterBuildAffinity(m);if(!a)return 1;let mul=1;if(a.stage>=2&&m.tier>=5)mul*=1.08;if(a.stage>=3&&m.tier>=5)mul*=1.08;if(a.stage>=4&&m.tier>=10)mul*=1.14;if(a.stage>=5&&m.tier>=10)mul*=1.16;return Math.min(1.65,mul);}
function monsterBuildSkillCooldownMul(m){const a=monsterBuildAffinity(m);if(!a)return 1;if(a.stage>=4&&m.tier>=10)return .76;if(a.stage>=3&&m.tier>=5)return .86;if(a.stage>=2&&m.tier>=5)return .93;return 1;}
const BUILD_TAG_META={
  poison:{icon:'☠️',name:'맹독'}, frost:{icon:'❄️',name:'빙결'}, fort:{icon:'🧱',name:'요새'}, swarm:{icon:'👥',name:'군세'},
  blood:{icon:'🩸',name:'포식'}, maze:{icon:'🗺️',name:'미궁'}, risk:{icon:'🎲',name:'도박'}, ancient:{icon:'👁️',name:'고대'}
};

const BUILD_COMBOS=[
  {id:'plagueFrost',a:'poison',b:'frost',icon:'☣️',name:'극한 부패',desc:'독과 빙결이 한계까지 겹칩니다.',effect:'독·빙결 계열 효과 +12%'},
  {id:'frozenFortress',a:'frost',b:'fort',icon:'🏰',name:'빙결 요새',desc:'느려진 적을 단단한 전선으로 묶습니다.',effect:'탱커 효과 +12%, 빙결 대상 피해 +8%'},
  {id:'bloodSwarm',a:'blood',b:'swarm',icon:'🩸',name:'피의 군단',desc:'죽일수록 강해지고 많을수록 사나워집니다.',effect:'군세 조건 달성 시 추가 공격력 +10%'},
  {id:'labyrinthSwarm',a:'maze',b:'swarm',icon:'🌀',name:'미궁의 군세',desc:'좁은 통로에서 수가 곧 힘이 됩니다.',effect:'벽 근처 +10%, 군세 범위 +1'},
  {id:'poisonBlood',a:'poison',b:'blood',icon:'🦠',name:'핏빛 역병',desc:'상처 입은 적을 처치하며 전선을 회복합니다.',effect:'독·저주 계열 +10%, 처치 회복 강화'},
  {id:'fortMaze',a:'fort',b:'maze',icon:'🛡️',name:'미궁 성채',desc:'벽과 방어선을 하나의 요새로 묶습니다.',effect:'벽 근처 피해 감소 +10%'},
  {id:'ancientAny',a:'ancient',b:null,icon:'👁️',name:'고대의 각성',desc:'고대의 맹약이 다른 모든 빌드를 증폭합니다.',effect:'빌드 시너지 +8%'}
];

function buildTagCount(tag){return (state&&state.buildTags&&state.buildTags[tag])||0;}
function activeBuildCombos(){
  return BUILD_COMBOS.filter(c=>buildTagCount(c.a)>=1 && (!c.b || buildTagCount(c.b)>=1));
}
function buildMastery(tag){
  const n=buildTagCount(tag);
  return n>=3 ? Math.min(.30,.08+(n-3)*.05) : 0;
}
function buildTagPower(tag){
  const n=buildTagCount(tag);
  return n>=2 ? Math.min(.16,(n-1)*.08) : 0;
}
function refreshBuildCombos(logIt=true){
  if(!state) return;
  state.buildMilestones=state.buildMilestones||{};
  for(const combo of BUILD_COMBOS){
    const active=buildTagCount(combo.a)>=1 && (!combo.b || buildTagCount(combo.b)>=1);
    if(active && !state.buildMilestones[combo.id]){
      state.buildMilestones[combo.id]=1;
      if(logIt){
        addLog(`<span class="hl-gold">${combo.icon} 빌드 완성!</span> <b>${combo.name}</b> — ${combo.effect}`);
        state.fxEvents=state.fxEvents||[];
        state.fxEvents.push({type:'spellImpact',r:state.coreR||Math.floor(GRID/2),c:state.coreC||Math.floor(GRID/2),spell:'holy'});
      }
    }
  }
}
function addBuildTag(tag){
  if(!state) return;
  state.buildTags=state.buildTags||{};
  state.buildMilestones=state.buildMilestones||{};
  state.buildTags[tag]=(state.buildTags[tag]||0)+1;
  for(const m of state.monsters||[]) applyBuildEvolutionToMonster(m,true);
  refreshBuildCombos(true);
}
function buildArchetype(){
  const counts=Object.entries(state?.buildTags||{}).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  if(!counts.length) return null;
  const top=counts[0][0];
  const second=counts[1]?.[0];
  const combo=activeBuildCombos()[0];
  if(combo) return combo;
  const meta=BUILD_TAG_META[top];
  return meta ? {icon:meta.icon,name:meta.name+' 군단',effect:`${meta.name} 카드를 중심으로 특화된 빌드`} : null;
}
function buildSummaryHtml(){
  const tags=Object.entries(state?.buildTags||{}).filter(([,n])=>n>0);
  const combo=activeBuildCombos();
  const arch=buildArchetype();
  let html=`<div style="margin-top:10px;padding:9px;border:1px solid rgba(255,255,255,.10);border-radius:8px;background:rgba(255,255,255,.025);"><b>🧬 현재 빌드</b>`;
  if(arch) html+=`<div style="margin-top:5px;color:#f3d37a;font-weight:700;">${arch.icon} ${arch.name}</div><div class="panel-hint" style="margin-top:2px;">${arch.effect}</div>`;
  if(tags.length) html+=`<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;">${tags.map(([t,n])=>{const m=BUILD_TAG_META[t]||{icon:'◆',name:t}; const mastery=buildMastery(t); return `<span style="padding:3px 6px;border:1px solid rgba(255,255,255,.12);border-radius:999px;font-size:11px;">${m.icon} ${m.name} ×${n} · <b>${buildStage(t)}/5</b> · ${buildStageInfo(t).name}${mastery?` · 숙련 +${Math.round(mastery*100)}%`:''}</span>`;}).join('')}</div>`;
  if(combo.length) html+=`<div style="margin-top:7px;font-size:11px;color:#b9e7d1;">🔗 활성 연계 ${combo.map(c=>c.name).join(' · ')}</div>`;
  else html+=`<div class="panel-hint" style="margin-top:5px;">서로 다른 빌드 카드를 모으면 연계가 완성됩니다.</div>`;
  html+='</div>';
  return html;
}

const V18_EVENTS=[
  {id:'merchant',title:'🧙 수상한 상인',desc:'다음 웨이브를 준비하는 동안 거래할 수 있습니다.',choices:[
    {name:'금괴를 산다',desc:'80G 지불 → 즉시 170G 가치의 골드 +50G를 얻습니다.',doIt(){if(state.gold>=80){state.gold-=80;addGold(130,true);addLog('<span class="hl-gold">상인 거래 성공!</span> 골드 +50G');}else addLog('<span class="hl-red">골드가 부족해 거래하지 못했습니다.</span>');}},
    {name:'위험한 계약',desc:'골드 +25G, 대신 다음 웨이브 용사 +35%.',risk:true,doIt(){addGold(25);state.riskLevel=Math.max(state.riskLevel||0,1);state.nextWaveRiskMul=1.35;state.nextWaveRewardMul=1.55;addLog('<span class="hl-red">위험한 계약!</span> 다음 웨이브 난이도와 보상이 증가합니다.');}},
    {name:'그냥 보낸다',desc:'아무것도 얻지 않지만 위험도 없습니다.',doIt(){addLog('상인이 흔적도 없이 사라졌습니다.');}}
  ]},
  {id:'shrine',title:'💎 고대의 제단',desc:'하나만 선택할 수 있습니다.',choices:[
    {name:'핵에 바친다',desc:'핵 최대 HP +18.',doIt(){state.maxThroneHP+=18;state.throneHP=Math.min(state.maxThroneHP,state.throneHP+18);addLog('<span class="hl-gold">고대의 제단</span> — 핵 최대 HP +18.');}},
    {name:'마력에 바친다',desc:'이 판의 모든 몬스터 공격력 +18%.',doIt(){state.globalMonsterAtkMul=(state.globalMonsterAtkMul||1)*1.18;addLog('<span class="hl-gold">고대의 제단</span> — 몬스터 공격력 +18%.');}},
    {name:'탐욕스럽게 흡수한다',desc:'골드 +120G, 대신 핵 최대 HP -10.',risk:true,doIt(){state.maxThroneHP=Math.max(40,state.maxThroneHP-10);state.throneHP=Math.min(state.throneHP,state.maxThroneHP);addGold(120);addLog('<span class="hl-red">제단의 저주</span> — 골드 +120G, 핵 최대 HP -10.');}}
  ]},
  {id:'arena',title:'⚔️ 피의 투기장',desc:'다음 웨이브를 위험하게 강화하면 보상이 커집니다.',choices:[
    {name:'도전한다',desc:'다음 웨이브 용사 +45%, 클리어 보상 +90%.',risk:true,doIt(){state.nextWaveRiskMul=1.45;state.nextWaveRewardMul=1.9;state.riskLevel=(state.riskLevel||0)+2;addLog('<span class="hl-red">피의 투기장</span> — 다음 웨이브가 강화됩니다.');}},
    {name:'관찰만 한다',desc:'영혼 +10 (판 종료 시 지급).',doIt(){state.pendingSoulBonus=(state.pendingSoulBonus||0)+10;addLog('<span class="hl-gold">관찰 보상</span> — 영혼 +10.');}},
    {name:'훈련용 장비',desc:'이번 판에서 몬스터 소환 비용 -12%.',doIt(){state.monsterCostMul=Math.max(.45,(state.monsterCostMul||1)*.88);addLog('<span class="hl-gold">훈련 장비</span> — 몬스터 비용 감소.');}}
  ]}
];
function openV18Event(){
  if(!state||!els.runEventOverlay) return;
  const ev=V18_EVENTS[Math.floor(Math.random()*V18_EVENTS.length)]; state.phase='eventSelect'; state.eventCount=(state.eventCount||0)+1;
  els.runEventTitle.textContent=ev.title; els.runEventDesc.textContent=ev.desc; els.runEventChoices.innerHTML='';
  ev.choices.forEach((ch)=>{
    const b=document.createElement('button'); b.className='event-option';
    b.innerHTML=`<b>${ch.name}${ch.risk?'<span class="event-risk">RISK</span>':''}</b><span>${ch.desc}</span>`;
    b.addEventListener('click',()=>{ Sound.ui(); try{ch.doIt();}catch(err){console.error(err);} els.runEventOverlay.classList.add('hidden'); state.phase='cardSelect'; openCardSelect(); renderUI(); },{once:true});
    els.runEventChoices.appendChild(b);
  });
  els.runEventOverlay.classList.remove('hidden'); renderUI();
}
function freshState(){
  GRID=BASE_GRID;
  CORE_R=Math.floor(GRID/2); CORE_C=Math.floor(GRID/2);
  ENTRANCES=[];
  const grid=[];
  for(let r=0;r<GRID;r++){
    const row=[];
    for(let c=0;c<GRID;c++){
      let tile;
      if(r===CORE_R&&c===CORE_C){ tile={type:'core'}; }
      else if(Math.abs(r-CORE_R)<=REVEAL_RADIUS && Math.abs(c-CORE_C)<=REVEAL_RADIUS){ tile={type:'floor', isEntrance:false, obstacle:null}; }
      else{ tile={type:'rock'}; }
      row.push(tile);
    }
    grid.push(row);
  }
  // 게임 시작 시 용사 침입구 3곳을 랜덤으로 정합니다.
  // 이후 10웨이브 동안 같은 3곳을 유지하고, 11/21/31...웨이브에서 새 3곳으로 변경합니다.
  const edgeCandidates=[];
  for(let c=0;c<GRID;c++){ edgeCandidates.push([0,c],[GRID-1,c]); }
  for(let r=1;r<GRID-1;r++){ edgeCandidates.push([r,0],[r,GRID-1]); }
  const shuffled=edgeCandidates.slice().sort(()=>Math.random()-.5);
  const picks=[];
  for(const pos of shuffled){
    if(picks.some(x=>Math.abs(x[0]-pos[0])+Math.abs(x[1]-pos[1])<Math.max(3,Math.floor(GRID*.12)))) continue;
    picks.push(pos);
    if(picks.length>=3) break;
  }
  while(picks.length<3){
    const pos=edgeCandidates[Math.floor(Math.random()*edgeCandidates.length)];
    if(!picks.some(x=>x[0]===pos[0]&&x[1]===pos[1])) picks.push(pos);
  }
  const heroSpawnPoints=picks.map(([r,c])=>({r,c}));
  heroSpawnPoints.forEach(sp=>{
    grid[sp.r][sp.c]={type:'floor',isEntrance:true,breached:true,obstacle:null};
  });
  ENTRANCES=heroSpawnPoints.map(sp=>({...sp}));
  return {
    gold:metaStartGold(), throneHP:metaCoreHP(), maxThroneHP:metaCoreHP(),
    grid, heroes:[], monsters:[], heroSeq:1, monsterSeq:1,
    // 10웨이브 단위로 변경되는 용사 침입구
    heroSpawnPoints:heroSpawnPoints.map(sp=>({...sp})),
    heroSpawnPoint:{...heroSpawnPoints[0]},
    heroSpawnPointLocked:true,
    heroSpawnStage:0,
    phase:'build', buildTimer:buildTimeForWave(1), invasionTimer:0,
    spawnCooldown:2, spawnInterval:SPAWN_INTERVAL_START,
    wave:0, waveHeroesTotal:0, waveHeroesSpawned:0, bossSpawnedThisWave:false, bossesSpawnedThisWave:0,
    nextWaveRiskMul:1, nextWaveRewardMul:1,
    stageEvent:null, stageEventText:'', stageEventHistory:[], stageEventLastId:null, stageHeroAtkMul:1, stageHeroHpMul:1, stageSpawnMul:1, stageMonsterAtkMul:1, stageCoreDmgMul:1, stageWaveGoldBonus:0,
    killCount:0, selected:null, deathFx:[], fxEvents:[],
    running:false, gameOver:false,
    lastMinuteLogged:0,
    activeTool:'dig', selectedMonsterType:null, selectedObstacleType:null, monsterCommand:normalizeMonsterCommand(mawangProfile.command||'defense'),
    auraPositions:{statue:[],curse:[]},
    unlockedMonsterIds:[...getPermanentUnlockedMonsterIds()],
    startedAt:0, totalMonsterSpawns:0, monsterSpawnCounts:{}, monsterPurchaseCounts:{},
    obstaclePlacements:0, tilesDug:0, heroesSpawned:0,
    maxMonsterTierSeen:0, bestMonsterTypeId:null,
    maxMonsterLifetimeMs:0, longestMonsterTypeId:null, longestMonsterTier:1,
    totalGoldEarned:0, goldPerSec:0, waveGoldEarned:0,
    heroesEscaped:0, cowardCount:0, dungeonExpansions:0, wallsBuilt:0,
    dungeonStats:{obstaclesSeen:0,obstaclesMissed:0,obstaclesBroken:0,trapTriggers:0,trapDamage:0,detourChoices:0,blockedEncounters:0},
    monsterCostMul:1, obstacleRangeBonus:0, globalMonsterAtkMul:1, globalMonsterHpMul:1, coreDamageReduction:0,
    buildTimeBonus:0, waveCardChoices:0,
    rewardChoicesTaken:0, relics:[], contracts:[],
    relicRewardMul:1, relicCoreHealBonus:0,
    contractHeroRiskWaves:0, contractHeroRiskMul:1, contractRewardMul:1, contractRewardWaves:0,
    contractSoulMul:1, contractNoCoreHealWaves:0,
    monsterCap:metaMonsterCap()+mawangSkillLevel('summon_bond'),
    dungeonLayoutVersion:1, dungeonStructure:null,
    buildTags:{}, buildBonuses:{}, buildMilestones:{}, riskLevel:0, runSouls:0, eventCount:0, bossDefeated:0, bossName:null,
    // --- v27 마왕의 제단 ---
    altarCost:100, altarUses:0, altarLastGrade:null, altarLastReward:null, monsterSummonTickets:0,
    // --- v20 카드/유물/계약 개편: 웨이브 한정 보너스 & 규칙형 유물 상태 ---
    coreReflectWaves:0, coreReflectRatio:0,
    tempObstacleRangeWaves:0, tempObstacleRangeAmt:0,
    tempMonsterCapWaves:0, tempMonsterCapAmt:0,
    monsterCostDiscountWaves:0, monsterCostDiscountRatio:0,
    contractNoObstacleWaves:0, contractNoSummonWaves:0,
    contractExpensiveStrongWaves:0, contractExpensiveStrongAtkMul:1,
    permaNoCoreHeal:false, pendingSoulBonus:0,
    relicTrapReviveChance:0, relicCorpseReviveChance:0, relicTrapKillGold:0,
    relicSymbioticChain:false, relicVeteranExecutioner:false, relicRecoilingWall:false,
    relicSmugglersEye:false, relicMarksmanMark:false, relicCoreBastion:false, relicLastStand:false, lastStandTriggered:false,
    _symbioTickAt:0,
    // --- v21 아키타입(빌드 규칙) 시스템 ---
    relicSniperLegion:false, relicGlacialPrison:false, relicPackFury:false, relicUnbrokenLine:false,
    archetypeThresholdCut:0, archetypeActive:{sniper:false,glacial:false,packFury:false,unbrokenLine:false},
    archetypeCounts:{},
    // --- v22 아키타입 11종 추가 ---
    relicPlagueZone:false, relicChainBlast:false, relicBerserkCult:false, relicShadowExec:false,
    relicSanctuary:false, relicPitMaze:false, relicAuraResonance:false, relicMazeArchitect:false,
    relicGoldMerc:false, relicFireCurse:false, relicUndeadPact:false,
    _pitMazeTickAt:0,
  };
}

const els={
  hpBar:document.getElementById('hpBar'), hpText:document.getElementById('hpText'),
  goldText:document.getElementById('goldText'), goldRateText:document.getElementById('goldRateText'),
  waveText:document.getElementById('waveText'),
  phaseLabel:document.getElementById('phaseLabel'), timerText:document.getElementById('timerText'),
  phaseBtn:document.getElementById('phaseBtn'),
  killCount:document.getElementById('killCount'),
  killStatText:document.getElementById('killStatText'),
  monsterCapText:document.getElementById('monsterCapText'),
  frame:document.getElementById('board-frame'),
  stageBackdrop:document.getElementById('stageBackdrop'), stageBadgeIcon:document.getElementById('stageBadgeIcon'), stageBadgeText:document.getElementById('stageBadgeText'), stageBadgeSub:document.getElementById('stageBadgeSub'),
  boardInner:document.getElementById('board-inner'),
  map:document.getElementById('map'),
  rangeLayer:document.getElementById('rangeLayer'),
  tokenLayer:document.getElementById('tokenLayer'),
  panelBox:document.getElementById('panelBox'),
  panelWrap:document.getElementById('panelWrap'),
  overlay:document.getElementById('overlay'), modalBox:document.getElementById('modalBox'),
  startBtn:document.getElementById('startBtn'),
  zoomBtn:document.getElementById('zoomBtn'),
  toolbar:document.getElementById('toolbar'),
  cardOverlay:document.getElementById('cardOverlay'),
  cardChoices:document.getElementById('cardChoices'), rewardChoices:document.getElementById('rewardChoices'), rewardWaveLabel:document.getElementById('rewardWaveLabel'),
  runEventOverlay:document.getElementById('runEventOverlay'), runEventTitle:document.getElementById('runEventTitle'), runEventDesc:document.getElementById('runEventDesc'), runEventChoices:document.getElementById('runEventChoices'),
  metaSoulText:document.getElementById('metaSoulText'), metaPanelGrid:document.getElementById('metaPanelGrid'),
  metaGrowthOverlay:document.getElementById('metaGrowthOverlay'), metaGrowthBtn:document.getElementById('metaGrowthBtn'), metaGrowthCloseBtn:document.getElementById('metaGrowthCloseBtn'),
  waveBanner:document.getElementById('waveBanner'),
  defeatTransition:document.getElementById('defeatTransition'),
  waveTransition:document.getElementById('waveTransition'),
  speedBtn:document.getElementById('speedBtn'),
  speedIcon:document.getElementById('speedIcon'),
  soundBtn:document.getElementById('soundBtn'),
  soundIcon:document.getElementById('soundIcon'),
  buildBtn:document.getElementById('buildBtn'),
  altarBtn:document.getElementById('altarBtn'),
  altarPanel:document.getElementById('altarPanel'),
  altarSacrificeCompactBtn:document.getElementById('altarSacrificeCompactBtn'),
  buildOverlay:document.getElementById('buildOverlay'),
  buildList:document.getElementById('buildList'),
  buildCloseBtn:document.getElementById('buildCloseBtn'),
  debugBtn:document.getElementById('debugBtn'),
  debugOverlay:document.getElementById('debugOverlay'),
  debugHeroGrid:document.getElementById('debugHeroGrid'),
  debugMonsterGrid:document.getElementById('debugMonsterGrid'),
  debugHeroCount:document.getElementById('debugHeroCount'),
  debugMonsterCount:document.getElementById('debugMonsterCount'),
  debugHeroLevel:document.getElementById('debugHeroLevel'),
  debugAsBoss:document.getElementById('debugAsBoss'),
  debugAddGold:document.getElementById('debugAddGold'),
  debugClearHeroes:document.getElementById('debugClearHeroes'),
  debugClearMonsters:document.getElementById('debugClearMonsters'),
  debugCloseBtn:document.getElementById('debugCloseBtn'),
};

/* ---------------- procedural audio ----------------
 * 외부 음원 파일 없이 Web Audio API로 BGM/효과음을 생성합니다.
 * 첫 사용자 클릭(start/사운드 버튼)에서 AudioContext를 활성화합니다.
 */
const Sound = (()=>{
  /* v36 Sound Rework — heavier, cleaner, more game-like procedural audio.
   * No external audio files required. Uses Web Audio synthesis + lightweight ambience.
   */
  let ctx=null, master=null, musicGain=null, sfxGain=null, ambienceGain=null;
  let musicTimer=null, musicStep=0, unlocked=false, muted=false, stageIndex=0;
  let last={};
  const now=()=>performance.now();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const STAGES=[
    {root:55, scale:[0,3,5,7,10,12,15], feel:'dark'},
    {root:49, scale:[0,2,3,7,9,12,14], feel:'fire'},
    {root:46.25, scale:[0,2,5,7,9,12,14], feel:'ice'},
    {root:58.27, scale:[0,2,5,7,9,12,16], feel:'holy'},
    {root:51.91, scale:[0,1,5,7,8,12,15], feel:'abyss'}
  ];
  function ensure(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return false;
      ctx=new AC();
      master=ctx.createGain(); master.gain.value=.88;
      const comp=ctx.createDynamicsCompressor();
      comp.threshold.value=-18; comp.knee.value=10; comp.ratio.value=3.2; comp.attack.value=.004; comp.release.value=.18;
      master.connect(comp); comp.connect(ctx.destination);
      musicGain=ctx.createGain(); musicGain.gain.value=.26; musicGain.connect(master);
      sfxGain=ctx.createGain(); sfxGain.gain.value=1.72; sfxGain.connect(master);
      ambienceGain=ctx.createGain(); ambienceGain.gain.value=.12; ambienceGain.connect(master);
    }
    if(ctx.state==='suspended') ctx.resume();
    unlocked=true; return true;
  }
  function setMuted(v){ muted=!!v; ensure(); if(master) master.gain.setTargetAtTime(muted?0:.88,ctx.currentTime,.035); }
  function toggle(){setMuted(!muted);return muted;}
  function tone(freq,dur=.12,type='sine',vol=.08,slide=0,when=0,bus='sfx',filterType=null,filterFreq=null){
    if(!ensure()||muted) return;
    const t=ctx.currentTime+when, o=ctx.createOscillator(), g=ctx.createGain();
    let out=g;
    if(filterType){const f=ctx.createBiquadFilter();f.type=filterType;f.frequency.value=filterFreq||900;f.Q.value=.8;o.connect(f);f.connect(g);}
    else o.connect(g);
    o.type=type; o.frequency.setValueAtTime(Math.max(28,freq),t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(28,freq*slide),t+dur);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol),t+.006);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*.38),t+dur*.45);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    out.connect(bus==='music'?musicGain:bus==='amb'?ambienceGain:sfxGain); o.start(t); o.stop(t+dur+.025);
  }
  function noise(dur=.1,vol=.08,hp=180,when=0,lp=12000){
    if(!ensure()||muted) return;
    const len=Math.max(1,Math.floor(ctx.sampleRate*dur)), buf=ctx.createBuffer(1,len,ctx.sampleRate), data=buf.getChannelData(0);
    for(let i=0;i<len;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/len,.65);
    const src=ctx.createBufferSource(), hpF=ctx.createBiquadFilter(), lpF=ctx.createBiquadFilter(), g=ctx.createGain(), t=ctx.currentTime+when;
    hpF.type='highpass'; hpF.frequency.value=hp; lpF.type='lowpass'; lpF.frequency.value=lp;
    src.buffer=buf; src.connect(hpF); hpF.connect(lpF); lpF.connect(g); g.connect(sfxGain);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol),t+.004); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.start(t); src.stop(t+dur+.02);
  }
  function thump(vol=.12,pitch=82){tone(pitch,.19,'sine',vol,.42);noise(.11,vol*.52,70,0,2600);}
  function click(){tone(760,.045,'square',.052,1.06);tone(1180,.025,'sine',.025,1.0,.012);}
  function chord(root,kind='minor',vol=.035,when=0){
    const ints=kind==='major'?[1,1.25,1.5]:kind==='power'?[1,1.498]:[1,1.189,1.498];
    ints.forEach((m,i)=>tone(root*m,.38,'triangle',vol*(i?0.75:1),.998,when+i*.012,'sfx','lowpass',1700));
  }
  function startMusic(){
    if(!ensure()||muted||musicTimer) return;
    musicStep=0;
    const tick=()=>{
      if(!ctx||muted) return;
      const s=STAGES[stageIndex%STAGES.length], sem=s.scale[musicStep%s.scale.length];
      const root=s.root*Math.pow(2,sem/12), bar=musicStep%16;
      tone(root,.46,'triangle',.052,.997,0,'music','lowpass',1700);
      if(bar%4===0) tone(s.root/2,.72,'sine',.045,.992,.02,'music','lowpass',700);
      if(bar%4===2) tone(s.root*1.498,.28,'triangle',.024,1.002,.05,'music','lowpass',2200);
      if(bar%8===7) tone(s.root*2,.18,'sine',.018,.9,.08,'music','highpass',900);
      if(bar%4===0) noise(.035,.012,1200,0,6500);
      musicStep=(musicStep+1)%64;
    };
    tick(); musicTimer=setInterval(tick,560);
  }
  function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}}
  function setStageMusic(index){
    stageIndex=Math.max(0,Math.floor(index||0));
    if(musicTimer){stopMusic();startMusic();}
    // brief musical handoff when the map changes
    tone(STAGES[stageIndex%STAGES.length].root*2,.32,'sine',.035,1.25,.02,'music');
  }
  function cooldown(key,ms){const t=now();if((last[key]||0)>t-ms)return false;last[key]=t;return true;}
  const api={
    unlock(){ensure();},setMuted,toggle,startMusic,stopMusic,setStageMusic,cooldown,
    ui(){click();},
    dig(){if(cooldown('dig',170)){noise(.13,.075,320,0,5200);tone(92,.10,'sawtooth',.028,.72);}},
    digBreak(){thump(.14,72);tone(155,.18,'triangle',.055,.48);noise(.12,.06,450);},
    wallBuild(){thump(.10,105);tone(210,.16,'square',.045,.68,.02);noise(.08,.035,260);},
    obstacle(){tone(420,.08,'triangle',.055,1.35);tone(760,.15,'sine',.038,1.01,.055);},
    monsterSpawn(){tone(74,.34,'sawtooth',.085,1.85);tone(148,.26,'triangle',.045,1.15,.08);noise(.18,.035,180,0,2800);},
    spawn(){this.monsterSpawn();},
    heroSpawn(){tone(260,.28,'triangle',.06,.62);tone(520,.34,'sine',.042,1.22,.08);chord(330,'major',.025,.12);},
    heroAttack(){if(cooldown('heroAtk',90)){noise(.055,.055,900,0,7000);tone(245,.11,'square',.045,.64);}},
    heroRanged(){if(cooldown('heroRanged',100)){tone(690,.12,'triangle',.05,1.55);noise(.06,.025,1500,0,9000);}},
    monsterAttack(){if(cooldown('monsterAtk',90)){tone(125,.14,'sawtooth',.06,.52);noise(.06,.035,180);}},
    mawangAttack(){
      if(cooldown('mawangAtk',80)){
        // 마왕 전용 근접 타격음: 저음 충격 + 금속성 베기 + 짧은 노이즈를 겹쳐 무게감 있게 만듭니다.
        thump(.19,68);
        noise(.065,.095,760,0,9500);
        tone(175,.12,'sawtooth',.085,.34,.008);
        tone(320,.09,'square',.045,.58,.022);
      }
    },
    monsterRanged(){if(cooldown('monsterRanged',100)){tone(390,.13,'triangle',.052,.66);tone(780,.09,'sine',.025,1.2,.035);}},
    hit(){if(cooldown('hit',60)){noise(.065,.075,600,0,9000);tone(108,.10,'square',.048,.62);}},
    critical(){tone(68,.25,'sawtooth',.10,.32);noise(.15,.07,700,0,9000);tone(420,.16,'triangle',.035,1.5,.04);},
    death(){noise(.32,.095,100,0,3200);tone(98,.46,'sine',.07,.42);tone(61,.72,'triangle',.055,.55,.18);},
    trap(id){
      /* 장애물별 컨셉 사운드: 짧고 강한 고유 음색으로 전투 판독성을 높입니다.
         - frost  : 기존 빙판 사운드 유지
         - flame  : 화르륵 / 불꽃 폭발
         - lightning : 치지직 / 전기 스파크
         - poison : 치이익 / 독액이 끓고 새는 소리
         - spike  : 철컥-쾅 / 가시가 튀어나오는 금속 충격
         - barricade : 쾅! / 철벽이 부딪히는 무거운 금속음
         - pit    : 쿵-푹 / 바닥 붕괴와 추락
         - statue : 우웅- / 수호 마법진의 저주파 공명
         - web    : 촤악- / 거미줄이 퍼지는 섬유성 마찰음
         - curse  : 지잉-웅 / 어둡고 불길한 마법 공명
      */
      if(id==='frost'){
        noise(.13,.04,1400,0,9000);tone(1180,.25,'sine',.065,.55);tone(700,.34,'triangle',.038,.52,.08);
      } else if(id==='flame'){
        noise(.18,.055,700,0,6000);tone(190,.18,'square',.065,.46);tone(460,.30,'triangle',.04,.68,.07);
      } else if(id==='lightning'){
        if(cooldown('trap_lightning',95)){
          noise(.14,.085,1800,0,10000);
          tone(980,.10,'sawtooth',.048,.72);
          tone(1840,.075,'square',.028,.58,.018);
          tone(420,.12,'triangle',.032,.34,.045);
        }
      } else if(id==='poison'){
        if(cooldown('trap_poison',120)){
          noise(.22,.06,2500,0,9000);
          tone(210,.20,'sawtooth',.032,.62);
          tone(92,.15,'triangle',.024,.74,.045);
        }
      } else if(id==='spike'){
        if(cooldown('trap_spike',90)){
          tone(155,.09,'square',.05,.58);
          noise(.08,.055,1100,0,7000);
          tone(78,.16,'sine',.045,.38,.035);
        }
      } else if(id==='barricade'){
        if(cooldown('trap_barricade',180)){
          thump(.17,72);
          tone(128,.18,'square',.05,.56,.025);
          noise(.075,.035,280,0,4200);
        }
      } else if(id==='pit'){
        if(cooldown('trap_pit',180)){
          tone(62,.24,'sine',.075,.36);
          noise(.15,.05,120,0,1800);
          tone(118,.18,'triangle',.036,.62,.08);
        }
      } else if(id==='statue'){
        if(cooldown('trap_statue',220)){
          tone(92,.42,'sine',.05,.98);
          tone(184,.34,'triangle',.028,.96,.05,'sfx','lowpass',900);
          tone(276,.24,'sine',.016,1.02,.11,'sfx','lowpass',1200);
        }
      } else if(id==='web'){
        if(cooldown('trap_web',150)){
          noise(.16,.048,1700,0,7000);
          tone(760,.10,'sawtooth',.028,.84,.018,'sfx','highpass',500);
          tone(1180,.12,'triangle',.022,.72,.05,'sfx','highpass',700);
        }
      } else if(id==='curse'){
        if(cooldown('trap_curse',180)){
          tone(74,.36,'triangle',.055,.50);
          tone(148,.28,'sine',.028,.58,.055);
          noise(.10,.026,420,0,2600);
        }
      } else {
        noise(.16,.09,300,0,5000);tone(72,.20,'square',.06,.42);
      }
    },
    coreHit(){tone(58,.28,'sine',.085,.44);noise(.10,.055,90,0,1800);},
    waveStart(){tone(165,.22,'triangle',.07,.76);tone(247,.26,'triangle',.052,.82,.10);tone(330,.42,'sine',.055,.98,.22);noise(.035,.018,1200,.22,5000);},
    waveClear(){tone(330,.16,'triangle',.055,1.08);tone(440,.18,'triangle',.06,1.06,.10);tone(554.37,.22,'triangle',.055,1.03,.20);tone(659.25,.48,'sine',.075,1,.32);},
    card(){tone(740,.08,'sine',.05,1.12);tone(1046,.14,'triangle',.045,1.02,.06);},
    level(){tone(330,.11,'triangle',.045,1.22);tone(495,.14,'triangle',.055,1.16,.08);tone(660,.25,'sine',.065,1,.16);},
    expand(){thump(.16,62);tone(124,.34,'square',.055,.48,.04);tone(248,.30,'triangle',.045,1.06,.18);tone(372,.36,'sine',.035,1.0,.28);},
    gameOver(){tone(220,.28,'sine',.075,.78);tone(165,.34,'sine',.065,.68,.22);tone(110,.62,'triangle',.075,.50,.48);noise(.22,.035,100,.55,1500);},
    magic(kind='arcane'){
      const map={fire:[155,.14,'sawtooth',.085,2.8],ice:[980,.20,'sine',.07,.38],dark:[88,.24,'triangle',.085,.52],holy:[560,.20,'sine',.06,1.75],arcane:[390,.15,'triangle',.065,1.95]};
      const a=map[kind]||map.arcane;if(cooldown('magic_'+kind,75)){tone(a[0],a[1],a[2],a[3],a[4]);tone(a[0]*1.8,a[1]*.8,'sine',a[3]*.42,.78,.035);noise(.055,a[3]*.20,1200,.03,7000);}
    },
    skill(kind='arcane',cast=2){
      const base=kind==='fire'?135:kind==='ice'?820:kind==='dark'?82:kind==='holy'?500:kind==='steel'?190:360;
      const dur=Math.min(5,Math.max(2,cast));
      if(cooldown('skill_'+kind,120)){tone(base,.14,'triangle',.075,1.32);tone(base*1.5,dur*.30,'sine',.045,1.015,.08);tone(base*2.05,.22,'triangle',.065,1.20,Math.max(.14,dur-.40));noise(.07,.025,900,Math.max(.12,dur-.45),7000);}
    },
    defeatTransition(){tone(300,.23,'triangle',.06,.58);tone(180,.50,'sine',.065,.38,.12);noise(.34,.05,70,.18,1800);},
    feed(){tone(285,.08,'triangle',.04,1.13);tone(430,.15,'sine',.035,1.02,.06);},
  };
  return api;
})();

if(els.speedBtn){
  els.speedBtn.addEventListener('click',()=>{
    gameSpeed = gameSpeed===1 ? 3 : 1;
    if(typeof syncTokenMoveDuration==='function') syncTokenMoveDuration(); // 배속에 맞춰 토큰 이동 시간 재조정
    els.speedBtn.classList.toggle('active',gameSpeed===3);
    if(els.speedIcon) els.speedIcon.textContent = gameSpeed===3 ? '3×' : '1×';
    if(typeof addLog==='function' && state && state.running){
      addLog(`<span class="hl-gold">⏩ 게임 속도 ${gameSpeed}배속</span>`);
    }
  });
}
