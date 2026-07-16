// Netlify Serverless Function: chat-assistant
// Pre-qualifies customer symptoms locally using a rules-based diagnostic lookup,
// sends dispatch briefs to Resend and Discord, and handles follow-up routing.

function escapeHTML(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeInput(str, maxLen) {
  if (typeof str !== "string") return "";
  let clean = str.trim();
  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen);
  }
  return clean.replace(/<[^>]*>/g, ""); // Strip HTML tag structures
}

function sanitizeDiscordText(str) {
  if (typeof str !== "string") return "";
  let clean = str
    .replace(/@everyone/g, "@\\everyone")
    .replace(/@here/g, "@\\here")
    .replace(/<@&?\d+>/g, "[mention]");
  clean = clean.replace(/([*`_~|\\\[\]])/g, "\\$1");
  return clean;
}

// Helper to safely extract, trim, and length-limit strings to prevent type errors/crashes
function getCleanString(val, maxLen, fallback = "") {
  if (typeof val !== "string") return fallback;
  let clean = val.trim();
  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen);
  }
  return clean;
}

function getLocalDiagnosis(issue, name, city) {
  const issueLower = issue.toLowerCase();
  let diagnosticCode = "HVAC-GENERAL";
  let urgencyLevel = "Medium";
  let techNote = "System requires full diagnostic inspection.";
  let causes = [];
  let checks = [];

  if (issueLower.includes("warm") || issueLower.includes("cool") || issueLower.includes("temp") || issueLower.includes("hot") || issueLower.includes("heat") || issueLower.includes("blowing")) {
    diagnosticCode = "COIL-FREEZE";
    urgencyLevel = "High";
    techNote = "System is running but not cooling. Potential refrigerant leak, failed run capacitor, or compressor thermal lockout.";
    causes = [
      "Refrigerant leak (low pressure lockout)",
      "Failed outdoor dual run capacitor (compressor or fan not starting)",
      "Clogged air filter causing evaporator coil freeze-up"
    ];
    checks = [
      "Check if the outdoor unit (condenser) fan is spinning when the system is on.",
      "Check if your air filter is dirty and replace it if needed to restore airflow.",
      "Verify the thermostat is set to 'Cool' and the temperature is set below room temperature."
    ];
  } else if (issueLower.includes("leak") || issueLower.includes("water") || issueLower.includes("drain") || issueLower.includes("drip") || issueLower.includes("flow")) {
    diagnosticCode = "DRAIN-CLOG";
    urgencyLevel = "Medium";
    techNote = "Water leakage detected. Likely clogged condensate drain line or rusted drain pan.";
    causes = [
      "Algae or debris clog in the condensate drain line",
      "Rusted-out primary drain pan in the indoor unit",
      "Activated condensate safety float switch shutting off outdoor condenser"
    ];
    checks = [
      "Inspect the safety float switch on the drain line (it will cut power to the outdoor unit if water backs up).",
      "Check the indoor unit drain pan for standing water.",
      "Do not run the AC if water is actively leaking onto drywall or ceilings."
    ];
  } else if (issueLower.includes("noise") || issueLower.includes("loud") || issueLower.includes("squeal") || issueLower.includes("buzz") || issueLower.includes("rattle")) {
    diagnosticCode = "MECH-FAIL";
    urgencyLevel = "Medium";
    techNote = "Abnormal noise reported. Potential motor bearing failure, loose fan blades, or compressor damage.";
    causes = [
      "Failing outdoor fan motor bearings (buzzing or grinding)",
      "Loose blower wheel or fan blade hitting the shroud",
      "Internal compressor valve wear (loud rattling)"
    ];
    checks = [
      "Turn off the system immediately if you hear metal-on-metal grinding noises.",
      "Inspect the outdoor fan grill for debris (like branches) that might be hitting the blades."
    ];
  } else if (issueLower.includes("power") || issueLower.includes("dead") || issueLower.includes("off") || issueLower.includes("blank") || issueLower.includes("won't turn") || issueLower.includes("wont turn")) {
    diagnosticCode = "POWER-LOSS";
    urgencyLevel = "High";
    techNote = "System has no power. Check circuit breakers, thermostat, safety float switch, and control board fuse.";
    causes = [
      "Tripped circuit breaker in the main electrical panel",
      "Activated condensate float switch due to water backup",
      "Dead thermostat batteries or failed low-voltage transformer"
    ];
    checks = [
      "Check your home's main breaker panel and verify the AC breaker is flipped fully to 'On'.",
      "Replace the batteries in your thermostat if the screen is blank.",
      "Verify the indoor furnace power switch (looks like a light switch) is flipped 'On'."
    ];
  } else {
    causes = [
      "Electrical component wear or contactor failure",
      "Thermostat communication issue",
      "Airflow restriction or ductwork leakage"
    ];
    checks = [
      "Verify the thermostat is set correctly to 'Cool' and 'Auto'.",
      "Check the air filter and replace if dirty."
    ];
  }

  const briefing = `Hello ${name},

Thank you for reaching out to A/C Now LLC. We are sorry to hear you are having trouble with your cooling system in ${city}. Here is a summary of what might be happening:

### Potential Causes:
${causes.map(c => `* ${c}`).join("\n")}

### 2-3 Safe Self-Checks You Can Perform Right Now:
${checks.map((c, i) => `${i + 1}. ${c}`).join("\n")}

If these checks do not resolve the issue, please avoid opening any high-voltage electrical panels yourself. Since AC issues can escalate quickly in South Florida, we recommend speaking with a technician. Please call us directly at **(772) 521-3568** to book a service immediately!

***

[DISPATCH BRIEF]
- Customer: ${name}
- Location: ${city}, FL
- Reported Issue: ${issue}
- Diagnostic Code: ${diagnosticCode}
- Urgency Level: ${urgencyLevel}
- Technician Note: ${techNote}
[END OF BRIEF]`;

  return { briefing, diagnosticCode, urgencyLevel, techNote };
}

export async function handler(event, context) {
  // CORS Preflight & Security Check
  const origin = event.headers.origin || event.headers.Origin || "";
  let allowedOrigin = "";
  
  if (origin) {
    try {
      const parsedUrl = new URL(origin);
      const hostname = parsedUrl.hostname;
      const protocol = parsedUrl.protocol;
      const isProd = hostname === "acnowllc.com" || hostname === "www.acnowllc.com" || hostname.endsWith(".netlify.app");
      const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
      
      // Enforce HTTPS for production domains, allow HTTP for localhost
      if ((isProd && protocol === "https:") || (isLocal && (protocol === "http:" || protocol === "https:"))) {
        allowedOrigin = origin;
      }
    } catch (e) {
      // Invalid URL format in origin header
    }
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin || "https://acnowllc.com",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (origin && !allowedOrigin) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Access Denied: Origin not allowed" }),
    };
  }

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const bodyLength = event.body ? Buffer.byteLength(event.body, 'utf8') : 0;
  if (bodyLength > 20480) {
    return {
      statusCode: 413,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Payload Too Large (20KB limit exceeded)" }),
    };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Malformed payload body" }),
      };
    }

    const { action, name, city, issue, messages } = body;

    if (action === "prequalify") {
      const cleanName = getCleanString(name, 100);
      const cleanCity = getCleanString(city, 100);
      const cleanIssue = getCleanString(issue, 1000);

      if (!cleanName || !cleanCity || !cleanIssue) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Name, city, and system issue are required and must be non-empty strings." }),
        };
      }

      // Execute local rules-based diagnostic lookup (100% free, 0ms latency)
      const diag = getLocalDiagnosis(cleanIssue, cleanName, cleanCity);

      // Still dispatch notifications to Discord and Resend
      await dispatchToDiscord(cleanName, cleanCity, cleanIssue, diag.diagnosticCode, diag.urgencyLevel, diag.techNote);
      await dispatchToResend(cleanName, cleanCity, cleanIssue, diag.briefing);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, briefing: diag.briefing }),
      };
    } 
    
    if (action === "chat") {
      // Replaces full chat with a friendly dispatch redirection message
      const reply = `I have received your diagnostic request and dispatched it to our office desk. A team member will contact you shortly to confirm your booking. For immediate assistance, please call us directly at **(772) 521-3568**, or check our interactive troubleshooter at [acnowllc.com/pages/diagnose](https://acnowllc.com/pages/diagnose).`;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, reply }),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid request action specified." }),
    };

  } catch (error) {
    console.error("Critical error in serverless execution:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to process chat request." }),
    };
  }
}

