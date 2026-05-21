/**
 * POST /api/helapay — HelaPay API proxy.
 * Ported from netlify/functions/helapay.js — identical logic, Express req/res.
 */
const router = require('express').Router();

const BASE_URL    = process.env.HELAPAY_BASE_URL    || '';
const APP_ID      = process.env.HELAPAY_APP_ID      || '';
const APP_SECRET  = process.env.HELAPAY_APP_SECRET  || '';
const BUSINESS_ID = process.env.HELAPAY_BUSINESS_ID || '';

// Module-level token cache
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const credentials = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');
    const res = await fetch(`${BASE_URL}/merchant/api/v1/getToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
        body: JSON.stringify({ grant_type: 'client_credentials' })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HelaPay getToken failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    if (!data.accessToken) throw new Error('No accessToken in HelaPay response');

    cachedToken = data.accessToken;
    tokenExpiry = Date.now() + 9 * 60 * 1000;
    return cachedToken;
}

router.post('/', async (req, res) => {
    if (!BASE_URL || !APP_ID || !APP_SECRET || !BUSINESS_ID) {
        return res.status(500).json({ error: 'HelaPay environment variables not configured' });
    }

    const { action, referenceId, amount, qrReference } = req.body || {};

    try {
        const token = await getToken();

        if (action === 'generateQR') {
            if (!referenceId || !amount) {
                return res.status(400).json({ error: 'referenceId and amount required' });
            }
            const r = await fetch(`${BASE_URL}/merchant/api/helapos/qr/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ b: BUSINESS_ID, r: referenceId, am: parseFloat(amount) })
            });
            if (!r.ok) throw new Error(`QR generate failed: ${r.status} ${await r.text()}`);
            const data = await r.json();
            return res.json({ qr_data: data.qr_data, qr_reference: data.qr_reference, reference: data.reference });
        }

        if (action === 'checkStatus') {
            if (!referenceId && !qrReference) {
                return res.status(400).json({ error: 'referenceId or qrReference required' });
            }
            const payload = {};
            if (referenceId) payload.reference = referenceId;
            if (qrReference) payload.qr_reference = qrReference;

            const r = await fetch(`${BASE_URL}/merchant/api/helapos/sales/getSaleStatus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!r.ok) throw new Error(`Status check failed: ${r.status} ${await r.text()}`);
            const data = await r.json();
            return res.json({ payment_status: data.sale?.payment_status ?? 0, sale: data.sale || null });
        }

        res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (err) {
        console.error('[helapay]', err.message);
        res.status(502).json({ error: err.message });
    }
});

module.exports = router;
