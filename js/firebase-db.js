/**
 * AdSpot Media — Database Operations
 * Data is stored in Railway PostgreSQL via REST API.
 * Firebase Auth and Firebase Storage are still used directly.
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqC7dhbLgOB9PjLuMFHBwn2uyTVQyJnDdt92GwWLC-q-UlJ3mB0a7eWNvwOnyhDxHV/exec';

// ── Shared API helper ─────────────────────────────────────────────────────────
async function apiRequest(method, path, body) {
    let token = '';
    try {
        const user = firebase.auth().currentUser;
        if (user) token = await user.getIdToken();
    } catch (_) {}

    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(path, opts);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
    }
    // 204 No Content
    if (res.status === 204) return null;
    return res.json();
}

// ── Booking ───────────────────────────────────────────────────────────────────
async function saveBookingToFirebase(bookingData) {
    try {
        const user = firebase.auth().currentUser;

        const booking = {
            bookingId: generateBookingId(),
            quotationNumber: bookingData.quotationNumber,
            invoiceNumber: bookingData.invoiceNumber,
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            customerPhone: bookingData.customerPhone,
            customerCompany: bookingData.customerCompany || '',
            customerAddress: bookingData.customerAddress || '',
            items: bookingData.items,
            totalAmount: bookingData.totalAmount,
            subtotalAmount: bookingData.subtotalAmount || bookingData.totalAmount,
            promoCode: bookingData.promoCode || null,
            promoDiscount: bookingData.promoDiscount || 0,
            paymentMethod: bookingData.paymentMethod,
            paymentStatus: bookingData.paymentStatus || 'pending',
            paymentReference: bookingData.paymentReference || '',
            quotationPdfUrl: bookingData.quotationPdfUrl || '',
            status: 'pending',
            notes: bookingData.notes || '',
            source: 'website'
        };

        const saved = await apiRequest('POST', '/api/bookings', booking);
        console.log('✅ Booking saved to PostgreSQL:', saved.booking_id);

        await sendBookingEmails(booking);
        return saved.booking_id;
    } catch (error) {
        console.error('❌ Error saving booking:', error);
        throw error;
    }
}

// ── Invoice ───────────────────────────────────────────────────────────────────
async function saveInvoiceToFirebase(invoiceData) {
    try {
        const saved = await apiRequest('POST', '/api/invoices', {
            invoiceNumber: invoiceData.invoiceNumber,
            quotationNumber: invoiceData.quotationNumber,
            bookingId: invoiceData.bookingId,
            customerName: invoiceData.customerName,
            customerEmail: invoiceData.customerEmail,
            items: invoiceData.items,
            subtotal: invoiceData.subtotal,
            commission: invoiceData.commission,
            vat: invoiceData.vat,
            serviceCharge: invoiceData.serviceCharge || 0,
            total: invoiceData.total,
            pdfUrl: invoiceData.pdfUrl || '',
            status: 'sent'
        });
        console.log('✅ Invoice saved to PostgreSQL:', invoiceData.invoiceNumber);
        return invoiceData.invoiceNumber;
    } catch (error) {
        console.error('❌ Error saving invoice:', error);
        throw error;
    }
}

// ── File upload — unchanged (Firebase Storage) ────────────────────────────────
async function uploadAdFileToFirebase(file, bookingId, onProgress) {
    return new Promise((resolve, reject) => {
        try {
            const user = firebase.auth().currentUser;
            if (!user) { reject(new Error('User must be logged in')); return; }

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `ad-artworks/${year}/${month}/${day}/${bookingId}/${fileName}`;
            const storageRef = storage.ref(filePath);
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (typeof onProgress === 'function') onProgress(progress);
                },
                (error) => { console.error('❌ Upload error:', error); reject(error); },
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        console.log('✅ File uploaded to Firebase Storage:', filePath);
                        resolve(downloadURL);
                    } catch (e) { reject(e); }
                }
            );
        } catch (error) { reject(error); }
    });
}

// ── Get user bookings ─────────────────────────────────────────────────────────
async function getUserBookings() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User must be logged in');
        const bookings = await apiRequest('GET', `/api/bookings?customerEmail=${encodeURIComponent(user.email)}`);
        return bookings;
    } catch (error) {
        console.error('❌ Error fetching bookings:', error);
        throw error;
    }
}

// ── Newspapers — read from CONFIG.PUBLICATIONS (config.js) ───────────────────
async function loadNewspapersFromFirebase() {
    // Newspapers are defined in js/config.js CONFIG.PUBLICATIONS.
    // No database lookup needed.
    if (typeof CONFIG !== 'undefined' && CONFIG.PUBLICATIONS) {
        console.log('✅ CONFIG.PUBLICATIONS already loaded from config.js');
        return CONFIG.PUBLICATIONS;
    }
    return {};
}

async function loadNewspaperLogos() {
    // Return default logos — newspaper data lives in config.js, not DB.
    return getDefaultNewspaperLogos();
}

function getDefaultNewspaperLogos() {
    return [
        { name: 'Daily News', language: 'english' },
        { name: 'Sunday Observer', language: 'english' },
        { name: 'Dinamina', language: 'sinhala' },
        { name: 'Silumina', language: 'sinhala' },
        { name: 'Lankadeepa', language: 'sinhala' },
        { name: 'Divaina', language: 'sinhala' },
        { name: 'Mawbima', language: 'sinhala' },
        { name: 'Thinakaran', language: 'tamil' },
        { name: 'Virakesari', language: 'tamil' }
    ];
}

// ── Emails — unchanged (Google Apps Script) ───────────────────────────────────
async function sendBookingEmails(bookingData) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('⚠️ Apps Script URL not configured. Skipping email sending.');
        return;
    }
    try {
        const items = bookingData.items.map(item => ({
            newspaperName: item.newspaperName,
            adType: item.adType,
            pubDate: item.pubDate,
            price: item.price,
            description: item.description,
            adFileUrl: item.adFileUrl || '',
            details: item.details
        }));

        await fetch(APPS_SCRIPT_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'booking_confirmation',
                quotationNumber: bookingData.quotationNumber,
                invoiceNumber: bookingData.invoiceNumber,
                customerName: bookingData.customerName,
                customerEmail: bookingData.customerEmail,
                customerPhone: bookingData.customerPhone,
                totalAmount: bookingData.totalAmount,
                subtotalAmount: bookingData.subtotalAmount,
                promoCode: bookingData.promoCode,
                promoDiscount: bookingData.promoDiscount,
                paymentMethod: bookingData.paymentMethod,
                quotationPdfUrl: bookingData.quotationPdfUrl || '',
                items
            })
        });
        console.log('✅ Customer confirmation email sent');

        await fetch(APPS_SCRIPT_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'sendAdminNotification',
                quotation_number: bookingData.quotationNumber,
                customer_name: bookingData.customerName,
                customer_email: bookingData.customerEmail,
                customer_phone: bookingData.customerPhone,
                newspaper_name: items[0]?.newspaperName || 'Multiple',
                total_amount: bookingData.totalAmount,
                subtotalAmount: bookingData.subtotalAmount,
                promoCode: bookingData.promoCode,
                promoDiscount: bookingData.promoDiscount,
                ad_type: items[0]?.adType || 'box',
                items
            })
        });
        console.log('✅ Admin notification email sent');
    } catch (error) {
        console.error('❌ Error sending emails:', error);
    }
}

async function sendInvoiceEmail(bookingData, invoiceData) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('⚠️ Apps Script URL not configured. Skipping invoice email.');
        return;
    }
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'invoice_email',
                invoiceNumber: invoiceData.invoiceNumber,
                quotationNumber: invoiceData.quotationNumber,
                customerName: bookingData.customerName,
                customerEmail: bookingData.customerEmail,
                customerPhone: bookingData.customerPhone || '',
                customerCompany: bookingData.customerCompany || '',
                totalAmount: invoiceData.total,
                subtotal: invoiceData.subtotal,
                commission: invoiceData.commission || 0,
                vat: invoiceData.vat || 0,
                serviceCharge: invoiceData.serviceCharge || 0,
                promoCode: invoiceData.promoCode || '',
                promoDiscount: invoiceData.promoDiscount || 0,
                pdfUrl: invoiceData.pdfUrl || '',
                paymentMethod: bookingData.paymentMethod || 'Card',
                paymentStatus: 'completed',
                items: bookingData.items.map(item => ({
                    newspaperName: item.newspaperName,
                    adType: item.adType,
                    pubDate: item.pubDate,
                    price: item.price,
                    details: item.details
                }))
            })
        });
        console.log('✅ Invoice email sent');
    } catch (error) {
        console.error('❌ Error sending invoice email:', error);
    }
}

async function sendFileUploadNotification(bookingData, fileUrl) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') return;
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'file_upload_notification',
                bookingId: bookingData.bookingId,
                quotationNumber: bookingData.quotationNumber,
                customerName: bookingData.customerName,
                customerEmail: bookingData.customerEmail,
                fileUrl,
                items: bookingData.items
            })
        });
        console.log('✅ File upload notification sent');
    } catch (error) {
        console.error('❌ Error sending file notification:', error);
    }
}

async function sendToPublicationEmail(data) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
        throw new Error('Email service not configured');
    }
    await fetch(APPS_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'send_to_publication',
            toEmail: data.toEmail,
            subject: data.subject,
            body: data.body,
            quotationNumber: data.quotationNumber,
            attachmentBase64: data.attachmentBase64,
            attachmentName: data.attachmentName,
            attachmentMimeType: data.attachmentMimeType
        })
    });
    console.log('✅ Publication email dispatched');
}

async function sendManualQuotationEmail(data) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('⚠️ Apps Script URL not configured');
        return;
    }
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send_manual_quotation',
                quotationNumber: data.quotationNumber,
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone || '',
                customerCompany: data.customerCompany || '',
                items: data.items,
                subtotal: data.subtotal,
                commission: data.commission || 0,
                vat: data.vat || 0,
                serviceCharge: data.serviceCharge || 0,
                promoCode: data.promoCode || '',
                promoDiscount: data.promoDiscount || 0,
                total: data.total,
                pdfUrl: data.pdfUrl || '',
                notes: data.notes || ''
            })
        });
        console.log('✅ Manual quotation email sent via Apps Script');
    } catch (e) {
        console.error('❌ Failed to send manual quotation email:', e);
        throw e;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateBookingId() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BOOK-${y}${m}${day}-${r}`;
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.saveBookingToFirebase = saveBookingToFirebase;
window.saveInvoiceToFirebase = saveInvoiceToFirebase;
window.uploadAdFileToFirebase = uploadAdFileToFirebase;
window.getUserBookings = getUserBookings;
window.loadNewspapersFromFirebase = loadNewspapersFromFirebase;
window.loadNewspaperLogos = loadNewspaperLogos;
window.sendBookingEmails = sendBookingEmails;
window.sendInvoiceEmail = sendInvoiceEmail;
window.sendFileUploadNotification = sendFileUploadNotification;
window.sendManualQuotationEmail = sendManualQuotationEmail;
window.apiRequest = apiRequest;

console.log('✅ AdSpot Media database operations loaded (Railway PostgreSQL)');
