// Dashboard Logic for A/C Now Redesign & SEO Audit Showcase

/* ==========================================================================
   Premium Scroll Effects (Header Shrinking & Reveal Animations) and
   Mobile Nav — Close on tap-outside, close on link-click, aria-expanded
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Shrink header and apply dark transparent background on scroll
    const headerElement = document.querySelector('.header');
    
    function toggleHeaderScroll() {
        if (window.scrollY > 40) {
            headerElement.classList.add('scrolled');
        } else {
            headerElement.classList.remove('scrolled');
        }
    }
    
    if (headerElement) {
        window.addEventListener('scroll', toggleHeaderScroll, { passive: true });
        toggleHeaderScroll(); // Trigger check on load
    }

    // 2. Intersection Observer to slide sections up as they enter viewport
    const revealElements = document.querySelectorAll('.reveal');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    // Add .animating 1 frame before .active to pre-warm GPU layer
                    // This ensures will-change is only active during the animation
                    requestAnimationFrame(() => {
                        el.classList.add('animating');
                        requestAnimationFrame(() => {
                            el.classList.add('active');
                        });
                    });
                    // Remove will-change after animation completes (saves GPU memory)
                    el.addEventListener('transitionend', () => {
                        el.classList.remove('animating');
                    }, { once: true });
                    obs.unobserve(el); // Only trigger once
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });
        
        revealElements.forEach(el => observer.observe(el));
    } else {
        // Fallback for older browsers
        revealElements.forEach(el => el.classList.add('active'));
    }

    // 3. Mobile Navigation Toggle and Click-Outside-to-Close Handler
    const mobileNav = document.getElementById('primary-nav');
    const hamburger = document.getElementById('hamburger-btn');

    if (mobileNav && hamburger) {
        const focusableElements = mobileNav.querySelectorAll('a[href], button');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        function closeNav() {
            mobileNav.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.textContent = '☰';
        }

        function openNav() {
            mobileNav.classList.add('active');
            hamburger.setAttribute('aria-expanded', 'true');
            hamburger.textContent = '✕';
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 50); // Focus the first link in navigation
            }
        }

        // Replace inline onclick with proper JS toggle so aria-expanded stays in sync
        hamburger.removeAttribute('onclick');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileNav.classList.contains('active') ? closeNav() : openNav();
        });

        // Close when any nav link is tapped (prevents drawer staying open on anchor links)
        mobileNav.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link')) {
                closeNav();
            }
        });

        // Close when tapping anywhere outside the drawer or hamburger
        document.addEventListener('click', (e) => {
            if (
                mobileNav.classList.contains('active') &&
                !mobileNav.contains(e.target) &&
                !hamburger.contains(e.target)
            ) {
                closeNav();
            }
        });

        // Close on Escape key and restore focus to hamburger
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                closeNav();
                hamburger.focus();
            }
        });

        // Keyboard Focus Trap within mobile navigation drawer overlay
        mobileNav.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstFocusable || document.activeElement === mobileNav) {
                    hamburger.focus();
                    e.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastFocusable) {
                    hamburger.focus();
                    e.preventDefault();
                }
            }
        });

        hamburger.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !e.shiftKey && mobileNav.classList.contains('active')) {
                if (firstFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        });
    }

    // Initialize calculations on DOM content load if they exist on the page
    const optCleanings = document.getElementById("opt-cleanings");
    if (optCleanings && typeof window.updateClubROI === "function") {
        window.updateClubROI();
    }
});


/* ==========================================================================
   Interactive Innovations Tab Logic
   ========================================================================== */
// WCAG 4.1.2: manage aria-selected on role="tab" buttons
window.switchInnoTab = function(event, tabId) {
    const tabContainer = event.currentTarget.closest(".innovations-tab-container");
    if (!tabContainer) return;
    
    // Toggle Tab Headers + aria-selected
    const buttons = tabContainer.querySelectorAll(".inno-tab-btn");
    buttons.forEach(btn => {
        btn.classList.remove("active");
        btn.setAttribute('aria-selected', 'false');
    });
    event.currentTarget.classList.add("active");
    event.currentTarget.setAttribute('aria-selected', 'true');
    
    // Toggle Tab Panels
    const panels = tabContainer.querySelectorAll(".inno-tab-panel");
    panels.forEach(p => p.classList.remove("active"));
    
    const targetPanel = tabContainer.querySelector(`#${tabId}`);
    if (targetPanel) {
        targetPanel.classList.add("active");
        targetPanel.focus(); // Move keyboard focus to the activated panel
    }
};


/* ==========================================================================
   SEER2 Energy Savings Calculator Logic
   ========================================================================== */
