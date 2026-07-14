document.addEventListener("DOMContentLoaded", () => {
    // Inputs
    const sliderAge = document.getElementById("slider-age");
    const sliderTonnage = document.getElementById("slider-tonnage");
    const labelAge = document.getElementById("label-age");
    const labelTonnage = document.getElementById("label-tonnage");
    
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

    if (!sliderAge || !sliderTonnage || !metricRemaining || !metricEffLoss || !metricWaste || !metricCapex || !statusBadge) {
        console.warn("[PWA Client] Lifecycle Planner elements missing. Skipping initialization.");
        return;
    }

    let maintenanceType = "yearly"; // default

    // Sliders listeners
    sliderAge.addEventListener("input", () => {
        labelAge.textContent = `${sliderAge.value} Years`;
        updatePlanner();
        triggerAudioTick();
    });

    sliderTonnage.addEventListener("input", () => {
        labelTonnage.textContent = `${parseFloat(sliderTonnage.value).toFixed(1)} Tons`;
        updatePlanner();
        triggerAudioTick();
    });

    // Toggle button group for maintenance
    maintButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            maintButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
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
        const age = parseInt(sliderAge.value);
        const tonnage = parseFloat(sliderTonnage.value);
        
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
        const effLossPercent = Math.min(100, Math.round(age * decayRate * 100));
        
        // Replacement reserve base ($4500 minimum for 1.5 ton, scales to $9500 for 5 ton)
        const capexCost = Math.round(4000 + (tonnage - 1) * 1400);
        
        // Utility waste cost estimate: baseline cooling bill $250/ton per year * efficiency loss ratio
        const yearlyCoolingBase = tonnage * 300;
        const wasteCost = Math.round(yearlyCoolingBase * (effLossPercent / 100));

        // Display results
        metricRemaining.textContent = remainingLife === 0 ? "Expired (Replace Now)" : `${remainingLife.toFixed(1)} Years`;
        metricEffLoss.textContent = `${effLossPercent}% Loss`;
        metricWaste.textContent = `$${wasteCost} / year`;
        metricCapex.textContent = `$${capexCost.toLocaleString()}`;

        // Status Badge Logic
        if (remainingLife > 10) {
            statusBadge.textContent = "Excellent";
            statusBadge.style.background = "#10B981"; // green
        } else if (remainingLife > 5) {
            statusBadge.textContent = "Good";
            statusBadge.style.background = "#0B7A53"; // dark green
        } else if (remainingLife > 2) {
            statusBadge.textContent = "Caution";
            statusBadge.style.background = "#F59E0B"; // orange
        } else {
            statusBadge.textContent = "Critical - Replace";
            statusBadge.style.background = "#EF4444"; // red
        }

        // Set form lead details payload
        plannerMetricsInput.value = `[System Age: ${age} Years | Tonnage: ${tonnage} Tons | Maintenance: ${maintenanceType} | Remaining Life: ${remainingLife.toFixed(1)} Yrs | Eff Loss: ${effLossPercent}%]`;

        // Render SVG Line Chart
        renderSVG(age, maxLife, decayRate);
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
            const lname = nameParts.slice(1).join(" ") || "Customer";

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
                    alert("Consultation request secure! Chris or Sean will contact you to schedule an inspection.");
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

    // Initialize display on load
    updatePlanner();
});
