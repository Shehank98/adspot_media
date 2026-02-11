# Firebase Storage Setup Guide for AdSpot Media

## Overview
Your system stores two types of files in Firebase Storage:
1. **Ad Artworks** - Customer uploaded files (images, PDFs) at `ad-artworks/YYYY/MM/DD/{quotationId}/`
2. **Invoices** - Generated invoice PDFs at `invoices/{invoiceNumber}.pdf`

---

## Step 1: Enable Firebase Storage

1. Go to **Firebase Console**: https://console.firebase.google.com
2. Select your project: `adspot-b44ef`
3. Click **Storage** in the left sidebar
4. Click **Get Started** (if not already enabled)
5. Choose **Start in production mode** or **Test mode** (we'll configure rules next)
6. Select your storage location: **asia-south1 (Mumbai)** (recommended for Sri Lanka)
7. Click **Done**

Your storage bucket will be: `adspot-b44ef.appspot.com`

---

## Step 2: Configure Storage Security Rules

### Recommended Rules for Production

Go to **Storage** → **Rules** tab and paste this:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Ad Artworks - Organized by date and quotation
    match /ad-artworks/{year}/{month}/{day}/{quotationId}/{fileName} {
      // Allow authenticated users to upload their own artworks
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024  // Max 10MB
                   && request.resource.contentType.matches('image/.*|application/pdf');

      // Allow authenticated users and admins to read
      allow read: if request.auth != null;
    }

    // Invoices - Generated PDFs
    match /invoices/{invoiceNumber}.pdf {
      // Only allow writes from authenticated users (admin/system)
      allow write: if request.auth != null;

      // Allow read for authenticated users
      allow read: if request.auth != null;

      // Optional: Allow public read for specific invoices via signed URLs
      // (PDFs can be shared via email with download links)
    }

    // Deny all other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### For Testing/Development (Less Restrictive)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow all authenticated users to read/write
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Important**: After pasting the rules, click **Publish**

---

## Step 3: Configure CORS (Cross-Origin Resource Sharing)

CORS allows your website to upload files to Firebase Storage from the browser.

### Option A: Using Google Cloud SDK (Recommended)

1. **Install Google Cloud SDK**:
   ```bash
   # For Linux/macOS:
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **Login and set project**:
   ```bash
   gcloud init
   # Follow prompts to login and select project: adspot-b44ef
   ```

3. **Apply CORS configuration**:
   ```bash
   cd /home/user/adspot_media
   gsutil cors set cors.json gs://adspot-b44ef.appspot.com
   ```

4. **Verify**:
   ```bash
   gsutil cors get gs://adspot-b44ef.appspot.com
   ```

### Option B: Using Firebase Console (Alternative)

If you can't use Google Cloud SDK:

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Select project: `adspot-b44ef`
3. Go to **Cloud Storage** → **Browser**
4. Click your bucket: `adspot-b44ef.appspot.com`
5. Click **Configuration** tab
6. Under **CORS configuration**, click **Edit**
7. Paste the contents of your `cors.json` file
8. Click **Save**

---

## Step 4: Test the Setup

### Test 1: Upload Ad Artwork

1. Go to your booking page: https://adspotmedia.lk/book.html
2. **Login** with a test account
3. Configure a box ad
4. Select a newspaper
5. **Upload a test image** (PNG, JPG, or PDF under 10MB)
6. Check the console - you should see:
   ```
   ✅ File uploaded successfully: https://firebasestorage.googleapis.com/...
   ```

### Test 2: Generate Invoice PDF

1. Complete a test booking
2. Go to **Admin Bookings**: https://adspotmedia.lk/admin-bookings.html
3. Mark a booking as paid
4. Invoice should generate with no errors
5. Check console for:
   ```
   ✅ Invoice PDF uploaded to Firebase Storage: https://firebasestorage.googleapis.com/...
   ```

---

## Step 5: Monitor Storage Usage

### Check Usage:

1. Go to **Firebase Console** → **Storage**
2. Click **Usage** tab
3. Monitor:
   - **Stored data**: Total files size
   - **Downloads**: Bandwidth used
   - **Uploads**: Number of files uploaded

### Free Tier Limits:
- **Storage**: 5 GB
- **Downloads**: 1 GB/day
- **Uploads**: 20,000/day

### Pricing (if you exceed free tier):
- **Storage**: $0.026/GB/month
- **Downloads**: $0.12/GB
- **Uploads**: Free

---

## Folder Structure

Your Firebase Storage will look like this:

```
📦 adspot-b44ef.appspot.com
├── 📁 ad-artworks/
│   ├── 📁 2026/
│   │   ├── 📁 02/          (February)
│   │   │   ├── 📁 11/      (11th day)
│   │   │   │   ├── 📁 QT-20260211-1667/
│   │   │   │   │   ├── 1739298745123_my-ad-design.png
│   │   │   │   │   └── 1739298756789_logo.pdf
│   │   │   │   └── 📁 QT-20260211-1668/
│   │   │   └── 📁 12/
│   │   └── 📁 03/
│   └── 📁 2027/
└── 📁 invoices/
    ├── INV-202602-4171.pdf
    ├── INV-202602-4172.pdf
    └── INV-202602-4173.pdf
```

**Benefits of this structure**:
- ✅ Easy to find files by date
- ✅ Organized by quotation number
- ✅ Prevents conflicts with unique timestamps
- ✅ Easy to backup/archive old months

---

## Troubleshooting

### Issue 1: "Permission Denied" when uploading

**Cause**: User not authenticated or storage rules too restrictive

**Fix**:
1. Make sure user is logged in: Check `firebase.auth().currentUser`
2. Verify storage rules allow write access for authenticated users
3. Check browser console for auth errors

### Issue 2: CORS Errors

**Error**: `Access to XMLHttpRequest has been blocked by CORS policy`

**Fix**:
1. Apply CORS configuration (see Step 3)
2. Clear browser cache: `Ctrl+Shift+R`
3. Verify your domain is in `cors.json`

### Issue 3: "File too large"

**Error**: `storage/quota-exceeded` or size validation error

**Fix**:
1. Check storage rules - max size is 10MB: `request.resource.size < 10 * 1024 * 1024`
2. Check Firebase quota in console
3. Compress images before upload

### Issue 4: Files not showing in Firebase Console

**Cause**: Files uploaded but not visible

**Fix**:
1. Refresh Firebase Console Storage page
2. Check the correct folder path
3. Verify upload was successful (check console logs)

---

## Security Best Practices

### 1. Always Require Authentication
```javascript
allow read, write: if request.auth != null;
```

### 2. Validate File Types
```javascript
allow write: if request.resource.contentType.matches('image/.*|application/pdf');
```

### 3. Limit File Size
```javascript
allow write: if request.resource.size < 10 * 1024 * 1024; // 10MB max
```

### 4. Use Organized Paths
```javascript
// Good: ad-artworks/2026/02/11/QT-123/file.png
// Bad: uploads/file.png
```

### 5. Delete Old Files
Set up a Cloud Function to delete files older than 90 days:
```javascript
// Delete artworks older than 90 days (optional)
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.cleanupOldArtworks = functions.pubsub
  .schedule('every 7 days')
  .onRun(async (context) => {
    const bucket = admin.storage().bucket();
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    const [files] = await bucket.getFiles({
      prefix: 'ad-artworks/'
    });

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      if (new Date(metadata.timeCreated) < ninetyDaysAgo) {
        await file.delete();
        console.log(`Deleted old file: ${file.name}`);
      }
    }
  });
```

---

## Need Help?

If you encounter issues:

1. **Check Firebase Console** → Storage → Usage (ensure not exceeded)
2. **Check Authentication** → Users (ensure users can login)
3. **Test in incognito mode** (rules out cache issues)
4. **Check browser console** for detailed error messages
5. **Contact Firebase Support** with project ID: `adspot-b44ef`

---

## Quick Reference

| Item | Value |
|------|-------|
| Project ID | `adspot-b44ef` |
| Storage Bucket | `adspot-b44ef.appspot.com` |
| Artwork Path | `ad-artworks/{year}/{month}/{day}/{quotationId}/` |
| Invoice Path | `invoices/{invoiceNumber}.pdf` |
| Max File Size | 10 MB |
| Allowed Types | Images (PNG, JPG) and PDF |
| Region | asia-south1 (Mumbai) |

---

## Summary Checklist

- [ ] Firebase Storage enabled in console
- [ ] Security rules configured and published
- [ ] CORS configuration applied
- [ ] Test artwork upload works
- [ ] Test invoice generation works
- [ ] Monitor storage usage
- [ ] Set up billing alerts (optional)

Your Firebase Storage is now ready for production! 🎉
