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

    let userInteracted = false;

    window.selectDistance = function(key, val) {
        userInteracted = true;
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
        const dist = parseFloat(val);
        
        if (!userInteracted) {
            lblDistance.textContent = "Awaiting Input";
            valStdLife.textContent = "—";
            valProtLife.textContent = "—";
            valRecType.textContent = "Awaiting Input";
            valRecType.style.color = "#64748b";
            if (severityMarker) severityMarker.style.left = "50%";
            if (formDistance) formDistance.value = "";
            return;
        }

        let zoneLabel = "";
        if (dist <= 0.5) zoneLabel = " (Beachfront)";
        else if (dist <= 1.5) zoneLabel = " (Coastal)";
        else if (dist <= 5.0) zoneLabel = " (Suburban)";
        else zoneLabel = " (Inland)";

        lblDistance.textContent = `${dist.toFixed(1)} ${dist === 1.0 ? "Mile" : "Miles"}${zoneLabel}`;
        if (formDistance) formDistance.value = `${dist.toFixed(1)} miles${zoneLabel}`;

        if (!bypassButtonsUpdate) {
            const buttons = document.querySelectorAll("#distance-picker button");
            buttons.forEach(btn => {
                btn.classList.remove("active");
                btn.style.border = "1px solid var(--gray-light)";
                btn.style.background = "#fff";
                btn.style.color = "var(--dark)";
            });
        }

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
        userInteracted = true;
        window.onSliderChange(e.target.value);
    });

    // Initialize with neutral display on load
    window.onSliderChange(slider.value);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCorrosionMeter);
} else {
    initCorrosionMeter();
}
