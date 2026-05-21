const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// GET /api/invoices — admin: all; customer: own by email
router.get('/', verifyFirebaseToken, async (req, res) => {
    try {
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'adspot77@gmail.com,shehan.k98@gmail.com')
            .split(',').map(e => e.trim().toLowerCase());
        const isAdmin = ADMIN_EMAILS.includes(req.userEmail.toLowerCase());

        let result;
        if (isAdmin) {
            result = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
        } else {
            result = await db.query(
                'SELECT * FROM invoices WHERE customer_email = $1 ORDER BY created_at DESC',
                [req.userEmail]
            );
        }
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/invoices — create invoice
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const d = req.body;
        const result = await db.query(
            `INSERT INTO invoices
               (invoice_number, quotation_number, booking_id, customer_id,
                customer_name, customer_email, items, subtotal, commission,
                vat, service_charge, total, pdf_url, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             ON CONFLICT (invoice_number) DO UPDATE SET
               pdf_url = EXCLUDED.pdf_url,
               status = EXCLUDED.status,
               paid_at = CASE WHEN EXCLUDED.status = 'paid' THEN NOW() ELSE invoices.paid_at END
             RETURNING *`,
            [
                d.invoiceNumber, d.quotationNumber, d.bookingId || null, d.customerId || null,
                d.customerName, d.customerEmail,
                JSON.stringify(d.items || []),
                d.subtotal, d.commission || 0, d.vat || 0, d.serviceCharge || 0, d.total,
                d.pdfUrl || null, d.status || 'sent'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/invoices error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/invoices/:invoiceNumber — update status / pdf_url (admin only)
router.patch('/:invoiceNumber', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const updates = [];
        const vals = [];
        let i = 1;

        if (d.status !== undefined) {
            updates.push(`status = $${i++}`);
            vals.push(d.status);
            if (d.status === 'paid') {
                updates.push(`paid_at = NOW()`);
            }
        }
        if (d.pdf_url !== undefined) { updates.push(`pdf_url = $${i++}`); vals.push(d.pdf_url); }
        if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

        vals.push(req.params.invoiceNumber);
        const result = await db.query(
            `UPDATE invoices SET ${updates.join(', ')} WHERE invoice_number = $${i} RETURNING *`,
            vals
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
