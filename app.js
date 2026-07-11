// Dashboard Logic for A/C Now Redesign & SEO Audit Showcase

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initDataAndAudits();
    initSimulator();
});

/* ==========================================================================
   WCAG 4.1.2 — Mobile Nav Toggle with aria-expanded management
   ========================================================================== */
window.toggleMobileNav = function(btn) {
    const nav = document.getElementById('primary-nav');
    if (!nav) return;
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!isExpanded));
    btn.setAttribute('aria-label', isExpanded ? 'Open navigation menu' : 'Close navigation menu');
    nav.classList.toggle('active');
};

// 1. Tab Switching
function initTabs() {
    const navButtons = document.querySelectorAll(".nav-btn");
    const panels = document.querySelectorAll(".tab-panel");
    const tabTitle = document.getElementById("tab-title");
    if (!tabTitle) return;
    const tabSubtitle = document.getElementById("tab-subtitle");

    const tabDetails = {
        "seo-audit": {
            title: "SEO Audit & Sitemap",
            subtitle: "Real-time analysis of metadata, alt tags, and structural crawler data."
        },
        "redesign-preview": {
            title: "Proposed Redesign Simulator",
            subtitle: "Interactive visual preview of A/C Now LLC premium design."
        },
        "seo-blueprint": {
            title: "SEO Blueprint & Schema Markup",
            subtitle: "Optimized metadata suggestions and JSON-LD structured data."
        }
    };

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");

            // Toggle active classes on nav
            navButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Toggle active panels
            panels.forEach(p => p.classList.remove("active"));
            const targetPanel = document.getElementById(targetTab);
            if (targetPanel) {
                targetPanel.classList.add("active");
            }

            // Update header text
            if (tabDetails[targetTab]) {
                tabTitle.textContent = tabDetails[targetTab].title;
                tabSubtitle.textContent = tabDetails[targetTab].subtitle;
            }
        });
    });
}

