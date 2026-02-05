/**
 * AdSpot - Admin Dashboard JavaScript
 * Complete management functionality for quotations, payments, publications, and customers
 */

// State
let currentSection = 'dashboard';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initNavigation();
    initModals();
    initFilters();
    initMobileSidebar();
});

// Wait for Supabase to be ready
window.addEventListener('supabaseReady', function() {
    loadDashboardData();
});

/**
 * Check authentication
 */
async function checkAuth() {
    // Wait for Supabase
    if (typeof supabase === 'undefined') {
        setTimeout(checkAuth, 100);
        return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    // Set admin name
    document.getElementById('adminName').textContent = session.user.email;
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
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
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
        document.getElementById('publicationModal').classList.add('active');
    });
    
    // Publication form
    document.getElementById('publicationForm')?.addEventListener('submit', handlePublicationSave);
    
    // Send Invoice button
    document.getElementById('sendInvoiceBtn')?.addEventListener('click', handleSendInvoice);
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
        // For demo, use mock data. In production, use actual database calls
        const stats = {
            totalQuotations: 156,
            totalRevenue: 2450000,
            pendingPayments: 12,
            totalCustomers: 89
        };
        
        document.getElementById('totalQuotations').textContent = stats.totalQuotations;
        document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
        document.getElementById('pendingPayments').textContent = stats.pendingPayments;
        document.getElementById('totalCustomers').textContent = stats.totalCustomers;
        
        // Load recent quotations
        loadRecentQuotations();
        
        // Load recent payments
        loadRecentPayments();
        
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
    
    // Demo data
    const quotations = [
        { quotation_number: 'QM-2026-1234', customer: 'John Silva', total_amount: 45000, status: 'paid' },
        { quotation_number: 'QM-2026-1233', customer: 'ABC Corp', total_amount: 125000, status: 'pending' },
        { quotation_number: 'QM-2026-1232', customer: 'Sarah Fernando', total_amount: 12500, status: 'published' },
        { quotation_number: 'QM-2026-1231', customer: 'Tech Solutions', total_amount: 75000, status: 'pending' },
        { quotation_number: 'QM-2026-1230', customer: 'Maria Perera', total_amount: 8500, status: 'paid' }
    ];
    
    tbody.innerHTML = quotations.map(q => `
        <tr>
            <td><strong>${q.quotation_number}</strong></td>
            <td>${q.customer}</td>
            <td>${formatCurrency(q.total_amount)}</td>
            <td><span class="status-badge ${q.status}">${q.status}</span></td>
        </tr>
    `).join('');
}

/**
 * Load recent payments for dashboard
 */
