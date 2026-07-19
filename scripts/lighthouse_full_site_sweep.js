#!/usr/bin/env node
// Full-site Lighthouse mobile sweep — Phase 1
// 3 runs per page, 5 runs for 85-92 precision zone
// Saves incrementally to scratch/lh_sweep_results.json
// Usage: node scripts/lighthouse_full_site_sweep.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LH_PATH = require.resolve('lighthouse/cli/index.js');
const RESULTS_FILE = path.join(__dirname, '../scratch/lh_sweep_results.json');

// Unknown/watch cluster first, then expected ≥95 generated pages
const URLS = [
  // UNKNOWN / WATCH CLUSTER
  'https://acnowllc.com/',
  'https://acnowllc.com/about/',
  'https://acnowllc.com/areas/',
  'https://acnowllc.com/reviews/',
  'https://acnowllc.com/contact-us/',
  'https://acnowllc.com/partners-and-referrals/',
  'https://acnowllc.com/privacy/',
  'https://acnowllc.com/accessibility/',
  'https://acnowllc.com/storm-prep/',
  'https://acnowllc.com/services/',
  'https://acnowllc.com/air-quality/',
  'https://acnowllc.com/ductless-mini-split-systems/',
  'https://acnowllc.com/residential-air-conditioning/',
  'https://acnowllc.com/residential-air-conditioning/unveiling-comfort-a-c-nows-expertise-in-residential-air-conditioning/',
  // Hub pages
  'https://acnowllc.com/hvac-installation/',
  'https://acnowllc.com/hvac-repair/',
  'https://acnowllc.com/hvac-maintenance/',
  'https://acnowllc.com/commercial-hvac/',
  'https://acnowllc.com/pool-heating/',
  'https://acnowllc.com/ac-replacement/',
  // Core service pages
  'https://acnowllc.com/ac-repair/',
  'https://acnowllc.com/ac-installation/',
  'https://acnowllc.com/ac-maintenance/',
  'https://acnowllc.com/commercial/',
  // hvac-services-{city} legacy pages
  'https://acnowllc.com/hvac-services-palm-city/',
  'https://acnowllc.com/hvac-services-stuart/',
  'https://acnowllc.com/hvac-services-port-st-lucie/',
  'https://acnowllc.com/hvac-services-jensen-beach/',
  'https://acnowllc.com/hvac-services-hobe-sound/',
  'https://acnowllc.com/hvac-services-north-palm-beach/',
  'https://acnowllc.com/hvac-services-fort-pierce/',
  'https://acnowllc.com/hvac-services-jupiter/',
  'https://acnowllc.com/hvac-services-palm-beach-gardens/',
  // EXPECTED >=95 generated city/service pages
  'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-fort-pierce/',
  'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-jupiter/',
  'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-palm-beach-gardens/',
  'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-palm-city/',
  'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-port-saint-lucie/',
  'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-stuart/',
  'https://acnowllc.com/hvac-installation/ensure-your-air-quality-and-comfort-in-saint-lucie-west/',
  'https://acnowllc.com/hvac-installation/get-commercial-air-quality-services-in-jensen-beach/',
  'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-jensen-beach/',
  'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-martin-county/',
  'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-port-saint-lucie/',
  'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-saint-lucie-county/',
  'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-saint-lucie-west/',
  'https://acnowllc.com/hvac-installation/hvac-installation-fort-pierce/',
  'https://acnowllc.com/hvac-installation/hvac-installation-jupiter/',
  'https://acnowllc.com/hvac-installation/hvac-installation-palm-beach-gardens/',
  'https://acnowllc.com/hvac-installation/hvac-installation-palm-city/',
  'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/',
  'https://acnowllc.com/hvac-installation/hvac-installation-services-in-jensen-beach/',
  'https://acnowllc.com/hvac-installation/hvac-installation-services-in-martin-county/',
  'https://acnowllc.com/hvac-installation/hvac-installation-services-in-saint-lucie-county/',
  'https://acnowllc.com/hvac-installation/hvac-installation-services-in-saint-lucie-west/',
  'https://acnowllc.com/hvac-installation/hvac-installation-stuart/',
  'https://acnowllc.com/hvac-installation/improve-your-air-quality-with-ac-now-in-saint-lucie-county/',
  'https://acnowllc.com/hvac-installation/optimize-your-humidity-indoors-in-martin-county/',
  'https://acnowllc.com/hvac-installation/professional-air-quality-monitoring-in-port-saint-lucie/',
  'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-fort-pierce/',
  'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-jupiter/',
  'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-palm-beach-gardens/',
  'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-palm-city/',
  'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-port-saint-lucie/',
  'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-stuart/',
  'https://acnowllc.com/hvac-repair/ac-repair-service-in-ft-pierce-should-i-repair-or-replace-my-air-conditioner/',
  'https://acnowllc.com/hvac-repair/ac-repair-service-in-jupiter-should-i-repair-or-replace-my-air-conditioner/',
  'https://acnowllc.com/hvac-repair/ac-repair-service-in-palm-beach-gardens-should-i-repair-or-replace-my-air-conditioner/',
  'https://acnowllc.com/hvac-repair/ac-repair-service-in-palm-city-should-i-repair-or-replace-my-air-conditioner/',
  'https://acnowllc.com/hvac-repair/ac-repair-service-in-port-saint-lucie-should-i-repair-or-replace-my-air-conditioner/',
  'https://acnowllc.com/hvac-repair/ac-repair-service-in-stuart-should-i-repair-or-replace-my-air-conditioner/',
  'https://acnowllc.com/hvac-repair/air-quality-monitoring-service/',
  'https://acnowllc.com/hvac-repair/hvac-equipment-repair/',
  'https://acnowllc.com/pool-heating/pool-heating-in-fort-pierce/',
  'https://acnowllc.com/pool-heating/pool-heating-in-jupiter/',
  'https://acnowllc.com/pool-heating/pool-heating-in-palm-beach-gardens/',
  'https://acnowllc.com/pool-heating/pool-heating-in-palm-city/',
  'https://acnowllc.com/pool-heating/pool-heating-in-port-saint-lucie/',
  'https://acnowllc.com/pool-heating/pool-heating-in-stuart/',
];

