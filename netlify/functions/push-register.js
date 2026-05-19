/**
 * Store an admin Web Push subscription in Supabase.
 *
 * POST /.netlify/functions/push-register
 * Body: { endpoint, keys: { p256dh, auth }, deviceLabel? }
 */

const SUPABASE_URL = process.env.SUPABASE_URL              || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Supabase not configured' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { endpoint, keys, deviceLabel } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'endpoint, keys.p256dh, keys.auth required' }) };
    }

    // Upsert — on conflict (same endpoint), update keys (may rotate)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            device_label: deviceLabel || 'Admin',
            created_at: new Date().toISOString()
        })
    });

    if (!res.ok) {
        const text = await res.text();
        console.error('[push-register] Supabase error:', text);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to save subscription' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};
