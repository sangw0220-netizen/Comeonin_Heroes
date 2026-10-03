"use strict";

/* ========================================================================== 
   Stage Mode v3 · 10 Stage Challenge
   - 1 Stage = 20 wave independent run
   - Run data resets every stage attempt
   - Soul/meta growth persists
   - Stage 1~8 progressively introduce all 42 hero types
   - Stage 9~10 remix veterans at higher levels into late-game parties
   ========================================================================== */

const STAGE_MODE_MAX=10;
const STAGE_MODE_WAVES=20;
const STAGE_MODE_DEFS={
  1:{
    id:1,icon:'🌲',name:'청람 고대림의 선봉대',theme:'기본 방어',mapName:'별빛 고대림',
    short:'검사·궁수·광부 중심의 기본 원정대를 상대하는 입문 스테이지',heroRoles:'전열 근접 · 원거리 딜러 · 채집/보조',
    objective:'고정된 고대림 유적의 통로를 읽고 몬스터와 함정을 배치해 첫 20웨이브를 막아내세요.',
    bg:'assets/images/maps/stage_01_fixed.png',levelBonus:0,
    startGoldBonus:0,monsterCapBonus:0,firstBuildBonus:0,
    hpMul:1.22,atkMul:1.08,countMul:.98,spawnIntervalMul:1.01,clearSoulBonus:25,
    entrances:[{to:20,count:1}],
    pools:[
      {to:5,ids:['swordsman','archer','miner']},
      {to:10,ids:['swordsman','archer','miner','mage','assassin']},
      {to:15,ids:['swordsman','archer','mage','assassin','paladin']},
      {to:19,ids:['swordsman','archer','mage','assassin','paladin','shieldbearer']},
    ],
    patterns:[
      {from:1,to:7,name:'초보 원정대',types:['swordsman','archer','miner']},
      {from:6,to:14,name:'마법 정찰대',types:['swordsman','mage','archer']},
      {from:11,to:19,name:'방패 전열',types:['shieldbearer','paladin','archer']},
      {from:15,to:19,name:'기초 혼성대',types:['swordsman','assassin','mage','paladin']},
    ],
    bosses:{
      10:{name:'정찰대장',bossId:'swordsman',types:['swordsman','archer','miner'],bonus:{hp:1.05,atk:1.05},count:1},
      20:{name:'용사 대장',bossId:'paladin',types:['paladin','swordsman','archer','shieldbearer'],bonus:{hp:1.10,atk:1.10},count:1},
    }
  },
  2:{
    id:2,icon:'🏹',name:'홍련의 사냥단',theme:'원거리·추격 대응',mapName:'불타는 심연',
    short:'궁수·사냥꾼·건슬링어가 후방에서 화력을 집중하는 스테이지',heroRoles:'원거리 딜러 · 추격형 · 잠입/암살형',
    objective:'후방 딜러를 방치하지 말고 추격, 이동 방해, 원거리 대응을 활용하세요.',
    bg:'assets/images/maps/stage_02_fixed.png',levelBonus:4,
    startGoldBonus:40,monsterCapBonus:0,firstBuildBonus:3,
    hpMul:1.30,atkMul:1.12,countMul:1.00,spawnIntervalMul:.99,clearSoulBonus:40,
    entrances:[{to:20,count:2}],
    pools:[
      {to:5,ids:['swordsman','archer','hunter']},
      {to:10,ids:['swordsman','archer','hunter','gunslinger']},
      {to:15,ids:['shieldbearer','archer','hunter','gunslinger','assassin']},
      {to:19,ids:['shieldbearer','archer','hunter','gunslinger','assassin','shadowrogue','mage']},
    ],
    patterns:[
      {from:1,to:9,name:'사냥꾼 분대',types:['swordsman','hunter','archer']},
      {from:6,to:14,name:'집중 사격대',types:['shieldbearer','gunslinger','archer']},
      {from:10,to:19,name:'그림자 저격대',types:['shadowrogue','hunter','gunslinger']},
      {from:14,to:19,name:'마력 엄호대',types:['mage','archer','hunter','shieldbearer']},
    ],
    bosses:{
      10:{name:'정예 사냥꾼',bossId:'hunter',types:['hunter','archer','swordsman'],bonus:{hp:1.08,atk:1.12},count:1},
      20:{name:'왕실 저격대장',bossId:'gunslinger',types:['shieldbearer','hunter','gunslinger','archer'],bonus:{hp:1.16,atk:1.20},count:1},
    }
  },
  3:{
    id:3,icon:'🛡️',name:'빙설 성기사단',theme:'지원·회복 대응',mapName:'빙정 설원',
    short:'전열 탱커 뒤에서 사제와 지원가가 전투를 유지하는 스테이지',heroRoles:'탱커 · 치유/지원 · 후방 마도',
    objective:'가까운 적만 때리지 말고 회복·지원 용사를 우선 제거하는 판단을 익히세요.',
    bg:'assets/images/maps/stage_03_fixed.png',levelBonus:8,
    startGoldBonus:75,monsterCapBonus:1,firstBuildBonus:5,
    hpMul:1.38,atkMul:1.15,countMul:1.02,spawnIntervalMul:.98,clearSoulBonus:60,
    entrances:[{to:20,count:3}],
    pools:[
      {to:5,ids:['swordsman','paladin','priest']},
      {to:10,ids:['shieldbearer','paladin','priest','archer']},
      {to:15,ids:['shieldbearer','paladin','priest','druid','miko','mage']},
      {to:19,ids:['shieldbearer','paladin','priest','druid','miko','bard','alchemist','archmage']},
    ],
    patterns:[
      {from:1,to:9,name:'성기사 원정대',types:['paladin','priest','swordsman']},
      {from:6,to:14,name:'철벽 치유대',types:['shieldbearer','priest','druid']},
      {from:10,to:19,name:'신관 지원대',types:['paladin','miko','bard','priest']},
      {from:14,to:19,name:'연금 마도 지원대',types:['shieldbearer','alchemist','archmage','druid']},
    ],
    bosses:{
      10:{name:'전투 사제',bossId:'priest',types:['shieldbearer','priest','paladin'],bonus:{hp:1.15,atk:1.07},count:1},
      20:{name:'성기사단장',bossId:'paladin',types:['shieldbearer','paladin','priest','archmage'],bonus:{hp:1.22,atk:1.15},count:1},
    }
  },
  4:{
    id:4,icon:'⚔️',name:'천공 돌격대',theme:'다중 전선·근접 돌파',mapName:'백운 성역',
    short:'사방 침입구와 고기동 근접 용사들이 동시에 압박하는 스테이지',heroRoles:'돌격형 · 창기병 · 기동 근접형',
    objective:'전력을 한곳에 몰지 말고 빠른 돌격대를 상대하며 다중 전선을 운영하세요.',
    bg:'assets/images/maps/stage_04_fixed.png',levelBonus:12,
    startGoldBonus:145,monsterCapBonus:2,firstBuildBonus:10,
    hpMul:1.46,atkMul:1.19,countMul:1.00,spawnIntervalMul:.98,clearSoulBonus:85,
    entrances:[{to:20,count:4}],
    pools:[
      {to:5,ids:['swordsman','berserker','assassin']},
      {to:10,ids:['berserker','dragoon','lancer','hunter']},
      {to:15,ids:['lancer','martial_artist','dual_wielder','shieldbearer','assassin']},
      {to:19,ids:['berserker','dragoon','lancer','martial_artist','dual_wielder','swordsaint','hunter']},
    ],
    patterns:[
      {from:1,to:8,name:'광전 돌격대',types:['berserker','swordsman','assassin']},
      {from:6,to:13,name:'창기병 돌파대',types:['dragoon','lancer','hunter']},
      {from:10,to:19,name:'무투 선봉대',types:['martial_artist','dual_wielder','lancer']},
      {from:14,to:19,name:'검성 친위대',types:['swordsaint','berserker','shieldbearer','hunter']},
    ],
    bosses:{
      10:{name:'돌격 선봉장',bossId:'dragoon',types:['dragoon','lancer','berserker'],bonus:{hp:1.16,atk:1.12},count:1},
      20:{name:'쌍검의 검성',bossId:'swordsaint',types:['swordsaint','lancer','dual_wielder','hunter'],bonus:{hp:1.10,atk:1.15},count:2},
    }
  },
  5:{
    id:5,icon:'🔮',name:'수정 심연의 마도단',theme:'마법·저주·소환',mapName:'청명 수정동굴',
    short:'소환과 빙결, 저주, 흡혈이 겹치는 중반 종합 마법 스테이지',heroRoles:'마법 화력 · 소환/저주 · 흡혈/빙결',
    objective:'시전자와 탱커의 조합을 읽고 마법 연계를 끊어내세요.',
    bg:'assets/images/maps/stage_05_fixed.png',levelBonus:16,
    startGoldBonus:190,monsterCapBonus:3,firstBuildBonus:10,
    hpMul:1.55,atkMul:1.23,countMul:1.02,spawnIntervalMul:.96,clearSoulBonus:120,
    entrances:[{to:20,count:5}],
    pools:[
      {to:5,ids:['mage','summoner','priest','shieldbearer']},
      {to:10,ids:['mage','ice_mage','spirit_caller','archmage','paladin']},
      {to:15,ids:['curse_caster','dark_knight','vampire','priest','ice_mage']},
      {to:19,ids:['dark_knight','ironclad','curse_caster','vampire','dragonslayer','archmage','spirit_caller']},
    ],
    patterns:[
      {from:1,to:8,name:'소환 마도대',types:['summoner','mage','priest']},
      {from:6,to:13,name:'빙결 정령대',types:['ice_mage','spirit_caller','paladin']},
      {from:10,to:17,name:'심연 저주대',types:['curse_caster','dark_knight','vampire']},
      {from:14,to:19,name:'용사냥 마도대',types:['dragonslayer','archmage','ironclad','curse_caster']},
    ],
    bosses:{
      10:{name:'빙결 대현자',bossId:'ice_mage',types:['ice_mage','spirit_caller','archmage'],bonus:{hp:1.18,atk:1.18},count:1},
      20:{name:'공허의 군주',bossId:'vampire',types:['vampire','dark_knight','curse_caster','ironclad'],bonus:{hp:1.30,atk:1.22},count:1},
    }
  },
  6:{
    id:6,icon:'🐎',name:'핏빛 왕성 기병대',theme:'왕국 정예·기병 돌파',mapName:'적월 성채',
    short:'초반 용사들이 베테랑으로 복귀하고 왕국 정예 기병이 합류합니다',heroRoles:'기병 · 방진 탱커 · 장거리 지원',
    objective:'높아진 베테랑 레벨과 왕국 방진의 돌파력을 동시에 견뎌내세요.',
    bg:'assets/images/maps/stage_06_fixed.png',levelBonus:22,
    startGoldBonus:230,monsterCapBonus:4,firstBuildBonus:12,
    hpMul:1.65,atkMul:1.28,countMul:1.03,spawnIntervalMul:.95,clearSoulBonus:155,
    entrances:[{to:20,count:6}],
    pools:[
      {to:5,ids:['swordsman','horseman','archer']},
      {to:10,ids:['horseman','pikeman','royal_longbow','lancer']},
      {to:15,ids:['royal_elite','pikeman','royal_longbow','priest','shieldbearer']},
      {to:19,ids:['royal_elite','royal_guard','pikeman','royal_longbow','horseman','lancer','paladin']},
    ],
    patterns:[
      {from:1,to:8,name:'베테랑 선봉대',types:['swordsman','horseman','archer']},
      {from:6,to:13,name:'왕국 창기병대',types:['horseman','pikeman','royal_longbow']},
      {from:10,to:18,name:'왕국 방진',types:['royal_elite','royal_guard','pikeman']},
      {from:14,to:19,name:'왕국 혼성 원정대',types:['royal_elite','royal_longbow','paladin','priest']},
    ],
    bosses:{
      10:{name:'왕국 창기병장',bossId:'pikeman',types:['pikeman','horseman','royal_longbow'],bonus:{hp:1.20,atk:1.16},count:1},
      20:{name:'왕국 정예대장',bossId:'royal_elite',types:['royal_elite','royal_guard','pikeman','royal_longbow'],bonus:{hp:1.32,atk:1.20},count:1},
    }
  },
  7:{
    id:7,icon:'☀️',name:'독안개 황실전선',theme:'왕실 지원·마도 연계',mapName:'부패의 수렁',
    short:'룬 수호자와 황실 마도단이 강력한 전열을 마법으로 지원합니다',heroRoles:'지원 마도사 · 룬 수호 탱커 · 치유/성전',
    objective:'여러 전선을 지키면서 룬·회복·마법 지원을 먼저 무너뜨리세요.',
    bg:'assets/images/maps/stage_07_fixed.png',levelBonus:28,
    startGoldBonus:270,monsterCapBonus:4,firstBuildBonus:13,
    hpMul:1.76,atkMul:1.33,countMul:1.04,spawnIntervalMul:.94,clearSoulBonus:195,
    entrances:[{to:20,count:7}],
    pools:[
      {to:5,ids:['royal_elite','royal_longbow','battle_mage']},
      {to:10,ids:['battle_mage','rune_guardian','royal_guard','archmage']},
      {to:15,ids:['battle_mage','rune_guardian','imperial_magus','royal_longbow','druid']},
      {to:19,ids:['sun_lancer','imperial_magus','battle_mage','rune_guardian','royal_guard','paladin','miko']},
    ],
    patterns:[
      {from:1,to:8,name:'왕실 마도 정찰대',types:['royal_elite','royal_longbow','battle_mage']},
      {from:6,to:13,name:'룬 방벽대',types:['royal_guard','rune_guardian','battle_mage']},
      {from:10,to:18,name:'황실 치유진',types:['imperial_magus','druid','royal_longbow']},
      {from:14,to:19,name:'태양 성전군',types:['sun_lancer','imperial_magus','rune_guardian','paladin']},
    ],
    bosses:{
      10:{name:'룬 수호대장',bossId:'rune_guardian',types:['rune_guardian','royal_guard','battle_mage'],bonus:{hp:1.26,atk:1.16},count:1},
      20:{name:'태양의 창기병장',bossId:'sun_lancer',types:['sun_lancer','imperial_magus','royal_guard','battle_mage'],bonus:{hp:1.34,atk:1.25},count:1},
    }
  },
  8:{
    id:8,icon:'🐉',name:'황야 용기사단',theme:'공중 기동·최상위 돌파',mapName:'태양 사막유적',
    short:'그리폰과 왕국 랜스, 용기병이 높은 기동력으로 방어선을 찢습니다',heroRoles:'공중 기동 · 돌파형 기사 · 원거리 엄호',
    objective:'최상위 돌파 용사와 장거리 지원의 진입 타이밍을 분산시켜 막으세요.',
    bg:'assets/images/maps/stage_08_fixed.png',levelBonus:34,
    startGoldBonus:310,monsterCapBonus:5,firstBuildBonus:15,
    hpMul:1.88,atkMul:1.39,countMul:1.05,spawnIntervalMul:.93,clearSoulBonus:240,
    entrances:[{to:20,count:8}],
    pools:[
      {to:5,ids:['griffon_knight','royal_lance','royal_elite']},
      {to:10,ids:['griffon_knight','royal_lance','royal_longbow','battle_mage']},
      {to:15,ids:['dragon_rider','griffon_knight','royal_lance','dragonslayer','hunter']},
      {to:19,ids:['dragon_rider','griffon_knight','royal_lance','royal_guard','imperial_magus','dragonslayer','battle_mage']},
    ],
    patterns:[
      {from:1,to:8,name:'그리폰 선봉대',types:['griffon_knight','royal_lance','royal_elite']},
      {from:6,to:13,name:'천공 엄호대',types:['griffon_knight','royal_longbow','battle_mage']},
      {from:10,to:18,name:'용 사냥 기사단',types:['dragon_rider','dragonslayer','hunter']},
      {from:14,to:19,name:'천공 황실군',types:['dragon_rider','royal_lance','imperial_magus','royal_guard']},
    ],
    bosses:{
      10:{name:'그리폰 기사단장',bossId:'griffon_knight',types:['griffon_knight','royal_lance','royal_longbow'],bonus:{hp:1.28,atk:1.23},count:1},
      20:{name:'천공 용기사단장',bossId:'dragon_rider',types:['dragon_rider','griffon_knight','royal_lance','imperial_magus'],bonus:{hp:1.38,atk:1.28},count:1},
    }
  },
  9:{
    id:9,icon:'🏰',name:'자색 마계 최정예',theme:'베테랑 조합전',mapName:'황혼 마계성',
    short:'지금까지 만난 모든 계열이 고레벨 베테랑 조합으로 재편성됩니다',heroRoles:'최정예 혼성군 · 고레벨 근접 · 고레벨 마도',
    objective:'익숙한 용사라도 훨씬 높은 레벨입니다. 조합을 읽고 대응 순서를 바꾸세요.',
    bg:'assets/images/maps/stage_09_fixed.png',levelBonus:41,
    startGoldBonus:350,monsterCapBonus:6,firstBuildBonus:16,
    hpMul:2.02,atkMul:1.45,countMul:1.07,spawnIntervalMul:.92,clearSoulBonus:290,
    entrances:[{to:20,count:9}],
    pools:[
      {to:5,ids:['swordsman','archer','paladin','priest','hunter','gunslinger']},
      {to:10,ids:['swordsaint','dragonslayer','dark_knight','ironclad','lancer','dual_wielder']},
      {to:15,ids:['archmage','ice_mage','curse_caster','imperial_magus','rune_guardian','battle_mage']},
      {to:19,ids:['royal_elite','royal_guard','royal_longbow','sun_lancer','griffon_knight','royal_lance','dragon_rider','bard','alchemist']},
    ],
    patterns:[
      {from:1,to:7,name:'고참 용사단',types:['swordsman','archer','paladin','priest']},
      {from:6,to:12,name:'최정예 근위대',types:['swordsaint','dark_knight','ironclad','dragonslayer']},
      {from:10,to:16,name:'최정예 마도단',types:['archmage','curse_caster','battle_mage','rune_guardian']},
      {from:14,to:19,name:'왕국 대원정군',types:['royal_elite','royal_guard','royal_longbow','imperial_magus']},
      {from:16,to:19,name:'왕국 기동 결전대',types:['sun_lancer','griffon_knight','royal_lance','dragon_rider']},
    ],
    bosses:{
      10:{name:'왕국 검성',bossId:'swordsaint',types:['swordsaint','dark_knight','ironclad','priest'],bonus:{hp:1.34,atk:1.28},count:1},
      20:{name:'왕의 양대 근위대장',bossId:'royal_elite',types:['royal_elite','royal_guard','imperial_magus','royal_longbow'],bonus:{hp:1.22,atk:1.20},count:2},
    }
  },
  10:{
    id:10,icon:'👑',name:'천공왕궁 최후의 결전',theme:'10스테이지 최종 종합 시험',mapName:'백금 천공왕궁',
    short:'초기 용사부터 용기병까지 모든 시대의 베테랑이 최종 공세에 합류합니다',heroRoles:'전 계열 총동원 · 베테랑 혼성군 · 최종 결전대',
    objective:'초반에 익숙했던 용사도 고레벨로 강화됩니다. 모든 대응법을 동원해 최종 공세를 막으세요.',
    bg:'assets/images/maps/stage_10_fixed.png',levelBonus:46,
    startGoldBonus:400,monsterCapBonus:7,firstBuildBonus:18,
    hpMul:2.18,atkMul:1.52,countMul:1.08,spawnIntervalMul:.90,clearSoulBonus:360,
    entrances:[{to:20,count:10}],
    pools:[
      {to:5,ids:['swordsman','archer','miner','mage','assassin','paladin','priest']},
      {to:10,ids:['hunter','gunslinger','shadowrogue','swordsaint','berserker','dragoon','druid','miko']},
      {to:15,ids:['dark_knight','ironclad','dragonslayer','curse_caster','ice_mage','spirit_caller','battle_mage','rune_guardian']},
      {to:19,ids:['royal_elite','royal_guard','royal_longbow','sun_lancer','griffon_knight','royal_lance','dragon_rider','imperial_magus','swordsman','archer','paladin','priest']},
    ],
    patterns:[
      {from:1,to:7,name:'전설의 고참 원정대',types:['swordsman','archer','mage','paladin','priest']},
      {from:6,to:12,name:'베테랑 처형대',types:['swordsaint','berserker','dragoon','hunter','miko']},
      {from:10,to:16,name:'심연 결전대',types:['dark_knight','ironclad','dragonslayer','curse_caster']},
      {from:12,to:18,name:'황실 마도 결전대',types:['battle_mage','rune_guardian','imperial_magus','ice_mage']},
      {from:15,to:19,name:'왕국 최후 방진',types:['royal_elite','royal_guard','royal_longbow','sun_lancer']},
      {from:17,to:19,name:'천공 최종 돌격대',types:['dragon_rider','griffon_knight','royal_lance','imperial_magus']},
    ],
    bosses:{
      10:{name:'왕국 대원수',bossId:'royal_elite',types:['royal_elite','royal_guard','battle_mage','imperial_magus'],bonus:{hp:1.40,atk:1.28},count:1},
      20:{name:'용기병왕 · 최후의 원정',bossId:'dragon_rider',types:['dragon_rider','royal_guard','imperial_magus','royal_longbow','swordsaint'],bonus:{hp:1.48,atk:1.34},count:1},
    }
  }
};



