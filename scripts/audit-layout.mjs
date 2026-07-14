import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const rootDir = '/Users/nicholaselia/Desktop/Clients/acnow-netlify';
const liveBaseUrl = 'https://acnowllc-archived.netlify.app';
const localBaseUrl = 'http://localhost:8080'; // fallback or optional

// Output directories
const reportDir = path.join(rootDir, 'audit_reports');
const screenshotDir = path.join(reportDir, 'screenshots');
const artifactReportDir = '/Users/nicholaselia/.gemini/antigravity/brain/eacfa3ad-ed2a-48b3-b7cb-8323a4b25d77/audit';

// Create directories if they don't exist
[reportDir, screenshotDir, artifactReportDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Discover all HTML files
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

async function runAudit() {
  console.log('🔍 Locating HTML pages to audit...');
  const htmlFiles = discoverHtmlFiles(rootDir);
  console.log(`Found ${htmlFiles.length} pages to audit.`);

  console.log('🚀 Launching headless Chromium...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const auditResults = [];

  for (const filePath of htmlFiles) {
    const relativePath = path.relative(rootDir, filePath);
    // Map local path to Netlify live URL
    let urlPath = relativePath.replace(/\\/g, '/');
    if (urlPath === 'index.html') {
      urlPath = '';
    }
    const liveUrl = `${liveBaseUrl}/${urlPath}`;
    
    console.log(`\n--------------------------------------------------`);
    console.log(`📋 Auditing: ${relativePath} -> ${liveUrl}`);

    const result = {
      page: relativePath,
      url: liveUrl,
      consoleErrors: [],
      failedRequests: [],
      desktop: { overflowElements: [], overlaps: [] },
      mobile: { overflowElements: [], overlaps: [] }
    };

    // 1. Audit Desktop (1280px)
    await auditViewport(browser, liveUrl, 1280, 800, 'desktop', result);

    // 2. Audit Mobile (375px)
    await auditViewport(browser, liveUrl, 375, 812, 'mobile', result);

    auditResults.push(result);
  }

  await browser.close();

  // Write reports
  const reportPath = path.join(reportDir, 'audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\n💾 Saved JSON report to: ${reportPath}`);

  // Write MD report
  const mdReportPath = path.join(reportDir, 'audit_report.md');
  const artifactMdReportPath = path.join(artifactReportDir, 'audit_report.md');
  const mdContent = generateMarkdownReport(auditResults);
  fs.writeFileSync(mdReportPath, mdContent);
  fs.writeFileSync(artifactMdReportPath, mdContent);
  console.log(`💾 Saved Markdown report to: ${mdReportPath}`);
  console.log(`💾 Saved artifact Markdown report to: ${artifactMdReportPath}`);

  console.log('\n✅ Audit completed successfully!');
}

async function auditViewport(browser, url, width, height, deviceName, resultObj) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      resultObj.consoleErrors.push(`[${deviceName}] Console error: ${msg.text()}`);
    }
  });

  // Monitor network failures
  page.on('requestfailed', request => {
    resultObj.failedRequests.push(`[${deviceName}] Failed request: ${request.url()} (${request.failure().errorText})`);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Give lazy animations/sliders/renders a moment to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // A. Detect Horizontal Scroll / Overflow
    const overflowElements = await page.evaluate((widthVal) => {
      const overflows = [];
      // Ignore root layout wraps
      const ignoreTags = ['HTML', 'BODY'];
      document.querySelectorAll('*').forEach(el => {
        if (ignoreTags.includes(el.tagName)) return;
        const rect = el.getBoundingClientRect();
        if (rect.right > widthVal + 1 || rect.left < -1) {
          // Verify if it has visible overflow
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            overflows.push({
              tag: el.tagName,
              id: el.id || null,
              classes: el.className || null,
              rect: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) }
            });
          }
        }
      });
      return overflows;
    }, width);

    // B. Detect Absolute/Fixed Element Collisions (overlapping text/interactive tags)
    const overlaps = await page.evaluate(() => {
      const collisions = [];
      const absoluteElements = [];
      const targetElements = [];

      // Find all absolute/fixed elements
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const position = style.position;
        if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) !== 0) {
          if (position === 'absolute' || position === 'fixed') {
            absoluteElements.push({ el, rect: el.getBoundingClientRect(), style });
          } else if (['BUTTON', 'A', 'INPUT', 'LABEL', 'SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'H5'].includes(el.tagName)) {
            // Only consider elements with actual text content or interactive elements
            if (el.textContent.trim().length > 0 || el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
              targetElements.push({ el, rect: el.getBoundingClientRect() });
            }
          }
        }
      });

      // Simple box intersection detection
      absoluteElements.forEach(abs => {
        targetElements.forEach(target => {
          // Don't overlap with yourself or parent/child hierarchy
          if (abs.el === target.el || abs.el.contains(target.el) || target.el.contains(abs.el)) return;

          const r1 = abs.rect;
          const r2 = target.rect;

          // Check if bounding box intersects
          const isIntersecting = !(r2.left >= r1.right - 2 || 
                                   r2.right <= r1.left + 2 || 
                                   r2.top >= r1.bottom - 2 || 
                                   r2.bottom <= r1.top + 2);

          if (isIntersecting) {
            // Check if target is an interactive or semantic text block that shouldn't be covered
            const absStyle = abs.style;
            const targetTag = target.el.tagName;
            
            // Flag if the absolute element has high opacity / background and is stacked on top
            const absZIndex = parseInt(absStyle.zIndex) || 0;
            const targetZIndex = parseInt(window.getComputedStyle(target.el).zIndex) || 0;

            if (absZIndex >= targetZIndex) {
              collisions.push({
                absolute: {
                  tag: abs.el.tagName,
                  id: abs.el.id || null,
                  classes: abs.el.className || null,
                  text: abs.el.textContent.trim().slice(0, 30),
                  rect: { left: Math.round(r1.left), top: Math.round(r1.top), width: Math.round(r1.width), height: Math.round(r1.height) }
                },
                covered: {
                  tag: targetTag,
                  id: target.el.id || null,
                  classes: target.el.className || null,
                  text: target.el.textContent.trim().slice(0, 30),
                  rect: { left: Math.round(r2.left), top: Math.round(r2.top), width: Math.round(r2.width), height: Math.round(r2.height) }
                }
              });
            }
          }
        });
      });

      return collisions;
    });

    resultObj[deviceName].overflowElements = overflowElements;
    resultObj[deviceName].overlaps = overlaps;

    // Capture screenshot
    const pageName = url.split('/').pop() || 'index.html';
    const screenshotFileName = `${pageName.replace('.html', '')}_${deviceName}.png`;
    const screenshotPath = path.join(screenshotDir, screenshotFileName);
    const artifactScreenshotPath = path.join(artifactReportDir, screenshotFileName);

    await page.screenshot({ path: screenshotPath, fullPage: true });
    // Copy screenshot to artifact directory so agent/UI can access it if needed
    fs.copyFileSync(screenshotPath, artifactScreenshotPath);

  } catch (err) {
    console.error(`Error auditing viewport ${deviceName} for ${url}:`, err);
  } finally {
    await page.close();
  }
}

