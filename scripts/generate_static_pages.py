import os
import re

paths_file = "/Users/nicholaselia/.gemini/antigravity/brain/eacfa3ad-ed2a-48b3-b7cb-8323a4b25d77/scratch/old_paths.txt"
site_dir = "/Users/nicholaselia/Desktop/Clients/acnow-netlify"

with open(paths_file, "r") as f:
    paths = [line.strip() for line in f if line.strip()]

# List of sibling page links that need directory prefixing
sibling_pages = [
    "ac-installation.html", "ac-repair.html", "ac-maintenance.html", 
    "commercial.html", "pool-heating.html", "diagnose.html", 
    "planner.html", "configurator.html", 
    "storm-prep.html", "3d-airflow.html", "members.html", 
    "contact.html", "about.html", "reviews.html", "directions.html", 
    "areas.html", "hvac-services-palm-city.html", "hvac-services-stuart.html", 
    "accessibility.html", "privacy.html", "services.html"
]

city_landmark_map = {
    "stuart": ("Stuart", "Stuart Riverwalk and Roosevelt Bridge", "Martin County"),
    "palm-city": ("Palm City", "Leighton Park and St. Lucie River", "Martin County"),
    "fort-pierce": ("Fort Pierce", "Fort Pierce Inlet and Historic Downtown", "St. Lucie County"),
    "ft-pierce": ("Fort Pierce", "Fort Pierce Inlet and Historic Downtown", "St. Lucie County"),
    "jupiter": ("Jupiter", "Jupiter Inlet Lighthouse and Dubois Park", "Palm Beach County"),
    "palm-beach-gardens": ("Palm Beach Gardens", "PGA National and Gardens Mall", "Palm Beach County"),
    "palm-beach-city": ("Palm Beach Gardens", "PGA National and Gardens Mall", "Palm Beach County"),
    "port-saint-lucie": ("Port St. Lucie", "Port St. Lucie Botanical Gardens and Clover Park", "St. Lucie County"),
    "port-st-lucie": ("Port St. Lucie", "Port St. Lucie Botanical Gardens and Clover Park", "St. Lucie County"),
    "saint-lucie-west": ("Saint Lucie West", "Clover Park Stadium and Tradition", "St. Lucie County"),
    "saint-lucie-county": ("St. Lucie County", "Clover Park Stadium and St. Lucie River", "St. Lucie County"),
    "st-lucie-county": ("St. Lucie County", "Clover Park Stadium and St. Lucie River", "St. Lucie County"),
    "jensen-beach": ("Jensen Beach", "Indian River Lagoon and Jenson Beach Park", "Martin County"),
    "martin-county": ("Martin County", "St. Lucie Inlet and Indian River Lagoon", "Martin County"),
}

def get_city_info(path_lower):
    for key, val in city_landmark_map.items():
        if key in path_lower:
            return val
    return ("Florida", "the local Treasure Coast region", "Florida")

def get_template_and_intent(path_lower):
    # 1. Specific matches
    if "contact-us" in path_lower:
        return ("contact.html", "Contact Us", "Get in touch with our veteran-led service team for a free estimate or emergency dispatch.")
    if "about" in path_lower:
        return ("about.html", "About Our Team", "Learn about our veteran-owned HVAC business serving South Florida.")
    if "reviews" in path_lower:
        return ("reviews.html", "Customer Reviews", "Read verified customer reviews and ratings for A/C Now LLC.")
    if "partners-and-referrals" in path_lower:
        return ("about.html", "Partners & Referrals", "A/C Now LLC partners and trusted local vendor networks.")
    
    # 2. Topic/Service matches
    if "pool-heating" in path_lower or "pool-heater" in path_lower:
        return ("pool-heating.html", "Pool Heat Pumps", "Energy-efficient swimming pool heat pump installation, repairs, and maintenance.")
    if "commercial-hvac" in path_lower:
        return ("commercial.html", "Commercial HVAC", "Heavy commercial cooling, rooftop package units, and priority HVAC contracts.")
    if "installation" in path_lower or "replacement" in path_lower:
        return ("ac-installation.html", "AC Installation", "Professional, high-efficiency central air conditioning installation and system replacement.")
    if "repair" in path_lower or "affordable-hvac-repair-services" in path_lower:
        return ("ac-repair.html", "AC Repair", "Same-day diagnostics and 24/7 emergency air conditioning repair services.")
    if "maintenance" in path_lower or "preventive" in path_lower or "preventative" in path_lower:
        return ("ac-maintenance.html", "AC Maintenance", "Regular maintenance tune-ups, filter cleaning, and system efficiency checkups.")
    if "mini-split" in path_lower or "ductless" in path_lower:
        return ("services.html", "Ductless Mini-Split Systems", "High-efficiency ductless mini-split installation and zone cooling solutions.")
    if "air-quality" in path_lower:
        return ("services.html", "Indoor Air Quality", "UV air purifiers, media filters, and indoor relative humidity control.")
    if "areas-we-serve" in path_lower or "hvac-company" in path_lower:
        return ("areas.html", "Service Areas", "Local air conditioning services directory across Martin and St. Lucie counties.")
    if "hvac-services" in path_lower or "air-conditioning-contractors" in path_lower or "air-conditioning-service" in path_lower:
        return ("services.html", "HVAC Services", "Comprehensive residential and commercial heating, cooling, and ventilation services.")
        
    return ("services.html", "HVAC Services", "Comprehensive residential and commercial air conditioning and heating services.")

