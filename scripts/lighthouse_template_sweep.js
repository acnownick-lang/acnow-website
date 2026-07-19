#!/usr/bin/env node
// Structured template sweep — Phase 1
// Group A + B: sequential, 3-run medians (precision)
// Confirmation tail: 3 parallel workers, single run each, divergence-flag only
// Resume-safe via scratch/lh_sweep_results.json

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LH_PATH = require.resolve('lighthouse/cli/index.js');
const RESULTS_FILE  = path.join(__dirname, '../scratch/lh_sweep_results.json');
const CONFIRM_FILE  = path.join(__dirname, '../scratch/lh_confirmation_results.json');

// ── GROUP A: unique/handcrafted + core service pages ──────────────────────────
const GROUP_A = [
  'https://acnowllc.com/',
  'https://acnowllc.com/about/',
  'https://acnowllc.com/areas/',
  'https://acnowllc.com/reviews/',
  'https://acnowllc.com/contact-us/',
  'https://acnowllc.com/partners-and-referrals/',
  'https://acnowllc.com/privacy/',
  'https://acnowllc.com/accessibility/',
  'https://acnowllc.com/storm-prep/',
  'https://acnowllc.com/air-quality/',
  'https://acnowllc.com/ductless-mini-split-systems/',
  'https://acnowllc.com/residential-air-conditioning/',
  'https://acnowllc.com/residential-air-conditioning/unveiling-comfort-a-c-nows-expertise-in-residential-air-conditioning/',
  'https://acnowllc.com/services/',
  'https://acnowllc.com/ac-repair/',
  'https://acnowllc.com/ac-installation/',
  'https://acnowllc.com/ac-maintenance/',
  'https://acnowllc.com/commercial/',
];

