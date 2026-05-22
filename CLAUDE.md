# AdSpot Media — Codebase Guide

## What This Project Is

AdSpot Media is a Sri Lankan newspaper advertising booking platform. Customers browse newspaper publications, configure box ads (column × height) or classified ads (word-based), add to a cart, pay via bank transfer or HelaPay QR, and receive email confirmation with a PDF quotation. Admins manage bookings, publications, promo codes, customers, and revenue analytics from a separate admin panel.

---

## Architecture

```
Browser
  ├── Static HTML/CSS/JS (served by Railway Express from repo root)
  ├── Firebase Auth (user login / admin auth)
  └── Firebase Storage (ad artwork uploads, invoices, receipts, proofs)

Railway Express Server (server/)
  ├── API routes (/api/*)
  └── PostgreSQL (single Railway-managed DB)

Google Apps Script
  └── Email relay (booking confirmations, invoices, publication notices)
```

**Key principle:** Firebase Auth and Firebase Storage are unchanged from the original Netlify setup. All data reads/writes that were Firestore are now Railway PostgreSQL via Express API routes. `js/firebase-db.js` is the bridge — it replaced Firestore calls with `apiRequest()` fetch calls.

---

## Active Development Branch

`claude/pwa-mobile-app-design-K1YLI`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Hosting / API | Railway (Node.js / Express 4) |
| Database | Railway PostgreSQL (pg pool) |
| Auth | Firebase Auth compat v10.7.1 |
| File storage | Firebase Storage compat v10.7.1 |
| Email | Google Apps Script (no-cors POST) |
| PDF generation | jsPDF + html2canvas |
| Payments | HelaPay QR + PayHere (sandbox) |
| Push notifications | web-push (VAPID) |
| CSS | Custom (css/styles.css), Inter font |
| Charts | Chart.js 4.4.0 |

---

## Directory Structure

```
adspot_media/
├── server/
│   ├── index.js              # Express app entry, mounts all routes, serves static files
│   ├── db.js                 # pg Pool (DATABASE_URL, SSL)
│   ├── middleware/
│   │   └── auth.js           # verifyFirebaseToken, requireAdmin
│   ├── routes/
│   │   ├── bookings.js       # GET/POST/PATCH/DELETE /api/bookings
│   │   ├── invoices.js       # GET/POST/PATCH /api/invoices
│   │   ├── quotations.js     # GET/POST/PATCH /api/quotations
│   │   ├── customers.js      # GET/PATCH /api/customers
│   │   ├── payments.js       # GET/POST /api/payments
│   │   ├── promoCodes.js     # GET/POST/PATCH/DELETE /api/promo-codes
│   │   ├── publications.js   # GET /api/publications (public)
│   │   ├── settings.js       # GET/PATCH /api/settings/:key
│   │   ├── design-requests.js
│   │   ├── helapay.js
│   │   ├── helapayWebhook.js
│   │   └── push.js
│   └── migrations/
│       ├── 001_schema.sql    # All tables
│       ├── 002_publications.sql
│       ├── 002_tracking.sql  # Artwork + design_requests table (should be 003)
│       └── 003_settings.sql  # Settings table + seeds
├── js/
│   ├── config.js             # All pricing config, column widths, calculateBoxAdPrice/ClassifiedPrice
│   ├── firebase-config.js    # Firebase project credentials
│   ├── firebase-db.js        # apiRequest() helper + all API wrappers + email senders
│   ├── booking.js            # 2300-line booking page controller
│   ├── invoice-pdf.js        # html2canvas PDF generation (Variant C "Stamped Classified")
│   ├── auth.js               # Shared auth UI
│   └── supabase.js           # Legacy (Supabase removed, file kept for non-DB helpers)
├── css/
│   ├── styles.css            # Main stylesheet
│   ├── admin-nav.css         # Admin navbar (compact, 56px height)
│   └── firebase-ui.css       # Auth UI
├── book.html                 # 3-step booking form
├── my-bookings.html          # Customer booking tracker
├── admin-bookings.html       # Main admin panel
├── admin-dashboard.html      # Revenue analytics + charts
├── admin-settings.html       # Admin-configurable rates
├── admin-publications.html   # Newspaper/group CRUD
├── admin-customers.html      # Customer management
├── admin-promo-codes.html    # Promo code management
├── admin-quotation.html      # Manual quotation builder
├── storage.rules             # Firebase Storage rules (deploy via Firebase Console)
└── railway.json              # Railway deploy config
```

---

## API Endpoints

### Public
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check — `{ ok: true }` |
| GET | `/api/publications` | All active newspapers grouped |
| GET | `/api/settings/:key` | Single setting value (design_fee, etc.) |
| GET | `/api/promo-codes?code=X` | Validate a promo code |

