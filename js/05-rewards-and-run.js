"use strict";
const RUN_RELICS=[
{id:'relicTrapRevive',icon:'🪤',name:'불멸의 함정',rarity:'규칙 유물',desc:'용사가 함정을 부숴도, 함정이 미련을 버리지 못하고 되살아날 때가 있습니다.',effect:'함정 파괴 시 30% 확률로 파괴되지 않고 내구도 그대로 유지',apply(){state.relics.push('relicTrapRevive');state.relicTrapReviveChance=0.30;}},
{id:'relicCorpseRevive',icon:'💀',name:'되살아나는 군세',rarity:'규칙 유물',desc:'죽음은 끝이 아닙니다. 쓰러진 몬스터가 이따금 해골이 되어 다시 일어섭니다.',effect:'몬스터가 전사할 때 18% 확률로 그 자리에 해골 궁수 소환',apply(){state.relics.push('relicCorpseRevive');state.relicCorpseReviveChance=0.18;}},
{id:'relicRavenousTrap',icon:'🩸',name:'탐식의 함정',rarity:'규칙 유물',desc:'함정에 걸려든 용사는 유품마저 남기지 못합니다.',effect:'함정에 처치당한 용사는 골드 +12 추가 지급',apply(){state.relics.push('relicRavenousTrap');state.relicTrapKillGold=12;}},
{id:'relicSymbiosis',icon:'🔗',name:'공생의 사슬',rarity:'규칙 유물',desc:'인접한 몬스터들이 서로의 생명력을 나눠 가지며 전선을 유지합니다.',effect:'매초 인접한 몬스터끼리 체력 일부를 나눠 회복',apply(){state.relics.push('relicSymbiosis');state.relicSymbioticChain=true;}},
{id:'relicVeteran',icon:'🎖️',name:'노련한 처형자',rarity:'규칙 유물',desc:'15번의 처치를 넘긴 몬스터는 더 이상 평범한 병사가 아닙니다.',effect:'15킬을 달성한 몬스터는 영구히 공격력 +20% · 최대HP +15%',apply(){state.relics.push('relicVeteran');state.relicVeteranExecutioner=true;}},
{id:'relicRecoilingWall',icon:'🧱',name:'역류하는 벽',rarity:'규칙 유물',desc:'바리케이드는 무너지는 순간까지 침입자를 물어뜯습니다.',effect:'바리케이드가 파괴될 때 파괴한 용사에게 반격 피해',apply(){state.relics.push('relicRecoilingWall');state.relicRecoilingWall=true;}},
{id:'relicSmugglersEye',icon:'🕵️',name:'밀수업자의 눈',rarity:'규칙 유물',desc:'뒷골목의 연줄이 소환 비용을 이따금 반값으로 깎아줍니다.',effect:'몬스터 소환 시 25% 확률로 비용 50% 할인',apply(){state.relics.push('relicSmugglersEye');state.relicSmugglersEye=true;}},
{id:'relicMarksman',icon:'🏹',name:'저격수의 표식',rarity:'규칙 유물',desc:'원거리 몬스터가 확인 사살에 성공하면, 무기를 재정비할 틈도 없이 다음 화살을 겨눕니다.',effect:'원거리 몬스터가 처치 시 25% 확률로 공격 쿨다운 즉시 초기화',apply(){state.relics.push('relicMarksman');state.relicMarksmanMark=true;}},
{id:'relicCoreBastion',icon:'🏯',name:'핵의 방벽',rarity:'규칙 유물',desc:'핵 주위에 드리운 보이지 않는 방벽이 이따금 공격을 완전히 막아냅니다.',effect:'핵이 피해를 받을 때 5% 확률로 해당 공격 완전 무효화',apply(){state.relics.push('relicCoreBastion');state.relicCoreBastion=true;}},
{id:'relicLastStand',icon:'🌪️',name:'최후의 저항',rarity:'규칙 유물',desc:'핵이 위태로워지는 순간, 몬스터들이 광기에 가까운 힘으로 각성합니다.',effect:'핵 체력이 30% 이하로 떨어지면 이후 몬스터 공격력 영구 +25% (판당 1회)',apply(){state.relics.push('relicLastStand');state.relicLastStand=true;}},
{id:'relicSniperLegion',icon:'🏹',name:'저격 군단의 표식',rarity:'아키타입 유물',desc:'사거리 2 이상인 몬스터를 3마리 이상 운용하면, 이들은 더 이상 개별 사수가 아니라 하나의 화망이 됩니다.',effect:'[조건: 원거리 몬스터 3마리+] 같은 용사를 2마리 이상이 동시에 조준 중이면, 그 용사는 체력 25% 이하일 때 다음 피격에 즉시 처형',apply(){state.relics.push('relicSniperLegion');state.relicSniperLegion=true;}},
{id:'relicGlacialPrison',icon:'🧊',name:'빙하 감옥',rarity:'아키타입 유물',desc:'빙판과 거미둥지를 3개 이상 운용하면 제어 지대가 더 끈끈해집니다.',effect:'[조건: 빙판/거미둥지 3개+] 두 장애물의 이동속도 감소 효과가 추가로 6%p 강화',apply(){state.relics.push('relicGlacialPrison');state.relicGlacialPrison=true;}},
{id:'relicPackFury',icon:'🐺',name:'광란의 무리',rarity:'아키타입 유물',desc:'몬스터 6마리 이상의 대군을 이끌면, 동료의 죽음이 슬픔이 아니라 분노가 됩니다.',effect:'[조건: 생존 몬스터 6마리+] 몬스터가 전사할 때마다 반경 2칸 동료 전원 4초간 공격력 +40%(갱신형)',apply(){state.relics.push('relicPackFury');state.relicPackFury=true;}},
{id:'relicUnbrokenLine',icon:'🧱',name:'불패의 전선',rarity:'아키타입 유물',desc:'수호형 몬스터 2마리와 방어 시설을 함께 두면, 최전선이 곧 핵의 두 번째 심장이 됩니다.',effect:'[조건: 탱커/수호형 몬스터 2마리+ · 방어 시설(바리케이드/석상) 1개+] 탱커가 용사를 타격할 때마다 핵 체력 +1 회복',apply(){state.relics.push('relicUnbrokenLine');state.relicUnbrokenLine=true;}},
{id:'relicPlagueZone',icon:'☠️',name:'역병 지대',rarity:'아키타입 유물',desc:'독늪과 저주 함정을 3개 이상 퍼뜨리면, 던전 자체가 역병의 진원지가 됩니다.',effect:'[조건: 독늪/저주 함정 합계 3개+] 중독·저주 상태로 죽은 용사는 폭발해 인접 용사에게 중독·저주를 전염',apply(){state.relics.push('relicPlagueZone');state.relicPlagueZone=true;}},
{id:'relicChainBlast',icon:'💥',name:'연쇄 폭발',rarity:'아키타입 유물',desc:'직격형 함정 3개를 서로 가까이 배치하면, 하나가 터질 때 이웃도 함께 무너집니다.',effect:'[조건: 스파이크/화염/번개 함정 합계 3개+] 직격형 함정 발동 시 반경 2칸의 다른 직격형 함정도 자동 발동',apply(){state.relics.push('relicChainBlast');state.relicChainBlast=true;}},
{id:'relicBerserkCult',icon:'🩸',name:'광전사 결사',rarity:'아키타입 유물',desc:'광폭 몬스터 둘 이상을 함께 풀어두면, 분노는 전염병처럼 번집니다.',effect:'[조건: 광폭(rage) 몬스터 2마리+] 한 마리가 격노(체력 50%↓)하면 다른 광폭 몬스터 전원도 즉시 함께 격노',apply(){state.relics.push('relicBerserkCult');state.relicBerserkCult=true;}},
{id:'relicShadowExec',icon:'🗡️',name:'그림자 처형단',rarity:'아키타입 유물',desc:'즉사형 몬스터를 다수의 동료와 함께 두면, 그림자 속에서 확인 사살을 노립니다.',effect:'[조건: 즉사(execute) 몬스터 1마리+ · 생존 몬스터 3마리+] 다른 몬스터가 용사를 체력 25% 이하로 깎으면 처형자가 즉시 암살',apply(){state.relics.push('relicShadowExec');state.relicShadowExec=true;}},
{id:'relicSanctuary',icon:'🩹',name:'수호 성소',rarity:'아키타입 유물',desc:'힐러와 여러 몬스터가 함께하는 진형은, 죽음의 문턱에서도 서로를 지킵니다.',effect:'[조건: 힐러형 몬스터 1마리+ · 생존 몬스터 3마리+] 힐러 범위 안 몬스터가 체력 10% 이하로 피격되면 힐러가 체력을 나눠줘 1회 구조',apply(){state.relics.push('relicSanctuary');state.relicSanctuary=true;}},
{id:'relicPitMaze',icon:'🕳️',name:'함정의 미궁',rarity:'아키타입 유물',desc:'심연구덩이 2개 이상을 운용하면 보스조차 심연의 충격을 버티기 어려워집니다.',effect:'[조건: 심연구덩이 2개+] 구덩이에 밀린 보스가 받는 최대HP 비례 피해 +6%p',apply(){state.relics.push('relicPitMaze');state.relicPitMaze=true;}},
{id:'relicAuraResonance',icon:'🏛️',name:'오라 공명',rarity:'아키타입 유물',desc:'수호 석상과 저주 토템을 함께 두면, 두 오라가 공명해 던전 전체를 지탱합니다.',effect:'[조건: 수호 석상 1개+ · 저주 토템 1개+] 용사를 처치할 때마다 반경 2칸 몬스터 전원이 소량 회복',apply(){state.relics.push('relicAuraResonance');state.relicAuraResonance=true;}},
{id:'relicMazeArchitect',icon:'⛏️',name:'미궁 건축가',rarity:'아키타입 유물',desc:'통로를 40칸 이상 파고 막다른 길을 여럿 만들면, 던전 자체가 설계된 함정이 됩니다.',effect:'[조건: 개척한 통로 40칸+ · 막다른 길 3개+] 막다른 길에 갇힌 용사는 공격력이 감소',apply(){state.relics.push('relicMazeArchitect');state.relicMazeArchitect=true;}},
{id:'relicGoldMerc',icon:'💰',name:'황금 용병단',rarity:'아키타입 유물',desc:'값비싼 몬스터를 500G 이상 투자해 배치하면, 그들은 죽어서도 값어치를 합니다.',effect:'[조건: 배치 몬스터 총 투자 골드 500G+] 몬스터가 전사하면 투자 골드의 일부를 즉시 환급',apply(){state.relics.push('relicGoldMerc');state.relicGoldMerc=true;}},
{id:'relicFireCurse',icon:'🔥',name:'화염 저주 결계',rarity:'아키타입 유물',desc:'용암과 저주를 함께 두면 저주받은 용사가 용암을 더 버티기 어려워집니다.',effect:'[조건: 용암지대 1개+ · 저주 토템 1개+] 저주 걸린 용사가 용암지대 위에 있으면 용암 지속 피해 +25%',apply(){state.relics.push('relicFireCurse');state.relicFireCurse=true;}},
{id:'relicUndeadPact',icon:'🧛',name:'불사의 계약',rarity:'아키타입 유물',desc:'흡혈귀와 힐러를 함께 두면, 죽음조차 계약으로 미룰 수 있습니다.',effect:'[조건: 흡혈형 몬스터 1마리+ · 힐러형 몬스터 1마리+] 흡혈 몬스터가 죽기 직전 근처에 힐러가 있으면 체력 1로 되살아남(몬스터별 판당 1회)',apply(){state.relics.push('relicUndeadPact');state.relicUndeadPact=true;}}
];
const RUN_CONTRACTS=[
{id:'contractSilence',icon:'⛓️',name:'침묵의 맹약',rarity:'제약 계약',desc:'함정에 의존하지 않고 순수하게 몬스터만으로 맞서 싸우겠다는 서약입니다.',effect:'다음 2웨이브 새 함정 설치 불가 · 이번 판 몬스터 공격력 영구 +25%',apply(){state.contracts.push('silence');state.contractNoObstacleWaves=2;state.globalMonsterAtkMul=(state.globalMonsterAtkMul||1)*1.25;addLog('<span class="hl-red">⛓️ 침묵의 맹약</span>을 체결했습니다.');}},
{id:'contractIsolation',icon:'🚫',name:'고립의 맹약',rarity:'제약 계약',desc:'지원군 없이, 지금 가진 힘만으로 한 번의 웨이브를 버텨내야 합니다.',effect:'다음 1웨이브 몬스터 신규 소환 불가 · 이번 판 최종 영혼 정산 ×2',apply(){state.contracts.push('isolation');state.contractNoSummonWaves=1;state.contractSoulMul=(state.contractSoulMul||1)*2;addLog('<span class="hl-red">🚫 고립의 맹약</span>을 체결했습니다.');}},
{id:'contractBerserk',icon:'💢',name:'폭주의 맹약',rarity:'제약 계약',desc:'방어를 포기하고 순수한 파괴력에 모든 것을 겁니다. 되돌릴 수 없습니다.',effect:'이번 판 몬스터 공격력 영구 +35% · 몬스터 최대HP 영구 -20%(즉시 적용)',apply(){state.contracts.push('berserk');state.globalMonsterAtkMul=(state.globalMonsterAtkMul||1)*1.35;state.globalMonsterHpMul=(state.globalMonsterHpMul||1)*0.8;state.monsters.forEach(m=>{m.maxHp=Math.round(m.maxHp*0.8);m.hp=Math.min(m.maxHp,m.hp);});addLog('<span class="hl-red">💢 폭주의 맹약</span> — 몬스터들이 사납고 연약해졌습니다.');}},
{id:'contractCursed',icon:'🌑',name:'저주받은 맹약',rarity:'제약 계약',desc:'핵의 자기 회복 능력을 완전히 봉인하는 대가로 압도적인 힘을 얻습니다.',effect:'이번 판 핵 자동 회복 영구 정지 · 몬스터 공격력 영구 +40%',apply(){state.contracts.push('cursed');state.permaNoCoreHeal=true;state.globalMonsterAtkMul=(state.globalMonsterAtkMul||1)*1.40;addLog('<span class="hl-red">🌑 저주받은 맹약</span> — 핵은 더 이상 스스로 회복하지 않습니다.');}},
{id:'contractAmbition',icon:'🏴',name:'야심가의 맹약',rarity:'위험 계약',desc:'더 많은 용사를 끌어들이는 대가로 막대한 보상을 노립니다.',effect:'다음 3웨이브 용사 +35% · 해당 웨이브 클리어 보상 골드 ×2.2',apply(){state.contracts.push('ambition');state.contractHeroRiskWaves=3;state.contractHeroRiskMul=1.35;state.contractRewardMul=2.2;state.contractRewardWaves=3;addLog('<span class="hl-red">🏴 야심가의 맹약</span>을 체결했습니다.');}},
{id:'contractEliteSummon',icon:'🗝️',name:'정예 소환 맹약',rarity:'투자 계약',desc:'값싼 물량 대신, 비싸지만 확실한 정예를 키워내는 계약입니다.',effect:'다음 2웨이브 몬스터 소환 비용 ×3, 대신 소환된 몬스터는 영구 공격력 +30%',apply(){state.contracts.push('eliteSummon');state.contractExpensiveStrongWaves=2;state.contractExpensiveStrongAtkMul=1.30;addLog('<span class="hl-red">🗝️ 정예 소환 맹약</span>을 체결했습니다.');}},
{id:'contractBloodOath',icon:'🩸',name:'혈맹의 계약',rarity:'아키타입 계약',desc:'적은 병력으로도 아키타입의 위력을 끌어내는 대신, 몬스터들의 몸은 그만큼 약해집니다.',effect:'보유한 아키타입 유물의 발동 조건 영구 -1 · 몬스터 최대HP 영구 -15%(즉시 적용)',apply(){state.contracts.push('bloodOath');state.archetypeThresholdCut=(state.archetypeThresholdCut||0)+1;state.globalMonsterHpMul=(state.globalMonsterHpMul||1)*0.85;state.monsters.forEach(m=>{m.maxHp=Math.round(m.maxHp*0.85);m.hp=Math.min(m.maxHp,m.hp);});addLog('<span class="hl-red">🩸 혈맹의 계약</span> — 아키타입 발동 조건이 완화되었습니다.');}}
];
// 5웨이브 보상 UI는 서사 설명보다 선택 결과를 즉시 읽을 수 있도록 별도 표시 문구를 사용합니다.
// 실제 아이템 이름/효과 데이터와 apply() 로직은 건드리지 않으므로 게임 밸런스와 로그는 그대로 유지됩니다.
const REWARD_UI_COPY={
  // 전술 카드
  rcRepair:{name:'함정 전체 수리',effect:'모든 함정 내구도 100% 회복'},
  rcAmbush:{name:'강화 몬스터 1마리',effect:'2단계 몬스터 1마리 무료 즉시 소환'},
  rcReflect:{name:'핵 피해 30% 반사',effect:'다음 1웨이브 · 핵이 받은 피해 30%를 공격자에게 반사'},
  rcOverload:{name:'함정 범위 +1',effect:'다음 1웨이브 · 모든 함정 효과 범위 +1'},
  rcLootRaid:{name:'120G + 소환비 할인',effect:'즉시 +120G · 다음 1웨이브 몬스터 소환 비용 -25%'},
  rcNecroCall:{name:'해골 2마리 소환',effect:'해골 궁수 1 + 해골 수호기사 1 무료 소환'},
  rcTotalWar:{name:'몬스터 한도 +4',effect:'다음 1웨이브 · 몬스터 생성 제한 +4'},
  rcSoulPact:{name:'영혼 +15',effect:'이번 판 종료 시 영혼 +15'},

  // 규칙/아키타입 유물
  relicTrapRevive:{name:'함정 파괴 30% 무효',effect:'함정 파괴 시 30% 확률로 내구도 그대로 생존'},
  relicCorpseRevive:{name:'전사 시 해골 18%',effect:'몬스터 전사 시 18% 확률로 해골 궁수 소환'},
  relicRavenousTrap:{name:'함정 처치 +12G',effect:'함정으로 용사 처치 시 골드 +12'},
  relicSymbiosis:{name:'인접 몬스터 회복',effect:'서로 붙어 있는 몬스터끼리 매초 체력 회복'},
  relicVeteran:{name:'15킬 몬스터 강화',effect:'15킬 달성 몬스터 · 공격력 +20% · 최대HP +15%'},
  relicRecoilingWall:{name:'바리케이드 파괴 반격',effect:'바리케이드 파괴 시 파괴한 용사에게 반격 피해'},
  relicSmugglersEye:{name:'소환비 반값 25%',effect:'몬스터 소환 시 25% 확률로 비용 50% 할인'},
  relicMarksman:{name:'원거리 연속 공격',effect:'원거리 몬스터 처치 시 25% 확률로 공격 쿨다운 즉시 초기화'},
  relicCoreBastion:{name:'핵 피해 5% 무효',effect:'핵 피격 시 5% 확률로 해당 공격 완전 무효'},
  relicLastStand:{name:'위기 시 공격력 +25%',effect:'핵 HP 30% 이하 도달 시 몬스터 공격력 +25% (판당 1회)'},
  relicSniperLegion:{name:'원거리 집중 처형',effect:'조건: 원거리 3+ · 2명 이상 집중사격 → HP 25% 이하 적 다음 피격에 처형'},
  relicGlacialPrison:{name:'빙판·거미둥지 감속 강화',effect:'조건: 빙판/거미둥지 3+ · 이동속도 감소 효과 +6%p'},
  relicPackFury:{name:'동료 전사 시 광분',effect:'조건: 생존 몬스터 6+ · 전사 발생 시 주변 동료 4초간 공격력 +40%'},
  relicUnbrokenLine:{name:'탱커 공격 시 핵 회복',effect:'조건: 탱커 2+ · 방어시설 1+ · 탱커가 공격할 때 핵 HP +1'},
  relicPlagueZone:{name:'독·저주 사망 전염',effect:'조건: 독늪/저주 함정 3+ · 상태이상으로 죽은 용사가 주변에 독·저주 전염'},
  relicChainBlast:{name:'직격 함정 연쇄 발동',effect:'조건: 직격 함정 3+ · 발동 시 반경 2칸 다른 직격 함정도 발동'},
  relicBerserkCult:{name:'광폭 몬스터 동시 격노',effect:'조건: 광폭 몬스터 2+ · 한 마리 격노 시 전원 즉시 격노'},
  relicShadowExec:{name:'저체력 적 즉시 암살',effect:'조건: 처형 몬스터 1+ · 생존 3+ · 적 HP 25% 이하가 되면 즉시 암살'},
  relicSanctuary:{name:'힐러 긴급 구조',effect:'조건: 힐러 1+ · 생존 3+ · 힐러 범위 내 아군이 HP 10% 이하 피격 시 1회 구조'},
  relicPitMaze:{name:'구덩이 보스 피해 강화',effect:'조건: 심연구덩이 2+ · 밀려난 보스 최대HP 비례 피해 +6%p'},
  relicAuraResonance:{name:'처치 시 주변 회복',effect:'조건: 수호 석상 1+ · 저주 토템 1+ · 용사 처치 시 주변 몬스터 회복'},
  relicMazeArchitect:{name:'막다른 길 적 약화',effect:'조건: 통로 40칸+ · 막다른 길 3+ · 막다른 길의 용사 공격력 감소'},
  relicGoldMerc:{name:'몬스터 사망 시 골드 환급',effect:'조건: 몬스터 투자 500G+ · 몬스터 전사 시 투자 골드 일부 환급'},
  relicFireCurse:{name:'저주 + 용암 피해 강화',effect:'조건: 용암 1+ · 저주 토템 1+ · 저주 걸린 적의 용암 피해 +25%'},
  relicUndeadPact:{name:'흡혈 몬스터 1회 생존',effect:'조건: 흡혈 1+ · 힐러 1+ · 근처 힐러가 있으면 죽기 직전 HP 1로 1회 생존'},

  // 계약: 이득과 제약을 제목에서 바로 읽을 수 있게 표시
  contractSilence:{name:'공격력 +25% · 함정 금지',effect:'몬스터 공격력 +25% 영구 · 다음 2웨이브 새 함정 설치 불가'},
  contractIsolation:{name:'영혼 ×2 · 소환 금지',effect:'최종 영혼 ×2 · 다음 1웨이브 새 몬스터 소환 불가'},
  contractBerserk:{name:'공격력 +35% · HP -20%',effect:'몬스터 공격력 +35% 영구 · 최대HP -20% 영구'},
  contractCursed:{name:'공격력 +40% · 핵 회복 정지',effect:'몬스터 공격력 +40% 영구 · 핵 자동 회복 영구 정지'},
  contractAmbition:{name:'보상 ×2.2 · 용사 +35%',effect:'다음 3웨이브 용사 수 +35% · 해당 웨이브 보상 골드 ×2.2'},
  contractEliteSummon:{name:'정예 소환 · 비용 ×3',effect:'다음 2웨이브 소환 비용 ×3 · 그때 소환된 몬스터 공격력 +30% 영구'},
  contractBloodOath:{name:'아키타입 조건 -1 · HP -15%',effect:'아키타입 유물 발동 조건 -1 영구 · 몬스터 최대HP -15% 영구'}
};
function rewardUiCopy(item){
  const simple=REWARD_UI_COPY[item.id];
  return simple||{name:item.name,effect:item.effect||item.desc||''};
}
const REWARD_UI_BAD_PARTS={
  contractSilence:[1],
  contractIsolation:[1],
  contractBerserk:[1],
  contractCursed:[1],
  contractAmbition:[0],
  contractEliteSummon:[0],
  contractBloodOath:[1]
};
const REWARD_UI_CONDITION_IDS=new Set([
  'relicSniperLegion','relicGlacialPrison','relicPackFury','relicUnbrokenLine',
  'relicPlagueZone','relicChainBlast','relicBerserkCult','relicShadowExec',
  'relicSanctuary','relicPitMaze','relicAuraResonance','relicMazeArchitect',
  'relicGoldMerc','relicFireCurse','relicUndeadPact'
]);
function rewardEffectHtml(item,copy){
  const effect=String(copy.effect||'');
  const parts=effect.split(/\s+\u00b7\s+/).filter(Boolean);
  if(!parts.length)return '';
  const badParts=new Set(REWARD_UI_BAD_PARTS[item.id]||[]);
  const conditionMode=REWARD_UI_CONDITION_IDS.has(item.id);
  return parts.map((part,index)=>{
    let tone='good';
    if(badParts.has(index))tone='bad';
    else if(conditionMode&&index<parts.length-1)tone='neutral';
    const icon=tone==='good'?'&#9650;':tone==='bad'?'&#9660;':'&#9679;';
    return `<div class="rc-effect-line rc-${tone}"><span class="rc-effect-mark">${icon}</span><span>${part}</span></div>`;
  }).join('');
}
function rewardChoiceHtml(item,typeClass,typeLabel){
  const kind=typeClass==='card-type'?'🃏':typeClass==='relic-type'?'💠':'☠️';
  const copy=rewardUiCopy(item);
  return `<div class="reward-choice reward-choice-simple ${typeClass}" data-reward-type="${typeLabel}" data-reward-id="${item.id}"><div class="rc-head"><span class="rc-kind">${kind} ${typeLabel}</span><span class="rc-rarity">${item.rarity||''}</span></div><div class="rc-icon">${item.icon}</div><div class="rc-name">${copy.name}</div>${item.tag?`<div class="rc-tag">🔗 ${item.tag.toUpperCase()} 빌드 연계</div>`:''}<div class="rc-effect rc-effect-simple">${rewardEffectHtml(item,copy)}</div><div class="rc-arrow">선택하기 ›</div></div>`;
}
function openRewardSelect(){
  if(!state||!els.cardOverlay)return;
  state.phase='cardSelect';
  state.rewardChoicesTaken=(state.rewardChoicesTaken||0)+1;
  if(els.rewardWaveLabel)els.rewardWaveLabel.textContent=`WAVE ${state.wave}`;

  // 5웨이브 보상은 '무엇을 선택하느냐'가 핵심이므로 카드 2장 + 유물 1개 + 계약 1개로 선택지를 늘립니다.
  // 유물은 이미 보유한 항목을 우선 제외하고, 카드 2장은 현재 빌드의 중복 쏠림을 피하도록 일반 카드 선택 로직을 재사용합니다.
  const pool=[...RUN_REWARD_CARDS];
  const cardWeight=(c)=>{
    const tagCount=c.tag?buildTagCount(c.tag):0;
    let diversity=1;
    if(c.tag&&tagCount===0) diversity=1.35;
    else if(c.tag&&tagCount===1) diversity=1.1;
    else if(c.tag&&tagCount===2) diversity=.82;
    else if(c.tag&&tagCount>=3) diversity=.52;
    return diversity*((c.rarity==='전설'||c.rarity==='고대'||c.rarity==='빌드')?(1+metaLuck()*2):1);
  };
  const cards=[];
  while(cards.length<2&&pool.length){
    const total=pool.reduce((a,x)=>a+cardWeight(x),0);
    let roll=Math.random()*total,idx=0;
    for(;idx<pool.length;idx++){roll-=cardWeight(pool[idx]);if(roll<=0)break;}
    cards.push(pool.splice(Math.min(idx,pool.length-1),1)[0]);
  }
  const relicPool=RUN_RELICS.filter(x=>!(state.relics||[]).includes(x.id));
  const relic=(relicPool.length?relicPool:RUN_RELICS)[Math.floor(Math.random()*(relicPool.length?relicPool.length:RUN_RELICS.length))];
  const contract=RUN_CONTRACTS[Math.floor(Math.random()*RUN_CONTRACTS.length)];
  els.rewardChoices.innerHTML=cards.map(c=>rewardChoiceHtml(c,'card-type','카드')).join('')+rewardChoiceHtml(relic,'relic-type','유물')+rewardChoiceHtml(contract,'contract-type','계약');
  els.rewardChoices.querySelectorAll('.reward-choice').forEach(el=>el.addEventListener('click',()=>{
    if(cardApplying)return;
    els.rewardChoices.querySelectorAll('.reward-choice').forEach(x=>{x.style.pointerEvents='none';x.style.opacity=x===el?'1':'.35';});
    Sound.ui();applyReward(el.dataset.rewardType,el.dataset.rewardId);
  },{once:true}));
  els.cardOverlay.classList.remove('hidden');renderUI();
}
function applyReward(type,id){if(cardApplying||!state||state.gameOver||state.phase!=='cardSelect')return;cardApplying=true;try{const pool=type==='카드'?RUN_REWARD_CARDS:type==='유물'?RUN_RELICS:RUN_CONTRACTS;const item=pool.find(x=>x.id===id);if(!item)throw new Error('unknown reward '+id);item.apply();addLog(`<span class="hl-gold">${type} 선택:</span> ${item.name}`);els.cardOverlay.classList.add('hidden');state.phase='build';const nextBuildBonus=Math.max(0,state.buildTimeBonus||0);state.buildTimeBonus=0;state.buildTimer=Math.max(12,buildTimeForWave(state.wave)-nextBuildBonus);renderUI();}catch(err){console.error('[Reward]',err);if(els.cardOverlay)els.cardOverlay.classList.add('hidden');state.phase='build';state.buildTimer=buildTimeForWave(state.wave);try{renderUI();}catch(_){}}finally{cardApplying=false;}}