// ── GROUP B: one representative per template family ───────────────────────────
const GROUP_B = [
  { url: 'https://acnowllc.com/hvac-services-stuart/',                                                                          family: 'hvac-services-{city}' },
  { url: 'https://acnowllc.com/hvac-installation/',                                                                             family: 'hub:hvac-installation' },
  { url: 'https://acnowllc.com/hvac-repair/',                                                                                   family: 'hub:hvac-repair' },
  { url: 'https://acnowllc.com/hvac-maintenance/',                                                                              family: 'hub:hvac-maintenance' },
  { url: 'https://acnowllc.com/commercial-hvac/',                                                                               family: 'hub:commercial-hvac' },
  { url: 'https://acnowllc.com/pool-heating/',                                                                                  family: 'hub:pool-heating' },
  { url: 'https://acnowllc.com/ac-replacement/',                                                                                family: 'hub:ac-replacement' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/',                                            family: 'city-page:install' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-martin-county/',                                     family: 'county-page:install' },
  { url: 'https://acnowllc.com/hvac-repair/air-quality-monitoring-service/',                                                    family: 'article:hvac-repair' },
  { url: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-port-saint-lucie-should-i-repair-or-replace-my-air-conditioner/', family: 'city-article:hvac-repair' },
];

// ── CONFIRMATION TAIL: remaining clones, single run, parallel ─────────────────
const TAIL = [
  // hvac-services-{city} clones (8 remaining)
  { url: 'https://acnowllc.com/hvac-services-palm-city/',          tUrl: 'https://acnowllc.com/hvac-services-stuart/' },
  { url: 'https://acnowllc.com/hvac-services-port-st-lucie/',      tUrl: 'https://acnowllc.com/hvac-services-stuart/' },
  { url: 'https://acnowllc.com/hvac-services-jensen-beach/',       tUrl: 'https://acnowllc.com/hvac-services-stuart/' },
  { url: 'https://acnowllc.com/hvac-services-hobe-sound/',         tUrl: 'https://acnowllc.com/hvac-services-stuart/' },
  { url: 'https://acnowllc.com/hvac-services-north-palm-beach/',   tUrl: 'https://acnowllc.com/hvac-services-stuart/' },
  { url: 'https://acnowllc.com/hvac-services-fort-pierce/',        tUrl: 'https://acnowllc.com/hvac-services-stuart/' },
  { url: 'https://acnowllc.com/hvac-services-jupiter/',            tUrl: 'https://acnowllc.com/hvac-services-stuart/' },
  { url: 'https://acnowllc.com/hvac-services-palm-beach-gardens/', tUrl: 'https://acnowllc.com/hvac-services-stuart/' },
  // commercial-hvac city clones (5)
  { url: 'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-fort-pierce/',        tUrl: 'https://acnowllc.com/commercial-hvac/' },
  { url: 'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-jupiter/',            tUrl: 'https://acnowllc.com/commercial-hvac/' },
  { url: 'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-palm-beach-gardens/', tUrl: 'https://acnowllc.com/commercial-hvac/' },
  { url: 'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-palm-city/',          tUrl: 'https://acnowllc.com/commercial-hvac/' },
  { url: 'https://acnowllc.com/commercial-hvac/commercial-hvac-companies-in-stuart/',             tUrl: 'https://acnowllc.com/commercial-hvac/' },
  // hvac-installation city/county clones (13)
  { url: 'https://acnowllc.com/hvac-installation/ensure-your-air-quality-and-comfort-in-saint-lucie-west/',    tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/get-commercial-air-quality-services-in-jensen-beach/',        tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-jensen-beach/',                      tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-port-saint-lucie/',                  tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-saint-lucie-county/',                tUrl: 'https://acnowllc.com/hvac-equipment-repair-in-martin-county/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-saint-lucie-west/',                  tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-fort-pierce/',                              tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-jupiter/',                                  tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-palm-beach-gardens/',                       tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-palm-city/',                                tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-services-in-jensen-beach/',                 tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-services-in-martin-county/',                tUrl: 'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-martin-county/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-services-in-saint-lucie-county/',           tUrl: 'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-martin-county/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-services-in-saint-lucie-west/',             tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-stuart/',                                   tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/improve-your-air-quality-with-ac-now-in-saint-lucie-county/', tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  { url: 'https://acnowllc.com/hvac-installation/optimize-your-humidity-indoors-in-martin-county/',            tUrl: 'https://acnowllc.com/hvac-installation/hvac-equipment-repair-in-martin-county/' },
  { url: 'https://acnowllc.com/hvac-installation/professional-air-quality-monitoring-in-port-saint-lucie/',   tUrl: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/' },
  // hvac-maintenance city clones (6)
  { url: 'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-fort-pierce/',        tUrl: 'https://acnowllc.com/hvac-maintenance/' },
  { url: 'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-jupiter/',            tUrl: 'https://acnowllc.com/hvac-maintenance/' },
  { url: 'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-palm-beach-gardens/', tUrl: 'https://acnowllc.com/hvac-maintenance/' },
  { url: 'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-palm-city/',          tUrl: 'https://acnowllc.com/hvac-maintenance/' },
  { url: 'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-port-saint-lucie/',   tUrl: 'https://acnowllc.com/hvac-maintenance/' },
  { url: 'https://acnowllc.com/hvac-maintenance/air-conditioner-maintenance-service-in-stuart/',             tUrl: 'https://acnowllc.com/hvac-maintenance/' },
  // hvac-repair city article clones (5) + extra article
  { url: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-ft-pierce-should-i-repair-or-replace-my-air-conditioner/',            tUrl: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-port-saint-lucie-should-i-repair-or-replace-my-air-conditioner/' },
  { url: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-jupiter-should-i-repair-or-replace-my-air-conditioner/',              tUrl: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-port-saint-lucie-should-i-repair-or-replace-my-air-conditioner/' },
  { url: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-palm-beach-gardens-should-i-repair-or-replace-my-air-conditioner/',   tUrl: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-port-saint-lucie-should-i-repair-or-replace-my-air-conditioner/' },
  { url: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-palm-city-should-i-repair-or-replace-my-air-conditioner/',            tUrl: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-port-saint-lucie-should-i-repair-or-replace-my-air-conditioner/' },
  { url: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-stuart-should-i-repair-or-replace-my-air-conditioner/',               tUrl: 'https://acnowllc.com/hvac-repair/ac-repair-service-in-port-saint-lucie-should-i-repair-or-replace-my-air-conditioner/' },
  { url: 'https://acnowllc.com/hvac-repair/hvac-equipment-repair/',                                                                    tUrl: 'https://acnowllc.com/hvac-repair/air-quality-monitoring-service/' },
  // pool-heating city clones (6)
  { url: 'https://acnowllc.com/pool-heating/pool-heating-in-fort-pierce/',        tUrl: 'https://acnowllc.com/pool-heating/' },
  { url: 'https://acnowllc.com/pool-heating/pool-heating-in-jupiter/',            tUrl: 'https://acnowllc.com/pool-heating/' },
  { url: 'https://acnowllc.com/pool-heating/pool-heating-in-palm-beach-gardens/', tUrl: 'https://acnowllc.com/pool-heating/' },
  { url: 'https://acnowllc.com/pool-heating/pool-heating-in-palm-city/',          tUrl: 'https://acnowllc.com/pool-heating/' },
  { url: 'https://acnowllc.com/pool-heating/pool-heating-in-port-saint-lucie/',   tUrl: 'https://acnowllc.com/pool-heating/' },
  { url: 'https://acnowllc.com/pool-heating/pool-heating-in-stuart/',             tUrl: 'https://acnowllc.com/pool-heating/' },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function getMedian(arr, key) {
  const s = [...arr].sort((a, b) => a[key] - b[key]);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m][key] : (s[m-1][key] + s[m][key]) / 2;
}

function bucket(score, lcp) {
  return (score >= 90 && lcp <= 2.5) ? 'GREEN' : score >= 80 ? 'YELLOW' : 'RED';
}

function lhArgs(url) {
  const tmp = `/tmp/lh_${Date.now()}_${Math.random().toString(36).slice(2)}.json`;
  return {
    tmp,
    cmd: `node "${LH_PATH}" "${url}" --only-categories=performance --throttling-method=simulate --emulated-form-factor=mobile --output=json --output-path="${tmp}" --chrome-path="${CHROME_PATH}" --chrome-flags="--headless=new --disable-gpu --no-sandbox" --quiet`
  };
}

// Sequential single run (for A+B precision phase)
function runOnce(url) {
  const { tmp, cmd } = lhArgs(url);
  try {
    execSync(cmd, { stdio: 'ignore', timeout: 180000 });
    if (!fs.existsSync(tmp)) return null;
    const d = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    fs.unlinkSync(tmp);
    return {
      score:  Math.round((d.categories.performance?.score || 0) * 100),
      lcp:    (d.audits['largest-contentful-paint']?.numericValue || 0) / 1000,
      fcp:    (d.audits['first-contentful-paint']?.numericValue || 0) / 1000,
      cls:    d.audits['cumulative-layout-shift']?.numericValue || 0,
      tbt:    d.audits['total-blocking-time']?.numericValue || 0,
      lcpEl:  d.audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.nodeLabel || '',
    };
  } catch { if (fs.existsSync(tmp)) try { fs.unlinkSync(tmp); } catch {} return null; }
}

// Async single run (for parallel confirmation tail)
function runOnceAsync(url) {
  return new Promise((resolve) => {
    const { tmp, cmd } = lhArgs(url);
    exec(cmd, { timeout: 180000 }, (err) => {
      try {
        if (!fs.existsSync(tmp)) { resolve(null); return; }
        const d = JSON.parse(fs.readFileSync(tmp, 'utf8'));
        fs.unlinkSync(tmp);
        resolve({
          score: Math.round((d.categories.performance?.score || 0) * 100),
          lcp:   (d.audits['largest-contentful-paint']?.numericValue || 0) / 1000,
        });
      } catch { if (fs.existsSync(tmp)) try { fs.unlinkSync(tmp); } catch {} resolve(null); }
    });
  });
}

// Parallel worker pool (concurrency = 3)
async function runParallelPool(items, concurrency, worker) {
  const queue = [...items];
  let active = 0;
  return new Promise((resolve) => {
    function pump() {
      while (active < concurrency && queue.length > 0) {
        const item = queue.shift();
        active++;
        worker(item).then(() => { active--; pump(); });
      }
      if (active === 0 && queue.length === 0) resolve();
    }
    pump();
  });
}

function measurePage(url) {
  const run1 = runOnce(url);
  if (!run1) return null;
  const runs = [run1];
  const total = (run1.score >= 85 && run1.score <= 92) ? 5 : 3;
  for (let i = 2; i <= total; i++) {
    const r = runOnce(url);
    if (r) runs.push(r);
  }
  return {
    score: getMedian(runs, 'score'),
    lcp:   getMedian(runs, 'lcp'),
    fcp:   getMedian(runs, 'fcp'),
    cls:   getMedian(runs, 'cls'),
    tbt:   getMedian(runs, 'tbt'),
    lcpEl: runs[0].lcpEl,
    nRuns: runs.length,
  };
}

function printTable(rows, title) {
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  console.log(`\n\n════════════════════════════════════════════════════`);
  console.log(`${title}`);
  console.log(`════════════════════════════════════════════════════`);
  console.log(`| Bucket | URL | Score | LCP | FCP | CLS | TBT | LCP Element |`);
  console.log(`|--------|-----|-------|-----|-----|-----|-----|-------------|`);
  for (const r of sorted) {
    const b = r.bucket === 'GREEN' ? '🟢' : r.bucket === 'YELLOW' ? '🟡' : '🔴';
    const short = (r.shortUrl || r.url.replace('https://acnowllc.com','')||'/');
    console.log(`| ${b} | ${short} | ${r.score} | ${r.lcp.toFixed(2)}s | ${r.fcp.toFixed(2)}s | ${r.cls.toFixed(3)} | ${r.tbt.toFixed(0)}ms | ${(r.lcpEl||'').slice(0,38)} |`);
  }
  const g = rows.filter(r => r.bucket==='GREEN').length;
  const y = rows.filter(r => r.bucket==='YELLOW').length;
  const red = rows.filter(r => r.bucket==='RED').length;
  console.log(`\n🟢 ${g}   🟡 ${y}   🔴 ${red}   (of ${rows.length} pages measured)`);
}

// ── Load cache ────────────────────────────────────────────────────────────────
let results = [];
if (fs.existsSync(RESULTS_FILE)) {
  try { results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); } catch {}
}
const doneUrls = new Set(results.map(r => r.url));
const allPriority = new Set([...GROUP_A, ...GROUP_B.map(b => b.url)]);

console.log(`Resuming: ${results.length} cached, ${results.filter(r => allPriority.has(r.url)).length}/${GROUP_A.length+GROUP_B.length} priority done\n`);

// ── GROUP A: sequential ───────────────────────────────────────────────────────
console.log('=== GROUP A — Unique/handcrafted + core service pages ===');
for (let i = 0; i < GROUP_A.length; i++) {
  const url = GROUP_A[i];
  const short = url.replace('https://acnowllc.com','')||'/';
  if (doneUrls.has(url)) { console.log(`[A${i+1}/${GROUP_A.length}] CACHED: ${short}`); continue; }
  console.log(`\n[A${i+1}/${GROUP_A.length}] ${short}`);
  const m = measurePage(url);
  if (!m) { console.log(`  ❌ all runs failed`); results.push({ url, shortUrl: short, error: true }); }
  else {
    const bkt = bucket(m.score, m.lcp);
    console.log(`  MEDIAN: ${bkt} ${m.score}, LCP ${m.lcp.toFixed(2)}s, FCP ${m.fcp.toFixed(2)}s, CLS ${m.cls.toFixed(3)}, TBT ${m.tbt.toFixed(0)}ms (${m.nRuns} runs)`);
    results.push({ url, shortUrl: short, ...m, bucket: bkt });
  }
  doneUrls.add(url);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

// ── GROUP B: sequential ───────────────────────────────────────────────────────
console.log('\n=== GROUP B — Template representatives ===');
for (let i = 0; i < GROUP_B.length; i++) {
  const { url, family } = GROUP_B[i];
  const short = url.replace('https://acnowllc.com','')||'/';
  if (doneUrls.has(url)) { console.log(`[B${i+1}/${GROUP_B.length}] CACHED: ${short} [${family}]`); continue; }
  console.log(`\n[B${i+1}/${GROUP_B.length}] ${short} [${family}]`);
  const m = measurePage(url);
  if (!m) { console.log(`  ❌ all runs failed`); results.push({ url, shortUrl: short, family, error: true }); }
  else {
    const bkt = bucket(m.score, m.lcp);
    console.log(`  MEDIAN: ${bkt} ${m.score}, LCP ${m.lcp.toFixed(2)}s, FCP ${m.fcp.toFixed(2)}s, CLS ${m.cls.toFixed(3)}, TBT ${m.tbt.toFixed(0)}ms (${m.nRuns} runs)`);
    results.push({ url, shortUrl: short, family, ...m, bucket: bkt });
  }
  doneUrls.add(url);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

// ── DELIVER TABLE ─────────────────────────────────────────────────────────────
const priorityRows = results.filter(r => allPriority.has(r.url) && !r.error && r.score != null);
printTable(priorityRows, 'PHASE 1 TABLE — ALL TEMPLATES & UNIQUE PAGES (Groups A+B)');
console.log('\n\n*** TABLE DELIVERED — awaiting Phase 2 sign-off before any fixes ***');
console.log('*** Starting confirmation tail (parallel × 3) ***\n');

// ── CONFIRMATION TAIL: parallel × 3 ──────────────────────────────────────────
(async () => {
  let confirmResults = [];
  if (fs.existsSync(CONFIRM_FILE)) {
    try { confirmResults = JSON.parse(fs.readFileSync(CONFIRM_FILE, 'utf8')); } catch {}
  }
  const confirmedUrls = new Set(confirmResults.map(r => r.url));

  // Build template score map from precision results
  const templateScore = {};
  for (const r of results) { templateScore[r.url] = r.score; }

  const todo = TAIL.filter(t => !confirmedUrls.has(t.url));
  console.log(`Confirmation tail: ${todo.length} clones to verify (3 parallel workers)\n`);

  // Serialize file writes across parallel workers
  let writeChain = Promise.resolve();
  const safeWrite = (entry) => {
    writeChain = writeChain.then(() => {
      let cf = [];
      try { cf = JSON.parse(fs.readFileSync(CONFIRM_FILE, 'utf8')); } catch {}
      cf.push(entry);
      fs.writeFileSync(CONFIRM_FILE, JSON.stringify(cf, null, 2));
    });
    return writeChain;
  };

  await runParallelPool(todo, 3, async ({ url, tUrl }) => {
    const short = url.replace('https://acnowllc.com','');
    const r = await runOnceAsync(url);
    const tScore = templateScore[tUrl];
    const diff = (r && tScore != null) ? Math.abs(r.score - tScore) : null;
    const flag = diff != null && diff > 3;
    const status = !r ? '❌ FAILED' : flag ? `⚠️  DIVERGES ${diff}pts from template (${tScore})` : `✅ ok (${r ? r.score : '?'} vs template ${tScore})`;
    const entry = { url, shortUrl: short, tUrl, score: r?.score, lcp: r?.lcp, templateScore: tScore, diff, flag: !!flag, error: !r };
    console.log(`  [TAIL] ${short}: ${status}`);
    await safeWrite(entry);
  });

  // Final confirmation summary
  let cf = [];
  try { cf = JSON.parse(fs.readFileSync(CONFIRM_FILE, 'utf8')); } catch {}
  const flagged = cf.filter(r => r.flag);
  console.log(`\n=== CONFIRMATION TAIL COMPLETE: ${cf.length} clones verified ===`);
  if (flagged.length === 0) {
    console.log('✅ No divergences >3pts — template medians stand for all clone families.');
  } else {
    console.log(`⚠️  ${flagged.length} pages diverge >3pts from their template:`);
    for (const r of flagged) {
      console.log(`  ${r.shortUrl}: ${r.score} vs template ${r.templateScore} (diff ${r.diff}pts)`);
    }
  }
})();


