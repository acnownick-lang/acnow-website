document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("humidity-month");
    const lblMonth = document.getElementById("lbl-humidity-month");
    const valOutdoorRh = document.getElementById("val-outdoor-rh");
    const valMoldStatus = document.getElementById("val-mold-status");
    const valTargetTemp = document.getElementById("val-target-temp");
    const valTargetRh = document.getElementById("val-target-rh");
    const valRunMode = document.getElementById("val-run-mode");

    if (!slider || !lblMonth || !valOutdoorRh || !valMoldStatus || !valTargetTemp || !valTargetRh || !valRunMode) {
        console.warn("[PWA Client] Humidity Planner elements missing. Skipping initialization.");
        return;
    }

    const monthsData = {
        1: { name: "January", outdoor: "74%", status: "🛡️ LOW RISK", temp: "75°F - 77°F", rh: "42% - 46%", mode: "AUTO (Vent)", color: "#10B981" },
        2: { name: "February", outdoor: "72%", status: "🛡️ LOW RISK", temp: "75°F - 77°F", rh: "42% - 45%", mode: "AUTO (Vent)", color: "#10B981" },
        3: { name: "March", outdoor: "70%", status: "🛡️ LOW RISK", temp: "76°F - 78°F", rh: "43% - 46%", mode: "AUTO (Vent)", color: "#10B981" },
        4: { name: "April", outdoor: "72%", status: "🛡️ LOW RISK", temp: "76°F - 78°F", rh: "44% - 48%", mode: "COOL (Auto)", color: "#10B981" },
        5: { name: "May", outdoor: "75%", status: "⚠️ MODERATE", temp: "75°F - 77°F", rh: "46% - 50%", mode: "COOL (Dehumidify)", color: "#F59E0B" },
        6: { name: "June", outdoor: "80%", status: "🚨 HIGH RISK", temp: "74°F - 76°F", rh: "48% - 52%", mode: "COOL (Dehumidify)", color: "#EF4444" },
        7: { name: "July", outdoor: "81%", status: "🚨 HIGH RISK", temp: "74°F - 76°F", rh: "49% - 52%", mode: "COOL (Dehumidify)", color: "#EF4444" },
        8: { name: "August", outdoor: "82%", status: "🚨 HIGH RISK", temp: "74°F - 76°F", rh: "50% - 53%", mode: "COOL (Dehumidify)", color: "#EF4444" },
        9: { name: "September", outdoor: "83%", status: "🚨 HIGH RISK", temp: "74°F - 76°F", rh: "50% - 53%", mode: "COOL (Dehumidify)", color: "#EF4444" },
        10: { name: "October", outdoor: "80%", status: "🚨 HIGH RISK", temp: "75°F - 77°F", rh: "48% - 51%", mode: "COOL (Dehumidify)", color: "#EF4444" },
        11: { name: "November", outdoor: "76%", status: "⚠️ MODERATE", temp: "75°F - 78°F", rh: "45% - 49%", mode: "COOL (Auto)", color: "#F59E0B" },
        12: { name: "December", outdoor: "75%", status: "🛡️ LOW RISK", temp: "76°F - 78°F", rh: "43% - 46%", mode: "AUTO (Vent)", color: "#10B981" }
    };

    function updateHumidityPlanner() {
        const monthIndex = parseInt(slider.value);
        const data = monthsData[monthIndex];

        if (data) {
            lblMonth.textContent = `${data.name} (${monthIndex <= 3 || monthIndex >= 11 ? "Cool Season" : "Humid Season"})`;
            valOutdoorRh.textContent = data.outdoor;
            valMoldStatus.textContent = data.status;
            valMoldStatus.style.color = data.color;
            valTargetTemp.textContent = data.temp;
            valTargetRh.textContent = data.rh;
            valRunMode.textContent = data.mode;
        }
    }

    slider.addEventListener("input", () => {
        updateHumidityPlanner();
        if (window.ComfortAudio && typeof window.ComfortAudio.playTick === "function") {
            window.ComfortAudio.playTick();
        }
    });

    // Initialize
    updateHumidityPlanner();
});
