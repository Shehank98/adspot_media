/**
 * Firebase Database Operations for AdSpot Media
 * Handles all Firestore database interactions
 */

/**
 * Apps Script Configuration
 * Replace this URL with your deployed Google Apps Script web app URL
 */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqC7dhbLgOB9PjLuMFHBwn2uyTVQyJnDdt92GwWLC-q-UlJ3mB0a7eWNvwOnyhDxHV/exec';

/**
 * Save booking to Firestore
 */
async function saveBookingToFirebase(bookingData) {
    try {
        const user = firebase.auth().currentUser;
        const isAnonymous = !user;

        const bookingRef = db.collection('bookings').doc();

        const booking = {
            bookingId: generateBookingId(),
            quotationNumber: bookingData.quotationNumber,
            invoiceNumber: bookingData.invoiceNumber,
            customerId: user ? user.uid : 'anonymous',
            isAnonymousBooking: isAnonymous,
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            customerPhone: bookingData.customerPhone,
            customerCompany: bookingData.customerCompany || '',
            customerAddress: bookingData.customerAddress || '',
            items: bookingData.items,
            totalAmount: bookingData.totalAmount,
            paymentMethod: bookingData.paymentMethod,
            paymentStatus: bookingData.paymentStatus || 'pending',
            paymentReference: bookingData.paymentReference || '',
            status: 'pending',
            notes: bookingData.notes || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await bookingRef.set(booking);

        // Update user's bookings array (only if logged in)
        if (user) {
            try {
                await db.collection('users').doc(user.uid).update({
                    bookings: firebase.firestore.FieldValue.arrayUnion(bookingRef.id)
                });
            } catch (updateError) {
                console.warn('Could not update user bookings array:', updateError);
                // Continue anyway - booking is saved
            }
        }

        console.log(isAnonymous ? '✅ Anonymous booking saved to Firebase:' : '✅ Booking saved to Firebase:', bookingRef.id);

        // Send emails via Apps Script
        await sendBookingEmails(booking);

        return bookingRef.id;
    } catch (error) {
        console.error('❌ Error saving booking:', error);
        throw error;
    }
}

/**
 * Save invoice to Firestore
 */
async function saveInvoiceToFirebase(invoiceData) {
    try {
        const invoiceRef = db.collection('invoices').doc(invoiceData.invoiceNumber);

        const invoice = {
            invoiceNumber: invoiceData.invoiceNumber,
            quotationNumber: invoiceData.quotationNumber,
            bookingId: invoiceData.bookingId,
            customerId: invoiceData.customerId,
            customerName: invoiceData.customerName,
            customerEmail: invoiceData.customerEmail,
            items: invoiceData.items,
            subtotal: invoiceData.subtotal,
            commission: invoiceData.commission,
            vat: invoiceData.vat,
            total: invoiceData.total,
            pdfUrl: invoiceData.pdfUrl || '',
            sentAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await invoiceRef.set(invoice);
        console.log('✅ Invoice saved to Firebase:', invoiceData.invoiceNumber);

        return invoiceData.invoiceNumber;
    } catch (error) {
        console.error('❌ Error saving invoice:', error);
        throw error;
    }
}

/**
 * Upload ad file to Firebase Storage
 */
/**
 * Upload ad file to Firebase Storage with progress tracking
 * @param {File} file - The file to upload
 * @param {string} bookingId - The booking/quotation ID
 * @param {function} onProgress - Callback for upload progress (percentage)
 * @returns {Promise<string>} - Download URL of uploaded file
 */
async function uploadAdFileToFirebase(file, bookingId, onProgress) {
    return new Promise((resolve, reject) => {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                reject(new Error('User must be logged in'));
                return;
            }

            // Create organized folder structure: ad-artworks/YYYY/MM/DD/quotation-id/filename
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');

            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `ad-artworks/${year}/${month}/${day}/${bookingId}/${fileName}`;
            const storageRef = storage.ref(filePath);

            // Start upload with progress tracking
            const uploadTask = storageRef.put(file);

            // Monitor upload progress
            uploadTask.on('state_changed',
                // Progress callback
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload progress: ${progress.toFixed(1)}%`);

                    // Call progress callback if provided
                    if (typeof onProgress === 'function') {
                        onProgress(progress);
                    }
                },
                // Error callback
                (error) => {
                    console.error('❌ Error uploading file:', error);
                    reject(error);
                },
                // Success callback
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        console.log('✅ File uploaded to Firebase Storage:', downloadURL);
                        console.log('📁 File path:', filePath);
                        resolve(downloadURL);
                    } catch (error) {
                        reject(error);
                    }
                }
            );

        } catch (error) {
            console.error('❌ Error uploading file:', error);
            reject(error);
        }
    });
}

/**
 * Get user's bookings
 */
async function getUserBookings() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User must be logged in');

        const snapshot = await db.collection('bookings')
            .where('customerId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();

        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return bookings;
    } catch (error) {
        console.error('❌ Error fetching bookings:', error);
        throw error;
    }
}

/**
 * Load newspapers from Firestore
 */
async function loadNewspapersFromFirebase() {
    try {
        const snapshot = await db.collection('newspapers')
            .where('active', '==', true)
            .get();

        const newspapers = {};

        snapshot.forEach(doc => {
            const paper = doc.data();

            // Use groupName as groupId if groupId doesn't exist
            const groupId = paper.groupName || paper.groupId || 'default';
            const groupName = paper.groupName || 'Newspapers';

            if (!newspapers[groupId]) {
                newspapers[groupId] = {
                    name: groupName,
                    newspapers: []
                };
            }

            newspapers[groupId].newspapers.push({
                id: doc.id,
                name: paper.name,
                language: paper.language,
                bwRate: paper.bwRate,
                colorRate: paper.colorRate,
                classifiedBase: paper.classifiedBase || 0,
                classifiedFreeWords: paper.classifiedFreeWords || 0,
                classifiedExtraRate: paper.classifiedExtraRate || 0,
                isSundayPaper: paper.isSundayPaper || false,
                groupName: groupName
            });
        });

        // Update CONFIG.PUBLICATIONS
        if (typeof CONFIG !== 'undefined') {
            CONFIG.PUBLICATIONS = newspapers;
            console.log('✅ CONFIG.PUBLICATIONS updated with', Object.keys(newspapers).length, 'groups');
            console.log('📰 Loaded newspapers:', newspapers);
        }

        return newspapers;
    } catch (error) {
        console.error('❌ Error loading newspapers:', error);
        // Return empty object if Firebase isn't set up yet
        return {};
    }
}

/**
 * Load newspaper logos for carousel
 */
async function loadNewspaperLogos() {
    try {
        const snapshot = await db.collection('newspapers')
            .where('active', '==', true)
            .orderBy('name')
            .get();

        const logos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            logos.push({
                name: data.name,
                logo: data.logoUrl || null,
                language: data.language
            });
        });

        console.log('✅ Newspaper logos loaded:', logos.length);
        return logos;
    } catch (error) {
        console.error('❌ Error loading logos:', error);
        // Return default logos if Firebase isn't set up
        return getDefaultNewspaperLogos();
    }
}

/**
 * Get default newspaper logos (fallback)
 */
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

/**
 * Send booking confirmation emails via Apps Script
 * Sends both customer confirmation AND admin notification
 */
async function sendBookingEmails(bookingData) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('⚠️ Apps Script URL not configured. Skipping email sending.');
        return;
    }

    try {
        // Prepare items with all necessary data including ad file URLs
        const items = bookingData.items.map(item => ({
            newspaperName: item.newspaperName,
            adType: item.adType,
            pubDate: item.pubDate,
            price: item.price,
            description: item.description,
            adFileUrl: item.adFileUrl || '',
            details: item.details
        }));

        // 1. Send booking confirmation to CUSTOMER
        const customerEmailResponse = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Apps Script requires no-cors
            headers: {
                'Content-Type': 'application/json'
            },
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
                items: items
            })
        });
        console.log('✅ Customer confirmation email sent');

        // 2. Send admin notification
        const adminEmailResponse = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
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
                items: items
            })
        });
        console.log('✅ Admin notification email sent');

    } catch (error) {
        console.error('❌ Error sending emails:', error);
        // Don't throw error - email failure shouldn't block booking
    }
}

/**
 * Send invoice email to customer via Apps Script
 */
async function sendInvoiceEmail(bookingData, invoiceData) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('⚠️ Apps Script URL not configured. Skipping invoice email.');
        return;
    }

    // Log PDF URL status
    console.log('📄 PDF URL for invoice:', invoiceData.pdfUrl || 'NOT GENERATED');
    if (!invoiceData.pdfUrl) {
        console.warn('⚠️ Warning: Invoice email will be sent without PDF URL. PDF generation may have failed.');
    }

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
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
                paymentStatus: 'completed', // Invoice is sent only when payment is confirmed
                items: bookingData.items.map(item => ({
                    newspaperName: item.newspaperName,
                    adType: item.adType,
                    pubDate: item.pubDate,
                    price: item.price,
                    details: item.details
                }))
            })
        });

        console.log('✅ Invoice email sent to Apps Script');
        console.log('📧 Email includes PDF URL:', invoiceData.pdfUrl ? 'YES (' + invoiceData.pdfUrl + ')' : 'NO');
    } catch (error) {
        console.error('❌ Error sending invoice email:', error);
    }
}

// Payment confirmation email removed - invoice email now includes payment received message

/**
 * Send email with file attachment notification to admin
 */
async function sendFileUploadNotification(bookingData, fileUrl) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('⚠️ Apps Script URL not configured. Skipping file notification.');
        return;
    }

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'file_upload_notification',
                bookingId: bookingData.bookingId,
                quotationNumber: bookingData.quotationNumber,
                customerName: bookingData.customerName,
                customerEmail: bookingData.customerEmail,
                fileUrl: fileUrl,
                items: bookingData.items
            })
        });

        console.log('✅ File upload notification sent to admin');
    } catch (error) {
        console.error('❌ Error sending file notification:', error);
    }
}

/**
 * Generate unique booking ID
 */
function generateBookingId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BOOK-${year}${month}${day}-${random}`;
}

// Export functions for global access
window.saveBookingToFirebase = saveBookingToFirebase;
window.saveInvoiceToFirebase = saveInvoiceToFirebase;
window.uploadAdFileToFirebase = uploadAdFileToFirebase;
window.getUserBookings = getUserBookings;
window.loadNewspapersFromFirebase = loadNewspapersFromFirebase;
window.loadNewspaperLogos = loadNewspaperLogos;
window.sendBookingEmails = sendBookingEmails;
window.sendInvoiceEmail = sendInvoiceEmail;
window.sendFileUploadNotification = sendFileUploadNotification;

console.log('✅ Firebase database operations loaded');
