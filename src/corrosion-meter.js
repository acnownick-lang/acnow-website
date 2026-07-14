function initCorrosionMeter() {
    const slider = document.getElementById("distance-slider") || document.getElementById("corrosion-distance");
    const lblDistance = document.getElementById("slider-val") || document.getElementById("lbl-corrosion-distance");
    const valStdLife = document.getElementById("life-unprotected") || document.getElementById("val-std-life");
    const valProtLife = document.getElementById("life-protected") || document.getElementById("val-prot-life");
    const valRecType = document.getElementById("severity-label") || document.getElementById("val-rec-type");
    const severityMarker = document.getElementById("severity-marker");
    const formDistance = document.getElementById("form-distance");
    const valDegradeRate = document.getElementById("val-degrade-rate");

    if (!slider || !lblDistance || !valStdLife || !valProtLife || !valRecType) {
        console.warn("[PWA Client] Corrosion Meter elements missing. Skipping initialization.");
        return;
    }

    const isAreasPage = !!document.getElementById("corrosion-distance");
    let userInteracted = isAreasPage; // Initialize immediately on areas page

    window.selectDistance = function(key, val) {
        userInteracted = true;
        slider.value = val;
        const buttons = document.querySelectorAll("#distance-picker button");
        buttons.forEach(btn => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
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
            buttons[activeIdx].setAttribute("aria-pressed", "true");
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
        else if (dist <= 3.0) zoneLabel = " (Coastal)";
        else if (dist <= 6.0) zoneLabel = " (Suburban)";
        else zoneLabel = " (Inland)";

        lblDistance.textContent = `${dist.toFixed(1)} ${dist === 1.0 ? "Mile" : "Miles"}${zoneLabel}`;
        if (formDistance) formDistance.value = `${dist.toFixed(1)} miles${zoneLabel}`;

        if (!bypassButtonsUpdate) {
            const buttons = document.querySelectorAll("#distance-picker button");
            buttons.forEach(btn => {
                btn.classList.remove("active");
                btn.setAttribute("aria-pressed", "false");
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
        let severityColor = "#0B7A53"; // WCAG AA Green
        let markerPct = 15;
        let recommendationText = "Inland Standard Staging";
        let degradePercent = "1%";

        if (dist <= 1.0) {
            severityText = "CRITICAL SEVERE RISK";
            severityColor = "#C22A36"; // WCAG AA Red
            markerPct = dist <= 0.5 ? 95 : 85;
            recommendationText = "Blygold / Coastal Epoxy Coating Mandate";
            degradePercent = dist <= 0.5 ? "30%" : "25%";
        } else if (dist <= 3.0) {
            severityText = "HIGH CORROSION RISK";
            severityColor = "#D97706"; // WCAG AA Orange
            markerPct = 65;
            recommendationText = "Gulfshield / Marine-Grade Coil Shield";
            degradePercent = dist <= 2.0 ? "15%" : "8%";
        } else if (dist <= 6.0) {
            severityText = "MODERATE RISK";
            severityColor = "#B45309"; // WCAG AA Deep Amber
            markerPct = 40;
            recommendationText = "Standard Condenser Guard Protection";
            degradePercent = "4%";
        }

        if (valRecType.id === "val-rec-type") {
            valRecType.textContent = recommendationText;
        } else {
            valRecType.textContent = severityText;
        }
        valRecType.style.color = severityColor;
        
        if (severityMarker) severityMarker.style.left = `${markerPct}%`;

        if (valDegradeRate) {
            valDegradeRate.textContent = `${degradePercent} / year`;
        }

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