function generateMarkdownReport(results) {
  let md = `# Visual & Layout Audit Report\n\n`;
  md += `Generated on: ${new Date().toISOString()}\n`;
  md += `Live URL audited: [https://acnowllc-archived.netlify.app](https://acnowllc-archived.netlify.app)\n\n`;

  let totalOverflows = 0;
  let totalOverlaps = 0;
  let totalErrors = 0;

  results.forEach(r => {
    totalOverflows += r.desktop.overflowElements.length + r.mobile.overflowElements.length;
    totalOverlaps += r.desktop.overlaps.length + r.mobile.overlaps.length;
    totalErrors += r.consoleErrors.length + r.failedRequests.length;
  });

  md += `## Executive Summary\n\n`;
  md += `| Category | Count | Status |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| ⚠️ Horizontal Overflows | **${totalOverflows}** | ${totalOverflows === 0 ? '✅ Clear' : '🔴 Action Required'} |\n`;
  md += `| 💥 Element Collisions / Overlaps | **${totalOverlaps}** | ${totalOverlaps === 0 ? '✅ Clear' : '🔴 Action Required'} |\n`;
  md += `| 🚫 Console Errors & Broken Requests | **${totalErrors}** | ${totalErrors === 0 ? '✅ Clear' : '🔴 Action Required'} |\n\n`;

  md += `## Detailed Page Results\n\n`;

  results.forEach(r => {
    const pageOverflows = r.desktop.overflowElements.length + r.mobile.overflowElements.length;
    const pageOverlaps = r.desktop.overlaps.length + r.mobile.overlaps.length;
    const pageErrors = r.consoleErrors.length + r.failedRequests.length;

    if (pageOverflows === 0 && pageOverlaps === 0 && pageErrors === 0) {
      md += `### ✅ [${r.page}](https://acnowllc-archived.netlify.app/${r.page === 'index.html' ? '' : r.page}) - Clear\n\n`;
      return;
    }

    md += `### ❌ [${r.page}](https://acnowllc-archived.netlify.app/${r.page === 'index.html' ? '' : r.page})\n\n`;

    if (pageErrors > 0) {
      md += `#### 🚫 Errors & Warnings\n`;
      r.consoleErrors.forEach(err => md += `- \`${err}\`\n`);
      r.failedRequests.forEach(req => md += `- \`${req}\`\n`);
      md += `\n`;
    }

    if (r.desktop.overflowElements.length > 0 || r.mobile.overflowElements.length > 0) {
      md += `#### ⚠️ Horizontal Overflow Elements\n`;
      if (r.desktop.overflowElements.length > 0) {
        md += `**Desktop (1280px):**\n`;
        r.desktop.overflowElements.forEach(el => {
          md += `- \`<${el.tag}>\` with class \`.${el.classes}\` extends to coordinate \`${el.rect.right}px\` (viewport: 1280px)\n`;
        });
      }
      if (r.mobile.overflowElements.length > 0) {
        md += `**Mobile (375px):**\n`;
        r.mobile.overflowElements.forEach(el => {
          md += `- \`<${el.tag}>\` with class \`.${el.classes}\` extends to coordinate \`${el.rect.right}px\` (viewport: 375px)\n`;
        });
      }
      md += `\n`;
    }

    if (r.desktop.overlaps.length > 0 || r.mobile.overlaps.length > 0) {
      md += `#### 💥 Element Collisions / Overlaps\n`;
      
      const formatOverlap = (ol) => {
        return `- \`<${ol.absolute.tag} class=".${ol.absolute.classes}">\` ("${ol.absolute.text}") overlaps \`<${ol.covered.tag} class=".${ol.covered.classes}">\` ("${ol.covered.text}")\n`;
      };

      if (r.desktop.overlaps.length > 0) {
        md += `**Desktop (1280px):**\n`;
        r.desktop.overlaps.slice(0, 10).forEach(ol => md += formatOverlap(ol));
        if (r.desktop.overlaps.length > 10) md += `- ... and ${r.desktop.overlaps.length - 10} more.\n`;
      }
      if (r.mobile.overlaps.length > 0) {
        md += `**Mobile (375px):**\n`;
        r.mobile.overlaps.slice(0, 10).forEach(ol => md += formatOverlap(ol));
        if (r.mobile.overlaps.length > 10) md += `- ... and ${r.mobile.overlaps.length - 10} more.\n`;
      }
      md += `\n`;
    }
  });

  return md;
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
