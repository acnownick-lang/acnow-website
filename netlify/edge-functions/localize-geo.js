// Netlify Edge Function: Geolocation personalization for A/C Now LLC
// Intercepts traffic at the CDN edge and localizes content based on visitor IP address.

export default async (request, context) => {
  const url = new URL(request.url);

  // Avoid running on static assets, images, API requests, etc.
  if (
    request.method !== "GET" ||
    url.pathname.includes(".") ||
    url.pathname.startsWith("/.netlify")
  ) {
    return; // Pass through
  }

  // Get response from downstream (static file server)
  const response = await context.next();

  // Extract geolocation data from Netlify Edge Context
  const geoCity = context.geo?.city || "";
  const geoRegion = context.geo?.subdivision?.code || "FL"; // e.g., "FL"

  // Only customize if the visitor is from Florida
  if (geoRegion !== "FL" && geoRegion !== "") {
    return response; // Serve standard static content for out-of-state visitors
  }

  // Determine market personalization details based on detected city
  let market = "Stuart"; // Default fallback market
  let servingText = "Serving Palm City, Stuart & Hobe Sound.";
  let phoneText = "(772) 521-3568";
  let phoneHref = "tel:7725213568";

  const cityLower = geoCity.toLowerCase();

  if (cityLower.includes("jupiter") || cityLower.includes("tequesta")) {
    market = "Jupiter";
    servingText = "Serving Jupiter, Tequesta & Hobe Sound.";
    // If they have a dedicated South County line, we can route it here
  } else if (cityLower.includes("stuart") || cityLower.includes("palm city") || cityLower.includes("jensen")) {
    market = "Stuart";
    servingText = "Serving Palm City, Stuart & Jensen Beach.";
  } else if (cityLower.includes("port st. lucie") || cityLower.includes("fort pierce") || cityLower.includes("psl")) {
    market = "Port St. Lucie";
    servingText = "Serving Port St. Lucie, Fort Pierce & Lakewood Park.";
  } else if (geoCity) {
    // Other Florida cities
    market = geoCity;
    servingText = `Serving ${geoCity} & surrounding areas.`;
  }

  // Set geo cookies to preserve state on the client side for subsequent requests/scripts
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    `nf_city=${encodeURIComponent(market)}; Path=/; Max-Age=2592000; SameSite=Lax`
  );

  // HTMLRewriter runs natively on Netlify Edge Functions (powered by Deno runtime)
  // Dynamically rewrite page text server-side at the CDN edge before rendering
  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(`A/C Repair & HVAC Services in ${market}, FL | A/C Now LLC`);
      }
    })
    .on("h1.visually-hidden", {
      element(el) {
        el.setInnerContent(`A/C Now LLC — AC Repair & HVAC Service in ${market}, FL | Same-Day | 24/7 Emergency`);
      }
    })
    // Localize any element with data-geo="city"
    .on("[data-geo='city']", {
      element(el) {
        el.setInnerContent(market);
      }
    })
    // Localize any element with data-geo="serving"
    .on("[data-geo='serving']", {
      element(el) {
        el.setInnerContent(servingText);
      }
    })
    // Localize any phone link with data-geo="phone"
    .on("[data-geo='phone']", {
      element(el) {
        el.setInnerContent(phoneText);
        el.setAttribute("href", phoneHref);
      }
    })
    // Fallback: target the specific locally operated trust card description if no data-attributes exist yet
    .on(".trust-card:nth-child(2) .trust-info p", {
      element(el) {
        el.setInnerContent(servingText);
      }
    })
    .transform(new Response(response.body, { ...response, headers }));
};