function openCardSelect(){
  const pool=[...CARD_TYPES,...V18_BUILD_CARDS];
  const luck=metaLuck();
  const picks=[];
  const weightOf=(c)=>{
    const tagCount=c.tag?buildTagCount(c.tag):0;
    let buildFlow=1;
    if(c.tag){
      // 첫 빌드는 다양성을 확보하고, 같은 태그가 3개 이상 누적되면 과도한 중복을 강하게 억제합니다.
      if(tagCount===0) buildFlow=1.40;
      else if(tagCount===1) buildFlow=1.12;
      else if(tagCount===2) buildFlow=0.80;
      else buildFlow=0.50;
    }
    const comboPartner=(c.tag&&BUILD_COMBOS.some(x=>((x.a===c.tag&&x.b&&buildTagCount(x.b)>0)||(x.b===c.tag&&x.a&&buildTagCount(x.a)>0))))?1.22:1;
    const rareBoost=(c.rarity==='전설'||c.rarity==='고대'||c.rarity==='빌드')?(1+luck*2.2):1;
    return buildFlow*comboPartner*rareBoost;
  };
  while(picks.length<3 && pool.length){
    const total=pool.reduce((a,x)=>a+weightOf(x),0); let roll=Math.random()*total, i=0;
    for(;i<pool.length;i++){ roll-=weightOf(pool[i]); if(roll<=0) break; }
    picks.push(pool.splice(Math.min(i,pool.length-1),1)[0]);
  }
  els.cardChoices.innerHTML='';
  picks.forEach(card=>{
    const el=document.createElement('div');
    el.className='card-choice '+(card.cls||''); const synergyHint=card.tag&&activeBuildCombos().some(x=>x.a===card.tag||x.b===card.tag)?' <span style=\"color:#8de0b5;font-size:11px;\">🔗 현재 빌드 연계</span>':'';
    el.innerHTML=`<div class="cc-icon">${card.icon}</div><div class="cc-rarity">${card.rarity||'카드'}</div><div class="cc-info"><b>${card.name}</b>${synergyHint}<div>${card.desc}</div></div>`;
    el.addEventListener('click',()=>{ if(el.dataset.picked==='1' || cardApplying) return; el.dataset.picked='1'; els.cardChoices.querySelectorAll('.card-choice').forEach(x=>x.style.pointerEvents='none'); applyCard(card.id); });
    els.cardChoices.appendChild(el);
  });
  els.cardOverlay.classList.remove('hidden');
}

let cardApplying=false;
function applyCard(cardId){
  if(cardApplying || !state || state.gameOver || state.phase!=='cardSelect') return;
  cardApplying=true;
  try{
  if(cardId==='goldPerSec'){
    state.goldPerSec=(state.goldPerSec||0)+1;
    addLog(`<span class="hl-gold">황금의 흐름!</span> 이제 초당 골드 +${state.goldPerSec}G를 얻습니다.`);
  } else if(cardId==='upgrade'){
    let count=0;
    state.monsters.forEach(m=>{ if(m.tier<MAX_TIER){ recalcMonsterTier(m, m.tier+1); count++; } });
    addLog(`<span class="hl-gold">몬스터 강화!</span> ${count}마리가 1단계 강화되었습니다.`);
  } else if(cardId==='newMonster'){
    const locked=MONSTER_TYPES.filter(x=>x.cardOnly&&!(state.unlockedMonsterIds||[]).includes(x.id));
    if(locked.length){
      // 웨이브가 진행될수록 더 비싸고(=강한) 몬스터가 뽑힐 확률이 높아집니다.
      // 목표 비용을 현재 웨이브에 맞춰 정하고, 그 근처 비용의 몬스터일수록 가중치를 높게 줍니다.
      const wave=state.wave||1;
      const targetCost=Math.min(280, 30+wave*14);
      const weights=locked.map(x=>1/(1+Math.abs(x.cost-targetCost)/35));
      const totalW=weights.reduce((a,b)=>a+b,0);
      let r=Math.random()*totalW, idx=0;
      for(let i=0;i<locked.length;i++){ r-=weights[i]; if(r<=0){ idx=i; break; } }
      const base=locked[idx];
      state.unlockedMonsterIds.push(base.id);
      permanentlyUnlockMonster(base.id);
      const spot=findRandomEmptyFloor();
      if(spot){
        const cap=state.monsterCap||MONSTER_CAP_START;
        if(state.monsters.length<cap){
          // 비싼(강한) 몬스터일수록 처음부터 더 높은 단계로 합류해 웨이브 난이도를 따라갑니다.
          const startTier=Math.max(2,Math.min(6,2+Math.floor(base.cost/70)));
          createMonsterEntity(spot[0],spot[1],base.id,{tier:startTier,invested:0,playSound:true,log:false});
        }
      }
      addLog(`<span class="hl-gold">${base.name}</span>을 새로 발견했습니다! 이제 몬스터 목록에서 소환할 수 있습니다.`);
    } else { addGold(60); addLog('새로운 고급 몬스터를 모두 발견했습니다. 대신 보너스 골드 60G를 획득했습니다.'); }
  } else if(cardId==='freeobst'){
    const spot=findRandomEmptyFloor();
    if(spot){
      const strong=['statue','barricade','poison'];
      const obId=strong[Math.floor(Math.random()*strong.length)];
      const made=placeObstacle(spot[0],spot[1],obId,true);
      const ob=OBSTACLE_TYPES.find(x=>x.id===obId);
      if(made) addLog(`<span class="hl-gold">${ob.name}</span>이(가) 무료로 설치되었습니다!`);
    }
  } else if(cardId==='coreFortify'){
    state.maxThroneHP+=25; state.throneHP=Math.min(state.maxThroneHP,state.throneHP+25); addLog('<span class="hl-gold">핵의 강화!</span> 최대 HP +25, HP +25.'); Sound.magic('holy');
  } else if(cardId==='coreMend'){
    const heal=Math.round(state.maxThroneHP*.22); state.throneHP=Math.min(state.maxThroneHP,state.throneHP+heal); addLog(`<span class="hl-gold">응급 복구!</span> 핵 HP +${heal}.`); Sound.magic('holy');
  } else if(cardId==='monsterDiscount'){
    state.monsterCostMul=Math.max(.55,(state.monsterCostMul||1)*.9); addLog('<span class="hl-gold">악마의 계약!</span> 몬스터 소환 비용 10% 감소.');
  } else if(cardId==='freeGuards'){
    let made=0; const pool=getAvailableMonsterTypes().filter(x=>state.gold>=0); const cap=state.monsterCap||MONSTER_CAP_START;
    for(let i=0;i<2;i++){ if(state.monsters.length>=cap) break; const base=pool[Math.floor(Math.random()*pool.length)]; const spot=findCoreSpawnFloor(3,6); if(base&&spot){ const m=createMonsterEntity(spot[0],spot[1],base.id,{tier:1,hpMul:1.25,atkMul:1.15,invested:0,moveCooldown:.2,playSound:false,log:false}); if(m){made++; Sound.spawn();} }}
    addLog(made>0?`<span class="hl-gold">핵의 수호자!</span> 몬스터 ${made}마리가 소환되었습니다.`:`<span class="hl-red">핵의 수호자!</span> 몬스터 생성 제한으로 소환하지 못했습니다.`);
  } else if(cardId==='trapMastery'){
    state.obstacleRangeBonus=(state.obstacleRangeBonus||0)+1; addLog('<span class="hl-gold">룬 증폭!</span> 모든 장애물 범위 +1.');
  } else if(cardId==='bloodRitual'){
    state.globalMonsterAtkMul=(state.globalMonsterAtkMul||1)*1.08; addLog('<span class="hl-red">피의 의식!</span> 모든 몬스터 공격력 +8%.');
  } else if(cardId==='arcaneShield'){
    state.coreDamageReduction=Math.min(.45,(state.coreDamageReduction||0)+.10); addLog('<span class="hl-gold">마력 결계!</span> 핵 피해 10% 감소.');
  } else if(cardId==='quickBuilder'){
    state.buildTimeBonus=(state.buildTimeBonus||0)+10; addLog('<span class="hl-gold">신속한 개척!</span> 다음 준비 시간이 10초 단축됩니다.');
  } else if(cardId==='goldCache'){
    addGold(100); addLog('<span class="hl-gold">비밀 금고!</span> 골드 +100G.');
  } else if(cardId==='tierRandom'){
    if(state.monsters.length){ const m=state.monsters[Math.floor(Math.random()*state.monsters.length)]; const to=Math.min(MAX_TIER,m.tier+2); recalcMonsterTier(m,to); state.fxEvents.push({type:'monsterUpgrade',r:m.r,c:m.c,tier:m.tier}); addLog(`<span class="hl-gold">불안정한 진화!</span> ${MONSTER_TYPES.find(x=>x.id===m.typeId)?.name||'몬스터'}가 ${m.tier}단계가 되었습니다.`); }
  } else if(cardId==='monsterCapUp'){
    state.monsterCap=(state.monsterCap||MONSTER_CAP_START)+MONSTER_CAP_CARD_BONUS;
    addLog(`<span class="hl-gold">군세 확장!</span> 몬스터 생성 제한이 ${state.monsterCap}마리로 늘어났습니다.`);
  } else {
    const buildCard=V18_BUILD_CARDS.find(x=>x.id===cardId);
    if(buildCard){
      addBuildTag(buildCard.tag);
      if(buildCard.tag==='poison') state.buildBonuses.poison=(state.buildBonuses.poison||1)+0.20;
      if(buildCard.tag==='frost') state.buildBonuses.frost=(state.buildBonuses.frost||1)+0.25;
      if(buildCard.tag==='fort') state.buildBonuses.fort=(state.buildBonuses.fort||1)+0.30;
      if(buildCard.tag==='swarm') state.buildBonuses.swarm=(state.buildBonuses.swarm||1)+0.18;
      if(buildCard.tag==='blood') state.buildBonuses.blood=(state.buildBonuses.blood||0)+6;
      if(buildCard.tag==='maze') state.buildBonuses.maze=(state.buildBonuses.maze||1)+0.15;
      if(buildCard.tag==='risk'){ state.nextWaveRiskMul=1.35; state.nextWaveRewardMul=1.6; }
      if(buildCard.tag==='ancient'){ state.monsterCap=(state.monsterCap||MONSTER_CAP_START)+3; state.monsterCostMul=(state.monsterCostMul||1)*1.18; state.globalMonsterAtkMul=(state.globalMonsterAtkMul||1)*1.12; }
      addLog(`<span class="hl-gold">${buildCard.name}</span> 빌드를 획득했습니다.`);
    }
  }
  els.cardOverlay.classList.add('hidden');
  state.phase='build';
  const nextBuildBonus=Math.max(0,state.buildTimeBonus||0);
  state.buildTimeBonus=0;
  state.buildTimer=Math.max(12,buildTimeForWave(state.wave)-nextBuildBonus);
  renderUI();
  } catch(err){
    console.error('[Wave Card] applyCard failed:', cardId, err);
    addLog('<span class="hl-red">카드 적용 중 오류가 발생해 안전하게 준비 단계로 복구했습니다.</span>');
    if(els.cardOverlay) els.cardOverlay.classList.add('hidden');
  if(els.runEventOverlay) els.runEventOverlay.classList.add('hidden');
    if(state){ state.phase='build'; state.buildTimer=Math.max(12,buildTimeForWave(state.wave)); }
    try{ renderUI(); }catch(renderErr){ console.error('[Wave Card] recovery render failed:',renderErr); }
  } finally {
    cardApplying=false;
  }
}


function findCoreSpawnFloor(minDist=3,maxDist=6){
  const opts=[];
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const t=state.grid[r][c]; const d=Math.abs(r-CORE_R)+Math.abs(c-CORE_C);
    if(t.type==='floor'&&!t.isEntrance&&!t.obstacle&&!monsterAt(r,c)&&!state.heroes.some(h=>h.r===r&&h.c===c)&&d>=minDist&&d<=maxDist) opts.push([r,c]);
  }
  if(!opts.length) return findRandomEmptyFloor();
  return opts[Math.floor(Math.random()*opts.length)];
}
function findRandomEmptyFloor(){
  const opts=[];
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const t=state.grid[r][c];
    if(t.type==='floor' && !t.isEntrance && !t.obstacle && !monsterAt(r,c) && !(state.mawang&&state.mawang.r===r&&state.mawang.c===c)) opts.push([r,c]);
  }
  if(!opts.length) return null;
  return opts[Math.floor(Math.random()*opts.length)];
}
function findRandomEmptyRock(){
  const opts=[];
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const t=state.grid[r][c];
    if(t.type==='rock' && !t.isEntrance && !t.obstacle) opts.push([r,c]);
  }
  if(!opts.length) return null;
  return opts[Math.floor(Math.random()*opts.length)];
}

/* ---------------- v27: 마왕의 제단 ---------------- */
const ALTAR_GRADE_TABLE=[
  {grade:'D',weight:35},
  {grade:'C',weight:27},
  {grade:'B',weight:20},
  {grade:'A',weight:10},
  {grade:'S',weight:6},
  {grade:'SS',weight:2}
];
function altarPickGrade(){
  let roll=Math.random()*ALTAR_GRADE_TABLE.reduce((a,x)=>a+x.weight,0);
  for(const x of ALTAR_GRADE_TABLE){ roll-=x.weight; if(roll<=0) return x.grade; }
  return 'D';
}
function altarAvailableMonsterPoolByGrade(grade){
  const order={D:0,C:1,B:2,A:3,S:4,SS:5};
  const target=order[grade]??0;
  // 제단은 상위 등급을 너무 쉽게 앞당기지 않도록 웨이브 진행에 따라 상한을 둡니다.
  const wave=state.wave||0;
  const waveCap=wave<=5?2:wave<=10?3:wave<=20?4:5; // B/A/S/SS index cap에 해당
  const maxTier=Math.min(5,target,waveCap);
  return MONSTER_TYPES.filter(mt=>{
    const g=order[mt.grade]??0;
    if(g!==maxTier) return false;
    return true;
  });
}
function altarMonsterCandidates(grade){
  const exact=altarAvailableMonsterPoolByGrade(grade);
  if(exact.length) return exact;
  const order={D:0,C:1,B:2,A:3,S:4,SS:5};
  const target=order[grade]??0;
  const lower=MONSTER_TYPES.filter(mt=>(order[mt.grade]??0)<=target);
  if(lower.length) return lower.sort((a,b)=>(order[b.grade]??0)-(order[a.grade]??0));
  return MONSTER_TYPES.slice();
}
function altarWeightedMonster(grade){
  const pool=altarMonsterCandidates(grade);
  if(!pool.length) return null;
  // 같은 등급 내에서는 카드 전용/희귀 몬스터도 포함하되 현재 런에서 이미 상점 해금된 몬스터는 약간 우선합니다.
  const weights=pool.map(mt=>((mt.cardOnly&&!(state.unlockedMonsterIds||[]).includes(mt.id))?0.85:1));
  const total=weights.reduce((a,b)=>a+b,0); let roll=Math.random()*total;
  for(let i=0;i<pool.length;i++){ roll-=weights[i]; if(roll<=0) return pool[i]; }
  return pool[pool.length-1];
}
function altarFindUpgradeableMonster(){
  const pool=(state.monsters||[]).filter(m=>m.tier<MAX_TIER);
  if(!pool.length) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}
function altarFindUpgradeableObstacle(){
  const pool=[];
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(!isObstacleRoot(r,c)) continue;
    const t=state.grid[r][c]; if(t.obstacle && !OBSTACLE_TYPES.find(o=>o.id===t.obstacle)?.fixed && obstacleLevel(t)<OBSTACLE_LEVEL_MAX) pool.push({r,c,t});
  }
  if(!pool.length) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}