/* ==========================================================================
   v2.2 · Authored fixed-map mode (Stage 1~10)
   - Each stage uses the user-authored square map art as the live board.
   - 15x15 collision data is invisible and only controls pathing / placement.
   - Entrances are fixed to the glowing doors visible in each stage artwork.
   - # = blocked scenery/wall/water/prop, . = walkable floor, E = fixed entrance.
   ========================================================================== */
function stageFixedMask(rects=[],blocked=[],entrances=[]){
  const g=Array.from({length:15},()=>Array(15).fill('#'));
  for(const rc of rects){
    const [r1,c1,r2,c2]=rc;
    for(let r=Math.max(0,r1);r<=Math.min(14,r2);r++){
      for(let c=Math.max(0,c1);c<=Math.min(14,c2);c++) g[r][c]='.';
    }
  }
  for(const [r,c] of blocked){ if(r>=0&&r<15&&c>=0&&c<15) g[r][c]='#'; }
  for(const sp of entrances){ if(sp.r>=0&&sp.r<15&&sp.c>=0&&sp.c<15) g[sp.r][sp.c]='E'; }
  return g.map(row=>row.join(''));
}

const STAGE_FIXED_MAP_DEFS={
  1:{
    image:'assets/images/maps/stage_01_fixed.png',
    entranceLabel:'북쪽 고대문',
    entrances:[{r:1,c:7}],
    mask:[
      '###############',
      '#######E#######',
      '#######.###.###',
      '#######.##..###',
      '#####.#.#...###',
      '###.........###',
      '#########...###',
      '###...#.....###',
      '###.....##..###',
      '###.....###.###',
      '###..#..#######',
      '###.###.#######',
      '###############',
      '###############',
      '###############'
    ]
  },
  2:(()=>{
    const entrances=[{r:0,c:7},{r:14,c:7}];
    return {
      image:'assets/images/maps/stage_02_fixed.png', entranceLabel:'태양 유적의 남북문', entrances,
      mask:stageFixedMask(
        [[0,7,4,7],[3,5,5,7],[4,3,11,11],[7,2,10,12],[10,3,13,8],[13,7,14,7]],
        [[3,6],[4,6],[4,8],[4,9],[5,4],[5,5],[5,8],[6,4],[6,8],[8,9],[8,10],[9,9],[10,9],[10,10],[11,4],[11,5]], entrances)
    };
  })(),
  3:(()=>{
    const entrances=[{r:1,c:7},{r:7,c:1},{r:13,c:12}];
    return {
      image:'assets/images/maps/stage_03_fixed.png', entranceLabel:'빙정 설원의 삼중문', entrances,
      mask:stageFixedMask(
        [[1,7,5,7],[3,3,5,11],[5,3,11,11],[7,1,8,4],[9,9,11,12],[11,11,13,12]],
        [[3,3],[4,3],[4,9],[4,11],[6,6],[6,8],[7,6],[7,8],[8,6],[8,8],[9,4],[9,10],[10,5],[10,11],[11,5],[11,9]], entrances)
    };
  })(),
  4:(()=>{
    const entrances=[{r:1,c:7},{r:7,c:0},{r:7,c:14},{r:13,c:7}];
    return {
      image:'assets/images/maps/stage_04_fixed.png', entranceLabel:'백운 성역의 사방문', entrances,
      mask:stageFixedMask(
        [[1,7,12,7],[3,5,11,9],[7,0,8,14],[7,2,11,12],[11,5,13,9]],
        [[3,9],[4,9],[5,6],[5,8],[5,9],[6,6],[6,8],[6,9],[7,9],[8,8],[9,4],[9,10],[10,4],[10,10],[11,8]], entrances)
    };
  })(),
  5:(()=>{
    const entrances=[{r:0,c:7},{r:4,c:14},{r:7,c:0},{r:7,c:14},{r:13,c:7}];
    return {
      image:'assets/images/maps/stage_05_fixed.png', entranceLabel:'청명 수정동굴의 오방문', entrances,
      mask:stageFixedMask(
        [[0,7,6,7],[4,5,10,12],[4,12,4,14],[6,1,10,13],[7,0,8,14],[9,3,11,10],[11,6,13,8]],
        [[4,6],[4,9],[5,7],[6,6],[6,8],[7,5],[7,8],[8,5],[8,8],[9,5],[10,9],[10,10],[11,7],[11,9],[11,10]], entrances)
    };
  })(),
  6:(()=>{
    const entrances=[{r:1,c:7},{r:3,c:0},{r:3,c:14},{r:7,c:0},{r:7,c:14},{r:13,c:7}];
    return {
      image:'assets/images/maps/stage_06_fixed.png', entranceLabel:'적월 성채의 육문', entrances,
      mask:stageFixedMask(
        [[1,7,5,7],[2,3,11,11],[3,0,4,4],[3,10,4,14],[7,0,8,14],[11,5,13,9]],
        [[3,6],[3,8],[4,6],[4,8],[5,5],[5,9],[7,6],[7,8],[8,6],[8,8],[8,10],[10,5],[10,8],[11,5],[11,8]], entrances)
    };
  })(),
  7:(()=>{
    const entrances=[{r:1,c:7},{r:3,c:0},{r:3,c:14},{r:7,c:0},{r:8,c:14},{r:12,c:2},{r:13,c:7}];
    return {
      image:'assets/images/maps/stage_07_fixed.png', entranceLabel:'부패 수렁의 칠문', entrances,
      mask:stageFixedMask(
        [[1,7,6,7],[3,0,4,4],[3,10,4,14],[4,3,11,12],[7,0,9,4],[7,10,9,14],[10,2,12,7],[11,6,13,8]],
        [[4,3],[4,6],[4,9],[4,11],[5,3],[5,12],[6,5],[6,9],[7,5],[7,9],[8,9],[9,2],[9,9],[10,3],[10,6],[11,3],[11,6],[11,8]], entrances)
    };
  })(),
  8:(()=>{
    const entrances=[{r:0,c:7},{r:2,c:2},{r:2,c:13},{r:7,c:1},{r:7,c:13},{r:12,c:7}];
    return {
      image:'assets/images/maps/stage_08_fixed.png', entranceLabel:'홍련 마성의 육문', entrances,
      mask:stageFixedMask(
        [[0,7,6,7],[2,2,7,4],[2,10,7,13],[5,3,10,11],[7,1,8,13],[9,3,11,9],[10,6,12,8]],
        [[4,6],[4,8],[6,5],[6,9],[7,5],[8,9],[9,6],[9,9],[10,6],[10,8]], entrances)
    };
  })(),
  9:(()=>{
    const entrances=[{r:1,c:7},{r:3,c:2},{r:2,c:12},{r:7,c:1},{r:7,c:13},{r:12,c:2},{r:12,c:7}];
    return {
      image:'assets/images/maps/stage_09_fixed.png', entranceLabel:'백금 천공도시의 칠문', entrances,
      mask:stageFixedMask(
        [[1,7,5,7],[2,11,5,12],[3,2,8,4],[4,3,11,11],[7,1,8,13],[6,10,11,13],[10,2,12,8]],
        [[4,8],[6,5],[6,7],[6,9],[7,7],[9,6],[9,10],[10,6],[10,10],[11,8]], entrances)
    };
  })(),
  10:(()=>{
    const entrances=[{r:1,c:3},{r:1,c:7},{r:1,c:12},{r:6,c:0},{r:6,c:14},{r:13,c:3},{r:13,c:7},{r:13,c:12}];
    return {
      image:'assets/images/maps/stage_10_fixed.png', entranceLabel:'천공왕궁의 팔문', entrances,
      mask:stageFixedMask(
        [[1,3,4,4],[1,7,4,8],[1,11,4,12],[3,3,11,12],[6,0,8,14],[10,2,13,12]],
        [[4,6],[4,8],[5,6],[5,8],[6,8],[7,8],[8,8],[9,8],[9,10],[10,10],[11,6],[11,9]], entrances)
    };
  })()
};
function stageFixedMapDef(id){
  const sid=Math.max(1,Number(id ?? state?.stageId ?? selectedStageId ?? 1)||1);
  return STAGE_FIXED_MAP_DEFS[sid]||null;
}
function stageFixedMapEnabled(id){ return !!stageFixedMapDef(id); }
function stageFixedMapBuildGrid(id){
  const def=stageFixedMapDef(id); if(!def) return null;
  return def.mask.map((row,r)=>Array.from(row).map((ch,c)=>({
    type:(ch==='.'||ch==='E')?'floor':'rock',
    isEntrance:ch==='E',
    fixedTerrain:true,
    obstacle:null,
    breached:ch==='E'
  })));
}

