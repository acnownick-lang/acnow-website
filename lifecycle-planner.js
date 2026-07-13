document.addEventListener("DOMContentLoaded",()=>{const f=document.getElementById("slider-age"),m=document.getElementById("slider-tonnage"),L=document.getElementById("label-age"),I=document.getElementById("label-tonnage"),w=document.querySelectorAll("div[aria-label='Maintenance Selector'] .toggle-btn"),E=document.getElementById("metric-remaining"),v=document.getElementById("metric-eff-loss"),k=document.getElementById("metric-waste-cost"),C=document.getElementById("metric-capex-cost"),r=document.getElementById("lifecycle-status-badge"),A=document.getElementById("lifecycle-svg"),u=document.getElementById("planner-lead-form"),B=document.getElementById("plan_metrics_input");if(!f||!m||!E||!v||!k||!C||!r){console.warn("[PWA Client] Lifecycle Planner elements missing. Skipping initialization.");return}let g="yearly";f.addEventListener("input",()=>{L.textContent=`${f.value} Years`,y(),b()}),m.addEventListener("input",()=>{I.textContent=`${parseFloat(m.value).toFixed(1)} Tons`,y(),b()}),w.forEach(n=>{n.addEventListener("click",()=>{w.forEach(l=>l.classList.remove("active")),n.classList.add("active"),g=n.dataset.val,y(),window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})});function b(){window.ComfortAudio&&typeof window.ComfortAudio.playTick=="function"&&window.ComfortAudio.playTick()}function y(){const n=parseInt(f.value),l=parseFloat(m.value);let s=.015,c=14;g==="none"?(s=.035,c=10):g==="twice"&&(s=.008,c=16);const a=Math.max(0,c-n),t=Math.min(100,Math.round(n*s*100)),$=Math.round(4e3+(l-1)*1400),h=l*300,o=Math.round(h*(t/100));E.textContent=a===0?"Expired (Replace Now)":`${a.toFixed(1)} Years`,v.textContent=`${t}% Loss`,k.textContent=`$${o} / year`,C.textContent=`$${$.toLocaleString()}`,a>7?(r.textContent="Excellent",r.style.background="#10B981"):a>3?(r.textContent="Caution",r.style.background="#F59E0B"):(r.textContent="Alert - Replace",r.style.background="#EF4444"),B.value=`[System Age: ${n} Years | Tonnage: ${l} Tons | Maintenance: ${g} | Remaining Life: ${a.toFixed(1)} Yrs | Eff Loss: ${t}%]`,M(n,c,s)}function M(n,l,s){const t={top:20,right:20,bottom:35,left:45},$=450-t.left-t.right,h=250-t.top-t.bottom,o=i=>t.left+i/15*$,e=i=>t.top+(1-(i-.5)/.5)*h;let d=[];for(let i=0;i<=15;i++){const z=Math.max(.5,1-i*s);d.push({x:o(i),y:e(z)})}let p=`M ${d[0].x} ${d[0].y}`;for(let i=1;i<d.length;i++)p+=` L ${d[i].x} ${d[i].y}`;const F=`${p} L ${o(15)} ${e(.5)} L ${o(0)} ${e(.5)} Z`,x=o(n),S=Math.max(.5,1-n*s),W=e(S);A.innerHTML=`
            <!-- Grid Lines -->
            <line x1="${t.left}" y1="${e(1)}" x2="${450-t.right}" y2="${e(1)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${t.left}" y1="${e(.8)}" x2="${450-t.right}" y2="${e(.8)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${t.left}" y1="${e(.6)}" x2="${450-t.right}" y2="${e(.6)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${t.left}" y1="${e(.5)}" x2="${450-t.right}" y2="${e(.5)}" stroke="#CBD5E0" stroke-width="1.5" />

            <!-- Y Axis labels -->
            <text x="${t.left-10}" y="${e(1)+4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">100%</text>
            <text x="${t.left-10}" y="${e(.8)+4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">80%</text>
            <text x="${t.left-10}" y="${e(.6)+4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">60%</text>
            <text x="${t.left-10}" y="${e(.5)+4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">50%</text>
            
            <!-- X Axis labels -->
            <text x="${o(0)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">Brand New</text>
            <text x="${o(5)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">5 Yrs</text>
            <text x="${o(10)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">10 Yrs</text>
            <text x="${o(15)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">15+ Yrs</text>

            <!-- Shaded Area Under Curve -->
            <path d="${F}" fill="rgba(11, 99, 229, 0.05)" />

            <!-- Dynamic Efficiency Curve Line -->
            <path d="${p}" fill="none" stroke="#0B63E5" stroke-width="3.5" stroke-linecap="round" />

            <!-- Max Lifespan boundary -->
            <line x1="${o(l)}" y1="${t.top}" x2="${o(l)}" y2="${250-t.bottom}" stroke="#E63946" stroke-width="1.5" stroke-dasharray="4,4" />
            <text x="${o(l)+5}" y="${t.top+15}" fill="#E63946" font-size="9" font-weight="700">Max Lifespan Boundary</text>

            <!-- Interactive Age Vertical Slider Marker Indicator -->
            <line x1="${x}" y1="${t.top}" x2="${x}" y2="${250-t.bottom}" stroke="#4A5568" stroke-width="2" />
            
            <!-- Interactive Intersection Point dot bubble -->
            <circle cx="${x}" cy="${W}" r="6.5" fill="#4A5568" stroke="#fff" stroke-width="2" />
            
            <!-- Info tooltips text details -->
            <text x="${x}" y="${t.top+5}" fill="#2D3748" font-size="10" font-weight="700" text-anchor="middle" background="white">Your Unit (${n} yrs)</text>
        `}u&&u.addEventListener("submit",n=>{const s=document.getElementById("fullname_plan").value.trim().split(" "),c=s[0]||"",a=s.slice(1).join(" ")||"Customer",t={fname:c,lname:a,tel:document.getElementById("phone_plan").value.trim(),email:document.getElementById("email_plan").value.trim(),city:document.getElementById("city_plan").value.trim(),message:`[AC Lifespan Planner Report] ${B.value} [Request] Client requests pre-failure replacement consultation.`,honeypot:document.getElementById("honeypot_plan").value};typeof window.submitFormWithSync=="function"?window.submitFormWithSync(n,u,t,()=>{alert("Consultation request secure! Chris or Sean will contact you to schedule an inspection."),u.reset(),typeof window.configurePushNotifications=="function"&&window.configurePushNotifications()}):console.error("submitFormWithSync not found in global scope")}),y()});
