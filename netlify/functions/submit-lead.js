// Netlify Serverless Function: submit-lead
// Handles contact form and diagnostic wizard submissions, processes spam filtration,
// and routes alerts to A/C Now LLC operators via Resend Email and Discord Webhooks.

export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    let data = {};
    const contentType = event.headers["content-type"] || "";

    // Parse incoming data (handles both JSON and URL-encoded forms)
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(event.body);
      for (const [key, value] of params.entries()) {
        data[key] = value;
      }
    } else {
      data = JSON.parse(event.body);
    }

    // 1. Spam Prevention: Honeypot Validation
    // Netlify Forms has built-in honeypot, but for direct function submissions we inspect here.
    if (data.honeypot && data.honeypot.trim() !== "") {
      console.warn("Spam detected via Honeypot field. Discarding submission.");
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, message: "Submission processed successfully (spam discarded)." }),
      };
    }

    // 2. Identify Lead Type (General Form vs. AC Troubleshooter Wizard)
    const isWizard = data["w-name"] !== undefined || data["ac-issue"] !== undefined;
    let leadDetails = {};

    if (isWizard) {
      // Troubleshooter wizard fields
      leadDetails = {
        type: "AC Troubleshooter Wizard",
        name: data["w-name"] || "Anonymous Customer",
        phone: data["w-phone"] || "No Phone Provided",
        issue: data["ac-issue"] || "Unspecified AC Issue",
        email: "N/A",
        city: "N/A",
        message: `AC Diagnostics Run. System Behavior Reported: ${data["ac-issue"]}.`
      };

      // Map issue code to user-friendly description
      const issueMap = {
        "warm-air": "Unit turns on, but blowing warm air",
        "no-power": "Unit won't turn on at all (no power/blower)",
        "water-leak": "Water is leaking or pooling around air handler",
        "loud-noise": "Unit makes squealing or loud rattling noises"
      };
      leadDetails.issueDescription = issueMap[leadDetails.issue] || leadDetails.issue;
    } else {
      // General contact form fields
      leadDetails = {
        type: "General Service Request",
        name: `${data.fname || ""} ${data.lname || ""}`.trim() || "Anonymous Customer",
        phone: data.tel || "No Phone Provided",
        email: data.email || "No Email Provided",
        city: data.city || "Not Provided",
        message: data.message || "No Message Body Provided"
      };
    }

    console.log(`Processing new lead: [${leadDetails.type}] from ${leadDetails.name}`);

    // Create notification content
    const emailSubject = `[A/C Now Lead] - ${leadDetails.type}: ${leadDetails.name}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0b63e5; border-bottom: 2px solid #0b63e5; padding-bottom: 10px; margin-top: 0;">New A/C Now Lead Alert</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; width: 30%;">Source Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${leadDetails.type}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Customer Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${leadDetails.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Phone Number:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="tel:${leadDetails.phone.replace(/\D/g,'')}">${leadDetails.phone}</a></td>
          </tr>
          ${leadDetails.email !== "N/A" ? `
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email Address:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${leadDetails.email}">${leadDetails.email}</a></td>
          </tr>` : ""}
          ${leadDetails.city !== "N/A" ? `
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Service City:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${leadDetails.city}</td>
          </tr>` : ""}
          ${isWizard ? `
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; color: #b02a37;">Reported Symptom:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #b02a37;">${leadDetails.issueDescription}</td>
          </tr>` : ""}
        </table>
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #0b63e5;">
          <h4 style="margin: 0 0 10px 0; color: #333;">Customer Message / Context:</h4>
          <p style="margin: 0; color: #555; line-height: 1.5; font-style: italic;">"${leadDetails.message}"</p>
        </div>
        <p style="font-size: 11px; color: #777; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px; text-align: center;">
          This lead was automatically captured and processed via serverless workflows on Netlify.
        </p>
      </div>
    `;

    // 3. Dispatch Email Notification via Resend (Free Tier API - 3,000 emails/mo)
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
            from: "A/C Now Site Alerts <alerts@yourverifieddomain.com>", // domain must be verified on Resend
            to: ["chris@acnowllc.com", "sean@acnowllc.com"], // Site owners
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
    } else {
      console.warn("RESEND_API_KEY is not defined. Email dispatch skipped.");
    }

    // 4. Dispatch Instant Push Notification via Discord Webhook (100% Free Alerts)
    // Instantly alerts Chris and Sean on their mobile phones via Discord push notifications
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    let discordSent = false;
    if (DISCORD_WEBHOOK_URL) {
      try {
        const discordPayload = {
          username: "A/C Now Lead Bot",
          avatar_url: "https://acnowllc.com/downloaded_images/mascot-logo-transparent.png",
          embeds: [
            {
              title: `🚨 New Lead: ${leadDetails.type}`,
              color: isWizard ? 16720437 : 746469, // Red for wizard (priority), Blue for general
              fields: [
                { name: "👤 Customer Name", value: leadDetails.name, inline: true },
                { name: "📞 Phone", value: `[${leadDetails.phone}](tel:${leadDetails.phone.replace(/\D/g,'')})`, inline: true },
                { name: "📍 City", value: leadDetails.city, inline: true },
                ...(isWizard ? [
                  { name: "⚠️ System Symptom", value: `**${leadDetails.issueDescription}**`, inline: false }
                ] : [
                  { name: "📧 Email", value: leadDetails.email, inline: true }
                ]),
                { name: "💬 Customer Message", value: leadDetails.message, inline: false }
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
          console.error("Discord webhook rejected request with status:", discordResponse.status);
        }
      } catch (err) {
        console.error("Error posting to Discord Webhook:", err);
      }
    } else {
      console.warn("DISCORD_WEBHOOK_URL is not defined. Discord dispatch skipped.");
    }

    // Return Success to Client
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow cross-origin requests for testing
      },
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
      body: JSON.stringify({ error: "Internal Server Error in serverless lead processing" }),
    };
  }
}
