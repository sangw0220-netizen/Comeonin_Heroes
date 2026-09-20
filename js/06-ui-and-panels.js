"use strict";
function monsterBuildInfoHtml(m){const a=monsterBuildAffinity(m);if(!a)return `<div class="panel-hint" style="margin-top:6px;color:#8c8c9e;">🧬 현재 빌드와 아직 연결되지 않은 몬스터입니다.</div>`;const meta=BUILD_TAG_META[a.tag]||{icon:'◆',name:a.tag};const st=buildStageInfo(a.tag);const mult=monsterBuildCombatMultiplier(m);const cd=monsterBuildSkillCooldownMul(m);return `<div class="panel-hint" style="margin-top:6px;border:1px solid rgba(224,182,74,.18);"><b style="color:var(--gold)">${meta.icon} 빌드 각성</b><br>${meta.name} · ${st.stage}/5 · <b>${st.name}</b><br><span style="color:#c9b9ff">Lv.${m.tier>=10?'10':m.tier>=5?'5':'1'} 연계 전투 보정 ×${mult.toFixed(2)}</span>${cd<1?`<br><span style="color:#8de0b5">스킬 재사용 ${Math.round((1-cd)*100)}% 감소</span>`:''}</div>`;}
function renderPanel(){
  // 매 200ms마다 패널 전체를 재생성하면 모바일 native scroll의 관성이 끊깁니다.
  // 같은 종류의 상점/선택 리스트가 이미 존재하면 카드 DOM은 유지하고 상태만 동기화합니다.
  const oldShop=els.panelBox.querySelector('.shop-list');
  const sel=state&&state.selected;
  const shopKey=currentShopContextKey(sel);
  // 몬스터 메뉴↔장애물 메뉴처럼 컨텍스트 종류 자체가 바뀌면 반드시 새로 그립니다.
  // (예전에는 둘 다 '상점 목록'으로만 취급되어 몬스터→장애물 전환 시 DOM이 갱신되지 않는 버그가 있었습니다.)
  if(oldShop && shopKey && oldShop.dataset.shopKey===shopKey){
    syncShopListState(oldShop);
    return;
  }
  if(panelPointerActive) return;
  renderPanelInner();
}

