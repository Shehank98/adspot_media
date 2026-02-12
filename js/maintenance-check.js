/**
 * Automatic Maintenance Mode Checker
 *
 * This script runs on EVERY page and checks if maintenance mode is enabled.
 * If enabled, it redirects to maintenance page (unless admin access is granted).
 *
 * HOW IT WORKS:
 * 1. Loads maintenance-config.js
 * 2. Checks if maintenanceMode = true
 * 3. Checks if user has admin access
 * 4. Redirects to maintenance page if needed
 *
 * ADMIN ACCESS:
 * - Go to any page
 * - Click the 🔑 icon (bottom right)
 * - Enter password: adspot2026
 * - You can now browse the site normally
 */

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkMaintenance);
    } else {
        checkMaintenance();
    }

    function checkMaintenance() {
        // Wait for config to load
        if (typeof MaintenanceConfig === 'undefined') {
            console.warn('⚠️ Maintenance config not loaded yet, retrying...');
            setTimeout(checkMaintenance, 100);
            return;
        }

        // Check if we should show maintenance page
        if (MaintenanceConfig.shouldShowMaintenance()) {
            console.log('🔧 Maintenance mode is ACTIVE - Redirecting...');
            MaintenanceConfig.redirectToMaintenance();
        } else {
            console.log('✅ Maintenance mode is OFF or Admin access granted');

            // Add admin indicator if admin is logged in
            if (localStorage.getItem('admin_access') === 'true') {
                addAdminIndicator();
            }
        }
    }

    // Add visual indicator that admin is logged in
    function addAdminIndicator() {
        // Only add if not on maintenance page
        if (window.location.pathname.includes('maintenance')) {
            return;
        }

        const indicator = document.createElement('div');
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(16, 185, 129, 0.95);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                z-index: 10000;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <span>🔓</span>
                <span>Admin Mode</span>
                <button onclick="logoutAdmin()" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    margin-left: 8px;
                ">Logout</button>
            </div>
        `;

        document.body.appendChild(indicator.firstElementChild);
    }

    // Global function to logout admin
    window.logoutAdmin = function() {
        if (confirm('Logout from admin mode?')) {
            localStorage.removeItem('admin_access');
            alert('✅ Logged out from admin mode');
            window.location.reload();
        }
    };
})();
