function initCalendarWidget(){const y=document.getElementById("dispatch-calendar-container");if(!y)return;function b(){const e=[],c=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],t=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],x={timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",hour12:!1},h=new Intl.DateTimeFormat("en-US",x).formatToParts(new Date),r={};h.forEach(i=>{r[i.type]=i.value});const D=parseInt(r.year),A=parseInt(r.month)-1,C=parseInt(r.day),p=parseInt(r.hour);let n=new Date(D,A,C);const s=n.getDay();let a=1;for(s===1||s===2||s===3?a=p<17?1:2:s===4?a=p<17?1:4:s===5?a=p<17?3:4:s===6?a=3:s===0&&(a=2),n.setDate(n.getDate()+a);e.length<5;){const i=n.getDay();if(i!==0&&i!==6){const E=`${c[i]}, ${t[n.getMonth()]} ${n.getDate()}`;e.push(E)}n.setDate(n.getDate()+1)}return e}const v=b();let l="",d=`
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size: 12.5px; color: var(--gray-dark); margin: 0 0 15px 0; line-height: 1.5;">
                Reserve a priority time window. Our team will call to confirm as soon as possible.<br>
                <strong style="color: #d01818; font-size: 13px; font-weight: 800; display: block; margin-top: 8px; padding: 10px 12px; background: rgba(208, 24, 24, 0.05); border-left: 3px solid #d01818; border-radius: 4px; line-height: 1.4;">
                    \u26A0\uFE0F Same-day appointments cannot be booked online. Please call our office directly at <a href="tel:7725213568" style="color: #d01818; text-decoration: underline;">(772) 521-3568</a> for immediate response.
                </strong>
            </p>
            
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
    `;v.forEach((e,c)=>{const t=e.split(", ");d+=`
            <div class="calendar-day-col" style="flex: 1 0 85px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${t[0].substring(0,3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${t[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `,["Morning (8am-12)","Afternoon (12-4)","Evening (4-8)"].forEach((f,h)=>{const r=`${e} - ${f}`;d+=`
                <button type="button" class="cal-slot-btn" data-slot="${r}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
                    ${f.split(" ")[0]}
                </button>
            `}),d+=`
                </div>
            </div>
        `}),d+=`
            </div>
        </div>
        <div id="calendar-feedback-box" style="display: none; background: rgba(11, 99, 229, 0.04); border: 1px solid rgba(11, 99, 229, 0.1); padding: 12px 15px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; animation: fadeIn 0.2s ease;">
            Selected Appointment: <strong id="cal-selected-txt" style="color: var(--primary);">None</strong><br>
            Assigned Technician: <strong id="cal-tech-txt" style="color: var(--dark);">TBD</strong>
        </div>
    `,y.innerHTML=d;const u=y.querySelectorAll(".cal-slot-btn"),w=document.getElementById("calendar-feedback-box"),k=document.getElementById("cal-selected-txt"),g=document.getElementById("cal-tech-txt"),m=y.closest("form");let o=null;m&&(o=m.querySelector("input[name='reserved_appointment_slot']"),o||(o=document.createElement("input"),o.type="hidden",o.name="reserved_appointment_slot",m.appendChild(o))),u.forEach(e=>{e.addEventListener("click",()=>{u.forEach(t=>{t.dataset.selected="false",t.style.background="var(--white)",t.style.color="#03543F",t.style.borderColor="#A7F3D0"}),e.dataset.selected="true",e.style.background="var(--primary)",e.style.color="var(--white)",e.style.borderColor="var(--primary)",l=e.dataset.slot,o&&(o.value=l);let c="AC Now Lead Technician";(l.includes("Afternoon")||l.includes("Evening"))&&(c="AC Now Service Specialist"),k.textContent=l,g&&(g.textContent=c),w.style.display="block",window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initCalendarWidget):initCalendarWidget();