function syncShopListState(list){
  if(!state||!list) return;
  const capFull=state.monsters.length>=(state.monsterCap||MONSTER_CAP_START);
  const capHint=list.parentElement&&list.parentElement.querySelector('#monsterCapHint');
  if(capHint) capHint.style.display=capFull?'':'none';
  list.querySelectorAll('.shop-item[data-place]').forEach(item=>{
    const id=item.dataset.place;
    let cost=0, isMonster=false;
    if(id==='__wall__') cost=WALL_BUILD_COST;
    else if(id==='__wall_dig__') cost=WALL_DIG_COST;
    else if(id==='__clear__') cost=0;
    else {
      const mt=MONSTER_TYPES.find(x=>x.id===id);
      const ob=OBSTACLE_TYPES.find(x=>x.id===id);
      isMonster=!!mt;
      cost=mt?monsterCost(mt):(ob?ob.cost:0);
    }
    const disabled=cost>state.gold || (isMonster && capFull);
    item.classList.toggle('disabled',disabled);
    // 카드가 처음 렌더링된 뒤에도 같은 몬스터 반복 소환 가격이 즉시 표시되도록 갱신합니다.
    // 기존 syncShopListState는 비활성/선택 상태만 갱신해서 가격표가 이전 값으로 남는 문제가 있었습니다.
    if(isMonster){
      const costEl=item.querySelector('.si-cost');
      if(costEl) costEl.textContent=`${cost}G`;
    }
    const selected=(state.selectedMonsterType===id || state.selectedObstacleType===id);
    item.classList.toggle('selected',selected);
  });
}
function renderPanelInner(){
  const sel=state.selected;
  if(sel && sel.kind==='altar'){
    altarRender();
    return;
  }
  if(sel && sel.kind==='mawang'){
    const m=state.mawang, st=mawangCurrentStats(), xp=mawangXpProgress(), cmd=normalizeMonsterCommand(state.monsterCommand||mawangProfile.command);
    const cm=MONSTER_COMMAND_META[cmd]||MONSTER_COMMAND_META.defense;
    els.panelBox.innerHTML=`<h3>👑 마왕 · Lv.${mawangProfile.level}</h3>
      <div class="panel-hint"><b style="color:#fff">${Math.round(m.hp)}/${st.maxHp} HP</b> · ${Math.round(m.mana)}/${st.maxMana} MP</div>
      <div class="panel-hint">⚔️ 공격 ${st.atk} · 🛡️ 방어 ${st.def} · 💥 치명타 ${Math.round(st.crit*100)}%</div>
      <div class="panel-hint">✨ XP ${xp.current.toLocaleString()} / ${xp.next===0?'MAX':xp.next.toLocaleString()} · SP ${mawangProfile.skillPoints}</div>
      <div class="panel-hint">🎯 ${cm.name}<br><span style="color:#8f84a1">${cm.desc}</span></div>
      <div class="panel-actions"><button class="panel-action" id="openMawangGrowthBtn">👑 마왕의 성장 열기</button></div>`;
    els.panelBox.querySelector('#openMawangGrowthBtn')?.addEventListener('click',()=>{mawangSubTab='status';openMetaGrowth('mawang');});
    return;
  }
  if(!sel){
    const ev=evaluateDungeon(state);
    els.panelBox.innerHTML=`<h3>🏰 던전 평가</h3>
      <div class="panel-hint"><b style="color:var(--gold)">${ev.title}</b> · 현재 ${ev.score}점</div>
      <div class="panel-hint">구조 ${ev.ratings.layout} · 함정 ${ev.ratings.trap} · 방어 ${ev.ratings.defense} · 통제 ${ev.ratings.control}</div>
      <div class="panel-hint">방 ${ev.rooms} · 통로 ${ev.corridors} · 교차로 ${ev.junctions} · 막다른길 ${ev.deadends} · 장애물 ${ev.obstacleCount}</div>
      <div class="panel-hint">용사 대응: 발견 ${ev.seen} · 놓침 ${ev.missed} · 파괴 ${ev.broken} · 발동 ${ev.trigger}</div>
      ${buildSummaryHtml()}`;
    return;
  }
  if(sel.kind==='tool'){
    const info=TOOL_INFO[sel.tool];
    let html=`<h3>${info.icon} ${info.title}</h3><div class="panel-hint">${info.desc}</div>`;
    const locked = state.phase!=='build' && sel.tool!=='dig' && sel.tool!=='command';
    if(locked){
      html+=`<div class="panel-hint" style="margin-top:6px;color:var(--blood);">침공이 시작되어 더 이상 배치할 수 없습니다.</div>`;
      els.panelBox.innerHTML=html;
      return;
    }
    if(sel.tool==='command'){
      const command=normalizeMonsterCommand(state.monsterCommand);
      const defensiveCount=state.monsters.filter(isMonsterDefensiveType).length;
      const aggressiveCount=Math.max(0,state.monsters.length-defensiveCount);
      html+=`<div class="command-list">`;
      for(const [id,meta] of Object.entries(MONSTER_COMMAND_META)){
        const active=command===id;
        html+=`
          <button type="button" class="command-card ${active?'active':''}" data-command="${id}">
            <span class="cc-head">
              <span class="cc-icon">${meta.icon}</span>
              <span class="cc-name">${meta.name}</span>
              <span class="cc-state">${active?'현재 적용':''}</span>
            </span>
            <span class="cc-desc">${meta.desc}</span>
          </button>`;
      }
      html+=`</div>`;
      html+=`<div class="command-summary">현재 명령: <b style="color:var(--gold)">${MONSTER_COMMAND_META[command].icon} ${MONSTER_COMMAND_META[command].name}</b><br>전체 ${state.monsters.length}마리 · 수비형 ${defensiveCount} · 공격형 ${aggressiveCount}<br><span style="color:#77708d">중립 명령에서는 탱커·수호형·힐러가 수비형으로 분류됩니다.</span></div>`;
    } else if(sel.tool==='monster'){
      const capFull=state.monsters.length>=(state.monsterCap||MONSTER_CAP_START);
      html+=`<div class="shop-list" data-shop-key="tool:monster">`;
      const GRADE_ORDER={D:0,C:1,B:2,A:3,S:4,SS:5};
      const sortedMonsterTypes=getAvailableMonsterTypes().slice().sort((a,b)=>{
        const ga=GRADE_ORDER[a.grade]??0, gb=GRADE_ORDER[b.grade]??0;
        if(ga!==gb) return ga-gb;
        return monsterCost(a)-monsterCost(b);
      });
      sortedMonsterTypes.forEach((mt)=>{
        const eCost=monsterCost(mt);
        const disabled=state.gold<eCost || capFull;
        const isSel=state.selectedMonsterType===mt.id;
        const gradeCls=mt.grade&&mt.grade!=='D'?`grade-${mt.grade.toLowerCase()}`:'';
        const gradeBadge=mt.grade?`<div class="si-grade g-${mt.grade.toLowerCase()}">${mt.grade}</div>`:'';
        html+=`
          <div class="shop-item ${gradeCls} ${disabled?'disabled':''} ${isSel?'selected':''}" data-place="${mt.id}">
            ${gradeBadge}
            <img class="si-icon" src="${SPRITE_DATA[mt.id]}">
            <div class="si-info"><b>${mt.name}</b><br><span class="si-desc">${mt.desc}</span>${roleBadgesHtml(mt)}</div>
            <div class="si-cost">${eCost}G</div>
          </div>`;
      });
      html+=`</div>`;
      html+=`<div class="panel-hint" id="monsterCapHint" style="margin-top:6px;color:var(--blood);${capFull?'':'display:none;'}">몬스터 생성 제한(${state.monsterCap||MONSTER_CAP_START}마리)에 도달했습니다. 웨이브 클리어 카드로 제한을 늘리거나 몬스터를 판매하세요.</div>`;
      if(state.selectedMonsterType){
        const mt=MONSTER_TYPES.find(x=>x.id===state.selectedMonsterType);
        html+=`<div class="panel-hint" style="margin-top:6px;"><b style="color:var(--gold)">${mt.name}</b> 선택됨 — 핵 주변에 자동 소환됩니다.</div>`;
      }
      if((state.monsterSummonTickets||0)>0){
        html+=`<div class="panel-hint" style="margin-top:7px;"><b style="color:var(--gold)">🎫 몬스터 소환권 ${state.monsterSummonTickets}장</b> — 아래 버튼으로 원하는 일반/해금 몬스터 1종을 무료 소환할 수 있습니다.</div>`;
        html+=`<button class="action-btn" id="useMonsterTicketBtn">🎫 소환권 사용 · 랜덤 몬스터 1마리</button>`;
      }
    } else if(sel.tool==='obstacle'){
      html+=`<div class="shop-list" data-shop-key="tool:obstacle">`;
      {
        const isSel=state.selectedObstacleType==='__wall_dig__';
        html+=`
          <div class="shop-item ${isSel?'selected':''}" data-place="__wall_dig__">
            <div class="si-icon si-emoji">⛏️</div>
            <div class="si-info"><b>벽 파기</b><br><span class="si-desc">기존 암벽과 생성한 벽을 5G를 사용해 파내 다시 통로로 엽니다.</span></div>
            <div class="si-cost">${WALL_DIG_COST}G</div>
          </div>`;
      }
      {
        const disabled=state.gold<WALL_BUILD_COST;
        const isSel=state.selectedObstacleType==='__wall__';
        html+=`
          <div class="shop-item wall-builder ${disabled?'disabled':''} ${isSel?'selected':''}" data-place="__wall__">
            <div class="si-icon si-emoji">🧱</div>
            <div class="si-info"><b>벽 생성</b><br><span class="si-desc">개척된 빈 바닥에 새로운 암벽을 세웁니다. 일반 장애물과 달리 바닥에 설치합니다.</span></div>
            <div class="si-cost">${WALL_BUILD_COST}G</div>
          </div>`;
      }
      OBSTACLE_TYPES.forEach((ob)=>{
        const placeCost=obstaclePlaceCost(ob);
        const disabled=state.gold<placeCost;
        const isSel=state.selectedObstacleType===ob.id;
        html+=`
          <div class="shop-item ${disabled?'disabled':''} ${isSel?'selected':''}" data-place="${ob.id}">
            <img class="si-icon" src="${ob.sprite}" alt="${ob.name}">
            <div class="si-info"><b>${ob.name}</b><br><span class="si-desc">${ob.desc}</span></div>
            <div class="si-cost">${placeCost}G${placeCost<ob.cost?` <span style="text-decoration:line-through;opacity:.55;font-size:.85em;">${ob.cost}G</span>`:''}</div>
          </div>`;
      });
      {
        const isSel=state.selectedObstacleType==='__clear__';
        html+=`
          <div class="shop-item ${isSel?'selected':''}" data-place="__clear__">
            <div class="si-icon si-emoji">🧹</div>
            <div class="si-info"><b>장애물 제거</b><br><span class="si-desc">설치한 2×2 장애물을 제거해 원래의 빈 바닥으로 되돌립니다.</span></div>
            <div class="si-cost">무료</div>
          </div>`;
      }
      html+=`</div>`;
      html+=`<div class="panel-hint" style="margin-top:6px;font-size:9px;">벽 파기는 <b>5G</b>로 <b>기존 암벽 또는 생성한 벽</b>을 제거 · 벽 생성은 <b>개척된 빈 바닥</b>에 설치 · 일반 장애물은 <b>2×2 빈 바닥</b>에 설치합니다.</div>`;
      if(state.selectedObstacleType==='__wall_dig__'){
        html+=`<div class="panel-hint" style="margin-top:6px;"><b style="color:var(--gold)">벽 파기</b> 선택됨 — <b>기존 암벽과 생성한 벽</b>을 ${WALL_DIG_COST}G로 파냅니다.</div>`;
      } else if(state.selectedObstacleType==='__wall__'){
        html+=`<div class="panel-hint" style="margin-top:6px;"><b style="color:var(--gold)">벽 생성</b> 선택됨 — <b>개척된 빈 바닥</b>을 탭하면 ${WALL_BUILD_COST}G를 사용해 암벽을 세웁니다. 용사의 진행 경로를 직접 설계할 수 있습니다.</div>`;
      } else if(state.selectedObstacleType==='__clear__'){
        html+=`<div class="panel-hint" style="margin-top:6px;"><b style="color:var(--gold)">장애물 제거</b> 선택됨 — 설치된 2×2 장애물을 탭해 제거하세요.</div>`;
      } else if(state.selectedObstacleType){
        const ob=OBSTACLE_TYPES.find(x=>x.id===state.selectedObstacleType);
        if(ob) html+=`<div class="panel-hint" style="margin-top:6px;"><b style="color:var(--gold)">${ob.name}</b> 선택됨 — <b>빈 바닥</b>을 탭해 설치하세요. 용사가 발견하면 공격해 부수거나, 못 보고 지나칠 수 있습니다.</div>`;
      }
    }
    els.panelBox.innerHTML=html;
    return;
  }
  if(sel.kind==='hero'){
    const h=state.heroes.find(x=>x.id===sel.id);
    if(!h){ state.selected=null; renderPanel(); return; }
    const ht=HERO_TYPES.find(x=>x.id===h.typeId) || {name:h.typeId,range:1};
    const skill=getHeroSkill(h);
    const hp=Math.max(0,Math.round(h.hp));
    const maxHp=Math.max(1,Math.round(h.maxHp));
    const hpPct=Math.max(0,Math.min(100,hp/maxHp*100));
    const stateText=h.fleeing?'후퇴 중':h.castingSkill?`시전 중 · ${h.castingSkill.name}`:h.coreFound?'핵 공격 중':'탐색 중';
    const skillText=skill?`${skill.icon} ${skill.name} · ${skill.cast.toFixed(1)}초 시전 · 재사용 ${skill.cooldown}초`:'아직 고유 스킬 미해금';
    const skillPanel=heroSkillsPanelHtml(h); // v54: 템플릿이 ${skillPanel}을 쓰는데 정의가 없어 영웅 정보 패널이 ReferenceError로 그려지지 않던 버그 수정
    els.panelBox.innerHTML=`
      <h3>🛡️ 영웅 정보</h3>
      <div class="monster-mini">
        <img class="mm-icon" src="${SPRITE_DATA[h.typeId]}">
        <div class="mm-stats">
          <b>${ht.name}${h.isBoss?' · 보스':(h.elite?' · 정예':'')}</b> · Lv.${h.level||1}<br>
          상태 <b>${stateText}</b><br>
          던전 대응 <b>${h.dungeonIntent||'핵으로 전진'}</b><br>
          HP <b>${hp}/${maxHp}</b> · 공격 <b>${Math.round(h.atk)}</b> · 방어 <b>${Math.round(h.def)}</b>
        </div>
      </div>
      <div class="barwrap" style="margin:5px 0 7px;"><div class="barfill hp" style="width:${hpPct}%"></div></div>
      <div class="panel-hint">🎯 사거리 ${ht.range||1} · 처치 ${h.heroKills||0}명 · 보상 ${h.reward}G</div>
      ${isCasterHero(h)?`<div class="panel-hint" style="margin-top:4px;">${CASTER_BASIC_SPELLS[h.typeId].icon} 기본 마법 <b>${CASTER_BASIC_SPELLS[h.typeId].name}</b> · 시전 ${CASTER_BASIC_SPELLS[h.typeId].cast.toFixed(1)}초 · 범위 ${spellAreaLabel(CASTER_BASIC_SPELLS[h.typeId].cast)}</div>`:''}
      ${ht.pierceTiles?`<div class="panel-hint" style="margin-top:4px;">🔱 <b>관통</b> — 대상 뒤 ${ht.pierceTiles}칸까지 늘어선 몬스터에게도 피해의 ${Math.round((ht.pierceDmgMul||.75)*100)}%</div>`:''}
      ${ht.knockbackChance?`<div class="panel-hint" style="margin-top:4px;">🛡️ 공격 시 <b>${Math.round(ht.knockbackChance*100)}%</b> 확률로 몬스터를 뒤로 밀쳐냅니다</div>`:''}
      ${skillPanel}
      ${h.castingSkill?`<div class="panel-hint" style="margin-top:6px;color:var(--gold);">${h.castingSkill.icon} ${h.castingSkill.name} 캐스팅 중…</div>`:''}
    `;
    return;
  }
  if(sel.kind==='monster'){
    const m=state.monsters.find(x=>x.id===sel.id);
    if(!m){ state.selected=null; renderPanel(); return; }
    const base=MONSTER_TYPES.find(x=>x.id===m.typeId);
    const specialText={ranged:'🎯 사거리 '+(base.range||1),rage:'🔥 체력 50% 이하에서 공격력 +45%',guard:'🛡️ 높은 방어력의 중장형',execute:'☠️ 용사 HP 30% 이하에서 공격력 +60%',splash:'🔥 주변 용사에게 광역 피해',frost:'❄️ 높은 방어력과 체력의 빙결형',lifesteal:'💀 입힌 피해의 35% 회복 · 근처 아군을 주기적으로 치유',tank:'🪨 매우 높은 체력',curse:'☠️ 적중 시 용사 공격력을 일시적으로 감소'}[base.special]||'';
    const debuffText=(base.debuffOnHit && base.special!=='curse')?'☠️ 적중 시 용사 공격력을 일시적으로 감소':'';
    const roleInfo=ROLE_INFO[base.role];
    const role2Info=base.role2?ROLE_INFO[base.role2]:null;
    const skillPanel=monsterSkillsPanelHtml(m)+monsterBuildInfoHtml(m);
    const evolveCost=Math.round(monsterCost(base)*3*Math.pow(1.45,m.tier));
    const kills=m.kills||0;
    const killsToNext=KILLS_PER_LEVEL-(kills%KILLS_PER_LEVEL);
    let dots='';
    for(let i=1;i<=MAX_TIER;i++) dots+=`<span class="${i<=m.tier?'on':''}"></span>`;
    els.panelBox.innerHTML=`
      <h3>선택된 대상</h3>
      <div class="monster-mini">
        <img class="mm-icon" src="${SPRITE_DATA[m.typeId]}">
        <div class="mm-stats">
          <b>${base.name}</b> · ${m.tier}단계 ${roleBadgesHtml(base)}<br>
          HP ${Math.round(m.hp)}/${m.maxHp} · 공격 ${m.atk} · 방어 ${m.def}
        </div>
      </div>
      <div class="tier-track">${dots}</div>
      <div class="panel-hint">⚔️ 처치 ${kills}마리${m.tier<MAX_TIER?` · 다음 자동 강화까지 ${killsToNext}킬`:' · 최대 단계'}</div>
      <div class="panel-hint"><b style="color:var(--gold)">🏛️ 현재 위치:</b> ${dungeonZoneLabel(dungeonZoneAt(m.r,m.c))} · 이 공간은 던전 구조 분석에 사용됩니다.</div>
      <div class="panel-hint">뚫린 바닥을 따라 스스로 이동하며 순찰합니다. 용사를 처치할수록 자동으로 강해져요. 수호 석상·수호 석상 근처에서는 버프를 받아요.${roleInfo?'<br><b style="color:'+roleInfo.color+'">'+roleInfo.icon+' '+roleInfo.name+'</b> — '+roleInfo.desc:''}${role2Info?'<br><b style="color:'+role2Info.color+'">'+role2Info.icon+' '+role2Info.name+'</b> — '+role2Info.desc:''}${specialText?'<br>'+specialText:''}${debuffText?'<br>'+debuffText:''}${m.castingSkill?'<br><b style="color:#ffb45c">'+m.castingSkill.icon+' 시전 중...</b>':''}</div>
      ${skillPanel}
      ${m.tier<MAX_TIER
        ? `<button class="action-btn" id="evolveBtn" ${state.gold<evolveCost?'disabled':''}>✨ 강화 (골드 ${evolveCost})</button>`
        : `<div class="panel-hint" style="margin-top:8px;">최대 10레벨에 도달했습니다.</div>`}
      <button class="action-btn sell" id="sellBtn">💰 판매 (골드 +${Math.floor(m.invested*0.5)})</button>
    `;
    const evolveBtn=document.getElementById('evolveBtn');
    if(evolveBtn) evolveBtn.addEventListener('click',()=>{ Sound.level(); evolveMonster(m.id); renderUI(); });
    document.getElementById('sellBtn').addEventListener('click',()=>{ Sound.ui(); sellMonster(m.id); renderUI(); });
    return;
  }
  const {r,c}=sel;
  const t=state.grid[r][c];
  const zone=dungeonZoneAt(r,c);
  const zoneExplain={room:'넓은 공간 · 용사 AI가 진입 위험과 전투 공간을 판단합니다.',corridor:'좁은 통로 · 용사 AI가 위험 구간과 우회 여부를 판단합니다.',junction:'교차 지점 · 여러 경로를 비교할 수 있습니다.',corner:'코너 · 시야가 바뀌는 지점입니다.',deadend:'막다른 길 · 회피·후퇴가 어려운 공간입니다.',entrance:'침입구 · 용사 진입 시작점입니다.',core:'핵실 · 최종 목표 공간입니다.',isolated:'고립된 바닥',rock:'암벽'};
  let html='<h3>선택된 대상</h3>';
  if(zone!=='rock') html+=`<div class="panel-hint" style="margin-top:6px;"><b style="color:var(--gold)">🏛️ 공간 구조</b> ${dungeonZoneLabel(zone)}<br><span class="muted">${zoneExplain[zone]||''}</span></div>`;
  if(t.type==='core'){
    html+=`<div class="panel-hint"><b style="color:var(--gold)">상태:</b> 활성화 · HP ${Math.ceil(state.throneHP)}/${state.maxThroneHP}</div>`;
    html+=`<div class="panel-hint">마력의 핵 — 던전의 심장부입니다. 용사가 인접하면 타격 1회당 내구도가 1씩 닳습니다.</div>`;
  } else if(t.isEntrance && t.type==='floor'){
    html+=`<div class="panel-hint"><b style="color:var(--blood)">상태:</b> 침입구 · 용사 출입 가능</div>`;
    html+=`<div class="panel-hint">용사들이 벽을 뚫고 들어온 입구입니다. 이곳으로 이어지는 길목을 몬스터로 지키세요.</div>`;
  } else if(t.obstacle){
    const ob=OBSTACLE_TYPES.find(o=>o.id===t.obstacle);
    const lv=obstacleLevel(t), range=obstacleRange(ob?.id,t), upCost=obstacleUpgradeCost(ob,lv);
    const canUp=state.phase==='build'&&lv<OBSTACLE_LEVEL_MAX&&state.gold>=upCost;
    html+=`<div class="panel-hint"><b style="color:var(--gold)">상태:</b> ${ob?ob.name:'장애물'} · <b>Lv.${lv}</b> · 범위 ${range}칸</div>`;
    html+=`<div class="panel-hint">${ob?`<b>${ob.icon} ${ob.name}</b><br>${ob.desc}<br><b style="color:var(--gold)">특수 능력:</b> ${obstacleSpecialText(ob.id,lv)}`:'장애물입니다.'}<br>용사는 발견하면 공격해 부술 수 있으며, 발견하지 못하면 그대로 통과할 수 있습니다.</div>`;
    if(ob && lv<OBSTACLE_LEVEL_MAX){
      html+=`<button class="action-btn" id="upgradeObstacleBtn" ${canUp?'':'disabled'}>✨ 장애물 강화 → Lv.${lv+1} · ${upCost}G</button>`;
      html+=`<div class="panel-hint" style="margin-top:4px;">Lv.5: 상급 능력 해금 · Lv.10: 최종 능력 해금 · 범위는 Lv.5/10에서 증가합니다.</div>`;
    } else if(ob){ html+=`<div class="panel-hint" style="margin-top:7px;color:var(--gold);">🏆 최대 Lv.10 · ${obstacleLevelName(lv)} 장애물</div>`; }
    if(ob){
      setTimeout(()=>{ const btn=document.getElementById('upgradeObstacleBtn'); if(btn) btn.onclick=()=>{ upgradeObstacle(r,c); renderUI(); }; },0);
    }
  } else if(t.type==='rock'){
    const diggable=isDiggable(r,c);
    html+=`<div class="panel-hint"><b style="color:var(--gold)">상태:</b> 미개척 암벽 · ${diggable?'현재 굴착 가능':'현재 굴착 불가'}</div>`;
    html+=`<div class="panel-hint">${t.playerWall?'플레이어가 건설한 암벽입니다. 필요하면 파기로 다시 통로로 바꿀 수 있습니다.':(diggable?'이 암벽을 파면 던전 통로가 한 칸 확장됩니다.':'인접한 던전 바닥이 없어 아직 팔 수 없습니다. 먼저 주변을 개척하세요.')}</div>`;
  } else if(t.obstacle){
    const ob=OBSTACLE_TYPES.find(o=>o.id===t.obstacle);
    if(ob){
      html+=`<div class="panel-hint"><b style="color:var(--gold)">상태:</b> ${ob.name} 설치됨 · 종류 ${ob.kind}</div>`;
      html+=`<div class="panel-hint"><b>${ob.icon} ${ob.name}</b><br>${ob.desc}</div>`;
    } else html+=`<div class="panel-hint">상태: 알 수 없는 장애물</div>`;
  } else {
    html+=`<div class="panel-hint"><b style="color:var(--green)">상태:</b> 개척된 빈 바닥</div>`;
    html+=`<div class="panel-hint">현재는 비어 있는 바닥입니다. 몬스터를 소환하려면 하단의 <b>👾 몬스터</b> 메뉴에서 원하는 몬스터 카드를 선택하세요.</div>`;
  }
  els.panelBox.innerHTML=html;
}

let dragSuppressClick=false;
let shopDragState=null;
let shopClickGuardUntil=0;
let pressedShopTypeId=null;
let pressedShopMoved=false;
let pressedShopPointerId=null;

// 하단 카드 입력을 한 곳에서 처리합니다.
// 핵심: 모바일에서는 click 대신 pointerup에서 직접 처리하여
// 가로 스크롤용 pointer 이벤트와 클릭 이벤트가 서로 충돌하지 않게 합니다.
function activateShopItem(item){
  if(!item || !state || item.classList.contains('disabled')) return false;

  const typeId=item.dataset.place;
  if(!typeId) return false;

  if(state.selected&&state.selected.kind==='tool'&&state.selected.tool==='obstacle'){
    // 장애물 카드 선택은 전체 renderUI()를 다시 돌리지 않습니다.
    // 카드 클릭 중 전체 UI/맵/사거리까지 재렌더링하면 입력 이벤트와 겹쳐
    // 브라우저에서 게임이 멈춘 것처럼 보일 수 있으므로 필요한 상태만 갱신합니다.
    state.selectedObstacleType=typeId;
    state.selected={kind:'tool',tool:'obstacle'};
    state._panelDirty=true;
    state._mapDirty=true;

    // 현재 장애물 목록의 선택 표시만 즉시 갱신합니다.
    const list=item.closest('.shop-list');
    if(list){
      list.querySelectorAll('.shop-item[data-place]').forEach(card=>{
        card.classList.toggle('selected',card.dataset.place===typeId);
      });
    }
    return true;
  }

  if(state.selected&&state.selected.kind==='tool'&&state.selected.tool==='monster'){
    const ok=spawnMonsterFromList(typeId);
    renderUI();
    return ok;
  }

  if(state.selected&&state.selected.kind==='tile'){
    const r=state.selected.r,c=state.selected.c,t=state.grid[r][c];
    if(t&&t.type==='floor'&&!t.isEntrance&&!t.obstacle&&!monsterAt(r,c)){
      const before=state.monsterSeq;
      placeMonster(r,c,typeId);
      if(state.monsterSeq===before) return false;
      state.selected={kind:'monster',id:before};
      renderUI();
      return true;
    }
  }
  return false;
}

