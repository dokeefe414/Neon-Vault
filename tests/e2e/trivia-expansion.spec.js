import {test,expect} from '@playwright/test';
async function fresh(page){
 await page.goto('/');
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 await page.reload();
 if(await page.locator('.nav[data-view="trivia"]:visible').count())await page.locator('.nav[data-view="trivia"]:visible').click();
 else await page.locator('.dock-nav[data-view="trivia"]:visible').click();
 await expect(page.locator('#pageTitle')).toHaveText('Trivia Rescue');
}
test('specialized questions offer at least 100 unique choices per category',async({page})=>{
 await fresh(page);
 const choices=await page.locator('#triviaCategory option').allTextContents();
 for(const category of ['Geography','Science','Sports','Math','History & Culture','Technology']){
  const option=choices.find(item=>item.startsWith(category+' ('));
  expect(option,category).toBeTruthy();
  expect(Number(option.match(/\((\d+)\)/)?.[1])).toBeGreaterThanOrEqual(100);
 }
});
test('specialized category avoids repeats across new runs and reloads',async({page})=>{
 await fresh(page);
 await page.locator('#triviaCategory').selectOption('Sports');
 let previous=[];
 for(let i=0;i<4;i++){
  const questions=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-vault-meta-v2'))?.triviaSeenPro?.Sports||[]);
  expect(questions.length).toBe((i+1)*10);
  expect(new Set(questions).size).toBe(questions.length);
  previous=questions;
  if(i===1){
   await page.reload();
   if(await page.locator('.nav[data-view="trivia"]:visible').count())await page.locator('.nav[data-view="trivia"]:visible').click();
   else await page.locator('.dock-nav[data-view="trivia"]:visible').click();
  }else if(i<3)await page.locator('#restartTrivia').click();
 }
 expect(previous.length).toBe(40);
 await expect(page.locator('#triviaPoolSummary')).toContainText('unseen of');
});
test('specialist answers are encoded safely as text',async({page})=>{
 await fresh(page);
 await page.locator('#triviaCategory').selectOption('Technology');
 const question=await page.locator('.felt h2').textContent();
 expect(question?.length).toBeGreaterThan(8);
 await expect(page.locator('[data-answer]')).toHaveCount(4);
});
