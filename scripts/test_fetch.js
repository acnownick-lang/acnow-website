// test_fetch.js (JXA)
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

tab.execute({ javascript: `
    (function() {
        fetch('/assets/lib/three.min.js')
            .then(res => res.text().then(text => {
                document.body.setAttribute('data-fetch-result', "Status: " + res.status + ", Length: " + text.length);
            }))
            .catch(e => {
                document.body.setAttribute('data-fetch-result', "Fetch error: " + e.message);
            });
    })()
` });

// Poll for result
let result = "";
for (let i = 0; i < 10; i++) {
    delay(0.5);
    result = tab.execute({ javascript: "document.body.getAttribute('data-fetch-result') || ''" });
    if (result) break;
}

console.log("Fetch Result: " + result);
win.close();
