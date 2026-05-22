const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// GET /api/promo-codes — admin: all; public: validate by code
router.get('/', async (req, res) => {
    try {
        const { code } = req.query;
        if (code) {
            // Public promo code validation
            const result = await db.query(
                `SELECT * FROM promo_codes
                 WHERE UPPER(code) = UPPER($1)
                   AND active = true
                   AND (expires_at IS NULL OR expires_at > NOW())
                   AND (max_uses IS NULL OR current_uses < max_uses)`,
                [code]
            );
            if (!result.rows.length) return res.status(404).json({ error: 'Invalid or expired promo code' });
            const pc = result.rows[0];
            return res.json({
                code: pc.code,
                discount_type: pc.discount_type,
                discount_value: pc.discount_value
            });
        }

        // Admin: return all — require verified admin token
        verifyFirebaseToken(req, res, async () => {
            if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
            const result = await db.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
            res.json(result.rows);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/promo-codes (admin only)
router.post('/', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const result = await db.query(
            `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, expires_at, active)
             VALUES (UPPER($1),$2,$3,$4,$5,$6) RETURNING *`,
            [d.code, d.discount_type, d.discount_value,
             d.max_uses || null, d.expires_at || null, d.active !== false]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Promo code already exists' });
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/promo-codes/:id (admin only)
router.patch('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const fields = [];
        const vals = [];
        let i = 1;

        const allowed = ['discount_type', 'discount_value', 'max_uses', 'expires_at', 'active', 'current_uses'];
        for (const key of allowed) {
            if (d[key] !== undefined) { fields.push(`${key} = $${i++}`); vals.push(d[key]); }
        }
        if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

        vals.push(req.params.id);
        const result = await db.query(
            `UPDATE promo_codes SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            vals
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Promo code not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/promo-codes/:id (admin only)
router.delete('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM promo_codes WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Promo code not found' });
        res.json({ deleted: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
