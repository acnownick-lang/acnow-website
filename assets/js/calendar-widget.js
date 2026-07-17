function initCalendarWidget(){const i=document.getElementById("dispatch-calendar-container");if(!i)return;function g(){const e=[],t=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],s=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];let a=new Date;for(a.setDate(a.getDate()+1);e.length<5;){const r=a.getDay();if(r!==0&&r!==6){const y=`${t[r]}, ${s[a.getMonth()]} ${a.getDate()}`;e.push(y)}a.setDate(a.getDate()+1)}return e}const m=g();let l="";const f=(e,t)=>[["Booked","Available","Booked"],["Available","Booked","Available"],["Booked","Available","Available"],["Available","Available","Booked"],["Booked","Booked","Available"]][e%5][t];let n=`
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size:12px; color:var(--gray-dark); margin:0 0 15px 0; line-height:1.45;">
                Reserve a priority time slot. Our team will call to confirm as soon as possible.<br>
                <strong style="color: #c2410c; font-weight: 700; display: block; margin-top: 5px;">* Same-day emergency appointments must go through our call center at (772) 521-3568 for the fastest response time.</strong>
            </p>
            
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
    `;m.forEach((e,t)=>{const s=e.split(", ");n+=`
            <div class="calendar-day-col" style="flex: 1 0 85px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${s[0].substring(0,3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${s[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `,["Morning (8am-12)","Afternoon (12-4)","Evening (4-8)"].forEach((r,u)=>{if(f(t,u)==="Booked")n+=`
                    <div style="background: #FEE2E2; color: #9B1C1C; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: not-allowed;" title="Slot booked by another customer">
                        Booked
                    </div>
                `;else{const v=`${e} - ${r}`;n+=`
                    <button type="button" class="cal-slot-btn" data-slot="${v}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
                        ${r.split(" ")[0]}
                    </button>
                `}}),n+=`
                </div>
            </div>
        `}),n+=`
            </div>
        </div>
        <div id="calendar-feedback-box" style="display: none; background: rgba(11, 99, 229, 0.04); border: 1px solid rgba(11, 99, 229, 0.1); padding: 12px 15px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; animation: fadeIn 0.2s ease;">
            Selected Appointment: <strong id="cal-selected-txt" style="color: var(--primary);">None</strong><br>
            Assigned Technician: <strong id="cal-tech-txt" style="color: var(--dark);">TBD</strong>
        </div>
    `,i.innerHTML=n;const c=i.querySelectorAll(".cal-slot-btn"),x=document.getElementById("calendar-feedback-box"),b=document.getElementById("cal-selected-txt"),p=document.getElementById("cal-tech-txt"),d=i.closest("form");let o=null;d&&(o=d.querySelector("input[name='reserved_appointment_slot']"),o||(o=document.createElement("input"),o.type="hidden",o.name="reserved_appointment_slot",d.appendChild(o))),c.forEach(e=>{e.addEventListener("click",()=>{if(c.forEach(t=>{t.dataset.selected="false",t.style.background="var(--white)",t.style.color="#03543F",t.style.borderColor="#A7F3D0"}),e.dataset.selected="true",e.style.background="var(--primary)",e.style.color="var(--white)",e.style.borderColor="var(--primary)",l=e.dataset.slot,o&&(o.value=l),b.textContent=l,p){let t="Sean (Owner/Senior Specialist)";(l.includes("Afternoon")||l.includes("Evening"))&&(t="Chris (Lead Field Dispatcher)"),p.textContent=t}x.style.display="block",window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initCalendarWidget):initCalendarWidget();