// 하단 몬스터/장애물 카드의 "탭 = 선택"과 "좌우 드래그 = 스크롤"을 분리합니다.
function beginShopDrag(e){
  const list=e.target.closest('.shop-list');
  if(!list || !els.panelBox.contains(list)) return;
  if(list.scrollWidth<=list.clientWidth) return;

  // 마우스의 경우에만 직접 가로 드래그를 구현합니다.
  // 터치/펜은 CSS의 touch-action:pan-x에 맡겨 native scrolling을 사용합니다.
  if(e.pointerType!=='mouse') return;

  const item=e.target.closest('.shop-item[data-place]');
  if(item && !item.classList.contains('disabled')) panelPointerActive=true;

  try{ list.setPointerCapture(e.pointerId); }catch(_){ }
  shopDragState={
    list,
    pointerId:e.pointerId,
    startX:e.clientX,
    startScrollLeft:list.scrollLeft,
    moved:false,
    pressedItem:item || null
  };
  dragSuppressClick=false;
  list.style.cursor='grabbing';
}

function moveShopDrag(e){
  const d=shopDragState;
  if(!d || d.pointerId!==e.pointerId) return;

  const dx=e.clientX-d.startX;
  if(Math.abs(dx)>6) d.moved=true;

  if(d.moved){
    d.list.scrollLeft=d.startScrollLeft-dx;
    dragSuppressClick=true;
    try{ d.list.setPointerCapture(e.pointerId); }catch(_){ }
    e.preventDefault();
  }
}

function endShopDrag(e){
  const d=shopDragState;
  if(!d || (e.pointerId!=null && d.pointerId!==e.pointerId)) return null;

  d.list.style.cursor='grab';
  shopDragState=null;
  return d;
}

els.panelBox.addEventListener('pointerdown',(e)=>{
  const item=e.target.closest('.shop-item[data-place]');
  if(item && !item.classList.contains('disabled') && e.pointerType!=='mouse'){
    pressedShopTypeId=String(item.dataset.place||'');
    pressedShopMoved=false;
    pressedShopPointerId=e.pointerId;
    item.dataset.pointerPressed='1';
    item.dataset.pointerStartX=String(e.clientX);
    item.dataset.pointerStartY=String(e.clientY);
  }
  beginShopDrag(e);
}, {passive:false});

els.panelBox.addEventListener('pointermove',(e)=>{
  const item=e.target.closest('.shop-item[data-place]');
  if(pressedShopPointerId===e.pointerId && e.pointerType!=='mouse' && pressedShopTypeId){
    const sx=Number(item?.dataset.pointerStartX||e.clientX);
    const sy=Number(item?.dataset.pointerStartY||e.clientY);
    if(Math.hypot(e.clientX-sx,e.clientY-sy)>8) pressedShopMoved=true;
  }
  moveShopDrag(e);
}, {passive:false});

els.panelBox.addEventListener('pointerup',(e)=>{
  const drag=endShopDrag(e);
  if(drag){
    // 마우스 드래그가 아닌 단순 클릭은 여기서 직접 처리합니다.
    if(!drag.moved){
      // pointer capture가 걸려 있으면 pointerup의 e.target은
      // 카드가 아니라 .shop-list가 될 수 있습니다.
      // 절대로 querySelector()로 첫 번째 카드(슬라임)를 대체 선택하지 않습니다.
      const item=drag.pressedItem;
      if(item && item.isConnected && !item.classList.contains('disabled')){
        activateShopItem(item);
        panelPointerActive=false;
        shopClickGuardUntil=performance.now()+450;
      }
    }
    if(!drag.moved) dragSuppressClick=false;
    return;
  }

  // 터치/펜: pointerup에서 직접 카드 동작 실행
  if(e.pointerType!=='mouse' && pressedShopPointerId===e.pointerId && pressedShopTypeId){
    const typeId=pressedShopTypeId;
    const moved=pressedShopMoved;
    pressedShopTypeId=null; pressedShopMoved=false; pressedShopPointerId=null;
    const itemNow=Array.from(els.panelBox.querySelectorAll('.shop-item[data-place]'))
      .find(x=>x.dataset.place===typeId);
    if(!moved && itemNow && !itemNow.classList.contains('disabled')){
      e.preventDefault(); e.stopPropagation();
      activateShopItem(itemNow);
      panelPointerActive=false;
      shopClickGuardUntil=performance.now()+450;
    }
  }
}, {passive:false});

els.panelBox.addEventListener('pointercancel',(e)=>{
  endShopDrag(e);
  panelPointerActive=false;
  dragSuppressClick=false;
});

els.panelBox.addEventListener('lostpointercapture',()=>{
  if(shopDragState?.list) shopDragState.list.style.cursor='grab';
  shopDragState=null;
});

els.panelBox.addEventListener('wheel',(e)=>{
  const list=e.target.closest('.shop-list');
  if(!list || list.scrollWidth<=list.clientWidth) return;

  const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if(delta===0) return;
  list.scrollLeft += delta;
  e.preventDefault();
},{passive:false});

// 몬스터 명령 카드는 상점 카드와 별도 입력으로 처리합니다.
els.panelBox.addEventListener('click',(e)=>{
  const commandCard=e.target.closest('.command-card[data-command]');
  if(!commandCard || !state) return;
  e.preventDefault();
  e.stopPropagation();
  setMonsterCommand(commandCard.dataset.command);
});

