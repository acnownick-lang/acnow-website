// P0 verification: 3-run median on /services/ against a staging URL
// Usage: STAGING_URL=https://xxx.netlify.app node scripts/lh_p0_verify.js
const { execSync } = require('child_process');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LH_PATH = require.resolve('lighthouse/cli/index.js');
const STAGING_BASE = process.env.STAGING_URL || 'https://acnowllc.com';
const URL = `${STAGING_BASE}/services/`;

function runOnce(url) {
  const tmp = `/tmp/lh_p0_${Date.now()}.json`;
  try {
    execSync(
      `node "${LH_PATH}" "${url}" ` +
      `--only-categories=performance ` +
      `--throttling-method=simulate ` +
      `--emulated-form-factor=mobile ` +
      `--output=json --output-path="${tmp}" ` +
      `--chrome-path="${CHROME_PATH}" ` +
      `--chrome-flags="--headless=new --disable-gpu --no-sandbox" ` +
      `--quiet`,
      { stdio: 'ignore', timeout: 180000 }
    );
    if (!fs.existsSync(tmp)) return null;
    const d = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    fs.unlinkSync(tmp);
    const score = Math.round((d.categories.performance?.score || 0) * 100);
    const lcp   = (d.audits['largest-contentful-paint']?.numericValue || 0) / 1000;
    const fcp   = (d.audits['first-contentful-paint']?.numericValue || 0) / 1000;
    const cls   = +(d.audits['cumulative-layout-shift']?.numericValue || 0).toFixed(3);
    const tbt   = d.audits['total-blocking-time']?.numericValue || 0;
    // Check fonts.googleapis.com no longer loaded
    const reqs  = d.audits['network-requests']?.details?.items || [];
    const extFonts = reqs.filter(r => (r.url||'').includes('fonts.googleapis.com') || (r.url||'').includes('fonts.gstatic.com'));
    return { score, lcp, fcp, cls, tbt, extFonts };
  } catch(e) {
    if (fs.existsSync(tmp)) try { fs.unlinkSync(tmp); } catch {}
    return null;
  }
}

console.log(`P0 Verification: 3-run median on ${URL}\n`);
const runs = [];
for (let i = 1; i <= 3; i++) {
  console.log(`  Run ${i}/3...`);
  const r = runOnce(URL);
  if (!r) { console.log('  ❌ Run failed'); continue; }
  runs.push(r);
  console.log(`  Run ${i}: score=${r.score} FCP=${r.fcp.toFixed(2)}s LCP=${r.lcp.toFixed(2)}s CLS=${r.cls} extFonts=${r.extFonts.length}`);
}

if (runs.length === 0) { console.log('All runs failed'); process.exit(1); }
runs.sort((a,b) => a.score - b.score);
const med = runs[Math.floor(runs.length/2)];
console.log(`\n  BEFORE: score=67 FCP=3.18s LCP=6.06s`);
console.log(`  AFTER (median of ${runs.length}): score=${med.score} FCP=${med.fcp.toFixed(2)}s LCP=${med.lcp.toFixed(2)}s CLS=${med.cls} TBT=${med.tbt.toFixed(0)}ms`);
console.log(`  External font requests: ${med.extFonts.length} (expect 0)`);
if (med.extFonts.length > 0) {
  console.log('  ⚠️ External fonts still loading:');
  for (const r of med.extFonts) console.log(`    ${r.url}`);
} else {
  console.log('  ✅ No external font requests — Google Fonts CDN eliminated');
}
console.log('\n=== P0 VERIFICATION COMPLETE ===');
