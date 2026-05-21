/**
 * AdSpot - Admin Dashboard JavaScript
 * Complete management functionality for quotations, payments, publications, and customers
 * Real database integration with Supabase
 */

// State
let currentSection = 'dashboard';
let publicationsData = []; // Store publications for management
let publicationGroups = []; // Store publication groups

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initNavigation();
    initModals();
    initFilters();
    initMobileSidebar();
    initPublicationGroups();
});

// Wait for Supabase to be ready
window.addEventListener('supabaseReady', function() {
    loadDashboardData();
});

/**
 * Check authentication - uses local session
 */
function checkAuth() {
    try {
        const session = JSON.parse(localStorage.getItem('adspot_admin_session') || 'null');

        if (!session || !session.loggedIn) {
            // Not logged in - redirect to login page
            window.location.href = 'index.html';
            return;
        }

        // Display admin email
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl) {
            adminNameEl.textContent = session.email || 'Admin';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        // Redirect to login on error
        window.location.href = 'index.html';
    }
}

/**
 * Initialize publication groups from config
 */
function initPublicationGroups() {
    // Get custom groups from local storage
    const customGroups = JSON.parse(localStorage.getItem('adspot_pub_groups') || '{}');

    // Combine built-in and custom groups
    publicationGroups = [
        ...Object.entries(CONFIG.PUBLICATION_GROUPS || {}).map(([id, group]) => ({
            id,
            ...group,
            isBuiltIn: true
        })),
        ...Object.entries(customGroups).map(([id, group]) => ({
            id,
            ...group,
            isBuiltIn: false
        }))
    ];

    // Flatten all publications (built-in + custom)
    publicationsData = [];
    const customPubs = JSON.parse(localStorage.getItem('adspot_publications') || '{}');

    Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
        group.newspapers.forEach(paper => {
            publicationsData.push({
                ...paper,
                publicationGroup: groupId,
                groupName: group.name
            });
        });
    });

    // Add custom publications
    Object.entries(customPubs).forEach(([pubId, pub]) => {
        publicationsData.push({
            ...pub,
            id: pubId,
            publicationGroup: pub.group,
            groupName: customGroups[pub.group]?.name || CONFIG.PUBLICATIONS[pub.group]?.name || 'Unknown',
            isCustom: true
        });
    });

    // Populate group filter dropdown
    const groupFilter = document.getElementById('pubGroupFilter');
    if (groupFilter) {
        groupFilter.innerHTML = '<option value="">All Groups</option>';

        // Add built-in groups
        Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
            groupFilter.innerHTML += `<option value="${groupId}">${group.name}</option>`;
        });

        // Add custom groups
        Object.entries(customGroups).forEach(([groupId, group]) => {
            if (!CONFIG.PUBLICATIONS[groupId]) {
                groupFilter.innerHTML += `<option value="${groupId}">${group.name} (Custom)</option>`;
            }
        });
    }
}

/**
 * Initialize navigation
 */
function initNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            showSection(this.dataset.section);
        });
    });

    // View all links
    document.querySelectorAll('.view-all[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showSection(this.dataset.section);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear local admin session
            localStorage.removeItem('adspot_admin_session');
            // Redirect to login
            window.location.href = 'index.html';
        });
    }
}

/**
 * Show specific section
 */
function showSection(sectionId) {
    currentSection = sectionId;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });

    // Show/hide sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.toggle('active', section.id === sectionId + 'Section');
    });

    // Load section data
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'quotations':
            loadQuotations();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'publications':
            loadPublications();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'newQuotation':
            initManualQuotation();
            break;
    }

    // Close mobile sidebar
    document.querySelector('.admin-sidebar').classList.remove('open');
}

/**
 * Initialize modals
 */
function initModals() {
    // Close buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });

    // Click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });

    // Record Payment button
    document.getElementById('recordPayment')?.addEventListener('click', () => {
        document.getElementById('recordPaymentModal').classList.add('active');
    });

    // Record Payment form
    document.getElementById('recordPaymentForm')?.addEventListener('submit', handleRecordPayment);

    // Add Publication button
    document.getElementById('addPublication')?.addEventListener('click', () => {
        document.getElementById('pubModalTitle').textContent = 'Add Publication';
        document.getElementById('publicationForm').reset();
        document.getElementById('pubId').value = '';
        populatePublicationGroupSelect();
        document.getElementById('publicationModal').classList.add('active');
    });

    // Publication form
    document.getElementById('publicationForm')?.addEventListener('submit', handlePublicationSave);

    // Send Invoice button
    document.getElementById('sendInvoiceBtn')?.addEventListener('click', handleSendInvoice);

    // Add Publication Group button
    document.getElementById('addPubGroup')?.addEventListener('click', () => {
        document.getElementById('groupModalTitle').textContent = 'Add Publication Group';
        document.getElementById('publicationGroupForm').reset();
        document.getElementById('groupId').value = '';
        document.getElementById('publicationGroupModal').classList.add('active');
    });

    // Publication Group form
    document.getElementById('publicationGroupForm')?.addEventListener('submit', handlePublicationGroupSave);
}

/**
 * Initialize filters
 */
function initFilters() {
    // Quotation filters
    document.getElementById('quotationStatusFilter')?.addEventListener('change', loadQuotations);
    document.getElementById('quotationDateFilter')?.addEventListener('change', loadQuotations);

    // Payment filters
    document.getElementById('paymentMethodFilter')?.addEventListener('change', loadPayments);
    document.getElementById('paymentStatusFilter')?.addEventListener('change', loadPayments);

    // Publication filter
    document.getElementById('pubGroupFilter')?.addEventListener('change', loadPublications);

    // Customer search
    document.getElementById('customerSearch')?.addEventListener('input', debounce(loadCustomers, 300));

    // Global search
    document.getElementById('globalSearch')?.addEventListener('input', debounce(handleGlobalSearch, 300));

    // Export buttons
    document.getElementById('exportQuotations')?.addEventListener('click', () => exportToCSV('quotations'));
    document.getElementById('exportCustomers')?.addEventListener('click', () => exportToCSV('customers'));
}

/**
 * Initialize mobile sidebar toggle
 */
