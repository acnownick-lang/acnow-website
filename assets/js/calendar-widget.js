function initCalendarWidget(){const s=document.getElementById("dispatch-calendar-container");if(!s)return;const b={timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",hour12:!1},h=new Intl.DateTimeFormat("en-US",b).formatToParts(new Date),r={};h.forEach(e=>{r[e.type]=e.value});const y=parseInt(r.year),m=parseInt(r.month)-1,u=parseInt(r.day),v=parseInt(r.hour),f=new Date(y,m,u).getDay();function k(){const e=[],a=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],i=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];let t=new Date(y,m,u);for(t.setDate(t.getDate()+1);e.length<5;){const d=t.getDay();if(d!==0&&d!==6){const x=`${a[d]}, ${i[t.getMonth()]} ${t.getDate()}`;e.push(x)}t.setDate(t.getDate()+1)}return e}const w=k();let l="",n=`
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size: 12.5px; color: var(--gray-dark); margin: 0 0 15px 0; line-height: 1.5;">
                Reserve a priority time window. Our team will call to confirm as soon as possible.<br>
                <strong style="color: #d01818; font-size: 13px; font-weight: 800; display: block; margin-top: 8px; padding: 10px 12px; background: rgba(208, 24, 24, 0.05); border-left: 3px solid #d01818; border-radius: 4px; line-height: 1.4;">
                    \u26A0\uFE0F Same-day appointments cannot be booked online. Please call our office directly at <a href="tel:7725213568" style="color: #d01818; text-decoration: underline;">(772) 521-3568</a> for immediate response.
                </strong>
            </p>
            
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
    `;w.forEach((e,a)=>{const i=e.split(", ");let t=!0;a===0&&(f===6||f===0||v>=17)&&(t=!1),n+=`
            <div class="calendar-day-col" style="flex: 1 0 85px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${i[0].substring(0,3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${i[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `,["Morning (8am-12)","Afternoon (12-4)","Evening (4-8)"].forEach((p,x)=>{if(!t)n+=`
                    <div style="background: #FEE2E2; color: #9B1C1C; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: not-allowed;" title="Slot booked by another customer">
                        Booked
                    </div>
                `;else{const E=`${e} - ${p}`;n+=`
                    <button type="button" class="cal-slot-btn" data-slot="${E}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
                        ${p.split(" ")[0]}
                    </button>
                `}}),n+=`
                </div>
            </div>
        `}),n+=`
            </div>
        </div>
        <div id="calendar-feedback-box" style="display: none; background: rgba(11, 99, 229, 0.04); border: 1px solid rgba(11, 99, 229, 0.1); padding: 12px 15px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; animation: fadeIn 0.2s ease;">
            Selected Appointment: <strong id="cal-selected-txt" style="color: var(--primary);">None</strong>
        </div>
    `,s.innerHTML=n;const g=s.querySelectorAll(".cal-slot-btn"),D=document.getElementById("calendar-feedback-box"),C=document.getElementById("cal-selected-txt"),c=s.closest("form");let o=null;c&&(o=c.querySelector("input[name='reserved_appointment_slot']"),o||(o=document.createElement("input"),o.type="hidden",o.name="reserved_appointment_slot",c.appendChild(o))),g.forEach(e=>{e.addEventListener("click",()=>{g.forEach(a=>{a.dataset.selected="false",a.style.background="var(--white)",a.style.color="#03543F",a.style.borderColor="#A7F3D0"}),e.dataset.selected="true",e.style.background="var(--primary)",e.style.color="var(--white)",e.style.borderColor="var(--primary)",l=e.dataset.slot,o&&(o.value=l),C.textContent=l,D.style.display="block",window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initCalendarWidget):initCalendarWidget();
