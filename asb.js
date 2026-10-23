/* Physics Arena Advanced Skill Builder — client-side prototype editor */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  if (!$("asbOpen")) return;
  const backdrop = $("asbBackdrop"), workspace = $("asbWorkspace"), graph = $("asbGraph");
  const status = $("asbStatusText"), codeEditor = $("asbCodeEditor");
  const categories = {
    Events: [
      ["Ability activated","event",{event:"activate"}],["On hit","event",{event:"hit"}],["On collision","event",{event:"collision"}],["On cooldown ready","event",{event:"cooldown"}],["On timer","event",{seconds:1}]
    ],
    Attacks: [
      ["Deal damage","effect",{damage:20}],["Apply knockback","physics",{knockback:1}],["Heal target","effect",{amount:20}],["Apply status","effect",{status:"burn",duration:3}],["Steal HP","effect",{amount:10}]
    ],
    Hitboxes: [
      ["Circle hitbox","physics",{shape:"circle",radius:40,range:280}],["Rectangle hitbox","physics",{shape:"rectangle",width:120,height:40,range:280}],["Beam hitbox","physics",{shape:"beam",width:24,range:280}],["Moving hitbox","physics",{shape:"circle",radius:24,range:280,moveSpeed:120}],["Orbiting hitbox","physics",{shape:"circle",radius:18,orbitRadius:60}]
    ],
    Projectiles: [
      ["Spawn projectile","physics",{speed:220,radius:8,damage:20}],["Homing projectile","physics",{speed:160,turnRate:3,damage:20}],["Projectile burst","physics",{count:8,speed:180,damage:10}],["Return projectile","physics",{speed:220,returning:true}]
    ],
    Loops: [
      ["Repeat","event",{count:5}],["While condition true","condition",{condition:"targetAlive"}],["For each target","event",{scope:"targets"}],["Wait","event",{seconds:0.5}]
    ],
    Conditions: [
      ["If target in range","condition",{range:280}],["If HP below percent","condition",{percent:25}],["If ability ready","condition",{condition:"ready"}],["Random chance","condition",{chance:50}],["If team matches","condition",{team:"enemy"}]
    ],
    Effects: [
      ["Energy beam visual","effect",{visual:"beam",color:"#54f6ff",width:24,life:0.5}],["Explosion visual","effect",{visual:"explosion",color:"#ffad5c",radius:100}],["Particles","effect",{visual:"particles",count:24,color:"#b19aff"}],["Screen shake","effect",{amount:5,duration:0.2}],["Sound cue","effect",{sound:"impact"}],["Custom shape","effect",{visual:"shape",shape:"star"}]
    ],
    Physics: [
      ["Set velocity","physics",{vx:0,vy:0}],["Add velocity","physics",{vx:100,vy:0}],["Set gravity","physics",{gravity:0}],["Damage multiplier","physics",{multiplier:2}],["Reflect velocity","physics",{reflect:true}],["Teleport","physics",{teleport:true}]
    ]
  };
  const defaults = {
    name:"My Custom Ability",description:"A custom ability built in ASB.",cooldown:1,duration:0.5,
    nodes:[
      {id:1,title:"Ability activated",kind:"event",category:"Events",params:{event:"activate"}},
      {id:2,title:"Create beam hitbox",kind:"physics",category:"Hitboxes",params:{shape:"beam",width:24,range:280}},
      {id:3,title:"Deal damage",kind:"effect",category:"Attacks",params:{damage:20}},
      {id:4,title:"Draw beam visual",kind:"effect",category:"Effects",params:{visual:"beam",color:"#54f6ff",width:24,life:0.5}}
    ],customCode:"// Optional advanced logic. This is exported as source; it is not executed automatically.\n// Available design concepts: ability, owner, target, simulationTime, emitEvent()\n// Add nodes in the visual editor to define behavior safely.\n"
  };
  let ability = structuredClone(defaults), activeCategory = "Events", nextId = 5, activeTab = "blocks";
  function escapeHTML(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
  function open(){backdrop.classList.add("is-open");backdrop.setAttribute("aria-hidden","false");render();$("asbName").value=ability.name;$("asbDescription").value=ability.description;$("asbCooldown").value=ability.cooldown;$("asbDuration").value=ability.duration;}
  function close(){backdrop.classList.remove("is-open");backdrop.setAttribute("aria-hidden","true");}
  function setStatus(s){status.textContent=s;}
  function renderLibrary(){
    $("asbCategoryList").innerHTML=Object.keys(categories).map(c=>'<button class="asb-cat" data-category="'+escapeHTML(c)+'" aria-pressed="'+(c===activeCategory)+'">'+escapeHTML(c)+'</button>').join("");
    const q=$("asbSearch").value.trim().toLowerCase();
    $("asbBlockList").innerHTML=categories[activeCategory].filter(b=>!q||(b[0]+" "+activeCategory).toLowerCase().includes(q)).map((b,i)=>'<button class="asb-block-pick" data-pick="'+i+'">＋ '+escapeHTML(b[0])+'<span>'+escapeHTML(activeCategory)+' · add block</span></button>').join("")||'<div class="asb-empty">No blocks match this search in this category.</div>';
  }
  function fieldHTML(key,val,nodeId){
    const label=key.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase());
    let input;
    if(typeof val==="boolean")input='<select data-param="'+escapeHTML(key)+'" data-node="'+nodeId+'"><option value="true" '+(val?"selected":"")+'>True</option><option value="false" '+(!val?"selected":"")+'>False</option></select>';
    else if(key==="color")input='<input type="color" data-param="'+escapeHTML(key)+'" data-node="'+nodeId+'" value="'+(/^#[0-9a-f]{6}$/i.test(val)?val:"#54f6ff")+'">';
    else if(typeof val==="number")input='<input type="number" step="any" data-param="'+escapeHTML(key)+'" data-node="'+nodeId+'" value="'+escapeHTML(val)+'">';
    else input='<input type="text" data-param="'+escapeHTML(key)+'" data-node="'+nodeId+'" value="'+escapeHTML(val)+'">';
    return '<div class="asb-field"><label>'+escapeHTML(label)+'</label>'+input+'</div>';
  }
  function renderGraph(){
    if(!ability.nodes.length){graph.innerHTML='<div class="asb-empty">Your ability is empty. Add any block from the library, or start with an event.</div>';return;}
    graph.innerHTML=ability.nodes.map((n,i)=>'<article class="asb-node '+escapeHTML(n.kind)+'" data-id="'+n.id+'"><div class="asb-node-head"><div><div class="asb-node-kind">'+escapeHTML(n.category||n.kind)+'</div><div class="asb-node-title">'+escapeHTML(n.title)+'</div></div><div class="asb-node-controls"><button class="asb-mini" data-move="-1" data-id="'+n.id+'" aria-label="Move block up" '+(i===0?'disabled':'')+'>↑</button><button class="asb-mini" data-move="1" data-id="'+n.id+'" aria-label="Move block down" '+(i===ability.nodes.length-1?'disabled':'')+'>↓</button><button class="asb-mini" data-delete="'+n.id+'" aria-label="Delete block">×</button></div></div><div class="asb-node-fields">'+Object.entries(n.params||{}).map(([k,v])=>fieldHTML(k,v,n.id)).join("")+'</div></article>'+(i<ability.nodes.length-1?'<div class="asb-connector" aria-hidden="true">↓</div>':"")).join("");
  }
  function renderSettings(){
    const last=ability.nodes[ability.nodes.length-1];
    $("asbSelection").innerHTML='<h4>Ability settings</h4><div class="asb-field-stack"><div class="asb-field"><label>Ability name</label><input class="asb-input" id="asbName" value="'+escapeHTML(ability.name)+'" maxlength="80"></div><div class="asb-field"><label>Description</label><input class="asb-input" id="asbDescription" value="'+escapeHTML(ability.description)+'" maxlength="240"></div><div class="asb-field"><label>Cooldown (simulation seconds)</label><input class="asb-input" id="asbCooldown" type="number" min="0" step="0.05" value="'+ability.cooldown+'"></div><div class="asb-field"><label>Duration (simulation seconds)</label><input class="asb-input" id="asbDuration" type="number" min="0" step="0.05" value="'+ability.duration+'"></div></div>';
    $("asbLastNode").textContent=last?"Last block: "+last.title:"No blocks added";
  }
  function renderPreview(){
    const c=$(activeTab==="preview"?"asbPreviewCanvasDuplicate":"asbPreviewCanvas"), rect=c.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);c.width=Math.max(1,rect.width*dpr);c.height=Math.max(1,rect.height*dpr);
    const x=c.getContext("2d");x.scale(dpr,dpr);const w=rect.width,h=rect.height;x.fillStyle="#070d18";x.fillRect(0,0,w,h);x.strokeStyle="#18263b";for(let gx=0;gx<w;gx+=20){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,h);x.stroke()}for(let gy=0;gy<h;gy+=20){x.beginPath();x.moveTo(0,gy);x.lineTo(w,gy);x.stroke()}
    const centerX=w*.5,centerY=h*.55;x.fillStyle="#123e4a";x.strokeStyle="#49e6f2";x.lineWidth=2;x.beginPath();x.arc(w*.25,centerY,13,0,Math.PI*2);x.fill();x.stroke();x.fillStyle="#482b20";x.strokeStyle="#ff9b54";x.beginPath();x.arc(w*.75,centerY,13,0,Math.PI*2);x.fill();x.stroke();
    const beam=ability.nodes.some(n=>(n.params?.visual==="beam"||n.params?.shape==="beam"||/beam/i.test(n.title)));const color=ability.nodes.map(n=>n.params?.color).find(Boolean)||"#54f6ff";if(beam){const g=x.createLinearGradient(w*.25,centerY,w*.75,centerY);g.addColorStop(0,"#ffffff");g.addColorStop(.2,color);g.addColorStop(.8,color);g.addColorStop(1,"#ffffff00");x.strokeStyle=g;x.shadowBlur=15;x.shadowColor=color;x.lineWidth=10;x.beginPath();x.moveTo(w*.25+13,centerY);x.lineTo(w*.75-13,centerY);x.stroke();x.shadowBlur=0;x.strokeStyle="#fff";x.lineWidth=2;x.stroke();}
    else{x.strokeStyle=color;x.lineWidth=2;x.beginPath();x.arc(centerX,centerY,Math.min(w,h)*.25,0,Math.PI*2);x.stroke()}
    x.fillStyle="#dceaff";x.font="11px system-ui";x.textAlign="center";x.fillText(ability.name||"Untitled ability",centerX,18);x.fillStyle="#8d9bb5";x.fillText(ability.nodes.length+" blocks · visual preview only",centerX,h-10);
  }
  function render(){renderLibrary();renderGraph();renderSettings();codeEditor.value=ability.customCode||"";renderPreview();}
  function addBlock(index){const def=categories[activeCategory][index];if(!def)return;ability.nodes.push({id:nextId++,title:def[0],kind:def[1],category:activeCategory,params:structuredClone(def[2])});renderGraph();renderSettings();renderPreview();setStatus("Added "+def[0]);}
  function exportJSON(){syncMeta();const blob=new Blob([JSON.stringify({...ability,format:"physics-arena-ability",version:1},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(ability.name||"custom-ability").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus("Ability exported as JSON");}
  function syncMeta(){ability.name=$("asbName")?.value||ability.name;ability.description=$("asbDescription")?.value||ability.description;ability.cooldown=Math.max(0,Number($("asbCooldown")?.value)||0);ability.duration=Math.max(0,Number($("asbDuration")?.value)||0);ability.customCode=codeEditor.value;}
  function switchTab(tab){activeTab=tab;document.querySelectorAll(".asb-tab").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===tab)));$("asbWorkspace").style.display=tab==="code"?"none":"grid";$("asbCodePanel").classList.toggle("is-visible",tab==="code");$("asbPreviewPanel").hidden=tab!=="preview";$("asbPreviewPanel").classList.toggle("is-visible",tab==="preview");if(tab==="preview"){renderPreview();}}
  $("asbOpen").addEventListener("click",open);$("asbClose").addEventListener("click",close);$("asbImportButton").addEventListener("click",()=>$("asbImport").click());
  backdrop.addEventListener("pointerdown",e=>{if(e.target===backdrop)close()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&backdrop.classList.contains("is-open"))close()});
  $("asbCategoryList").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;activeCategory=b.dataset.category;renderLibrary();});
  $("asbBlockList").addEventListener("click",e=>{const b=e.target.closest("[data-pick]");if(b)addBlock(Number(b.dataset.pick));});
  $("asbSearch").addEventListener("input",renderLibrary);
  graph.addEventListener("click",e=>{const del=e.target.closest("[data-delete]");if(del){ability.nodes=ability.nodes.filter(n=>n.id!==Number(del.dataset.delete));renderGraph();renderSettings();renderPreview();setStatus("Block removed");return;}const move=e.target.closest("[data-move]");if(move){const i=ability.nodes.findIndex(n=>n.id===Number(move.dataset.id)),j=i+Number(move.dataset.move);if(i<0||j<0||j>=ability.nodes.length)return;[ability.nodes[i],ability.nodes[j]]=[ability.nodes[j],ability.nodes[i]];renderGraph();renderPreview();}});
  graph.addEventListener("change",e=>{const el=e.target.closest("[data-param]");if(!el)return;const n=ability.nodes.find(n=>n.id===Number(el.dataset.node));if(!n)return;let v=el.value;if(v==="true"||v==="false")v=v==="true";else if(v.trim()!==""&&Number.isFinite(Number(v))&&el.type==="number")v=Number(v);n.params[el.dataset.param]=v;renderPreview();setStatus("Block settings updated");});
  $("asbSave").addEventListener("click",()=>{syncMeta();exportJSON();});
  $("asbReset").addEventListener("click",()=>{if(!confirm("Replace this draft with a fresh example? Export your work first if you want to keep it."))return;ability=structuredClone(defaults);nextId=5;render();setStatus("Fresh draft loaded");});
  $("asbImport").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!parsed||!Array.isArray(parsed.nodes)||parsed.nodes.length>500)throw new Error("Invalid ability file");ability={...structuredClone(defaults),...parsed,nodes:parsed.nodes.map((n,i)=>({...n,id:Number.isFinite(n.id)?n.id:i+1,params:n.params&&typeof n.params==="object"?n.params:{}}))};nextId=Math.max(1,...ability.nodes.map(n=>n.id))+1;render();setStatus("Ability imported. Review before using it.");}catch(err){setStatus("Import failed: "+err.message);}e.target.value="";});
  document.querySelectorAll(".asb-tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  $("asbWorkspace").addEventListener("input",e=>{if(["asbName","asbDescription","asbCooldown","asbDuration"].includes(e.target.id)){syncMeta();renderPreview();}});
  $("asbShowLibrary").addEventListener("click",()=>workspace.classList.toggle("show-library"));
  $("asbShowSettings").addEventListener("click",()=>workspace.classList.toggle("show-settings"));
  $("asbPreviewRefresh").addEventListener("click",()=>{syncMeta();renderPreview();setStatus("Preview refreshed");});
  window.addEventListener("resize",()=>{if(backdrop.classList.contains("is-open"))renderPreview();});
  switchTab("blocks");
})();