const STAGE_MODE_HERO_INTRO_STAGE=(()=>{
  const out={};
  for(let stage=1;stage<=STAGE_MODE_MAX;stage++){
    const d=STAGE_MODE_DEFS[stage];
    for(const row of (d?.pools||[])) for(const id of (row.ids||[])) if(!out[id]) out[id]=stage;
    for(const b of Object.values(d?.bosses||{})){
      if(b?.bossId&&!out[b.bossId]) out[b.bossId]=stage;
      for(const id of (b?.types||[])) if(!out[id]) out[id]=stage;
    }
  }
  return out;
})();

let selectedStageId=1;
const STAGE_MODE_SELECTED_KEY='dungeon_defense_selected_stage_v1';
try{ selectedStageId=Math.max(1,Math.min(STAGE_MODE_MAX,Number(localStorage.getItem(STAGE_MODE_SELECTED_KEY))||1)); }catch(_){ }

const STAGE_SELECT_TEMPLATE=`
  <div class="stage-select-screen">
    <div id="selectedStageSummary" class="selected-stage-summary"></div>
    <div class="stage-scroll-shell">
      <div id="stageSelectGrid" class="stage-select-grid" aria-label="스테이지 목록"></div>
    </div>
    <div class="stage-scroll-hint">← 좌우로 스크롤하여 스테이지를 선택하세요 →</div>
    <div class="stage-select-actions">
      <button class="cta stage-select-start" id="startBtn">선택한 스테이지 시작</button>
      <button class="cta secondary stage-select-growth" id="metaGrowthBtn">🔮 마왕의 성장</button>
    </div>
    <div id="startMetaSummary" class="stage-meta-summary">영혼 0 · 해금 몬스터 0종</div>
  </div>`;

