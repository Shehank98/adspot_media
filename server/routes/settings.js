const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// GET /api/settings/:key — public
router.get('/:key', async (req, res) => {
    try {
        const result = await db.query('SELECT key, value FROM settings WHERE key = $1', [req.params.key]);
        if (!result.rows.length) return res.status(404).json({ error: 'Setting not found' });
        res.json(result.rows[0]);
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
