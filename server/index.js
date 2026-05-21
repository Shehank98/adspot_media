try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch (_) {}

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api/publications',     require('./routes/publications'));
app.use('/api/bookings',        require('./routes/bookings'));
app.use('/api/invoices',        require('./routes/invoices'));
app.use('/api/quotations',      require('./routes/quotations'));
app.use('/api/customers',       require('./routes/customers'));
app.use('/api/payments',        require('./routes/payments'));
app.use('/api/promo-codes',     require('./routes/promoCodes'));
app.use('/api/push-register',   require('./routes/push'));
app.use('/api/helapay',         require('./routes/helapay'));
app.use('/api/helapay-webhook', require('./routes/helapayWebhook'));

// ── Static files (the entire repo root) ──────────────────────────────────────
const ROOT = path.join(__dirname, '..');
app.use(express.static(ROOT));

// Clean URL rewrites (match Netlify redirects)
app.get('/book',    (_, res) => res.sendFile(path.join(ROOT, 'book.html')));
app.get('/admin',   (_, res) => res.sendFile(path.join(ROOT, 'admin', 'index.html')));
app.get('/admin/',  (_, res) => res.sendFile(path.join(ROOT, 'admin', 'index.html')));

// Admin page rewrites (admin-bookings → admin-bookings.html, etc.)
app.get('/admin-:page', (req, res, next) => {
    const file = path.join(ROOT, `admin-${req.params.page}.html`);
    res.sendFile(file, err => { if (err) next(); });
});

// SPA fallback — serve index.html for any unmatched GET
app.get('*', (_, res) => res.sendFile(path.join(ROOT, 'index.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ AdSpot Media server running on port ${PORT}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`);
});
