'use strict';

/* Trivia Rescue categories, difficulty progression, and persistent no-repeat pools. */
(function(){
  const categories=['General','Geography','Science','Sports','Math','History & Culture','Technology'];

  function categoryFor(q){
    const s=q.q.toLowerCase();
    if(/capital|country|city|state|river|mountain|continent|flag|giza|fuji|london|largest by area/.test(s)) return 'Geography';
    if(/planet|solar|galaxy|gas|organ|blood|chemical|element|penicillin|breathe|water|animal|bees|caterpillar|atomic|avogadro/.test(s)) return 'Science';
    if(/sport|wimbledon|puck|touchdown|basketball|players|points/.test(s)) return 'Sports';
    if(/what is \d|sides|degrees|minutes|hours|months|complexity|×|\+| - /.test(s)) return 'Math';
    if(/programming|python|binary|computer|http|sql|dns|data structure/.test(s)) return 'Technology';
    if(/wrote|painted|civilization|statue of liberty|scientist proposed|theory of general relativity|physicist|romeo|mona lisa/.test(s)) return 'History & Culture';
    return 'General';
  }

  balancedTriviaQuestions.forEach((q,i)=>{
    q.category=categoryFor(q);
    if(i<180) q.difficulty='easy';
    else q.difficulty=(i%3===0?'hard':'medium');
  });

  function seenMap(){
    const meta=NVPro.meta;
    if(!meta.triviaSeenPro||Array.isArray(meta.triviaSeenPro)) meta.triviaSeenPro={};
    return meta.triviaSeenPro;
  }

  function poolFor(category){
    return category==='General'?balancedTriviaQuestions:balancedTriviaQuestions.filter(q=>q.category===category);
  }

  function pickNoRepeat(pool,count,category,difficulty=null){
    const map=seenMap();
    const key=category==='General'?'__all__':category;
    if(!Array.isArray(map[key])) map[key]=[];
    const source=difficulty?pool.filter(q=>q.difficulty===difficulty):pool;
    let unseen=source.filter(q=>!map[key].includes(q.q));
    if(unseen.length<count){
      // Only reset this category after its usable pool is exhausted.
      if(source.length>=count){
        const sourceNames=new Set(source.map(q=>q.q));
        map[key]=map[key].filter(name=>!sourceNames.has(name));
        unseen=[...source];
      }else unseen=[...source];
    }
    const picked=shuffle([...unseen]).slice(0,count);
    map[key].push(...picked.map(q=>q.q));
    NVPro.saveMeta();
    return picked;
  }

  newTriviaRun=function(){
    const category=NVPro.meta.triviaCategory||'General';
    const pool=poolFor(category);
    // General mode deliberately ramps difficulty with the payout ladder.
    let questions=[];
    if(category==='General'){
      questions.push(...pickNoRepeat(pool,6,category,'easy'));
      questions.push(...pickNoRepeat(pool,3,category,'medium'));
      questions.push(...pickNoRepeat(pool,1,category,'hard'));
    }else{
      const easy=pickNoRepeat(pool,Math.min(7,pool.filter(q=>q.difficulty==='easy').length),category,'easy');
      questions.push(...easy);
      const remaining=10-questions.length;
      if(remaining>0) questions.push(...pickNoRepeat(pool,remaining,category));
      questions=questions.slice(0,10);
    }
    if(questions.length<10){
      const extras=pickNoRepeat(balancedTriviaQuestions,10-questions.length,'General');
      questions.push(...extras);
    }
    trivia={questions,index:0,streak:0,pot:0,locked:false,startedBroke:state.balance===0,category};
  };

  renderTrivia=function(){
    if(!trivia) newTriviaRun();
    const c=$('content'),q=trivia.questions[trivia.index],nextValue=trivia.streak===0?1000:trivia.pot*2;
    c.innerHTML=`<div class="game-panel" style="max-width:960px"><div class="trivia-topbar"><div><span class="pill">BANKROLL RESCUE</span><h2 style="margin:14px 0 5px">Trivia Rescue</h2><p style="margin-top:0">Mostly approachable questions with difficulty that rises as the streak gets more valuable.</p></div><div><label class="pro-kicker" for="triviaCategory">CATEGORY</label><select id="triviaCategory" style="display:block;margin-top:6px">${categories.map(cat=>`<option ${cat===trivia.category?'selected':''}>${cat}</option>`).join('')}</select></div></div>
      <div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:24px"><div class="stat"><label>STREAK</label><strong>${trivia.streak}/10</strong></div><div class="stat"><label>CASH-OUT POT</label><strong class="${trivia.pot?'positive':''}">${money(trivia.pot)}</strong></div><div class="stat"><label>NEXT CORRECT</label><strong>${money(nextValue)}</strong></div></div>
      <div class="felt" style="text-align:left"><div class="level-row"><div class="eyebrow">QUESTION ${trivia.index+1} OF 10 · ${trivia.category.toUpperCase()}</div><span class="difficulty ${q.difficulty}">${q.difficulty}</span></div><h2 style="margin:14px 0 22px">${q.q}</h2><div id="answers" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">${q.a.map((answer,i)=>`<button class="secondary" data-answer="${i}" style="text-align:left;padding:16px">${String.fromCharCode(65+i)}. ${answer}</button>`).join('')}</div></div>
      <div id="message" class="result"></div><div class="controls"><button class="primary" id="cashout" ${trivia.pot===0?'disabled style="opacity:.45;cursor:not-allowed"':''}>CASH OUT ${money(trivia.pot)}</button><button class="secondary" id="restartTrivia">NEW QUESTION RUN</button></div><p class="hint">Questions do not repeat within a category until its available pool has been cycled. Trivia rewards are virtual credits only.</p></div>`;
    document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answerTrivia(Number(b.dataset.answer)));
    $('cashout').onclick=()=>cashoutTrivia(false);
    $('restartTrivia').onclick=()=>{if(trivia.pot>0&&!confirm('Start over and lose the current uncashed trivia pot?'))return;newTriviaRun();render();};
    $('triviaCategory').onchange=e=>{
      if(trivia.pot>0&&!confirm('Changing category starts a new run and loses the current uncashed pot. Continue?')){e.target.value=trivia.category;return;}
      NVPro.meta.triviaCategory=e.target.value;NVPro.saveMeta();trivia=null;render();
    };
  };

  const baseAnswer=answerTrivia;
  answerTrivia=function(choice){
    const correct=!!trivia&&!trivia.locked&&choice===trivia.questions[trivia.index].c;
    baseAnswer(choice);
    if(correct) NVPro.event('trivia-correct');
  };

  const baseCashout=cashoutTrivia;
  cashoutTrivia=function(auto){
    const comeback=!!trivia&&trivia.startedBroke&&trivia.pot>0;
    baseCashout(auto);
    if(comeback) NVPro.event('trivia-comeback');
  };
})();
