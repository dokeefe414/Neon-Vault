'use strict';

const KEY='neon-vault-save-v1', START=100000;
const money=c=>(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const $=id=>document.getElementById(id);

const safeLoad=()=>{
  try{
    const d=JSON.parse(localStorage.getItem(KEY));
    if(d&&Number.isSafeInteger(d.balance)&&d.balance>=0&&Array.isArray(d.ledger)&&Array.isArray(d.history)) return d;
  }catch{}
  return {balance:START,ledger:[],history:[]};
};

let state=safeLoad(), view='home', round=null, trivia=null;

function save(){
  try{ localStorage.setItem(KEY,JSON.stringify(state)); }
  catch{ toast('Could not save: browser storage unavailable'); }
}

function toast(s){
  const e=$('toast');
  e.textContent=s;
  e.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>e.classList.remove('show'),3000);
}

function log(game,bet,payout,{quiet=false}={}){
  const net=payout-bet;
  const at=Date.now();
  state.balance+=payout;
  state.ledger.push({at,net,game});
  state.history.push({at,game,bet,payout,net});
  save();
  renderWallet();
  if(!quiet) toast(`${game}: ${net>=0?'+':''}${money(net)} net`);
  return net;
}

function stake(){
  const el=$('bet'), n=Number(el?.value);
  if(!Number.isSafeInteger(n)||n<1||n>10000){
    toast('Enter a whole-dollar bet from $1 to $10,000');
    return null;
  }
  return n*100;
}

function sideStake(id,label){
  const n=Number($(id)?.value||0);
  if(!Number.isSafeInteger(n)||n<0||n>10000){
    toast(`${label} must be a whole-dollar bet from $0 to $10,000`);
    return null;
  }
  return n*100;
}

function debit(cents){
  state.balance-=cents;
  save();
  renderWallet();
}

function profit(ms){
  const now=Date.now();
  return state.ledger.reduce((a,x)=>a+(Number.isFinite(x.at)&&x.at<=now&&x.at>=now-ms?x.net:0),0);
}

function renderWallet(){ $('balance').textContent=money(state.balance); }

const games=[
  ['blackjack','♠','Blackjack','Outplay the dealer, plus optional Perfect Pairs and 21+3 side bets.'],
  ['roulette','◉','Roulette','Pick a color or number and watch the wheel.'],
  ['slots','✦','Slots','Match symbols and chase larger multipliers.'],
  ['dice','⚄','Dice','Choose high or low and roll two dice.'],
  ['trivia','?','Trivia Rescue','Build a knowledge streak, cash out, and rebuild your bankroll.']
];

function go(v){
  view=v;
  round=null;
  trivia=null;
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  $('pageTitle').textContent=v==='home'?'The Vault':v==='trivia'?'Trivia Rescue':v[0].toUpperCase()+v.slice(1);
  render();
}

document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));

function adjustBet(mode){
  const el=$('bet');
  if(!el) return;
  const current=Math.max(1,Math.floor(Number(el.value)||1));
  const walletMax=Math.max(1,Math.min(10000,Math.floor(state.balance/100)));
  el.value=mode==='double'?Math.min(current*2,walletMax):Math.max(1,Math.floor(current/2));
}

function wireBetButtons(){
  document.querySelectorAll('[data-bet-adjust]').forEach(b=>{
    b.onclick=()=>adjustBet(b.dataset.betAdjust);
  });
}