### Authenticated (Firebase token required)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/bookings` | Admin: all; Customer: own (uses firebase_uid + email match) |
| GET | `/api/bookings?self=true` | Force own-only even for admin accounts |
| POST | `/api/bookings` | Create booking (upserts customer row) |
| PATCH | `/api/bookings/:id/receipt` | Customer uploads payment receipt (ownership verified) |
| GET | `/api/invoices` | Admin: all; Customer: own by email |
| POST | `/api/invoices` | Create invoice (booking flow) |
| POST | `/api/design-requests` | Customer submits design brief |

### Admin Only
| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/api/bookings/:id` | Update any booking field |
| DELETE | `/api/bookings/:id` | Delete booking (cascades children) |
| PATCH | `/api/settings/:key` | Update any setting (upsert) |
| GET | `/api/customers` | All customers |
| PATCH | `/api/customers/:id` | Update customer |
| GET/POST/PATCH/DELETE | `/api/promo-codes` | Promo code management |
| GET/PATCH | `/api/design-requests` | Design request management |
| GET/PATCH | `/api/invoices/:invoiceNumber` | Invoice status/pdf_url update |

---

## Authentication Pattern

Firebase Auth is used throughout. Admin emails are hardcoded in two places (keep in sync):
- `server/middleware/auth.js` — reads from `process.env.ADMIN_EMAILS` or defaults to `adspot77@gmail.com,shehan.k98@gmail.com`
- All `admin-*.html` files — have `const ADMIN_EMAILS = ['adspot77@gmail.com', 'shehan.k98@gmail.com']` in inline script

**Adding a new admin:** Add their email to both locations.

**`apiRequest()` helper** (in `js/firebase-db.js`):
```js
async function apiRequest(method, path, body) {
    const token = await firebase.auth().currentUser?.getIdToken();
    // attaches Authorization: Bearer <token>
}
```
`admin-customers.html` has its own inline copy (identical). All other pages use the shared `firebase-db.js` version.

---

## Database Schema Summary

Run migrations in order: 001 → 002_publications → 002_tracking → 003_settings

### Key Tables
- **customers** — upserted on every booking (keyed by email)
- **bookings** — core table; `items` is JSONB array of ad cart items
- **invoices** — created after booking confirmed
- **quotations** — manual quotations from admin-quotation tool
- **promo_codes** — discount codes with usage tracking
- **publications / publication_groups / newspapers** — from 002_publications.sql
- **design_requests** — customer ad design briefs
- **settings** — key/value store for admin-configurable rates
- **push_subscriptions** — web push endpoint registrations

### Settings Keys (all in `settings` table)
| Key | Default | Used In |
|-----|---------|---------|
| `design_fee` | 3000 | booking.js, admin-settings.html |
| `box_commission_pct` | 5 | booking.js, admin-quotation.html, admin-dashboard.html |
| `classified_commission_pct` | 5 | admin-settings.html |
| `vat_pct` | 18 | booking.js, admin-quotation.html |
| `classified_service_charge` | 50 | booking.js, admin-quotation.html |

**Settings are loaded at page init** via `loadServerSettings()` in `booking.js` (awaited before `initBookingForm`). They override `CONFIG.CHARGES.*` values from `config.js`.

If keys are missing from DB, run:
```sql
INSERT INTO settings (key, value) VALUES
  ('design_fee', '3000'), ('box_commission_pct', '5'),
  ('classified_commission_pct', '5'), ('vat_pct', '18'),
  ('classified_service_charge', '50')
