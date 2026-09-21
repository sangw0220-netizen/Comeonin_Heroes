"use strict";
/* Physical trap sprite player v1.1.
 * Original supplied artwork: five rows, eight frames per row.
 * This file is pure presentation. It never deals damage or moves an entity.
 * Frames are sampled from the same simulation clock as the physical traps;
 * the impact frame is gated by firedAt, NOT by a CSS animation timer.
 */
const PhysicalTrapSprites=(()=>{
  const ROOT='assets/images/physical_traps/';
  const WIDTH=224,HEIGHT=160,COUNT=8;
  // Frame indices below are zero-based; the player's preview labels them 1..8.
  const CONFIG={
    wall_crusher:{rest:0,warning:[1,2],warningWeights:[.65,.35],recovery:[3,4,5,6,7],recoveryWeights:[.22,.16,.20,.20,.22]},
    wall_pusher:{rest:0,warning:[1,2],warningWeights:[.5,.5],recovery:[3,4,5,6,7],recoveryWeights:[.22,.16,.20,.20,.22]},
    spring_launcher:{rest:0,warning:[1,2],warningWeights:[.45,.55],recovery:[3,4,5,6,7],recoveryWeights:[.20,.22,.18,.20,.20]},
    pendulum:{rest:0,warning:[1,2],warningWeights:[.5,.5],recovery:[3,4,5,6,7],recoveryWeights:[.20,.23,.22,.18,.17]},
    abyss:{rest:0,loop:[0,1,2,3,4,5,6,7],loopDurations:[.60,.40,.22,.20,.25,.28,.35,.50],burst:[2,3,4,5,6,7],burstWeights:[.12,.18,.18,.20,.17,.15],burstDuration:.9}
  };
  const assets=Object.create(null);
  const media=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  function reducedMotion(){return !!media?.matches;}
  function weightedFrame(frames,weights,progress){
    if(!frames?.length)return 0;
    const p=Math.max(0,Math.min(1,Number(progress)||0));
    const total=weights.reduce((s,w)=>s+w,0);
    let at=0;
    for(let i=0;i<frames.length;i++){
      at+=weights[i]/total;
      if(p<at-1e-9 || i===frames.length-1)return frames[i];
    }
    return frames[frames.length-1];
  }
  function frameAt(id,rt={},now=0,options={}){
    const cfg=CONFIG[id];if(!cfg)return {index:0,stage:'idle'};
    const reduce=!!options.reducedMotion;
    if(options.fault||rt.fault)return {index:cfg.rest,stage:'fault'};
    if(cfg.loop){
      const burst=rt.spriteBurst;
      if(burst&&!burst.done){
        let age=now-burst.at;
        // A final ring-out may end the wave before the victim's visual fall finishes.
        // Complete this cosmetic burst in the same way as the existing fall effect.
        if(options.finishCosmetics&&Number.isFinite(options.realNow)&&Number.isFinite(burst.bornAt)){
          age=Math.max(age,(options.realNow-burst.bornAt)/1000*Math.max(1,options.speed||1));
        }
        if(age>=cfg.burstDuration){
          const idle=frameAt(id,{...rt,spriteBurst:null},now,options);return {...idle,burstDone:true};
        }
        if(age>=0 && age<cfg.burstDuration){
          return {index:reduce?3:weightedFrame(cfg.burst,cfg.burstWeights,age/cfg.burstDuration),stage:'burst'};
        }
      }
      if(reduce)return {index:cfg.rest,stage:'idle'};
      const total=cfg.loopDurations.reduce((a,b)=>a+b,0);
      const time=Number.isFinite(options.ambientNow)?options.ambientNow:now;
      const phase=((time+(options.seed||0))%total+total)%total;
      return {index:weightedFrame(cfg.loop,cfg.loopDurations,phase/total),stage:'ambient'};
    }
    if(rt.armedAt!=null){
      // Even when a render frame runs late, NEVER show contact before the logic hits.
      const duration=Math.max(.001,Number(options.windup)||.2);
      const p=Math.max(0,(now-rt.armedAt)/duration);
      return {index:reduce?cfg.warning[0]:weightedFrame(cfg.warning,cfg.warningWeights,p),stage:'warning'};
    }
    if(rt.firedAt!=null){
      if(rt.spriteRecoveryDoneFor===rt.firedAt)return {index:cfg.rest,stage:'idle'};
      const duration=Math.max(.001,Number(options.recover)||.5);
      let age=now-rt.firedAt;
      if(options.finishCosmetics&&Number.isFinite(options.realNow)&&Number.isFinite(rt.firedRealAt)){
        age=Math.max(age,(options.realNow-rt.firedRealAt)/1000*Math.max(1,rt.firedSpeed||options.speed||1));
      }
      if(age>=duration)return {index:cfg.rest,stage:'idle',recoveryDone:true};
      if(age>=0 && age<duration){
        return {index:reduce?cfg.recovery[0]:weightedFrame(cfg.recovery,cfg.recoveryWeights,age/duration),stage:'recovery'};
      }
    }
    return {index:cfg.rest,stage:'idle'};
  }
  function sheetURL(id){return ROOT+id+'_sheet.png';}
  function iconURL(id){return ROOT+id+'_icon.png';}
  function preload(onChange){
    if(typeof Image==='undefined')return;
    for(const id of Object.keys(CONFIG)){
      if(assets[id])continue;
      const status=assets[id]={ready:false,failed:false,iconReady:false};
      const sheet=new Image();status.image=sheet;
      sheet.onload=()=>{
        status.ready=sheet.naturalWidth===WIDTH*COUNT&&sheet.naturalHeight===HEIGHT;
        status.failed=!status.ready;
        if(!status.ready)console.warn('[PhysicalTrapSprites] Invalid atlas dimensions:',id);
        onChange?.(id,status);
      };
      sheet.onerror=()=>{status.ready=false;status.failed=true;onChange?.(id,status);};
      sheet.src=sheetURL(id);
      const icon=new Image();status.iconImage=icon;
      icon.onload=()=>{status.iconReady=true;onChange?.(id,status);};
      icon.onerror=()=>{status.iconReady=false;onChange?.(id,status);};
      icon.src=iconURL(id);
    }
  }
  function ready(id){return !!assets[id]?.ready;}
  function iconReady(id){return !!assets[id]?.iconReady;}
  function paint(node,id,rt,now,options={}){
    if(!node||!CONFIG[id])return null;
    const enabled=ready(id);
    node.classList.toggle('pt-sheet-ready',enabled);
    if(!enabled)return null; // Retain the prior vector mechanism if an asset is missing.
    let frame=node._ptSheetFrame;
    if(!frame||!node.contains(frame))frame=node._ptSheetFrame=node.querySelector('.pt-sheet-frame');
    if(!frame)return null;
    if(frame.dataset.sheet!==id){
      frame.style.backgroundImage='url("'+sheetURL(id)+'")';frame.dataset.sheet=id;
    }
    const result=frameAt(id,rt,now,{...options,reducedMotion:options.reducedMotion??reducedMotion()});
    // Horizontal percent is i/(N-1), not i/N; frame 8 must not wrap or bleed.
    if(frame.dataset.frame!==String(result.index)){
      frame.style.backgroundPosition=(result.index*100/(COUNT-1))+'% 0%';
      frame.dataset.frame=String(result.index);
      node.dataset.spriteFrame=String(result.index+1);
    }
    if(node.dataset.spriteStage!==result.stage)node.dataset.spriteStage=result.stage;
    // Presentation latch: a paused wave may finish recovery, but resuming must not replay it.
    if(result.recoveryDone && rt.firedAt!=null)rt.spriteRecoveryDoneFor=rt.firedAt;
    if(result.burstDone && rt.spriteBurst)rt.spriteBurst.done=true;
    return result;
  }
  return {WIDTH,HEIGHT,COUNT,CONFIG,frameAt,weightedFrame,preload,ready,iconReady,sheetURL,iconURL,paint,reducedMotion};
})();