function altarEligibleBuildCards(){
  const pool=V18_BUILD_CARDS.slice();
  const counts=state.buildTags||{};
  return pool.sort((a,b)=>{
    const ac=counts[a.tag]||0, bc=counts[b.tag]||0;
    return ac-bc || Math.random()-.5;
  });
}
function altarBuildCardApply(card){
  if(!card) return false;
  addBuildTag(card.tag);
  if(card.tag==='poison') state.buildBonuses.poison=(state.buildBonuses.poison||1)+0.20;
  if(card.tag==='frost') state.buildBonuses.frost=(state.buildBonuses.frost||1)+0.25;
  if(card.tag==='fort') state.buildBonuses.fort=(state.buildBonuses.fort||1)+0.30;
  if(card.tag==='swarm') state.buildBonuses.swarm=(state.buildBonuses.swarm||1)+0.18;
  if(card.tag==='blood') state.buildBonuses.blood=(state.buildBonuses.blood||0)+6;
  if(card.tag==='maze') state.buildBonuses.maze=(state.buildBonuses.maze||1)+0.15;
  if(card.tag==='risk'){ state.nextWaveRiskMul=1.35; state.nextWaveRewardMul=1.6; }
  if(card.tag==='ancient'){ state.monsterCap=(state.monsterCap||MONSTER_CAP_START)+3; state.monsterCostMul=(state.monsterCostMul||1)*1.18; state.globalMonsterAtkMul=(state.globalMonsterAtkMul||1)*1.12; }
  return true;
}
function altarWaveCardApply(card){
  if(!card||!card.apply) return false;
  const prevPhase=state.phase;
  // existing reward-card apply 함수의 phase guard를 통과시키기 위해 일시적으로 reward phase로 실행합니다.
  state.phase='cardSelect';
  try{ card.apply(); return true; }
  finally{ state.phase=prevPhase; }
}
function altarSetResult(grade,title,desc){
  state.altarLastGrade=grade;
  state.altarLastReward=title;
}

function altarSpawnMonster(grade){
  const cap=state.monsterCap||MONSTER_CAP_START;
  if(state.monsters.length>=cap) return null;
  const mt=altarWeightedMonster(grade); if(!mt) return null;
  const spot=findMonsterSpawnNearCore()||findRandomEmptyFloor(); if(!spot) return null;
  const tier=grade==='SS'?Math.min(MAX_TIER,5):grade==='S'?4:grade==='A'?3:grade==='B'?2:1;
  const m=createMonsterEntity(spot[0],spot[1],mt.id,{tier,invested:0,playSound:true,log:false});
  if(m){ if(mt.cardOnly && !(state.unlockedMonsterIds||[]).includes(mt.id)){ state.unlockedMonsterIds.push(mt.id); } return m; }
  return null;
}
function altarUpgradeRandomMonster(amount){
  const m=altarFindUpgradeableMonster(); if(!m) return null;
  const to=Math.min(MAX_TIER,m.tier+amount); recalcMonsterTier(m,to);
  state.fxEvents.push({type:'monsterUpgrade',r:m.r,c:m.c,tier:m.tier});
  state.fxEvents.push({type:'floatText',r:m.r,c:m.c,text:'LV.'+m.tier+' 강화!',color:'#e0b64a'});
  return m;
}
function altarUpgradeRandomObstacle(amount){
  const pick=altarFindUpgradeableObstacle(); if(!pick) return null;
  const t=pick.t, ob=OBSTACLE_TYPES.find(o=>o.id===t.obstacle); if(!ob) return null;
  const to=Math.min(OBSTACLE_LEVEL_MAX,obstacleLevel(t)+amount);
  t.obstacleLevel=to; t.obstacleMaxHp=obstacleMaxHpFor(ob,to); t.obstacleHp=t.obstacleMaxHp;
  syncObstacleFootprint(pick.r,pick.c);
  state.fxEvents.push({type:'monsterUpgrade',r:pick.r,c:pick.c,tier:to,footprint:obstacleVisualFootprint(ob.id,t)});
  state.fxEvents.push({type:'floatText',r:pick.r,c:pick.c,text:'장애물 Lv.'+to+' 강화!',color:'#e0b64a'});
  return {t,ob,level:to};
}
function altarApplyAllMonsterPlusOne(){
  let n=0; for(const m of state.monsters||[]){ if(m.tier<MAX_TIER){ recalcMonsterTier(m,m.tier+1); n++; } }
  return n;
}
function altarApplyAllObstaclePlusOne(){
  let n=0;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(!isObstacleRoot(r,c)) continue;
    const t=state.grid[r][c]; if(t.obstacle && !OBSTACLE_TYPES.find(o=>o.id===t.obstacle)?.fixed && obstacleLevel(t)<OBSTACLE_LEVEL_MAX){
      const ob=OBSTACLE_TYPES.find(o=>o.id===t.obstacle); const to=obstacleLevel(t)+1;
      t.obstacleLevel=to; t.obstacleMaxHp=obstacleMaxHpFor(ob,to); t.obstacleHp=t.obstacleMaxHp; syncObstacleFootprint(r,c); n++;
    }
  }
  return n;
}
function altarRewardByGrade(grade){
  const usableMonsters=state.monsters?.some(m=>m.tier<MAX_TIER);
  const usableObstacles=!!altarFindUpgradeableObstacle();
  const ticket=(n)=>{state.monsterSummonTickets=(state.monsterSummonTickets||0)+n;return `몬스터 소환권 +${n}`;};
  let reward=null;
  const waveCards=RUN_REWARD_CARDS.filter(c=>c.id!=='goldCache');
  const pickCard=()=>waveCards[Math.floor(Math.random()*waveCards.length)];
  if(grade==='D'){
    const choices=[];
    if(usableMonsters) choices.push(()=>{const m=altarUpgradeRandomMonster(1);return m?`현재 몬스터 ${MONSTER_TYPES.find(x=>x.id===m.typeId)?.name||'1마리'} Lv.+1` : null;});
    if(usableObstacles) choices.push(()=>{const o=altarUpgradeRandomObstacle(1);return o?`현재 장애물 ${o.ob.name} Lv.+1` : null;});
    choices.push(()=>ticket(1));
    const mt=altarSpawnMonster('D'); if(mt){ const actual=MONSTER_TYPES.find(x=>x.id===mt.typeId); return {title:`${actual?.grade||'D'}급 · ${actual?.name||'몬스터'} 소환`,desc:'제단이 선택한 등급 범위 안에서 몬스터가 즉시 전장에 합류했습니다.'}; }
    const fn=choices[Math.floor(Math.random()*choices.length)]; reward={title:fn(),desc:'작지만 확실한 성장입니다.'};
  } else if(grade==='C'){
    const mode=Math.floor(Math.random()*4);
    if(mode===0 && usableMonsters){const m=altarUpgradeRandomMonster(2);reward=m?{title:'현재 몬스터 Lv.+2',desc:`${MONSTER_TYPES.find(x=>x.id===m.typeId)?.name||'몬스터'}가 크게 강화되었습니다.`}:null;}
    if(!reward&&mode===1&&usableObstacles){const o=altarUpgradeRandomObstacle(2);reward=o?{title:'현재 장애물 Lv.+2',desc:`${o.ob.name}이(가) 강화되었습니다.`}:null;}
    if(!reward&&mode===2){const n=ticket(2);reward={title:n,desc:'나중에 원하는 준비 단계에서 몬스터를 무료로 소환할 수 있습니다.'};}
    if(!reward){const c=pickCard(); altarWaveCardApply(c); reward={title:`전술 카드 · ${c.name}`,desc:c.effect||c.desc};}
  } else if(grade==='B'){
    const mode=Math.floor(Math.random()*5);
    if(mode===0){const m=altarSpawnMonster('B');const actual=m&&MONSTER_TYPES.find(x=>x.id===m.typeId);reward=actual?{title:`${actual.grade}급 · ${actual.name}`,desc:'제단이 선택한 범위 안에서 몬스터가 즉시 소환되었습니다.'}:null;}
    if(!reward&&mode===1&&usableMonsters){const m=altarUpgradeRandomMonster(2);reward=m?{title:'랜덤 몬스터 Lv.+2',desc:`${MONSTER_TYPES.find(x=>x.id===m.typeId)?.name||'몬스터'}의 레벨이 상승했습니다.`}:null;}
    if(!reward&&mode===2&&usableObstacles){const o=altarUpgradeRandomObstacle(2);reward=o?{title:'랜덤 장애물 Lv.+2',desc:`${o.ob.name}의 레벨이 상승했습니다.`}:null;}
    if(!reward&&mode===3){const c=pickCard(); altarWaveCardApply(c); reward={title:`전술 카드 · ${c.name}`,desc:c.effect||c.desc};}
    if(!reward){const cards=altarEligibleBuildCards();const c=cards[0];altarBuildCardApply(c);reward={title:`빌드 카드 · ${c.name}`,desc:c.desc};}
  } else if(grade==='A'){
    const mode=Math.floor(Math.random()*4);
    if(mode===0){const m=altarSpawnMonster('A');const actual=m&&MONSTER_TYPES.find(x=>x.id===m.typeId);reward=actual?{title:`${actual.grade}급 · ${actual.name}`,desc:'상급 몬스터가 즉시 전장에 합류했습니다.'}:null;}
    if(!reward&&mode===1&&usableMonsters){const m=altarUpgradeRandomMonster(3);reward=m?{title:'랜덤 몬스터 Lv.+3',desc:`${MONSTER_TYPES.find(x=>x.id===m.typeId)?.name||'몬스터'}가 크게 각성했습니다.`}:null;}
    if(!reward&&mode===2&&usableObstacles){const o=altarUpgradeRandomObstacle(3);reward=o?{title:'랜덤 장애물 Lv.+3',desc:`${o.ob.name}이(가) 크게 강화되었습니다.`}:null;}
    if(!reward){const cards=altarEligibleBuildCards().slice(0,2);const c=cards[Math.floor(Math.random()*cards.length)];altarBuildCardApply(c);reward={title:`빌드 카드 · ${c.name}`,desc:`${c.desc} · 제단이 선택한 빌드가 이번 런에 연결되었습니다.`};}
  } else if(grade==='S'){
    const mode=Math.floor(Math.random()*4);
    if(mode===0){const m=altarSpawnMonster('S');const actual=m&&MONSTER_TYPES.find(x=>x.id===m.typeId);reward=actual?{title:`${actual.grade}급 · ${actual.name}`,desc:'희귀한 고등급 몬스터가 즉시 소환되었습니다.'}:null;}
    if(!reward&&mode===1){const n=altarApplyAllMonsterPlusOne();reward={title:`전군 강화 · ${n}마리`,desc:'현재 배치된 모든 몬스터가 1단계 강화되었습니다.'};}
    if(!reward&&mode===2){const n=altarApplyAllObstaclePlusOne();reward={title:`장애물 전면 강화 · ${n}개`,desc:'현재 배치된 장애물이 모두 1단계 강화되었습니다.'};}
    if(!reward){const cards=altarEligibleBuildCards().slice(0,3);const c=cards[Math.floor(Math.random()*cards.length)];altarBuildCardApply(c);reward={title:`희귀 빌드 · ${c.name}`,desc:`${c.desc} · 높은 등급의 제단에서 선택되었습니다.`};}
  } else {
    const mode=Math.floor(Math.random()*5);
    if(mode===0){const m=altarSpawnMonster('SS');const actual=m&&MONSTER_TYPES.find(x=>x.id===m.typeId);reward=actual?{title:`${actual.grade}급 · ${actual.name}`,desc:'제단의 최고 등급 범위에서 선택된 몬스터가 즉시 합류했습니다.'}:null;}
    if(!reward&&mode===1){const n=altarApplyAllMonsterPlusOne();reward={title:`SS · 전군 +1 강화 · ${n}마리`,desc:'모든 몬스터가 한 단계씩 강화되었습니다.'};}
    if(!reward&&mode===2){const n=altarApplyAllObstaclePlusOne();reward={title:`SS · 장애물 전체 +1 · ${n}개`,desc:'모든 장애물이 한 단계씩 강화되었습니다.'};}
    if(!reward&&mode===3){const cards=altarEligibleBuildCards();const c=cards[Math.floor(Math.random()*Math.min(3,cards.length))];altarBuildCardApply(c);reward={title:`SS · 빌드 각성 · ${c.name}`,desc:`${c.desc} · 마왕의 제단에서 직접 내려온 초월 보상입니다.`};}
    if(!reward){const c=pickCard(); altarWaveCardApply(c); reward={title:`SS · 전술 카드 · ${c.name}`,desc:c.effect||c.desc};}
  }
  return reward||{title:'제단의 잔향',desc:'이번 공물은 미약한 힘만 남겼습니다.'};
}
// v29: 제단을 기존 하단 선택 패널(panelBox) 내부에 통합합니다.

let altarToastTimer=null;
function showAltarRewardToast(grade,title,desc){
  const el=document.getElementById('altarRewardToast');
  if(!el) return;
  const cleanGrade=String(grade||'D').toUpperCase();
  const cleanTitle=String(title||'보상을 획득했습니다.').replace(/^(?:D|C|B|A|S|SS)(?:급)?\s*[·:~-]\s*/i,'');
  el.classList.remove('grade-D','grade-C','grade-B','grade-A','grade-S','grade-SS');
  el.classList.add(`grade-${cleanGrade}`);
  el.querySelector('.toast-grade').textContent=cleanGrade;
  el.querySelector('.toast-title').textContent=cleanTitle;
  el.querySelector('.toast-desc').textContent=desc||'';
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  if(altarToastTimer) clearTimeout(altarToastTimer);
  altarToastTimer=setTimeout(()=>{el.classList.remove('show'); altarToastTimer=null;},3000);
}

function altarRender(){
  if(!state || !els.panelBox || state.selected?.kind!=='altar') return;
  const cost=Math.max(1,Math.floor(state.altarCost||100));
  els.panelBox.innerHTML=`
    <div class="altar-panel-inner">
      <div class="altar-panel-head">
        <span class="altar-panel-icon">🔮</span>
        <div class="altar-panel-headtext">
          <div class="altar-panel-title">마왕의 제단</div>
          <div class="altar-panel-desc">골드를 바쳐 무작위 보상을 얻습니다.<br>어떤 보상을 얻게될진 마왕에게 빌어야합니다.</div>
        </div>
      </div>
      <button id="altarSacrificePanelBtn" class="altar-sacrifice-btn" ${state.phase==='build'&&state.gold>=cost?'':'disabled'}>
        <span class="altar-btn-icon">🙏</span>
        <span>공물 바치기</span>
        <span class="altar-btn-cost">${cost.toLocaleString()}G</span>
      </button>
    </div>`;
  const btn=document.getElementById('altarSacrificePanelBtn');
  if(btn) btn.addEventListener('click',()=>{ Sound.ui(); sacrificeToAltar(); });
}
function openAltar(){
  if(!state||state.gameOver) return;
  if(state.phase!=='build'){
    addLog('<span class="hl-red">🔮 마왕의 제단은 준비 단계에서만 사용할 수 있습니다.</span>');
    return;
  }
  state.selected={kind:'altar'};
  els.altarBtn.classList.add('active');
  altarRender();
}
function closeAltar(){
  els.altarBtn.classList.remove('active');
  if(state && state.selected?.kind==='altar') state.selected=null;
  renderPanelInner();
}
function sacrificeToAltar(){
  if(!state||state.gameOver||state.phase!=='build') return;
  const cost=Math.max(1,Math.floor(state.altarCost||100));
  if(state.gold<cost) return;
  state.gold-=cost;
  state.altarUses=(state.altarUses||0)+1;
  const grade=altarPickGrade();
  const reward=altarRewardByGrade(grade);
  const nextCost=Math.max(cost+1,Math.round(cost*1.15));
  state.altarCost=nextCost;
  addLog(`<span class="hl-gold">🔮 마왕의 제단</span> — ${grade}급 <b>${reward.title}</b>을(를) 얻었습니다. 골드 -${cost}G`);
  Sound.level();
  state.fxEvents.push({type:'spawnBurst',r:CORE_R,c:CORE_C,color:'rgba(205,132,214,.95)'});
  altarSetResult(grade,reward.title,reward.desc);
  showAltarRewardToast(grade,reward.title,reward.desc);
  altarRender();
  renderUI();
}

/* ---------------- UI rendering ---------------- */
function fmtTime(sec){
  sec=Math.max(0,Math.ceil(sec));
  const m=Math.floor(sec/60), s=sec%60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}
function renderVillageRaidLaunchButton(){
  const raidBtn=document.getElementById('villageRaidLaunchBtn');
  if(!raidBtn || !state) return;
  const raidCount=Math.max(0,Number(state.villageRaidCharges)||0);
  const raidMax=Math.max(1,Number(state.villageRaidChargeMax)||2);
  const chargeEl=document.getElementById('villageRaidChargeText');
  const subEl=document.getElementById('villageRaidLaunchSub');
  if(chargeEl) chargeEl.textContent=`${raidCount}/${raidMax}`;
  const canShow=state.running && !state.gameOver && state.phase==='build' && !state.village && state.villagePrepTimer==null && !state._villageReturnLock && raidCount>0;
  raidBtn.classList.toggle('hidden',!canShow);
  if(canShow){
    const remain=Math.max(0,(Number(state.villageRaidCooldownUntilWave)||0)-(Number(state.wave)||0));
    const cooldown=remain>0;
    raidBtn.classList.toggle('cooldown',cooldown);
    raidBtn.disabled=cooldown;
    raidBtn.setAttribute('aria-disabled',cooldown?'true':'false');
    raidBtn.title=cooldown?`재출정까지 ${remain}웨이브 남았습니다`:'습격권 1개를 사용해 10초 출정 준비를 시작합니다';
    if(subEl) subEl.textContent=cooldown
      ? `원정대 재정비 중 · 재출정까지 ${remain}웨이브`
      : `습격권 1개 사용 · 10초 뒤 출정 (누르지 않으면 다음 웨이브 진행)`;
  }else{
    raidBtn.classList.remove('cooldown');
    raidBtn.disabled=false;
    raidBtn.removeAttribute('aria-disabled');
  }
}
function renderUI(){
  if(!state){ renderMapCells(); return; }
  if(typeof Sound!=='undefined'&&Sound.syncMusic) Sound.syncMusic();
  const renderNow=performance.now();
  if(state.selected?.kind==='altar'){
    if(state.phase!=='build' || state.gameOver) closeAltar();
  }
  if(els.buildOverlay && !els.buildOverlay.classList.contains('hidden')) renderBuildPanel();
  els.hpBar.style.width=Math.max(0,state.throneHP/state.maxThroneHP*100)+'%';
  els.hpText.textContent=`${Math.max(0,Math.round(state.throneHP))}/${state.maxThroneHP}`;
  els.goldText.textContent=`${Math.floor(state.gold).toLocaleString()}G`;
  if(els.goldRateText) els.goldRateText.textContent=`초당 +${state.goldPerSec}G`;
  els.waveText.textContent = state.wave>0 ? ('웨이브 '+state.wave) : '대기중';
  els.killCount.textContent=`처치 ${state.killCount}`;
  els.killStatText.textContent=`${state.killCount}명`;
  if(els.monsterCapText) els.monsterCapText.textContent=`${state.monsters.length}/${state.monsterCap||MONSTER_CAP_START}`;
  renderVillageRaidLaunchButton();
  if(state.phase==='placeCore'){
    els.phaseLabel.textContent='마력의 핵 배치';
    els.timerText.textContent='위치 선택';
    els.phaseBtn.classList.add('locked');
    els.phaseBtn.title='';
    els.toolbar.classList.add('locked');
  } else if(state.phase==='build'){
    if(state.villagePrepTimer!=null){
      // v38.6: 마을 습격 예고 카운트다운 (이 동안 몬스터 생성 가능)
      els.phaseLabel.textContent='마을 습격까지';
      els.timerText.textContent=fmtTime(Math.max(0,state.villagePrepTimer));
      els.phaseBtn.classList.remove('locked');
      els.phaseBtn.title='탭하면 즉시 마을로 진격합니다';
      els.toolbar.classList.remove('locked');
      const _vt=document.getElementById('villageToast');
      if(_vt && _vt.classList.contains('show')){
        const _d=_vt.querySelector('.vt-desc');
        const _sec=Math.max(0,Math.ceil(state.villagePrepTimer));
        const _txt=`${_sec}초 뒤 마을로 진격합니다 · 지금 몬스터를 더 생성해두세요!`;
        if(_d && _d.textContent!==_txt) _d.textContent=_txt;
      }
    } else if(state._villageReturnLock){
      els.phaseLabel.textContent='마을 습격 정산';
      els.timerText.textContent='잠시만…';
      els.phaseBtn.classList.add('locked');
      els.phaseBtn.title='';
      els.toolbar.classList.add('locked');
    } else {
      els.phaseLabel.textContent='용사 난입까지';
      els.timerText.textContent=fmtTime(state.buildTimer);
      els.phaseBtn.classList.remove('locked');
      els.phaseBtn.title='탭하면 즉시 침공을 시작합니다';
      els.toolbar.classList.remove('locked');
    }
  } else if(state.phase==='invasion'){
    els.phaseLabel.textContent='침공 중';
    els.timerText.textContent=`용사 ${state.waveHeroesSpawned}/${state.waveHeroesTotal}`;
    els.phaseBtn.classList.add('locked');
    els.phaseBtn.title='';
    els.toolbar.classList.add('locked');
  } else if(state.phase==='waveTransition'){
    els.phaseLabel.textContent='웨이브 정산 중';
    els.timerText.textContent='잠시만…';
    els.phaseBtn.classList.add('locked');
    els.phaseBtn.title='';
    els.toolbar.classList.add('locked');
  } else {
    els.phaseBtn.classList.add('locked');
    els.toolbar.classList.add('locked');
  }
  // 전투 중에는 토큰만 자주 갱신하고, 맵/사거리/선택 패널은 실제로 필요할 때만 다시 그립니다.
  // 마을 습격 준비 카운트다운에서는 기존 장애물 DOM/이미지를 보존하고,
  // 실제로 맵이 변경된 경우에만 다시 렌더링합니다.
  const heroDigging=state.phase==='invasion' && state.heroes.some(h=>h.digging);
  const villagePrepActive=state.phase==='build' && state.villagePrepTimer!=null;
  if(state.phase==='placeCore' || (state.phase==='build' && !villagePrepActive) || heroDigging || state._mapDirty!==false){
    renderMapCells();
    state._mapDirty=false;
  }
  if((state.phase==='build' && !villagePrepActive) || state._rangesDirty!==false){
    renderObstacleRanges();
    state._rangesDirty=false;
  }
  syncTokens();
  if(state.phase!=='invasion' || state._panelDirty || renderNow-(state._lastPanelRenderAt||0)>=320){
    renderPanel();
    state._lastPanelRenderAt=renderNow;
    state._panelDirty=false;
  }
  if(typeof renderPhysicalTraps==='function') renderPhysicalTraps();
  if(state.phase==='build' && typeof updatePhysicalBuildControls==='function') updatePhysicalBuildControls();
}