// 키보드/접근성용 click도 유지합니다.
// pointerup으로 이미 처리된 입력의 synthetic click만 차단합니다.
els.panelBox.addEventListener('click',(e)=>{
  if(dragSuppressClick){
    dragSuppressClick=false;
    panelPointerActive=false;
    return;
  }
  if(performance.now()<shopClickGuardUntil) return;

  const item=e.target.closest('.shop-item[data-place]');
  if(!item||!state||item.classList.contains('disabled')){
    panelPointerActive=false;
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  panelPointerActive=false;
  activateShopItem(item);
});

const VILLAGE_SPRITES={
  barracks:'assets/images/img_087_cb183623b4.png',
  blacksmith:'assets/images/img_088_f6f67316db.png',
  castle:'assets/images/img_089_6a30287639.png',
  church:'assets/images/img_090_64f0e0c4ed.png',
  granary:'assets/images/img_091_630eebe615.png',
  house:'assets/images/img_092_153683c7c5.png',
  inn:'assets/images/img_093_2b71c0543f.png',
  lumber:'assets/images/img_094_6a0845b229.png',
  magelab:'assets/images/img_095_082680dbe0.png',
  mine:'assets/images/img_096_9a282fed9d.png',
  shop:'assets/images/img_097_b59cc60efc.png',
  stable:'assets/images/img_098_0b96ea9c3f.png',
  training:'assets/images/img_099_ba97d8e169.png',
};
/* ==================================================================
   v38 · 마을 습격 이벤트 (Village Raid)
   10 / 20 / 30 ... 웨이브를 클리어하고 카드를 고른 뒤,
   마왕 + 현재 스폰된 몬스터의 절반이 던전을 떠나 용사들의 마을을 습격합니다.
   ================================================================== */

/* v38.7 · 마을 맵 크기는 습격 단계에 따라 달라집니다.
   첫 습격(10웨이브)은 좁은 마을에서 시작해, 단계가 오를수록 넓어집니다.
   startVillageRaid()에서 generateVillageMap() 직전에 villageGridSize()로 갱신합니다. */
let VILLAGE_GRID = 15;                   // 현재 마을 맵 크기 (v49: 15로 고정)
const VILLAGE_GRID_MIN = 15;             // 첫 습격(10웨이브) 맵 크기
const VILLAGE_GRID_MAX = 15;             // v49: 후반 습격도 더 이상 커지지 않고 15로 고정
const VILLAGE_CASTLE_SIZE = 4;           // 성은 4x4
const VILLAGE_BUILD_SIZE = 2;            // 마을 건물은 2x2
const VILLAGE_TICK_ATTACK = 0.55;        // 구조물/블럭 공격 간격(초)

/* v38.6 · 마을 습격 연출/난이도 튜닝 상수 (여기 숫자만 바꾸면 전체가 조정됩니다) */
const VILLAGE_PREP_SEC      = 10;        // 카드 선택 후 → 마을 습격 시작까지의 준비 시간(초). 이 동안 몬스터 생성 가능
const VILLAGE_INTRO_SEC     = 3.0;       // 마을 도착 연출 동안 전투를 멈추는 시간(초)
const VILLAGE_OUTRO_SEC     = 5;         // 습격 종료 → 던전 복귀까지의 결과 연출 시간(초)
const VILLAGE_RETURN_HOLD_MS= 1600;      // 던전 복귀 직후 화면이 안정될 때까지 준비시간을 멈추는 시간(ms)
const VILLAGE_RETURN_BUILD_SEC= 80;       // 마을 습격 복귀 후 → 다음 웨이브 시작까지의 준비 시간(초)
const VILLAGE_BUILDING_SOUL= 2;            // 마을 건물 1채 파괴 시 판 종료 정산에 추가되는 영혼
const MIDWAVE_DIFFICULTY_MUL= Math.SQRT1_2; // 11~20웨이브 전투 압력을 약 50% 수준으로 완화
const VILLAGE_SPAWN_SLOW_MUL= 3.4;       // 건물의 용사 생산 간격 배수(클수록 아주 느리게 스폰)
const VILLAGE_SPAWN_MIN_SEC = 26;        // 건물 1채의 최소 용사 생산 간격(초)
const VILLAGE_FIRST_SPAWN_SEC = 20;      // 습격 시작 후 첫 용사가 나오기까지의 최소 대기(초)

/* v38.7 · 마을 습격 밸런스 개편
   (1) "건물 전부 + 성"이라는 전부 아니면 무 조건이 너무 가혹해서,
       목표 건물 수(quota)만 채우면 성이 열리고, 시간이 다 돼도 목표를 채웠으면 성공으로 칩니다.
   (2) 마을에서 쓰러진 원정군은 완전히 소멸하지 않고 일정 비율이 던전으로 퇴각·귀환합니다.
       그래야 습격 직후 11웨이브가 무방비 상태가 되지 않습니다. */
const VILLAGE_HERO_HP_MUL   = 0.74;      // 마을 용사 체력 배수(던전 용사 대비)
const VILLAGE_HERO_ATK_MUL  = 0.82;      // 마을 용사 공격력 배수
const VILLAGE_REVIVE_GREAT  = 1.00;      // 성까지 파괴(대성공) 시 전사한 원정군 귀환 비율
const VILLAGE_REVIVE_GOOD   = 0.70;      // 목표 건물 달성(성공) 시 귀환 비율
const VILLAGE_REVIVE_FAIL   = 0.45;      // 습격 실패 시 귀환 비율
const VILLAGE_REVIVE_HP     = 0.38;      // 귀환한 원정군의 복귀 시 체력 비율

const VILLAGE_BUILDING_DEFS = [
  {id:'house',     name:'주택',       icon:'🏠', hpMul:0.80, spawnSec:15, gold:60,  heroes:['swordsman','archer']},
  {id:'inn',       name:'여관',       icon:'🍺', hpMul:0.90, spawnSec:14, gold:70,  heroes:['swordsman','berserker','bard']},
  {id:'blacksmith',name:'대장간',     icon:'⚒️', hpMul:1.30, spawnSec:13, gold:95,  heroes:['shieldbearer','dual_wielder','swordsaint']},
  {id:'shop',      name:'상점',       icon:'🛒', hpMul:0.70, spawnSec:16, gold:110, heroes:['hunter','gunslinger']},
  {id:'church',    name:'교회',       icon:'⛪', hpMul:1.10, spawnSec:12, gold:90,  heroes:['priest','miko','paladin']},
  {id:'granary',   name:'곡물창고',   icon:'🌾', hpMul:0.80, spawnSec:17, gold:75,  heroes:['miner','swordsman']},
  {id:'stable',    name:'마구간',     icon:'🐎', hpMul:0.90, spawnSec:12, gold:85,  heroes:['dragoon','lancer']},
  {id:'magelab',   name:'마법 연구소',icon:'🔮', hpMul:1.00, spawnSec:13, gold:120, heroes:['mage','archmage','ice_mage']},
  {id:'lumber',    name:'목재소',     icon:'🪵', hpMul:0.85, spawnSec:16, gold:70,  heroes:['miner','martial_artist']},
  {id:'mine',      name:'광산',       icon:'⛏️', hpMul:1.00, spawnSec:16, gold:90,  heroes:['miner','shieldbearer']},
  {id:'barracks',  name:'병영',       icon:'🛡️', hpMul:1.50, spawnSec:10, gold:130, heroes:['swordsman','paladin','dark_knight','ironclad']},
];

const VILLAGE_TRAP_DEFS = [
  {id:'v_spike', name:'쇠못 함정',   icon:'🔩', color:'#c9c4d8', cd:5.5},
  {id:'v_fire',  name:'화염 항아리', icon:'🔥', color:'#ff8b5c', cd:7.0},
  {id:'v_net',   name:'포획망',      icon:'🕸️', color:'#9fe8ff', cd:6.0},
  {id:'v_bell',  name:'경종',        icon:'🔔', color:'#ffe08a', cd:9.0},
];

function villageStage(){ return Math.max(1, Math.floor((state?.wave||10)/10)); }
/* v38.7 · 첫 습격은 좁은 마을(16×16)에서 시작해 단계마다 2칸씩 넓어집니다. */
function villageGridSize(){
  return Math.max(VILLAGE_GRID_MIN, Math.min(VILLAGE_GRID_MAX, VILLAGE_GRID_MIN + (villageStage()-1)*2));
}
/* v38.7 · 건물 수를 줄여 첫 습격의 목표량을 크게 낮춥니다. (stage1: 4채) */
function villageBuildingCount(){ return Math.min(VILLAGE_BUILDING_DEFS.length, 3 + villageStage()); }
/* v38.7 · 성을 열기 위해 부숴야 하는 "목표 건물 수".
   전부 부술 필요가 없어졌고, 시간이 다 돼도 이 수치를 채웠으면 습격 성공으로 인정합니다. */
function villageBuildingQuota(total){
  const t = Math.max(1, total||1);
  const ratio = Math.min(0.85, 0.6 + (villageStage()-1)*0.1);
  return Math.max(1, Math.min(t, Math.ceil(t*ratio)));
}
function villageBuildingMaxHp(def){
  const w = state?.wave || 10;
  return Math.round((700 + w*90) * (def.hpMul||1));
}
function villageCastleMaxHp(){
  const w = state?.wave || 10;
  return Math.round(2600 + w*300);
}
function villageBlockMaxHp(){
  const w = state?.wave || 10;
  return Math.round(35 + w*5);
}
function villageTrapDamage(){
  const w = state?.wave || 10;
  return Math.round(14 + w*2.4);
}
function villageHeroLevel(){ return Math.max(1, Math.min(99, Math.round((state?.wave||10)*0.85))); }
function villageTimeLimit(){ return 180 + villageStage()*25; }
function villageHeroCap(){ return 5 + villageStage()*2; }

/* v38.7 · 결과 등급별 원정군 귀환 비율 */
function villageReviveRatio(tier){
  if(tier==='great') return VILLAGE_REVIVE_GREAT;
  if(tier==='good')  return VILLAGE_REVIVE_GOOD;
  return VILLAGE_REVIVE_FAIL;
}

/* ---------------- 맵 생성 ---------------- */
function villageInBounds(r,c){ return r>=0 && r<VILLAGE_GRID && c>=0 && c<VILLAGE_GRID; }

function generateVillageMap(){
  const G=VILLAGE_GRID;
  const grid=[];
  const blockHp=villageBlockMaxHp();
  for(let r=0;r<G;r++){
    const row=[];
    for(let c=0;c<G;c++) row.push({type:'block', blockHp, blockMaxHp:blockHp});
    grid.push(row);
  }
  const carve=(r,c)=>{ if(villageInBounds(r,c) && grid[r][c].type==='block') grid[r][c]={type:'road'}; };

  // 중앙 성 + 광장
  const cr=Math.floor(G/2)-Math.floor(VILLAGE_CASTLE_SIZE/2); // 9
  const cc=cr;
  for(let r=cr-2;r<cr+VILLAGE_CASTLE_SIZE+2;r++)
    for(let c=cc-2;c<cc+VILLAGE_CASTLE_SIZE+2;c++) carve(r,c);
  const castle={
    r:cr, c:cc, size:VILLAGE_CASTLE_SIZE,
    hp:villageCastleMaxHp(), maxHp:villageCastleMaxHp(), destroyed:false
  };
  for(let r=cr;r<cr+VILLAGE_CASTLE_SIZE;r++)
    for(let c=cc;c<cc+VILLAGE_CASTLE_SIZE;c++)
      grid[r][c]={type:'castle', vcRootR:cr, vcRootC:cc};

  const centerR=cr+VILLAGE_CASTLE_SIZE/2-0.5, centerC=cc+VILLAGE_CASTLE_SIZE/2-0.5;

  // 건물 후보 슬롯 (성 광장과 겹치지 않게)
  const slots=[];
  for(let r=1;r<=G-3;r+=4){
    for(let c=1;c<=G-3;c+=4){
      const far=Math.max(Math.abs(r+0.5-centerR), Math.abs(c+0.5-centerC));
      if(far<5) continue;
      slots.push([r,c]);
    }
  }
  slots.sort(()=>Math.random()-0.5);

  const defs=VILLAGE_BUILDING_DEFS.slice().sort(()=>Math.random()-0.5).slice(0, villageBuildingCount());
  const buildings=[];
  for(let i=0;i<defs.length && i<slots.length;i++){
    const def=defs[i];
    const [br,bc]=slots[i];
    // 건물 주변 4x4 공터
    for(let r=br-1;r<=br+2;r++) for(let c=bc-1;c<=bc+2;c++) carve(r,c);
    const b={
      id:'vb'+i, defId:def.id, name:def.name, icon:def.icon, sprite:def.id,
      r:br, c:bc, size:VILLAGE_BUILD_SIZE,
      hp:villageBuildingMaxHp(def), maxHp:villageBuildingMaxHp(def),
      destroyed:false,
      // v38.6: 마을 습격에서 용사가 너무 빨리 쏟아지던 문제를 수정합니다.
      //        첫 생산까지 충분히 기다리고, 이후 생산 간격도 크게 늘립니다.
      spawnCd:VILLAGE_FIRST_SPAWN_SEC + Math.random()*def.spawnSec*0.8,
      spawnSec:Math.max(VILLAGE_SPAWN_MIN_SEC, def.spawnSec*VILLAGE_SPAWN_SLOW_MUL*(1-(villageStage()-1)*0.05)),
      heroes:def.heroes, gold:def.gold
    };
    for(let r=br;r<br+VILLAGE_BUILD_SIZE;r++)
      for(let c=bc;c<bc+VILLAGE_BUILD_SIZE;c++)
        grid[r][c]={type:'building', vbRootR:br, vbRootC:bc};
    buildings.push(b);
    // 성 광장까지 L자 도로
    let rr=br+1, ccx=bc+1;
    const tr=Math.round(centerR), tc=Math.round(centerC);
    while(ccx!==tc){ ccx += ccx<tc?1:-1; if(grid[rr]?.[ccx]?.type==='block') carve(rr,ccx); }
    while(rr!==tr){ rr += rr<tr?1:-1; if(grid[rr]?.[ccx]?.type==='block') carve(rr,ccx); }
  }

  // 마왕/몬스터 진입구 (가장자리 3곳)
  const entries=[];
  const edgePool=[];
  for(let c=1;c<G-1;c++){ edgePool.push([0,c],[G-1,c]); }
  for(let r=1;r<G-1;r++){ edgePool.push([r,0],[r,G-1]); }
  edgePool.sort(()=>Math.random()-0.5);
  for(const p of edgePool){
    if(entries.some(e=>Math.abs(e[0]-p[0])+Math.abs(e[1]-p[1])<7)) continue;
    entries.push(p);
    if(entries.length>=3) break;
  }
  for(const [r,c] of entries){
    carve(r,c);
    const dr = r===0?1 : r===G-1?-1 : 0;
    const dc = c===0?1 : c===G-1?-1 : 0;
    carve(r+dr, c+dc);
  }

  // 함정 배치 (도로 위, 건물/성 주변 제외)
  const traps=[];
  const trapCount = 3 + villageStage();
  const roadCells=[];
  for(let r=0;r<G;r++) for(let c=0;c<G;c++){
    if(grid[r][c].type!=='road') continue;
    if(entries.some(e=>Math.abs(e[0]-r)+Math.abs(e[1]-c)<=2)) continue;
    const nearCastle=Math.max(Math.abs(r-centerR),Math.abs(c-centerC))<3;
    if(nearCastle) continue;
    roadCells.push([r,c]);
  }
  roadCells.sort(()=>Math.random()-0.5);
  for(let i=0;i<Math.min(trapCount, roadCells.length);i++){
    const [r,c]=roadCells[i];
    if(traps.some(t=>Math.abs(t.r-r)+Math.abs(t.c-c)<3)) continue;
    const def=VILLAGE_TRAP_DEFS[Math.floor(Math.random()*VILLAGE_TRAP_DEFS.length)];
    const t={r,c,defId:def.id,name:def.name,icon:def.icon,color:def.color,cd:0,cdMax:def.cd};
    grid[r][c].vtrap=t;
    traps.push(t);
  }

  return {grid, castle, buildings, traps, entries, centerR:tr0(centerR), centerC:tr0(centerC)};
}
function tr0(v){ return Math.round(v); }

/* ---------------- 진입 / 복귀 ---------------- */
function villageAlive(){ return state && state.village && state.phase==='village'; }

function startVillageRaid(){
  if(!state || state.gameOver) return;
  if(state.village) return;            // v38.6: 중복 진입 방지
  state.villagePrepTimer=null;
  state._villageReturnLock=false;
  state._villageEnding=false;
  if(villageOutroTimer){ clearTimeout(villageOutroTimer); villageOutroTimer=null; }
  // v38.6: 던전에서 남아 있던 이펙트가 마을 좌표에 잘못 찍히는 문제를 막습니다.
  state.fxEvents=[]; state.deathFx=[];
  // v38.7: 맵 생성 전에 이번 습격의 마을 크기를 결정합니다. (첫 습격은 좁은 16×16)
  VILLAGE_GRID = villageGridSize();
  const v = generateVillageMap();

  // 던전 상태 저장
  state.dungeonSave = {
    // 마을 습격 중 던전 상태가 다른 로직에 의해 참조/변경되지 않도록 타일 객체를 복사해 보관합니다.
    grid: state.grid.map(row=>row.map(tile=>({...tile}))), GRID, CORE_R, CORE_C,
    ENTRANCES: ENTRANCES.map(e=>({...e})),
    heroes: state.heroes,
    monsters: state.monsters,
    selected: state.selected,
    auraPositions: state.auraPositions,
    dungeonStructure: state.dungeonStructure,
    dungeonLayoutVersion: state.dungeonLayoutVersion,
    activeTool: state.activeTool,
    mawangPos: state.mawang ? {r:state.mawang.r, c:state.mawang.c} : null,
  };

  // 절반의 몬스터가 원정군으로 합류 (강한 순)
  const alive = state.monsters.filter(m=>m.hp>0);
  const takeN = Math.max(alive.length>0?1:0, Math.floor(alive.length/2));
  const party = alive.slice().sort((a,b)=>monsterPower(b)-monsterPower(a)).slice(0, takeN);
  const partyIds = new Set(party.map(m=>m.id));
  state.dungeonSave.monsters = state.monsters.filter(m=>!partyIds.has(m.id));

  // 화면 전환
  GRID = VILLAGE_GRID;
  CORE_R = v.castle.r + 1; CORE_C = v.castle.c + 1;
  ENTRANCES = v.entries.map(([r,c])=>({r,c}));
  state.grid = v.grid;
  state.heroes = [];
  state.monsters = party;
  state.selected = null;
  state.auraPositions = {statue:[],curse:[],barricade:[]};
  state.village = {
    castle: v.castle,
    buildings: v.buildings,
    traps: v.traps,
    entries: v.entries,
    timer: villageTimeLimit(),
    maxTimer: villageTimeLimit(),
    totalBuildings: v.buildings.length,
    // v38.7: 성을 열기 위한 목표 건물 수. 이 수치만 채우면 시간이 끝나도 습격 성공입니다.
    quota: villageBuildingQuota(v.buildings.length),
    destroyedBuildings: 0,
    goldEarned: 0,
    heroesSpawned: 0,
    heroesKilled: 0,
    // v38.7: 마을에서 쓰러진 원정군. 습격이 끝나면 일부가 던전으로 퇴각·귀환합니다.
    fallen: [],
    partySize: party.length,
    result: null,
    flowTick: 0,
    fieldHero: null,
    fieldStruct: null,
    introTimer: VILLAGE_INTRO_SEC,   // v38.6: 도착 연출 동안 전투를 멈춰 화면이 정신없이 지나가지 않게 합니다.
  };
  state.phase = 'village';

  // 진입구에 배치
  const spots = [];
  for(const [er,ec] of v.entries){
    const dr = er===0?1 : er===VILLAGE_GRID-1?-1 : 0;
    const dc = ec===0?1 : ec===VILLAGE_GRID-1?-1 : 0;
    spots.push([er,ec],[er+dr,ec+dc]);
  }
  let si=0;
  const placeAt=(ent)=>{
    for(let tries=0; tries<200; tries++){
      const base = spots[si % spots.length]; si++;
      const rad = Math.floor(si/spots.length);
      const r = base[0] + (rad? Math.floor(Math.random()*(rad*2+1))-rad : 0);
      const c = base[1] + (rad? Math.floor(Math.random()*(rad*2+1))-rad : 0);
      if(!villageInBounds(r,c)) continue;
      const t = state.grid[r][c];
      if(!t || t.type!=='road') continue;
      if(state.monsters.some(m=>m!==ent && m.r===r && m.c===c)) continue;
      if(state.mawang && state.mawang!==ent && state.mawang.r===r && state.mawang.c===c) continue;
      ent.r=r; ent.c=c; return true;
    }
    // 실패 시 아무 도로
    for(let r=0;r<VILLAGE_GRID;r++) for(let c=0;c<VILLAGE_GRID;c++)
      if(state.grid[r][c].type==='road'){ ent.r=r; ent.c=c; return true; }
    return false;
  };
  if(state.mawang && !state.mawang.dead){
    state.mawang.moveCooldown=0.2; state.mawang.vAtkCd=0;
    placeAt(state.mawang);
  }
  for(const m of party){ m.moveCooldown=0.2; m.vAtkCd=0; m.vTarget=null; m.targetHeroId=null; m.vSlowUntil=0; placeAt(m); }

  // 화면/보드 재구성
  zoomLevel = 1;
  buildMapDOM();
  applyBoardSize();
  els.tokenLayer.innerHTML=''; tokenEls={};
  if(els.rangeLayer) els.rangeLayer.innerHTML='';
  setVillageBackdrop(true);
  showVillageIntro();
  showVillageToast('🏘️','마을 습격 시작!',`마왕과 원정군 ${party.length}마리가 마을에 도착했습니다.`,'prep',3200);
  Sound.expand && Sound.expand();
  Sound.setStageMusic && Sound.setStageMusic(1);
  addLog(`<span class="hl-gold">🏘️ 마을 습격!</span> 마왕과 몬스터 ${party.length}마리가 용사들의 마을로 진격합니다.`);
  renderUI();
}

function refreshDungeonObstacleImages(){
  if(!state || state.village || !cellEls.length) return;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const t=state.grid[r]?.[c];
    const el=cellEls[r]?.[c];
    if(!t || !el || !isObstacleRoot(r,c) || !t.obstacle) continue;
    const ob=OBSTACLE_TYPES.find(o=>o.id===t.obstacle);
    if(!ob) continue;
    let img=el.querySelector('.obstacle-icon');
    if(!img){
      img=document.createElement('img');
      img.className='obstacle-icon';
      el.appendChild(img);
    }
    applyObstacleSpriteImage(img,ob, t.wasBridge?{srcOverride:OBSTACLE_SPRITES.collapse_bridge_alt}:undefined);
    img.style.display='block';
  }
}

