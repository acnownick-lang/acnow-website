document.addEventListener("DOMContentLoaded",()=>{const h=document.getElementById("slider-age"),y=document.getElementById("slider-tonnage"),P=document.getElementById("label-age"),Y=document.getElementById("label-tonnage"),F=[1.5,2,2.5,3,3.5,4,5],T=document.querySelectorAll("div[aria-label='Maintenance Selector'] .toggle-btn"),I=document.getElementById("metric-remaining"),k=document.getElementById("metric-eff-loss"),b=document.getElementById("metric-waste-cost"),L=document.getElementById("metric-capex-cost"),p=document.getElementById("lifecycle-status-badge"),S=document.getElementById("lifecycle-svg"),$=document.getElementById("planner-lead-form"),H=document.getElementById("plan_metrics_input"),w=document.getElementById("attic-temp-input"),z=document.getElementById("attic-temp-val"),E=document.getElementById("attic-insulation-select"),A=document.getElementById("attic-heat-btu"),R=document.getElementById("attic-runtime-pct"),W=document.getElementById("attic-monthly-savings");if(!h||!y||!I||!k||!b||!L||!p){console.warn("[PWA Client] Lifecycle Planner elements missing. Skipping initialization.");return}let v=!0,g="yearly";h.addEventListener("input",()=>{v=!0,P.textContent=`${h.value} Years`,C(),M()}),y.addEventListener("input",()=>{v=!0;const e=F[parseInt(y.value)]||3;Y.textContent=`${e.toFixed(1)} Tons`,C(),M()}),T.forEach(e=>{e.addEventListener("click",()=>{v=!0,T.forEach(l=>{l.classList.remove("active"),l.setAttribute("aria-pressed","false")}),e.classList.add("active"),e.setAttribute("aria-pressed","true"),g=e.dataset.val,C(),window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()})});function M(){window.ComfortAudio&&typeof window.ComfortAudio.playTick=="function"&&window.ComfortAudio.playTick()}function C(){if(!v){I.textContent="Adjust inputs to calculate",k.textContent="\u2014",b.textContent="\u2014",L.textContent="\u2014",p.textContent="Awaiting Input",p.style.background="#64748b",S.innerHTML=`
                <rect x="10" y="10" width="430" height="230" fill="rgba(0,0,0,0.02)" rx="4"/>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="var(--font-body)" font-size="13" fill="#64748B">Graph will populate after interaction</text>
            `;return}const e=parseInt(h.value),l=parseInt(y.value),c=F[l]||3;let r=.015,d=14;g==="none"?(r=.035,d=10):g==="twice"&&(r=.008,d=16);const t=Math.max(0,d-e),x=Math.round(e*r*100),f=t===0?Math.min(100,Math.max(60,x+20)):Math.min(100,x),n={1.5:6200,2:6250,2.5:6500,3:7200,3.5:7900,4:8700,5:9600}[c]||7200,u=c*300,m=Math.round(u*(f/100));I.textContent=t===0?"Expired (Replace Now)":`${t.toFixed(1)} Years`,k.textContent=`${f}% Loss`,b.textContent=`$${m} / year`,L.textContent=`$${n.toLocaleString()}`;let a="Excellent",o="#10B981";g==="twice"?e>=15?(a="Critical - Replace",o="#EF4444"):e>=10?(a="Caution",o="#F59E0B"):e>=6?(a="Good",o="#0B7A53"):(a="Excellent",o="#10B981"):g==="yearly"?e>=13?(a="Critical - Replace",o="#EF4444"):e>=10?(a="Caution",o="#F59E0B"):e>=6?(a="Good",o="#0B7A53"):(a="Excellent",o="#10B981"):e>=9?(a="Critical - Replace",o="#EF4444"):(a="Caution (Neglected)",o="#F59E0B"),p.textContent=a,p.style.background=o,H.value=`[System Age: ${e} Years | Tonnage: ${c} Tons | Maintenance: ${g} | Remaining Life: ${t.toFixed(1)} Yrs | Eff Loss: ${f}%]`,_(e,d,r),B()}function _(e,l,c){const t={top:20,right:20,bottom:35,left:45},x=450-t.left-t.right,f=250-t.top-t.bottom,i=s=>t.left+s/15*x,n=s=>t.top+(1-(s-.5)/.5)*f;let u=[];for(let s=0;s<=15;s++){const G=Math.max(.5,1-s*c);u.push({x:i(s),y:n(G)})}let m=`M ${u[0].x} ${u[0].y}`;for(let s=1;s<u.length;s++)m+=` L ${u[s].x} ${u[s].y}`;const a=`${m} L ${i(15)} ${n(.5)} L ${i(0)} ${n(.5)} Z`,o=i(e),V=Math.max(.5,1-e*c),q=n(V);S.innerHTML=`
            <!-- Grid Lines -->
            <line x1="${t.left}" y1="${n(1)}" x2="${450-t.right}" y2="${n(1)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${t.left}" y1="${n(.8)}" x2="${450-t.right}" y2="${n(.8)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${t.left}" y1="${n(.6)}" x2="${450-t.right}" y2="${n(.6)}" stroke="#E2E8F0" stroke-width="1" />
            <line x1="${t.left}" y1="${n(.5)}" x2="${450-t.right}" y2="${n(.5)}" stroke="#CBD5E0" stroke-width="1.5" />

            <!-- Y Axis labels -->
            <text x="${t.left-10}" y="${n(1)+4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">100%</text>
            <text x="${t.left-10}" y="${n(.8)+4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">80%</text>
            <text x="${t.left-10}" y="${n(.6)+4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">60%</text>
            <text x="${t.left-10}" y="${n(.5)+4}" fill="#718096" font-size="10" text-anchor="end" font-weight="600">50%</text>
            
            <!-- X Axis labels -->
            <text x="${i(0)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">Brand New</text>
            <text x="${i(5)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">5 Yrs</text>
            <text x="${i(10)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">10 Yrs</text>
            <text x="${i(15)}" y="238" fill="#718096" font-size="10" text-anchor="middle" font-weight="600">15+ Yrs</text>

            <!-- Shaded Area Under Curve -->
            <path d="${a}" fill="rgba(11, 99, 229, 0.05)" />

            <!-- Dynamic Efficiency Curve Line -->
            <path d="${m}" fill="none" stroke="#0B63E5" stroke-width="3.5" stroke-linecap="round" />

            <!-- Max Lifespan boundary -->
            <line x1="${i(l)}" y1="${t.top}" x2="${i(l)}" y2="${250-t.bottom}" stroke="#E63946" stroke-width="1.5" stroke-dasharray="4,4" />
            <text x="${i(l)+5}" y="${t.top+15}" fill="#E63946" font-size="9" font-weight="700">Max Lifespan Boundary</text>

            <!-- Interactive Age Vertical Slider Marker Indicator -->
            <line x1="${o}" y1="${t.top}" x2="${o}" y2="${250-t.bottom}" stroke="#4A5568" stroke-width="2" />
            
            <!-- Interactive Intersection Point dot bubble -->
            <circle cx="${o}" cy="${q}" r="6.5" fill="#4A5568" stroke="#fff" stroke-width="2" />
            
            <!-- Info tooltips text details -->
            <text x="${o}" y="${t.top+5}" fill="#2D3748" font-size="10" font-weight="700" text-anchor="middle" background="white">Your Unit (${e} yrs)</text>
        `}$&&$.addEventListener("submit",e=>{const c=document.getElementById("fullname_plan").value.trim().split(" "),r=c[0]||"",d=c.slice(1).join(" ")||"",t={fname:r,lname:d,tel:document.getElementById("phone_plan").value.trim(),email:document.getElementById("email_plan").value.trim(),city:document.getElementById("city_plan").value.trim(),message:`[AC Lifespan Planner Report] ${H.value} [Request] Client requests pre-failure replacement consultation.`,honeypot:document.getElementById("honeypot_plan").value};typeof window.submitFormWithSync=="function"?window.submitFormWithSync(e,$,t,()=>{typeof window.showToast=="function"?window.showToast("Consultation request secure! Our team will contact you to schedule an inspection.","success"):alert("Consultation request secure! Our team will contact you to schedule an inspection."),$.reset(),typeof window.configurePushNotifications=="function"&&window.configurePushNotifications()}):console.error("submitFormWithSync not found in global scope")});function B(){if(!w||!E||!A)return;const e=parseInt(w.value);z&&(z.textContent=`${e}\xB0F`);const l=Math.max(0,e-75),c=E.value;let r=1/19,d=1;c==="r38"?r=1/38:c==="r38shield"&&(r=1/38,d=.55);const x=(parseFloat(y.value)||3)*12e3,f=Math.round(1500*l*r*d*1.5),i=Math.round(1500*l*(1/19)*1*1.5),n=Math.max(0,i-f),u=Math.round(n/x*100),m=n/12e3*1.2*30*6*.15;A&&(A.textContent=`${f.toLocaleString()} BTU/hr`),R&&(R.textContent=`${u}% Runtime Reduction`),W&&(W.textContent=`$${m.toFixed(2)}/month`)}w&&w.addEventListener("input",()=>{B(),M()}),E&&E.addEventListener("change",()=>{B(),window.ComfortAudio&&typeof window.ComfortAudio.playClick=="function"&&window.ComfortAudio.playClick()}),C(),B()});
