// test_dom.js (JXA)
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

const results = tab.execute({ javascript: `
    (function() {
        return JSON.stringify({
            title: document.title,
            url: window.location.href,
            scripts: Array.from(document.scripts).map(s => s.src),
            firstScriptError: window.jsErrors
        });
    })()
` });
console.log(results);

win.close();