async function loadRecentPayments() {
    const tbody = document.getElementById('recentPayments');
    
    // Demo data
    const payments = [
        { date: '2026-02-05', quotation_number: 'QM-2026-1234', amount: 45000, method: 'Card' },
        { date: '2026-02-04', quotation_number: 'QM-2026-1230', amount: 8500, method: 'Bank' },
        { date: '2026-02-04', quotation_number: 'QM-2026-1228', amount: 32000, method: 'Card' },
        { date: '2026-02-03', quotation_number: 'QM-2026-1225', amount: 55000, method: 'Bank' },
        { date: '2026-02-03', quotation_number: 'QM-2026-1224', amount: 15000, method: 'Card' }
    ];
    
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${formatDate(p.date)}</td>
            <td>${p.quotation_number}</td>
            <td>${formatCurrency(p.amount)}</td>
            <td>${p.method}</td>
        </tr>
    `).join('');
}

/**
 * Load all quotations
 */
async function loadQuotations() {
    const tbody = document.getElementById('quotationsTable');
    const statusFilter = document.getElementById('quotationStatusFilter').value;
    const dateFilter = document.getElementById('quotationDateFilter').value;
    
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';
    
    try {
        // Demo data
        let quotations = [
            { id: 1, quotation_number: 'QM-2026-1234', customer: 'John Silva', newspaper: 'Daily News', ad_type: 'Box', total_amount: 45000, status: 'paid', created_at: '2026-02-05' },
            { id: 2, quotation_number: 'QM-2026-1233', customer: 'ABC Corp', newspaper: 'Sunday Times', ad_type: 'Box', total_amount: 125000, status: 'pending', created_at: '2026-02-05' },
            { id: 3, quotation_number: 'QM-2026-1232', customer: 'Sarah Fernando', newspaper: 'Lankadeepa', ad_type: 'Classified', total_amount: 12500, status: 'published', created_at: '2026-02-04' },
            { id: 4, quotation_number: 'QM-2026-1231', customer: 'Tech Solutions', newspaper: 'Daily Mirror', ad_type: 'Box', total_amount: 75000, status: 'pending', created_at: '2026-02-04' },
            { id: 5, quotation_number: 'QM-2026-1230', customer: 'Maria Perera', newspaper: 'Dinamina', ad_type: 'Classified', total_amount: 8500, status: 'paid', created_at: '2026-02-03' }
        ];
        
        // Apply filters
        if (statusFilter) {
            quotations = quotations.filter(q => q.status === statusFilter);
        }
        
        tbody.innerHTML = quotations.map(q => `
            <tr>
                <td><strong>${q.quotation_number}</strong></td>
                <td>${q.customer}</td>
                <td>${q.newspaper}</td>
                <td>${q.ad_type}</td>
                <td>${formatCurrency(q.total_amount)}</td>
                <td><span class="status-badge ${q.status}">${q.status}</span></td>
                <td>${formatDate(q.created_at)}</td>
                <td>
                    <div class="actions-group">
                        <button class="action-btn" onclick="viewQuotation(${q.id})" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="action-btn" onclick="sendInvoice('${q.quotation_number}', '${q.customer}')" title="Send Invoice">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        if (quotations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">No quotations found</td></tr>';
        }
        
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
    const methodFilter = document.getElementById('paymentMethodFilter').value;
    const statusFilter = document.getElementById('paymentStatusFilter').value;
    
    tbody.innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';
    
    try {
        // Demo data
        let payments = [
            { id: 1, quotation_number: 'QM-2026-1234', customer: 'John Silva', amount: 45000, method: 'card', reference: 'pi_3abc123', status: 'completed', created_at: '2026-02-05' },
            { id: 2, quotation_number: 'QM-2026-1230', customer: 'Maria Perera', amount: 8500, method: 'bank', reference: 'BT123456', status: 'completed', created_at: '2026-02-04' },
            { id: 3, quotation_number: 'QM-2026-1228', customer: 'David Kumar', amount: 32000, method: 'card', reference: 'pi_3def456', status: 'completed', created_at: '2026-02-04' },
            { id: 4, quotation_number: 'QM-2026-1233', customer: 'ABC Corp', amount: 125000, method: 'bank', reference: '-', status: 'pending', created_at: '2026-02-05' },
            { id: 5, quotation_number: 'QM-2026-1231', customer: 'Tech Solutions', amount: 75000, method: 'bank', reference: '-', status: 'pending', created_at: '2026-02-04' }
        ];
        
        // Apply filters
        if (methodFilter) {
            payments = payments.filter(p => p.method === methodFilter);
        }
        if (statusFilter) {
            payments = payments.filter(p => p.status === statusFilter);
        }
        
        tbody.innerHTML = payments.map(p => `
            <tr>
                <td><strong>#${p.id}</strong></td>
                <td>${p.quotation_number}</td>
                <td>${p.customer}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${p.method === 'card' ? 'Card' : 'Bank Transfer'}</td>
                <td>${p.reference}</td>
                <td><span class="status-badge ${p.status}">${p.status}</span></td>
                <td>${formatDate(p.created_at)}</td>
                <td>
                    <div class="actions-group">
                        ${p.status === 'pending' ? `
                            <button class="action-btn" onclick="confirmPayment(${p.id})" title="Confirm Payment">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading">No payments found</td></tr>';
        }
        
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
        let allPubs = [];
        
        // Get publications from config
        Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
            if (!groupFilter || groupFilter === groupId) {
                group.newspapers.forEach(paper => {
                    allPubs.push({
                        ...paper,
                        group: groupId,
                        groupName: group.name
                    });
                });
            }
        });
        
        grid.innerHTML = allPubs.map(pub => `
            <div class="pub-card">
                <div class="pub-card-header">
                    <div>
                        <h4>${pub.name}</h4>
                        <span class="language-badge">${pub.language}</span>
                    </div>
                </div>
                <div class="pub-rates">
                    <div class="rate-row">
                        <span>Box Ad Rate:</span>
                        <strong>${formatCurrency(pub.boxRate)}/sq cm</strong>
                    </div>
                    <div class="rate-row">
                        <span>Classified Rate:</span>
                        <strong>${formatCurrency(pub.classifiedRate)}/word</strong>
                    </div>
                    <div class="rate-row">
                        <span>Color Multiplier:</span>
                        <strong>×${pub.colorMultiplier}</strong>
                    </div>
                </div>
                <div class="pub-card-actions">
                    <button class="btn btn-ghost" onclick="editPublication('${pub.id}')">Edit</button>
                </div>
            </div>
        `).join('');
        
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
    const searchQuery = document.getElementById('customerSearch').value;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';
    
    try {
        // Demo data
        let customers = [
            { id: 1, name: 'John Silva', company: 'Silva Enterprises', email: 'john@silva.lk', phone: '+94 77 123 4567', orders: 5, spent: 245000 },
            { id: 2, name: 'ABC Corp', company: 'ABC Corporation', email: 'ads@abc.lk', phone: '+94 11 234 5678', orders: 12, spent: 890000 },
            { id: 3, name: 'Sarah Fernando', company: '-', email: 'sarah.f@email.com', phone: '+94 76 987 6543', orders: 3, spent: 45000 },
            { id: 4, name: 'Tech Solutions', company: 'Tech Solutions Ltd', email: 'marketing@techsol.lk', phone: '+94 11 567 8901', orders: 8, spent: 520000 },
            { id: 5, name: 'Maria Perera', company: 'Perera & Co', email: 'maria@pereraco.lk', phone: '+94 75 234 5678', orders: 2, spent: 32000 }
        ];
        
        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            customers = customers.filter(c => 
                c.name.toLowerCase().includes(query) ||
                c.company.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query)
            );
        }
        
        tbody.innerHTML = customers.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.company}</td>
                <td>${c.email}</td>
                <td>${c.phone}</td>
                <td>${c.orders}</td>
                <td>${formatCurrency(c.spent)}</td>
                <td>
                    <div class="actions-group">
                        <button class="action-btn" onclick="viewCustomer(${c.id})" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No customers found</td></tr>';
        }
        
    } catch (error) {
        console.error('Error loading customers:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading data</td></tr>';
    }
}

