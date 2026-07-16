window.__appJsRan = true;
// Dashboard Logic for A/C Now Redesign & SEO Audit Showcase

// Premium toast notification system loaded sitewide
window.showToast = window.showToast || function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.maxWidth = '350px';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.padding = '12px 18px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '13.5px';
    toast.style.fontWeight = '600';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    
    if (type === 'success') {
        toast.style.background = '#0B7A53';
        toast.style.borderLeft = '4px solid #10B981';
    } else if (type === 'warning' || type === 'error') {
        toast.style.background = '#C22A36';
        toast.style.borderLeft = '4px solid #EF4444';
    } else {
        toast.style.background = '#1E293B';
        toast.style.borderLeft = '4px solid #3B82F6';
    }
    
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
};

// Helper: Show visual submit feedback
function setSubmitState(button, isLoading, text = "Submitting...") {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = text;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

// PWA IndexedDB Queue Helper (Version 3)
function queueLeadOffline(payload) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('acnow-offline-db', 3);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('leads')) db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('specs')) db.createObjectStore('specs', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('dead_letter')) db.createObjectStore('dead_letter', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('diagnostics')) db.createObjectStore('diagnostics', { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction(['leads', 'diagnostics'], 'readwrite');
            const leadsStore = transaction.objectStore('leads');
            const diagStore = transaction.objectStore('diagnostics');

            leadsStore.add({
                payload: payload,
                retries: 0,
                timestamp: Date.now()
            });

            diagStore.add({
                level: 'info',
                message: '[PWA Client] Form submitted while offline. Lead saved to queue.',
                details: JSON.stringify(payload),
                timestamp: Date.now()
            });

            transaction.oncomplete = () => {
                console.log("[PWA Client] Lead stored in IndexedDB successfully.");
                if ('serviceWorker' in navigator && 'SyncManager' in window) {
                    navigator.serviceWorker.ready.then(reg => {
                        return reg.sync.register('sync-leads');
                    }).then(() => {
                        console.log("[PWA Client] Background Sync ('sync-leads') registered.");
                        resolve();
                    }).catch(err => {
                        console.error("[PWA Client] Background Sync registration failed:", err);
                        resolve();
                    });
                } else {
                    resolve();
                }
            };
            transaction.onerror = () => reject(transaction.error);
        };
        request.onerror = event => reject(request.error);
    });
}

// Client-Side Logging Helper
function logClientDiagnostic(level, message, details = null) {
    const request = indexedDB.open('acnow-offline-db', 3);
    request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('leads')) db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('specs')) db.createObjectStore('specs', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('dead_letter')) db.createObjectStore('dead_letter', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('diagnostics')) db.createObjectStore('diagnostics', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('diagnostics')) return;
        const tx = db.transaction('diagnostics', 'readwrite');
        const store = tx.objectStore('diagnostics');
        store.add({
            level,
            message: `[PWA Client] ${message}`,
            details: details ? (details.message || String(details)) : null,
            timestamp: Date.now()
        });
        
        // Clean up: Cap the diagnostics store to the 100 most recent records
        const countReq = store.count();
        countReq.onsuccess = () => {
            if (countReq.result > 100) {
                const cursorReq = store.openCursor();
                let deletedCount = 0;
                const toDelete = countReq.result - 100;
                cursorReq.onsuccess = (ev) => {
                    const cursor = ev.target.result;
                    if (cursor && deletedCount < toDelete) {
                        cursor.delete();
                        deletedCount++;
                        cursor.continue();
                    }
                };
            }
        };
    };
}

