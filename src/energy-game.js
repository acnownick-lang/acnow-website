document.addEventListener("DOMContentLoaded", () => {
    // Sliders
    const gameMorning = document.getElementById("game-temp-morning");
    const gameAway = document.getElementById("game-temp-away");
    const gameEvening = document.getElementById("game-temp-evening");
    
    // Labels
    const lblMorning = document.getElementById("lbl-game-morning");
    const lblAway = document.getElementById("lbl-game-away");
    const lblEvening = document.getElementById("lbl-game-evening");
    
    // Outputs
    const outCost = document.getElementById("game-out-cost");
    const outSavings = document.getElementById("game-out-savings");
    const outFootprint = document.getElementById("game-out-footprint");
    const outLoadText = document.getElementById("game-out-load-txt");
    const outLoadBar = document.getElementById("game-out-load-bar");
    
    const btnOptimize = document.getElementById("game-btn-optimize");

    if (!gameMorning || !gameAway || !gameEvening) return;

    // Listeners
    gameMorning.addEventListener("input", () => {
        lblMorning.textContent = `${gameMorning.value}°F`;
        updateSimulator();
        triggerTickSound();
    });
    
    gameAway.addEventListener("input", () => {
        lblAway.textContent = `${gameAway.value}°F`;
        updateSimulator();
        triggerTickSound();
    });
    
    gameEvening.addEventListener("input", () => {
        lblEvening.textContent = `${gameEvening.value}°F`;
        updateSimulator();
        triggerTickSound();
    });

    btnOptimize.addEventListener("click", () => {
        // Snap to energy efficient targets recommended by DOE
        gameMorning.value = 75;
        gameAway.value = 78;
        gameEvening.value = 74;
        
        lblMorning.textContent = "75°F";
        lblAway.textContent = "78°F";
        lblEvening.textContent = "74°F";
        
        updateSimulator();
        
        if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
            window.ComfortAudio.playClick();
        }
    });

    function triggerTickSound() {
        if (window.ComfortAudio && typeof window.ComfortAudio.playTick === "function") {
            window.ComfortAudio.playTick();
        }
    }

    function updateSimulator() {
        const morning = parseInt(gameMorning.value) || 78;
        const away = parseInt(gameAway.value) || 78;
        const evening = parseInt(gameEvening.value) || 78;

        // Baseline: 78°F flat cost is approximately $100/mo cooling portion.
        // Each degree below 78°F increases energy draw by ~6.5%.
        // Each degree above 78°F decreases energy draw by ~5%.
        const calcCoolingCost = (temp) => {
            const diff = 78 - temp;
            if (diff >= 0) {
                return 100 * (1 + (diff * 0.068));
            } else {
                return Math.max(50, 100 * (1 + (diff * 0.05)));
            }
        };

        // Cooling energy portions for morning (4 hours), away (9 hours), evening (5 hours)
        const costMorning = calcCoolingCost(morning) * (4 / 18);
        const costAway = calcCoolingCost(away) * (9 / 18);
        const costEvening = calcCoolingCost(evening) * (5 / 18);

        const totalCoolingCost = Math.round(costMorning + costAway + costEvening);
        
        // Savings relative to poor baseline (keeping it at a constant 71°F which costs ~$178/mo)
        const worstCaseCost = 178;
        const netSavings = Math.max(0, worstCaseCost - totalCoolingCost);

        // Carbon emissions: ~0.85 lbs CO2 per kWh.
        // Estimated total kWh of cooling: cost / 0.15 electric rate.
        const estKwh = totalCoolingCost / 0.15;
        const lbsCo2 = Math.round(estKwh * 0.85);

        // Load Index calculation: away temperature impacts the peak utility hour (12 PM - 5 PM) grid load
        let loadPercent = 100;
        let loadStatus = "Critical Overload";
        let loadColor = "#EF4444"; // red

        if (away >= 78) {
            loadPercent = 25;
            loadStatus = "Eco Friendly - Stable";
            loadColor = "#10B981"; // green
        } else if (away >= 75) {
            loadPercent = 55;
            loadStatus = "Moderate Power Demand";
            loadColor = "#F59E0B"; // yellow/orange
        } else if (away >= 72) {
            loadPercent = 80;
            loadStatus = "High Grid Stress";
            loadColor = "#EF4444"; // light red
        }

        // Update UI
        outCost.textContent = `$${totalCoolingCost}/mo`;
        outSavings.textContent = `$${netSavings}/mo`;
        outFootprint.textContent = `${lbsCo2} lbs CO2`;
        outLoadText.textContent = loadStatus;
        outLoadText.style.color = loadColor;
        outLoadBar.style.width = `${loadPercent}%`;
        outLoadBar.style.background = loadColor;
    }

    // Run initial calculations
    updateSimulator();
});
