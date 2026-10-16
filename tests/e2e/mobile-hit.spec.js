import {test,expect} from '@playwright/test';

test('mobile dock is the top hit target above game content',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile-only coverage');
  await page.goto('/');
  await page.locator('.dock-nav[data-view="games"]').click();
  await page.locator('button[data-hub-go="roulette"]').click();
  await expect(page.locator('#pageTitle')).toHaveText('Roulette');

  const profile=page.locator('.dock-nav[data-view="profile"]');
  const box=await profile.boundingBox();
  expect(box).not.toBeNull();
  const target=await page.evaluate(({x,y})=>{
    const element=document.elementFromPoint(x,y);
    return {view:element?.closest?.('[data-view]')?.dataset?.view||null,className:element?.className||''};
  },{x:box.x+box.width/2,y:box.y+box.height/2});
  expect(target.view).toBe('profile');

  await profile.click();
  await expect(page.locator('#pageTitle')).toHaveText('Player Profile');
});
