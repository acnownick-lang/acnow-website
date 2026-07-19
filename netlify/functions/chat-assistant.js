// Netlify Serverless Function: chat-assistant
// Pre-qualifies customer symptoms locally using a rules-based diagnostic lookup,
// sends dispatch briefs to Resend and Discord, and handles follow-up routing.
// Lead Ledger: every prequalify invocation is written to Netlify Blobs (store: "leads")
// BEFORE any notification attempt. Delivery status updated after each send.

import { getStore } from "@netlify/blobs";

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
  clean = clean.replace(/([*`_~|\\[\]])/g, "\\$1");
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

// Generate a unique, time-sortable lead ID
function generateLeadId() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).substring(2, 10);
  return `lead_${ts}_${rand}`;
}

// Write or update a lead record in the Netlify Blobs "leads" store.
// Returns true on success, false on failure (caller continues either way).
async function persistLead(leadId, record) {
  try {
    const store = getStore({ name: "leads", consistency: "strong" });
    await store.setJSON(leadId, record);
    return true;
  } catch (err) {
    console.error(`[Ledger] Blob operation failed for ${leadId}:`, err.message || err);
    return false;
  }
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

      const issueLower = cleanIssue.toLowerCase();

      // Check symptoms
      const hasSymptom = 
        issueLower.includes("warm") || 
        issueLower.includes("cool") || 
        issueLower.includes("temp") || 
        issueLower.includes("hot") || 
        issueLower.includes("heat") || 
        issueLower.includes("blowing") ||
        issueLower.includes("leak") || 
        issueLower.includes("water") || 
        issueLower.includes("drain") || 
        issueLower.includes("drip") || 
        issueLower.includes("flow") ||
        issueLower.includes("noise") || 
        issueLower.includes("loud") || 
        issueLower.includes("squeal") || 
        issueLower.includes("buzz") || 
        issueLower.includes("rattle") ||
        issueLower.includes("power") || 
        issueLower.includes("dead") || 
        issueLower.includes("off") || 
        issueLower.includes("blank") || 
        issueLower.includes("won't turn") || 
        issueLower.includes("wont turn") ||
        issueLower.includes("ac") ||
        issueLower.includes("a/c") ||
        issueLower.includes("compressor") ||
        issueLower.includes("condenser") ||
        issueLower.includes("thermostat") ||
        issueLower.includes("filter");

      // Check booking intent
      const isBooking = 
        issueLower.includes("book") || 
        issueLower.includes("schedule") || 
        issueLower.includes("estimate") || 
        issueLower.includes("quote") || 
        issueLower.includes("come out") || 
        issueLower.includes("send someone") || 
        issueLower.includes("repair my") || 
        issueLower.includes("request service") || 
        issueLower.includes("dispatch") || 
        issueLower.includes("need service") ||
        issueLower.includes("diagnostic fee") ||
        issueLower.includes("diagnostic charge");

      // Check service/admin intent
      const isServiceAdmin = 
        issueLower.includes("confirm") || 
        issueLower.includes("confirmation") || 
        issueLower.includes("appointment") || 
        issueLower.includes("reschedule") || 
        issueLower.includes("cancel") || 
        issueLower.includes("invoice") || 
        issueLower.includes("receipt") || 
        issueLower.includes("bill") || 
        issueLower.includes("price") || 
        issueLower.includes("hours") || 
        issueLower.includes("speak to") || 
        issueLower.includes("human") || 
        issueLower.includes("agent") || 
        issueLower.includes("person") || 
        issueLower.includes("real person") || 
        issueLower.includes("customer service");

      let leadType = "Service Booking Request";
      let briefing = "";
      let isDiagnosticFlow = false;
      let diagCode = "HVAC-GENERAL";
      let urgencyLevel = "Medium";
      let techNote = "Awaiting manual dispatcher review.";

      if (isBooking && !hasSymptom) {
        leadType = "Service Booking Request";
        briefing = `Thank you, ${cleanName}. I have received your service booking request for ${cleanCity} and dispatched it directly to our office desk. A team member will contact you shortly to confirm your booking. For immediate assistance, please call us directly at **(772) 521-3568**.`;
        diagCode = "booking-direct";
        urgencyLevel = "High";
        techNote = "Direct booking request bypasses diagnostics.";
      } else if (isServiceAdmin) {
        leadType = "Customer Service Request";
        briefing = `Thank you, ${cleanName}. I have received your inquiry regarding customer service/admin support and routed it to our office team. We will review your request and follow up shortly. For immediate assistance, please call us directly at **(772) 521-3568**.`;
        diagCode = "service-admin";
        urgencyLevel = "Medium";
        techNote = "General service/admin inquiry.";
      } else if (!hasSymptom) {
        // Unrecognized else-bucket
        leadType = "Customer Service Request";
        briefing = `Thank you, ${cleanName}. I have received your message and routed it directly to our office desk. Our team will review your message and follow up shortly. For immediate assistance, please call us directly at **(772) 521-3568**.`;
        diagCode = "unrecognized-inquiry";
        urgencyLevel = "Medium";
        techNote = "Unrecognized else-bucket inquiry.";
      } else {
        // Cooling Symptom Diagnostic Flow
        isDiagnosticFlow = true;
        leadType = "Pre-Qualified HVAC Lead";
        const diagResult = getLocalDiagnosis(cleanIssue, cleanName, cleanCity);
        briefing = diagResult.briefing;
        diagCode = diagResult.diagnosticCode;
        urgencyLevel = diagResult.urgencyLevel;
        techNote = diagResult.techNote;
      }

      // Parse legacy fields / dynamic day time
      let preferredDate = getCleanString(body.preferred_date || body.preferred_day || body["preferred-date"], 100, "").trim();
      let preferredTime = getCleanString(body.preferred_time || body["preferred-time"], 100, "").trim();

      let finalDayTime = "First Available";
      if (preferredDate) {
        if (preferredTime && preferredTime !== "First Available") {
          finalDayTime = `${preferredDate} (${preferredTime})`;
        } else {
          finalDayTime = preferredDate;
        }
      } else {
        const msgStr = cleanIssue;
        const reservedSlotMatch = msgStr.match(/\[Reserved Slot\]\s*([^|\]\n]+)/);
        const prefDateMatchBrackets = msgStr.match(/\[Preferred Date:\s*([^|\]\n]+)\]/);
        const prefDateMatchColon = msgStr.match(/\[Preferred Date\]\s*([^|\]\n]+)/);

        if (reservedSlotMatch) {
          finalDayTime = reservedSlotMatch[1].trim();
        } else if (prefDateMatchBrackets) {
          finalDayTime = prefDateMatchBrackets[1].trim();
        } else if (prefDateMatchColon) {
          finalDayTime = prefDateMatchColon[1].trim();
        }
      }

      let leadSource = "Chat Assistant (Prequalify)";
      if (!isDiagnosticFlow) {
        leadSource = `Chat Assistant (${leadType})`;
      }

      // ───────────────────────────────────────────────────────────────────────
      // LEAD LEDGER — Write to Netlify Blobs BEFORE any notification attempt.
      // ───────────────────────────────────────────────────────────────────────
      const leadId = generateLeadId();
      const leadRecord = {
        leadId,
        timestamp: new Date().toISOString(),
        source: "chat-assistant",
        fields: {
          name: cleanName,
          city: cleanCity,
          issue: cleanIssue,
          diagnosticCode: diagCode,
          urgencyLevel: urgencyLevel,
          techNote: techNote,
          leadType: leadType,
          leadSource: leadSource,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          requested_day_time: finalDayTime,
        },
        delivery: {
          resend: { status: "pending", error: null, attemptedAt: null },
          discord: { status: "pending", error: null, attemptedAt: null },
        },
      };

      const blobWritten = await persistLead(leadId, leadRecord);
      if (blobWritten) {
        console.log(`[Ledger] Lead ${leadId} persisted to "leads" blob store.`);
      }

      // Dispatch notifications, collecting outcomes for ledger update
      const discordResult = await dispatchToDiscord(
        cleanName, cleanCity, cleanIssue,
        diagCode, urgencyLevel, techNote,
        leadId, leadType, finalDayTime, leadSource
      );
      const resendResult = await dispatchToResend(
        cleanName, cleanCity, cleanIssue, 
        isDiagnosticFlow ? briefing : "", 
        leadType, finalDayTime, leadSource
      );

      // Customer Booking Confirmation (Gated behind Flag)
      const CONFIRMATIONS_ENABLED = false;
      const safeEmail = getCleanString(body.email || body.emailAddress, 100, "").trim();
      if (CONFIRMATIONS_ENABLED && safeEmail && safeEmail !== "No Email Provided" && safeEmail !== "N/A") {
        try {
          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          if (RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "A/C Now LLC <confirmations@mail.acnowllc.com>",
                to: [safeEmail],
                replyTo: "acnowpsl@gmail.com", // TODO: Update to office@acnowllc.com or info@acnowllc.com once set up
                subject: "Service Request Received - A/C Now LLC",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #0b63e5; margin-top: 0;">We've Received Your Request!</h2>
                    <p>Hello ${escapeHTML(cleanName)},</p>
                    <p>Thank you for reaching out to A/C Now LLC. We have received your chat request for <strong>${escapeHTML(cleanCity)}</strong>.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #0b63e5; margin: 20px 0;">
                      <p style="margin: 0 0 8px 0;"><strong>Requested Day/Time:</strong> ${escapeHTML(finalDayTime)}</p>
                      <p style="margin: 0;"><strong>Lead Source:</strong> ${escapeHTML(leadSource)}</p>
                    </div>
                    
                    <p>Our veteran-led crew will contact you shortly to confirm your booking and schedule a technician.</p>
                    <p>If you need emergency service or immediate assistance, please call us directly at <strong>(772) 521-3568</strong> (available 24/7).</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #777; margin: 0;">A/C Now LLC • 1391 NW St. Lucie West Blvd • Port St. Lucie, FL 34986</p>
                  </div>
                `,
              }),
            });
            console.log(`[Confirmations] Confirmation email sent to chat customer ${safeEmail}`);
          }
        } catch (confirmErr) {
          console.error("[Confirmations] Failed to send customer confirmation:", confirmErr);
        }
      }

      // Update ledger with delivery outcomes
      leadRecord.delivery.resend = resendResult;
      leadRecord.delivery.discord = discordResult;

      if (blobWritten) {
        const updated = await persistLead(leadId, leadRecord);
        if (updated) {
          console.log(`[Ledger] Delivery status updated for ${leadId} — resend:${resendResult.status} discord:${discordResult.status}`);
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, briefing: briefing, ledgerId: leadId }),
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

