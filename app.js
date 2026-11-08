/* Electrochemistry Lab: interactive teaching diagrams, no dependencies. */
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const svg = $('diagram');
const modeOrder = ['movement','voltaic','electrolytic'];
let currentMode = 'movement';
let state = {
  movement: {circuit:true, bridge:true, showElectrons:true, showIons:true, speed:1},
  voltaic: {circuit:false, bridge:true, speed:1},
  electrolytic: {power:false, showElectrons:true, speed:1}
};
let animationTime = 0;
let priorFrame = 0;
let particles = [];
const voltTitle = 'Zn–Cu cell';

const labContent = {
  movement: {
    title:'Follow the charge', description:'Reveal the paths of electrons and ions, then interrupt the circuit or salt bridge to see why both are essential.',
    eyebrow:'ZINC–COPPER / CHARGE MOVEMENT', short:'CHARGE MOVEMENT',
    facts:[
      ['e⁻','Electrons use the wire','Electrons leave the zinc anode and travel through the external circuit toward the copper cathode.'],
      ['±','Ions move internally','The electrolyte carries ions, not a stream of electrons. Salt-bridge NO₃⁻ migrates toward zinc; K⁺ moves toward copper.'],
      ['↔','The salt bridge matters','Oxidation creates Zn²⁺ while reduction consumes Cu²⁺. Ion migration prevents charge imbalance and sustains current.']
    ],
    context:'A Zn–Cu (Daniell) cell in aqueous ZnSO₄ and CuSO₄ with a KNO₃ salt bridge. This is one example of a voltaic cell.',
    oxidation:'Zn(s) → Zn²⁺(aq) + 2e⁻', reduction:'Cu²⁺(aq) + 2e⁻ → Cu(s)', overall:'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)',
    footnote:'Salt-bridge ions maintain electrical neutrality. They do not participate in the overall redox equation.'
  },
  voltaic: {
    title:'Generate electricity', description:'Close the external circuit to power the load through a spontaneous Zn–Cu redox reaction.',
    eyebrow:'VOLTAIC / DANIELL CELL', short:'VOLTAIC CELL',
    facts:[
      ['−','Anode · zinc','Oxidation: the negative Zn electrode releases electrons, producing Zn²⁺ in solution.'],
      ['+','Cathode · copper','Reduction: Cu²⁺ ions receive electrons and are deposited as Cu metal on the positive electrode.'],
      ['⚡','Spontaneous energy transfer','Chemical energy becomes electrical energy. The standard cell potential is about +1.10 V for this Zn–Cu pair.']
    ],
    context:'A Zn–Cu voltaic cell with standard half-cell conditions has E° ≈ +1.10 V. Its actual voltage can vary with temperature and ion concentration.',
    oxidation:'Zn(s) → Zn²⁺(aq) + 2e⁻', reduction:'Cu²⁺(aq) + 2e⁻ → Cu(s)', overall:'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)',
    footnote:'Anode (−): oxidation. Cathode (+): reduction. Electrons flow through the external circuit; ions move inside the electrolytes and salt bridge.'
  },
  electrolytic: {
    title:'Split water with electricity', description:'Switch on the DC source to drive a non-spontaneous redox reaction in acidified water.',
    eyebrow:'ELECTROLYSIS / WATER', short:'ELECTROLYTIC CELL',
    facts:[
      ['−','Cathode · hydrogen','H⁺ gains electrons at the negative cathode. Hydrogen gas (H₂) forms by reduction.'],
      ['+','Anode · oxygen','Water loses electrons at the positive anode. Oxygen gas (O₂) forms by oxidation.'],
      ['2:1','Hydrogen : oxygen','The overall reaction makes twice as much H₂ as O₂ by amount of substance (and by gas volume at equal conditions).']
    ],
    context:'Simplified electrolysis of acidified water using inert electrodes and a DC supply. Sulfuric acid improves conductivity but cancels from the overall reaction.',
    oxidation:'2H₂O(l) → O₂(g) + 4H⁺(aq) + 4e⁻', reduction:'4H⁺(aq) + 4e⁻ → 2H₂(g)', overall:'2H₂O(l) → 2H₂(g) + O₂(g)',
    footnote:'The applied voltage must overcome the non-spontaneous reaction and practical losses. The animations indicate stoichiometry, not measured gas quantities.'
  }
};

