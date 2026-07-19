// Netlify Serverless Function: submit-lead
// Handles contact form and diagnostic wizard submissions, processes spam filtration,
// and routes alerts to A/C Now LLC operators via Resend Email and Discord Webhooks.
// Lead Ledger: every submission is written to Netlify Blobs (store: "leads") BEFORE
// any notification attempt. Delivery status is updated after each notification.
// Blob write failure never blocks notifications — both paths are independent.

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
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const bodyLength = event.body ? Buffer.byteLength(event.body, 'utf8') : 0;
  if (bodyLength > 15360) {
    return {
      statusCode: 413,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Payload Too Large (15KB limit exceeded)" }),
    };
  }

  try {
    let data = {};
    const contentType = event.headers["content-type"] || "";

    try {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(event.body || "");
        for (const [key, value] of params.entries()) {
          data[key] = value;
        }
      } else {
        data = JSON.parse(event.body || "{}");
      }
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Malformed payload body" }),
      };
    }

    // 1. Spam Prevention: Honeypot Validation (Safe String Guard)
    const honeypot = data.honeypot;
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
      console.warn("Spam detected via Honeypot field. Discarding submission.");
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: "Submission processed successfully (spam discarded)." }),
      };
    }

    const isMilitary = data.military_discount === "Yes" || data.military_discount_wizard === "Yes";

    // 2. Identify Lead Type (General Form vs. AC Troubleshooter Wizard)
    const isWizard = data["w-name"] !== undefined || data["ac-issue"] !== undefined;
    let leadDetails = {};

    if (isWizard) {
      const rawName = getCleanString(data["w-name"], 100);
      const rawPhone = getCleanString(data["w-phone"], 30);
      const rawIssue = getCleanString(data["ac-issue"], 100);

      // Validate required wizard fields
      if (!rawName || !rawPhone || !rawIssue) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Missing required wizard fields." }),
        };
      }

      const issueMap = {
        "warm-air": "Unit turns on, but blowing warm air",
        "no-power": "Unit won't turn on at all (no power/blower)",
        "water-leak": "Water is leaking or pooling around air handler",
        "loud-noise": "Unit makes squealing or loud rattling noises",
        "diagnose-wizard": "AC Troubleshooter run from diagnostics panel"
      };
      
      const issueDescription = issueMap[rawIssue] || "Diagnose Troubleshooter Wizard Run";

      leadDetails = {
        type: "AC Troubleshooter Wizard",
        name: rawName,
        phone: rawPhone,
        issue: rawIssue,
        issueDescription: issueDescription,
        email: getCleanString(data.email, 100, "No Email Provided"),
        city: getCleanString(data.city, 100, "Not Provided"),
        message: getCleanString(data.message, 5000, `AC Diagnostics Run. System Behavior Reported: ${issueDescription}.`),
        militaryVerified: isMilitary
      };
    } else {
      const fname = getCleanString(data.fname, 50);
      const lname = getCleanString(data.lname, 50);
      const phone = getCleanString(data.tel, 30);
      const email = getCleanString(data.email, 100);
      const city = getCleanString(data.city, 100);
      const rawMessage = getCleanString(data.message, 5000);
      const message = rawMessage || "No additional details provided.";

      // Require name and phone only (phone-first business)
      if (!fname && !lname) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Customer name is required." }),
        };
      }
      if (!phone) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Phone number is required." }),
        };
      }

      leadDetails = {
        type: "General Service Request",
        name: `${fname} ${lname}`.trim(),
        phone: phone,
        email: email || "No Email Provided",
        city: city || "Not Provided",
        message: message,
        militaryVerified: isMilitary
      };
    }

    // 3. Validation Rules
    if (leadDetails.email !== "No Email Provided" && leadDetails.email !== "N/A") {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(leadDetails.email)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Invalid email format" }),
        };
      }
    }

    if (leadDetails.phone !== "No Phone Provided") {
      const cleanPhone = leadDetails.phone.replace(/\D/g, "");
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Invalid phone number format or length" }),
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Extract Preferred Date / Preferred Time & Parse Legacy / Regex Fallback
    // ─────────────────────────────────────────────────────────────────────────
    let preferredDate = getCleanString(data.preferred_date || data.preferred_day || data["preferred-date"], 100, "").trim();
    let preferredTime = getCleanString(data.preferred_time || data["preferred-time"], 100, "").trim();

    let finalDayTime = "First Available";

    if (preferredDate) {
      if (preferredTime && preferredTime !== "First Available") {
        finalDayTime = `${preferredDate} (${preferredTime})`;
      } else {
        finalDayTime = preferredDate;
      }
    } else {
      // Legacy-blob regex parsing: try to extract from message
      const msgStr = leadDetails.message || "";
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

    // Determine specific Lead Source for auditability
    let leadSource = "General Contact / Inquiry";
    if (isWizard) {
      leadSource = "AC Troubleshooter Wizard";
    } else {
      const msgStr = leadDetails.message || "";
      if (msgStr.includes("[AC Installation Estimate Request]")) {
        leadSource = "AC Installation Estimate Form";
      } else if (msgStr.includes("[AC Maintenance Tune-Up Request]")) {
        leadSource = "AC Maintenance Request Form";
      } else if (msgStr.includes("[AC Repair Request]")) {
        leadSource = "AC Repair Request Form";
      } else if (msgStr.includes("[Pool Heating Estimate Request]")) {
        leadSource = "Pool Heating Estimate Form";
      } else if (msgStr.includes("[Commercial Bid Request]")) {
        leadSource = "Commercial Consultation Form";
      } else if (msgStr.includes("[Reserved Slot]")) {
        leadSource = "Contact Page Form (with calendar)";
      }
    }

    console.log(`Processing new lead: [${leadDetails.type}] from ${leadDetails.name} (Source: ${leadSource})`);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. LEAD LEDGER — Write to Netlify Blobs BEFORE any notification attempt.
    // ─────────────────────────────────────────────────────────────────────────
    const leadId = generateLeadId();
    const leadRecord = {
      leadId,
      timestamp: new Date().toISOString(),
      source: "submit-lead",
      isWizard,
      fields: {
        type: leadDetails.type,
        name: leadDetails.name,
        phone: leadDetails.phone,
        email: leadDetails.email,
        city: leadDetails.city,
        message: leadDetails.message,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        requested_day_time: finalDayTime,
        lead_source: leadSource,
        militaryVerified: leadDetails.militaryVerified,
        ...(leadDetails.issue ? { issue: leadDetails.issue } : {}),
        ...(leadDetails.issueDescription ? { issueDescription: leadDetails.issueDescription } : {}),
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

    // Escape HTML values for email
    const safeType = escapeHTML(leadDetails.type);
    const safeName = escapeHTML(leadDetails.name);
    const safePhone = escapeHTML(leadDetails.phone);
    const safeEmail = escapeHTML(leadDetails.email);
    const safeCity = escapeHTML(leadDetails.city);
    const safeMessage = escapeHTML(leadDetails.message);
    const safeIssueDesc = leadDetails.issueDescription ? escapeHTML(leadDetails.issueDescription) : "";

    const emailSubject = `[A/C Now Lead] - ${safeType}: ${safeName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0b63e5; border-bottom: 2px solid #0b63e5; padding-bottom: 10px; margin-top: 0;">New A/C Now Lead Alert</h2>
        
        <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #0b63e5;">
          <p style="margin: 0 0 8px 0; font-size: 16px;"><strong>Requested Day/Time:</strong> <span style="color: #0b63e5; font-weight: bold;">${escapeHTML(finalDayTime)}</span></p>
          <p style="margin: 0; font-size: 15px;"><strong>Lead Source:</strong> ${escapeHTML(leadSource)}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; width: 30%;">Source Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Customer Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Phone Number:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              ${safePhone !== "No Phone Provided" ? `<a href="tel:${safePhone.replace(/\D/g,'')}">${safePhone}</a>` : safePhone}
            </td>
          </tr>
          ${leadDetails.email !== "N/A" && leadDetails.email !== "No Email Provided" ? `
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email Address:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
          </tr>` : ""}
          ${leadDetails.city !== "N/A" && leadDetails.city !== "Not Provided" ? `
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Service City:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeCity}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Military/Veteran Discount:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: ${leadDetails.militaryVerified ? '#0B7A53' : '#333'};">
              ${leadDetails.militaryVerified ? "Active (5% Discount Applied to Invoice)" : "None"}
            </td>
          </tr>
          ${isWizard ? `
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; color: #b02a37;">Reported Symptom:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #b02a37;">${safeIssueDesc}</td>
          </tr>` : ""}
        </table>
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #0b63e5;">
          <h4 style="margin: 0 0 10px 0; color: #333;">Customer Message / Context:</h4>
          <p style="margin: 0; color: #555; line-height: 1.5; font-style: italic;">"${safeMessage}"</p>
        </div>
      </div>
    `;

    // 5. Dispatch Email Notification via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let emailSent = false;
    let emailError = null;
    if (RESEND_API_KEY) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "A/C Now Site Alerts <alerts@mail.acnowllc.com>",
            to: ["acnowpsl@gmail.com"],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log("Lead notification email sent successfully via Resend.");
        } else {
          const errText = await emailResponse.text();
          emailError = `HTTP ${emailResponse.status}: ${errText.substring(0, 300)}`;
          console.error("Resend API rejected request:", errText);
        }
      } catch (err) {
        emailError = err.message || String(err);
        console.error("Error connecting to Resend service:", err);
      }
    } else {
      emailError = "RESEND_API_KEY not configured";
    }

    // 5a. Dispatch Customer Booking Confirmation (Gated behind Flag)
    const CONFIRMATIONS_ENABLED = false;
    if (CONFIRMATIONS_ENABLED && leadDetails.email && leadDetails.email !== "No Email Provided" && leadDetails.email !== "N/A") {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "A/C Now LLC <confirmations@mail.acnowllc.com>",
            to: [leadDetails.email],
            replyTo: "acnowpsl@gmail.com", // TODO: Update to office@acnowllc.com or info@acnowllc.com once set up
            subject: "Service Request Received - A/C Now LLC",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #0b63e5; margin-top: 0;">We've Received Your Request!</h2>
                <p>Hello ${escapeHTML(leadDetails.name)},</p>
                <p>Thank you for reaching out to A/C Now LLC. We have received your service request and our dispatcher is reviewing it.</p>
                
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
        console.log(`[Confirmations] Confirmation email sent to customer ${leadDetails.email}`);
      } catch (confirmErr) {
        console.error("[Confirmations] Failed to dispatch customer confirmation:", confirmErr);
      }
    }

    // 6. Dispatch Instant Push Notification via Discord Webhook
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    let discordSent = false;
    let discordError = null;
    if (DISCORD_WEBHOOK_URL) {
      try {
        // Fallback checks prevent empty values which trigger Discord 400 Bad Request
        const discordName = sanitizeDiscordText(leadDetails.name) || "Anonymous Customer";
        const discordPhone = sanitizeDiscordText(leadDetails.phone) || "No Phone Provided";
        const discordCity = sanitizeDiscordText(leadDetails.city) || "Not Provided";
        const discordEmail = sanitizeDiscordText(leadDetails.email) || "No Email Provided";
        const discordMessage = sanitizeDiscordText(leadDetails.message) || "No Message Body Provided";
        const discordType = sanitizeDiscordText(leadDetails.type) || "General Service Request";
        const discordIssueDesc = leadDetails.issueDescription ? sanitizeDiscordText(leadDetails.issueDescription) : "";
        const discordDayTime = sanitizeDiscordText(finalDayTime);
        const discordLeadSource = sanitizeDiscordText(leadSource);

        const discordPayload = {
          username: "A/C Now Lead Bot",
          avatar_url: "https://acnowllc.com/downloaded_images/mascot-logo-transparent.png",
          embeds: [
            {
              title: `🚨 New Lead: ${discordType}`,
              color: isWizard ? 16720437 : 746469,
              fields: [
                { name: "🕒 Requested Day/Time", value: `**${discordDayTime}**`, inline: false },
                { name: "🔌 Lead Source", value: discordLeadSource, inline: false },
                { name: "👤 Customer Name", value: discordName, inline: true },
                { 
                  name: "📞 Phone", 
                  value: discordPhone !== "No Phone Provided" ? `[${discordPhone}](tel:${discordPhone.replace(/\D/g,'')})` : discordPhone, 
                  inline: true 
                },
                { name: "📍 City", value: discordCity, inline: true },
                { name: "🎖️ Military Discount", value: leadDetails.militaryVerified ? "✅ **Active (5% Discount Applied)**" : "❌ None", inline: true },
                ...(isWizard ? [
                  { name: "⚠️ System Symptom", value: `**${discordIssueDesc}**`, inline: false }
                ] : [
                  { name: "📧 Email", value: discordEmail, inline: true }
                ]),
                { name: "💬 Customer Message", value: discordMessage, inline: false }
              ],
              footer: { text: `A/C Now Serverless Dispatcher • Lead ID: ${leadId}` },
              timestamp: new Date().toISOString()
            }
          ]
        };

        const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload),
        });

        if (discordResponse.ok) {
          discordSent = true;
          console.log("Lead notification sent to Discord channel successfully.");
        } else {
          const errText = await discordResponse.text();
          discordError = `HTTP ${discordResponse.status}: ${errText.substring(0, 300)}`;
          console.error(`Discord webhook rejected request with status ${discordResponse.status}: ${errText}`);
        }
      } catch (err) {
        discordError = err.message || String(err);
        console.error("Error posting to Discord Webhook:", err);
      }
    } else {
      discordError = "DISCORD_WEBHOOK_URL not configured";
    }

    // 7. Update Ledger with delivery outcomes
    leadRecord.delivery.resend = {
      status: emailSent ? "sent" : "failed",
      error: emailSent ? null : emailError,
      attemptedAt: new Date().toISOString(),
    };
    leadRecord.delivery.discord = {
      status: discordSent ? "sent" : "failed",
      error: discordSent ? null : discordError,
      attemptedAt: new Date().toISOString(),
    };

    if (blobWritten) {
      const updated = await persistLead(leadId, leadRecord);
      if (updated) {
        console.log(`[Ledger] Delivery status updated for ${leadId} — resend:${leadRecord.delivery.resend.status} discord:${leadRecord.delivery.discord.status}`);
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Lead processed successfully.",
        ledgerId: leadId,
        notifications: {
          email: emailSent ? "sent" : "failed",
          discord: discordSent ? "sent" : "failed"
        }
      }),
    };

  } catch (error) {
    console.error("Critical error in serverless submit-lead execution:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal Server Error in serverless lead processing" }),
    };
  }
}
