import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Click start button
    console.log("Clicking start button...");
    await page.click('button.start-btn'); // Assuming class is start-btn
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
    console.log("TEST FINISHED");
  } catch(e) {
    console.error("PUPPETEER ERROR:", e);
  }
})();
