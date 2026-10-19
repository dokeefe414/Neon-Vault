import test from 'node:test';
import assert from 'node:assert/strict';
import {triviaQuestions,triviaCategories,triviaCategoryCounts} from '../src/data/trivia.js';
import {selectTriviaRun,categoryProgress} from '../src/games/trivia-selection.js';

const groups=triviaCategories.filter(category=>category!=='General');
const order=arr=>[...arr];

test('every specialization contains at least 100 distinct prompts',()=>{
 for(const category of groups){
  const pool=triviaQuestions.filter(q=>q.category===category);
  assert.ok(pool.length>=100,`${category}: only ${pool.length} questions`);
  assert.equal(new Set(pool.map(q=>q.q)).size,pool.length,`${category}: duplicate prompts`);
  assert.equal(triviaCategoryCounts[category],pool.length);
  for(const q of pool){
   assert.ok(['easy','medium','hard'].includes(q.difficulty),q.q);
   assert.equal(q.a.length,4,q.q);
   assert.equal(new Set(q.a).size,4,q.q);
   assert.ok(Number.isInteger(q.c)&&q.c>=0&&q.c<4,q.q);
   assert.ok(q.a[q.c],q.q);
  }
 }
});
test('General draws from the full bank with unique prompts',()=>{
 assert.equal(triviaCategoryCounts.General,triviaQuestions.length);
 assert.equal(new Set(triviaQuestions.map(q=>q.q)).size,triviaQuestions.length);
 assert.ok(triviaQuestions.length>=600);
});
test('all category questions appear before a repeat in that category',()=>{
 for(const category of groups){
  const meta={triviaSeenPro:{}},pool=triviaQuestions.filter(q=>q.category===category),played=new Set();
  const runCount=Math.ceil(pool.length/10);
  for(let runIndex=0;runIndex<runCount;runIndex++){
   const run=selectTriviaRun(meta,category,pool,order);
   assert.equal(run.length,10);
   assert.equal(new Set(run.map(q=>q.q)).size,10);
   for(const q of run){
    if(played.size<pool.length)assert.ok(!played.has(q.q)||played.size+10>pool.length,`${category} repeat before exhaustion at run ${runIndex}: ${q.q}`);
    played.add(q.q);
   }
  }
  assert.equal(played.size,pool.length,`${category} did not exhaust its pool`);
  assert.ok(categoryProgress(meta,category,pool).remaining>=0);
 }
});
test('seen state survives category changes and meta save round-trip',()=>{
 const meta={triviaSeenPro:{}};
 const cat='Technology',pool=triviaQuestions.filter(q=>q.category===cat);
 const first=selectTriviaRun(meta,cat,pool,order);
 const restored=JSON.parse(JSON.stringify(meta));
 const other=triviaQuestions.filter(q=>q.category==='Sports');
 selectTriviaRun(restored,'Sports',other,order);
 const second=selectTriviaRun(restored,cat,pool,order);
 assert.ok(second.every(q=>!first.some(prior=>prior.q===q.q)));
 assert.equal(categoryProgress(restored,cat,pool).seen,20);
});
test('legacy per-difficulty question tracking is honored',()=>{
 const pool=triviaQuestions.filter(q=>q.category==='Science');
 const blocked=pool.slice(0,5).map(q=>q.q);
 const meta={triviaSeenPro:{'Science::easy':blocked.slice(0,3),'Science::medium':blocked.slice(3)}};
 const next=selectTriviaRun(meta,'Science',pool,order);
 assert.ok(next.every(q=>!blocked.includes(q.q)));
});
test('answer shuffles retain the correct answer',()=>{
 const meta={triviaSeenPro:{}},pool=triviaQuestions.filter(q=>q.category==='Geography');
 const original=new Map(pool.map(q=>[q.q,q.a[q.c]]));
 const rotate=arr=>arr.slice(1).concat(arr[0]);
 const questions=selectTriviaRun(meta,'Geography',pool,rotate);
 for(const q of questions)assert.equal(q.a[q.c],original.get(q.q));
});
