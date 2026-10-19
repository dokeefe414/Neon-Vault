/**
 * Stable category-wide no-repeat cycles.
 * A question is used once per category cycle; difficulty never resets a smaller
 * bucket early. The selected end-of-cycle tail is kept in the same 10-question
 * run without duplicating a prompt within that run.
 */
const DIFFICULTIES=['easy','medium','hard'];
const QUOTA={easy:7,medium:2,hard:1};
export const TRACKING_KEY='triviaSeenPro';
export function categoryProgress(meta,category,pool){
  const seen=new Set(readSeen(meta,category));
  return {total:pool.length,seen:pool.filter(q=>seen.has(q.q)).length,remaining:pool.filter(q=>!seen.has(q.q)).length};
}
function readSeen(meta,category){
  const history=meta[TRACKING_KEY]||{};
  const current=history[category];
  if(Array.isArray(current))return current;
  // Import the old difficulty-specific pools without discarding player history.
  return Object.entries(history)
    .filter(([key,arr])=>key.startsWith(category+'::')&&Array.isArray(arr))
    .flatMap(([,arr])=>arr)
    .filter(item=>typeof item==='string');
}
function orderedPick(pool,needed,used,previous,shared,shuffle){
  if(!needed)return [];
  const candidates=pool.filter(q=>!used.has(q.q)&&!previous.has(q.q));
  // Prefer questions unseen anywhere, including those played in General.
  const fresh=shuffle(candidates.filter(q=>!shared.has(q.q)));
  const older=shuffle(candidates.filter(q=>shared.has(q.q)));
  return fresh.concat(older).slice(0,needed);
}
function prioritize(pool,capacity,used,previous,shared,shuffle){
  const result=[];
  const choose=(items,count)=>{
    const available=orderedPick(items,count,used,previous,shared,shuffle);
    for(const q of available){result.push(q);used.add(q.q);}
  };
  for(const difficulty of DIFFICULTIES)choose(pool.filter(q=>q.difficulty===difficulty),Math.min(QUOTA[difficulty],capacity-result.length));
  choose(pool,capacity-result.length);
  return result;
}
export function selectTriviaRun(meta,category,pool,shuffle,count=10){
  if(pool.length<count)throw new Error('Trivia category needs at least '+count+' questions');
  if(!meta[TRACKING_KEY]||typeof meta[TRACKING_KEY]!=='object'||Array.isArray(meta[TRACKING_KEY]))meta[TRACKING_KEY]={};
  const history=meta[TRACKING_KEY];
  const allSeen=new Set(Array.isArray(history.__global)?history.__global:[]);
  const known=new Set(pool.map(q=>q.q));
  const previous=new Set(readSeen(meta,category).filter(q=>known.has(q)));
  const used=new Set(),selected=[];
  selected.push(...prioritize(pool,count,used,previous,allSeen,shuffle));
  if(selected.length<count){
    // The entire category has now been traversed: begin its next cycle.
    previous.clear();
    selected.push(...prioritize(pool,count-selected.length,used,previous,allSeen,shuffle));
  }
  if(selected.length!==count||new Set(selected.map(q=>q.q)).size!==count)throw new Error('Trivia run could not be populated uniquely');
  for(const question of selected){previous.add(question.q);allSeen.add(question.q);}
  history[category]=[...previous];
  history.__global=[...allSeen];
  // Change answer positions per run without changing the correct response.
  return selected.map(q=>{
    const answer=q.a[q.c],a=shuffle(q.a);
    return {...q,a,c:a.indexOf(answer)};
  });
}
