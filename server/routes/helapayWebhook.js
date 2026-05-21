/**
 * POST /api/helapay-webhook — HelaPay payment callback.
 * Ported from netlify/functions/helapay-webhook.js — now writes to PostgreSQL.
 */
const router = require('express').Router();
const webpush = require('web-push');
const db = require('../db');

const BASE_URL          = process.env.HELAPAY_BASE_URL          || '';
const APP_ID            = process.env.HELAPAY_APP_ID            || '';
const APP_SECRET        = process.env.HELAPAY_APP_SECRET        || '';
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY          || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY         || '';
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT             || 'mailto:adspot77@gmail.com';

async function verifyPayment(reference) {
    const creds = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${BASE_URL}/merchant/api/v1/getToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${creds}` },
        body: JSON.stringify({ grant_type: 'client_credentials' })
    });
    const { accessToken } = await tokenRes.json();

    const statusRes = await fetch(`${BASE_URL}/merchant/api/helapos/sales/getSaleStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ reference })
    });
    const data = await statusRes.json();
    return data.sale || null;
}

async function sendPushToAllAdmins(payload) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('[webhook] VAPID keys not configured, skipping push');
        return;
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const { rows } = await db.query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions');
    if (!rows.length) return;

    const stale = [];
    await Promise.allSettled(rows.map(async (row) => {
        try {
            await webpush.sendNotification(
                { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
                JSON.stringify(payload)
            );
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) stale.push(row.id);
            else console.warn('[webhook] push error:', err.message);
        }
    }));

    if (stale.length) {
        await db.query('DELETE FROM push_subscriptions WHERE id = ANY($1)', [stale]).catch(console.warn);
    }
}

router.post('/', async (req, res) => {
    const webhookData = req.body || {};
    console.log('[helapay-webhook] received:', JSON.stringify(webhookData).slice(0, 200));

    const incomingStatus = webhookData.sale?.payment_status ?? webhookData.payment_status;
    const reference = webhookData.reference || webhookData.sale?.reference_id;

    // Always respond 200 to HelaPay
    res.sendStatus(200);

    if (!reference || (incomingStatus !== 2 && incomingStatus !== '2')) return;

    try {
        const sale = await verifyPayment(reference);
        if (!sale || (sale.payment_status !== 2 && sale.payment_status !== '2')) {
            console.warn('[webhook] Payment not confirmed by HelaPay for', reference);
            return;
        }

        const amount = sale.amount || webhookData.sale?.amount || 0;

        // Update quotation status
        await db.query(
            `UPDATE quotations SET status = 'paid', payment_method = 'helapay', updated_at = NOW()
             WHERE quotation_number = $1`,
            [reference]
        );

        // Also update matching booking
        await db.query(
            `UPDATE bookings SET payment_status = 'completed', status = 'paid', updated_at = NOW()
             WHERE quotation_number = $1`,
            [reference]
        );

        // Insert payment record
        await db.query(
            `INSERT INTO payments (quotation_number, amount, payment_method, reference_number, status)
             VALUES ($1,$2,'helapay',$3,'completed')`,
            [reference, parseFloat(amount), sale.reference_id || reference]
        );

        // Push notification
        await sendPushToAllAdmins({
            title: 'Payment Received! 💳',
            body: `Rs. ${parseFloat(amount).toFixed(2)} — Quote ${reference}. Tap to view.`,
            url: '/admin-bookings',
            reference
        });

        console.log('[webhook] Payment processed for', reference);
    } catch (err) {
        console.error('[webhook] Processing error:', err.message);
    }
});

module.exports = router;