function render(){
  renderWallet();
  const c=$('content');

  if(view==='home'){
    const broke=state.balance===0;
    c.innerHTML=`
      <section class="hero">
        <span class="pill">${broke?'BANKROLL EMPTY':'THE HOUSE IS OPEN'}</span>
        <h2>${broke?'Out of credits? Earn your way back in.':'Your next game starts here.'}</h2>
        <p>${broke
          ?'Trivia Rescue lets you rebuild your virtual bankroll with general-knowledge questions. Correct answers double the current cash-out value, but one wrong answer wipes the uncashed streak.'
          :'Casino games plus a skill-based Trivia Rescue mode. One virtual wallet. Every settled result tracked locally.'}</p>
        <button class="primary" data-go="${broke?'trivia':'blackjack'}">${broke?'START TRIVIA RESCUE →':'ENTER THE TABLE →'}</button>
      </section>
      <div class="stats">
        ${[
          ['BALANCE',money(state.balance),''],
          ['LAST 24 HOURS',money(profit(864e5)),profit(864e5)>=0?'positive':'negative'],
          ['LAST 7 DAYS',money(profit(7*864e5)),profit(7*864e5)>=0?'positive':'negative'],
          ['LAST 30 DAYS',money(profit(30*864e5)),profit(30*864e5)>=0?'positive':'negative']
        ].map(x=>`<div class="stat"><label>${x[0]}</label><strong class="${x[2]}">${x[1]}</strong></div>`).join('')}
      </div>
      <div class="section-head"><h2>Choose your game</h2><span class="eyebrow">5 EXPERIENCES AVAILABLE</span></div>
      <div class="games">
        ${games.map(g=>`<article class="card"><span class="symbol accent">${g[1]}</span><h3>${g[2]}</h3><p>${g[3]}</p><button data-go="${g[0]}">${g[0]==='trivia'?'START QUIZ':'PLAY NOW'} →</button></article>`).join('')}
      </div>`;
    c.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
    return;
  }

  if(view==='history'){
    c.innerHTML=`<div class="game-panel"><h2>Activity ledger</h2><p>Net profit = payout minus wager. Trivia cash-outs are recorded as $0 wagers with a positive payout.</p>
    ${state.history.length
      ?`<div style="overflow:auto"><table class="history-table"><thead><tr><th>Time</th><th>Game</th><th>Wager</th><th>Payout</th><th>Net</th></tr></thead><tbody>${state.history.slice(-100).reverse().map(x=>`<tr><td>${new Date(x.at).toLocaleString()}</td><td>${x.game}</td><td>${money(x.bet)}</td><td>${money(x.payout)}</td><td class="${x.net>=0?'positive':'negative'}">${money(x.net)}</td></tr>`).join('')}</tbody></table></div>`
      :'<div class="empty">No games played yet.</div>'}
    <p class="hint">Your game history is stored only in this browser. Clearing site data will erase it.</p></div>`;
    return;
  }

  if(view==='trivia'){
    renderTrivia();
    return;
  }

  const help={
    blackjack:'Blackjack pays 3:2. Dealer stands on 17. Add optional Perfect Pairs and 21+3 side bets before the deal.',
    roulette:'European wheel (0–36). Red/black pays 1:1; exact number pays 35:1.',
    slots:'Three matching symbols pay 5× to 25× the wager (total return); two matching symbols pay 1.5×.',
    dice:'Two dice: low (2–6) or high (8–12) pays 1:1. Seven loses.'
  };

  c.innerHTML=`
    <div class="game-panel">
      <span class="pill">VIRTUAL TABLE</span>
      <h2 style="margin-top:16px">${games.find(x=>x[0]===view)[2]}</h2>
      <p>${help[view]}</p>
      <div class="controls">
        <label for="bet">Main wager ($)</label>
        <input id="bet" type="number" min="1" max="10000" step="1" value="25">
        <button class="secondary" data-bet-adjust="half">½ BET</button>
        <button class="secondary" data-bet-adjust="double">2× BET</button>
        <button class="primary" id="play">${view==='blackjack'?'DEAL':'PLAY ROUND'}</button>
      </div>
      ${view==='blackjack'?`
        <div class="controls" style="margin-top:-5px">
          <label for="pairBet">Perfect Pairs ($)</label>
          <input id="pairBet" type="number" min="0" max="10000" step="1" value="0">
          <label for="pokerBet">21+3 ($)</label>
          <input id="pokerBet" type="number" min="0" max="10000" step="1" value="0">
        </div>
        <p class="hint">Perfect Pairs: mixed 6:1 · colored 12:1 · perfect 25:1. 21+3: flush 5:1 · straight 10:1 · trips 30:1 · straight flush 40:1 · suited trips 100:1.</p>
      `:''}
      <div id="table" class="felt"></div>
      <div id="message" class="result"></div>
      <div id="sideMessage" class="hint"></div>
      <div id="actions" class="controls"></div>
    </div>`;

  wireBetButtons();
  $('play').onclick=()=>({blackjack:startBJ,roulette:playRoulette,slots:playSlots,dice:playDice})[view]();

  if(view==='roulette'){
    $('table').innerHTML='<div class="roulette-wheel">◉</div><label>Bet type <select id="pick"><option value="red">Red</option><option value="black">Black</option><option value="number">Exact number</option></select></label> <label>Number <input id="number" type="number" min="0" max="36" value="7" style="width:75px"></label>';
  }
  if(view==='slots') $('table').innerHTML='<div class="reels"><div class="reel">◆</div><div class="reel">7</div><div class="reel">✦</div></div>';
  if(view==='dice') $('table').innerHTML='<div class="dice-display">⚄ ⚄</div><label>Prediction <select id="pick"><option value="high">High (8–12)</option><option value="low">Low (2–6)</option></select></label>';
  if(view==='blackjack') $('table').innerHTML='<div class="hint">Your cards will appear here.</div>';
}

