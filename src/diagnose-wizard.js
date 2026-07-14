function initDiagnoseWizard() {
    // DOM Elements
    const stepSymptom = document.getElementById("step-symptom");
    const stepChecklist = document.getElementById("step-checklist");
    const stepResults = document.getElementById("step-results");
    
    const wizardProgress = document.getElementById("wizard-progress");
    const stepLabel = document.getElementById("step-label");
    const stepPercent = document.getElementById("step-percent");
    
    const btnNextSymptom = document.getElementById("btn-next-symptom");
    const btnNextChecklist = document.getElementById("btn-next-checklist");
    const btnBackChecklist = document.getElementById("btn-back-checklist");
    const btnBackResults = document.getElementById("btn-back-results");
    
    const optionCards = document.querySelectorAll(".option-card");
    const checklistContainer = document.getElementById("checklist-items-container");
    const resultsContainer = document.getElementById("results-container");
    
    const diagnoseForm = document.getElementById("diagnose-lead-form");
    const diagSummaryInput = document.getElementById("diag_summary_input");

    if (!stepSymptom || !stepChecklist || !stepResults || !btnNextSymptom) {
        console.warn("[PWA Client] Diagnose Wizard elements missing. Skipping initialization.");
        return;
    }

    let selectedSymptom = "";
    
    const CHECKLISTS = {
        "warm-air": [
            {
                id: "warm_thermostat",
                title: "Check Thermostat Settings",
                desc: "Ensure the thermostat mode is set to 'COOL' and the fan is set to 'AUTO'. (If set to 'FAN ON', it will blow warm air constantly even when the compressor is off.)",
                diy: true
            },
            {
                id: "warm_filter",
                title: "Inspect Air Filter",
                desc: "Check if the return air filter is dark, clogged, or dusty. A restricted filter suffocates the system and stops cold air circulation.",
                diy: true
            },
            {
                id: "warm_condenser",
                title: "Inspect Outdoor Condenser Unit",
                desc: "Go outside and check if the condenser fan is spinning and blowing warm air out. If the fan is silent or blowing cool air, the compressor is not running.",
                diy: false
            }
        ],
        "no-power": [
            {
                id: "power_thermostat",
                title: "Is the Thermostat Screen Blank?",
                desc: "If the screen has no display, your thermostat batteries might be dead. Replace them with fresh AA or AAA batteries and check if the system starts.",
                diy: true
            },
            {
                id: "power_breaker",
                title: "Inspect Circuit Breaker",
                desc: "Locate your electrical breaker panel. Check if the switches labeled 'A/C', 'Condenser', or 'Furnace' have tripped to the middle 'OFF' position.",
                diy: true
            },
            {
                id: "power_float",
                title: "Check Indoor Condensate Drain Pan",
                desc: "Look at the emergency drain pan under the indoor air handler. If it is full of water, the safety float switch has triggered and cut power to protect your ceiling.",
                diy: false
            }
        ],
        "frozen": [
            {
                id: "frozen_filter",
                title: "Inspect return air filter",
                desc: "A clogged air filter is the #1 cause of frozen evaporator coils. Turn the system completely OFF immediately to let it thaw, and swap the dirty filter.",
                diy: true
            },
            {
                id: "frozen_vents",
                title: "Are any indoor supply vents closed?",
                desc: "Ensure at least 80% of your indoor register vents are completely open. Restricting vents stops airflow, dropping coil temperatures to freezing levels.",
                diy: true
            }
        ],
        "water-leak": [
            {
                id: "leak_pan",
                title: "Is the primary drain pan overflowing?",
                desc: "Turn your system OFF immediately to prevent structural ceiling damage. Look inside the emergency pan below the unit—is it filled with rusty water?",
                diy: false
            },
            {
                id: "leak_switch",
                title: "Do you have an active float switch?",
                desc: "Inspect the primary drain pipe. If you see a small T-joint switch wired into the unit (an AquaBlock condensate float switch), it should shut the system down if clogged.",
                diy: false
            }
        ],
        "noises": [
            {
                id: "noise_fan",
                title: "Is it a metal-on-metal squeal or screech?",
                desc: "Turn the system OFF. This indicates a failing blower motor bearing or a slipping fan belt, which requires direct professional replacement.",
                diy: false
            },
            {
                id: "noise_rattle",
                title: "Is it a heavy banging or clanking?",
                desc: "Turn the system OFF. This suggests a loose fan blade, debris in the housing, or a failing compressor piston inside the outdoor unit.",
                diy: false
            }
        ]
    };

    // Step 1: Select Option Card
    optionCards.forEach(card => {
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.addEventListener("click", () => {
            optionCards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            selectedSymptom = card.dataset.symptom;
            btnNextSymptom.removeAttribute("disabled");
            sessionStorage.setItem("diag_selected_symptom", selectedSymptom);
            sessionStorage.setItem("diag_step", "symptom");
            
            // Play click audio if initialized (Round 4 Web Audio)
            if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
                window.ComfortAudio.playClick();
            }
        });
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                card.click();
            }
        });
    });

    // Step 1 -> Step 2: Render Checklist
    btnNextSymptom.addEventListener("click", () => {
        if (!selectedSymptom) return;
        
        // Build checklist items
        checklistContainer.innerHTML = "";
        const checks = CHECKLISTS[selectedSymptom];
        
        checks.forEach(check => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "check-item";
            itemDiv.innerHTML = `
                <div class="check-item-header">
                    <input type="checkbox" id="${check.id}" class="wizard-check" data-diy="${check.diy}">
                    <div class="check-item-text">
                        <label for="${check.id}">
                            <h4 style="cursor:pointer;">${check.title}</h4>
                        </label>
                        <p>${check.desc}</p>
                    </div>
                </div>
            `;
            checklistContainer.appendChild(itemDiv);
            
            const box = itemDiv.querySelector(".wizard-check");
            box.addEventListener("change", () => {
                const checkedIds = [];
                document.querySelectorAll(".wizard-check").forEach(b => {
                    if (b.checked) checkedIds.push(b.id);
                });
                sessionStorage.setItem("diag_checked_boxes", JSON.stringify(checkedIds));
            });
        });

        // Set Progress
        stepSymptom.classList.remove("active");
        stepChecklist.classList.add("active");
        wizardProgress.style.width = "50%";
        stepLabel.textContent = "Step 2: DIY Checkpoints";
        stepPercent.textContent = "50% Complete";
        sessionStorage.setItem("diag_step", "checklist");

        if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
            window.ComfortAudio.playClick();
        }
    });

    // Step 2 Back -> Step 1
    btnBackChecklist.addEventListener("click", () => {
        stepChecklist.classList.remove("active");
        stepSymptom.classList.add("active");
        wizardProgress.style.width = "0%";
        stepLabel.textContent = "Step 1: Choose Your Symptom";
        stepPercent.textContent = "0% Complete";
        sessionStorage.setItem("diag_step", "symptom");
        sessionStorage.removeItem("diag_checked_boxes");

        if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
            window.ComfortAudio.playClick();
        }
    });

    // Step 2 -> Step 3: Analyze & Show Results
    btnNextChecklist.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll(".wizard-check");
        let diyCheckedCount = 0;
        let totalDiyCount = 0;
        let checkedDetails = [];

        checkboxes.forEach(box => {
            const labelText = box.closest(".check-item-header").querySelector("h4").textContent;
            const isChecked = box.checked;
            checkedDetails.push(`${labelText}: ${isChecked ? "YES" : "NO"}`);
            
            const isDiy = box.dataset.diy === "true";
            if (isDiy) {
                totalDiyCount++;
                if (isChecked) {
                    diyCheckedCount++;
                }
            }
        });

        // Generate Diagnostic Summary for input payload
        const symptomName = document.querySelector(`.option-card[data-symptom="${selectedSymptom}"] h4`).textContent;
        diagSummaryInput.value = `[Symptom: ${symptomName}] [Checks Run: ${checkedDetails.join(" | ")}]`;
        sessionStorage.setItem("diag_step", "results");
        
        let resultHtml = "";
        let speechText = "";

        if (diyCheckedCount > 0) {
            resultHtml = `
                <div class="diy-box">
                    <h4><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Potential Simple Fix Identified!</h4>
                    <p style="font-size:14px; color:#065f46; line-height:1.6; margin-bottom:10px;">Based on your check, you identified a common homeowner issue (e.g. dirty filter, batteries, or breaker reset). Try resolving these items first!</p>
                    <ul style="padding-left:20px; font-size:13px; color:#065f46; line-height:1.6; margin-bottom: 0;">
                        <li><strong>Swap Filter:</strong> Replace clogged filters with a clean MERV 8 or 11 filter.</li>
                        <li><strong>Batteries:</strong> Install brand new alkaline AA/AAA batteries in your thermostat.</li>
                        <li><strong>Breaker Check:</strong> Flip the breaker fully to 'OFF' and then back to 'ON'.</li>
                    </ul>
                </div>
            `;
            speechText = "Potential simple fix identified. Based on your check, you found a common homeowner issue. Try swapping your dirty air filters, installing fresh AA batteries in the thermostat, or resetting the main circuit breakers first.";
        } else {
            resultHtml = `
                <div class="diag-box">
                    <h4><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:1.2em;height:1.2em;color:#991b1b;margin-right:8px;vertical-align:middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Professional Dispatch Recommended</h4>
                    <p style="font-size:14px; color:#991b1b; line-height:1.6; margin-bottom: 0;">You have cleared the simple home checks, but the symptom persists. This indicates a technical component issue (e.g. refrigerant leak, electrical failure, or bad motor capacitor).</p>
                </div>
            `;
            speechText = "Professional dispatch recommended. You have cleared the simple home checks, but the symptom persists. This indicates a technical component issue such as a refrigerant leak or electrical contactor failure. We recommend booking Sean or Chris for an on-site inspection.";
        }

        // Voice Assistant HTML Widget
        const voiceWidgetHtml = `
            ${resultHtml}
            
            <div style="margin-top: 20px; background: var(--light); border: 1px solid var(--gray-light); padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 15px; flex-wrap: wrap;">
                <div>
                    <h5 style="margin:0 0 4px 0; font-size:13.5px; font-weight:700; color:var(--dark);">Voice Diagnostic Assist</h5>
                    <p style="margin:0; font-size:11.5px; color:var(--gray-dark);">Listen to your step-by-step diagnostic report.</p>
                </div>
                <button type="button" id="btn-speak-results" style="background:var(--primary); color:white; border:none; border-radius:8px; padding:10px 16px; font-weight:700; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='none'">
                    <span id="voice-btn-icon">🔊</span> Listen Now
                </button>
            </div>
            
            <div id="audio-wave-wrap" style="display:none; justify-content:center; align-items:center; gap:4px; margin-top: 15px; height: 25px;">
                <span style="width:3px; height:12px; background:var(--primary); border-radius:99px; transform-origin:center; animation: wave-bounce 0.8s ease-in-out infinite alternate;"></span>
                <span style="width:3px; height:22px; background:var(--primary); border-radius:99px; transform-origin:center; animation: wave-bounce 0.8s ease-in-out infinite alternate 0.15s;"></span>
                <span style="width:3px; height:10px; background:var(--primary); border-radius:99px; transform-origin:center; animation: wave-bounce 0.8s ease-in-out infinite alternate 0.3s;"></span>
                <span style="width:3px; height:18px; background:var(--primary); border-radius:99px; transform-origin:center; animation: wave-bounce 0.8s ease-in-out infinite alternate 0.45s;"></span>
            </div>
            
            <style>
            @keyframes wave-bounce {
                0% { transform: scaleY(0.4); }
                100% { transform: scaleY(1.3); }
            }
            </style>
        `;

        resultsContainer.innerHTML = voiceWidgetHtml;

        // Speech synthesis triggers
        const btnSpeak = document.getElementById("btn-speak-results");
        const waveWrap = document.getElementById("audio-wave-wrap");
        const btnIcon = document.getElementById("voice-btn-icon");

        let speechUtterance = null;

        if (btnSpeak) {
            btnSpeak.addEventListener("click", () => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                    resetSpeechUI();
                } else {
                    window.speechSynthesis.cancel(); // safety clear
                    
                    speechUtterance = new SpeechSynthesisUtterance(speechText);
                    
                    speechUtterance.onstart = () => {
                        waveWrap.style.display = "flex";
                        btnSpeak.innerHTML = `<span>⏹️</span> Stop Voice`;
                    };
                    
                    speechUtterance.onend = () => {
                        resetSpeechUI();
                    };

                    speechUtterance.onerror = () => {
                        resetSpeechUI();
                    };

                    window.speechSynthesis.speak(speechUtterance);
                }
            });
        }

        function resetSpeechUI() {
            if (waveWrap) waveWrap.style.display = "none";
            if (btnSpeak) btnSpeak.innerHTML = `<span>🔊</span> Listen Now`;
        }

        // Transition Step
        stepChecklist.classList.remove("active");
        stepResults.classList.add("active");
        wizardProgress.style.width = "100%";
        stepLabel.textContent = "Step 3: Diagnostics & Booking";
        stepPercent.textContent = "100% Complete";

        if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
            window.ComfortAudio.playClick();
        }
    });

    // Step 3 Back -> Step 2
    btnBackResults.addEventListener("click", () => {
        window.speechSynthesis.cancel(); // Mute any speaking voice
        stepResults.classList.remove("active");
        stepChecklist.classList.add("active");
        wizardProgress.style.width = "50%";
        stepLabel.textContent = "Step 2: DIY Checkpoints";
        stepPercent.textContent = "50% Complete";
        sessionStorage.setItem("diag_step", "checklist");

        if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
            window.ComfortAudio.playClick();
        }
    });

    // Submit Lead hook
    if (diagnoseForm) {
        diagnoseForm.addEventListener("submit", (e) => {
            const nameVal = document.getElementById("fullname_diag").value.trim();
            const nameParts = nameVal.split(" ");
            const fname = nameParts[0] || "";
            const lname = nameParts.slice(1).join(" ") || "Customer";
            const reservedSlot = diagnoseForm.querySelector("input[name='reserved_appointment_slot']") ? diagnoseForm.querySelector("input[name='reserved_appointment_slot']").value : "None";

            const payload = {
                fname,
                lname,
                "w-name": nameVal,
                "ac-issue": "diagnose-wizard",
                tel: document.getElementById("phone_diag").value.trim(),
                email: document.getElementById("email_diag").value.trim(),
                city: document.getElementById("city_diag").value.trim(),
                message: `[Interactive Troubleshooter Report] ${diagSummaryInput.value} [Reserved Slot] ${reservedSlot} [Notes] ${document.getElementById("notes_diag").value.trim()}`,
                honeypot: document.getElementById("honeypot_diag").value
            };

            // Call global sync submission wrapper
            if (typeof window.submitFormWithSync === "function") {
                window.submitFormWithSync(e, diagnoseForm, payload, () => {
                    if (typeof window.showToast === "function") { window.showToast("Diagnostics secured! Technicians Chris or Sean will call you within 15 minutes.", "success"); } else { alert("Diagnostics secured! Technicians Chris or Sean will call you within 15 minutes."); }
                    diagnoseForm.reset();
                    // Clear sessionStorage states
                    sessionStorage.removeItem("diag_selected_symptom");
                    sessionStorage.removeItem("diag_step");
                    sessionStorage.removeItem("diag_checked_boxes");
                    
                    // Reset wizard to Step 1
                    stepResults.classList.remove("active");
                    stepSymptom.classList.add("active");
                    optionCards.forEach(c => c.classList.remove("selected"));
                    btnNextSymptom.setAttribute("disabled", "true");
                    wizardProgress.style.width = "33%";
                    stepLabel.textContent = "Step 1: Choose Your Symptom";
                    stepPercent.textContent = "33% Complete";
                    
                    if (typeof window.configurePushNotifications === "function") {
                        window.configurePushNotifications();
                    }
                });
            } else {
                console.error("submitFormWithSync not found in global scope");
            }
        });
    }

    // DIY Condensate Flush Checklist Logic
    const flushCheckboxes = document.querySelectorAll(".flush-check");
    const safetyStatus = document.getElementById("flush-safety-status");
    const safetyBadge = document.getElementById("flush-safety-badge");

    if (flushCheckboxes.length > 0 && safetyStatus && safetyBadge) {
        function updateFlushSafety() {
            let checkedCount = 0;
            flushCheckboxes.forEach(cb => {
                if (cb.checked) checkedCount++;
            });

            if (checkedCount === 4) {
                safetyStatus.textContent = "🟢 Operational & Safe (System Ok)";
                safetyStatus.style.color = "#10B981";
                safetyBadge.textContent = "100% SECURE";
                safetyBadge.style.background = "#10B981";
            } else {
                const percent = checkedCount * 25;
                safetyStatus.textContent = `⚠️ Warning: Potential Water Overflow Block (${100 - percent}% Risk)`;
                safetyStatus.style.color = "#F59E0B";
                safetyBadge.textContent = `${percent}% DONE`;
                safetyBadge.style.background = "#F59E0B";
            }
        }

        flushCheckboxes.forEach(cb => {
            cb.addEventListener("change", () => {
                updateFlushSafety();
                if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
                    window.ComfortAudio.playClick();
                }
            });
        });

        // Init
        updateFlushSafety();
    }

    // Restore from sessionStorage on load
    try {
        const savedSymptom = sessionStorage.getItem("diag_selected_symptom");
        const savedStep = sessionStorage.getItem("diag_step");
        if (savedSymptom) {
            selectedSymptom = savedSymptom;
            const card = document.querySelector(`.option-card[data-symptom="${selectedSymptom}"]`);
            if (card) {
                card.classList.add("selected");
                btnNextSymptom.removeAttribute("disabled");
            }
        }
        if (savedStep === "checklist" && selectedSymptom) {
            btnNextSymptom.click();
            const savedChecks = JSON.parse(sessionStorage.getItem("diag_checked_boxes") || "[]");
            savedChecks.forEach(id => {
                const cb = document.getElementById(id);
                if (cb) cb.checked = true;
            });
        } else if (savedStep === "results" && selectedSymptom) {
            btnNextSymptom.click();
            const savedChecks = JSON.parse(sessionStorage.getItem("diag_checked_boxes") || "[]");
            savedChecks.forEach(id => {
                const cb = document.getElementById(id);
                if (cb) cb.checked = true;
            });
            btnNextChecklist.click();
        }
    } catch (e) {
        console.warn("[PWA Client] Failed to restore sessionStorage wizard state:", e);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDiagnoseWizard);
} else {
    initDiagnoseWizard();
}

