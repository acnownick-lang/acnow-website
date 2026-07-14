import puppeteer from 'puppeteer';

async function test() {
  console.log('🚀 Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    console.log('🌐 Loading configurator page...');
    await page.goto('https://acnowllc-archived.netlify.app/pages/configurator.html', {
      waitUntil: 'networkidle2'
    });

    console.log('🔍 Checking initial prices...');
    const prices = await page.evaluate(() => {
      const invPrice = document.getElementById('inv-price')?.textContent;
      const stickyPrice = document.getElementById('sticky-inv-price')?.textContent;
      return { invPrice, stickyPrice };
    });
    console.log('Initial prices:', prices);

    console.log('✏️ Dragging slider to 3000 sq ft...');
    await page.evaluate(() => {
      const slider = document.getElementById('config-sqft');
      if (slider) {
        slider.value = 3000;
        // Dispatch input event to trigger calculations
        slider.dispatchEvent(new Event('input'));
      }
    });

    // Wait a brief moment
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('🔍 Checking updated prices...');
    const updatedPrices = await page.evaluate(() => {
      const invPrice = document.getElementById('inv-price')?.textContent;
      const stickyPrice = document.getElementById('sticky-inv-price')?.textContent;
      return { invPrice, stickyPrice };
    });
    console.log('Updated prices:', updatedPrices);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

test();
