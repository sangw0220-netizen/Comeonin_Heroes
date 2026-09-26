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
  wall_crusher:{id:'wall_crusher',name:'압살벽',short:'압살벽',icon:'⚙',kind:'attack',mount:'wall',cost:110,damage:48,windup:.6,recover:.6,cooldown:3.6,color:'#ffb169',physicalSize:[3,3],placementSize:[1,3],
    desc:'벽면 3칸에 설치되는 3×3 압살 장치. 설치 당시 맞은편 벽까지의 기본 압착 거리가 고정됩니다. 이후 맞은편 벽이 사라져도 사거리는 늘지 않으며, 벽이 없으면 범위 끝에서 영웅을 밀쳐냅니다.'},
  wall_pusher:{id:'wall_pusher',name:'벽 충격기',short:'벽 충격기',icon:'➜',kind:'debuff',mount:'wall',cost:80,damage:9,windup:.2,recover:.5,cooldown:2.8,push:3,color:'#72d5ec',physicalSize:[2,1],placementSize:[1,1],
    desc:'벽 1칸에 설치되는 2×1 대형 충격 장치. 앞칸의 용사를 선택 방향으로 3칸 밀어내며, 벽 충돌·심연·장외 낙사를 유발합니다.'},
  spring_launcher:{id:'spring_launcher',name:'투척 발판',short:'투척 발판',icon:'↗',kind:'debuff',mount:'floor',cost:65,damage:7,windup:.2,recover:.5,cooldown:2.4,push:4,color:'#e7c66d',physicalSize:[2,2],
    desc:'2×2 빈 바닥에 설치. 밟은 용사를 선택 방향으로 4칸 튀겨냅니다. 벽은 넘지 못하며, 심연과 지도 밖으로 날려 보낼 수 있습니다.'},
  pendulum:{id:'pendulum',name:'진자 절단기',short:'진자 절단기',icon:'⚔',kind:'attack',mount:'corridor',cost:90,damage:34,windup:.6,recover:.7,cooldown:2.7,color:'#c0a5ef',physicalSize:[3,2],
    desc:'3×2 통로에 설치. 진행 방향 양옆에 지지벽이 필요하며, 예고 후 장치 영역을 크게 휩쓸어 베어냅니다.'},
  abyss:{id:'abyss',name:'심연 균열',short:'심연 균열',icon:'◎',kind:'defense',mount:'terrain',cost:95,damage:0,color:'#ac85f4',fixed:true,physicalSize:[3,3],
    desc:'3×3 바닥을 통행 불가 심연으로 바꿉니다. 밀려난 일반 용사는 낙사합니다. 기존 길을 끊는 위치와 핵/입구 주변은 설치 불가.'}
};
function physicalDef(id){ return PHYSICAL_TRAPS[id]||null; }
function physicalClock(){ return state?.physicalClock||0; }
function physicalDir(tile){ return PHYSICAL_DIRS[((tile?.physicalDir??state?.physicalDirection??1)%4+4)%4]; }
function physicalIsFloor(r,c){ const t=state?.grid?.[r]?.[c]; return !!t && (t.type==='floor'||t.type==='core') && t.obstacle!=='barricade' && !(t.obstacle==='collapse_bridge'&&typeof runeGateIsBlocking==='function'&&runeGateIsBlocking(t)); }
function physicalIsWall(r,c){ const t=state?.grid?.[r]?.[c]; return !!t && t.type==='rock' && !t.isEntrance; }
function physicalOccupied(r,c){
  return state.heroes.some(h=>h.hp>0&&h.r===r&&h.c===c) || state.monsters.some(m=>m.hp>0&&m.r===r&&m.c===c) || (state.mawang&&!state.mawang.dead&&state.mawang.r===r&&state.mawang.c===c);
}
function physicalHeroLocked(h){ return (h.physicalLockUntil||0)>physicalClock()+1e-7; }
function physicalRootPos(r,c){
  const t=state?.grid?.[r]?.[c],def=physicalDef(t?.obstacle);if(!def)return null;
  const rr=Number.isInteger(t.obstacleRootR)?t.obstacleRootR:r,cc=Number.isInteger(t.obstacleRootC)?t.obstacleRootC:c;
  return physicalDef(state?.grid?.[rr]?.[cc]?.obstacle)?{r:rr,c:cc}:{r,c};
}
function physicalRootTile(r,c){const root=physicalRootPos(r,c);return root?state.grid[root.r][root.c]:null;}
function physicalSize(id){const def=physicalDef(id);return def?.physicalSize||[1,1];}
function physicalPlacementSize(id){const def=physicalDef(id);return def?.placementSize||def?.physicalSize||[1,1];}
function physicalFootprintCells(r,c,id,dirIndex=state?.physicalDirection??1){
  const def=physicalDef(id);if(!def)return {cells:[],bounds:null,length:0,width:0};
  // Wall devices use placementSize for their wall anchors and physicalSize for rendering.
  // The crusher occupies three adjacent wall cells laterally, while its 3-cell depth is visual/attack reach.
  const [length,width]=physicalPlacementSize(id),dir=def.fixed?PHYSICAL_DIRS[1]:(PHYSICAL_DIRS[((dirIndex%4)+4)%4]||PHYSICAL_DIRS[1]);
  const side={r:dir.c,c:-dir.r},cells=[];
  let minR=Infinity,maxR=-Infinity,minC=Infinity,maxC=-Infinity;
  for(let forward=0;forward<length;forward++)for(let lateral=0;lateral<width;lateral++){
    const nr=r+dir.r*forward+side.r*lateral,nc=c+dir.c*forward+side.c*lateral;
    cells.push([nr,nc]);minR=Math.min(minR,nr);maxR=Math.max(maxR,nr);minC=Math.min(minC,nc);maxC=Math.max(maxC,nc);
  }
  return {cells,bounds:{minR,maxR,minC,maxC},length,width,dir,side};
}
function physicalSameRoot(t,r,c,id){
  return !!t&&t.obstacle===id&&(t.obstacleRootR??r)===r&&(t.obstacleRootC??c)===c;
}
let physicalNormalizedWallGrid=null;
function physicalNormalizeLegacyWallChildren(){
  const grid=state?.grid;if(!grid||physicalNormalizedWallGrid===grid)return false;
  let changed=false;
  // v3 wall devices used a single gameplay anchor. v4 keeps wall_pusher that way,
  // but wall_crusher legitimately occupies THREE adjacent wall cells along the wall face.
  // Remove only stale children that are not part of the current expected footprint.
  for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
    const t=grid[r][c],id=t?.obstacle;if(id!=='wall_crusher'&&id!=='wall_pusher')continue;
    const rr=Number.isInteger(t.obstacleRootR)?t.obstacleRootR:r,cc=Number.isInteger(t.obstacleRootC)?t.obstacleRootC:c;
    if(rr===r&&cc===c)continue;
    const root=grid[rr]?.[cc];if(root?.obstacle!==id)continue;
    const expected=id==='wall_crusher'
      ? new Set(physicalFootprintCells(rr,cc,id,root.physicalDir).cells.map(([er,ec])=>er+'_'+ec))
      : new Set([rr+'_'+cc]);
    if(expected.has(r+'_'+c))continue;
    const restored={...t,type:t.physicalBaseType||t.type,obstacle:null};
    for(const k of Object.keys(restored))if(k.startsWith('physical')||k.startsWith('obstacle')||k==='triggerFxUntil')delete restored[k];
    restored.obstacle=null;grid[r][c]=restored;changed=true;
  }
  // Upgrade existing v3/v4 crushers in place by claiming the missing wall cells up to the new 3-cell face.
  for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
    const root=grid[r][c];if(root?.obstacle!=='wall_crusher'||(root.obstacleRootR??r)!==r||(root.obstacleRootC??c)!==c)continue;
    const fp=physicalFootprintCells(r,c,'wall_crusher',root.physicalDir);
    for(const [rr,cc] of fp.cells){
      if(rr===r&&cc===c)continue;
      const t=grid[rr]?.[cc];
      if(!t||!physicalIsWall(rr,cc)||t.obstacle||physicalOccupied(rr,cc))continue;
      t.physicalBaseType=t.type;t.obstacle='wall_crusher';t.obstacleRootR=r;t.obstacleRootC=c;t.obstacleLevel=obstacleLevel(root);
      t.obstacleHp=root.obstacleHp;t.obstacleMaxHp=root.obstacleMaxHp;t.physicalDir=root.physicalDir;changed=true;
    }
  }
  physicalNormalizedWallGrid=grid;
  if(changed){state._mapDirty=true;state._rangesDirty=true;state._panelDirty=true;}
  return changed;
}
function physicalGeometry(r,c,id,dirIndex){
  const def=physicalDef(id), dir=PHYSICAL_DIRS[((dirIndex??1)%4+4)%4]||PHYSICAL_DIRS[1];
  if(!def) return {ok:false,cells:[],reason:'Unknown trap'};
  const bad=reason=>({ok:false,cells:[],reason});
  const ordinary=(nr,nc)=>physicalIsFloor(nr,nc)&&state.grid[nr][nc].type!=='core'&&!state.grid[nr][nc].isEntrance;
  const fp=physicalFootprintCells(r,c,id,dirIndex);
  if(def.mount==='wall'){
    if(!physicalIsWall(r,c)) return bad('벽에 설치하세요.');
    if(id==='wall_pusher'){
      const nr=r+dir.r,nc=c+dir.c;
      return ordinary(nr,nc)?{ok:true,cells:[[nr,nc]],reach:1,footprintCells:fp.cells}:bad('화살표 앞에 통로가 필요합니다.');
    }
    if(id==='wall_crusher'){
      const rootTile=state.grid[r]?.[c],installed=physicalSameRoot(rootTile,r,c,id),dirKey=((dirIndex??1)%4+4)%4;
      let baseReaches=(installed&&rootTile.physicalCrusherBaseDir===dirKey&&Array.isArray(rootTile.physicalCrusherBaseReaches))
        ? rootTile.physicalCrusherBaseReaches.slice(0,fp.width).map(v=>Math.max(1,Math.min(3,Number(v)||1)))
        : null;

      // 설치 시 맞은편 벽까지의 거리를 한 번만 정하고 이후에는 고정합니다.
      // 기존 저장본처럼 고정 범위 정보가 없는 압살벽은 현재 상태를 1회 기준으로 삼아 동결합니다.
      if(!baseReaches||baseReaches.length!==fp.width){
        const discovered=[];
        for(let lateral=0;lateral<fp.width;lateral++){
          const wr=r+fp.side.r*lateral,wc=c+fp.side.c*lateral;
          const wallTile=state.grid[wr]?.[wc];
          if(!physicalIsWall(wr,wc)||(wallTile?.obstacle&&!physicalSameRoot(wallTile,r,c,id)))return bad('압살벽은 나란한 벽 3칸을 단독으로 사용해야 합니다.');
          const lane=[];let foundWall=false;
          for(let k=1;k<=4;k++){
            const nr=wr+dir.r*k,nc=wc+dir.c*k;
            if(physicalIsWall(nr,nc)&&lane.length){foundWall=true;break;}
            if(k===4||!ordinary(nr,nc))break;
            lane.push([nr,nc]);
          }
          if(!foundWall||!lane.length){
            if(!installed)return bad('압살벽은 설치할 때 벽 3칸 모두 정면 1~3칸 통로 뒤에 맞은편 벽이 필요합니다.');
            // 오래된 저장본에서 맞은편 벽이 이미 사라진 경우에는 최대 기본 깊이 3칸을 넘기지 않습니다.
            discovered.push(Math.max(1,Math.min(3,lane.length||3)));
          }else discovered.push(Math.max(1,Math.min(3,lane.length)));
        }
        baseReaches=discovered;
        if(installed){
          rootTile.physicalCrusherBaseReaches=baseReaches.slice();
          rootTile.physicalCrusherBaseDir=dirKey;
        }
      }

      const hitCells=[],laneReaches=[],laneImpactWalls=[];
      for(let lateral=0;lateral<fp.width;lateral++){
        const wr=r+fp.side.r*lateral,wc=c+fp.side.c*lateral;
        const wallTile=state.grid[wr]?.[wc];
        if(!physicalIsWall(wr,wc)||(wallTile?.obstacle&&!physicalSameRoot(wallTile,r,c,id)))return bad('압살벽은 나란한 벽 3칸을 단독으로 사용해야 합니다.');
        const baseReach=Math.max(1,Math.min(3,baseReaches[lateral]||1)),lane=[];
        let impactWall=false;
        for(let k=1;k<=baseReach;k++){
          const nr=wr+dir.r*k,nc=wc+dir.c*k;
          if(ordinary(nr,nc)){lane.push([nr,nc]);continue;}
          if(physicalIsWall(nr,nc))impactWall=true;
          break;
        }
        if(lane.length===baseReach){
          const ir=wr+dir.r*(baseReach+1),ic=wc+dir.c*(baseReach+1);
          impactWall=physicalIsWall(ir,ic);
        }
        laneReaches.push(lane.length);laneImpactWalls.push(impactWall);hitCells.push(...lane);
      }
      return {ok:true,cells:hitCells,reach:Math.max(...baseReaches),laneReaches,baseLaneReaches:baseReaches,laneImpactWalls,footprintCells:fp.cells};
    }
  }
  if(id==='pendulum'){
    if(fp.cells.some(([nr,nc])=>!ordinary(nr,nc))) return bad('3×2 빈 통로가 필요합니다. 방향을 바꿔 보세요.');
    for(let forward=0;forward<fp.length;forward++){
      const br=r+fp.dir.r*forward,bc=c+fp.dir.c*forward;
      const aR=br-fp.side.r,aC=bc-fp.side.c;
      const zR=br+fp.side.r*fp.width,zC=bc+fp.side.c*fp.width;
      if(!physicalIsWall(aR,aC)||!physicalIsWall(zR,zC)) return bad('3×2 통로 양옆에 연속된 지지벽이 필요합니다.');
    }
    return {ok:true,cells:fp.cells,reach:fp.length,footprintCells:fp.cells};
  }
  if(id==='spring_launcher'){
    if(fp.cells.some(([nr,nc])=>!ordinary(nr,nc))) return bad('2×2 빈 바닥이 필요합니다.');
    return {ok:true,cells:fp.cells,reach:1,footprintCells:fp.cells};
  }
  if(id==='abyss') return {ok:true,cells:fp.cells,reach:1,footprintCells:fp.cells};
  return {ok:true,cells:[[r,c]],reach:1,footprintCells:fp.cells};
}
function physicalReachable(skipKeys=null){
  const visited=new Set(), q=[[CORE_R,CORE_C]]; let head=0;
  while(head<q.length){
    const [r,c]=q[head++],key=r+'_'+c;
    if(visited.has(key)||(skipKeys&&skipKeys.has(key))||!physicalIsFloor(r,c)) continue;
    visited.add(key);
    for(const p of neighbors4(r,c)) q.push(p);
  }
  return visited;
}
let physicalPlacementCache={};
function physicalAbyssConnected(r,c){
  const fp=physicalFootprintCells(r,c,'abyss',1),skip=new Set(fp.cells.map(([rr,cc])=>rr+'_'+cc));
  const sig=(state._physicalTopologyVersion||0)+':'+state.wave+':'+state.phase+':'+GRID+':'+CORE_R+':'+CORE_C;
  if(physicalPlacementCache.state!==state||physicalPlacementCache.grid!==state.grid||physicalPlacementCache.sig!==sig){
    physicalPlacementCache={state,grid:state.grid,sig,base:physicalReachable(),results:new Map()};
  }
  const cache=physicalPlacementCache,key=[...skip].sort().join('|');
  if(cache.results.has(key)) return cache.results.get(key);
  const removed=[...skip].reduce((n,k)=>n+(cache.base.has(k)?1:0),0);
  const ok=removed===skip.size && physicalReachable(skip).size===cache.base.size-removed;
  cache.results.set(key,ok); return ok;
}
function physicalPlacement(r,c,id,dir=state?.physicalDirection??1,ignoreRoot=null){
  const def=physicalDef(id),t=state?.grid?.[r]?.[c];
  const bad=reason=>({ok:false,reason,cells:[],footprintCells:[]});
  if(!def||!t||!Number.isInteger(r)||!Number.isInteger(c)) return bad('지도 안에 설치하세요.');
  const fp=physicalFootprintCells(r,c,id,dir),ignoreR=ignoreRoot?.r,ignoreC=ignoreRoot?.c;
  if(!fp.cells.length||fp.cells.some(([nr,nc])=>!inBounds(nr,nc))) return bad(`${physicalPlacementSize(id).join('×')} 설치 공간이 지도 안에 들어와야 합니다.`);
  for(let i=0;i<fp.cells.length;i++){
    const [nr,nc]=fp.cells[i],cell=state.grid[nr]?.[nc],same=Number.isInteger(ignoreR)&&physicalSameRoot(cell,ignoreR,ignoreC,id);
    if(!cell||cell.isEntrance||cell.rubbleWall||cell.type==='core'||(!same&&cell.obstacle)||physicalOccupied(nr,nc)) return bad('점유 영역 전체가 비어 있어야 합니다.');
    if(def.mount==='wall'){
      if(id==='wall_crusher'){
        if(!physicalIsWall(nr,nc))return bad('압살벽은 벽면을 따라 나란한 벽 3칸이 필요합니다.');
      }else if(i===0){
        if(!physicalIsWall(nr,nc))return bad('기준 칸은 벽이어야 합니다.');
      }else if(!physicalIsWall(nr,nc)&&!(physicalIsFloor(nr,nc)&&cell.type!=='core'&&!cell.isEntrance))return bad('장치 설치 공간을 확보하세요.');
    }else if(cell.type!=='floor') return bad('점유 영역 전체가 빈 바닥이어야 합니다.');
  }
  if(id==='abyss'){
    if(fp.cells.some(([nr,nc])=>Math.abs(nr-CORE_R)+Math.abs(nc-CORE_C)<=2)) return bad('심연 영역이 핵 2칸 이내에 닿을 수 없습니다.');
    if(fp.cells.some(([nr,nc])=>neighbors4(nr,nc).some(([ar,ac])=>state.grid[ar]?.[ac]?.isEntrance))) return bad('심연 영역은 입구 바로 옆에 설치할 수 없습니다.');
    if(!physicalAbyssConnected(r,c)) return bad('3×3 심연이 기존 통로를 끊을 수 없습니다. 우회로를 먼저 만드세요.');
  }
  const geo=physicalGeometry(r,c,id,dir);if(!geo.ok)return {...geo,footprintCells:fp.cells};
  return {...geo,footprintCells:fp.cells,bounds:fp.bounds};
}
function physicalEraseFootprint(rootR,rootC,id){
  for(let rr=0;rr<GRID;rr++)for(let cc=0;cc<GRID;cc++){
    const t=state.grid[rr][cc];if(!physicalSameRoot(t,rootR,rootC,id))continue;
    const restored={...t,type:t.physicalBaseType||((id==='abyss')?'floor':t.type),obstacle:null};
    for(const k of Object.keys(restored))if(k.startsWith('physical')||k.startsWith('obstacle')||k==='triggerFxUntil')delete restored[k];
    restored.obstacle=null;state.grid[rr][cc]=restored;
  }
}
function physicalWriteFootprint(rootR,rootC,id,dir,snapshot={}){
  const def=physicalDef(id),fp=physicalFootprintCells(rootR,rootC,id,dir);if(!def||!fp.cells.length)return null;
  const lv=Math.max(1,snapshot.level||1),maxHp=snapshot.maxHp??obstacleMaxHpFor(def,lv),hp=Math.max(0,Math.min(maxHp,snapshot.hp??maxHp));
  for(const [rr,cc] of fp.cells){
    const t=state.grid[rr][cc];
    t.physicalBaseType=t.type;t.obstacle=id;t.obstacleRootR=rootR;t.obstacleRootC=rootC;t.obstacleLevel=lv;t.obstacleHp=hp;t.obstacleMaxHp=maxHp;t.physicalDir=dir;
    if(id==='abyss')t.type='chasm';
    delete t.physicalRuntime;
  }
  const root=state.grid[rootR][rootC];root.physicalRuntime=snapshot.runtime||null;
  return root;
}
function placePhysicalTrap(r,c,id,free=false){
  if(!state||state.phase!=='build') return false;
  const def=physicalDef(id); if(!def) return false;
  if(state.contractNoObstacleWaves>0&&!free){ physicalNotice('침묵의 맹약: 이번 준비 단계에는 설치 불가'); return false; }
  const dir=def.fixed?1:(state.physicalDirection??1),check=physicalPlacement(r,c,id,dir); if(!check.ok){ physicalNotice(check.reason); return false; }
  const cost=obstaclePlaceCost(def); if(!free&&state.gold<cost){physicalNotice('골드가 부족합니다.');return false;}
  if(!free) state.gold-=cost;
  const placedRoot=physicalWriteFootprint(r,c,id,dir,{level:1,maxHp:obstacleMaxHpFor(def,1),hp:obstacleMaxHpFor(def,1),runtime:null});
  if(id==='wall_crusher'&&placedRoot){
    placedRoot.physicalCrusherBaseReaches=(check.baseLaneReaches||check.laneReaches||[]).slice();
    placedRoot.physicalCrusherBaseDir=dir;
  }
  state.obstaclePlacements=(state.obstaclePlacements||0)+1;
  dungeonStructureInvalidate(); Sound.obstacle();
  physicalNotice(def.name+' '+physicalSize(id).join('×')+' 설치 완료');
  return true;
}
function clearPhysicalTrap(r,c){
  const root=physicalRootPos(r,c);if(!root)return false;
  const tile=state.grid[root.r][root.c],def=physicalDef(tile?.obstacle);if(!def)return false;
  physicalEraseFootprint(root.r,root.c,def.id);dungeonStructureInvalidate();return true;
}
function upgradePhysicalTrap(r,c){
  const root=physicalRootPos(r,c);if(!root)return false;
  const tile=state?.grid?.[root.r]?.[root.c],def=physicalDef(tile?.obstacle);
  if(!def||def.fixed||state.phase!=='build') return false;
  const lv=obstacleLevel(tile),cost=obstacleUpgradeCost(def,lv);
  if(lv>=10||state.gold<cost) return false;
  state.gold-=cost;tile.obstacleLevel=lv+1;tile.obstacleMaxHp=obstacleMaxHpFor(def,lv+1);tile.obstacleHp=tile.obstacleMaxHp;
  for(let rr=0;rr<GRID;rr++)for(let cc=0;cc<GRID;cc++)if(physicalSameRoot(state.grid[rr][cc],root.r,root.c,def.id)){
    state.grid[rr][cc].obstacleLevel=tile.obstacleLevel;state.grid[rr][cc].obstacleMaxHp=tile.obstacleMaxHp;state.grid[rr][cc].obstacleHp=tile.obstacleHp;
  }
  dungeonStructureInvalidate();Sound.level();return true;
}
function rotatePhysicalTrap(r,c,dir){
  const root=physicalRootPos(r,c);if(!root)return false;
  const tile=state?.grid?.[root.r]?.[root.c],def=physicalDef(tile?.obstacle);
  if(!def||def.fixed||state.phase!=='build') return false;
  const index=((dir%4)+4)%4,check=physicalPlacement(root.r,root.c,def.id,index,root);
  if(!check.ok){physicalNotice(check.reason);return false;}
  const snap={level:obstacleLevel(tile),hp:tile.obstacleHp,maxHp:tile.obstacleMaxHp,runtime:null};
  physicalEraseFootprint(root.r,root.c,def.id);const newRoot=physicalWriteFootprint(root.r,root.c,def.id,index,snap);
  if(def.id==='wall_crusher'&&newRoot){
    newRoot.physicalCrusherBaseReaches=(check.baseLaneReaches||check.laneReaches||[]).slice();
    newRoot.physicalCrusherBaseDir=index;
  }
  dungeonStructureInvalidate();return true;
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
  const childDef=physicalDef(tile?.obstacle); if(!childDef||childDef.fixed||state?.phase!=='invasion') return false;
  const r=Number.isInteger(tile.obstacleRootR)?tile.obstacleRootR:null,c=Number.isInteger(tile.obstacleRootC)?tile.obstacleRootC:null;
  const root=(r!=null&&c!=null)?state.grid[r]?.[c]:tile,def=physicalDef(root?.obstacle);
  if(!root||!def||def.fixed) return false;
  const rr=root.obstacleRootR??r,cc=root.obstacleRootC??c;
  const now=physicalClock(),rt=root.physicalRuntime||(root.physicalRuntime={readyAt:0});
  if(rt.armedAt!=null || now+1e-7<(rt.readyAt||0)) return false;
  const geo=physicalGeometry(rr,cc,def.id,root.physicalDir);
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
  const hole=state.grid[toR]?.[toC],holeRoot=hole?.obstacle==='abyss'?(physicalRootTile(toR,toC)||hole):null;
  if(holeRoot){
    // Start the source sheet's energy burst on the root sprite even when the victim enters a child cell of the 3×3 rift.
    const lead=fallFlight.duration*.65;
    const rt=holeRoot.physicalRuntime||(holeRoot.physicalRuntime={});
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
      // v72 심연구덩이: 정상 경로로는 피하지만, 넉백/밀치기 같은 강제 이동이 닿으면 낙사 판정.
      if(nt?.obstacle==='pit' && typeof resolveAbyssPitForcedContact==='function'){
        const pitResult=resolveAbyssPitForcedContact(h,nr,nc,{...options,fromR,fromC});
        if(pitResult?.resolved){fall=!!pitResult.fall;blocked=!!pitResult.blocked;break;}
      }
      if(!nt||nt.type!=='floor'||nt.isEntrance&&options.protectEntrance||nt.obstacle==='barricade'||(nt.obstacle==='collapse_bridge'&&typeof runeGateIsBlocking==='function'&&runeGateIsBlocking(nt))){
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
    if(def.id==='wall_crusher'){
      const rootR=Number.isInteger(tile.obstacleRootR)?tile.obstacleRootR:h.r;
      const rootC=Number.isInteger(tile.obstacleRootC)?tile.obstacleRootC:h.c;
      const side={r:dir.c,c:-dir.r};
      const lateral=Math.max(0,Math.min(2,Math.round((h.r-rootR)*side.r+(h.c-rootC)*side.c)));
      const forward=Math.max(1,Math.round((h.r-rootR)*dir.r+(h.c-rootC)*dir.c));
      const laneReach=Math.max(1,geo.baseLaneReaches?.[lateral]??geo.reach??1);
      const hasImpactWall=geo.laneImpactWalls?.[lateral]!==false;
      const remaining=Math.max(1,laneReach+1-forward);

      if(!hasImpactWall){
        // 맞은편 벽이 사라졌다면 설치 당시 고정 범위는 유지하되 압살 판정을 만들지 않습니다.
        // 철판이 범위 끝까지 전진하며 영웅을 한 칸 밖으로 밀어내고, 충돌했을 때만 소량의 충돌 피해가 납니다.
        const collisionDamage=Math.max(1,Math.round(def.damage*mul*.18));
        physicalForceMove(h,dir.r,dir.c,remaining,{source:def.id,damage:collisionDamage,launch:false});
        h.physicalLockUntil=Math.max(h.physicalLockUntil||0,physicalClock()+.18);
        state.fxEvents?.push?.({type:'floatText',r:h.r,c:h.c,text:'↠ 밀쳐냄',color:'#ffd09a'});
        continue;
      }

      physicalDamage(h,def.damage*mul,def.id);
      if(h.hp<=0) continue;
      // 실제 전투 좌표는 고정한 채, 스프라이트만 반대 벽 쪽으로 운반해 압착 연출을 보여줍니다.
      h.physicalImpactKind=def.id;
      h.physicalImpactDirR=dir.r;h.physicalImpactDirC=dir.c;
      h.physicalImpactTravel=Math.min(1.08,.62+Math.max(0,remaining-1)*.23);
      h.physicalImpactUntil=physicalClock()+Math.min(.58,def.recover||.58);
      physicalInterrupt(h);h.physicalLockUntil=Math.max(h.physicalLockUntil||0,physicalClock()+(h.isBoss?.2:lv>=5?.6:.4));
      continue;
    }

    physicalDamage(h,def.damage*mul,def.id);
    if(h.hp<=0) continue;
    if(def.push) physicalForceMove(h,dir.r,dir.c,def.push+(lv>=5?1:0)+(lv>=10?1:0),{source:def.id,damage:12*mul,launch:def.id==='spring_launcher'});
    else {
      h.physicalImpactKind=def.id;
      h.physicalImpactUntil=physicalClock()+.4;
      physicalInterrupt(h);h.physicalLockUntil=Math.max(h.physicalLockUntil||0,physicalClock()+(h.isBoss?.2:lv>=5?.6:.4));
    }
  }
  if(targets.length){
    state.dungeonStats=state.dungeonStats||{};
    state.dungeonStats.obstaclesTriggered=(state.dungeonStats.obstaclesTriggered||0)+1;
    Sound.trap(def.push?'gust':'spike');
  }
}
function processPhysicalTraps(dt){
  physicalNormalizeLegacyWallChildren();
  if(state?.phase==='build'){
    for(const row of state.grid)for(const t of row)if(t.physicalRuntime)t.physicalRuntime.armedAt=null;
  }
  if(!state||state.phase!=='invasion'||!Number.isFinite(dt)||dt<=0) return;
  state.physicalClock=(state.physicalClock||0)+dt;state.physicalStamp=performance.now();
  const now=physicalClock();
  for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
    const t=state.grid[r][c],def=physicalDef(t.obstacle);if(!def||def.fixed||(t.obstacleRootR??r)!==r||(t.obstacleRootC??c)!==c)continue;
    const rt=t.physicalRuntime||(t.physicalRuntime={readyAt:0});
    const geo=physicalGeometry(r,c,def.id,t.physicalDir);
    rt.fault=!geo.ok;
    if(!geo.ok){rt.armedAt=null;continue;}
    if(rt.armedAt!=null && now+1e-7>=rt.strikeAt){
      physicalStrike(t,def,geo);rt.armedAt=null;rt.firedAt=now;rt.firedRealAt=performance.now();rt.firedSpeed=Math.max(1,gameSpeed);rt.readyAt=now+def.cooldown;
    } else if(rt.armedAt==null && now+1e-7>=(rt.readyAt||0)) armPhysicalTrap(t);
  }
}
function physicalFlightProgress(f,visualNow=physicalVisualClock()){
  if(!f||!Number.isFinite(f.duration)||f.duration<=0) return 1;
  let p=(visualNow-f.start)/f.duration;
  // Flight sprites are cosmetic clones. The simulation clock can stop as soon as a wave ends,
  // or after their owner dies, so always give orphaned/paused flights a real-time escape hatch.
  const owner=state?.heroes?.find(h=>h.id===f.heroId);
  if(state?.phase!=='invasion'||!owner||owner.hp<=0){
    const born=Number.isFinite(f.bornAt)?f.bornAt:performance.now();
    const realP=(performance.now()-born)*Math.max(1,gameSpeed)/(f.duration*1000);
    p=Math.max(p,realP);
  }
  return Math.max(0,p);
}
function physicalOwnsToken(key){
  return !!state?.physicalFlights?.some(f=>'h'+f.heroId===key && physicalFlightProgress(f,physicalClock())<1);
}
function physicalVisualClock(){
  if(state?.phase!=='invasion') return physicalClock();
  return physicalClock()+Math.min(TICK_MS/1000,Math.max(0,performance.now()-(state.physicalStamp||performance.now()))/1000*Math.max(1,gameSpeed));
}
function physicalPlacementVisualBox(r,c,id,dir=state?.physicalDirection??1){
  const fp=physicalFootprintCells(r,c,id,dir);
  if(!fp?.cells?.length||!fp.bounds) return {w:1,h:1,x:0,y:0,clip:'inset(0 round 4px)'};
  return {
    w:fp.bounds.maxC-fp.bounds.minC+1,
    h:fp.bounds.maxR-fp.bounds.minR+1,
    x:fp.bounds.minC-c,
    y:fp.bounds.minR-r,
    clip:'inset(0 round 4px)'
  };
}
function physicalCellClass(cls,r,c,t){
  if(physicalDef(t.obstacle)) cls+=' physical-trap';
  if(t.type==='chasm') cls+=' physical-chasm';
  if(state?.phase==='build'&&state.activeTool==='obstacle'&&physicalDef(state.selectedObstacleType)){
    // The classic obstacle branch does not know the rotated physical footprint, so discard
    // its provisional target and rebuild it from the real physical placement check.
    cls=cls.replace(/\bobstacle-target\b/g,'');
    if(physicalPlacement(r,c,state.selectedObstacleType).ok) cls+=' physical-target obstacle-target';
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
  const ps=def.placementSize||def.physicalSize||[1,1];def.physical=true;def.footprint=(ps[0]||1)*(ps[1]||1);def.range=0;def.spriteFallback=physicalIcon(def.id,def.color);def.sprite=def.spriteFallback;
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
  // Crusher no longer reuses the small piston sprite. It is a dedicated three-cell wall rig:
  // a wall-mounted frame, hydraulic rails and one massive plate that sweeps across the corridor.
  if(id==='wall_crusher') art='<div class="pt-crusher-rig"><div class="pt-crusher-anchor"><i></i><i></i><i></i></div><div class="pt-crusher-rail pt-crusher-rail-a"></div><div class="pt-crusher-rail pt-crusher-rail-b"></div><div class="pt-crusher-wall"><i></i><i></i><i></i><b></b></div><div class="pt-crusher-impact"></div></div>';
  if(id==='wall_pusher') art='<div class="pt-housing"><i></i><i></i></div><div class="pt-shaft"></div><div class="pt-head"></div>';
  if(id==='spring_launcher') art='<div class="pt-plinth"></div><div class="pt-spring"></div><div class="pt-flap"></div>';
  if(id==='pendulum') art='<div class="pt-bridge"></div><div class="pt-pivot"></div><div class="pt-arm"><div class="pt-blade"></div></div>';
  if(id==='abyss') art='<div class="pt-hole"></div><div class="pt-rift"></div><div class="pt-dust"><i></i><i></i><i></i></div>';
  return common+art+'</div><div class="pt-sheet-viewport"><div class="pt-sheet-frame"></div></div></div><span class="pt-arrow"></span><span class="pt-level"></span><span class="pt-charge"></span>';
}
let physicalRenderRootCache={state:null,grid:null,version:-1,roots:[]};
function physicalRenderRoots(){
  const version=state?._physicalTopologyVersion||0,grid=state?.grid;
  if(physicalRenderRootCache.state===state&&physicalRenderRootCache.grid===grid&&physicalRenderRootCache.version===version) return physicalRenderRootCache.roots;
  const roots=[];
  if(grid) for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
    const t=grid[r][c],def=physicalDef(t?.obstacle); if(!def||(t.obstacleRootR??r)!==r||(t.obstacleRootC??c)!==c)continue;
    roots.push({r,c});
  }
  physicalRenderRootCache={state,grid,version,roots}; return roots;
}
function renderPhysicalTraps(){
  physicalNormalizeLegacyWallChildren();
  const layer=physicalEnsureLayer();if(!layer)return;
  const visible=!!state && state.phase!=='village';layer.hidden=!visible;
  if(!visible){
    if(state)state.physicalFlights=[];
    for(const [,node] of physicalFlightEls) node.remove();
    physicalFlightEls.clear();
    return;
  }
  const px=currentCellPx,now=physicalVisualClock(),seen=new Set();
  const topologyVersion=state._physicalTopologyVersion||0;
  const roots=physicalRenderRoots();
  const hasFlights=!!(state.physicalFlights&&state.physicalFlights.length);
  const hasImpact=Array.isArray(state.heroes)&&state.heroes.some(h=>(h.physicalImpactUntil||0)>physicalClock());
  if(!roots.length&&!hasFlights&&!hasImpact&&state.phase!=='build'){
    if(physicalDeviceEls.size){ for(const [,node] of physicalDeviceEls)node.remove(); physicalDeviceEls.clear(); }
    if(physicalFlightEls.size){ for(const [,node] of physicalFlightEls)node.remove(); physicalFlightEls.clear(); }
    return;
  }
  const selectedRoot=state.selected?.kind==='tile'?physicalRootPos(state.selected.r,state.selected.c):null;
  const cellPx=px+'px'; if(layer._ptCellPx!==cellPx){layer._ptCellPx=cellPx;layer.style.setProperty('--pt-cell',cellPx);}
  for(const root of roots){
    const r=root.r,c=root.c,t=state.grid[r][c],def=physicalDef(t?.obstacle); if(!def)continue;
    const key=r+'_'+c;seen.add(key);let node=physicalDeviceEls.get(key),newNode=false;
    if(!node||node.dataset.trap!==def.id){
      if(node)node.remove();node=document.createElement('div');newNode=true;node.className='pt-device pt-'+def.id;node.dataset.trap=def.id;node.innerHTML=physicalDeviceMarkup(def.id);
      node._ptRefs={arrow:node.querySelector('.pt-arrow'),level:node.querySelector('.pt-level'),zones:node.querySelector('.pt-zones')};
      node._ptGeoSig=''; node._ptGeo=null; physicalDeviceEls.set(key,node);layer.appendChild(node);
    }
    node._ptTile=t;node._ptRow=r;node._ptCol=c;
    const [visualLength,visualWidth]=physicalSize(def.id);
    const geomSig=px+'|'+r+'|'+c;
    if(node._ptBoxSig!==geomSig){
      node._ptBoxSig=geomSig;
      node.style.left=c*px+'px';node.style.top=r*px+'px';node.style.width=px+'px';node.style.height=px+'px';
    }
    const drawDir=physicalDir(t),drawSide={r:drawDir.c,c:-drawDir.r},backset=def.id==='wall_crusher'?.45:0;
    // The crusher graphic is now purpose-built CSS artwork instead of the old 224x160 sprite.
    // Give the rig the full three-cell wall face and enough forward canvas for a three-cell crush.
    const visualDepthPx=def.id==='wall_crusher'?4.15*px:visualLength*px;
    const visualFacePx=def.id==='wall_crusher'?3*px:visualWidth*px;
    const faceInset=0;
    const visualSig=px+'|'+def.id+'|'+(t.physicalDir??1)+'|'+def.color;
    if(node._ptVisualSig!==visualSig){
      node._ptVisualSig=visualSig;
      node.style.setProperty('--pt-length',visualDepthPx+'px');node.style.setProperty('--pt-width',visualFacePx+'px');
      node.style.setProperty('--pt-offset-x',(-drawDir.c*backset*px+drawSide.c*faceInset)+'px');
      node.style.setProperty('--pt-offset-y',(-drawDir.r*backset*px+drawSide.r*faceInset)+'px');
      node.style.setProperty('--pt-color',def.color);node.style.setProperty('--pt-angle',(def.fixed?0:drawDir.angle)+'deg');
    }
    const rt=t.physicalRuntime||{},geoSig=topologyVersion+':'+def.id+':'+(t.physicalDir??1);
    let geo=node._ptGeo;
    if(!geo||node._ptGeoSig!==geoSig){ geo=physicalGeometry(r,c,def.id,t.physicalDir); node._ptGeo=geo; node._ptGeoSig=geoSig; node._ptZonesVersion=''; }
    const armed=rt.armedAt!=null;
    const age=rt.firedAt==null?Infinity:Math.max(0,now-rt.firedAt),hit=age<def.recover;
    const selected=!!selectedRoot&&selectedRoot.r===r&&selectedRoot.c===c;
    if(node._ptArmed!==armed){node._ptArmed=armed;node.classList.toggle('pt-armed',armed);}
    if(node._ptHit!==hit){node._ptHit=hit;node.classList.toggle('pt-hit',hit);}
    const fault=!geo.ok;if(node._ptFault!==fault){node._ptFault=fault;node.classList.toggle('pt-fault',fault);}
    if(node._ptSelected!==selected){node._ptSelected=selected;node.classList.toggle('pt-selected',selected);}
    // 스프라이트는 메인 RAF에서 매 프레임 갱신하므로 여기서는 새 노드의 첫 프레임만 칠합니다.
    if(def.id==='wall_crusher') node.classList.remove('pt-sheet-ready');
    else if(newNode) physicalPaintSprite(node,now);
    const warningProgress=armed?Math.min(1,Math.max(0,(now-rt.armedAt)/def.windup)):0;
    // Advance before the logical hit, reach full extension exactly when damage is resolved.
    const stroke=armed?Math.pow(warningProgress,5)*.88:hit?Math.max(0,1-age/def.recover):0;
    // At the strike frame the wall visually reaches the opposite side of the actual lane.
    const crusherTravel=def.id==='wall_crusher'?Math.max(1,geo.reach||1):1;
    node.style.setProperty('--pt-stroke',(stroke*crusherTravel*px)+'px');
    node.style.setProperty('--pt-flap-angle',(hit?-68*stroke:armed?8:0)+'deg');
    node.style.setProperty('--pt-swing',(armed?-72*Math.sin(Math.PI*warningProgress):hit?72*Math.sin(Math.PI*Math.min(1,age/def.recover)):Math.sin(now*1.6+r)*8)+'deg');
    const arrow=node._ptRefs?.arrow,levelEl=node._ptRefs?.level;
    const arrowText=def.fixed?'':physicalDir(t).icon,levelText=def.fixed?'':String(obstacleLevel(t));
    if(arrow&&arrow.textContent!==arrowText)arrow.textContent=arrowText;
    if(levelEl&&levelEl.textContent!==levelText)levelEl.textContent=levelText;
    const fraction=armed?Math.min(1,Math.max(0,(now-rt.armedAt)/def.windup)):Math.min(1,Math.max(0,1-((rt.readyAt||0)-now)/(def.cooldown||1)));
    node.style.setProperty('--pt-charge',fraction);
    if(node._ptZonesVersion!==geoSig){
      node._ptZonesVersion=geoSig; const zones=node._ptRefs?.zones;
      if(zones){ zones.replaceChildren(); if(!def.fixed)for(const [nr,nc] of geo.cells){const e=document.createElement('i');e.style.left=(nc-c)*100+'%';e.style.top=(nr-r)*100+'%';zones.appendChild(e);} }
    }
  }
  for(const [key,node] of physicalDeviceEls)if(!seen.has(key)){node.remove();physicalDeviceEls.delete(key);}
  // A placement ray is build-only. During combat we avoid querying/clearing this DOM every visual tick.
  let preview=layer._ptPreview||null;
  if(state.phase==='build'){
    if(!preview){preview=layer.querySelector('.pt-preview');if(!preview){preview=document.createElement('div');preview.className='pt-preview';layer.appendChild(preview);}layer._ptPreview=preview;}
    preview.replaceChildren();
  }
  if(state.phase==='build'&&preview&&state.physicalHover&&physicalDef(state.selectedObstacleType)){
    const {r,c}=state.physicalHover,def=physicalDef(state.selectedObstacleType),geo=physicalPlacement(r,c,def.id);
    if(geo.ok){
      for(const [nr,nc] of (geo.footprintCells||physicalFootprintCells(r,c,def.id).cells)){
        const e=document.createElement('i');e.className='pt-preview-footprint';e.style.left=nc*px+'px';e.style.top=nr*px+'px';preview.appendChild(e);
      }
      if(def.push){
        const d=PHYSICAL_DIRS[state.physicalDirection??1]||PHYSICAL_DIRS[1],start=def.mount==='wall'?{r:r+d.r,c:c+d.c}:{r,c};
        for(let k=0;k<=def.push;k++){
          const nr=start.r+d.r*k,nc=start.c+d.c*k,t=state.grid[nr]?.[nc];
          if(!t||t.type==='rock'||t.type==='core'||t.obstacle==='barricade'||(t.obstacle==='collapse_bridge'&&typeof runeGateIsBlocking==='function'&&runeGateIsBlocking(t)))break;
          const e=document.createElement('i');e.className='pt-preview-path';e.style.left=nc*px+'px';e.style.top=nr*px+'px';preview.appendChild(e);
          if(t.type==='chasm'||(k>0&&physicalOccupied(nr,nc)))break;
        }
      }
    }
  }
  const flightSeen=new Set();
  state.physicalFlights=(state.physicalFlights||[]).filter(f=>{
    const p=physicalFlightProgress(f,now);
    if(p>=1){physicalFlightEls.get(f.id)?.remove();physicalFlightEls.delete(f.id);return false;}
    flightSeen.add(f.id);let node=physicalFlightEls.get(f.id);
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
    const clockNow=physicalClock();
    for(const h of state.heroes){
      const key='h'+h.id,node=tokenEls[key]; if(!node)continue;
      const flying=physicalOwnsToken(key);
      if(node._ptFlying!==flying){node._ptFlying=flying;node.classList.toggle('physical-flying',flying);}
      const crushing=h.physicalImpactKind==='wall_crusher'&&(h.physicalImpactUntil||0)>clockNow;
      const sliced=h.physicalImpactKind==='pendulum'&&(h.physicalImpactUntil||0)>clockNow;
      if(node._ptCrushing!==crushing){node._ptCrushing=crushing;node.classList.toggle('physical-crushed',crushing);}
      if(node._ptSliced!==sliced){node._ptSliced=sliced;node.classList.toggle('physical-sliced',sliced);}
      if(crushing){
        const dr=Math.sign(h.physicalImpactDirR||0),dc=Math.sign(h.physicalImpactDirC||0);
        const travel=px*Math.max(.45,Math.min(1.08,Number(h.physicalImpactTravel)||.7));
        const crushX=dc*travel,crushY=dr*travel;
        const crushSig=[dr,dc,travel,h.isBoss?1:0,gameSpeed].join('|');
        if(node._ptCrushSig!==crushSig){
          node._ptCrushSig=crushSig;
          node.style.setProperty('--pt-crush-x',crushX+'px');
          node.style.setProperty('--pt-crush-y',crushY+'px');
          node.style.setProperty('--pt-crush-x16',(crushX*.16)+'px');node.style.setProperty('--pt-crush-y16',(crushY*.16)+'px');
          node.style.setProperty('--pt-crush-x76',(crushX*.76)+'px');node.style.setProperty('--pt-crush-y76',(crushY*.76)+'px');
          node.style.setProperty('--pt-crush-x82',(crushX*.82)+'px');node.style.setProperty('--pt-crush-y82',(crushY*.82)+'px');
          node.style.setProperty('--pt-crush-sx',String(dc?(h.isBoss?.52:.22):(h.isBoss?1.05:1.12)));
          node.style.setProperty('--pt-crush-sy',String(dr?(h.isBoss?.52:.22):(h.isBoss?1.05:1.12)));
          node.style.setProperty('--pt-release-sx',String(dc?.78:1.04));node.style.setProperty('--pt-release-sy',String(dr?.78:1.04));
          node.style.setProperty('--pt-crush-ox',dc>0?'100%':dc<0?'0%':'50%');
          node.style.setProperty('--pt-crush-oy',dr>0?'100%':dr<0?'0%':'50%');
          node.style.setProperty('--pt-impact-ms',Math.max(120,560/Math.max(1,gameSpeed))+'ms');
        }
      }else{
        node._ptCrushSig='';
        const impactMs=Math.max(100,400/Math.max(1,gameSpeed))+'ms';
        if(node._ptImpactMs!==impactMs){node._ptImpactMs=impactMs;node.style.setProperty('--pt-impact-ms',impactMs);}
      }
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
  controls.innerHTML='<div class="pt-control-title">'+def.name+' <small>'+physicalSize(def.id).join('×')+' '+(def.id==='wall_crusher'?'표시 · 벽 3칸 설치':def.mount==='wall'?'표시 · 벽 1칸 설치':def.fixed?'지형':'바닥')+'</small></div>'+(def.fixed?'':physicalDirectionButtons(state.physicalDirection??1))+'<p>'+def.desc+'</p><p class="pt-note">'+(state.physicalNotice||'초록 테두리: 설치 가능 · R: 방향 회전')+'</p>';
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
  const root=physicalRootPos(sel.r,sel.c);if(!root)return false;
  const r=root.r,c=root.c,tile=state.grid[r]?.[c],def=physicalDef(tile?.obstacle);if(!def)return false;
  const box=els.panelBox,lv=obstacleLevel(tile),cost=obstacleUpgradeCost(def,lv),build=state.phase==='build';
  const geo=physicalGeometry(r,c,def.id,tile.physicalDir);
  const sig=[r,c,def.id,lv,tile.physicalDir,build,state.gold>=cost,geo.ok,state.physicalNotice].join(':');
  if(box.dataset.physicalSig===sig&&box.querySelector('.pt-details'))return true;
  box.dataset.physicalSig=sig;
  box.innerHTML='<section class="pt-details"><h3>'+def.name+(def.fixed?'':' · Lv.'+lv)+'</h3><p>'+def.desc+'</p><p><b>'+(def.id==='wall_crusher'?'표시 크기 '+physicalSize(def.id).join('×')+' · 실제 설치 벽 3칸':def.mount==='wall'?'표시 크기 '+physicalSize(def.id).join('×')+' · 실제 설치 벽 1칸':'점유 크기 '+physicalSize(def.id).join('×'))+'</b></p>'+
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
      const root=physicalRootPos(state.selected.r,state.selected.c),t=root&&state.grid[root.r][root.c];
      if(root&&t)rotatePhysicalTrap(root.r,root.c,(t.physicalDir+1)%4);
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
function physicalAnimateSpritesFrame(){
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
}