// Reusable Sync Form Submission Handler
async function submitFormWithSync(event, formElement, payload, successCallback) {
    event.preventDefault();
    const submitBtn = formElement.querySelector("button[type='submit']");
    setSubmitState(submitBtn, true);

    // Immediate offline check
    if (!navigator.onLine) {
        console.warn("[PWA Client] Network offline. Redirecting submission to IndexedDB.");
        await queueLeadOffline(payload);
        if (typeof window.showToast === "function") { window.showToast("You are currently offline. Your service request has been saved and will submit automatically as soon as your connection returns.", "info"); } else { alert("You are currently offline. Your service request has been saved and will submit automatically as soon as your connection returns."); }
        formElement.reset();
        setSubmitState(submitBtn, false);
        if (successCallback) successCallback();
        return;
    }

    try {
        const res = await fetch("/.netlify/functions/submit-lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        let result;
        try {
            result = await res.json();
        } catch (e) {
            throw new Error("Invalid server response format.");
        }

        if (res.status === 200 && result.success) {
            formElement.reset();
            if (successCallback) successCallback();
        } else {
            // Display validation error or server failure without clearing the form!
            if (typeof window.showToast === "function") { window.showToast(`Validation Error: ${result.error || result.message || "Please check your inputs and try again."}`, "error"); } else { alert(`Validation Error: ${result.error || result.message || "Please check your inputs and try again."}`); }
        }
    } catch (err) {
        console.error("[PWA Client] Submission failed. Checking background sync capabilities:", err);
        await queueLeadOffline(payload);
        if (typeof window.showToast === "function") { window.showToast("Network connection issue. Your request has been queued offline and will automatically submit once connectivity returns.", "warning"); } else { alert("Network connection issue. Your request has been queued offline and will automatically submit once connectivity returns."); }
        formElement.reset();
        if (successCallback) successCallback();
    } finally {
        setSubmitState(submitBtn, false);
    }
}

// Push Notification Subscription Flow
async function configurePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[PWA Client] Push messaging is not supported in this browser.');
        return;
    }
    try {
        const permission = await Notification.requestPermission();
        console.log('[PWA Client] Push Notification permission:', permission);
        if (permission === 'granted') {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                const VAPID_PUBLIC_KEY = 'BI7Yn7d6d54s321dFGHJKLuio9876543210qwertyuiopasdfghjklzxcvbnm1234567890qwertyuiop'; // Mock key
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
                console.log('[PWA Client] Push subscription created:', subscription);
                await fetch('/.netlify/functions/save-push-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription)
                }).catch(() => console.log('[PWA Client] Failed to register push subscription on mock endpoint.'));
            }
        }
    } catch (err) {
        console.error('[PWA Client] Push configuration failed:', err);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/* ==========================================================================
   Premium Scroll Effects (Header Shrinking & Reveal Animations) and
   Mobile Nav — Close on tap-outside, close on link-click, aria-expanded
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 0. Client-side Geotargeting Fallback via Cookies
    function applyClientGeotargeting() {
        const match = document.cookie.match(/(?:^|; )nf_city=([^;]*)/);
        if (!match) return;
        const market = decodeURIComponent(match[1]);
        console.log(`[Geotargeting] Detected nf_city cookie: ${market}`);

        // Skip document title overrides for internal technician/members portals
        const skipTitleOverride = window.location.pathname.endsWith("team-portal.html") || 
                                  window.location.pathname.endsWith("members.html");

        const MARKET_DATA = {
            "Stuart": {
                headlineRes: "Keep Your Family Cool in Stuart",
                headlineCom: "Manage Your Stuart Complex",
                serving: "Serving Palm City, Stuart & Jensen Beach.",
                phone: "(772) 521-3568",
                phoneHref: "tel:7725213568"
            },
            "Palm City": {
                headlineRes: "Keep Your Family Cool in Palm City",
                headlineCom: "Manage Your Palm City Commercial Properties",
                serving: "Serving Palm City, Stuart & Hobe Sound.",
                phone: "(772) 521-3568",
                phoneHref: "tel:7725213568"
            },
            "Jupiter": {
                headlineRes: "Jupiter's Premier AC Repair",
                headlineCom: "Commercial HVAC in Jupiter & Tequesta",
                serving: "Serving Jupiter, Tequesta & Hobe Sound.",
                phone: "(772) 521-3568",
                phoneHref: "tel:7725213568"
            },
            "Port St. Lucie": {
                headlineRes: "PSL's Certified HVAC Experts",
                headlineCom: "Rooftop Commercial Units in PSL",
                serving: "Serving Port St. Lucie, Fort Pierce & Lakewood Park.",
                phone: "(772) 521-3568",
                phoneHref: "tel:7725213568"
            },
            "Default": {
                headlineRes: "Keep Your Family Cool",
                headlineCom: "Manage Your Complex",
                serving: "Serving Stuart, Palm City, Port St. Lucie & the Treasure Coast.",
                phone: "(772) 521-3568",
                phoneHref: "tel:7725213568"
            }
        };

        const copy = MARKET_DATA[market];
        if (!copy) return;

        // Update title and hidden H1
        if (!skipTitleOverride) {
            document.title = `A/C Repair & HVAC Services in ${market === "Default" ? "Florida" : market + ", FL"} | A/C Now LLC`;
        }
        const hiddenH1 = document.querySelector('h1.visually-hidden');
        if (hiddenH1) {
            hiddenH1.textContent = `A/C Now LLC — AC Repair & HVAC Service in ${market === "Default" ? "Florida" : market + ", FL"} | Same-Day | 24/7 Emergency`;
        }

        // Update index.html split hero headlines
        const resHeadline = document.getElementById('res-side-headline');
        if (resHeadline) {
            resHeadline.textContent = copy.headlineRes;
        }
        const comHeadline = document.getElementById('com-side-headline');
        if (comHeadline) {
            comHeadline.textContent = copy.headlineCom;
        }

        // Update index.html serving text
        const servingText = document.getElementById('serving-areas-text');
        if (servingText) {
            servingText.textContent = copy.serving;
        }

        // Replace phone numbers and hrefs dynamically for non-default markets
        if (copy.phone !== "(772) 521-3568") {
            const anchors = document.querySelectorAll('a[href*="7725213568"]');
            anchors.forEach(a => {
                a.href = copy.phoneHref;
                if (a.textContent.includes("(772) 521-3568")) {
                    a.textContent = a.textContent.replace("(772) 521-3568", copy.phone);
                }
            });

            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walk.nextNode()) {
                if (node.nodeValue.includes("(772) 521-3568")) {
                    node.nodeValue = node.nodeValue.replace("(772) 521-3568", copy.phone);
                }
            }
        }

        // Pre-populate city input fields on contact forms if geotargeting is active and not default
        const cityInputs = document.querySelectorAll('input[name="city"], input[id="city"]');
        cityInputs.forEach(input => {
            if (market && market !== "Default" && !input.value) {
                input.value = market;
            }
        });
    }
    applyClientGeotargeting();

    // Premium Member logged-in state dynamic header flare
    function applyLoggedInPremiumFlare() {
        const isMember = localStorage.getItem("acnow_member") === "true";
        if (!isMember) return;
        
        // Find header logo container to append badge
        const logoLink = document.querySelector(".header .logo");
        if (logoLink && !document.querySelector(".logged-in-badge")) {
            const badge = document.createElement("span");
            badge.className = "logged-in-badge";
            badge.innerHTML = '<span class="pulse-dot"></span>★ Member Active';
            logoLink.appendChild(badge);
        }
        
        // Update top-bar with a premium greeting and priority support notice
        const topBarMsg = document.querySelector(".top-bar-item.highlight");
        if (topBarMsg) {
            topBarMsg.innerHTML = '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Welcome Back, Member | Priority Hotline Active';
        }
        
        // Ingress a luxury gold drop-shadow to active primary buttons for logged-in users
        const primaryBtns = document.querySelectorAll(".btn-primary, .sticky-cta-btn");
        primaryBtns.forEach(btn => {
            btn.style.boxShadow = "0 0 15px rgba(255, 199, 44, 0.4)";
            btn.style.border = "1px solid var(--gold)";
        });
    }
    applyLoggedInPremiumFlare();
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
            document.body.style.overflow = '';
        }

        function openNav() {
            mobileNav.classList.add('active');
            hamburger.setAttribute('aria-expanded', 'true');
            hamburger.textContent = '✕';
            document.body.style.overflow = 'hidden';
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
            if (!mobileNav.classList.contains('active')) return;
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
            if (e.key === 'Tab' && mobileNav.classList.contains('active')) {
                if (e.shiftKey) {
                    if (lastFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (firstFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            }
        });
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
        btn.setAttribute('tabindex', '0');
    });
    event.currentTarget.classList.add("active");
    event.currentTarget.setAttribute('aria-selected', 'true');
    event.currentTarget.setAttribute('tabindex', '0');
    
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
        if (typeof window.showToast === "function") { window.showToast("Please enter a valid 5-digit zip code.", "error"); } else { alert("Please enter a valid 5-digit zip code."); }
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
        resultDiv.style.backgroundColor = "rgba(11, 122, 83, 0.08)";
        resultDiv.style.border = "1px solid rgba(11, 122, 83, 0.2)";
        resultDiv.style.color = "#0B7A53";
        resultDiv.innerHTML = `🟢 <strong>Service Availability: Green Light!</strong><br>We have active technicians routing in zip code <strong>${zipInput}</strong> today. Next dispatch slot available between 1:00 PM - 3:00 PM. Call <a href="tel:7725213568" style="color: inherit; font-weight: 700;">(772) 521-3568</a> to secure this slot immediately!`;
    } else if (regionalPrefixRegex.test(zipInput)) {
        // Extended area coverage (Yellow light - limited routing)
        resultDiv.style.backgroundColor = "rgba(148, 82, 3, 0.08)";
        resultDiv.style.border = "1px solid rgba(148, 82, 3, 0.2)";
        resultDiv.style.color = "#945203";
        resultDiv.innerHTML = `🟡 <strong>Service Availability: Limited Routing</strong><br>Zip code <strong>${zipInput}</strong> is outside our core daily route, but we still cover your neighborhood. Call <a href="tel:7725213568" style="color: inherit; font-weight: 700;">(772) 521-3568</a> to coordinate a priority technician slot!`;
    } else {
        // Out of service area (Red light)
        resultDiv.style.backgroundColor = "rgba(194, 42, 54, 0.08)";
        resultDiv.style.border = "1px solid rgba(194, 42, 54, 0.2)";
        resultDiv.style.color = "#C22A36";
        resultDiv.innerHTML = `🔴 <strong>Service Availability: Out of Service Area</strong><br>Zip code <strong>${zipInput}</strong> is currently outside our service region. We only serve Martin, St. Lucie, and northern Palm Beach counties. If you believe this is in error, call <a href="tel:7725213568" style="color: inherit; font-weight: 700;">(772) 521-3568</a>.`;
    }

    // Auto-update corrosion slider if present on areas.html
    const zipDistanceMap = {
        "34996": 0.1, 
        "34994": 1.2, "34995": 1.2, "34957": 1.2,
        "34997": 2.2, "33455": 2.2,
        "34952": 3.0, "34982": 3.0, "34981": 3.0,
        "34990": 4.5,
        "33469": 1.5, "33458": 2.5, "33477": 0.5, "33478": 4.0,
        "34953": 6.5, "34983": 6.5, "34984": 6.5,
        "34986": 9.5, "34987": 9.5
    };
    const zipDist = zipDistanceMap[zipInput];
    if (zipDist !== undefined) {
        const slider = document.getElementById("corrosion-distance") || document.getElementById("distance-slider");
        if (slider) {
            slider.value = zipDist;
            if (typeof window.onSliderChange === "function") {
                window.onSliderChange(zipDist);
            }
        }
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

    const gallons = parseInt(poolGallonsEl.value) || 0;
    const months = parseInt(poolFrequencyEl.value) || 0;
    
    // Safety check for NaN, zero, or negative inputs
    if (gallons <= 0 || months <= 0) {
        if (typeof window.showToast === "function") { window.showToast("Please select valid options.", "error"); } else { alert("Please select valid options."); }
        return;
    }
    
    resultsDiv.style.display = "block";
    
    // -------------------------------------------------------------
    // Florida Winter Pool Heating Physics Model
    // -------------------------------------------------------------
    // Parameters:
    // - T_water: target pool temperature (82°F is standard comfort)
    // - T_air: average Florida winter ambient temperature (68°F average Nov-Mar)
    // - deltaT: temperature difference to maintain (14°F)
    // - heatLossCoeff: 6.0 BTU/hr/sq ft/°F (uncovered evaporative & convective loss)
    // - usageFactor: 0.45 (accounts for covers at night and/or intermittent heating)
    // - elecRate: $0.15/kWh (standard Florida residential electricity rate)
    // - propaneRate: $3.50/gallon (standard Florida residential propane rate)
    // - propaneBTUPerGallon: 91,500 BTUs
    // - gasHeaterEfficiency: 0.82 (average standard gas heater efficiency)
    
    const T_water = 82;
    const T_air = 68;
    const deltaT = T_water - T_air;
    const heatLossCoeff = 6.0;
    const usageFactor = 0.45;
    
    const elecRate = 0.15;
    const propaneRate = 3.50;
    const propaneBTUPerGallon = 91500;
    const gasHeaterEfficiency = 0.82;

    // Estimate pool surface area (sq ft) assuming average depth of 4.5 ft
    const surfaceArea = gallons / (4.5 * 7.48); // ~gallons / 33.66
    
    // Calculate Monthly BTUs required to maintain target temperature
    const dailyBTURequired = surfaceArea * heatLossCoeff * deltaT * 24 * usageFactor;
    const monthlyBTURequired = dailyBTURequired * 30;

    // Classify equipment based on pool volume to retrieve nominal capacity and COP
    let classLabel = "";
    let nominalBTU = 0;
    let nominalCOP = 0.0;

    if (gallons <= 12000) {
        classLabel = "Small Pool / Spa (Class 1)";
        nominalBTU = 75000;
        nominalCOP = 5.8;
    } else if (gallons <= 20000) {
        classLabel = "Medium Pool (Class 2)";
        nominalBTU = 110000;
        nominalCOP = 6.2;
    } else if (gallons <= 28000) {
        classLabel = "Large Pool (Class 3)";
        nominalBTU = 120000;
        nominalCOP = 6.4;
    } else {
        classLabel = "Estate / Commercial (Class 4)";
        nominalBTU = 140000;
        nominalCOP = 6.5;
    }

    // Adjust COP and BTU heating capacity for colder ambient air temperature (68°F vs 80°F standard rating)
    // Formulas derived from standard AHRI 1160 performance curves:
    const actualCOP = Math.max(1.0, nominalCOP - 0.073 * (80 - T_air));
    const actualBTU = nominalBTU * Math.max(0.1, 1 - 0.0117 * (80 - T_air));

    // Calculate energy inputs and monthly costs
    const pumpKWh = monthlyBTURequired / (actualCOP * 3412);
    const pumpCost = pumpKWh * elecRate;
    
    const gasGallons = monthlyBTURequired / (propaneBTUPerGallon * gasHeaterEfficiency);
    const gasCost = gasGallons * propaneRate;
    
    const monthlySavings = Math.max(0, gasCost - pumpCost);
    const yearlySavings = monthlySavings * months;
    
    // Update DOM elements
    const poolPumpCostEl = document.getElementById("pool-pump-cost");
    const poolGasCostEl = document.getElementById("pool-gas-cost");
    const poolMonthlySavingsEl = document.getElementById("pool-monthly-savings");
    const poolYearlySavingsEl = document.getElementById("pool-yearly-savings");

    if (poolPumpCostEl) poolPumpCostEl.textContent = `$${pumpCost.toFixed(2)}`;
    if (poolGasCostEl) poolGasCostEl.textContent = `$${gasCost.toFixed(2)}`;
    if (poolMonthlySavingsEl) poolMonthlySavingsEl.textContent = `$${monthlySavings.toFixed(2)}`;
    if (poolYearlySavingsEl) poolYearlySavingsEl.textContent = `$${yearlySavings.toFixed(2)}`;

    // Dynamically inject/update detailed physical parameter breakdown
    let breakdownEl = document.getElementById("pool-roi-breakdown");
    if (!breakdownEl) {
        breakdownEl = document.createElement("div");
        breakdownEl.id = "pool-roi-breakdown";
        breakdownEl.style.marginTop = "20px";
        breakdownEl.style.padding = "12px";
        breakdownEl.style.borderTop = "1px solid rgba(255,255,255,0.08)";
        breakdownEl.style.fontSize = "13px";
        breakdownEl.style.color = "#94A3B8";
        breakdownEl.style.textAlign = "center";
        breakdownEl.style.lineHeight = "1.6";
        resultsDiv.appendChild(breakdownEl);
    }
    
    breakdownEl.innerHTML = `
        <span style="color: var(--white); font-weight: 600;">System Recommendation & Climate Profile</span><br>
        Recommended Unit: <strong>${classLabel}</strong> (Nominal ${nominalBTU.toLocaleString()} BTU)<br>
        Est. Operating COP: <strong style="color: #60A5FA;">${actualCOP.toFixed(2)}</strong> (vs. 0.82 Gas Heater efficiency)<br>
        Effective Heating Output: <strong>${Math.round(actualBTU).toLocaleString()} BTU/hr</strong> (at ${T_air}°F Air)<br>
        <span style="font-size: 11px; color: #64748B; display: block; margin-top: 4px;">*Estimates assume maintaining ${T_water}°F pool temp during Florida winter (average air temp ${T_air}°F) with standard cover usage.</span>
    `;
};


/* ==========================================================================
   Tab Switching in Contact Form (contact.html)
   ========================================================================== */
window.switchContactTab = function(event, tabId) {
    const tabContainer = event.currentTarget.closest(".contact-form-panel") || event.currentTarget.closest(".innovations-tab-container");
    if (!tabContainer) return;
    
    // Toggle active headers & manage aria-selected
    const buttons = tabContainer.querySelectorAll(".inno-tab-btn");
    buttons.forEach(btn => {
        btn.classList.remove("active");
        btn.setAttribute('aria-selected', 'false');
        btn.setAttribute('tabindex', '0');
    });
    event.currentTarget.classList.add("active");
    event.currentTarget.setAttribute('aria-selected', 'true');
    event.currentTarget.setAttribute('tabindex', '0');
    
    // Toggle active panels
    const panels = tabContainer.querySelectorAll(".inno-tab-panel");
    panels.forEach(p => {
        p.classList.remove("active");
        p.style.display = "none";
    });
    
    const targetPanel = tabContainer.querySelector(`#${tabId}`);
    if (targetPanel) {
        targetPanel.classList.add("active");
        targetPanel.style.display = "block";
        targetPanel.focus();
    }
};


/* ==========================================================================
   System Diagnostic assessment runs (contact.html)
   ========================================================================== */
window.runDiagnosticAssessment = function() {
    const checkedRadio = document.querySelector('input[name="ac-issue"]:checked');
    if (!checkedRadio) {
        if (typeof window.showToast === "function") { window.showToast("Please select an AC issue.", "error"); } else { alert("Please select an AC issue."); }
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

const throttle = (func, limit = 100) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

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
        window.addEventListener("scroll", throttle(handleScroll, 80), { passive: true });
        handleScroll(); // Initial run on load
    }

    // 2. Interactive 3D Card Perspective Tilt
    const tiltCards = document.querySelectorAll(".card-3d");
    tiltCards.forEach(card => {
        let cardRect = null;
        
        card.addEventListener("mouseenter", () => {
            cardRect = card.getBoundingClientRect();
        });

        card.addEventListener("mousemove", e => {
            if (!cardRect) cardRect = card.getBoundingClientRect();
            const x = e.clientX - cardRect.left;
            const y = e.clientY - cardRect.top;
            const xc = cardRect.width / 2;
            const yc = cardRect.height / 2;
            
            // Calculate tilt angle (max 10 degrees)
            const rx = -(y - yc) / (yc / 10);
            const ry = (x - xc) / (xc / 10);
            
            card.style.setProperty("--rx", rx.toFixed(2));
            card.style.setProperty("--ry", ry.toFixed(2));
        });

        card.addEventListener("mouseleave", () => {
            cardRect = null;
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
                    // Update active class and accessibility on siblings
                    buttons.forEach(b => {
                        b.classList.remove("active");
                        b.setAttribute('aria-selected', 'false');
                        b.setAttribute('tabindex', '0');
                    });
                    btn.classList.add("active");
                    btn.setAttribute('aria-selected', 'true');
                    btn.setAttribute('tabindex', '0');
                    updatePillPosition(btn, pillBg, tabList);
                });
            });

            // Set initial pill position based on active tab button
            const activeBtn = tabList.querySelector(".inno-tab-btn.active") || buttons[0];
            if (activeBtn) {
                activeBtn.classList.add("active");
                activeBtn.setAttribute('aria-selected', 'true');
                activeBtn.setAttribute('tabindex', '0');
                // Ensure other buttons are active initially
                buttons.forEach(b => {
                    if (b !== activeBtn) {
                        b.setAttribute('aria-selected', 'false');
                        b.setAttribute('tabindex', '0');
                    }
                });
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


    // [Note: Interactive Coil Slider, Van Tour, and 50-Point Checklist were moved to home-widgets.js to reduce compilation overhead on subpages]


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

        // Toggle widget visibility with secret 3-second hold detection
        let holdTimer = null;
        let isHolding = false;
        let holdComplete = false;
        const holdDuration = 3000;

        const startHold = (e) => {
            if (e.button && e.button !== 0) return;
            isHolding = true;
            holdComplete = false;
            fab.classList.remove("shake");
            fab.classList.add("fab-holding");

            holdTimer = setTimeout(() => {
                if (isHolding) {
                    holdComplete = true;
                    fab.classList.remove("fab-holding");
                    fab.classList.add("shake");
                    if (navigator.vibrate) {
                        navigator.vibrate([100, 50, 100]);
                    }
                    if (window.ComfortAudio && typeof window.ComfortAudio.playTick === "function") {
                        window.ComfortAudio.playTick();
                    }
                }
            }, holdDuration);
        };

        const endHold = (e) => {
            if (!isHolding) return;
            isHolding = false;
            clearTimeout(holdTimer);
            fab.classList.remove("fab-holding");
            
            if (holdComplete) {
                // If they released after the 3-second hold completed, prevent the click
                fab.classList.remove("shake");
                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }
                
                // Set dev variables in both localStorage and sessionStorage
                localStorage.setItem('acnow_dev_mode', 'true');
                localStorage.setItem('acnow_phase', '2');
                sessionStorage.setItem('acnow_dev_mode', 'true');
                sessionStorage.setItem('acnow_phase', '2');

                if (typeof window.showToast === "function") {
                    window.showToast("Technician ID detected. Redirecting to Staff Portal...", "success");
                }
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
                    window.location.href = prefix + 'pages/team-portal.html';
                }, 800);
            } else {
                fab.classList.remove("shake");
            }
        };

        fab.addEventListener("mousedown", startHold);
        fab.addEventListener("touchstart", startHold, { passive: true });
        
        window.addEventListener("mouseup", endHold);
        window.addEventListener("touchend", endHold);
        fab.addEventListener("mouseleave", endHold);

        fab.addEventListener("click", (e) => {
            if (holdComplete) {
                e.preventDefault();
                e.stopPropagation();
                holdComplete = false; // Reset state
                return;
            }
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
            const phone = document.getElementById("chat-w-phone").value.trim();
            const email = document.getElementById("chat-w-email").value.trim();

            if (!name || !city || !issue || !phone || !email) return;

            const combinedIssue = `${issue} [Client Contact - Phone: ${phone}, Email: ${email}]`;

            // Append user input summary visually into chat as a user bubble
            appendMessage("user", `My name is ${name}. I am in ${city}. Phone: ${phone}. Email: ${email}. Issue: "${issue}"`);

            // Hide the input form card
            document.getElementById("chat-wizard-card").remove();

            // Show loading typing dots
            const loadingId = showLoading();

            try {
                const response = await fetch(serverlessUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "prequalify", name, city, issue: combinedIssue, phone, email }),
                });

                removeLoading(loadingId);

                if (!response.ok) throw new Error("Failed to contact serverless handler.");
                const data = await response.json();

                if (data.success && data.briefing) {
                    appendMessage("ai", data.briefing);
                    
                    // Add to history
                    conversationHistory.push({ sender: "user", text: `Name: ${name}, City: ${city}, Phone: ${phone}, Email: ${email}, Issue: ${issue}` });
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
                appendMessage("ai", "We encountered a transmission error sending your details to the dispatch system. Please call us directly at (772) 521-3568 so our team can book your appointment immediately!");
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



    // Asynchronous Lead Capture Integrations (Connecting to Serverless Functions)
    const serverlessLeadUrl = "/.netlify/functions/submit-lead";



    // 1. Homepage General Contact Form Handler
    const hpContactForm = document.getElementById("hp-general-contact-form");
    if (hpContactForm) {
        hpContactForm.addEventListener("submit", (e) => {
            const nameVal = document.getElementById("name").value.trim();
            const nameParts = nameVal.split(" ");
            const fname = nameParts[0] || "";
            const lname = nameParts.slice(1).join(" ") || "";

            const payload = {
                fname,
                lname,
                tel: document.getElementById("phone").value.trim(),
                email: document.getElementById("email").value.trim(),
                city: document.getElementById("city").value.trim(),
                message: `[Service Requested: ${document.getElementById("service").value}] ${document.getElementById("message").value.trim()}`,
                honeypot: document.getElementById("honeypot").value
            };

            submitFormWithSync(e, hpContactForm, payload, () => {
                if (typeof window.showToast === "function") { window.showToast("Estimate request submitted successfully! Our team will contact you shortly.", "success"); } else { alert(`Estimate request submitted successfully! Our team will contact you shortly.`); }
                configurePushNotifications(); // Ask for notification permission after a high-value action
            });
        });
    }

    // 2. Contact Page General Form Handler
    const contactGeneralForm = document.getElementById("contact-general-form");
    if (contactGeneralForm) {
        contactGeneralForm.addEventListener("submit", (e) => {
            const nameVal = document.getElementById("fullname_contact").value.trim();
            const nameParts = nameVal.split(" ");
            const fname = nameParts[0] || "";
            const lname = nameParts.slice(1).join(" ") || "";

            const slotField = contactGeneralForm.querySelector("input[name='reserved_appointment_slot']");
            const slotVal = slotField ? slotField.value : "None";
            const userMsg = document.getElementById("message").value.trim();
            const messageText = slotVal !== "None" && slotVal !== ""
                ? `[Reserved Slot] ${slotVal} | [Message] ${userMsg}`
                : userMsg;

            const payload = {
                fname,
                lname,
                tel: document.getElementById("tel").value.trim(),
                email: document.getElementById("email").value.trim(),
                city: document.getElementById("city").value.trim(),
                message: messageText,
                honeypot: document.getElementById("honeypot_1").value
            };

            submitFormWithSync(e, contactGeneralForm, payload, () => {
                if (typeof window.showToast === "function") { window.showToast("Your service request has been transmitted. Technicians have been notified.", "success"); } else { alert("Your service request has been transmitted. Technicians have been notified."); }
                configurePushNotifications();
            });
        });
    }

    // 2b. Custom inline validation for city field on contact pages
    const cityInput = document.getElementById("city");
    const cityError = document.getElementById("city-error");
    if (cityInput) {
        cityInput.addEventListener("invalid", (e) => {
            e.preventDefault(); // Suppress default browser tooltip
            cityInput.style.borderColor = "#C22A36";
            if (cityError) {
                cityError.style.display = "block";
            }
        });
        cityInput.addEventListener("input", () => {
            if (cityInput.value.trim() !== "") {
                cityInput.style.borderColor = "";
                if (cityError) {
                    cityError.style.display = "none";
                }
            }
        });
    }

    // 3. Contact Page Troubleshooter Wizard Handler
    const contactWizardForm = document.getElementById("contact-wizard-form");
    if (contactWizardForm) {
        contactWizardForm.addEventListener("submit", (e) => {
            const checkedIssue = document.querySelector('input[name="ac-issue"]:checked');
            const issueVal = checkedIssue ? checkedIssue.value : "Unspecified";

            const payload = {
                "w-name": document.getElementById("w-name").value.trim(),
                "w-phone": document.getElementById("w-phone").value.trim(),
                "ac-issue": issueVal,
                honeypot: document.getElementById("honeypot_2").value
            };

            submitFormWithSync(e, contactWizardForm, payload, () => {
                if (typeof window.showToast === "function") { window.showToast("Priority dispatch secured! A technician will contact you shortly.", "success"); } else { alert("Priority dispatch secured! A technician will contact you shortly."); }
                if (typeof window.resetDiagnosticWizard === "function") {
                    window.resetDiagnosticWizard();
                }
                configurePushNotifications();
            });
        });
    }

    // 4. Commercial Consultation Form Handler
    const commercialForm = document.getElementById("commercial-contact-form");
    if (commercialForm) {
        commercialForm.addEventListener("submit", (e) => {
            const nameVal = document.getElementById("fullname_service").value.trim();
            const nameParts = nameVal.split(" ");
            const fname = nameParts[0] || "";
            const lname = nameParts.slice(1).join(" ") || "";

            const payload = {
                fname,
                lname,
                tel: document.getElementById("phone_service").value.trim(),
                email: document.getElementById("email_service").value.trim(),
                city: "Commercial Lead Target",
                message: `[Company: ${document.getElementById("company_service").value.trim() || "None"}] [Commercial Bid Request] ${document.getElementById("message_service").value.trim()}`,
                honeypot: document.getElementById("honeypot_service").value
            };

            submitFormWithSync(e, commercialForm, payload, () => {
                if (typeof window.showToast === "function") { window.showToast("Estimate request submitted successfully! Our team will contact you as soon as possible.", "success"); } else { alert("Estimate request submitted successfully! Our team will contact you as soon as possible."); }
                configurePushNotifications();
            });
        });
    }

    // Corrosion Predictor Form Binding
    const corrosionForm = document.getElementById("corrosion-lead-form");
    if (corrosionForm) {
        corrosionForm.addEventListener("submit", (e) => {
            const rawName = document.getElementById("lead-name").value.trim();
            const nameParts = rawName.split(" ");
            const fname = nameParts[0] || "";
            const lname = nameParts.slice(1).join(" ") || "";
            
            const payload = {
                fname,
                lname,
                tel: document.getElementById("lead-phone").value.trim(),
                email: "info@acnowllc.com", // Fallback email to satisfy contact requirement
                city: document.getElementById("lead-address").value.trim(),
                message: `[Corrosion Prediction Lead] [Distance to Coast: ${document.getElementById("form-distance").value}] [System Age: ${document.getElementById("lead-age").value}]`,
                honeypot: ""
            };

            submitFormWithSync(e, corrosionForm, payload, () => {
                if (typeof window.showToast === "function") { window.showToast("Corrosion protection audit requested successfully! Our team will contact you shortly.", "success"); } else { alert("Corrosion protection audit requested successfully! Our team will contact you shortly."); }
                configurePushNotifications();
            });
        });
    }

    // Register Service Worker with Unified Fallback Sync & Install Banner
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                console.log('Service Worker disabled on localhost to prevent local caching.');
                return;
            }
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('A/C Now Service Worker registered successfully with scope:', registration.scope);
                })
                .catch(err => {
                    console.warn('A/C Now Service Worker registration failed:', err);
                    logClientDiagnostic('error', 'Service worker registration failed', err);
                });
        });

        // Listen for background sync success messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && (event.data.type === 'LEADS_SYNC_COMPLETE' || event.data.type === 'SYNC_COMPLETE')) {
                console.log(`[PWA Client] Queue item synced:`, event.data);
                const name = event.data.payload && event.data.payload.fname ? ` ${event.data.payload.fname}` : '';
                
                // Construct dynamic client-side notification toast
                const alertDiv = document.createElement('div');
                alertDiv.style.cssText = "position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #10B981; color: white; padding: 15px 30px; border-radius: 8px; font-weight: bold; z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.2); pointer-events: none;";
                alertDiv.innerHTML = `✅ Offline Request${name} submitted successfully!`;
                document.body.appendChild(alertDiv);
                
                setTimeout(() => {
                    alertDiv.style.transition = "opacity 0.5s ease-out";
                    alertDiv.style.opacity = "0";
                    setTimeout(() => alertDiv.remove(), 500);
                }, 5000);
            }
        });

        // Client-side manual fallback sync for browsers without SyncManager (e.g. iOS Safari)
        if (!('SyncManager' in window)) {
            window.addEventListener('online', () => {
                console.log('[PWA Client] Network re-established. Triggering manual fallback sync...');
                triggerManualSync();
            });
            window.addEventListener('load', () => {
                if (navigator.onLine) triggerManualSync();
            });
        }
    }

    async function triggerManualSync() {
        const request = indexedDB.open('acnow-offline-db', 3);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('leads')) db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('specs')) db.createObjectStore('specs', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('dead_letter')) db.createObjectStore('dead_letter', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('diagnostics')) db.createObjectStore('diagnostics', { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = async (e) => {
            const db = e.target.result;
            await syncStoreManual(db, 'leads', '/.netlify/functions/submit-lead', false);
            await syncStoreManual(db, 'logs', '/.netlify/functions/submit-log', true);
            await syncStoreManual(db, 'specs', '/.netlify/functions/submit-specs', true);
        };
    }

    async function syncStoreManual(db, storeName, endpoint, authRequired = false) {
        if (!db.objectStoreNames.contains(storeName)) return;
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        
        req.onsuccess = async () => {
            const items = req.result;
            if (!items || items.length === 0) return;

            console.log(`[PWA Client] Fallback manual sync: Found ${items.length} items in ${storeName}`);
            for (const item of items) {
                const headers = { 'Content-Type': 'application/json' };
                if (authRequired) headers['Authorization'] = 'Bearer ' + (item.token || '');

                try {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(item.payload)
                    });

                    let success = res.ok;
                    if (res.ok && storeName === 'leads') {
                        try {
                            const result = await res.json();
                            success = result.success;
                        } catch (err) {}
                    }

                    if (success) {
                        const delTx = db.transaction(storeName, 'readwrite');
                        delTx.objectStore(storeName).delete(item.id);
                        logClientDiagnostic('info', `Fallback manual sync succeeded for ${storeName} #${item.id}`);
                        
                        if (storeName === 'leads') {
                            const name = item.payload && item.payload.fname ? ` ${item.payload.fname}` : '';
                            if (typeof window.showToast === "function") { window.showToast(`Offline Request ${name} transmitted successfully!`, "success"); } else { alert(`Offline Request${name} transmitted successfully!`); }
                        } else {
                            if (navigator.serviceWorker) {
                                navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {
                                    data: {
                                        type: `${storeName.toUpperCase()}_SYNC_COMPLETE`,
                                        payload: item.payload
                                    }
                                }));
                            }
                        }
                    } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
                        // Move to dead_letter
                        const delTx = db.transaction([storeName, 'dead_letter'], 'readwrite');
                        delTx.objectStore(storeName).delete(item.id);
                        delTx.objectStore('dead_letter').add({
                            originalStore: storeName,
                            item,
                            error: `Manual Sync HTTP ${res.status}`,
                            timestamp: Date.now()
                        });
                        logClientDiagnostic('error', `Fallback manual sync rejected with status ${res.status} for ${storeName} #${item.id}`);
                    }
                } catch (err) {
                    console.warn(`[PWA Client] Fallback sync fetch failed:`, err);
                }
            }
        };
    }

    // Custom Install Cue Prompts with Frequency Capping & iOS Support
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Cooldown frequency capping: Don't show if dismissed within 7 days
        const dismissedTime = localStorage.getItem('pwa-install-dismissed');
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (!dismissedTime || (Date.now() - dismissedTime > oneWeek)) {
            console.log("[PWA Client] beforeinstallprompt event captured. Showing custom install prompt.");
            showInstallPromotion();
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA Client] App installed successfully.');
        logClientDiagnostic('info', 'PWA installed successfully on client device.');
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.remove();
    });

    // Check iOS and prompt addition to home screen if running Safari outside standalone mode
    function isIosSafari() {
        const ua = window.navigator.userAgent;
        const isIphone = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
        const isSafari = !!ua.match(/WebKit/i) && !ua.match(/CriOS/i);
        const isStandalone = ('standalone' in window.navigator) && window.navigator.standalone;
        return isIphone && isSafari && !isStandalone;
    }

    function showInstallPromotion() {
        if (document.getElementById('pwa-install-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        
        banner.style.cssText = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; background: #FFFFFF; color: #0A182F; padding: 15px 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 0 1px #0B63E5; display: flex; align-items: center; justify-content: space-between; gap: 15px; width: calc(100% - 40px); max-width: 450px;";

        const isIos = isIosSafari();

        if (isIos) {
            banner.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                    <img src="/assets/images/Logo2.webp" alt="A/C Now Logo" style="width: 40px; height: 40px; border-radius: 6px;">
                    <div style="flex-grow: 1;">
                        <h4 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 700;">Add to Home Screen</h4>
                        <p style="margin: 0; font-size: 0.75rem; color: #4A5568;">Tap share icon <span style="font-size: 1rem;">📤</span> then click "Add to Home Screen" <span style="font-size: 1rem;">➕</span> for the offline app.</p>
                    </div>
                    <button id="pwa-install-close" style="background: transparent; border: none; color: #718096; font-size: 1.2rem; cursor: pointer; padding: 4px;">✕</button>
                </div>
            `;
        } else {
            banner.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="/assets/images/Logo2.webp" alt="A/C Now Logo" style="width: 40px; height: 40px; border-radius: 6px;">
                    <div>
                        <h4 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1rem; font-weight: 700;">Install A/C Now App</h4>
                        <p style="margin: 0; font-size: 0.8rem; color: #4A5568;">Fast offline requests & priority emergency calling</p>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="pwa-install-close" style="background: transparent; border: none; color: #718096; font-size: 1.2rem; cursor: pointer; padding: 4px;">✕</button>
                    <button id="pwa-install-btn" style="background: #0B63E5; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">Install</button>
                </div>
            `;
        }

        document.body.appendChild(banner);

        if (!isIos) {
            document.getElementById('pwa-install-btn').addEventListener('click', async () => {
                if (!deferredPrompt) return;
                banner.style.display = 'none';
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`[PWA Client] Install prompt result: ${outcome}`);
                deferredPrompt = null;
                banner.remove();
            });
        }

        document.getElementById('pwa-install-close').addEventListener('click', () => {
            localStorage.setItem('pwa-install-dismissed', Date.now());
            banner.remove();
        });
    }

    // Check for iOS prompt on page load
    window.addEventListener('load', () => {
        const dismissedTime = localStorage.getItem('pwa-install-dismissed');
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (isIosSafari() && (!dismissedTime || (Date.now() - dismissedTime > oneWeek))) {
            setTimeout(showInstallPromotion, 3000);
        }
    });

    // 0. Interactive "Sound of Comfort" Web Audio Synthesizer
    const ComfortAudio = {
        ctx: null,
        isMuted: true,
        windNode: null,
        windFilter: null,
        windGain: null,
        windInterval: null,

        init() {
            if (this.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();
            console.log("[Web Audio] ComfortAudio context initialized.");
        },

        toggleMute() {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.isMuted = !this.isMuted;
            
            const btnText = document.getElementById("mute-status-text");
            const btnIcon = document.getElementById("mute-icon");
            if (btnText && btnIcon) {
                btnText.textContent = this.isMuted ? "OFF" : "ON";
                btnIcon.textContent = this.isMuted ? "🔇" : "🔊";
            }
            console.log(`[Web Audio] Mute toggled: ${this.isMuted}`);

            if (this.isMuted) {
                this.stopWind();
            } else {
                this.playClick();
            }
        },

        playClick() {
            if (this.isMuted || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gainNode = this.ctx.createGain();
                
                osc.type = "sine";
                osc.frequency.setValueAtTime(800, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
                
                gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
                
                osc.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                
                osc.start();
                osc.stop(this.ctx.currentTime + 0.08);
            } catch (e) {
                console.warn("[Web Audio] Error playing click:", e);
            }
        },

        playTick() {
            if (this.isMuted || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gainNode = this.ctx.createGain();
                
                osc.type = "triangle";
                osc.frequency.setValueAtTime(250, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.02);
                
                gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.02);
                
                osc.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                
                osc.start();
                osc.stop(this.ctx.currentTime + 0.02);
            } catch (e) {
                console.warn("[Web Audio] Error playing tick:", e);
            }
        },

        startWind() {
            if (this.isMuted || !this.ctx || this.windNode) return;
            try {
                // Generate Noise
                const bufferSize = 2 * this.ctx.sampleRate;
                const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }

                this.windNode = this.ctx.createBufferSource();
                this.windNode.buffer = noiseBuffer;
                this.windNode.loop = true;

                // Modulate lowpass filter (wind rustle)
                this.windFilter = this.ctx.createBiquadFilter();
                this.windFilter.type = "lowpass";
                this.windFilter.frequency.setValueAtTime(300, this.ctx.currentTime);
                this.windFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

                this.windGain = this.ctx.createGain();
                this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
                this.windGain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 0.4);

                this.windNode.connect(this.windFilter);
                this.windFilter.connect(this.windGain);
                this.windGain.connect(this.ctx.destination);

                this.windNode.start();

                let cutoff = 300;
                let direction = 1;
                this.windInterval = setInterval(() => {
                    if (!this.ctx || this.isMuted || !this.windFilter) return;
                    cutoff += direction * (Math.random() * 15 + 5);
                    if (cutoff > 600) direction = -1;
                    if (cutoff < 200) direction = 1;
                    try {
                        this.windFilter.frequency.exponentialRampToValueAtTime(cutoff, this.ctx.currentTime + 0.15);
                    } catch (err) {}
                }, 150);

                console.log("[Web Audio] Soft breeze synth started.");
            } catch (e) {
                console.warn("[Web Audio] Wind start error:", e);
            }
        },

        stopWind() {
            if (!this.windNode) return;
            try {
                if (this.windGain && this.ctx) {
                    this.windGain.gain.setValueAtTime(this.windGain.gain.value, this.ctx.currentTime);
                    this.windGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
                }
                const node = this.windNode;
                const interval = this.windInterval;
                
                this.windNode = null;
                this.windFilter = null;
                this.windGain = null;
                this.windInterval = null;

                setTimeout(() => {
                    try {
                        node.stop();
                        node.disconnect();
                    } catch (err) {}
                    if (interval) clearInterval(interval);
                }, 400);

                console.log("[Web Audio] Soft breeze synth stopped.");
            } catch (e) {
                console.warn("[Web Audio] Wind stop error:", e);
            }
        },

        playSuccess() {
            if (this.isMuted || !this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const chimeFrequencies = [523.25, 659.25, 783.99, 1046.50];
                chimeFrequencies.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gainNode = this.ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, now + (idx * 0.07));
                    gainNode.gain.setValueAtTime(0, now + (idx * 0.07));
                    gainNode.gain.linearRampToValueAtTime(0.08, now + (idx * 0.07) + 0.02);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.07) + 0.3);
                    osc.connect(gainNode);
                    gainNode.connect(this.ctx.destination);
                    osc.start(now + (idx * 0.07));
                    osc.stop(now + (idx * 0.07) + 0.35);
                });
            } catch (e) {
                console.warn("[Web Audio] Failed success sound:", e);
            }
        },

        playFailure() {
            if (this.isMuted || !this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const osc1 = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gainNode = this.ctx.createGain();
                osc1.type = "sawtooth";
                osc2.type = "triangle";
                osc1.frequency.setValueAtTime(115, now);
                osc2.frequency.setValueAtTime(118, now);
                gainNode.gain.setValueAtTime(0.12, now);
                gainNode.gain.linearRampToValueAtTime(0.12, now + 0.12);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.3);
                osc2.stop(now + 0.3);
            } catch (e) {
                console.warn("[Web Audio] Failed failure sound:", e);
            }
        }
    };
    window.ComfortAudio = ComfortAudio;

    window.triggerSound = function(type) {
        if (window.ComfortAudio) {
            if (type === "click") {
                window.ComfortAudio.playClick();
            } else if (type === "tick") {
                window.ComfortAudio.playTick();
            } else if (type === "success") {
                if (typeof window.ComfortAudio.playSuccess === "function") {
                    window.ComfortAudio.playSuccess();
                } else {
                    window.ComfortAudio.playClick();
                }
            } else if (type === "error") {
                if (typeof window.ComfortAudio.playFailure === "function") {
                    window.ComfortAudio.playFailure();
                } else {
                    window.ComfortAudio.playTick();
                }
            }
        }
    };

    // Initialize AudioContext on first page interaction
    document.addEventListener("click", () => {
        ComfortAudio.init();
    }, { once: true });

    // Slider ticks integration
    document.addEventListener("input", (e) => {
        if (e.target && e.target.type === "range") {
            ComfortAudio.playTick();
        }
    });

    // 1. Live Air Quality Index (AQI) Detector & Global Mute Toggle Button
    async function initializeAQIDetector() {
        const topBarContent = document.querySelector('.top-bar-content');
        const servicesAqiWidget = document.getElementById('live-aqi-widget');
        
        const match = document.cookie.match(/(?:^|; )nf_city=([^;]*)/);
        const city = match ? decodeURIComponent(match[1]) : "Port St. Lucie";
        
        const CITY_COORDS = {
            "Port St. Lucie": { lat: 27.2858, lon: -80.3582, fallbackAqi: 42 },
            "Stuart": { lat: 27.1975, lon: -80.2528, fallbackAqi: 35 },
            "Palm City": { lat: 27.1698, lon: -80.2684, fallbackAqi: 38 },
            "Jupiter": { lat: 26.9342, lon: -80.0942, fallbackAqi: 31 }
        };

        const coords = CITY_COORDS[city] || CITY_COORDS["Port St. Lucie"];
        let aqiVal = coords.fallbackAqi;
        let isSimulated = false;

        try {
            const apiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&current=us_aqi`, { signal: AbortSignal.timeout(3000) });
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data && data.current && typeof data.current.us_aqi === 'number') {
                    aqiVal = data.current.us_aqi;
                }
            } else {
                isSimulated = true;
            }
        } catch (e) {
            console.warn(`[AQI API] Failed to fetch. Using fallback: ${aqiVal}`);
            isSimulated = true;
        }

        let category = "Good";
        let color = "#10B981"; // Green
        let desc = "Ideal air conditions. Low pollen and pollutants.";
        let alertHtml = "";

        if (aqiVal > 50 && aqiVal <= 100) {
            category = "Moderate";
            color = "#F59E0B"; // Yellow
            desc = "Acceptable air quality. Potential irritant for sensitive respiratory systems.";
            alertHtml = `<div style="margin-top: 10px; font-size:11.5px; color:#B45309;">⚠️ Moderate AQI: We recommend installing a <strong>Guardian UV air purifier</strong> or booking an duct cleanliness check.</div>`;
        } else if (aqiVal > 100) {
            category = "Poor";
            color = "#EF4444"; // Red
            desc = "High allergen and pollutant count. Indoor filtration recommended.";
            alertHtml = `<div style="margin-top: 10px; font-size:11.5px; color:#B91C1C; font-weight:600;">🚨 Poor AQI Alert: High allergen count. We highly recommend a <strong>HEPA filtration upgrade</strong> or chemical coil sanitize service.</div>`;
        }

        // Inject global AQI Badge
        if (topBarContent) {
            const globalBadgeSpan = document.createElement('span');
            globalBadgeSpan.className = 'top-bar-item highlight';
            globalBadgeSpan.id = 'global-aqi-badge';
            globalBadgeSpan.style.display = 'inline-flex';
            globalBadgeSpan.style.alignItems = 'center';
            globalBadgeSpan.style.gap = '6px';
            globalBadgeSpan.innerHTML = `
                <span class="badge" style="background:${color}; color:#fff;" id="aqi-color-dot">AQI</span> 
                Live ${city} Air Quality: <strong style="color:${color}; font-weight:700;">${aqiVal} (${category})</strong>
            `;
            topBarContent.appendChild(globalBadgeSpan);


        }

        // Inject services page card widget
        if (servicesAqiWidget) {
            const isServicesPage = window.location.pathname.includes("services.html");
            const textColor = isServicesPage ? "#FFFFFF" : "var(--dark)";
            const descColor = isServicesPage ? "#CBD5E1" : "var(--gray-dark)";
            const alertColor = isServicesPage ? "#FBBF24" : "#B45309";
            const alertPoorColor = isServicesPage ? "#F87171" : "#B91C1C";
            
            const servicesAlertHtml = aqiVal > 50 && aqiVal <= 100 
                ? `<div style="margin-top: 8px; font-size:11.5px; color:${alertColor};">⚠️ Moderate AQI: We recommend a <strong>Guardian UV air purifier</strong> or duct check.</div>`
                : aqiVal > 100
                ? `<div style="margin-top: 8px; font-size:11.5px; color:${alertPoorColor}; font-weight:600;">🚨 Poor AQI Alert: High allergen count. We highly recommend a <strong>HEPA filtration upgrade</strong>.</div>`
                : "";

            servicesAqiWidget.innerHTML = `
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                        <span style="font-weight:700; color:${textColor};">${city} Air Index</span>
                        <span style="background:${color}; color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px;">${category} (${aqiVal})</span>
                    </div>
                    <div style="font-size:12px; color:${descColor}; margin:0; line-height:1.4;">${desc} ${isSimulated ? '(Local seasonal average)' : ''}</div>
                    ${servicesAlertHtml}
                </div>
            `;
        }
    }
    initializeAQIDetector();

    // Inject Global Mute Toggle Button in Footer Bottom Bar
    function injectFooterSoundToggle() {
        const footerLinks = document.querySelector('.footer-bottom-content div');
        if (footerLinks) {
            const separator = document.createElement('span');
            separator.textContent = '|';
            separator.style.color = 'rgba(255,255,255,0.3)';
            separator.style.margin = '0 3px';
            footerLinks.appendChild(separator);

            const muteBtn = document.createElement('button');
            muteBtn.id = 'global-mute-toggle';
            muteBtn.style.cssText = "background:transparent; border:none; color:inherit; cursor:pointer; font-size:12.5px; display:inline-flex; align-items:center; gap:4px; font-weight:600; text-decoration:underline; padding:0; transition: opacity 0.2s;";
            muteBtn.onmouseover = () => muteBtn.style.opacity = '0.8';
            muteBtn.onmouseout = () => muteBtn.style.opacity = '1';
            muteBtn.innerHTML = `<span id="mute-icon">🔇</span> Sound: <strong id="mute-status-text">OFF</strong>`;
            
            muteBtn.addEventListener('click', () => {
                if (window.ComfortAudio) {
                    window.ComfortAudio.toggleMute();
                }
            });
            footerLinks.appendChild(muteBtn);
        }
    }
    injectFooterSoundToggle();

    // 2. Clean Air Particle Canvas overlay
    function initializeCleanAirCanvas() {
        const canvas = document.getElementById("clean-air-canvas");
        if (!canvas) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            console.log("[Canvas] Reduced motion active. Particle canvas animation disabled.");
            return;
        }

        const ctx = canvas.getContext("2d");
        let particles = [];
        const maxParticles = 30;

        const resizeCanvas = () => {
            const rect = canvas.parentNode.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        class AirParticle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + Math.random() * 20;
                this.size = Math.random() * 3.5 + 1.5;
                this.speed = Math.random() * 0.4 + 0.15;
                this.wobble = Math.random() * 0.02;
                const colors = [
                    "rgba(96, 165, 250, 0.6)",
                    "rgba(147, 197, 253, 0.55)",
                    "rgba(255, 255, 255, 0.7)",
                    "rgba(167, 243, 208, 0.5)"
                ];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                this.y -= this.speed;
                this.x += Math.sin(this.y * this.wobble) * 0.25;

                if (this.y < -10) {
                    this.reset();
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 4;
                ctx.fill();
            }
        }

        for (let i = 0; i < maxParticles; i++) {
            particles.push(new AirParticle());
            particles[i].y = Math.random() * canvas.height;
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.shadowBlur = 0;
            
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        };
        animate();

        let mouseX = null;
        let mouseY = null;
        canvas.parentNode.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;

            particles.forEach(p => {
                const dx = p.x - mouseX;
                const dy = p.y - mouseY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 45) {
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * 3;
                    p.y += Math.sin(angle) * 1.5;
                }
            });
        });

        canvas.parentNode.addEventListener("mouseleave", () => {
            mouseX = null;
            mouseY = null;
        });
    }
    initializeCleanAirCanvas();
});

/* ==========================================================================
   Live Dispatch & Veteran Gate Interactive Widgets
   ========================================================================== */
let dispatchSimInterval = null;

window.startDispatchSimulation = function() {
    const van = document.getElementById("dispatch-van-marker");
    const statusText = document.getElementById("dispatch-status");
    const etaText = document.getElementById("dispatch-eta");
    
    if (!van || !statusText || !etaText) return;
    
    if (dispatchSimInterval) clearInterval(dispatchSimInterval);
    
    const points = [
        { x: 30, y: 50 },
        { x: 100, y: 50 },
        { x: 100, y: 150 },
        { x: 300, y: 150 },
        { x: 300, y: 80 },
        { x: 350, y: 80 }
    ];
    
    let segmentIndex = 0;
    let t = 0;
    const speed = 0.05;
    
    dispatchSimInterval = setInterval(() => {
        if (segmentIndex >= points.length - 1) {
            clearInterval(dispatchSimInterval);
            statusText.textContent = "VAN ARRIVED";
            statusText.style.color = "#10B981";
            etaText.textContent = "0 Mins";
            if (typeof triggerSound === "function") triggerSound("success");
            return;
        }
        
        const p1 = points[segmentIndex];
        const p2 = points[segmentIndex + 1];
        
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        
        van.setAttribute("transform", `translate(${x}, ${y})`);
        
        t += speed;
        if (t >= 1) {
            t = 0;
            segmentIndex++;
        }
        
        const totalPoints = points.length - 1;
        const progress = (segmentIndex + t) / totalPoints;
        const minsLeft = Math.ceil(12 * (1 - progress));
        etaText.textContent = `${minsLeft} Mins`;
        
        if (progress < 0.2) {
            statusText.textContent = "VAN DEPARTED";
            statusText.style.color = "#60A5FA";
        } else if (progress < 0.5) {
            statusText.textContent = "ON NW ST. LUCIE BLVD";
            statusText.style.color = "#60A5FA";
        } else if (progress < 0.75) {
            statusText.textContent = "CROSSING SW BAYSHORE";
            statusText.style.color = "#FBBF24";
        } else {
            statusText.textContent = "ENTERING STREET";
            statusText.style.color = "#FBBF24";
        }
        
        if (Math.random() < 0.1 && typeof triggerSound === "function") {
            triggerSound("tick");
        }
    }, 150);
};

window.sendSimulatedGateCode = function() {
    const code = prompt("Enter gate entry code to transmit to service van:", "4821");
    if (code) {
        if (typeof window.showToast === "function") { window.showToast(`Transmitted entry code: "${code}" to dispatch co-pilot dashboard!`, "success"); } else { alert(`Transmitted entry code: "${code}" to dispatch co-pilot dashboard!`); }
        if (typeof triggerSound === "function") triggerSound("success");
    }
};

window.verifyVeteranStatus = function() {
    const certifyCheck = document.getElementById("vet-certify-check");
    const inputFields = document.getElementById("vet-input-fields");
    const successBanner = document.getElementById("vet-success-banner");
    
    if (certifyCheck && !certifyCheck.checked) {
        if (typeof window.showToast === "function") {
            window.showToast("Please check the self-certification box to proceed.", "warning");
        } else {
            alert("Please check the self-certification box to proceed.");
        }
        return;
    }
    
    localStorage.setItem("acnow_military_verified", "true");
    if (inputFields) inputFields.style.display = "none";
    if (successBanner) successBanner.style.display = "block";
    
    // Set form flags for Netlify submission
    const flagInput = document.getElementById("military-discount-flag");
    if (flagInput) flagInput.value = "Yes";
    const flagInputWizard = document.getElementById("military-discount-flag-wizard");
    if (flagInputWizard) flagInputWizard.value = "Yes";
    
    const messageField = document.getElementById("message");
    if (messageField && !messageField.value.includes("[5% MILITARY DISCOUNT]")) {
        messageField.value = "[5% MILITARY DISCOUNT APPLIED TO INVOICE]\n" + messageField.value;
    }
    
    if (typeof triggerSound === "function") triggerSound("success");
    if (typeof window.showToast === "function") {
        window.showToast("Veteran self-certification complete! 5% honor discount applied to invoice.", "success");
    } else {
        alert("Veteran status confirmed! Your 5% discount will be applied directly to your service invoice.");
    }
};

window.toggleBillingPeriod = function(isYearly) {
    const goldPrices = document.querySelectorAll('.pricing-tier-card:nth-child(1) .price-num, .tier-card:nth-child(1) .price-num');
    const goldPeriods = document.querySelectorAll('.pricing-tier-card:nth-child(1) .price-period, .tier-card:nth-child(1) .price-period');
    const goldBtns = document.querySelectorAll('#btn-preferred-tier, .tier-card:nth-child(1) .btn, .pricing-tier-card:nth-child(1) .btn-tier, .tier-card:nth-child(1) .btn-signup');
    
    const platinumPrices = document.querySelectorAll('.pricing-tier-card:nth-child(2) .price-num, .tier-card:nth-child(2) .price-num');
    const platinumPeriods = document.querySelectorAll('.pricing-tier-card:nth-child(2) .price-period, .tier-card:nth-child(2) .price-period');
    const platinumBtns = document.querySelectorAll('#btn-comfort-tier, .tier-card:nth-child(2) .btn, .pricing-tier-card:nth-child(2) .btn-tier, .tier-card:nth-child(2) .btn-signup');

    const labelMonthly = document.getElementById('toggle-label-monthly');
    const labelYearly = document.getElementById('toggle-label-yearly');

    if (isYearly) {
        if (labelYearly) labelYearly.classList.add('active');
        if (labelMonthly) labelMonthly.classList.remove('active');
        
        goldPrices.forEach(el => el.textContent = "$155");
        goldPeriods.forEach(el => el.textContent = "/year");
        goldBtns.forEach(el => el.setAttribute('href', "contact.html?plan=gold_annual"));
        
        platinumPrices.forEach(el => el.textContent = "$295");
        platinumPeriods.forEach(el => el.textContent = "/year");
        platinumBtns.forEach(el => el.setAttribute('href', "contact.html?plan=platinum_annual"));
    } else {
        if (labelMonthly) labelMonthly.classList.add('active');
        if (labelYearly) labelYearly.classList.remove('active');
        
        goldPrices.forEach(el => el.textContent = "$13.60");
        goldPeriods.forEach(el => el.textContent = "/month");
        goldBtns.forEach(el => el.setAttribute('href', "contact.html?plan=gold_monthly"));
        
        platinumPrices.forEach(el => el.textContent = "$25.88");
        platinumPeriods.forEach(el => el.textContent = "/month");
        platinumBtns.forEach(el => el.setAttribute('href', "contact.html?plan=platinum_monthly"));
    }
};

// Footer Logo Collision Observer: hides the footer logo when the header logo reaches the top of the footer section
function initFooterLogoCollisionObserver() {
    const headerLogo = document.querySelector(".header .logo-img") || document.querySelector(".header .logo");
    const footerLogo = document.querySelector(".footer-logo");
    const footerSection = document.querySelector("footer");
    
    if (!headerLogo || !footerLogo || !footerSection) return;
    
    let isFooterVisible = false;
    
    const checkCollision = () => {
        if (!isFooterVisible) return;
        const headerLogoRect = headerLogo.getBoundingClientRect();
        const footerSectionRect = footerSection.getBoundingClientRect();
        
        if (footerSectionRect.top <= headerLogoRect.bottom) {
            footerLogo.style.opacity = "0";
            footerLogo.style.visibility = "hidden";
            footerLogo.style.transition = "opacity 0.3s ease, visibility 0.3s ease";
        } else {
            footerLogo.style.opacity = "1";
            footerLogo.style.visibility = "visible";
            footerLogo.style.transition = "opacity 0.3s ease, visibility 0.3s ease";
        }
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isFooterVisible = entry.isIntersecting;
            if (isFooterVisible) {
                checkCollision();
            } else {
                footerLogo.style.opacity = "1";
                footerLogo.style.visibility = "visible";
            }
        });
    }, { rootMargin: "100px 0px 0px 0px" });
    
    observer.observe(footerSection);
    
    window.addEventListener("scroll", throttle(checkCollision, 80), { passive: true });
    window.addEventListener("resize", throttle(checkCollision, 100), { passive: true });
}

// Initialise the collision observer on DOMContentLoaded
document.addEventListener("DOMContentLoaded", initFooterLogoCollisionObserver);

// Dynamic Premium UX Enhancements (Scroll Progress and Back-to-Top button)
function initPremiumUXFeatures() {
    // 1. Scroll Progress Bar
    const progressBar = document.createElement("div");
    progressBar.id = "scroll-progress-bar";
    progressBar.style.position = "fixed";
    progressBar.style.top = "0";
    progressBar.style.left = "0";
    progressBar.style.height = "3px";
    progressBar.style.background = "linear-gradient(to right, var(--primary) 0%, var(--gold) 100%)";
    progressBar.style.zIndex = "99999";
    progressBar.style.width = "0%";
    progressBar.style.transition = "width 0.1s ease-out";
    document.body.appendChild(progressBar);

    window.addEventListener("scroll", throttle(() => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        progressBar.style.width = scrolled + "%";
    }, 50), { passive: true });

    // 2. Back-to-Top Button
    const backToTopBtn = document.createElement("button");
    backToTopBtn.id = "back-to-top-btn";
    backToTopBtn.setAttribute("aria-label", "Scroll back to top");
    backToTopBtn.innerHTML = "▲";
    backToTopBtn.style.position = "fixed";
    backToTopBtn.style.bottom = "25px";
    
    // Position dynamically to prevent colliding with Chatbot FAB (which is always visible)
    backToTopBtn.style.right = "95px";
    
    backToTopBtn.style.width = "48px";
    backToTopBtn.style.height = "48px";
    backToTopBtn.style.borderRadius = "50%";
    backToTopBtn.style.border = "1px solid rgba(255, 255, 255, 0.25)";
    backToTopBtn.style.background = "rgba(10, 24, 47, 0.85)";
    backToTopBtn.style.color = "var(--white)";
    backToTopBtn.style.fontSize = "16px";
    backToTopBtn.style.cursor = "pointer";
    backToTopBtn.style.zIndex = "9999";
    backToTopBtn.style.display = "none";
    backToTopBtn.style.alignItems = "center";
    backToTopBtn.style.justifyContent = "center";
    backToTopBtn.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
    backToTopBtn.style.opacity = "0";
    backToTopBtn.style.transition = "opacity 0.3s ease";
    
    document.body.appendChild(backToTopBtn);
    
    const checkScrollHeight = () => {
        if (window.scrollY > 300) {
            if (backToTopBtn.style.display !== "flex") {
                backToTopBtn.style.display = "flex";
                setTimeout(() => {
                    if (window.scrollY > 300) {
                        backToTopBtn.style.opacity = "1";
                    }
                }, 10);
            }
        } else {
            if (backToTopBtn.style.display === "flex") {
                backToTopBtn.style.opacity = "0";
                setTimeout(() => {
                    if (window.scrollY <= 300) {
                        backToTopBtn.style.display = "none";
                    }
                }, 300);
            }
        }
    };

    window.addEventListener("scroll", throttle(checkScrollHeight, 150), { passive: true });
    
    // Listen for custom phase changes from dashboard to adjust right positioning immediately
    window.addEventListener("storage", (e) => {
        if (e.key === 'acnow_phase') {
            backToTopBtn.style.right = "95px";
        }
    });

    backToTopBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
    
    checkScrollHeight();
}

document.addEventListener("DOMContentLoaded", initPremiumUXFeatures);


/* ==========================================================================
   DYNAMIC INTERACTIVE REVIEW DRAWER SYSTEM (HORIZONTAL BOTTOM BAR)
   ========================================================================== */
(function() {
    function initDevBar() {
        if (document.getElementById('acnow-dev-bar')) return;

        // Check for URL query parameter toggles to set or clear dev mode
        const params = new URLSearchParams(window.location.search);
        if (params.get('dev') === 'true' || params.get('admin') === 'true') {
            localStorage.setItem('acnow_dev_mode', 'true');
            sessionStorage.setItem('acnow_dev_mode', 'true');
            // Clean up the URL query parameter and reload
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.location.replace(cleanUrl);
            return;
        } else if (params.get('dev') === 'false' || params.get('admin') === 'false') {
            localStorage.removeItem('acnow_dev_mode');
            sessionStorage.removeItem('acnow_dev_mode');
            localStorage.removeItem('acnow_phase');
            sessionStorage.removeItem('acnow_phase');
            // Clean up the URL query parameter and reload
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.location.replace(cleanUrl);
            return;
        }

        // Get active phase state (aligned with global prioritized storage checks)
        const isDev = (sessionStorage.getItem('acnow_dev_mode') === 'true') || (localStorage.getItem('acnow_dev_mode') === 'true');
        const currentPhase = sessionStorage.getItem('acnow_phase') || localStorage.getItem('acnow_phase') || '1';

        // Gated: only show the QA review console bar if dev mode is explicitly enabled
        if (!isDev) return;

        // Add padding class to body since dev bar is active
        document.body.classList.add('has-dev-bar');

        // Get saved checkbox states
        let checklistStates = {};
        try {
            checklistStates = JSON.parse(localStorage.getItem('acnow_review_checklist')) || {};
        } catch (e) {
            checklistStates = {};
        }

        // Get saved review votes and comments states
        let reviewStates = {};
        try {
            reviewStates = JSON.parse(localStorage.getItem('acnow_page_reviews')) || {};
        } catch (e) {
            reviewStates = {};
        }

        // Define categorized list of all 24 pages
        const categories = [
            {
                title: "Core Navigation (Public Funnel)",
                items: [
                    { name: "A/C Now Homepage", url: "index.html", phase: "1", desc: "Landing page with split residential/commercial hero and quick diagnostics." },
                    { name: "Services Overview", url: "services.html", phase: "1", desc: "Displays all heating, cooling, and air quality capabilities at a glance." },
                    { name: "About Our Team", url: "about.html", phase: "1", desc: "Brand storytelling, technician credentials, core values, and mascot billboards." },
                    { name: "Book Service", url: "contact.html", phase: "1", desc: "High-conversion booking portal with live local air index feedback." }
                ]
            },
            {
                title: "Residential Comfort (Specialized)",
                items: [
                    { name: "A/C Repair", url: "ac-repair.html", phase: "1", desc: "Booking specialized repair diagnostics for Florida heat." },
                    { name: "A/C Installation", url: "ac-installation.html", phase: "1", desc: "Modern system replacements, SEER ratings, and rebate highlight values." },
                    { name: "A/C Maintenance", url: "ac-maintenance.html", phase: "1", desc: "Preventative tune-ups, filter servicing, and system longevity audits." }
                ]
            },
            {
                title: "Specialized Heating & Cooling",
                items: [
                    { name: "Commercial & Towers", url: "commercial.html", phase: "1", desc: "Heavy equipment, complex cooling, and priority contract management." },
                    { name: "Pool Heat Pumps", url: "pool-heating.html", phase: "1", desc: "Extends swimming season using energy-efficient pool pump calculations." }
                ]
            },
            {
                title: "Interactive Diagnostics (Phase 1 Tools)",
                items: [
                    { name: "DIY Troubleshooting Wizard", url: "diagnose.html", phase: "1", desc: "Wizard guiding customers to fix issues before booking a tech." },
                    { name: "HVAC System Configurator", url: "configurator.html", phase: "1", desc: "Custom system recommendations based on square footage and target SEER." },
                    { name: "Lifespan & Energy Planner", url: "planner.html", phase: "1", desc: "Calculator tracking system degradation and utility bill projections." },
                    { name: "Storm & Hurricane Prep", url: "storm-prep.html", phase: "1", desc: "Step-by-step checklist to protect HVAC equipment during storms." }
                ]
            },
            {
                title: "Local Service Directory",
                items: [
                    { name: "Service Areas List", url: "areas.html", phase: "1", desc: "Martin, Palm Beach, and St. Lucie counties directory." },
                    { name: "Directions & Maps", url: "directions.html", phase: "1", desc: "Driving routes, contact details, and location map directory." },
                    { name: "Stuart Regional Hub", url: "hvac-services-stuart.html", phase: "1", desc: "Localized landing page for Stuart, FL." },
                    { name: "Palm City Regional Hub", url: "hvac-services-palm-city.html", phase: "1", desc: "Localized landing page for Palm City, FL." }
                ]
            },
            {
                title: "Customer Account Portal",
                items: [
                    { name: "Members Area", url: "members.html", phase: "2", desc: "Marketing-free account space for subscription updates and booking history." }
                ]
            },
            {
                title: "Staff Tactical Field Console",
                items: [
                    { name: "Staff Command Console", url: "team-portal.html", phase: "2", desc: "Secure PIN-guarded terminal for dispatch lists and system logs." },
                    { name: "Corrosion Risk Predictor", url: "corrosion-predictor.html", phase: "2", desc: "WebGL visualizer mapping salt spray corrosion risks by Florida zip codes." },
                    { name: "3D Airflow Simulator", url: "3d-airflow.html", phase: "2", desc: "Three.js dynamic model simulating room layout ventilation paths." }
                ]
            },
            {
                title: "Compliance & Legal Pages",
                items: [
                    { name: "Privacy Policy", url: "privacy.html", phase: "1", desc: "Customer privacy guarantees." },
                    { name: "Accessibility Statement", url: "accessibility.html", phase: "1", desc: "Compliance details for ADA accessibility guidelines." },
                    { name: "404 Page Not Found", url: "404.html", phase: "1", desc: "Custom error redirection page." }
                ]
            }
        ];

        // Create Bar Container HTML
        const barContainer = document.createElement('div');
        barContainer.id = 'acnow-dev-bar';

        // Count total items and active checks
        let totalItems = 0;
        let checkedItems = 0;
        categories.forEach(cat => {
            cat.items.forEach(item => {
                totalItems++;
                if (checklistStates[item.url]) checkedItems++;
            });
        });

        const initialPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

        // Get locked category state from localstorage
        const activeCategoryIndex = parseInt(localStorage.getItem('acnow_dev_active_category') || "0", 10);

        // Build HTML for accordion cards
        let accordionHtml = '';
        const currentFile = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1) || 'index.html';

        categories.forEach((cat, index) => {
            let listHtml = '';
            cat.items.forEach(item => {
                const isChecked = checklistStates[item.url] ? 'checked' : '';
                const tagClass = item.phase === '1' ? 'p1' : 'p2';
                const tagLabel = item.phase === '1' ? 'P1' : 'P2';
                const isPhase2Only = item.phase === '2' ? 'phase-2-only' : '';
                
                // Get page specific feedback states
                const feedback = reviewStates[item.url] || { vote: null, comment: "" };
                const likeActive = feedback.vote === 'like' ? 'active liked' : '';
                const dislikeActive = feedback.vote === 'dislike' ? 'active disliked' : '';
                const commentToggleActive = feedback.comment ? 'has-comment' : '';
                const inlineCommentStyle = feedback.comment ? 'style="display: block;"' : '';

                listHtml += `
                    <li class="checklist-item ${isPhase2Only}" data-page-url="${item.url}">
                        <div class="checklist-top-row">
                            <div class="left-side">
                                <input type="checkbox" data-url="${item.url}" ${isChecked}>
                                <a href="${(() => {
                    let resolvedUrl = item.url;
                    const isSubpage = window.location.pathname.includes('/pages/');
                    if (isSubpage) {
                        if (item.url === 'index.html') {
                            resolvedUrl = '../index.html';
                        }
                    } else {
                        if (item.url !== 'index.html') {
                            resolvedUrl = 'pages/' + item.url;
                        }
                    }
                    return resolvedUrl;
                })()}">${item.phase === '2' ? '🚀 ' : ''}${item.name}</a>
                            </div>
                            <span class="phase-tag ${tagClass}">${tagLabel}</span>
                        </div>
                        <div class="checklist-desc">${item.desc}</div>
                        <div class="feedback-action-row">
                            <div class="voting-buttons">
                                <button class="vote-btn ${likeActive}" data-vote-val="like">👍 Like</button>
                                <button class="vote-btn ${dislikeActive}" data-vote-val="dislike">👎 Dislike</button>
                            </div>
                            <button class="comment-toggle-btn ${commentToggleActive}">
                                💬 Notes
                            </button>
                        </div>
                        <div class="inline-comment-box" ${inlineCommentStyle}>
                            <textarea placeholder="Write feedback notes...">${feedback.comment || ""}</textarea>
                        </div>
                    </li>
                `;
            });

            // Expand correct category on load based on index
            const activeClass = index === activeCategoryIndex ? 'active' : '';
            const allPhase2 = cat.items.every(item => item.phase === '2');
            const categoryPhaseClass = allPhase2 ? 'phase-2-only' : '';

            accordionHtml += `
                <div class="accordion-card ${activeClass} ${categoryPhaseClass}" data-card-index="${index}">
                    <div class="accordion-header">
                        ${allPhase2 ? '✨ ' : ''}${cat.title}
                        <span class="arrow">&#9656;</span>
                    </div>
                    <div class="accordion-content">
                        <ul class="checklist-list">
                            ${listHtml}
                        </ul>
                    </div>
                </div>
            `;
        });

        // Get active city from cookie
        let activeCity = 'Stuart';
        const cookieMatches = document.cookie.match(/(?:^|; )nf_city=([^;]*)/);
        if (cookieMatches) activeCity = decodeURIComponent(cookieMatches[1]);

        barContainer.innerHTML = `
            <!-- Collapsed Row (Always visible at the top of the bar) -->
            <div class="bar-collapsed-header">
                <div class="bar-left">
                    <span class="bar-title">🛠️ Review Console</span>
                    <div class="progress-container">
                        <span class="progress-text" id="bar-progress-text">${checkedItems} of ${totalItems} reviewed (${initialPercent}%)</span>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" id="bar-progress-bar" style="width: ${initialPercent}%;"></div>
                        </div>
                    </div>
                </div>
                
                <div class="bar-center">
                    <button class="quick-btn ${isDev && currentPhase === '1' ? 'active' : ''}" id="quick-btn-p1">Phase 1 (Production)</button>
                    <button class="quick-btn ${isDev && currentPhase === '2' ? 'active' : ''}" id="quick-btn-p2">Phase 2 (All Features)</button>
                </div>
                
                <div class="bar-right" style="display: flex; align-items: center; gap: 8px;">
                    <button class="action-btn secondary" id="btn-export-quick">📋 Export Summary</button>
                    <button class="action-btn primary" id="btn-toggle-expand">▲ Expand Console</button>
                    <button class="action-btn secondary" id="btn-toggle-minimize" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);" title="Minimize to bottom-left corner">📍 Minimize</button>
                </div>
            </div>

            <!-- Expanded Panel Grid -->
            <div class="bar-expanded-grid">
                <!-- Mobile Tab Switcher Navigation -->
                <div class="bar-mobile-tabs">
                    <button class="mobile-tab-btn" data-target="settings">⚙️ Config</button>
                    <button class="mobile-tab-btn active" data-target="checklist">📋 Checklist</button>
                    <button class="mobile-tab-btn" data-target="feedback">💬 Export</button>
                </div>

                <!-- Column 1: Settings -->
                <div class="expanded-col setting-panel col-settings">
                    <div class="col-title">Deployment Settings</div>
                    <label>Geotargeting Simulator</label>
                    <div class="city-grid">
                        <button class="city-btn ${activeCity === 'Stuart' ? 'active' : ''}" data-city="Stuart">Stuart</button>
                        <button class="city-btn ${activeCity === 'Palm City' ? 'active' : ''}" data-city="Palm City">Palm City</button>
                        <button class="city-btn ${activeCity === 'Jupiter' ? 'active' : ''}" data-city="Jupiter">Jupiter</button>
                        <button class="city-btn ${activeCity === 'Port St. Lucie' ? 'active' : ''}" data-city="Port St. Lucie">PSL</button>
                    </div>
                    <div style="margin-top: auto; padding-top: 15px;">
                        <button class="reset-guest-btn" id="btn-reset-public-bottom">Reset to Guest Mode</button>
                    </div>
                </div>

                <!-- Column 2: Accordion site checklist -->
                <div class="expanded-col col-checklist" style="flex:1;">
                    <div class="col-title">Exhaustive Page Checklist</div>
                    <div class="checklist-scroll-area" id="drawer-scroller">
                        <div class="accordion-group">
                            ${accordionHtml}
                        </div>
                    </div>
                </div>

                <!-- Column 3: Summary details / Report Feedback info -->
                <div class="expanded-col col-feedback" style="justify-content: space-between;">
                    <div>
                        <div class="col-title">Console Feedback</div>
                        <div class="export-panel-desc">
                            Review pages on this screen and use 👍/👎 to recommend additions or removals. Type inline notes under any page to report adjustments.
                        </div>
                        <button class="export-btn-large" id="btn-export-feedback-bottom">📋 Export Review Summary</button>
                    </div>
                    <div class="export-debug-info">
                        <strong>Developer Email:</strong> eleversity@me.com<br>
                        <strong>Phase Setting:</strong> Phase ${currentPhase}<br>
                        <strong>Active City:</strong> ${activeCity}
                    </div>
                </div>
            </div>
            <!-- Minimized Floating Launcher State -->
            <div class="bar-minimized-launcher">
                <span class="launcher-gear">🛠️</span>
                <a href="?dev=false" class="launcher-exit" title="Exit Dev Mode" onclick="event.stopPropagation();">❌</a>
            </div>
        `;
        document.body.appendChild(barContainer);

        // --- Setup Drawer Layout Lock States ---
        const scroller = barContainer.querySelector('#drawer-scroller');
        const expandBtn = barContainer.querySelector('#btn-toggle-expand');
        const minimizeBtn = barContainer.querySelector('#btn-toggle-minimize');

        // Apply minimized state if active
        if (localStorage.getItem('acnow_dev_drawer_minimized') === 'true') {
            barContainer.classList.add('minimized');
            document.body.classList.remove('has-dev-bar');
        } else {
            // Apply expanded state if open
            if (localStorage.getItem('acnow_dev_drawer_open') === 'true') {
                barContainer.classList.add('expanded');
                document.body.classList.add('acnow-drawer-open');
                expandBtn.innerHTML = '▼ Collapse Console';
                
                // Restore scroll position
                const savedScroll = parseInt(localStorage.getItem('acnow_dev_drawer_scroll') || "0", 10);
                if (savedScroll > 0) {
                    setTimeout(() => scroller.scrollTop = savedScroll, 50);
                }
            }
        }

        // Listen for scroll changes inside the drawer
        scroller.addEventListener('scroll', function() {
            localStorage.setItem('acnow_dev_drawer_scroll', this.scrollTop.toString());
        });

        // Toggle Expand/Collapse
        expandBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (barContainer.classList.contains('expanded')) {
                barContainer.classList.remove('expanded');
                document.body.classList.remove('acnow-drawer-open');
                this.innerHTML = '▲ Expand Console';
                localStorage.setItem('acnow_dev_drawer_open', 'false');
            } else {
                barContainer.classList.add('expanded');
                document.body.classList.add('acnow-drawer-open');
                this.innerHTML = '▼ Collapse Console';
                localStorage.setItem('acnow_dev_drawer_open', 'true');
            }
        });

        // Minimize to bottom-left corner
        minimizeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            barContainer.classList.remove('expanded');
            barContainer.classList.add('minimized');
            document.body.classList.remove('acnow-drawer-open');
            document.body.classList.remove('has-dev-bar');
            localStorage.setItem('acnow_dev_drawer_minimized', 'true');
        });

        // Click on minimized bar restores it
        barContainer.addEventListener('click', function() {
            if (this.classList.contains('minimized')) {
                this.classList.remove('minimized');
                document.body.classList.add('has-dev-bar');
                localStorage.setItem('acnow_dev_drawer_minimized', 'false');
                
                // If it was previously expanded, restore expanded layout
                if (localStorage.getItem('acnow_dev_drawer_open') === 'true') {
                    this.classList.add('expanded');
                    document.body.classList.add('acnow-drawer-open');
                }
            }
        });

        // --- Setup Mobile/Tablet Tab Switcher ---
        const mobileTabBtns = barContainer.querySelectorAll('.mobile-tab-btn');
        const columns = {
            settings: barContainer.querySelector('.col-settings'),
            checklist: barContainer.querySelector('.col-checklist'),
            feedback: barContainer.querySelector('.col-feedback')
        };

        mobileTabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                mobileTabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const target = this.getAttribute('data-target');
                
                // Hide all columns and show the selected one
                Object.keys(columns).forEach(key => {
                    if (columns[key]) {
                        if (key === target) {
                            columns[key].classList.add('active-tab');
                        } else {
                            columns[key].classList.remove('active-tab');
                        }
                    }
                });
                
                // Save active mobile tab
                localStorage.setItem('acnow_dev_mobile_tab', target);
            });
        });

        // Restore active mobile tab on load
        const savedMobileTab = localStorage.getItem('acnow_dev_mobile_tab') || 'checklist';
        const activeBtn = barContainer.querySelector(`.mobile-tab-btn[data-target="${savedMobileTab}"]`);
        if (activeBtn) {
            activeBtn.click();
        }

        // Accordion collapsing and index-locking behavior
        barContainer.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', function() {
                const card = this.parentElement;
                const index = parseInt(card.getAttribute('data-card-index'), 10);
                const isActive = card.classList.contains('active');
                
                // Close all other cards
                barContainer.querySelectorAll('.accordion-card').forEach(c => c.classList.remove('active'));
                
                if (!isActive) {
                    card.classList.add('active');
                    localStorage.setItem('acnow_dev_active_category', index.toString());
                } else {
                    localStorage.setItem('acnow_dev_active_category', '-1');
                }
            });
        });

        // Phase Toggles (Top bar buttons)
        barContainer.querySelector('#quick-btn-p1').addEventListener('click', function() {
            localStorage.setItem('acnow_dev_mode', 'true');
            localStorage.setItem('acnow_phase', '1');
            sessionStorage.setItem('acnow_dev_mode', 'true');
            sessionStorage.setItem('acnow_phase', '1');
            location.reload();
        });

        barContainer.querySelector('#quick-btn-p2').addEventListener('click', function() {
            localStorage.setItem('acnow_dev_mode', 'true');
            localStorage.setItem('acnow_phase', '2');
            sessionStorage.setItem('acnow_dev_mode', 'true');
            sessionStorage.setItem('acnow_phase', '2');
            location.reload();
        });

        // Reset to Guest Button
        barContainer.querySelector('#btn-reset-public-bottom').addEventListener('click', function() {
            localStorage.removeItem('acnow_dev_mode');
            localStorage.removeItem('acnow_phase');
            sessionStorage.removeItem('acnow_dev_mode');
            sessionStorage.removeItem('acnow_phase');
            location.reload();
        });

        // Geotargeting Toggles
        barContainer.querySelectorAll('[data-city]').forEach(btn => {
            btn.addEventListener('click', function() {
                const city = this.getAttribute('data-city');
                document.cookie = `nf_city=${encodeURIComponent(city)}; path=/; max-age=2592000; SameSite=Lax`;
                location.reload();
            });
        });

        // Checklist Checkboxes Persistence and Progress Calculation
        barContainer.querySelectorAll('.checklist-list input[type="checkbox"]').forEach(box => {
            box.addEventListener('change', function() {
                const url = this.getAttribute('data-url');
                checklistStates[url] = this.checked;
                localStorage.setItem('acnow_review_checklist', JSON.stringify(checklistStates));

                // Recalculate progress
                let checked = 0;
                barContainer.querySelectorAll('.checklist-list input[type="checkbox"]').forEach(b => {
                    if (b.checked) checked++;
                });

                const percent = Math.round((checked / totalItems) * 100);
                barContainer.querySelector('#bar-progress-text').textContent = `${checked} of ${totalItems} reviewed (${percent}%)`;
                barContainer.querySelector('#bar-progress-bar').style.width = `${percent}%`;
            });
        });

        // Checklist Links phase auto-escalation
        barContainer.querySelectorAll('.checklist-item a').forEach(link => {
            link.addEventListener('click', function(e) {
                const url = this.getAttribute('href');
                let targetPhase = '1';
                categories.forEach(cat => {
                    const matchedItem = cat.items.find(item => item.url === url);
                    if (matchedItem) targetPhase = matchedItem.phase;
                });

                if (targetPhase === '2' && localStorage.getItem('acnow_phase') !== '2') {
                    localStorage.setItem('acnow_dev_mode', 'true');
                    localStorage.setItem('acnow_phase', '2');
                }
            });
        });

        // Voting Buttons Handler
        barContainer.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const item = this.closest('.checklist-item');
                const pageUrl = item.getAttribute('data-page-url');
                const voteVal = this.getAttribute('data-vote-val');

                if (!reviewStates[pageUrl]) {
                    reviewStates[pageUrl] = { vote: null, comment: "" };
                }

                const sibling = this.parentElement.querySelector(`.vote-btn:not([data-vote-val="${voteVal}"])`);
                sibling.classList.remove('active', 'liked', 'disliked');

                if (this.classList.contains('active')) {
                    this.classList.remove('active', 'liked', 'disliked');
                    reviewStates[pageUrl].vote = null;
                } else {
                    this.classList.add('active');
                    if (voteVal === 'like') this.classList.add('liked');
                    else this.classList.add('disliked');
                    reviewStates[pageUrl].vote = voteVal;
                }

                localStorage.setItem('acnow_page_reviews', JSON.stringify(reviewStates));
            });
        });

        // Comments Toggle Input Box Handler
        barContainer.querySelectorAll('.comment-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const item = this.closest('.checklist-item');
                const commentBox = item.querySelector('.inline-comment-box');
                const isVisible = commentBox.style.display === 'block';
                commentBox.style.display = isVisible ? 'none' : 'block';
            });
        });

        // Save comments as they type
        barContainer.querySelectorAll('.inline-comment-box textarea').forEach(textarea => {
            textarea.addEventListener('input', function() {
                const item = this.closest('.checklist-item');
                const pageUrl = item.getAttribute('data-page-url');
                const commentToggleBtn = item.querySelector('.comment-toggle-btn');

                if (!reviewStates[pageUrl]) {
                    reviewStates[pageUrl] = { vote: null, comment: "" };
                }

                reviewStates[pageUrl].comment = this.value;
                localStorage.setItem('acnow_page_reviews', JSON.stringify(reviewStates));

                if (this.value.trim()) {
                    commentToggleBtn.classList.add('has-comment');
                } else {
                    commentToggleBtn.classList.remove('has-comment');
                }
            });
        });

        // Generate and Open Modal for Feedback Export Summary
        const triggerExportReport = function() {
            // Detect viewport category
            let currentView = "Desktop";
            const width = window.innerWidth;
            if (width < 600) {
                currentView = "Mobile";
            } else if (width < 992) {
                currentView = "Tablet";
            }

            // Detect device type
            let currentDevice = "Other";
            const ua = navigator.userAgent;
            if (/iPhone|iPad|iPod|Macintosh|MacIntel/i.test(ua)) {
                currentDevice = "Apple";
            } else if (/Android/i.test(ua)) {
                currentDevice = "Android";
            }

            let likedItems = [];
            let dislikedItems = [];
            let neutralItems = [];
            let unreviewedItems = [];
            
            let totalChecked = 0;
            
            categories.forEach(cat => {
                cat.items.forEach(item => {
                    const review = reviewStates[item.url] || { vote: null, comment: "" };
                    const isChecked = checklistStates[item.url];
                    
                    if (isChecked) totalChecked++;
                    
                    const itemData = {
                        name: item.name,
                        url: item.url,
                        category: cat.title,
                        checked: isChecked,
                        vote: review.vote,
                        comment: review.comment.trim()
                    };
                    
                    if (review.vote === 'like') {
                        likedItems.push(itemData);
                    } else if (review.vote === 'dislike') {
                        dislikedItems.push(itemData);
                    } else if (isChecked) {
                        neutralItems.push(itemData);
                    } else {
                        unreviewedItems.push(itemData);
                    }
                });
            });
            
            const percent = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;
            
            let textSummary = `==================================================