ON CONFLICT (key) DO NOTHING;
```

---

## Pricing Logic

All price calculations live in `js/config.js`.

### Box Ad
```
area = columns × height (cm)
adTotal = area × rate (bw or color)
commission = adTotal × CONFIG.CHARGES.boxAdCommission
vat = adTotal × CONFIG.CHARGES.vatRate
total = adTotal + commission + vat
```

### Classified Ad
```
extraWords = max(0, wordCount - freeWords)
adTotal = classifiedBase + (extraWords × classifiedExtraRate)
total = adTotal + CONFIG.CHARGES.classifiedServiceCharge
```
No commission or VAT on classified ads — only the fixed service charge.

---

## Booking Flow (3 Steps)

1. **Step 1** — Select newspaper, configure ad (box or classified), add to cart. Design add-on checkbox shown after newspaper selection.
2. **Step 2** — Customer contact details form. Email is pre-filled from Firebase Auth and locked (readonly).
3. **Step 3** — Payment method selection. Bank transfer → "Confirm Booking"; HelaPay → "Pay Now".

On submit:
1. Ad artwork uploaded to Firebase Storage (`ad-artworks/{year}/{month}/{day}/{bookingId}/{file}`)
2. `POST /api/bookings` — creates booking + upserts customer
3. Bank transfer: generates unpaid PDF quotation → `POST /api/invoices` → sends confirmation email
4. HelaPay: creates HelaPay session → shows QR modal → polls for payment

---

## Email System (Google Apps Script)

All emails go through a Google Apps Script web app (`APPS_SCRIPT_URL` in `js/firebase-db.js`). It handles multiple `action` types:
- `send_booking_confirmation` — sent on every booking
- `send_invoice` — sent when admin generates paid invoice
- `send_to_publication` — admin sends ad details to newspaper
- `send_proof_of_publication` — admin sends proof to customer
- `send_design_delivery` — admin delivers design to customer

The fetch uses `mode: 'no-cors'` so there's no response to check.

---

## Admin Pages

| Page | Purpose |
|------|---------|
| `/admin-dashboard` | Revenue charts (Chart.js), earnings breakdown |
| `/admin-bookings` | Full booking management with side panel |
| `/admin-publications` | Newspaper groups + individual newspapers CRUD |
| `/admin-customers` | Customer list with booking history |
| `/admin-promo-codes` | Create/disable/delete discount codes |
| `/admin-quotation` | Manual quotation builder with PDF export |
| `/admin-settings` | Design fee, commission rates, VAT, service charge |

All admin pages use `css/admin-nav.css` for the compact navbar (56px height, shortened labels).

---

## Firebase Storage Paths

| Path | Who | What |
|------|-----|------|
| `ad-artworks/{y}/{m}/{d}/{bookingId}/{file}` | Customer (auth) | Ad artwork uploads |
| `invoices/{invoiceNumber}.pdf` | Customer (auth) | Generated invoice PDFs |
| `receipts/{bookingId}/{file}` | Customer (auth) | Payment receipt uploads |
| `proofs/{bookingId}/{file}` | Admin only | Publication proof images |
| `newspaper-logos/{file}` | Admin only (write) | Newspaper logos |

**Storage rules are in `storage.rules`** — must be deployed manually via Firebase Console. The repo file is the source of truth.

---

## Known Issues & Gotchas

### Production Readiness
- **PayHere credentials in config.js** — `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, and `PAYHERE_SANDBOX: true` are currently test values. Before going live: change to production credentials and set `PAYHERE_SANDBOX: false`.
- **Migration numbering conflict** — Both `002_publications.sql` and `002_tracking.sql` use prefix `002`. Run them in the correct order; the second is the artwork/design_requests tracking migration.

### Settings & Config
- `CONFIG.CHARGES.classifiedServiceCharge = 50` is the hardcoded fallback in `config.js`. The database setting `classified_service_charge` overrides it at runtime. If the DB key is missing, the fallback applies.
- `config.js` comments say "Rs. 100 service charge" in several places — these are stale comments; the actual default is Rs. 50.

### Booking Page
- Settings are `await`-ed at the top of `DOMContentLoaded` before `initBookingForm()` so CONFIG is always correct before the user can interact.
- Customer email is locked to Firebase Auth email (readonly field) to prevent autofill substitution bugs. `handleSubmit()` also reads directly from `firebase.auth().currentUser.email` as a safety override.
- The floating price bar (`#floatingPriceBar`) shows whenever `total > 0`. It was previously driven by `IntersectionObserver` on the sticky sidebar, which never fired (sticky elements always intersect).

### Delete Booking
- `DELETE /api/bookings/:id` runs in a transaction deleting children in order: `design_requests` → `payments` → `invoices` → booking. Uses `db.connect()` (not `db.pool.connect()` — `db.js` exports the pool directly).

### My Bookings Page
- Customer bookings are fetched with `?self=true` which queries `WHERE c.firebase_uid = $1 OR LOWER(b.customer_email) = LOWER($2)` — handles both Firebase UID match and historical bookings where UID wasn't stored.

### Admin Dashboard Charts
- All Chart.js instances use `maintainAspectRatio: false` with fixed-height container divs (`.chart-wrap { height: 300px }`). Without this, charts shrink in a resize loop.
- `buildDashboard()` is `async` because it fetches `box_commission_pct` from settings to calculate estimated commission earned.

---

## Environment Variables (Railway)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Auto-provided by Railway PostgreSQL add-on |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Service account private key (include `\n`) |
| `ADMIN_EMAILS` | No | Comma-separated; defaults to the two hardcoded emails |
| `HELAPAY_BASE_URL` | Yes | HelaPay API base |
| `HELAPAY_APP_ID` | Yes | HelaPay app credentials |
| `HELAPAY_APP_SECRET` | Yes | HelaPay app credentials |
| `HELAPAY_BUSINESS_ID` | Yes | HelaPay business ID |
| `VAPID_PUBLIC_KEY` | Yes | Web push key |
| `VAPID_PRIVATE_KEY` | Yes | Web push key |
| `VAPID_SUBJECT` | Yes | `mailto:` address for push |
| `NODE_ENV` | No | Set to `production` on Railway |