// Returns a delivery status object: { status, error, attemptedAt }
async function dispatchToDiscord(name, city, issue, code, urgency, techNote, leadId, leadType, finalDayTime, leadSource) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  const attemptedAt = new Date().toISOString();

  if (!url) {
    return { status: "failed", error: "DISCORD_WEBHOOK_URL not configured", attemptedAt };
  }

  const isDiag = code !== "HVAC-GENERAL" && code !== undefined && code !== "booking-direct" && code !== "service-admin" && code !== "unrecognized-inquiry";
  const color = isDiag ? 16720437 : 746469;

  const discordName = sanitizeDiscordText(name) || "Anonymous Customer";
  const discordCity = sanitizeDiscordText(city) || "Not Provided";
  const discordIssue = sanitizeDiscordText(issue) || "No Issue Details Provided";
  const discordDayTime = sanitizeDiscordText(finalDayTime);
  const discordLeadSource = sanitizeDiscordText(leadSource);
  const discordLeadType = sanitizeDiscordText(leadType);

  const fields = [
    { name: "🕒 Requested Day/Time", value: `**${discordDayTime}**`, inline: false },
    { name: "🔌 Lead Source", value: discordLeadSource, inline: false },
    { name: "👤 Customer Name", value: discordName, inline: true },
    { name: "📍 Service City", value: `${discordCity}, FL`, inline: true },
    { name: "📋 Lead Type", value: discordLeadType, inline: true },
    { name: "💬 Customer Verbatim Message", value: discordIssue, inline: false }
  ];

  if (isDiag) {
    fields.push(
      { name: "⚠️ Urgency Level", value: `**${urgency}**`, inline: true },
      { name: "🛠️ Diagnostic Code", value: `\`${code}\``, inline: true },
      { name: "🔧 Tech Note", value: techNote || "Awaiting troubleshooting.", inline: false }
    );
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "A/C Now Chat Dispatcher",
        avatar_url: "https://acnowllc.com/downloaded_images/mascot-logo-transparent.png",
        embeds: [{
          title: `💬 Chat Assistant Alert: ${discordLeadType}`,
          color: color,
          fields: fields,
          footer: { text: `A/C Now Serverless Dispatch Assistant • Lead ID: ${leadId || "unknown"}` },
          timestamp: new Date().toISOString()
        }]
      })
    });

    if (response.ok) {
      return { status: "sent", error: null, attemptedAt };
    } else {
      const errText = await response.text();
      const errMsg = `HTTP ${response.status}: ${errText.substring(0, 300)}`;
      console.error(`Discord Webhook rejected request with status ${response.status}: ${errText}`);
      return { status: "failed", error: errMsg, attemptedAt };
    }
  } catch (err) {
    console.error("Failed to dispatch to Discord:", err);
    return { status: "failed", error: err.message || String(err), attemptedAt };
  }
}