function getMedian(arr, key) {
  const sorted = [...arr].sort((a, b) => a[key] - b[key]);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid][key] : (sorted[mid - 1][key] + sorted[mid][key]) / 2;
}

function runOnce(url, idx, total) {
  const tmpOut = `/tmp/lh_sweep_${Date.now()}_${Math.random().toString(36).slice(2)}.json`;
  try {
    execSync(
      `node "${LH_PATH}" "${url}" ` +
      `--only-categories=performance ` +
      `--throttling-method=simulate ` +
      `--emulated-form-factor=mobile ` +
      `--output=json ` +
      `--output-path="${tmpOut}" ` +
      `--chrome-path="${CHROME_PATH}" ` +
      `--chrome-flags="--headless=new --disable-gpu --no-sandbox" ` +
      `--quiet`,
      { stdio: 'ignore', timeout: 180000 }
    );
    if (!fs.existsSync(tmpOut)) return null;
    const data = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
    fs.unlinkSync(tmpOut);
    const score = Math.round((data.categories.performance?.score || 0) * 100);
    const lcp   = (data.audits['largest-contentful-paint']?.numericValue || 0) / 1000;
    const fcp   = (data.audits['first-contentful-paint']?.numericValue || 0) / 1000;
    const cls   = data.audits['cumulative-layout-shift']?.numericValue || 0;
    const tbt   = data.audits['total-blocking-time']?.numericValue || 0;
    const lcpEl = data.audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.nodeLabel || 'unknown';
    return { score, lcp, fcp, cls, tbt, lcpEl };
  } catch (e) {
    if (fs.existsSync(tmpOut)) try { fs.unlinkSync(tmpOut); } catch {}
    return null;
  }
}

// Load existing results (resume support)
let results = [];
if (fs.existsSync(RESULTS_FILE)) {
  try { results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); } catch {}
}
const doneUrls = new Set(results.map(r => r.url));

