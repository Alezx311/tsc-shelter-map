import {test,expect} from '@playwright/test';
test('desktop filters and frame-preserving H',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('status')).toContainText('Знайдено 10 з');
 await expect(page.locator('.shelter-icon')).toHaveCount(10);await expect(page.locator('.legend-kinds')).toContainText('Найпростіші');
 await page.locator('.shelter-icon').first().click();await expect(page.locator('.shelter-popup')).toContainText('Точний вхід не підтверджено');await page.locator('.leaflet-popup-close-button').click();
 await page.getByRole('button',{name:'Очистити',exact:true}).click();await expect(page.getByRole('status')).toContainText('Виберіть маршрут');await expect(page.locator('.shelter-icon')).toHaveCount(0);
 await page.locator('.route-choice').filter({hasText:'№ 1'}).first().click();await expect(page.locator('.shelter-icon')).toHaveCount(15);
 await page.getByLabel('Відстань від маршруту, м').fill('0');await expect(page.getByRole('status')).toContainText('укриттів немає');
 await page.getByLabel('Відстань від маршруту, м').fill('1000');await expect(page.locator('.shelter-icon')).toHaveCount(55);
 await page.getByLabel('Відстань від маршруту, м').fill('2500');await expect(page.getByText('результат може бути неповним')).toBeVisible();
 await page.getByLabel('Відстань від маршруту, м').fill('');await expect(page.getByRole('alert')).toContainText('Введіть');
 await page.getByLabel('Відстань від маршруту, м').fill('500');
 await page.keyboard.press('h');await expect(page.locator('.panel')).toBeVisible();await page.getByLabel('Відстань від маршруту, м').blur();
 await page.getByRole('button',{name:'Очистити',exact:true}).click();await page.locator('.route-choice').filter({hasText:'№ 4'}).click();
 await page.getByRole('button',{name:'Умістити вибране в кадр'}).click();await page.waitForTimeout(350);
 const before=await page.locator('.leaflet-map-pane').getAttribute('style');const box=await page.locator('.map').boundingBox();
 await page.locator('.panel-content').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'research/screenshots/desktop.png'});
 await page.keyboard.press('h');await expect(page.locator('.panel')).toHaveCount(0);
 expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(before);expect(await page.locator('.map').boundingBox()).toEqual(box);
 await expect(page.locator('.legend')).toBeVisible();await expect(page.locator('.leaflet-control-attribution')).toBeVisible();await expect(page.locator('.leaflet-control-scale')).toBeVisible();
 await page.screenshot({path:'research/screenshots/poster.png'});
 await page.keyboard.press('h');await expect(page.locator('.panel')).toBeVisible();expect(errors).toEqual([]);
});
test('mobile hide, tap restore, popup and no horizontal overflow',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
 await page.goto('/');await expect(page.locator('.shelter-icon')).toHaveCount(10);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await page.screenshot({path:'research/screenshots/mobile.png'});
 const before=await page.locator('.leaflet-map-pane').getAttribute('style');
 await page.getByRole('button',{name:'Приховати керування H'}).tap();await expect(page.locator('.panel')).toHaveCount(0);
 expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(before);
 await page.screenshot({path:'research/screenshots/mobile-poster.png'});
 await page.locator('.map').tap({position:{x:40,y:450}});await expect(page.locator('.panel')).toBeVisible();
 await context.close();
});
test('local data errors are explicit and retry works',async({page})=>{
 await page.route('**/data/routes.geojson',r=>r.fulfill({status:500,body:'fail'}));await page.goto('/');
 await expect(page.getByRole('alert')).toContainText('HTTP 500');await page.unroute('**/data/routes.geojson');await page.getByRole('button',{name:'Повторити завантаження'}).click();await expect(page.getByRole('status')).toContainText('Знайдено');
});
test('tile failures remain visible in screenshot mode',async({page})=>{
 await page.route('https://tile.openstreetmap.org/**',r=>r.abort());await page.goto('/');await expect(page.getByRole('alert')).toContainText('Картографічна основа');await page.keyboard.press('h');await expect(page.getByRole('alert')).toBeVisible();
});
test('categories constrain all selection and malformed data cannot masquerade as empty',async({page})=>{
 await page.goto('/');await page.getByLabel('Категорія',{exact:true}).selectOption('CE');await page.getByRole('button',{name:'Вибрати всі',exact:true}).click();await expect(page.locator('.route-choice')).toHaveCount(1);await expect(page.locator('.legend-routes')).toContainText('№5');
 await page.route('**/data/shelters.geojson',r=>r.fulfill({json:{type:'FeatureCollection',features:[{}]}}));await page.reload();await expect(page.getByRole('alert')).toContainText('Відсутні метадані');
});