def replace_faqs(content, faq1_q, faq1_a, faq2_q, faq2_a):
    pattern = re.compile(r'<details[^>]*>.*?</details>', re.DOTALL)
    matches = list(pattern.finditer(content))
    if len(matches) >= 2:
        new_details1 = f"""<!-- START_LOCAL_FAQ1 --><details style="margin-bottom: 16px; border: 1px solid var(--gray-light); border-radius: 8px; padding: 20px; background: var(--white);" open>
                <summary style="font-weight: 700; cursor: pointer; font-size: 17px; color: var(--dark); list-style: none;" role="heading" aria-level="3">{faq1_q}</summary>
                <p style="margin-top: 12px; color: var(--gray-dark); line-height: 1.7;">{faq1_a}</p>
            </details><!-- END_LOCAL_FAQ1 -->"""
        new_details2 = f"""<!-- START_LOCAL_FAQ2 --><details style="margin-bottom: 16px; border: 1px solid var(--gray-light); border-radius: 8px; padding: 20px; background: var(--white);">
                <summary style="font-weight: 700; cursor: pointer; font-size: 17px; color: var(--dark); list-style: none;" role="heading" aria-level="3">{faq2_q}</summary>
                <p style="margin-top: 12px; color: var(--gray-dark); line-height: 1.7;">{faq2_a}</p>
            </details><!-- END_LOCAL_FAQ2 -->"""
        
        start2, end2 = matches[1].span()
        content = content[:start2] + new_details2 + content[end2:]
        
        start1, end1 = matches[0].span()
        content = content[:start1] + new_details1 + content[end1:]
    return content


