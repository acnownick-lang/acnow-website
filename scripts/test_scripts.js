// test_scripts.js (JXA)
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
        const scripts = Array.from(document.querySelectorAll('script'));
        return JSON.stringify(scripts.map(s => ({
            src: s.src,
            textLength: s.text ? s.text.length : 0,
            outerHtmlStart: s.outerHTML.substring(0, 100)
        })));
    })()
` });
console.log(results);

win.close();
