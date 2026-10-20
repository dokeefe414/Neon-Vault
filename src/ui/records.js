import {$,escapeHtml,money} from '../core/utils.js';
import {getState,getMeta} from '../core/store.js';
const serializeCards=cards=>Array.isArray(cards)?cards.map(c=>`<span class="playing-card ${'♥♦'.includes(c.s)?'red':''}">${escapeHtml(c.r)}${escapeHtml(c.s)}</span>`).join(''):'';
export function renderRecords(){
 const records=[...(getState().history||[])].reverse();
 const meta=getMeta();
 $('content').innerHTML=`<section class="v5-page"><div class="v5-kicker">PLAYER RECORDS</div><h2>Game replays & records</h2><p class="hint">Review recorded results and Blackjack decision sequences. Existing older results may not contain card-by-card detail.</p><div class="v5-metrics"><article class="pro-panel"><div class="pro-kicker">TOTAL RESULTS</div><div class="v5-metric-value">${records.length}</div></article><article class="pro-panel"><div class="pro-kicker">LARGEST WAGER</div><div class="v5-metric-value">${money(records.reduce((n,x)=>Math.max(n,x.bet||0),0))}</div></article><article class="pro-panel"><div class="pro-kicker">SAVED SESSIONS</div><div class="v5-metric-value">${(meta.sessions||[]).length}</div></article></div><div class="pro-panel"><label for="recordFilter"><strong>Filter by game</strong></label> <select id="recordFilter"><option value="all">All games</option>${['Blackjack','Roulette','Slots','Dice','Trivia','Baccarat','Video Poker'].map(g=>`<option value="${g}">${g}</option>`).join('')}</select><div id="recordList"></div><button class="secondary" id="moreRecords">SHOW MORE</button></div><div class="pro-panel"><h3>Last 10 saved sessions</h3><div class="nv-session-list">${(meta.sessions||[]).slice(-10).reverse().map(s=>`<div class="nv-record"><span>${new Date(s.startedAt).toLocaleString()}</span><strong class="${s.net>=0?'positive':'negative'}">${money(s.net)}</strong><small>${s.settled||0} results · ${Math.floor((s.durationMs||0)/60000)} min</small></div>`).join('')||'<p class="hint">Finished sessions will appear here.</p>'}</div></div><div id="recordDetail" class="pro-panel" hidden></div></section>`;
 let shown=20,filter='all',filtered=[];
 const redraw=()=>{
  filtered=records.filter(x=>filter==='all'||x.game?.startsWith(filter));
  $('recordList').innerHTML=filtered.slice(0,shown).map((x,i)=>`<button class="nv-record nv-record-button" data-record="${i}"><span><strong>${escapeHtml(x.game)}</strong><small>${new Date(x.at).toLocaleString()}</small></span><span>${money(x.bet)} wager</span><strong class="${x.net>=0?'positive':'negative'}">${x.net>=0?'+':''}${money(x.net)}</strong><span class="nv-record-arrow">DETAILS →</span></button>`).join('')||'<p class="hint">No results found for this game.</p>';
  $('moreRecords').hidden=filtered.length<=shown;
  document.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>detail(filtered[Number(b.dataset.record)]));
 };
 const detail=x=>{
  if(!x)return;
  let body='';
  if(x.replay?.initialPlayer){
    const r=x.replay;
    body=`<h4>Blackjack hand replay</h4><div class="nv-replay-hand"><strong>Initial player</strong><div class="hand">${serializeCards(r.initialPlayer)}</div><strong>Initial dealer</strong><div class="hand">${serializeCards(r.initialDealer)}</div></div><h4>Decisions</h4><ol class="nv-decision-list">${(r.actions||[]).map(a=>`<li>${escapeHtml(a.move)}${Number.isInteger(a.hand)?` · Hand ${a.hand+1}`:''}</li>`).join('')||'<li>Immediate settlement (natural or dealer blackjack)</li>'}</ol><h4>Final dealer</h4><div class="hand">${serializeCards(r.finalDealer)}</div><h4>Final player hand(s)</h4>${(r.finalHands||[]).map((h,i)=>`<p>Hand ${i+1} · ${money(h.bet)}</p><div class="hand">${serializeCards(h.cards)}</div>`).join('')}`;
  }else if(x.game==='Baccarat'&&x.player){
    body=`<h4>Baccarat deal</h4><p>Player: ${x.playerTotal} · Banker: ${x.bankerTotal} · Winner: ${escapeHtml(x.winner)}</p><div class="hand">${serializeCards(x.player)}</div><div class="hand">${serializeCards(x.banker)}</div>`;
  }else if(x.game==='Video Poker'&&x.initial){
    body=`<h4>Video Poker draw replay</h4><p>Original cards</p><div class="hand">${serializeCards(x.initial)}</div><p>Held positions: ${(x.hold||[]).map((v,i)=>v?i+1:null).filter(Boolean).join(', ')||'None'}</p><p>Final cards</p><div class="hand">${serializeCards(x.final)}</div>`;
  }else if(x.game==='Roulette'){
    body=`<p>Wager: ${escapeHtml(x.betType||'')} ${x.betValue??''}. Wheel landed on <strong>${x.result}</strong>.</p>`;
  }else if(x.game?.startsWith('Slots')){
    body=x.grid?`<div class="slot-grid nv-record-slots">${x.grid.flat().map(symbol=>`<div class="slot-cell">${escapeHtml(symbol)}</div>`).join('')}</div><p>${x.scatters||0} scatter symbols. ${x.winningLines?.length||0} winning lines.</p>`:'<p>Legacy spin record (reel symbols not recorded).</p>';
  }else if(x.game==='Dice')body=`<p>Rolled ${x.die1||'?'} + ${x.die2||'?'}; selected ${escapeHtml(x.prediction||'unknown')}.</p>`;
  else body='<p>Summary-only result; detailed replay was not recorded for this older entry.</p>';
  const el=$('recordDetail');
  el.hidden=false;el.innerHTML=`<div class="section-head"><h3>${escapeHtml(x.game)} · ${new Date(x.at).toLocaleString()}</h3><button class="secondary" id="closeRecordDetail">CLOSE</button></div><p>Wager <strong>${money(x.bet)}</strong> · Returned <strong>${money(x.payout)}</strong> · Net <strong class="${x.net>=0?'positive':'negative'}">${x.net>=0?'+':''}${money(x.net)}</strong></p>${body}`;
  $('closeRecordDetail').onclick=()=>{el.hidden=true;};
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 $('recordFilter').onchange=e=>{filter=e.target.value;shown=20;$('recordDetail').hidden=true;redraw();};
 $('moreRecords').onclick=()=>{shown+=20;redraw();};
 redraw();
}