const svgHeader = `<defs>
 <linearGradient id="liquidZn" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c8e8f5"/><stop offset="1" stop-color="#a4d4e8"/></linearGradient>
 <linearGradient id="liquidCu" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b8e0ee"/><stop offset="1" stop-color="#8bc9e6"/></linearGradient>
 <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d5f1f9"/><stop offset="1" stop-color="#98d7eb"/></linearGradient>
 <linearGradient id="electrodeZn"><stop stop-color="#91a2b5"/><stop offset=".48" stop-color="#e1e7ec"/><stop offset="1" stop-color="#8e9db3"/></linearGradient>
 <linearGradient id="electrodeCu"><stop stop-color="#b9633e"/><stop offset=".48" stop-color="#f3bf8c"/><stop offset="1" stop-color="#b66a47"/></linearGradient>
 <linearGradient id="electrodePt"><stop stop-color="#7486a2"/><stop offset=".48" stop-color="#e4edfa"/><stop offset="1" stop-color="#8190aa"/></linearGradient>
 <filter id="bulbGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="11"/></filter>
 <filter id="softShadow"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#5b819b" flood-opacity=".15"/></filter>
</defs>`;

function svgText(x,y,text,cls='',anchor='middle') {return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${text}</text>`;}
function pill(x,y,w,h,text,fill='#fff',color='#405e79') { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="11" fill="${fill}" stroke="#d8e6ee"/><text x="${x+w/2}" y="${y+h/2+5}" text-anchor="middle" fill="${color}" font-size="15" font-weight="750">${text}</text>`; }
function dish(x,y,color) {return `<g><rect x="${x}" y="${y}" width="252" height="192" rx="10" fill="#fff" fill-opacity=".12" stroke="#668ea6" stroke-width="5"/><rect x="${x+4}" y="${y+46}" width="244" height="142" rx="4" fill="${color}" fill-opacity=".92"/><path d="M ${x+4} ${y+46} H ${x+248}" stroke="#87cadf" stroke-width="4" opacity=".8"/><path d="M ${x+18} ${y+70} v93" stroke="#fff" stroke-width="4" opacity=".18"/></g>`;}
function ion(x,y,text,fill,stroke) {return `<g transform="translate(${x},${y})"><circle r="18" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text text-anchor="middle" y="5" fill="${stroke}" font-size="12" font-weight="800">${text}</text></g>`;}
function buildGalvanic(mode){
 const s=state[mode]; const running=s.circuit&&s.bridge; const isMovement=mode==='movement';
 const muted = running? '#219d9c':'#7c93a7';
 return `${svgHeader}<style>
 text{font-family:Inter,'Segoe UI',Arial,sans-serif} .lab-label{fill:#48657d;font-weight:800;font-size:15px}.lab-xs{fill:#6f8698;font-weight:650;font-size:12px}.lab-lg{fill:#263f5a;font-weight:900;font-size:21px}.lab-white{fill:#fff;font-weight:800;font-size:14px}
 </style>
 <rect x="20" y="22" width="182" height="36" rx="18" fill="#e7f7f4"/>${svgText(111,45,isMovement?'CHARGE PATHWAYS':'SPONTANEOUS REDOX','lab-xs')}
 ${pill(721,22,174,35,isMovement?'Zn | Zn²⁺ ‖ Cu²⁺ | Cu':'E° ≈ +1.10 V','#fff','#445a91')}
 <g>${dish(92,248,'url(#liquidZn)')}${dish(573,248,'url(#liquidCu)')}</g>
 <g filter="url(#softShadow)"><rect x="181" y="189" width="33" height="206" rx="3" fill="url(#electrodeZn)" stroke="#677b8f" stroke-width="2"/>
 <rect x="694" y="189" width="33" height="206" rx="3" fill="url(#electrodeCu)" stroke="#9b603d" stroke-width="2"/></g>
 ${svgText(205,165,'ANODE (−)','lab-label')}${svgText(711,165,'CATHODE (+)','lab-label')}
 ${svgText(205,419,'ZINC (Zn)','lab-lg')}${svgText(711,419,'COPPER (Cu)','lab-lg')}
 ${svgText(218,452,'ZnSO₄(aq)','lab-label')}${svgText(706,452,'CuSO₄(aq)','lab-label')}
 ${ion(137,348,'Zn²⁺','#ecf6fd','#476f91')}${ion(298,384,'Zn²⁺','#ecf6fd','#476f91')}
 ${ion(625,346,'Cu²⁺','#e9f6fd','#28718a')}${ion(781,382,'Cu²⁺','#e9f6fd','#28718a')}
 <g><path d="M 314 305 V208 Q314 185 341 185 H577 Q604 185 604 208 V305" fill="none" stroke="#7b72bb" stroke-width="23" stroke-linecap="round"/>
 <path d="M 314 305 V208 Q314 185 341 185 H577 Q604 185 604 208 V305" fill="none" stroke="#e9e5fc" stroke-width="16" stroke-linecap="round"/>
 <rect x="377" y="154" width="168" height="26" rx="12" fill="#fff" stroke="#d4cde9"/>
 ${svgText(461,171,'SALT BRIDGE · KNO₃','lab-xs')}</g>
 <g id="saltFlowLabels" opacity="${(s.bridge&&(!isMovement||s.showIons))?1:.22}">
  ${svgText(367,218,'NO₃⁻  ←','lab-xs')}${svgText(550,218,'→  K⁺','lab-xs')}
 </g>
 <path d="M197 189 V102 H433 M487 102 H711 V189" fill="none" stroke="${s.circuit?'#344a6b':'#a7b4c4'}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
 <circle cx="460" cy="102" r="29" fill="${running?'#fff0b7':'#edf3fa'}" stroke="#465c77" stroke-width="5"/>
 ${running?`<circle cx="460" cy="102" r="38" fill="#ffdf73" opacity=".26" filter="url(#bulbGlow)"/>`:''}
 <path d="M452 105 q7 -15 15 0 m-15 0 q7 15 15 0" fill="none" stroke="${running?'#c8942a':'#8c9cab'}" stroke-width="4"/>
 ${svgText(460,52,'EXTERNAL CIRCUIT','lab-label')}${svgText(460,146,running?'LOAD POWERED':'LOAD OFF','lab-xs')}
 <g id="electronLayer"></g><g id="ionLayer"></g>
 <rect x="361" y="475" width="198" height="35" rx="10" fill="${running?'#d9f8ed':'#fff0dc'}" stroke="${running?'#9bdbc9':'#ebd2b1'}"/>
 ${svgText(460,498,running?'e⁻ : Zn → Cu':!s.bridge?'SALT BRIDGE REMOVED':'CIRCUIT OPEN','lab-label')}
 <g>${svgText(205,233,'OXIDATION','lab-xs')}${svgText(711,233,'REDUCTION','lab-xs')}</g>
 `;
}
function buildElectrolytic(){
 const s=state.electrolytic; const powered=s.power;
 return `${svgHeader}<style>text{font-family:Inter,'Segoe UI',Arial,sans-serif}.lab-label{fill:#48657d;font-weight:800;font-size:15px}.lab-xs{fill:#6f8698;font-weight:650;font-size:12px}.lab-lg{fill:#263f5a;font-weight:900;font-size:21px}</style>
 <rect x="20" y="22" width="170" height="36" rx="18" fill="#ebe9ff"/>${svgText(105,45,'ELECTROLYSIS','lab-xs')}
 ${pill(727,22,171,35,'H₂ : O₂ = 2 : 1','#fff','#50608b')}
 <g>
  <path d="M 248 192 V107 H400 M520 107 H677 V192" stroke="${powered?'#4a6484':'#a6b6c4'}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="400" y="75" width="120" height="64" rx="12" fill="${powered?'#594db5':'#c3c7df'}" stroke="#324567" stroke-width="3"/>
  ${svgText(460,99,'DC SUPPLY','','middle')}
  <text x="430" y="127" font-size="26" font-weight="800" fill="white" text-anchor="middle">−</text>
  <text x="487" y="127" font-size="26" font-weight="800" fill="white" text-anchor="middle">+</text>
  ${svgText(460,56,powered?'POWER ON':'POWER OFF','lab-label')}
 </g>
 <rect x="135" y="221" width="646" height="245" rx="18" fill="#fff" fill-opacity=".25" stroke="#668ea6" stroke-width="5"/>
 <rect x="141" y="280" width="634" height="180" rx="8" fill="url(#water)" opacity=".88"/>
 <path d="M141 280 H775" stroke="#65bfcf" stroke-width="5" stroke-opacity=".68"/>
 <path d="M164 307 V430" stroke="white" stroke-opacity=".22" stroke-width="5"/>
 <rect x="229" y="192" width="38" height="228" rx="5" fill="url(#electrodePt)" stroke="#657791" stroke-width="2"/>
 <rect x="658" y="192" width="38" height="228" rx="5" fill="url(#electrodePt)" stroke="#657791" stroke-width="2"/>
 ${svgText(248,173,'CATHODE (−)','lab-label')}${svgText(677,173,'ANODE (+)','lab-label')}
 ${svgText(248,451,'REDUCTION · H₂','lab-label')}${svgText(677,451,'OXIDATION · O₂','lab-label')}
 ${svgText(459,307,'ACIDIFIED WATER','lab-label')}${svgText(459,328,'H₂O + DILUTE H₂SO₄','lab-xs')}
 ${ion(401,365,'H⁺','#fff','#317c9e')}${ion(517,404,'H⁺','#fff','#317c9e')}
 <g id="electrolyticBubbles"></g><g id="electronLayer"></g>
 <rect x="344" y="479" width="229" height="34" rx="10" fill="${powered?'#d9f8ed':'#fff0dc'}" stroke="${powered?'#9bdbc9':'#ebd2b1'}"/>
 ${svgText(459,501,powered?'H₂ &amp; O₂ BEING FORMED':'SWITCH ON DC POWER','lab-label')}
 <g><path d="M280 345 l56 0" stroke="#52a5b9" stroke-width="3" stroke-dasharray="6 5" opacity=".8"/><path d="M280 345 l11 -5 v10 z" fill="#52a5b9"/><text x="320" y="334" font-size="12" font-weight="750" fill="#437990">H⁺</text></g>
 `;
}
function createSvgElement(tag,attrs={}) {const node=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);return node;}
function polyPoint(pts,t) {
  let total=0;const lengths=[];
  for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);lengths.push(l);total+=l;}
  let remain=((t%1)+1)%1*total;
  for(let i=0;i<lengths.length;i++){const l=lengths[i];if(remain<=l){const r=remain/l;return [pts[i][0]+r*(pts[i+1][0]-pts[i][0]),pts[i][1]+r*(pts[i+1][1]-pts[i][1])];}remain-=l;}
  return pts[pts.length-1];
}
function registerElectron(group,pts,phase){const circle=createSvgElement('circle',{r:7,fill:'#fac55f',stroke:'#98783e','stroke-width':2});const label=createSvgElement('text',{'text-anchor':'middle',y:3,'font-size':10,'font-weight':'900',fill:'#5d502f'});label.textContent='−';const wrapper=createSvgElement('g');wrapper.append(circle,label);group.appendChild(wrapper);particles.push({type:'electron',element:wrapper,pts,phase});}
function registerIon(group,pts,phase,sign) {const wrapper=createSvgElement('g');wrapper.appendChild(createSvgElement('circle',{r:12,fill:sign==='+'?'#acf1dd':'#dfd5ff',stroke:sign==='+'?'#45a996':'#7862c2','stroke-width':2}));const label=createSvgElement('text',{'text-anchor':'middle',y:4,'font-size':14,'font-weight':'900',fill:sign==='+'?'#287e70':'#634cb3'});label.textContent=sign;wrapper.append(label);group.append(wrapper);particles.push({type:sign==='+'?'cation':'anion',element:wrapper,pts,phase});}
function registerBubble(group,side,i,phase){const circle=createSvgElement('circle',{cx:0,cy:0,r:side==='hydrogen'?7:6,fill:'#edfaff',stroke:side==='hydrogen'?'#389bc6':'#927ad2','stroke-width':2,opacity:.9});group.appendChild(circle);particles.push({type:side,element:circle,phase,index:i});}
function setupParticles(){particles=[];
 if(currentMode!=='electrolytic'){
   const eLayer=$('electronLayer'),ionLayer=$('ionLayer');
   const ePts=[[197,190],[197,102],[711,102],[711,189]];
   for(let i=0;i<10;i++)registerElectron(eLayer,ePts,i/10);
   for(let i=0;i<4;i++){
     registerIon(ionLayer,[[460,185],[342,185],[314,208],[314,293]],i/4,'−');
     registerIon(ionLayer,[[460,185],[576,185],[604,208],[604,293]],i/4,'+');
   }
 } else {
   const eLayer=$('electronLayer'),bubbles=$('electrolyticBubbles');
   for(let i=0;i<5;i++)registerElectron(eLayer,[[400,107],[248,107],[248,190]],i/5);
   for(let i=0;i<5;i++)registerElectron(eLayer,[[677,192],[677,107],[520,107]],i/5);
   for(let i=0;i<14;i++)registerBubble(bubbles,'hydrogen',i,i/14);
   for(let i=0;i<7;i++)registerBubble(bubbles,'oxygen',i,i/7);
 }
}
function renderDiagram(){svg.innerHTML=currentMode==='electrolytic'?buildElectrolytic():buildGalvanic(currentMode);setupParticles();svg.setAttribute('aria-label',currentMode==='electrolytic'?'Acidified water with DC source, a negative cathode producing H2 and a positive anode producing O2.':'Zinc and copper half-cells connected through an external wire and potassium nitrate salt bridge.');}
function isRunning(){const s=state[currentMode];return currentMode==='electrolytic'?s.power:s.circuit&&s.bridge;}
function updateParticles(){const s=state[currentMode], running=isRunning();
 for(const p of particles){
   const enabled=running && (p.type!=='electron'||(currentMode==='movement'?s.showElectrons:currentMode==='electrolytic'?s.showElectrons:true)) && ((p.type!=='cation'&&p.type!=='anion')||(currentMode==='movement'?s.showIons:true));
   p.element.style.display=enabled?'':'none';if(!enabled)continue;
   if(p.type==='hydrogen'||p.type==='oxygen'){
     const speed=0.000088*s.speed;const t=((animationTime*speed+p.phase)%1);const xx=(p.type==='hydrogen'?248:677)+Math.sin(animationTime*.002+p.index*2.3)*(12+(p.index%3)*6);const yy=427-180*t;
     p.element.setAttribute('cx',String(xx));p.element.setAttribute('cy',String(yy));p.element.setAttribute('opacity',String(Math.min(1,Math.max(.05,(1-t)*3))));
   } else {
     const rate=(p.type==='electron'?0.00011:0.000052)*s.speed;
     const [x,y]=polyPoint(p.pts,animationTime*rate+p.phase);
     p.element.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);
   }
 }
}
function animate(now){const dt=priorFrame?Math.min(now-priorFrame,60):0;priorFrame=now;if(isRunning())animationTime+=dt;updateParticles();requestAnimationFrame(animate);}

