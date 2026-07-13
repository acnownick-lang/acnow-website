document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("duct-slider");
    const label = document.getElementById("duct-slider-lbl");
    
    const dirtTop = document.getElementById("duct-dirt-top");
    const dirtBottom = document.getElementById("duct-dirt-bottom");
    const spores = document.getElementById("duct-spores");
    const airflow = document.getElementById("duct-airflow");
    
    const outRestrict = document.getElementById("duct-restrict");
    const outAllergen = document.getElementById("duct-allergen");

    if (!slider || !label) {
        console.warn("[PWA Client] Duct Simulator elements missing. Skipping initialization.");
        return;
    }

    slider.addEventListener("input", () => {
        const val = parseInt(slider.value);
        updateDuctSimulator(val);
        
        if (window.ComfortAudio && typeof window.ComfortAudio.playTick === "function") {
            window.ComfortAudio.playTick();
        }
    });

    function updateDuctSimulator(val) {
        // Label
        label.textContent = val === 0 ? "0 Years (Clean)" : `${val} Years Neglected`;
        label.style.color = val === 0 ? "#10B981" : (val <= 3 ? "#F59E0B" : "#EF4444");

        // SVG updates
        if (dirtTop && dirtBottom) {
            // dirt opacity: 0 at 0 years, scales up to 0.95 at 10 years
            const op = val === 0 ? 0.0 : (0.15 + (val / 10) * 0.8);
            dirtTop.setAttribute("opacity", op.toString());
            dirtBottom.setAttribute("opacity", op.toString());
            
            // dirt thickness: scales from 2px up to 14px
            const thickness = val === 0 ? 2 : Math.min(14, 2 + val * 1.2);
            dirtTop.setAttribute("height", thickness.toString());
            
            // bottom dirt needs to shift y-axis up as it thickens
            const bottomY = 65 - thickness;
            dirtBottom.setAttribute("y", bottomY.toString());
            dirtBottom.setAttribute("height", thickness.toString());
        }

        if (spores) {
            // Spore visibility
            const opSpores = val === 0 ? 0.0 : (0.2 + (val / 10) * 0.8);
            spores.setAttribute("opacity", opSpores.toString());
        }

        if (airflow) {
            // Airflow choking effect: blue line thins out and shifts towards grey
            const thickness = Math.max(1.2, 4.0 - (val * 0.28));
            airflow.setAttribute("stroke-width", thickness.toString());
            
            if (val === 0) {
                airflow.setAttribute("stroke", "#60A5FA"); // bright clean blue
            } else if (val <= 3) {
                airflow.setAttribute("stroke", "#93C5FD"); // pale blue
            } else if (val <= 7) {
                airflow.setAttribute("stroke", "#CBD5E1"); // slate grey
            } else {
                airflow.setAttribute("stroke", "#64748B"); // choked dark grey
            }
        }

        // Metrics output updates
        if (val === 0) {
            outRestrict.textContent = "0% (Optimum Flow)";
            outRestrict.style.color = "#10B981";
            outAllergen.textContent = "Low / Clean Air";
            outAllergen.style.color = "#10B981";
        } else if (val <= 3) {
            const rest = val * 6;
            outRestrict.textContent = `${rest}% Restriction`;
            outRestrict.style.color = "#F59E0B";
            outAllergen.textContent = "Moderate Pet Dander";
            outAllergen.style.color = "#F59E0B";
        } else if (val <= 7) {
            const rest = Math.round(18 + (val - 3) * 6.5);
            outRestrict.textContent = `${rest}% Restriction`;
            outRestrict.style.color = "#EF4444";
            outAllergen.textContent = "High Allergen Count";
            outAllergen.style.color = "#EF4444";
        } else {
            const rest = Math.round(44 + (val - 7) * 7);
            outRestrict.textContent = `${rest}% (Choked Duct)`;
            outRestrict.style.color = "#EF4444";
            outAllergen.textContent = "Critical Mold Spores";
            outAllergen.style.color = "#EF4444";
        }
    }

    // Run initially
    updateDuctSimulator(0);
});