🛠️ A/C NOW LLC SITE REVIEW - FEEDBACK SUMMARY
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
==================================================\n\n`;

            textSummary += `📊 EXECUTIVE METRICS:\n`;
            textSummary += `  • Review Progress: ${totalChecked} of ${totalItems} pages reviewed (${percent}%)\n`;
            textSummary += `  • 👍 Approved / Keep: ${likedItems.length}\n`;
            textSummary += `  • ❌ Disliked / Remove: ${dislikedItems.length}\n`;
            textSummary += `  • ⏳ Pending Review: ${unreviewedItems.length} pages\n\n`;

            textSummary += `==================================================\n`;
            textSummary += `❌ DISLIKED / REQUEST TO REMOVE (${dislikedItems.length})\n`;
            textSummary += `==================================================\n`;
            if (dislikedItems.length === 0) {
                textSummary += `(No items voted for removal yet)\n\n`;
            } else {
                dislikedItems.forEach(item => {
                    textSummary += `• ${item.name} (${item.url})\n`;
                    textSummary += `  Category: ${item.category}\n`;
                    textSummary += `  Review Status: ${item.checked ? "✓ Checked" : "☐ Unchecked"}\n`;
                    if (item.comment) {
                        textSummary += `  💬 Feedback: "${item.comment}"\n`;
                    }
                    textSummary += `\n`;
                });
            }

            textSummary += `==================================================\n`;
            textSummary += `👍 APPROVED / KEEP (${likedItems.length})\n`;
            textSummary += `==================================================\n`;
            if (likedItems.length === 0) {
                textSummary += `(No approved items rated yet)\n\n`;
            } else {
                likedItems.forEach(item => {
                    textSummary += `• ${item.name} (${item.url})\n`;
                    textSummary += `  Category: ${item.category}\n`;
                    textSummary += `  Review Status: ${item.checked ? "✓ Checked" : "☐ Unchecked"}\n`;
                    if (item.comment) {
                        textSummary += `  💬 Feedback: "${item.comment}"\n`;
                    }
                    textSummary += `\n`;
                });
            }

            textSummary += `==================================================\n`;
            textSummary += `📝 REVIEWED - NEUTRAL / NO VOTE (${neutralItems.length})\n`;
            textSummary += `==================================================\n`;
            if (neutralItems.length === 0) {
                textSummary += `(No neutral reviewed pages)\n\n`;
            } else {
                neutralItems.forEach(item => {
                    textSummary += `• ${item.name} (${item.url})\n`;
                    textSummary += `  Category: ${item.category}\n`;
                    if (item.comment) {
                        textSummary += `  💬 Feedback: "${item.comment}"\n`;
                    }
                    textSummary += `\n`;
                });
            }

            textSummary += `==================================================\n`;
            textSummary += `⏳ PENDING REVIEW (${unreviewedItems.length})\n`;
            textSummary += `==================================================\n`;
            if (unreviewedItems.length === 0) {
                textSummary += `(All pages reviewed!)\n\n`;
            } else {
                let currentCat = "";
                unreviewedItems.forEach(item => {
                    if (item.category !== currentCat) {
                        currentCat = item.category;
                        textSummary += `\n[${currentCat}]\n`;
                    }
                    textSummary += `  - ${item.name} (${item.url})\n`;
                });
            }

            textSummary += `\n\n==================================================\n`;
            textSummary += `TECHNICAL DIAGNOSTICS:\n`;
            textSummary += `  • Active Phase Setting: Phase ${localStorage.getItem('acnow_phase') || '1'}\n`;
            textSummary += `  • Simulated Location: ${activeCity}\n`;
            textSummary += `  • View Mode: ${currentView} (${width}px)\n`;
            textSummary += `  • Device Type: ${currentDevice}\n`;
            textSummary += `  • Browser User Agent: ${navigator.userAgent}\n`;
            textSummary += `==================================================`;

            const overlay = document.createElement('div');
            overlay.id = 'acnow-dev-modal-overlay';
            
            const modal = document.createElement('div');
            modal.id = 'acnow-dev-modal';
            modal.innerHTML = `
                <h4>📋 Consolidated Review Feedback</h4>
                <p>Here is your aggregated page checklist ratings, comments, and recommendations. You can copy it to send over messages, or email the report directly to the developer.</p>
                <textarea id="modal-textarea" readonly>${textSummary.replace(/\\n/g, '\n')}</textarea>
                <div class="modal-btn-row">
                    <button class="modal-btn primary" id="modal-btn-copy">Copy to Clipboard</button>
                    <button class="modal-btn email" id="modal-btn-email">Email Report to Developer</button>
                    <button class="modal-btn cancel" id="modal-btn-close">Close</button>
                </div>
            `;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';

            const closeModal = () => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleEscape);
                document.removeEventListener('keydown', handleFocusTrap);
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                }
            };
            document.addEventListener('keydown', handleEscape);

            const focusable = modal.querySelectorAll('button, textarea');
            const firstFocusable = focusable[0];
            const lastFocusable = focusable[focusable.length - 1];
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 50);
            }

            const handleFocusTrap = (e) => {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            };
            document.addEventListener('keydown', handleFocusTrap);
            
            modal.querySelector('#modal-btn-close').addEventListener('click', closeModal);
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            modal.querySelector('#modal-btn-copy').addEventListener('click', function() {
                const textarea = modal.querySelector('#modal-textarea');
                textarea.select();
                document.execCommand('copy');
                this.innerHTML = "✓ Copied!";
                this.style.background = "#0b9e8a";
                setTimeout(() => {
                    this.innerHTML = "Copy to Clipboard";
                    this.style.background = "";
                }, 2000);
            });
            
            modal.querySelector('#modal-btn-email').addEventListener('click', function() {
                const recipient = "eleversity@me.com";
                const subject = `[A/C Now Review] Full Site Review Feedback Report`;
                const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textSummary.replace(/\\n/g, '\n'))}`;
                window.location.href = mailtoUrl;
            });
        };

        barContainer.querySelector('#btn-export-quick').addEventListener('click', triggerExportReport);
        barContainer.querySelector('#btn-export-feedback-bottom').addEventListener('click', triggerExportReport);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDevBar);
    } else {
        initDevBar();
    }
})();

