/** Baccarat punto banco: eight-deck shoe, drawing rules and commission, amounts in integer cents. */
import {shuffle} from '../core/random.js';
const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const suits=['♠','♥','♦','♣'];
export const createBaccaratShoe=()=>shuffle(Array.from({length:8},()=>suits.flatMap(s=>ranks.map(r=>({r,s})))).flat());
export const baccaratValue=card=>card.r==='A'?1:['10','J','Q','K'].includes(card.r)?0:Number(card.r);
export const baccaratTotal=hand=>hand.reduce((sum,card)=>sum+baccaratValue(card),0)%10;
export function bankerDraws(bankerTotal,thirdValue){
 if(thirdValue===null)return bankerTotal<=5;
 if(bankerTotal<=2)return true;
 if(bankerTotal===3)return thirdValue!==8;
 if(bankerTotal===4)return thirdValue>=2&&thirdValue<=7;
 if(bankerTotal===5)return thirdValue>=4&&thirdValue<=7;
 if(bankerTotal===6)return thirdValue===6||thirdValue===7;
 return false;
}
export function baccaratRound(shoe){
 if(shoe.length<6)throw new Error('Baccarat shoe needs at least six cards');
 const player=[shoe.pop(),shoe.pop()],banker=[shoe.pop(),shoe.pop()];
 const initialP=baccaratTotal(player),initialB=baccaratTotal(banker);
 if(initialP<8&&initialB<8){
   let third=null;
   if(initialP<=5){const card=shoe.pop();player.push(card);third=baccaratValue(card);}
   if(bankerDraws(initialB,third))banker.push(shoe.pop());
 }
 const p=baccaratTotal(player),b=baccaratTotal(banker);
 return {player,banker,playerTotal:p,bankerTotal:b,winner:p===b?'tie':p>b?'player':'banker',natural:initialP>=8||initialB>=8};
}
/** Returns original wager plus winnings. Banker pays 0.95:1, Player 1:1, Tie 8:1. */
export function baccaratPayout(bet,pick,winner){
 if(!Number.isSafeInteger(bet)||bet<=0)throw new RangeError('Invalid wager');
 if(!['player','banker','tie'].includes(pick))throw new Error('Invalid bet');
 if(winner==='tie')return pick==='tie'?bet*9:bet;
 if(pick!==winner)return 0;
 return pick==='banker'?bet+Math.floor(bet*95/100):bet*2;
}
