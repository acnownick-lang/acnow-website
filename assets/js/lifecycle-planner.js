document.addEventListener("DOMContentLoaded",()=>{const f=document.getElementById("slider-age"),u=document.getElementById("slider-tonnage"),A=document.getElementById("label-age"),M=document.getElementById("label-tonnage"),b=document.querySelectorAll("div[aria-label='Maintenance Selector'] .toggle-btn"),h=document.getElementById("metric-remaining"),p=document.getElementById("metric-eff-loss"),w=document.getElementById("metric-waste-cost"),E=document.getElementById("metric-capex-cost"),l=document.getElementById("lifecycle-status-badge"),B=document.getElementById("lifecycle-svg"),m=document.getElementById("planner-lead-form"),I=document.getElementById("plan_metrics_input");if(!f||!u||!h||!p||!w||!E||!l){console.warn("[PWA Client] Lifecycle Planner elements missing. Skipping initialization.");return}let g=!1,x="yearly";f.addEventListener("input",()=>{g=!0,A.textContent=`${f.value} Years`,y(),L()}),u.addEventListener("input",()=>{g=!0,M.textContent=`${parseFloat(u.value).toFixed(1)} Tons`,y(),L()}),b.forEach(n=>{n.addEventListener("click",()=>{g=!0,b.forEach(s=>s.classList.remove("active")),n.classList.add("active"),x=n.dataset.val,y(),window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})});function L(){window.ComfortAudio&&typeof window.ComfortAudio.playTick=="function"&&window.ComfortAudio.playTick()}function y(){if(!g){h.textContent="Adjust inputs to calculate",p.textContent="\u2014",w.textContent="\u2014",E.textContent="\u2014",l.textContent="Awaiting Input",l.style.background="#64748b",B.innerHTML=`
                <rect x="10" y="10" width="430" height="230" fill="rgba(0,0,0,0.02)" rx="4"/>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="var(--font-body)" font-size="13" fill="#64748B">Graph will populate after interaction</text>
            `;return}const n=parseInt(f.value),s=parseFloat(u.value);let a=.015,c=14;x==="none"?(a=.035,c=10):x==="twice"&&(a=.008,c=16);const r=Math.max(0,c-n),t=Math.min(100,Math.round(n*a*100)),v=Math.round(4e3+(s-1)*1400),C=s*300,o=Math.round(C*(t/100));h.textContent=r===0?"Expired (Replace Now)":`${r.toFixed(1)} Years`,p.textContent=`${t}% Loss`,w.textContent=`$${o} / year`,E.textContent=`$${v.toLocaleString()}`,r>10?(l.textContent="Excellent",l.style.background="#10B981"):r>5?(l.textContent="Good",l.style.background="#0B7A53"):r>2?(l.textContent="Caution",l.style.background="#F59E0B"):(l.textContent="Critical - Replace",l.style.background="#EF4444"),I.value=`[System Age: ${n} Years | Tonnage: ${s} Tons | Maintenance: ${x} | Remaining Life: ${r.toFixed(1)} Yrs | Eff Loss: ${t}%]`,F(n,c,a)}function F(n,s,a){const t={top:20,right:20,bottom:35,left:45},v=450-t.left-t.right,C=250-t.top-t.bottom,o=i=>t.left+i/15*v,e=i=>t.top+(1-(i-.5)/.5)*C;let d=[];for(let i=0;i<=15;i++){const W=Math.max(.5,1-i*a);d.push({x:o(i),y:e(W)})}let k=`M ${d[0].x} ${d[0].y}`;for(let i=1;i<d.length;i++)k+=` L ${d[i].x} ${d[i].y}`;const S=`${k} L ${o(15)} ${e(.5)} L ${o(0)} ${e(.5)} Z`,$=o(n),T=Math.max(.5,1-n*a),z=e(T);B.innerHTML=`
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
            <path d="${S}" fill="rgba(11, 99, 229, 0.05)" />

            <!-- Dynamic Efficiency Curve Line -->
            <path d="${k}" fill="none" stroke="#0B63E5" stroke-width="3.5" stroke-linecap="round" />

            <!-- Max Lifespan boundary -->
            <line x1="${o(s)}" y1="${t.top}" x2="${o(s)}" y2="${250-t.bottom}" stroke="#E63946" stroke-width="1.5" stroke-dasharray="4,4" />
            <text x="${o(s)+5}" y="${t.top+15}" fill="#E63946" font-size="9" font-weight="700">Max Lifespan Boundary</text>

            <!-- Interactive Age Vertical Slider Marker Indicator -->
            <line x1="${$}" y1="${t.top}" x2="${$}" y2="${250-t.bottom}" stroke="#4A5568" stroke-width="2" />
            
            <!-- Interactive Intersection Point dot bubble -->
            <circle cx="${$}" cy="${z}" r="6.5" fill="#4A5568" stroke="#fff" stroke-width="2" />
            
            <!-- Info tooltips text details -->
            <text x="${$}" y="${t.top+5}" fill="#2D3748" font-size="10" font-weight="700" text-anchor="middle" background="white">Your Unit (${n} yrs)</text>
        `}m&&m.addEventListener("submit",n=>{const a=document.getElementById("fullname_plan").value.trim().split(" "),c=a[0]||"",r=a.slice(1).join(" ")||"Customer",t={fname:c,lname:r,tel:document.getElementById("phone_plan").value.trim(),email:document.getElementById("email_plan").value.trim(),city:document.getElementById("city_plan").value.trim(),message:`[AC Lifespan Planner Report] ${I.value} [Request] Client requests pre-failure replacement consultation.`,honeypot:document.getElementById("honeypot_plan").value};typeof window.submitFormWithSync=="function"?window.submitFormWithSync(n,m,t,()=>{typeof window.showToast=="function"?window.showToast("Consultation request secure! Chris or Sean will contact you to schedule an inspection.","success"):alert("Consultation request secure! Chris or Sean will contact you to schedule an inspection."),m.reset(),typeof window.configurePushNotifications=="function"&&window.configurePushNotifications()}):console.error("submitFormWithSync not found in global scope")}),y()});
