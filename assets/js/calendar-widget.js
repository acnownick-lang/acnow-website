function initCalendarWidget(){const i=document.getElementById("dispatch-calendar-container");if(!i)return;function g(){const e=[],t=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],l=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],f={timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",hour12:!1},u=new Intl.DateTimeFormat("en-US",f).formatToParts(new Date),r={};u.forEach(s=>{r[s.type]=s.value});const m=parseInt(r.year),k=parseInt(r.month)-1,w=parseInt(r.day),A=parseInt(r.hour);let o=new Date(m,k,w);for(o.setDate(o.getDate()+1),A>=17&&o.setDate(o.getDate()+1);e.length<5;){const s=o.getDay();if(s!==0&&s!==6){const D=`${t[s]}, ${l[o.getMonth()]} ${o.getDate()}`;e.push(D)}o.setDate(o.getDate()+1)}return e}const b=g();let d="";const x=(e,t)=>[["Booked","Available","Booked"],["Available","Booked","Available"],["Booked","Available","Available"],["Available","Available","Booked"],["Booked","Booked","Available"]][e%5][t];let n=`
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size: 12.5px; color: var(--gray-dark); margin: 0 0 15px 0; line-height: 1.5;">
                Reserve a priority time window. Our team will call to confirm as soon as possible.<br>
                <strong style="color: #d01818; font-size: 13px; font-weight: 800; display: block; margin-top: 8px; padding: 10px 12px; background: rgba(208, 24, 24, 0.05); border-left: 3px solid #d01818; border-radius: 4px; line-height: 1.4;">
                    \u26A0\uFE0F Same-day appointments cannot be booked online. Please call our office directly at <a href="tel:7725213568" style="color: #d01818; text-decoration: underline;">(772) 521-3568</a> for immediate response.
                </strong>
            </p>
            
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
    `;b.forEach((e,t)=>{const l=e.split(", ");n+=`
            <div class="calendar-day-col" style="flex: 1 0 85px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${l[0].substring(0,3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${l[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `,["Morning (8am-12)","Afternoon (12-4)","Evening (4-8)"].forEach((p,u)=>{if(x(t,u)==="Booked")n+=`
                    <div style="background: #FEE2E2; color: #9B1C1C; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: not-allowed;" title="Slot booked by another customer">
                        Booked
                    </div>
                `;else{const m=`${e} - ${p}`;n+=`
                    <button type="button" class="cal-slot-btn" data-slot="${m}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
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
    `,i.innerHTML=n;const y=i.querySelectorAll(".cal-slot-btn"),v=document.getElementById("calendar-feedback-box"),h=document.getElementById("cal-selected-txt"),c=i.closest("form");let a=null;c&&(a=c.querySelector("input[name='reserved_appointment_slot']"),a||(a=document.createElement("input"),a.type="hidden",a.name="reserved_appointment_slot",c.appendChild(a))),y.forEach(e=>{e.addEventListener("click",()=>{y.forEach(t=>{t.dataset.selected="false",t.style.background="var(--white)",t.style.color="#03543F",t.style.borderColor="#A7F3D0"}),e.dataset.selected="true",e.style.background="var(--primary)",e.style.color="var(--white)",e.style.borderColor="var(--primary)",d=e.dataset.slot,a&&(a.value=d),h.textContent=d,v.style.display="block",window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initCalendarWidget):initCalendarWidget();
