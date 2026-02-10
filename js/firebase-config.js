/**
 * Firebase Configuration
 *
 * IMPORTANT: Replace these values with your actual Firebase project credentials
 *
 * To get these values:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Select your project
 * 3. Go to Project Settings (gear icon)
 * 4. Scroll down to "Your apps" section
 * 5. Click on the web app (</>)
 * 6. Copy the firebaseConfig object
 */

const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Export for global access
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseStorage = storage;

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
window.googleProvider = googleProvider;

console.log('🔧 Firebase services initialized');
