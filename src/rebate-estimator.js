document.addEventListener("DOMContentLoaded", () => {
    // Inputs (Container wrappers)
    const seerContainer = document.getElementById("rebate-seer");
    const heatingContainer = document.getElementById("rebate-heating");
    const discContainer = document.getElementById("rebate-disc");

    // Outputs
    const valTax = document.getElementById("val-fed-credit");
    const valFpl = document.getElementById("val-fpl-rebate");
    const valSpecial = document.getElementById("val-disc");
    const valTotal = document.getElementById("val-total-incentive");

    if (!seerContainer || !heatingContainer || !discContainer || !valTax || !valFpl || !valSpecial || !valTotal) {
        console.warn("[PWA Client] Rebate Estimator elements missing. Skipping initialization.");
        return;
    }

    let seerValue = 16.0; // default active button
    let equipClass = "heatpump"; // default active button
    let discountType = "standard"; // default active button

    // Helper functions for audio feedback
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

    // Setup active listeners for SEER toggle buttons
    const seerButtons = seerContainer.querySelectorAll(".toggle-btn");
    seerButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            seerButtons.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            seerValue = parseFloat(btn.dataset.val) || 16.0;
            updateRebates();
            playClickSound();
        });
    });

    // Setup active listeners for heating toggle buttons
    const heatingButtons = heatingContainer.querySelectorAll(".toggle-btn");
    heatingButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            heatingButtons.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            equipClass = btn.dataset.val;
            updateRebates();
            playClickSound();
        });
    });

    // Setup active listeners for client discounts toggle buttons
    const discButtons = discContainer.querySelectorAll(".toggle-btn");
    discButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            discButtons.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            discountType = btn.dataset.val;
            updateRebates();
            playClickSound();
        });
    });

    function updateRebates() {
        let taxCredit = 0;
        let fplRebate = 0;
        let specialDiscount = 0;

        // 1. Equipment class and SEER rating calculations
        if (equipClass === "heatpump") {
            // Heat pump federal credit: Capped at $2,000 for qualifying tier (>= 15.2 SEER2)
            if (seerValue >= 17.5) {
                taxCredit = 2000;
                fplRebate = 350; // Higher incentive for ultra-high efficiency inverter
            } else if (seerValue >= 15.2) {
                taxCredit = 2000;
                fplRebate = 200; // FPL utility flat rebate
            } else if (seerValue >= 14.3) {
                taxCredit = 0;
                fplRebate = 150; // standard flat utility rebate
            } else {
                taxCredit = 0;
                fplRebate = 0;
            }
        } else {
            // Straight Cool AC federal credit: Capped at $600 under Section 25C CEE tier (>= 16.0 SEER2)
            if (seerValue >= 17.5) {
                taxCredit = 600;
                fplRebate = 300; // Higher rebate for ultra-high straight cool inverter
            } else if (seerValue >= 16.0) {
                taxCredit = 600;
                fplRebate = 200;
            } else if (seerValue >= 15.2) {
                taxCredit = 0;
                fplRebate = 150;
            } else {
                taxCredit = 0;
                fplRebate = 0;
            }
        }

        // 2. Client Discount calculations (Base system cost averages $7,500)
        if (discountType === "military") {
            specialDiscount = 375; // 5% military discount
        } else if (discountType === "club") {
            specialDiscount = 150; // flat comfort club member discount
        } else {
            specialDiscount = 0;
        }

        const totalSavings = taxCredit + fplRebate + specialDiscount;

        // 3. Update DOM display
        valTax.textContent = taxCredit > 0 ? `$${taxCredit.toLocaleString()}` : "$0";
        valFpl.textContent = fplRebate > 0 ? `$${fplRebate.toLocaleString()}` : "$0";
        valSpecial.textContent = specialDiscount > 0 ? `$${specialDiscount.toLocaleString()}` : "$0";
        valTotal.textContent = totalSavings > 0 ? `$${totalSavings.toLocaleString()}` : "$0";
    }

    // Initialize values based on initially active buttons and set ARIA states
    seerButtons.forEach(b => b.setAttribute("aria-pressed", b.classList.contains("active") ? "true" : "false"));
    const activeSeer = seerContainer.querySelector(".toggle-btn.active");
    if (activeSeer) seerValue = parseFloat(activeSeer.dataset.val) || 16.0;

    heatingButtons.forEach(b => b.setAttribute("aria-pressed", b.classList.contains("active") ? "true" : "false"));
    const activeHeating = heatingContainer.querySelector(".toggle-btn.active");
    if (activeHeating) equipClass = activeHeating.dataset.val;

    discButtons.forEach(b => b.setAttribute("aria-pressed", b.classList.contains("active") ? "true" : "false"));
    const activeDisc = discContainer.querySelector(".toggle-btn.active");
    if (activeDisc) discountType = activeDisc.dataset.val;

    updateRebates();
});