function rand(max){
  const arr=new Uint32Array(1), limit=Math.floor(4294967296/max)*max;
  let n;
  do{ crypto.getRandomValues(arr); n=arr[0]; }while(n>=limit);
  return n%max;
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=rand(i+1);
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

/* ----------------------------- TRIVIA RESCUE ----------------------------- */

const triviaQuestions=[
  {q:'What is the largest planet in our solar system?',a:['Mars','Jupiter','Saturn','Earth'],c:1},
  {q:'What is the capital of Australia?',a:['Sydney','Melbourne','Canberra','Perth'],c:2},
  {q:'Which element has the chemical symbol O?',a:['Gold','Oxygen','Osmium','Iron'],c:1},
  {q:'How many continents are there?',a:['5','6','7','8'],c:2},
  {q:'Who wrote Romeo and Juliet?',a:['Charles Dickens','William Shakespeare','Mark Twain','Jane Austen'],c:1},
  {q:'Which ocean is the largest?',a:['Atlantic','Indian','Arctic','Pacific'],c:3},
  {q:'What is the square root of 144?',a:['10','11','12','14'],c:2},
  {q:'What country is home to the Great Pyramid of Giza?',a:['Greece','Egypt','Mexico','Jordan'],c:1},
  {q:'Which animal is the fastest land animal?',a:['Lion','Cheetah','Horse','Greyhound'],c:1},
  {q:'What is H2O commonly called?',a:['Salt','Hydrogen','Water','Oxygen'],c:2},
  {q:'Which planet is known as the Red Planet?',a:['Venus','Mercury','Mars','Neptune'],c:2},
  {q:'How many sides does a hexagon have?',a:['5','6','7','8'],c:1},
  {q:'Who painted the Mona Lisa?',a:['Vincent van Gogh','Pablo Picasso','Leonardo da Vinci','Claude Monet'],c:2},
  {q:'What is the largest mammal?',a:['African elephant','Blue whale','Giraffe','Orca'],c:1},
  {q:'Which language has the most native speakers worldwide?',a:['English','Spanish','Mandarin Chinese','Hindi'],c:2},
  {q:'What gas do plants absorb from the atmosphere?',a:['Oxygen','Nitrogen','Carbon dioxide','Helium'],c:2},
  {q:'Which country gifted the Statue of Liberty to the United States?',a:['France','Spain','Italy','United Kingdom'],c:0},
  {q:'What is the hardest natural substance?',a:['Quartz','Iron','Diamond','Granite'],c:2},
  {q:'Which organ pumps blood through the human body?',a:['Lungs','Liver','Heart','Kidney'],c:2},
  {q:'What is the freezing point of water in Celsius?',a:['0°C','10°C','32°C','-10°C'],c:0},
  {q:'Which U.S. state is known as the Aloha State?',a:['Florida','California','Alaska','Hawaii'],c:3},
  {q:'How many players from one team are on the field at a time in soccer?',a:['9','10','11','12'],c:2},
  {q:'Which metal is liquid at room temperature?',a:['Mercury','Aluminum','Copper','Silver'],c:0},
  {q:'What is the capital of Japan?',a:['Kyoto','Tokyo','Osaka','Nagoya'],c:1},
  {q:'Which planet has the most prominent ring system?',a:['Mars','Saturn','Venus','Mercury'],c:1},
  {q:'What is the smallest prime number?',a:['0','1','2','3'],c:2},
  {q:'Which blood type is commonly called the universal red-cell donor?',a:['A+','AB+','O-','B-'],c:2},
  {q:'What is the name of the galaxy containing our solar system?',a:['Andromeda','Milky Way','Sombrero','Whirlpool'],c:1},
  {q:'Which country has a maple leaf on its flag?',a:['Canada','Finland','Austria','Denmark'],c:0},
  {q:'What instrument has 88 keys on a standard modern version?',a:['Violin','Piano','Trumpet','Guitar'],c:1},
  {q:'Which scientist formulated the three laws of motion?',a:['Albert Einstein','Isaac Newton','Galileo Galilei','Nikola Tesla'],c:1},
  {q:'What is the largest hot desert in the world?',a:['Gobi','Sahara','Kalahari','Mojave'],c:1},
  {q:'What is the currency of Japan?',a:['Won','Yuan','Yen','Ringgit'],c:2},
  {q:'Which is the longest bone in the human body?',a:['Tibia','Humerus','Femur','Fibula'],c:2},
  {q:'Which country is shaped like a boot?',a:['Portugal','Italy','Greece','Chile'],c:1},
  {q:'How many degrees are in a right angle?',a:['45','60','90','180'],c:2},
  {q:'What is the main language spoken in Brazil?',a:['Spanish','Portuguese','French','Italian'],c:1},
  {q:'Which famous ship sank on its maiden voyage in 1912?',a:['Lusitania','Titanic','Britannic','Mayflower'],c:1},
  {q:'What is the largest internal organ in the human body?',a:['Heart','Liver','Lung','Brain'],c:1},
  {q:'Which U.S. city is famous for the Golden Gate Bridge?',a:['Seattle','Los Angeles','San Francisco','San Diego'],c:2}
];

function newTriviaRun(){
  const questions=shuffle([...triviaQuestions]).slice(0,10);
  trivia={questions,index:0,streak:0,pot:0,locked:false};
}

function renderTrivia(){
  if(!trivia) newTriviaRun();
  const c=$('content');
  const q=trivia.questions[trivia.index];
  const nextValue=trivia.streak===0?1000:trivia.pot*2;

  c.innerHTML=`
    <div class="game-panel">
      <span class="pill">BANKROLL RESCUE</span>
      <h2 style="margin-top:16px">General Knowledge Trivia</h2>
      <p>First correct answer is worth <strong>$10</strong>. Each correct answer in a row doubles the cash-out pot. Cash out whenever you want. One wrong answer wipes the uncashed pot. Maximum streak: 10.</p>

      <div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:24px">
        <div class="stat"><label>STREAK</label><strong>${trivia.streak}/10</strong></div>
        <div class="stat"><label>CASH-OUT POT</label><strong class="${trivia.pot?'positive':''}">${money(trivia.pot)}</strong></div>
        <div class="stat"><label>NEXT CORRECT</label><strong>${money(nextValue)}</strong></div>
      </div>

      <div class="felt" style="text-align:left">
        <div class="eyebrow">QUESTION ${trivia.index+1} OF 10</div>
        <h2 style="margin:14px 0 22px">${q.q}</h2>
        <div id="answers" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
          ${q.a.map((answer,i)=>`<button class="secondary" data-answer="${i}" style="text-align:left;padding:16px">${String.fromCharCode(65+i)}. ${answer}</button>`).join('')}
        </div>
      </div>

      <div id="message" class="result"></div>
      <div class="controls">
        <button class="primary" id="cashout" ${trivia.pot===0?'disabled style="opacity:.45;cursor:not-allowed"':''}>CASH OUT ${money(trivia.pot)}</button>
        <button class="secondary" id="restartTrivia">NEW QUESTION RUN</button>
      </div>
      <p class="hint">Trivia rewards are virtual credits only. A cash-out is added to your Neon Vault balance and activity ledger.</p>
    </div>`;

  document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answerTrivia(Number(b.dataset.answer)));
  $('cashout').onclick=()=>cashoutTrivia(false);
  $('restartTrivia').onclick=()=>{
    if(trivia.pot>0&&!confirm('Start over and lose the current uncashed trivia pot?')) return;
    newTriviaRun();
    render();
  };
}