function obstacleEffectRadius(ob,tile){
  if(!ob) return null;
  return obstacleRange(ob.id,tile);
}
function renderObstacleRanges(){
  if(!els.rangeLayer || !state) return;
  els.rangeLayer.innerHTML='';
  const px=currentCellPx;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const obId=state.grid[r][c].obstacle;
    if(!obId || !isObstacleRoot(r,c)) continue;
    const ob=OBSTACLE_TYPES.find(o=>o.id===obId);
    if(ob?.physical) continue;
    const radius=obstacleEffectRadius(ob, state.grid[r][c]);
    if(radius===null) continue;
    const ring=document.createElement('div');
    ring.className='range-ring';
    if(state.selected && state.selected.kind==='tile' && state.selected.r===r && state.selected.c===c) ring.classList.add('strong');
    const fxCenter=typeof obstacleFxCenter==='function'?obstacleFxCenter(r,c,ob.id,state.grid[r][c]):{r:r+.5,c:c+.5};
    ring.style.left=((fxCenter.c+.5)*px)+'px';
    ring.style.top=((fxCenter.r+.5)*px)+'px';
    const baseSize=typeof obstacleVisualFootprint==='function'?obstacleVisualFootprint(ob.id,state.grid[r][c]):2;
    const diameter=px*(baseSize+radius*2);
    ring.style.width=diameter+'px';
    ring.style.height=diameter+'px';
    ring.style.setProperty('--range-color',ob.color||'#b79bff');
    els.rangeLayer.appendChild(ring);
  }
}

/* ---------------- v41: 던전 타일 오토타일 ----------------
   주변 칸이 뚫려 있는지 보고 각 칸에 어울리는 타일 이미지를 고릅니다.
   - 바닥(floor):        ft-basic / ft-crack / ft-damp / ft-ornate
   - 바로 아래가 뚫린 암벽: wf-* (정면 벽돌 벽 · 횃불/깃발/사슬 장식)
   - 그 외 통로와 맞닿은 암벽: rt-top (벽 윗면 석판) + e-n/e-w/e-e/c-** (통로 쪽 테두리)
   - 통로와 떨어진 깊은 암반: rt-deep (어두운 암반)
   위치 기반 해시로 고르기 때문에 다시 그려도 같은 칸은 항상 같은 모양입니다.
   실제 이미지는 css/tiles.css 에서 연결합니다. */
function _tileHash(r,c,salt){
  let h=Math.imul(r+1,374761393) ^ Math.imul(c+1,668265263) ^ Math.imul(salt+7,2246822519);
  h=Math.imul(h^(h>>>13),1274126177);
  return (h^(h>>>16))>>>0;
}
function _tileOpen(r,c){
  if(r<0||c<0||r>=GRID||c>=GRID) return false;
  const t=state.grid[r] && state.grid[r][c];
  return !!t && t.type!=='rock';
}
function dungeonTileClass(r,c,t){
  if(!state) return ' rt-deep'+(_tileHash(r,c,5)%3===0?' alt':'');
  if(t.type==='rock'){
    const oN=_tileOpen(r-1,c), oS=_tileOpen(r+1,c), oW=_tileOpen(r,c-1), oE=_tileOpen(r,c+1);
    if(oS){
      // 정면 벽: 좌우가 뚫려 있으면 옆면 그림자를 붙여 벽 끝(모서리)처럼 보이게 합니다.
      let face;
      if((c+r*3)%5===2) face=' wf wf-torch';
      else {
        const k=_tileHash(r,c,11)%100;
        face = k<14 ? ' wf wf-banner' : k<26 ? ' wf wf-chain' : ' wf wf-plain'+(k%2?' alt':'');
      }
      return face+(oW?' fs-w':'')+(oE?' fs-e':'');
    }
    const oNW=_tileOpen(r-1,c-1), oNE=_tileOpen(r-1,c+1), oSW=_tileOpen(r+1,c-1), oSE=_tileOpen(r+1,c+1);
    if(oN||oW||oE||oNW||oNE||oSW||oSE){
      // 벽 윗면: 모든 칸이 같은 대칭 석판이고, "통로와 맞닿은 변"에만 테두리를 그립니다.
      // → 벽이 어느 방향이든 통로 쪽을 일관되게 바라봅니다.
      let cls=' rt-top'+(_tileHash(r,c,3)%2?' alt':'');
      if(oN) cls+=' e-n';
      if(oW) cls+=' e-w';
      if(oE) cls+=' e-e';
      if(oNW && !oN && !oW) cls+=' c-nw';
      if(oNE && !oN && !oE) cls+=' c-ne';
      if(oSW && !oW) cls+=' c-sw';
      if(oSE && !oE) cls+=' c-se';
      return cls;
    }
    return ' rt-deep'+(_tileHash(r,c,5)%3===0?' alt':'');
  }
  if(t.type==='core') return '';
  const k=_tileHash(r,c,1)%100;
  let cls = k<78 ? ' ft-basic' : k<92 ? ' ft-crack' : k<96 ? ' ft-damp' : ' ft-ornate';
  // 바로 위가 벽이면 벽 그림자, 그 벽이 횃불 벽이면 따뜻한 불빛을 바닥에 드리웁니다.
  if(r>0 && !_tileOpen(r-1,c)){
    cls+=' ft-shadow';
    if((c+(r-1)*3)%5===2) cls+=' ft-torchlit';
  }
  return cls;
}

/* v61 · 장애물 프레임 애니메이션: 시트를 steps 방식으로 넘기는 CSS 를 OBSTACLE_ANIMS 로부터 생성해 주입합니다. */
const obstacleAnimReady={};
function installObstacleAnimStyles(){
  let css='';
  for(const [id,a] of Object.entries(OBSTACLE_ANIMS)){
    const seq=obstacleAnimSeq(a), total=obstacleAnimTotalMs(a), N=a.frames;
    const pos=k=>(N>1?(k/(N-1))*100:0).toFixed(4)+'% 0';
    let kf='', acc=0;
    seq.forEach((k,i)=>{ kf+=`${((acc/total)*100).toFixed(3)}%{background-position:${pos(k)};}`; acc+=a.durs[i]; });
    kf+=`100%{background-position:${a.mode==='trigger'?(a.hold?pos(seq[seq.length-1]):pos(0)):pos(seq[0])};}`;
    css+=`@keyframes obAnim_${id}{${kf}}\n`;
    if(a.scale&&a.scale!==1) css+=`.cell.ob-animated.ob-${id} .obstacle-anim{--ob-anim-scale:${a.scale};}\n`;
    if(a.armed){   // 경고 상태에서 반복 재생하는 별도 키프레임
      const aq=a.armed.seq, at=a.armed.durs.reduce((s,x)=>s+x,0); let akf='', aacc=0;
      aq.forEach((k,i)=>{ akf+=`${((aacc/at)*100).toFixed(3)}%{background-position:${pos(k)};}`; aacc+=a.armed.durs[i]; });
      akf+=`100%{background-position:${pos(aq[0])};}`;
      css+=`@keyframes obAnimArmed_${id}{${akf}}\n`;
      css+=`.cell.ob-animated.ob-${id} .obstacle-anim.ob-armed:not(.ob-play){animation:obAnimArmed_${id} ${at}ms step-end infinite;}\n`;
    }
    const base=`.cell.ob-animated.ob-${id} .obstacle-anim{background-image:url("${a.sheet}");background-size:${N*100}% 100%;background-position:${pos(0)};}`;
    css+=base+'\n';
    if(a.mode==='loop') css+=`.cell.ob-animated.ob-${id} .obstacle-anim{animation:obAnim_${id} ${total}ms step-end infinite;}\n`;
    else css+=`.cell.ob-animated.ob-${id} .obstacle-anim.ob-play{animation:obAnim_${id} ${total}ms step-end 1 forwards;}\n`;
  }
  let st=document.getElementById('obAnimStyles');
  if(!st){ st=document.createElement('style'); st.id='obAnimStyles'; document.head.appendChild(st); }
  st.textContent=css;
  // 시트가 실제로 로드된 장애물만 애니메이션 레이어로 전환합니다(실패하면 기존 정지 그림 유지).
  for(const [id,a] of Object.entries(OBSTACLE_ANIMS)){
    const im=new Image(); im.onload=()=>{ obstacleAnimReady[id]=true; }; im.onerror=()=>{ obstacleAnimReady[id]=false; }; im.src=a.sheet;
  }
}
installObstacleAnimStyles();

function renderMapCells(){
  if(!cellEls.length) return;
  const digTargets={};
  if(state){
    for(const h of state.heroes){
      if(h.digging){
        const digHt2=heroTypeOf(h);
        const digTimeMul2=(digHt2&&digHt2.digTimeMul)||1;
        const need = (h.digKind==='obstacle' ? obstacleBreakTime(state.grid[h.digTargetR]?.[h.digTargetC]?.obstacle,h,state.grid[h.digTargetR]?.[h.digTargetC]) : (h.digKind==='wallObstacle' || h.digKind==='barricade' ? BARRICADE_DIG_TIME : h.digKind==='web' ? WEB_PASS_TIME : HERO_DIG_TIME) * digTimeMul2);
        digTargets[h.digTargetR+'_'+h.digTargetC]=h.digProgress/need;
      }
    }
  }
  for(let r=0;r<GRID;r++){
    for(let c=0;c<GRID;c++){
      const el=cellEls[r][c];
      const t=state ? state.grid[r][c] : {type:'rock'};
      let cls='cell';
      let ob=null;
      if(t.type==='core') cls+=' core';
      else if(t.isEntrance && t.type==='floor') cls+=' entrance';
      else if(t.type==='rock') cls+=' rock'+(state && isDiggable(r,c)?' diggable':'')+(t.playerWall?' player-wall':'');
      else cls+=' floor';
      if(t.obstacle){
        ob=OBSTACLE_TYPES.find(o=>o.id===t.obstacle);
        cls+=' has-obstacle obstacle-'+(ob?ob.kind:'')+(ob?' ob-'+(t.wasBridge?'collapse_bridge':ob.id):'');
        if(ob && !t.wasBridge && OBSTACLE_ANIMS[ob.id] && obstacleAnimReady[ob.id]) cls+=' ob-animated'; // v61: 프레임 애니메이션 사용
        if(ob&&ob.id==='gust'){
          const dr=Math.sign(t.obstacleDirR||0),dc=Math.sign(t.obstacleDirC||0);cls+=' ob-dir-'+(dr<0?'up':dr>0?'down':dc<0?'left':'right');
        }
        if(ob&&ob.id==='magnet'){
          const dr=Math.sign(t.obstacleDirR||0),dc=Math.sign(t.obstacleDirC||0);cls+=' ob-dir-'+(dr<0?'up':dr>0?'down':dc<0?'left':'right');
        }
        if(ob&&isWallMountedObstacle(ob.id)) cls+=' wall-mounted-obstacle';
        if(ob&&ob.id==='collapse_bridge') cls+=t.runeGatePermanent?' rune-gate-sealed':(t.runeGateClosed?' rune-gate-closed':' rune-gate-open');
        if(t.wasBridge && t.justCollapsedUntil && performance.now()<t.justCollapsedUntil) cls+=' just-collapsed';
        if(isObstacleRoot(r,c)) cls+=' obstacle-root';
      }
      if(state && state.phase==='placeCore'){
        // v40: 핵을 놓을 수 있는 칸을 초록, 놓을 수 없는 칸을 붉게 표시합니다.
        cls+=canPlaceCoreAt(r,c) ? ' core-place-ok' : ' core-place-bad';
      }
      if(state && state.activeTool==='obstacle' && state.selectedObstacleType && state.phase==='build'){
        if(state.selectedObstacleType==='__wall_dig__'){
          if(t.type==='rock' && !t.obstacle && !t.isEntrance && (t.playerWall===true || isDiggable(r,c))) cls+=' wall-dig-target';
        } else if(state.selectedObstacleType==='__wall__'){
          if(t.type==='floor' && !t.isEntrance && !t.obstacle && !monsterAt(r,c)) cls+=' wall-target';
        } else if(isWallMountedObstacle(state.selectedObstacleType)){
          if(t.type==='rock' && !t.isEntrance && !t.obstacle && canPlaceObstacleAt(r,c,state.selectedObstacleType)) cls+=' obstacle-target wall-mount-target';
        } else if(t.type==='floor' && !t.isEntrance && !t.obstacle){
          const anchor=obstacleAnchor(r,c,state.selectedObstacleType);
          if(anchor.r===r && anchor.c===c && canPlaceObstacleAt(r,c,state.selectedObstacleType)) cls+=' obstacle-target';
        }
      }
      if(typeof physicalCellClass==='function') cls=physicalCellClass(cls,r,c,t);
      cls+=dungeonTileClass(r,c,t);
      if(t.type==='floor'||t.type==='core') cls+=' zone-'+dungeonZoneAt(r,c);
      if(state && state.selected){
        const sel=state.selected;
        if(sel.kind==='tile' && sel.r===r && sel.c===c) cls+=' selected';
      }
      if(el.className!==cls) el.className=cls;
      if(el.style.getPropertyValue('--ob-target-w')){
        el.style.removeProperty('--ob-target-w');
        el.style.removeProperty('--ob-target-h');
        el.style.removeProperty('--ob-target-x');
        el.style.removeProperty('--ob-target-y');
        el.style.removeProperty('--ob-target-clip');
      }
      if(state && state.activeTool==='obstacle' && state.selectedObstacleType && state.phase==='build' && cls.includes('obstacle-target')){
        const _targetBox=(typeof obstacleVisualBox==='function'?obstacleVisualBox(state.selectedObstacleType):{w:2,h:2,x:0,y:0,clip:'inset(0 round 3px)'});
        el.style.setProperty('--ob-target-w',String(_targetBox.w||1));
        el.style.setProperty('--ob-target-h',String(_targetBox.h||1));
        el.style.setProperty('--ob-target-x',String(_targetBox.x||0));
        el.style.setProperty('--ob-target-y',String(_targetBox.y||0));
        el.style.setProperty('--ob-target-clip',_targetBox.clip||'inset(0 round 3px)');
      }
      if(ob){
        const root=isObstacleRoot(r,c);
        if(el.dataset.icon!==ob.icon) el.dataset.icon=ob.icon;
        el.style.setProperty('--ob-color', ob.color);
        let obImg=el.querySelector('.obstacle-icon');
        if(root){
          if(!obImg){ obImg=document.createElement('img'); obImg.className='obstacle-icon'; el.appendChild(obImg); }
          // v46: 대기/발동 2프레임 장애물은 t.triggerFxUntil 동안만 발동 프레임(spriteAlt)을 보여주고,
          // 붕락교처럼 영구히 모습이 바뀌는 경우는 t.wasBridge일 때 고정 스프라이트로 덮어씁니다.
          const _spriteOpts=(ob.id==='collapse_bridge'&&t.runeGatePermanent)
            ? {srcOverride:OBSTACLE_SPRITES.collapse_bridge_alt}
            : (t.wasBridge ? {srcOverride:OBSTACLE_SPRITES.collapse_bridge_alt} : {alt:!!(t.triggerFxUntil && performance.now()<t.triggerFxUntil)});
          applyObstacleSpriteImage(obImg,ob,_spriteOpts);
          obImg.classList.toggle('trap-pulse', !!_spriteOpts.alt);
          // v61: 프레임 애니메이션 레이어 (평상시 반복형은 CSS가 계속 재생, 발동형은 발동 순간마다 처음부터 한 번 재생)
          const _anim=OBSTACLE_ANIMS[ob.id];
          if(_anim && obstacleAnimReady[ob.id] && !t.wasBridge && !(ob.id==='collapse_bridge'&&t.runeGatePermanent)){
            let animEl=el.querySelector('.obstacle-anim');
            if(!animEl){ animEl=document.createElement('div'); animEl.className='obstacle-anim'; el.appendChild(animEl); }
            if(_anim.mode==='trigger'){
              const until=t.triggerFxUntil||0, active=performance.now()<until;
              if(active && animEl.dataset.stamp!==String(until)){
                animEl.dataset.stamp=String(until);
                animEl.classList.remove('ob-play'); void animEl.offsetWidth; animEl.classList.add('ob-play');
              } else if(!active && animEl.classList.contains('ob-play')){ animEl.classList.remove('ob-play'); }
              // 경고 상태(붕락지대 등)에서는 경고 프레임을 반복 재생
            } else {
              // 반복형: 발동 신호가 켜져 있는 동안 잠깐 밝게 번쩍임 (돌풍진/흡인진이 작동하는 순간)
              animEl.classList.toggle('ob-trig', performance.now()<(t.triggerFxUntil||0));
            }
          } else { const oldAnim=el.querySelector('.obstacle-anim'); if(oldAnim) oldAnim.remove(); }
          const lv=obstacleLevel(obstacleRootTile(r,c)||t);
          el.dataset.obLevel='Lv.'+lv;
          const _obBox=(typeof obstacleVisualBox==='function'?obstacleVisualBox(ob.id,t):{w:obstacleVisualFootprint(ob.id,t),h:obstacleVisualFootprint(ob.id,t),x:0,y:0,clip:'inset(0 round 5px)'});
          el.style.setProperty('--ob-footprint-size',String(obstacleVisualFootprint(ob.id,t)));
          el.style.setProperty('--ob-box-w',String(_obBox.w||1));
          el.style.setProperty('--ob-box-h',String(_obBox.h||1));
          el.style.setProperty('--ob-box-x',String(_obBox.x||0));
          el.style.setProperty('--ob-box-y',String(_obBox.y||0));
          el.style.setProperty('--ob-box-clip',_obBox.clip||'inset(0 round 5px)');
          // 아이콘 확대폭을 키우고(최대 +45%), 레벨 구간(1~4/5~9/10)에 따라 발광·펄스 강도가 달라지는 클래스를 부여합니다.
          el.style.setProperty('--ob-level-scale',String(1+(lv-1)*0.05));
          el.classList.toggle('ob-lv-mid', lv>=5 && lv<10);
          el.classList.toggle('ob-lv-max', lv>=10);
          let lvBadge=el.querySelector('.ob-lv-badge');
          if(!lvBadge){ lvBadge=document.createElement('div'); lvBadge.className='ob-lv-badge'; el.appendChild(lvBadge); }
          lvBadge.textContent='Lv.'+lv;
          lvBadge.className='ob-lv-badge lv-'+(lv>=10?10:lv>=5?5:1);
          // 장애물 체력바는 v35.2에서 제거했습니다. 실제 obstacleHp 계산은 전투 로직에 그대로 남아 있습니다.
          el.classList.remove('obstacle-damaged');
        } else {
          if(obImg) obImg.remove();
          const _oa=el.querySelector('.obstacle-anim'); if(_oa) _oa.remove();
          const lvBadge=el.querySelector('.ob-lv-badge');
          if(lvBadge) lvBadge.remove();
          // 장애물 체력바 DOM은 더 이상 생성하지 않습니다.
        }
        const obLabel=el.querySelector('.ob-label'); if(obLabel) obLabel.remove();
        const obBadge=el.querySelector('.ob-kind-badge'); if(obBadge) obBadge.remove();
      } else {
        if(el.dataset.icon) delete el.dataset.icon;
        el.style.removeProperty('--ob-color'); el.style.removeProperty('--ob-footprint-size');
        el.style.removeProperty('--ob-box-w'); el.style.removeProperty('--ob-box-h'); el.style.removeProperty('--ob-box-x'); el.style.removeProperty('--ob-box-y'); el.style.removeProperty('--ob-box-clip');
        const obImg=el.querySelector('.obstacle-icon');
        if(obImg) obImg.remove();
        const _oa2=el.querySelector('.obstacle-anim'); if(_oa2) _oa2.remove();
        const obLabel=el.querySelector('.ob-label');
        if(obLabel) obLabel.remove();
        const obBadge=el.querySelector('.ob-kind-badge');
        if(obBadge) obBadge.remove();
      }
      const key=r+'_'+c;
      if(digTargets[key]!==undefined){
        let fill=el.querySelector('.digfill');
        if(!fill){ fill=document.createElement('div'); fill.className='digfill'; el.appendChild(fill); }
        fill.style.width=(digTargets[key]*100)+'%';
      } else {
        const fill=el.querySelector('.digfill');
        if(fill) fill.remove();
      }
    }
  }
}