function restoreDungeonObstacleVisuals(){
  try{ _restoreDungeonObstacleVisuals(); }
  catch(err){
    // v38.6: 시각 복구 중 오류가 나도 복귀 절차 전체가 멈추지 않도록 격리합니다.
    console.error('[Village] 장애물 시각 복구 실패:', err);
    try{ renderMapCells(); }catch(e2){}
  }
}
function _restoreDungeonObstacleVisuals(){
  if(!state || !cellEls.length) return;

  // renderMapCells가 실제 장애물 DOM의 기준이므로 먼저 전체 셀을 정상 렌더링합니다.
  renderMapCells();

  // 장애물 셀의 이미지 DOM을 강제로 재구성합니다.
  // 마을 습격 진입 시 map DOM을 갈아끼우기 때문에, 복귀 시 sprite가 비어 있는 경우를 방지합니다.
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const t=state.grid[r]?.[c];
    const el=cellEls[r]?.[c];
    if(!t || !el) continue;
    const ob=t.obstacle ? OBSTACLE_TYPES.find(o=>o.id===t.obstacle) : null;
    if(!ob){
      const oldImg=el.querySelector('.obstacle-icon');
      if(oldImg) oldImg.remove();
      continue;
    }
    const root=isObstacleRoot(r,c);
    if(root){
      let img=el.querySelector('.obstacle-icon');
      if(!img){
        img=document.createElement('img');
        img.className='obstacle-icon';
        el.appendChild(img);
      }
      applyObstacleSpriteImage(img,ob, t.wasBridge?{srcOverride:OBSTACLE_SPRITES.collapse_bridge_alt}:undefined);
      const lv=obstacleLevel(obstacleRootTile(r,c)||t);
      el.dataset.icon=ob.icon;
      el.style.setProperty('--ob-color',ob.color||'rgba(200,200,210,.5)');
      el.style.setProperty('--ob-level-scale',String(1+(lv-1)*0.05));
      el.classList.add('has-obstacle','obstacle-root','obstacle-'+ob.kind);
      el.classList.toggle('ob-lv-mid',lv>=5&&lv<10);
      el.classList.toggle('ob-lv-max',lv>=10);
    }
  }

  // 마을 습격 시작 때 tokenLayer를 비웠으므로, 던전 장애물의 보조 시각효과도 다시 채웁니다.
  if(els.tokenLayer){
    tokenLayerPersistentCleanup();
    const px=currentCellPx;
    for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
      const ob=state.grid[r]?.[c]?.obstacle;
      if(!['poison','web','curse','flame','lightning','barricade','frost','pit','statue'].includes(ob)) continue;
      const el=document.createElement('div');
      el.className='obstacle-persistent '+ob;
      el.dataset.obFxKey=r+'_'+c;
      el.style.left=(c*px+px/2)+'px';
      el.style.top=(r*px+px/2)+'px';
      if(ob==='web') el.textContent='✣';
      else if(ob==='curse') el.textContent='☠';
      else if(ob==='flame') el.textContent='🔥';
      else if(ob==='lightning') el.textContent='⚡';
      else if(ob==='barricade') el.textContent='🛡';
      else if(ob==='frost') el.textContent='❄';
      else if(ob==='pit') el.textContent='⛓';
      else if(ob==='statue') el.textContent='◉';
      el.style.fontSize=Math.max(12,px*.45)+'px';
      el.style.textAlign='center';
      el.style.lineHeight=px+'px';
      els.tokenLayer.appendChild(el);
    }
  }

  // 셀 클래스/이미지는 위에서 이미 복구했으므로, 마지막에는 사거리만 동기화합니다.
  // 장애물 스프라이트는 별도의 refresh 루틴에서 재동기화합니다.
  renderObstacleRanges();
}

/* v38.6 · 마을 습격 종료 연출
   습격이 끝나면 곧바로 던전으로 튕겨나가지 않고,
   (1) 상단 토스트 + 결과창으로 성공/실패를 먼저 알리고
   (2) VILLAGE_OUTRO_SEC(기본 5초) 뒤에 실제 던전 복귀를 진행합니다. */
let villageOutroTimer=null;
function endVillageRaid(success, tier){
  if(!state || !state.village || state._villageEnding) return;
  state._villageEnding=true;
  const v = state.village;
  // v38.7: great(성 파괴) / good(목표 건물 달성) / fail 의 3단계
  v.tier = tier || (success ? 'great' : 'fail');
  v.result = success ? 'win' : 'lose';
  const save = state.dungeonSave;
  if(!save) {
    state.village=null;
    state._villageEnding=false;
    state.phase='build';
    state.buildTimer=Math.max(12, buildTimeForWave(state.wave));
    setVillageBackdrop(false);
    return;
  }

  // 보상 정산 (결과창에 반영되어야 하므로 복귀 전에 먼저 처리합니다)
  if(success){
    // 대성공(성 파괴)은 전액, 목표 달성 성공은 55%의 보너스를 받습니다.
    const rewardMul = v.tier==='great' ? 1 : 0.55;
    const bonus = Math.round((350 + state.wave*55) * (1 + villageStage()*0.35) * rewardMul);
    // 성공 보너스도 마을 약탈 골드와 함께 던전 복귀 시 정산합니다.
    v.goldEarned += bonus;
    state.pendingSoulBonus = (state.pendingSoulBonus||0) + Math.round((20 + villageStage()*10) * rewardMul);
    if(state.mawang) mawangGainXp(Math.round((180 + state.wave*12) * rewardMul), null);
    addLog(v.tier==='great'
      ? `<span class="hl-gold">🔥 마을이 잿더미가 되었습니다!</span> 총 <span class="hl-gold">+${v.goldEarned}G</span> 획득 · ${VILLAGE_OUTRO_SEC}초 뒤 던전으로 복귀합니다.`
      : `<span class="hl-gold">🏘️ 습격 성공!</span> 목표 건물 ${villageQuota()}채를 불태웠습니다. 총 <span class="hl-gold">+${v.goldEarned}G</span> 획득 · ${VILLAGE_OUTRO_SEC}초 뒤 던전으로 복귀합니다.`);
    Sound.waveClear && Sound.waveClear();
  } else {
    addLog(`<span class="hl-red">🏰 습격 실패</span> — 원정군이 마을에서 격퇴당했습니다. ${VILLAGE_OUTRO_SEC}초 뒤 던전으로 복귀합니다.`);
    Sound.defeatTransition && Sound.defeatTransition();
  }

  const villageSnapshot = {...v};
  const reviveCount = Math.round((villageSnapshot.fallen||[]).length * villageReviveRatio(villageSnapshot.tier));
  const tierTitle = v.tier==='great' ? '마을 함락!' : (v.tier==='good' ? '습격 성공!' : '마을 습격 실패');
  const tierIcon  = v.tier==='great' ? '🔥' : (v.tier==='good' ? '🏘️' : '🏰');
  showVillageToast(
    tierIcon,
    tierTitle,
    `${VILLAGE_OUTRO_SEC}초 뒤 던전으로 복귀합니다. (건물 ${villageSnapshot.destroyedBuildings}/${villageSnapshot.totalBuildings} 파괴 · 약탈 ${Math.round(villageSnapshot.goldEarned)}G${reviveCount>0?` · 퇴각 귀환 ${reviveCount}마리`:''})`,
    success ? 'win' : 'lose',
    VILLAGE_OUTRO_SEC*1000
  );
  showVillageResult(villageSnapshot, success, null, Math.max(1200, VILLAGE_OUTRO_SEC*1000-700));
  renderUI();

  const session=gameSessionId;
  if(villageOutroTimer) clearTimeout(villageOutroTimer);
  villageOutroTimer=setTimeout(()=>{
    villageOutroTimer=null;
    if(session!==gameSessionId) return;
    performVillageReturn(success, villageSnapshot);
  }, VILLAGE_OUTRO_SEC*1000);
}

function performVillageReturn(success, villageSnapshot){
  if(!state || state.gameOver){ if(state) state._villageEnding=false; return; }
  const save = state.dungeonSave;
  if(!state.village || !save){ state._villageEnding=false; return; }

  // 생존 몬스터를 던전으로 복귀
  const survivors = state.monsters.filter(m=>m.hp>0);
  for(const m of survivors){ m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp*0.4)); }

  /* v38.7 · 원정군 퇴각 귀환
     예전에는 마을에서 쓰러진 몬스터가 그대로 소멸해서, 습격 직후 11웨이브를
     사실상 무방비로 맞이해야 했습니다. 이제 전사한 원정군 중 일부가
     "마왕의 권능으로 퇴각·귀환"하여 낮은 체력으로 던전에 복귀합니다. */
  const fallen = Array.isArray(villageSnapshot?.fallen) ? villageSnapshot.fallen.slice() : [];
  const reviveRatio = villageReviveRatio(villageSnapshot?.tier);
  const reviveN = Math.min(fallen.length, Math.round(fallen.length * reviveRatio));
  const revived = fallen.slice(0, reviveN);
  for(const m of revived){
    m.hp = Math.max(1, Math.round((m.maxHp||1) * VILLAGE_REVIVE_HP));
    m.dead = false;
    m.vTarget=null; m.vAtkCd=0; m.vSlowUntil=0; m.targetHeroId=null;
    m.attackCooldown=0; m.moveCooldown=0.2;
    m.stunTicks=0; m.fleeing=false; m.digging=false;
  }
  const returning = survivors.concat(revived);

  GRID = save.GRID; CORE_R = save.CORE_R; CORE_C = save.CORE_C;
  ENTRANCES = save.ENTRANCES.map(e=>({...e}));
  state.grid = save.grid;
  state.heroes = save.heroes.filter(h=>h.hp>0);
  state.monsters = save.monsters.concat(returning);
  state.selected = null;
  state.auraPositions = save.auraPositions || {statue:[],curse:[],barricade:[]};
  state.dungeonStructure = save.dungeonStructure;
  state.dungeonLayoutVersion = save.dungeonLayoutVersion;
  state.activeTool = save.activeTool || 'dig';
  state.dungeonSave = null;

  // 몬스터 재배치 (핵 근처 빈 바닥) — 생존자 + 퇴각 귀환한 몬스터 모두
  for(const m of returning){
    const spot = findMonsterSpawnNearCore() || findRandomEmptyFloor();
    if(spot){ m.r=spot[0]; m.c=spot[1]; }
    // v38.6: 빈 자리를 찾지 못해 마을 좌표(맵 밖)가 그대로 남는 경우를 방지합니다.
    if(!inBounds(m.r,m.c)){ m.r=Math.max(0,Math.min(GRID-1,CORE_R)); m.c=Math.max(0,Math.min(GRID-1,CORE_C)); }
    m.vTarget=null; m.vAtkCd=0; m.vSlowUntil=0; m.targetHeroId=null; m.moveCooldown=0.2;
  }
  if(state.mawang){
    if(!state.mawang.dead && state.mawang.hp>0){
      state.mawang.hp = Math.min(state.mawang.maxHp, state.mawang.hp + Math.round(state.mawang.maxHp*0.4));
    }
    const mp = save.mawangPos || {r:CORE_R, c:CORE_C};
    state.mawang.r=mp.r; state.mawang.c=mp.c;
    state.mawang.vAtkCd=0;
  }

  // 마을 습격 중 누적한 약탈 골드를 던전 복귀 순간에 정확히 정산합니다.
  const villageLootGold=Math.max(0,Math.round(villageSnapshot?.goldEarned||0));
  if(villageLootGold>0){
    addGold(villageLootGold,true);
    addLog(`<span class="hl-gold">💰 마을 약탈 정산</span> — 약탈 골드 <span class="hl-gold">+${villageLootGold}G</span>가 던전 보유 골드에 반영되었습니다.`);
  }
  if(revived.length){
    addLog(`<span class="hl-gold">🩸 퇴각 귀환</span> — 마을에서 쓰러진 원정군 중 <span class="hl-gold">${revived.length}마리</span>가 마왕의 권능으로 던전에 되돌아왔습니다. (체력 ${Math.round(VILLAGE_REVIVE_HP*100)}%)`);
    for(const m of revived){
      state.fxEvents.push({type:'spawnBurst', r:m.r, c:m.c, color:'rgba(183,107,242,.9)'});
    }
  }

  state.village = null;
  // v38.6: 마을에서 발생한 잔여 이펙트가 던전 좌표에 잘못 찍히지 않도록 정리합니다.
  state.fxEvents=[]; state.deathFx=[];
  // 결과창이 떠 있는 동안 메인 게임 루프는 살아 있게 하되, 준비시간만 일시정지합니다.
  state.phase = 'build';
  state._villageReturnLock = true;

  // 던전 보드 DOM을 새로 만든 뒤 장애물 이미지 DOM을 다시 구성하여 복구합니다.
  // v38.6: 시각 복구 구간에서 예외가 나더라도 배경 복구/준비시간 재개까지 건너뛰지 않도록 격리합니다.
  GRID = save.GRID;
  zoomLevel = 1;
  try{
    buildMapDOM();
    applyBoardSize();
    els.tokenLayer.innerHTML=''; tokenEls={};
    if(els.rangeLayer) els.rangeLayer.innerHTML='';
    renderMapCells();
    restoreDungeonObstacleVisuals();
    renderObstacleRanges();
  }catch(err){ console.error('[Village] 던전 보드 복구 실패:', err); }
  setVillageBackdrop(false);
  setStageBackground(state.wave);
  state._mapDirty = true; state._rangesDirty = true; state._panelDirty = true;

  const refreshReturnView=()=>{
    if(!state || state.village || !state.grid) return;
    try{
      renderMapCells();
      restoreDungeonObstacleVisuals();
      refreshDungeonObstacleImages();
      syncTokens();
      renderObstacleRanges();
    }catch(err){ console.error('[Village] 복귀 화면 갱신 실패:', err); }
  };
  requestAnimationFrame(refreshReturnView);
  setTimeout(refreshReturnView, 80);
  setTimeout(refreshReturnView, 180);
  setTimeout(refreshReturnView, 420);
  setTimeout(refreshReturnView, 900);

  hideVillageOverlay();
  Sound.setStageMusic && Sound.setStageMusic(Math.floor(Math.max(0,state.wave-1)/10));
  showVillageToast('🏯','던전으로 복귀 완료', success?`마을을 불태운 원정군이 돌아왔습니다. 약탈 ${villageLootGold}G가 정산되었습니다. ${VILLAGE_RETURN_BUILD_SEC}초 뒤 다음 웨이브가 시작됩니다.`:`원정군이 물러났습니다. 약탈 ${villageLootGold}G가 정산되었습니다. ${VILLAGE_RETURN_BUILD_SEC}초 뒤 다음 웨이브가 시작됩니다.`, success?'win':'lose', 3200);

  // v38.6: 화면이 안정될 때까지 잠깐 멈췄다가 준비시간을 시작합니다.
  const session=gameSessionId;
  setTimeout(()=>{
    if(session!==gameSessionId || !state || state.gameOver) return;
    state.phase='build';
    // 마을 습격 직후에는 기존의 짧은 준비시간 대신 1분의 정비시간을 제공합니다.
    state.buildTimeBonus=0;
    state.buildTimer=VILLAGE_RETURN_BUILD_SEC;
    state._villageReturnLock=false;
    state._villageEnding=false;
    state._mapDirty=true; state._rangesDirty=true; state._panelDirty=true;
    renderUI();
    requestAnimationFrame(refreshReturnView);
  }, VILLAGE_RETURN_HOLD_MS);

  renderUI();
  requestAnimationFrame(refreshReturnView);
}