function setButtonToggle(label,value,callback){const wrapper=document.createElement('div');wrapper.className='toggle-line';const span=document.createElement('span');span.textContent=label;const button=document.createElement('button');button.type='button';button.className='toggle'+(value?' on':'');button.setAttribute('role','switch');button.setAttribute('aria-checked',String(value));button.setAttribute('aria-label',label);button.addEventListener('click',callback);wrapper.append(span,button);$('controlElements').append(wrapper);}
function makePrimary(label,callback){const b=document.createElement('button');b.type='button';b.className='primary-action';b.textContent=label;b.addEventListener('click',callback);$('controlElements').append(b);}
function makeDual(actions){const wrap=document.createElement('div');wrap.className='button-grid';for(const action of actions){const b=document.createElement('button');b.type='button';b.className='small-action'+(action.selected?' on':'');b.textContent=action.label;b.setAttribute('aria-pressed',String(!!action.selected));b.addEventListener('click',action.callback);wrap.append(b);}$('controlElements').append(wrap);}
function makeSpeed(){const wrap=document.createElement('div');wrap.className='rate-row';const label=document.createElement('label');label.textContent='Animation speed';const group=document.createElement('div');group.className='rate-buttons';for(const n of [1,2,3]){const b=document.createElement('button');b.type='button';b.textContent=n+'×';b.className='rate-button'+(state[currentMode].speed===n?' chosen':'');b.setAttribute('aria-label','Animation speed '+n+' times');b.setAttribute('aria-pressed',String(state[currentMode].speed===n));b.addEventListener('click',()=>{state[currentMode].speed=n;refresh();});group.append(b);}wrap.append(label,group);$('controlElements').append(wrap);}
function refreshControls(){const s=state[currentMode];const container=$('controlElements');container.replaceChildren();
 if(currentMode==='movement'){
   makePrimary(s.circuit?'◼ Open external circuit':'▶ Close external circuit',()=>{s.circuit=!s.circuit;refresh();});
   setButtonToggle('Salt bridge connected',s.bridge,()=>{s.bridge=!s.bridge;refresh();});
   makeDual([{label:s.showElectrons?'✓ Electrons visible':'Show electrons',selected:s.showElectrons,callback:()=>{s.showElectrons=!s.showElectrons;refresh();}},{label:s.showIons?'✓ Ions visible':'Show bridge ions',selected:s.showIons,callback:()=>{s.showIons=!s.showIons;refresh();}}]);
 } else if(currentMode==='voltaic'){
   makePrimary(s.circuit?'◼ Open external circuit':'▶ Complete external circuit',()=>{s.circuit=!s.circuit;refresh();});
   setButtonToggle('Salt bridge connected',s.bridge,()=>{s.bridge=!s.bridge;refresh();});
 } else {
   makePrimary(s.power?'◼ Switch DC power off':'▶ Switch DC power on',()=>{s.power=!s.power;refresh();});
   setButtonToggle('Show electron paths',s.showElectrons,()=>{s.showElectrons=!s.showElectrons;refresh();});
 }
 makeSpeed();
}
function refreshInfo(){const c=labContent[currentMode];const s=state[currentMode];const flowing=isRunning();
 $('labNumber').textContent=String(modeOrder.indexOf(currentMode)+1).padStart(2,'0');
 $('diagramSubhead').textContent=c.eyebrow;
 $('controlTitle').textContent=c.title;
 $('controlDescription').textContent=c.description;
 $('learnNumber').textContent=String(modeOrder.indexOf(currentMode)+1).padStart(2,'0')+' / 03';
 $('indicatorLabel').textContent=flowing?'REACTION ACTIVE':'REACTION PAUSED';
 $('indicatorDot').parentElement.classList.toggle('paused',!flowing);
 $('stateTitle').textContent=flowing?(currentMode==='electrolytic'?'ELECTROLYSIS RUNNING': 'CURRENT FLOWING'):(currentMode==='electrolytic'?'POWER SUPPLY OFF':!s.bridge?'ION PATH INTERRUPTED':'CIRCUIT OPEN');
 $('stateTitle').parentElement.classList.toggle('paused',!flowing);
 let body='',insight='';
 if(currentMode==='movement'){
   body=flowing?'Current is sustained by electron flow through the wire and ion migration through the salt bridge.':!s.bridge?'With the salt bridge removed, charge imbalance prevents sustained current.':'The external electron path is open, so the redox current stops.';
   insight=!s.showElectrons&&!s.showIons?'Both flows are hidden. Enable a layer to trace its route.':s.showElectrons&&!s.showIons?'Electrons move through the external wire—not across the electrolyte.':!s.showElectrons&&s.showIons?'NO₃⁻ migrates toward the Zn anode; K⁺ migrates toward the Cu cathode.':'Two paths, one complete circuit: electrons externally and ions inside the solutions.';
 } else if(currentMode==='voltaic'){
   body=flowing?'The Zn–Cu redox reaction spontaneously powers the load. The salt bridge prevents charge accumulation.':!s.bridge?'Ion movement between compartments is interrupted; sustained current cannot flow.':'The electrodes have a potential difference, but the open circuit has no sustained current.';
   insight='Zn is oxidized at the negative anode; Cu²⁺ is reduced at the positive cathode. E° ≈ +1.10 V under standard conditions.';
 } else {
   body=flowing?'DC power drives a non-spontaneous reaction: H₂ forms at the negative cathode and O₂ at the positive anode.':'No applied electrical energy: this cell does not spontaneously split water.';
   insight='In acidified water, H⁺ gains electrons at the cathode. Water loses electrons at the anode. The gas ratio is 2 H₂ : 1 O₂.';
 }
 $('stateBody').textContent=body;$('insightText').textContent=insight;
 $('legendElectron').textContent=currentMode==='electrolytic'?'e⁻: external wire / DC supply':'e⁻: external circuit';
 $('legendIon').textContent=currentMode==='electrolytic'?'H⁺: electrolyte · H₂ / O₂: gas':'NO₃⁻, K⁺: salt bridge';
 $('diagramNote').textContent='Educational schematic · not to scale';
 $('factGrid').replaceChildren();
 for(const [icon,title,desc] of c.facts){const card=document.createElement('article');card.className='fact-card';const head=document.createElement('div');head.className='fact-head';const symbol=document.createElement('span');symbol.className='fact-icon';symbol.textContent=icon;const heading=document.createElement('strong');heading.textContent=title;head.append(symbol,heading);const p=document.createElement('p');p.textContent=desc;card.append(head,p);$('factGrid').append(card);}
 // Fixed, authored educational strings; never display input or user data.
 const content=$('reactionContent');content.replaceChildren();
 const para=document.createElement('p');para.className='reaction-context';para.textContent=c.context;content.append(para);
 const grid=document.createElement('div');grid.className='reaction-rows';
 for(const [label,equation] of [['OXIDATION · ANODE',c.oxidation],['REDUCTION · CATHODE',c.reduction]]){
   const row=document.createElement('div');row.className='reaction-row';const cap=document.createElement('span');cap.textContent=label;const val=document.createElement('strong');val.textContent=equation;row.append(cap,val);grid.append(row);
 }
 const overall=document.createElement('div');overall.className='reaction-overall';const olabel=document.createElement('span');olabel.textContent='OVERALL REACTION';const oval=document.createElement('strong');oval.textContent=c.overall;overall.append(olabel,oval);const foot=document.createElement('p');foot.className='reaction-footnote';foot.textContent=c.footnote;content.append(grid,overall,foot);
}
function refresh(){renderDiagram();refreshControls();refreshInfo();}
function changeMode(mode){if(!modeOrder.includes(mode))return;currentMode=mode;animationTime=0;for(const tab of document.querySelectorAll('.experiment-tab')){const active=tab.dataset.mode===mode;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}$('labPanel').setAttribute('aria-labelledby','tab-'+mode);$('reactionDetails').open=false;refresh();}
for(const tab of document.querySelectorAll('.experiment-tab'))tab.addEventListener('click',()=>changeMode(tab.dataset.mode));
$('tab-movement').parentElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=modeOrder.indexOf(currentMode);const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;changeMode(modeOrder[next]);$('tab-'+currentMode).focus();});
$('resetButton').addEventListener('click',()=>{if(currentMode==='movement')state.movement={circuit:true,bridge:true,showElectrons:true,showIons:true,speed:1};else if(currentMode==='voltaic')state.voltaic={circuit:false,bridge:true,speed:1};else state.electrolytic={power:false,showElectrons:true,speed:1};animationTime=0;refresh();});
$('presentButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{ /* fullscreen depends on browser permissions */ }});
changeMode('movement');
requestAnimationFrame(animate);
