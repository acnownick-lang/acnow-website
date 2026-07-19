#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetUrl = process.argv[2];
if (!targetUrl) {
  console.error("Usage: node scripts/lighthouse_5_runs.js <url>");
  process.exit(1);
}

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LH_PATH = require.resolve('lighthouse/cli/index.js');

console.log(`Running Lighthouse 5 times on: ${targetUrl}`);
console.log(`Using Lighthouse CLI path: ${LH_PATH}`);

const runs = [];
for (let i = 1; i <= 5; i++) {
  console.log(`Run ${i}/5...`);
  const tmpOut = path.join('/tmp', `lh_run_${Date.now()}_${i}.json`);
  
  try {
    execSync(
      `node "${LH_PATH}" "${targetUrl}" ` +
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
    
    if (fs.existsSync(tmpOut)) {
      const data = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
      fs.unlinkSync(tmpOut);
      
      const score = Math.round((data.categories.performance?.score || 0) * 100);
      const lcp = data.audits['largest-contentful-paint']?.numericValue / 1000; // in seconds
      const fcp = data.audits['first-contentful-paint']?.numericValue / 1000;
      const cls = data.audits['cumulative-layout-shift']?.numericValue;
      const tbt = data.audits['total-blocking-time']?.numericValue;
      const si = data.audits['speed-index']?.numericValue / 1000;
      
      runs.push({ score, lcp, fcp, cls, tbt, si });
      console.log(`  ➔ Score: ${score}, LCP: ${lcp.toFixed(2)}s, FCP: ${fcp.toFixed(2)}s, CLS: ${cls.toFixed(3)}, TBT: ${tbt.toFixed(0)}ms`);
    } else {
      console.error(`  ❌ Run ${i} failed: output file not found.`);
    }
  } catch (err) {
    console.error(`  ❌ Run ${i} failed: ${err.message}`);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
}

if (runs.length === 0) {
  console.error("All Lighthouse runs failed!");
  process.exit(1);
}

// Compute medians
function getMedian(arr, key) {
  const sorted = [...arr].sort((a, b) => a[key] - b[key]);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid][key];
  }
  return (sorted[mid - 1][key] + sorted[mid][key]) / 2;
}

const medianScore = getMedian(runs, 'score');
const medianLCP = getMedian(runs, 'lcp');
const medianFCP = getMedian(runs, 'fcp');
const medianCLS = getMedian(runs, 'cls');
const medianTBT = getMedian(runs, 'tbt');
const medianSI = getMedian(runs, 'si');

console.log("\n### Lighthouse 5-Run Summary");
console.log("| Run | Score | LCP (s) | FCP (s) | CLS | TBT (ms) | Speed Index (s) |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
runs.forEach((r, idx) => {
  console.log(`| Run ${idx + 1} | ${r.score} | ${r.lcp.toFixed(2)}s | ${r.fcp.toFixed(2)}s | ${r.cls.toFixed(3)} | ${r.tbt.toFixed(0)}ms | ${r.si.toFixed(2)}s |`);
});
console.log(`| **Median** | **${medianScore}** | **${medianLCP.toFixed(2)}s** | **${medianFCP.toFixed(2)}s** | **${medianCLS.toFixed(3)}** | **${medianTBT.toFixed(0)}ms** | **${medianSI.toFixed(2)}s** |`);
