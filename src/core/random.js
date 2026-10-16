let testSource=null;

function cryptoUint32(){
  const values=new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0];
}

export function setRandomSourceForTests(source){
  if(source!==null&&typeof source!=='function')throw new TypeError('Random test source must be a function or null');
  testSource=source;
}

export function resetRandomSource(){testSource=null;}

function nextUint32(){
  if(testSource){
    const value=Number(testSource());
    if(!Number.isFinite(value))throw new TypeError('Random test source must return a finite number');
    return Math.abs(Math.floor(value))>>>0;
  }
  return cryptoUint32();
}

export function randomInt(max){
  if(!Number.isSafeInteger(max)||max<=0)throw new RangeError('max must be a positive integer');
  const limit=Math.floor(4294967296/max)*max;
  let value;
  do{value=nextUint32();}while(value>=limit);
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
  if(!Number.isSafeInteger(total)||total<=0)throw new RangeError('Weighted entries must have a positive integer total weight');
  let pick=randomInt(total);
  for(const item of entries){
    if(pick<item.weight)return item.value;
    pick-=item.weight;
  }
  return entries[entries.length-1].value;
}