let tokenEls={};
let _tokenLayerBatchFragment=null;
function appendTokenLayerNode(node){
  if(!node||!els?.tokenLayer) return node;
  if(_tokenLayerBatchFragment) _tokenLayerBatchFragment.appendChild(node);
  else els.tokenLayer.appendChild(node);
  return node;
}
function updateTokenGeometry(el,size,left,top){
  if(!el) return;
  if(el._tokenSize!==size){ el._tokenSize=size; const v=size+'px'; el.style.width=v; el.style.height=v; }
  if(el._tokenLeft!==left){ el._tokenLeft=left; el.style.left=left+'px'; }
  if(el._tokenTop!==top){ el._tokenTop=top; el.style.top=top+'px'; }
}
function toggleTokenClass(el,name,on,cacheKey){
  if(!el) return;
  const key=cacheKey||('_cls_'+name);
  const v=!!on;
  if(el[key]===v) return;
  el[key]=v;
  el.classList.toggle(name,v);
}
const transientTokenVisuals=new Map();
function trackTransientToken(key,el,entity,type){
  if(key&&el&&entity) transientTokenVisuals.set(key,{el,entity,type});
}
const RANGED_COLOR={archer:'#3f9e5c', mage:'#5aa9e6', gunslinger:'#e0a44a', ice_mage:'#78dfff', spirit_caller:'#68e5ff', curse_caster:'#b76bf2', alchemist:'#b6ff5c', bard:'#f0c36a', royal_longbow:'#e8c860', battle_mage:'#7aa8ff', rune_guardian:'#b98cff', imperial_magus:'#ffe08a'};
// v60: 신규 원거리/마법 몬스터의 투사체 종류와 테마색 (기존 몬스터는 종전대로 보라색)
const MONSTER_PROJECTILE_STYLE={
  vine_archer:{kind:'arrow',color:'#8bd45c'}, bomb_goblin:{kind:'magic',color:'#ff8c42'}, wisp:{kind:'magic',color:'#5aa9ff'},
  frost_witch:{kind:'ice',color:'#78dfff'}, lightning_mage:{kind:'magic',color:'#ffd84a'}, swamp_hag:{kind:'magic',color:'#9acb4a'},
  goblin_shaman:{kind:'magic',color:'#f0c36a'}
};
function monsterProjectileColor(typeId){ const st=MONSTER_PROJECTILE_STYLE[typeId]; return st?st.color:'#b76bf2'; }
function rangedProjectileKind(owner,typeId,special){
  if(owner!=='hero' && MONSTER_PROJECTILE_STYLE[typeId]) return MONSTER_PROJECTILE_STYLE[typeId].kind;
  if(owner==='hero'){
    if(['archer','hunter','royal_longbow'].includes(typeId)) return 'arrow';
    if(typeId==='gunslinger') return 'bullet';
    if(['ice_mage'].includes(typeId)) return 'ice';
    if(['curse_caster'].includes(typeId)) return 'dark';
    return 'magic';
  }
  if(special==='ranged' || ['goblin_archer','skeleton_archer'].includes(typeId)) return 'arrow';
  if(typeId==='ghost_sniper' || typeId==='gunslinger') return 'bullet';
  if(special==='frost') return 'ice';
  if(special==='curse' || special==='lifesteal') return 'dark';
  return 'magic';
}
// v53: 캐릭터 이미지를 현재보다 30% 더 크게 보여줄 영웅들 (토큰 영역/이동/충돌 판정은 그대로, 그림만 확대)
//      크기를 더 바꾸고 싶으면 이 목록에 id를 넣고 빼거나, patches.css 맨 아래의 130%/211.12% 값을 조정하세요.
const HERO_XL_SPRITE=['swordsaint','dragonslayer','sun_lancer','griffon_knight','dark_knight','horseman','pikeman','dragon_rider','rune_guardian','royal_longbow','battle_mage','royal_guard','royal_lance','royal_elite'];
const HERO_FACING_INVERT={mage:true, assassin:true, gunslinger:false, summoner:false};
const MONSTER_FACING_INVERT={dragon:true, golem:true, ice_golem:true, rock_colossus:true, lich_lord:true, dark_sorcerer:true, goblin_archer:true,
  // v52: 사용자가 실제로 반대 방향으로 뒤집혀 보인다고 확인해준 8종
  slime:true, goblin:true, spider:true, orc:true, fire:true, angry_orc:true, shadow_goblin:true, bone_priest:true,
  // v60: 신규 몬스터 12종은 원본 그림이 오른쪽을 바라봅니다
  lizardman:true, minotaur:true, spiked_turtle:true, bomb_goblin:true, vine_archer:true, wisp:true, frost_witch:true, lightning_mage:true, goblin_shaman:true, swamp_hag:true, thief_rat:true, frenzied_bear:true};
// v44: 특정 몬스터만 기본 크기에서 배율을 조정하고 싶을 때 사용합니다. (1보다 작으면 축소)
const MONSTER_SIZE_MUL={goblin_archer:0.8, wisp:0.8, thief_rat:0.85, minotaur:1.08, frenzied_bear:1.1}; // v60: 작은/큰 신규 몬스터 보정


/* ---------------- dungeon structure / room & corridor ---------------- */
function dungeonStructureInvalidate(){
  if(state) state._physicalTopologyVersion=(state._physicalTopologyVersion||0)+1;
  if(!state) return;
  state.dungeonLayoutVersion=(state.dungeonLayoutVersion||0)+1;
  state.dungeonStructure=null;
  state._mapDirty=true;
  state._rangesDirty=true;
  state._archetypeDirty=true;
  state._auraDirty=true;
  state._panelDirty=true;
}
function floorLikeTile(r,c){
  if(!state || !inBounds(r,c)) return false;
  const t=state.grid[r][c];
  return !!t && (t.type==='floor'||t.type==='core') && !t.playerWall;
}
function localFloorDensity(r,c,radius=2){
  let n=0,total=0;
  for(let rr=r-radius;rr<=r+radius;rr++) for(let cc=c-radius;cc<=c+radius;cc++){
    if(!inBounds(rr,cc)) continue;
    total++;
    if(floorLikeTile(rr,cc)) n++;
  }
  return total ? n/total : 0;
}
function computeDungeonStructure(){
  if(!state) return null;
  const ver=state.dungeonLayoutVersion||0;
  if(state.dungeonStructure && state.dungeonStructure.version===ver) return state.dungeonStructure;
  const zones={};
  const cells={};
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(!floorLikeTile(r,c)) continue;
    const n=neighbors4(r,c).filter(([rr,cc])=>floorLikeTile(rr,cc)).length;
    const density=localFloorDensity(r,c,2);
    const ns=neighbors4(r,c).filter(([rr,cc])=>floorLikeTile(rr,cc));
    const hasUp=ns.some(([rr,cc])=>rr<r), hasDown=ns.some(([rr,cc])=>rr>r), hasLeft=ns.some(([rr,cc])=>cc<c), hasRight=ns.some(([rr,cc])=>cc>c);
    const straight=(hasUp&&hasDown)||(hasLeft&&hasRight);
    let zone='corridor';
    if(r===CORE_R&&c===CORE_C) zone='core';
    else if(state.grid[r][c].isEntrance) zone='entrance';
    else if(n>=3 && density>=0.48) zone='room';
    else if(n>=3) zone='junction';
    else if(n===2 && !straight) zone='corner';
    else if(n===1) zone='deadend';
    else if(n===0) zone='isolated';
    cells[r+'_'+c]={zone,neighbors:n,density};
    zones[zone]=(zones[zone]||0)+1;
  }
  const structure={version:ver,cells,zones};
  state.dungeonStructure=structure;
  return structure;
}
function dungeonZoneAt(r,c){
  const st=computeDungeonStructure();
  return st?.cells?.[r+'_'+c]?.zone || 'rock';
}
function dungeonZoneLabel(zone){
  return ({room:'방',corridor:'통로',junction:'교차로',corner:'코너',deadend:'막다른길',entrance:'입구',core:'핵실',isolated:'고립공간',rock:'암벽'})[zone]||zone;
}
function roleForLocation(entity){
  const t=entity&&entity.typeId ? (entity.typeId && MONSTER_TYPES.find(x=>x.id===entity.typeId)) : null;
  const ht=entity&&entity.typeId ? (entity.typeId && HERO_TYPES.find(x=>x.id===entity.typeId)) : null;
  return {
    ranged:!!(entity&&((entity.range||1)>1 || t?.special==='ranged' || t?.role==='mage' || ht?.range>1)),
    melee:!!(entity&&((entity.range||1)<=1 && t?.special!=='ranged' && ht?.range<=1)),
    tank:!!(entity&&(t?.special==='tank'||t?.special==='guard'||t?.special==='golem'||ht?.dmgReduction)),
  };
}
function locationCombatMultiplier(entity, purpose='attack'){ return 1; }
function locationDefenseMultiplier(entity){ return 1; }

function syncTokenTransientVisuals(now=performance.now()){
  if(!state||!transientTokenVisuals.size) return;
  for(const [key,rec] of transientTokenVisuals){
    const el=rec.el,entity=rec.entity;
    if(!el||!el.isConnected||!entity){transientTokenVisuals.delete(key);continue;}
    let keep=false;
    if(rec.type==='monster'){
      const flash=now-(entity.lastAttackAt||0)<300;
      toggleTokenClass(el,'flash',flash,'_flash'); keep=flash;
    }else if(rec.type==='mawang'){
      const hit=now-(entity.lastAttackAt||0)<260;
      toggleTokenClass(el,'mawang-hit',hit,'_mawangHit'); keep=hit;
    }else if(rec.type==='hero'){
      const flash=now-(entity.lastAttackAt||0)<300;
      const heal=now-(entity.lastHealAt||0)<300;
      toggleTokenClass(el,'flash',flash,'_flash');
      toggleTokenClass(el,'healpulse',heal,'_healPulse');
      const bubble=el._tokenRefs?.bubble;
      const bubbleVisible=!!(bubble&&now<=(entity.bubbleUntil||0)&&entity.bubbleText);
      if(bubble) bubble.classList.toggle('show',bubbleVisible);
      keep=flash||heal||bubbleVisible;
    }
    if(!keep) transientTokenVisuals.delete(key);
  }
}

function syncTokens(){
  if(!state) return;
  const px=currentCellPx;
  const seen=new Set();
  const now=performance.now();
  const heroIds=new Set();
  const monsterIds=new Set();
  const heroesTargetedByMonsters=new Set();
  const monstersTargetedByHeroes=new Set();
  for(const h of state.heroes){ heroIds.add(h.id); if(h.targetMonsterId!=null) monstersTargetedByHeroes.add(h.targetMonsterId); }
  for(const m of state.monsters){ monsterIds.add(m.id); if(m.targetHeroId!=null) heroesTargetedByMonsters.add(m.targetHeroId); }

  function ensureToken(key, typeId, extraClass){
    let el=tokenEls[key];
    if(!el){
      el=document.createElement('div'); el.className='token '+extraClass+' spawn-in';
      if(extraClass==='hero' && ['druid','alchemist','martial_artist','dual_wielder','dark_knight','ironclad','lancer'].includes(typeId)){
        el.classList.add('hero-large-sprite');
      }
      if(extraClass==='hero' && HERO_XL_SPRITE.includes(typeId)) el.classList.add('hero-xl-sprite'); // v53
      const wrap=document.createElement('div'); wrap.className='spriteWrap';
      const facing=document.createElement('div'); facing.className='facing';
      const img=document.createElement('img'); img.className='tokimg'; img.src=(typeId==='__mawang__'?window.MAWANG_SPRITE_DATA:SPRITE_DATA[typeId]);
      img.style.animationDelay=(-Math.random()*1.1)+'s';
      facing.appendChild(img); wrap.appendChild(facing); el.appendChild(wrap);
      if(extraClass==='hero' || extraClass==='monster' || extraClass==='mawang-token'){
        const hpbar=document.createElement('div'); hpbar.className='unit-hpbar';
        const hpfill=document.createElement('div'); hpfill.className='unit-hpfill';
        hpbar.appendChild(hpfill); el.appendChild(hpbar);
        const badge=document.createElement('div'); badge.className='lvbadge';
        el.appendChild(badge);
        const statusRing=document.createElement('div'); statusRing.className='status-ring';
        const statusIcon=document.createElement('span'); statusIcon.className='status-icon';
        statusRing.appendChild(statusIcon); el.appendChild(statusRing);
      }
      if(extraClass==='mawang-token'){
        const crown=document.createElement('div'); crown.className='mawang-crown'; crown.textContent='👑'; el.appendChild(crown);
        el.style.pointerEvents='auto';
        el.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation(); if(!state?.mawang)return; Sound.ui(); state.selected={kind:'mawang'}; renderUI();});
        el.addEventListener('pointerup',(e)=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();e.stopPropagation(); if(!state?.mawang)return; Sound.ui(); state.selected={kind:'mawang'}; renderUI();}});
      }
      if(extraClass==='hero'){
        const bubble=document.createElement('div'); bubble.className='speech-bubble';
        el.appendChild(bubble);
        el.style.pointerEvents='auto';
        el.addEventListener('click',(e)=>{
          e.preventDefault(); e.stopPropagation();
          const hero=state && state.heroes ? state.heroes.find(x=>x.id===Number(String(key).slice(1))) : null;
          if(!hero) return;
          Sound.ui();
          state.selected={kind:'hero',id:hero.id};
          renderUI();
        });
        el.addEventListener('pointerup',(e)=>{
          if(e.pointerType==='touch' || e.pointerType==='pen'){
            e.preventDefault(); e.stopPropagation();
            const hero=state && state.heroes ? state.heroes.find(x=>x.id===Number(String(key).slice(1))) : null;
            if(!hero) return;
            Sound.ui();
            state.selected={kind:'hero',id:hero.id};
            renderUI();
          }
        });
      }
      appendTokenLayerNode(el); tokenEls[key]=el;
      el._tokenRefs={
        wrap:el.querySelector('.spriteWrap'), facing:el.querySelector('.facing'),
        hpbar:el.querySelector('.unit-hpbar'), hpfill:el.querySelector('.unit-hpfill'), badge:el.querySelector('.lvbadge'),
        statusRing:el.querySelector('.status-ring'), statusIcon:el.querySelector('.status-icon'), bubble:el.querySelector('.speech-bubble')
      };
      el.addEventListener('animationend',()=>el.classList.remove('spawn-in'),{once:true});
      el.dataset.lastR=''; el.dataset.lastC=''; el.dataset.flip='0'; el.dataset.tier=''; el.dataset.statusSig='';
    }
    if(!el._tokenRefs){
      el._tokenRefs={
        wrap:el.querySelector('.spriteWrap'), facing:el.querySelector('.facing'),
        hpbar:el.querySelector('.unit-hpbar'), hpfill:el.querySelector('.unit-hpfill'), badge:el.querySelector('.lvbadge'),
        statusRing:el.querySelector('.status-ring'), statusIcon:el.querySelector('.status-icon'), bubble:el.querySelector('.speech-bubble')
      };
    }
    return el;
  }
  function updateFacing(el, curR, curC, invert){
    const prevR=parseFloat(el.dataset.lastR||curR), prevC=parseFloat(el.dataset.lastC||curC);
    let dir=null;
    if(curC<prevC-0.001) dir='left';
    else if(curC>prevC+0.001) dir='right';
    let nextFlip=el.dataset.flip||'0';
    if(dir){
      const flipRight = invert ? '0' : '1';
      const flipLeft  = invert ? '1' : '0';
      nextFlip = dir==='right' ? flipRight : flipLeft;
    }
    if(nextFlip!==el.dataset.flip){
      el.dataset.flip=nextFlip;
      const facing=el._tokenRefs?.facing;
      if(facing) facing.style.transform = nextFlip==='1' ? 'scaleX(-1)' : 'scaleX(1)';
    }
    el.dataset.lastR=curR; el.dataset.lastC=curC;
  }
  function updateStatusVisual(el, entity){
    const ring=el._tokenRefs?.statusRing; if(!ring) return;
    const icon=el._tokenRefs?.statusIcon;
    const active=[];
    const nowMs=now;
    if(entity.flameBurnUntil&&entity.flameBurnUntil>nowMs) active.push(['status-burn','🔥']);
    if((entity.obstaclePoisonUntil&&entity.obstaclePoisonUntil>nowMs)||(entity.poisonSpreadUntil&&entity.poisonSpreadUntil>nowMs)) active.push(['status-poison','☠']);
    if(entity.frostSlowUntil&&entity.frostSlowUntil>nowMs) active.push(['status-frost','❄']);
    if((entity.monsterCurseUntil&&entity.monsterCurseUntil>nowMs)||(entity.obstacleCurseUntil&&entity.obstacleCurseUntil>nowMs)||(entity.monsterSkillCurseUntil&&entity.monsterSkillCurseUntil>nowMs)||(entity.skillSlowUntil&&entity.skillSlowUntil>nowMs)||(entity.webSlowUntil&&entity.webSlowUntil>nowMs)||(entity.fearUntil&&entity.fearUntil>nowMs)||(entity.healBlockedUntil&&entity.healBlockedUntil>nowMs)||(entity.skillDotUntil&&entity.skillDotUntil>nowMs)) active.push(['status-debuff','✦']);
    let cls='', glyph='';
    if(active.length){
      // 한 캐릭터에 여러 상태가 있어도 가장 중요한 상태 하나를 중심으로 표시해 화면이 지저분해지지 않도록 합니다.
      const preferred=active.find(x=>x[0]==='status-debuff')||active.find(x=>x[0]==='status-frost')||active.find(x=>x[0]==='status-poison')||active[0];
      cls=preferred[0]; glyph=preferred[1];
    }
    const sig=cls+'|'+glyph;
    if(el.dataset.statusSig===sig) return;
    el.dataset.statusSig=sig;
    ring.classList.remove('active','status-burn','status-poison','status-frost','status-debuff');
    if(cls) ring.classList.add('active',cls);
    if(icon) icon.textContent=glyph;
  }

  for(const m of state.monsters){
    const key='m'+m.id; seen.add(key);
    const el=ensureToken(key, m.typeId, 'monster');
    // v86: 몬스터 외형 성장 완화
    // Lv.1의 기존 크기(1.11)를 기준으로, 레벨당 성장량은 기존 0.16의 30%(0.048)만 적용합니다.
    // 종족별 기본 크기 차이는 유지하되, 어떤 레벨에서도 Lv.1 기본 크기의 2배를 넘지 않습니다.
    const monsterVisualLevel=Math.max(1,Math.min(MAX_TIER,m.tier||1));
    const monsterBaseScale=0.95+0.16; // 기존 Lv.1 시각 크기 = 1.11
    const monsterGrowthPerLevel=0.16*0.30; // 기존 대비 70% 감소
    const monsterLevelScale=Math.min(monsterBaseScale*2, monsterBaseScale+(monsterVisualLevel-1)*monsterGrowthPerLevel);
    const size=px*monsterLevelScale*TOKEN_VIEW_SCALE*(MONSTER_SIZE_MUL[m.typeId]||1);
    updateTokenGeometry(el,size,m.c*px+px/2,m.r*px+px/2);
    updateFacing(el, m.r, m.c, !!MONSTER_FACING_INVERT[m.typeId]);
    const monsterFlash=now-(m.lastAttackAt||0)<300;
    toggleTokenClass(el,'flash',monsterFlash,'_flash');
    if(monsterFlash) trackTransientToken(key,el,m,'monster');
    toggleTokenClass(el,'targeting',m.targetHeroId!=null&&heroIds.has(m.targetHeroId),'_targeting');
    toggleTokenClass(el,'targeted',monstersTargetedByHeroes.has(m.id),'_targeted');
    const tierKey=String(m.tier);
    if(el.dataset.tier!==tierKey){
      const prevTier=Number(el.dataset.tier)||0;
      if(prevTier) el.classList.remove('tier-'+prevTier);
      el.classList.add('tier-'+m.tier); el.dataset.tier=tierKey;
      const tierColor=TIER_COLORS[(m.tier-1)%TIER_COLORS.length]||'#e0b64a';
      const badge=el._tokenRefs?.badge;
      if(badge){ badge.style.color=tierColor; badge.style.borderColor=tierColor; }
    }
    const monsterSelected=!!(state.selected&&state.selected.kind==='monster'&&state.selected.id===m.id);
    if(el._selectedOutline!==monsterSelected){ el._selectedOutline=monsterSelected; el.style.outline=monsterSelected?'2px solid var(--gold)':'none'; }
    const mHpFill=el._tokenRefs?.hpfill;
    if(mHpFill){ const hpw=Math.max(0,Math.min(100,(m.hp/Math.max(1,m.maxHp))*100)).toFixed(2)+'%'; if(mHpFill.style.width!==hpw)mHpFill.style.width=hpw; }
    const mHpBar=el._tokenRefs?.hpbar;
    if(mHpBar){ const aria='HP '+Math.max(0,Math.round(m.hp))+'/'+Math.max(1,Math.round(m.maxHp)); if(mHpBar.getAttribute('aria-label')!==aria)mHpBar.setAttribute('aria-label',aria); }
    const mBadge=el._tokenRefs?.badge;
    if(mBadge){
      const txt='Lv.'+m.tier;
      if(mBadge.textContent!==txt) mBadge.textContent=txt;
    }
    updateStatusVisual(el,m);
  }


  // ===== 플레이어 전용 마왕 토큰 =====
  // v40: 핵 배치 단계에서는 마왕이 설 자리가 아직 정해지지 않았으므로 표시하지 않습니다.
  if(state.mawang && !state.mawang.dead && state.corePlaced!==false && state.phase!=='placeCore'){
    const m=state.mawang; const key='mawang'; seen.add(key);
    const el=ensureToken(key,'__mawang__','mawang-token');
    const size=px*1.52*0.7*TOKEN_VIEW_SCALE; // v43: 마왕 크기를 기존 대비 30% 축소
    updateTokenGeometry(el,size,m.c*px+px/2,m.r*px+px/2);
    // 마왕 원본 스프라이트는 오른쪽을 바라보고 있으므로, 이동 방향과 시선을 일치시킵니다.
    updateFacing(el,m.r,m.c,true);
    const mawangHit=now-(m.lastAttackAt||0)<260;
    toggleTokenClass(el,'mawang-hit',mawangHit,'_mawangHit');
    if(mawangHit) trackTransientToken(key,el,m,'mawang');
    toggleTokenClass(el,'mawang-selected',!!(state.selected&&state.selected.kind==='mawang'),'_mawangSelected');
    const fill=el._tokenRefs?.hpfill; if(fill){ const hpw=Math.max(0,Math.min(100,(m.hp/Math.max(1,m.maxHp))*100)).toFixed(2)+'%'; if(fill.style.width!==hpw)fill.style.width=hpw; }
    const bar=el._tokenRefs?.hpbar; if(bar){ const aria='마왕 HP '+Math.max(0,Math.round(m.hp))+'/'+Math.max(1,Math.round(m.maxHp)); if(bar.getAttribute('aria-label')!==aria)bar.setAttribute('aria-label',aria); }
    const badge=el._tokenRefs?.badge; if(badge){ const txt='Lv.'+(m.level||mawangProfile.level||1); if(badge.textContent!==txt)badge.textContent=txt; }
    updateStatusVisual(el,m);
  }

  for(const h of state.heroes){
    const key='h'+h.id; seen.add(key);
    const el=ensureToken(key, h.typeId, 'hero');
    const levelMul=1+Math.min(HERO_LEVEL_SIZE_CAP, Math.max(0,(h.level||1)-1)*HERO_LEVEL_SIZE_MUL);
    const size=px*(h.majorBoss?1.12:(h.isBoss?1.6:1.0))*levelMul*TOKEN_VIEW_SCALE;
    updateTokenGeometry(el,size,h.c*px+px/2,h.r*px+px/2);
    updateFacing(el, h.r, h.c, Object.prototype.hasOwnProperty.call(HERO_FACING_INVERT,h.typeId)?HERO_FACING_INVERT[h.typeId]:true);
    toggleTokenClass(el,'boss',!!h.isBoss,'_boss');
    toggleTokenClass(el,'elite',!!h.elite,'_elite');
    const heroFlash=now-(h.lastAttackAt||0)<300, heroHeal=now-(h.lastHealAt||0)<300;
    toggleTokenClass(el,'flash',heroFlash,'_flash');
    toggleTokenClass(el,'healpulse',heroHeal,'_healPulse');
    if(heroFlash||heroHeal) trackTransientToken(key,el,h,'hero');
    toggleTokenClass(el,'casting',!!h.castingSkill,'_casting');
    toggleTokenClass(el,'targeting',h.targetMonsterId!=null&&monsterIds.has(h.targetMonsterId),'_targeting');
    toggleTokenClass(el,'targeted',heroesTargetedByMonsters.has(h.id),'_targeted');
    const hHpFill=el._tokenRefs?.hpfill;
    if(hHpFill){ const hpw=Math.max(0,Math.min(100,(h.hp/Math.max(1,h.maxHp))*100)).toFixed(2)+'%'; if(hHpFill.style.width!==hpw)hHpFill.style.width=hpw; }
    const hHpBar=el._tokenRefs?.hpbar;
    if(hHpBar){ const aria='HP '+Math.max(0,Math.round(h.hp))+'/'+Math.max(1,Math.round(h.maxHp)); if(hHpBar.getAttribute('aria-label')!==aria)hHpBar.setAttribute('aria-label',aria); }
    const badge=el._tokenRefs?.badge;
    if(badge){
      const txt='Lv.'+(h.level||1);
      if(badge.textContent!==txt) badge.textContent=txt;
    }
    const bubble=el._tokenRefs?.bubble;
    if(bubble){
      const visible=now<=(h.bubbleUntil||0) && !!h.bubbleText;
      const kind=h.bubbleKind||'';
      const bubbleSig=(visible?'1':'0')+'|'+kind;
      if(bubble._sig!==bubbleSig){
        bubble._sig=bubbleSig;
        bubble.classList.toggle('show',visible);
        bubble.classList.toggle('alert',kind==='alert');
        bubble.classList.toggle('question',kind==='question');
        bubble.classList.toggle('skill',kind==='skill');
        bubble.classList.toggle('flee',kind==='flee');
        bubble.classList.toggle('trapHit',kind==='trapHit');
      }
      if(visible){
        if(bubble.textContent!==h.bubbleText) bubble.textContent=h.bubbleText;
        trackTransientToken(key,el,h,'hero');
      }
    }
    updateStatusVisual(el,h);
  }

  for(const key in tokenEls){
    if(!seen.has(key)){
      const el=tokenEls[key];
      transientTokenVisuals.delete(key);
      if(typeof physicalOwnsToken==='function' && physicalOwnsToken(key)){ el.remove(); delete tokenEls[key]; continue; }
      el.classList.add('dying');
      setTimeout(()=>{ if(el.parentNode) el.remove(); }, 720);
      delete tokenEls[key];
    }
  }

  if(state.deathFx.length){
    state.deathFx=state.deathFx.filter(fx=>{
      const age=now-fx.start;
      if(age>760) return false;
      if(!fx.el){
        fx.el=document.createElement('div'); fx.el.className='deathfx';
        fx.el.style.left=(fx.c*px+px/2)+'px'; fx.el.style.top=(fx.r*px+px/2)+'px';
        const r1=document.createElement('div'); r1.className='ring1';
        const r2=document.createElement('div'); r2.className='ring2'; r2.style.borderColor=fx.color;
        fx.el.appendChild(r1); fx.el.appendChild(r2);
        appendTokenLayerNode(fx.el);
      }
      return true;
    });
  }

  try{ syncMagicCircles(); }catch(err){ console.error('[magic circle]',err); }
  processFxEvents();
}