/**
 * View quotation details
 */
function viewQuotation(id) {
    const modal = document.getElementById('viewQuotationModal');
    const details = document.getElementById('quotationDetails');
    
    // Demo data - in production, fetch from database
    details.innerHTML = `
        <h2>Quotation QM-2026-1234</h2>
        <div class="quotation-meta">
            <span class="status-badge paid">Paid</span>
            <span>Created: Feb 5, 2026</span>
        </div>
        <div class="quotation-info">
            <h4>Customer</h4>
            <p><strong>John Silva</strong><br>
            john@silva.lk<br>
            +94 77 123 4567</p>
        </div>
        <div class="quotation-info">
            <h4>Ad Details</h4>
            <p><strong>Newspaper:</strong> Daily News<br>
            <strong>Type:</strong> Box Advertisement<br>
            <strong>Size:</strong> 10 × 15 cm (150 sq cm)<br>
            <strong>Color:</strong> Full Color<br>
            <strong>Publication Date:</strong> Feb 10, 2026</p>
        </div>
        <div class="quotation-total">
            <span>Total Amount:</span>
            <strong>${formatCurrency(45000)}</strong>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .quotation-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            color: #64748b;
        }
        .quotation-info {
            margin-bottom: 1.5rem;
        }
        .quotation-info h4 {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 0.5rem;
        }
        .quotation-total {
            display: flex;
            justify-content: space-between;
            padding: 1rem;
            background: #f1f5f9;
            border-radius: 0.5rem;
            font-size: 1.125rem;
        }
        .quotation-total strong { color: #1a56db; }
    `;
    if (!document.getElementById('quotation-modal-styles')) {
        style.id = 'quotation-modal-styles';
        document.head.appendChild(style);
    }
    
    modal.classList.add('active');
}

/**
 * Send invoice
 */
