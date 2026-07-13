exports.handler = async function(event, context) {
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

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Push subscription saved successfully.' })
    };
};
