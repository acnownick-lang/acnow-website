// verify_pwa_assets.js (JXA)
// Run with: osascript -l JavaScript verify_pwa_assets.js

const Chrome = Application("Google Chrome");
Chrome.activate();

function runTest(testName, testFn) {
    console.log(`Running PWA Audit: ${testName}...`);
    try {
        const result = testFn();
        console.log(`RESULT: ${result ? "PASS" : "FAIL"}\n`);
        return result;
    } catch (e) {
        console.log(`RESULT: ERROR - ${e.message}\n`);
        return false;
    }
}

let allPassed = true;

// Test 1: Icon paths inside manifest.json are corrected to assets/images/
allPassed = runTest("Verify icon paths inside manifest.json are corrected to assets/images/", () => {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    // Visit manifest.json
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/manifest.json";
    delay(1.5); // Wait for load
    
    const manifestText = tab.execute({ javascript: "document.body.innerText" });
    win.close();
    
    const manifest = JSON.parse(manifestText);
    if (!manifest.icons || manifest.icons.length === 0) {
        console.log("  No icons array in manifest.json!");
        return false;
    }
    
    let iconsCorrect = true;
    manifest.icons.forEach(icon => {
        console.log(`  Checking icon: ${icon.src}`);
        if (!icon.src.startsWith("assets/images/")) {
            console.log(`    Incorrect path: ${icon.src}`);
            iconsCorrect = false;
        }
    });
    
    // Check shortcuts as well
    if (manifest.shortcuts) {
        manifest.shortcuts.forEach(shortcut => {
            if (shortcut.icons) {
                shortcut.icons.forEach(icon => {
                    console.log(`  Checking shortcut icon: ${icon.src}`);
                    if (!icon.src.startsWith("assets/images/")) {
                        console.log(`    Incorrect path: ${icon.src}`);
                        iconsCorrect = false;
                    }
                });
            }
        });
    }

    // Check screenshots as well
    if (manifest.screenshots) {
        manifest.screenshots.forEach(screenshot => {
            console.log(`  Checking screenshot: ${screenshot.src}`);
            if (!screenshot.src.startsWith("assets/images/")) {
                console.log(`    Incorrect path: ${screenshot.src}`);
                iconsCorrect = false;
            }
        });
    }

    return iconsCorrect;
}) && allPassed;

// Test 2: Confirm three.min.js and OrbitControls.js are precached in the service worker static assets list
allPassed = runTest("Verify three.min.js and OrbitControls.js in sw.js precache list", () => {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    // Visit sw.js
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/sw.js";
    delay(1.5); // Wait for load
    
    const swText = tab.execute({ javascript: "document.body.innerText" });
    win.close();
    
    // Parse STATIC_ASSETS array or use simple regex/string search
    const hasThree = swText.includes("assets/lib/three.min.js");
    const hasOrbit = swText.includes("assets/lib/OrbitControls.js");
    
    console.log(`  Found assets/lib/three.min.js: ${hasThree}`);
    console.log(`  Found assets/lib/OrbitControls.js: ${hasOrbit}`);
    
    return hasThree && hasOrbit;
}) && allPassed;

// Test 3: Confirm that a manifest link tag is present inside pages/3d-airflow.html's head
allPassed = runTest("Verify manifest link tag inside pages/3d-airflow.html's head", () => {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/pages/3d-airflow.html";
    delay(2.5); // wait longer to pass gating if gated
    
    let finalUrl = tab.url();
    console.log(`  Initial loaded URL: ${finalUrl}`);
    
    // If redirect happens because localStorage phase is not 2, let's set it first
    if (finalUrl.includes("index.html")) {
        console.log("  Redirected to index.html. Let's set phase=2 in localStorage and re-try...");
        // Set storage on index.html
        tab.execute({ javascript: "localStorage.setItem('acnow_dev_mode', 'true'); localStorage.setItem('acnow_phase', '2');" });
        delay(0.5);
        // Navigate again
        tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/pages/3d-airflow.html";
        delay(2.0);
        finalUrl = tab.url();
        console.log(`  Loaded URL after setting localStorage: ${finalUrl}`);
    }
    
    const manifestHref = tab.execute({ javascript: "const link = document.querySelector('link[rel=\"manifest\"]'); link ? link.getAttribute('href') : '';" });
    win.close();
    
    console.log(`  Manifest link tag href: "${manifestHref}"`);
    return manifestHref !== "";
}) && allPassed;

console.log(`PWA Audit Summary: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
allPassed ? 0 : 1;
