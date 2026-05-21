const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// GET /api/quotations
router.get('/', verifyFirebaseToken, async (req, res) => {
    try {
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'adspot77@gmail.com,shehan.k98@gmail.com')
            .split(',').map(e => e.trim().toLowerCase());
        const isAdmin = ADMIN_EMAILS.includes(req.userEmail.toLowerCase());

        let result;
        if (isAdmin) {
            result = await db.query('SELECT * FROM quotations ORDER BY created_at DESC');
        } else {
            result = await db.query(
                'SELECT * FROM quotations WHERE customer_email = $1 ORDER BY created_at DESC',
                [req.userEmail]
            );
        }
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/quotations
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const d = req.body;

        // Upsert customer
        if (d.customerEmail) {
            await db.query(
                `INSERT INTO customers (firebase_uid, name, email, phone, company)
                 VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (email) DO UPDATE SET
                   name = EXCLUDED.name,
                   phone = COALESCE(EXCLUDED.phone, customers.phone),
                   updated_at = NOW()`,
                [req.uid, d.customerName, d.customerEmail, d.customerPhone || null, d.customerCompany || null]
            );
        }

        const custResult = d.customerEmail
            ? await db.query('SELECT id FROM customers WHERE email = $1', [d.customerEmail])
            : { rows: [] };
        const customerId = custResult.rows[0]?.id || null;

        const result = await db.query(
            `INSERT INTO quotations
               (quotation_number, customer_id, customer_name, customer_email,
                customer_phone, customer_company, items, subtotal, commission,
                vat, service_charge, promo_code, promo_discount, total, notes,
                pdf_url, payment_method, payment_status, status, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
             RETURNING *`,
            [
                d.quotationNumber, customerId, d.customerName, d.customerEmail,
                d.customerPhone || null, d.customerCompany || null,
                JSON.stringify(d.items || []),
                d.subtotal, d.commission || 0, d.vat || 0, d.serviceCharge || 0,
                d.promoCode || null, d.promoDiscount || 0,
                d.total, d.notes || null, d.pdfUrl || null,
                d.paymentMethod || null, d.paymentStatus || 'pending',
                d.status || 'pending', d.source || 'website'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/quotations error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/quotations/:quotationNumber
router.patch('/:quotationNumber', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const fields = [];
        const vals = [];
        let i = 1;

        const allowed = ['status', 'payment_status', 'payment_method', 'pdf_url', 'notes'];
        for (const key of allowed) {
            if (d[key] !== undefined) { fields.push(`${key} = $${i++}`); vals.push(d[key]); }
        }
        if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

        fields.push(`updated_at = NOW()`);
        vals.push(req.params.quotationNumber);

        const result = await db.query(
            `UPDATE quotations SET ${fields.join(', ')} WHERE quotation_number = $${i} RETURNING *`,
            vals
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Quotation not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
