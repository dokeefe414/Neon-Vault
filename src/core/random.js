export function randomInt(max){
  if(!Number.isSafeInteger(max)||max<=0) throw new RangeError('max must be a positive integer');
  const values=new Uint32Array(1);
  const limit=Math.floor(4294967296/max)*max;
  let value;
  do{
    crypto.getRandomValues(values);
    value=values[0];
  }while(value>=limit);
  return value%max;
}

export function shuffle(items){
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const j=randomInt(i+1);
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export function weightedChoice(entries){
  const total=entries.reduce((sum,item)=>sum+item.weight,0);
  let pick=randomInt(total);
  for(const item of entries){
    if(pick<item.weight) return item.value;
    pick-=item.weight;
  }
  return entries[entries.length-1].value;
}
