function initHvacConfigurator() {
    // Inputs
    const sliderSqft = document.getElementById("config-sqft");
    const labelSqft = document.getElementById("label-sqft");
    
    const insulationBtns = document.querySelectorAll("#toggle-insulation .toggle-btn");
    const styleBoxes = document.querySelectorAll(".option-box");
    const tierBtns = document.querySelectorAll("#toggle-tier .toggle-btn");
    const accessoryChecks = document.querySelectorAll(".config-acc");
    
    // Outputs
    const invSizeEl = document.getElementById("inv-size");
    const invBrand = document.getElementById("inv-brand");
    const invSeer = document.getElementById("inv-seer");
    const invBase = document.getElementById("inv-base");
    const invAccTotal = document.getElementById("inv-acc-total");
    const invDuration = document.getElementById("inv-duration");
    const invPriceEl = document.getElementById("inv-price");
    
    const configForm = document.getElementById("config-lead-form");
    const confMetricsInput = document.getElementById("conf_metrics_input");

    if (!sliderSqft || !invSizeEl || !invPriceEl) {
        console.warn("[PWA Client] HVAC Configurator elements missing. Skipping initialization.");
        return;
    }

    // State Variables
    let insulation = "average";
    let systemStyle = "split";
    let efficiencyTier = "14";

    // Sliders
    sliderSqft.addEventListener("input", () => {
        labelSqft.textContent = `${sliderSqft.value.toLocaleString()} sq ft`;
        updateConfigurator();
        triggerAudioTick();
    });

    // Toggle Groups
    insulationBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            insulationBtns.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            insulation = btn.dataset.val;
            updateConfigurator();
            playClickSound();
        });
    });

    styleBoxes.forEach(box => {
        const selectBox = () => {
            styleBoxes.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            box.classList.add("active");
            box.setAttribute("aria-pressed", "true");
            systemStyle = box.dataset.val;
            updateConfigurator();
            playClickSound();
        };
        box.addEventListener("click", selectBox);
        box.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectBox();
            }
        });
    });

    tierBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tierBtns.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            efficiencyTier = btn.dataset.val;
            updateConfigurator();
            playClickSound();
        });
    });

    // Accessories
    accessoryChecks.forEach(check => {
        check.addEventListener("change", () => {
            updateConfigurator();
            playClickSound();
        });
    });

    function triggerAudioTick() {
        if (window.ComfortAudio && typeof window.ComfortAudio.playTick === "function") {
            window.ComfortAudio.playTick();
        }
    }

    function playClickSound() {
        if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
            window.ComfortAudio.playClick();
        }
    }

    function updateConfigurator() {
        const sqft = parseInt(sliderSqft.value) || 0;
        if (sqft <= 0) return;
        
        // 1. Estimate Tonnage Load (Base rule: 1 ton per 550 sqft)
        let computedTonnage = sqft / 550;
        
        // Adjust for Insulation
        if (insulation === "poor") {
            computedTonnage *= 1.25; // 25% increase for poor attic insulation and high infiltration
        } else if (insulation === "tight") {
            computedTonnage *= 0.80; // 20% decrease for spray foam or high-performance insulation
        }
        
        // Clamp to standard residential sizing steps: 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0
        let matchedTonnage = 3.0;
        if (computedTonnage <= 1.75) matchedTonnage = 1.5;
        else if (computedTonnage <= 2.25) matchedTonnage = 2.0;
        else if (computedTonnage <= 2.75) matchedTonnage = 2.5;
        else if (computedTonnage <= 3.25) matchedTonnage = 3.0;
        else if (computedTonnage <= 3.75) matchedTonnage = 3.5;
        else if (computedTonnage <= 4.5) matchedTonnage = 4.0;
        else matchedTonnage = 5.0;

        // 2. Resolve Brands & Installation Details
        let brandName = "RunTru by Trane";
        let estHours = "6 - 8 Hours";
        let baseLabor = 1800;

        if (systemStyle === "ductless") {
            brandName = "Mitsubishi M-Series";
            estHours = "8 - 12 Hours";
            baseLabor = 2400;
        }

        // 3. SEER2 efficiency base pricing tier multipliers
        let tierMultiplier = 1.0;
        let seerLabel = "14.3 SEER2 (Standard)";
        
        // Grab simulator DOM elements
        const simHumidityBadge = document.getElementById("sim-humidity-badge");
        const simHumidityMarker = document.getElementById("sim-humidity-marker");
        const simCycleDesc = document.getElementById("sim-cycle-desc");
        const simSavings = document.getElementById("sim-savings");
        
        let humText = "High Humidity";
        let humBg = "#EF4444";
        let humPct = 15; // Clammy (68%)
        let cycleText = "Short-cycling spikes. Blasts on at 100% capacity then cycles off, causing temperature swings and clammy air.";
        let annualSavings = 0;

        if (efficiencyTier === "16") {
            tierMultiplier = 1.28;
            seerLabel = "16.0 SEER2 (Premium)";
            humText = "Balanced";
            humBg = "#F59E0B";
            humPct = 40; // Moderate (55% RH)
            cycleText = "Two-stage compression. Runs on low capacity 80% of the time, improving dehumidification and reducing energy spikes.";
            annualSavings = Math.round(matchedTonnage * 110);
        } else if (efficiencyTier === "18") {
            tierMultiplier = 1.62;
            seerLabel = "18.5 SEER2 (Ultimate Variable)";
            humText = "Optimal Comfort";
            humBg = "#10B981";
            humPct = 50; // Perfect (45% RH)
            cycleText = "Variable-speed inverter. Runs continuously at exact speed matching thermal load. Quietest comfort and perfect humidity control.";
            annualSavings = Math.round(matchedTonnage * 215);
        }

        // Update Simulator DOM
        if (simHumidityBadge) {
            simHumidityBadge.textContent = humText;
            simHumidityBadge.style.background = humBg;
        }
        if (simHumidityMarker) {
            simHumidityMarker.style.left = humPct + "%";
        }
        if (simCycleDesc) {
            simCycleDesc.textContent = cycleText;
        }
        if (simSavings) {
            simSavings.textContent = `$${annualSavings} / year`;
        }

        // Equipment Cost Estimate (tonnage base pricing)
        const baseEquipmentPrice = matchedTonnage * 1400 * tierMultiplier;
        const totalBasePrice = Math.round(baseEquipmentPrice + baseLabor);

        // 4. Summarize Accessories
        let accessoriesTotal = 0;
        let checkedAccessories = [];

        accessoryChecks.forEach(check => {
            if (check.checked) {
                const price = parseInt(check.dataset.price) || 0;
                accessoriesTotal += price;
                checkedAccessories.push(check.nextElementSibling.textContent);
            }
        });

        const totalInvoicePrice = totalBasePrice + accessoriesTotal;

        // 5. Update DOM fields and system matched image
        const imgWrap = document.getElementById("config-img-wrap");
        const sysImg = document.getElementById("config-system-img");
        
        if (imgWrap && sysImg) {
            imgWrap.style.display = "block";
            if (systemStyle === "ductless") {
                sysImg.src = "downloaded_images/config-ductless.webp";
                sysImg.alt = "Mitsubishi M-Series Ductless mini-split installation matched preview";
            } else {
                sysImg.src = "downloaded_images/config-central.webp";
                sysImg.alt = "RunTru by Trane Central A/C condenser installation matched preview";
            }
        }

        if (invSizeEl) invSizeEl.textContent = `${matchedTonnage.toFixed(1)} Tons (${Math.round(matchedTonnage * 12000).toLocaleString()} BTU)`;
        if (invBrand) invBrand.textContent = `${brandName} (${systemStyle === 'split' ? 'Central' : 'Ductless'})`;
        if (invSeer) invSeer.textContent = seerLabel;
        if (invBase) invBase.textContent = `$${totalBasePrice.toLocaleString()}`;
        if (invAccTotal) invAccTotal.textContent = `$${accessoriesTotal.toLocaleString()}`;
        if (invDuration) invDuration.textContent = estHours;
        if (invPriceEl) invPriceEl.textContent = `$${totalInvoicePrice.toLocaleString()}`;

        // Set Lead details payload
        if (confMetricsInput) {
            confMetricsInput.value = `[System Size: ${matchedTonnage.toFixed(1)} Ton | Style: ${systemStyle} | SEER: ${efficiencyTier} | Insulation: ${insulation} | Accessories: ${checkedAccessories.join(", ") || "None"} | Price: $${totalInvoicePrice}]`;
        }
        window.__debugConfig = { matchedTonnage, totalBasePrice, totalInvoicePrice, invTotalExists: !!invPriceEl };
    }

    // Lead Capture Form Submit
    if (configForm) {
        configForm.addEventListener("submit", (e) => {
            const nameVal = document.getElementById("fullname_config").value.trim();
            const nameParts = nameVal.split(" ");
            const fname = nameParts[0] || "";
            const lname = nameParts.slice(1).join(" ") || "Customer";

            const payload = {
                fname,
                lname,
                tel: document.getElementById("phone_config").value.trim(),
                email: document.getElementById("email_config").value.trim(),
                city: document.getElementById("city_config").value.trim(),
                message: `[HVAC Configurator Build Report] ${confMetricsInput.value} [Request] Client submits custom virtual system design for site inspection validation.`,
                honeypot: document.getElementById("honeypot_config").value
            };

            if (typeof window.submitFormWithSync === "function") {
                window.submitFormWithSync(e, configForm, payload, () => {
                    alert("HVAC design secured! Chris or Sean will contact you to schedule an on-site installation evaluation.");
                    configForm.reset();
                    accessoryChecks.forEach(c => c.checked = false);
                    updateConfigurator();
                    
                    if (typeof window.configurePushNotifications === "function") {
                        window.configurePushNotifications();
                    }
                });
            } else {
                console.error("submitFormWithSync not found in global scope");
            }
        });
    }

    // Initialize displays on load
    updateConfigurator();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHvacConfigurator);
} else {
    initHvacConfigurator();
}
