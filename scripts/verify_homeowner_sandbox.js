// verify_homeowner_sandbox.js (JXA)
// Run with: osascript -l JavaScript verify_homeowner_sandbox.js

const Chrome = Application("Google Chrome");
Chrome.activate();

function runTest(testName, testFn) {
    console.log(`Running Homeowner Sandbox Audit: ${testName}...`);
    try {
        const result = testFn();
        console.log(`RESULT: ${result ? "PASS" : "FAIL"}\n`);
        return result;
    } catch (e) {
        console.log(`RESULT: ERROR - ${e.message}\n`);
        return false;
    }
}

// Helper to parse RGB strings
function parseRGB(colorStr) {
    if (!colorStr) return null;
    const parts = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (parts) {
        return {
            r: parseInt(parts[1]),
            g: parseInt(parts[2]),
            b: parseInt(parts[3])
        };
    }
    return null;
}

// Helper to compare colors with tolerance
function colorsMatch(c1, c2, tolerance = 5) {
    const rgb1 = parseRGB(c1);
    const rgb2 = parseRGB(c2);
    if (!rgb1 || !rgb2) return false;
    return Math.abs(rgb1.r - rgb2.r) <= tolerance &&
           Math.abs(rgb1.g - rgb2.g) <= tolerance &&
           Math.abs(rgb1.b - rgb2.b) <= tolerance;
}

let allPassed = true;
const fileUrl = "http://localhost:8082/pages/3d-airflow.html";
const indexUrl = "http://localhost:8082/index.html";

// Test helper: Set up Phase 2 and Dev Mode in localStorage on index.html, then navigate
function setupStorageAndNavigate() {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    // 1. Visit index.html to set localStorage variables
    tab.url = indexUrl;
    delay(1.5);
    tab.execute({ javascript: "localStorage.clear(); localStorage.setItem('acnow_dev_mode', 'true'); localStorage.setItem('acnow_phase', '2');" });
    delay(0.5);
    
    // 2. Navigate to 3d-airflow.html
    tab.url = fileUrl;
    delay(2.5); // Give WebGL/Three.js time to initialize
    return { win, tab };
}

// Test 1: Welcome Onboarding Modal presence, focus, and dismiss
allPassed = runTest("Welcome Onboarding Modal Audit", () => {
    const { win, tab } = setupStorageAndNavigate();
    
    // Log any errors that occurred during load
    const loadErrors = tab.execute({ javascript: "JSON.stringify(window.jsErrors || [])" });
    console.log(`  JS load errors: ${loadErrors}`);

    // Check initial state of the modal
    const modalId = "welcome-modal";
    const modalDisplay = tab.execute({ javascript: `window.getComputedStyle(document.getElementById('${modalId}')).display` });
    console.log(`  Initial modal display style: ${modalDisplay}`);
    
    if (modalDisplay !== "flex") {
        console.log("  FAIL: Onboarding modal is not displayed as 'flex' on load.");
        win.close();
        return false;
    }
    
    // Check focus on welcome button on load
    const activeElementClass = tab.execute({ javascript: "document.activeElement.className" });
    console.log(`  Focused element class: ${activeElementClass}`);
    
    // Click welcome-btn to dismiss modal and capture output
    const clickResult = tab.execute({ javascript: `
        (function() {
            try {
                const btn = document.querySelector('.welcome-modal-card .welcome-btn');
                if (!btn) return "Button NOT found";
                btn.click();
                return "Clicked button successfully";
            } catch (e) {
                return "Error clicking: " + e.message;
            }
        })()
    ` });
    console.log(`  Click action result: ${clickResult}`);
    delay(0.5);
    
    const postClickDisplay = tab.execute({ javascript: `window.getComputedStyle(document.getElementById('${modalId}')).display` });
    console.log(`  Modal display style after clicking Start: ${postClickDisplay}`);
    
    // Check for any errors that occurred after click
    const clickErrors = tab.execute({ javascript: "JSON.stringify(window.jsErrors || [])" });
    console.log(`  JS errors after click: ${clickErrors}`);

    win.close();
    return postClickDisplay === "none";
}) && allPassed;

