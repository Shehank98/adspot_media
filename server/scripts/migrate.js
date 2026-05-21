/**
 * One-time data migration: Firestore + Supabase → Railway PostgreSQL
 *
 * Usage:
 *   DATABASE_URL=postgresql://... \
 *   FIREBASE_PROJECT_ID=adspot-b44ef \
 *   FIREBASE_CLIENT_EMAIL=... \
 *   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..." \
 *   SUPABASE_URL=https://... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node server/scripts/migrate.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const admin = require('firebase-admin');
const { Pool } = require('pg');

// ── PostgreSQL ─────────────────────────────────────────────────────────────
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ── Firebase Admin ─────────────────────────────────────────────────────────
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
        })
    });
}
const firestore = admin.firestore();

// ── Supabase REST helper ───────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function supaFetch(path) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return [];
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    if (!res.ok) { console.warn('Supabase fetch failed:', path, res.status); return []; }
    return res.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────
function ts(val) {
    if (!val) return null;
    if (val._seconds) return new Date(val._seconds * 1000).toISOString();
    if (val.toDate) return val.toDate().toISOString();
    return val;
}

function safe(val, fallback = null) {
    return val !== undefined ? val : fallback;
}

// ── Migration ──────────────────────────────────────────────────────────────
async function migrate() {
    console.log('🚀 Starting migration...\n');

    // 1. Customers from Supabase
    console.log('📋 Migrating customers from Supabase...');
    const sbCustomers = await supaFetch('/customers?select=*&order=created_at.asc');
    let custCount = 0;
    for (const c of sbCustomers) {
        try {
            await pool.query(
                `INSERT INTO customers (name, email, phone, company, address, city, district, total_spent, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (email) DO NOTHING`,
                [c.name, c.email, c.phone, c.company, c.address, c.city, c.district,
                 c.total_spent || 0, c.created_at || new Date().toISOString()]
            );
            custCount++;
        } catch (e) { console.warn('  customer skip:', c.email, e.message); }
    }
    console.log(`  ✅ ${custCount} customers inserted\n`);

    // 2. Bookings from Firestore
    console.log('📦 Migrating bookings from Firestore...');
    const bookingsSnap = await firestore.collection('bookings').get();
    let bookCount = 0;
    for (const doc of bookingsSnap.docs) {
        const b = doc.data();
        const email = b.customerEmail || '';

        // Ensure customer exists
        if (email) {
            await pool.query(
                `INSERT INTO customers (name, email, phone, company, created_at)
                 VALUES ($1,$2,$3,$4,NOW())
                 ON CONFLICT (email) DO NOTHING`,
                [b.customerName || '', email, b.customerPhone || null, b.customerCompany || null]
            );
        }
        const custRes = email ? await pool.query('SELECT id FROM customers WHERE email=$1', [email]) : { rows: [] };
        const customerId = custRes.rows[0]?.id || null;

        try {
            await pool.query(
                `INSERT INTO bookings
                   (booking_id, quotation_number, invoice_number, customer_id,
                    customer_name, customer_email, customer_phone, customer_company, customer_address,
                    items, total_amount, subtotal_amount, promo_code, promo_discount,
                    payment_method, payment_status, payment_reference, quotation_pdf_url,
                    status, notes, source, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
                 ON CONFLICT (booking_id) DO NOTHING`,
                [
                    b.bookingId || doc.id,
                    b.quotationNumber || null, b.invoiceNumber || null, customerId,
                    b.customerName || null, email, b.customerPhone || null,
                    b.customerCompany || null, b.customerAddress || null,
                    JSON.stringify(b.items || []),
                    b.totalAmount || 0, b.subtotalAmount || b.totalAmount || 0,
                    b.promoCode || null, b.promoDiscount || 0,
                    b.paymentMethod || null, b.paymentStatus || 'pending',
                    b.paymentReference || null, b.quotationPdfUrl || null,
                    b.status || 'pending', b.notes || null, 'website',
                    ts(b.createdAt) || new Date().toISOString(),
                    ts(b.updatedAt) || new Date().toISOString()
                ]
            );
            bookCount++;
        } catch (e) { console.warn('  booking skip:', b.bookingId || doc.id, e.message); }
    }
    console.log(`  ✅ ${bookCount} bookings inserted\n`);

    // 3. Invoices from Firestore
    console.log('🧾 Migrating invoices from Firestore...');
    const invoicesSnap = await firestore.collection('invoices').get();
    let invCount = 0;
    for (const doc of invoicesSnap.docs) {
        const inv = doc.data();
        const custRes = inv.customerEmail
            ? await pool.query('SELECT id FROM customers WHERE email=$1', [inv.customerEmail])
            : { rows: [] };
        try {
            await pool.query(
                `INSERT INTO invoices
                   (invoice_number, quotation_number, booking_id, customer_id,
                    customer_name, customer_email, items, subtotal, commission,
                    vat, service_charge, total, pdf_url, status, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                 ON CONFLICT (invoice_number) DO NOTHING`,
                [
                    inv.invoiceNumber || doc.id,
                    inv.quotationNumber || null, inv.bookingId || null,
                    custRes.rows[0]?.id || null,
                    inv.customerName || null, inv.customerEmail || null,
                    JSON.stringify(inv.items || []),
                    inv.subtotal || 0, inv.commission || 0, inv.vat || 0,
                    inv.serviceCharge || 0, inv.total || 0,
                    inv.pdfUrl || null, inv.status || 'sent',
                    ts(inv.createdAt) || new Date().toISOString()
                ]
            );
            invCount++;
        } catch (e) { console.warn('  invoice skip:', inv.invoiceNumber, e.message); }
    }
    console.log(`  ✅ ${invCount} invoices inserted\n`);

    // 4. Quotations from Supabase
    console.log('📝 Migrating quotations from Supabase...');
    const sbQuotations = await supaFetch('/quotations?select=*&order=created_at.asc');
    let qtCount = 0;
    for (const q of sbQuotations) {
        const custRes = q.customer_id
            ? await pool.query('SELECT id FROM customers WHERE id=$1', [q.customer_id])
            : { rows: [] };
        try {
            await pool.query(
                `INSERT INTO quotations
                   (quotation_number, customer_id, items, subtotal, total,
                    payment_method, payment_status, status, source, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT (quotation_number) DO NOTHING`,
                [
                    q.quotation_number, custRes.rows[0]?.id || null,
                    JSON.stringify(q.items || []),
                    q.subtotal || q.total_amount || 0,
                    q.total_amount || 0,
                    q.payment_method || null, q.payment_status || 'pending',
                    q.status || 'pending', 'website',
                    q.created_at || new Date().toISOString(),
                    q.updated_at || new Date().toISOString()
                ]
            );
            qtCount++;
        } catch (e) { console.warn('  quotation skip:', q.quotation_number, e.message); }
    }
    console.log(`  ✅ ${qtCount} quotations inserted\n`);

    // 5. Payments from Supabase
    console.log('💳 Migrating payments from Supabase...');
    const sbPayments = await supaFetch('/payments?select=*&order=created_at.asc');
    let payCount = 0;
    for (const p of sbPayments) {
        try {
            await pool.query(
                `INSERT INTO payments (quotation_number, amount, payment_method, reference_number, status, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [p.quotation_number || null, p.amount || 0, p.payment_method || null,
                 p.reference_number || null, p.status || 'completed', p.created_at || new Date().toISOString()]
            );
            payCount++;
        } catch (e) { console.warn('  payment skip:', e.message); }
    }
    console.log(`  ✅ ${payCount} payments inserted\n`);

    // 6. Promo codes from Supabase
    console.log('🎫 Migrating promo codes from Supabase...');
    const sbPromos = await supaFetch('/promo_codes?select=*');
    let promoCount = 0;
    for (const pc of sbPromos) {
        try {
            await pool.query(
                `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, current_uses, expires_at, active, created_at)
                 VALUES (UPPER($1),$2,$3,$4,$5,$6,$7,$8)
                 ON CONFLICT (code) DO NOTHING`,
                [pc.code, pc.discount_type || 'percentage', pc.discount_value || 0,
                 pc.max_uses || null, pc.current_uses || 0, pc.expires_at || null,
                 pc.active !== false, pc.created_at || new Date().toISOString()]
            );
            promoCount++;
        } catch (e) { console.warn('  promo skip:', pc.code, e.message); }
    }
    console.log(`  ✅ ${promoCount} promo codes inserted\n`);

    // 7. Push subscriptions from Supabase
    console.log('🔔 Migrating push subscriptions from Supabase...');
    const sbPush = await supaFetch('/push_subscriptions?select=*');
    let pushCount = 0;
    for (const s of sbPush) {
        try {
            await pool.query(
                `INSERT INTO push_subscriptions (endpoint, p256dh, auth, device_label, created_at)
                 VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (endpoint) DO NOTHING`,
                [s.endpoint, s.p256dh, s.auth, s.device_label || 'Admin', s.created_at || new Date().toISOString()]
            );
            pushCount++;
        } catch (e) { console.warn('  push skip:', e.message); }
    }
    console.log(`  ✅ ${pushCount} push subscriptions inserted\n`);

    // Summary
    const counts = await Promise.all([
        pool.query('SELECT COUNT(*) FROM customers'),
        pool.query('SELECT COUNT(*) FROM bookings'),
        pool.query('SELECT COUNT(*) FROM invoices'),
        pool.query('SELECT COUNT(*) FROM quotations'),
        pool.query('SELECT COUNT(*) FROM payments'),
        pool.query('SELECT COUNT(*) FROM promo_codes'),
        pool.query('SELECT COUNT(*) FROM push_subscriptions')
    ]);

    console.log('─────────────────────────────────────────');
    console.log('📊 Final row counts in Railway PostgreSQL:');
    console.log(`   customers:          ${counts[0].rows[0].count}`);
    console.log(`   bookings:           ${counts[1].rows[0].count}`);
    console.log(`   invoices:           ${counts[2].rows[0].count}`);
    console.log(`   quotations:         ${counts[3].rows[0].count}`);
    console.log(`   payments:           ${counts[4].rows[0].count}`);
    console.log(`   promo_codes:        ${counts[5].rows[0].count}`);
    console.log(`   push_subscriptions: ${counts[6].rows[0].count}`);
    console.log('─────────────────────────────────────────');
    console.log('✅ Migration complete!\n');

    await pool.end();
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
