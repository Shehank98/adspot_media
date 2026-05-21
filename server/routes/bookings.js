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
        // ?self=true forces own-email filter even for admin (used by my-bookings page)
        if (isAdmin && !req.query.self) {
            const filterEmail = req.query.customerEmail;
            if (filterEmail) {
                result = await db.query(
                    'SELECT * FROM bookings WHERE customer_email = $1 ORDER BY created_at DESC',
                    [filterEmail]
                );
            } else {
                result = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
            }
        } else {
            // Match by firebase_uid (via customer join) OR by email (case-insensitive)
            // so bookings booked with a different email casing or pre-login still appear
            result = await db.query(
                `SELECT DISTINCT b.* FROM bookings b
                 LEFT JOIN customers c ON c.id = b.customer_id
                 WHERE c.firebase_uid = $1
                    OR LOWER(b.customer_email) = LOWER($2)
                 ORDER BY b.created_at DESC`,
                [req.uid, req.userEmail]
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
                design_requested, design_fee,
                status, notes, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
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
                d.designRequested || false, d.designFee || 0,
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

// PATCH /api/bookings/:id/receipt — customer uploads receipt (own booking only)
router.patch('/:id/receipt', verifyFirebaseToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { receipt_url, receipt_uploaded_at, receipt_status } = req.body;

        // Verify the booking belongs to this user
        const check = await db.query(
            `SELECT b.booking_id FROM bookings b
             LEFT JOIN customers c ON c.id = b.customer_id
             WHERE b.booking_id = $1
               AND (c.firebase_uid = $2 OR LOWER(b.customer_email) = LOWER($3))`,
            [id, req.uid, req.userEmail]
        );
        if (!check.rows.length) return res.status(403).json({ error: 'Booking not found or access denied' });

        const result = await db.query(
            `UPDATE bookings SET
               receipt_url = $1,
               receipt_uploaded_at = $2,
               receipt_status = $3,
               updated_at = NOW()
             WHERE booking_id = $4 RETURNING *`,
            [receipt_url, receipt_uploaded_at || new Date().toISOString(), receipt_status || 'submitted', id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('PATCH /api/bookings/:id/receipt error:', err.message);
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
                         'invoice_number', 'quotation_pdf_url',
                         'artwork_status', 'artwork_received_at', 'artwork_approved_at',
                         'sent_to_publication_at', 'proof_url', 'published_at',
                         'design_requested', 'design_fee',
                         'receipt_url', 'receipt_uploaded_at', 'receipt_status'];
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
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const id = req.params.id;
        // Remove child records first to satisfy foreign key constraints
        await client.query('DELETE FROM design_requests WHERE booking_id = $1', [id]);
        await client.query('DELETE FROM payments WHERE booking_id = $1', [id]);
        await client.query('DELETE FROM invoices WHERE booking_id = $1', [id]);
        const result = await client.query(
            'DELETE FROM bookings WHERE booking_id = $1 RETURNING booking_id',
            [id]
        );
        if (!result.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Booking not found' });
        }
        await client.query('COMMIT');
        res.json({ deleted: result.rows[0].booking_id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('DELETE /api/bookings error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