function stageModeDef(id){ return STAGE_MODE_DEFS[Math.max(1,Math.min(STAGE_MODE_MAX,Number(id)||1))]||STAGE_MODE_DEFS[1]; }
function stageModeCurrentId(){ return Math.max(1,Math.min(STAGE_MODE_MAX,Number(state?.stageId||selectedStageId)||1)); }
function stageModeCurrent(){ return stageModeDef(stageModeCurrentId()); }
function stageModeUnlockedMax(){
  if(typeof debugModeActive!=='undefined'&&debugModeActive) return STAGE_MODE_MAX;
  try{ if(typeof isTestMode==='function'&&isTestMode()) return STAGE_MODE_MAX; }catch(_){ }
  let unlocked=Math.max(1,Math.min(STAGE_MODE_MAX,Number(metaProgress?.stageUnlocked)||1));
  // v3 migration: 5-stage 버전에서 Stage 5를 이미 클리어한 계정은 Stage 6부터 이어서 도전할 수 있습니다.
  if(unlocked===5 && Math.max(0,Number(metaProgress?.stageClears?.[5])||0)>0) unlocked=6;
  return unlocked;
}
function stageModeIsUnlocked(id){ return Number(id)<=stageModeUnlockedMax(); }
function stageModeSetSelected(id,force=false){
  id=Math.max(1,Math.min(STAGE_MODE_MAX,Number(id)||1));
  if(!force&&!stageModeIsUnlocked(id)) return false;
  selectedStageId=id;
  try{ localStorage.setItem(STAGE_MODE_SELECTED_KEY,String(id)); }catch(_){ }
  renderStageSelect();
  return true;
}
function stageModeEntranceCount(wave,id=stageModeCurrentId()){
  const d=stageModeDef(id),w=Math.max(1,Number(wave)||1);
  const row=(d.entrances||[]).find(x=>w<=x.to)||(d.entrances||[]).slice(-1)[0];
  return Math.max(1,Math.min(10,Number(row?.count)||1));
}
function stageModeEntranceSummary(id=stageModeCurrentId()){
  const fixed=(typeof stageFixedMapDef==='function')?stageFixedMapDef(id):null;
  if(fixed&&Array.isArray(fixed.entrances)) return `${fixed.entrances.length}곳 · 고정 배치`;
  const rows=stageModeDef(id).entrances||[{to:20,count:1}];
  if(rows.length===1) return rows[0].count===1?'1곳':`처음부터 ${rows[0].count}곳`;
  let from=1;
  return rows.map((r,i)=>{const label=`Wave ${from}~${r.to}: ${r.count}곳`;from=r.to+1;return label;}).join(' → ');
}
function stageModeHeroPoolIds(wave,id=stageModeCurrentId()){
  const def=stageModeDef(id),w=Math.max(1,Number(wave)||1);
  const row=def.pools.find(x=>w<=x.to)||def.pools[def.pools.length-1];
  const ids=[...new Set(row?.ids||[])].filter(x=>typeof HERO_TYPES!=='undefined'&&HERO_TYPES.some(h=>h.id===x));
  return ids.length?ids:['swordsman'];
}
function stageModeEncounterPattern(wave,id=stageModeCurrentId()){
  const d=stageModeDef(id),w=Math.max(1,Number(wave)||1),pool=stageModeHeroPoolIds(w,id);
  const candidates=(d.patterns||[]).filter(p=>w>=p.from&&w<=p.to&&p.types.filter(x=>pool.includes(x)).length>=2);
  if(!candidates.length) return null;
  const p=candidates[Math.floor(Math.random()*candidates.length)];
  return {id:`stage_${id}_${p.name}`,name:p.name,minWave:p.from,types:p.types.filter(x=>pool.includes(x)),speedMul:p.speedMul||1};
}
function stageModeHeroIntroStage(typeId){ return STAGE_MODE_HERO_INTRO_STAGE[typeId]||stageModeCurrentId(); }
function stageModeHeroLevelBonus(typeId,id=stageModeCurrentId()){
  const d=stageModeDef(id),intro=stageModeHeroIntroStage(typeId);
  const veteranBonus=Math.min(10,Math.max(0,id-intro));
  return Math.max(0,Number(d.levelBonus)||0)+veteranBonus;
}
function stageModeHeroLevelStatMul(typeId,id=stageModeCurrentId()){
  const extra=stageModeHeroLevelBonus(typeId,id);
  return {hp:1+Math.min(.55,extra*.010),atk:1+Math.min(.36,extra*.0065),reward:1+Math.min(.30,extra*.0045)};
}
function stageModeBossProfile(wave,id=stageModeCurrentId()){
  return stageModeDef(id).bosses?.[Number(wave)]||null;
}
function stageModeBossCount(wave,id=stageModeCurrentId()){
  const b=stageModeBossProfile(wave,id); return b?Math.max(1,Number(b.count)||1):0;
}
function stageModeStartGoldBonus(id=selectedStageId){ return stageModeDef(id).startGoldBonus||0; }
function stageModeMonsterCapBonus(id=selectedStageId){ return stageModeDef(id).monsterCapBonus||0; }
function stageModeFirstBuildBonus(id=selectedStageId){ return stageModeDef(id).firstBuildBonus||0; }
function stageModeHeroHpMul(id=stageModeCurrentId()){ return stageModeDef(id).hpMul||1; }
// v112 · 20-wave Stage 내부 HP 성장 곡선.
// Wave 1은 기존 체력을 유지하고, 후반으로 갈수록 추가 HP가 점진적으로 커집니다.
// W5 약 +7%, W10 약 +18%, W15 약 +31%, W20 +45%.
function stageModeWaveHpGrowthMul(wave){
  const w=Math.max(1,Math.min(STAGE_MODE_WAVES,Number(wave)||1));
  const t=(w-1)/(STAGE_MODE_WAVES-1);
  return 1+0.45*Math.pow(t,1.22);
}
function stageModeHeroAtkMul(id=stageModeCurrentId()){ return stageModeDef(id).atkMul||1; }