// Returns a delivery status object: { status, error, attemptedAt }
async function dispatchToResend(name, city, issue, briefing, leadType, finalDayTime, leadSource) {
  const key = process.env.RESEND_API_KEY;
  const attemptedAt = new Date().toISOString();

  if (!key) {
    return { status: "failed", error: "RESEND_API_KEY not configured", attemptedAt };
  }

  const safeName = escapeHTML(name);
  const safeCity = escapeHTML(city);
  const safeIssue = escapeHTML(issue);
  const safeBriefing = briefing ? briefing.replace(/\n/g, "<br>") : "";
  const safeDayTime = escapeHTML(finalDayTime);
  const safeLeadSource = escapeHTML(leadSource);
  const safeLeadType = escapeHTML(leadType);

  const emailSubject = `[A/C Now Lead] - ${safeLeadType}: ${safeName} (${safeCity})`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #0b63e5; border-bottom: 2px solid #0b63e5; padding-bottom: 10px; margin-top: 0;">New Chat Assistant Lead Alert</h2>
      
      <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #0b63e5;">
        <p style="margin: 0 0 8px 0; font-size: 16px;"><strong>Requested Day/Time:</strong> <span style="color: #0b63e5; font-weight: bold;">${safeDayTime}</span></p>
        <p style="margin: 0; font-size: 15px;"><strong>Lead Source:</strong> ${safeLeadSource}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; width: 30%;">Lead Type:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeLeadType}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Customer Name:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Service City:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeCity}, FL</td>
        </tr>
      </table>
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #6c757d;">
        <h4 style="margin: 0 0 10px 0; color: #333;">Customer's Verbatim Message:</h4>
        <p style="margin: 0; color: #555; line-height: 1.5; font-style: italic;">"${safeIssue}"</p>
      </div>
      ${briefing ? `
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <div style="padding: 15px; background: #fffcf0; border-radius: 6px; border-left: 4px solid #e5a90b; border: 1px solid #fceec5;">
        <h4 style="margin-top: 0; color: #b07c00;">Diagnostic Brief &amp; Dispatch Advice:</h4>
        <p style="color: #666; line-height: 1.6; font-size: 14px;">${safeBriefing}</p>
      </div>` : ""}
    </div>
  `;

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
        subject: emailSubject,
        html: emailHtml
      })
    });

    if (response.ok) {
      return { status: "sent", error: null, attemptedAt };
    } else {
      const errText = await response.text();
      const errMsg = `HTTP ${response.status}: ${errText.substring(0, 300)}`;
      console.error(`Resend API rejected request with status ${response.status}: ${errText}`);
      return { status: "failed", error: errMsg, attemptedAt };
    }
  } catch (err) {
    console.error("Failed to dispatch to Resend:", err);
    return { status: "failed", error: err.message || String(err), attemptedAt };
  }
}
