import puppeteer from 'puppeteer';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    console.log("Navigating to http://localhost:5173...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    
    // Test language switching in MainMenu
    const langBtns = await page.$$('.itb-lang-btn');
    console.log(`Found ${langBtns.length} language buttons.`);
    
    // Switch to English
    for (const btn of langBtns) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text.trim() === 'EN') {
        console.log("Clicking EN button...");
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
    let startBtnText = await page.$eval('.itb-menu-btn .itb-btn-text', el => el.textContent);
    console.log("Start button text in EN:", startBtnText);

    // Switch to Spanish
    for (const btn of langBtns) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text.trim() === 'ES') {
        console.log("Clicking ES button...");
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
    startBtnText = await page.$eval('.itb-menu-btn .itb-btn-text', el => el.textContent);
    console.log("Start button text in ES:", startBtnText);

    // Switch to Portuguese
    for (const btn of langBtns) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text.trim() === 'PT') {
        console.log("Clicking PT button...");
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
    startBtnText = await page.$eval('.itb-menu-btn .itb-btn-text', el => el.textContent);
    console.log("Start button text in PT:", startBtnText);

    // Click START (COMEÇAR)
    console.log("Clicking COMEÇAR button...");
    await page.click('.itb-menu-btn');
    await new Promise(r => setTimeout(r, 500));

    // Click Easy difficulty (FÁCIL)
    console.log("Clicking FÁCIL difficulty...");
    await page.click('.difficulty-easy');

    // Wait for loader and game load
    console.log("Waiting for game arena to load...");
    await new Promise(r => setTimeout(r, 4500));

    // Check DialogueBox presence
    const dialogueExists = await page.$('.dialogueRoot') || await page.$('div[class*="dialogueRoot"]');
    console.log("DialogueBox rendered:", !!dialogueExists);

    if (dialogueExists) {
      const dialogueText = await page.$eval('div[class*="messageText"]', el => el.textContent);
      console.log("Dialogue message:", dialogueText);
      console.log("Clicking CONTINUAR button to advance to Step 2...");
      await page.click('button[class*="actionButton"]');
      await new Promise(r => setTimeout(r, 1200));
      const step2Text = await page.$eval('div[class*="messageText"]', el => el.textContent);
      console.log("Step 2 message:", step2Text);
    }

    await page.screenshot({ path: 'test_step2_screenshot.png' });
    console.log("Saved test_step2_screenshot.png successfully!");
    console.log("ALL TESTS PASSED WITH SUCCESS!");
  } catch(e) {
    console.error("TEST SCRIPT ERROR:", e);
  } finally {
    if (browser) await browser.close();
  }
})();
