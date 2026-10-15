import {test,expect} from '@playwright/test';

const SAVE_KEY='neon-vault-save-v1';
const META_KEY='neon-vault-meta-v2';

async function bootClean(page){
  await page.goto('/');
  await page.evaluate(({SAVE_KEY,META_KEY})=>{
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(META_KEY);
  },{SAVE_KEY,META_KEY});
  await page.reload();
}

async function nav(page,view){
  await page.locator(`button.nav[data-view="${view}"]`).click();
}

async function persistedState(page){
  return page.evaluate(SAVE_KEY=>JSON.parse(localStorage.getItem(SAVE_KEY)),SAVE_KEY);
}

test('loads dashboard with a fresh $1,000 wallet and no runtime errors',async({page})=>{
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await bootClean(page);
  await expect(page.locator('#pageTitle')).toHaveText('The Vault');
  await expect(page.locator('#balance')).toHaveText('$1,000.00');
  await expect(page.locator('.sidebar-foot')).toContainText('VIRTUAL CREDITS ONLY');
  expect(errors).toEqual([]);
});

test('all primary navigation routes render',async({page})=>{
  await bootClean(page);
  const routes=[
    ['blackjack','Blackjack'],['roulette','Roulette'],['slots','Slots'],['dice','Dice'],
    ['trivia','Trivia Rescue'],['profile','Player Profile'],['achievements','Achievements'],
    ['challenges','Daily Challenge'],['history','Activity']
  ];
  for(const [view,title] of routes){
    await nav(page,view);
    await expect(page.locator('#pageTitle')).toHaveText(title);
    await expect(page.locator('#content')).not.toContainText('Something went wrong');
  }
});

test('wallet and activity persist across reloads after a dice round',async({page})=>{
  await bootClean(page);
  await nav(page,'dice');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  await expect(page.locator('#message')).toContainText(/Rolled \d+ — (WIN|LOSS)/);
  const first=await persistedState(page);
  expect(first.history.length).toBeGreaterThan(0);
  const balance=first.balance;
  await page.reload();
  await expect(page.locator('#balance')).toHaveText(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(balance/100));
  await nav(page,'history');
  await expect(page.locator('.history-table')).toContainText('Dice');
});

test('roulette settles a spin and records one result',async({page})=>{
  await bootClean(page);
  await nav(page,'roulette');
  await page.locator('#bet').fill('5');
  await page.locator('button[data-type="black"]').click();
  await page.locator('#play').click();
  await expect(page.locator('#message')).toContainText(/\d+ (RED|BLACK|GREEN) · Black · (WIN|LOSS)/,{timeout:5000});
  const state=await persistedState(page);
  expect(state.history.filter(x=>x.game==='Roulette')).toHaveLength(1);
});

test('slots settles a spin and remains usable',async({page})=>{
  await bootClean(page);
  await nav(page,'slots');
  await page.locator('#bet').fill('7');
  await page.locator('#play').click();
  await expect(page.locator('#message')).not.toHaveText('',{timeout:5000});
  const state=await persistedState(page);
  expect(state.history.some(x=>x.game==='Slots'||x.game==='Slots · Free Spin')).toBeTruthy();
  await expect(page.locator('#play')).toBeEnabled();
});

test('blackjack can deal and finish a hand',async({page})=>{
  await bootClean(page);
  await nav(page,'blackjack');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  await expect(page.locator('#table .playing-card')).toHaveCount(4);

  const insurance=page.locator('#declineInsurance');
  if(await insurance.isVisible().catch(()=>false)) await insurance.click();

  for(let i=0;i<8;i++){
    const stand=page.locator('#stand');
    if(await stand.isVisible().catch(()=>false)) await stand.click();
    else break;
  }

  const state=await persistedState(page);
  expect(state.history.some(x=>/^Blackjack(?: · Hand \d+)?$/.test(x.game))).toBeTruthy();
});

test('trivia category selection persists and questions render',async({page})=>{
  await bootClean(page);
  await nav(page,'trivia');
  await expect(page.locator('#answers button')).toHaveCount(4);
  await page.locator('#triviaCategory').selectOption({label:'Science'});
  await expect(page.locator('#triviaCategory')).toHaveValue('Science');
  await page.reload();
  await nav(page,'trivia');
  await expect(page.locator('#triviaCategory')).toHaveValue('Science');
  const meta=await page.evaluate(META_KEY=>JSON.parse(localStorage.getItem(META_KEY)),META_KEY);
  expect(meta.triviaCategory).toBe('Science');
});

test('profile export downloads a JSON save',async({page})=>{
  await bootClean(page);
  await nav(page,'profile');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#exportSave').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^neon-vault-save-.*\.json$/);
});

test('navigation away from an active Blackjack hand requires confirmation',async({page})=>{
  await bootClean(page);
  await nav(page,'blackjack');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();

  const insurance=page.locator('#declineInsurance');
  if(await insurance.isVisible().catch(()=>false)) await insurance.click();

  const active=await page.locator('#actions button').count()>0;
  if(!active)test.skip(true,'Random initial Blackjack settled immediately');

  page.once('dialog',dialog=>dialog.dismiss());
  await nav(page,'home');
  await expect(page.locator('#pageTitle')).toHaveText('Blackjack');
});

test('mobile viewport keeps navigation and game controls usable',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile-only coverage');
  await bootClean(page);
  await expect(page.locator('nav')).toBeVisible();
  await nav(page,'dice');
  await expect(page.locator('#play')).toBeVisible();
  const box=await page.locator('#play').boundingBox();
  expect(box.width).toBeGreaterThan(80);
  expect(box.height).toBeGreaterThan(30);
});