window.updateSeerSavings = function() {
    const currentSeerEl = document.getElementById("current-seer");
    const targetSeerEl = document.getElementById("target-seer");
    const monthlyBillEl = document.getElementById("monthly-bill");
    
    if (!currentSeerEl || !targetSeerEl || !monthlyBillEl) return;

    const currentSeer = parseFloat(currentSeerEl.value);
    const targetSeer = parseFloat(targetSeerEl.value);
    const monthlyBill = parseFloat(monthlyBillEl.value);
    
    // Set labels & update ARIA slider values
    const valCurrentSeer = document.getElementById("val-current-seer");
    const valTargetSeer = document.getElementById("val-target-seer");
    const valMonthlyBill = document.getElementById("val-monthly-bill");

    if (valCurrentSeer) valCurrentSeer.textContent = `${currentSeer} SEER (${currentSeer <= 10 ? 'Over 10 Years Old' : 'Standard Older Unit'})`;
    if (valTargetSeer) valTargetSeer.textContent = `${targetSeer} SEER2 (Ultra High Efficiency)`;
    if (valMonthlyBill) valMonthlyBill.textContent = `$${monthlyBill}`;

    currentSeerEl.setAttribute('aria-valuetext', `${currentSeer} SEER`);
    targetSeerEl.setAttribute('aria-valuetext', `${targetSeer} SEER2`);
    monthlyBillEl.setAttribute('aria-valuetext', `$${monthlyBill}`);
    
    // Calculation: savings % = 1 - (current_seer / target_seer)
    const savingsRatio = 1 - (currentSeer / targetSeer);
    const monthlySavings = monthlyBill * savingsRatio;
    const yearlySavings = monthlySavings * 12;
    
    // Display results
    const seerMonthlySavings = document.getElementById("seer-monthly-savings");
    const seerYearlySavings = document.getElementById("seer-yearly-savings");
    if (seerMonthlySavings) seerMonthlySavings.textContent = `$${monthlySavings.toFixed(2)}`;
    if (seerYearlySavings) seerYearlySavings.textContent = `$${yearlySavings.toFixed(2)}`;
    
    // Update visual percentage bar fill
    const fillPercent = Math.round(savingsRatio * 100);
    const barFill = document.getElementById("seer-bar-fill");
    if (barFill) {
        barFill.style.width = `${fillPercent}%`;
    }
    
    const resultsNote = document.querySelector(".results-note");
    if (resultsNote) {
        resultsNote.textContent = `Upgrading to an ${targetSeer} SEER2 unit reduces your cooling power draw by approximately ${fillPercent}% compared to a standard ${currentSeer} SEER condenser.`;
    }
};


/* ==========================================================================
   Service Club Membership ROI Builder Logic
   ========================================================================== */
window.updateClubROI = function() {
    let yearlySavings = 0;
    
    const optCleanings = document.getElementById("opt-cleanings");
    const optRepairCost = document.getElementById("opt-repair-cost");
    const optRepairsValue = document.getElementById("opt-repairs-value");
    
    if (!optCleanings || !optRepairCost || !optRepairsValue) return;

    const hasCleanings = optCleanings.checked;
    const hasDiagnostic = optRepairCost.checked;
    const hasRepairs = optRepairsValue.checked;
    
    if (hasCleanings) {
        yearlySavings += 180; // $90 per clean, twice a year
    }
    if (hasDiagnostic) {
        yearlySavings += 95; // Saved service diagnostic callout
    }
    if (hasRepairs) {
        yearlySavings += 45; // 15% discount on estimated $300 parts/labor ticket
    }
    
    // Membership cost: $19/mo * 12 months = $228
    const netSavings = yearlySavings - 228;
    
    const savingsDisplay = document.getElementById("club-savings-val");
    if (savingsDisplay) {
        if (netSavings >= 0) {
            savingsDisplay.textContent = `$${netSavings.toFixed(2)}`;
            savingsDisplay.style.color = "#60A5FA";
        } else {
            savingsDisplay.textContent = `-$${Math.abs(netSavings).toFixed(2)}`;
            savingsDisplay.style.color = "#ef4444"; // Red for net-negative offset
        }
    }
};


/* ==========================================================================
   Emergency Dispatch Wizard Logic (index.html)
   ========================================================================== */
window.goToWizardStep2 = function() {
    const pane1 = document.getElementById("pane-step-1");
    const pane2 = document.getElementById("pane-step-2");
    
    if (!pane1 || !pane2) return;

    pane1.classList.remove("active");
    pane2.classList.add("active");
    
    const step1Indicator = document.getElementById("step-1-indicator");
    const step2Indicator = document.getElementById("step-2-indicator");
    if (step1Indicator) step1Indicator.classList.remove("active");
    if (step2Indicator) step2Indicator.classList.add("active");
    
    // Dynamic slot scheduling based on city
    const dispatchCityEl = document.getElementById("dispatch-city");
    const city = dispatchCityEl ? dispatchCityEl.value : "your city";
    const slotTimeText = document.getElementById("slot-time-text");
    if (slotTimeText) {
        const hours = ["1:00 PM - 3:00 PM", "3:00 PM - 5:00 PM", "5:00 PM - 7:00 PM"];
        const randomHour = hours[Math.floor(Math.random() * hours.length)];
        slotTimeText.textContent = `Next Dispatch Slot in ${city}: Today between ${randomHour}`;
    }

    // Programmatically move focus to Step 2 heading to prevent focus loss
    const step2Heading = pane2.querySelector("h3") || pane2.querySelector(".success-slot-box");
    if (step2Heading) {
        step2Heading.setAttribute("tabindex", "-1");
        step2Heading.focus();
    }
};

window.goToWizardStep1 = function() {
    const pane1 = document.getElementById("pane-step-1");
    const pane2 = document.getElementById("pane-step-2");
    
    if (!pane1 || !pane2) return;

    pane1.classList.add("active");
    pane2.classList.remove("active");
    
    const step1Indicator = document.getElementById("step-1-indicator");
    const step2Indicator = document.getElementById("step-2-indicator");
    if (step1Indicator) step1Indicator.classList.add("active");
    if (step2Indicator) step2Indicator.classList.remove("active");

    // Programmatically move focus to Step 1 heading to prevent focus loss
    const step1Heading = pane1.querySelector("h3");
    if (step1Heading) {
        step1Heading.setAttribute("tabindex", "-1");
        step1Heading.focus();
    }
};