pilot_page_data = {
    "/heating-and-cooling-near-me/heating-and-cooling-installation-in-jensen-beach/": {
        "intro": "Installing a new high-efficiency AC system in Jensen Beach requires planning for low-lying coastal conditions, where our average 7-foot elevation and intense salt-air exposure quickly corrode standard equipment. We ensure that new installations are elevated above grade and treated with advanced protective coatings to withstand the harsh environment.",
        "prose": "With Jensen Beach's high concentration of retiree homeowners (median age 55.2), we focus our installation services on quiet, ultra-reliable systems equipped with hospital-grade indoor air quality filtration. Our team secures each system using wind-rated hurricane tie-downs engineered to meet strict coastal codes.",
        "faq1_q": "What wind-load regulations apply to new AC installations in Jensen Beach?",
        "faq1_a": "Because Jensen Beach has been hit by major hurricanes like Frances and Jeanne, all new condenser units must be secured using heavy-duty brackets rated for winds up to 150 mph.",
        "faq2_q": "How does elevation affect AC replacement in flood-prone areas of Jensen Beach?",
        "faq2_a": "In low-lying zones near the Indian River Lagoon, we mount outdoor condensers on elevated riser pads to protect them from local flooding and storm surges."
    },
    "/heating-and-cooling-near-me/heating-and-cooling-installation-in-martin-county/": {
        "intro": "Modern AC installations in Martin County must satisfy strict structural and environmental demands, balancing local building department wind codes with the high humidity of the Treasure Coast. We coordinate all permitting and heat load calculations to deliver reliable climate control across the county.",
        "prose": "Serving coastal estates in Hobe Sound to golf communities in Palm City, we customize our county-wide installation services to fit each community's layout. We prioritize energy-efficient SEER2 heat pumps and variable-speed systems designed to combat heavy coastal air.",
        "faq1_q": "What are the permitting requirements for HVAC installations in Martin County?",
        "faq1_a": "All installations require a county permit, load calculation sheets (Manual J), and a final inspection to verify tie-down brackets and electrical compliance.",
        "faq2_q": "How do salt-spray zones across Martin County dictate equipment choice?",
        "faq2_a": "Systems installed within five miles of the ocean need marine-grade epoxy coatings on the coils to prevent galvanic corrosion from saltwater exposure."
    },
    "/heating-and-cooling-near-me/heating-and-cooling-installation-in-port-saint-lucie/": {
        "intro": "Port St. Lucie's continuous expansion across St. Lucie West and Tradition has created a huge demand for energy-efficient AC installations that can handle our hot summers and heavy subtropical rains. We design and install cooling systems optimized for modern residential layouts and high-performance demands.",
        "prose": "To match Port St. Lucie's large planned developments, our installation team focuses on multi-zone variable-speed systems that eliminate hot spots in multi-story floor plans. We configure each new system to run efficiently with smart home automation platforms.",
        "faq1_q": "Are variable-speed systems recommended for Port St. Lucie homes?",
        "faq1_a": "Yes, variable-speed systems are ideal for PSL's transition climate, running on low, continuous speeds that maximize humidity removal and lower energy bills.",
        "faq2_q": "What utility rebates can I get for installing a new AC in Port St. Lucie?",
        "faq2_a": "FPL offers cash incentives for qualifying Energy Star systems, and we assist homeowners with all the documentation to ensure you get your rebate."
    },
    "/heating-and-cooling-near-me/heating-and-cooling-installation-in-saint-lucie-county/": {
        "intro": "Mechanical installations in St. Lucie County require experienced coordination with local building departments to ensure code compliance for wind resistance and energy efficiency. We manage the entire process, from load calculations to final inspections, for residential and commercial systems county-wide.",
        "prose": "From coastal marine properties in Fort Pierce to inland developments in Port St. Lucie, our county-wide installation service is built on military-grade precision. We secure outdoor units using wind-resistant anchors and install high-SEER2 equipment to lower your operating costs.",
        "faq1_q": "What wind-load certificate is required for St. Lucie County AC installations?",
        "faq1_a": "St. Lucie County requires engineering documents certifying that the outdoor condenser pad and tie-downs can withstand wind speeds up to 140 mph.",
        "faq2_q": "How does the local climate affect the sizing of new systems in the county?",
        "faq2_a": "We perform full Manual J calculations to verify that your new system is sized exactly to match your home's insulation, windows, and local heat profile."
    },
    "/heating-and-cooling-near-me/heating-and-cooling-installation-in-saint-lucie-west/": {
        "intro": "Installing a new climate system in the planned community of Saint Lucie West requires expertise in modern residential guidelines and HOA-specific constraints. We install high-efficiency, quiet-operating systems that fit seamlessly into close-knit neighborhoods.",
        "prose": "We customize our installations to meet the strict aesthetic and sound-level standards of St. Lucie West communities. We specialize in low-profile outdoor units, variable-speed air handlers, and advanced zoning controls for maximum comfort.",
        "faq1_q": "Do HOA regulations in Saint Lucie West affect AC replacement?",
        "faq1_a": "Yes, many local HOAs have strict guidelines regarding the visibility, screening, and sound levels of outdoor equipment. We ensure all systems comply with these rules.",
        "faq2_q": "Why are multi-zone systems popular in Saint Lucie West homes?",
        "faq2_a": "Many homes in this community feature high ceilings and open floor plans. Multi-zone systems allow you to control temperatures independently in different rooms."
    },
    "/heating-and-cooling-near-me/heating-cooling-solutions-for-homes-and-businesses-in-fort-pierce/": {
        "intro": "Fort Pierce's unique waterfront position and historic charm present distinct climate control challenges, from high salt-air humidity near the inlet to older electrical systems in our historic commercial core. We deliver reliable HVAC services designed to keep local homes and businesses comfortable and efficient.",
        "prose": "Serving Fort Pierce's historic districts like Lincoln Park and active commercial marina zones, we offer customized maintenance, diagnostics, and repairs. We focus on marine-grade coil protection coatings to defend coastal units against rapid salt corrosion.",
        "faq1_q": "How does proximity to the Fort Pierce Inlet affect HVAC longevity?",
        "faq1_a": "Constant salt spray accelerates aluminum coil oxidation. We recommend bi-annual coil rinses and specialized protective coatings to prevent premature system failure.",
        "faq2_q": "Do you offer commercial HVAC maintenance plans for Fort Pierce businesses?",
        "faq2_a": "Yes, we provide commercial maintenance contracts for local shops, offices, and marinas, focusing on preventive care and energy efficiency."
    },
    "/heating-and-cooling-near-me/heating-cooling-solutions-for-homes-businesses-in-palm-city/": {
        "intro": "With homes positioned along the South Fork of the St. Lucie River, Palm City residents face extreme humidity and unique flood risks that demand specialized HVAC expertise. We provide comprehensive heating and cooling services tailored to large estate homes and low-lying properties.",
        "prose": "Our team has deep experience servicing larger properties in Palm City's country clubs like Harbour Ridge and Cobblestone. We specialize in variable-speed systems, indoor air quality upgrades, and mounting equipment on elevated pads to avoid rising waters.",
        "faq1_q": "Why do Palm City estate homes require variable-speed HVAC systems?",
        "faq1_a": "Large homes often experience temperature imbalances. Variable-speed systems run longer cycles at lower capacity to distribute air evenly and extract humidity.",
        "faq2_q": "How do you protect Palm City HVAC systems from flood damage?",
        "faq2_a": "For low-elevation riverfront homes, we mount outdoor units on structural risers to elevate the system above seasonal high tides and storm surges."
    },
    "/heating-and-cooling-near-me/heating-cooling-solutions-near-you-jupiter/": {
        "intro": "Operating at the easternmost point of the Treasure Coast, Jupiter homes are exposed to maximum coastal winds and corrosive salt-air conditions. Our veteran-led team provides specialized marine-grade HVAC services to defend local properties against rapid salt decay.",
        "prose": "From oceanfront estates to inland developments, we tailor our heating and cooling services to withstand Jupiter's extreme coastal environment. We focus on advanced epoxy coil treatments, heavy-duty electrical components, and quiet-operating variable systems.",
        "faq1_q": "Why is coastal corrosion so severe in Jupiter?",
        "faq1_a": "Jupiter's coastal protrusion exposes outdoor units to constant sea spray, causing galvanic corrosion that eats away copper-to-aluminum joints. Regular maintenance is critical.",
        "faq2_q": "Can your HVAC systems integrate with home automation in Jupiter?",
        "faq2_a": "Yes, we install smart thermostat platforms that allow you to monitor and control your home's temperature and humidity levels remotely."
    },
    "/heating-and-cooling-near-me/heating-cooling-solutions-near-you-palm-beach-gardens/": {
        "intro": "Spanning nearly 60 square miles of high-humidity land, Palm Beach Gardens demands highly efficient air conditioning systems to handle our heavy annual rainfall of 66 inches. We deliver premium cooling services designed to lower energy consumption and control indoor humidity.",
        "prose": "Serving residential golf estates like PGA National and the PGA Boulevard commercial corridor, we specialize in high-SEER2 heat pumps and commercial package units. We configure systems for peak performance and long-term reliability under heavy summer loads.",
        "faq1_q": "How does Palm Beach Gardens' heavy rainfall affect AC performance?",
        "faq1_a": "Prolonged rain increases relative humidity, forcing systems to work harder. We install variable-capacity units that run efficient dehumidification cycles.",
        "faq2_q": "Do you offer commercial cooling solutions along PGA Boulevard?",
        "faq2_a": "Yes, we service light commercial properties, retail spaces, and offices, offering priority repair and scheduled preventive maintenance plans."
    },
    "/heating-and-cooling-near-me/heating-cooling-solutions-near-you-stuart/": {
        "intro": "Squeezed between the St. Lucie River and the Indian River Lagoon, Stuart properties experience constant humidity and high exposure to storm events. We provide comprehensive heating and cooling solutions built to withstand Stuart's riverfront environment and coastal climate.",
        "prose": "Serving historic downtown buildings and riverfront properties, our technicians are experts in retrofitting older housing stock. We provide clean ductless mini-split installations, precision diagnostics, and anti-corrosion coil treatments for coastal durability.",
        "faq1_q": "Why does Stuart's riverfront location demand specialized HVAC service?",
        "faq1_a": "The mixture of river and ocean humidity creates a corrosive environment that accelerates rust. We recommend regular coil washes and protective epoxy coatings.",
        "faq2_q": "Can you install modern HVAC systems in Stuart's historic commercial properties?",
        "faq2_a": "Yes, we design custom systems, including low-profile ductless units, that provide modern efficiency without compromising historical integrity."
    },
    "/heating-and-cooling-near-me/hvac-preventive-maintenance-in-jensen-beach/": {
        "intro": "Regular HVAC maintenance is vital in Jensen Beach to clear out salt accumulation and prevent sudden system breakdowns during our hot summers. Our preventative tune-ups are customized to extend equipment life and ensure peak efficiency.",
        "prose": "Serving Jensen Beach's active retiree communities, we prioritize system reliability and indoor air quality. Our bi-annual visits include chemical coil cleaning to wash away corrosive salt and deep sanitization of the condensate drain system.",
        "faq1_q": "How does salt accumulation affect Jensen Beach AC units?",
        "faq1_a": "Salt air deposits a fine residue on condenser coils, blocking heat transfer and accelerating rust. Bi-annual maintenance washes away these corrosive deposits.",
        "faq2_q": "What indoor air quality checks are included in Jensen Beach maintenance?",
        "faq2_a": "We test all filtration systems, inspect ductwork for mold growth, and sanitize the drain lines to keep indoor air clean and healthy."
    },
    "/heating-and-cooling-near-me/hvac-preventive-maintenance-in-martin-county/": {
        "intro": "Bi-annual HVAC maintenance is the single most effective way to prevent costly system failures across Martin County, where heat and humidity run continuously. We provide structured service agreements that keep your warranty valid and your energy bills low.",
        "prose": "From coastal Hobe Sound estates to inland pastures, we cover the entire county with detailed maintenance visits. We inspect all electrical contacts, measure refrigerant charges, and apply protective treatments to prevent premature wear.",
        "faq1_q": "Is bi-annual maintenance required to keep my Martin County warranty valid?",
        "faq1_a": "Yes, almost all major manufacturers require documented annual or semi-annual maintenance to honor replacement parts warranties.",
        "faq2_q": "How does county-wide maintenance lower utility bills?",
        "faq2_a": "Cleaning dirty coils and calibrating blowers reduces system resistance, allowing the unit to cool your home using less electrical power."
    },
    "/heating-and-cooling-near-me/hvac-preventive-maintenance-in-port-saint-lucie/": {
        "intro": "Preventive AC maintenance in Port St. Lucie is essential to keep systems running smoothly in our high-temperature transition climate. We provide detailed tune-ups that prevent the common issues caused by heavy continuous summer operations.",
        "prose": "Serving homeowners across PSL's planned communities, we specialize in keeping newer systems running at peak SEER2 efficiency. We clean electrical contacts, test capacitors, clear drain lines, and optimize smart thermostat configurations.",
        "faq1_q": "What common failures does maintenance prevent in Port St. Lucie?",
        "faq1_a": "Maintenance helps prevent blown capacitors and clogged drain lines, which are the leading causes of sudden AC breakdowns during PSL summers.",
        "faq2_q": "Do you offer priority dispatch for maintenance plan members in PSL?",
        "faq2_a": "Yes, our Service Club members receive priority scheduling, discounted repairs, and zero diagnostic fees on emergency calls."
    },
    "/heating-and-cooling-near-me/hvac-preventive-maintenance-in-saint-lucie-county/": {
        "intro": "Consistent HVAC maintenance is critical across St. Lucie County, where agricultural dust and coastal salt air combine to clog and corrode system components. We offer county-wide preventive service agreements that protect your cooling investments.",
        "prose": "Our maintenance services support both residential systems in PSL and commercial cooling plants in Fort Pierce. We clean condenser coils, check compressor draw, check for refrigerant leaks, and clear out algae growth in drain lines.",
        "faq1_q": "How does local agricultural dust affect St. Lucie County AC units?",
        "faq1_a": "Windblown dust and pollen clog air filters and coat evaporator coils, reducing airflow and causing the system to freeze up. Regular maintenance keeps coils clean.",
        "faq2_q": "What is included in your county-wide HVAC safety check?",
        "faq2_a": "We test all electrical connections, verify emergency shutoff float switches, and inspect ductwork for air leakage."
    },
    "/heating-and-cooling-near-me/hvac-preventive-maintenance-in-saint-lucie-west/": {
        "intro": "Scheduled HVAC maintenance in Saint Lucie West helps homeowners avoid costly emergency repairs and keep their indoor air clean. We deliver thorough system cleanings that optimize efficiency and ensure silent operation.",
        "prose": "To match the high community standards in Saint Lucie West, we focus on detailed diagnostics and sound reduction during our maintenance visits. We inspect vibration dampeners, calibrate fan motors, and wash out outdoor coils.",
        "faq1_q": "Why is drain line clearing emphasized in Saint Lucie West maintenance?",
        "faq1_a": "SLW's high humidity causes rapid algae buildup in condensate lines. We flush the lines during every visit to prevent backups and water damage.",
        "faq2_q": "Can maintenance help reduce system noise in Saint Lucie West neighborhoods?",
        "faq2_a": "Yes, we tighten loose components, lubricate bearings, and inspect fan blades to ensure quiet, neighbor-friendly operation."
    },
    "/heating-and-cooling-near-me/hvac-unit-installation-in-jensen-beach/": {
        "intro": "Installing a new HVAC unit in Jensen Beach requires careful planning for low-elevation flood risks and intense coastal salt spray. We install modern, high-efficiency equipment designed to withstand the harsh environment of the Treasure Coast.",
        "prose": "We customize our installations for Jensen Beach's waterfront homes and active retirement communities. We elevate outdoor units on riser pads to prevent flood damage and install systems with advanced air purification filters.",
        "faq1_q": "What features make an HVAC unit resilient to Jensen Beach's salt air?",
        "faq1_a": "We install units with epoxy-coated condenser fins and heavy-gauge cabinet steel to resist salt-air corrosion and oxidation.",
        "faq2_q": "How do you secure new installations against high winds in Jensen Beach?",
        "faq2_a": "All systems are secured using wind-resistant concrete pads and heavy-duty tie-downs rated to local building codes."
    },
    "/heating-and-cooling-near-me/hvac-unit-installation-in-martin-county/": {
        "intro": "Selecting and installing a new HVAC unit in Martin County requires navigating local wind regulations and high-humidity demands. We handle the entire installation process, from permits to inspections, to ensure your new system is compliant and efficient.",
        "prose": "From Stuart estates to Palm City golf communities, we install high-efficiency units tailored to your home's specific layout. We focus on modern SEER2 systems, Manual J heat load calculations, and hurricane-proof mounting.",
        "faq1_q": "What are the installation code requirements in Martin County?",
        "faq1_a": "Martin County requires a mechanical permit, a Manual J heat load calculation, and wind-load certification for the outdoor unit pad.",
        "faq2_q": "How does variable-speed technology help Martin County homeowners?",
        "faq2_a": "Variable-speed units run longer, low-energy cycles to extract maximum humidity, keeping your home comfortable at a lower operating cost."
    },
    "/heating-and-cooling-near-me/hvac-unit-installation-in-port-saint-lucie/": {
        "intro": "Installing a new cooling unit in Port St. Lucie is an investment in long-term comfort and energy savings. We design and install high-efficiency systems optimized for PSL's growing residential communities and subtropical climate.",
        "prose": "Serving homeowners across PSL's planned developments, we specialize in high-efficiency heat pumps and multi-zone systems. We configure all installations for maximum air distribution and compatibility with modern smart thermostats.",
        "faq1_q": "How do I choose the right size HVAC unit for my Port St. Lucie home?",
        "faq1_a": "We perform a comprehensive load calculation, analyzing your home's square footage, insulation, and windows to size the unit perfectly.",
        "faq2_q": "What utility incentives are available for installing new units in PSL?",
        "faq2_a": "FPL offers rebates for Energy Star systems, and we assist with the paperwork to help you claim these savings."
    },
    "/heating-and-cooling-near-me/hvac-unit-installation-in-saint-lucie-county/": {
        "intro": "HVAC unit installations in St. Lucie County require experienced permitting and code compliance to ensure safety and energy efficiency. We manage the entire installation process county-wide, delivering high-performance climate systems.",
        "prose": "From Fort Pierce marina properties to inland Port St. Lucie developments, we install durable, high-efficiency equipment. We anchor all systems to meet wind resistance codes and configure units for maximum dehumidification.",
        "faq1_q": "What wind-load standards must new installations meet in St. Lucie County?",
        "faq1_a": "Outdoor units must be secured using tie-down brackets certified to withstand wind speeds up to 140 mph.",
        "faq2_q": "How does high humidity influence new unit sizing in St. Lucie County?",
        "faq2_a": "We select equipment with excellent sensible and latent heat removal capacity to keep indoor humidity levels under control."
    },
    "/heating-and-cooling-near-me/hvac-unit-installation-in-saint-lucie-west/": {
        "intro": "Installing a new HVAC unit in Saint Lucie West requires adhering to community standards and HOA aesthetic guidelines. We install quiet, high-efficiency systems that comply with all local regulations while delivering premium comfort.",
        "prose": "We customize our installations for Saint Lucie West's residential neighborhoods. We specialize in low-noise outdoor condensers, multi-zone duct configurations, and smart thermostats for precise climate control.",
        "faq1_q": "Do HOAs in Saint Lucie West have noise limits for outdoor units?",
        "faq1_a": "Yes, many local HOAs require outdoor units to meet specific low-decibel ratings. We install premium, quiet condensers that comply with these rules.",
        "faq2_q": "Can you install multi-zone systems in Saint Lucie West homes?",
        "faq2_a": "Yes, we design custom zoned systems that allow you to set different temperatures for different sections of your home."
    },
    "/heating-and-cooling-near-me/mini-split-system-maintenance-in-martin-county/": {
        "intro": "Regular maintenance is critical for ductless mini-split systems in Martin County, where individual zone units work continuously to combat heat and humidity. We deliver specialized cleaning services that keep your mini-split system running efficiently.",
        "prose": "From Stuart's historic retrofits to Hobe Sound's guest houses, we maintain ductless systems county-wide. We deep-clean blowers, sanitize condensate pumps, inspect refrigerant lines, and clean filters for optimal indoor air quality.",
        "faq1_q": "Why is blower wheel cleaning emphasized in Martin County mini-split maintenance?",
        "faq1_a": "Mini-split blower wheels operate in high-humidity zones, making them prone to mold and dust accumulation. We deep-clean them to protect your air quality.",
        "faq2_q": "How often should I clean the filters in my Martin County mini-split system?",
        "faq2_a": "We recommend washing the reusable filters every 4–6 weeks, with professional deep-cleanings twice per year to maintain efficiency."
    },
    "/heating-and-cooling-near-me/mini-split-system-maintenance-in-port-saint-lucie/": {
        "intro": "Ductless mini-split maintenance in Port St. Lucie helps homeowners maintain zoning efficiency and prevent condensate water damage. We provide detailed deep-clean services customized for multi-zone ductless configurations.",
        "prose": "Serving homes across PSL's expanding residential neighborhoods, we specialize in maintaining ductless comfort zones. We clean chemical coils, verify condensate drain operations, check electrical connections, and calibrate thermostats.",
        "faq1_q": "How do you prevent water leaks in Port St. Lucie mini-split installations?",
        "faq1_a": "We clear out the narrow condensate lines and test the mini-condensate pumps during every maintenance visit to prevent overflows.",
        "faq2_q": "What maintenance is required for multi-zone ductless systems in PSL?",
        "faq2_a": "Each wall-mounted unit requires independent coil cleaning, filter checks, and drainage verification to ensure overall system balance."
    },
    "/heating-and-cooling-near-me/mini-split-system-maintenance-in-saint-lucie-county/": {
        "intro": "Consistent mini-split maintenance is essential in St. Lucie County to prevent mold growth and maintain the efficiency of ductless cooling zones. We provide comprehensive cleaning and diagnostic services for all ductless brands county-wide.",
        "prose": "Supporting residential and commercial mini-split systems across the county, our technicians use specialized deep-cleaning shrouds. We clean the evaporator coils, sanitize casing parts, and test system performance.",
        "faq1_q": "What are the signs that my St. Lucie County mini-split needs professional maintenance?",
        "faq1_a": "Reduced airflow, musty odors, water dripping from the indoor unit, or increased noise indicate that a professional deep-cleaning is required.",
        "faq2_q": "How does mini-split maintenance differ from standard central AC maintenance?",
        "faq2_a": "Mini-splits require individual indoor unit disassembly, blower wheel washing, and specialized condensate pump checks that central units don't have."
    },
    "/heating-and-cooling-near-me/mini-split-system-maintenance-in-saint-lucie-west/": {
        "intro": "Scheduled mini-split maintenance in Saint Lucie West keeps zoning systems running quietly and efficiently. We provide detailed, non-disruptive cleaning services that ensure your system operates at peak performance.",
        "prose": "Serving residential homes in Saint Lucie West, we focus on detailed sanitization and quiet-operation tuning. We wash blower wheels, check casing seals, test remote controls, and flush out condensate drain channels.",
        "faq1_q": "Why is silent operation a focus for Saint Lucie West mini-split maintenance?",
        "faq1_a": "Mini-splits are often installed in bedrooms and home offices. We inspect fan alignment and lubricate motors to ensure whisper-quiet operation.",
        "faq2_q": "Does high relative humidity in Saint Lucie West affect mini-split mold risks?",
        "faq2_a": "Yes, the constant humidity can lead to mold growth on the internal blowers. Our specialized chemical sanitization prevents this issue."
    }
}

