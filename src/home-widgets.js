document.addEventListener("DOMContentLoaded", () => {
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

        let cachedRect = null;

        const updateSlider = (clientX) => {
            if (!cachedRect) cachedRect = sliderContainer.getBoundingClientRect();
            let position = ((clientX - cachedRect.left) / cachedRect.width) * 100;
            setSliderPosition(position);
        };

        const handleMouseMove = (e) => {
            updateSlider(e.clientX);
        };
        const handleTouchMove = (e) => {
            if (e.touches && e.touches[0]) {
                updateSlider(e.touches[0].clientX);
            }
        };

        const startDragging = (e) => { 
            isDragging = true; 
            cachedRect = sliderContainer.getBoundingClientRect();
            if (e.type === 'mousedown') {
                window.addEventListener("mousemove", handleMouseMove);
            } else {
                window.addEventListener("touchmove", handleTouchMove, { passive: true });
            }
        };
        const stopDragging = () => { 
            isDragging = false; 
            cachedRect = null;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchmove", handleTouchMove);
        };

        // Mouse Events
        handle.addEventListener("mousedown", startDragging);
        window.addEventListener("mouseup", stopDragging);

        // Touch Events (Mobile)
        handle.addEventListener("touchstart", startDragging, { passive: true });
        window.addEventListener("touchend", stopDragging);

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

                tabButtons.forEach(b => {
                    b.classList.remove("active");
                    b.setAttribute('aria-selected', 'false');
                    b.setAttribute('tabindex', '0');
                });
                btn.classList.add("active");
                btn.setAttribute('aria-selected', 'true');
                btn.setAttribute('tabindex', '0');

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
});
