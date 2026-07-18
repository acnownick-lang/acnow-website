function initCalendarWidget(){const d=document.getElementById("dispatch-calendar-container");if(!d)return;const w={timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",hour12:!1},A=new Intl.DateTimeFormat("en-US",w).formatToParts(new Date),l={};A.forEach(e=>{l[e.type]=e.value});const m=parseInt(l.year,10),g=parseInt(l.month,10)-1,b=parseInt(l.day,10);let y=parseInt(l.hour,10);y===24&&(y=0);const x=new Date(m,g,b).getDay();function C(){const e=[],t=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],s=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];let a=new Date(m,g,b);for(a.setDate(a.getDate()+1);e.length<5;){const n=a.getDay();if(n!==0&&n!==6){const p=`${t[n]}, ${s[a.getMonth()]} ${a.getDate()}`;e.push(p)}a.setDate(a.getDate()+1)}return e}const E=C();let i="";const B=(e,t)=>[["Booked","Available","Booked"],["Available","Booked","Available"],["Booked","Available","Available"],["Available","Available","Booked"],["Booked","Booked","Available"]][e%5][t];let r=`
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size: 12.5px; color: var(--gray-dark); margin: 0 0 15px 0; line-height: 1.5;">
                Reserve a priority time window. Our team will call to confirm as soon as possible.<br>
                <strong style="color: #d01818; font-size: 13px; font-weight: 800; display: block; margin-top: 8px; padding: 10px 12px; background: rgba(208, 24, 24, 0.05); border-left: 3px solid #d01818; border-radius: 4px; line-height: 1.4;">
                    \u26A0\uFE0F Same-day appointments cannot be booked online. Please call our office directly at <a href="tel:7725213568" style="color: #d01818; text-decoration: underline;">(772) 521-3568</a> for immediate response.
                </strong>
            </p>
            
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
    `;E.forEach((e,t)=>{const s=e.split(", ");r+=`
            <div class="calendar-day-col" style="flex: 1 0 85px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${s[0].substring(0,3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${s[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `,["Morning (8am-12)","Afternoon (12-4)","Evening (4-8)"].forEach((n,f)=>{let p=B(t,f);t===0&&f===0&&(x===6||x===0||y>=17)&&(p="Booked");const k=`${e} - ${n}`;p==="Booked"?r+=`
                    <button type="button" class="cal-slot-btn booked-slot" data-slot="${k}" data-booked="true" style="background: #FEE2E2; color: #9B1C1C; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#FCA5A5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#FEE2E2'">
                        Booked
                    </button>
                `:r+=`
                    <button type="button" class="cal-slot-btn" data-slot="${k}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
                        ${n.split(" ")[0]}
                    </button>
                `}),r+=`
                </div>
            </div>
        `}),r+=`
            </div>
        </div>
        <div id="calendar-feedback-box" style="display: none; background: rgba(11, 99, 229, 0.04); border: 1px solid rgba(11, 99, 229, 0.1); padding: 12px 15px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; animation: fadeIn 0.2s ease;">
            Selected Appointment: <strong id="cal-selected-txt" style="color: var(--primary);">None</strong>
            <div id="cal-priority-note" style="display: none; margin-top: 10px; padding: 8px 10px; background: rgba(208, 24, 24, 0.05); border-left: 3px solid #d01818; border-radius: 4px; font-weight: 700; color: #d01818; line-height: 1.4;">
                \u{1F4DE} This slot is currently filled. Please call our office directly at <a href="tel:7725213568" style="color: #d01818; text-decoration: underline;">(772) 521-3568</a>.
            </div>
        </div>
    `,d.innerHTML=r;const h=d.querySelectorAll(".cal-slot-btn"),D=document.getElementById("calendar-feedback-box"),v=document.getElementById("cal-selected-txt"),c=document.getElementById("cal-priority-note"),u=d.closest("form");let o=null;u&&(o=u.querySelector("input[name='reserved_appointment_slot']"),o||(o=document.createElement("input"),o.type="hidden",o.name="reserved_appointment_slot",u.appendChild(o))),h.forEach(e=>{e.addEventListener("click",()=>{h.forEach(t=>{t.dataset.selected="false",t.dataset.booked==="true"?(t.style.background="#FEE2E2",t.style.color="#9B1C1C",t.style.borderColor="#FCA5A5"):(t.style.background="var(--white)",t.style.color="#03543F",t.style.borderColor="#A7F3D0")}),e.dataset.selected="true",e.style.background="var(--primary)",e.style.color="var(--white)",e.style.borderColor="var(--primary)",i=e.dataset.slot,e.dataset.booked==="true"?(o&&(o.value=`${i} (Currently Booked - Call Request)`),v.innerHTML=`${i} <span style="color: #9B1C1C; font-weight: 800;">(Filled)</span>`,c&&(c.style.display="block")):(o&&(o.value=i),v.textContent=i,c&&(c.style.display="none")),D.style.display="block",window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initCalendarWidget):initCalendarWidget();