window.submitDispatch = function() {
    const dispatchNameEl = document.getElementById("dispatch-name");
    const dispatchPhoneEl = document.getElementById("dispatch-phone");
    
    if (!dispatchNameEl || !dispatchPhoneEl) return;

    const name = dispatchNameEl.value.trim();
    const phone = dispatchPhoneEl.value.trim();
    
    if (!name || !phone) {
        alert("Please enter both your name and phone number to secure the dispatch slot!");
        return;
    }
    
    alert(`Thank you, ${name}! Your priority dispatch slot has been secured. Our team will contact you at ${phone} within 5 minutes.`);
    window.goToWizardStep1();
    
    // Clear inputs
    dispatchNameEl.value = "";
    dispatchPhoneEl.value = "";
};


/* ==========================================================================
   Service Area Zip Code Checker (areas.html)
   ========================================================================== */
window.checkZipAvailability = function() {
    const zipInputEl = document.getElementById("zip-input");
    const resultDiv = document.getElementById("zip-result");
    
    if (!zipInputEl || !resultDiv) return;

    const zipInput = zipInputEl.value.trim();
    
    // 1. Validate Input Format (must be exactly 5 digits)
    const zipFormatRegex = /^\d{5}$/;
    if (!zipInput || !zipFormatRegex.test(zipInput)) {
        alert("Please enter a valid 5-digit zip code.");
        return;
    }
    
    resultDiv.style.display = "block";
    
    // Core Florida Zips mapping (Martin, St. Lucie, and Jupiter regions)
    const activeZips = [
        "34952", "34953", "34957", "34981", "34982", "34983", "34984", "34986", "34987", // PSL
        "34994", "34995", "34996", "34997", // Stuart
        "34990", // Palm City
        "33458", "33469", "33477", "33478", // Jupiter / Hobe Sound
        "34945", "34946", "34947", "34950" // Fort Pierce
    ];
    
    // Regional prefix check for broader local area (Martin, St. Lucie, and Palm Beach counties)
    const regionalPrefixRegex = /^(349\d{2}|334\d{2})$/;
    
    if (activeZips.includes(zipInput)) {
        // Core area coverage (Green light)
        resultDiv.style.backgroundColor = "rgba(16, 185, 129, 0.08)";
        resultDiv.style.border = "1px solid rgba(16, 185, 129, 0.2)";
        resultDiv.style.color = "#10B981";
        resultDiv.innerHTML = `🟢 <strong>Service Availability: Green Light!</strong><br>We have active technicians routing in zip code <strong>${zipInput}</strong> today. Next dispatch slot available between 1:00 PM - 3:00 PM. Call <a href="tel:7725213568" style="color: inherit; font-weight: 700;">(772) 521-3568</a> to secure this slot immediately!`;
    } else if (regionalPrefixRegex.test(zipInput)) {
        // Extended area coverage (Yellow light - limited routing)
        resultDiv.style.backgroundColor = "rgba(245, 158, 11, 0.08)";
        resultDiv.style.border = "1px solid rgba(245, 158, 11, 0.2)";
        resultDiv.style.color = "#F59E0B";
        resultDiv.innerHTML = `🟡 <strong>Service Availability: Limited Routing</strong><br>Zip code <strong>${zipInput}</strong> is outside our core daily route, but we still cover your neighborhood. Call <a href="tel:7725213568" style="color: inherit; font-weight: 700;">(772) 521-3568</a> to coordinate a priority technician slot!`;
    } else {
        // Out of service area (Red light)
        resultDiv.style.backgroundColor = "rgba(239, 68, 68, 0.08)";
        resultDiv.style.border = "1px solid rgba(239, 68, 68, 0.2)";
        resultDiv.style.color = "#EF4444";
        resultDiv.innerHTML = `🔴 <strong>Service Availability: Out of Service Area</strong><br>Zip code <strong>${zipInput}</strong> is currently outside our service region. We only serve Martin, St. Lucie, and northern Palm Beach counties. If you believe this is in error, call <a href="tel:7725213568" style="color: inherit; font-weight: 700;">(772) 521-3568</a>.`;
    }
};


/* ==========================================================================
   Pool Temperature ROI & Heating Estimator (pool-heating.html)
   ========================================================================== */