function answerTrivia(choice){
  if(!trivia||trivia.locked) return;
  trivia.locked=true;
  const q=trivia.questions[trivia.index];

  if(choice===q.c){
    trivia.streak++;
    trivia.pot=trivia.streak===1?1000:trivia.pot*2;
    toast(`Correct! Trivia pot: ${money(trivia.pot)}`);

    if(trivia.streak>=10){
      cashoutTrivia(true);
      return;
    }

    trivia.index++;
    trivia.locked=false;
    render();
  }else{
    const lost=trivia.pot;
    trivia.pot=0;
    trivia.streak=0;
    $('message').innerHTML=`Wrong. The correct answer was <strong>${q.a[q.c]}</strong>. ${lost?`Your uncashed ${money(lost)} streak pot was lost.`:'Start a new streak on the next question.'}`;
    document.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);
    $('cashout').disabled=true;
    const controls=$('cashout').parentElement;
    const next=document.createElement('button');
    next.className='primary';
    next.textContent='NEXT QUESTION →';
    next.onclick=()=>{
      newTriviaRun();
      render();
    };
    controls.appendChild(next);
  }
}

function cashoutTrivia(auto){
  if(!trivia||trivia.pot<=0) return;
  const payout=trivia.pot;
  const streak=trivia.streak;
  log(`Trivia (${streak} streak)`,0,payout,{quiet:true});
  toast(`${auto?'10-question streak! Auto-cashed':'Trivia cashed out'} ${money(payout)}`);
  trivia=null;
  render();
}

