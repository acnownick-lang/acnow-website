function initCalendarWidget(){const u=document.getElementById("dispatch-calendar-container");if(!u)return;function h(){const e=[],a=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],t=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],v={timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",hour12:!1},f=new Intl.DateTimeFormat("en-US",v).formatToParts(new Date),l={};f.forEach(d=>{l[d.type]=d.value});const g=parseInt(l.year),D=parseInt(l.month)-1,E=parseInt(l.day),p=parseInt(l.hour);let n=new Date(g,D,E);const i=n.getDay();let r=1;for(i===1||i===2||i===3?r=p<17?1:2:i===4?r=p<17?1:4:i===5?r=p<17?3:4:i===6?r=3:i===0&&(r=2),n.setDate(n.getDate()+r);e.length<5;){const d=n.getDay();if(d!==0&&d!==6){const S=`${a[d]}, ${t[n.getMonth()]} ${n.getDate()}`;e.push(S)}n.setDate(n.getDate()+1)}return e}const k=h();let c="";const w=(e,a)=>[["Booked","Available","Booked"],["Available","Booked","Available"],["Booked","Available","Available"],["Available","Available","Booked"],["Booked","Booked","Available"]][e%5][a];let s=`
        <div style="margin-bottom: 20px;">
            <label style="font-size: 13.5px; font-weight: 700; color: var(--dark); display: block; margin-bottom: 10px;">Select Live Dispatch Appointment Window</label>
            <p style="font-size: 12.5px; color: var(--gray-dark); margin: 0 0 15px 0; line-height: 1.5;">
                Reserve a priority time window. Our team will call to confirm as soon as possible.<br>
                <strong style="color: #d01818; font-size: 13px; font-weight: 800; display: block; margin-top: 8px; padding: 10px 12px; background: rgba(208, 24, 24, 0.05); border-left: 3px solid #d01818; border-radius: 4px; line-height: 1.4;">
                    \u26A0\uFE0F Same-day appointments cannot be booked online. Please call our office directly at <a href="tel:7725213568" style="color: #d01818; text-decoration: underline;">(772) 521-3568</a> for immediate response.
                </strong>
            </p>
            
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
    `;k.forEach((e,a)=>{const t=e.split(", ");s+=`
            <div class="calendar-day-col" style="flex: 1 0 85px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 4px;">${t[0].substring(0,3)}</div>
                <div style="font-size: 13px; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-bottom: 1px solid var(--gray-light); padding-bottom: 6px;">${t[1]}</div>
                
                <!-- Slots -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `,["Morning (8am-12)","Afternoon (12-4)","Evening (4-8)"].forEach((m,f)=>{if(w(a,f)==="Booked")s+=`
                    <div style="background: #FEE2E2; color: #9B1C1C; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: not-allowed;" title="Slot booked by another customer">
                        Booked
                    </div>
                `;else{const g=`${e} - ${m}`;s+=`
                    <button type="button" class="cal-slot-btn" data-slot="${g}" style="background: var(--white); color: #03543F; border: 1px solid #A7F3D0; font-size: 12px; font-weight: 700; padding: 8px 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#ECFDF5'" onmouseout="if(this.dataset.selected!=='true') this.style.background='#fff'">
                        ${m.split(" ")[0]}
                    </button>
                `}}),s+=`
                </div>
            </div>
        `}),s+=`
            </div>
        </div>
        <div id="calendar-feedback-box" style="display: none; background: rgba(11, 99, 229, 0.04); border: 1px solid rgba(11, 99, 229, 0.1); padding: 12px 15px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; animation: fadeIn 0.2s ease;">
            Selected Appointment: <strong id="cal-selected-txt" style="color: var(--primary);">None</strong><br>
            Assigned Technician: <strong id="cal-tech-txt" style="color: var(--dark);">TBD</strong>
        </div>
    `,u.innerHTML=s;const x=u.querySelectorAll(".cal-slot-btn"),A=document.getElementById("calendar-feedback-box"),C=document.getElementById("cal-selected-txt"),b=document.getElementById("cal-tech-txt"),y=u.closest("form");let o=null;y&&(o=y.querySelector("input[name='reserved_appointment_slot']"),o||(o=document.createElement("input"),o.type="hidden",o.name="reserved_appointment_slot",y.appendChild(o))),x.forEach(e=>{e.addEventListener("click",()=>{x.forEach(t=>{t.dataset.selected="false",t.style.background="var(--white)",t.style.color="#03543F",t.style.borderColor="#A7F3D0"}),e.dataset.selected="true",e.style.background="var(--primary)",e.style.color="var(--white)",e.style.borderColor="var(--primary)",c=e.dataset.slot,o&&(o.value=c);let a="AC Now Lead Technician";(c.includes("Afternoon")||c.includes("Evening"))&&(a="AC Now Service Specialist"),C.textContent=c,b&&(b.textContent=a),A.style.display="block",window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initCalendarWidget):initCalendarWidget();