/* ---------------- 시뮬레이션 ---------------- */
function villagePassable(r,c){
  if(!villageInBounds(r,c)) return false;
  const t=state.grid[r][c];
  return !!t && t.type==='road';
}
function villageMonsterAt(r,c,skip){
  if(state.mawang && !state.mawang.dead && state.mawang!==skip && state.mawang.r===r && state.mawang.c===c) return state.mawang;
  return state.monsters.find(m=>m!==skip && m.hp>0 && m.r===r && m.c===c) || null;
}
function villageHeroAt(r,c,skip){
  return state.heroes.find(h=>h!==skip && h.hp>0 && h.r===r && h.c===c) || null;
}

// 여러 시작점에서 도로를 따라 BFS 거리장 생성
function villageField(seeds){
  const G=VILLAGE_GRID;
  const dist=new Array(G*G).fill(-1);
  const q=[];
  for(const [r,c] of seeds){
    if(!villageInBounds(r,c)) continue;
    const k=r*G+c;
    if(dist[k]!==-1) continue;
    dist[k]=0; q.push([r,c]);
  }
  let head=0;
  while(head<q.length){
    const [r,c]=q[head++];
    const d=dist[r*G+c];
    for(const [nr,nc] of [[r+1,c],[r-1,c],[r,c+1],[r,c-1]]){
      if(!villagePassable(nr,nc)) continue;
      const k=nr*G+nc;
      if(dist[k]!==-1) continue;
      dist[k]=d+1; q.push([nr,nc]);
    }
  }
  return dist;
}

function villageStructCells(s){
  const out=[];
  for(let r=s.r;r<s.r+s.size;r++) for(let c=s.c;c<s.c+s.size;c++) out.push([r,c]);
  return out;
}
function villageStructAdjacent(s){
  const out=[]; const seen=new Set();
  for(const [r,c] of villageStructCells(s)){
    for(const [nr,nc] of [[r+1,c],[r-1,c],[r,c+1],[r,c-1]]){
      const k=nr+'_'+nc;
      if(seen.has(k)) continue; seen.add(k);
      if(villagePassable(nr,nc)) out.push([nr,nc]);
    }
  }
  return out;
}
function villageDistToStruct(r,c,s){
  const dr=Math.max(s.r-r, 0, r-(s.r+s.size-1));
  const dc=Math.max(s.c-c, 0, c-(s.c+s.size-1));
  return dr+dc;
}
function villageActiveTargets(){
  const v=state.village;
  const live=v.buildings.filter(b=>!b.destroyed);
  // v38.7: 목표 건물 수를 채워 성이 열리면, 남은 건물보다 성을 우선 공격합니다.
  //        (남은 건물을 계속 돌면서 시간을 허비하지 않게 하기 위함)
  if(!villageCastleLocked() && !v.castle.destroyed) return [v.castle];
  if(live.length) return live;
  return v.castle.destroyed ? [] : [v.castle];
}
/* v38.7 · 성은 "모든 건물"이 아니라 "목표 건물 수(quota)"를 채우면 열립니다. */
function villageQuota(){
  const v=state?.village; if(!v) return 1;
  return Math.max(1, Math.min(v.totalBuildings||1, v.quota||villageBuildingQuota(v.totalBuildings)));
}
function villageQuotaMet(){
  const v=state?.village; if(!v) return false;
  return (v.destroyedBuildings||0) >= villageQuota();
}
function villageCastleLocked(){
  const v=state.village;
  if(!v) return false;
  return !villageQuotaMet() && v.buildings.some(b=>!b.destroyed);
}

function villageDamageStruct(att, s, isMawang){
  const v=state.village;
  const base = isMawang ? Math.round(mawangCurrentStats().atk * 2.2) : Math.round((att.atk||8) * 1.8 * (state.globalMonsterAtkMul||1));
  const dmg = Math.max(3, base);
  s.hp -= dmg;
  // v38.6: 건물/성을 때릴 때의 타격음
  if(isMawang) Sound.mawangAttack && Sound.mawangAttack();
  else Sound.hit && Sound.hit();
  state.fxEvents.push({type:'battleHit', r:att.r, c:att.c, color:'#ffb15e', strong:false, damage:dmg});
  state.fxEvents.push({type:'damageNumber', r:s.r + (s.size/2|0), c:s.c + (s.size/2|0), amount:dmg, color:'#ffd166'});
  if(s.hp<=0){
    s.hp=0; s.destroyed=true;
    const cells=villageStructCells(s);
    for(const [r,c] of cells){ state.grid[r][c]={type:'road'}; }
    state.fxEvents.push({type:'spawnBurst', r:s.r+1, c:s.c+1, color:'rgba(255,140,60,.95)'});
    if(s===v.castle){
      addGold(0);
      addLog(`<span class="hl-gold">🏰 성이 무너졌습니다!</span>`);
      Sound.waveClear && Sound.waveClear();
    } else {
      v.destroyedBuildings++;
      const g=Math.round((s.gold||60) * (1 + villageStage()*0.4));
      // 마을 습격 골드는 던전 복귀 시 한 번에 정산합니다.
      v.goldEarned+=g;
      state.pendingSoulBonus=(state.pendingSoulBonus||0)+VILLAGE_BUILDING_SOUL;
      addLog(`<span class="hl-gold">${s.icon} ${s.name} 파괴!</span> 약탈 <span class="hl-gold">+${g}G</span> · 영혼 <span class="hl-gold">+${VILLAGE_BUILDING_SOUL}</span> (판 종료 정산)`);
      Sound.digBreak && Sound.digBreak();
      if(state.mawang) mawangGainXp(25 + state.wave*2, null);
      if(!villageCastleLocked()){
        addLog(`<span class="hl-red">⚔️ 목표 건물 ${villageQuota()}채를 파괴했습니다!</span> 이제 중앙의 성을 공격할 수 있습니다. (이 시점부터는 시간이 끝나도 <b>습격 성공</b>입니다)`);
        showVillageToast('⚔️','목표 달성!',`이제 성을 공격할 수 있습니다. 시간이 다 돼도 습격은 성공으로 기록됩니다.`,'win',2800);
      }
    }
    state._mapDirty=true;
  }
}

function villageDamageBlock(att, r, c, isMawang){
  const t=state.grid[r][c];
  if(!t || t.type!=='block') return;
  const base = isMawang ? Math.round(mawangCurrentStats().atk * 2.0) : Math.round((att.atk||8) * 1.6);
  t.blockHp -= Math.max(3, base);
  Sound.dig && Sound.dig(); // v38.6: 블럭을 부수는 중 사운드
  state.fxEvents.push({type:'spark', r, c, color:'#cdbff5'});
  if(t.blockHp<=0){
    state.grid[r][c]={type:'road'};
    state.fxEvents.push({type:'spawnBurst', r, c, color:'rgba(190,175,235,.75)'});
    Sound.digBreak && Sound.digBreak();
    state.village.flowTick = 0; // 경로 재계산
  }
  state._mapDirty=true;
}

function villageTryTrap(m){
  const t=state.grid[m.r]?.[m.c];
  const tr=t && t.vtrap;
  if(!tr || tr.cd>0) return;
  tr.cd = tr.cdMax;
  const dmg = villageTrapDamage();
  const hit=(u,amount)=>{
    if(!u || u.hp<=0) return;
    u.hp -= Math.max(1, amount - Math.round((u.def||0)*0.5));
    state.fxEvents.push({type:'damageNumber', r:u.r, c:u.c, amount:Math.round(amount), color:'#ff6873'});
  };
  state.fxEvents.push({type:'obstacleBurst', r:tr.r, c:tr.c, ob:'spike', text:tr.icon});
  if(tr.defId==='v_spike'){ hit(m, dmg); Sound.trap && Sound.trap('spike'); }
  else if(tr.defId==='v_fire'){
    const all=[state.mawang, ...state.monsters].filter(Boolean);
    for(const u of all){ if(u.dead) continue; if(Math.abs(u.r-tr.r)+Math.abs(u.c-tr.c)<=1) hit(u, dmg*0.8); }
    Sound.trap && Sound.trap('flame');
  }
  else if(tr.defId==='v_net'){
    m.vSlowUntil = performance.now() + 3000;
    state.fxEvents.push({type:'floatText', r:m.r, c:m.c, text:'🕸️속박', color:'#9fe8ff'});
    Sound.trap && Sound.trap('web');
  }
  else if(tr.defId==='v_bell'){
    // v38.6: 경종이 한 번에 2명을 즉시 불러내 스폰이 폭주하던 문제를 완화합니다.
    const v=state.village;
    const live=v.buildings.filter(b=>!b.destroyed);
    let n=0;
    for(const b of live){ if(n>=1) break; if(villageSpawnHeroFrom(b)) n++; }
    state.fxEvents.push({type:'floatText', r:tr.r, c:tr.c, text:'🔔경보!', color:'#ffe08a'});
    Sound.magic && Sound.magic('holy');
  }
  addLog(`<span class="hl-red">${tr.icon} ${tr.name}</span>이(가) 작동했습니다.`);
}

function villageSpawnHeroFrom(b){
  if(state.heroes.length >= villageHeroCap()) return false;
  const adj = villageStructAdjacent(b).filter(([r,c])=>!villageHeroAt(r,c) && !villageMonsterAt(r,c));
  if(!adj.length) return false;
  const [r,c] = adj[Math.floor(Math.random()*adj.length)];
  const pool = (b.heroes||['swordsman']).filter(id=>HERO_TYPES.some(h=>h.id===id));
  const typeId = pool[Math.floor(Math.random()*pool.length)] || 'swordsman';
  const type = HERO_TYPES.find(h=>h.id===typeId);
  const level = villageHeroLevel();
  const base = heroBaseStats(level);
  const now = performance.now();
  const id = state.heroSeq++;
  // v38.7: 마을 용사는 던전 용사보다 약하게 만들어 첫 습격의 체감 난이도를 낮춥니다.
  const hp = Math.max(1, Math.round(base.hp * type.hpMult * VILLAGE_HERO_HP_MUL));
  const hero = {
    id, r, c, spawnR:r, spawnC:c, typeId:type.id, range:type.range,
    hp, maxHp:hp,
    atk: Math.max(1, Math.round(base.atk * type.atkMult * VILLAGE_HERO_ATK_MUL)),
    def: Math.round(level*HERO_DEF_PER_LEVEL*0.8),
    reward: Math.round(base.reward * type.rewardMult * 0.7),
    isBoss:false, majorBoss:false, elite:false, bossProfileId:null, partySynergy:1,
    level, coward:false, fleeing:false, escaped:false, fleeTarget:null, fleeTicks:0, fleeCooldown:0,
    partyId:null, partyLeaderId:id, partyRole:'leader',
    digging:false, digKind:null, digProgress:0, digTargetR:null, digTargetC:null,
    lastAttackAt:0, lastHealAt:0, stunTicks:0, prevR:null, prevC:null, heroKills:0,
    coreFound:false, stuckTicks:0, soundNextDigAt:0,
    skillCooldown:99999, castingSkill:null, skillTarget:null, lastSkillName:null,
    lastDialogueAt:0, lastCombatDialogueAt:0, nextDialogueAt:0,
    bubbleText:null, bubbleKind:'normal', bubbleUntil:0,
    showedQuestion:false, showedCoreAlert:false, lastMoveAt:0, lastStepR:0, lastStepC:0,
    spawnedAt:now, vMoveCd:0.3, vAtkCd:0, fromBuilding:b.id,
  };
  state.heroes.push(hero);
  state.village.heroesSpawned++;
  state.fxEvents.push({type:'spawnBurst', r, c, color:'rgba(224,73,95,.85)'});
  Sound.heroSpawn && Sound.heroSpawn();
  return true;
}

