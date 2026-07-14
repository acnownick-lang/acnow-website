exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || "";
    let allowedOrigin = "";
    
    if (origin) {
        try {
            const parsedUrl = new URL(origin);
            const hostname = parsedUrl.hostname;
            const protocol = parsedUrl.protocol;
            const isProd = hostname === "acnowllc.com" || hostname === "www.acnowllc.com" || hostname.endsWith(".netlify.app");
            const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
            
            if ((isProd && protocol === "https:") || (isLocal && (protocol === "http:" || protocol === "https:"))) {
                allowedOrigin = origin;
            }
        } catch (e) {
            // Invalid URL format
        }
    }

    const headers = {
        'Access-Control-Allow-Origin': allowedOrigin || 'https://acnowllc.com',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (origin && !allowedOrigin) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Access Denied: Origin not allowed" })
        };
    }

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // Validate authorization token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    let authorized = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const crypto = require('crypto');
            const SECRET_KEY = process.env.JWT_SECRET;
            if (!SECRET_KEY) {
                console.error("JWT_SECRET environment variable is missing!");
            } else {
                const parts = token.split('.');
                if (parts.length === 2) {
                    const [payloadB64, sig] = parts;
                    const computedSig = crypto.createHmac('sha256', SECRET_KEY).update(payloadB64).digest('hex');
                    if (computedSig === sig) {
                        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
                        if (payload.exp && payload.exp > Date.now()) {
                            authorized = true;
                        }
                    }
                }
            }
        } catch (e) {
            // Authorized remains false
        }
    }

    if (!authorized) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized: Invalid, expired or missing technician session token.' })
        };
    }

    try {
        const data = JSON.parse(event.body);
        
        const techName = data.tech || data.techName;
        const notes = data.details || data.notes;
        const date = data.date;

        // Basic validation
        if (!techName || !date || !notes) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: tech (or techName), date, and details (or notes) are required.' })
            };
        }

        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
            const discordPayload = {
                username: "Operations Monitor",
                embeds: [{
                    title: "📝 New Technician Service Log Submitted",
                    color: 15105570,
                    fields: [
                        { name: "Technician", value: String(techName).substring(0, 100), inline: true },
                        { name: "Service Date", value: String(date).substring(0, 100), inline: true },
                        { name: "Job Details / Notes", value: String(notes).substring(0, 1000), inline: false }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };

            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(discordPayload)
                });
            } catch (err) {
                console.error("Failed to post service log to Discord webhook:", err);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Service log submitted successfully.',
                timestamp: new Date().toISOString()
            })
        };
    } catch (err) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON body.' })
        };
    }
};