generated_count = 0


for path in paths:
    if path == "/" or not path:
        continue
        
    path_lower = path.lower()
    
    # Skip handcrafted clean URL folders
    if any(x in path_lower for x in ["/about/", "/contact-us/", "/reviews/", "/partners-and-referrals/"]):
        continue
        
    template_name, service_name, meta_desc = get_template_and_intent(path_lower)
    city_name, landmark, county = get_city_info(path_lower)
    
    # Read the template from site/pages/
    template_path = os.path.join(site_dir, "pages", template_name)
    if not os.path.exists(template_path):
        print(f"Skipping {path} - template pages/{template_name} does not exist.")
        continue
        
    print(f"Generating: {path} using pages/{template_name}")
    with open(template_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Calculate depth and relative prefix
    parts = [p for p in path.split('/') if p]
    depth = len(parts)
    relative_prefix = "../" * depth
    
    # 1. Update relative links starting with "../"
    content = content.replace('href="../', f'href="{relative_prefix}')
    content = content.replace('src="../', f'src="{relative_prefix}')
    content = content.replace('content="../', f'content="{relative_prefix}')
    content = content.replace('action="../', f'action="{relative_prefix}')
    content = content.replace("url('../", f"url('{relative_prefix}")
    content = content.replace('url("../', f'url("{relative_prefix}')
    
    # 2. Update sibling page links (no prefix originally, e.g. href="ac-repair.html")
    for sp in sibling_pages:
        content = content.replace(f'href="{sp}"', f'href="{relative_prefix}pages/{sp}"')
        content = content.replace(f'href=\'{sp}\'', f'href=\'{relative_prefix}pages/{sp}\'')
        
    # 3. Localize SEO Title
    if service_name.endswith("Services") or service_name.endswith("Systems") or service_name.endswith("Pumps") or service_name == "Service Areas":
        localized_title = f"{service_name} in {city_name}, FL | A/C Now LLC"
    else:
        localized_title = f"{service_name} Services in {city_name}, FL | A/C Now LLC"
    content = re.sub(r"<title>.*?</title>", f"<title>{localized_title}</title>", content)
    
    # 4. Localize Meta Description
    localized_desc = f"{service_name} in {city_name}, FL near {landmark}. {meta_desc} Veteran-owned, 24/7 same-day service."
    content = re.sub(r'<meta name="description" content=".*?">', f'<meta name="description" content="{localized_desc}">', content)
    
    # 5. Localize Canonical Tag
    content = re.sub(r'<link rel="canonical" href=".*?">', f'<link rel="canonical" href="https://acnowllc.com{path}">', content)
    
    # 6. Localize Open Graph & Twitter Card tags
    content = re.sub(r'<meta property="og:url" content=".*?">', f'<meta property="og:url" content="https://acnowllc.com{path}">', content)
    content = re.sub(r'<meta property="og:title" content=".*?">', f'<meta property="og:title" content="{localized_title}">', content)
    content = re.sub(r'<meta property="og:description" content=".*?">', f'<meta property="og:description" content="{localized_desc}">', content)
    content = re.sub(r'<meta name="twitter:title" content=".*?">', f'<meta name="twitter:title" content="{localized_title}">', content)
    content = re.sub(r'<meta name="twitter:description" content=".*?">', f'<meta name="twitter:description" content="{localized_desc}">', content)
    
    # 7. Localize JSON-LD Schema Location info
    if city_name != "Florida" and city_name != "Port St. Lucie":
        content = content.replace('"addressLocality": "Port St. Lucie"', f'"addressLocality": "{city_name}"')
        
    # Also update schema url and @id
    content = re.sub(r'"url": "https://acnowllc\.com/.*?"', f'"url": "https://acnowllc.com{path}"', content)
    
    # 8. Localize Page Headings (e.g. H1/H2)
    h1_match = re.search(r'<h1([^>]*)>(.*?)</h1>', content)
    if h1_match:
        h1_attrs = h1_match.group(1)
        h1_inner = h1_match.group(2)
        # Strip hardcoded template city references to avoid double city titles
        clean_inner = re.sub(r'Port St\.\s*Lucie(?:,\s*FL)?\s*', '', h1_inner).strip()
        new_h1_text = f"{clean_inner} in {city_name}, FL"
        content = re.sub(
            r'<h1([^>]*)>(.*?)</h1>',
            rf'<h1\1>{new_h1_text}</h1>',
            content,
            count=1
        )
    
    # Let's replace the first paragraph in the hero if possible to add local landmark copy
    content = re.sub(
        r'<(p|span) class="hero-subtitle(.*?)">(.*?)</\1>',
        rf'<\1 class="hero-subtitle\2">Veteran-owned heating & cooling comfort serving {city_name} near {landmark} and surrounding regions.</\1>',
        content,
        count=1
    )
    
    
    # 8.5. Localize specific text paragraphs and FAQs for pilot pages
    if path in pilot_page_data:
        data = pilot_page_data[path]
        content = replace_faqs(content, data["faq1_q"], data["faq1_a"], data["faq2_q"], data["faq2_a"])
        
        intro_wrapped = f"<!-- START_LOCAL_INTRO -->{data['intro']}<!-- END_LOCAL_INTRO -->"
        prose_wrapped = f"<!-- START_LOCAL_PROSE -->{data['prose']}<!-- END_LOCAL_PROSE -->"
        
        content = content.replace("A/C Now LLC provides professional AC repair, HVAC installation, and preventive maintenance in Port St. Lucie, Palm City, Stuart, and Jupiter, FL. Our veteran technicians diagnose and repair all major HVAC brands same-day. We serve residential homes and commercial properties throughout Martin and St. Lucie counties.", intro_wrapped)
        content = content.replace('A/C Now LLC is a veteran-owned, licensed HVAC contractor (License #CAC1820542) serving Port St. Lucie, Stuart, Palm City, Jupiter, Jensen Beach, Fort Pierce, and Hobe Sound, FL. Call <a href="tel:7725213568" class="phone-link" style="color: var(--primary); font-weight: 700; text-decoration: none;">(772) 521-3568</a> for same-day service across the Treasure Coast.', prose_wrapped)
        
        content = content.replace("Under-sized air conditioners will run continuously, causing high utility bills and compressor burn-out. Over-sized units cycle on and off too fast, leaving high humidity and hot spots in your home. At A/C Now LLC, we run professional load calculations on your residence to match your system perfectly.", intro_wrapped)
        content = content.replace("Upgrading to a modern 15+ SEER2 cooling unit significantly reduces your monthly power consumption and improves overall indoor air comfort.", prose_wrapped)
        
        content = content.replace("Losing cooling in the Florida summer heat is more than uncomfortable—it is an emergency. Our licensed and veteran technicians arrive with stocked service trucks, prepared to quickly identify faults on contactors, fan motors, evaporators, and compressors. We provide honest, flat-rate quotes prior to executing any repairs.", intro_wrapped)
        content = content.replace("Before scheduling a truck roll, you can run our interactive DIY troubleshooter to see if the issue is a simple thermostat configuration error or a clogged filter.", prose_wrapped)
        
        content = content.replace("South Florida's heat forces your air conditioner to run up to 10 hours a day. Without regular maintenance, efficiency drops by 5% annually, inflating your monthly electric bill. Our military-grade tune-ups keep your unit running cleanly, stop breakdown emergencies before they happen, and protect your manufacturer’s warranty.", intro_wrapped)
        content = content.replace("We perform coil cleaning, drain line flushing, capacitor audits, and contactor inspections to verify your system is running at optimum coefficient of performance (COP) specs.", prose_wrapped)


    # 9. Create target directory and write index.html
    relative_dir = path.strip("/")
    target_dir = os.path.join(site_dir, relative_dir)
    os.makedirs(target_dir, exist_ok=True)
    
    target_file = os.path.join(target_dir, "index.html")
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(content)
        
    generated_count += 1

print(f"Successfully generated {generated_count} local-SEO static pages under {site_dir}!")