/* ==========================================================================
   v2.4 · Stage Balance & Identity
   - 각 스테이지가 자기 역할군을 더 자주 보여 주도록 일반 와일드카드 비율을 낮춥니다.
   - 한 스테이지 안에서도 1~5 / 6~10 / 11~15 / 16~20 웨이브의 압박 템포가 점진적으로 상승합니다.
   - 기존 스테이지별 기본 배율은 유지하고, 아래 값은 '웨이브 흐름'만 보정합니다.
   ========================================================================== */
const STAGE_MODE_IDENTITY={
  1:{label:'기본 전술 훈련',wildcard:.26},
  2:{label:'원거리 집중 사격',wildcard:.14},
  3:{label:'철벽·회복 진형',wildcard:.12},
  4:{label:'고기동 다중 돌격',wildcard:.12},
  5:{label:'마법·저주 연계',wildcard:.12},
  6:{label:'왕국 기병 방진',wildcard:.13},
  7:{label:'룬·지원 마도전',wildcard:.12},
  8:{label:'천공 기동 돌파',wildcard:.12},
  9:{label:'베테랑 혼성 결전',wildcard:.18},
  10:{label:'전 계열 최종 공세',wildcard:.22},
};
function stageModeIdentity(id=stageModeCurrentId()){ return STAGE_MODE_IDENTITY[id]||STAGE_MODE_IDENTITY[1]; }
function stageModeWildcardChance(id=stageModeCurrentId()){ return stageModeIdentity(id).wildcard; }
function stageModeWavePhase(wave){
  const w=Math.max(1,Math.min(STAGE_MODE_WAVES,Number(wave)||1));
  if(w<=5) return {name:'정찰전',count:.94,spawn:1.05};
  if(w<=10) return {name:'압박전',count:1.00,spawn:1.00};
  if(w<=15) return {name:'정예전',count:1.04,spawn:.97};
  return {name:'총공세',count:1.08,spawn:.94};
}
function stageModeHeroCountMul(id=stageModeCurrentId()){
  const phase=stageModeWavePhase(state?.wave||1);
  return (stageModeDef(id).countMul||1)*phase.count;
}
function stageModeSpawnIntervalMul(id=stageModeCurrentId()){
  const phase=stageModeWavePhase(state?.wave||1);
  return (stageModeDef(id).spawnIntervalMul||1)*phase.spawn;
}
function stageModeEarlyEnemyMul(wave,id=stageModeCurrentId()){
  const w=Math.max(1,Number(wave)||1);
  const ranges={
    1:[.60,.82,.96],2:[.68,.89,1.00],3:[.75,.94,1.04],4:[.83,.99,1.07],5:[.92,1.03,1.12],
    6:[.97,1.07,1.14],7:[1.01,1.10,1.17],8:[1.05,1.13,1.20],9:[1.09,1.16,1.23],10:[1.13,1.20,1.27]
  };
  const [lo,hi,late]=ranges[id]||ranges[1];
  if(w>10) return late;
  return lo+(w-1)*(hi-lo)/9;
}
function stageModeEarlyDefenseMul(wave,id=stageModeCurrentId()){
  const w=Math.max(1,Number(wave)||1);
  const ranges={
    1:[.64,.84,1.00],2:[.70,.89,1.02],3:[.77,.94,1.04],4:[.84,.98,1.06],5:[.90,1.02,1.08],
    6:[.95,1.05,1.10],7:[.99,1.08,1.12],8:[1.03,1.11,1.14],9:[1.07,1.14,1.17],10:[1.11,1.17,1.20]
  };
  const [lo,hi,late]=ranges[id]||ranges[1];
  if(w>10) return late;
  return lo+(w-1)*(hi-lo)/9;
}
function stageModeEarlyCountMul(wave,id=stageModeCurrentId()){
  if(Number(wave)>10) return 1;
  return ({1:.78,2:.84,3:.90,4:.95,5:1.00,6:1.00,7:1.02,8:1.04,9:1.06,10:1.08})[id]||.78;
}
function stageModeEarlySpawnIntervalMul(wave,id=stageModeCurrentId()){
  if(Number(wave)>10) return 1;
  return ({1:1.14,2:1.10,3:1.06,4:1.02,5:.98,6:.96,7:.94,8:.93,9:.92,10:.90})[id]||1.14;
}
function stageModeMidwaveMul(wave,id=stageModeCurrentId()){
  const w=Number(wave)||1; if(w<11||w>20)return 1;
  return ({1:.88,2:.92,3:.96,4:1.00,5:1.04,6:1.07,7:1.10,8:1.13,9:1.16,10:1.20})[id]||.88;
}
function stageModeBossNerf(wave,id=stageModeCurrentId()){
  const w=Number(wave)||1;
  const row={
    1:w===10?{atk:.72,hp:.45}:{atk:.88,hp:.85},
    2:w===10?{atk:.80,hp:.65}:{atk:.92,hp:.92},
    3:w===10?{atk:.88,hp:.78}:{atk:.97,hp:.98},
    4:w===10?{atk:.94,hp:.90}:{atk:1.00,hp:1.02},
    5:w===10?{atk:1.00,hp:1.00}:{atk:1.03,hp:1.05},
    6:w===10?{atk:1.03,hp:1.06}:{atk:1.06,hp:1.10},
    7:w===10?{atk:1.06,hp:1.10}:{atk:1.09,hp:1.15},
    8:w===10?{atk:1.09,hp:1.14}:{atk:1.12,hp:1.20},
    9:w===10?{atk:1.12,hp:1.18}:{atk:1.16,hp:1.25},
    10:w===10?{atk:1.16,hp:1.24}:{atk:1.20,hp:1.32},
  }[id];
  return row||{atk:1,hp:1};
}
function stageModeVisual(id=stageModeCurrentId()){
  const d=stageModeDef(id); return {icon:d.icon,title:`STAGE ${d.id} · ${d.name}`,sub:`${d.theme} · ${d.short}`,bg:d.bg};
}
function stageModeClearCount(id){ return Math.max(0,Number(metaProgress?.stageClears?.[id])||0); }
function stageModeMarkClear(id){
  id=Math.max(1,Math.min(STAGE_MODE_MAX,Number(id)||1));
  if(!metaProgress.stageClears||typeof metaProgress.stageClears!=='object') metaProgress.stageClears={};
  metaProgress.stageClears[id]=(Number(metaProgress.stageClears[id])||0)+1;
  metaProgress.stageUnlocked=Math.max(Number(metaProgress.stageUnlocked)||1,Math.min(STAGE_MODE_MAX,id+1));
  saveMeta();
}