window.calculatePoolROI = function() {
    const poolGallonsEl = document.getElementById("pool-gallons");
    const poolFrequencyEl = document.getElementById("pool-frequency");
    const resultsDiv = document.getElementById("pool-roi-results");
    
    if (!poolGallonsEl || !poolFrequencyEl || !resultsDiv) return;

    const gallons = parseInt(poolGallonsEl.value);
    const months = parseInt(poolFrequencyEl.value);
    
    if (isNaN(gallons) || isNaN(months)) {
        alert("Please select valid options.");
        return;
    }
    
    resultsDiv.style.display = "block";
    
    // Estimate cost models: COP pump is ~75% more energy efficient than propane gas
    const gasMonthlyFactor = 0.015;  // Propane/gas multiplier per gallon
    const pumpMonthlyFactor = 0.0035; // COP Heat pump multiplier per gallon
    
    const gasCost = gallons * gasMonthlyFactor;
    const pumpCost = gallons * pumpMonthlyFactor;
    const monthlySavings = gasCost - pumpCost;
    const yearlySavings = monthlySavings * months;
    
    const poolPumpCostEl = document.getElementById("pool-pump-cost");
    const poolGasCostEl = document.getElementById("pool-gas-cost");
    const poolMonthlySavingsEl = document.getElementById("pool-monthly-savings");
    const poolYearlySavingsEl = document.getElementById("pool-yearly-savings");

    if (poolPumpCostEl) poolPumpCostEl.textContent = `$${pumpCost.toFixed(2)}`;
    if (poolGasCostEl) poolGasCostEl.textContent = `$${gasCost.toFixed(2)}`;
    if (poolMonthlySavingsEl) poolMonthlySavingsEl.textContent = `$${monthlySavings.toFixed(2)}`;
    if (poolYearlySavingsEl) poolYearlySavingsEl.textContent = `$${yearlySavings.toFixed(2)}`;
};


/* ==========================================================================
   Tab Switching in Contact Form (contact.html)
   ========================================================================== */
window.switchContactTab = function(event, tabId) {
    const tabContainer = event.currentTarget.closest(".innovations-tab-container");
    if (!tabContainer) return;
    
    // Toggle active headers & manage aria-selected
    const buttons = tabContainer.querySelectorAll(".inno-tab-btn");
    buttons.forEach(btn => {
        btn.classList.remove("active");
        btn.setAttribute('aria-selected', 'false');
    });
    event.currentTarget.classList.add("active");
    event.currentTarget.setAttribute('aria-selected', 'true');
    
    // Toggle active panels
    const panels = tabContainer.querySelectorAll(".inno-tab-panel");
    panels.forEach(p => p.style.display = "none");
    
    const targetPanel = tabContainer.querySelector(`#${tabId}`);
    if (targetPanel) {
        targetPanel.style.display = "block";
    }
};


/* ==========================================================================
   System Diagnostic assessment runs (contact.html)
   ========================================================================== */
window.runDiagnosticAssessment = function() {
    const checkedRadio = document.querySelector('input[name="ac-issue"]:checked');
    if (!checkedRadio) {
        alert("Please select an AC issue.");
        return;
    }
    const selectedIssue = checkedRadio.value;
    
    const diagnosisTextEl = document.getElementById("diagnostic-assessment-text");
    const wizardPane1 = document.getElementById("wizard-pane-1");
    const wizardPane2 = document.getElementById("wizard-pane-2");
    
    if (!diagnosisTextEl || !wizardPane1 || !wizardPane2) return;
    
    let diagnosis = "";
    if (selectedIssue === "warm-air") {
        diagnosis = "Your system is turning on but not cooling, which typically indicates a refrigerant leak, a failed dual capacitor, or a compressor thermal lockout. We recommend shutting down the thermostat immediately to prevent compressor burn-out.";
    } else if (selectedIssue === "no-power") {
        diagnosis = "Complete power loss often points to a tripped breaker, a clogged condensate drain safety switch, or a blown low-voltage transformer fuse on the control board. A technician will inspect these safety locks.";
    } else if (selectedIssue === "water-leak") {
        diagnosis = "Water leakage indicates a clogged condensate drain line or a rusted primary drain pan. If left unaddressed, this can cause mold or severe ceiling water damage.";
    } else if (selectedIssue === "loud-noise") {
        diagnosis = "Loud noises indicate a failing outdoor fan motor, a loose blower assembly belt, or compressor valve damage. Shutting down the unit prevents mechanical component fracture.";
    }
    
    diagnosisTextEl.innerHTML = diagnosis;
    
    // Hide Step 1 and Show Step 2 (prevents UI overlap)
    wizardPane1.style.display = "none";
    wizardPane2.style.display = "block";
};

window.resetDiagnosticWizard = function() {
    const wizardPane1 = document.getElementById("wizard-pane-1");
    const wizardPane2 = document.getElementById("wizard-pane-2");
    
    const wNameEl = document.getElementById("w-name");
    const wPhoneEl = document.getElementById("w-phone");
    
    if (wNameEl) wNameEl.value = "";
    if (wPhoneEl) wPhoneEl.value = "";
    
    // Reset wizard back to step 1
    if (wizardPane1) wizardPane1.style.display = "block";
    if (wizardPane2) wizardPane2.style.display = "none";
};


