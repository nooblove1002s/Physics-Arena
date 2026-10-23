(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const canvas = $("arena");
  const ctx = canvas.getContext("2d");
  const ui = {
    mode: $("modeSelect"), status: $("statusLabel"), state: $("arenaState"), pause: $("pauseBtn"),
    start: $("startBtn"), reset: $("resetBtn"), add: $("addBtn"), hp: $("hpInput"), damage: $("damageInput"),
    knockback: $("knockbackInput"), knockbackValue: $("knockbackValue"), speed: $("speedInput"), speedValue: $("speedValue"),
    god: $("godMode"), godHp: $("godHp"), applyGod: $("applyGod"), range: $("rangeInput"), rangeValue: $("rangeValue"),
    cooldown: $("cooldownInput"), repeat: $("repeatSelect"), fire: $("fireBtn"), alive: $("aliveCount"),
    hits: $("hitCount"), damageTotal: $("damageCount"), wave: $("waveNumber"), waveLabel: $("waveLabel"),
    waveStatus: $("waveStatus"), log: $("eventLog"), toast: $("toast"), blockAction: $("blockAction"),
    blockDamage: $("blockDamage"), blockPreview: $("blockPreview"), runBlock: $("runBlock")
  };
  const colors = { blue: "#49e6f2", orange: "#ff9b54", purple: "#b19aff", green: "#70f0b0" };
  let W = 900, H = 500, running = true, started = false, selectedId = 1, nextId = 1;
  let fighters = [], effects = [], hitCount = 0, damageTotal = 0, wave = 1, waveSpawned = 0;
  let weapon = "sword", lastTime = 0, elapsed = 0, nextRaidSpawn = 0, waveWait = 0, cooldownUntil = 0, lastTickAt = 0;
  let pointer = { x: 0, y: 0, down: false }, raf = 0;
  const rand = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const big = (value) => { try { let s=String(value).replace(/[,_\s]/g,""); if (!/^\+?\d+$/.test(s)) return 100n; return BigInt(s); } catch { return 100n; } };
  const showBig = (n) => { const s = (typeof n === "bigint" ? n : BigInt(n)).toString(); if(s.length<=7)return s; return s.slice(0,3)+"."+s.slice(3,5)+"e"+(s.length-1); };
  const alive = () => fighters.filter(f=>f.alive);
  const selected = () => fighters.find(f=>f.id===selectedId && f.alive) || alive()[0] || null;
  function resize() {
    const rect=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
    W=Math.max(320,rect.width); H=Math.max(280,rect.height);
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    for(const f of fighters){f.x=clamp(f.x,f.r,W-f.r);f.y=clamp(f.y,f.r,H-f.r);}
    draw();
  }
  function makeFighter(team, opts={}) {
    const r=opts.r||rand(15,20), id=nextId++;
    const f={id,team,x:opts.x??rand(50,W-50),y:opts.y??rand(60,H-60),vx:opts.vx??rand(-100,100),vy:opts.vy??rand(-100,100),r,
      hp:opts.hp??100n,maxHp:opts.hp??100n,damage:opts.damage??Number(ui.damage.value||20),alive:true,weapon:opts.weapon||"sword",isBoss:!!opts.isBoss,
      cooldown:0,hitTargets:new Set(),name:opts.name||(team==="blue"?"Hero":"Fighter "+id)};
    fighters.push(f); selectedId=id; return f;
  }
  function seed(mode=ui.mode.value) {
    fighters=[]; effects=[]; nextId=1; selectedId=1; hitCount=0;damageTotal=0;wave=1;waveSpawned=0;nextRaidSpawn=0;waveWait=0;elapsed=0;
    if(mode==="duel"){makeFighter("blue",{x:W*.30,y:H*.48,name:"Hero"});makeFighter("orange",{x:W*.70,y:H*.48,name:"Rival"});}
    else if(mode==="ffa"){for(let i=0;i<6;i++)makeFighter(i%2?"orange":"blue");}
    else if(mode==="juggernaut"){makeFighter("blue",{x:W*.28,y:H*.5,name:"Hero"});makeFighter("orange",{x:W*.68,y:H*.5,r:32,hp:500n,isBoss:true,name:"Juggernaut"});for(let i=0;i<3;i++)makeFighter("blue");}
    else if(mode==="raid"){makeFighter("blue",{x:W*.28,y:H*.5,name:"Hero"});for(let i=0;i<3;i++){makeFighter("orange",{name:"Minion"});waveSpawned++;}nextRaidSpawn=elapsed+1.4;}
    else {makeFighter("blue",{x:W*.30,y:H*.48,name:"Builder 1"});makeFighter("orange",{x:W*.70,y:H*.48,name:"Builder 2"});}
    started=false;running=true;ui.pause.textContent="Ⅱ Pause";ui.status.textContent="SIMULATION READY";ui.state.textContent="READY";ui.wave.textContent=String(wave).padStart(2,"0");ui.waveStatus.textContent=mode==="raid"?"Wave 1": "Standby";ui.waveLabel.textContent=mode==="raid"?"RAID WAVE":"WAVE";
    logClear();event("System","Arena reset · "+mode.toUpperCase()+" mode");updateStats();draw();
  }
  function logClear(){ui.log.innerHTML="";}
  function event(source,message,team) {
    const empty=ui.log.querySelector(".empty-state");if(empty)empty.remove();
    const row=document.createElement("div");row.className="event";
    const time=document.createElement("time");time.textContent=elapsed.toFixed(1)+"s";
    const text=document.createElement("div");const strong=document.createElement("strong");strong.className=team==="orange"?"orange":"";strong.textContent=source+" · ";text.append(strong,document.createTextNode(message));row.append(time,text);ui.log.prepend(row);
    while(ui.log.children.length>35)ui.log.lastElementChild.remove();
  }
  function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui.toast.classList.remove("show"),1400);}
  function updateStats(){ui.alive.textContent=alive().length;ui.hits.textContent=hitCount;ui.damageTotal.textContent=damageTotal>999999?showBig(BigInt(damageTotal)):damageTotal;const s=selected();if(s){ui.hp.value=s.hp.toString();ui.damage.value=s.damage;} }
  function start(){if(!started){started=true;event("System","Battle started");ui.status.textContent="SIMULATION LIVE";ui.state.textContent="LIVE";ui.waveStatus.textContent=ui.mode.value==="raid"?"In progress":"Fighting";}running=true;ui.pause.textContent="Ⅱ Pause";}
  function reset(){seed(ui.mode.value);}
  function addFighter(){const team=ui.mode.value==="ffa"?(Math.random()<.5?"blue":"orange"):(alive().filter(f=>f.team==="blue").length<=alive().filter(f=>f.team==="orange").length?"blue":"orange");const f=makeFighter(team);event("System",f.name+" added to "+team+" team",team);updateStats();}
  function setHP(f,hp){if(!f)return;f.hp=hp;f.maxHp=hp;ui.hp.value=hp.toString();updateStats();}
  function targetsFor(f){return alive().filter(t=>t.id!==f.id&&(ui.mode.value==="ffa"||t.team!==f.team));}
  function closestTarget(f,range=Infinity){let best=null,dmin=range;for(const t of targetsFor(f)){const d=Math.hypot(t.x-f.x,t.y-f.y);if(d<dmin){best=t;dmin=d;}}return best;}
  function addEffect(e){effects.push({...e,age:0});}
  function defeat(target,source,cause){if(!target.alive)return;target.alive=false;addEffect({type:"defeat",x:target.x,y:target.y,r:target.r,color:target.team==="blue"?colors.cyan:colors.orange});event(source.name,target.name+" defeated · cause: "+cause,target.team);if(ui.mode.value==="raid")waveWait=elapsed+1.4;updateStats();}
  function dealDamage(source,target,amount,cause,dirX,dirY){if(!source||!target||!target.alive)return;const dmg=Math.max(0,Math.floor(Number(amount)||0));if(dmg===0)return;target.hp=target.hp>BigInt(dmg)?target.hp-BigInt(dmg):0n;hitCount++;damageTotal+=dmg;addEffect({type:"impact",x:target.x,y:target.y,r:target.r+4,color:target.team==="blue"?colors.cyan:colors.orange});addEffect({type:"number",x:target.x,y:target.y-10,text:"-"+dmg,color:"#fff"});const kb=Number(ui.knockback.value||1)*220;target.vx+=(dirX||0)*kb;target.vy+=(dirY||0)*kb;event(source.name,target.name+" takes "+dmg+" damage · "+cause,target.team);if(target.hp<=0n)defeat(target,source,cause);updateStats();}
  function trigger(f=selected(),chosen=weapon,damage=Number(ui.damage.value||20)){if(!f){toast("Select a living fighter first");return;}if(elapsed<cooldownUntil){toast("Ability cooling down");return;}const range=Number(ui.range.value||280), target=closestTarget(f,range+f.r+70);const cooldown=Math.max(0,Number(ui.cooldown.value||0));cooldownUntil=elapsed+cooldown;f.weapon=chosen;
    const dx=target?target.x-f.x:Math.cos(Math.atan2(f.vy,f.vx)||0)*range,dy=target?target.y-f.y:Math.sin(Math.atan2(f.vy,f.vx)||0)*range,dist=Math.hypot(dx,dy)||1,nx=dx/dist,ny=dy/dist;
    if(chosen==="sword"){const tx=f.x+nx*Math.min(range,dist),ty=f.y+ny*Math.min(range,dist);addEffect({type:"sword",x:f.x,y:f.y,x2:tx,y2:ty,age:0,color:colors.cyan});if(target&&dist<range+target.r+f.r)dealDamage(f,target,damage,"energy sword strike",nx,ny);else toast("Sword swing · no target in reach");}
    else if(chosen==="beam"){const tx=f.x+nx*range,ty=f.y+ny*range;addEffect({type:"beam",x:f.x,y:f.y,x2:tx,y2:ty,age:0,color:"#54f6ff"});event(f.name,"Energy Beam fired · range "+range);for(const t of targetsFor(f)){const along=(t.x-f.x)*nx+(t.y-f.y)*ny,perp=Math.abs((t.x-f.x)*ny-(t.y-f.y)*nx);if(along>0&&along<range&&perp<t.r+8)dealDamage(f,t,damage,"energy beam",nx,ny);} }
    else if(chosen==="explosion"){const cx=target?target.x:f.x+nx*Math.min(range,100),cy=target?target.y:f.y+ny*Math.min(range,100),radius=Math.min(315,range);addEffect({type:"explosion",x:cx,y:cy,age:0,max:radius,color:"#ffad5c"});event(f.name,"Explosion detonated · radius "+radius);for(const t of targetsFor(f)){const dd=Math.hypot(t.x-cx,t.y-cy);if(dd<radius+t.r)dealDamage(f,t,Math.max(1,Math.round(damage*(1-dd/(radius+t.r)))),"explosion", (t.x-cx)/(dd||1),(t.y-cy)/(dd||1));}}
    else if(chosen==="blackhole"){const cx=target?target.x:f.x+nx*Math.min(range,130),cy=target?target.y:f.y+ny*Math.min(range,130);addEffect({type:"blackhole",x:cx,y:cy,age:0,max:range,color:colors.purple});event(f.name,"Black hole opened · visible gravity field");for(const t of targetsFor(f)){const dd=Math.hypot(t.x-cx,t.y-cy);if(dd<range){t.vx+=(cx-t.x)/(dd||1)*150;t.vy+=(cy-t.y)/(dd||1)*150;if(dd<65)dealDamage(f,t,damage,"black hole crush",(t.x-cx)/(dd||1),(t.y-cy)/(dd||1));}}}
    else if(chosen==="thorns"){addEffect({type:"thorns",x:f.x,y:f.y,age:0,max:range,color:colors.green});event(f.name,"Thorns activated · counter-hit aura");for(const t of targetsFor(f)){const dd=Math.hypot(t.x-f.x,t.y-f.y);if(dd<f.r+t.r+38)dealDamage(f,t,damage,"thorns counter-hit",(t.x-f.x)/(dd||1),(t.y-f.y)/(dd||1));}}
    else if(chosen==="lightning"){const list=targetsFor(f).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y)).filter(t=>Math.hypot(t.x-f.x,t.y-f.y)<range);if(list.length){let prev=f;for(const t of list){addEffect({type:"lightning",x:prev.x,y:prev.y,x2:t.x,y2:t.y,age:0,color:"#b8a2ff"});const dd=Math.hypot(t.x-prev.x,t.y-prev.y)||1;dealDamage(f,t,damage,"chain lightning",(t.x-prev.x)/dd,(t.y-prev.y)/dd);prev=t;}}else{addEffect({type:"lightning",x:f.x,y:f.y,x2:f.x+nx*range,y2:f.y+ny*range,age:0,color:"#b8a2ff"});event(f.name,"Lightning crackled · no target reached");}}
    updateStats();draw();
  }
  function drawGrid(){ctx.fillStyle="#080f1d";ctx.fillRect(0,0,W,H);ctx.strokeStyle="#1c2a41";ctx.lineWidth=1;for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.strokeStyle="#3a516c";ctx.strokeRect(9,9,W-18,H-18);ctx.fillStyle="#91a4c3";ctx.font="10px system-ui";ctx.fillText("0",15,22);ctx.fillText(Math.round(W)+" X",W-48,H-14);}
  function drawFighter(f){if(!f.alive)return;const c=f.team==="blue"?colors.cyan:colors.orange;ctx.save();ctx.shadowBlur=f.isBoss?26:15;ctx.shadowColor=c;ctx.fillStyle=f.isBoss?"#321f3e":(f.team==="blue"?"#123e4a":"#482b20");ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=f.id===selectedId?3:1.5;ctx.strokeStyle=f.id===selectedId?"#ffffff":c;ctx.stroke();if(f.id===selectedId){ctx.strokeStyle="#ffffff77";ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(f.x,f.y,f.r+7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    const hpRatio=f.maxHp>0n?Number(f.hp*100n/f.maxHp)/100:0;ctx.fillStyle="#07101c";ctx.fillRect(f.x-f.r,f.y-f.r-10,f.r*2,4);ctx.fillStyle=hpRatio>.5?colors.green:hpRatio>.2?"#ffd166":"#ff657a";ctx.fillRect(f.x-f.r,f.y-f.r-10,f.r*2*clamp(hpRatio,0,1),4);ctx.fillStyle="#f3f7ff";ctx.textAlign="center";ctx.font="bold 10px system-ui";ctx.fillText(showBig(f.hp),f.x,f.y+3);ctx.fillStyle=c;ctx.font="9px system-ui";ctx.fillText(f.name,f.x,f.y+f.r+15);ctx.restore();}
  function drawEffects(dt=0){for(const e of effects){e.age+=dt;const alpha=clamp(1-e.age/(e.type==="blackhole"?2.8:e.type==="thorns"?1.2:.55),0,1);ctx.save();ctx.globalAlpha=alpha;ctx.lineCap="round";if(e.type==="beam"){ctx.shadowBlur=20;ctx.shadowColor=e.color;const g=ctx.createLinearGradient(e.x,e.y,e.x2,e.y2);g.addColorStop(0,"#fff");g.addColorStop(.12,e.color);g.addColorStop(.8,e.color);g.addColorStop(1,"#ffffff00");ctx.strokeStyle=g;ctx.lineWidth=14*(1-e.age/.55)+2;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x2,e.y2);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x2,e.y2);ctx.stroke();}
    else if(e.type==="sword"||e.type==="lightning"){ctx.strokeStyle=e.color;ctx.shadowBlur=15;ctx.shadowColor=e.color;ctx.lineWidth=e.type==="sword"?9*(1-e.age/.4)+1:3;ctx.beginPath();ctx.moveTo(e.x,e.y);if(e.type==="lightning"){const dx=e.x2-e.x,dy=e.y2-e.y;for(let i=1;i<6;i++){const t=i/6;ctx.lineTo(e.x+dx*t+rand(-8,8),e.y+dy*t+rand(-8,8));}}ctx.lineTo(e.x2,e.y2);ctx.stroke();if(e.type==="sword"){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}}
    else if(e.type==="explosion"){const rr=e.max*(e.age/.65);ctx.strokeStyle=e.color;ctx.shadowBlur=22;ctx.shadowColor=e.color;ctx.lineWidth=6*(1-e.age/.65)+1;ctx.beginPath();ctx.arc(e.x,e.y,rr,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#ffb96718";ctx.beginPath();ctx.arc(e.x,e.y,rr*.65,0,Math.PI*2);ctx.fill();}
    else if(e.type==="blackhole"){ctx.translate(e.x,e.y);ctx.rotate(e.age*4);ctx.strokeStyle=e.color;ctx.shadowBlur=18;ctx.shadowColor=e.color;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,24+i*12,10+i*7,e.age+i,0,Math.PI*1.7);ctx.stroke();}ctx.fillStyle="#05050e";ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#e4d9ff";ctx.lineWidth=2;ctx.stroke();}
    else if(e.type==="thorns"){ctx.strokeStyle=e.color;ctx.lineWidth=3;for(let i=0;i<12;i++){const a=i*Math.PI/6+e.age;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r);ctx.lineTo(e.x+Math.cos(a)*(e.r+18),e.y+Math.sin(a)*(e.r+18));ctx.stroke();}}
    else if(e.type==="impact"||e.type==="defeat"){const rr=e.r+(e.type==="defeat"?e.age*65:e.age*45);ctx.strokeStyle=e.color;ctx.lineWidth=e.type==="defeat"?3:2;ctx.beginPath();ctx.arc(e.x,e.y,rr,0,Math.PI*2);ctx.stroke();if(e.type==="defeat"){for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.fillStyle=e.color;ctx.fillRect(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr,3,3);}}}
    else if(e.type==="number"){ctx.fillStyle=e.color;ctx.font="bold 13px system-ui";ctx.textAlign="center";ctx.fillText(e.text,e.x,e.y-e.age*35);}
    ctx.restore();}
    effects=effects.filter(e=>e.age<(e.type==="blackhole"?2.8:e.type==="thorns"?1.2:e.type==="explosion"?.65:e.type==="defeat"?.6:e.type==="number"?.8:.55));}
  function draw(){if(!ctx)return;drawGrid();for(const f of fighters)drawFighter(f);drawEffects(0);const f=selected();if(f&&weapon){ctx.save();ctx.strokeStyle=colors.cyan+"66";ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(f.x,f.y,Number(ui.range.value||280),0,Math.PI*2);ctx.stroke();ctx.restore();}}
  function physics(dt){const sp=Number(ui.speed.value||1),step=dt*sp;const living=alive();for(const f of living){f.x+=f.vx*step;f.y+=f.vy*step;const pad=f.r+10;if(f.x<pad){f.x=pad;f.vx=Math.abs(f.vx);}if(f.x>W-pad){f.x=W-pad;f.vx=-Math.abs(f.vx);}if(f.y<pad){f.y=pad;f.vy=Math.abs(f.vy);}if(f.y>H-pad){f.y=H-pad;f.vy=-Math.abs(f.vy);}f.vx*=Math.pow(.999,step*60);f.vy*=Math.pow(.999,step*60);}
    for(let i=0;i<living.length;i++)for(let j=i+1;j<living.length;j++){const a=living[i],b=living[j];const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01,min=a.r+b.r;if(d<min){const nx=dx/d,ny=dy/d,overlap=min-d;a.x-=nx*overlap*.5;a.y-=ny*overlap*.5;b.x+=nx*overlap*.5;b.y+=ny*overlap*.5;const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){const impulse=-rel*1.12;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;}}}
  }
  function raidLogic(){if(ui.mode.value!=="raid"||!started)return;const mobs=alive().filter(f=>f.team==="orange");if(elapsed>=nextRaidSpawn&&waveSpawned<Math.min(3+wave,20)){const hp=BigInt(Math.max(20,Math.floor(20*Math.pow(1.15,wave-1))));makeFighter("orange",{hp,name:"Wave "+wave+" Minion"});waveSpawned++;nextRaidSpawn=elapsed+Math.max(.2,1.2-wave*.01);event("Raid","Wave "+wave+" enemy spawned · HP "+showBig(hp),"orange");}
    if(waveSpawned>=Math.min(3+wave,20)&&mobs.length===0){if(!waveWait)waveWait=elapsed+1.2;if(elapsed>=waveWait){wave++;waveSpawned=0;waveWait=0;nextRaidSpawn=elapsed+.3;ui.wave.textContent=String(wave).padStart(2,"0");ui.waveStatus.textContent="In progress";event("Raid","Wave "+wave+" started");toast("WAVE "+wave);}}
  }
  function autoCombat(){if(!started)return;for(const f of alive()){if(f.team==="orange"&&elapsed>=f.cooldown){const t=closestTarget(f,100);if(t){const d=Math.hypot(t.x-f.x,t.y-f.y)||1;f.vx+=(t.x-f.x)/d*30;f.vy+=(t.y-f.y)/d*30;if(d<f.r+t.r+15){dealDamage(f,t,f.damage,"contact strike",(t.x-f.x)/d,(t.y-f.y)/d);f.cooldown=elapsed+1.1;}}}}}
  function frame(ts){raf=requestAnimationFrame(frame);if(!lastTime)lastTime=ts;const dt=Math.min((ts-lastTime)/1000,.04);lastTime=ts;if(running){elapsed+=dt;physics(dt);raidLogic();autoCombat();}ctx.clearRect(0,0,W,H);drawGrid();for(const f of fighters)drawFighter(f);drawEffects(running?dt:0);if(running)updateStats();}
  canvas.addEventListener("pointerdown",e=>{const rect=canvas.getBoundingClientRect();pointer.x=(e.clientX-rect.left);pointer.y=(e.clientY-rect.top);let best=null,bd=Infinity;for(const f of alive()){const d=Math.hypot(f.x-pointer.x,f.y-pointer.y);if(d<f.r+10&&d<bd){best=f;bd=d;}}if(best){selectedId=best.id;ui.hp.value=best.hp.toString();ui.damage.value=best.damage;toast("Selected "+best.name);draw();}else if(ui.mode.value==="sandbox"&&e.shiftKey){makeFighter("blue",{x:pointer.x,y:pointer.y});} });
  ui.pause.addEventListener("click",()=>{running=!running;ui.pause.textContent=running?"Ⅱ Pause":"▶ Resume";ui.status.textContent=running?(started?"SIMULATION LIVE":"SIMULATION READY"):"SIMULATION PAUSED";ui.state.textContent=running?(started?"LIVE":"READY"):"PAUSED";});
  ui.start.addEventListener("click",()=>{if(ui.mode.value==="raid"&&waveSpawned===0&&alive().length===0)reset();start();toast("Battle started");});
  ui.reset.addEventListener("click",reset);ui.add.addEventListener("click",addFighter);ui.mode.addEventListener("change",reset);
  ui.knockback.addEventListener("input",()=>ui.knockbackValue.textContent=Number(ui.knockback.value).toFixed(1)+"×");
  ui.speed.addEventListener("input",()=>ui.speedValue.textContent=Number(ui.speed.value).toFixed(2).replace(/0$/,"")+"×");
  ui.range.addEventListener("input",()=>{ui.rangeValue.textContent=ui.range.value;draw();});
  ui.hp.addEventListener("change",()=>{const f=selected();if(f)setHP(f,big(ui.hp.value));});
  ui.damage.addEventListener("change",()=>{const f=selected();if(f)f.damage=Math.max(0,Number(ui.damage.value)||0);});
  ui.god.addEventListener("change",()=>toast(ui.god.checked?"God Mode enabled":"God Mode disabled"));
  ui.applyGod.addEventListener("click",()=>{const f=selected();if(!f){toast("Select a fighter first");return;}if(!ui.god.checked){toast("Enable God Mode first");return;}setHP(f,big(ui.godHp.value));f.maxHp=f.hp;event("God Mode",f.name+" received HP "+f.hp);toast("God HP applied");});
  document.querySelectorAll(".weapon").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".weapon").forEach(x=>x.classList.remove("active"));b.classList.add("active");weapon=b.dataset.weapon;ui.blockAction.value=weapon;$("blockPreview").textContent="ATTACK · "+weapon.replace(/\b\w/g,c=>c.toUpperCase());draw();}));
  ui.fire.addEventListener("click",()=>{start();trigger();});
  ui.blockAction.addEventListener("change",()=>{const name=ui.blockAction.value;ui.blockPreview.textContent="ATTACK · "+name.replace(/\b\w/g,c=>c.toUpperCase());});
  ui.runBlock.addEventListener("click",()=>{start();trigger(selected(),ui.blockAction.value,Number(ui.blockDamage.value||20));});
  document.addEventListener("keydown",e=>{if(e.target.matches("input,select,textarea"))return;if(e.code==="Space"){e.preventDefault();running=!running;ui.pause.textContent=running?"Ⅱ Pause":"▶ Resume";}if(e.key.toLowerCase()==="f"){start();trigger();}if(e.key.toLowerCase()==="n")addFighter();});
  window.addEventListener("resize",resize);
  resize();seed("duel");cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
})();