// Hover link prefetching to pre-heat SWR/network caches on user hover
document.addEventListener('mouseover', (event) => {
    const link = event.target.closest('a');
    if (link && link.href && link.origin === window.location.origin) {
        const path = link.pathname;
        // Avoid caching restricted portal pages, calculators or pdfs
        if (!path.includes('members') && !path.includes('team-portal') && !path.includes('3d-airflow') && !path.includes('corrosion-predictor') && !path.endsWith('.pdf')) {
            if (!document.querySelector(`link[href="${link.href}"]`)) {
                const linkPrefetch = document.createElement('link');
                linkPrefetch.rel = 'prefetch';
                linkPrefetch.href = link.href;
                document.head.appendChild(linkPrefetch);
            }
        }
    }
}, { passive: true });

/**
 * Copies a promo code to the clipboard and handles interactive accessibility states.
 * @param {HTMLButtonElement} btnElement - The button clicked.
 * @param {string} textToCopy - The discount code text.
 */
window.copyCouponCode = function(btnElement, textToCopy) {
    if (!btnElement || !textToCopy) return;

    const originalHTML = btnElement.innerHTML;
    const announcer = document.getElementById('vet-copy-announcer');

    // Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => handleSuccess())
            .catch(() => handleFallback());
    } else {
        handleFallback();
    }

    function handleFallback() {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                handleSuccess();
            } else {
                console.error('Fallback copy command was unsuccessful');
            }
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textarea);
    }

    function handleSuccess() {
        btnElement.classList.add('copied');
        btnElement.innerHTML = `
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:1.1em; height:1.1em; color:#10B981; margin-right:4px;">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="copy-btn-text" style="color:#10B981; font-weight:700;">Copied!</span>
        `;
        btnElement.setAttribute('aria-label', `Discount code ${textToCopy} copied successfully`);

        if (typeof triggerSound === 'function' && window.ComfortAudio && !window.ComfortAudio.isMuted) {
            triggerSound('success');
        }

        if (announcer) {
            announcer.textContent = `Promo code ${textToCopy} copied to clipboard.`;
        }

        setTimeout(() => {
            btnElement.classList.remove('copied');
            btnElement.innerHTML = originalHTML;
            btnElement.setAttribute('aria-label', `Copy discount code ${textToCopy}`);
            if (announcer) announcer.textContent = '';
        }, 2000);
    }
};

