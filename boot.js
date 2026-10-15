'use strict';

// Final integration boot. All feature layers are loaded before this file.
(function(){
  const featureRender=render;
  render=function(){
    featureRender();
    if(view==='blackjack'){
      const panel=document.querySelector('.game-panel');
      if(panel&&!panel.querySelector('.blackjack-rules')){
        const firstP=panel.querySelector('p');
        if(firstP) firstP.insertAdjacentHTML('afterend','<div class="blackjack-rules"><span class="rule-chip">Dealer stands on 17</span><span class="rule-chip">Blackjack pays 3:2</span><span class="rule-chip">Split</span><span class="rule-chip">Double Down</span><span class="rule-chip">Insurance</span><span class="rule-chip">Surrender</span><span class="rule-chip">Perfect Pairs</span><span class="rule-chip">21+3</span></div>');
      }
    }
  };
  render();
})();