// 2. Data and SEO Audits Injection
function initDataAndAudits() {
    const sitemapTable = document.querySelector("#sitemap-table");
    if (!sitemapTable) return; // Exit silently when not on the showcase dashboard page

    if (typeof SCRAPED_SITE_DATA === "undefined") {
        return;
    }

    const pages = SCRAPED_SITE_DATA;
    const urls = Object.keys(pages);
    
    // Calculate Stats
    let totalPages = urls.length;
    let uniqueImages = {};
    let missingMetaCount = 0;
    let missingH1Count = 0;
    let duplicateTitleCount = 0;
    
    // Track titles to find duplicates
    const titleCounts = {};
    urls.forEach(url => {
        const title = pages[url].title || "";
        if (title) {
            titleCounts[title] = (titleCounts[title] || 0) + 1;
        }
    });

    // Populate arrays for tables
    const sitemapTableBody = document.querySelector("#sitemap-table tbody");
    sitemapTableBody.innerHTML = "";

    urls.forEach(url => {
        const page = pages[url];
        const title = page.title || "None";
        const metaDesc = page.meta_description || "";
        
        // Find H1s
        const h1s = page.headings.filter(h => h.tag === "H1");
        const h1Text = h1s.length > 0 ? h1s[0].text : "";

        // Track image assets
        page.images_local.forEach(img => {
            if (img.original_src) {
                uniqueImages[img.original_src] = img;
            }
        });

        // Diagnostics
        let isDuplicateTitle = titleCounts[title] > 1;
        let isMissingMeta = !metaDesc;
        let isMissingH1 = !h1Text;

        if (isMissingMeta) missingMetaCount++;
        if (isMissingH1) missingH1Count++;
        
        // Health assessment
        let healthLabel = "Healthy";
        let healthClass = "healthy";
        let issuesList = [];

        if (isDuplicateTitle) {
            healthLabel = "Warning";
            healthClass = "warning-status";
            issuesList.push("Duplicate Title Tag");
            duplicateTitleCount++;
        }
        if (isMissingMeta) {
            healthLabel = "Meta Error";
            healthClass = "error-status";
            issuesList.push("Missing Description");
        }
        if (isMissingH1) {
            healthLabel = "Heading Error";
            healthClass = "error-status";
            issuesList.push("Missing H1 Tag");
        }

        // URL display formatting
        let urlDisplay = url.replace("https://acnowllc.com", "");
        if (urlDisplay === "" || urlDisplay === "/") {
            urlDisplay = "/ [Home]";
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <span class="table-url" title="${url}">${urlDisplay}</span>
            </td>
            <td>
                <span class="table-title ${isDuplicateTitle ? 'text-warn' : ''}" title="${title}">
                    ${isDuplicateTitle ? '⚠️ ' : ''}${title}
                </span>
            </td>
            <td>
                <span class="table-h1 ${isMissingH1 ? 'text-danger' : ''}">
                    ${h1Text ? h1Text : '<span style="color: var(--danger);">❌ Missing H1</span>'}
                </span>
            </td>
            <td>
                <span style="font-size: 11px; color: ${isMissingMeta ? 'var(--danger)' : 'var(--text-main)'};">
                    ${metaDesc ? metaDesc.substring(0, 75) + '...' : '❌ Missing Description'}
                </span>
            </td>
            <td>
                <span class="status-badge ${healthClass}" title="${issuesList.join(', ')}">${healthLabel}</span>
            </td>
        `;
        sitemapTableBody.appendChild(tr);
    });

    // Populate Image Table
    const imagesTableBody = document.querySelector("#images-table tbody");
    imagesTableBody.innerHTML = "";
    
    const uniqueImagesList = Object.values(uniqueImages);
    let missingAltCount = 0;

    uniqueImagesList.forEach(img => {
        const alt = img.alt || "";
        const isMissingAlt = !alt || alt.toLowerCase() === "css background image";
        if (isMissingAlt) missingAltCount++;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <img src="${img.local_path}" alt="${alt}" class="table-img-thumb" onerror="this.src='https://placehold.co/48?text=Image';">
            </td>
            <td>
                <code style="font-size: 11px;">${img.local_path.split('/').pop()}</code>
            </td>
            <td>
                <a href="${img.original_src}" target="_blank" class="table-url" style="max-width: 200px;">${img.original_src}</a>
            </td>
            <td>
                ${isMissingAlt ? '<span class="status-badge error-status">❌ Missing Alt Tag</span>' : `<span style="font-size: 12px; font-weight: 500;">"${alt}"</span>`}
            </td>
            <td>
                ${isMissingAlt ? '<span style="color: var(--danger); font-weight: 600;">Lowers Ranking</span>' : '<span style="color: var(--success); font-weight: 600;">Optimized</span>'}
            </td>
        `;
        imagesTableBody.appendChild(tr);
    });

    // Total Issues calculation
    let totalIssues = duplicateTitleCount + missingMetaCount + missingH1Count + missingAltCount;

    // Set statistics values in sidebar & header
    document.getElementById("stat-total-pages").textContent = totalPages;
    document.getElementById("stat-total-images").textContent = uniqueImagesList.length;
    document.getElementById("stat-total-issues").textContent = totalIssues;

    // Set card overview values
    document.getElementById("audit-missing-meta-count").textContent = missingMetaCount;
    document.getElementById("audit-missing-h1-count").textContent = missingH1Count;
    document.getElementById("audit-duplicate-count").textContent = duplicateTitleCount;
    
    // If stats are all clean, update indicator colors
    if (missingMetaCount === 0) {
        document.getElementById("audit-missing-meta-count").className = "stat-number success";
    }
    if (missingH1Count === 0) {
        document.getElementById("audit-missing-h1-count").className = "stat-number success";
    }
}

// 3. Device Simulator Logic
function initSimulator() {
    const deviceButtons = document.querySelectorAll(".device-btn");
    if (deviceButtons.length === 0) return;
    const frameContainer = document.getElementById("preview-frame-container");
    const previewIframe = document.getElementById("preview-iframe");
    const urlInput = document.querySelector(".url-input");

    deviceButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const width = btn.getAttribute("data-width");

            // Toggle active buttons
            deviceButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Update simulated device width
            frameContainer.style.width = width;
        });
    });

    // Dynamic address bar URL mapping on iframe navigation
    if (previewIframe && urlInput) {
        previewIframe.addEventListener("load", () => {
            try {
                const path = previewIframe.contentWindow.location.pathname;
                const filename = path.split("/").pop();
                
                let targetUrl = "https://acnowllc.com/";
                if (filename && filename !== "redesign.html" && filename !== "") {
                    if (filename === "about.html") targetUrl += "about/";
                    else if (filename === "services.html") targetUrl += "hvac-services/";
                    else if (filename === "pool-heating.html") targetUrl += "pool-heating/";
                    else if (filename === "reviews.html") targetUrl += "reviews/";
                    else if (filename === "areas.html") targetUrl += "areas-we-serve/";
                    else if (filename === "contact.html") targetUrl += "contact-us/";
                    else targetUrl += filename.replace(".html", "/");
                }
                urlInput.value = targetUrl;
            } catch (e) {
                // Ignore CORS checks on local file systems
            }
        });
    }
}