/**
 * Verification state management for the veteran coupon in the footer.
 */
window.initVetCouponState = function() {
    const isVerified = localStorage.getItem('acnow_military_verified') === 'true';
    const lockedEl = document.getElementById('vet-coupon-locked');
    const unlockedEl = document.getElementById('vet-coupon-unlocked');
    const formEl = document.getElementById('vet-verification-form');
    
    if (isVerified) {
        if (lockedEl) lockedEl.style.display = 'none';
        if (formEl) formEl.style.display = 'none';
        if (unlockedEl) unlockedEl.style.display = 'flex';
    } else {
        if (lockedEl) lockedEl.style.display = 'flex';
        if (formEl) formEl.style.display = 'none';
        if (unlockedEl) unlockedEl.style.display = 'none';
    }
};

window.openVetVerification = function() {
    const lockedEl = document.getElementById('vet-coupon-locked');
    const formEl = document.getElementById('vet-verification-form');
    
    if (lockedEl && formEl) {
        lockedEl.style.display = 'none';
        formEl.style.display = 'flex';
        formEl.style.opacity = '0';
        setTimeout(() => formEl.style.opacity = '1', 10);
        if (typeof triggerSound === 'function') triggerSound('tick');
    }
};

window.onVetVerifyCheckboxChange = function(checkbox) {
    if (checkbox.checked) {
        localStorage.setItem('acnow_military_verified', 'true');
        const formEl = document.getElementById('vet-verification-form');
        const unlockedEl = document.getElementById('vet-coupon-unlocked');
        
        if (formEl && unlockedEl) {
            formEl.style.display = 'none';
            unlockedEl.style.display = 'flex';
            unlockedEl.style.opacity = '0';
            setTimeout(() => unlockedEl.style.opacity = '1', 10);
            
            if (typeof triggerSound === 'function') {
                triggerSound('success');
            }
        }
    }
};