/* ------------------------------- BLACKJACK ------------------------------- */

function deck(){
  return shuffle(['♠','♥','♦','♣'].flatMap(s=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(r=>({s,r}))));
}

function cardValue(c){
  return c.r==='A'?14:['K','Q','J'].includes(c.r)?({J:11,Q:12,K:13}[c.r]):Number(c.r);
}

function total(cards){
  let v=cards.reduce((n,c)=>n+(c.r==='A'?11:['J','Q','K'].includes(c.r)?10:Number(c.r)),0);
  let aces=cards.filter(c=>c.r==='A').length;
  while(v>21&&aces-->0) v-=10;
  return v;
}

function cardsHtml(a){
  return a.map(c=>`<span class="playing-card ${'♥♦'.includes(c.s)?'red':''}">${c.r}${c.s}</span>`).join('');
}

function bjView(reveal=false){
  $('table').innerHTML=`
    <div class="hint">DEALER · ${reveal?total(round.dealer):'?'}</div>
    <div class="hand">${reveal?cardsHtml(round.dealer):cardsHtml(round.dealer.slice(0,1))+'<span class="playing-card back">◆</span>'}</div>
    <div class="hint">YOU · ${total(round.player)}</div>
    <div class="hand">${cardsHtml(round.player)}</div>`;
}

function pairColor(s){ return '♥♦'.includes(s)?'red':'black'; }

function settlePerfectPair(cards,bet){
  if(!bet) return {payout:0,label:''};
  const [a,b]=cards;
  if(a.r!==b.r) return {payout:0,label:'Perfect Pairs: no pair'};
  if(a.s===b.s) return {payout:bet*26,label:'Perfect Pairs: PERFECT PAIR (25:1)'};
  if(pairColor(a.s)===pairColor(b.s)) return {payout:bet*13,label:'Perfect Pairs: COLORED PAIR (12:1)'};
  return {payout:bet*7,label:'Perfect Pairs: MIXED PAIR (6:1)'};
}

function isStraight(vals){
  const u=[...new Set(vals)].sort((a,b)=>a-b);
  if(u.length!==3) return false;
  if(u[2]-u[0]===2) return true;
  return JSON.stringify(u)===JSON.stringify([2,3,14]);
}

function settle21Plus3(player,dealerUp,bet){
  if(!bet) return {payout:0,label:''};
  const cards=[player[0],player[1],dealerUp];
  const vals=cards.map(cardValue);
  const sameSuit=cards.every(c=>c.s===cards[0].s);
  const counts=Object.values(vals.reduce((o,v)=>(o[v]=(o[v]||0)+1,o),{}));
  const trips=counts.includes(3);
  const straight=isStraight(vals);

  let odds=0,name='no poker hand';
  if(trips&&sameSuit){odds=100;name='SUITED TRIPS';}
  else if(straight&&sameSuit){odds=40;name='STRAIGHT FLUSH';}
  else if(trips){odds=30;name='THREE OF A KIND';}
  else if(straight){odds=10;name='STRAIGHT';}
  else if(sameSuit){odds=5;name='FLUSH';}

  return {payout:odds?bet*(odds+1):0,label:`21+3: ${name}${odds?` (${odds}:1)`:''}`};
}

