const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// GET /api/bookings — admin: all bookings; customer: own bookings by email
router.get('/', verifyFirebaseToken, async (req, res) => {
    try {
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'adspot77@gmail.com,shehan.k98@gmail.com')
            .split(',').map(e => e.trim().toLowerCase());
        const isAdmin = ADMIN_EMAILS.includes(req.userEmail.toLowerCase());

        let result;
        if (isAdmin) {
            result = await db.query(
                'SELECT * FROM bookings ORDER BY created_at DESC'
            );
        } else {
            // Customer: return their own bookings
            const email = req.query.customerEmail || req.userEmail;
            result = await db.query(
                'SELECT * FROM bookings WHERE customer_email = $1 ORDER BY created_at DESC',
                [email]
            );
        }
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/bookings error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/bookings — create new booking
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const d = req.body;

        // Upsert customer by email
        const custResult = await db.query(
            `INSERT INTO customers (firebase_uid, name, email, phone, company, address)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (email) DO UPDATE SET
               name = EXCLUDED.name,
               phone = COALESCE(EXCLUDED.phone, customers.phone),
               company = COALESCE(EXCLUDED.company, customers.company),
               updated_at = NOW()
             RETURNING id`,
            [req.uid, d.customerName, d.customerEmail, d.customerPhone || null,
             d.customerCompany || null, d.customerAddress || null]
        );
        const customerId = custResult.rows[0].id;

        const result = await db.query(
            `INSERT INTO bookings
               (booking_id, quotation_number, invoice_number, customer_id,
                customer_name, customer_email, customer_phone, customer_company, customer_address,
                items, total_amount, subtotal_amount, promo_code, promo_discount,
                payment_method, payment_status, payment_reference, quotation_pdf_url,
                status, notes, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
             RETURNING *`,
            [
                d.bookingId, d.quotationNumber, d.invoiceNumber, customerId,
                d.customerName, d.customerEmail, d.customerPhone || null,
                d.customerCompany || null, d.customerAddress || null,
                JSON.stringify(d.items || []),
                d.totalAmount, d.subtotalAmount || d.totalAmount,
                d.promoCode || null, d.promoDiscount || 0,
                d.paymentMethod, d.paymentStatus || 'pending',
                d.paymentReference || null, d.quotationPdfUrl || null,
                d.status || 'pending', d.notes || null, d.source || 'website'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Booking already exists' });
        console.error('POST /api/bookings error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/bookings/:id — update booking (admin only)
router.patch('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const d = req.body;
        const fields = [];
        const vals = [];
        let i = 1;

        const allowed = ['status', 'payment_status', 'payment_reference', 'notes',
                         'invoice_number', 'quotation_pdf_url'];
        for (const key of allowed) {
            if (d[key] !== undefined) {
                fields.push(`${key} = $${i++}`);
                vals.push(d[key]);
            }
        }
        if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

        fields.push(`updated_at = NOW()`);
        vals.push(id);

        const result = await db.query(
            `UPDATE bookings SET ${fields.join(', ')} WHERE booking_id = $${i} RETURNING *`,
            vals
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Booking not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('PATCH /api/bookings error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/bookings/:id — admin only
router.delete('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM bookings WHERE booking_id = $1 RETURNING booking_id',
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Booking not found' });
        res.json({ deleted: result.rows[0].booking_id });
    } catch (err) {
        console.error('DELETE /api/bookings error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