// Auto-run on DOM load
document.addEventListener("DOMContentLoaded", () => {
    window.initVetCouponState();
    initGlobalSearchTrigger();
});

/* ==========================================================================
   SITE-WIDE SPOTLIGHT SEARCH SYSTEM
   ========================================================================== */

let searchIndexData = null;
let searchIndexLoading = false;
let activeHighlightIndex = -1;
let currentSearchResults = [];

// 1. Create and inject Search Modal HTML dynamically
function injectSearchSystem() {
    if (document.getElementById('search-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'search-modal';
    modal.className = 'search-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
        <div class="search-modal-card">
            <div class="search-input-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 20px; height: 20px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="search-input" placeholder="Search pages, cities, services, or tools..." autocomplete="off">
                <button class="search-close-btn" id="close-search-btn">ESC</button>
            </div>
            <div class="search-results-panel" id="search-results-panel">
                <div class="search-empty-state">Type a query above to search the site, or press <strong>ESC</strong> to close.</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const input = document.getElementById('search-input');
    const closeBtn = document.getElementById('close-search-btn');

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSearchModal();
    });
    closeBtn.addEventListener('click', closeSearchModal);

    input.addEventListener('input', (e) => {
        performSearch(e.target.value.trim());
    });

    input.addEventListener('keydown', handleSearchNavigation);
    input.addEventListener('focus', loadSearchIndex);
}

