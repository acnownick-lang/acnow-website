import { Context } from "netlify:edge";

interface MarketCopy {
  headlineRes: string;
  headlineCom: string;
  serving: string;
  phone: string;
  phoneHref: string;
}

const MARKET_DATA: Record<string, MarketCopy> = {
  "Stuart": {
    headlineRes: "Keep Your Family Cool in Stuart",
    headlineCom: "Manage Your Stuart Complex",
    serving: "Serving Palm City, Stuart & Jensen Beach.",
    phone: "(772) 521-3568",
    phoneHref: "tel:7725213568"
  },
  "Palm City": {
    headlineRes: "Keep Your Family Cool in Palm City",
    headlineCom: "Manage Your Palm City Commercial Properties",
    serving: "Serving Palm City, Stuart & Hobe Sound.",
    phone: "(772) 521-3568",
    phoneHref: "tel:7725213568"
  },
  "Jupiter": {
    headlineRes: "Jupiter's Premier AC Repair",
    headlineCom: "Commercial HVAC in Jupiter & Tequesta",
    serving: "Serving Jupiter, Tequesta & Hobe Sound.",
    phone: "(772) 521-3568",
    phoneHref: "tel:7725213568"
  },
  "Port St. Lucie": {
    headlineRes: "PSL's Certified HVAC Experts",
    headlineCom: "Rooftop Commercial Units in PSL",
    serving: "Serving Port St. Lucie, Fort Pierce & Lakewood Park.",
    phone: "(772) 521-3568",
    phoneHref: "tel:7725213568"
  },
  "Default": {
    headlineRes: "Keep Your Family Cool",
    headlineCom: "Manage Your Complex",
    serving: "Serving Stuart, Palm City, Port St. Lucie & the Treasure Coast.",
    phone: "(772) 521-3568",
    phoneHref: "tel:7725213568"
  }
};

const DEFAULT_MARKET = "Default";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.pathname.includes(".") ||
    url.pathname.startsWith("/.netlify")
  ) {
    return;
  }

  const response = await context.next();

  let market = DEFAULT_MARKET;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|; )nf_city=([^;]*)/);
  let resolvedFromCookie = false;

  if (match) {
    const dec = decodeURIComponent(match[1]);
    if (Object.keys(MARKET_DATA).includes(dec)) {
      market = dec;
      resolvedFromCookie = true;
    }
  }

  if (!resolvedFromCookie) {
    const geoCity = context.geo?.city || "";
    const geoRegion = context.geo?.subdivision?.code || "";

    if (geoRegion === "FL") {
      const cityLower = geoCity.toLowerCase();
      const whitelist = [
        "jensen beach",
        "fort pierce",
        "hobe sound",
        "palm beach gardens",
        "north palm beach",
        "jupiter",
        "tequesta",
        "palm city",
        "stuart",
        "port st. lucie",
        "psl"
      ];
      const isWhitelisted = whitelist.some(c => cityLower.includes(c) || c.includes(cityLower));
      if (isWhitelisted) {
        if (cityLower.includes("jupiter") || cityLower.includes("tequesta")) {
          market = "Jupiter";
        } else if (cityLower.includes("palm city")) {
          market = "Palm City";
        } else if (cityLower.includes("stuart") || cityLower.includes("jensen")) {
          market = "Stuart";
        } else if (cityLower.includes("port st. lucie") || cityLower.includes("psl") || cityLower.includes("fort pierce")) {
          market = "Port St. Lucie";
        } else if (geoCity) {
          MARKET_DATA[geoCity] = {
            headlineRes: `AC Repair & HVAC Services in ${geoCity}`,
            headlineCom: `Commercial HVAC Services in ${geoCity}`,
            serving: `Proudly serving ${geoCity} & surrounding areas.`,
            phone: "(772) 521-3568",
            phoneHref: "tel:7725213568"
          };
          market = geoCity;
        }
      } else {
        market = "Default";
      }
    } else {
      market = "Default";
    }
  }

  const copy = MARKET_DATA[market] || MARKET_DATA[DEFAULT_MARKET];

  const headers = new Headers(response.headers);
  if (!resolvedFromCookie) {
    headers.append(
      "Set-Cookie",
      `nf_city=${encodeURIComponent(market)}; Path=/; Max-Age=2592000; SameSite=Lax`
    );
  }

  const isNullBodyStatus = [101, 204, 205, 304].includes(response.status);
  if (isNullBodyStatus) {
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  // Pure string replacement logic
  let html = await response.text();

  // 1. Replace title tag content
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>A/C Repair & HVAC Services in ${market === "Default" ? "Florida" : market + ", FL"} | A/C Now LLC</title>`);

  // 2. Replace visually hidden H1 content
  html = html.replace(
    /<h1 class="visually-hidden">[^<]*<\/h1>/i,
    `<h1 class="visually-hidden">A/C Now LLC — AC Repair & HVAC Service in ${market === "Default" ? "Florida" : market + ", FL"} | Same-Day | 24/7 Emergency</h1>`
  );

  // 3. Replace Residential side headline
  html = html.replace(
    /(<div class="split-hero-side left-side">[\s\S]*?<h2 class="side-headline"[^>]*>)[^<]*(<\/h2>)/i,
    `$1${copy.headlineRes}$2`
  );

  // 4. Replace Commercial side headline
  html = html.replace(
    /(<div class="split-hero-side right-side">[\s\S]*?<h2 class="side-headline"[^>]*>)[^<]*(<\/h2>)/i,
    `$1${copy.headlineCom}$2`
  );

  // 5. Replace serving area description
  html = html.replace(
    /<p id="serving-areas-text">Serving Port St\. Lucie &amp; Stuart\.<\/p>/i,
    `<p id="serving-areas-text">${copy.serving}</p>`
  );

  // 6. Replace phone numbers and hrefs dynamically for non-default markets
  if (copy.phone !== "(772) 521-3568") {
    html = html.replaceAll("(772) 521-3568", copy.phone);
    html = html.replaceAll(`href="tel:+17725213568"`, `href="${copy.phoneHref}"`);
    html = html.replaceAll(`href="tel:7725213568"`, `href="${copy.phoneHref}"`);
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};
