const admin = require('firebase-admin');

// Initialise Firebase Admin SDK once
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey })
        });
        console.log('✅ Firebase Admin SDK initialised');
    } else {
        // Dev mode — skip token verification
        console.warn('⚠️  Firebase Admin credentials not set — token verification disabled (dev mode)');
        admin.initializeApp({ projectId: projectId || 'adspot-b44ef' });
    }
}

/**
 * Middleware: verify Firebase ID token from Authorization: Bearer <token>
 * Sets req.uid and req.userEmail on success.
 * In dev (no credentials), passes through with uid='dev'.
 */
async function verifyFirebaseToken(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing Authorization token' });
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.uid = decoded.uid;
        req.userEmail = decoded.email || '';
        next();
    } catch (err) {
        // In development without credentials, fall through
        if (process.env.NODE_ENV !== 'production' && !process.env.FIREBASE_CLIENT_EMAIL) {
            req.uid = 'dev';
            req.userEmail = 'dev@adspot.lk';
            return next();
        }
        return res.status(401).json({ error: 'Invalid token: ' + err.message });
    }
}

/**
 * Middleware: require admin role.
 * Admin = email in ADMIN_EMAILS env var (comma-separated) or hardcoded defaults.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'adspot77@gmail.com,shehan.k98@gmail.com')
    .split(',').map(e => e.trim().toLowerCase());

function requireAdmin(req, res, next) {
    if (!req.userEmail || !ADMIN_EMAILS.includes(req.userEmail.toLowerCase())) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

/**
 * Middleware: optionally verify Firebase token.
 * If no token is present, treats the request as a guest (req.uid = null).
 * Used for endpoints that must work for both logged-in users AND guests
 * (e.g. POST /api/bookings — guests can place orders).
 */
async function optionalAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        req.uid = null;
        req.userEmail = null;
        req.isGuest = true;
        return next();
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.uid = decoded.uid;
        req.userEmail = decoded.email || '';
        req.isGuest = false;
        next();
    } catch (err) {
        if (process.env.NODE_ENV !== 'production' && !process.env.FIREBASE_CLIENT_EMAIL) {
            req.uid = 'dev';
            req.userEmail = 'dev@adspot.lk';
            req.isGuest = false;
            return next();
        }
        return res.status(401).json({ error: 'Invalid token: ' + err.message });
    }
}

module.exports = { verifyFirebaseToken, requireAdmin, optionalAuth };
