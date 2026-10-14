'use strict';

// Enhanced Blackjack actions: one split maximum, split aces receive one card,
// and double down is available on any fresh two-card hand when funds allow.

function bjCurrentHand(){
  return round?.hands?.[round.activeHand] || null;
}

function bjHandStatus(hand){
  const t=total(hand.cards);
  if(t>21) return 'BUST';
  if(hand.stood) return hand.doubled?'DOUBLE DOWN · STOOD':'STOOD';
  if(t===21) return '21';
  return '';
}

bjView=function(reveal=false){
  if(!round) return;
  const hands=round.hands || [{cards:round.player,bet:round.bet,stood:false,fromSplit:false}];
  const dealerCards=reveal
    ? cardsHtml(round.dealer)
    : cardsHtml(round.dealer.slice(0,1))+'<span class="playing-card back">◆</span>';

  $('table').innerHTML=`
    <div class="hint">DEALER · ${reveal?total(round.dealer):'?'}</div>
    <div class="hand">${dealerCards}</div>
    <div style="display:grid;grid-template-columns:${hands.length>1?'repeat(2,minmax(0,1fr))':'1fr'};gap:16px;margin-top:18px">
      ${hands.map((hand,i)=>{
        const active=!round.settled&&i===round.activeHand;
        return `<div style="padding:14px;border:1px solid ${active?'#54f0c1':'#36786e'};border-radius:16px;background:${active?'#0f3c38aa':'#0b292b88'}">
          <div class="hint">${hands.length>1?`HAND ${i+1}`:'YOU'} · ${total(hand.cards)} · WAGER ${money(hand.bet)}${active?' · ACTIVE':''}</div>
          <div class="hand">${cardsHtml(hand.cards)}</div>
          ${bjHandStatus(hand)?`<div class="hint">${bjHandStatus(hand)}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
};

function renderBJActions(){
  if(!round||round.settled){
    if($('actions')) $('actions').innerHTML='';
    return;
  }

  const hand=bjCurrentHand();
  if(!hand) return;
  const t=total(hand.cards);
  if(t>=21){
    hand.stood=true;
    advanceBJHand();
    return;
  }

  const canDouble=hand.cards.length===2&&state.balance>=hand.bet;
  const canSplit=round.hands.length===1&&hand.cards.length===2&&hand.cards[0].r===hand.cards[1].r&&state.balance>=hand.bet;

  $('actions').innerHTML=`
    <button class="primary" id="hit">HIT</button>
    <button class="secondary" id="stand">STAND</button>
    ${canDouble?'<button class="secondary" id="doubleDown">DOUBLE DOWN</button>':''}
    ${canSplit?'<button class="secondary" id="splitHand">SPLIT</button>':''}`;

  $('hit').onclick=()=>{
    hand.cards.push(round.deck.pop());
    if(total(hand.cards)>=21) hand.stood=true;
    bjView(false);
    hand.stood?advanceBJHand():renderBJActions();
  };

  $('stand').onclick=()=>{
    hand.stood=true;
    advanceBJHand();
  };

  if(canDouble) $('doubleDown').onclick=()=>doubleDownBJ();
  if(canSplit) $('splitHand').onclick=()=>splitBJ();
}

function doubleDownBJ(){
  if(!round) return;
  const hand=bjCurrentHand();
  if(!hand||hand.cards.length!==2) return;
  if(state.balance<hand.bet){
    toast('Not enough credits to double down');
    return;
  }

  const extra=hand.bet;
  debit(extra);
  hand.bet+=extra;
  hand.doubled=true;
  hand.cards.push(round.deck.pop());
  hand.stood=true;
  bjView(false);
  toast(`Double down — wager is now ${money(hand.bet)}`);
  advanceBJHand();
}

function splitBJ(){
  if(!round) return;
  const hand=bjCurrentHand();
  if(!hand||round.hands.length!==1||hand.cards.length!==2||hand.cards[0].r!==hand.cards[1].r) return;
  if(state.balance<hand.bet){
    toast('Not enough credits to split');
    return;
  }

  debit(hand.bet);
  const [first,second]=hand.cards;
  const splitAces=first.r==='A'&&second.r==='A';

  round.hasSplit=true;
  round.hands=[
    {cards:[first,round.deck.pop()],bet:hand.bet,stood:splitAces,doubled:false,fromSplit:true},
    {cards:[second,round.deck.pop()],bet:hand.bet,stood:splitAces,doubled:false,fromSplit:true}
  ];
  round.activeHand=0;
  bjView(false);

  if(splitAces){
    toast('Split aces receive one card each');
    finishBJRound();
  }else{
    toast(`Split — ${money(hand.bet)} on each hand`);
    renderBJActions();
  }
}

function advanceBJHand(){
  if(!round) return;
  const hands=round.hands;
  let next=round.activeHand+1;
  while(next<hands.length&&(hands[next].stood||total(hands[next].cards)>=21)){
    hands[next].stood=true;
    next++;
  }

  if(next<hands.length){
    round.activeHand=next;
    bjView(false);
    renderBJActions();
  }else{
    finishBJRound();
  }
}

function bjSettleHand(hand,dealerTotal,dealerNatural){
  const playerTotal=total(hand.cards);
  const playerNatural=!hand.fromSplit&&hand.cards.length===2&&playerTotal===21;

  if(playerTotal>21) return {payout:0,label:'Bust — dealer wins'};
  if(dealerNatural&&playerNatural) return {payout:hand.bet,label:'Blackjack push'};
  if(dealerNatural) return {payout:0,label:'Dealer blackjack'};
  if(playerNatural) return {payout:Math.floor(hand.bet*2.5),label:'Natural blackjack!'};
  if(dealerTotal>21||playerTotal>dealerTotal) return {payout:hand.bet*2,label:'You win!'};
  if(playerTotal===dealerTotal) return {payout:hand.bet,label:'Push — wager returned'};
  return {payout:0,label:'Dealer wins'};
}

function finishBJRound(){
  if(!round||round.settled) return;
  const r=round;
  r.settled=true;

  const allBusted=r.hands.every(h=>total(h.cards)>21);
  if(!allBusted){
    while(total(r.dealer)<17) r.dealer.push(r.deck.pop());
  }

  const dealerTotal=total(r.dealer);
  const dealerNatural=r.dealer.length===2&&dealerTotal===21;
  const results=r.hands.map(h=>bjSettleHand(h,dealerTotal,dealerNatural));

  bjView(true);
  $('message').innerHTML=results.map((result,i)=>{
    const prefix=r.hands.length>1?`Hand ${i+1}: `:'';
    const net=result.payout-r.hands[i].bet;
    return `${prefix}${result.label} <span class="${net>=0?'positive':'negative'}">(${net>=0?'+':''}${money(net)})</span>`;
  }).join(' · ');

  results.forEach((result,i)=>{
    const game=r.hands.length>1?`Blackjack · Hand ${i+1}`:'Blackjack';
    log(game,r.hands[i].bet,result.payout,{quiet:true});
  });

  const totalNet=results.reduce((sum,result,i)=>sum+result.payout-r.hands[i].bet,0);
  toast(`Blackjack: ${totalNet>=0?'+':''}${money(totalNet)} net`);
  round=null;
  $('actions').innerHTML='';
}

startBJ=function(){
  if(round){
    toast('Finish the current hand first');
    return;
  }

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
  const player=[d.pop(),d.pop()];
  round={
    bet,pairBet,pokerBet,deck:d,player,
    dealer:[d.pop(),d.pop()],
    hands:[{cards:player,bet,stood:false,doubled:false,fromSplit:false}],
    activeHand:0,
    hasSplit:false,
    settled:false
  };

  $('message').textContent='';
  const sideNotes=[];

  if(pairBet){
    const result=settlePerfectPair(player,pairBet);
    log('Blackjack · Perfect Pairs',pairBet,result.payout,{quiet:true});
    sideNotes.push(`${result.label}${result.payout?` — ${money(result.payout)} returned`:''}`);
  }

  if(pokerBet){
    const result=settle21Plus3(player,round.dealer[0],pokerBet);
    log('Blackjack · 21+3',pokerBet,result.payout,{quiet:true});
    sideNotes.push(`${result.label}${result.payout?` — ${money(result.payout)} returned`:''}`);
  }

  $('sideMessage').textContent=sideNotes.join(' · ');
  bjView(false);

  const playerNatural=total(player)===21;
  const dealerNatural=total(round.dealer)===21;
  if(playerNatural||dealerNatural){
    finishBJRound();
    return;
  }

  renderBJActions();
};

endBJ=function(){
  if(!round) return;
  const hand=bjCurrentHand();
  if(!hand) return;
  hand.stood=true;
  advanceBJHand();
};
