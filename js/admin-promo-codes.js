/**
 * Admin Promo Codes Management
 */

let editingPromoId = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check admin access
    checkAdminAccess();

    // Load promo codes
    loadPromoCodes();

    // Setup form
    document.getElementById('promoForm').addEventListener('submit', savePromoCode);
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
 * Load all promo codes
 */
async function loadPromoCodes() {
    const container = document.getElementById('promoCodesContainer');
    const emptyState = document.getElementById('emptyState');

    try {
        const snapshot = await firebase.firestore()
            .collection('promoCodes')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        const promoCodes = [];
        snapshot.forEach(doc => {
            promoCodes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        container.innerHTML = promoCodes.map(promo => renderPromoCard(promo)).join('');

    } catch (error) {
        console.error('Error loading promo codes:', error);
        container.innerHTML = '<p style="color: var(--error); text-align: center;">Error loading promo codes</p>';
    }
}

/**
 * Render promo code card
 */
function renderPromoCard(promo) {
    const now = new Date();
    let status = 'active';
    let statusText = 'Active';

    if (!promo.active) {
        status = 'inactive';
        statusText = 'Inactive';
    } else if (promo.validUntil && now > promo.validUntil.toDate()) {
        status = 'expired';
        statusText = 'Expired';
    } else if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        status = 'inactive';
        statusText = 'Usage Limit Reached';
    }

    const validFrom = promo.validFrom ? formatDate(promo.validFrom.toDate()) : 'No start date';
    const validUntil = promo.validUntil ? formatDate(promo.validUntil.toDate()) : 'No end date';

    const discountDisplay = promo.type === 'percentage'
        ? `${promo.discount}%`
        : `Rs. ${promo.discount.toFixed(2)}`;

    const usageDisplay = promo.maxUses
        ? `${promo.usedCount || 0} / ${promo.maxUses}`
        : `${promo.usedCount || 0} / Unlimited`;

    return `
        <div class="promo-card ${status === 'inactive' || status === 'expired' ? 'inactive' : ''}">
            <div class="promo-card-header">
                <div class="promo-code">${promo.id}</div>
                <span class="promo-status ${status}">${statusText}</span>
            </div>
            <div class="promo-details">
                <div class="promo-detail-row">
                    <span class="promo-detail-label">Name</span>
                    <span class="promo-detail-value">${promo.name}</span>
                </div>
                <div class="promo-detail-row">
                    <span class="promo-detail-label">Discount</span>
                    <span class="promo-detail-value">${discountDisplay} ${promo.type === 'percentage' ? 'off' : 'discount'}</span>
                </div>
                <div class="promo-detail-row">
                    <span class="promo-detail-label">Valid Period</span>
                    <span class="promo-detail-value">${validFrom} - ${validUntil}</span>
                </div>
                <div class="promo-detail-row">
                    <span class="promo-detail-label">Usage</span>
                    <span class="promo-detail-value">${usageDisplay} times</span>
                </div>
            </div>
            <div class="promo-card-actions">
                <button class="btn-sm btn-edit" onclick="editPromo('${promo.id}')">Edit</button>
                <button class="btn-sm btn-toggle" onclick="togglePromo('${promo.id}', ${!promo.active})">
                    ${promo.active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn-sm btn-delete" onclick="deletePromo('${promo.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

/**
 * Open create modal
 */
function openCreateModal() {
    editingPromoId = null;
    document.getElementById('modalTitle').textContent = 'Create Promo Code';
    document.getElementById('promoForm').reset();
    document.getElementById('promoActive').checked = true;
    document.getElementById('promoModal').classList.add('active');
}

/**
 * Edit promo code
 */
async function editPromo(promoId) {
    editingPromoId = promoId;

    try {
        const doc = await firebase.firestore().collection('promoCodes').doc(promoId).get();

        if (!doc.exists) {
            alert('Promo code not found');
            return;
        }

        const promo = doc.data();

        document.getElementById('modalTitle').textContent = 'Edit Promo Code';
        document.getElementById('promoCodeInput').value = promoId;
        document.getElementById('promoCodeInput').disabled = true; // Can't change code when editing
        document.getElementById('promoName').value = promo.name;
        document.querySelector(`input[name="discountType"][value="${promo.type}"]`).checked = true;
        document.getElementById('promoDiscount').value = promo.discount;

        if (promo.validFrom) {
            document.getElementById('promoValidFrom').value = formatDateTimeLocal(promo.validFrom.toDate());
        }
        if (promo.validUntil) {
            document.getElementById('promoValidUntil').value = formatDateTimeLocal(promo.validUntil.toDate());
        }
        if (promo.maxUses) {
            document.getElementById('promoMaxUses').value = promo.maxUses;
        }

        document.getElementById('promoActive').checked = promo.active;

        document.getElementById('promoModal').classList.add('active');

    } catch (error) {
        console.error('Error loading promo code:', error);
        alert('Error loading promo code');
    }
}

/**
 * Save promo code
 */
async function savePromoCode(e) {
    e.preventDefault();

    const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    const name = document.getElementById('promoName').value.trim();
    const type = document.querySelector('input[name="discountType"]:checked').value;
    const discount = parseFloat(document.getElementById('promoDiscount').value);
    const validFromStr = document.getElementById('promoValidFrom').value;
    const validUntilStr = document.getElementById('promoValidUntil').value;
    const maxUses = document.getElementById('promoMaxUses').value ? parseInt(document.getElementById('promoMaxUses').value) : null;
    const active = document.getElementById('promoActive').checked;

    // Validation
    if (!code || !name || !discount) {
        alert('Please fill in all required fields');
        return;
    }

    if (type === 'percentage' && (discount < 0 || discount > 100)) {
        alert('Percentage discount must be between 0 and 100');
        return;
    }

    if (type === 'fixed' && discount < 0) {
        alert('Fixed discount must be a positive number');
        return;
    }

    const promoData = {
        name: name,
        type: type,
        discount: discount,
        active: active,
        validFrom: validFromStr ? firebase.firestore.Timestamp.fromDate(new Date(validFromStr)) : null,
        validUntil: validUntilStr ? firebase.firestore.Timestamp.fromDate(new Date(validUntilStr)) : null,
        maxUses: maxUses,
        usedCount: 0
    };

    try {
        if (editingPromoId) {
            // Update existing
            await firebase.firestore().collection('promoCodes').doc(editingPromoId).update({
                ...promoData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Promo code updated successfully!');
        } else {
            // Create new
            // Check if code already exists
            const existing = await firebase.firestore().collection('promoCodes').doc(code).get();
            if (existing.exists) {
                alert('A promo code with this code already exists. Please use a different code.');
                return;
            }

            await firebase.firestore().collection('promoCodes').doc(code).set({
                ...promoData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Promo code created successfully!');
        }

        closeModal();
        loadPromoCodes();

    } catch (error) {
        console.error('Error saving promo code:', error);
        alert('Error saving promo code: ' + error.message);
    }
}

/**
 * Toggle promo code active status
 */
async function togglePromo(promoId, newStatus) {
    if (!confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this promo code?`)) {
        return;
    }

    try {
        await firebase.firestore().collection('promoCodes').doc(promoId).update({
            active: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        loadPromoCodes();
        alert(`Promo code ${newStatus ? 'activated' : 'deactivated'} successfully!`);

    } catch (error) {
        console.error('Error toggling promo code:', error);
        alert('Error updating promo code');
    }
}

/**
 * Delete promo code
 */
async function deletePromo(promoId) {
    if (!confirm('Are you sure you want to delete this promo code? This action cannot be undone.')) {
        return;
    }

    try {
        await firebase.firestore().collection('promoCodes').doc(promoId).delete();
        loadPromoCodes();
        alert('Promo code deleted successfully!');

    } catch (error) {
        console.error('Error deleting promo code:', error);
        alert('Error deleting promo code');
    }
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('promoModal').classList.remove('active');
    document.getElementById('promoForm').reset();
    document.getElementById('promoCodeInput').disabled = false;
    editingPromoId = null;
}

/**
 * Format date
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format datetime for input
 */
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
