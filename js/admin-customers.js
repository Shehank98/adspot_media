/**
 * Admin Customers Management
 */

let allCustomers = [];
let allBookings = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Check admin access
    checkAdminAccess();

    // Load customers and bookings
    await loadData();

    // Setup search
    document.getElementById('searchInput').addEventListener('input', filterCustomers);
});

/**
 * Check admin access
 */
function checkAdminAccess() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Check if user is admin
        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists || !userDoc.data().isAdmin) {
                alert('Access denied. Admin privileges required.');
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            window.location.href = 'index.html';
        }
    });
}

/**
 * Load all customers and bookings data
 */
async function loadData() {
    try {
        // Load all bookings
        const bookingsSnapshot = await firebase.firestore()
            .collection('bookings')
            .orderBy('createdAt', 'desc')
            .get();

        allBookings = [];
        bookingsSnapshot.forEach(doc => {
            allBookings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Group bookings by customer email
        const customerMap = new Map();

        allBookings.forEach(booking => {
            const email = booking.customerEmail?.toLowerCase() || 'unknown';

            if (!customerMap.has(email)) {
                customerMap.set(email, {
                    name: booking.customerName || 'Unknown',
                    email: booking.customerEmail || 'Unknown',
                    phone: booking.customerPhone || '-',
                    company: booking.customerCompany || '-',
                    bookings: [],
                    totalSpent: 0,
                    firstBooking: null,
                    lastBooking: null
                });
            }

            const customer = customerMap.get(email);
            customer.bookings.push(booking);
            customer.totalSpent += booking.totalAmount || 0;

            const bookingDate = booking.createdAt?.toDate();
            if (bookingDate) {
                if (!customer.firstBooking || bookingDate < customer.firstBooking) {
                    customer.firstBooking = bookingDate;
                }
                if (!customer.lastBooking || bookingDate > customer.lastBooking) {
                    customer.lastBooking = bookingDate;
                }
            }
        });

        // Convert map to array and sort by total spent
        allCustomers = Array.from(customerMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent);

        // Update stats
        updateStats();

        // Render customers table
        renderCustomersTable();

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('customersTableBody').innerHTML =
            '<tr><td colspan="6" style="text-align: center; color: var(--error);">Error loading customers</td></tr>';
    }
}

/**
 * Update statistics cards
 */
function updateStats() {
    // Total customers
    document.getElementById('totalCustomers').textContent = allCustomers.length.toLocaleString();

    // Total bookings
    document.getElementById('totalBookings').textContent = allBookings.length.toLocaleString();

    // Total revenue - use shorter format for large numbers
    const totalRevenue = allCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    document.getElementById('totalRevenue').textContent = formatStatCurrency(totalRevenue);

    // New customers this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = allCustomers.filter(customer =>
        customer.firstBooking && customer.firstBooking >= firstDayOfMonth
    ).length;
    document.getElementById('newCustomers').textContent = newThisMonth.toLocaleString();
}

/**
 * Render customers table
 */
function renderCustomersTable(customers = allCustomers) {
    const tbody = document.getElementById('customersTableBody');
    const emptyState = document.getElementById('emptyState');

    if (customers.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = customers.map(customer => {
        const lastBooking = customer.lastBooking
            ? formatDate(customer.lastBooking)
            : '-';

        return `
            <tr>
                <td>
                    <div class="customer-info">
                        <span class="customer-name">${customer.name}</span>
                        <span class="customer-email">${customer.email}</span>
                    </div>
                </td>
                <td class="customer-phone">${customer.phone}</td>
                <td>
                    <span class="badge badge-primary">${customer.bookings.length} ads</span>
                </td>
                <td>
                    <strong>${formatCurrency(customer.totalSpent)}</strong>
                </td>
                <td>${lastBooking}</td>
                <td>
                    <button class="btn-view" onclick="viewCustomerByEmail('${customer.email.replace(/'/g, "\\'")}')">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filter customers by search query
 */
function filterCustomers() {
    const query = document.getElementById('searchInput').value.toLowerCase();

    if (!query) {
        renderCustomersTable(allCustomers);
        return;
    }

    const filtered = allCustomers.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.phone.includes(query)
    );

    renderCustomersTable(filtered);
}

/**
 * View customer by email (helper for onclick)
 */
function viewCustomerByEmail(email) {
    const customer = allCustomers.find(c => c.email === email);
    if (customer) {
        viewCustomer(customer);
    } else {
        alert('Customer not found');
    }
}

/**
 * View customer details in modal
 */
function viewCustomer(customer) {
    // Update modal content
    document.getElementById('modalCustomerName').textContent = customer.name;
    document.getElementById('modalEmail').textContent = customer.email;
    document.getElementById('modalPhone').textContent = customer.phone;
    document.getElementById('modalCompany').textContent = customer.company;
    document.getElementById('modalTotalBookings').textContent = customer.bookings.length;
    document.getElementById('modalTotalSpent').textContent = formatCurrency(customer.totalSpent);
    document.getElementById('modalFirstBooking').textContent = customer.firstBooking
        ? formatDate(customer.firstBooking)
        : '-';
    document.getElementById('modalLastBooking').textContent = customer.lastBooking
        ? formatDate(customer.lastBooking)
        : '-';

    // Render recent bookings (last 5)
    const recentBookings = customer.bookings.slice(0, 5);
    const bookingsHtml = recentBookings.map(booking => `
        <div class="booking-item">
            <div class="booking-header">
                <span class="booking-number">${booking.quotationNumber || booking.invoiceNumber || 'N/A'}</span>
                <span class="booking-date">${formatDate(booking.createdAt?.toDate())}</span>
            </div>
            <div class="booking-details">
                ${booking.items?.length || 0} ad(s) • ${formatCurrency(booking.totalAmount || 0)}
                ${booking.promoCode ? ` • Promo: ${booking.promoCode}` : ''}
            </div>
        </div>
    `).join('');

    document.getElementById('modalRecentBookings').innerHTML = bookingsHtml || '<p style="color: var(--gray-500); font-size: 14px;">No bookings</p>';

    // Show modal
    document.getElementById('customerModal').classList.add('active');
}

/**
 * Close customer modal
 */
function closeCustomerModal() {
    document.getElementById('customerModal').classList.remove('active');
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return 'Rs. ' + (amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format currency for stats (more compact for large numbers)
 */
function formatStatCurrency(amount) {
    if (amount >= 1000000) {
        return 'Rs. ' + (amount / 1000000).toFixed(2) + 'M';
    } else if (amount >= 1000) {
        return 'Rs. ' + (amount / 1000).toFixed(1) + 'K';
    } else {
        return 'Rs. ' + amount.toFixed(2);
    }
}

/**
 * Format date
 */
function formatDate(date) {
    if (!date) return '-';

    const d = date instanceof Date ? date : new Date(date);

    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