// Test 2: Static Pressure Bar updates on zoning damper toggles
allPassed = runTest("Static Pressure Bar HUD Audit", () => {
    const { win, tab } = setupStorageAndNavigate();
    
    // Dismiss onboarding modal
    tab.execute({ javascript: "document.querySelector('.welcome-modal-card .welcome-btn').click();" });
    delay(0.5);
    
    // Check that homeowner container is visible
    const containerDisplay = tab.execute({ javascript: "window.getComputedStyle(document.getElementById('homeowner-mode-container')).display" });
    if (containerDisplay !== "block") {
        console.log("  FAIL: Homeowner sandbox container is not active/visible.");
        win.close();
        return false;
    }
    
    // Toggle advanced mode to access dampers programmatically
    tab.execute({ javascript: "document.getElementById('adv-toggle-btn').click();" });
    delay(0.5);
    
    // Verify default state (all 3 dampers are checked)
    const dDefaultText = tab.execute({ javascript: "document.getElementById('pressure-val').innerText" });
    const dDefaultWidth = tab.execute({ javascript: "document.getElementById('pressure-bar').style.width" });
    const dDefaultBg = tab.execute({ javascript: "window.getComputedStyle(document.getElementById('pressure-bar')).backgroundColor" });
    const dDefaultBadge = tab.execute({ javascript: "document.getElementById('hud-badge').innerText" });
    
    console.log(`  Default (3 active zones): ${dDefaultText}, width: ${dDefaultWidth}, bg: ${dDefaultBg}, badge: "${dDefaultBadge}"`);
    
    if (!dDefaultText.includes("0.50") || dDefaultWidth !== "20%" || !colorsMatch(dDefaultBg, "rgb(0, 242, 254)") || !dDefaultBadge.includes("BALANCED")) {
        console.log("  FAIL: Default static pressure values/visuals are incorrect.");
        win.close();
        return false;
    }
    
    // Uncheck Damper B (Bedroom) -> activeCount = 2
    tab.execute({ javascript: "document.getElementById('damper-b').click();" });
    delay(0.5);
    
    const d2Text = tab.execute({ javascript: "document.getElementById('pressure-val').innerText" });
    const d2Width = tab.execute({ javascript: "document.getElementById('pressure-bar').style.width" });
    const d2Bg = tab.execute({ javascript: "window.getComputedStyle(document.getElementById('pressure-bar')).backgroundColor" });
    const d2Badge = tab.execute({ javascript: "document.getElementById('hud-badge').innerText" });
    
    console.log(`  2 active zones: ${d2Text}, width: ${d2Width}, bg: ${d2Bg}, badge: "${d2Badge}"`);
    if (!d2Text.includes("0.75") || d2Width !== "30%" || !colorsMatch(d2Bg, "rgb(255, 159, 10)") || !d2Badge.includes("BALANCED")) {
        console.log("  FAIL: Static pressure values for 2 active zones are incorrect.");
        win.close();
        return false;
    }
    
    // Uncheck Damper A (Living Room) -> activeCount = 1
    tab.execute({ javascript: "document.getElementById('damper-a').click();" });
    delay(0.5);
    
    const d1Text = tab.execute({ javascript: "document.getElementById('pressure-val').innerText" });
    const d1Width = tab.execute({ javascript: "document.getElementById('pressure-bar').style.width" });
    const d1Bg = tab.execute({ javascript: "window.getComputedStyle(document.getElementById('pressure-bar')).backgroundColor" });
    const d1Badge = tab.execute({ javascript: "document.getElementById('hud-badge').innerText" });
    
    console.log(`  1 active zone: ${d1Text}, width: ${d1Width}, bg: ${d1Bg}, badge: "${d1Badge}"`);
    if (!d1Text.includes("1.40") || d1Width !== "56%" || !colorsMatch(d1Bg, "rgb(194, 42, 54)") || !d1Badge.includes("BACKPRESSURE")) {
        console.log("  FAIL: Static pressure values for 1 active zone are incorrect.");
        win.close();
        return false;
    }
    
    // Uncheck Damper C (Kitchen) -> activeCount = 0
    tab.execute({ javascript: "document.getElementById('damper-c').click();" });
    delay(0.5);
    
    const d0Text = tab.execute({ javascript: "document.getElementById('pressure-val').innerText" });
    const d0Width = tab.execute({ javascript: "document.getElementById('pressure-bar').style.width" });
    const d0Bg = tab.execute({ javascript: "window.getComputedStyle(document.getElementById('pressure-bar')).backgroundColor" });
    const d0Badge = tab.execute({ javascript: "document.getElementById('hud-badge').innerText" });
    
    console.log(`  0 active zones: ${d0Text}, width: ${d0Width}, bg: ${d0Bg}, badge: "${d0Badge}"`);
    if (!d0Text.includes("2.50") || d0Width !== "100%" || !colorsMatch(d0Bg, "rgb(194, 42, 54)") || !d0Badge.includes("CRITICAL")) {
        console.log("  FAIL: Static pressure values for 0 active zones are incorrect.");
        win.close();
        return false;
    }
    
    // Check all dampers back to restore
    tab.execute({ javascript: "document.getElementById('damper-a').click(); document.getElementById('damper-b').click(); document.getElementById('damper-c').click();" });
    delay(0.2);
    
    win.close();
    return true;
}) && allPassed;