function villageAttackerTick(m, dt, isMawang){
  const now=performance.now();
  const v=state.village;
  const stats = isMawang ? mawangCurrentStats() : null;

  m.vAtkCd = Math.max(0, (m.vAtkCd||0) - dt);

  // 1) 사거리 안 용사 공격
  const range = isMawang ? 1 : (m.range||1);
  let target=null, bestD=Infinity;
  for(const h of state.heroes){
    if(h.hp<=0) continue;
    const d=Math.abs(h.r-m.r)+Math.abs(h.c-m.c);
    if(d<=range && d<bestD){ target=h; bestD=d; }
  }
  if(target){
    m.targetHeroId = target.id;
    if(m.vAtkCd<=0){
      m.vAtkCd = isMawang ? Math.max(0.25, stats.attackInterval) : 0.55;
      const crit = isMawang && Math.random()<stats.crit;
      let raw = isMawang
        ? Math.round(stats.atk * stats.skillPower * (crit?1.85:1))
        : Math.round((m.atk||8) * (state.globalMonsterAtkMul||1) * monsterBuildCombatMultiplier(m));
      const dmg = Math.max(1, raw - (target.def||0));
      target.hp -= dmg;
      m.lastAttackAt = now;
      // v38.6: 마을 습격에서 전투 사운드가 전혀 나오지 않던 문제 수정
      if(isMawang){ if(crit) Sound.critical && Sound.critical(); else Sound.mawangAttack && Sound.mawangAttack(); }
      else if((m.range||1)>1) Sound.monsterRanged && Sound.monsterRanged();
      else Sound.monsterAttack && Sound.monsterAttack();
      if(bestD<=1 && (isMawang || !isRangedMonsterUnit(m))){ // v48: 원거리 몬스터는 붙어도 투사체
        const dR=Math.sign(target.r-m.r), dC=Math.sign(target.c-m.c);
        state.fxEvents.push({type:'punch', key:(isMawang?'mawang':'m'+m.id), dr:dR, dc:dC, mode:'attacker'});
        state.fxEvents.push({type:'battleHit', r:target.r, c:target.c, color:'#ff6873', strong:dmg>target.maxHp*0.12, damage:dmg});
      } else {
        state.fxEvents.push({type:'projectile', fromR:m.r, fromC:m.c, toR:target.r, toC:target.c, color:monsterProjectileColor(m.typeId), owner:'monster', typeId:m.typeId, special:m.special, kind:rangedProjectileKind('monster', m.typeId, m.special)});
      }
      state.fxEvents.push({type:'damageNumber', r:target.r, c:target.c, amount:dmg, color:'#ff6873'});
      if(target.hp<=0){ if(isMawang) target.killerMawang=true; else target.killerMonsterId=m.id; }
    }
    return;
  }
  m.targetHeroId=null;

  // 2) 인접한 목표 구조물 공격
  const targets = villageActiveTargets();
  if(!targets.length) return;
  let struct=null, sd=Infinity;
  for(const s of targets){
    const d=villageDistToStruct(m.r,m.c,s);
    if(d<sd){ sd=d; struct=s; }
  }
  if(struct && sd<=1){
    if(m.vAtkCd<=0){
      m.vAtkCd = VILLAGE_TICK_ATTACK;
      villageDamageStruct(m, struct, isMawang);
    }
    return;
  }

  // 3) 이동
  const slowMul = (m.vSlowUntil && now < m.vSlowUntil) ? 2.0 : 1;
  const baseInterval = isMawang ? Math.max(0.22, stats.moveInterval) : 0.42;
  m.moveCooldown = (m.moveCooldown||0) - dt;
  if(m.moveCooldown>0) return;
  m.moveCooldown = baseInterval * slowMul;

  const field = v.fieldStruct;
  const G=VILLAGE_GRID;
  const here = field ? field[m.r*G+m.c] : -1;
  if(here>0){
    let best=null, bestV=here;
    for(const [nr,nc] of [[m.r+1,m.c],[m.r-1,m.c],[m.r,m.c+1],[m.r,m.c-1]]){
      if(!villagePassable(nr,nc)) continue;
      const val=field[nr*G+nc];
      if(val>=0 && val<bestV && !villageMonsterAt(nr,nc,m) && !villageHeroAt(nr,nc)){ bestV=val; best=[nr,nc]; }
    }
    if(best){ m.r=best[0]; m.c=best[1]; villageTryTrap(m); return; }
  }

  // 4) 길이 없으면 블럭을 부순다
  let digCell=null, digScore=Infinity;
  for(const [nr,nc] of [[m.r+1,m.c],[m.r-1,m.c],[m.r,m.c+1],[m.r,m.c-1]]){
    if(!villageInBounds(nr,nc)) continue;
    const t=state.grid[nr][nc];
    if(!t || t.type!=='block') continue;
    const sc=villageDistToStruct(nr,nc,struct);
    if(sc<digScore){ digScore=sc; digCell=[nr,nc]; }
  }
  if(digCell){
    m.moveCooldown = VILLAGE_TICK_ATTACK * slowMul;
    villageDamageBlock(m, digCell[0], digCell[1], isMawang);
    m.lastAttackAt = now;
    return;
  }
  // 5) 마지막 폴백: 무작위 이동
  const opts=[[m.r+1,m.c],[m.r-1,m.c],[m.r,m.c+1],[m.r,m.c-1]].filter(([r,c])=>villagePassable(r,c)&&!villageMonsterAt(r,c,m)&&!villageHeroAt(r,c));
  if(opts.length){ const p=opts[Math.floor(Math.random()*opts.length)]; m.r=p[0]; m.c=p[1]; villageTryTrap(m); }
}

function villageHeroTick(h, dt){
  const now=performance.now();
  const v=state.village;
  h.vAtkCd = Math.max(0, (h.vAtkCd||0) - dt);
  h.vMoveCd = (h.vMoveCd||0) - dt;

  const ht = heroTypeOf(h) || {};
  const range = h.range||1;

  // 대상 탐색
  const foes=[];
  if(state.mawang && !state.mawang.dead && state.mawang.hp>0) foes.push(state.mawang);
  for(const m of state.monsters) if(m.hp>0) foes.push(m);
  let target=null, bestD=Infinity;
  for(const f of foes){
    const d=Math.abs(f.r-h.r)+Math.abs(f.c-h.c);
    if(d<bestD){ bestD=d; target=f; }
  }
  if(!target) return;

  if(bestD<=range){
    if(h.vAtkCd<=0){
      h.vAtkCd = 0.75;
      let raw = Math.round(h.atk * (ht.rangedBonus?1+ht.rangedBonus:1));
      const dmg = Math.max(1, raw - (target.def||0));
      target.hp -= dmg;
      h.lastAttackAt = now;
      // v38.6: 마을 습격 용사 공격 사운드 추가
      if((h.range||1)>1) Sound.heroRanged && Sound.heroRanged();
      else Sound.heroAttack && Sound.heroAttack();
      if(bestD<=1 && !isRangedHeroUnit(h)){ // v48: 원거리 용사는 붙어도 투사체
        const dR=Math.sign(target.r-h.r), dC=Math.sign(target.c-h.c);
        state.fxEvents.push({type:'punch', key:'h'+h.id, dr:dR, dc:dC, mode:'attacker'});
        state.fxEvents.push({type:'battleHit', r:target.r, c:target.c, color:'#ffd166', strong:false, damage:dmg});
      } else {
        state.fxEvents.push({type:'projectile', fromR:h.r, fromC:h.c, toR:target.r, toC:target.c, color:RANGED_COLOR[h.typeId]||'#5aa9e6', owner:'hero', typeId:h.typeId, kind:rangedProjectileKind('hero', h.typeId)});
      }
      state.fxEvents.push({type:'damageNumber', r:target.r, c:target.c, amount:dmg, color:'#ffd166'});
      if(ht.lifestealPct){ h.hp=Math.min(h.maxHp, h.hp+Math.min(ht.lifestealCap||10, Math.round(dmg*ht.lifestealPct))); }
      if(Math.random()<0.10) heroSay(h,'battle');
    }
    return;
  }

  if(h.vMoveCd>0) return;
  h.vMoveCd = 0.5 / ((ht.moveSpeedMul)||1);

  const field = v.fieldHero;
  const G=VILLAGE_GRID;
  const here = field ? field[h.r*G+h.c] : -1;
  if(here>0){
    let best=null, bestV=here;
    for(const [nr,nc] of [[h.r+1,h.c],[h.r-1,h.c],[h.r,h.c+1],[h.r,h.c-1]]){
      if(!villagePassable(nr,nc)) continue;
      const val=field[nr*G+nc];
      if(val>=0 && val<bestV && !villageHeroAt(nr,nc,h) && !villageMonsterAt(nr,nc)){ bestV=val; best=[nr,nc]; }
    }
    if(best){ h.prevR=h.r; h.prevC=h.c; h.r=best[0]; h.c=best[1]; return; }
  }
  // 그리디 폴백
  const opts=[[h.r+1,h.c],[h.r-1,h.c],[h.r,h.c+1],[h.r,h.c-1]]
    .filter(([r,c])=>villagePassable(r,c)&&!villageHeroAt(r,c,h)&&!villageMonsterAt(r,c))
    .sort((a,b)=>(Math.abs(a[0]-target.r)+Math.abs(a[1]-target.c))-(Math.abs(b[0]-target.r)+Math.abs(b[1]-target.c)));
  if(opts.length){ h.prevR=h.r; h.prevC=h.c; h.r=opts[0][0]; h.c=opts[0][1]; }
}

function simulateVillageStep(dt){
  const v=state.village;
  if(!v) return;

  // v38.6: 결과 연출(5초) 동안에는 전투와 타이머를 완전히 멈춥니다.
  if(state._villageEnding) return;
  // v38.6: 도착 연출 동안에는 아무도 움직이지 않습니다. (화면이 순식간에 지나가는 문제 방지)
  if(v.introTimer>0){ v.introTimer-=dt; return; }

  v.timer -= dt;

  // 경로장 갱신 (0.4초 주기)
  v.flowTick = (v.flowTick||0) - dt;
  if(v.flowTick<=0){
    v.flowTick = 0.4;
    const targets=villageActiveTargets();
    const seeds=[];
    for(const s of targets) for(const p of villageStructAdjacent(s)) seeds.push(p);
    v.fieldStruct = villageField(seeds);
    const foeSeeds=[];
    if(state.mawang && !state.mawang.dead && state.mawang.hp>0) foeSeeds.push([state.mawang.r,state.mawang.c]);
    for(const m of state.monsters) if(m.hp>0) foeSeeds.push([m.r,m.c]);
    v.fieldHero = villageField(foeSeeds);
  }

  // 함정 쿨다운
  for(const t of v.traps) if(t.cd>0) t.cd=Math.max(0, t.cd-dt);

  // 건물의 용사 생산
  for(const b of v.buildings){
    if(b.destroyed) continue;
    b.spawnCd -= dt;
    if(b.spawnCd<=0){
      b.spawnCd = b.spawnSec;
      villageSpawnHeroFrom(b);
    }
  }

  // 마왕 / 몬스터
  if(state.mawang && !state.mawang.dead && state.mawang.hp>0) villageAttackerTick(state.mawang, dt, true);
  for(const m of state.monsters) if(m.hp>0) villageAttackerTick(m, dt, false);
  // 용사
  for(const h of state.heroes) if(h.hp>0) villageHeroTick(h, dt);

  // 사망 처리
  state.monsters = state.monsters.filter(m=>{
    if(m.hp>0) return true;
    pushDeathFx(m.r,m.c,'#ff6873');
    if(Sound.cooldown && Sound.cooldown('vDeath',140)) Sound.death && Sound.death(); // v38.6
    // v38.7: 완전히 소멸시키지 않고 기록해 두었다가, 습격이 끝나면 일부를 던전으로 귀환시킵니다.
    if(!Array.isArray(v.fallen)) v.fallen=[];
    v.fallen.push(m);
    addLog('원정군 몬스터가 마을에서 쓰러졌습니다.');
    return false;
  });
  state.heroes = state.heroes.filter(h=>{
    if(h.hp>0) return true;
    pushDeathFx(h.r,h.c,'#e0495f');
    if(Sound.cooldown && Sound.cooldown('vDeath',140)) Sound.death && Sound.death(); // v38.6
    const g = Math.max(1, Math.round(h.reward||10));
    // 마을 습격 골드는 던전 복귀 시 한 번에 정산합니다.
    v.goldEarned += g; state.killCount++; v.heroesKilled++;
    if(h.killerMawang) mawangGainXp(14 + (h.level||1)*4, h);
    return false;
  });

  if(state.mawang && !state.mawang.dead && state.mawang.hp<=0){
    killMawang(state.mawang);
  }
  // v38.7: 성 파괴(대성공) / 목표 건물 달성(성공) / 그 외(실패)의 3단계로 판정합니다.
  if((!state.mawang || state.mawang.dead) && !state.monsters.length){
    const met=villageQuotaMet();
    addLog(met
      ? '<span class="hl-gold">⚔️ 원정군이 전멸했지만 목표 건물을 모두 불태웠습니다.</span>'
      : '<span class="hl-red">⚔️ 원정군이 전멸했습니다!</span>');
    endVillageRaid(met, met?'good':'fail'); return;
  }
  if(v.castle.destroyed){ endVillageRaid(true,'great'); return; }
  if(v.timer<=0){
    const met=villageQuotaMet();
    addLog(met
      ? '<span class="hl-gold">⏳ 시간 종료</span> — 목표를 달성한 원정군이 전리품을 챙겨 물러납니다.'
      : '<span class="hl-red">⏳ 시간 초과</span> — 용사들의 증원이 몰려옵니다.');
    endVillageRaid(met, met?'good':'fail'); return;
  }
}

/* ---------------- 렌더링 ---------------- */
function setVillageBackdrop(on){
  const bd = els.stageBackdrop || document.getElementById('stageBackdrop');
  if(bd){
    if(on){
      bd.dataset.prevBg = bd.style.backgroundImage||'';
      bd.style.backgroundImage='none';
      bd.style.background='radial-gradient(circle at 50% 22%, #2b3f5e 0%, #16223a 45%, #0d1426 100%)';
    } else {
      bd.style.background='';
      if(bd.dataset.prevBg!==undefined) bd.style.backgroundImage=bd.dataset.prevBg;
    }
  }
  const badge=document.getElementById('stageBadge');
  if(badge){
    if(on){
      badge.dataset.prevHtml = badge.innerHTML;
      badge.innerHTML = `<span class="sb-icon">🏘️</span><span class="sb-text">마을 습격<span class="sb-sub"> 용사들의 마을</span></span>`;
    } else if(badge.dataset.prevHtml){
      badge.innerHTML = badge.dataset.prevHtml;
    }
  }
}

function renderVillageCells(){
  if(!cellEls.length || !state || !state.village) return;
  const v=state.village;
  for(let r=0;r<VILLAGE_GRID;r++){
    for(let c=0;c<VILLAGE_GRID;c++){
      const el=cellEls[r]?.[c]; if(!el) continue;
      const t=state.grid[r][c];
      let cls='cell v-cell';
      if(t.type==='block'){
        cls+=' v-block';
        const ratio=t.blockMaxHp? t.blockHp/t.blockMaxHp : 1;
        if(ratio<=0.34) cls+=' v-crack3';
        else if(ratio<=0.67) cls+=' v-crack2';
        else if(ratio<1) cls+=' v-crack1';
      }
      else if(t.type==='building') cls+=' v-struct';
      else if(t.type==='castle') cls+=' v-struct v-castlecell';
      else cls+=' v-road';
      if(t.vtrap) cls+=' v-trap';
      if(el.className!==cls) el.className=cls;

      // 함정 아이콘
      let trapEl=el.querySelector('.v-trap-icon');
      if(t.vtrap){
        if(!trapEl){ trapEl=document.createElement('div'); trapEl.className='v-trap-icon'; el.appendChild(trapEl); }
        if(trapEl.textContent!==t.vtrap.icon) trapEl.textContent=t.vtrap.icon;
        trapEl.style.opacity = t.vtrap.cd>0 ? '.28' : '1';
      } else if(trapEl) trapEl.remove();

      // 구조물 스프라이트 (루트 칸에만)
      const isBuildRoot = t.type==='building' && t.vbRootR===r && t.vbRootC===c;
      const isCastleRoot = t.type==='castle' && t.vcRootR===r && t.vcRootC===c;
      let img=el.querySelector('.v-sprite');
      let bar=el.querySelector('.v-hp');
      if(isBuildRoot || isCastleRoot){
        const s = isCastleRoot ? v.castle : v.buildings.find(b=>b.r===r&&b.c===c);
        if(s){
          if(!img){ img=document.createElement('img'); img.className='v-sprite'; el.appendChild(img); }
          const src = isCastleRoot ? VILLAGE_SPRITES.castle : VILLAGE_SPRITES[s.sprite];
          if(img.getAttribute('src')!==src) img.setAttribute('src', src);
          img.classList.toggle('v-sprite-castle', !!isCastleRoot);
          img.classList.toggle('v-locked', !!isCastleRoot && villageCastleLocked());
          if(!bar){ bar=document.createElement('div'); bar.className='v-hp'; bar.innerHTML='<i></i>'; el.appendChild(bar); }
          bar.classList.toggle('v-hp-castle', !!isCastleRoot);
          const f=bar.querySelector('i');
          if(f) f.style.width=Math.max(0, Math.min(100, s.hp/s.maxHp*100))+'%';
        }
      } else {
        if(img) img.remove();
        if(bar) bar.remove();
      }
    }
  }
}