// 2. Load index asynchronously
async function loadSearchIndex() {
    if (searchIndexData || searchIndexLoading) return;
    searchIndexLoading = true;
    
    try {
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/').filter(Boolean);
        let depth = 0;
        if (pathParts.length > 0) {
            depth = pathParts.length - 1;
        }
        let prefix = '';
        for (let i = 0; i < depth; i++) {
            prefix += '../';
        }
        
        const response = await fetch(prefix + 'assets/data/search-index.json');
        if (!response.ok) throw new Error('Search index failed to load');
        searchIndexData = await response.json();
    } catch (err) {
        console.error('Failed to load search index:', err);
    } finally {
        searchIndexLoading = false;
    }
}

// 3. Search and scoring logic
function performSearch(query) {
    const resultsPanel = document.getElementById('search-results-panel');
    if (!resultsPanel) return;

    if (!query) {
        resultsPanel.innerHTML = '<div class="search-empty-state">Type a query above to search the site, or press <strong>ESC</strong> to close.</div>';
        currentSearchResults = [];
        activeHighlightIndex = -1;
        return;
    }

    if (!searchIndexData) {
        resultsPanel.innerHTML = '<div class="search-empty-state">Loading search index...</div>';
        loadSearchIndex().then(() => performSearch(query));
        return;
    }

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
        resultsPanel.innerHTML = '<div class="search-empty-state">Type a query above to search the site, or press <strong>ESC</strong> to close.</div>';
        currentSearchResults = [];
        activeHighlightIndex = -1;
        return;
    }

    const matchedResults = [];
    searchIndexData.forEach(doc => {
        let score = 0;
        const title = doc.title.toLowerCase();
        const headings = doc.headings.toLowerCase();
        const description = doc.description.toLowerCase();
        const body = doc.body.toLowerCase();
        
        let matchesAllTerms = true;
        
        terms.forEach(term => {
            let termScore = 0;
            if (title.includes(term)) {
                termScore += 100;
                if (title.startsWith(term)) termScore += 50;
            }
            if (headings.includes(term)) termScore += 40;
            if (description.includes(term)) termScore += 20;
            if (body.includes(term)) termScore += 5;
            
            if (termScore === 0) {
                matchesAllTerms = false;
            } else {
                score += termScore;
            }
        });
        
        if (matchesAllTerms && score > 0) {
            matchedResults.push({ doc, score });
        }
    });

    currentSearchResults = matchedResults.sort((a, b) => b.score - a.score).slice(0, 8);
    activeHighlightIndex = currentSearchResults.length > 0 ? 0 : -1;

    renderSearchResults(terms);
}

