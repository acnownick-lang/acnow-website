document.addEventListener("DOMContentLoaded", () => {
    // Inputs
    const sliderAge = document.getElementById("slider-age");
    const sliderTonnage = document.getElementById("slider-tonnage");
    const labelAge = document.getElementById("label-age");
    const labelTonnage = document.getElementById("label-tonnage");
    const tonnageValues = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0];
    
    const maintButtons = document.querySelectorAll("div[aria-label='Maintenance Selector'] .toggle-btn");
    
    // Outputs
    const metricRemaining = document.getElementById("metric-remaining");
    const metricEffLoss = document.getElementById("metric-eff-loss");
    const metricWaste = document.getElementById("metric-waste-cost");
    const metricCapex = document.getElementById("metric-capex-cost");
    const statusBadge = document.getElementById("lifecycle-status-badge");
    const svgElement = document.getElementById("lifecycle-svg");
    
    const plannerForm = document.getElementById("planner-lead-form");
    const plannerMetricsInput = document.getElementById("plan_metrics_input");

    // Attic Heat Load Calculator Elements
    const atticTempInput = document.getElementById("attic-temp-input");
    const atticTempVal = document.getElementById("attic-temp-val");
    const atticInsulationSelect = document.getElementById("attic-insulation-select");
    const atticHeatBtu = document.getElementById("attic-heat-btu");
    const atticRuntimePct = document.getElementById("attic-runtime-pct");
    const atticMonthlySavings = document.getElementById("attic-monthly-savings");

    if (!sliderAge || !sliderTonnage || !metricRemaining || !metricEffLoss || !metricWaste || !metricCapex || !statusBadge) {
        console.warn("[PWA Client] Lifecycle Planner elements missing. Skipping initialization.");
        return;
    }

    let userInteracted = true; // calculate immediately on load to prevent empty placeholder state
    let maintenanceType = "yearly"; // default

    // Sliders listeners
    sliderAge.addEventListener("input", () => {
        userInteracted = true;
        labelAge.textContent = `${sliderAge.value} Years`;
        updatePlanner();
        triggerAudioTick();
    });

    sliderTonnage.addEventListener("input", () => {
        userInteracted = true;
        const tonnage = tonnageValues[parseInt(sliderTonnage.value)] || 3.0;
        labelTonnage.textContent = `${tonnage.toFixed(1)} Tons`;
        updatePlanner();
        triggerAudioTick();
    });

    // Toggle button group for maintenance
    maintButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            userInteracted = true;
            maintButtons.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            maintenanceType = btn.dataset.val;
            updatePlanner();
            
            if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
                window.ComfortAudio.playClick();
            }
        });
    });

    function triggerAudioTick() {
        if (window.ComfortAudio && typeof window.ComfortAudio.playTick === "function") {
            window.ComfortAudio.playTick();
        }
    }

    function updatePlanner() {
        if (!userInteracted) {
            metricRemaining.textContent = "Adjust inputs to calculate";
            metricEffLoss.textContent = "—";
            metricWaste.textContent = "—";
            metricCapex.textContent = "—";
            statusBadge.textContent = "Awaiting Input";
            statusBadge.style.background = "#64748b"; // neutral gray
            
            svgElement.innerHTML = `
                <rect x="10" y="10" width="430" height="230" fill="rgba(0,0,0,0.02)" rx="4"/>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="var(--font-body)" font-size="13" fill="#64748B">Graph will populate after interaction</text>
            `;
            return;
        }

        const age = parseInt(sliderAge.value);
        const tonnageIdx = parseInt(sliderTonnage.value);
        const tonnage = tonnageValues[tonnageIdx] || 3.0;
        
        // 1. Math Settings
        let decayRate = 0.015; // 1.5% loss per year (yearly)
        let maxLife = 14;
        
        if (maintenanceType === "none") {
            decayRate = 0.035; // 3.5% loss per year (neglected)
            maxLife = 10;
        } else if (maintenanceType === "twice") {
            decayRate = 0.008; // 0.8% loss per year (twice yearly)
            maxLife = 16;
        }

        // Calculations
        const remainingLife = Math.max(0, maxLife - age);
        const baseEffLoss = Math.round(age * decayRate * 100);
        const effLossPercent = remainingLife === 0 ? Math.min(100, Math.max(60, baseEffLoss + 20)) : Math.min(100, baseEffLoss);
        
        // Replacement reserve base by tonnage
        const capexLookup = {
            1.5: 6200,
            2.0: 6250,
            2.5: 6500,
            3.0: 7200,
            3.5: 7900,
            4.0: 8700,
            5.0: 9600
        };
        const capexCost = capexLookup[tonnage] || 7200;
        
        // Utility waste cost estimate: baseline cooling bill $250/ton per year * efficiency loss ratio
        const yearlyCoolingBase = tonnage * 300;
        const wasteCost = Math.round(yearlyCoolingBase * (effLossPercent / 100));

        // Display results
        metricRemaining.textContent = remainingLife === 0 ? "Expired (Replace Now)" : `${remainingLife.toFixed(1)} Years`;
        metricEffLoss.textContent = `${effLossPercent}% Loss`;
        metricWaste.textContent = `$${wasteCost} / year`;
        metricCapex.textContent = `$${capexCost.toLocaleString()}`;

        // Status Badge Logic
        let statusText = "Excellent";
        let statusBg = "#10B981"; // green
        
        if (maintenanceType === "twice") {
            if (age >= 15) {
                statusText = "Critical - Replace";
                statusBg = "#EF4444"; // red
            } else if (age >= 10) {
                statusText = "Caution";
                statusBg = "#F59E0B"; // orange
            } else if (age >= 6) {
                statusText = "Good";
                statusBg = "#0B7A53"; // dark green
            } else {
                statusText = "Excellent";
                statusBg = "#10B981"; // green
            }
        } else if (maintenanceType === "yearly") {
            if (age >= 13) {
                statusText = "Critical - Replace";
                statusBg = "#EF4444"; // red
            } else if (age >= 10) {
                statusText = "Caution";
                statusBg = "#F59E0B"; // orange
            } else if (age >= 6) {
                statusText = "Good";
                statusBg = "#0B7A53"; // dark green
            } else {
                statusText = "Excellent";
                statusBg = "#10B981"; // green
            }
        } else { // none (neglected)
            if (age >= 9) {
                statusText = "Critical - Replace";
                statusBg = "#EF4444"; // red
            } else {
                statusText = "Caution (Neglected)";
                statusBg = "#F59E0B"; // orange
            }
        }

        statusBadge.textContent = statusText;
        statusBadge.style.background = statusBg;

        // Set form lead details payload
        plannerMetricsInput.value = `[System Age: ${age} Years | Tonnage: ${tonnage} Tons | Maintenance: ${maintenanceType} | Remaining Life: ${remainingLife.toFixed(1)} Yrs | Eff Loss: ${effLossPercent}%]`;

        // Render SVG Line Chart
        renderSVG(age, maxLife, decayRate);

        // Update the Attic Heat Load calculator calculations when inputs change
        updateAtticCalculator();
    }

    function renderSVG(age, maxLife, decayRate) {
        const svgW = 450;
        const svgH = 250;
        const margin = { top: 20, right: 20, bottom: 35, left: 45 };
        
        const chartW = svgW - margin.left - margin.right;
        const chartH = svgH - margin.top - margin.bottom;

        // X scale: Years 0 to 15
        const getX = (year) => margin.left + (year / 15) * chartW;
        
        // Y scale: Efficiency 50% to 100%
        const getY = (eff) => margin.top + (1 - (eff - 0.5) / 0.5) * chartH;

        let points = [];
        for (let yr = 0; yr <= 15; yr++) {
            const eff = Math.max(0.5, 1 - (yr * decayRate));
            points.push({ x: getX(yr), y: getY(eff) });
        }

        // Compile path d string
        let dLine = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            dLine += ` L ${points[i].x} ${points[i].y}`;
        }

        // Shaded path (area under curve)
        const dArea = `${dLine} L ${getX(15)} ${getY(0.5)} L ${getX(0)} ${getY(0.5)} Z`;

        // X Coordinate of the current system age slider marker
        const markerX = getX(age);
        const currentEff = Math.max(0.5, 1 - (age * decayRate));
        const markerY = getY(currentEff);

        // Build SVG HTML content
        svgElement.innerHTML = `
            <!-- Grid Lines -->
            <line x1="${margin.left}" y1="${getY(1.0)}" x2="${svgW - margin.right}" y2="${getY(1.0)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${margin.left}" y1="${getY(0.8)}" x2="${svgW - margin.right}" y2="${getY(0.8)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${margin.left}" y1="${getY(0.6)}" x2="${svgW - margin.right}" y2="${getY(0.6)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${margin.left}" y1="${getY(0.5)}" x2="${svgW - margin.right}" y2="${getY(0.5)}" stroke="#CBD5E0" stroke-width="1.5" />

            <!-- Y Axis labels -->
            <text x="${margin.left - 10}" y="${getY(1.0) + 4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">100%</text>
            <text x="${margin.left - 10}" y="${getY(0.8) + 4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">80%</text>
            <text x="${margin.left - 10}" y="${getY(0.6) + 4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">60%</text>
            <text x="${margin.left - 10}" y="${getY(0.5) + 4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">50%</text>
            
            <!-- X Axis labels -->
            <text x="${getX(0)}" y="${svgH - 12}" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">Brand New</text>
            <text x="${getX(5)}" y="${svgH - 12}" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">5 Yrs</text>
            <text x="${getX(10)}" y="${svgH - 12}" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">10 Yrs</text>
            <text x="${getX(15)}" y="${svgH - 12}" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">15+ Yrs</text>

            <!-- Shaded Area Under Curve -->
            <path d="${dArea}" fill="rgba(11, 99, 229, 0.05)" />

            <!-- Dynamic Efficiency Curve Line -->
            <path d="${dLine}" fill="none" stroke="#0B63E5" stroke-width="3.5" stroke-linecap="round" />

            <!-- Max Lifespan boundary -->
            <line x1="${getX(maxLife)}" y1="${margin.top}" x2="${getX(maxLife)}" y2="${svgH - margin.bottom}" stroke="#E63946" stroke-width="1.5" stroke-dasharray="4,4" />
            <text x="${getX(maxLife) + 5}" y="${margin.top + 15}" fill="#E63946" font-size="9" font-weight="700">Max Lifespan Boundary</text>

            <!-- Interactive Age Vertical Slider Marker Indicator -->
            <line x1="${markerX}" y1="${margin.top}" x2="${markerX}" y2="${svgH - margin.bottom}" stroke="#4A5568" stroke-width="2" />
            
            <!-- Interactive Intersection Point dot bubble -->
            <circle cx="${markerX}" cy="${markerY}" r="6.5" fill="#4A5568" stroke="#fff" stroke-width="2" />
            
            <!-- Info tooltips text details -->
            <text x="${markerX}" y="${margin.top + 5}" fill="#2D3748" font-size="10" font-weight="700" text-anchor="middle" background="white">Your Unit (${age} yrs)</text>
        `;
    }

    // Lead Capture Submission Form Handler
    if (plannerForm) {
        plannerForm.addEventListener("submit", (e) => {
            const nameVal = document.getElementById("fullname_plan").value.trim();
            const nameParts = nameVal.split(" ");
            const fname = nameParts[0] || "";
            const lname = nameParts.slice(1).join(" ") || "";

            const payload = {
                fname,
                lname,
                tel: document.getElementById("phone_plan").value.trim(),
                email: document.getElementById("email_plan").value.trim(),
                city: document.getElementById("city_plan").value.trim(),
                message: `[AC Lifespan Planner Report] ${plannerMetricsInput.value} [Request] Client requests pre-failure replacement consultation.`,
                honeypot: document.getElementById("honeypot_plan").value
            };

            // Submit using global async sync handler
            if (typeof window.submitFormWithSync === "function") {
                window.submitFormWithSync(e, plannerForm, payload, () => {
                    if (typeof window.showToast === "function") {
                        window.showToast("Consultation request secure! Our team will contact you to schedule an inspection.", "success");
                    } else {
                        alert("Consultation request secure! Our team will contact you to schedule an inspection.");
                    }
                    plannerForm.reset();
                    
                    if (typeof window.configurePushNotifications === "function") {
                        window.configurePushNotifications();
                    }
                });
            } else {
                console.error("submitFormWithSync not found in global scope");
            }
        });
    }

    function updateAtticCalculator() {
        if (!atticTempInput || !atticInsulationSelect || !atticHeatBtu) return;

        const temp = parseInt(atticTempInput.value);
        if (atticTempVal) {
            atticTempVal.textContent = `${temp}°F`;
        }

        const dT = Math.max(0, temp - 75);
        const insulation = atticInsulationSelect.value;

        let U = 1 / 19;
        let radMultiplier = 1.0;

        if (insulation === "r38") {
            U = 1 / 38;
        } else if (insulation === "r38shield") {
            U = 1 / 38;
            radMultiplier = 0.55;
        }

        // Tonnage from system planner
        const tonnage = parseFloat(sliderTonnage.value) || 3.0;
        const acCapacityBtu = tonnage * 12000;

        const btuHr = Math.round(1500 * dT * U * radMultiplier * 1.5);
        const worstBtu = Math.round(1500 * dT * (1 / 19) * 1.0 * 1.5);
        const btuSaved = Math.max(0, worstBtu - btuHr);

        const runtimeReductionPct = Math.round((btuSaved / acCapacityBtu) * 100);
        const monthlySavings = (btuSaved / 12000) * 1.2 * 30 * 6 * 0.15;

        if (atticHeatBtu) {
            atticHeatBtu.textContent = `${btuHr.toLocaleString()} BTU/hr`;
        }
        if (atticRuntimePct) {
            atticRuntimePct.textContent = `${runtimeReductionPct}% Runtime Reduction`;
        }
        if (atticMonthlySavings) {
            atticMonthlySavings.textContent = `$${monthlySavings.toFixed(2)}/month`;
        }
    }

    if (atticTempInput) {
        atticTempInput.addEventListener("input", () => {
            updateAtticCalculator();
            triggerAudioTick();
        });
    }

    if (atticInsulationSelect) {
        atticInsulationSelect.addEventListener("change", () => {
            updateAtticCalculator();
            if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
                window.ComfortAudio.playClick();
            }
        });
    }

    // Initialize display on load
    updatePlanner();
    updateAtticCalculator();
});
