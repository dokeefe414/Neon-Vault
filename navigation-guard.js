'use strict';

// Prevent accidental loss of an active paid Blackjack hand or an uncashed Trivia pot.
(function(){
  const baseGo=go;

  function recordBlackjackForfeit(){
    if(!round||view!=='blackjack')return;
    const hands=Array.isArray(round.hands)&&round.hands.length
      ?round.hands
      :[{bet:round.bet||0}];

    hands.forEach((hand,i)=>{
      const bet=Math.max(0,Number(hand.bet)||0);
      if(!bet)return;
      const game=hands.length>1?`Blackjack · Hand ${i+1}`:'Blackjack';
      log(game,bet,0,{quiet:true});
    });
    toast('Blackjack hand forfeited');
  }

  go=function(v){
    if(v===view)return;

    if(round&&view==='blackjack'){
      const leave=confirm('A Blackjack hand is still in progress. Leaving now will forfeit the active hand. Leave anyway?');
      if(!leave)return;
      recordBlackjackForfeit();
      round=null;
    }

    if(trivia&&view==='trivia'&&trivia.pot>0){
      const leave=confirm(`You have an uncashed Trivia pot of ${money(trivia.pot)}. Leaving will lose that pot. Leave anyway?`);
      if(!leave)return;
    }

    baseGo(v);
  };
})();
