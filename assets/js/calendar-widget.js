function initCalendarWidget(){const d=document.getElementById("dispatch-calendar-container");if(!d)return;function x(){const e=[],n=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],t=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],g={timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",hour12:!1},u=new Intl.DateTimeFormat("en-US",g).formatToParts(new Date),i={};u.forEach(s=>{i[s.type]=s.value});const m=parseInt(i.year),w=parseInt(i.month)-1,A=parseInt(i.day),D=parseInt(i.hour);let o=new Date(m,w,A);for(o.setDate(o.getDate()+1),D>=17&&o.setDate(o.getDate()+1);e.length<5;){const s=o.getDay();if(s!==0&&s!==6){const C=`${n[s]}, ${t[o.getMonth()]} ${o.getDate()}`;e.push(C)}o.setDate(o.getDate()+1)}return e}const b=x();let l="";const v=(e,n)=>[["Booked","Available","Booked"],["Available","Booked","Available"],["Booked","Available","Available"],["Available","Available","Booked"],["Booked","Booked","Available"]][e%5][n];let r=`
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size: 12.5px; color: var(--gray-dark); margin: 0 0 15px 0; line-height: 1.5;">
                Reserve a priority time window. Our team will call to confirm as soon as possible.<br>
                <strong style="color: #d01818; font-size: 13px; font-weight: 800; display: block; margin-top: 8px; padding: 10px 12px; background: rgba(208, 24, 24, 0.05); border-left: 3px solid #d01818; border-radius: 4px; line-height: 1.4;">
                    \u26A0\uFE0F Same-day appointments cannot be booked online. Please call our office directly at <a href="tel:7725213568" style="color: #d01818; text-decoration: underline;">(772) 521-3568</a> for immediate response.
                </strong>
            </p>
            
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
    `;b.forEach((e,n)=>{const t=e.split(", ");r+=`
            <div class="calendar-day-col" style="flex: 1 0 85px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${t[0].substring(0,3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${t[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `,["Morning (8am-12)","Afternoon (12-4)","Evening (4-8)"].forEach((p,u)=>{if(v(n,u)==="Booked")r+=`
                    <div style="background: #FEE2E2; color: #9B1C1C; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: not-allowed;" title="Slot booked by another customer">
                        Booked
                    </div>
                `;else{const m=`${e} - ${p}`;r+=`
                    <button type="button" class="cal-slot-btn" data-slot="${m}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
                        ${p.split(" ")[0]}
                    </button>
                `}}),r+=`
                </div>
            </div>
        `}),r+=`
            </div>
        </div>
        <div id="calendar-feedback-box" style="display: none; background: rgba(11, 99, 229, 0.04); border: 1px solid rgba(11, 99, 229, 0.1); padding: 12px 15px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; animation: fadeIn 0.2s ease;">
            Selected Appointment: <strong id="cal-selected-txt" style="color: var(--primary);">None</strong><br>
            Assigned Technician: <strong id="cal-tech-txt" style="color: var(--dark);">TBD</strong>
        </div>
    `,d.innerHTML=r;const y=d.querySelectorAll(".cal-slot-btn"),h=document.getElementById("calendar-feedback-box"),k=document.getElementById("cal-selected-txt"),f=document.getElementById("cal-tech-txt"),c=d.closest("form");let a=null;c&&(a=c.querySelector("input[name='reserved_appointment_slot']"),a||(a=document.createElement("input"),a.type="hidden",a.name="reserved_appointment_slot",c.appendChild(a))),y.forEach(e=>{e.addEventListener("click",()=>{y.forEach(t=>{t.dataset.selected="false",t.style.background="var(--white)",t.style.color="#03543F",t.style.borderColor="#A7F3D0"}),e.dataset.selected="true",e.style.background="var(--primary)",e.style.color="var(--white)",e.style.borderColor="var(--primary)",l=e.dataset.slot,a&&(a.value=l);let n="AC Now Lead Technician";(l.includes("Afternoon")||l.includes("Evening"))&&(n="AC Now Service Specialist"),k.textContent=l,f&&(f.textContent=n),h.style.display="block",window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initCalendarWidget):initCalendarWidget();