function startBJ(){
  if(round){ toast('Finish the current hand first'); return; }

  const bet=stake();
  if(bet===null) return;
  const pairBet=sideStake('pairBet','Perfect Pairs');
  const pokerBet=sideStake('pokerBet','21+3');
  if(pairBet===null||pokerBet===null) return;

  const totalStake=bet+pairBet+pokerBet;
  if(totalStake>state.balance){
    toast(`You need ${money(totalStake)} for the main wager plus side bets`);
    return;
  }

  debit(totalStake);
  const d=deck();
  round={
    bet,pairBet,pokerBet,deck:d,
    player:[d.pop(),d.pop()],
    dealer:[d.pop(),d.pop()]
  };

  $('message').textContent='';
  const sideNotes=[];

  if(pairBet){
    const r=settlePerfectPair(round.player,pairBet);
    log('Blackjack · Perfect Pairs',pairBet,r.payout,{quiet:true});
    sideNotes.push(`${r.label}${r.payout?` — ${money(r.payout)} returned`:''}`);
  }

  if(pokerBet){
    const r=settle21Plus3(round.player,round.dealer[0],pokerBet);
    log('Blackjack · 21+3',pokerBet,r.payout,{quiet:true});
    sideNotes.push(`${r.label}${r.payout?` — ${money(r.payout)} returned`:''}`);
  }

  $('sideMessage').textContent=sideNotes.join(' · ');
  bjView();

  if(total(round.player)===21||total(round.dealer)===21){
    endBJ();
    return;
  }

  $('actions').innerHTML='<button class="primary" id="hit">HIT</button><button class="secondary" id="stand">STAND</button>';
  $('hit').onclick=()=>{
    round.player.push(round.deck.pop());
    bjView();
    if(total(round.player)>=21) endBJ();
  };
  $('stand').onclick=()=>endBJ();
}

function endBJ(){
  if(!round) return;
  const r=round;

  while(total(r.player)<=21&&total(r.player)!==21&&total(r.dealer)<17) r.dealer.push(r.deck.pop());

  const p=total(r.player), d=total(r.dealer);
  const pn=r.player.length===2&&p===21, dn=r.dealer.length===2&&d===21;
  let payout=0, label='Dealer wins';

  if(p>21) label='Bust — dealer wins';
  else if(pn&&!dn){ payout=Math.floor(r.bet*2.5); label='Natural blackjack!'; }
  else if(d>21||p>d){ payout=r.bet*2; label='You win!'; }
  else if(p===d){ payout=r.bet; label='Push — wager returned'; }
  if(dn&&!pn){ payout=0; label='Dealer blackjack'; }

  bjView(true);
  $('message').textContent=label;
  log('Blackjack',r.bet,payout);
  round=null;
  $('actions').innerHTML='';
}

/* ------------------------------- ROULETTE -------------------------------- */

const reds=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function playRoulette(){
  const bet=stake();
  if(bet===null) return;
  if(bet>state.balance){ toast('Not enough credits for that wager'); return; }

  const pick=$('pick').value, guess=Number($('number').value);
  if(pick==='number'&&(!Number.isInteger(guess)||guess<0||guess>36)){
    toast('Pick a number from 0 to 36');
    return;
  }

  debit(bet);
  const n=rand(37), color=n===0?'green':reds.has(n)?'red':'black';
  const win=pick==='number'?guess===n:pick===color;
  const payout=win?bet*(pick==='number'?36:2):0;
  $('table').querySelector('.roulette-wheel').textContent=n;
  $('message').textContent=`${n} ${color.toUpperCase()} — ${win?'WIN':'LOSS'}`;
  log('Roulette',bet,payout);
}

/* -------------------------------- SLOTS ---------------------------------- */

const symbols=['🍒','🍋','🔔','💎','7️⃣','⭐'];

function playSlots(){
  const bet=stake();
  if(bet===null) return;
  if(bet>state.balance){ toast('Not enough credits for that wager'); return; }

  debit(bet);
  const a=Array.from({length:3},()=>symbols[rand(symbols.length)]);
  const counts=Object.values(a.reduce((o,s)=>(o[s]=(o[s]||0)+1,o),{}));
  let mult=0;
  if(counts.includes(3)) mult=a[0]==='7️⃣'?25:a[0]==='💎'?15:5;
  else if(counts.includes(2)) mult=1.5;
  const payout=Math.floor(bet*mult);

  $('table').querySelector('.reels').innerHTML=a.map(s=>`<div class="reel">${s}</div>`).join('');
  $('message').textContent=mult?`${mult}× payout!`:'No match';
  log('Slots',bet,payout);
}

/* --------------------------------- DICE ---------------------------------- */

function playDice(){
  const bet=stake();
  if(bet===null) return;
  if(bet>state.balance){ toast('Not enough credits for that wager'); return; }

  const pick=$('pick').value;
  debit(bet);
  const a=rand(6)+1,b=rand(6)+1,sum=a+b;
  const win=pick==='high'?sum>=8:sum<=6;
  const faces=['⚀','⚁','⚂','⚃','⚄','⚅'];

  $('table').querySelector('.dice-display').textContent=faces[a-1]+' '+faces[b-1];
  $('message').textContent=`Rolled ${sum} — ${win?'WIN':'LOSS'}`;
  log('Dice',bet,win?bet*2:0);
}

render();