function renderStageSelect(){
  const grid=document.getElementById('stageSelectGrid');
  const summary=document.getElementById('selectedStageSummary');
  if(!grid) return;
  const unlocked=stageModeUnlockedMax();
  if(selectedStageId>unlocked) selectedStageId=unlocked;
  grid.innerHTML='';
  for(let id=1;id<=STAGE_MODE_MAX;id++){
    const d=stageModeDef(id),locked=id>unlocked,clears=stageModeClearCount(id);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='stage-select-card'+(selectedStageId===id?' selected':'')+(locked?' locked':'');
    btn.disabled=locked;
    btn.dataset.stageId=String(id);
    btn.style.setProperty('--stage-card-bg',`url("${d.bg}")`);
    btn.innerHTML=`<span class="ssc-art" style="background-image:url('${d.bg}')"><span class="ssc-shade"></span><span class="ssc-badge">${d.icon}</span><span class="ssc-status">${locked?'🔒 잠김':(clears?`✓ ${clears}회 클리어`:'도전 가능')}</span><span class="ssc-theme-chip">${d.name}</span></span><span class="ssc-body"><span class="ssc-stage">STAGE ${id}</span><strong class="ssc-map-name">${d.mapName||d.name}</strong><span class="ssc-label">던전 목표</span><small class="ssc-objective">${d.objective}</small><span class="ssc-label">등장 용사 역할군</span><small class="ssc-roles">${d.heroRoles||d.theme}</small></span>`;
    if(!locked) btn.addEventListener('click',()=>{ Sound?.ui?.(); stageModeSetSelected(id); });
    grid.appendChild(btn);
  }
  if(summary){
    const d=stageModeDef(selectedStageId);
    const entrances=stageModeEntranceSummary(selectedStageId);
    const identity=stageModeIdentity(selectedStageId);
    summary.innerHTML=`<b>${d.icon} Stage ${d.id} · ${d.name}</b><span class="sss-map">맵 이름 · ${d.mapName||d.name}</span><span>${d.objective}</span><small>전투 개성 · ${identity.label} · 등장 역할군 ${d.heroRoles||d.theme}</small><small>웨이브 흐름 · 1~5 정찰전 → 6~10 압박전 → 11~15 정예전 → 16~20 총공세</small><small>침입구 ${entrances} · 기본 용사 Lv.+${d.levelBonus} · 시작 지원 +${d.startGoldBonus}G · Wave 20 최종 보스</small>`;
    summary.style.backgroundImage=`linear-gradient(180deg, rgba(15,10,24,.78), rgba(15,10,24,.88)), url("${d.bg}")`;
    summary.style.backgroundSize='cover';
    summary.style.backgroundPosition='center';
  }
  const startBtn=document.getElementById('startBtn');
  if(startBtn) startBtn.textContent=`STAGE ${selectedStageId} 시작하기`;
}