// 4. Render results list
function renderSearchResults(terms) {
    const resultsPanel = document.getElementById('search-results-panel');
    if (!resultsPanel) return;

    if (currentSearchResults.length === 0) {
        resultsPanel.innerHTML = '<div class="search-empty-state">No matches found for "<strong>' + escapeHTML(terms.join(' ')) + '</strong>".<br>Try checking spelling or search another service.</div>';
        return;
    }

    resultsPanel.innerHTML = '';
    currentSearchResults.forEach((result, idx) => {
        const doc = result.doc;
        const catInfo = getCategoryInfoForSearch(doc.id);
        const relativeUrl = getRelativeUrlForSearch(doc.id);
        const highlightedSnippet = highlightTextForSearch(doc.body || doc.description, terms);
        
        const item = document.createElement('a');
        item.href = relativeUrl;
        item.className = `search-result-item ${idx === activeHighlightIndex ? 'highlighted' : ''}`;
        item.innerHTML = `
            <div class="search-result-content">
                <h4 class="search-result-title">${escapeHTML(doc.title)}</h4>
                <p class="search-result-snippet">${highlightedSnippet}</p>
            </div>
            <span class="search-category-badge" style="background: ${catInfo.color};">${catInfo.label}</span>
        `;
        
        item.addEventListener('click', (e) => {
            closeSearchModal();
        });
        
        resultsPanel.appendChild(item);
    });
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
}

function getCategoryInfoForSearch(urlPath) {
    if (urlPath.includes('/planner') || urlPath.includes('/diagnose') || urlPath.includes('/configurator') || urlPath.includes('/storm-prep') || urlPath.includes('/3d-airflow')) {
        return { label: 'Interactive Tool', color: '#8B5CF6' };
    } else if (urlPath.includes('/hvac-services-') || urlPath.includes('/services') || urlPath.includes('/ac-') || urlPath.includes('/commercial') || urlPath.includes('/pool-heating')) {
        return { label: 'Service / Area', color: '#0B7A53' };
    } else if (urlPath.includes('/members')) {
        return { label: 'Members Area', color: '#F59E0B' };
    } else {
        return { label: 'Page', color: '#3B82F6' };
    }
}

function getRelativeUrlForSearch(targetId) {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(Boolean);
    
    let depth = 0;
    if (pathParts.length > 0) {
        depth = pathParts.length - 1;
    }
    
    let prefix = '';
    for (let i = 0; i < depth; i++) {
        prefix += '../';
    }
    
    let relativeTarget = targetId.substring(1);
    return prefix + relativeTarget;
}

function highlightTextForSearch(text, terms) {
    if (!text) return '';
    
    const escapedTerms = terms.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    
    let matchIdx = -1;
    for (const term of terms) {
        const idx = text.toLowerCase().indexOf(term.toLowerCase());
        if (idx !== -1 && (matchIdx === -1 || idx < matchIdx)) {
            matchIdx = idx;
        }
    }
    
    if (matchIdx !== -1) {
        const start = Math.max(0, matchIdx - 40);
        const end = Math.min(text.length, matchIdx + 100);
        let snippet = text.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';
        
        return escapeHTML(snippet).replace(regex, '<mark>$1</mark>');
    }
    
    return escapeHTML(text.substring(0, 100)) + (text.length > 100 ? '...' : '');
}

// 5. Open / Close controls
function openSearchModal() {
    injectSearchSystem();
    loadSearchIndex();
    
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    
    if (modal && input) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => input.focus(), 50);
        
        if (typeof triggerSound === 'function') {
            triggerSound('tick');
        }
    }
}

function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (input) {
            input.value = '';
        }
        performSearch('');
    }
}

// 6. Navigation support
function handleSearchNavigation(e) {
    if (currentSearchResults.length === 0) return;

    const items = document.querySelectorAll('#search-results-panel .search-result-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeHighlightIndex = (activeHighlightIndex + 1) % currentSearchResults.length;
        updateItemHighlight(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeHighlightIndex = (activeHighlightIndex - 1 + currentSearchResults.length) % currentSearchResults.length;
        updateItemHighlight(items);
    } else if (e.key === 'Enter') {
        if (activeHighlightIndex !== -1) {
            e.preventDefault();
            items[activeHighlightIndex].click();
        }
    }
}

function updateItemHighlight(items) {
    items.forEach((item, idx) => {
        if (idx === activeHighlightIndex) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}

// 7. Global key listeners
window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const modal = document.getElementById('search-modal');
        if (modal && modal.classList.contains('active')) {
            closeSearchModal();
        } else {
            openSearchModal();
        }
    }
    
    if (e.key === 'Escape') {
        const modal = document.getElementById('search-modal');
        if (modal && modal.classList.contains('active')) {
            closeSearchModal();
        }
    }
});

// 8. Add header trigger
function initGlobalSearchTrigger() {
    const nav = document.getElementById('primary-nav');
    if (nav && !nav.querySelector('.nav-search-trigger')) {
        const searchTrigger = document.createElement('a');
        searchTrigger.href = '#';
        searchTrigger.className = 'nav-link nav-search-trigger';
        searchTrigger.setAttribute('aria-label', 'Open site search');
        searchTrigger.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 1.15em; height: 1.15em; display: inline-block; vertical-align: middle; margin-right: 5px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search
        `;
        searchTrigger.style.cursor = 'pointer';
        searchTrigger.style.display = 'inline-flex';
        searchTrigger.style.alignItems = 'center';
        
        searchTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openSearchModal();
        });
        
        nav.appendChild(searchTrigger);
    }
}

