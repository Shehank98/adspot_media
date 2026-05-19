/**
 * HelaPay API proxy — keeps App Secret server-side.
 *
 * POST /.netlify/functions/helapay
 * Body: { action: 'generateQR'|'checkStatus', referenceId, amount, qrReference }
 */

const BASE_URL    = process.env.HELAPAY_BASE_URL   || '';
const APP_ID      = process.env.HELAPAY_APP_ID     || '';
const APP_SECRET  = process.env.HELAPAY_APP_SECRET || '';
const BUSINESS_ID = process.env.HELAPAY_BUSINESS_ID || '';

// Module-level token cache (reuse within warm lambda invocations)
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const credentials = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');
    const res = await fetch(`${BASE_URL}/merchant/api/v1/getToken`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({ grant_type: 'client_credentials' })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HelaPay getToken failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    if (!data.accessToken) throw new Error('No accessToken in HelaPay response');

    cachedToken = data.accessToken;
    // Cache for 9 minutes (tokens are usually valid for 10m)
    tokenExpiry = Date.now() + 9 * 60 * 1000;
    return cachedToken;
}

exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    if (!BASE_URL || !APP_ID || !APP_SECRET || !BUSINESS_ID) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'HelaPay environment variables not configured' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { action, referenceId, amount, qrReference } = body;

    try {
        const token = await getToken();

        if (action === 'generateQR') {
            if (!referenceId || !amount) {
                return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'referenceId and amount required' }) };
            }

            const res = await fetch(`${BASE_URL}/merchant/api/helapos/qr/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ b: BUSINESS_ID, r: referenceId, am: parseFloat(amount) })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`QR generate failed: ${res.status} ${text}`);
            }

            const data = await res.json();
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    qr_data: data.qr_data,
                    qr_reference: data.qr_reference,
                    reference: data.reference
                })
            };
        }

        if (action === 'checkStatus') {
            const refPayload = {};
            if (referenceId) refPayload.reference = referenceId;
            if (qrReference) refPayload.qr_reference = qrReference;

            if (!referenceId && !qrReference) {
                return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'referenceId or qrReference required' }) };
            }

            const res = await fetch(`${BASE_URL}/merchant/api/helapos/sales/getSaleStatus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(refPayload)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Status check failed: ${res.status} ${text}`);
            }

            const data = await res.json();
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    payment_status: data.sale?.payment_status ?? 0,
                    sale: data.sale || null
                })
            };
        }

        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Unknown action: ${action}` }) };

    } catch (err) {
        console.error('[helapay]', err.message);
        return {
            statusCode: 502,
            headers: corsHeaders,
            body: JSON.stringify({ error: err.message })
        };
    }
};