function sendInvoice(quotationNumber, customerName) {
    document.getElementById('invoiceQuoteNum').textContent = quotationNumber;
    document.getElementById('invoiceEmail').value = 'customer@email.com'; // Would come from database
    document.getElementById('sendInvoiceModal').classList.add('active');
}

/**
 * Handle send invoice
 */
async function handleSendInvoice() {
    const email = document.getElementById('invoiceEmail').value;
    const message = document.getElementById('invoiceMessage').value;
    
    try {
        // In production, send actual email
        showToast('Invoice sent successfully!', 'success');
        document.getElementById('sendInvoiceModal').classList.remove('active');
    } catch (error) {
        showToast('Failed to send invoice', 'error');
    }
}

/**
 * Confirm payment
 */
async function confirmPayment(paymentId) {
    if (!confirm('Confirm this payment as received?')) return;
    
    try {
        // In production, update database
        showToast('Payment confirmed!', 'success');
        loadPayments();
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
        amount: document.getElementById('paymentAmount').value,
        method: document.getElementById('paymentMethodSelect').value,
        reference: document.getElementById('paymentReference').value,
        notes: document.getElementById('paymentNotes').value
    };
    
    try {
        // In production, save to database
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
 * Edit publication
 */
function editPublication(pubId) {
    // Find publication in config
    let pub = null;
    Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
        const found = group.newspapers.find(p => p.id === pubId);
        if (found) {
            pub = { ...found, group: groupId };
        }
    });
    
    if (!pub) return;
    
    document.getElementById('pubModalTitle').textContent = 'Edit Publication';
    document.getElementById('pubId').value = pub.id;
    document.getElementById('pubGroup').value = pub.group;
    document.getElementById('pubName').value = pub.name;
    document.getElementById('pubLanguage').value = pub.language;
    document.getElementById('pubBoxRate').value = pub.boxRate;
    document.getElementById('pubClassifiedRate').value = pub.classifiedRate;
    document.getElementById('pubColorMultiplier').value = pub.colorMultiplier;
    
    document.getElementById('publicationModal').classList.add('active');
}

/**
 * Handle publication save
 */
async function handlePublicationSave(e) {
    e.preventDefault();
    
    const data = {
        id: document.getElementById('pubId').value,
        group: document.getElementById('pubGroup').value,
        name: document.getElementById('pubName').value,
        language: document.getElementById('pubLanguage').value,
        boxRate: parseFloat(document.getElementById('pubBoxRate').value),
        classifiedRate: parseFloat(document.getElementById('pubClassifiedRate').value),
        colorMultiplier: parseFloat(document.getElementById('pubColorMultiplier').value),
        active: document.getElementById('pubActive').checked
    };
    
    try {
        // In production, save to database
        showToast('Publication saved successfully!', 'success');
        document.getElementById('publicationModal').classList.remove('active');
        loadPublications();
    } catch (error) {
        showToast('Failed to save publication', 'error');
    }
}

/**
 * View customer details
 */
function viewCustomer(id) {
    showToast('Customer details view - coming soon!', 'info');
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
function exportToCSV(type) {
    let data = [];
    let filename = '';
    
    if (type === 'quotations') {
        // Demo data
        data = [
            ['Quotation #', 'Customer', 'Newspaper', 'Amount', 'Status', 'Date'],
            ['QM-2026-1234', 'John Silva', 'Daily News', '45000', 'paid', '2026-02-05'],
            ['QM-2026-1233', 'ABC Corp', 'Sunday Times', '125000', 'pending', '2026-02-05']
        ];
        filename = 'quotations.csv';
    } else if (type === 'customers') {
        data = [
            ['Name', 'Company', 'Email', 'Phone', 'Total Orders', 'Total Spent'],
            ['John Silva', 'Silva Enterprises', 'john@silva.lk', '+94 77 123 4567', '5', '245000'],
            ['ABC Corp', 'ABC Corporation', 'ads@abc.lk', '+94 11 234 5678', '12', '890000']
        ];
        filename = 'customers.csv';
    }
    
    const csv = data.map(row => row.join(',')).join('\n');
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

// Make functions globally available
window.viewQuotation = viewQuotation;
window.sendInvoice = sendInvoice;
window.confirmPayment = confirmPayment;
window.editPublication = editPublication;
window.viewCustomer = viewCustomer;