---

## Common Development Tasks

### Adding a new admin-configurable setting
1. Add `INSERT INTO settings (key, value) VALUES ('new_key', 'default')` to `003_settings.sql`
2. Add a row to the appropriate card in `admin-settings.html` using `saveSetting('new_key', ...)`
3. Load it in `loadServerSettings()` in `js/booking.js` and update `CONFIG.CHARGES.*` if needed
4. Use `CONFIG.CHARGES.newField` in calculations

### Adding a new booking field
1. `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS new_col TYPE DEFAULT val;` in a new migration
2. Add to POST INSERT in `server/routes/bookings.js` (remember to increment the `$N` param count)
3. Add to PATCH `allowed` array in `server/routes/bookings.js`
4. Add to `saveBookingToFirebase()` payload in `js/firebase-db.js`

### Adding a new admin page
1. Create `admin-newpage.html` — copy the navbar block from `admin-bookings.html`
2. Ensure these scripts are loaded in this order:
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js"></script>
   <script src="js/firebase-config.js"></script>
   <script src="js/firebase-db.js"></script>
   ```
3. Add nav link to all `admin-*.html` files
4. Railway serves it automatically at `/admin-newpage` via the `admin-:page` wildcard route

### Deploying storage rule changes
Firebase Storage rules are **not** deployed by Railway. After editing `storage.rules`:
1. Go to Firebase Console → Storage → Rules
2. Paste the contents of `storage.rules` and publish

### Running DB migrations
Railway doesn't auto-run migrations. Connect to Railway PostgreSQL with `psql` and run each `.sql` file manually in order.

---

## Script Loading Requirements Per Page

Every page that uses `apiRequest()` or Firebase must load these in order:
1. `firebase-app-compat.js`
2. `firebase-auth-compat.js`
3. `firebase-firestore-compat.js` (even if not using Firestore directly — some helpers check for it)
4. `firebase-storage-compat.js` (if doing any Storage operations)
5. `js/firebase-config.js`
6. `js/firebase-db.js` (provides `apiRequest`, email helpers, storage upload)
7. `js/config.js` (provides `CONFIG`, `calculateBoxAdPrice`, `calculateClassifiedPrice`)

**Pages with inline `apiRequest` copies** (not loaded from firebase-db.js):
- `admin-customers.html` — inline copy, functionally identical
- `admin-publications.html` — uses `apiReq` (different name), inline

---

## Audit Summary (Last Checked: 2026-05-22)

### Service Worker Cache
The site registers a PWA service worker (`sw.js`) that uses **cache-first** for all static JS/CSS files. Any JS code change requires bumping `CACHE_VERSION` in `sw.js` (e.g. v2 → v3) so browsers discard cached old files. API routes (`/api/*`) are always fetched from the network — the SW explicitly skips them.

### Settings GET Fallback
`/api/settings/:key` returns a hardcoded default (from `DEFAULTS` map in `server/routes/settings.js`) if the key is not in the DB. This means pages work correctly even before the seed SQL is run. When the admin saves a new value from `/admin-settings`, it upserts into the DB and all subsequent GETs return the real stored value.

### Confirmed Working
- Booking flow end-to-end (box + classified, bank transfer + HelaPay)
- Admin booking management (approve, reject, send to publication, upload proof)
- Settings system (rates load before form initialises, server returns defaults for unknown keys)
- Floating price bar (shows when price > 0)
- Commission/VAT/service charge all dynamic from DB settings
- Revenue dashboard (charts stable, earnings row, commission calculated from settings)
- Delete booking (cascades children correctly in transaction)
- Customer self-service booking view (`?self=true` with UID + email fallback)
- Firebase Storage rules (ad artwork, receipts, proofs, invoices)
- PDF generation (html2canvas + jsPDF, Variant C newspaper design)

### Known Remaining Issues
1. **PayHere sandbox** — `PAYHERE_SANDBOX: true` and test credentials in `config.js`. Must change before live payments.
2. **Promo code admin list** — Fixed to use `verifyFirebaseToken + requireAdmin`. Previously only checked Bearer prefix.
3. **Migration numbering** — Two files named `002_*.sql`. Harmless but confusing; treat `002_tracking.sql` as if it were `004`.
4. **config.js stale comments** — Multiple comments say "Rs. 100" where the code value is 50. The DB setting is authoritative at runtime.
5. **Publication contact emails** — `CONFIG.PUBLICATION_EMAILS` in config.js is all empty strings; live emails are in the `publication_groups.contact_email` DB column.
