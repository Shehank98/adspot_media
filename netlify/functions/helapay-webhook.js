/**
 * HelaPay payment callback webhook.
 *
 * HelaPay POSTs here when a payment completes.
 * This handler:
 *  1. Verifies payment status by re-checking the HelaPay API
 *  2. Updates the quotation in Supabase to 'paid'
 *  3. Creates a payment record in Supabase
 *  4. Sends a push notification to all registered admin devices
 *
 * Configure in HelaPay merchant dashboard:
 *   Notify URL: https://adspotmedia.lk/.netlify/functions/helapay-webhook
 *   (or /api/helapay-webhook via the redirect rule in netlify.toml)
 */

const webpush = require('web-push');

const BASE_URL          = process.env.HELAPAY_BASE_URL          || '';
const APP_ID            = process.env.HELAPAY_APP_ID            || '';
const APP_SECRET        = process.env.HELAPAY_APP_SECRET        || '';
const BUSINESS_ID       = process.env.HELAPAY_BUSINESS_ID       || '';
const SUPABASE_URL      = process.env.SUPABASE_URL              || '';
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY          || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY         || '';
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT             || 'mailto:adspot77@gmail.com';

// ── Supabase REST helper ───────────────────────────────────────────────────
async function supabaseRequest(path, method = 'GET', body = null) {
    const opts = {
        method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
        }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, opts);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.status === 204 ? null : res.json();
}

// ── HelaPay: verify payment status server-side ────────────────────────────
async function verifyPayment(reference) {
    const creds = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${BASE_URL}/merchant/api/v1/getToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${creds}` },
        body: JSON.stringify({ grant_type: 'client_credentials' })
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.accessToken;

    const statusRes = await fetch(`${BASE_URL}/merchant/api/helapos/sales/getSaleStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reference })
    });
    const statusData = await statusRes.json();
    return statusData.sale || null;
}

// ── Send push to all registered subscriptions ─────────────────────────────
async function sendPushToAllAdmins(payload) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('[webhook] VAPID keys not configured, skipping push');
        return;
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const rows = await supabaseRequest('/push_subscriptions?select=id,endpoint,p256dh,auth');
    if (!rows || rows.length === 0) return;

    const stale = [];
    await Promise.allSettled(rows.map(async (row) => {
        const subscription = {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth }
        };
        try {
            await webpush.sendNotification(subscription, JSON.stringify(payload));
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription expired — mark for deletion
                stale.push(row.id);
            } else {
                console.warn('[webhook] push error for', row.endpoint.slice(0, 40), err.message);
            }
        }
    }));

    // Clean up expired subscriptions
    if (stale.length > 0) {
        const ids = stale.map(id => `id=eq.${id}`).join(',');
        await supabaseRequest(`/push_subscriptions?or=(${ids})`, 'DELETE').catch(console.warn);
    }
}

// ── Main handler ──────────────────────────────────────────────────────────
exports.handler = async (event) => {
    // HelaPay sends POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let webhookData;
    try {
        webhookData = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, body: 'Invalid body' };
    }

    console.log('[helapay-webhook] received:', JSON.stringify(webhookData).slice(0, 200));

    const incomingStatus = webhookData.sale?.payment_status ?? webhookData.payment_status;
    const reference = webhookData.reference || webhookData.sale?.reference_id;

    if (!reference) {
        return { statusCode: 200, body: 'OK' }; // always 200 to HelaPay
    }

    // Only process successful payments
    if (incomingStatus !== 2 && incomingStatus !== '2') {
        return { statusCode: 200, body: 'OK' };
    }

    try {
        // Verify server-side with HelaPay
        const sale = await verifyPayment(reference);
        if (!sale || (sale.payment_status !== 2 && sale.payment_status !== '2')) {
            console.warn('[webhook] Payment not confirmed by HelaPay API for', reference);
            return { statusCode: 200, body: 'OK' };
        }

        const amount = sale.amount || webhookData.sale?.amount || 0;

        // Update quotation status in Supabase
        await supabaseRequest(
            `/quotations?quotation_number=eq.${encodeURIComponent(reference)}`,
            'PATCH',
            { status: 'paid', payment_method: 'helapay', updated_at: new Date().toISOString() }
        );

        // Fetch the quotation id for payment record
        const quotations = await supabaseRequest(
            `/quotations?quotation_number=eq.${encodeURIComponent(reference)}&select=id`
        );
        const quotationId = quotations?.[0]?.id;

        if (quotationId) {
            // Insert payment record
            await supabaseRequest('/payments', 'POST', {
                quotation_id: quotationId,
                amount: parseFloat(amount),
                payment_method: 'helapay',
                reference_number: sale.reference_id || reference,
                status: 'completed'
            });
        }

        // Send push notification to admin(s)
        await sendPushToAllAdmins({
            title: 'Payment Received! 💳',
            body: `Rs. ${parseFloat(amount).toFixed(2)} — Quote ${reference}. Tap to view.`,
            url: '/admin/dashboard.html',
            quotationId,
            reference
        });

        console.log('[webhook] Payment processed successfully for', reference);
    } catch (err) {
        console.error('[webhook] Processing error:', err.message);
        // Still return 200 so HelaPay doesn't retry repeatedly
    }

    return { statusCode: 200, body: 'OK' };
};
