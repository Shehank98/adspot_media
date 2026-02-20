# Firebase Storage CORS Configuration Guide

## Problem
You're experiencing CORS errors when uploading invoice PDFs to Firebase Storage:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'https://adspotmedia.lk'
has been blocked by CORS policy
```

## Solution

### Method 1: Using Google Cloud Console (Recommended)

1. **Install Google Cloud SDK** (if not already installed):
   ```bash
   # For Linux/macOS:
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL

   # Initialize and login
   gcloud init
   ```

2. **Apply CORS configuration**:
   ```bash
   # Navigate to your project directory
   cd /home/user/adspot_media

   # Apply the CORS configuration
   gsutil cors set cors.json gs://adspot-b44ef.appspot.com
   ```

3. **Verify CORS configuration**:
   ```bash
   gsutil cors get gs://adspot-b44ef.appspot.com
   ```

### Method 2: Using Firebase Console (Alternative)

If you don't have access to Google Cloud SDK:

1. Go to **Firebase Console** → https://console.firebase.google.com
2. Select your project: `adspot-b44ef`
3. Go to **Storage** in the left sidebar
4. Click on **Rules** tab
5. Update your storage rules to allow CORS:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow authenticated users to upload
      allow read, write: if request.auth != null;

      // Allow public read for invoices
      allow read: if resource.contentType.matches('application/pdf') &&
                     request.path.matches('invoices/.*');
    }
  }
}
```

6. Click **Publish**

### Method 3: Using Google Cloud Console Web Interface

1. Go to **Google Cloud Console** → https://console.cloud.google.com
2. Select project: `adspot-b44ef`
3. Navigate to **Cloud Storage** → **Browser**
4. Click on your bucket: `adspot-b44ef.appspot.com`
5. Click **Permissions** tab
6. Click **+ ADD PRINCIPAL**
7. Add: `allUsers`
8. Role: `Storage Object Viewer` (for read access)

## Testing

After applying CORS configuration, test invoice generation:

1. Go to **Admin Bookings**: https://adspotmedia.lk/admin-bookings.html
2. Find a bank transfer booking
3. Click **Mark as Paid**
4. The invoice should generate without CORS errors
5. Check browser console for: `✅ Invoice PDF uploaded to Firebase Storage`

## Troubleshooting

### If CORS still fails:

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R)

2. **Check Firebase Storage Rules**:
   - Ensure authenticated users can write to `/invoices/` path

3. **Verify the bucket name**:
   - Your storage bucket: `adspot-b44ef.appspot.com`
   - Check in Firebase Console → Storage

4. **Check network tab**:
   - Open DevTools → Network
   - Filter for `firebasestorage.googleapis.com`
   - Look for failed PUT requests
   - Check response headers for CORS info

### Alternative: Use Cloud Functions

If CORS continues to be an issue, consider uploading PDFs via Cloud Functions instead:

```javascript
// This bypasses CORS by uploading from server-side
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.uploadInvoice = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  // Upload PDF blob to Storage
  const bucket = admin.storage().bucket();
  const file = bucket.file(`invoices/${data.invoiceNumber}.pdf`);

  await file.save(data.pdfData, {
    contentType: 'application/pdf'
  });

  const downloadURL = await file.getSignedUrl({
    action: 'read',
    expires: '01-01-2030'
  });

  return { url: downloadURL };
});
```

## Current Configuration

Your `cors.json` file allows:
- ✅ Your production domain: `https://adspotmedia.lk`
- ✅ Local development: `localhost` and `127.0.0.1`
- ✅ All required HTTP methods: GET, PUT, POST, DELETE, HEAD
- ✅ Response headers for CORS

## Need Help?

If you continue experiencing issues:
1. Check Firebase Console → Storage → Usage (ensure you haven't exceeded quota)
2. Verify Firebase Authentication is working
3. Test with a different browser
4. Contact Firebase Support with your project ID: `adspot-b44ef`