function renderVillageUI(){
  if(!state || !state.village) return;
  const v=state.village;
  els.hpBar.style.width=Math.max(0,state.throneHP/state.maxThroneHP*100)+'%';
  els.hpText.textContent=`${Math.max(0,Math.round(state.throneHP))}/${state.maxThroneHP}`;
  els.goldText.textContent=`${Math.floor(state.gold).toLocaleString()}G`;
  if(els.goldRateText) els.goldRateText.textContent=`약탈 +${Math.round(v.goldEarned)}G`;
  els.waveText.textContent='🏘️ 마을 습격';
  els.killCount.textContent=`처치 ${state.killCount}`;
  els.killStatText.textContent=`${state.killCount}명`;
  if(els.monsterCapText) els.monsterCapText.textContent=`원정 ${state.monsters.length}`;
  // v38.7: "전부 파괴"가 아니라 "목표 n채"를 명확히 보여줍니다.
  const quota=villageQuota();
  els.phaseLabel.textContent = villageCastleLocked() ? `목표 건물 ${quota}채` : '성을 파괴하라!';
  els.timerText.textContent = villageCastleLocked()
    ? `${Math.max(0,quota - v.destroyedBuildings)}채 남음 · ${fmtTime(v.timer)}`
    : `성 ${Math.max(0,Math.round(v.castle.hp/v.castle.maxHp*100))}% · ${fmtTime(v.timer)}`;
  els.phaseBtn.classList.add('locked');
  els.toolbar.classList.add('locked');

  renderVillageCells();
  if(els.rangeLayer && els.rangeLayer.childNodes.length) els.rangeLayer.innerHTML='';
  syncTokens();

  // 패널
  const now=performance.now();
  if(now-(state._vPanelAt||0) > 300){
    state._vPanelAt=now;
    renderVillagePanel();
  }
}

function renderVillagePanel(){
  if(!els.panelBox || !state || !state.village) return;
  const v=state.village;
  const rows = v.buildings.map(b=>{
    const pct = Math.max(0, Math.round(b.hp/b.maxHp*100));
    return `<div class="v-row ${b.destroyed?'done':''}">
      <span class="v-row-icon">${b.icon}</span>
      <span class="v-row-name">${b.name}</span>
      <span class="v-row-bar"><i style="width:${b.destroyed?0:pct}%"></i></span>
      <span class="v-row-pct">${b.destroyed?'파괴됨':pct+'%'}</span>
    </div>`;
  }).join('');
  const cpct=Math.max(0, Math.round(v.castle.hp/v.castle.maxHp*100));
  const quota=villageQuota();
  const met=villageQuotaMet();
  els.panelBox.innerHTML = `
    <h3>🏘️ 마을 습격</h3>
    <div class="panel-hint" style="margin-bottom:6px;">
      <b style="color:var(--gold)">목표: 건물 ${quota}채 파괴</b> → 성이 열립니다. 성까지 부수면 <b>대성공</b>입니다.<br>
      목표만 채워도 시간이 끝났을 때 <b>습격 성공</b>으로 정산됩니다. 블럭은 마왕과 몬스터만 부술 수 있습니다.
    </div>
    <div class="panel-hint" style="margin-bottom:8px;color:${met?'var(--gold)':'#c9c4d8'};">
      ${met ? '✅ 목표 달성! 이제 성을 노리세요.' : `건물 파괴 <b>${v.destroyedBuildings}/${quota}</b> (전체 ${v.totalBuildings}채)`}
    </div>
    <div class="v-panel-stats">
      <div><b>남은 시간</b><span>${fmtTime(v.timer)}</span></div>
      <div><b>원정군</b><span>${state.monsters.length}마리</span></div>
      <div><b>용사</b><span>${state.heroes.length}명</span></div>
      <div><b>약탈</b><span>${Math.round(v.goldEarned)}G</span></div>
    </div>
    <div class="v-rows">${rows}</div>
    <div class="v-row v-castle-row ${villageCastleLocked()?'locked':''}">
      <span class="v-row-icon">🏰</span>
      <span class="v-row-name">성 ${villageCastleLocked()?'<em>(보호 중)</em>':''}</span>
      <span class="v-row-bar"><i style="width:${v.castle.destroyed?0:cpct}%"></i></span>
      <span class="v-row-pct">${v.castle.destroyed?'파괴됨':cpct+'%'}</span>
    </div>
    <div class="panel-hint" style="margin-top:8px;">🩸 마을에서 쓰러진 원정군은 완전히 사라지지 않고, 결과 등급에 따라 <b>일부가 던전으로 퇴각 귀환</b>합니다.</div>`;
}

/* ---------------- 오버레이 ---------------- */
function ensureVillageOverlay(){
  let el=document.getElementById('villageOverlay');
  if(!el){
    el=document.createElement('div');
    el.id='villageOverlay';
    el.className='hidden';
    el.innerHTML='<div class="vo-box"><div class="vo-icon"></div><div class="vo-title"></div><div class="vo-sub"></div><div class="vo-stats"></div></div>';
    document.body.appendChild(el);
  }
  return el;
}
/* v38.6 · 마을 습격 전환 알림 토스트 */
let villageToastTimer=null;
function showVillageToast(icon,title,desc,kind,duration){
  const el=document.getElementById('villageToast');
  if(!el) return;
  el.classList.remove('hidden','vt-win','vt-lose','vt-prep');
  if(kind) el.classList.add('vt-'+kind);
  const ic=el.querySelector('.vt-icon'); if(ic) ic.textContent=icon||'🏘️';
  const ti=el.querySelector('.vt-title'); if(ti) ti.textContent=title||'';
  const de=el.querySelector('.vt-desc'); if(de) de.textContent=desc||'';
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  if(villageToastTimer) clearTimeout(villageToastTimer);
  villageToastTimer=setTimeout(()=>{ el.classList.remove('show'); villageToastTimer=null; }, Math.max(1200, duration||3000));
}

/* 오버레이(인트로/결과)는 하나를 돌려 쓰므로, 타이머 핸들을 공유해 서로를 지우지 않게 합니다. */
let villageOverlayTimer=null, villageOverlayHideTimer=null;
function hideVillageOverlay(){
  const el=document.getElementById('villageOverlay');
  if(villageOverlayTimer){ clearTimeout(villageOverlayTimer); villageOverlayTimer=null; }
  if(villageOverlayHideTimer){ clearTimeout(villageOverlayHideTimer); villageOverlayHideTimer=null; }
  if(!el) return;
  el.classList.remove('show');
  villageOverlayHideTimer=setTimeout(()=>{ el.classList.add('hidden'); villageOverlayHideTimer=null; }, 380);
}
function scheduleVillageOverlayHide(holdMs, done){
  if(villageOverlayTimer){ clearTimeout(villageOverlayTimer); villageOverlayTimer=null; }
  if(villageOverlayHideTimer){ clearTimeout(villageOverlayHideTimer); villageOverlayHideTimer=null; }
  const el=ensureVillageOverlay();
  villageOverlayTimer=setTimeout(()=>{
    villageOverlayTimer=null;
    el.classList.remove('show');
    villageOverlayHideTimer=setTimeout(()=>{ el.classList.add('hidden'); villageOverlayHideTimer=null; if(done) done(); }, 400);
  }, Math.max(400, holdMs));
}
function showVillageIntro(){
  const el=ensureVillageOverlay();
  el.querySelector('.vo-icon').textContent='🏘️';
  el.querySelector('.vo-title').textContent='마을 습격!';
  el.querySelector('.vo-sub').textContent='마왕과 원정군이 용사들의 마을에 도착했습니다.';
  el.querySelector('.vo-stats').innerHTML=
    `<div class="vo-hint">목표: 건물 <b>${villageQuota()}채</b> 파괴 → 성 개방<br>`+
    `목표만 채워도 <b>습격 성공</b>으로 정산됩니다.<br>`+
    `쓰러진 원정군 일부는 던전으로 퇴각 귀환합니다.</div>`;
  el.classList.remove('hidden');
  void el.offsetWidth;
  el.classList.add('show');
  // v38.6: 전투 정지 시간(VILLAGE_INTRO_SEC)보다 살짝 먼저 걷혀 맵을 보고 시작할 수 있게 합니다.
  scheduleVillageOverlayHide(Math.max(1200, VILLAGE_INTRO_SEC*1000-700));
}
function showVillageResult(v, success, done, holdMs){
  const el=ensureVillageOverlay();
  // v38.7: great / good / fail 3단계 결과 + 퇴각 귀환 수를 함께 보여줍니다.
  const tier = v.tier || (success?'great':'fail');
  const fallenN = (v.fallen||[]).length;
  const reviveN = Math.min(fallenN, Math.round(fallenN * villageReviveRatio(tier)));
  el.querySelector('.vo-icon').textContent = tier==='great'?'🔥':(tier==='good'?'🏘️':'🏰');
  el.querySelector('.vo-title').textContent = tier==='great'?'마을 함락!':(tier==='good'?'습격 성공!':'습격 실패');
  el.querySelector('.vo-sub').textContent =
    tier==='great' ? '성이 무너지고 마을은 불탔습니다.'
    : tier==='good' ? '목표 건물을 불태우고 전리품을 챙겼습니다.'
    : '원정군이 물러났습니다. 던전으로 복귀합니다.';
  el.querySelector('.vo-stats').innerHTML = `
    <div class="vo-grid">
      <div><b>파괴한 건물</b><span>${v.destroyedBuildings}/${v.totalBuildings} (목표 ${v.quota||1})</span></div>
      <div><b>처치한 용사</b><span>${v.heroesKilled}명</span></div>
      <div><b>약탈 골드</b><span>${Math.round(v.goldEarned)}G</span></div>
      <div><b>퇴각 귀환</b><span>${reviveN}/${fallenN}마리</span></div>
    </div>`;
  el.classList.remove('hidden');
  void el.offsetWidth;
  el.classList.add('show');
  scheduleVillageOverlayHide(holdMs!=null?holdMs:2400, done);
}

/* ---------------- 기존 시스템 후킹 ---------------- */
(function hookVillageRaid(){
  const _simulateStep = simulateStep;
  simulateStep = function(dt){
    if(state && state.phase==='village'){ return simulateVillageStep(dt); }
    return _simulateStep(dt);
  };

  const _renderUI = renderUI;
  renderUI = function(){
    if(state && state.phase==='village'){ return renderVillageUI(); }
    return _renderUI();
  };

  const _selectCell = selectCell;
  selectCell = function(r,c){
    if(state && state.phase==='village') return;
    return _selectCell(r,c);
  };

  function maybeStartVillage(){
    if(!state || state.gameOver) return false;
    if(state.wave<=0 || state.wave%10!==0) return false;
    if(state.lastVillageWave===state.wave) return false;
    const mwReady = state.mawang && !state.mawang.dead && state.mawang.hp>0;
    const aliveMonsters = state.monsters.filter(m=>m.hp>0).length;
    if(!mwReady && aliveMonsters<2){
      addLog('<span class="hl-red">🏘️ 마을 습격 취소</span> — 원정을 보낼 병력이 부족합니다.');
      return false;
    }
    state.lastVillageWave=state.wave;
    // v38.6: 곧바로 마을로 넘어가지 않고 준비 시간을 둡니다.
    //        페이즈는 'build'로 유지되므로 이 동안 몬스터/장애물을 그대로 배치할 수 있습니다.
    state.phase='build';
    state.villagePrepTimer=VILLAGE_PREP_SEC;
    // 기존 던전 보드와 장애물 이미지는 그대로 유지하고 UI 카운트다운만 갱신합니다.
    state._mapDirty=false; state._rangesDirty=false; state._panelDirty=true;
    showVillageToast('🏘️','마을 습격 준비!',`${VILLAGE_PREP_SEC}초 뒤 마을로 진격합니다 · 지금 몬스터를 더 생성해두세요!`,'prep',VILLAGE_PREP_SEC*1000);
    addLog(`<span class="hl-gold">🏘️ 마을 습격 예고</span> — <span class="hl-gold">${VILLAGE_PREP_SEC}초</span> 뒤 원정을 시작합니다. 그 전에 몬스터를 더 준비하세요!`);
    Sound.magic && Sound.magic('dark');
    renderUI();
    return true;
  }

  const _applyReward = applyReward;
  applyReward = function(type,id){
    const r=_applyReward(type,id);
    maybeStartVillage();
    return r;
  };

  const _applyCard = applyCard;
  applyCard = function(cardId){
    const r=_applyCard(cardId);
    maybeStartVillage();
    return r;
  };

  const _endGame = endGame;
  endGame = function(){
    // v38.6: 마을 습격 관련 예약 타이머/연출을 확실히 정리합니다.
    if(villageOutroTimer){ clearTimeout(villageOutroTimer); villageOutroTimer=null; }
    hideVillageOverlay();
    if(state) state.villagePrepTimer=null;
    if(state && state.phase==='village'){
      state.village=null;
      if(state.dungeonSave){
        const s=state.dungeonSave;
        GRID=s.GRID; CORE_R=s.CORE_R; CORE_C=s.CORE_C;
        if(Array.isArray(s.ENTRANCES)) ENTRANCES=s.ENTRANCES.map(e=>({...e}));
        state.grid=s.grid; state.heroes=s.heroes; state.monsters=s.monsters;
        state.dungeonSave=null;
      }
      state._villageReturnLock=false; state._villageEnding=false;
      state.fxEvents=[]; state.deathFx=[];
      setVillageBackdrop(false);
    }
    return _endGame();
  };
})();


buildMapDOM();
applyBoardSize();
renderMapCells();
renderStartMetaSummary();
syncTokenMoveDuration();
requestAnimationFrame(gameLoop);
