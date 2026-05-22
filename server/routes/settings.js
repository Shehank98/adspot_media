const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// Known defaults — returned when key is not yet seeded in DB
// This ensures the booking page always gets a valid response even before the seed SQL is run
const DEFAULTS = {
    design_fee:                '3000',
    box_commission_pct:        '5',
    classified_commission_pct: '5',
    vat_pct:                   '18',
    classified_service_charge: '50',
};

// GET /api/settings/:key — public
router.get('/:key', async (req, res) => {
    try {
        const result = await db.query('SELECT key, value FROM settings WHERE key = $1', [req.params.key]);
        if (result.rows.length) return res.json(result.rows[0]);
        const def = DEFAULTS[req.params.key];
        if (def !== undefined) return res.json({ key: req.params.key, value: def });
        return res.status(404).json({ error: 'Setting not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/settings — admin: all settings
router.get('/', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT key, value, updated_at FROM settings ORDER BY key');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/settings/:key — admin only
router.patch('/:key', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'value required' });
        const result = await db.query(
            `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW() RETURNING *`,
            [req.params.key, String(value)]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
