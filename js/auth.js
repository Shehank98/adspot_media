/**
 * Authentication Manager for AdSpot Media
 * Handles user authentication with Firebase
 */

class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.currentUser = null;
        this.userRole = null;

        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            this.handleAuthStateChange(user);
        });
    }

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            const result = await this.auth.signInWithPopup(googleProvider);
            const user = result.user;

            // Create or update user document
            await this.createOrUpdateUser(user);

            console.log('✅ Sign in successful:', user.displayName);
            return user;
        } catch (error) {
            console.error('❌ Sign in error:', error);
            this.showNotification('Sign in failed. Please try again.', 'error');
            throw error;
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            await this.auth.signOut();
            console.log('✅ Sign out successful');
            this.showNotification('Signed out successfully', 'success');
        } catch (error) {
            console.error('❌ Sign out error:', error);
            this.showNotification('Sign out failed', 'error');
            throw error;
        }
    }

    /**
     * Create or update user document in Firestore
     */
    async createOrUpdateUser(user) {
        const userRef = this.db.collection('users').doc(user.uid);

        try {
            const userDoc = await userRef.get();

            const userData = {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!userDoc.exists) {
                // New user - set default role
                userData.role = 'customer';
                userData.bookings = [];
                userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                console.log('📝 Creating new user document');
            }

            await userRef.set(userData, { merge: true });
            console.log('✅ User document updated');

            // Get user role
            const updated = await userRef.get();
            this.userRole = updated.data().role;
        } catch (error) {
            console.error('❌ Error creating/updating user:', error);
        }
    }

    /**
     * Check if user is admin
     */
    async isAdmin() {
        if (!this.currentUser) return false;

        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            return userDoc.exists && userDoc.data().role === 'admin';
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    /**
     * Handle auth state changes
     */
    async handleAuthStateChange(user) {
        this.currentUser = user;

        if (user) {
            // User is signed in
            console.log('👤 User signed in:', user.displayName);

            // Get user role
            try {
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    this.userRole = userDoc.data().role;
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
            }

            this.showUserUI(user);
        } else {
            // User is signed out
            console.log('👤 User signed out');
            this.userRole = null;
            this.showLoginUI();
        }
    }

    /**
     * Show user UI (when logged in)
     */
    showUserUI(user) {
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const userPhoto = document.getElementById('userPhoto');
        const adminDashLink = document.getElementById('adminDashLink');

        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            if (userName) userName.textContent = user.displayName || user.email;
            if (userPhoto) userPhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName);
        }

        // Show admin link if user is admin
        if (this.userRole === 'admin' && adminDashLink) {
            adminDashLink.style.display = 'flex';
        }
    }

    /**
     * Show login UI (when logged out)
     */
    showLoginUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('userMenu');
        const adminDashLink = document.getElementById('adminDashLink');

        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (userMenu) userMenu.style.display = 'none';
        if (adminDashLink) adminDashLink.style.display = 'none';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.auth-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `auth-notification auth-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 3000);
    }
}

// Initialize AuthManager
let authManager;

// Wait for Firebase to be ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        authManager = new AuthManager();
        window.authManager = authManager;

        // Set up event listeners
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => authManager.signInWithGoogle());
        }

        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => authManager.signOut());
        }

        // User dropdown toggle
        const userToggle = document.getElementById('userToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (userToggle && dropdownMenu) {
            userToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdownMenu.classList.remove('show');
            });
        }

        console.log('✅ Auth Manager initialized');
    }, 100);
});
