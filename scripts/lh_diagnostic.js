#!/usr/bin/env node
// Diagnostic pass: render-blocking resources + LCP element identity
// Runs on /services/ (P0) + 3 reps for P1 LCP hypothesis
// One run each — diagnostic only, no changes

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LH_PATH = require.resolve('lighthouse/cli/index.js');

const TARGETS = [
  // P0 — outlier diagnostic
  { url: 'https://acnowllc.com/services/',                                          label: 'P0: /services/' },
  // P1 — LCP element identity for 3 reps
  { url: 'https://acnowllc.com/',                                                   label: 'P1-rep1: homepage' },
  { url: 'https://acnowllc.com/hvac-installation/',                                 label: 'P1-rep2: /hvac-installation/' },
  { url: 'https://acnowllc.com/hvac-installation/hvac-installation-port-st-lucie/', label: 'P1-rep3: city-page' },
  // Also check one of the heavy-four for comparison
  { url: 'https://acnowllc.com/residential-air-conditioning/',                      label: 'P2-sample: /residential-air-conditioning/' },
];

function diagnose(url, label) {
  const tmp = `/tmp/lh_diag_${Date.now()}.json`;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${label}`);
  console.log(`${url}`);
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
    if (!fs.existsSync(tmp)) { console.log('  ❌ no output'); return; }
    const d = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    fs.unlinkSync(tmp);

    const score  = Math.round((d.categories.performance?.score || 0) * 100);
    const lcp    = (d.audits['largest-contentful-paint']?.numericValue || 0) / 1000;
    const fcp    = (d.audits['first-contentful-paint']?.numericValue || 0) / 1000;
    const si     = (d.audits['speed-index']?.numericValue || 0) / 1000;

    console.log(`  Score: ${score}, LCP: ${lcp.toFixed(2)}s, FCP: ${fcp.toFixed(2)}s, SI: ${si.toFixed(2)}s`);

    // LCP element
    const lcpItems = d.audits['largest-contentful-paint-element']?.details?.items || [];
    if (lcpItems.length > 0) {
      const el = lcpItems[0];
      const node = el.node || el;
      const label2 = node.nodeLabel || node.snippet || JSON.stringify(node).slice(0,120);
      const type   = node.type || node.nodeType || '';
      console.log(`  LCP element: [${type}] ${label2}`);
    } else {
      console.log(`  LCP element: (not captured)`);
    }

    // Render-blocking resources
    const rbr = d.audits['render-blocking-resources'];
    if (rbr && rbr.details && rbr.details.items && rbr.details.items.length > 0) {
      console.log(`  ⛔ Render-blocking resources (${rbr.details.items.length}):`);
      for (const item of rbr.details.items) {
        const savings = ((item.wastedMs || 0) / 1000).toFixed(2);
        console.log(`      ${item.url} — ${savings}s savings`);
      }
    } else {
      console.log(`  ✅ No render-blocking resources flagged`);
    }

    // Critical request chains (first 3 nodes)
    const chains = d.audits['critical-request-chains'];
    if (chains && chains.details && chains.details.chains) {
      const chainKeys = Object.keys(chains.details.chains);
      console.log(`  Critical chains root nodes: ${chainKeys.length}`);
      for (const key of chainKeys.slice(0, 3)) {
        const ch = chains.details.chains[key];
        const req = ch.request || {};
        const childCount = Object.keys(ch.children || {}).length;
        console.log(`      ${req.url || key} (${childCount} children)`);
      }
    }

    // Long tasks / TBT
    const tbt = d.audits['total-blocking-time']?.numericValue || 0;
    console.log(`  TBT: ${tbt.toFixed(0)}ms`);

    // bootup-time — JS per script
    const bootup = d.audits['bootup-time'];
    if (bootup && bootup.details && bootup.details.items && bootup.details.items.length > 0) {
      const top = bootup.details.items.slice(0, 4);
      console.log(`  Top JS boot times:`);
      for (const item of top) {
        console.log(`      ${(item.url||'').slice(-60)} total:${(item.total||0).toFixed(0)}ms scripting:${(item.scripting||0).toFixed(0)}ms`);
      }
    }

    // Unused CSS/JS
    const unusedCss = d.audits['unused-css-rules'];
    const unusedJs  = d.audits['unused-javascript'];
    if (unusedCss) console.log(`  Unused CSS savings: ${((unusedCss.numericValue||0)/1000).toFixed(2)}s`);
    if (unusedJs)  console.log(`  Unused JS savings:  ${((unusedJs.numericValue||0)/1000).toFixed(2)}s`);

    // Server response time
    const ttfb = d.audits['server-response-time'];
    if (ttfb) console.log(`  TTFB: ${(ttfb.numericValue||0).toFixed(0)}ms`);

    // network-requests: first 8
    const netReqs = d.audits['network-requests']?.details?.items || [];
    const critical = netReqs.filter(r => r.priority === 'VeryHigh' || r.priority === 'High').slice(0, 8);
    if (critical.length) {
      console.log(`  High-priority network requests:`);
      for (const r of critical) {
        const size = (r.transferSize || 0);
        console.log(`      [${r.priority}] ${(r.url||'').replace('https://acnowllc.com','').slice(0,70)} ${(size/1024).toFixed(0)}KB ${r.resourceType||''}`);
      }
    }

  } catch(e) {
    if (fs.existsSync(tmp)) try { fs.unlinkSync(tmp); } catch {}
    console.log(`  ❌ Error: ${e.message.slice(0,100)}`);
  }
}

for (const t of TARGETS) {
  diagnose(t.url, t.label);
}
console.log('\n\n=== DIAGNOSTIC COMPLETE ===');
