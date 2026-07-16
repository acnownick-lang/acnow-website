// A/C Now LLC — Homepage Interactive Logic
document.addEventListener("DOMContentLoaded", () => {
    // 1. SEER2 Energy Savings Calculator Logic
    window.updateSeerSavings = function() {
        const currentSeerEl = document.getElementById("current-seer");
        const targetSeerEl = document.getElementById("target-seer");
        const monthlyBillEl = document.getElementById("monthly-bill");
        
        if (!currentSeerEl || !targetSeerEl || !monthlyBillEl) return;

        const currentSeer = parseFloat(currentSeerEl.value) || 0;
        const targetSeer = parseFloat(targetSeerEl.value) || 0;
        const monthlyBill = parseFloat(monthlyBillEl.value) || 0;
        
        // Edge case checks: verify numbers and prevent division by zero or negative bounds
        if (currentSeer <= 0 || targetSeer <= 0 || monthlyBill <= 0) {
            console.error("Invalid inputs to updateSeerSavings");
            return;
        }

        const valCurrentSeer = document.getElementById("val-current-seer");
        const valTargetSeer = document.getElementById("val-target-seer");
        const valMonthlyBill = document.getElementById("val-monthly-bill");

        if (valCurrentSeer) valCurrentSeer.textContent = `${currentSeer} SEER (${currentSeer <= 10 ? 'Over 15 Years Old' : 'Standard Older Unit'})`;
        let efficiencyText = "Ultra High Efficiency";
        if (targetSeer < 16.0) {
            efficiencyText = "Standard Efficiency";
        } else if (targetSeer < 18.0) {
            efficiencyText = "Premium Efficiency";
        }
        if (valTargetSeer) valTargetSeer.textContent = `${targetSeer} SEER2 (${efficiencyText})`;
        if (valMonthlyBill) valMonthlyBill.textContent = `$${monthlyBill}`;

        currentSeerEl.setAttribute('aria-valuetext', `${currentSeer} SEER`);
        targetSeerEl.setAttribute('aria-valuetext', `${targetSeer} SEER2`);
        monthlyBillEl.setAttribute('aria-valuetext', `$${monthlyBill}`);
        
        // Florida Climate Factor: Cooling (A/C) represents ~55% of the total household electricity bill.
        // Also, SEER2 ratings are roughly 4.5% more stringent than old SEER due to testing at higher static pressure.
        // We multiply SEER2 by 1.045 to compare on an equivalent SEER basis.
        const coolingLoadFraction = 0.55; 
        const adjustedTargetSeer = targetSeer * 1.045;
        
        // Limit savings ratio between 0 and 1
        const savingsRatio = Math.max(0, Math.min(1, 1 - (currentSeer / adjustedTargetSeer)));
        
        const monthlySavings = monthlyBill * coolingLoadFraction * savingsRatio;
        const yearlySavings = monthlySavings * 12;
        
        const seerMonthlySavings = document.getElementById("seer-monthly-savings");
        const seerYearlySavings = document.getElementById("seer-yearly-savings");
        if (seerMonthlySavings) seerMonthlySavings.textContent = `$${monthlySavings.toFixed(2)}`;
        if (seerYearlySavings) seerYearlySavings.textContent = `$${yearlySavings.toFixed(2)}`;
        
        const fillPercent = Math.round(savingsRatio * 100);
        const barFill = document.getElementById("seer-bar-fill");
        if (barFill) {
            barFill.style.width = `${fillPercent}%`;
        }
        
        const resultsNote = document.querySelector(".results-note");
        if (resultsNote) {
            resultsNote.textContent = `Upgrading to an ${targetSeer} SEER2 unit (equivalent to ${adjustedTargetSeer.toFixed(1)} SEER) reduces your cooling power draw by approximately ${fillPercent}% compared to a standard ${currentSeer} SEER condenser.`;
        }
    };

    // Initialize if values exist
    const currentSeerEl = document.getElementById("current-seer");
    if (currentSeerEl) {
        window.updateSeerSavings();
    }

    // 2. Service Club Membership ROI Builder Logic
    window.updateClubROI = function() {
        let yearlySavings = 0;
        let memberCost = 155.00;
        
        const optCleanings = document.getElementById("opt-cleanings");
        const optRepairCost = document.getElementById("opt-repair-cost");
        const optRepairsValue = document.getElementById("opt-repairs-value");
        const optMultiSystem = document.getElementById("opt-multi-system");
        
        if (!optCleanings || !optRepairCost || !optRepairsValue) return;

        const hasCleanings = optCleanings.checked;
        const hasDiagnostic = optRepairCost.checked;
        const hasRepairs = optRepairsValue.checked;
        const hasMultiSystem = optMultiSystem ? optMultiSystem.checked : false;
        
        if (hasCleanings) {
            yearlySavings += 180; // $90 per clean, twice a year
        }
        if (hasDiagnostic) {
            yearlySavings += 89; // Saved service diagnostic callout
        }
        if (hasRepairs) {
            yearlySavings += 45; // 15% discount on estimated $300 parts/labor ticket
        }
        if (hasMultiSystem) {
            memberCost += 105.00; // +$105/yr for second system
            yearlySavings += 180; // Saves another 2 maintenance cleanings ($180/yr)
            if (hasDiagnostic) {
                yearlySavings += 89; // Second diagnostic waived if needed
            }
        }
        
        const netSavings = yearlySavings - memberCost;
        
        const savingsDisplay = document.getElementById("club-savings-val");
        if (savingsDisplay) {
            if (netSavings >= 0) {
                savingsDisplay.textContent = `$${netSavings.toFixed(2)}`;
                savingsDisplay.style.color = "#60A5FA";
            } else {
                savingsDisplay.textContent = `-$${Math.abs(netSavings).toFixed(2)}`;
                savingsDisplay.style.color = "#ef4444";
            }
        }

        const costDisplay = document.getElementById("club-cost-val");
        if (costDisplay) {
            costDisplay.textContent = `$${memberCost.toFixed(2)}`;
        }
    };

    const optCleanings = document.getElementById("opt-cleanings");
    if (optCleanings) {
        window.updateClubROI();
    }



    // 4. 3D Digital Thermostat Interactive Widget
    const initializeThermostatWidget = () => {
        let targetTemp = 72;
        const minTemp = 55;
        const maxTemp = 85;

        const card = document.getElementById('thermostat-card');
        const dial = document.getElementById('dial-outer');
        const dialRing = document.getElementById('dial-ring');
        const dialTick = document.getElementById('dial-tick');
        const tempDisplay = document.getElementById('temp-val');
        const progressBar = document.getElementById('progress-bar');
        const statusText = document.getElementById('status-text');

        const btnCool = document.getElementById('btn-cool');
        const btnHeat = document.getElementById('btn-heat');
        const btnEco = document.getElementById('btn-eco');

        if (!card || !dial || !dialRing || !dialTick || !tempDisplay || !progressBar || !statusText || !btnCool || !btnHeat || !btnEco) {
            return;
        }

        let systemMode = 'cool'; // cool, heat, eco
        let isDragging = false;
        let centerX, centerY;
        const strokeCircumference = 2 * Math.PI * 75;

        function updateUI() {
            tempDisplay.textContent = targetTemp;
            dial.setAttribute('aria-valuenow', targetTemp);
            dial.setAttribute('aria-valuetext', `${targetTemp} degrees Fahrenheit`);

            const tempPercent = (targetTemp - minTemp) / (maxTemp - minTemp);
            let hue = 210 - (tempPercent * 200);
            
            if (systemMode === 'eco') {
                hue = 135;
            }

            card.style.setProperty('--temp-glow', `hsla(${hue}, 95%, 50%, 0.15)`);
            card.style.setProperty('--temp-color', `hsl(${hue}, 100%, 60%)`);

            if (systemMode === 'cool') {
                statusText.textContent = targetTemp < 74 ? 'COOLING SYSTEM ACTIVE' : 'STAGE 1 CLIMATE COMFORT';
                statusText.style.color = 'hsl(200, 100%, 60%)';
            } else if (systemMode === 'heat') {
                statusText.textContent = targetTemp > 68 ? 'HEATING CORE ENGAGED' : 'STANDBY MODE';
                statusText.style.color = 'hsl(10, 100%, 60%)';
            } else {
                statusText.textContent = 'ECO SAVINGS ACTIVE';
                statusText.style.color = 'hsl(135, 100%, 60%)';
            }

            const progressPercent = tempPercent * 0.75;
            const strokeOffset = strokeCircumference - (progressPercent * strokeCircumference);
            progressBar.style.strokeDashoffset = strokeOffset;

            const tickRotation = -135 + (tempPercent * 270);
            dialTick.style.transform = `rotate(${tickRotation}deg)`;
            dialRing.style.transform = `rotate(${tickRotation}deg)`;
        }

        updateUI();

        function startDrag(e) {
            isDragging = true;
            const rect = dial.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
            if (e.cancelable && e.type !== 'touchstart') e.preventDefault();
            if (e.type === 'mousedown') {
                window.addEventListener('mousemove', drag);
                window.addEventListener('mouseup', stopDrag);
            } else {
                window.addEventListener('touchmove', drag, { passive: false });
                window.addEventListener('touchend', stopDrag);
            }
        }

        function drag(e) {
            if (!isDragging) return;

            let clientX, clientY;
            if (e.touches && e.touches[0]) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const dx = clientX - centerX;
            const dy = clientY - centerY;
            const angleRad = Math.atan2(dy, dx);
            let angleDeg = angleRad * (180 / Math.PI);
            
            let normalizedAngle = angleDeg + 90;
            if (normalizedAngle < 0) {
                normalizedAngle += 360;
            }

            let percentValue = 0;
            if (normalizedAngle <= 135) {
                percentValue = (normalizedAngle + 135) / 270;
            } else if (normalizedAngle >= 225) {
                percentValue = (normalizedAngle - 225) / 270;
            } else {
                percentValue = normalizedAngle > 180 ? 0 : 1;
            }

            percentValue = Math.max(0, Math.min(1, percentValue));
            const calculatedTemp = Math.round(minTemp + percentValue * (maxTemp - minTemp));
            
            if (calculatedTemp !== targetTemp) {
                targetTemp = calculatedTemp;
                updateUI();
            }
        }

        function stopDrag() {
            isDragging = false;
            window.removeEventListener('mousemove', drag);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('touchmove', drag);
            window.removeEventListener('touchend', stopDrag);
        }

        dial.addEventListener('mousedown', startDrag);
        dial.addEventListener('touchstart', startDrag, { passive: true });

        dial.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (targetTemp < maxTemp) {
                    targetTemp++;
                    updateUI();
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (targetTemp > minTemp) {
                    targetTemp--;
                    updateUI();
                }
            }
        });

        function setMode(mode) {
            systemMode = mode;
            btnCool.classList.remove('active');
            btnHeat.classList.remove('active');
            btnEco.classList.remove('active');

            if (mode === 'cool') btnCool.classList.add('active');
            if (mode === 'heat') btnHeat.classList.add('active');
            if (mode === 'eco') btnEco.classList.add('active');

            updateUI();
        }

        btnCool.addEventListener('click', () => setMode('cool'));
        btnHeat.addEventListener('click', () => setMode('heat'));
        btnEco.addEventListener('click', () => setMode('eco'));

        const hoverArea = document.querySelector('.smart-climate-section');
        if (hoverArea) {
            hoverArea.addEventListener('mousemove', (e) => {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const mouseX = (e.clientX / width) - 0.5;
                const mouseY = (e.clientY / height) - 0.5;
                
                const rotateX = -mouseY * 25;
                const rotateY = mouseX * 25;
                
                card.style.transform = `rotateX(${12 + rotateX}deg) rotateY(${-8 + rotateY}deg)`;
            });

            hoverArea.addEventListener('mouseleave', () => {
                card.style.transform = 'rotateX(12deg) rotateY(-8deg)';
            });
        }
    };

    initializeThermostatWidget();

    // 5. Smart Climate Tab Switcher (Lazy Loading WebGL iframe)
    const initializeSmartClimateTabs = () => {
        const tabBtns = document.querySelectorAll(".smart-tab-btn");
        const panelThermostat = document.getElementById("panel-thermostat");
        const panelAirflow = document.getElementById("panel-airflow");
        const panelEnergy = document.getElementById("panel-energy");
        const panelMoldmap = document.getElementById("panel-moldmap");
        const airflowPlaceholder = document.getElementById("airflow-iframe-placeholder");

        if (tabBtns.length === 0 || !panelThermostat || !panelAirflow) return;

        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");

                tabBtns.forEach(b => {
                    b.classList.remove("active");
                    b.style.backgroundColor = "transparent";
                    b.style.color = "#94A3B8";
                    b.setAttribute("aria-selected", "false");
                    b.setAttribute("tabindex", "0");
                });
                btn.classList.add("active");
                btn.style.backgroundColor = "var(--primary)";
                btn.style.color = "var(--white)";
                btn.setAttribute("aria-selected", "true");
                btn.setAttribute("tabindex", "0");

                if (panelThermostat) panelThermostat.style.display = "none";
                if (panelAirflow) panelAirflow.style.display = "none";
                if (panelEnergy) panelEnergy.style.display = "none";
                if (panelMoldmap) panelMoldmap.style.display = "none";

                if (targetTab === "thermostat") {
                    panelThermostat.style.display = "flex";
                } else if (targetTab === "energy") {
                    if (panelEnergy) panelEnergy.style.display = "flex";
                } else if (targetTab === "moldmap") {
                    if (panelMoldmap) {
                        panelMoldmap.style.display = "flex";
                        window.updateHomeMoldMap();
                    }
                } else if (targetTab === "airflow") {
                    panelAirflow.style.display = "flex";

                    if (airflowPlaceholder) {
                        const iframe = document.createElement("iframe");
                        iframe.src = "3d-airflow.html";
                        iframe.style.width = "100%";
                        iframe.style.height = "100%";
                        iframe.style.border = "none";
                        iframe.setAttribute("title", "3D Thermodynamic Airflow Map");
                        airflowPlaceholder.replaceWith(iframe);
                    }
                }

                if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
                    window.ComfortAudio.playClick();
                }
            });
        });

        // Initialize active tab state on load (especially if moldmap is default)
        const activeTabBtn = document.querySelector(".smart-tab-btn.active");
        if (activeTabBtn && activeTabBtn.getAttribute("data-tab") === "moldmap") {
            window.updateHomeMoldMap();
        }
    };

    window.updateHomeMoldMap = function() {
        const seasonSelect = document.getElementById("moldmap-season");
        const stuartCircle = document.getElementById("map-stuart");
        const pslCircle = document.getElementById("map-psl");
        const rhIndicator = document.getElementById("moldmap-rh-indicator");
        const recommendation = document.getElementById("moldmap-recommendation");
        
        if (!seasonSelect || !stuartCircle || !pslCircle || !rhIndicator || !recommendation) return;
        
        const season = seasonSelect.value;
        
        if (season === "winter") {
            stuartCircle.setAttribute("fill", "#10B981");
            pslCircle.setAttribute("fill", "#10B981");
            rhIndicator.textContent = "RH: 55%";
            recommendation.style.background = "rgba(11, 122, 83, 0.1)";
            recommendation.style.borderColor = "#0B7A53";
            recommendation.style.color = "#0B7A53";
            recommendation.innerHTML = "🟢 <strong>Safe Comfort Levels:</strong> Dry winter air maintains relative humidity below the 60% mold amplification threshold. Standard cooling/ventilation active.";
        } else if (season === "summer") {
            stuartCircle.setAttribute("fill", "#ef4444");
            pslCircle.setAttribute("fill", "#ef4444");
            rhIndicator.textContent = "RH: 82%";
            recommendation.style.background = "rgba(194, 42, 54, 0.1)";
            recommendation.style.borderColor = "#C22A36";
            recommendation.style.color = "#C22A36";
            recommendation.innerHTML = "⚠️ <strong>Critical Threat Level:</strong> High summer humidity causes indoor dust mite/mold reproduction. Set AC to dehumidify or install UV scrubbers.";
        } else if (season === "storm") {
            stuartCircle.setAttribute("fill", "#D97706");
            pslCircle.setAttribute("fill", "#D97706");
            rhIndicator.textContent = "RH: 95%";
            recommendation.style.background = "rgba(148, 82, 3, 0.1)";
            recommendation.style.borderColor = "#945203";
            recommendation.style.color = "#945203";
            recommendation.innerHTML = "🌀 <strong>Saturated Air Warning:</strong> Tropical storms cause absolute outdoor air saturation. Run HVAC staging controls to prevent crawlspace/wall sweat.";
        }
    };
    initializeSmartClimateTabs();

    // 6. Progressive Web Share API (Quotes & Calibration Sharing)
    const initializeShareButtons = () => {
        const shareSeerBtn = document.querySelector(".share-btn-seer");
        const shareClubBtn = document.querySelector(".share-btn-club");

        const shareData = (title, text, url) => {
            if (navigator.share) {
                navigator.share({ title, text, url })
                    .then(() => console.log("Successful share"))
                    .catch((error) => console.log("Error sharing:", error));
            } else {
                navigator.clipboard.writeText(`${text} Learn more: ${url}`)
                    .then(() => {
                        showShareToast("Link copied to clipboard!");
                    })
                    .catch(() => {
                        const smsBody = encodeURIComponent(`${text} ${url}`);
                        window.location.href = `sms:?body=${smsBody}`;
                    });
            }
        };

        const showShareToast = (message) => {
            const toast = document.createElement("div");
            toast.textContent = message;
            toast.style.position = "fixed";
            toast.style.bottom = "80px";
            toast.style.left = "50%";
            toast.style.transform = "translateX(-50%)";
            toast.style.background = "var(--dark)";
            toast.style.border = "1px solid rgba(255,255,255,0.1)";
            toast.style.color = "var(--white)";
            toast.style.padding = "12px 24px";
            toast.style.borderRadius = "12px";
            toast.style.fontSize = "13px";
            toast.style.fontFamily = "var(--font-heading)";
            toast.style.zIndex = "1000";
            toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
            toast.style.opacity = "0";
            toast.style.transition = "opacity 0.3s ease";
            
            document.body.appendChild(toast);
            setTimeout(() => toast.style.opacity = "1", 10);
            
            setTimeout(() => {
                toast.style.opacity = "0";
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        };

        if (shareSeerBtn) {
            shareSeerBtn.addEventListener("click", () => {
                const text = "I just calculated that upgrading my home air conditioner unit can reduce my cooling bill by over 40%! Check out A/C Now LLC on the Treasure Coast.";
                shareData("A/C Now Energy Savings Calc", text, window.location.origin);
            });
        }

        if (shareClubBtn) {
            shareClubBtn.addEventListener("click", () => {
                const text = "Check out the A/C Now LLC service club! Covers regular cleanings, waives diagnostic fees, and gives priority scheduling during summer peaks.";
                shareData("A/C Now Service Club Membership", text, window.location.origin);
            });
        }
    };

    initializeShareButtons();

    // 7. Interactive Sound of Comfort triggers (Hover Breeze)
    const initializeSplitHeroAudio = () => {
        const sides = document.querySelectorAll(".split-hero-side");
        sides.forEach(side => {
            side.addEventListener("mouseenter", () => {
                if (window.ComfortAudio && typeof window.ComfortAudio.startWind === "function") {
                    window.ComfortAudio.startWind();
                }
            });
            side.addEventListener("mouseleave", () => {
                if (window.ComfortAudio && typeof window.ComfortAudio.stopWind === "function") {
                    window.ComfortAudio.stopWind();
                }
            });
        });
    };
    initializeSplitHeroAudio();

    // 8. Secret Owner/Technician Portal Access via Mascot Logo Long Press (3+ Seconds)
    const initializeSecretMascotShortcut = () => {
        const mascotEl = document.querySelector('.center-mascot');
        if (!mascotEl) return;

        const linkEl = mascotEl.querySelector('a');
        let pressTimer = null;
        let isLongPress = false;
        let touchStartPos = null;

        const startPress = (e) => {
            console.log('[Mascot Backdoor] mousedown/touchstart detected.');
            if (e.type === 'mousedown' && e.button !== 0) {
                console.log('[Mascot Backdoor] Ignored non-left-click mousedown.');
                return;
            }
            isLongPress = false;

            if (e.touches && e.touches[0]) {
                touchStartPos = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            } else {
                touchStartPos = null;
            }

            // Immediate visual hold feedback
            mascotEl.classList.add('mascot-holding');
            console.log('[Mascot Backdoor] Starting 3-second hold timer.');

            pressTimer = setTimeout(() => {
                isLongPress = true;
                console.log('[Mascot Backdoor] 3-second hold complete. Triggering redirect flow.');
                mascotEl.classList.remove('mascot-holding');
                
                if (window.ComfortAudio && typeof window.ComfortAudio.playClick === 'function') {
                    window.ComfortAudio.playClick();
                }
                
                // Visual feedback: brief scale-up and gold drop-shadow flash
                mascotEl.style.transition = 'transform 0.15s ease, filter 0.15s ease';
                mascotEl.style.transform = 'scale(1.15)';
                mascotEl.style.filter = 'drop-shadow(0 0 35px #FFC72C)';
                
                // Automatically set dev mode and Phase 2 to allow route guard entry
                localStorage.setItem('acnow_dev_mode', 'true');
                localStorage.setItem('acnow_phase', '2');
                sessionStorage.setItem('acnow_dev_mode', 'true');
                sessionStorage.setItem('acnow_phase', '2');
                document.cookie = "acnow_auth=phase2; path=/; max-age=86400; SameSite=Strict";
                
                setTimeout(() => {
                    const path = window.location.pathname;
                    const pathLower = path.toLowerCase();
                    const marker = "acnow-netlify/";
                    const markerIndex = pathLower.indexOf(marker);
                    let depth = 0;
                    if (markerIndex !== -1) {
                        const subPath = path.substring(markerIndex + marker.length);
                        const parts = subPath.split('/').filter(p => p && p !== 'index.html');
                        depth = parts.length;
                    } else {
                        const parts = path.split('/').filter(p => p && p !== 'index.html');
                        depth = parts.length;
                    }
                    const prefix = "../".repeat(depth);
                    const targetUrl = prefix + 'pages/team-portal.html';
                    console.log('[Mascot Backdoor] Redirecting to:', targetUrl);
                    window.location.href = targetUrl;
                }, 300);
            }, 3000);
        };

        const cancelPress = () => {
            console.log('[Mascot Backdoor] Mouseup/touchend detected. cancelPress run.');
            if (pressTimer) {
                console.log('[Mascot Backdoor] Clearing active hold timer.');
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            mascotEl.classList.remove('mascot-holding');
            if (!isLongPress) {
                mascotEl.style.transform = '';
                mascotEl.style.filter = '';
            }
        };

        const handleTouchMove = (e) => {
            if (!touchStartPos || !e.touches || !e.touches[0]) return;
            const dx = e.touches[0].clientX - touchStartPos.x;
            const dy = e.touches[0].clientY - touchStartPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 10) { // 10px drag threshold for scrolling
                cancelPress();
            }
        };

        if (linkEl) {
            linkEl.addEventListener('click', (e) => {
                if (isLongPress) {
                    e.preventDefault();
                }
            });
        }

        // Prevent browser/iOS default link preview menus during hold
        mascotEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        mascotEl.addEventListener('mousedown', startPress);
        mascotEl.addEventListener('touchstart', startPress, { passive: true });

        mascotEl.addEventListener('mouseup', cancelPress);
        mascotEl.addEventListener('mouseleave', cancelPress);
        mascotEl.addEventListener('touchend', cancelPress);
        mascotEl.addEventListener('touchcancel', cancelPress);
        mascotEl.addEventListener('touchmove', handleTouchMove, { passive: true });
    };

    // 9. Mobile Mascot Speech Bubble Toggle (Click to Pop Up)
    const initializeMascotMobilePopup = () => {
        const mascotEl = document.querySelector('.center-mascot');
        const centerEl = document.querySelector('.split-hero-center');
        if (!mascotEl || !centerEl) return;

        // On mobile, clicking the mascot toggles the speech bubble
        mascotEl.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                // If the bubble is not currently shown, show it and prevent navigation
                if (!centerEl.classList.contains('show-bubble')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Set speech bubble content specifically to the diagnostic message
                    const bubble = centerEl.querySelector('.mascot-speech-bubble');
                    if (bubble) {
                        bubble.innerHTML = ''; // Keep empty to avoid double-message with CSS :before content
                    }
                    
                    centerEl.classList.add('show-bubble');
                }
                // If it is already shown, let the click propagate and navigate!
            }
        });

        // Close bubble when tapping outside
        document.addEventListener('click', (e) => {
            if (!centerEl.contains(e.target)) {
                centerEl.classList.remove('show-bubble');
            }
        });
    };

    initializeSecretMascotShortcut();
    initializeMascotMobilePopup();
});
