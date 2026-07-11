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
        function closeNav() {
            mobileNav.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.textContent = '☰';
        }

        function openNav() {
            mobileNav.classList.add('active');
            hamburger.setAttribute('aria-expanded', 'true');
            hamburger.textContent = '✕';
        }

        // Replace inline onclick with proper JS toggle so aria-expanded stays in sync
        hamburger.removeAttribute('onclick');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileNav.classList.contains('active') ? closeNav() : openNav();
        });

        // Close when any nav link is tapped (prevents drawer staying open on anchor links)
        // Optimized using event delegation on mobileNav
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

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                closeNav();
                hamburger.focus();
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
    
    // Set labels
    const valCurrentSeer = document.getElementById("val-current-seer");
    const valTargetSeer = document.getElementById("val-target-seer");
    const valMonthlyBill = document.getElementById("val-monthly-bill");

    if (valCurrentSeer) valCurrentSeer.textContent = `${currentSeer} SEER (${currentSeer <= 10 ? 'Over 10 Years Old' : 'Standard Older Unit'})`;
    if (valTargetSeer) valTargetSeer.textContent = `${targetSeer} SEER2 (Ultra High Efficiency)`;
    if (valMonthlyBill) valMonthlyBill.textContent = `$${monthlyBill}`;
    
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
});

