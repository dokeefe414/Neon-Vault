'use strict';

// Blackjack uses a six-deck shoe so exact rank+suit duplicates can occur,
// which makes the Perfect Pairs side bet fully playable.
deck=function(){
  const oneDeck=['♠','♥','♦','♣'].flatMap(s=>
    ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(r=>({s,r}))
  );
  const shoe=Array.from({length:6},()=>oneDeck.map(card=>({...card}))).flat();
  return shuffle(shoe);
};
