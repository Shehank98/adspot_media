/**
 * POST /api/push-register — store admin Web Push subscription in PostgreSQL.
 * Ported from netlify/functions/push-register.js
 */
const router = require('express').Router();
const db = require('../db');

router.post('/', async (req, res) => {
    const { endpoint, keys, deviceLabel } = req.body || {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'endpoint, keys.p256dh, keys.auth required' });
    }

    try {
        await db.query(
            `INSERT INTO push_subscriptions (endpoint, p256dh, auth, device_label)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (endpoint) DO UPDATE SET
               p256dh = EXCLUDED.p256dh,
               auth = EXCLUDED.auth,
               device_label = EXCLUDED.device_label,
               updated_at = NOW()`,
            [endpoint, keys.p256dh, keys.auth, deviceLabel || 'Admin']
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[push-register] error:', err.message);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

module.exports = router;
