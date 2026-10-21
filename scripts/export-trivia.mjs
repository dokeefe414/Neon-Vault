/** Produces the SERVER-ONLY complete Trivia bank from the existing validated front-end data. */
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {triviaQuestions,triviaCategoryCounts} from '../src/data/trivia.js';
if(triviaQuestions.length<600||Object.entries(triviaCategoryCounts).some(([cat,n])=>cat!=='General'&&n<100)){
 throw Error('Trivia dataset has insufficient coverage');
}
const ids=new Set();
for(const q of triviaQuestions){
 if(ids.has(q.q)||q.a.length!==4||new Set(q.a).size!==4||!Number.isInteger(q.c)||q.c<0||q.c>=4)throw Error('Invalid Trivia question: '+q.q);
 ids.add(q.q);
}
const dest=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../server/app/trivia_bank.json');
mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(triviaQuestions,null,0)+'\n');
console.log('Exported '+triviaQuestions.length+' server-side validated trivia questions');
