'use strict';

// Prevent accidental loss of an active paid Blackjack hand or an uncashed Trivia pot.
(function(){
  const baseGo=go;
  go=function(v){
    if(v===view)return;

    if(round&&view==='blackjack'){
      const leave=confirm('A Blackjack hand is still in progress. Leaving now will abandon the active hand. Leave anyway?');
      if(!leave)return;
    }

    if(trivia&&view==='trivia'&&trivia.pot>0){
      const leave=confirm(`You have an uncashed Trivia pot of ${money(trivia.pot)}. Leaving will lose that pot. Leave anyway?`);
      if(!leave)return;
    }

    baseGo(v);
  };
})();