function stageModeBindLobbyButtons(){
  const start=document.getElementById('startBtn');
  const meta=document.getElementById('metaGrowthBtn');
  if(start){
    if(typeof els!=='undefined') els.startBtn=start;
    start.addEventListener('click',()=>{
      if((typeof currentPlayerId!=='undefined'&&currentPlayerId) || (typeof isLocalOnlySession!=='undefined'&&isLocalOnlySession)) startGame();
      else attemptStart();
    });
  }
  if(meta){
    if(typeof els!=='undefined') els.metaGrowthBtn=meta;
    meta.addEventListener('click',()=>openMetaGrowth());
  }
}
function stageModeShowLobby(){
  if(!els?.modalBox) return;
  els.modalBox.style.width='min(96vw, 860px)';
  els.modalBox.style.maxWidth='min(96vw, 860px)';
  els.modalBox.style.padding='20px 18px 18px';
  els.modalBox.innerHTML=STAGE_SELECT_TEMPLATE;
  stageModeBindLobbyButtons();
  renderStartMetaSummary();
  renderStageSelect();
  els.overlay.classList.remove('hidden');
  const rail=document.getElementById('stageSelectGrid');
  if(rail){
    rail.addEventListener('wheel',(e)=>{
      if(Math.abs(e.deltaY)<=Math.abs(e.deltaX) || rail.scrollWidth<=rail.clientWidth) return;
      e.preventDefault();
      rail.scrollLeft+=e.deltaY;
    },{passive:false});
  }
  requestAnimationFrame(()=>{
    const selected=document.querySelector('.stage-select-card.selected');
    if(selected) selected.scrollIntoView({behavior:'auto',block:'nearest',inline:'center'});
  });
}

