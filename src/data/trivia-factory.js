/** Data-only helpers. Trivia records are stable across releases for save compatibility. */
function rotate(values,question){
  const offset=[...question].reduce((n,ch)=>(n+ch.charCodeAt(0))%4,0);
  return values.slice(offset).concat(values.slice(0,offset));
}
function make(category,q,answer,incorrect,difficulty){
  if(!['easy','medium','hard'].includes(difficulty))throw new Error('Invalid trivia difficulty: '+q);
  const values=[String(answer),...incorrect.map(String)].map(v=>v.trim());
  if(new Set(values).size!==4||values.some(v=>!v))throw new Error('Trivia choices must be four distinct answers: '+q);
  const a=rotate(values,q);
  return {q,a,c:a.indexOf(String(answer).trim()),category,difficulty};
}
/** Each pair must have an unambiguous correct response; distractors are from peer answers. */
export function factGroup(category,prompt,pairs,difficulty='easy'){
  const peers=[...new Set(pairs.map(([,answer])=>String(answer)))];
  if(peers.length<4)throw new Error('At least four unique fact answers required');
  return pairs.map(([subject,answer],i)=>{
    const q=prompt.replace('{item}',subject),wrong=[];
    for(let step=1;wrong.length<3&&step<=peers.length;step++){
      const value=peers[(i+step*3)%peers.length];
      if(value!==String(answer)&&!wrong.includes(value))wrong.push(value);
    }
    // The stepped index may not visit all peers if lengths share factors.
    for(const value of peers)if(wrong.length<3&&value!==String(answer)&&!wrong.includes(value))wrong.push(value);
    return make(category,q,answer,wrong,difficulty);
  });
}
/** Row: [question, correct, incorrect1, incorrect2, incorrect3, difficulty?]. */
export function quiz(category,rows,difficulty='medium'){
  return rows.map(([q,correct,w1,w2,w3,d])=>make(category,q,correct,[w1,w2,w3],d||difficulty));
}
