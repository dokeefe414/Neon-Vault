import {$,money} from '../core/utils.js';
import {randomInt} from '../core/random.js';
import {getState,settleWager} from '../core/store.js';
import {parseMainBet,renderWallet,toast,wagerControls,wireBetButtons} from '../ui/common.js';

export const diceGame={
  id:'dice',
  title:'Dice',
  hasActiveRound:()=>false,
  render(){
    renderWallet();
    $('content').innerHTML=`<div class="game-panel"><span class="pill">VIRTUAL TABLE</span><h2 style="margin-top:16px">Dice</h2><p>Roll two dice. Low (2–6) or High (8–12) pays 1:1. Seven loses.</p>${wagerControls('ROLL DICE')}<div id="table" class="felt"><div class="dice-display">⚄ ⚄</div><label>Prediction <select id="pick"><option value="high">High (8–12)</option><option value="low">Low (2–6)</option></select></label></div><div id="message" class="result"></div></div>`;
    wireBetButtons();
    $('play').onclick=()=>this.play();
  },
  play(){
    const bet=parseMainBet();if(bet===null)return;
    if(bet>getState().balance){toast('Not enough credits for that wager','loss');return;}
    const pick=$('pick').value;
     const a=randomInt(6)+1,b=randomInt(6)+1,sum=a+b;
    const win=pick==='high'?sum>=8:sum<=6;
    const faces=['⚀','⚁','⚂','⚃','⚄','⚅'];
    $('table').querySelector('.dice-display').textContent=`${faces[a-1]} ${faces[b-1]}`;
    $('message').textContent=`Rolled ${sum} — ${win?'WIN':'LOSS'}`;
    const result=settleWager('Dice',bet,win?bet*2:0,{quiet:true,metadata:{die1:a,die2:b,prediction:pick}});
    toast(`Dice: ${result.net>=0?'+':''}${money(result.net)} net`,win?'win':'loss');
    renderWallet();
  }
};
