function initCalendarWidget() {
    const calendarContainer = document.getElementById("dispatch-calendar-container");
    if (!calendarContainer) return;

    // Get current date and hour in Florida/Eastern Time
    const etOptions = { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hour12: false };
    const formatter = new Intl.DateTimeFormat("en-US", etOptions);
    const parts = formatter.formatToParts(new Date());
    const etDate = {};
    parts.forEach(p => { etDate[p.type] = p.value; });
    
    const etYear = parseInt(etDate.year);
    const etMonth = parseInt(etDate.month) - 1; // 0-indexed
    const etDay = parseInt(etDate.day);
    const etHour = parseInt(etDate.hour);
    
    const todayFlorida = new Date(etYear, etMonth, etDay);
    const dayOfWeekOfToday = todayFlorida.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Generate Next 5 Weekdays (Monday - Friday) starting tomorrow (timezone-safe)
    function getNextWeekdays() {
        const weekdays = [];
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Establish today in Eastern Time
        let current = new Date(etYear, etMonth, etDay);
        
        // Shift to tomorrow to ensure advance bookings
        current.setDate(current.getDate() + 1);

        while (weekdays.length < 5) {
            const dayNum = current.getDay();
            if (dayNum !== 0 && dayNum !== 6) { // skip Saturday, Sunday
                const dayName = daysOfWeek[dayNum];
                const dateStr = `${dayName}, ${months[current.getMonth()]} ${current.getDate()}`;
                weekdays.push(dateStr);
            }
            current.setDate(current.getDate() + 1);
        }
        return weekdays;
    }

    const weekdays = getNextWeekdays();
    let selectedSlot = "";

    // Build grid structure
    let html = `
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size: 12.5px; color: var(--gray-dark); margin: 0 0 15px 0; line-height: 1.5;">
                Reserve a priority time window. Our team will call to confirm as soon as possible.<br>
                <strong style="color: #d01818; font-size: 13px; font-weight: 800; display: block; margin-top: 8px; padding: 10px 12px; background: rgba(208, 24, 24, 0.05); border-left: 3px solid #d01818; border-radius: 4px; line-height: 1.4;">
                    ⚠️ Same-day appointments cannot be booked online. Please call our office directly at <a href="tel:7725213568" style="color: #d01818; text-decoration: underline;">(772) 521-3568</a> for immediate response.
                </strong>
            </p>
            
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
    `;

    // 1. Render Days Column Headers
    weekdays.forEach((day, index) => {
        const parts = day.split(", ");
        
        // Determine if this business day's slots are actually unavailable based on cutoff rules:
        // - For index 0 (first column/next business day):
        //   - If today is Saturday (6) or Sunday (0) ➔ Monday is not available.
        //   - If today is a weekday and it is past 5:00 PM (etHour >= 17) ➔ tomorrow is not available.
        let isDayAvailable = true;
        if (index === 0) {
            if (dayOfWeekOfToday === 6 || dayOfWeekOfToday === 0) {
                isDayAvailable = false;
            } else if (etHour >= 17) {
                isDayAvailable = false;
            }
        }

        html += `
            <div class="calendar-day-col" style="flex: 1 0 85px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${parts[0].substring(0, 3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${parts[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

        // 3 Slots per day
        const slotTimes = ["Morning (8am-12)", "Afternoon (12-4)", "Evening (4-8)"];
        slotTimes.forEach((time, slotIdx) => {
            if (!isDayAvailable) {
                html += `
                    <div style="background: #FEE2E2; color: #9B1C1C; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: not-allowed;" title="Slot booked by another customer">
                        Booked
                    </div>
                `;
            } else {
                const idVal = `${day} - ${time}`;
                html += `
                    <button type="button" class="cal-slot-btn" data-slot="${idVal}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
                        ${time.split(" ")[0]}
                    </button>
                `;
            }
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
        <div id="calendar-feedback-box" style="display: none; background: rgba(11, 99, 229, 0.04); border: 1px solid rgba(11, 99, 229, 0.1); padding: 12px 15px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; animation: fadeIn 0.2s ease;">
            Selected Appointment: <strong id="cal-selected-txt" style="color: var(--primary);">None</strong><br>
            Assigned Technician: <strong id="cal-tech-txt" style="color: var(--dark);">TBD</strong>
        </div>
    `;

    calendarContainer.innerHTML = html;

    // Attach Click Events to available slot buttons
    const slotBtns = calendarContainer.querySelectorAll(".cal-slot-btn");
    const feedbackBox = document.getElementById("calendar-feedback-box");
    const selectedTxt = document.getElementById("cal-selected-txt");
    const techTxt = document.getElementById("cal-tech-txt");

    // Find or create hidden input in target forms
    const parentForm = calendarContainer.closest("form");
    let hiddenInput = null;
    if (parentForm) {
        hiddenInput = parentForm.querySelector("input[name='reserved_appointment_slot']");
        if (!hiddenInput) {
            hiddenInput = document.createElement("input");
            hiddenInput.type = "hidden";
            hiddenInput.name = "reserved_appointment_slot";
            parentForm.appendChild(hiddenInput);
        }
    }

    slotBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            // Reset styles
            slotBtns.forEach(b => {
                b.dataset.selected = "false";
                b.style.background = "var(--white)";
                b.style.color = "#03543F";
                b.style.borderColor = "#A7F3D0";
            });

            // Mark active
            btn.dataset.selected = "true";
            btn.style.background = "var(--primary)";
            btn.style.color = "var(--white)";
            btn.style.borderColor = "var(--primary)";

            selectedSlot = btn.dataset.slot;
            if (hiddenInput) {
                hiddenInput.value = selectedSlot;
            }

            // Assign Technician based on slot type (Morning = Lead Tech, Afternoon/Evening = Specialist)
            let assignedTech = "AC Now Lead Technician";
            if (selectedSlot.includes("Afternoon") || selectedSlot.includes("Evening")) {
                assignedTech = "AC Now Service Specialist";
            }

            selectedTxt.textContent = selectedSlot;
            if (techTxt) {
                techTxt.textContent = assignedTech;
            }
            feedbackBox.style.display = "block";

            if (window.ComfortAudio && typeof window.ComfortAudio.playClick === "function") {
                window.ComfortAudio.playClick();
            }
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCalendarWidget);
} else {
    initCalendarWidget();
}
