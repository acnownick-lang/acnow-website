import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const rootDir = '/Users/nicholaselia/Desktop/Clients/acnow-netlify';
const liveBaseUrl = 'https://acnowllc-archived.netlify.app';

function discoverHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'scratch', 'audit_reports', 'dist'].includes(file)) {
        discoverHtmlFiles(filePath, fileList);
      }
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

async function checkScroll() {
  const htmlFiles = discoverHtmlFiles(rootDir);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const scrollBugs = [];

  for (const filePath of htmlFiles) {
    const relativePath = path.relative(rootDir, filePath);
    let urlPath = relativePath.replace(/\\/g, '/');
    if (urlPath === 'index.html') {
      urlPath = '';
    }
    const liveUrl = `${liveBaseUrl}/${urlPath}`;

    const page = await browser.newPage();

    // Check Desktop
    await page.setViewport({ width: 1280, height: 800 });
    try {
      await page.goto(liveUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const desktopScroll = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasScroll: document.documentElement.scrollWidth > window.innerWidth
        };
      });

      // Check Mobile
      await page.setViewport({ width: 375, height: 812 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mobileScroll = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasScroll: document.documentElement.scrollWidth > window.innerWidth
        };
      });

      if (desktopScroll.hasScroll || mobileScroll.hasScroll) {
        scrollBugs.push({
          page: relativePath,
          url: liveUrl,
          desktop: desktopScroll,
          mobile: mobileScroll
        });
      }
    } catch (e) {
      console.error(`Failed to load ${liveUrl}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n=== REAL HORIZONTAL SCROLL BUGS ===');
  if (scrollBugs.length === 0) {
    console.log('✅ None! No pages have horizontal scrollbars.');
  } else {
    scrollBugs.forEach(bug => {
      console.log(`❌ Page: ${bug.page}`);
      if (bug.desktop.hasScroll) {
        console.log(`   - Desktop: scrollWidth = ${bug.desktop.scrollWidth}px (viewport = 1280px)`);
      }
      if (bug.mobile.hasScroll) {
        console.log(`   - Mobile: scrollWidth = ${bug.mobile.scrollWidth}px (viewport = 375px)`);
      }
    });
  }
}

checkScroll();
