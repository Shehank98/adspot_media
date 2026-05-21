const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// GET /api/design-requests — admin: all; customer: own by email
router.get('/', verifyFirebaseToken, async (req, res) => {
    try {
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'adspot77@gmail.com,shehan.k98@gmail.com')
            .split(',').map(e => e.trim().toLowerCase());
        const isAdmin = ADMIN_EMAILS.includes(req.userEmail.toLowerCase());

        let result;
        if (isAdmin) {
            result = await db.query(`
                SELECT dr.*, b.quotation_number, b.customer_phone
                FROM design_requests dr
                LEFT JOIN bookings b ON b.booking_id = dr.booking_id
                ORDER BY dr.created_at DESC
            `);
        } else {
            result = await db.query(
                'SELECT * FROM design_requests WHERE customer_email = $1 ORDER BY created_at DESC',
                [req.userEmail]
            );
        }
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/design-requests — customer submits design brief
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const d = req.body;
        const result = await db.query(
            `INSERT INTO design_requests
               (booking_id, customer_name, customer_email, brief, fee, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING *`,
            [d.bookingId || null, d.customerName, d.customerEmail,
             JSON.stringify(d.brief || {}), d.fee || 2500]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/design-requests/:id — admin updates status / delivery_url
router.patch('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const allowed = ['status', 'delivery_url', 'notes'];
        const fields = [], vals = [];
        let i = 1;
        for (const key of allowed) {
            if (d[key] !== undefined) { fields.push(`${key} = $${i++}`); vals.push(d[key]); }
        }
        if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
        fields.push(`updated_at = NOW()`);
        vals.push(req.params.id);
        const result = await db.query(
            `UPDATE design_requests SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, vals
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
