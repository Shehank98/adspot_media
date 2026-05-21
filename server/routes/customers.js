const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// GET /api/customers (admin only)
router.get('/', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*,
                   COUNT(b.id) AS booking_count,
                   COALESCE(SUM(b.total_amount), 0) AS total_spent_calc
            FROM customers c
            LEFT JOIN bookings b ON b.customer_email = c.email
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/customers/:id (admin only)
router.get('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const customer = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
        if (!customer.rows.length) return res.status(404).json({ error: 'Customer not found' });

        const bookings = await db.query(
            'SELECT * FROM bookings WHERE customer_email = $1 ORDER BY created_at DESC',
            [customer.rows[0].email]
        );
        res.json({ ...customer.rows[0], bookings: bookings.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/customers/:id (admin only)
router.patch('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const allowed = { name: 'name', phone: 'phone', company: 'company', address: 'address', city: 'city' };
        const fields = [], vals = [];
        let i = 1;
        for (const [k, col] of Object.entries(allowed)) {
            if (d[k] !== undefined) { fields.push(`${col} = $${i++}`); vals.push(d[k]); }
        }
        if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
        fields.push(`updated_at = NOW()`);
        vals.push(req.params.id);
        const result = await db.query(
            `UPDATE customers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, vals
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
