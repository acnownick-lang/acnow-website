function initCorrosionMeter() {
    const slider = document.getElementById("distance-slider");
    const lblDistance = document.getElementById("slider-val");
    const valStdLife = document.getElementById("life-unprotected");
    const valProtLife = document.getElementById("life-protected");
    const valRecType = document.getElementById("severity-label");
    const severityMarker = document.getElementById("severity-marker");
    const formDistance = document.getElementById("form-distance");

    if (!slider || !lblDistance || !valStdLife || !valProtLife || !valRecType) {
        console.warn("[PWA Client] Corrosion Meter elements missing. Skipping initialization.");
        return;
    }

    window.selectDistance = function(key, val) {
        slider.value = val;
        const buttons = document.querySelectorAll("#distance-picker button");
        buttons.forEach(btn => {
            btn.classList.remove("active");
            btn.style.border = "1px solid var(--gray-light)";
            btn.style.background = "#fff";
            btn.style.color = "var(--dark)";
        });

        let activeIdx = 0;
        if (key === "beachfront") activeIdx = 0;
        else if (key === "coastal") activeIdx = 1;
        else if (key === "suburban") activeIdx = 2;
        else if (key === "inland") activeIdx = 3;

        if (buttons[activeIdx]) {
            buttons[activeIdx].classList.add("active");
            buttons[activeIdx].style.border = "2px solid var(--primary)";
            buttons[activeIdx].style.background = "rgba(0, 98, 230, 0.05)";
            buttons[activeIdx].style.color = "var(--primary)";
        }

        window.onSliderChange(val, true);
    };

    window.onSliderChange = function(val, bypassButtonsUpdate) {
        lblDistance.textContent = `${parseFloat(val).toFixed(1)} ${parseFloat(val) === 1.0 ? "Mile" : "Miles"}`;
        if (formDistance) formDistance.value = `${parseFloat(val).toFixed(1)} miles`;

        if (!bypassButtonsUpdate) {
            const buttons = document.querySelectorAll("#distance-picker button");
            buttons.forEach(btn => {
                btn.classList.remove("active");
                btn.style.border = "1px solid var(--gray-light)";
                btn.style.background = "#fff";
                btn.style.color = "var(--dark)";
            });
        }

        const dist = parseFloat(val);
        const stdLife = Math.min(12.0, 2.5 + dist * 1.9);
        const protLife = Math.min(15.0, 9.5 + dist * 1.1);
        
        valStdLife.textContent = `${stdLife.toFixed(1)} Years`;
        valProtLife.textContent = `${protLife.toFixed(1)} Years`;

        let severityText = "LOW INLAND RISK";
        let severityColor = "#10B981";
        let markerPct = 15;

        if (dist <= 1.0) {
            severityText = "CRITICAL SEVERE RISK";
            severityColor = "#EF4444";
            markerPct = 95;
        } else if (dist <= 2.5) {
            severityText = "HIGH CORROSION RISK";
            severityColor = "#F59E0B";
            markerPct = 75;
        } else if (dist <= 5.0) {
            severityText = "MODERATE RISK";
            severityColor = "#FBBF24";
            markerPct = 45;
        }

        valRecType.textContent = severityText;
        valRecType.style.color = severityColor;
        if (severityMarker) severityMarker.style.left = `${markerPct}%`;

        if (window.ComfortAudio && typeof window.ComfortAudio.playTick === "function") {
            window.ComfortAudio.playTick();
        }
    };

    slider.addEventListener("input", (e) => {
        window.onSliderChange(e.target.value);
    });

    window.selectDistance("beachfront", 0.1);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCorrosionMeter);
} else {
    initCorrosionMeter();
}
