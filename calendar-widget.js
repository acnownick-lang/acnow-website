function initCalendarWidget(){const d=document.getElementById("dispatch-calendar-container");if(!d)return;function y(){const e=[],a=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],t=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];let n=new Date;for(n.setDate(n.getDate()+1);e.length<5;){const r=n.getDay();if(r!==0&&r!==6){const u=`${a[r]}, ${t[n.getMonth()]} ${n.getDate()}`;e.push(u)}n.setDate(n.getDate()+1)}return e}const m=y();let l="";const g=(e,a)=>[["Booked","Available","Booked"],["Available","Booked","Available"],["Booked","Available","Available"],["Available","Available","Booked"],["Booked","Booked","Available"]][e%5][a];let i=`
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size:12px; color:var(--gray-dark); margin:0 0 15px 0; line-height:1.4;">Reserve a priority time slot. Chris or Sean will call to confirm within 15 minutes.</p>
            
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; overflow-x: auto; padding-bottom: 5px;">
    `;m.forEach((e,a)=>{const t=e.split(", ");i+=`
            <div class="calendar-day-col" style="min-width: 90px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${t[0].substring(0,3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${t[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `,["Morning (8am-12)","Afternoon (12-4)","Evening (4-8)"].forEach((r,p)=>{if(g(a,p)==="Booked")i+=`
                    <div style="background: #FEE2E2; color: #9B1C1C; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: not-allowed;" title="Slot booked by another customer">
                        Booked
                    </div>
                `;else{const b=`${e} - ${r}`;i+=`
                    <button type="button" class="cal-slot-btn" data-slot="${b}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
                        ${r.split(" ")[0]}
                    </button>
                `}}),i+=`
                </div>
            </div>
        `}),i+=`
            </div>
        </div>
        <div id="calendar-feedback-box" style="display: none; background: rgba(11, 99, 229, 0.04); border: 1px solid rgba(11, 99, 229, 0.1); padding: 12px 15px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; animation: fadeIn 0.2s ease;">
            Selected Appointment: <strong id="cal-selected-txt" style="color: var(--primary);">None</strong><br>
            Assigned Technician: <strong id="cal-tech-txt" style="color: var(--dark);">TBD</strong>
        </div>
    `,d.innerHTML=i;const c=d.querySelectorAll(".cal-slot-btn"),f=document.getElementById("calendar-feedback-box"),v=document.getElementById("cal-selected-txt"),x=document.getElementById("cal-tech-txt"),s=d.closest("form");let o=null;s&&(o=s.querySelector("input[name='reserved_appointment_slot']"),o||(o=document.createElement("input"),o.type="hidden",o.name="reserved_appointment_slot",s.appendChild(o))),c.forEach(e=>{e.addEventListener("click",()=>{c.forEach(t=>{t.dataset.selected="false",t.style.background="var(--white)",t.style.color="#03543F",t.style.borderColor="#A7F3D0"}),e.dataset.selected="true",e.style.background="var(--primary)",e.style.color="var(--white)",e.style.borderColor="var(--primary)",l=e.dataset.slot,o&&(o.value=l);let a="Sean (Owner/Senior Specialist)";(l.includes("Afternoon")||l.includes("Evening"))&&(a="Chris (Lead Field Dispatcher)"),v.textContent=l,x.textContent=a,f.style.display="block",window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initCalendarWidget):initCalendarWidget();
