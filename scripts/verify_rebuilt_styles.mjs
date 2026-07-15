import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ARTIFACTS_DIR = '/Users/nicholaselia/.gemini/antigravity/brain/c535b221-9572-499d-95ad-011c03108e08';

async function test() {
  console.log('🚀 Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. AC Installation Page
  console.log('🌐 Loading ac-installation.html...');
  await page.goto(`file://${join(__dirname, '../pages/ac-installation.html')}`, { waitUntil: 'networkidle0' });
  
  const section1 = await page.$('.features-grid');
  if (section1) {
    console.log('📸 Capturing ac-installation Military Protocols section...');
    await page.evaluate(() => {
      document.querySelector('.features-grid').scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: join(ARTIFACTS_DIR, '05_military_protocols.png') });
  }

  // 2. AC Repair Page
  console.log('🌐 Loading ac-repair.html...');
  await page.goto(`file://${join(__dirname, '../pages/ac-repair.html')}`, { waitUntil: 'networkidle0' });
  const section2 = await page.$('.features-grid');
  if (section2) {
    console.log('📸 Capturing ac-repair What\'s Wrong section...');
    await page.evaluate(() => {
      document.querySelector('.features-grid').scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: join(ARTIFACTS_DIR, '06_whats_wrong.png') });
  }

  // 3. Commercial Page B2B Consultation
  console.log('🌐 Loading commercial.html...');
  await page.goto(`file://${join(__dirname, '../pages/commercial.html')}`, { waitUntil: 'networkidle0' });
  const section3 = await page.$('#contact-form');
  if (section3) {
    console.log('📸 Capturing commercial B2B consultation form...');
    await page.evaluate(() => {
      document.getElementById('contact-form').scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: join(ARTIFACTS_DIR, '07_b2b_consultation.png') });
  }

  // 4. Pool Heating Page Quote
  console.log('🌐 Loading pool-heating.html...');
  await page.goto(`file://${join(__dirname, '../pages/pool-heating.html')}`, { waitUntil: 'networkidle0' });
  const section4 = await page.$('#pool-estimate-form');
  if (section4) {
    console.log('📸 Capturing pool heating quote form...');
    await page.evaluate(() => {
      document.getElementById('pool-estimate-form').scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: join(ARTIFACTS_DIR, '08_pool_heating_quote.png') });
  }

  await browser.close();
  console.log('🎉 Verification script finished successfully!');
}

test().catch(err => {
  console.error('❌ Error during testing:', err);
  process.exit(1);
});
