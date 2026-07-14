// verify_media_optimizations.js (JXA)
// Run with: osascript -l JavaScript verify_media_optimizations.js

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

function prepareAuthorizedTab() {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    // 1. Visit index.html to set local storage auth variables
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/index.html";
    
    // Wait for localStorage to be available
    let storageReady = false;
    for (let i = 0; i < 20; i++) {
        try {
            storageReady = tab.execute({ javascript: "typeof localStorage !== 'undefined'" });
            if (storageReady) break;
        } catch (e) {}
        delay(0.2);
    }
    
    tab.execute({ javascript: "localStorage.setItem('acnow_dev_mode', 'true'); localStorage.setItem('acnow_phase', '2');" });
    delay(0.2);
    
    // 2. Navigate to the gated 3d-airflow page
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/pages/3d-airflow.html";
    
    // Wait for document load and main script initialization (checking for init function)
    let pageReady = false;
    for (let i = 0; i < 30; i++) {
        try {
            pageReady = tab.execute({ javascript: "document.readyState === 'complete' && typeof init === 'function'" });
            if (pageReady) break;
        } catch (e) {}
        delay(0.3);
    }
    
    if (!pageReady) {
        console.log("  Warning: Page did not signal readiness (init function not found or document not complete)");
    }
    
    // 3. Dismiss welcome onboarding modal if present
    tab.execute({ javascript: "(function() { const btn = document.querySelector('.welcome-btn'); if (btn) btn.click(); })();" });
    delay(0.3);

    return { win, tab };
}

// Test 1: Preload tags check
allPassed = runTest("Verify Preload Tags for WebGL Libraries", () => {
    const { win, tab } = prepareAuthorizedTab();
    
    const hasPreloadThree = tab.execute({ javascript: "!!document.querySelector('link[rel=\"preload\"][href*=\"three.min.js\"][as=\"script\"]')" });
    const hasPreloadControls = tab.execute({ javascript: "!!document.querySelector('link[rel=\"preload\"][href*=\"OrbitControls.js\"][as=\"script\"]')" });
    
    win.close();
    
    console.log(`  three.min.js preloaded: ${hasPreloadThree}`);
    console.log(`  OrbitControls.js preloaded: ${hasPreloadControls}`);
    
    return hasPreloadThree && hasPreloadControls;
}) && allPassed;

// Test 2: Camera & Renderer Size client dimensions inside init()
allPassed = runTest("Verify Client Dimension Usage inside init()", () => {
    const { win, tab } = prepareAuthorizedTab();
    
    const initCode = tab.execute({ javascript: "init.toString()" });
    win.close();
    
    if (!initCode) {
        throw new Error("Could not retrieve init function code");
    }
    
    // Verify that init retrieves client dimensions and initializes camera and renderer size with them
    const hasClientWidth = initCode.includes("canvas.clientWidth");
    const hasClientHeight = initCode.includes("canvas.clientHeight");
    const hasSizeCall = initCode.includes("renderer.setSize(width, height, false)");
    const hasCameraAspect = initCode.includes("camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000)");

    console.log(`  Retrieves canvas clientWidth: ${hasClientWidth}`);
    console.log(`  Retrieves canvas clientHeight: ${hasClientHeight}`);
    console.log(`  Renderer setSize call: ${hasSizeCall}`);
    console.log(`  Camera init uses client aspect ratio: ${hasCameraAspect}`);
    
    return hasClientWidth && hasClientHeight && hasSizeCall && hasCameraAspect;
}) && allPassed;

// Test 3: Camera & Renderer Size client dimensions inside onWindowResize()
allPassed = runTest("Verify Client Dimension Usage inside onWindowResize()", () => {
    const { win, tab } = prepareAuthorizedTab();
    
    const resizeCode = tab.execute({ javascript: "onWindowResize.toString()" });
    win.close();
    
    if (!resizeCode) {
        throw new Error("Could not retrieve onWindowResize function code");
    }
    
    const hasClientWidth = resizeCode.includes("canvas.clientWidth");
    const hasClientHeight = resizeCode.includes("canvas.clientHeight");
    const hasAspectCalc = resizeCode.includes("camera.aspect = width / height");
    const hasSizeCall = resizeCode.includes("renderer.setSize(width, height, false)");
    
    console.log(`  Retrieves canvas clientWidth: ${hasClientWidth}`);
    console.log(`  Retrieves canvas clientHeight: ${hasClientHeight}`);
    console.log(`  Updates camera.aspect: ${hasAspectCalc}`);
    console.log(`  Renderer setSize call: ${hasSizeCall}`);
    
    return hasClientWidth && hasClientHeight && hasAspectCalc && hasSizeCall;
}) && allPassed;

// Test 4: Bounding Client Rect conversions for pointer event raycast
allPassed = runTest("Verify Bounding Client Rect for Raycast Mouse Conversions", () => {
    const { win, tab } = prepareAuthorizedTab();
    
    const downCode = tab.execute({ javascript: "onPointerDown.toString()" });
    const moveCode = tab.execute({ javascript: "onPointerMove.toString()" });
    win.close();
    
    if (!downCode || !moveCode) {
        throw new Error("Could not retrieve pointer handler code");
    }
    
    // Check if both functions query getBoundingClientRect on the renderer's DOM element
    const downGetsRect = downCode.includes("renderer.domElement.getBoundingClientRect()");
    const moveGetsRect = moveCode.includes("renderer.domElement.getBoundingClientRect()");
    
    // Check if mouse conversion matches (clientX - rect.left) / rect.width
    const downXCalc = downCode.includes("(event.clientX - rect.left) / rect.width");
    const downYCalc = downCode.includes("(event.clientY - rect.top) / rect.height");
    const moveXCalc = moveCode.includes("(event.clientX - rect.left) / rect.width");
    const moveYCalc = moveCode.includes("(event.clientY - rect.top) / rect.height");
    
    console.log(`  onPointerDown uses getBoundingClientRect: ${downGetsRect}`);
    console.log(`  onPointerMove uses getBoundingClientRect: ${moveGetsRect}`);
    console.log(`  onPointerDown converts mouse coordinates correctly: ${downXCalc && downYCalc}`);
    console.log(`  onPointerMove converts mouse coordinates correctly: ${moveXCalc && moveYCalc}`);
    
    return downGetsRect && moveGetsRect && downXCalc && downYCalc && moveXCalc && moveYCalc;
}) && allPassed;

console.log(`=======================================`);
console.log(`Summary: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
allPassed ? 0 : 1;
