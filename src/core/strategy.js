/**
 * Six-deck Blackjack basic-strategy advisor: dealer stands on soft 17,
 * double after split allowed, late surrender, no resplitting.
 * Educational only: the recommendation is not a guarantee of winning.
 */
export function scoreHand(cards){
  let total=0,aces=0;
  for(const card of cards){const r=typeof card==='string'?card:card.r;
    if(r==='A'){total+=11;aces++;}else total+=['J','Q','K'].includes(r)?10:Number(r);
  }
  while(total>21&&aces){total-=10;aces--;}
  return {total,soft:aces>0};
}
export function adviseBlackjack(cards,dealerUp,{canSplit=true,canDouble=true,canSurrender=true}={}){
  const {total,soft}=scoreHand(cards);
  const up=typeof dealerUp==='object'?dealerUp.r:dealerUp;
  const d=up==='A'?11:['J','Q','K'].includes(up)?10:Number(up);
  const ranks=cards.map(c=>typeof c==='string'?c:c.r);
  const pair=cards.length===2&&ranks[0]===ranks[1];
  const make=(action,reason)=>({action,reason,total,soft,dealer:d});
  if(total>21)return make('BUST','This hand has already busted.');
  if(total===21)return make('STAND','21 is the maximum possible total.');
  if(canSurrender&&!soft&&cards.length===2&&!pair){
    if(total===16&&[9,10,11].includes(d))return make('SURRENDER','A hard 16 fares poorly against a dealer 9, 10, or Ace.');
    if(total===15&&d===10)return make('SURRENDER','Late surrender reduces the expected loss against a dealer 10.');
  }
  if(pair&&canSplit){
    const r=ranks[0];
    if(r==='A'||r==='8')return make('SPLIT',r==='A'?'Two aces are stronger as separate hands.':'Splitting 8s avoids a weak hard 16.');
    if(['10','J','Q','K'].includes(r))return make('STAND','Keep a strong 20 together.');
    // A pair of 5s is hard 10, not a standing pair; use the hard-total table below.
    if(r==='9')return make([7,10,11].includes(d)?'STAND':'SPLIT','9s perform best split against most dealer upcards.');
    if(r==='7')return make(d<=7?'SPLIT':'HIT','7s split against weak dealer cards.');
    if(r==='6')return make(d>=2&&d<=6?'SPLIT':'HIT','Split 6s against dealer 2–6.');
    if(r==='4')return make(d===5||d===6?'SPLIT':'HIT','Split 4s against dealer 5–6 when double after split is allowed.');
    if(r==='3'||r==='2')return make(d>=2&&d<=7?'SPLIT':'HIT','Small pairs split against dealer 2–7.');
  }
  if(soft){
    if(total>=19)return make('STAND','A soft 19 or 20 is already strong.');
    if(total===18){
      if(canDouble&&d>=3&&d<=6&&cards.length===2)return make('DOUBLE','Soft 18 can profitably double against dealer 3–6.');
      return make(d===2||d===7||d===8?'STAND':'HIT','Soft 18 stands against 2, 7, and 8; hits against stronger dealer cards.');
    }
    if(canDouble&&cards.length===2){
      if(total===17&&d>=3&&d<=6)return make('DOUBLE','Soft 17 doubles against dealer 3–6.');
      if((total===15||total===16)&&d>=4&&d<=6)return make('DOUBLE','Soft 15–16 doubles against dealer 4–6.');
      if((total===13||total===14)&&(d===5||d===6))return make('DOUBLE','Soft 13–14 doubles against dealer 5–6.');
    }
    return make('HIT','A flexible soft total can safely draw another card.');
  }
  if(total>=17)return make('STAND','A hard 17+ should not risk another card.');
  if(total>=13)return make(d>=2&&d<=6?'STAND':'HIT','Stand on hard 13–16 against dealer 2–6; otherwise hit.');
  if(total===12)return make(d>=4&&d<=6?'STAND':'HIT','Hard 12 stands against dealer 4–6.');
  if(canDouble&&cards.length===2){
    if(total===11)return make('DOUBLE','Hard 11 is a strong doubling hand.');
    if(total===10&&d>=2&&d<=9)return make('DOUBLE','Hard 10 doubles against dealer 2–9.');
    if(total===9&&d>=3&&d<=6)return make('DOUBLE','Hard 9 doubles against dealer 3–6.');
  }
  return make('HIT','Drawing improves this low hard total.');
}
