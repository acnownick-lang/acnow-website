// test_close.js (JXA)
const Chrome = Application("Google Chrome");
Chrome.activate();

const win = Chrome.Window().make();
const tab = win.activeTab();

const fileUrl = "http://localhost:8082/pages/3d-airflow.html";
const indexUrl = "http://localhost:8082/index.html";

tab.url = indexUrl;
delay(1.5);
tab.execute({ javascript: "localStorage.clear(); localStorage.setItem('acnow_dev_mode', 'true'); localStorage.setItem('acnow_phase', '2');" });
delay(0.5);

tab.url = fileUrl;
delay(3.0);

const before = tab.execute({ javascript: "window.getComputedStyle(document.getElementById('welcome-modal')).display" });
console.log("Before call: " + before);

const callResult = tab.execute({ javascript: `
    (function() {
        try {
            if (typeof window.closeWelcomeModal === 'function') {
                window.closeWelcomeModal();
                return "Called function successfully";
            }
            return "Function is not a function: " + (typeof window.closeWelcomeModal);
        } catch (e) {
            return "Error calling: " + e.message;
        }
    })()
` });
console.log("Call result: " + callResult);

const after = tab.execute({ javascript: "window.getComputedStyle(document.getElementById('welcome-modal')).display" });
console.log("After call: " + after);

win.close();