/* ==========================================================================
   v58 · 마법사 마법진 이펙트
   마법사(HERO_TYPES.caster)가 마법을 시전하는 동안
   - 표적 아래 바닥에 "착탄 범위와 같은 크기"의 마법진이 새겨지고, 시전이 진행될수록 커지며 밝아집니다.
     (위치는 실제 폭발 중심과 같은 규칙 spellCastCenter 로 정해져서 표적을 따라갑니다)
   - 시전자 발밑에도 작은 마법진이 돕니다.
   - 시전이 끝나면 표적 마법진이 폭발하듯 퍼지며 사라집니다.
   색은 마법 속성(skillStyle)을 따릅니다.
   ========================================================================== */
let magicCircleEls={};
function mcRingSvg(){
  let ticks='',runes='';
  for(let i=0;i<24;i++){ const a=i*15*Math.PI/180, r2=(i%2?95:98); ticks+=`<line x1="${(100+Math.cos(a)*90).toFixed(1)}" y1="${(100+Math.sin(a)*90).toFixed(1)}" x2="${(100+Math.cos(a)*r2).toFixed(1)}" y2="${(100+Math.sin(a)*r2).toFixed(1)}" stroke="currentColor" stroke-width="${i%2?1.2:2}"/>`; }
  for(let i=0;i<12;i++){ const a=(i*30+15)*Math.PI/180, x=100+Math.cos(a)*78, y=100+Math.sin(a)*78; runes+=`<rect x="${(x-2.8).toFixed(1)}" y="${(y-2.8).toFixed(1)}" width="5.6" height="5.6" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }
  return `<circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" stroke-width="1.1" stroke-dasharray="2 5" opacity=".85"/>${ticks}<g fill="currentColor" opacity=".9">${runes}</g>`;
}
function mcStarSvg(){
  const tri=(rot)=>{ const pts=[0,1,2].map(k=>{ const a=(rot+k*120-90)*Math.PI/180; return (100+Math.cos(a)*66).toFixed(1)+','+(100+Math.sin(a)*66).toFixed(1); }).join(' '); return `<polygon points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`; };
  return `<circle cx="100" cy="100" r="66" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".85"/>${tri(0)}${tri(60)}<circle cx="100" cy="100" r="33" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="100" cy="100" r="5.5" fill="currentColor"/>`;
}
function buildMagicCircle(kind,cls,icon){
  const st=skillStyle(kind);
  const dark=MC_DARK_KINDS.indexOf(kind)>=0;
  const el=document.createElement('div');
  // v59: 저주/흑마법은 더 짙은 보라색 + 어두운 광채(mc-dark)
  el.className='magic-circle '+cls+(dark?' mc-dark':'');
  el.style.setProperty('--mc-color',mcColor(kind));
  el.innerHTML=`<div class="mc-glow"></div><svg class="mc-ring" viewBox="0 0 200 200" aria-hidden="true">${mcRingSvg()}</svg><svg class="mc-star" viewBox="0 0 200 200" aria-hidden="true">${mcStarSvg()}</svg>`
    +(cls.indexOf('mc-target')>=0?`<span class="mc-icon">${icon||st.glyph}</span>`:'');
  return el;
}

// v62 · 용사 마법사 전용 시각 언어. 같은 마법진을 공유하지 않고 주문별 실루엣을 구분합니다.
const CASTER_FX_META={
  arcane_bolt:{color:'#a98bff'}, arcane_burst:{color:'#d5b7ff'},
  meteor_shower:{color:'#ff8a3d'}, doom_comet:{color:'#ff5a32'},
  holy_burst:{color:'#ffe89a'}, frost_arrow:{color:'#7fe9ff'}, ice_lance:{color:'#b6f5ff'},
  spirit_orb:{color:'#66e7dc'}, spirit_summon:{color:'#79f5cf'},
  curse_bolt:{color:'#b56cf0'}, mass_curse:{color:'#8f4bce'},
  battle_bolt:{color:'#79a8ff'}, mana_blast:{color:'#8c86ff'},
  arrow_rain:{color:'#9ef6a7'}, mana_barrage:{color:'#73bbff'}, wraith_swarm:{color:'#b47aff'},
  nature_regen:{color:'#90ff98'}, divine_blessing:{color:'#ffc7df'}, heroic_anthem:{color:'#ffd86a'},
  potion_burst:{color:'#64f4d5'}, piercing_shot:{color:'#aaf5a2'}, rune_barrier:{color:'#9db1ff'}, radiant_heal:{color:'#ffe89b'}
};
const CASTER_FX_SPRITES={
  arcane_bolt:'assets/images/spells/arcane_bolt.png',
  arcane_burst:'assets/images/spells/arcane_burst.png',
  meteor_shower:'assets/images/spells/meteor_shower.png',
  doom_comet:'assets/images/spells/doom_comet.png',
  holy_burst:'assets/images/spells/holy_burst.png',
  frost_arrow:'assets/images/spells/frost_arrow.png',
  ice_lance:'assets/images/spells/ice_lance.png',
  spirit_orb:'assets/images/spells/spirit_orb.png',
  spirit_summon:'assets/images/spells/spirit_summon.png',
  curse_bolt:'assets/images/spells/curse_bolt.png',
  mass_curse:'assets/images/spells/mass_curse.png',
  battle_bolt:'assets/images/spells/battle_bolt.png',
  mana_blast:'assets/images/spells/mana_blast.png',
  arrow_rain:'assets/images/spells/arrow_rain.png',
  mana_barrage:'assets/images/spells/mana_barrage.png',
  wraith_swarm:'assets/images/spells/wraith_swarm.png',
  nature_regen:'assets/images/spells/nature_regen.png',
  divine_blessing:'assets/images/spells/divine_blessing.png',
  heroic_anthem:'assets/images/spells/heroic_anthem.png',
  potion_burst:'assets/images/spells/potion_burst.png',
  piercing_shot:'assets/images/spells/piercing_shot.png',
  rune_barrier:'assets/images/spells/rune_barrier.png',
  radiant_heal:'assets/images/spells/radiant_heal.png'
};
function casterFxMeta(c){
  const key=(c&&c.fx)||'';
  return {key:key||'generic',color:(CASTER_FX_META[key]&&CASTER_FX_META[key].color)||mcColor((c&&c.kind)||'arcane')};
}
function casterFxSpriteSrc(key){ return key&&CASTER_FX_SPRITES[key] ? CASTER_FX_SPRITES[key] : ''; }
function casterFxSpriteSheetSrc(key){
  const src=casterFxSpriteSrc(key);
  return src ? src.replace(/\.png$/,'_sheet.png') : '';
}
function appendCasterFxSprite(parent,className,fx,mode='once'){
  const src=casterFxSpriteSrc(fx), sheet=casterFxSpriteSheetSrc(fx);
  if(!src || !parent) return false;
  const el=document.createElement('i');
  el.className=className + (sheet?' sprite-sheet':'') + (mode==='loop'?' sprite-loop':' sprite-once');
  el.setAttribute('aria-hidden','true');
  el.style.backgroundImage=`url(${sheet||src})`;
  el.style.setProperty('--sprite-frames', sheet ? 6 : 1);
  parent.appendChild(el);
  return true;
}
function buildCasterTelegraph(c,cls){
  const meta=casterFxMeta(c), el=document.createElement('div');
  el.className='caster-telegraph '+cls+' fx-'+meta.key;
  el.style.setProperty('--fx-color',meta.color);
  let rays='',particles='';
  for(let i=0;i<8;i++) rays+=`<i class="cst-ray" style="--a:${i*45}deg;--i:${i}"></i>`;
  const pts=[[18,24],[72,18],[86,58],[66,84],[28,82],[12,58],[50,12],[48,90]];
  for(let i=0;i<pts.length;i++) particles+=`<i class="cst-particle" style="--x:${pts[i][0]}%;--y:${pts[i][1]}%;--i:${i};--a:${i*45}deg"></i>`;
  el.innerHTML=`<div class="cst-glow"></div><i class="cst-ring cst-ring-a"></i><i class="cst-ring cst-ring-b"></i><i class="cst-core"></i><div class="cst-rays">${rays}</div><div class="cst-particles">${particles}</div>`;
  if(!appendCasterFxSprite(el,'cst-sprite',meta.key,'loop')){
    const icon=document.createElement('span'); icon.className='cst-icon'; icon.textContent=c.icon||skillStyle(c.kind).glyph; el.appendChild(icon);
  }
  return el;
}
function appendHeroSpellImpact(ev,px){
  const meta=casterFxMeta(ev), fx=meta.key;
  if(Sound.spellImpact) Sound.spellImpact(ev.spell||'arcane',fx,fx==='doom_comet'||fx==='meteor_shower');
  const wrap=document.createElement('div');
  wrap.className='hero-spell-impact fx-'+fx;
  wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
  wrap.style.color=meta.color;
  const size=px*Math.max(1.7,(ev.radius||1)*2+1.05);
  wrap.style.setProperty('--impact-size',size+'px');
  const flash=document.createElement('i'); flash.className='hsi-flash'; wrap.appendChild(flash);
  for(let i=0;i<3;i++){ const ring=document.createElement('i'); ring.className='hsi-ring r'+(i+1); wrap.appendChild(ring); }
  const core=document.createElement('i'); core.className='hsi-core'; wrap.appendChild(core);
  if(!appendCasterFxSprite(wrap,'hsi-sprite',fx,'once') && ev.icon){ const icon=document.createElement('span'); icon.className='hsi-icon'; icon.textContent=ev.icon; wrap.appendChild(icon); }
  for(let i=0;i<12;i++){
    const p=document.createElement('i'); p.className='hsi-particle'; p.style.setProperty('--a',(i*30)+'deg'); p.style.setProperty('--i',i); p.style.setProperty('--d',(size*(.28+(i%4)*.07))+'px'); wrap.appendChild(p);
  }
  if(fx==='meteor_shower'){
    [[-0.62,-0.35],[-0.2,0.18],[0.34,-0.5],[0.58,0.24],[-0.42,0.52]].forEach((q,i)=>{const m=document.createElement('i');m.className='hsi-meteor';m.style.setProperty('--x',(q[0]*size*.42)+'px');m.style.setProperty('--y',(q[1]*size*.42)+'px');m.style.setProperty('--i',i);wrap.appendChild(m);});
  } else if(fx==='doom_comet'){
    const comet=document.createElement('i'); comet.className='hsi-comet'; wrap.appendChild(comet);
  } else if(fx==='holy_burst'){
    const pillar=document.createElement('i'); pillar.className='hsi-pillar'; wrap.appendChild(pillar);
  } else if(fx==='ice_lance'||fx==='frost_arrow'){
    for(let i=0;i<6;i++){const sh=document.createElement('i');sh.className='hsi-ice-shard';sh.style.setProperty('--a',(i*60)+'deg');wrap.appendChild(sh);}
  } else if(fx==='spirit_orb'||fx==='spirit_summon'){
    for(let i=0;i<6;i++){const w=document.createElement('i');w.className='hsi-wisp';w.style.setProperty('--a',(i*60)+'deg');w.style.setProperty('--i',i);wrap.appendChild(w);}
  } else if(fx==='curse_bolt'||fx==='mass_curse'){
    for(let i=0;i<7;i++){const t=document.createElement('i');t.className='hsi-tendril';t.style.setProperty('--a',(i*360/7)+'deg');t.style.setProperty('--i',i);wrap.appendChild(t);}
  } else if(fx==='battle_bolt'||fx==='mana_blast'){
    for(let i=0;i<5;i++){const a=document.createElement('i');a.className='hsi-arc';a.style.setProperty('--a',(i*72)+'deg');wrap.appendChild(a);}
  }
  appendTokenLayerNode(wrap);
  setTimeout(()=>wrap.remove(),fx==='doom_comet'?1100:930);
}

function spellFxDelayRun(ev,fn){
  const delay=Math.max(0,Math.round(ev&&ev.delay||0));
  if(delay>0) setTimeout(fn,delay); else fn();
}
function appendMawangSkillImpact(ev,px){
  const size=px*Math.max(1.9,(ev.radius||1)*2.5);
  const wrap=document.createElement('div');
  wrap.className='mawang-skill-impact variant-'+(ev.variant||'hell-slash');
  wrap.style.left=(ev.c*px+px/2)+'px';
  wrap.style.top=(ev.r*px+px/2)+'px';
  wrap.style.setProperty('--mwi-size',size+'px');
  wrap.style.setProperty('--mwi-color',ev.color||'#ff8a9f');
  const flash=document.createElement('i'); flash.className='mwi-flash'; wrap.appendChild(flash);
  const ring=document.createElement('i'); ring.className='mwi-ring'; wrap.appendChild(ring);
  const ring2=document.createElement('i'); ring2.className='mwi-ring r2'; wrap.appendChild(ring2);
  const core=document.createElement('i'); core.className='mwi-core'; core.textContent=ev.icon||'👑'; wrap.appendChild(core);
  const sigil=document.createElement('i'); sigil.className='mwi-sigil'; sigil.textContent=(ev.skillName||'').slice(0,2)||''; wrap.appendChild(sigil);
  for(let i=0;i<4;i++){ const arc=document.createElement('i'); arc.className='mwi-arc a'+(i+1); arc.style.setProperty('--i',i); wrap.appendChild(arc); }
  for(let i=0;i<10;i++){ const shard=document.createElement('i'); shard.className='mwi-shard'; shard.style.setProperty('--a',(i*36)+'deg'); shard.style.setProperty('--i',i); wrap.appendChild(shard); }
  if((ev.variant||'')==='annihilation'){
    for(let i=0;i<4;i++){ const slash=document.createElement('i'); slash.className='mwi-slash s'+(i+1); slash.style.setProperty('--a',(i*45)+'deg'); wrap.appendChild(slash); }
    for(let i=0;i<8;i++){ const crack=document.createElement('i'); crack.className='mwi-crack c'+(i+1); crack.style.setProperty('--a',(i*45)+'deg'); wrap.appendChild(crack); }
    const crown=document.createElement('i'); crown.className='mwi-crown'; crown.textContent='👑'; wrap.appendChild(crown);
  }else if((ev.variant||'')==='execution-burst'){
    for(let i=0;i<5;i++){ const skull=document.createElement('i'); skull.className='mwi-skull'; skull.style.setProperty('--a',(-40+i*20)+'deg'); wrap.appendChild(skull); }
  }else{
    for(let i=0;i<3;i++){ const crescent=document.createElement('i'); crescent.className='mwi-crescent cr'+(i+1); crescent.style.setProperty('--a',(-30+i*30)+'deg'); crescent.style.setProperty('--i',i); wrap.appendChild(crescent); }
  }
  appendTokenLayerNode(wrap);
  setTimeout(()=>wrap.remove(),(ev.variant==='annihilation')?1200:860);
}

function appendMeleeSkillImpact(ev,px){
  const size=px*Math.max(1.7,(ev.radius||1)*2.25);
  const wrap=document.createElement('div');
  const rot=((ev.variant||'').length*23)%360-180;
  wrap.className='hero-melee-skill-impact wt-'+(ev.weaponType||'sword')+' variant-'+(ev.variant||'blade-burst');
  wrap.style.left=(ev.c*px+px/2)+'px';
  wrap.style.top=(ev.r*px+px/2)+'px';
  wrap.style.setProperty('--msi-size',size+'px');
  wrap.style.setProperty('--msi-color',ev.color||'#fff');
  wrap.style.setProperty('--msi-accent',ev.accent||'#fff');
  wrap.style.setProperty('--msi-rot',rot+'deg');
  const flash=document.createElement('i'); flash.className='msi-flash'; wrap.appendChild(flash);
  const ring=document.createElement('i'); ring.className='msi-ring'; wrap.appendChild(ring);
  const ring2=document.createElement('i'); ring2.className='msi-ring r2'; wrap.appendChild(ring2);
  const ring3=document.createElement('i'); ring3.className='msi-ring r3'; wrap.appendChild(ring3);
  const core=document.createElement('i'); core.className='msi-core'; if(ev.icon) core.textContent=ev.icon; wrap.appendChild(core);
  for(let i=0;i<3;i++){ const arc=document.createElement('i'); arc.className='msi-arc a'+(i+1); arc.style.setProperty('--i',i); wrap.appendChild(arc); }
  for(let i=0;i<6;i++){ const line=document.createElement('i'); line.className='msi-line l'+(i+1); line.style.setProperty('--a',(i*60)+'deg'); line.style.setProperty('--i',i); wrap.appendChild(line); }
  for(let i=0;i<10;i++){ const part=document.createElement('i'); part.className='msi-particle'; part.style.setProperty('--a',(i*36)+'deg'); part.style.setProperty('--i',i); wrap.appendChild(part); }
  const label=document.createElement('i'); label.className='msi-sigil'; label.textContent=(ev.skillName||'').slice(0,1)||''; wrap.appendChild(label);
  appendTokenLayerNode(wrap);
  setTimeout(()=>wrap.remove(),980);
}
function appendSpellProjectile(ev,px){
  const src=casterFxSpriteSrc(ev.fx||'');
  if(!src) return;
  const fromX=ev.fromC*px+px/2, fromY=ev.fromR*px+px/2;
  const toX=ev.toC*px+px/2, toY=ev.toR*px+px/2;
  const dx=toX-fromX, dy=toY-fromY;
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const duration=Math.max(220,ev.duration||300);
  const wrap=document.createElement('div');
  wrap.className='spell-projectile fx-'+(ev.fx||'generic');
  wrap.style.left=fromX+'px'; wrap.style.top=fromY+'px';
  wrap.style.color=ev.color||'#fff';
  wrap.style.setProperty('--angle',angle+'deg');
  wrap.style.setProperty('--sp-duration',duration+'ms');
  const img=document.createElement('i');
  img.className='spell-projectile-sprite sprite-sheet sprite-loop'; img.setAttribute('aria-hidden','true');
  img.style.backgroundImage=`url(${casterFxSpriteSheetSrc(ev.fx||'')||src})`; img.style.setProperty('--sprite-frames', casterFxSpriteSheetSrc(ev.fx||'')?6:1);
  wrap.appendChild(img);
  for(let i=0;i<3;i++){ const trail=document.createElement('i'); trail.className='spell-projectile-trail t'+(i+1); wrap.appendChild(trail); }
  appendTokenLayerNode(wrap);
  requestAnimationFrame(()=>{
    wrap.style.transition=`left ${duration}ms cubic-bezier(.18,.72,.22,1), top ${duration}ms cubic-bezier(.18,.72,.22,1)`;
    wrap.style.left=toX+'px'; wrap.style.top=toY+'px';
  });
  setTimeout(()=>{ if(wrap.isConnected) wrap.remove(); }, duration+80);
}
function appendSpellDrop(ev,px){
  const src=casterFxSpriteSrc(ev.fx||'');
  if(!src) return;
  const toX=ev.toC*px+px/2, toY=ev.toR*px+px/2;
  const fromY=-px*1.8;
  const count=Math.max(1,ev.count||1);
  const spread=Number(ev.spread||0);
  const duration=Math.max(420,ev.duration||680);
  const offsets=count===1?[0]:Array.from({length:count},(_,i)=>((i-(count-1)/2)/(Math.max(1,count-1)))*spread);
  offsets.forEach((off,i)=>{
    const wrap=document.createElement('div');
    wrap.className='spell-drop fx-'+(ev.fx||'generic')+(ev.fx==='doom_comet'?' doom':'');
    wrap.style.left=(toX+off*px)+'px'; wrap.style.top=fromY+'px';
    wrap.style.color=ev.color||'#fff';
    wrap.style.setProperty('--angle',ev.fx==='doom_comet' ? '-55deg' : '-48deg');
    wrap.style.setProperty('--sp-duration',duration+'ms');
    const img=document.createElement('i');
    img.className='spell-drop-sprite sprite-sheet sprite-loop'; img.setAttribute('aria-hidden','true');
    img.style.backgroundImage=`url(${casterFxSpriteSheetSrc(ev.fx||'')||src})`; img.style.setProperty('--sprite-frames', casterFxSpriteSheetSrc(ev.fx||'')?6:1);
    wrap.appendChild(img);
    const tail=document.createElement('i'); tail.className='spell-drop-tail'; wrap.appendChild(tail);
    if(ev.fx==='meteor_shower'){ const ember=document.createElement('i'); ember.className='spell-drop-ember'; wrap.appendChild(ember); }
    appendTokenLayerNode(wrap);
    requestAnimationFrame(()=>{
      wrap.style.transition=`left ${duration}ms cubic-bezier(.12,.62,.2,1), top ${duration}ms cubic-bezier(.12,.62,.2,1)`;
      wrap.style.left=(toX+off*px)+'px'; wrap.style.top=(toY+(Math.abs(off)*px*.12))+'px';
    });
    setTimeout(()=>{ if(wrap.isConnected) wrap.remove(); }, duration+120+i*40);
  });
}
// v59 · 힐러의 성스러운 황금색 물결 (마법진 대신): 바닥에서 파문이 퍼져 나가고 빛 입자가 떠오릅니다.
function buildHolyWave(){
  const el=document.createElement('div');
  el.className='holy-wave';
  let sparks='';
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2+.35, rad=.14+((i*29)%11)/45;
    sparks+=`<i class="hw-spark" style="--x:${(50+Math.cos(a)*rad*100).toFixed(1)}%;--y:${(50+Math.sin(a)*rad*100).toFixed(1)}%;--d:${(i*.21).toFixed(2)}s"></i>`;
  }
  el.innerHTML=`<div class="hw-glow"></div><i class="hw-ring r1"></i><i class="hw-ring r2"></i><i class="hw-ring r3"></i>${sparks}`;
  return el;
}
function placeMagicCircle(el,r,c,sizeCells,p){
  const px=currentCellPx, size=sizeCells*px;
  el.style.left=(c*px+px/2)+'px'; el.style.top=(r*px+px/2)+'px';
  el.style.width=size+'px'; el.style.height=size+'px';
  el.style.setProperty('--mc-size',size+'px'); el.style.setProperty('--p',p.toFixed(3));
}
function mcEnsure(key,builder){
  let el=magicCircleEls[key];
  if(!el||!el.isConnected){ el=builder(); appendTokenLayerNode(el); magicCircleEls[key]=el; }
  return el;
}
// 몬스터 스킬의 착탄 중심: 표적 용사가 살아 있고 보이면 그 현재 위치, 아니면 시전 시작 때 본 위치
function monsterSpellCenter(m){
  const s=m.castingSkill, tg=m.skillTarget||{r:m.r,c:m.c};
  const th=state.heroes.find(x=>x.id===s.targetId&&x.hp>0&&!losBlocked(m.r,m.c,x.r,x.c));
  return th?{r:th.r,c:th.c}:{r:tg.r,c:tg.c};
}
function syncMagicCircles(){
  if(!state||!els.tokenLayer) return;
  const active=new Set();
  const progress=c=>Math.max(0,Math.min(1,(c.elapsed||0)/Math.max(.1,c.cast)));
  // ── 영웅 ──
  for(const h of state.heroes){
    const c=h.castingSkill; if(!c||!c.uid||h.hp<=0) continue;
    const p=progress(c);
    if(mcIsHealSkill(c)){
      // 힐러: 마법진 없이 성스러운 황금색 물결
      const R=c.aoe||(c.ext&&c.ext.allyAoe)||2, k='W'+c.uid; active.add(k);
      placeMagicCircle(mcEnsure(k,buildHolyWave),h.r,h.c,Math.min(7,2*R+.8),p);
      continue;
    }
    const ht=heroTypeOf(h); if(!ht||!ht.caster) continue;
    const custom=!!c.fx;
    const kF='F'+c.uid; active.add(kF);
    placeMagicCircle(mcEnsure(kF,()=>custom?buildCasterTelegraph(c,'cst-foot'):buildMagicCircle(c.kind,'mc-foot',c.icon)),h.r,h.c,1.9,p);
    if(c.area || c.fx==='spirit_summon'){
      const kT='T'+c.uid; active.add(kT);
      const ctr=c.area?spellCastCenter(h,h.skillTarget):{r:h.r,c:h.c};
      const cells=c.area?spellCircleCells(c.area):3.8;
      placeMagicCircle(mcEnsure(kT,()=>custom?buildCasterTelegraph(c,'cst-target'):buildMagicCircle(c.kind,'mc-target',c.icon)),ctr.r,ctr.c,cells,p);
    }
  }
  // ── 몬스터: 저주/흑마법 = 보라색 마법진, 회복 = 황금색 물결 ──
  for(const m of state.monsters){
    const c=m.castingSkill; if(!c||!c.uid||m.hp<=0) continue;
    const p=progress(c);
    if(mcIsHealSkill(c)){
      const R=c.healAll?4:(c.aoe||2), k='W'+c.uid; active.add(k);
      placeMagicCircle(mcEnsure(k,buildHolyWave),m.r,m.c,Math.min(7,2*R+.8),p);
    } else if(mcIsDarkSkill(c)){
      const kF='F'+c.uid; active.add(kF);
      placeMagicCircle(mcEnsure(kF,()=>buildMagicCircle(c.kind,'mc-foot',c.icon)),m.r,m.c,1.7,p);
      const kT='T'+c.uid; active.add(kT);
      const ctr=monsterSpellCenter(m);
      // 몬스터 스킬의 범위는 맨해튼 반경이므로 지름 = 2×반경+1 (범위 없는 단일 대상은 작은 마법진)
      placeMagicCircle(mcEnsure(kT,()=>buildMagicCircle(c.kind,'mc-target',c.icon)),ctr.r,ctr.c,c.aoe?Math.min(6.4,2*c.aoe+1):1.7,p);
    }
  }
  // 끝난(또는 중단된) 시전 정리: 표적 마법진/황금 물결은 퍼지며 사라지고, 발밑 마법진은 서서히 사라짐
  for(const k of Object.keys(magicCircleEls)){
    if(active.has(k)) continue;
    const el=magicCircleEls[k]; delete magicCircleEls[k];
    if(!el.isConnected) continue;
    el.classList.add(k.charAt(0)==='W'?'hw-burst':(k.charAt(0)==='T'?'mc-burst':'mc-fade'));
    setTimeout(()=>el.remove(),800);
  }
}

