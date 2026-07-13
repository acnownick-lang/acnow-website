exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || "";
    let allowedOrigin = "";
    
    if (origin) {
        try {
            const parsedUrl = new URL(origin);
            const hostname = parsedUrl.hostname;
            const protocol = parsedUrl.protocol;
            const isProd = hostname === "acnowllc.com" || hostname === "www.acnowllc.com";
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
        'Access-Control-Allow-Headers': 'Content-Type',
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

    try {
        const data = JSON.parse(event.body);
        
        const crypto = require('crypto');
        const submittedPin = String(data.pin || '');
        const pinHash = crypto.createHash('sha256').update(submittedPin).digest('hex');
        
        if (pinHash === 'a78f19952edd18bf02b3c9eb704b088e2120941d6acb22f6f795c42796e60252') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    token: 'override-session-active-token-1981'
                })
            };
        } else {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid technician security PIN.'
                })
            };
        }
    } catch (err) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON request payload.' })
        };
    }
};
