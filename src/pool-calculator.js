document.addEventListener("DOMContentLoaded", () => {
    const poolAreaInput = document.getElementById("pool-area-input");
    const poolAirTemp = document.getElementById("pool-air-temp");
    const poolWindSpeed = document.getElementById("pool-wind-speed");
    const poolCoverToggle = document.getElementById("pool-cover-toggle");

    const poolAreaVal = document.getElementById("pool-area-val");
    const poolAirVal = document.getElementById("pool-air-val");
    const poolWindVal = document.getElementById("pool-wind-val");

    const poolEvapBtu = document.getElementById("pool-evap-btu");
    const poolCoverSavings = document.getElementById("pool-cover-savings");

    if (poolAreaInput && poolAirTemp && poolWindSpeed && poolCoverToggle) {
        function calculateEvapLoss() {
            const area = parseFloat(poolAreaInput.value) || 0;
            const airT = parseFloat(poolAirTemp.value) || 70;
            const wind = parseFloat(poolWindSpeed.value) || 0;
            const hasCover = poolCoverToggle.checked;

            // Update UI sliders labels
            poolAreaVal.textContent = `${area} sq ft`;
            poolAirVal.textContent = `${airT}°F`;
            poolWindVal.textContent = `${wind} mph`;

            // Vapor pressure approximation (in. Hg)
            // Water target: 82°F (saturated vapor pressure ~ 1.10 in. Hg)
            const pw = 1.10;
            // Air saturated vapor pressure approx: 0.0003 * T^2 - 0.015 * T + 0.4
            const satPa = 0.0003 * Math.pow(airT, 2) - 0.015 * airT + 0.4;
            const pa = 0.60 * satPa; // Assume average 60% relative humidity

            const vpDiff = Math.max(0.05, pw - pa);
            // Corrected Carrier formula converting wind from mph to ft/min (1 mph = 88 ft/min)
            // Coefficient: 0.425 * 88 = 37.4. Removed 100x underestimation multiplier (* 0.01).
            const btuPerHour = (95.0 + 37.4 * wind) * area * vpDiff;
            let dailyBtu = btuPerHour * 24;

            // Cover efficiency: reduces evaporative loss by 90%
            let savingsBtu = 0;
            if (hasCover) {
                savingsBtu = dailyBtu * 0.90;
                dailyBtu = dailyBtu * 0.10;
            } else {
                savingsBtu = dailyBtu * 0.90; // potential savings if they get a cover
            }

            // Convert BTU savings to monthly electricity cost savings
            // COP of pool heat pump is approx 5.5
            // 1 kWh = 3412 BTUs
            const cop = 5.5;
            const monthlyKwh = (savingsBtu * 30) / (cop * 3412);
            const monthlySavingsCost = monthlyKwh * 0.15; // Florida utility rate: $0.15/kWh

            // Render results
            poolEvapBtu.textContent = `${Math.round(dailyBtu).toLocaleString()} BTU/day`;
            poolCoverSavings.textContent = `$${monthlySavingsCost.toFixed(2)}`;
        }

        // Add event listeners
        [poolAreaInput, poolAirTemp, poolWindSpeed].forEach(el => {
            el.addEventListener("input", () => {
                calculateEvapLoss();
                triggerSound("tick");
            });
        });

        poolCoverToggle.addEventListener("change", () => {
            calculateEvapLoss();
            triggerSound("click");
        });

        function triggerSound(type) {
            if (window.ComfortAudio) {
                if (type === "click" && typeof window.ComfortAudio.playClick === "function") {
                    window.ComfortAudio.playClick();
                } else if (type === "tick" && typeof window.ComfortAudio.playTick === "function") {
                    window.ComfortAudio.playTick();
                }
            }
        }

        // Init
        calculateEvapLoss();
    }
});
