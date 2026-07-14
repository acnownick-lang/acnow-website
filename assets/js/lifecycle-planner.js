document.addEventListener("DOMContentLoaded",()=>{const y=document.getElementById("slider-age"),m=document.getElementById("slider-tonnage"),W=document.getElementById("label-age"),P=document.getElementById("label-tonnage"),M=document.querySelectorAll("div[aria-label='Maintenance Selector'] .toggle-btn"),B=document.getElementById("metric-remaining"),I=document.getElementById("metric-eff-loss"),k=document.getElementById("metric-waste-cost"),b=document.getElementById("metric-capex-cost"),g=document.getElementById("lifecycle-status-badge"),F=document.getElementById("lifecycle-svg"),p=document.getElementById("planner-lead-form"),S=document.getElementById("plan_metrics_input"),h=document.getElementById("attic-temp-input"),T=document.getElementById("attic-temp-val"),$=document.getElementById("attic-insulation-select"),L=document.getElementById("attic-heat-btu"),H=document.getElementById("attic-runtime-pct"),z=document.getElementById("attic-monthly-savings");if(!y||!m||!B||!I||!k||!b||!g){console.warn("[PWA Client] Lifecycle Planner elements missing. Skipping initialization.");return}let w=!0,x="yearly";y.addEventListener("input",()=>{w=!0,W.textContent=`${y.value} Years`,E(),A()}),m.addEventListener("input",()=>{w=!0,P.textContent=`${parseFloat(m.value).toFixed(1)} Tons`,E(),A()}),M.forEach(n=>{n.addEventListener("click",()=>{w=!0,M.forEach(a=>{a.classList.remove("active"),a.setAttribute("aria-pressed","false")}),n.classList.add("active"),n.setAttribute("aria-pressed","true"),x=n.dataset.val,E(),window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})});function A(){window.ComfortAudio&&typeof window.ComfortAudio.playTick=="function"&&window.ComfortAudio.playTick()}function E(){if(!w){B.textContent="Adjust inputs to calculate",I.textContent="\u2014",k.textContent="\u2014",b.textContent="\u2014",g.textContent="Awaiting Input",g.style.background="#64748b",F.innerHTML=`
                <rect x="10" y="10" width="430" height="230" fill="rgba(0,0,0,0.02)" rx="4"/>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="var(--font-body)" font-size="13" fill="#64748B">Graph will populate after interaction</text>
            `;return}const n=parseInt(y.value),a=parseFloat(m.value);let s=.015,d=14;x==="none"?(s=.035,d=10):x==="twice"&&(s=.008,d=16);const l=Math.max(0,d-n),t=Math.round(n*s*100),u=l===0?Math.min(100,Math.max(60,t+20)):Math.min(100,t),f=Math.round(4e3+(a-1)*1400),i=a*300,e=Math.round(i*(u/100));B.textContent=l===0?"Expired (Replace Now)":`${l.toFixed(1)} Years`,I.textContent=`${u}% Loss`,k.textContent=`$${e} / year`,b.textContent=`$${f.toLocaleString()}`;let o="Excellent",r="#10B981";l>10?(o="Excellent",r="#10B981"):l>5?(o="Good",r="#0B7A53"):l>2?(o="Caution",r="#F59E0B"):(o="Critical - Replace",r="#EF4444"),x==="none"&&(o==="Excellent"||o==="Good")&&(o="Caution (Neglected)",r="#F59E0B"),g.textContent=o,g.style.background=r,S.value=`[System Age: ${n} Years | Tonnage: ${a} Tons | Maintenance: ${x} | Remaining Life: ${l.toFixed(1)} Yrs | Eff Loss: ${u}%]`,Y(n,d,s),v()}function Y(n,a,s){const t={top:20,right:20,bottom:35,left:45},u=450-t.left-t.right,f=250-t.top-t.bottom,i=c=>t.left+c/15*u,e=c=>t.top+(1-(c-.5)/.5)*f;let o=[];for(let c=0;c<=15;c++){const G=Math.max(.5,1-c*s);o.push({x:i(c),y:e(G)})}let r=`M ${o[0].x} ${o[0].y}`;for(let c=1;c<o.length;c++)r+=` L ${o[c].x} ${o[c].y}`;const R=`${r} L ${i(15)} ${e(.5)} L ${i(0)} ${e(.5)} Z`,C=i(n),_=Math.max(.5,1-n*s),q=e(_);F.innerHTML=`
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
            <text x="${i(0)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">Brand New</text>
            <text x="${i(5)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">5 Yrs</text>
            <text x="${i(10)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">10 Yrs</text>
            <text x="${i(15)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">15+ Yrs</text>

            <!-- Shaded Area Under Curve -->
            <path d="${R}" fill="rgba(11, 99, 229, 0.05)" />

            <!-- Dynamic Efficiency Curve Line -->
            <path d="${r}" fill="none" stroke="#0B63E5" stroke-width="3.5" stroke-linecap="round" />

            <!-- Max Lifespan boundary -->
            <line x1="${i(a)}" y1="${t.top}" x2="${i(a)}" y2="${250-t.bottom}" stroke="#E63946" stroke-width="1.5" stroke-dasharray="4,4" />
            <text x="${i(a)+5}" y="${t.top+15}" fill="#E63946" font-size="9" font-weight="700">Max Lifespan Boundary</text>

            <!-- Interactive Age Vertical Slider Marker Indicator -->
            <line x1="${C}" y1="${t.top}" x2="${C}" y2="${250-t.bottom}" stroke="#4A5568" stroke-width="2" />
            
            <!-- Interactive Intersection Point dot bubble -->
            <circle cx="${C}" cy="${q}" r="6.5" fill="#4A5568" stroke="#fff" stroke-width="2" />
            
            <!-- Info tooltips text details -->
            <text x="${C}" y="${t.top+5}" fill="#2D3748" font-size="10" font-weight="700" text-anchor="middle" background="white">Your Unit (${n} yrs)</text>
        `}p&&p.addEventListener("submit",n=>{const s=document.getElementById("fullname_plan").value.trim().split(" "),d=s[0]||"",l=s.slice(1).join(" ")||"",t={fname:d,lname:l,tel:document.getElementById("phone_plan").value.trim(),email:document.getElementById("email_plan").value.trim(),city:document.getElementById("city_plan").value.trim(),message:`[AC Lifespan Planner Report] ${S.value} [Request] Client requests pre-failure replacement consultation.`,honeypot:document.getElementById("honeypot_plan").value};typeof window.submitFormWithSync=="function"?window.submitFormWithSync(n,p,t,()=>{typeof window.showToast=="function"?window.showToast("Consultation request secure! Chris or Sean will contact you to schedule an inspection.","success"):alert("Consultation request secure! Chris or Sean will contact you to schedule an inspection."),p.reset(),typeof window.configurePushNotifications=="function"&&window.configurePushNotifications()}):console.error("submitFormWithSync not found in global scope")});function v(){if(!h||!$||!L)return;const n=parseInt(h.value);T&&(T.textContent=`${n}\xB0F`);const a=Math.max(0,n-75),s=$.value;let d=1/19,l=1;s==="r38"?d=1/38:s==="r38shield"&&(d=1/38,l=.55);const u=(parseFloat(m.value)||3)*12e3,f=Math.round(1500*a*d*l*1.5),i=Math.round(1500*a*(1/19)*1*1.5),e=Math.max(0,i-f),o=Math.round(e/u*100),r=e/12e3*1.2*30*6*.15;L&&(L.textContent=`${f.toLocaleString()} BTU/hr`),H&&(H.textContent=`${o}% Runtime Reduction`),z&&(z.textContent=`$${r.toFixed(2)}/month`)}h&&h.addEventListener("input",()=>{v(),A()}),$&&$.addEventListener("change",()=>{v(),window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()}),E(),v()});