function stageModeFinalizeRunEntities(){
  const now=performance.now();
  for(const m of (state?.monsters||[])) try{ finalizeMonsterLifetime(m,now); }catch(_){ }
  return now;
}

function completeCurrentStage(){
  if(!state||state.stageComplete||state.gameOver) return;
  const stageId=stageModeCurrentId(),def=stageModeDef(stageId);
  state.stageComplete=true;
  state.running=false;
  state.gameOver=true;
  state.phase='stageClear';
  const now=stageModeFinalizeRunEntities();
  const playSec=Math.max(0,Math.floor((now-(state.startedAt||now))/1000));
  const dungeonEval=evaluateDungeon(state);
  const baseSouls=awardRunSouls();
  const clearBonus=(typeof debugModeActive!=='undefined'&&debugModeActive)?0:(def.clearSoulBonus||0);
  if(clearBonus>0){ metaProgress.souls+=clearBonus; saveMeta(); }
  stageModeMarkClear(stageId);
  const totalSouls=baseSouls+clearBonus;
  try{ Sound.waveClear(); Sound.stopMusic(); }catch(_){ }
  try{
    saveGameResultToSupabase(state.wave,dungeonEval.score,playSec).catch(()=>{});
  }catch(_){ }
  const nextId=Math.min(STAGE_MODE_MAX,stageId+1);
  const unlockedNext=stageId<STAGE_MODE_MAX && stageModeIsUnlocked(nextId);
  const min=Math.floor(playSec/60),sec=playSec%60;
  els.modalBox.style.width='min(94vw, 680px)';
  els.modalBox.style.maxWidth='min(94vw, 680px)';
  els.modalBox.style.padding='22px 14px';
  els.modalBox.innerHTML=`
    <div class="big-emoji">🏆</div>
    <h2 class="display stage-clear-title">STAGE ${stageId} CLEAR!</h2>
    <p class="stage-clear-name">${def.icon} ${def.name} · ${def.theme}</p>
    <div class="achievement-grid">
      <div class="achievement-card"><div class="ak">🌊 방어 완료</div><div class="av">20 / 20 웨이브</div></div>
      <div class="achievement-card"><div class="ak">⏱️ 플레이타임</div><div class="av">${min}분 ${String(sec).padStart(2,'0')}초</div></div>
      <div class="achievement-card"><div class="ak">⚔️ 물리친 용사</div><div class="av">${state.killCount||0}명</div></div>
      <div class="achievement-card"><div class="ak">🔮 획득 영혼</div><div class="av">+${totalSouls}</div><div class="as">클리어 보너스 +${clearBonus}</div></div>
      <div class="achievement-card" style="grid-column:1/-1;"><div class="ak">🏰 던전 평가</div><div class="av">${dungeonEval.title} · ${dungeonEval.score}점</div><div class="as">${dungeonEval.notes.join(' · ')}</div></div>
    </div>
    <div class="stage-clear-unlock">${stageId<STAGE_MODE_MAX?`🔓 <b>STAGE ${nextId}</b> ${stageModeDef(nextId).name} 해금`:'👑 모든 스테이지를 돌파했습니다.'}</div>
    <div class="result-actions">
      ${unlockedNext?`<button class="cta" id="nextStageBtn">다음 STAGE ${nextId} 도전</button>`:''}
      <button class="cta secondary" id="retryStageBtn">STAGE ${stageId} 다시 도전</button>
      <button class="cta secondary" id="stageLobbyBtn">🗺️ 스테이지 선택</button>
      <button class="cta secondary" id="metaGrowthEndBtn">🔮 마왕의 성장</button>
    </div>`;
  els.overlay.classList.remove('hidden');
  const next=document.getElementById('nextStageBtn');
  if(next) next.addEventListener('click',()=>{ stageModeSetSelected(nextId,true); startGame(); },{once:true});
  const retry=document.getElementById('retryStageBtn');
  if(retry) retry.addEventListener('click',()=>{ stageModeSetSelected(stageId,true); startGame(); },{once:true});
  const lobby=document.getElementById('stageLobbyBtn');
  if(lobby) lobby.addEventListener('click',stageModeShowLobby,{once:true});
  const meta=document.getElementById('metaGrowthEndBtn');
  if(meta) meta.addEventListener('click',()=>openMetaGrowth());
}

renderStageSelect();
