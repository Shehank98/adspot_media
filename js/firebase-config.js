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
    apiKey: "AIzaSyC-3O50ecypPkYwp6bOt8qfjegvBjDmQpQ",
    authDomain: "adspot-b44ef.firebaseapp.com",
    projectId: "adspot-b44ef",
    storageBucket: "adspot-b44ef.firebasestorage.app",
    messagingSenderId: "810904997217",
    appId: "1:810904997217:web:3a85856521cac0177dc920"
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

// Export for global access (both naming conventions for compatibility)
window.auth = auth;
window.db = db;
window.storage = storage;
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseStorage = storage;

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
window.googleProvider = googleProvider;

console.log('🔧 Firebase services initialized');
