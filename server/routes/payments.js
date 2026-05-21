const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// GET /api/payments (admin only)
router.get('/', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, b.customer_name, b.customer_email, b.quotation_number
            FROM payments p
            LEFT JOIN bookings b ON b.booking_id = p.booking_id
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payments — record a payment
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const d = req.body;
        const result = await db.query(
            `INSERT INTO payments (booking_id, quotation_number, amount, payment_method, reference_number, status)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [d.bookingId || null, d.quotationNumber || null,
             d.amount, d.paymentMethod, d.referenceNumber || null, d.status || 'pending']
        );

        // Auto-update booking status if payment completed
        if (d.status === 'completed' && d.bookingId) {
            await db.query(
                `UPDATE bookings SET payment_status = 'completed', status = 'paid', updated_at = NOW()
                 WHERE booking_id = $1`,
                [d.bookingId]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/payments error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/payments/:id (admin only)
router.patch('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'status required' });

        const result = await db.query(
            'UPDATE payments SET status = $1 WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Payment not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
