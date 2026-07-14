// diagnose_onboarding.js (JXA)
const Chrome = Application("Google Chrome");
Chrome.activate();

const win = Chrome.Window().make();
const tab = win.activeTab();

const fileUrl = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/pages/3d-airflow.html";
const indexUrl = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/index.html";

console.log("Navigating to index.html...");
tab.url = indexUrl;
delay(1.5);

console.log("Setting localStorage...");
tab.execute({ javascript: "localStorage.clear(); localStorage.setItem('acnow_dev_mode', 'true'); localStorage.setItem('acnow_phase', '2');" });
delay(0.5);

console.log("Navigating to 3d-airflow.html...");
tab.url = fileUrl;
delay(3.0); // Wait 3 seconds

const diagnostics = tab.execute({ javascript: `
    (function() {
        const modal = document.getElementById('welcome-modal');
        return JSON.stringify({
            url: window.location.href,
            readyState: document.readyState,
            htmlClass: document.documentElement.className,
            phaseInStorage: localStorage.getItem('acnow_phase'),
            closeFnType: typeof window.closeWelcomeModal,
            modalExists: !!modal,
            modalComputedDisplay: modal ? window.getComputedStyle(modal).display : "null",
            jsErrors: window.jsErrors,
            threeLoaded: typeof THREE !== 'undefined',
            orbitLoaded: typeof OrbitControls !== 'undefined' || (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined'),
            webglCanvas: !!document.getElementById('webgl-canvas')
        });
    })()
` });

console.log("DIAGNOSTICS RESULTS:");
console.log(diagnostics);

win.close();
