import {test,expect} from '@playwright/test';
async function clean(page){
 await page.goto('/');
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 await page.reload();
 await expect(page.locator('#pageTitle')).toHaveText('The Vault');
}
async function go(page,view){
 const direct=page.locator(`.nav[data-view="${view}"]:visible,.dock-nav[data-view="${view}"]:visible`).first();
 if(await direct.count()){await direct.click();return;}
 if(['roulette','slots','blackjack','dice'].includes(view)){
  await page.locator('.dock-nav[data-view="games"]').click();
  await page.locator(`[data-hub-go="${view}"]`).click();return;
 }
 await page.locator('.dock-nav[data-view="progress"]').click();
 await page.locator(`[data-hub-go="${view}"]`).click();
}
test('v5.1: Roulette chip wager survives changing bet type',async({page})=>{
 await clean(page);await go(page,'roulette');
 await page.locator('[data-chip="5"]').click();
 await expect(page.locator('#bet')).toHaveValue('5');
 await page.locator('[data-type="black"]').click();
 await expect(page.locator('#bet')).toHaveValue('5');
 await page.locator('[data-bet-adjust="double"]').click();
 await expect(page.locator('#bet')).toHaveValue('10');
 await page.locator('[data-number="17"]').click();
 await expect(page.locator('#bet')).toHaveValue('10');
});
test('v5.2: Blackjack table shows hand grouping and active state',async({page})=>{
 await clean(page);await go(page,'blackjack');
 await page.locator('#bet').fill('5');
 await page.locator('#play').click();
 await expect(page.locator('.v52-table-head')).toHaveCount(2);
 await expect(page.locator('.v52-hand-header')).toHaveCount(2);
 await expect(page.locator('.v52-hand-amount')).toContainText('BET');
});
test('v5.2: Roulette results have clear wheel and bet summary',async({page})=>{
 await clean(page);await go(page,'roulette');
 await expect(page.locator('.v5-wheel-pointer')).toBeVisible();
 await page.locator('#bet').fill('5');
 await page.locator('#play').click();
 await expect(page.locator('#message .v52-result-banner')).toBeVisible({timeout:6000});
 await expect(page.locator('#message')).toContainText(/WIN|LOSS/);
});
test('v5.2: Slots result cards stay visible on mobile and desktop',async({page})=>{
 await clean(page);await go(page,'slots');
 await page.locator('#bet').fill('5');
 await page.locator('#play').click();
 await expect(page.locator('#message .v52-result-banner')).toBeVisible({timeout:5500});
 await expect(page.locator('#slotGrid .slot-cell')).toHaveCount(15);
 const result=await page.locator('#message .v52-result-banner').boundingBox();
 expect(result?.width).toBeGreaterThan(180);
});
test('v5.1: weekly Style Lounge link opens wardrobe directly',async({page})=>{
 await clean(page);await go(page,'weekly');
 await page.locator('#wardrobeFromWeekly').click();
 await expect(page.locator('#pageTitle')).toHaveText('Style Lounge');
 await expect(page.locator('#playerName')).toBeVisible();
});
