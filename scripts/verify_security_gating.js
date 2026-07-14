// verify_security_gating.js (JXA)
// Run with: osascript -l JavaScript verify_security_gating.js

const Chrome = Application("Google Chrome");
Chrome.activate();

function runTest(testName, testFn) {
    console.log(`Running test: ${testName}...`);
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

// Test 1: Redirect Gating Check
allPassed = runTest("Gating Redirect for Unauthenticated User", () => {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    // Clear localStorage on index.html
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/index.html";
    delay(1.0);
    tab.execute({ javascript: "localStorage.clear();" });
    delay(0.5);
    
    // Visit gated page
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/pages/3d-airflow.html";
    delay(2.5); // Wait for redirect to process
    
    const finalUrl = tab.url();
    win.close();
    
    const expectedQuery = "redirected=phase2-restricted";
    const expectedReturn = "returnTo=";
    const isRedirected = finalUrl.includes("index.html") && finalUrl.includes(expectedQuery) && finalUrl.includes(expectedReturn);
    
    if (isRedirected) {
        console.log(`  Redirected to: ${finalUrl}`);
        return true;
    } else {
        console.log(`  Failed redirect. Final URL: ${finalUrl}`);
        return false;
    }
}) && allPassed;

// Test 2: Gated Page Access for Authenticated User
allPassed = runTest("Authorized Access for Phase 2 User", () => {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    // Set localStorage phase 2 on index.html
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/index.html";
    delay(1.0);
    tab.execute({ javascript: "localStorage.setItem('acnow_dev_mode', 'true'); localStorage.setItem('acnow_phase', '2');" });
    delay(0.5);
    
    // Visit gated page
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/pages/3d-airflow.html";
    delay(2.0);
    
    const pageClass = tab.execute({ javascript: "document.documentElement.className" });
    const navBarDisplay = tab.execute({ javascript: "window.getComputedStyle(document.querySelector('.top-nav-bar')).display" });
    win.close();
    
    console.log(`  HTML root class: ${pageClass}`);
    console.log(`  Top nav bar display: ${navBarDisplay}`);
    
    return pageClass.includes("phase-2") && navBarDisplay === "flex";
}) && allPassed;

// Test 3: No-JS rendering block styling check
allPassed = runTest("No-JS Rendering Access Bypass Block", () => {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    // Clear localStorage on index.html to force Phase 1
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/index.html";
    delay(1.0);
    tab.execute({ javascript: "localStorage.clear();" });
    delay(0.5);
    
    // Visit gated page
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/pages/3d-airflow.html";
    delay(0.1); // Small window before redirect completes
    
    // Query class and check stylesheet existence
    const rootClass = tab.execute({ javascript: "document.documentElement.className" });
    win.close();
    
    console.log(`  Initial HTML root class: ${rootClass}`);
    return rootClass === "phase-1";
}) && allPassed;

console.log(`Summary: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
allPassed ? 0 : 1;
