import {$,escapeHtml,money} from '../core/utils.js';
const CONFIG_KEY='neon-vault-cloud-origin-v6', TOKEN_KEY='neon-vault-cloud-token-v6';
const getOrigin=()=>localStorage.getItem(CONFIG_KEY)||'';
let base=getOrigin(),token=sessionStorage.getItem(TOKEN_KEY)||'',account=null,tab='lobby',catalog=null;
let rounds={},requesting=false;
const esc=v=>escapeHtml(String(v??''));
const format=n=>money(Number(n)||0);
const newKey=()=>crypto.randomUUID();
function cleanOrigin(input){
 const url=new URL(input.trim());
 const localhost=['localhost','127.0.0.1'].includes(url.hostname);
 if(url.protocol!=='https:'&&!(localhost&&url.protocol==='http:'))throw Error('Use HTTPS, or localhost for development.');
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Enter only the API origin, without credentials or a path.');
 return url.origin;
}
async function api(path,body,method='POST'){
 if(!base)throw Error('Configure your Cloud API URL first.');
 const c=new AbortController(),timeout=setTimeout(()=>c.abort(),15000);
 try{
  const response=await fetch(base+'/api/v1'+path,{
   method:body===undefined?'GET':method,
   headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{'Authorization':'Bearer '+token}:{})},
   ...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:c.signal,cache:'no-store',
  });
  let data;try{data=await response.json();}catch{throw Error('Cloud service returned an invalid response.');}
  if(!response.ok){
   if(response.status===401){token='';account=null;sessionStorage.removeItem(TOKEN_KEY);}
   const message=typeof data.detail==='string'?data.detail:'Request failed ('+response.status+').';
   throw Error(message);
  }
  return data;
 }catch(error){
  if(error.name==='AbortError')throw Error('Connection timed out. Check the API or try again.');
  throw error;
 }finally{clearTimeout(timeout);}
}
const notice=msg=>{const el=$('cloudNotice');if(el){el.textContent=msg;el.hidden=false;}};
const safeTask=fn=>async()=>{if(requesting)return;requesting=true;try{await fn();}catch(error){notice(error.message||'Cloud request failed.');}finally{requesting=false;}};
function shell(){
 $('content').innerHTML=`<section class="cloud-page v5-page"><div class="cloud-topline"><span class="pill">ONLINE VAULT · v6.0</span><span class="cloud-live">${account?'ACCOUNT MODE · VERIFIED RESULTS':'GUEST PLAY REMAINS AVAILABLE'}</span></div><h2>NEON VAULT Online</h2><p class="hint">Server-controlled fictional credits, verified results, and accounts. No purchases, withdrawals, or prizes. Local guest saves and online wallets are deliberately separate.</p><div id="cloudNotice" class="cloud-alert" role="alert" hidden></div><div id="cloudBody"></div></section>`;
}
function configUI(){
 shell();
 $('cloudBody').innerHTML=`<div class="pro-panel cloud-setup"><div class="pro-kicker">CLOUD SERVICE CONNECTION</div><h3>Connect a trusted v6 server</h3><p>Your website is ready for the cloud backend, but online accounts cannot work until the FastAPI service is hosted. Use only an HTTPS service you control, or localhost for development.</p><form id="cloudConfigForm" class="cloud-form"><label>API origin (HTTPS)<input id="cloudOrigin" type="url" placeholder="https://your-api.example.com" value="${esc(base)}" autocomplete="url" required></label><button class="primary" type="submit">CONNECT API →</button></form><p class="hint">No secret, password, or browser-local bankroll is imported during connection. See the repository's V6-DEPLOYMENT.md for deployment and DNS/TLS setup.</p></div>`;
 $('cloudConfigForm').onsubmit=async event=>{event.preventDefault();try{
  const next=cleanOrigin($('cloudOrigin').value);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  let response;
  try{response=await fetch(next+'/healthz',{signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timer);}
  if(!response.ok||!(await response.json()).version?.startsWith('6.'))throw Error('This address does not expose a NEON VAULT v6 API.');
  base=next;token='';account=null;catalog=null;sessionStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(CONFIG_KEY,base);authUI();
 }catch(error){notice(error.message||'Cannot connect to the cloud API.');}};
}
function authUI(){
 shell();
 $('cloudBody').innerHTML=`<div class="cloud-auth-grid"><div class="pro-panel"><div class="pro-kicker">SIGN IN</div><h3>Welcome back</h3><form id="cloudLogin" class="cloud-form"><label>Username<input name="username" autocomplete="username" minlength="3" maxlength="24" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="12" maxlength="128" required></label><button class="primary" type="submit">SIGN IN</button></form></div><div class="pro-panel"><div class="pro-kicker">CREATE ACCOUNT</div><h3>Join NEON VAULT</h3><form id="cloudRegister" class="cloud-form"><label>Username<input name="username" autocomplete="username" pattern="[a-zA-Z][a-zA-Z0-9_]{2,23}" minlength="3" maxlength="24" required></label><label>Password (12+ characters)<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><button class="secondary" type="submit">CREATE ONLINE ACCOUNT</button></form><p class="hint">Accounts start with $1,000 in fictional credits. Existing guest winnings, XP, and editable browser saves do not transfer.</p></div></div><p class="hint">Connected to ${esc(base)} · <button class="linklike" id="changeCloudServer">Change server</button></p>`;
 for(const [form,endpoint] of [['cloudLogin','/auth/login'],['cloudRegister','/auth/register']]){
  $(form).onsubmit=async e=>{e.preventDefault();await safeTask(async()=>{
   const data=Object.fromEntries(new FormData(e.target));
   const response=await api(endpoint,data);
   token=response.token;sessionStorage.setItem(TOKEN_KEY,token);
   account=response.profile;await loadOnline();
  })();};
 }
 $('changeCloudServer').onclick=()=>{localStorage.removeItem(CONFIG_KEY);sessionStorage.removeItem(TOKEN_KEY);base='';token='';account=null;configUI();};
}
async function loadOnline(){
 try{
  account=await api('/me');catalog=await api('/games/catalog');
  const active=await api('/rounds/active');
  rounds={};for(const entry of active.rounds||[])rounds[entry.game]=entry;
  if(!account)throw Error('Unable to load account');
  dashboard();
 }catch(error){if(!token){authUI();return;}configUI();notice(error.message);}
}
function navigation(){
 shell();
 $('cloudBody').innerHTML=`<div class="cloud-stats"><div class="pro-panel"><div class="pro-kicker">ONLINE WALLET</div><strong class="cloud-total">${format(account.balance)}</strong><p class="hint">Fictional credits, controlled by the server</p></div><div class="pro-panel"><div class="pro-kicker">VERIFIED XP</div><strong class="cloud-total">${account.xp}</strong><p class="hint">${account.style_tokens} cosmetic tokens · ${esc(account.username)}</p></div></div><div class="cloud-tabs" role="navigation" aria-label="Online Vault"><button data-cloud-tab="lobby">Games</button><button data-cloud-tab="records">Records</button><button data-cloud-tab="leaderboard">Leaderboard</button><button data-cloud-tab="rewards">Rewards</button><button data-cloud-tab="profile">Profile</button><button id="cloudSignout">Sign out</button></div><div id="cloudPanel"></div>`;
 document.querySelectorAll('[data-cloud-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.cloudTab===tab);b.onclick=()=>{tab=b.dataset.cloudTab;dashboard();};});
 $('cloudSignout').onclick=safeTask(async()=>{await api('/auth/logout',{});token='';account=null;rounds={};sessionStorage.removeItem(TOKEN_KEY);authUI();});
}
async function dashboard(){
 navigation();
 try{
  if(tab==='lobby')gamesUI();
  else if(tab==='leaderboard')await leaderboardUI();
  else if(tab==='records')await recordsUI();
  else if(tab==='rewards')await rewardsUI();
  else if(tab==='profile')profileUI();
 }catch(e){notice(e.message||'Could not load Cloud data.');}
}
let game='dice',selection='high',bet=5,hold=[false,false,false,false,false],category='General';
function updateAccount(result){if(result&&Number.isSafeInteger(result.balance)){account.balance=result.balance;account.xp=result.xp;account.style_tokens=result.style_tokens;}}
const cardHtml=c=>`<span class="playing-card ${'♥♦'.includes(c.s)?'red':''}">${esc(c.r)}${esc(c.s)}</span>`;
function cardStrip(cards){return `<div class="hand cloud-card-row">${(cards||[]).map(cardHtml).join('')}</div>`;}
function gamesUI(){
 $('cloudPanel').innerHTML=`<div class="cloud-game-tabs">${[['dice','Dice'],['roulette','Roulette'],['slots','Slots'],['baccarat','Baccarat'],['blackjack','Blackjack'],['poker','Video Poker'],['trivia','Trivia Rescue']].map(([id,label])=>`<button class="secondary ${game===id?'active':''}" data-cloud-game="${id}">${label}</button>`).join('')}</div><div id="cloudGame"></div>`;
 document.querySelectorAll('[data-cloud-game]').forEach(b=>b.onclick=()=>{game=b.dataset.cloudGame;selection={dice:'high',roulette:'red',baccarat:'banker'}[game]||selection;drawGame();});
 drawGame();
}
function drawGame(){
 const el=$('cloudGame');if(!el)return;
 if(game==='blackjack'){drawBlackjack();return;}
 if(game==='poker'){drawPoker();return;}
 if(game==='trivia'){drawTrivia();return;}
 const bets={dice:[['high','High: 8–12'],['low','Low: 2–6']],
  roulette:[['red','Red'],['black','Black'],['odd','Odd'],['even','Even'],['low','1–18'],['high','19–36'],['dozen1','First dozen'],['dozen2','Second dozen'],['dozen3','Third dozen'],['column1','Column 1'],['column2','Column 2'],['column3','Column 3'],['number','Exact number']],
  baccarat:[['banker','Banker'],['player','Player'],['tie','Tie']]}[game]||[];
 if(game==='dice'&&!['high','low'].includes(selection))selection='high';
 if(game==='roulette'&&!bets.some(([v])=>v===selection))selection='red';
 if(game==='baccarat'&&!['banker','player','tie'].includes(selection))selection='banker';
 el.innerHTML=`<div class="pro-panel cloud-game-panel"><h3>${esc(game.toUpperCase())}</h3><p class="hint">All random outcomes and payouts are determined by the server. Fictional credits only.</p><form id="cloudInstant" class="cloud-form"><label>Wager ($)<input id="cloudBet" type="number" min="1" max="10000" step="1" value="${bet}" required></label>${bets.length?`<label>Selection<select id="cloudSelection">${bets.map(([id,t])=>`<option value="${id}" ${selection===id?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`:''}<label id="cloudNumberField" ${game==='roulette'&&selection==='number'?'':'hidden'}>Number (0–36)<input id="cloudNumber" type="number" min="0" max="36" value="17" step="1"></label><button class="primary" type="submit">PLAY VERIFIED ${esc(game.toUpperCase())}</button></form><div class="cloud-result" id="cloudResult" role="status"></div></div>`;
 const pick=$('cloudSelection');
 if(pick)pick.onchange=()=>{selection=pick.value;if($('cloudNumberField'))$('cloudNumberField').hidden=selection!=='number';};
 $('cloudInstant').onsubmit=async event=>{event.preventDefault();await safeTask(async()=>{
  const amount=Number($('cloudBet').value);
  if(!Number.isSafeInteger(amount)||amount<1||amount>10000)throw Error('Wager must be a whole number between $1 and $10,000.');
  bet=amount;selection=pick?.value||'';
  const value=game==='roulette'&&selection==='number'?Number($('cloudNumber').value):null;
  const result=await api('/games/play',{key:newKey(),game,bet:bet*100,selection,value});
  updateAccount(result);showInstant(result);
 })();};
}
function showInstant(result){
 const el=$('cloudResult');if(!el)return;
 el.innerHTML=`<div class="v52-result-banner"><div><small>SERVER-VERIFIED RESULT</small><strong>${esc(result.game)} · ${result.net>=0?'+':''}${format(result.net)}</strong><p class="hint">Online wallet: ${format(result.balance)}</p></div></div><pre class="cloud-json">${esc(JSON.stringify(result.result,null,2))}</pre>`;
 const wallet=$('cloudBody .cloud-total');if(wallet)wallet.textContent=format(result.balance);
}
function drawPoker(){
 const current=rounds['Video Poker'],active=!!current;
 $('cloudGame').innerHTML=`<div class="pro-panel cloud-game-panel"><h3>Jacks or Better · Online</h3><p class="hint">The wager is reserved by the server at Deal. Abandoning a dealt hand forfeits the bet. A browser reload restores your held cards.</p><div class="cloud-form"><label>Wager ($)<input id="cloudPokerBet" type="number" min="1" max="10000" value="${bet}" ${active?'disabled':''}></label>${active?'<button class="primary" id="cloudDraw">DRAW CARDS</button><button class="secondary" id="cloudPokerForfeit">FORFEIT RESERVED BET</button>':'<button class="primary" id="cloudPokerDeal">DEAL FIVE CARDS</button>'}</div><div class="nv-poker-hand" id="cloudPokerHand"></div><div id="cloudResult" role="status"></div></div>`;
 if(active){
  $('cloudPokerHand').innerHTML=current.hand.map((c,i)=>`<button class="nv-poker-card ${hold[i]?'held':''}" data-cloud-hold="${i}" aria-pressed="${hold[i]}">${cardHtml(c)}<small>${hold[i]?'HELD':'HOLD'}</small></button>`).join('');
  document.querySelectorAll('[data-cloud-hold]').forEach(b=>b.onclick=()=>{hold[Number(b.dataset.cloudHold)]=!hold[Number(b.dataset.cloudHold)];drawPoker();});
  $('cloudDraw').onclick=safeTask(async()=>{
   const result=await api('/poker/draw',{key:newKey(),round_id:current.round_id,hold});
   delete rounds['Video Poker'];hold=[false,false,false,false,false];updateAccount(result);drawPoker();showInstant({...result,game:'Video Poker'});
  });
  $('cloudPokerForfeit').onclick=safeTask(async()=>{
   if(!confirm('Forfeit your reserved online Video Poker wager?'))return;
   const result=await api('/poker/forfeit',{key:newKey(),round_id:current.round_id});
   delete rounds['Video Poker'];hold=[false,false,false,false,false];updateAccount(result);drawPoker();notice('The reserved wager was forfeited.');
  });
 }else $('cloudPokerDeal').onclick=safeTask(async()=>{
  const amount=Number($('cloudPokerBet').value);
  if(!Number.isSafeInteger(amount)||amount<1||amount>10000)throw Error('Invalid bet.');
  bet=amount;const result=await api('/poker/deal',{key:newKey(),bet:amount*100});
  rounds['Video Poker']={game:'Video Poker',...result};hold=[false,false,false,false,false];updateAccount(result);drawPoker();
 });
}
function drawBlackjack(){
 const current=rounds.Blackjack,active=!!current&&!current.table?.finished;
 $('cloudGame').innerHTML=`<div class="pro-panel cloud-game-panel"><h3>Blackjack · Online</h3><p class="hint">Server-controlled six-deck Blackjack. Hit, stand, double, split, surrender and insurance are supported. Online side bets are not offered yet.</p><label>Wager ($)<input id="cloudBJBet" type="number" min="1" max="10000" value="${bet}" ${active?'disabled':''}></label><div class="felt cloud-bj-table" id="cloudBJTable"></div><div class="cloud-actions" id="cloudBJActions"></div><div id="cloudResult" role="status"></div></div>`;
 if(!current){
  $('cloudBJActions').innerHTML='<button class="primary" id="cloudBJStart">DEAL ONLINE</button>';
  $('cloudBJStart').onclick=safeTask(async()=>{
   const amount=Number($('cloudBJBet').value);if(!Number.isSafeInteger(amount)||amount<1||amount>10000)throw Error('Invalid wager');
   bet=amount;const r=await api('/blackjack/start',{key:newKey(),bet:amount*100});
   updateAccount(r);rounds.Blackjack=r;drawBlackjack();
  });
  return;
 }
 const table=current.table;
 const dealer=cardStrip(table.dealer)+(table.dealer_hidden?'<span class="playing-card back">◆</span>':'');
 $('cloudBJTable').innerHTML=`<div class="v52-table-label">DEALER</div>${dealer}<div class="v52-table-divider"></div>${table.hands.map((h,i)=>`<div class="cloud-hand ${i===table.active?'active':''}"><strong>HAND ${i+1} · ${h.total} · ${format(h.bet)}${h.bust?' · BUST':''}</strong>${cardStrip(h.cards)}</div>`).join('')}`;
 if(table.finished){
  const out=table.outcomes||[];
  $('cloudResult').innerHTML=`<div class="v52-result-banner"><strong>Round settled</strong><p>${out.map(x=>`${esc(x.reason)}: ${format(x.payout)}`).join(' · ')}</p></div>`;
  $('cloudBJActions').innerHTML='<button class="primary" id="cloudNewBJ">NEW ROUND</button>';
  $('cloudNewBJ').onclick=()=>{delete rounds.Blackjack;drawBlackjack();};
  return;
 }
 $('cloudBJActions').innerHTML=`<div class="controls">${table.available_actions.map(action=>`<button class="secondary" data-cloud-action="${action}">${esc(action.toUpperCase())}</button>`).join('')}<button class="danger" id="cloudBJForfeit">FORFEIT</button></div>`;
 document.querySelectorAll('[data-cloud-action]').forEach(b=>b.onclick=safeTask(async()=>{
  const r=await api('/blackjack/action',{key:newKey(),round_id:current.round_id,action:b.dataset.cloudAction});
  updateAccount(r);rounds.Blackjack=r;drawBlackjack();
 }));
 $('cloudBJForfeit').onclick=safeTask(async()=>{
  if(!confirm('Forfeit your unfinished Blackjack wager?'))return;
  const result=await api('/blackjack/forfeit',{key:newKey(),round_id:current.round_id});
  updateAccount(result);delete rounds.Blackjack;drawBlackjack();notice('Unfinished round forfeited.');
 });
}
function drawTrivia(){
 const current=rounds.Trivia;
 const categories=Object.entries(catalog?.trivia?.categories||{General:0});
 $('cloudGame').innerHTML=`<div class="pro-panel cloud-game-panel"><h3>Trivia Rescue · Verified</h3><p class="hint">The server owns the correct answers and streak balance; each specialty has its complete question bank.</p><div class="cloud-form"><label>Category<select id="cloudCategory" ${current?'disabled':''}>${categories.map(([name,count])=>`<option value="${esc(name)}" ${category===name?'selected':''}>${esc(name)} (${count})</option>`).join('')}</select></label>${current?'<button class="secondary" id="cloudTriviaAbandon">START A NEW RUN · LOSE UNCLAIMED POT</button>':'<button class="primary" id="cloudTriviaStart">START VERIFIED TRIVIA</button>'}</div><div id="cloudTriviaQ"></div><div id="cloudResult" role="status"></div></div>`;
 if(!current){
  $('cloudTriviaStart').onclick=safeTask(async()=>{category=$('cloudCategory').value;
   rounds.Trivia=await api('/trivia/start',{key:newKey(),category});updateAccount(rounds.Trivia);drawTrivia();
  });
  return;
 }
 $('cloudCategory').value=current.category;
 $('cloudTriviaQ').innerHTML=`<div class="pro-kicker">QUESTION ${current.index} OF 10 · POT ${format(current.pot)}</div><h3>${esc(current.question.q)}</h3><div class="cloud-answer-grid">${current.question.a.map((answer,i)=>`<button class="secondary" data-cloud-answer="${i}">${esc(answer)}</button>`).join('')}</div>${current.pot?'<button class="primary" id="cloudTriviaCashout">CASH OUT THE POT</button>':''}`;
 document.querySelectorAll('[data-cloud-answer]').forEach(b=>b.onclick=safeTask(async()=>{
  const response=await api('/trivia/answer',{key:newKey(),round_id:current.round_id,choice:Number(b.dataset.cloudAnswer)});
  updateAccount(response);
  if(response.finished){delete rounds.Trivia;drawTrivia();notice(response.correct?'Completed streak! '+format(response.pot)+' awarded.':'Wrong answer. Correct: '+response.correct_answer);}
  else{rounds.Trivia=response;drawTrivia();}
 }));
 if(current.pot)$('cloudTriviaCashout').onclick=safeTask(async()=>{
  const r=await api('/trivia/cashout',{key:newKey(),round_id:current.round_id});updateAccount(r);
  delete rounds.Trivia;drawTrivia();notice('Cashed out '+format(r.payout)+' of fictional credits.');
 });
 $('cloudTriviaAbandon').onclick=safeTask(async()=>{
  if(!confirm('Start another run and forfeit your uncashed pot?'))return;
  category=$('cloudCategory').value;
  rounds.Trivia=await api('/trivia/start',{key:newKey(),category});updateAccount(rounds.Trivia);drawTrivia();
 });
}
async function leaderboardUI(){
 const r=await api('/leaderboard');
 $('cloudPanel').innerHTML=`<div class="pro-panel"><h3>Verified XP Leaderboard</h3><p class="hint">Ranks use only server-issued XP. Browser guest wallets cannot be submitted.</p><div class="nv-session-list">${r.players.map(p=>`<div class="nv-record"><strong>#${p.rank} · ${esc(p.avatar)} ${esc(p.display_name)}</strong><small>@${esc(p.username)}</small><strong>${p.xp} XP</strong></div>`).join('')||'<p class="hint">No players yet.</p>'}</div></div>`;
}
async function recordsUI(){
 const r=await api('/history?limit=50');
 $('cloudPanel').innerHTML=`<div class="pro-panel"><h3>Server-verified game records</h3><p class="hint">Immutable completed outcomes; never based on imported guest saves.</p>${r.rounds.map(x=>`<details class="nv-record"><summary><strong>${esc(x.game)}</strong> · ${format(x.wager)} wager · <span class="${x.net>=0?'positive':'negative'}">${x.net>=0?'+':''}${format(x.net)}</span></summary><pre class="cloud-json">${esc(JSON.stringify(x.result,null,2))}</pre></details>`).join('')||'<p class="hint">Play a verified game to create your first record.</p>'}</div>`;
}
async function rewardsUI(){
 const r=await api('/rewards');
 const shop=r.shop,claimed=new Set(r.claims||[]);
 const milestones=Object.entries(r.milestones||{});
 $('cloudPanel').innerHTML=`<div class="pro-panel"><h3>Optional verified cosmetic rewards</h3><p class="hint">No monetary value or login-streak penalties. Server checks every claim.</p><button class="primary" id="cloudDailyReward" ${claimed.has('daily:'+new Date().toISOString().slice(0,10))?'disabled':''}>CLAIM DAILY +2 STYLE TOKENS</button><div class="v5-weekly-grid">${milestones.map(([rank,[xp,tokens]])=>`<article class="pro-panel"><h4>${esc(rank.toUpperCase())}</h4><p>${xp} verified XP · +${tokens} cosmetic tokens and frame</p><button data-cloud-prestige="${rank}" ${claimed.has('prestige:'+rank)||account.xp<xp?'disabled':''}>CLAIM ${esc(rank)}</button></article>`).join('')}</div><h3>Cosmetic Collection</h3><div class="v5-weekly-grid">${Object.entries(shop).map(([id,item])=>`<article class="pro-panel"><h4>${esc(item.value)}</h4><p>${item.cost} tokens · ${esc(item.slot)}</p><button data-cloud-buy="${esc(id)}" ${account.style_tokens<item.cost||account.cosmetics.owned.includes(id)?'disabled':''}>UNLOCK</button></article>`).join('')}</div></div>`;
 $('cloudDailyReward').onclick=safeTask(async()=>{const x=await api('/rewards/daily',{key:newKey()});updateAccount(x);await rewardsUI();});
 document.querySelectorAll('[data-cloud-prestige]').forEach(b=>b.onclick=safeTask(async()=>{const x=await api('/rewards/prestige/'+b.dataset.cloudPrestige,{key:newKey()});updateAccount(x);account=await api('/me');await dashboard();}));
 document.querySelectorAll('[data-cloud-buy]').forEach(b=>b.onclick=safeTask(async()=>{await api('/rewards/buy',{key:newKey(),item:b.dataset.cloudBuy});account=await api('/me');await dashboard();}));
}
function profileUI(){
 $('cloudPanel').innerHTML=`<div class="pro-panel"><h3>Account profile</h3><p class="hint">Your cloud progress is separate from locally editable guest saves.</p><form class="cloud-form" id="cloudProfileForm"><label>Display name<input name="display_name" minlength="1" maxlength="36" value="${esc(account.display_name)}" required></label><label>Avatar<input name="avatar" maxlength="12" value="${esc(account.avatar)}" required></label><label>Theme<select name="theme">${['mint','purple','gold'].map(t=>`<option value="${t}" ${account.theme===t?'selected':''}>${t}</option>`).join('')}</select></label><button class="primary">SAVE CLOUD PROFILE</button></form><p class="hint">For security, imported local currency balances, XP and achievement scores are never accepted.</p><div class="pro-panel"><h4>Equipped cosmetics</h4><p>${esc(JSON.stringify(account.cosmetics))}</p></div></div>`;
 $('cloudProfileForm').onsubmit=async event=>{event.preventDefault();await safeTask(async()=>{
  account=await api('/me',Object.fromEntries(new FormData(event.target)),'PATCH');
  profileUI();notice('Cloud profile saved.');
 })();};
}
export async function renderCloud(){
 if(!base){configUI();return;}
 if(!token){authUI();return;}
 await loadOnline();
}