// 4. Interactive Innovations Tab Logic
// WCAG 4.1.2: manage aria-selected on role="tab" buttons
window.switchInnoTab = function(event, tabId) {
    const tabContainer = event.target.closest(".innovations-tab-container");
    
    // Toggle Tab Headers + aria-selected
    const buttons = tabContainer.querySelectorAll(".inno-tab-btn");
    buttons.forEach(btn => {
        btn.classList.remove("active");
        btn.setAttribute('aria-selected', 'false');
    });
    event.target.classList.add("active");
    event.target.setAttribute('aria-selected', 'true');
    
    // Toggle Tab Panels
    const panels = tabContainer.querySelectorAll(".inno-tab-panel");
    panels.forEach(p => p.classList.remove("active"));
    
    const targetPanel = tabContainer.querySelector(`#${tabId}`);
    if (targetPanel) {
        targetPanel.classList.add("active");
        targetPanel.focus(); // Move keyboard focus to the activated panel
    }
};

// 5. SEER2 Energy Savings Calculator Logic
window.updateSeerSavings = function() {
    const currentSeer = parseFloat(document.getElementById("current-seer").value);
    const targetSeer = parseFloat(document.getElementById("target-seer").value);
    const monthlyBill = parseFloat(document.getElementById("monthly-bill").value);
    
    // Set labels
    document.getElementById("val-current-seer").textContent = `${currentSeer} SEER (${currentSeer <= 10 ? 'Over 10 Years Old' : 'Standard Older Unit'})`;
    document.getElementById("val-target-seer").textContent = `${targetSeer} SEER2 (Ultra High Efficiency)`;
    document.getElementById("val-monthly-bill").textContent = `$${monthlyBill}`;
    
    // Calculation: savings % = 1 - (current_seer / target_seer)
    const savingsRatio = 1 - (currentSeer / targetSeer);
    const monthlySavings = monthlyBill * savingsRatio;
    const yearlySavings = monthlySavings * 12;
    
    // Display results
    document.getElementById("seer-monthly-savings").textContent = `$${monthlySavings.toFixed(2)}`;
    document.getElementById("seer-yearly-savings").textContent = `$${yearlySavings.toFixed(2)}`;
    
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

// 6. Service Club Membership ROI Builder Logic
window.updateClubROI = function() {
    let yearlySavings = 0;
    
    const hasCleanings = document.getElementById("opt-cleanings").checked;
    const hasDiagnostic = document.getElementById("opt-repair-cost").checked;
    const hasRepairs = document.getElementById("opt-repairs-value").checked;
    
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

// Initialize calculations on DOM content load
document.addEventListener("DOMContentLoaded", () => {
    const optCleanings = document.getElementById("opt-cleanings");
    if (optCleanings && typeof window.updateClubROI === "function") {
        window.updateClubROI();
    }
});

// 7. Emergency Dispatch Wizard Logic
window.goToWizardStep2 = function() {
    const pane1 = document.getElementById("pane-step-1");
    const pane2 = document.getElementById("pane-step-2");
    
    pane1.classList.remove("active");
    pane2.classList.add("active");
    
    document.getElementById("step-1-indicator").classList.remove("active");
    document.getElementById("step-2-indicator").classList.add("active");
    
    // Dynamic slot scheduling based on city
    const city = document.getElementById("dispatch-city").value;
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
    
    pane1.classList.add("active");
    pane2.classList.remove("active");
    
    document.getElementById("step-1-indicator").classList.add("active");
    document.getElementById("step-2-indicator").classList.remove("active");
};

window.submitDispatch = function() {
    const name = document.getElementById("dispatch-name").value;
    const phone = document.getElementById("dispatch-phone").value;
    
    if (!name || !phone) {
        alert("Please enter both your name and phone number to secure the dispatch slot!");
        return;
    }
    
    alert(`Thank you, ${name}! Your priority dispatch slot has been secured. Our team will contact you at ${phone} within 5 minutes.`);
    window.goToWizardStep1();
    
    // Clear inputs
    document.getElementById("dispatch-name").value = "";
    document.getElementById("dispatch-phone").value = "";
};



// ==========================================================================
// Ancillary Pages Interactive Widgets Logic
// ==========================================================================

// 1. Service Area Zip Code Checker (areas.html)
window.checkZipAvailability = function() {
    const zipInput = document.getElementById("zip-input").value.trim();
    const resultDiv = document.getElementById("zip-result");
    
    if (!zipInput) {
        alert("Please enter a valid zip code.");
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
    
    const zipRegex = /^(349\d{2}|334\d{2})$/;
    if (activeZips.includes(zipInput) || zipRegex.test(zipInput)) {
        resultDiv.style.backgroundColor = "rgba(16, 185, 129, 0.08)";
        resultDiv.style.border = "1px solid rgba(16, 185, 129, 0.2)";
        resultDiv.style.color = "#10B981";
        resultDiv.innerHTML = `🟢 <strong>Service Availability: Green Light!</strong><br>We have active technicians routing in zip code <strong>${zipInput}</strong> today. Next dispatch slot available between 1:00 PM - 3:00 PM. Call <a href="tel:7725213568" style="color: inherit; font-weight: 700;">(772) 521-3568</a> to secure this slot immediately!`;
    } else {
        resultDiv.style.backgroundColor = "rgba(245, 158, 11, 0.08)";
        resultDiv.style.border = "1px solid rgba(245, 158, 11, 0.2)";
        resultDiv.style.color = "#F59E0B";
        resultDiv.innerHTML = `🟡 <strong>Service Availability: Limited Routing</strong><br>Zip code <strong>${zipInput}</strong> is outside our core daily route, but we still cover your neighborhood. Call <a href="tel:7725213568" style="color: inherit; font-weight: 700;">(772) 521-3568</a> to coordinate a priority technician slot!`;
    }
};

// 2. Pool Temperature ROI & Heating Estimator (pool-heating.html)
window.calculatePoolROI = function() {
    const gallons = parseInt(document.getElementById("pool-gallons").value);
    const months = parseInt(document.getElementById("pool-frequency").value);
    
    const resultsDiv = document.getElementById("pool-roi-results");
    resultsDiv.style.display = "block";
    
    // Estimate cost models: COP pump is ~75% more energy efficient than propane gas
    const gasMonthlyFactor = 0.015;  // Propane/gas multiplier per gallon
    const pumpMonthlyFactor = 0.0035; // COP Heat pump multiplier per gallon
    
    const gasCost = gallons * gasMonthlyFactor;
    const pumpCost = gallons * pumpMonthlyFactor;
    const monthlySavings = gasCost - pumpCost;
    const yearlySavings = monthlySavings * months;
    
    document.getElementById("pool-pump-cost").textContent = `$${pumpCost.toFixed(2)}`;
    document.getElementById("pool-gas-cost").textContent = `$${gasCost.toFixed(2)}`;
    document.getElementById("pool-monthly-savings").textContent = `$${monthlySavings.toFixed(2)}`;
    document.getElementById("pool-yearly-savings").textContent = `$${yearlySavings.toFixed(2)}`;
};

// 3. Tab Switching in Contact Form (contact.html)
window.switchContactTab = function(event, tabId) {
    const tabContainer = event.target.closest(".innovations-tab-container");
    
    // Toggle active headers
    const buttons = tabContainer.querySelectorAll(".inno-tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");
    
    // Toggle active panels
    const panels = tabContainer.querySelectorAll(".inno-tab-panel");
    panels.forEach(p => p.style.display = "none");
    
    const targetPanel = tabContainer.querySelector(`#${tabId}`);
    if (targetPanel) {
        targetPanel.style.display = "block";
    }
};

// 4. System Diagnostic assessment runs (contact.html)
window.runDiagnosticAssessment = function() {
    const selectedIssue = document.querySelector('input[name="ac-issue"]:checked').value;
    const assessmentText = document.getElementById("diagnostic-assessment-text");
    
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
    
    document.getElementById("diagnostic-assessment-text").innerHTML = diagnosis;
    document.getElementById("wizard-pane-2").style.display = "block";
};


/* ==========================================================================
   Premium Scroll Effects (Header Shrinking & Reveal Animations)
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

});


/* ==========================================================================
   FIX 4: Mobile Nav — Close on tap-outside, close on link-click, aria-expanded
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const mobileNav   = document.querySelector('.nav');
    const hamburger   = document.querySelector('.mobile-nav-toggle');

    if (!mobileNav || !hamburger) return; // Not present on this page — bail cleanly

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
    mobileNav.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeNav);
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
});
