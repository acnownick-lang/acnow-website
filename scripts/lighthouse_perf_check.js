#!/usr/bin/env node
/**
 * Lighthouse mobile performance check for staging.
 * Reports: score, LCP, FCP, CLS, TBT, Speed Index, and LCP element identity.
 * Usage: node scripts/lighthouse_perf_check.js <staging-url>
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');

const DRAFT = process.argv[2] || 'https://acnowllc.com';

const TEST_PAGES = [
  { path: '/',         label: 'Homepage' },
  { path: '/ac-repair/', label: '/ac-repair/' },
  { path: '/ac-installation/', label: '/ac-installation/' },
  { path: '/hvac-repair/ac-repair-service-in-jupiter-should-i-repair-or-replace-my-air-conditioner/', label: 'Jupiter city page' },
];

// Throttling flags that simulate Lighthouse mobile slow 4G
const LH_FLAGS = [
  '--only-categories=performance',
  '--throttling-method=simulate',
  '--throttling.rttMs=150',
  '--throttling.throughputKbps=1638.4',
  '--throttling.cpuSlowdownMultiplier=4',
  '--emulated-form-factor=mobile',
  '--output=json',
  '--quiet',
  '--chrome-flags=--headless --no-sandbox --disable-gpu',
];

async function getLCPElement(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    const lcpInfo = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) {
            const el = last.element;
            resolve({
              tagName: el ? el.tagName : 'unknown',
              id: el ? (el.id || '') : '',
              className: el ? (el.className || '').slice(0, 60) : '',
              src: el ? (el.src || el.currentSrc || el.style?.backgroundImage || '').slice(0, 100) : '',
              size: Math.round(last.size || 0),
              startTime: Math.round(last.startTime),
            });
          } else {
            resolve({ tagName: 'none', src: '' });
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve({ tagName: 'timeout', src: '' }), 5000);
      });
    });
    return lcpInfo;
  } catch(e) {
    return { tagName: 'error', src: e.message };
  } finally {
    await page.close();
  }
}

(async () => {
  const lhPath = require.resolve('lighthouse/cli/bin.js').replace('/cli/bin.js', '/cli/cli.js');
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  console.log(`\nLighthouse Mobile Performance — ${DRAFT}`);
  console.log('='.repeat(80));
  console.log('BEFORE (production baselines): / → 78, /ac-repair/ → 69');
  console.log('TARGET: score ≥90, LCP ≤2.5s on all 4 pages');
  console.log('='.repeat(80));

  const results = [];
  
  for (const { path, label } of TEST_PAGES) {
    const url = DRAFT + path;
    console.log(`\n⏳ ${label} — ${url}`);
    
    // Get LCP element via Puppeteer
    const lcpEl = await getLCPElement(browser, url);
    
    // Run Lighthouse
    let lhResult = null;
    try {
      const tmpOut = `/tmp/lh_${Date.now()}.json`;
      execSync(`node ${lhPath} "${url}" ${LH_FLAGS.join(' ')} --output-path="${tmpOut}"`, { timeout: 120000, stdio: 'pipe' });
      lhResult = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
      fs.unlinkSync(tmpOut);
    } catch (e) {
      console.log(`  ⚠️  Lighthouse failed: ${e.message.slice(0, 100)}`);
      // Still report LCP element even if LH failed
      results.push({ label, url, lcpEl, score: null });
      continue;
    }
    
    const cats = lhResult.categories;
    const audits = lhResult.audits;
    const score = Math.round((cats.performance?.score || 0) * 100);
    const lcp   = audits['largest-contentful-paint']?.displayValue || '?';
    const fcp   = audits['first-contentful-paint']?.displayValue || '?';
    const tbt   = audits['total-blocking-time']?.displayValue || '?';
    const cls   = audits['cumulative-layout-shift']?.displayValue || '?';
    const si    = audits['speed-index']?.displayValue || '?';
    
    const lcpMs = audits['largest-contentful-paint']?.numericValue || 0;
    const passFail = score >= 90 && lcpMs <= 2500;
    
    console.log(`  Score: ${score} ${score >= 90 ? '✅' : '🔴'}`);
    console.log(`  LCP: ${lcp} ${lcpMs <= 2500 ? '✅' : '🔴'}  FCP: ${fcp}  TBT: ${tbt}  CLS: ${cls}  SI: ${si}`);
    console.log(`  LCP element: <${lcpEl.tagName}> id="${lcpEl.id}" src="${lcpEl.src.slice(0,80)}"`);
    console.log(`  ${passFail ? '✅ PASS' : '❌ FAIL (score<90 or LCP>2.5s)'}`);
    
    results.push({ label, url, score, lcp, fcp, tbt, cls, si, lcpEl, passFail, lcpMs });
  }
  
  await browser.close();
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY TABLE');
  console.log('='.repeat(80));
  console.log('Page                       Score  LCP        FCP        CLS   LCP Element');
  console.log('-'.repeat(80));
  results.forEach(r => {
    const p = (s, n) => (s || '').padEnd(n).slice(0, n);
    const scoreStr = r.score != null ? String(r.score) : 'ERR';
    const lcpEl = r.lcpEl ? `<${r.lcpEl.tagName}>` : '';
    console.log(`${p(r.label, 27)}${p(scoreStr, 7)}${p(r.lcp, 11)}${p(r.fcp, 11)}${p(r.cls, 6)}${lcpEl} ${(r.lcpEl?.src||'').slice(0,40)}`);
  });
  const allPass = results.every(r => r.passFail);
  console.log('\nFINAL: ' + (allPass ? '✅ ALL PASS' : '❌ SOME FAIL'));
  console.log('='.repeat(80) + '\n');
  process.exit(allPass ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
