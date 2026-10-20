import {test,expect} from '@playwright/test';
async function boot(page){
 await page.goto('/');
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 await page.reload();
 await expect(page.locator('#pageTitle')).toHaveText('The Vault');
}
async function nav(page,view){
 if(await page.locator(`button.nav[data-view="${view}"]:visible`).count()){await page.locator(`button.nav[data-view="${view}"]:visible`).click();return;}
 if(['blackjack','roulette','slots','dice'].includes(view)){await page.locator('button.dock-nav[data-view="games"]').click();await page.locator(`button[data-hub-go="${view}"]`).click();return;}
 if(['analytics','weekly','trainer'].includes(view)){await page.locator('button.dock-nav[data-view="progress"]').click();await page.locator(`button[data-hub-go="${view}"]`).click();return;}
 await page.locator('button.dock-nav[data-view="profile"]').click();
 if(view==='wardrobe')await page.locator('#editIdentity').click();
 if(view==='guide')await page.locator('#openGuide').click();
}
test('v5 home shows player lounge and guide',async({page})=>{
 await boot(page);
 await expect(page.locator('#v5Welcome')).toContainText('Vault Player');
 await page.locator('#v5GuideButton').click();
 await expect(page.locator('#pageTitle')).toHaveText('How to Play');
 await expect(page.getByRole('heading',{name:'Learn the tables'})).toBeVisible();
});
test('v5 chip tray adjusts wager without placing a wager',async({page})=>{
 await boot(page);await nav(page,'dice');
 const before=await page.locator('#balance').textContent();
 await page.locator('[data-chip="5"]').click();
 await expect(page.locator('#bet')).toHaveValue('5');
 await page.locator('[data-chip="25"]').click();
 await expect(page.locator('#bet')).toHaveValue('30');
 await page.locator('#chipUndo').click();
 await expect(page.locator('#bet')).toHaveValue('5');
 await expect(page.locator('#balance')).toHaveText(before);
});
test('v5 blackjack trainer has standalone recommendations',async({page})=>{
 await boot(page);await nav(page,'trainer');
 await expect(page.locator('#pageTitle')).toHaveText('Blackjack Academy');
 await page.locator('#practiceAnswer').click();
 await expect(page.locator('#practiceResult')).toContainText('SPLIT');
});
test('v5 local profile avatar/name persist',async({page})=>{
 await boot(page);await nav(page,'wardrobe');
 await page.locator('#playerName').fill('Neon Tester');
 await page.locator('#saveName').click();
 await page.locator('[data-avatar="👑"]').click();
 await page.reload();
 await nav(page,'wardrobe');
 await expect(page.locator('#playerName')).toHaveValue('Neon Tester');
 await expect(page.locator('.v5-identity .v5-avatar')).toHaveText('👑');
});
test('v5 advanced analytics and weekly goals render',async({page})=>{
 await boot(page);await nav(page,'analytics');
 await expect(page.getByRole('heading',{name:'Performance analytics'})).toBeVisible();
 await nav(page,'weekly');
 await expect(page.getByRole('heading',{name:'Weekly challenges',exact:true,level:2})).toBeVisible();
 await expect(page.locator('[data-claim]')).toHaveCount(6);
});
test('v5 roulette wheel and slots payline visuals load',async({page})=>{
 await boot(page);await nav(page,'roulette');
 await expect(page.locator('.v5-wheel-label')).toHaveCount(37);
 await expect(page.locator('#rouletteDisc')).toBeVisible();
 await nav(page,'slots');
 await expect(page.locator('#slotGrid .slot-cell')).toHaveCount(15);
});