const startTime = Date.now();
let pagesDone = results.length;

for (let urlIdx = 0; urlIdx < URLS.length; urlIdx++) {
  const url = URLS[urlIdx];
  if (doneUrls.has(url)) { continue; }

  const shortUrl = url.replace('https://acnowllc.com', '') || '/';
  const progress = `[${urlIdx + 1}/${URLS.length}]`;
  console.log(`\n${progress} ${shortUrl}`);

  const run1 = runOnce(url);
  if (!run1) {
    console.log(`  ERROR: run 1 failed`);
    results.push({ url, shortUrl, error: true });
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    pagesDone++;
    continue;
  }
  console.log(`  Run 1: ${run1.score}, LCP ${run1.lcp.toFixed(2)}s, FCP ${run1.fcp.toFixed(2)}s`);

  const runs = [run1];
  const totalRuns = (run1.score >= 85 && run1.score <= 92) ? 5 : 3;

  for (let i = 2; i <= totalRuns; i++) {
    const r = runOnce(url);
    if (!r) { console.log(`  Run ${i}: FAILED`); continue; }
    runs.push(r);
    console.log(`  Run ${i}: ${r.score}, LCP ${r.lcp.toFixed(2)}s`);
  }

  const medScore = getMedian(runs, 'score');
  const medLcp   = getMedian(runs, 'lcp');
  const medFcp   = getMedian(runs, 'fcp');
  const medCls   = getMedian(runs, 'cls');
  const medTbt   = getMedian(runs, 'tbt');
  const lcpEl    = runs[0].lcpEl;
  const bucket   = (medScore >= 90 && medLcp <= 2.5) ? 'GREEN' : medScore >= 80 ? 'YELLOW' : 'RED';

  console.log(`  MEDIAN: ${bucket} ${medScore}, LCP ${medLcp.toFixed(2)}s, FCP ${medFcp.toFixed(2)}s, CLS ${medCls.toFixed(3)}, TBT ${medTbt.toFixed(0)}ms`);
  console.log(`  LCP el: ${(lcpEl || '').slice(0, 60)}`);

  results.push({ url, shortUrl, runs: runs.length, score: medScore, lcp: medLcp, fcp: medFcp, cls: medCls, tbt: medTbt, lcpEl, bucket });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  pagesDone++;
  const elapsed = (Date.now() - startTime) / 1000 / 60;
  const remaining = URLS.length - pagesDone;
  if (pagesDone > 0 && remaining > 0) {
    const avgMin = elapsed / pagesDone;
    console.log(`  ETA: ~${(remaining * avgMin).toFixed(0)} min remaining (${remaining} pages left)`);
  }
}

// Final ranked table
console.log('\n\n========== PHASE 1 RESULTS — ALL 79 PAGES ==========');
const valid = results.filter(r => !r.error && r.score != null);
valid.sort((a, b) => a.score - b.score);

console.log('| Bucket | URL | Score | LCP | FCP | CLS | TBT | LCP Element |');
console.log('|--------|-----|-------|-----|-----|-----|-----|-------------|');
for (const r of valid) {
  const b = r.bucket === 'GREEN' ? '🟢' : r.bucket === 'YELLOW' ? '🟡' : '🔴';
  console.log(`| ${b} | ${r.shortUrl} | ${r.score} | ${r.lcp.toFixed(2)}s | ${r.fcp.toFixed(2)}s | ${r.cls.toFixed(3)} | ${r.tbt.toFixed(0)}ms | ${(r.lcpEl||'').slice(0,40)} |`);
}

const green  = valid.filter(r => r.bucket === 'GREEN').length;
const yellow = valid.filter(r => r.bucket === 'YELLOW').length;
const red    = valid.filter(r => r.bucket === 'RED').length;
const errors = results.filter(r => r.error).length;
console.log(`\n🟢 ≥90 & LCP≤2.5s: ${green}   🟡 80-89: ${yellow}   🔴 <80: ${red}   ❌ errors: ${errors}`);
console.log(`Results saved: ${RESULTS_FILE}`);