async function dispatchToDiscord(name, city, issue, code, urgency, techNote) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  const colorMap = { "Low": 3066993, "Medium": 15105570, "High": 15158332 };
  const color = colorMap[urgency] || 746469;

  const discordName = sanitizeDiscordText(name) || "Anonymous Customer";
  const discordCity = sanitizeDiscordText(city) || "Not Provided";
  const discordIssue = sanitizeDiscordText(issue) || "No Issue Details Provided";
  const discordCode = sanitizeDiscordText(code) || "HVAC-GENERAL";
  const discordUrgency = sanitizeDiscordText(urgency) || "Medium";
  const discordTechNote = sanitizeDiscordText(techNote) || "Awaiting troubleshooting.";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "A/C Now Chat Dispatcher",
        avatar_url: "https://acnowllc.com/downloaded_images/mascot-logo-transparent.png",
        embeds: [{
          title: `💬 New Pre-qualified HVAC Lead`,
          color: color,
          fields: [
            { name: "👤 Customer Name", value: discordName, inline: true },
            { name: "📍 Service City", value: `${discordCity}, FL`, inline: true },
            { name: "⚠️ Urgency Level", value: `**${discordUrgency}**`, inline: true },
            { name: "🛠️ Diagnostic Code", value: `\`${discordCode}\``, inline: true },
            { name: "📝 System Issue", value: discordIssue, inline: false },
            { name: "🔧 Tech Note", value: discordTechNote, inline: false }
          ],
          footer: { text: "A/C Now Serverless Dispatch Assistant" },
          timestamp: new Date().toISOString()
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Discord Webhook rejected request with status ${response.status}: ${errText}`);
    }
  } catch (err) {
    console.error("Failed to dispatch to Discord:", err);
  }
}

async function dispatchToResend(name, city, issue, briefing) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const safeName = escapeHTML(name);
  const safeCity = escapeHTML(city);
  const safeIssue = escapeHTML(issue);
  const safeBriefing = escapeHTML(briefing).replace(/\n/g, "<br>");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "A/C Now Site Alerts <alerts@mail.acnowllc.com>",
        to: ["acnowpsl@gmail.com"],
        subject: `[A/C Now Lead] - Pre-Qualified: ${safeName} (${safeCity})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #0b63e5; border-bottom: 2px solid #0b63e5; padding-bottom: 10px; margin-top: 0;">New Pre-Qualified Lead</h2>
            <p><strong>Customer Name:</strong> ${safeName}</p>
            <p><strong>City:</strong> ${safeCity}, FL</p>
            <p><strong>Raw System Behavior Reported:</strong> ${safeIssue}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #0b63e5;">
              <h3 style="margin-top: 0; color: #333;">Diagnostic Brief & Dispatch Advice:</h3>
              <p style="color: #555; line-height: 1.6;">${safeBriefing}</p>
            </div>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Resend API rejected request with status ${response.status}: ${errText}`);
    }
  } catch (err) {
    console.error("Failed to dispatch to Resend:", err);
  }
}