// Test 3: Comfort Indicators and recommendation dynamics based on Comfort Score
allPassed = runTest("Comfort Indicators & Recommendation HUD Audit", () => {
    const { win, tab } = setupStorageAndNavigate();
    
    // Dismiss onboarding modal
    tab.execute({ javascript: "document.querySelector('.welcome-modal-card .welcome-btn').click();" });
    delay(0.5);
    
    // Switch to advanced controls and click Comfort HUD tab
    tab.execute({ javascript: "document.getElementById('adv-toggle-btn').click();" });
    delay(0.5);
    tab.execute({ javascript: "document.querySelector('button[onclick*=\"tab-comfort\"]').click();" });
    delay(0.5);
    
    // Verify default temperatures and comfort score
    const tempA = parseFloat(tab.execute({ javascript: "document.getElementById('temp-zone-a').innerText" }));
    const tempB = parseFloat(tab.execute({ javascript: "document.getElementById('temp-zone-b').innerText" }));
    const tempC = parseFloat(tab.execute({ javascript: "document.getElementById('temp-zone-c').innerText" }));
    const scoreText = tab.execute({ javascript: "document.getElementById('comfort-score-val').innerText" });
    
    console.log(`  Temperatures: A=${tempA}°F, B=${tempB}°F, C=${tempC}°F`);
    console.log(`  Comfort Score Text: "${scoreText}"`);
    
    const targetTemp = 72.0;
    const expectedScore = Math.max(0, Math.min(100, Math.round(100 - (Math.abs(tempA - targetTemp) + Math.abs(tempB - targetTemp) + Math.abs(tempC - targetTemp)) * 5)));
    console.log(`  Expected Score Math: ${expectedScore}%`);
    
    if (parseInt(scoreText) !== expectedScore) {
        console.log(`  FAIL: Comfort score mismatch. Expected ${expectedScore}% but got ${scoreText}`);
        win.close();
        return false;
    }
    
    // Verify recommendation mapping
    const recoText = tab.execute({ javascript: "document.getElementById('comfort-reco').innerText" });
    const recoColor = tab.execute({ javascript: "window.getComputedStyle(document.getElementById('comfort-reco')).color" });
    
    console.log(`  Comfort Recommendation: "${recoText}"`);
    console.log(`  Recommendation Color: ${recoColor}`);
    
    let isCorrect = true;
    if (expectedScore < 60) {
        if (!recoText.includes("Critical Imbalance") || !colorsMatch(recoColor, "rgb(255, 107, 107)")) {
            console.log("  FAIL: Critical discomfort formatting is incorrect.");
            isCorrect = false;
        }
    } else if (expectedScore < 90) {
        if (!recoText.includes("Moderate Discomfort") || !colorsMatch(recoColor, "rgb(255, 159, 10)")) {
            console.log("  FAIL: Moderate discomfort formatting is incorrect.");
            isCorrect = false;
        }
    } else {
        if (!recoText.includes("Balanced Oasis") || !colorsMatch(recoColor, "rgb(16, 185, 129)")) {
            console.log("  FAIL: Balanced comfort formatting is incorrect.");
            isCorrect = false;
        }
    }
    
    win.close();
    return isCorrect;
}) && allPassed;

console.log(`\n========================================`);
console.log(`Homeowner Sandbox Audit Summary: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
console.log(`========================================`);
allPassed ? 0 : 1;
