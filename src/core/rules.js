/** Pure game rules shared by gameplay and deterministic tests. Amounts are cents. */
export const rouletteOrder=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
export const redNumbers=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const rouletteColor=n=>n===0?'green':redNumbers.has(n)?'red':'black';
export function rouletteOutcome(number,pick){
  const t=pick.type;
  if(!Number.isInteger(number)||number<0||number>36)throw new RangeError('Wheel number must be 0–36');
  if(t==='number')return {win:number===pick.value,mult:36};
  if(number===0)return {win:false,mult:0};
  if(t==='red'||t==='black')return {win:rouletteColor(number)===t,mult:2};
  if(t==='odd'||t==='even')return {win:(number%2===1)===(t==='odd'),mult:2};
  if(t==='low'||t==='high')return {win:t==='low'?number<=18:number>=19,mult:2};
  if(/^dozen[123]$/.test(t)){const i=Number(t.at(-1));return {win:number>=12*(i-1)+1&&number<=12*i,mult:3};}
  if(/^column[123]$/.test(t))return {win:(number-1)%3+1===Number(t.at(-1)),mult:3};
  return {win:false,mult:0};
}
export const slotSymbols=[
 {value:'🍒',weight:28,p:[0,0,2,5,12,30]},
 {value:'🍋',weight:24,p:[0,0,2,5,15,35]},
 {value:'🔔',weight:18,p:[0,0,3,8,20,50]},
 {value:'💎',weight:12,p:[0,0,4,12,35,90]},
 {value:'7️⃣',weight:8,p:[0,0,6,20,70,200]},
 {value:'⭐',weight:6,p:[0,0,5,15,50,125],wild:true},
 {value:'✨',weight:4,p:[0,0,0,0,0,0],scatter:true}
];
export const paylines=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0]];
const symbolByValue=new Map(slotSymbols.map(s=>[s.value,s]));
export function evaluateSlotLine(grid,line,betPerLine){
  const values=line.map((row,col)=>grid[row][col]);let base=null,count=0;
  for(const value of values){
    const def=symbolByValue.get(value);
    if(!def||def.scatter)break;
    if(def.wild){count++;continue;}
    if(base===null||base===value){base=value;count++;continue;}
    break;
  }
  if(base===null&&count>0)base='⭐';
  if(count<3||!base)return {payout:0,count:0,symbol:base};
  const mult=symbolByValue.get(base).p[count]||0;
  return {payout:Math.floor(betPerLine*mult),count,symbol:base,mult};
}
export function evaluateSlots(grid,bet){
  if(!Array.isArray(grid)||grid.length!==3||grid.some(row=>!Array.isArray(row)||row.length!==5))throw new Error('Slots grid must be 3x5');
  if(!Number.isSafeInteger(bet)||bet<=0)throw new RangeError('Invalid slots wager');
  const wins=paylines.map((line,index)=>({...evaluateSlotLine(grid,line,bet/paylines.length),index})).filter(x=>x.payout>0);
  const scatters=grid.flat().filter(x=>x==='✨').length;
  return {wins,scatters,payout:wins.reduce((n,x)=>n+x.payout,0),freeSpinsAwarded:scatters>=3?3:0};
}
