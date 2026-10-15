import {$,money} from '../core/utils.js';
import {shuffle} from '../core/random.js';
import {getState,getMeta,saveMeta,settle} from '../core/store.js';
import {renderWallet,toast} from '../ui/common.js';
import {signal} from '../progression/progression.js';
import {triviaQuestions,triviaCategories} from '../data/trivia.js';

export class TriviaGame{
  constructor(){this.run=null;}
  hasActiveRound(){return !!this.run&&this.run.pot>0;}
  bucketKey(category,difficulty){return `${category}::${difficulty||'any'}`;}
  pool(category){return category==='General'?triviaQuestions:triviaQuestions.filter(q=>q.category===category);}
  pick(pool,count,category,difficulty=null,exclude=new Set()){
    if(count<=0)return [];
    const meta=getMeta(),key=this.bucketKey(category,difficulty);
    if(!Array.isArray(meta.triviaSeenPro[key]))meta.triviaSeenPro[key]=[];
    const source=(difficulty?pool.filter(q=>q.difficulty===difficulty):pool).filter(q=>!exclude.has(q.q));
    if(!source.length)return [];
    let unseen=source.filter(q=>!meta.triviaSeenPro[key].includes(q.q));
    const picked=[];
    while(picked.length<count&&unseen.length){
      const batch=shuffle(unseen);
      while(batch.length&&picked.length<count){const q=batch.pop();picked.push(q);exclude.add(q.q);}
      unseen=[];
    }
    if(picked.length<count){
      meta.triviaSeenPro[key]=[];
      const refill=shuffle(source.filter(q=>!exclude.has(q.q)));
      while(refill.length&&picked.length<count){const q=refill.pop();picked.push(q);exclude.add(q.q);}
    }
    meta.triviaSeenPro[key].push(...picked.map(q=>q.q));
    saveMeta();
    return picked;
  }
  newRun(){
    const category=getMeta().triviaCategory||'General',pool=this.pool(category),exclude=new Set(),questions=[];
    const add=items=>items.forEach(q=>{if(q&&!exclude.has(q.q)){questions.push(q);exclude.add(q.q);}});
    if(category==='General'){
      add(this.pick(pool,6,category,'easy',exclude));
      add(this.pick(pool,3,category,'medium',exclude));
      add(this.pick(pool,1,category,'hard',exclude));
    }else{
      add(this.pick(pool,7,category,'easy',exclude));
      add(this.pick(pool,2,category,'medium',exclude));
      add(this.pick(pool,1,category,'hard',exclude));
      if(questions.length<10)add(this.pick(pool,10-questions.length,category,null,exclude));
    }
    if(questions.length<10)add(this.pick(triviaQuestions,10-questions.length,'General',null,exclude));
    this.run={questions:questions.slice(0,10),index:0,streak:0,pot:0,locked:false,startedBroke:getState().balance===0,category};
  }
  render(){
    renderWallet();if(!this.run)this.newRun();
    const r=this.run,q=r.questions[r.index],next=r.streak===0?1000:r.pot*2;
    $('content').innerHTML=`<div class="game-panel" style="max-width:960px"><div class="trivia-topbar"><div><span class="pill">BANKROLL RESCUE</span><h2 style="margin:14px 0 5px">Trivia Rescue</h2><p style="margin-top:0">Mostly approachable questions with difficulty that rises as the streak gets more valuable.</p></div><div><label class="pro-kicker" for="triviaCategory">CATEGORY</label><select id="triviaCategory" style="display:block;margin-top:6px">${triviaCategories.map(cat=>`<option ${cat===r.category?'selected':''}>${cat}</option>`).join('')}</select></div></div><div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:24px"><div class="stat"><label>STREAK</label><strong>${r.streak}/10</strong></div><div class="stat"><label>CASH-OUT POT</label><strong class="${r.pot?'positive':''}">${money(r.pot)}</strong></div><div class="stat"><label>NEXT CORRECT</label><strong>${money(next)}</strong></div></div><div class="felt" style="text-align:left"><div class="level-row"><div class="eyebrow">QUESTION ${r.index+1} OF 10 · ${r.category.toUpperCase()}</div><span class="difficulty ${q.difficulty}">${q.difficulty}</span></div><h2 style="margin:14px 0 22px">${q.q}</h2><div id="answers" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">${q.a.map((answer,i)=>`<button class="secondary" data-answer="${i}" style="text-align:left;padding:16px">${String.fromCharCode(65+i)}. ${answer}</button>`).join('')}</div></div><div id="message" class="result"></div><div class="controls"><button class="primary" id="cashout" ${r.pot===0?'disabled style="opacity:.45;cursor:not-allowed"':''}>CASH OUT ${money(r.pot)}</button><button class="secondary" id="restartTrivia">NEW QUESTION RUN</button></div><p class="hint">Questions cycle through persistent no-repeat pools. Trivia rewards are virtual credits only.</p></div>`;
    document.querySelectorAll('[data-answer]').forEach(btn=>btn.onclick=()=>this.answer(Number(btn.dataset.answer)));
    $('cashout').onclick=()=>this.cashout(false);
    $('restartTrivia').onclick=()=>{if(r.pot>0&&!confirm('Start over and lose the current uncashed trivia pot?'))return;this.newRun();this.render();};
    $('triviaCategory').onchange=e=>{
      if(r.pot>0&&!confirm('Changing category starts a new run and loses the current uncashed pot. Continue?')){e.target.value=r.category;return;}
      const meta=getMeta();meta.triviaCategory=e.target.value;saveMeta();this.run=null;this.render();
    };
  }
  answer(choice){
    const r=this.run;if(!r||r.locked)return;r.locked=true;
    const q=r.questions[r.index];
    if(choice===q.c){
      r.streak++;r.pot=r.streak===1?1000:r.pot*2;signal('trivia-correct');toast(`Correct! Trivia pot: ${money(r.pot)}`,'win');
      if(r.streak>=10){this.cashout(true);return;}
      r.index++;r.locked=false;this.render();return;
    }
    const lost=r.pot;r.pot=0;r.streak=0;
    $('message').innerHTML=`Wrong. The correct answer was <strong>${q.a[q.c]}</strong>. ${lost?`Your uncashed ${money(lost)} streak pot was lost.`:'Start a new streak on the next question.'}`;
    document.querySelectorAll('[data-answer]').forEach(btn=>btn.disabled=true);
    $('cashout').disabled=true;
    const next=document.createElement('button');next.className='primary';next.textContent='NEXT QUESTION →';next.onclick=()=>{this.newRun();this.render();};$('cashout').parentElement.appendChild(next);toast('Wrong answer — streak reset','loss');
  }
  cashout(auto){
    const r=this.run;if(!r||r.pot<=0)return;
    const payout=r.pot,streak=r.streak,comeback=r.startedBroke;
    settle(`Trivia (${streak} streak)`,0,payout,{quiet:true,metadata:{category:r.category,streak}});
    if(comeback)signal('trivia-comeback');
    toast(`${auto?'10-question streak! Auto-cashed':'Trivia cashed out'} ${money(payout)}`,'win');
    this.run=null;renderWallet();this.render();
  }
  abandon(){this.run=null;}
}

export const triviaGame=new TriviaGame();
