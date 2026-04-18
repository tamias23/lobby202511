const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });
  
  page.on('console', msg => {
    if (msg.text().includes('MY_DEBUG')) console.log(msg.text());
  });
  
  await page.goto('http://localhost:5173/test', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.game-page-wrapper');

  const stats = await page.evaluate(() => {
    // Look at react internals or similar if we could, but we can't easily.
    // Let's just find the first grid item and read its style.
    const items = Array.from(document.querySelectorAll('.react-grid-item')).map(item => ({
      key: item.getAttribute('key') || item.className,
      h_style: item.style.height,
      cssText: item.style.cssText
    }));

    return items;
  });

  console.log(JSON.stringify(stats, null, 2));
  await browser.close();
})();