let _boardHitShakeUntil=0, _boardHitShakeStrong=false;
function triggerBoardHitShake(strong=false,duration=260){
  const board=els.frame||document.getElementById('boardWrap'); if(!board) return;
  const t=performance.now();
  // 다수의 동시 피격이 발생할 때 offsetWidth 강제 리플로우를 매 타격마다 만들지 않습니다.
  // 이미 흔들리는 동안에는 더 강한 타격일 때만 한 번 업그레이드하고, 나머지는 현재 흔들림을 유지합니다.
  if(t<_boardHitShakeUntil && (!strong||_boardHitShakeStrong)) return;
  _boardHitShakeStrong=!!strong; _boardHitShakeUntil=t+duration;
  board.classList.remove('board-hit-shake','board-hit-shake-strong');
  void board.offsetWidth;
  board.classList.add(strong?'board-hit-shake-strong':'board-hit-shake');
  setTimeout(()=>{
    if(performance.now()+8<_boardHitShakeUntil) return;
    board.classList.remove('board-hit-shake','board-hit-shake-strong'); _boardHitShakeStrong=false;
  },duration+12);
}
function processFxEvents(){
  if(!state || !state.fxEvents.length) return;
  const px=currentCellPx;
  const events=state.fxEvents.splice(0,state.fxEvents.length);
  const batch=document.createDocumentFragment();
  const prevBatch=_tokenLayerBatchFragment;
  _tokenLayerBatchFragment=batch;
  try{
  for(const ev of events){
    if(ev.type==='spark'){
      spellFxDelayRun(ev,()=>{
        const el=document.createElement('div'); el.className='hitspark';
        el.style.color=ev.color; el.style.left=(ev.c*px+px/2)+'px'; el.style.top=(ev.r*px+px/2)+'px';
        appendTokenLayerNode(el); setTimeout(()=>el.remove(),340);
      });
    } else if(ev.type==='damageNumber'){
      spellFxDelayRun(ev,()=>{
        const el=document.createElement('div'); el.className='damage-number'+(ev.critical?' critical':'');
        el.textContent=(ev.amount>0?'-':'')+Math.abs(Math.round(ev.amount||0)); el.style.color=ev.color||'#fff';
        el.style.left=(ev.c*px+px/2+(Math.random()*10-5))+'px'; el.style.top=(ev.r*px+px/2-px*.18)+'px';
        appendTokenLayerNode(el); setTimeout(()=>el.remove(),760);
      });
    } else if(ev.type==='floatText'){
      spellFxDelayRun(ev,()=>{
        const el=document.createElement('div'); el.className='floattext';
        el.textContent=ev.text; el.style.color=ev.color;
        el.style.left=(ev.c*px+px/2+(Math.random()*12-6))+'px'; el.style.top=(ev.r*px+px/2-px*.2)+'px';
        appendTokenLayerNode(el); setTimeout(()=>el.remove(),760);
      });
    } else if(ev.type==='monsterUpgrade'){
      const wrap=document.createElement('div'); wrap.className='upgradefx';
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
      const rune=document.createElement('div'); rune.className='upgrade-sigil'; wrap.appendChild(rune);
      for(let i=0;i<10;i++){ const shard=document.createElement('i'); shard.className='upgrade-shard'; shard.style.setProperty('--a',(i*36+Math.random()*12)+'deg'); shard.style.setProperty('--d',(px*(1+Math.random()*1.15))+'px'); shard.style.setProperty('--s',(0.55+Math.random()*.55).toFixed(2)); wrap.appendChild(shard); }
      appendTokenLayerNode(wrap); setTimeout(()=>wrap.remove(),850);
    } else if(ev.type==='spell'){
      const sx=ev.fromC*px+px/2, sy=ev.fromR*px+px/2, ex=ev.toC*px+px/2, ey=ev.toR*px+px/2;
      const wrap=document.createElement('div'); wrap.className='spellfx '+(ev.spell||'arcane'); wrap.style.left=ex+'px'; wrap.style.top=ey+'px';
      const dx=sx-ex, dy=sy-ey, baseAng=Math.atan2(dy,dx)*180/Math.PI;
      const core=document.createElement('div'); core.className='core'; wrap.appendChild(core);
      for(let i=0;i<2;i++){ const ring=document.createElement('div'); ring.className='ring r'+(i+1); ring.style.width=(px*(1.1+i*.55))+'px'; ring.style.height=(px*(1.1+i*.55))+'px'; wrap.appendChild(ring); }
      for(let i=0;i<4;i++){ const beam=document.createElement('div'); beam.className='beam'; beam.style.width=(px*(1.7+Math.random()*1.2))+'px'; beam.style.setProperty('--angle',(baseAng+i*90+Math.random()*22)+'deg'); wrap.appendChild(beam); }
      appendTokenLayerNode(wrap); wrap.animate([{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.18)'}],{duration:430,easing:'ease-out'}); setTimeout(()=>wrap.remove(),470);
    } else if(ev.type==='skillCast'){
      const wrap=document.createElement('div'); wrap.className='skillfx '+(ev.spell||'arcane');
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
      const st=skillStyle(ev.spell); wrap.style.color=st.color;
      for(let i=0;i<2;i++){ const ring=document.createElement('div'); ring.className='cast-ring r'+(i+1); ring.style.width=(px*(1.5+i*.65))+'px'; ring.style.height=(px*(1.5+i*.65))+'px'; wrap.appendChild(ring); }
      const core=document.createElement('div'); core.className='cast-core'; if(!appendCasterFxSprite(core,'cast-sprite',ev.fx||'','once')) core.textContent=ev.icon||st.glyph; wrap.appendChild(core);
      for(let i=0;i<8;i++){ const sh=document.createElement('i'); sh.className='shard'; sh.style.setProperty('--a',(i*45)+'deg'); wrap.appendChild(sh); }
      appendTokenLayerNode(wrap); setTimeout(()=>wrap.remove(),Math.max(1200,(ev.duration||0)+120));
    } else if(ev.type==='skillAoe'){
      spellFxDelayRun(ev,()=>{
        const wrap=document.createElement('div'); wrap.className='aoefx '+(ev.spell||'arcane')+(ev.fx?' fx-'+ev.fx:''); wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
        const st=skillStyle(ev.spell); wrap.style.color=st.color;
        const aura=document.createElement('div'); aura.className='aura'; const size=px*Math.max(1.4,(ev.radius||1)*2+1.1); aura.style.width=size+'px'; aura.style.height=size+'px'; wrap.appendChild(aura);
        const core=document.createElement('div'); core.className='core'; if(!appendCasterFxSprite(core,'aoe-sprite',ev.fx||'','once')) core.textContent=ev.icon||st.glyph; wrap.appendChild(core);
        appendTokenLayerNode(wrap); setTimeout(()=>wrap.remove(),760);
        if(Sound.spellImpact) Sound.spellImpact(ev.spell||'arcane',ev.fx||'',false);
      });
    } else if(ev.type==='spellImpact'){
      spellFxDelayRun(ev,()=>{
        const wrap=document.createElement('div'); wrap.className='spellfx impact '+(ev.spell||'arcane'); wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
        const core=document.createElement('div'); core.className='core'; wrap.appendChild(core);
        const ring=document.createElement('div'); ring.className='ring'; ring.style.width=(px*1.4)+'px'; ring.style.height=(px*1.4)+'px'; wrap.appendChild(ring);
        appendTokenLayerNode(wrap); setTimeout(()=>wrap.remove(),470);
        if(Sound.spellImpact) Sound.spellImpact(ev.spell||'arcane','',false);
      });
    } else if(ev.type==='spellProjectile'){
      appendSpellProjectile(ev,px);
    } else if(ev.type==='spellDrop'){
      appendSpellDrop(ev,px);
    } else if(ev.type==='heroSpellImpact'){
      spellFxDelayRun(ev,()=>appendHeroSpellImpact(ev,px));
    } else if(ev.type==='heroMeleeSkillImpact'){
      spellFxDelayRun(ev,()=>{ if(Sound.meleeSkillRelease) Sound.meleeSkillRelease(ev.weaponType||'sword'); appendMeleeSkillImpact(ev,px); });
    } else if(ev.type==='trapFlameJet'){
      const sx=ev.c*px+px/2,sy=ev.r*px+px/2;
      const hasTarget=Number.isFinite(ev.toR)&&Number.isFinite(ev.toC);
      const dx=hasTarget?((ev.toC-ev.c)*px):((ev.dc||1)*px*Math.max(1,Number(ev.range)||3));
      const dy=hasTarget?((ev.toR-ev.r)*px):((ev.dr||0)*px*Math.max(1,Number(ev.range)||3));
      const len=Math.max(px*.85,Math.hypot(dx,dy)||0);
      const ang=Math.atan2(dy,dx||1)*180/Math.PI;
      const wrap=document.createElement('div');wrap.className='trapfx-flamejet';wrap.style.left=sx+'px';wrap.style.top=sy+'px';
      wrap.style.setProperty('--jet-len',len+'px');wrap.style.setProperty('--jet-w',(px*.72)+'px');wrap.style.setProperty('--jet-ang',ang+'deg');
      const beam=document.createElement('div');beam.className='tf-jet-beam';wrap.appendChild(beam);
      const core=document.createElement('div');core.className='tf-jet-core';wrap.appendChild(core);
      for(let i=0;i<14;i++){
        const p=document.createElement('i');p.className='tf-jet-ember';
        p.style.setProperty('--x',((len*(.35+Math.random()*.6)))+'px');
        p.style.setProperty('--y',((Math.random()-.5)*px*.55)+'px');
        p.style.setProperty('--d',(Math.random()*140)+'ms');
        wrap.appendChild(p);
      }
      appendTokenLayerNode(wrap);triggerBoardHitShake(!!(ev.lv>=10),180);setTimeout(()=>wrap.remove(),760);
    } else if(ev.type==='trapHarpoon'){
      const sx=ev.fromC*px+px/2,sy=ev.fromR*px+px/2,dx=(ev.toC-ev.fromC)*px,dy=(ev.toR-ev.fromR)*px,len=Math.max(px*.4,Math.hypot(dx,dy)),ang=Math.atan2(dy,dx)*180/Math.PI;
      const wrap=document.createElement('div');wrap.className='trapfx-harpoon';wrap.style.left=sx+'px';wrap.style.top=sy+'px';wrap.style.setProperty('--chain-len',len+'px');wrap.style.setProperty('--chain-return',(len*.32)+'px');wrap.style.setProperty('--chain-ang',ang+'deg');
      const reel=document.createElement('div');reel.className='tf-reel';wrap.appendChild(reel);
      const spine=document.createElement('div');spine.className='tf-chain-spine';wrap.appendChild(spine);
      const linkCount=Math.max(4,Math.min(18,Math.round(len/14)));
      for(let i=0;i<linkCount;i++){
        const link=document.createElement('i');
        link.className='tf-chain-link'+(i%2?' alt':'');
        link.style.left=(len*((i+1)/(linkCount+1)))+'px';
        link.style.setProperty('--d',(i*16)+'ms');
        wrap.appendChild(link);
      }
      const hook=document.createElement('div');hook.className='tf-hook-head';wrap.appendChild(hook);
      const bind=document.createElement('div');bind.className='tf-hook-bind';
      for(let i=0;i<3;i++){ const ring=document.createElement('i'); ring.style.setProperty('--rot',(-26+i*26)+'deg'); bind.appendChild(ring); }
      wrap.appendChild(bind);
      const hit=document.createElement('div');hit.className='tf-hook-hit';wrap.appendChild(hit);
      for(let i=0;i<4;i++){ const spark=document.createElement('i'); spark.className='tf-hook-spark'; spark.style.setProperty('--a',(i*90+15)+'deg'); wrap.appendChild(spark); }
      appendTokenLayerNode(wrap);setTimeout(()=>wrap.remove(),920);
    } else if(ev.type==='trapMimicChomp'){
      const wrap=document.createElement('div');wrap.className='trapfx-mimic';wrap.style.left=(ev.c*px+px/2)+'px';wrap.style.top=(ev.r*px+px/2)+'px';wrap.style.setProperty('--mimic-size',(px*1.28)+'px');
      const aura=document.createElement('div');aura.className='tf-mimic-aura';wrap.appendChild(aura);const top=document.createElement('div');top.className='tf-jaw tf-jaw-top';wrap.appendChild(top);const bottom=document.createElement('div');bottom.className='tf-jaw tf-jaw-bottom';wrap.appendChild(bottom);const tongue=document.createElement('div');tongue.className='tf-mimic-tongue';wrap.appendChild(tongue);
      for(let i=0;i<8;i++){const sp=document.createElement('i');sp.className='tf-mimic-spark';sp.style.setProperty('--a',(i*45)+'deg');wrap.appendChild(sp);}
      appendTokenLayerNode(wrap);setTimeout(()=>wrap.remove(),900);
    } else if(ev.type==='trapRuneGate'){
      const mode=ev.state||'open',wrap=document.createElement('div');wrap.className='trapfx-rune '+mode;wrap.style.left=(ev.c*px+px/2)+'px';wrap.style.top=(ev.r*px+px/2)+'px';wrap.style.setProperty('--rune-size',(px*(mode==='sealed'?1.75:1.4))+'px');
      for(let i=0;i<3;i++){const rg=document.createElement('div');rg.className='tf-rune-ring r'+(i+1);wrap.appendChild(rg);}const core=document.createElement('div');core.className='tf-rune-core';wrap.appendChild(core);
      if(mode!=='open'){for(let i=0;i<5;i++){const bar=document.createElement('i');bar.className='tf-rune-bar';bar.style.setProperty('--x',((i-2)*15)+'%');wrap.appendChild(bar);}}
      for(let i=0;i<10;i++){const p=document.createElement('i');p.className='tf-rune-particle';p.style.setProperty('--a',(i*36)+'deg');p.style.setProperty('--dist',(px*(.45+Math.random()*.45))+'px');wrap.appendChild(p);}
      appendTokenLayerNode(wrap);if(mode==='sealed')triggerBoardHitShake(true,260);setTimeout(()=>wrap.remove(),mode==='sealed'?1200:850);
    } else if(ev.type==='obstacleSpecial'){
      const wrap=document.createElement('div'); wrap.className='ob-special '+(ev.ob||'');
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
      wrap.style.setProperty('--sz',(px*(ev.ob==='frost'?1.05:1.25))+'px');
      if(ev.ob!=='flame'){
        const flash=document.createElement('div'); flash.className='os-flash'; wrap.appendChild(flash);
        for(let i=0;i<2;i++){ const rg=document.createElement('div'); rg.className='os-ring '+(i?'r2':''); rg.style.width=(px*(ev.ob==='frost'?(1.0+i*.55):(1.25+i*.45)))+'px'; rg.style.height=rg.style.width; wrap.appendChild(rg); }
        for(let i=0;i<8;i++){ const ray=document.createElement('i'); ray.className='os-ray'; ray.style.setProperty('--a',(i*45)+'deg'); ray.style.animationDelay=(i*12)+'ms'; wrap.appendChild(ray); }
      }
      if(ev.ob==='frost'){
        const prison=document.createElement('div'); prison.className='frost-prison'; prison.style.setProperty('--sz',(px*1.0)+'px'); wrap.appendChild(prison);
        for(let i=0;i<7;i++){ const sh=document.createElement('i'); sh.className='frost-shard'; sh.style.setProperty('--a',(i*51)+'deg'); sh.style.setProperty('--dist',(px*(.65+Math.random()*.65))+'px'); sh.style.setProperty('--d',(i*25)+'ms'); wrap.appendChild(sh); }
        const st=document.createElement('div'); st.className='frost-status'; st.textContent='❄ 동결!'; wrap.appendChild(st);
      } else if(ev.ob==='poison'){
        const cloud=document.createElement('div'); cloud.className='poison-cloud'; wrap.appendChild(cloud);
        for(let i=0;i<9;i++){ const b=document.createElement('i'); b.className='poison-bubble'; const a=Math.PI*2*i/9; b.style.setProperty('--x',(Math.cos(a)*px*(.5+Math.random()*.55))+'px'); b.style.setProperty('--y',(Math.sin(a)*px*(.35+Math.random()*.45)-px*.35)+'px'); b.style.setProperty('--d',(i*35)+'ms'); wrap.appendChild(b); }
        const st=document.createElement('div'); st.className='poison-status'; st.textContent='☠ 중독!'; wrap.appendChild(st);
      } else if(ev.ob==='flame'){
        const glow=document.createElement('div'); glow.className='flame-glow'; wrap.appendChild(glow);
        const tongueCount=7;
        for(let i=0;i<tongueCount;i++){
          const t=document.createElement('i'); t.className='flame-tongue';
          t.style.setProperty('--a',((i-(tongueCount-1)/2)*13)+'deg');
          t.style.setProperty('--h',(56+Math.random()*22)+'%');
          t.style.setProperty('--d',(i*22)+'ms');
          wrap.appendChild(t);
        }
        for(let i=0;i<12;i++){
          const e=document.createElement('i'); e.className='flame-ember';
          e.style.setProperty('--x',(((Math.random()*2)-1)*px*0.45)+'px');
          e.style.setProperty('--delay',(Math.random()*260)+'ms');
          e.style.setProperty('--dur',(520+Math.random()*380)+'ms');
          wrap.appendChild(e);
        }
      }
      appendTokenLayerNode(wrap);
      setTimeout(()=>wrap.remove(),1200);
    } else if(ev.type==='obstacleImpact'){
      const wrap=document.createElement('div'); wrap.className='ob-hit '+(ev.ob||'');
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
      wrap.style.setProperty('--ring',(px*(ev.strong?1.05:.78))+'px');
      wrap.style.setProperty('--flash',(px*(ev.strong?1.15:.9))+'px');
      const flash=document.createElement('div'); flash.className='hit-flash'; wrap.appendChild(flash);
      const ring=document.createElement('div'); ring.className='hit-ring'; wrap.appendChild(ring);
      const ring2=document.createElement('div'); ring2.className='hit-ring r2'; wrap.appendChild(ring2);
      const count=ev.strong?12:8;
      for(let i=0;i<count;i++){ const ch=document.createElement('i'); ch.className='hit-chunk'; const a=(Math.PI*2*i/count)+(Math.random()-.5)*.35; const d=px*(.38+Math.random()*.7)*(ev.strong?1.12:1); ch.style.setProperty('--dx',(Math.cos(a)*d)+'px'); ch.style.setProperty('--dy',(Math.sin(a)*d)+'px'); ch.style.setProperty('--delay',(Math.random()*55)+'ms'); wrap.appendChild(ch); }
      for(let i=0;i<5;i++){ const ln=document.createElement('i'); ln.className='hit-line'; const a=(360/5*i)+(Math.random()*18-9); ln.style.setProperty('--ang',a+'deg'); ln.style.setProperty('--travel',(px*(.3+Math.random()*.35))+'px'); ln.style.setProperty('--line',(px*(.38+Math.random()*.35))+'px'); wrap.appendChild(ln); }
      if(ev.label){ const lab=document.createElement('div'); lab.className='ob-hit-label'; lab.textContent=ev.label; wrap.appendChild(lab); }
      appendTokenLayerNode(wrap);
      triggerBoardHitShake(!!ev.strong,260);
      const tokenEl=ev.key?tokenEls[ev.key]:null;
      if(tokenEl){ const sw=tokenEl.querySelector('.spriteWrap'); if(sw){ sw.style.setProperty('--rx',((ev.recoilX||0)*px*.28)+'px'); sw.style.setProperty('--ry',((ev.recoilY||0)*px*.28)+'px'); sw.classList.remove('hero-ob-recoil'); void sw.offsetWidth; sw.classList.add('hero-ob-recoil'); } }
      setTimeout(()=>wrap.remove(),700);
    } else if(ev.type==='frostHero'){
      const tokenEl=tokenEls[ev.key];
      if(tokenEl){ tokenEl.classList.remove('hero-frosted'); void tokenEl.offsetWidth; tokenEl.classList.add('hero-frosted'); setTimeout(()=>tokenEl.classList.remove('hero-frosted'),1300); }
    } else if(ev.type==='obstacleAuraPulse'){
      const wrap=document.createElement('div'); wrap.className='obstacle-fx '+(ev.ob||'');
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px'; wrap.style.setProperty('--fxsize',(px*(ev.lv>=10?1.5:ev.lv>=5?1.3:1.05))+'px');
      const core=document.createElement('div'); core.className='fx-core'; core.textContent=ev.ob==='curse'?'☠':ev.ob==='statue'?'◉':ev.ob==='flame'?'🔥':ev.ob==='lightning'?'⚡':ev.ob==='pit'?'⛓':'✦'; wrap.appendChild(core);
      appendTokenLayerNode(wrap); setTimeout(()=>wrap.remove(),700);
    } else if(ev.type==='obstacleBreak'){
      const wrap=document.createElement('div'); wrap.className='obstacle-fx '+(ev.ob||'');
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px'; wrap.style.setProperty('--fxsize',(px*1.15)+'px');
      const core=document.createElement('div'); core.className='fx-core'; core.textContent='💥'; wrap.appendChild(core);
      appendTokenLayerNode(wrap); setTimeout(()=>wrap.remove(),650);
    } else if(ev.type==='obstacleBurst'){
      const wrap=document.createElement('div'); wrap.className='obstacle-fx '+(ev.ob||'');
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
      const core=document.createElement('div'); core.className='fx-core'; core.textContent=ev.text||'✦'; wrap.appendChild(core);
      for(let i=0;i<7;i++){ const p=document.createElement('i'); p.style.cssText=`position:absolute;width:4px;height:4px;border-radius:50%;background:currentColor;left:50%;top:50%;transform:rotate(${i*51}deg) translateX(${px*(.25+Math.random()*.35)}px);opacity:.75;`; wrap.appendChild(p); }
      appendTokenLayerNode(wrap); setTimeout(()=>wrap.remove(),720);
    } else if(ev.type==='punch'){
      const tokenEl=tokenEls[ev.key];
      if(tokenEl){
        const wrap=tokenEl.querySelector('.spriteWrap');
        const dist=px*(ev.mode==='defender'?.64:.46);
        wrap.style.setProperty('--lx',(ev.dc*dist).toFixed(1));
        wrap.style.setProperty('--ly',(ev.dr*dist).toFixed(1));
        if(ev.mode){
          const bx=ev.dc*dist, by=ev.dr*dist;
          const br=(ev.dc!==0?(ev.dc>0?8:-8):(ev.dr>0?6:-6));
          /* 모든 중간 위치를 실제 px 값으로 지정해 Android/Samsung Browser에서도 확실히 움직이게 합니다. */
          wrap.style.setProperty('--bx',bx.toFixed(1)+'px');
          wrap.style.setProperty('--by',by.toFixed(1)+'px');
          wrap.style.setProperty('--br',br+'deg');
          if(ev.mode==='defender'){
            wrap.style.setProperty('--preRX',(bx*.16).toFixed(1)+'px');
            wrap.style.setProperty('--preRY',(by*.16).toFixed(1)+'px');
            wrap.style.setProperty('--preRR',(br*.35).toFixed(1)+'deg');
            wrap.style.setProperty('--hitRX',(bx*.72).toFixed(1)+'px');
            wrap.style.setProperty('--hitRY',(by*.72).toFixed(1)+'px');
            wrap.style.setProperty('--hitRR',br+'deg');
            wrap.style.setProperty('--nearRX',(bx*.30).toFixed(1)+'px');
            wrap.style.setProperty('--nearRY',(by*.30).toFixed(1)+'px');
            wrap.style.setProperty('--nearRR',(-br*.45).toFixed(1)+'deg');
          } else {
            wrap.style.setProperty('--preX',(bx*-.24).toFixed(1)+'px');
            wrap.style.setProperty('--preY',(by*-.24).toFixed(1)+'px');
            wrap.style.setProperty('--preR',(-br*.35).toFixed(1)+'deg');
            wrap.style.setProperty('--hitX',(bx*.85).toFixed(1)+'px');
            wrap.style.setProperty('--hitY',(by*.85).toFixed(1)+'px');
            wrap.style.setProperty('--hitR',br+'deg');
            wrap.style.setProperty('--nearX',(bx*.16).toFixed(1)+'px');
            wrap.style.setProperty('--nearY',(by*.16).toFixed(1)+'px');
          }
          wrap.classList.remove('battle-lunge','battle-recoil'); void wrap.offsetWidth; wrap.classList.add(ev.mode==='defender'?'battle-recoil':'battle-lunge');
          tokenEl.classList.remove('battle-hit-react'); void tokenEl.offsetWidth; tokenEl.classList.add('battle-hit-react');
          setTimeout(()=>tokenEl.classList.remove('battle-hit-react'),340);
        } else {
          wrap.classList.remove('punch'); void wrap.offsetWidth; wrap.classList.add('punch');
        }
      }
    } else if(ev.type==='battleHit'){
      spellFxDelayRun(ev,()=>{
        const wrap=document.createElement('div');
        const hitAngle=(ev.dr||ev.dc)?Math.atan2(ev.dr||0,ev.dc||1)*180/Math.PI:(Math.random()*360);
        const perpAngle=hitAngle+90;
        const weapon=ev.weaponType||'sword';
        const critical=!!ev.critical;
        if(Sound.meleeImpact){
          const heroMeleeAudio=ev.attackerType==='mawang'||(typeof HERO_TYPES!=='undefined'&&Array.isArray(HERO_TYPES)&&HERO_TYPES.some(x=>x&&x.id===ev.attackerType));
          Sound.meleeImpact(heroMeleeAudio?'sword':weapon,!!ev.strong,critical,ev.attackerType==='mawang');
        }
        wrap.className='combat-impact melee-hit'+(ev.strong?' heavy':'')+' wt-'+weapon+(critical?' critical':'')+(ev.skill?' skill-hit':'')+(ev.skillVariant?' sv-'+ev.skillVariant:'')+(ev.attackerType==='mawang'?' mawang-hit':'');
        wrap.style.left=((ev.c+.5)*px)+'px'; wrap.style.top=((ev.r+.5)*px)+'px';
        wrap.style.setProperty('--ci-size',(px*(critical?1.85:(ev.strong?1.52:1.02)))+'px');
        wrap.style.setProperty('--ci-ring',(px*(critical?1.32:(ev.strong?1.14:.82)))+'px');
        wrap.style.setProperty('--ci-line',(px*(critical?1.16:(ev.strong?.92:.62)))+'px');
        wrap.style.setProperty('--ci-color',ev.color||'#ffcf6b');
        wrap.style.setProperty('--ci-rot',hitAngle+'deg');
        wrap.style.setProperty('--ci-perp',perpAngle+'deg');
        wrap.style.setProperty('--ci-thrust',(px*(critical?1.18:.92))+'px');
        const flash=document.createElement('div'); flash.className='ci-flash'; wrap.appendChild(flash);
        const ring=document.createElement('div'); ring.className='ci-ring'; wrap.appendChild(ring);
        const ring2=document.createElement('div'); ring2.className='ci-ring r2'; wrap.appendChild(ring2);
        if(weapon==='blunt'){
          const shock=document.createElement('div'); shock.className='ci-shock'; wrap.appendChild(shock);
          const wave=document.createElement('div'); wave.className='ci-wave'; wrap.appendChild(wave);
          const debris=ev.strong?10:7;
          for(let i=0;i<debris;i++){ const ch=document.createElement('i'); ch.className='ci-chunk'; ch.style.setProperty('--d',(i*16)+'ms'); ch.style.setProperty('--a',((i*(360/debris))+Math.random()*16-8)+'deg'); wrap.appendChild(ch); }
        }else if(weapon==='spear'){
          const lance=document.createElement('div'); lance.className='ci-lance'; wrap.appendChild(lance);
          const tail=document.createElement('div'); tail.className='ci-lance tail'; wrap.appendChild(tail);
          for(let i=0;i<4;i++){ const dot=document.createElement('i'); dot.className='ci-dot'; dot.style.setProperty('--d',(i*22)+'ms'); wrap.appendChild(dot); }
          for(let i=0;i<4;i++){ const spike=document.createElement('i'); spike.className='ci-spike'; spike.style.setProperty('--d',(i*18)+'ms'); spike.style.setProperty('--a',(hitAngle+(i<2?-24:24)+(i%2?16:-16))+'deg'); wrap.appendChild(spike); }
        }else{
          const swipe=document.createElement('div'); swipe.className='ci-swipe'; wrap.appendChild(swipe);
          const swipe2=document.createElement('div'); swipe2.className='ci-swipe s2'; wrap.appendChild(swipe2);
          const slashCount=critical?7:(ev.strong?6:4);
          for(let i=0;i<slashCount;i++){ const sl=document.createElement('i'); sl.className='ci-slash'; sl.style.setProperty('--d',(i*16)+'ms'); sl.style.setProperty('--a',((i%2?perpAngle:hitAngle)+(i-(slashCount/2))*7)+'deg'); wrap.appendChild(sl); }
        }
        const sparkCount=critical?10:(ev.strong?8:6);
        for(let i=0;i<sparkCount;i++){ const sp=document.createElement('i'); sp.className='ci-spike'; sp.style.setProperty('--d',(Math.random()*60)+'ms'); sp.style.setProperty('--a',((360/sparkCount)*i+Math.random()*14-7)+'deg'); wrap.appendChild(sp); }
        if(critical){
          const core=document.createElement('div'); core.className='ci-crit-core'; wrap.appendChild(core);
          for(let i=0;i<6;i++){ const ray=document.createElement('i'); ray.className='ci-crit-ray'; ray.style.setProperty('--a',(i*60)+'deg'); wrap.appendChild(ray); }
          const label=document.createElement('div'); label.className='ci-crit-label'; label.textContent='CRIT'; wrap.appendChild(label);
        }
        appendTokenLayerNode(wrap);
        triggerBoardHitShake(critical||!!ev.strong,critical?320:260);
        setTimeout(()=>wrap.remove(),critical?720:520);
      });
    } else if(ev.type==='monsterSkillName'){
      const el=document.createElement('div'); el.className='floattext monster-skill-name'; el.textContent=ev.text;
      el.style.color=ev.color||'#ffffff'; el.style.textShadow='0 0 8px rgba(183,107,242,.95), 0 0 14px rgba(224,182,74,.55)';
      el.style.fontSize=Math.max(11,Math.round(px*.22))+'px'; el.style.fontWeight='900';
      el.style.left=(ev.c*px+px/2)+'px'; el.style.top=(ev.r*px+px*.05)+'px';
      appendTokenLayerNode(el); setTimeout(()=>el.remove(),1050);
    } else if(ev.type==='monsterSkillImpact'){
      if(Sound.spellImpact) Sound.spellImpact(ev.spell||'arcane','monster-skill',true);
      const wrap=document.createElement('div'); wrap.className='aoefx monster-impact '+(ev.spell||'arcane');
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
      const st=skillStyle(ev.spell);
      wrap.style.color=st.color;
      const big=document.createElement('div'); big.className='aura'; const size=px*Math.max(1.6,(ev.radius||.9)*2+1.2); big.style.width=size+'px'; big.style.height=size+'px'; wrap.appendChild(big);
      const core=document.createElement('div'); core.className='core'; core.textContent=ev.icon||st.glyph; wrap.appendChild(core);
      for(let i=0;i<14;i++){ const sh=document.createElement('i'); sh.className='shard'; sh.style.setProperty('--a',(i*360/14)+'deg'); sh.style.setProperty('--d',(px*(.8+Math.random()*1.7))+'px'); wrap.appendChild(sh); }
      appendTokenLayerNode(wrap); setTimeout(()=>wrap.remove(),900);
    } else if(ev.type==='mawangSkillImpact'){
      if(Sound.mawangSkill) Sound.mawangSkill(ev.variant||'hell-slash');
      spellFxDelayRun(ev,()=>appendMawangSkillImpact(ev,px));
    } else if(ev.type==='projectile'){
      const fromX=ev.fromC*px+px/2, fromY=ev.fromR*px+px/2;
      const toX=ev.toC*px+px/2, toY=ev.toR*px+px/2;
      const dx=toX-fromX, dy=toY-fromY;
      const distPx=Math.hypot(dx,dy);
      const angle=Math.atan2(dy,dx)*180/Math.PI;
      // 너무 빠르게 지나가 점처럼 보이지 않도록 거리별 이동 시간을 확보합니다.
      const duration=Math.max(190,Math.min(360,120+distPx*1.35));
      const kind=ev.kind||'magic';
      const ownerClass=ev.owner==='monster'?'monster-shot':'hero-shot';
      const el=document.createElement('div');
      el.className='projectile '+kind+' '+ownerClass;
      el.style.color=ev.color||'#e0e0e0';
      el.style.setProperty('--angle',angle+'deg');
      el.style.left=fromX+'px'; el.style.top=fromY+'px';
      appendTokenLayerNode(el);
      requestAnimationFrame(()=>{
        el.style.transition=`left ${duration}ms cubic-bezier(.18,.72,.22,1), top ${duration}ms cubic-bezier(.18,.72,.22,1)`;
        el.style.left=toX+'px'; el.style.top=toY+'px';
      });
      setTimeout(()=>{
        if(!el.isConnected) return;
        el.remove();
        if(kind==='magic' && ev.owner==='monster' && Sound.spellImpact){
          const mk=ev.special==='frost'?'ice':ev.special==='lifesteal'?'dark':ev.special==='splash'?'fire':ev.special==='curse'?'curse':'arcane';
          Sound.spellImpact(mk,'monster-projectile',false);
        } else if(Sound.projectileImpact) Sound.projectileImpact(kind,ev.owner||'hero');
        const hit=document.createElement('div'); hit.className='projectile-impact';
        hit.style.left=toX+'px'; hit.style.top=toY+'px'; hit.style.color=ev.color||'#fff';
        appendTokenLayerNode(hit);
        setTimeout(()=>hit.remove(),380);
      },duration+12);
    } else if(ev.type==='coreHit'){
      const cellEl = cellEls[CORE_R] && cellEls[CORE_R][CORE_C];
      if(cellEl){ cellEl.classList.remove('coreflash'); void cellEl.offsetWidth; cellEl.classList.add('coreflash'); }
      els.boardInner.classList.remove('shake'); void els.boardInner.offsetWidth; els.boardInner.classList.add('shake');
    } else if(ev.type==='spawnBurst'){
      const size=px*2.3;
      const color=ev.color||'rgba(183,155,255,.95)';
      const wrap=document.createElement('div'); wrap.className='spawnfx';
      wrap.style.left=(ev.c*px+px/2)+'px'; wrap.style.top=(ev.r*px+px/2)+'px';
      const r1=document.createElement('div'); r1.className='ring r1';
      r1.style.width=size+'px'; r1.style.height=size+'px'; r1.style.border='3px solid '+color;
      const r2=document.createElement('div'); r2.className='ring r2';
      r2.style.width=size+'px'; r2.style.height=size+'px'; r2.style.border='3px dashed '+color;
      const fl=document.createElement('div'); fl.className='flash';
      fl.style.width=(size*0.55)+'px'; fl.style.height=(size*0.55)+'px';
      wrap.appendChild(r1); wrap.appendChild(r2); wrap.appendChild(fl);
      appendTokenLayerNode(wrap);
      setTimeout(()=>wrap.remove(), 640);
    } else if(ev.type==='wallBreak'){
      const cx=ev.c*px+px/2, cy=ev.r*px+px/2;
      const wrap=document.createElement('div'); wrap.className='wallbreakfx';
      wrap.style.left=cx+'px'; wrap.style.top=cy+'px';
      const ring=document.createElement('div'); ring.className='wb-ring';
      const ringSize=px*3.4; ring.style.width=ringSize+'px'; ring.style.height=ringSize+'px';
      const flash=document.createElement('div'); flash.className='wb-flash';
      const flashSize=px*2.2; flash.style.width=flashSize+'px'; flash.style.height=flashSize+'px';
      wrap.appendChild(ring); wrap.appendChild(flash);
      for(let i=0;i<7;i++){
        const chunk=document.createElement('div'); chunk.className='wb-chunk';
        const ang=Math.random()*Math.PI*2, dist=px*(1.2+Math.random()*1.4);
        chunk.style.setProperty('--wbx', Math.cos(ang)*dist+'px');
        chunk.style.setProperty('--wby', Math.sin(ang)*dist+'px');
        chunk.style.animationDelay=(Math.random()*0.06)+'s';
        wrap.appendChild(chunk);
      }
      appendTokenLayerNode(wrap);
      setTimeout(()=>wrap.remove(), 700);
      els.boardInner.classList.remove('shake'); void els.boardInner.offsetWidth; els.boardInner.classList.add('shake');
    }
  }
  } finally {
    _tokenLayerBatchFragment=prevBatch;
    if(batch.childNodes.length) appendTokenLayerNode(batch);
  }
}

let panelPointerActive=false;

function currentShopContextKey(sel){
  if(!sel) return null;
  if(sel.kind==='tool' && sel.tool==='monster') return 'tool:monster';
  if(sel.kind==='tool' && sel.tool==='obstacle') return 'tool:obstacle';
  if(sel.kind==='tile' && state.grid[sel.r] && state.grid[sel.r][sel.c] && state.grid[sel.r][sel.c].type==='floor' && !state.grid[sel.r][sel.c].obstacle) return 'tile:'+sel.r+','+sel.c;
  return null;
}
