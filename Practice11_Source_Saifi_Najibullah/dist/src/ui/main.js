import {ROOMS,EQUIPMENT} from '../data/rooms.js'; import {NOW,NOW_LABEL} from '../config.js'; import {createStore} from '../state/store.js'; import {roomCard,bookings,status,timeRow,esc} from './render.js'; import {explainAvailability} from '../ai/explain.js'; import {createMockAdapter,createSlowAdapter,createFailingAdapter} from '../ai/adapters.js'; import {explainPanel,explainSignature} from './explain-view.js';
const app=document.querySelector('#app'); const store=createStore({rooms:ROOMS,now:NOW});
const demo=new URLSearchParams(location.search);
// Demo hook: ?ai=slow|fail|none exercises the failure paths. Default is the mock adapter.
const ADAPTERS={slow:()=>createSlowAdapter(),fail:()=>createFailingAdapter(),none:()=>null};
const adapter=(ADAPTERS[demo.get('ai')]||(()=>createMockAdapter({delayMs:350})))();
const EXPLAIN_TIMEOUT_MS=demo.get('ai')==='slow'?600:3000;
let ai={status:'idle',sig:null,result:null}; let token=0;
if(demo.has('attendees')) store.setAttendees(demo.get('attendees'));
for(const item of (demo.get('equipment')||'').split(',').filter(Boolean)) store.toggleEquipment(item);
if(demo.has('room')) store.selectRoom(demo.get('room'));
if(demo.has('start')||demo.has('end')) store.setTime(demo.get('start')||'11:00',demo.get('end')||'12:00');
if(demo.get('check')==='1') store.check();
function render(view){ const {state,matching,room,availability}=view; const sig=availability&&room?explainSignature(room.id,state.start,state.end,availability.code):null; const aiView=ai.sig===sig?ai:{status:'idle'}; app.innerHTML=`<header class="hero"><div><p class="eyebrow">CAMPUSPULSE / SMART CAMPUS</p><div class="brand-row"><span class="cp-mark" aria-hidden="true">CP</span><h1>Room Scout</h1></div><p>Find a room that fits your group, equipment and time window.</p></div><div class="clock"><span>SIMULATED NOW</span><strong>${NOW_LABEL}</strong><small>Max 120 min</small></div></header><main class="layout"><aside class="filters panel"><h2>1. Set requirements</h2><label>Attendees<input id="attendees" type="number" min="1" value="${state.attendees}"></label><fieldset><legend>Required equipment</legend>${EQUIPMENT.map(x=>`<label class="chip"><input type="checkbox" data-eq="${x}" ${state.equipment.includes(x)?'checked':''}><span>${x}</span></label>`).join('')}</fieldset><div class="match-count"><strong>${matching.length}</strong><span>matching room${matching.length===1?'':'s'}</span></div></aside><section class="rooms panel"><div class="section-head"><div><h2>2. Choose a room</h2><p>Only rooms matching every selected requirement appear.</p></div></div><div class="room-grid">${matching.length?matching.map(r=>roomCard(r,r.id===state.selectedRoomId)).join(''):'<div class="empty"><strong>No rooms match</strong><span>Reduce attendees or remove an equipment requirement.</span></div>'}</div></section><section class="checker panel"><h2>3. Check availability</h2>${room?`<div class="selected-summary"><div><span>Selected room</span><strong>${esc(room.name)}</strong></div><span class="capacity">${room.capacity} seats</span></div>${timeRow(state)}<button id="check" class="primary">Check availability</button>${status(availability)}${explainPanel(availability,aiView)}<div class="bookings"><h3>Existing bookings</h3><ul>${bookings(room)}</ul></div>`:'<div class="empty tall"><strong>No room selected</strong><span>Adjust the filters to reveal a room.</span></div>'}</section></main><footer>Fictional classroom data · No login · No database · No live API</footer>`;
  document.querySelector('#explain')?.addEventListener('click',onExplain); document.querySelector('#attendees')?.addEventListener('input',e=>store.setAttendees(e.target.value)); document.querySelectorAll('[data-eq]').forEach(el=>el.addEventListener('change',()=>store.toggleEquipment(el.dataset.eq))); document.querySelectorAll('[data-room]').forEach(el=>el.addEventListener('click',()=>store.selectRoom(el.dataset.room))); document.querySelector('#check')?.addEventListener('click',()=>{store.setTime(document.querySelector('#start').value,document.querySelector('#end').value);store.check();});
}
store.subscribe(render);
async function onExplain(){
  const v=store.getView(); if(!v.availability||!v.room) return;
  const sig=explainSignature(v.room.id,v.state.start,v.state.end,v.availability.code); const mine=++token;
  ai={status:'loading',sig,result:null}; render(store.getView());
  const result=await explainAvailability({roomId:v.room.id,start:v.state.start,end:v.state.end,isAvailable:v.availability.available,reasonCode:v.availability.code},{rooms:ROOMS,now:NOW,adapter,timeoutMs:EXPLAIN_TIMEOUT_MS});
  if(mine!==token) return;
  ai={status:'done',sig,result}; render(store.getView());
}
if(demo.get('explain')==='1') setTimeout(onExplain,0);