function initMobileSidebar() {
    document.querySelector('.mobile-sidebar-toggle')?.addEventListener('click', function() {
        document.querySelector('.admin-sidebar').classList.toggle('open');
    });
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        let stats = { totalQuotations: 0, totalRevenue: 0, pendingPayments: 0, totalCustomers: 0 };

        // First try to load from localStorage
        const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');

        if (localOrders.length > 0) {
            stats.totalQuotations = localOrders.length;
            stats.totalRevenue = localOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
            stats.pendingPayments = localOrders.filter(o => o.payment_status === 'pending').length;

            // Get unique customers
            const uniqueCustomers = new Set(localOrders.map(o => o.customer_email));
            stats.totalCustomers = uniqueCustomers.size;
        }

        // Try to load from database (will merge with local)
        if (typeof QuotationDB !== 'undefined' && typeof supabase !== 'undefined' && supabase) {
            try {
                const quotationStats = await QuotationDB.getStats();
                if (quotationStats.total > 0) {
                    stats.totalQuotations = quotationStats.total + localOrders.length;
                    stats.totalRevenue = (quotationStats.revenue || 0) + localOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
                }
            } catch (e) {
                console.log('Database not available, using localStorage');
            }
        }

        if (typeof PaymentDB !== 'undefined' && typeof supabase !== 'undefined' && supabase) {
            try {
                const dbPending = await PaymentDB.getPendingCount();
                stats.pendingPayments += dbPending || 0;
            } catch (e) {
                console.log('Using localStorage pending count');
            }
        }

        if (typeof CustomerDB !== 'undefined' && typeof supabase !== 'undefined' && supabase) {
            try {
                const dbCustomers = await CustomerDB.getCount();
                stats.totalCustomers += dbCustomers || 0;
            } catch (e) {
                console.log('Using localStorage customer count');
            }
        }

        document.getElementById('totalQuotations').textContent = stats.totalQuotations;
        document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
        document.getElementById('pendingPayments').textContent = stats.pendingPayments;
        document.getElementById('totalCustomers').textContent = stats.totalCustomers;

        // Load recent quotations
        loadRecentQuotations();

        // Load recent payments
        loadRecentPayments();

        // Load customers
        loadCustomers();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

/**
 * Load recent quotations for dashboard
 */
async function loadRecentQuotations() {
    const tbody = document.getElementById('recentQuotations');

    try {
        let quotations = [];

        // Load from localStorage first
        const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        quotations = localOrders.map(o => ({
            quotation_number: o.quotation_number,
            customer: { name: o.customer_name, email: o.customer_email },
            total_amount: o.total_amount,
            status: o.payment_status || 'pending',
            created_at: o.created_at,
            source: 'local'
        }));

        // Try to load from database
        if (typeof QuotationDB !== 'undefined' && typeof supabase !== 'undefined' && supabase) {
            try {
                const data = await QuotationDB.getAll({});
                if (data && data.length > 0) {
                    quotations = [...data.map(q => ({...q, source: 'database'})), ...quotations];
                }
            } catch (e) {
                console.log('Using localStorage quotations only');
            }
        }

        // Sort by date and take first 5
        quotations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        quotations = quotations.slice(0, 5);

        if (quotations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">No quotations found</td></tr>';
            return;
        }

        tbody.innerHTML = quotations.map(q => `
            <tr>
                <td><strong>${q.quotation_number}</strong></td>
                <td>${q.customer?.name || 'N/A'}</td>
                <td>${formatCurrency(q.total_amount)}</td>
                <td><span class="status-badge ${q.status}">${q.status}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Error loading data</td></tr>';
    }
}

/**
 * Load recent payments for dashboard
 */
async function loadRecentPayments() {
    const tbody = document.getElementById('recentPayments');

    try {
        let payments = [];

        if (typeof PaymentDB !== 'undefined') {
            try {
                const data = await PaymentDB.getAll({});
                payments = data.slice(0, 5);
            } catch (e) {
                console.log('Using empty payments');
            }
        }

        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">No payments found</td></tr>';
            return;
        }

        tbody.innerHTML = payments.map(p => `
            <tr>
                <td>${formatDate(p.created_at)}</td>
                <td>${p.quotation?.quotation_number || 'N/A'}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${p.payment_method === 'card' ? 'Card' : 'Bank'}</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Error loading data</td></tr>';
    }
}

/**
 * Load all quotations
 */
async function loadQuotations() {
    const tbody = document.getElementById('quotationsTable');
    const statusFilter = document.getElementById('quotationStatusFilter')?.value || '';
    const dateFilter = document.getElementById('quotationDateFilter')?.value || '';

    tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';

    try {
        let quotations = [];

        // Load from localStorage
        const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        const localQuotations = localOrders.map(o => ({
            id: o.id || o.quotation_number,
            quotation_number: o.quotation_number,
            customer: { name: o.customer_name, email: o.customer_email, phone: o.customer_phone },
            newspaper_name: o.items?.[0]?.newspaperName || 'Multiple',
            ad_type: o.items?.[0]?.adType || 'box',
            total_amount: o.total_amount,
            status: o.payment_status || 'pending',
            created_at: o.created_at,
            items: o.items,
            source: 'local'
        }));

        quotations = [...localQuotations];

        // Try to load from database
        if (typeof QuotationDB !== 'undefined' && typeof supabase !== 'undefined' && supabase) {
            try {
                const dbQuotations = await QuotationDB.getAll({ status: statusFilter, date: dateFilter });
                if (dbQuotations && dbQuotations.length > 0) {
                    quotations = [...dbQuotations.map(q => ({...q, source: 'database'})), ...quotations];
                }
            } catch (e) {
                console.log('Database not available, using localStorage');
            }
        }

        // Apply filters
        if (statusFilter) {
            quotations = quotations.filter(q => q.status === statusFilter);
        }

        // Sort by date (newest first)
        quotations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (quotations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">No quotations found</td></tr>';
            return;
        }

        tbody.innerHTML = quotations.map(q => `
            <tr>
                <td><strong>${q.quotation_number}</strong></td>
                <td>${q.customer?.name || 'N/A'}</td>
                <td>${q.newspaper_name || 'N/A'}</td>
                <td>${q.ad_type === 'box' ? 'Box Ad' : 'Classified'}</td>
                <td>${formatCurrency(q.total_amount)}</td>
                <td>
                    <span class="status-badge ${q.status}">${q.status}</span>
                    ${q.status === 'pending' ? `<button class="btn btn-xs btn-success" onclick="confirmOrderPayment('${q.id}', '${q.source}')" style="margin-left:5px;">Confirm</button>` : ''}
                </td>
                <td>${formatDate(q.created_at)}</td>
                <td>
                    <div class="actions-group">
                        <button class="action-btn" onclick="viewQuotation('${q.id}', '${q.source}')" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="action-btn" onclick="sendInvoice('${q.quotation_number}', '${q.customer?.email || ''}')" title="Send Invoice">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                            </svg>
                        </button>
                        <button class="action-btn action-btn--danger" onclick="deleteQuotation('${q.id}', '${q.source}')" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading quotations:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Error loading data</td></tr>';
    }
}

/**
 * Load all payments
 */
async function loadPayments() {
    const tbody = document.getElementById('paymentsTable');
    const methodFilter = document.getElementById('paymentMethodFilter')?.value || '';
    const statusFilter = document.getElementById('paymentStatusFilter')?.value || '';

    tbody.innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';

    try {
        let payments = [];

        // Try database first
        if (typeof PaymentDB !== 'undefined' && typeof isSupabaseAvailable !== 'undefined' && isSupabaseAvailable()) {
            try {
                payments = await PaymentDB.getAll({ method: methodFilter, status: statusFilter });
            } catch (e) {
                console.log('Database not available');
            }
        }

        // Also get paid orders from localStorage
        const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        const paidOrders = localOrders.filter(o =>
            o.payment_status === 'paid' || o.status === 'paid'
        );

        // Convert paid orders to payment format
        const localPayments = paidOrders.map(order => ({
            id: order.id || order.quotation_number,
            quotation_number: order.quotation_number,
            customer_name: order.customer_name,
            amount: order.total_amount,
            payment_method: order.payment_method || 'bank',
            reference_number: order.payment_reference || order.quotation_number,
            status: 'completed',
            created_at: order.updated_at || order.created_at,
            invoice_number: order.invoice_number,
            source: 'local'
        }));

        // Merge and deduplicate
        payments = [...payments, ...localPayments];

        // Apply filters
        if (methodFilter) {
            payments = payments.filter(p => p.payment_method === methodFilter);
        }
        if (statusFilter) {
            payments = payments.filter(p => p.status === statusFilter);
        }

        // Sort by date (newest first)
        payments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading">No payments found</td></tr>';
            return;
        }

        tbody.innerHTML = payments.map(p => `
            <tr>
                <td><strong>${p.invoice_number || '#' + String(p.id).substring(0, 8)}</strong></td>
                <td>${p.quotation_number || p.quotation?.quotation_number || 'N/A'}</td>
                <td>${p.customer_name || p.quotation?.customer?.name || 'N/A'}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${p.payment_method === 'card' ? 'Card' : 'Bank Transfer'}</td>
                <td>${p.reference_number || '-'}</td>
                <td><span class="status-badge completed">Paid</span></td>
                <td>${formatDate(p.created_at)}</td>
                <td>
                    <div class="actions-group">
                        <button class="action-btn" onclick="previewInvoice('${p.id}')" title="View Invoice">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                        </button>
                        <button class="action-btn" onclick="downloadInvoice('${p.id}')" title="Download Invoice">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading payments:', error);
        tbody.innerHTML = '<tr><td colspan="9" class="loading">Error loading data</td></tr>';
    }
}

/**
 * Load publications
 */
async function loadPublications() {
    const grid = document.getElementById('publicationsGrid');
    const groupFilter = document.getElementById('pubGroupFilter').value;

    grid.innerHTML = '<p class="loading">Loading...</p>';

    try {
        // Get all publication groups (built-in + custom)
        const customGroups = JSON.parse(localStorage.getItem('adspot_pub_groups') || '{}');
        const customPubs = JSON.parse(localStorage.getItem('adspot_publications') || '{}');

        // Merge built-in and custom groups
        const allGroups = { ...CONFIG.PUBLICATIONS };

        // Add custom groups
        Object.entries(customGroups).forEach(([groupId, group]) => {
            if (!allGroups[groupId]) {
                allGroups[groupId] = { ...group, newspapers: [] };
            }
        });

        // Add custom publications to groups
        Object.entries(customPubs).forEach(([pubId, pub]) => {
            if (allGroups[pub.group]) {
                // Check if already exists in newspapers array
                const exists = allGroups[pub.group].newspapers.some(p => p.id === pubId);
                if (!exists) {
                    allGroups[pub.group].newspapers.push({ ...pub, id: pubId, isCustom: true });
                }
            }
        });

        // Build HTML with group headers
        let html = '';

        Object.entries(allGroups).forEach(([groupId, group]) => {
            if (groupFilter && groupFilter !== groupId) return;

            const isCustomGroup = !!customGroups[groupId];

            html += `
                <div class="pub-group-section">
                    <div class="pub-group-header">
                        <h3>${group.name}</h3>
                        <div class="pub-group-actions">
                            <button class="btn btn-ghost btn-xs" onclick="editPublicationGroup('${groupId}')" title="Edit Group">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            ${isCustomGroup ? `
                            <button class="btn btn-danger btn-xs" onclick="deletePublicationGroup('${groupId}')" title="Delete Group">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="pub-cards-grid">
            `;

            if (group.newspapers.length === 0) {
                html += '<p class="no-pubs">No publications in this group. Click "Add Publication" to add one.</p>';
            } else {
                group.newspapers.forEach(pub => {
                    html += `
                        <div class="pub-card">
                            <div class="pub-card-header">
                                <div>
                                    <h4>${pub.name}</h4>
                                    <span class="language-badge">${pub.language}</span>
                                    ${pub.isSundayPaper ? '<span class="sunday-badge">Sunday</span>' : ''}
                                </div>
                            </div>
                            <div class="pub-rates">
                                <div class="rate-row">
                                    <span>B&W Rate:</span>
                                    <strong>${formatCurrency(pub.bwRate)}/sq cm</strong>
                                </div>
                                <div class="rate-row">
                                    <span>Color Rate:</span>
                                    <strong>${formatCurrency(pub.colorRate)}/sq cm</strong>
                                </div>
                                <div class="rate-row">
                                    <span>Classified Base:</span>
                                    <strong>${formatCurrency(pub.classifiedBase)}</strong>
                                </div>
                            </div>
                            <div class="pub-card-actions">
                                <button class="btn btn-ghost btn-sm" onclick="editPublication('${pub.id}', '${groupId}')">Edit</button>
                                ${pub.isCustom ? `<button class="btn btn-danger btn-sm" onclick="deletePublication('${pub.id}')">Delete</button>` : ''}
                            </div>
                        </div>
                    `;
                });
            }

            html += '</div></div>';
        });

        grid.innerHTML = html || '<p class="loading">No publication groups found</p>';

    } catch (error) {
        console.error('Error loading publications:', error);
        grid.innerHTML = '<p class="loading">Error loading data</p>';
    }
}

/**
 * Load customers
 */
async function loadCustomers() {
    const tbody = document.getElementById('customersTable');
    if (!tbody) return;

    const searchQuery = document.getElementById('customerSearch')?.value || '';

    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

    try {
        let customers = [];

        // Load customers from localStorage orders
        const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        const customerMap = {};

        localOrders.forEach(order => {
            const email = order.customer_email;
            if (!customerMap[email]) {
                customerMap[email] = {
                    id: email,
                    name: order.customer_name,
                    company: order.customer_company || '',
                    email: email,
                    phone: order.customer_phone,
                    orders: [],
                    totalSpent: 0,
                    source: 'local'
                };
            }
            customerMap[email].orders.push(order);
            customerMap[email].totalSpent += parseFloat(order.total_amount) || 0;
        });

        customers = Object.values(customerMap);

        // Try to load from database
        if (typeof CustomerDB !== 'undefined' && typeof supabase !== 'undefined' && supabase) {
            try {
                let dbCustomers;
                if (searchQuery) {
                    dbCustomers = await CustomerDB.search(searchQuery);
                } else {
                    dbCustomers = await CustomerDB.getAll();
                }
                if (dbCustomers && dbCustomers.length > 0) {
                    customers = [...dbCustomers.map(c => ({...c, source: 'database'})), ...customers];
                }
            } catch (e) {
                console.log('Database not available, using localStorage');
            }
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            customers = customers.filter(c =>
                c.name?.toLowerCase().includes(query) ||
                c.email?.toLowerCase().includes(query) ||
                c.phone?.includes(query)
            );
        }

        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No customers found</td></tr>';
            return;
        }

        tbody.innerHTML = customers.map(c => {
            const totalOrders = c.orders?.length || c.quotations?.length || 0;
            const totalSpent = c.totalSpent || c.quotations?.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0) || 0;

            return `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.company || '-'}</td>
                    <td>${c.email}</td>
                    <td>${c.phone || '-'}</td>
                    <td>${totalOrders}</td>
                    <td>${formatCurrency(totalSpent)}</td>
                    <td>
                        <div class="actions-group">
                            <button class="action-btn" onclick="viewCustomer('${c.id}', '${c.source}')" title="View">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading customers:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading data</td></tr>';
    }
}

/**
 * Confirm order payment (for bank transfers)
 */
async function confirmOrderPayment(id, source) {
    if (!confirm('Confirm this payment? This will mark the order as paid and send invoice to customer.')) {
        return;
    }

    try {
        if (source === 'local') {
            // Update in localStorage
            const orders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
            const orderIndex = orders.findIndex(o => (o.id == id) || (o.quotation_number == id));

            if (orderIndex !== -1) {
                orders[orderIndex].payment_status = 'paid';
                orders[orderIndex].payment_confirmed_at = new Date().toISOString();
                localStorage.setItem('adspot_orders', JSON.stringify(orders));

                // Send invoice email
                const order = orders[orderIndex];
                if (typeof EmailService !== 'undefined') {
                    try {
                        await EmailService.sendInvoice({
                            quotation_number: order.quotation_number,
                            invoice_number: order.invoice_number,
                            newspaper_name: order.items?.[0]?.newspaperName || 'Multiple',
                            ad_type: order.items?.[0]?.adType || 'box',
                            publication_date: order.items?.[0]?.pubDate,
                            total_amount: order.total_amount,
                            ad_details: order.items?.[0]?.details
                        }, {
                            name: order.customer_name,
                            email: order.customer_email,
                            phone: order.customer_phone
                        });
                        showToast('Payment confirmed and invoice sent!', 'success');
                    } catch (emailError) {
                        console.error('Email failed:', emailError);
                        showToast('Payment confirmed. Invoice email failed - please send manually.', 'warning');
                    }
                } else {
                    showToast('Payment confirmed!', 'success');
                }
            }
        } else {
            // Update in database
            if (typeof QuotationDB !== 'undefined') {
                await QuotationDB.update(id, { status: 'paid' });
            }
            showToast('Payment confirmed!', 'success');
        }

        // Reload data
        loadQuotations();
        loadDashboardData();

    } catch (error) {
        console.error('Error confirming payment:', error);
        showToast('Failed to confirm payment', 'error');
    }
}
window.confirmOrderPayment = confirmOrderPayment;

/**
 * View quotation details
 */
async function viewQuotation(id, source = 'database') {
    const modal = document.getElementById('viewQuotationModal');
    const details = document.getElementById('quotationDetails');

    details.innerHTML = '<p class="loading">Loading...</p>';
    modal.classList.add('active');

    try {
        let quotation = null;

        // Check localStorage first
        if (source === 'local') {
            const orders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
            const order = orders.find(o => (o.id == id) || (o.quotation_number == id));
            if (order) {
                quotation = {
                    id: order.id,
                    quotation_number: order.quotation_number,
                    customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone },
                    newspaper_name: order.items?.[0]?.newspaperName || 'Multiple',
                    ad_type: order.items?.[0]?.adType || 'box',
                    ad_details: order.items?.[0]?.details || {},
                    publication_date: order.items?.[0]?.pubDate,
                    total_amount: order.total_amount,
                    status: order.payment_status || 'pending',
                    created_at: order.created_at,
                    items: order.items,
                    source: 'local'
                };
            }
        }

        // Try database if not found in localStorage
        if (!quotation && typeof QuotationDB !== 'undefined' && typeof supabase !== 'undefined' && supabase) {
            try {
                quotation = await QuotationDB.getById(id);
            } catch (e) {
                console.log('Database not available');
            }
        }

        // If still not found, try localStorage with different ID formats
        if (!quotation) {
            const orders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
            const order = orders.find((o, idx) =>
                idx === parseInt(id) ||
                o.id == id ||
                o.quotation_number == id
            );
            if (order) {
                quotation = {
                    id: order.id || id,
                    quotation_number: order.quotation_number,
                    customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone },
                    newspaper_name: order.items?.[0]?.newspaperName || order.newspaper_name || 'Multiple',
                    ad_type: order.items?.[0]?.adType || order.ad_type || 'box',
                    ad_details: order.items?.[0]?.details || order.ad_details || {},
                    publication_date: order.items?.[0]?.pubDate || order.publication_date,
                    total_amount: order.total_amount,
                    status: order.payment_status || order.status || 'pending',
                    created_at: order.created_at,
                    items: order.items,
                    source: 'local'
                };
            }
        }

        if (!quotation) {
            details.innerHTML = '<p>Quotation not found</p>';
            return;
        }

        const adDetails = quotation.ad_details || {};

        details.innerHTML = `
            <h2>Quotation ${quotation.quotation_number}</h2>
            <div class="quotation-meta">
                <span class="status-badge ${quotation.status}">${quotation.status}</span>
                <span>Created: ${formatDate(quotation.created_at)}</span>
            </div>
            <div class="quotation-info">
                <h4>Customer</h4>
                <p><strong>${quotation.customer?.name || 'N/A'}</strong><br>
                ${quotation.customer?.email || ''}<br>
                ${quotation.customer?.phone || ''}</p>
            </div>
            <div class="quotation-info">
                <h4>Ad Details</h4>
                <p><strong>Newspaper:</strong> ${quotation.newspaper_name}<br>
                <strong>Type:</strong> ${quotation.ad_type === 'box' ? 'Box Advertisement' : 'Classified Ad'}<br>
                ${quotation.ad_type === 'box' ? `
                    <strong>Size:</strong> ${adDetails.columns || 1} col x ${adDetails.height || 0} cm (${adDetails.area?.toFixed(1) || 0} sq cm)<br>
                    <strong>Color:</strong> ${adDetails.colorOption === 'color' ? 'Full Color' : 'Black & White'}<br>
                ` : `
                    <strong>Words:</strong> ${adDetails.wordCount || 0}<br>
                    <strong>Category:</strong> ${CONFIG.CLASSIFIED_CATEGORIES[adDetails.category]?.name || adDetails.category}<br>
                `}
                <strong>Publication Date:</strong> ${formatDate(quotation.publication_date)}</p>
            </div>
            <div class="quotation-breakdown">
                <h4>Price Breakdown</h4>
                <div class="breakdown-row">
                    <span>Ad Total:</span>
                    <span>${formatCurrency(adDetails.adTotal || quotation.total_amount)}</span>
                </div>
                ${quotation.ad_type === 'box' && adDetails.commission ? `
                    <div class="breakdown-row">
                        <span>Platform Commission (10%):</span>
                        <span>${formatCurrency(adDetails.commission)}</span>
                    </div>
                ` : ''}
                ${quotation.ad_type === 'classified' && adDetails.serviceCharge ? `
                    <div class="breakdown-row">
                        <span>Service Charge:</span>
                        <span>${formatCurrency(adDetails.serviceCharge)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="quotation-total">
                <span>Total Amount:</span>
                <strong>${formatCurrency(quotation.total_amount)}</strong>
            </div>
            <div class="quotation-actions">
                <button class="btn btn-ghost" onclick="previewInvoice('${quotation.id}')">
                    View Invoice
                </button>
                <button class="btn btn-ghost" onclick="downloadInvoice('${quotation.id}')">
                    Download PDF
                </button>
                <button class="btn btn-primary" onclick="sendInvoice('${quotation.quotation_number}', '${quotation.customer?.email || ''}')">
                    Send Invoice
                </button>
                ${quotation.status === 'pending' ? `
                    <button class="btn btn-success" onclick="markAsPaid('${quotation.id}')">
                        Mark as Paid
                    </button>
                ` : ''}
                ${(quotation.status === 'paid' || quotation.status === 'published') ? `
                    <button class="btn btn-secondary" onclick="openSendToPublicationModal('${quotation.id}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px">
                            <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/>
                            <path d="M14 2v4a2 2 0 0 0 2 2h4M2 15h10M9 18l3-3-3-3"/>
                        </svg>
                        Send to Publication
                    </button>
                ` : ''}
                <button class="btn btn-danger" onclick="deleteQuotation('${quotation.id}', '${quotation.source || ''}', true)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                    </svg>
                    Delete Booking
                </button>
            </div>
        `;

    } catch (error) {
        console.error('Error loading quotation:', error);
        details.innerHTML = '<p>Error loading quotation details</p>';
    }
}

/**
 * Mark quotation as paid and send invoice
 */
async function markAsPaid(quotationId) {
    if (!confirm('Confirm payment and send invoice to customer?')) return;

    try {
        let updated = false;
        let orderData = null;

        // Try database first
        if (typeof QuotationDB !== 'undefined' && typeof isSupabaseAvailable !== 'undefined' && isSupabaseAvailable()) {
            try {
                await QuotationDB.updateStatus(quotationId, 'paid');
                orderData = await QuotationDB.getById(quotationId);
                updated = true;
            } catch (e) {
                console.log('Database not available, updating localStorage');
            }
        }

        // Fallback to localStorage - find and update
        if (!updated) {
            const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
            const orderIndex = localOrders.findIndex(o =>
                String(o.id) === String(quotationId) ||
                o.quotation_number === quotationId ||
                String(o.quotation_number) === String(quotationId)
            );

            if (orderIndex !== -1) {
                localOrders[orderIndex].payment_status = 'paid';
                localOrders[orderIndex].status = 'paid';
                localOrders[orderIndex].invoice_number = typeof generateInvoiceNumber !== 'undefined' ? generateInvoiceNumber() : `INV-${Date.now()}`;
                localStorage.setItem('adspot_orders', JSON.stringify(localOrders));
                orderData = localOrders[orderIndex];
                updated = true;
            }
        }

        if (updated && orderData) {
            // Use helper to extract quotation data consistently
            const quotation = extractQuotationFromOrder ? extractQuotationFromOrder(orderData) : {
                quotation_number: orderData.quotation_number,
                invoice_number: orderData.invoice_number || `INV-${Date.now()}`,
                newspaper_name: orderData.items?.[0]?.newspaperName || orderData.newspaper_name || 'N/A',
                ad_type: orderData.items?.[0]?.adType || orderData.ad_type || 'box',
                publication_date: orderData.items?.[0]?.pubDate || orderData.publication_date,
                total_amount: orderData.total_amount,
                ad_details: orderData.items?.[0]?.details || orderData.ad_details || {}
            };

            const customer = quotation.customer || {
                name: orderData.customer_name || 'Customer',
                email: orderData.customer_email || '',
                phone: orderData.customer_phone || ''
            };

            // Send invoice email
            if (customer.email && typeof EmailService !== 'undefined') {
                try {
                    await EmailService.sendInvoice(quotation, customer);
                    showToast('Payment confirmed & invoice sent!', 'success');
                } catch (emailError) {
                    console.error('Failed to send invoice email:', emailError);
                    showToast('Payment confirmed but email failed', 'warning');
                }
            } else {
                showToast('Payment confirmed!', 'success');
            }

            document.getElementById('viewQuotationModal')?.classList.remove('active');
            loadQuotations();
            loadDashboardData();
        } else {
            console.error('Quotation not found for ID:', quotationId);
            showToast('Quotation not found', 'error');
        }
    } catch (error) {
        console.error('Failed to update quotation:', error);
        showToast('Failed to update quotation', 'error');
    }
}
window.markAsPaid = markAsPaid;

/**
 * Send invoice
 */
function sendInvoice(quotationNumber, customerEmail) {
    document.getElementById('invoiceQuoteNum').textContent = quotationNumber;
    document.getElementById('invoiceEmail').value = customerEmail || '';
    document.getElementById('invoiceEmail').readOnly = false;
    document.getElementById('sendInvoiceModal').classList.add('active');
}

/**
 * Handle send invoice
 */
async function handleSendInvoice() {
    const email = document.getElementById('invoiceEmail').value;
    const message = document.getElementById('invoiceMessage').value;
    const quotationNumber = document.getElementById('invoiceQuoteNum').textContent;

    if (!email) {
        showToast('Please enter customer email', 'warning');
        return;
    }

    const sendBtn = document.getElementById('sendInvoiceBtn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
        // Get quotation details
        let quotation = null;

        // Try database first
        if (typeof QuotationDB !== 'undefined') {
            try {
                quotation = await QuotationDB.getByNumber(quotationNumber);
            } catch (e) {
                console.log('Database not available, checking localStorage');
            }
        }

        // Fallback to localStorage
        if (!quotation) {
            const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
            const order = localOrders.find(o => o.quotation_number === quotationNumber);
            if (order) {
                quotation = {
                    quotation_number: order.quotation_number,
                    invoice_number: order.invoice_number || `INV-${Date.now()}`,
                    newspaper_name: order.newspaper_name || order.items?.[0]?.newspaperName || 'N/A',
                    ad_type: order.ad_type || order.items?.[0]?.adType || 'box',
                    publication_date: order.publication_date || order.items?.[0]?.pubDate,
                    total_amount: order.total_amount,
                    ad_details: order.ad_details || {},
                    items: order.items || [], // Include items array!
                    customer: {
                        name: order.customer_name,
                        email: order.customer_email || email,
                        phone: order.customer_phone,
                        company: order.customer_company || '',
                        address: order.customer_address || ''
                    }
                };
            }
        }

        if (!quotation) {
            showToast('Quotation not found', 'error');
            return;
        }

        console.log('Sending invoice for quotation:', quotation);

        const customer = quotation.customer || { email: email, name: 'Customer' };

        // Generate PDF invoice
        let pdfBase64 = null;
        if (typeof InvoiceGenerator !== 'undefined') {
            pdfBase64 = InvoiceGenerator.getBase64(quotation, customer);
        }

        // Send email with PDF attachment
        if (typeof EmailService !== 'undefined' && EmailService.isConfigured()) {
            await EmailService.sendInvoice(quotation, customer, pdfBase64);
            showToast('Invoice sent successfully!', 'success');
        } else if (typeof EmailService !== 'undefined') {
            console.warn('EmailService exists but not configured');
            showToast('Email service not configured', 'warning');
        } else {
            // If email service not available, just download the invoice
            if (typeof InvoiceGenerator !== 'undefined') {
                InvoiceGenerator.download(quotation, customer);
                showToast('Invoice downloaded (email service not available)', 'warning');
            } else {
                showToast('Email and PDF services not available', 'error');
            }
        }

        document.getElementById('sendInvoiceModal').classList.remove('active');
    } catch (error) {
        console.error('Failed to send invoice:', error);
        showToast('Failed to send invoice', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Invoice';
    }
}

/**
 * Confirm payment
 */
async function confirmPayment(paymentId) {
    if (!confirm('Confirm this payment as received?')) return;

    try {
        if (typeof PaymentDB !== 'undefined') {
            await PaymentDB.updateStatus(paymentId, 'completed');
        }
        showToast('Payment confirmed!', 'success');
        loadPayments();
        loadDashboardData();
    } catch (error) {
        showToast('Failed to confirm payment', 'error');
    }
}

/**
 * Handle record payment form
 */
async function handleRecordPayment(e) {
    e.preventDefault();

    const data = {
        quotation_number: document.getElementById('paymentQuotationNum').value,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        method: document.getElementById('paymentMethodSelect').value,
        reference: document.getElementById('paymentReference').value,
        notes: document.getElementById('paymentNotes').value
    };

    try {
        if (typeof PaymentDB !== 'undefined') {
            // Find quotation ID by number
            if (typeof QuotationDB !== 'undefined') {
                const quotation = await QuotationDB.getByNumber(data.quotation_number);
                if (quotation) {
                    await PaymentDB.create({
                        quotation_id: quotation.id,
                        amount: data.amount,
                        payment_method: data.method,
                        reference_number: data.reference,
                        status: 'completed',
                        notes: data.notes
                    });
                }
            }
        }

        showToast('Payment recorded successfully!', 'success');
        document.getElementById('recordPaymentModal').classList.remove('active');
        document.getElementById('recordPaymentForm').reset();
        loadPayments();
        loadDashboardData();
    } catch (error) {
        showToast('Failed to record payment', 'error');
    }
}

/**
 * Populate publication group select
 */
function populatePublicationGroupSelect() {
    const select = document.getElementById('pubGroup');
    if (!select) return;

    select.innerHTML = '';

    // Add built-in groups
    Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
        select.innerHTML += `<option value="${groupId}">${group.name}</option>`;
    });

    // Add custom groups
    const customGroups = JSON.parse(localStorage.getItem('adspot_pub_groups') || '{}');
    Object.entries(customGroups).forEach(([groupId, group]) => {
        if (!CONFIG.PUBLICATIONS[groupId]) {
            select.innerHTML += `<option value="${groupId}">${group.name} (Custom)</option>`;
        }
    });
}

/**
 * Edit publication
 */
function editPublication(pubId, groupId) {
    // Find publication in config or custom publications
    let pub = null;

    // Check built-in publications
    Object.entries(CONFIG.PUBLICATIONS).forEach(([gId, group]) => {
        const found = group.newspapers.find(p => p.id === pubId);
        if (found) {
            pub = { ...found, group: gId };
        }
    });

    // Check custom publications
    if (!pub) {
        const customPubs = JSON.parse(localStorage.getItem('adspot_publications') || '{}');
        if (customPubs[pubId]) {
            pub = { ...customPubs[pubId], id: pubId };
        }
    }

    if (!pub) {
        showToast('Publication not found', 'error');
        return;
    }

    document.getElementById('pubModalTitle').textContent = 'Edit Publication';
    populatePublicationGroupSelect();

    document.getElementById('pubId').value = pub.id;
    document.getElementById('pubGroup').value = pub.group || groupId;
    document.getElementById('pubName').value = pub.name;
    document.getElementById('pubLanguage').value = pub.language;
    document.getElementById('pubBwRate').value = pub.bwRate;
    document.getElementById('pubColorRate').value = pub.colorRate;
    document.getElementById('pubClassifiedBase').value = pub.classifiedBase;
    document.getElementById('pubClassifiedFreeWords').value = pub.classifiedFreeWords;
    document.getElementById('pubClassifiedExtraRate').value = pub.classifiedExtraRate;
    document.getElementById('pubIsSunday').checked = pub.isSundayPaper || false;
    document.getElementById('pubActive').checked = pub.is_active !== false;

    document.getElementById('publicationModal').classList.add('active');
}

/**
 * Delete publication
 */
async function deletePublication(pubId) {
    if (!confirm('Are you sure you want to delete this publication?')) return;

    try {
        // Delete from local storage
        const customPubs = JSON.parse(localStorage.getItem('adspot_publications') || '{}');

        if (customPubs[pubId]) {
            delete customPubs[pubId];
            localStorage.setItem('adspot_publications', JSON.stringify(customPubs));
            showToast('Publication deleted successfully!', 'success');
            loadPublications();
        } else {
            showToast('Cannot delete built-in publications', 'warning');
        }
    } catch (error) {
        console.error('Error deleting publication:', error);
        showToast('Failed to delete publication', 'error');
    }
}
window.deletePublication = deletePublication;

/**
 * Handle publication save
 */
async function handlePublicationSave(e) {
    e.preventDefault();

    const pubId = document.getElementById('pubId').value;
    const isNew = !pubId;
    const newPubId = pubId || generatePublicationId();

    const data = {
        group: document.getElementById('pubGroup').value,
        name: document.getElementById('pubName').value,
        language: document.getElementById('pubLanguage').value,
        bwRate: parseFloat(document.getElementById('pubBwRate').value),
        colorRate: parseFloat(document.getElementById('pubColorRate').value),
        classifiedBase: parseFloat(document.getElementById('pubClassifiedBase').value),
        classifiedFreeWords: parseInt(document.getElementById('pubClassifiedFreeWords').value),
        classifiedExtraRate: parseFloat(document.getElementById('pubClassifiedExtraRate').value),
        isSundayPaper: document.getElementById('pubIsSunday').checked,
        is_active: document.getElementById('pubActive').checked
    };

    // Validate required fields
    if (!data.name || !data.group) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    try {
        // Check if it's a built-in publication (cannot fully edit built-ins, need to save as custom)
        let isBuiltIn = false;
        Object.values(CONFIG.PUBLICATIONS).forEach(group => {
            if (group.newspapers.some(p => p.id === pubId)) {
                isBuiltIn = true;
            }
        });

        // Save to local storage
        const customPubs = JSON.parse(localStorage.getItem('adspot_publications') || '{}');

        if (isBuiltIn && !isNew) {
            // For built-in pubs, create a custom override
            showToast('Note: Creating custom override for built-in publication', 'info');
        }

        customPubs[newPubId] = data;
        localStorage.setItem('adspot_publications', JSON.stringify(customPubs));

        showToast('Publication saved successfully!', 'success');
        document.getElementById('publicationModal').classList.remove('active');
        loadPublications();
    } catch (error) {
        console.error('Error saving publication:', error);
        showToast('Failed to save publication', 'error');
    }
}

/**
 * Generate publication ID
 */
function generatePublicationId() {
    return 'pub-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Handle publication group save
 */
async function handlePublicationGroupSave(e) {
    e.preventDefault();

    const groupId = document.getElementById('groupId').value;
    const groupName = document.getElementById('groupName').value;
    const groupLanguage = document.getElementById('groupLanguage').value;

    if (!groupName) {
        showToast('Please enter a group name', 'warning');
        return;
    }

    const newGroupId = groupId || groupName.toLowerCase().replace(/\s+/g, '-');

    const data = {
        id: newGroupId,
        name: groupName,
        language: groupLanguage,
        newspapers: []
    };

    try {
        // Save to local storage
        const customGroups = JSON.parse(localStorage.getItem('adspot_pub_groups') || '{}');

        if (groupId) {
            // Update existing
            customGroups[groupId] = { ...customGroups[groupId], ...data };
        } else {
            // Check if already exists
            if (customGroups[newGroupId] || CONFIG.PUBLICATIONS[newGroupId]) {
                showToast('A group with this name already exists', 'warning');
                return;
            }
            customGroups[newGroupId] = data;
        }

        localStorage.setItem('adspot_pub_groups', JSON.stringify(customGroups));

        showToast('Publication group saved successfully!', 'success');
        document.getElementById('publicationGroupModal').classList.remove('active');
        initPublicationGroups();
        loadPublications();
    } catch (error) {
        console.error('Error saving publication group:', error);
        showToast('Failed to save publication group', 'error');
    }
}

/**
 * Edit publication group
 */
function editPublicationGroup(groupId) {
    const customGroups = JSON.parse(localStorage.getItem('adspot_pub_groups') || '{}');
    const group = customGroups[groupId] || CONFIG.PUBLICATIONS[groupId];

    if (!group) {
        showToast('Group not found', 'error');
        return;
    }

    document.getElementById('groupModalTitle').textContent = 'Edit Publication Group';
    document.getElementById('groupId').value = groupId;
    document.getElementById('groupName').value = group.name;
    document.getElementById('groupLanguage').value = group.language || 'english';
    document.getElementById('publicationGroupModal').classList.add('active');
}
window.editPublicationGroup = editPublicationGroup;

/**
 * Delete publication group
 */
function deletePublicationGroup(groupId) {
    if (!confirm('Are you sure you want to delete this publication group? All publications in this group will also be deleted.')) {
        return;
    }

    try {
        const customGroups = JSON.parse(localStorage.getItem('adspot_pub_groups') || '{}');

        if (customGroups[groupId]) {
            delete customGroups[groupId];
            localStorage.setItem('adspot_pub_groups', JSON.stringify(customGroups));
            showToast('Publication group deleted successfully!', 'success');
            initPublicationGroups();
            loadPublications();
        } else {
            showToast('Cannot delete built-in publication groups', 'warning');
        }
    } catch (error) {
        console.error('Error deleting publication group:', error);
        showToast('Failed to delete publication group', 'error');
    }
}
window.deletePublicationGroup = deletePublicationGroup;

/**
 * View customer details
 */
async function viewCustomer(id) {
    const modal = document.getElementById('viewCustomerModal');
    const details = document.getElementById('customerDetails');

    if (!modal || !details) {
        // Create modal if it doesn't exist
        const modalHtml = `
            <div id="viewCustomerModal" class="modal">
                <div class="modal-content modal-large">
                    <button class="modal-close">&times;</button>
                    <div id="customerDetails"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Re-init close handlers
        document.querySelector('#viewCustomerModal .modal-close').addEventListener('click', function() {
            document.getElementById('viewCustomerModal').classList.remove('active');
        });
    }

    const detailsEl = document.getElementById('customerDetails');
    detailsEl.innerHTML = '<p class="loading">Loading...</p>';
    document.getElementById('viewCustomerModal').classList.add('active');

    try {
        let customer = null;

        // Try database first
        if (typeof CustomerDB !== 'undefined') {
            try {
                customer = await CustomerDB.getById(id);
            } catch (e) {
                console.log('Database not available, checking localStorage');
            }
        }

        // Fallback to localStorage
        if (!customer) {
            const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
            // Find customer from localStorage orders (id could be index or email)
            const order = localOrders.find((o, idx) => idx === parseInt(id) || o.customer_email === id || o.id === id);
            if (order) {
                customer = {
                    name: order.customer_name,
                    email: order.customer_email,
                    phone: order.customer_phone,
                    company: order.customer_company || '',
                    address: order.customer_address || '',
                    created_at: order.created_at,
                    quotations: localOrders
                        .filter(o => o.customer_email === order.customer_email)
                        .map(o => ({
                            quotation_number: o.quotation_number,
                            newspaper_name: o.newspaper_name,
                            total_amount: o.total_amount,
                            status: o.payment_status || o.status || 'pending',
                            created_at: o.created_at
                        }))
                };
            }
        }

        if (!customer) {
            detailsEl.innerHTML = '<p>Customer not found</p>';
            return;
        }

        const totalOrders = customer.quotations?.length || 0;
        const totalSpent = customer.quotations?.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0) || 0;

        detailsEl.innerHTML = `
            <h2>Customer Details</h2>
            <div class="customer-info-grid">
                <div class="info-section">
                    <h4>Contact Information</h4>
                    <p><strong>Name:</strong> ${customer.name}</p>
                    <p><strong>Company:</strong> ${customer.company || '-'}</p>
                    <p><strong>Email:</strong> <a href="mailto:${customer.email}">${customer.email}</a></p>
                    <p><strong>Phone:</strong> <a href="tel:${customer.phone}">${customer.phone}</a></p>
                    <p><strong>Address:</strong> ${customer.address || '-'}</p>
                </div>
                <div class="info-section">
                    <h4>Summary</h4>
                    <p><strong>Total Orders:</strong> ${totalOrders}</p>
                    <p><strong>Total Spent:</strong> ${formatCurrency(totalSpent)}</p>
                    <p><strong>Member Since:</strong> ${formatDate(customer.created_at)}</p>
                </div>
            </div>
            ${customer.quotations && customer.quotations.length > 0 ? `
                <div class="customer-orders">
                    <h4>Order History</h4>
                    <table class="data-table compact">
                        <thead>
                            <tr>
                                <th>Quotation #</th>
                                <th>Newspaper</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customer.quotations.map(q => `
                                <tr>
                                    <td><strong>${q.quotation_number}</strong></td>
                                    <td>${q.newspaper_name}</td>
                                    <td>${formatCurrency(q.total_amount)}</td>
                                    <td><span class="status-badge ${q.status}">${q.status}</span></td>
                                    <td>${formatDate(q.created_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p>No orders found</p>'}
        `;

    } catch (error) {
        console.error('Error loading customer:', error);
        detailsEl.innerHTML = '<p>Error loading customer details</p>';
    }
}

/**
 * Handle global search
 */
function handleGlobalSearch() {
    const query = document.getElementById('globalSearch').value;
    if (query.length < 2) return;

    // In production, search across all data
    console.log('Searching for:', query);
}

/**
 * Export data to CSV
 */
async function exportToCSV(type) {
    let data = [];
    let filename = '';

    if (type === 'quotations') {
        let quotations = [];
        if (typeof QuotationDB !== 'undefined') {
            try {
                quotations = await QuotationDB.getAll({});
            } catch (e) {
                console.log('Using empty data');
            }
        }

        data = [
            ['Quotation #', 'Customer', 'Email', 'Newspaper', 'Ad Type', 'Amount', 'Status', 'Date']
        ];

        quotations.forEach(q => {
            data.push([
                q.quotation_number,
                q.customer?.name || '',
                q.customer?.email || '',
                q.newspaper_name,
                q.ad_type,
                q.total_amount,
                q.status,
                q.created_at
            ]);
        });

        filename = `quotations-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'customers') {
        let customers = [];
        if (typeof CustomerDB !== 'undefined') {
            try {
                customers = await CustomerDB.getAll();
            } catch (e) {
                console.log('Using empty data');
            }
        }

        data = [
            ['Name', 'Company', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Joined']
        ];

        customers.forEach(c => {
            const totalOrders = c.quotations?.length || 0;
            const totalSpent = c.quotations?.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0) || 0;

            data.push([
                c.name,
                c.company || '',
                c.email,
                c.phone,
                totalOrders,
                totalSpent,
                c.created_at
            ]);
        });

        filename = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (data.length <= 1) {
        showToast('No data to export', 'warning');
        return;
    }

    const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    showToast(`${type} exported successfully!`, 'success');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Debounce helper
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Find order from localStorage with flexible ID matching
 */
function findOrderById(quotationId) {
    const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');

    // Try different matching strategies
    let order = localOrders.find(o =>
        String(o.id) === String(quotationId) ||
        o.quotation_number === quotationId ||
        String(o.quotation_number) === String(quotationId)
    );

    // Also try matching by index if quotationId is a small number
    if (!order && !isNaN(quotationId) && parseInt(quotationId) < localOrders.length) {
        order = localOrders[parseInt(quotationId)];
    }

    return order;
}

/**
 * Extract quotation data from order object
 */
function extractQuotationFromOrder(order) {
    if (!order) return null;

    return {
        id: order.id,
        quotation_number: order.quotation_number,
        invoice_number: order.invoice_number || `INV-${Date.now()}`,
        newspaper_name: order.items?.[0]?.newspaperName || order.newspaper_name || 'N/A',
        ad_type: order.items?.[0]?.adType || order.ad_type || 'box',
        publication_date: order.items?.[0]?.pubDate || order.publication_date,
        total_amount: order.total_amount,
        ad_details: order.items?.[0]?.details || order.ad_details || {},
        items: order.items || [],
        customer: {
            name: order.customer_name || order.customer?.name || 'Customer',
            email: order.customer_email || order.customer?.email || '',
            phone: order.customer_phone || order.customer?.phone || '',
            company: order.customer_company || order.customer?.company || '',
            address: order.customer_address || order.customer?.address || ''
        }
    };
}

/**
 * Download invoice as PDF
 */
async function downloadInvoice(quotationId) {
    try {
        // First try to use stored PDF
        if (typeof PdfStorage !== 'undefined' && PdfStorage.hasForOrder(quotationId)) {
            const order = findOrderById(quotationId);
            const quotation = extractQuotationFromOrder(order);
            const filename = `Invoice_${quotation?.quotation_number || quotationId}.pdf`;

            if (PdfStorage.download(quotationId, filename)) {
                showToast('Invoice downloaded!', 'success');
                return;
            }
        }

        // Generate new PDF
        let quotation = null;

        // Try database first
        if (typeof QuotationDB !== 'undefined' && typeof isSupabaseAvailable !== 'undefined' && isSupabaseAvailable()) {
            try {
                quotation = await QuotationDB.getById(quotationId);
            } catch (e) {
                console.log('Database not available, checking localStorage');
            }
        }

        // Fallback to localStorage
        if (!quotation) {
            const order = findOrderById(quotationId);
            quotation = extractQuotationFromOrder(order);
        }

        if (!quotation) {
            console.error('Quotation not found for ID:', quotationId);
            showToast('Quotation not found', 'error');
            return;
        }

        const customer = quotation.customer || { name: 'Customer', email: '', phone: '' };

        if (typeof InvoiceGenerator !== 'undefined') {
            InvoiceGenerator.download(quotation, customer);
            showToast('Invoice downloaded!', 'success');
        } else {
            showToast('PDF generator not available', 'error');
        }
    } catch (error) {
        console.error('Error downloading invoice:', error);
        showToast('Failed to download invoice', 'error');
    }
}

/**
 * Preview invoice in new tab
 */
async function previewInvoice(quotationId) {
    try {
        // First try to use stored PDF
        if (typeof PdfStorage !== 'undefined' && PdfStorage.hasForOrder(quotationId)) {
            if (PdfStorage.openInNewTab(quotationId)) {
                showToast('Invoice opened in new tab', 'success');
                return;
            }
        }

        // Generate new PDF
        let quotation = null;

        // Try database first
        if (typeof QuotationDB !== 'undefined' && typeof isSupabaseAvailable !== 'undefined' && isSupabaseAvailable()) {
            try {
                quotation = await QuotationDB.getById(quotationId);
            } catch (e) {
                console.log('Database not available, checking localStorage');
            }
        }

        // Fallback to localStorage
        if (!quotation) {
            const order = findOrderById(quotationId);
            quotation = extractQuotationFromOrder(order);
        }

        if (!quotation) {
            console.error('Quotation not found for ID:', quotationId);
            showToast('Quotation not found', 'error');
            return;
        }

        const customer = quotation.customer || { name: 'Customer', email: '', phone: '' };

        if (typeof InvoiceGenerator !== 'undefined' && InvoiceGenerator.preview) {
            InvoiceGenerator.preview(quotation, customer);
            showToast('Invoice opened in new tab', 'success');
        } else if (typeof InvoiceGenerator !== 'undefined') {
            // Fallback to download if preview not available
            InvoiceGenerator.download(quotation, customer);
            showToast('Invoice downloaded (preview not available)', 'info');
        } else {
            showToast('PDF generator not available', 'error');
        }
    } catch (error) {
        console.error('Error previewing invoice:', error);
        showToast('Failed to preview invoice', 'error');
    }
}

// Make functions globally available
window.viewQuotation = viewQuotation;
window.sendInvoice = sendInvoice;
window.confirmPayment = confirmPayment;
window.editPublication = editPublication;
window.viewCustomer = viewCustomer;
window.downloadInvoice = downloadInvoice;
window.previewInvoice = previewInvoice;
window.openSendToPublicationModal = openSendToPublicationModal;
window.markAsPaid = markAsPaid;
window.deleteQuotation = deleteQuotation;

// ─── Delete Booking ──────────────────────────────────────────────────────────

async function deleteQuotation(quotationId, source, closeModal = false) {
    if (!confirm('Are you sure you want to permanently delete this booking? This cannot be undone.')) return;

    let deleted = false;

    // Delete from Supabase if available
    if (typeof QuotationDB !== 'undefined' && typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            await QuotationDB.delete(quotationId);
            deleted = true;
        } catch (e) {
            console.warn('[Delete] Supabase delete failed:', e.message);
        }
    }

    // Always remove from localStorage too
    try {
        const orders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        const filtered = orders.filter(o =>
            String(o.id) !== String(quotationId) &&
            o.quotation_number !== quotationId &&
            String(o.quotation_number) !== String(quotationId)
        );
        if (filtered.length < orders.length) {
            localStorage.setItem('adspot_orders', JSON.stringify(filtered));
            deleted = true;
        }
    } catch (e) {
        console.warn('[Delete] localStorage delete failed:', e.message);
    }

    if (deleted) {
        showToast('Booking deleted', 'success');
        if (closeModal) {
            document.getElementById('viewQuotationModal')?.classList.remove('active');
        }
        loadQuotations();
    } else {
        showToast('Could not delete booking', 'error');
    }
}

// ─── Send to Publication ─────────────────────────────────────────────────────

async function openSendToPublicationModal(quotationId) {
    let orderData = null;

    // Load from Supabase if available
    if (typeof QuotationDB !== 'undefined' && typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try { orderData = await QuotationDB.getById(quotationId); } catch { /* fall through */ }
    }
    // Fallback to localStorage
    if (!orderData) {
        const orders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        orderData = orders.find(o =>
            String(o.id) === String(quotationId) || o.quotation_number === quotationId
        );
    }
    if (!orderData) { showToast('Quotation not found', 'error'); return; }

    const quotation = extractQuotationFromOrder ? extractQuotationFromOrder(orderData) : orderData;
    const pubGroup = orderData.publication_group
        || orderData.items?.[0]?.publicationGroup
        || orderData.items?.[0]?.groupId
        || 'other';

    const savedEmail = localStorage.getItem(`adspot_pub_email_${pubGroup}`)
        || CONFIG.PUBLICATION_EMAILS?.[pubGroup]
        || '';

    document.getElementById('pubSendContent').innerHTML = buildSendToPublicationPanel(quotation, pubGroup, savedEmail);
    document.getElementById('sendToPublicationModal').classList.add('active');

    document.getElementById('confirmSendToPublicationBtn').onclick = () =>
        handleSendToPublication(quotationId, quotation, pubGroup);
}

function buildSendToPublicationPanel(quotation, pubGroup, savedEmail) {
    const groupName = pubGroup.charAt(0).toUpperCase() + pubGroup.slice(1).replace('-', ' ');
    const items = quotation.items || [];
    const itemLines = items.map(i =>
        `  • ${i.newspaperName || ''} | ${i.pubDate || ''} | Rs. ${parseFloat(i.price || 0).toFixed(2)}`
    ).join('\n');
    const defaultBody = `Dear All,

Please find attached the payment slip for the following advertisement(s).

Publication Group: ${groupName}
Quotation Ref: ${quotation.quotation_number}
${itemLines}
Total Amount: Rs. ${parseFloat(quotation.total_amount || 0).toFixed(2)}

Regards,
AdSpot Media`;

    return `
        <div class="form-group">
            <label class="form-label">Publication Email <span style="color:#ef4444">*</span></label>
            <input type="email" id="pubEmailInput" class="form-input"
                value="${savedEmail}" placeholder="ads@publication.lk" required>
        </div>
        <div class="form-group">
            <label class="form-label">Subject</label>
            <input type="text" id="pubSubject" class="form-input"
                value="Payment Slip – ${quotation.quotation_number}">
        </div>
        <div class="form-group">
            <label class="form-label">Message</label>
            <textarea id="pubBody" class="form-input" rows="8"
                style="font-family:monospace;font-size:13px;">${defaultBody}</textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Attach Payment Slip <span style="color:#64748b;font-weight:400;">(optional)</span></label>
            <input type="file" id="pubSlipFile" class="form-input" accept=".jpg,.jpeg,.png,.pdf">
        </div>`;
}

async function handleSendToPublication(quotationId, quotation, pubGroup) {
    const emailInput = document.getElementById('pubEmailInput');
    const subject    = document.getElementById('pubSubject').value.trim();
    const body       = document.getElementById('pubBody').value.trim();
    const fileInput  = document.getElementById('pubSlipFile');

    if (!emailInput.value.trim()) {
        showToast('Please enter the publication email address', 'error');
        emailInput.focus();
        return;
    }

    const toEmail = emailInput.value.trim();
    localStorage.setItem(`adspot_pub_email_${pubGroup}`, toEmail);

    const btn = document.getElementById('confirmSendToPublicationBtn');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    let attachmentBase64 = '';
    let attachmentName   = '';
    let attachmentMime   = '';

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        attachmentName = file.name;
        attachmentMime = file.type;
        attachmentBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
    }

    try {
        if (typeof sendToPublicationEmail !== 'function') {
            throw new Error('Email service not available. Please ensure firebase-db.js is loaded.');
        }
        await sendToPublicationEmail({
            toEmail,
            subject,
            body,
            quotationNumber: quotation.quotation_number,
            attachmentBase64,
            attachmentName,
            attachmentMimeType: attachmentMime
        });

        // Mark as published in DB
        if (typeof QuotationDB !== 'undefined' && typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
            try { await QuotationDB.updateStatus(quotationId, 'published'); } catch { /* non-fatal */ }
        }
        // Update localStorage
        const orders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        const idx = orders.findIndex(o =>
            String(o.id) === String(quotationId) || o.quotation_number === quotationId
        );
        if (idx !== -1) { orders[idx].status = 'published'; localStorage.setItem('adspot_orders', JSON.stringify(orders)); }

        showToast('Sent to publication successfully!', 'success');
        document.getElementById('sendToPublicationModal').classList.remove('active');
        loadQuotations();
    } catch (e) {
        showToast('Failed to send: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/></svg>Send to Publication`;
    }
}

/* ══════════════════════════════════════════════
   MANUAL QUOTATION
══════════════════════════════════════════════ */

let qtItems = []; // { id, newspaper, adType, columns, height, colour, wordCount, calc }
let qtItemCounter = 0;

function initManualQuotation() {
    if (qtItems.length === 0) renderQtItems();
}

function getAllNewspapers() {
    const list = [];
    Object.entries(CONFIG.PUBLICATIONS || {}).forEach(([groupId, group]) => {
        (group.newspapers || []).forEach(p => {
            list.push({ ...p, groupId, groupName: group.name });
        });
    });
    return list;
}

function addQtItem() {
    const id = ++qtItemCounter;
    qtItems.push({ id, newspaper: null, adType: 'box', columns: 2, height: 5, colour: 'color', wordCount: 20, calc: null });
    renderQtItems();
    updateQtTotals();
}

function removeQtItem(id) {
    qtItems = qtItems.filter(i => i.id !== id);
    renderQtItems();
    updateQtTotals();
}

function renderQtItems() {
    const list = document.getElementById('qtItemsList');
    const empty = document.getElementById('qtEmptyMsg');
    if (!list) return;
    if (qtItems.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    const papers = getAllNewspapers();
    const paperOptions = papers.map(p =>
        `<option value="${p.id}">${p.name} (${p.groupName})</option>`
    ).join('');

    list.innerHTML = qtItems.map(item => {
        const adType = item.adType || 'box';
        const paper = papers.find(p => p.id === item.newspaper);
        const maxCols = paper ? getMaxColumns(paper.language) : 7;
        const colOptions = Array.from({length: maxCols}, (_, i) => i + 1)
            .map(c => `<option value="${c}" ${c === item.columns ? 'selected' : ''}>${c} col</option>`).join('');

        const priceHtml = item.calc ? `
            <div class="qt-price-display">
                <div>Item Price: <strong>Rs. ${(item.calc.total || 0).toLocaleString('en-LK', {minimumFractionDigits:2})}</strong></div>
                <div class="qt-price-breakdown">
                    <span class="qt-price-tag">Ad: Rs. ${(item.calc.adTotal || 0).toLocaleString('en-LK')}</span>
                    ${item.calc.commission > 0 ? `<span class="qt-price-tag">Commission: Rs. ${item.calc.commission.toLocaleString('en-LK')}</span>` : ''}
                    ${item.calc.vat > 0 ? `<span class="qt-price-tag">VAT 18%: Rs. ${item.calc.vat.toLocaleString('en-LK')}</span>` : ''}
                    ${item.calc.serviceCharge > 0 ? `<span class="qt-price-tag">Service: Rs. ${item.calc.serviceCharge}</span>` : ''}
                </div>
            </div>` : '';

        return `
        <div class="qt-item-card" id="qtItem_${item.id}">
            <div class="qt-item-header">
                <span class="qt-item-title">Item ${item.id}</span>
                <button class="qt-item-remove" onclick="removeQtItem(${item.id})" title="Remove">✕</button>
            </div>
            <div class="qt-item-grid">
                <div class="form-group qt-item-full">
                    <label class="form-label">Newspaper *</label>
                    <select class="form-input" onchange="updateQtItemField(${item.id},'newspaper',this.value)">
                        <option value="">— Select newspaper —</option>
                        ${paperOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Ad Type</label>
                    <select class="form-input" onchange="updateQtItemAdType(${item.id},this.value)">
                        <option value="box" ${adType==='box'?'selected':''}>Box Ad</option>
                        <option value="classified" ${adType==='classified'?'selected':''}>Classified Ad</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Publication Date *</label>
                    <input type="date" class="form-input" value="${item.pubDate || ''}" onchange="updateQtItemField(${item.id},'pubDate',this.value)">
                </div>
                ${adType === 'box' ? `
                <div class="form-group">
                    <label class="form-label">Columns</label>
                    <select class="form-input" onchange="updateQtItemField(${item.id},'columns',parseInt(this.value))">
                        ${colOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Height (cm)</label>
                    <input type="number" class="form-input" value="${item.height}" min="1" step="0.5"
                        onchange="updateQtItemField(${item.id},'height',parseFloat(this.value))">
                </div>
                <div class="form-group">
                    <label class="form-label">Colour</label>
                    <select class="form-input" onchange="updateQtItemField(${item.id},'colour',this.value)">
                        <option value="color" ${item.colour==='color'?'selected':''}>Full Colour</option>
                        <option value="bw" ${item.colour==='bw'?'selected':''}>Black & White</option>
                    </select>
                </div>
                ` : `
                <div class="form-group">
                    <label class="form-label">Word Count</label>
                    <input type="number" class="form-input" value="${item.wordCount}" min="1"
                        onchange="updateQtItemField(${item.id},'wordCount',parseInt(this.value))">
                </div>
                `}
            </div>
            ${priceHtml}
        </div>`;
    }).join('');

    // Re-select newspaper values
    qtItems.forEach(item => {
        const card = document.getElementById(`qtItem_${item.id}`);
        if (!card) return;
        const sel = card.querySelector('select');
        if (sel && item.newspaper) sel.value = item.newspaper;
    });
}

function updateQtItemField(id, field, value) {
    const item = qtItems.find(i => i.id === id);
    if (!item) return;
    item[field] = value;
    if (field === 'newspaper') {
        item.calc = null;
        renderQtItems();
    }
    recalcQtItem(id);
    updateQtTotals();
}

function updateQtItemAdType(id, adType) {
    const item = qtItems.find(i => i.id === id);
    if (!item) return;
    item.adType = adType;
    item.calc = null;
    renderQtItems();
    recalcQtItem(id);
    updateQtTotals();
}

function recalcQtItem(id) {
    const item = qtItems.find(i => i.id === id);
    if (!item || !item.newspaper) return;
    const papers = getAllNewspapers();
    const paper = papers.find(p => p.id === item.newspaper);
    if (!paper) return;

    if (item.adType === 'box' && item.height > 0 && item.columns > 0) {
        item.calc = calculateBoxAdPrice(paper, item.height, item.columns, item.colour || 'color');
    } else if (item.adType === 'classified' && item.wordCount > 0) {
        item.calc = calculateClassifiedPrice(paper, item.wordCount);
    }

    // Update price display in existing card without full re-render
    const card = document.getElementById(`qtItem_${item.id}`);
    if (!card || !item.calc) return;
    let priceEl = card.querySelector('.qt-price-display');
    const priceHtml = `
        <div class="qt-price-display">
            <div>Item Price: <strong>Rs. ${(item.calc.total || 0).toLocaleString('en-LK', {minimumFractionDigits:2})}</strong></div>
            <div class="qt-price-breakdown">
                <span class="qt-price-tag">Ad: Rs. ${(item.calc.adTotal || 0).toLocaleString('en-LK')}</span>
                ${item.calc.commission > 0 ? `<span class="qt-price-tag">Commission: Rs. ${item.calc.commission.toLocaleString('en-LK')}</span>` : ''}
                ${item.calc.vat > 0 ? `<span class="qt-price-tag">VAT 18%: Rs. ${item.calc.vat.toLocaleString('en-LK')}</span>` : ''}
                ${item.calc.serviceCharge > 0 ? `<span class="qt-price-tag">Service: Rs. ${item.calc.serviceCharge}</span>` : ''}
            </div>
        </div>`;
    if (priceEl) {
        priceEl.outerHTML = priceHtml;
    } else {
        card.insertAdjacentHTML('beforeend', priceHtml);
    }
}

function updateQtTotals() {
    const box = document.getElementById('qtTotalsBox');
    const rowsEl = document.getElementById('qtTotalsRows');
    const grandEl = document.getElementById('qtGrandTotal');
    if (!box) return;

    const validItems = qtItems.filter(i => i.calc);
    if (validItems.length === 0) { box.style.display = 'none'; return; }

    let subtotal = 0, totalCommission = 0, totalVat = 0, totalService = 0;
    validItems.forEach(i => {
        subtotal += i.calc.adTotal || 0;
        totalCommission += i.calc.commission || 0;
        totalVat += i.calc.vat || 0;
        totalService += i.calc.serviceCharge || 0;
    });

    const discountPct = parseFloat(document.getElementById('qtDiscountPct')?.value) || 0;
    const promoCode = document.getElementById('qtPromoCode')?.value?.trim() || '';
    const discountAmt = discountPct > 0 ? Math.round(subtotal * discountPct / 100) : 0;
    const grand = subtotal + totalCommission - discountAmt + totalVat + totalService;

    const fmt = n => 'Rs. ' + Number(n).toLocaleString('en-LK', {minimumFractionDigits:2});
    let rows = `<div class="qt-total-row"><span>Subtotal</span><span class="v">${fmt(subtotal)}</span></div>`;
    if (totalCommission > 0) rows += `<div class="qt-total-row"><span>Platform Commission (${(CONFIG.CHARGES.boxAdCommission*100).toFixed(0)}%)</span><span class="v">${fmt(totalCommission)}</span></div>`;
    if (discountAmt > 0) rows += `<div class="qt-total-row discount"><span>Discount${promoCode ? ' · ' + promoCode : ''} (${discountPct}%)</span><span class="v">− ${fmt(discountAmt)}</span></div>`;
    if (totalVat > 0) rows += `<div class="qt-total-row"><span>VAT (18%)</span><span class="v">${fmt(totalVat)}</span></div>`;
    if (totalService > 0) rows += `<div class="qt-total-row"><span>Service Charge</span><span class="v">${fmt(totalService)}</span></div>`;

    rowsEl.innerHTML = rows;
    grandEl.textContent = fmt(grand);
    box.style.display = 'block';
}

async function generateAndSendManualQuotation() {
    const name = document.getElementById('qtCustomerName')?.value?.trim();
    const email = document.getElementById('qtCustomerEmail')?.value?.trim();
    if (!name || !email) { showToast('Customer name and email are required', 'error'); return; }

    const validItems = qtItems.filter(i => i.calc && i.pubDate);
    if (validItems.length === 0) { showToast('Add at least one item with a publication date', 'error'); return; }

    const btn = document.getElementById('qtSendBtn');
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span style="margin-right:6px">⏳</span>Generating PDF...';

    try {
        const papers = getAllNewspapers();
        const discountPct = parseFloat(document.getElementById('qtDiscountPct')?.value) || 0;
        const promoCode = document.getElementById('qtPromoCode')?.value?.trim() || '';

        let subtotal = 0, totalCommission = 0, totalVat = 0, totalService = 0;
        validItems.forEach(i => {
            subtotal += i.calc.adTotal || 0;
            totalCommission += i.calc.commission || 0;
            totalVat += i.calc.vat || 0;
            totalService += i.calc.serviceCharge || 0;
        });
        const discountAmt = discountPct > 0 ? Math.round(subtotal * discountPct / 100) : 0;
        const grand = subtotal + totalCommission - discountAmt + totalVat + totalService;

        const quotationNumber = 'QT-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*9000+1000);
        const invoiceNumber = quotationNumber.replace('QT-', 'QTN-');

        const invoiceData = {
            invoiceNumber,
            quotationNumber,
            subtotal,
            commission: totalCommission,
            vat: totalVat,
            serviceCharge: totalService,
            promoCode: promoCode || null,
            promoDiscount: discountAmt,
            total: grand
        };

        const bookingData = {
            customerName: name,
            customerEmail: email,
            customerPhone: document.getElementById('qtCustomerPhone')?.value?.trim() || '',
            customerCompany: document.getElementById('qtCustomerCompany')?.value?.trim() || '',
            customerAddress: document.getElementById('qtCustomerAddress')?.value?.trim() || '',
            paymentMethod: 'bank',
            items: validItems.map(i => {
                const paper = papers.find(p => p.id === i.newspaper);
                return {
                    newspaperName: paper?.name || i.newspaper,
                    adType: i.adType,
                    pubDate: i.pubDate,
                    price: i.calc.total,
                    details: i.adType === 'box'
                        ? { columns: i.columns, height: i.height, colour: i.colour, adTotal: i.calc.adTotal, commission: i.calc.commission, vat: i.calc.vat }
                        : { wordCount: i.wordCount, adTotal: i.calc.adTotal, serviceCharge: i.calc.serviceCharge }
                };
            })
        };

        btn.innerHTML = '<span style="margin-right:6px">📄</span>Generating PDF...';
        let pdfUrl = '';
        if (typeof generateInvoicePDF === 'function') {
            pdfUrl = await generateInvoicePDF(invoiceData, bookingData, false); // false = Quotation (unpaid)
        }

        // Save to Firebase
        if (typeof db !== 'undefined') {
            try {
                await db.collection('bookings').add({
                    quotationNumber,
                    invoiceNumber,
                    customerName: name,
                    customerEmail: email,
                    customerPhone: bookingData.customerPhone,
                    customerCompany: bookingData.customerCompany,
                    customerAddress: bookingData.customerAddress,
                    items: bookingData.items,
                    totalAmount: grand,
                    subtotalAmount: subtotal,
                    promoCode: promoCode || null,
                    promoDiscount: discountAmt,
                    paymentMethod: 'bank',
                    paymentStatus: 'pending',
                    status: 'pending',
                    quotationPdfUrl: pdfUrl,
                    source: 'manual_admin',
                    notes: document.getElementById('qtNotes')?.value?.trim() || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch(e) { console.warn('Firebase save failed:', e); }
        }

        btn.innerHTML = '<span style="margin-right:6px">📧</span>Sending email...';

        // Send email via Apps Script
        if (typeof sendManualQuotationEmail === 'function') {
            await sendManualQuotationEmail({
                quotationNumber,
                customerName: name,
                customerEmail: email,
                customerPhone: bookingData.customerPhone,
                customerCompany: bookingData.customerCompany,
                items: bookingData.items,
                subtotal,
                commission: totalCommission,
                vat: totalVat,
                serviceCharge: totalService,
                promoCode: promoCode || null,
                promoDiscount: discountAmt,
                total: grand,
                pdfUrl,
                notes: document.getElementById('qtNotes')?.value?.trim() || ''
            });
        }

        showToast(`Quotation ${quotationNumber} sent to ${email}`, 'success');
        resetQtForm();
        // Switch to quotations tab to see it
        setTimeout(() => showSection('quotations'), 1500);

    } catch (e) {
        console.error('Manual quotation error:', e);
        showToast('Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}

function resetQtForm() {
    qtItems = [];
    qtItemCounter = 0;
    ['qtCustomerName','qtCustomerEmail','qtCustomerPhone','qtCustomerCompany','qtCustomerAddress','qtPromoCode','qtDiscountPct','qtNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderQtItems();
    updateQtTotals();
    const box = document.getElementById('qtTotalsBox');
    if (box) box.style.display = 'none';
}
