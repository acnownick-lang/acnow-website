// Netlify Serverless Function: submit-lead
// Handles contact form and diagnostic wizard submissions, processes spam filtration,
// and routes alerts to A/C Now LLC operators via Resend Email and Discord Webhooks.

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
        email: getCleanString(data.email, 100, "N/A"),
        city: getCleanString(data.city, 100, "N/A"),
        message: getCleanString(data.message, 5000, `AC Diagnostics Run. System Behavior Reported: ${issueDescription}.`),
        militaryVerified: isMilitary
      };
    } else {
      const fname = getCleanString(data.fname, 50);
      const lname = getCleanString(data.lname, 50);
      const phone = getCleanString(data.tel, 30);
      const email = getCleanString(data.email, 100);
      const city = getCleanString(data.city, 100);
      const message = getCleanString(data.message, 5000);

      // Require name, message, and at least one contact channel (phone or email)
      if (!fname && !lname) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Customer name is required." }),
        };
      }
      if (!message) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Message body is required." }),
        };
      }
      if (!phone && !email) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Either phone number or email is required." }),
        };
      }

      leadDetails = {
        type: "General Service Request",
        name: `${fname} ${lname}`.trim(),
        phone: phone || "No Phone Provided",
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

    console.log(`Processing new lead: [${leadDetails.type}] from ${leadDetails.name}`);

    // Escape HTML values
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

    // 4. Dispatch Email Notification via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let emailSent = false;
    if (RESEND_API_KEY) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "A/C Now Site Alerts <alerts@acnowllc.com>",
            to: ["chris@acnowllc.com", "sean@acnowllc.com"],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log("Lead notification email sent successfully via Resend.");
        } else {
          const errText = await emailResponse.text();
          console.error("Resend API rejected request:", errText);
        }
      } catch (err) {
        console.error("Error connecting to Resend service:", err);
      }
    }

    // 5. Dispatch Instant Push Notification via Discord Webhook
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    let discordSent = false;
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

        const discordPayload = {
          username: "A/C Now Lead Bot",
          avatar_url: "https://acnowllc.com/downloaded_images/mascot-logo-transparent.png",
          embeds: [
            {
              title: `🚨 New Lead: ${discordType}`,
              color: isWizard ? 16720437 : 746469,
              fields: [
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
              footer: { text: "A/C Now Serverless Dispatcher" },
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
          console.error(`Discord webhook rejected request with status ${discordResponse.status}: ${errText}`);
        }
      } catch (err) {
        console.error("Error posting to Discord Webhook:", err);
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Lead processed successfully.",
        notifications: {
          email: emailSent ? "sent" : "skipped",
          discord: discordSent ? "sent" : "skipped"
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
