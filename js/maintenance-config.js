/**
 * Maintenance Mode Configuration
 *
 * EASY TOGGLE: Change maintenanceMode to true/false
 *
 * HOW TO USE:
 * 1. Set maintenanceMode = true to enable maintenance
 * 2. Commit and push to GitHub
 * 3. Site shows maintenance page to all visitors
 * 4. Admin can access using password: adspot2026
 *
 * TO DISABLE:
 * 1. Set maintenanceMode = false
 * 2. Commit and push
 * 3. Site is back online for everyone
 */

const MaintenanceConfig = {
    // ⚠️ TOGGLE MAINTENANCE MODE HERE ⚠️
    maintenanceMode: false, // Set to true to enable maintenance

    // Admin access password (change this!)
    adminPassword: 'adspot2026',

    // Maintenance message settings
    estimatedDuration: 2, // Hours
    message: 'We\'re currently performing scheduled maintenance to improve your experience.',

    // Pages that should always be accessible (even during maintenance)
    allowedPages: [
        '/maintenance.html',
        '/maintenance',
    ],

    // Check if current page should show maintenance
    shouldShowMaintenance() {
        // If maintenance is off, never show it
        if (!this.maintenanceMode) {
            return false;
        }

        // Check if admin access is granted
        if (localStorage.getItem('admin_access') === 'true') {
            return false;
        }

        // Check if current page is in allowed list
        const currentPath = window.location.pathname;
        if (this.allowedPages.some(page => currentPath.includes(page))) {
            return false;
        }

        // Show maintenance page
        return true;
    },

    // Redirect to maintenance page
    redirectToMaintenance() {
        if (window.location.pathname !== '/maintenance.html' &&
            window.location.pathname !== '/maintenance') {
            window.location.href = '/maintenance.html';
        }
    },

    // Clear admin access (for testing)
    clearAdminAccess() {
        localStorage.removeItem('admin_access');
    }
};

// Export for use in other scripts
window.MaintenanceConfig = MaintenanceConfig;

console.log('🔧 Maintenance Config Loaded - Mode:', MaintenanceConfig.maintenanceMode ? 'ON' : 'OFF');
