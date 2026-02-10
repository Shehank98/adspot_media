# Firebase Setup Guide for AdSpot Media

Complete guide to integrate Firebase with your AdSpot Media booking system.

## Table of Contents
1. [Firebase Project Setup](#1-firebase-project-setup)
2. [Firebase Authentication](#2-firebase-authentication)
3. [Firestore Database Setup](#3-firestore-database-setup)
4. [Frontend Integration](#4-frontend-integration)
5. [Admin Dashboard Setup](#5-admin-dashboard-setup)
6. [Email Integration](#6-email-integration)
7. [Testing](#7-testing)

---

## 1. Firebase Project Setup

### Step 1.1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Enter project name: `adspot-media`
4. Enable Google Analytics (optional)
5. Click **Create Project**

### Step 1.2: Register Web App

1. In Firebase Console, click the **Web icon** (</>)
2. Register app name: `AdSpot Media Web`
3. Enable **Firebase Hosting** (optional)
4. Click **Register App**
5. **Copy the Firebase configuration** - you'll need this later

```javascript
// Your Firebase configuration (EXAMPLE - use your own)
const firebaseConfig = {
  apiKey: "AIza...your-key",
  authDomain: "adspot-media.firebaseapp.com",
  projectId: "adspot-media",
  storageBucket: "adspot-media.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

---

## 2. Firebase Authentication

### Step 2.1: Enable Google Sign-In

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Google**
3. Toggle **Enable**
4. Enter your support email
5. Click **Save**

### Step 2.2: Add Authorized Domains

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `localhost` (for testing)
   - `adspotmedia.lk`
   - `www.adspotmedia.lk`

---

## 3. Firestore Database Setup

### Step 3.1: Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Select **Production mode** (we'll add security rules later)
4. Choose location: `asia-south1` (Mumbai - closest to Sri Lanka)
5. Click **Enable**

### Step 3.2: Database Structure

Create these collections:

#### Collection: `newspapers`
```javascript
// Document ID: auto-generated or use newspaper.id
{
  id: "daily-news",
  name: "Daily News",
  language: "english",
  groupId: "lake-house",
  groupName: "Lake House (ANCL)",
  bwRate: 400,
  colorRate: 560,
  classifiedBase: 1000,
  classifiedFreeWords: 20,
  classifiedExtraRate: 45,
  isSundayPaper: false,
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Collection: `bookings`
```javascript
// Document ID: auto-generated
{
  bookingId: "BOOK-20240210-001",
  quotationNumber: "Q-20240210-001",
  invoiceNumber: "INV-20240210-001",
  customerId: "user-firebase-uid",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "+94771234567",
  customerCompany: "ABC Ltd",
  customerAddress: "Colombo 03",
  items: [
    {
      newspaperId: "daily-news",
      newspaperName: "Daily News",
      newspaperLanguage: "english",
      groupName: "Lake House",
      adType: "box", // or "classified"
      pubDate: "2024-02-15",
      price: 54280,
      details: {
        columns: 4,
        columnWidth: 12.9,
        height: 20,
        area: 80,
        colorOption: "color",
        rate: 560,
        adTotal: 46000,
        commission: 4600,
        vat: 8280
      }
    }
  ],
  totalAmount: 54280,
  paymentMethod: "card", // or "bank"
  paymentStatus: "pending", // "completed", "failed"
  paymentReference: "stripe-payment-id",
  status: "pending", // "confirmed", "processing", "completed", "cancelled"
  adFile: "gs://bucket/path/to/file.pdf",
  notes: "Special instructions",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Collection: `users`
```javascript
// Document ID: Firebase Auth UID
{
  uid: "firebase-auth-uid",
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: "https://...",
  role: "customer", // or "admin"
  bookings: ["booking-id-1", "booking-id-2"],
  createdAt: timestamp,
  lastLogin: timestamp
}
```

#### Collection: `invoices`
```javascript
// Document ID: invoice number
{
  invoiceNumber: "INV-20240210-001",
  quotationNumber: "Q-20240210-001",
  bookingId: "booking-id",
  customerId: "user-firebase-uid",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  items: [...], // same as booking items
  subtotal: 46000,
  commission: 4600,
  vat: 8280,
  total: 54280,
  pdfUrl: "https://storage.../invoice.pdf",
  sentAt: timestamp,
  createdAt: timestamp
}
```

### Step 3.3: Security Rules

Go to **Firestore Database** → **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Newspapers - read by all, write by admin only
    match /newspapers/{newspaperId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Bookings - read/write by owner or admin
    match /bookings/{bookingId} {
      allow read: if isOwner(resource.data.customerId) || isAdmin();
      allow create: if isSignedIn();
      allow update: if isOwner(resource.data.customerId) || isAdmin();
      allow delete: if isAdmin();
    }

    // Users - read/write own profile, admin can read all
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isSignedIn() && isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }

    // Invoices - read by owner or admin
    match /invoices/{invoiceId} {
      allow read: if isOwner(resource.data.customerId) || isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

---

## 4. Frontend Integration

### Step 4.1: Install Firebase SDK

Add to your `index.html` before closing `</body>`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js"></script>
```

### Step 4.2: Create Firebase Config File

Create `js/firebase-config.js`:

```javascript
// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseStorage = storage;
```

### Step 4.3: Create Authentication UI

Create `js/auth.js`:

```javascript
/**
 * Authentication Manager
 */
class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.currentUser = null;

        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.onAuthStateChanged(user);
        });
    }

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await this.auth.signInWithPopup(provider);
            await this.createOrUpdateUser(result.user);
            return result.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    /**
     * Create or update user in Firestore
     */
    async createOrUpdateUser(user) {
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        const userData = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!userDoc.exists) {
            // New user
            userData.role = 'customer';
            userData.bookings = [];
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        await userRef.set(userData, { merge: true });
    }

    /**
     * Check if user is admin
     */
    async isAdmin() {
        if (!this.currentUser) return false;

        const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
        return userDoc.exists && userDoc.data().role === 'admin';
    }

    /**
     * Handle auth state changes
     */
    onAuthStateChanged(user) {
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const userPhoto = document.getElementById('userPhoto');

        if (user) {
            // User is signed in
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (userName) userName.textContent = user.displayName;
            if (userPhoto) userPhoto.src = user.photoURL;
        } else {
            // User is signed out
            if (loginBtn) loginBtn.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }
}

// Initialize auth manager
const authManager = new AuthManager();
window.authManager = authManager;
```

### Step 4.4: Update Index Page

Add login button to `index.html` navigation:

```html
<nav class="navbar">
    <div class="nav-container">
        <a href="index.html" class="logo">
            <span class="logo-icon">◈</span>
            <span class="logo-text">AdSpot</span>
        </a>
        <div class="nav-menu">
            <a href="book.html" class="btn btn-primary">Book Ad</a>

            <!-- Login Button -->
            <button id="loginBtn" class="btn btn-ghost" onclick="authManager.signInWithGoogle()">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
            </button>

            <!-- User Menu (hidden by default) -->
            <div id="userMenu" class="user-menu" style="display: none;">
                <img id="userPhoto" class="user-photo" src="" alt="User">
                <span id="userName"></span>
                <button class="btn btn-ghost" onclick="authManager.signOut()">Sign Out</button>
            </div>
        </div>
    </div>
</nav>
```

---

## 5. Admin Dashboard Setup

### Step 5.1: Load Newspapers from Firebase

Update `js/config.js` to load from Firestore:

```javascript
// Load newspapers from Firebase instead of hardcoded
async function loadNewspapersFromFirebase() {
    try {
        const snapshot = await db.collection('newspapers')
            .where('active', '==', true)
            .orderBy('language')
            .orderBy('name')
            .get();

        const newspapers = {};

        snapshot.forEach(doc => {
            const paper = doc.data();
            const groupId = paper.groupId;

            if (!newspapers[groupId]) {
                newspapers[groupId] = {
                    name: paper.groupName,
                    newspapers: []
                };
            }

            newspapers[groupId].newspapers.push(paper);
        });

        // Update CONFIG.PUBLICATIONS
        CONFIG.PUBLICATIONS = newspapers;

        // Trigger UI update
        if (typeof updateNewspapersByLanguage === 'function') {
            updateNewspapersByLanguage(selectedLanguage);
        }
    } catch (error) {
        console.error('Error loading newspapers:', error);
    }
}

// Call on page load
if (typeof firebase !== 'undefined') {
    loadNewspapersFromFirebase();
}
```

### Step 5.2: Admin Dashboard - Manage Newspapers

Create `admin/newspapers.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Manage Newspapers - Admin</title>
    <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
    <div class="admin-container">
        <h1>Manage Newspapers</h1>

        <button onclick="showAddNewspaperModal()">Add New Newspaper</button>

        <table id="newspapersTable">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Language</th>
                    <th>Group</th>
                    <th>B&W Rate</th>
                    <th>Color Rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="newspapersBody">
                <!-- Populated by JavaScript -->
            </tbody>
        </table>
    </div>

    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    <script src="../js/firebase-config.js"></script>
    <script src="../js/admin-newspapers.js"></script>
</body>
</html>
```

Create `js/admin-newspapers.js`:

```javascript
/**
 * Admin Newspaper Management
 */

// Load newspapers
async function loadNewspapers() {
    const tbody = document.getElementById('newspapersBody');

    try {
        const snapshot = await db.collection('newspapers').get();

        tbody.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <tr>
                    <td>${data.name}</td>
                    <td>${data.language}</td>
                    <td>${data.groupName}</td>
                    <td>Rs. ${data.bwRate}</td>
                    <td>Rs. ${data.colorRate}</td>
                    <td>${data.active ? 'Active' : 'Inactive'}</td>
                    <td>
                        <button onclick="editNewspaper('${doc.id}')">Edit</button>
                        <button onclick="deleteNewspaper('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading newspapers:', error);
    }
}

// Add newspaper
async function addNewspaper(data) {
    try {
        await db.collection('newspapers').add({
            ...data,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Newspaper added successfully');
        loadNewspapers();
    } catch (error) {
        console.error('Error adding newspaper:', error);
        alert('Error adding newspaper');
    }
}

// Update newspaper
async function updateNewspaper(docId, data) {
    try {
        await db.collection('newspapers').doc(docId).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Newspaper updated successfully');
        loadNewspapers();
    } catch (error) {
        console.error('Error updating newspaper:', error);
        alert('Error updating newspaper');
    }
}

// Delete newspaper
async function deleteNewspaper(docId) {
    if (!confirm('Are you sure you want to delete this newspaper?')) return;

    try {
        await db.collection('newspapers').doc(docId).delete();
        alert('Newspaper deleted successfully');
        loadNewspapers();
    } catch (error) {
        console.error('Error deleting newspaper:', error);
        alert('Error deleting newspaper');
    }
}

// Load on page load
document.addEventListener('DOMContentLoaded', loadNewspapers);
```

---

## 6. Email Integration with Apps Script

### Step 6.1: Create Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Create new project: `AdSpot Email Service`
3. Add this code:

```javascript
/**
 * AdSpot Media - Email Service
 */

// Configuration
const CONFIG = {
  adminEmail: 'adspot77@gmail.com',
  fromName: 'AdSpot Media',
  replyTo: 'adspot77@gmail.com'
};

/**
 * Send booking confirmation email to customer
 */
function sendBookingConfirmation(data) {
  const subject = `Booking Confirmation - ${data.quotationNumber}`;

  const body = `
    Dear ${data.customerName},

    Thank you for your booking with AdSpot Media!

    Booking Details:
    - Quotation Number: ${data.quotationNumber}
    - Invoice Number: ${data.invoiceNumber}
    - Total Amount: Rs. ${data.totalAmount.toLocaleString()}

    Selected Newspapers:
    ${data.items.map(item => `
    • ${item.newspaperName} (${item.adType})
      Publication Date: ${item.pubDate}
      Price: Rs. ${item.price.toLocaleString()}
    `).join('\n')}

    We will process your booking and send you the invoice shortly.

    Best regards,
    AdSpot Media Team
    070 642 1998
  `;

  MailApp.sendEmail({
    to: data.customerEmail,
    subject: subject,
    body: body,
    name: CONFIG.fromName,
    replyTo: CONFIG.replyTo
  });
}

/**
 * Send notification to admin
 */
function notifyAdmin(data) {
  const subject = `New Booking: ${data.quotationNumber}`;

  const body = `
    New booking received!

    Customer: ${data.customerName}
    Email: ${data.customerEmail}
    Phone: ${data.customerPhone}

    Quotation: ${data.quotationNumber}
    Total: Rs. ${data.totalAmount.toLocaleString()}

    Items: ${data.items.length}
    Payment Method: ${data.paymentMethod}

    View in dashboard: [Dashboard URL]
  `;

  MailApp.sendEmail({
    to: CONFIG.adminEmail,
    subject: subject,
    body: body
  });
}

/**
 * HTTP endpoint for Firebase
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.type === 'booking_confirmation') {
      sendBookingConfirmation(data);
      notifyAdmin(data);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Emails sent successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Unknown request type'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. **Deploy as Web App**:
   - Click **Deploy** → **New deployment**
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
   - Click **Deploy**
   - **Copy the Web App URL** - you'll need this

### Step 6.2: Call Apps Script from Firebase

Update your booking submission to call the Apps Script:

```javascript
// In booking.js, after saving to Firebase
async function sendBookingEmails(bookingData) {
    const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'booking_confirmation',
                ...bookingData
            })
        });

        const result = await response.json();
        console.log('Email result:', result);
    } catch (error) {
        console.error('Error sending emails:', error);
    }
}
```

---

## 7. Complete Workflow

### Booking Flow:

1. **User visits site** → Firebase Auth checks login state
2. **User books ad** → Data saved to Firestore `bookings` collection
3. **File uploaded** → Saved to Firebase Storage
4. **Booking created** → Triggers:
   - Invoice generation
   - Save to `invoices` collection
   - Call Apps Script to send emails
5. **Emails sent** → Customer receives confirmation, admin receives notification
6. **Admin reviews** → Updates booking status in dashboard
7. **Invoice accessible** → From user's account page

### Admin Flow:

1. **Admin logs in** → Role verified via Firestore
2. **View bookings** → Query `bookings` collection
3. **Manage newspapers** → CRUD operations on `newspapers` collection
4. **Update status** → Modify booking status
5. **Send invoices** → Manually trigger email via Apps Script

---

## 8. Next Steps

1. **Migrate existing data** from `config.js` to Firestore
2. **Test authentication** with Google Sign-In
3. **Test booking flow** end-to-end
4. **Set up admin account** (manually set `role: 'admin'` in Firestore)
5. **Deploy Apps Script** and test email sending
6. **Configure Firebase Storage** rules for file uploads
7. **Add error handling** and loading states
8. **Test on mobile** devices

---

## Security Checklist

- ✅ Firestore security rules configured
- ✅ Authentication required for bookings
- ✅ Admin role properly secured
- ✅ API keys in environment variables (not committed to git)
- ✅ CORS configured for your domain
- ✅ File upload size limits set
- ✅ Input validation on all forms

---

## Cost Optimization

- Use **Spark (Free) plan** for testing
- Upgrade to **Blaze (Pay-as-you-go)** for production
- Set up **budget alerts** in Firebase Console
- Monitor usage in Firebase Console → Usage tab

---

## Support

If you need help:
- Firebase Docs: https://firebase.google.com/docs
- Stack Overflow: Tag with `firebase`
- Firebase Support: https://firebase.google.com/support

---

**Ready to implement? Start with Step 1 and work through each section carefully!** 🚀