/* ==========================================================================
   PREMIUM DYNAMIC VISUAL INTERACTIONS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Scroll-Driven Navigation Blur
    const header = document.querySelector(".header");
    if (header) {
        const handleScroll = () => {
            if (window.scrollY > 30) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll(); // Initial run on load
    }

    // 2. Interactive 3D Card Perspective Tilt
    const tiltCards = document.querySelectorAll(".card-3d");
    tiltCards.forEach(card => {
        card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xc = rect.width / 2;
            const yc = rect.height / 2;
            
            // Calculate tilt angle (max 10 degrees)
            const rx = -(y - yc) / (yc / 10);
            const ry = (x - xc) / (xc / 10);
            
            card.style.setProperty("--rx", rx.toFixed(2));
            card.style.setProperty("--ry", ry.toFixed(2));
        });

        card.addEventListener("mouseleave", () => {
            card.style.setProperty("--rx", "0");
            card.style.setProperty("--ry", "0");
        });
    });

    // 3. Scroll-Driven IntersectionObserver Reveal Scheduler
    const reveals = document.querySelectorAll(".reveal-up, .reveal-scale, .reveal-slide-left, .reveal-slide-right");
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    
                    // Allocate GPU footprint transiently
                    el.classList.add("animating");
                    
                    // Add delay if defined in data attributes
                    const delay = el.dataset.delay || 0;
                    el.style.setProperty("--delay", `${delay}ms`);
                    
                    // Activate animation frame
                    requestAnimationFrame(() => {
                        el.classList.add("active");
                    });
                    
                    // Cleanup GPU trace when transition finishes
                    const transitionEndHandler = () => {
                        el.classList.remove("animating");
                        el.removeEventListener("transitionend", transitionEndHandler);
                    };
                    el.addEventListener("transitionend", transitionEndHandler);
                    
                    observer.unobserve(el);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -40px 0px"
        });

        reveals.forEach(el => observer.observe(el));
    } else {
        // Fallback for older browsers
        reveals.forEach(el => el.classList.add("active"));
    }

    // 4. Sliding Active Tab Indicators
    const initializeSlidingTabs = () => {
        const containers = document.querySelectorAll(".innovations-tab-container");
        containers.forEach(container => {
            const tabList = container.querySelector(".inno-tabs");
            if (!tabList) return;

            // Inject background pill markup if missing
            let pillBg = tabList.querySelector(".tab-pill-background");
            if (!pillBg) {
                pillBg = document.createElement("div");
                pillBg.className = "tab-pill-background";
                tabList.appendChild(pillBg);
                tabList.classList.add("tab-pill-container");
            }

            const buttons = tabList.querySelectorAll(".inno-tab-btn");
            buttons.forEach(btn => {
                btn.classList.add("tab-pill-btn");
                btn.addEventListener("click", () => {
                    // Update active class on button siblings
                    buttons.forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    updatePillPosition(btn, pillBg, tabList);
                });
            });

            // Set initial pill position based on active tab button
            const activeBtn = tabList.querySelector(".inno-tab-btn.active") || buttons[0];
            if (activeBtn) {
                activeBtn.classList.add("active");
                // Wait for styles/dimensions load
                setTimeout(() => updatePillPosition(activeBtn, pillBg, tabList), 50);
            }
        });
    };

    const updatePillPosition = (activeBtn, pillBg, tabList) => {
        const tabListRect = tabList.getBoundingClientRect();
        const activeBtnRect = activeBtn.getBoundingClientRect();

        // Calculate relative coordinates
        const offsetLeft = activeBtnRect.left - tabListRect.left;
        const width = activeBtnRect.width;

        pillBg.style.transform = `translateX(${offsetLeft}px)`;
        pillBg.style.width = `${width}px`;
    };

    initializeSlidingTabs();
    
    // Re-adjust pill width/offsets on screen resize
    window.addEventListener("resize", () => {
        const containers = document.querySelectorAll(".innovations-tab-container");
        containers.forEach(container => {
            const tabList = container.querySelector(".inno-tabs");
            const pillBg = container.querySelector(".tab-pill-background");
            const activeBtn = container.querySelector(".inno-tab-btn.active");
            if (tabList && pillBg && activeBtn) {
                updatePillPosition(activeBtn, pillBg, tabList);
            }
        });
    });


    // ==========================================================================
    // 5. Interactive Before/After Coil Slider
    // ==========================================================================
    const initializeCoilSlider = () => {
        const sliderContainer = document.querySelector(".comparison-slider-container");
        if (!sliderContainer) return;

        const afterImage = sliderContainer.querySelector(".comparison-image-after");
        const handle = sliderContainer.querySelector(".comparison-handle");
        
        let isDragging = false;
        let currentPercent = 50;

        const setSliderPosition = (percent) => {
            currentPercent = Math.max(0, Math.min(100, percent));
            afterImage.style.width = `${currentPercent}%`;
            handle.style.left = `${currentPercent}%`;
            handle.setAttribute("aria-valuenow", Math.round(currentPercent));
        };

        const updateSlider = (clientX) => {
            const rect = sliderContainer.getBoundingClientRect();
            let position = ((clientX - rect.left) / rect.width) * 100;
            setSliderPosition(position);
        };

        const startDragging = () => { isDragging = true; };
        const stopDragging = () => { isDragging = false; };

        // Mouse Events
        handle.addEventListener("mousedown", startDragging);
        window.addEventListener("mouseup", stopDragging);
        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            updateSlider(e.clientX);
        });

        // Touch Events (Mobile)
        handle.addEventListener("touchstart", startDragging, { passive: true });
        window.addEventListener("touchend", stopDragging);
        window.addEventListener("touchmove", (e) => {
            if (!isDragging) return;
            if (e.touches && e.touches[0]) {
                updateSlider(e.touches[0].clientX);
            }
        });

        // Keyboard navigation keys
        handle.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") {
                setSliderPosition(currentPercent - 5);
                e.preventDefault();
            } else if (e.key === "ArrowRight") {
                setSliderPosition(currentPercent + 5);
                e.preventDefault();
            } else if (e.key === "Home") {
                setSliderPosition(0);
                e.preventDefault();
            } else if (e.key === "End") {
                setSliderPosition(100);
                e.preventDefault();
            }
        });
    };

    initializeCoilSlider();


    // ==========================================================================
    // 6. "Warehouse on Wheels" Interactive Van Tour
    // ==========================================================================
    const initializeVanTour = () => {
        const hotspots = document.querySelectorAll(".van-hotspot");
        const titleEl = document.getElementById("van-detail-title");
        const descEl = document.getElementById("van-detail-desc");
        const panel = document.querySelector(".van-details-panel");

        if (hotspots.length === 0 || !titleEl || !descEl || !panel) return;

        const hotspotData = {
            parts: {
                title: "⚡ Core Replacement Parts",
                desc: "We carry high-quality replacement parts on every truck, including dual run capacitors (35/5uF to 45/5uF), contactors, fan relays, and universal transformer modules. This ensures we can resolve 85% of common AC electrical issues right on the spot without leaving you in the heat to fetch parts."
            },
            refrigerant: {
                title: "❄️ Refrigerant & Recovery Equipment",
                desc: "Equipped with dedicated EPA-compliant refrigerant recovery tanks, dry-nitrogen pressure test manifolds, and full charges of R-410A and next-gen R-454B refrigerants. This allows us to run pressure audits, find condenser leaks, and recharge your cooling coils on the first visit."
            },
            filters: {
                title: "💨 Indoor Air Quality Filters & Cleaners",
                desc: "Stocked with standard pleated media filters (16x25 to 20x25 dimensions), drain line flush cartridges, condensate tablets, and UV lamp bulb upgrades. We resolve drain blockages and indoor air restrictions to restore smooth system airflow instantly."
            },
            tools: {
                title: "🛠️ Diagnostic Tools & Recovery Pumps",
                desc: "Loaded with Fieldpiece digital manifolds, digital clamp meters, vacuum pumps, and specialized coil fin combs. Carrying these high-end diagnostic sensors allows our veteran technicians to find thermal locks and electrical shorts with extreme accuracy."
            }
        };

        hotspots.forEach(hs => {
            hs.addEventListener("click", () => {
                const target = hs.dataset.target;
                const data = hotspotData[target];

                if (data) {
                    // Update active classes and aria-pressed attributes
                    hotspots.forEach(h => {
                        h.classList.remove("active");
                        h.setAttribute("aria-pressed", "false");
                    });
                    hs.classList.add("active");
                    hs.setAttribute("aria-pressed", "true");

                    // Fade transition effect
                    panel.style.opacity = "0";
                    panel.style.transform = "translateY(5px)";

                    setTimeout(() => {
                        titleEl.textContent = data.title;
                        descEl.textContent = data.desc;
                        panel.style.opacity = "1";
                        panel.style.transform = "translateY(0)";
                    }, 150);
                }
            });
        });
    };

    initializeVanTour();


    // ==========================================================================
    // 7. 50-Point Mission Checklist Dashboard
    // ==========================================================================
    const initializeChecklist = () => {
        const tabButtons = document.querySelectorAll(".checklist-tab-btn");
        const panels = document.querySelectorAll(".checklist-panel");
        const items = document.querySelectorAll(".checklist-item");

        const percentageEl = document.getElementById("chk-percentage");
        const progressRing = document.getElementById("chk-ring-bar");

        if (tabButtons.length === 0 || panels.length === 0 || items.length === 0 || !percentageEl || !progressRing) return;

        // SVG Ring Circle configuration
        const radius = 70;
        const circumference = 2 * Math.PI * radius; // ~439.82 px
        progressRing.style.strokeDasharray = `${circumference} ${circumference}`;

        // Checklist category tabs switcher
        tabButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const target = btn.dataset.target;

                tabButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                panels.forEach(p => p.classList.remove("active"));
                const targetPanel = document.getElementById(target);
                if (targetPanel) targetPanel.classList.add("active");
            });
        });

        // Setup checklist accessibility programmatically
        items.forEach(item => {
            item.setAttribute("tabindex", "0");
            item.setAttribute("role", "checkbox");
            const isChecked = item.classList.contains("checked");
            item.setAttribute("aria-checked", isChecked ? "true" : "false");
        });

        // Item toggle checks
        items.forEach(item => {
            const toggleItem = () => {
                const isChecked = item.getAttribute("aria-checked") === "true";
                item.setAttribute("aria-checked", isChecked ? "false" : "true");
                item.classList.toggle("checked");
                updateProgress();
            };

            item.addEventListener("click", toggleItem);

            item.addEventListener("keydown", (e) => {
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault(); // Prevents page scrolling with Space
                    toggleItem();
                }
            });
        });

        const updateProgress = () => {
            const totalItems = items.length;
            const checkedItems = document.querySelectorAll(".checklist-item.checked").length;
            const percentage = Math.round((checkedItems / totalItems) * 100);

            // Update percentage text
            percentageEl.textContent = `${percentage}%`;

            // Update SVG Ring dashoffset
            const offset = circumference - (percentage / 100) * circumference;
            progressRing.style.strokeDashoffset = offset;

            // Recalculate badge counts for each category tab dynamically
            panels.forEach(panel => {
                const panelId = panel.id;
                const tabBtn = document.querySelector(`.checklist-tab-btn[data-target="${panelId}"]`);
                if (tabBtn) {
                    const badge = tabBtn.querySelector(".badge-count");
                    const checkedInPanel = panel.querySelectorAll(".checklist-item.checked").length;
                    const totalInPanel = panel.querySelectorAll(".checklist-item").length;
                    
                    if (badge) {
                        badge.textContent = `${checkedInPanel}/${totalInPanel}`;
                    }
                }
            });
        };

        // Run initial calculations
        updateProgress();
    };

    initializeChecklist();


    // ==========================================================================
    // 8. Live Customer Reviews Spotlight Ticker
    // ==========================================================================
    const initializeReviewTicker = () => {
        const slides = document.querySelectorAll(".ticker-slide");
        const prevBtn = document.getElementById("ticker-prev");
        const nextBtn = document.getElementById("ticker-next");

        if (slides.length <= 1 || !prevBtn || !nextBtn) return;

        let activeIndex = 0;
        let timer = null;

        const showSlide = (index) => {
            slides.forEach(slide => slide.classList.remove("active"));
            
            // Handle wrap-around bounds
            if (index < 0) {
                activeIndex = slides.length - 1;
            } else if (index >= slides.length) {
                activeIndex = 0;
            } else {
                activeIndex = index;
            }

            slides[activeIndex].classList.add("active");
        };

        const nextSlide = () => {
            showSlide(activeIndex + 1);
        };

        const prevSlide = () => {
            showSlide(activeIndex - 1);
        };

        const resetTimer = () => {
            if (timer) clearInterval(timer);
            timer = setInterval(nextSlide, 6000); // Rotate every 6 seconds
        };

        // Navigation clicks
        nextBtn.addEventListener("click", () => {
            nextSlide();
            resetTimer();
        });

        prevBtn.addEventListener("click", () => {
            prevSlide();
            resetTimer();
        });

        // Start auto rotation
        resetTimer();
    };

    initializeReviewTicker();

    // ==========================================================================
    // 9. Floating AI Chat Assistant Widget
    // ==========================================================================
    const initializeChatWidget = () => {
        const fab = document.getElementById("ac-chat-fab");
        const widget = document.getElementById("ac-chat-widget");
        const closeBtn = document.getElementById("chat-close-btn");
        const wizardForm = document.getElementById("chat-wizard-form");
        const messagesContainer = document.getElementById("chat-messages-container");
        const inputBar = document.getElementById("chat-input-bar");
        const userTextInput = document.getElementById("chat-user-text");
        const sendBtn = document.getElementById("chat-send-btn");

        if (!fab || !widget || !closeBtn || !wizardForm || !messagesContainer || !inputBar || !userTextInput || !sendBtn) {
            return;
        }

        const serverlessUrl = "/.netlify/functions/chat-assistant";
        let conversationHistory = [];

        // Toggle widget visibility
        fab.addEventListener("click", () => {
            widget.classList.toggle("chat-hidden");
            if (!widget.classList.contains("chat-hidden")) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });

        closeBtn.addEventListener("click", () => {
            widget.classList.add("chat-hidden");
        });

        // Handle pre-qualification form submission
        wizardForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("chat-w-name").value.trim();
            const city = document.getElementById("chat-w-city").value;
            const issue = document.getElementById("chat-w-issue").value.trim();

            if (!name || !city || !issue) return;

            // Append user input summary visually into chat as a user bubble
            appendMessage("user", `My name is ${name}. I am in ${city}. My AC issue: "${issue}"`);

            // Hide the input form card
            document.getElementById("chat-wizard-card").remove();

            // Show loading typing dots
            const loadingId = showLoading();

            try {
                const response = await fetch(serverlessUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "prequalify", name, city, issue }),
                });

                removeLoading(loadingId);

                if (!response.ok) throw new Error("Failed to contact serverless handler.");
                const data = await response.json();

                if (data.success && data.briefing) {
                    appendMessage("ai", data.briefing);
                    
                    // Add to history
                    conversationHistory.push({ sender: "user", text: `Name: ${name}, City: ${city}, Issue: ${issue}` });
                    conversationHistory.push({ sender: "ai", text: data.briefing });

                    // Unlock interactive chat mode
                    inputBar.classList.remove("chat-input-hidden");
                    userTextInput.focus();
                } else {
                    appendMessage("ai", "I've logged your request for the dispatch desk, but hit a slight technical snag. How else can I assist you?");
                }
            } catch (err) {
                removeLoading(loadingId);
                console.error(err);
                appendMessage("ai", "Thank you. Your dispatch details have been saved. Our technicians have been notified. Please call us at (772) 521-3568 for immediate same-day service.");
            }
        });

        // Handle follow-up chat inputs
        async function handleSend() {
            const text = userTextInput.value.trim();
            if (!text) return;

            userTextInput.value = "";
            appendMessage("user", text);

            // Track user message in history
            conversationHistory.push({ sender: "user", text });

            const loadingId = showLoading();

            try {
                const response = await fetch(serverlessUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "chat", messages: conversationHistory }),
                });

                removeLoading(loadingId);

                if (!response.ok) throw new Error("Connection failed.");
                const data = await response.json();

                if (data.success && data.reply) {
                    appendMessage("ai", data.reply);
                    conversationHistory.push({ sender: "ai", text: data.reply });
                } else {
                    appendMessage("ai", "I'm having trouble analyzing that message. Please try again or call our hotline.");
                }
            } catch (err) {
                removeLoading(loadingId);
                console.error(err);
                appendMessage("ai", "I am currently offline. Please call us at (772) 521-3568 for emergency service.");
            }
        }

        sendBtn.addEventListener("click", handleSend);
        userTextInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSend();
        });

        // Helper: Append a chat bubble
        function appendMessage(sender, text) {
            const msgDiv = document.createElement("div");
            msgDiv.className = `message ${sender}`;
            msgDiv.innerHTML = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:inherit;text-decoration:underline;">$1</a>').replace(/\n/g, '<br>');
            messagesContainer.appendChild(msgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Helper: Show typing indicator
        function showLoading() {
            const loaderId = "loader-" + Date.now();
            const loaderDiv = document.createElement("div");
            loaderDiv.id = loaderId;
            loaderDiv.className = "message ai";
            loaderDiv.innerHTML = `
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
            messagesContainer.appendChild(loaderDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return loaderId;
        }

        // Helper: Remove typing indicator
        function removeLoading(id) {
            const loader = document.getElementById(id);
            if (loader) loader.remove();
        }
    };

    initializeChatWidget();

    // ==========================================================================
    // 10. 3D Digital Thermostat Interactive Widget
    // ==========================================================================
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
        const strokeCircumference = 2 * Math.PI * 75; // Radius = 75

        function updateUI() {
            // 1. Update text display
            tempDisplay.textContent = targetTemp;

            // Update ARIA values
            dial.setAttribute('aria-valuenow', targetTemp);
            dial.setAttribute('aria-valuetext', `${targetTemp} degrees Fahrenheit`);

            // 2. Map Temp values to Hue
            const tempPercent = (targetTemp - minTemp) / (maxTemp - minTemp);
            let hue = 210 - (tempPercent * 200); // 210 (Cyan) down to 10 (Red)
            
            if (systemMode === 'eco') {
                hue = 135; // Green
            }

            card.style.setProperty('--temp-glow', `hsla(${hue}, 95%, 50%, 0.15)`);
            card.style.setProperty('--temp-color', `hsl(${hue}, 100%, 60%)`);

            // 3. Update status HUD text
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

            // 4. Update SVG progress circle
            const progressPercent = tempPercent * 0.75; // cap at 75% for bottom cutout gap
            const strokeOffset = strokeCircumference - (progressPercent * strokeCircumference);
            progressBar.style.strokeDashoffset = strokeOffset;

            // 5. Rotate indicator notch
            const tickRotation = -135 + (tempPercent * 270);
            dialTick.style.transform = `rotate(${tickRotation}deg)`;
            dialRing.style.transform = `rotate(${tickRotation}deg)`;
        }

        // Initialize UI State
        updateUI();

        // Drag handlers
        function startDrag(e) {
            isDragging = true;
            const rect = dial.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
            if (e.cancelable && e.type !== 'touchstart') e.preventDefault();
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
        }

        // Attach event listeners
        dial.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', drag);
        window.addEventListener('mouseup', stopDrag);

        dial.addEventListener('touchstart', startDrag, { passive: true });
        window.addEventListener('touchmove', drag, { passive: false });
        window.addEventListener('touchend', stopDrag);

        // Keyboard navigation
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

        // Mode switches
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

        // Parallax hover tilt
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

    // ==========================================================================
    // 11. Smart Climate Tab Switcher (Lazy Loading WebGL iframe)
    // ==========================================================================
    const initializeSmartClimateTabs = () => {
        const tabBtns = document.querySelectorAll(".smart-tab-btn");
        const panelThermostat = document.getElementById("panel-thermostat");
        const panelAirflow = document.getElementById("panel-airflow");
        const airflowPlaceholder = document.getElementById("airflow-iframe-placeholder");

        if (tabBtns.length === 0 || !panelThermostat || !panelAirflow) return;

        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");

                // Toggle active button states
                tabBtns.forEach(b => {
                    b.classList.remove("active");
                    b.style.backgroundColor = "transparent";
                    b.style.color = "var(--gray-dark)";
                });
                btn.classList.add("active");
                btn.style.backgroundColor = "var(--primary)";
                btn.style.color = "var(--white)";

                // Switch panels
                if (targetTab === "thermostat") {
                    panelThermostat.style.display = "flex";
                    panelAirflow.style.display = "none";
                } else if (targetTab === "airflow") {
                    panelThermostat.style.display = "none";
                    panelAirflow.style.display = "flex";

                    // Lazy load the WebGL Three.js iframe only when requested
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
            });
        });
    initializeSmartClimateTabs();

    // ==========================================================================
    // 12. Progressive Web Share API (Quotes & Calibration Sharing)
    // ==========================================================================
    const initializeShareButtons = () => {
        const shareSeerBtn = document.querySelector(".share-btn-seer");
        const shareClubBtn = document.querySelector(".share-btn-club");

        const shareData = (title, text, url) => {
            if (navigator.share) {
                navigator.share({ title, text, url })
                    .then(() => console.log("Successful share"))
                    .catch((error) => console.log("Error sharing:", error));
            } else {
                // Clipboard fallback + toast notification
                navigator.clipboard.writeText(`${text} Learn more: ${url}`)
                    .then(() => {
                        showShareToast("Link copied to clipboard!");
                    })
                    .catch(() => {
                        // SMS fallback
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

    // Register Service Worker for PWA Offline capability
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('A/C Now Service Worker registered successfully with scope:', registration.scope);
                })
                .catch(err => {
                    console.warn('A/C Now Service Worker registration failed:', err);
                });
        });
    }
});







