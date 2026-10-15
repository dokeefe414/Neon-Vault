'use strict';

/* Final Blackjack rule layer: Insurance, Surrender, progression hooks. */
(function(){
  function normalActionsAllowed(hand){
    return hand&&hand.cards.length===2&&!hand.fromSplit&&!hand.doubled&&round?.hands?.length===1;
  }

  renderBJActions=function(){
    if(!round||round.settled){if($('actions'))$('actions').innerHTML='';return;}
    const hand=bjCurrentHand();if(!hand)return;
    const t=total(hand.cards);
    if(t>=21){hand.stood=true;advanceBJHand();return;}
    const canDouble=hand.cards.length===2&&state.balance>=hand.bet;
    const canSplit=round.hands.length===1&&hand.cards.length===2&&hand.cards[0].r===hand.cards[1].r&&state.balance>=hand.bet;
    const canSurrender=normalActionsAllowed(hand)&&!round.actionTaken;
    $('actions').innerHTML=`<button class="primary" id="hit">HIT</button><button class="secondary" id="stand">STAND</button>${canDouble?'<button class="secondary" id="doubleDown">DOUBLE DOWN</button>':''}${canSplit?'<button class="secondary" id="splitHand">SPLIT</button>':''}${canSurrender?'<button class="secondary danger" id="surrender">SURRENDER</button>':''}`;
    $('hit').onclick=()=>{round.actionTaken=true;hand.cards.push(round.deck.pop());if(total(hand.cards)>=21)hand.stood=true;bjView(false);hand.stood?advanceBJHand():renderBJActions();};
    $('stand').onclick=()=>{round.actionTaken=true;hand.stood=true;advanceBJHand();};
    if(canDouble) $('doubleDown').onclick=()=>{round.actionTaken=true;doubleDownBJ();};
    if(canSplit) $('splitHand').onclick=()=>{round.actionTaken=true;splitBJ();};
    if(canSurrender) $('surrender').onclick=surrenderBJ;
  };

  function settleInsurance(){
    if(!round)return;
    const dealerNatural=round.dealer.length===2&&total(round.dealer)===21;
    if(round.insuranceBet>0){
      const payout=dealerNatural?round.insuranceBet*3:0;
      log('Blackjack · Insurance',round.insuranceBet,payout,{quiet:true});
      const msg=`Insurance ${dealerNatural?`wins — ${money(payout)} returned`:'loses'}`;
      $('sideMessage').textContent=[$('sideMessage').textContent,msg].filter(Boolean).join(' · ');
    }
    round.insuranceResolved=true;
    const playerNatural=round.hands[0].cards.length===2&&total(round.hands[0].cards)===21;
    if(dealerNatural||playerNatural) finishBJRound();
    else renderBJActions();
  }

  function offerInsurance(){
    if(!round)return;
    const cost=Math.floor(round.hands[0].bet/2);
    const canAfford=state.balance>=cost;
    $('actions').innerHTML=`<div class="insurance-callout"><strong>Dealer shows an Ace.</strong> Insurance costs ${money(cost)} and pays 2:1 if the dealer has Blackjack.</div><button class="secondary" id="declineInsurance">NO INSURANCE</button>${canAfford?'<button class="primary" id="takeInsurance">TAKE INSURANCE</button>':''}`;
    $('declineInsurance').onclick=()=>{round.insuranceBet=0;settleInsurance();};
    if(canAfford) $('takeInsurance').onclick=()=>{debit(cost);round.insuranceBet=cost;settleInsurance();};
  }

  function surrenderBJ(){
    if(!round)return;
    const hand=bjCurrentHand();
    if(!normalActionsAllowed(hand)||round.actionTaken)return;
    round.actionTaken=true;
    const refund=Math.floor(hand.bet/2);
    bjView(true);
    $('message').textContent=`Surrender — ${money(refund)} returned`;
    log('Blackjack',hand.bet,refund);
    round=null;
    $('actions').innerHTML='';
  }
  window.surrenderBJ=surrenderBJ;

  startBJ=function(){
    if(round){toast('Finish the current hand first');return;}
    const bet=stake();if(bet===null)return;
    const pairBet=sideStake('pairBet','Perfect Pairs');
    const pokerBet=sideStake('pokerBet','21+3');
    if(pairBet===null||pokerBet===null)return;
    const totalStake=bet+pairBet+pokerBet;
    if(totalStake>state.balance){toast(`You need ${money(totalStake)} for the main wager plus side bets`);return;}
    debit(totalStake);
    const d=deck(),player=[d.pop(),d.pop()];
    round={bet,pairBet,pokerBet,deck:d,player,dealer:[d.pop(),d.pop()],hands:[{cards:player,bet,stood:false,doubled:false,fromSplit:false}],activeHand:0,hasSplit:false,settled:false,insuranceBet:0,insuranceResolved:false,actionTaken:false};
    $('message').textContent='';
    const sideNotes=[];
    if(pairBet){const result=settlePerfectPair(player,pairBet);log('Blackjack · Perfect Pairs',pairBet,result.payout,{quiet:true});sideNotes.push(`${result.label}${result.payout?` — ${money(result.payout)} returned`:''}`);}
    if(pokerBet){const result=settle21Plus3(player,round.dealer[0],pokerBet);log('Blackjack · 21+3',pokerBet,result.payout,{quiet:true});sideNotes.push(`${result.label}${result.payout?` — ${money(result.payout)} returned`:''}`);}
    $('sideMessage').textContent=sideNotes.join(' · ');
    bjView(false);
    if(round.dealer[0].r==='A'){offerInsurance();return;}
    const playerNatural=total(player)===21,dealerNatural=total(round.dealer)===21;
    if(playerNatural||dealerNatural){finishBJRound();return;}
    renderBJActions();
  };

  finishBJRound=function(){
    if(!round||round.settled)return;
    const r=round;r.settled=true;
    const allBusted=r.hands.every(h=>total(h.cards)>21);
    if(!allBusted){while(total(r.dealer)<17)r.dealer.push(r.deck.pop());}
    const dealerTotal=total(r.dealer),dealerNatural=r.dealer.length===2&&dealerTotal===21;
    const results=r.hands.map(h=>bjSettleHand(h,dealerTotal,dealerNatural));
    bjView(true);
    $('message').innerHTML=results.map((result,i)=>{const prefix=r.hands.length>1?`Hand ${i+1}: `:'';const net=result.payout-r.hands[i].bet;return `${prefix}${result.label} <span class="${net>=0?'positive':'negative'}">(${net>=0?'+':''}${money(net)})</span>`;}).join(' · ');
    results.forEach((result,i)=>{
      const hand=r.hands[i],net=result.payout-hand.bet;
      const game=r.hands.length>1?`Blackjack · Hand ${i+1}`:'Blackjack';
      log(game,hand.bet,result.payout,{quiet:true});
      if(net>0){NVPro.event('blackjack-win');if(hand.fromSplit)NVPro.event('split-win');if(hand.doubled)NVPro.event('double-win');}
    });
    const totalNet=results.reduce((sum,result,i)=>sum+result.payout-r.hands[i].bet,0);
    toast(`Blackjack: ${totalNet>=0?'+':''}${money(totalNet)} net`);
    round=null;$('actions').innerHTML='';
  };
})();
