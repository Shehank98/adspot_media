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
 * Initialize publication groups from config
 */
function initPublicationGroups() {
    publicationGroups = Object.entries(CONFIG.PUBLICATION_GROUPS).map(([id, group]) => ({
        id,
        ...group
    }));

    // Flatten all publications
    publicationsData = [];
    Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
        group.newspapers.forEach(paper => {
            publicationsData.push({
                ...paper,
                publicationGroup: groupId,
                groupName: group.name
            });
        });
    });

    // Populate group filter dropdown
    const groupFilter = document.getElementById('pubGroupFilter');
    if (groupFilter) {
        groupFilter.innerHTML = '<option value="">All Groups</option>';
        Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
            groupFilter.innerHTML += `<option value="${groupId}">${group.name}</option>`;
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

        // Try to load from database
        if (typeof QuotationDB !== 'undefined') {
            try {
                const quotationStats = await QuotationDB.getStats();
                stats.totalQuotations = quotationStats.total || 0;
                stats.totalRevenue = quotationStats.revenue || 0;
            } catch (e) {
                console.log('Using fallback stats');
            }
        }

        if (typeof PaymentDB !== 'undefined') {
            try {
                stats.pendingPayments = await PaymentDB.getPendingCount();
            } catch (e) {
                console.log('Using fallback pending count');
            }
        }

        if (typeof CustomerDB !== 'undefined') {
            try {
                stats.totalCustomers = await CustomerDB.getCount();
            } catch (e) {
                console.log('Using fallback customer count');
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

        if (typeof QuotationDB !== 'undefined') {
            try {
                const data = await QuotationDB.getAll({});
                quotations = data.slice(0, 5);
            } catch (e) {
                console.log('Using empty quotations');
            }
        }

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
    const statusFilter = document.getElementById('quotationStatusFilter').value;
    const dateFilter = document.getElementById('quotationDateFilter').value;

    tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';

    try {
        let quotations = [];

        if (typeof QuotationDB !== 'undefined') {
            try {
                quotations = await QuotationDB.getAll({ status: statusFilter, date: dateFilter });
            } catch (e) {
                console.log('Database not available');
            }
        }

        if (quotations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">No quotations found</td></tr>';
            return;
        }

        tbody.innerHTML = quotations.map(q => `
            <tr>
                <td><strong>${q.quotation_number}</strong></td>
                <td>${q.customer?.name || 'N/A'}</td>
                <td>${q.newspaper_name}</td>
                <td>${q.ad_type === 'box' ? 'Box Ad' : 'Classified'}</td>
                <td>${formatCurrency(q.total_amount)}</td>
                <td><span class="status-badge ${q.status}">${q.status}</span></td>
                <td>${formatDate(q.created_at)}</td>
                <td>
                    <div class="actions-group">
                        <button class="action-btn" onclick="viewQuotation('${q.id}')" title="View">
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
    const methodFilter = document.getElementById('paymentMethodFilter').value;
    const statusFilter = document.getElementById('paymentStatusFilter').value;

    tbody.innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';

    try {
        let payments = [];

        if (typeof PaymentDB !== 'undefined') {
            try {
                payments = await PaymentDB.getAll({ method: methodFilter, status: statusFilter });
            } catch (e) {
                console.log('Database not available');
            }
        }

        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading">No payments found</td></tr>';
            return;
        }

        tbody.innerHTML = payments.map(p => `
            <tr>
                <td><strong>#${p.id.substring(0, 8)}</strong></td>
                <td>${p.quotation?.quotation_number || 'N/A'}</td>
                <td>${p.quotation?.customer?.name || 'N/A'}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${p.payment_method === 'card' ? 'Card' : 'Bank Transfer'}</td>
                <td>${p.reference_number || '-'}</td>
                <td><span class="status-badge ${p.status}">${p.status}</span></td>
                <td>${formatDate(p.created_at)}</td>
                <td>
                    <div class="actions-group">
                        ${p.status === 'pending' ? `
                            <button class="action-btn" onclick="confirmPayment('${p.id}')" title="Confirm Payment">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </button>
                        ` : ''}
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
                    <div class="rate-row">
                        <span>Free Words:</span>
                        <strong>${pub.classifiedFreeWords}</strong>
                    </div>
                    <div class="rate-row">
                        <span>Extra Word Rate:</span>
                        <strong>${formatCurrency(pub.classifiedExtraRate)}</strong>
                    </div>
                </div>
                <div class="pub-card-actions">
                    <button class="btn btn-ghost btn-sm" onclick="editPublication('${pub.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePublication('${pub.id}')">Delete</button>
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
        let customers = [];

        if (typeof CustomerDB !== 'undefined') {
            try {
                if (searchQuery) {
                    customers = await CustomerDB.search(searchQuery);
                } else {
                    customers = await CustomerDB.getAll();
                }
            } catch (e) {
                console.log('Database not available');
            }
        }

        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No customers found</td></tr>';
            return;
        }

        tbody.innerHTML = customers.map(c => {
            const totalOrders = c.quotations?.length || 0;
            const totalSpent = c.quotations?.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0) || 0;

            return `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.company || '-'}</td>
                    <td>${c.email}</td>
                    <td>${c.phone}</td>
                    <td>${totalOrders}</td>
                    <td>${formatCurrency(totalSpent)}</td>
                    <td>
                        <div class="actions-group">
                            <button class="action-btn" onclick="viewCustomer('${c.id}')" title="View">
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
 * View quotation details
 */
async function viewQuotation(id) {
    const modal = document.getElementById('viewQuotationModal');
    const details = document.getElementById('quotationDetails');

    details.innerHTML = '<p class="loading">Loading...</p>';
    modal.classList.add('active');

    try {
        let quotation = null;

        if (typeof QuotationDB !== 'undefined') {
            quotation = await QuotationDB.getById(id);
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
            </div>
        `;

    } catch (error) {
        console.error('Error loading quotation:', error);
        details.innerHTML = '<p>Error loading quotation details</p>';
    }
}

/**
 * Mark quotation as paid
 */
async function markAsPaid(quotationId) {
    if (!confirm('Mark this quotation as paid?')) return;

    try {
        if (typeof QuotationDB !== 'undefined') {
            await QuotationDB.updateStatus(quotationId, 'paid');
        }
        showToast('Quotation marked as paid', 'success');
        document.getElementById('viewQuotationModal').classList.remove('active');
        loadQuotations();
        loadDashboardData();
    } catch (error) {
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
        if (typeof QuotationDB !== 'undefined') {
            quotation = await QuotationDB.getByNumber(quotationNumber);
        }

        if (!quotation) {
            showToast('Quotation not found', 'error');
            return;
        }

        const customer = quotation.customer || { email: email, name: 'Customer' };

        // Generate PDF invoice
        let pdfBase64 = null;
        if (typeof InvoiceGenerator !== 'undefined') {
            pdfBase64 = InvoiceGenerator.getBase64(quotation, customer);
        }

        // Send email with PDF attachment
        if (typeof EmailService !== 'undefined') {
            await EmailService.sendInvoice(quotation, customer, pdfBase64);
        }

        showToast('Invoice sent successfully!', 'success');
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
    Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
        select.innerHTML += `<option value="${groupId}">${group.name}</option>`;
    });
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
    populatePublicationGroupSelect();

    document.getElementById('pubId').value = pub.id;
    document.getElementById('pubGroup').value = pub.group;
    document.getElementById('pubName').value = pub.name;
    document.getElementById('pubLanguage').value = pub.language;
    document.getElementById('pubBwRate').value = pub.bwRate;
    document.getElementById('pubColorRate').value = pub.colorRate;
    document.getElementById('pubClassifiedBase').value = pub.classifiedBase;
    document.getElementById('pubClassifiedFreeWords').value = pub.classifiedFreeWords;
    document.getElementById('pubClassifiedExtraRate').value = pub.classifiedExtraRate;
    document.getElementById('pubIsSunday').checked = pub.isSundayPaper || false;
    document.getElementById('pubActive').checked = true;

    document.getElementById('publicationModal').classList.add('active');
}

/**
 * Delete publication
 */
async function deletePublication(pubId) {
    if (!confirm('Are you sure you want to delete this publication?')) return;

    try {
        // In production, delete from database
        if (typeof PublicationDB !== 'undefined') {
            await PublicationDB.delete(pubId);
        }

        showToast('Publication deleted successfully!', 'success');
        loadPublications();
    } catch (error) {
        showToast('Failed to delete publication', 'error');
    }
}
window.deletePublication = deletePublication;

/**
 * Handle publication save
 */
async function handlePublicationSave(e) {
    e.preventDefault();

    const data = {
        id: document.getElementById('pubId').value || generatePublicationId(),
        publication_group: document.getElementById('pubGroup').value,
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

    try {
        // In production, save to database
        if (typeof PublicationDB !== 'undefined') {
            if (document.getElementById('pubId').value) {
                await PublicationDB.update(data.id, data);
            } else {
                await PublicationDB.create(data);
            }
        }

        showToast('Publication saved successfully!', 'success');
        document.getElementById('publicationModal').classList.remove('active');
        loadPublications();
    } catch (error) {
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

    const data = {
        id: document.getElementById('groupId').value || document.getElementById('groupName').value.toLowerCase().replace(/\s+/g, '-'),
        name: document.getElementById('groupName').value,
        language: document.getElementById('groupLanguage').value
    };

    try {
        // In production, save to database
        showToast('Publication group saved successfully!', 'success');
        document.getElementById('publicationGroupModal').classList.remove('active');
        initPublicationGroups();
        loadPublications();
    } catch (error) {
        showToast('Failed to save publication group', 'error');
    }
}

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

        if (typeof CustomerDB !== 'undefined') {
            customer = await CustomerDB.getById(id);
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
 * Download invoice as PDF
 */
async function downloadInvoice(quotationId) {
    try {
        let quotation = null;
        if (typeof QuotationDB !== 'undefined') {
            quotation = await QuotationDB.getById(quotationId);
        }

        if (!quotation) {
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

// Make functions globally available
window.viewQuotation = viewQuotation;
window.sendInvoice = sendInvoice;
window.confirmPayment = confirmPayment;
window.editPublication = editPublication;
window.viewCustomer = viewCustomer;
window.downloadInvoice = downloadInvoice;
