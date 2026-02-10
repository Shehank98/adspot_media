/**
 * AdSpot - Booking Page JavaScript
 * Multi-step form with ad cart system and column-based calculations
 * Box Ad: Height (cm) x Column Width (cm) x Rate + 10% Commission
 * Classified: Base price + Extra words + Rs. 100 Service Charge
 */

let currentStep = 1;
let selectedNewspaper = null;
let adCart = [];
let stripe = null;
let cardElement = null;
let pendingNewspaperAdd = null;
let db = null;
let auth = null;

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "adspot-media.firebaseapp.com",
    projectId: "adspot-media",
    storageBucket: "adspot-media.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:xxxxxxxxxxxxx"
};

// Check if Firebase is loaded
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.warn('Firebase initialization skipped:', error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initAllNewspapers();
    initBookingForm();
    initStripe();
    setMinDate();
    initFirebaseAuth();

    // Check URL params for ad type
    const urlParams = new URLSearchParams(window.location.search);
    const adType = urlParams.get('type');
    if (adType) {
        const radio = document.querySelector(`input[name="adType"][value="${adType}"]`);
        if (radio) {
            radio.checked = true;
            toggleAdOptions();
        }
    }
});

/**
 * Initialize all newspapers from Firebase or config
 */
async function initAllNewspapers() {
    const container = document.getElementById('newspaperSelect');
    if (!container) return;

    let allNewspapers = [];

    // Try to load from Firebase first
    if (db) {
        try {
            const snapshot = await db.collection('newspapers')
                .where('isActive', '==', true)
                .get();

            if (!snapshot.empty) {
                allNewspapers = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('Loaded newspapers from Firebase:', allNewspapers.length);
            }
        } catch (error) {
            console.warn('Failed to load from Firebase, using config:', error);
        }
    }

    // Fallback to config if Firebase fails or is empty
    if (allNewspapers.length === 0) {
        allNewspapers = getAllNewspapers();
    }

    renderNewspapers(allNewspapers);
}

/**
 * Render newspapers to the selection grid
 */
function renderNewspapers(newspapers) {
    const container = document.getElementById('newspaperSelect');
    const adType = document.querySelector('input[name="adType"]:checked')?.value || 'box';

    // Filter based on ad type
    let filtered = newspapers;
    if (adType === 'classified') {
        filtered = newspapers.filter(n => n.classifiedBase > 0 && n.classifiedFreeWords > 0);
    }

    const langLabels = {
        'english': 'EN',
        'sinhala': 'SI',
        'tamil': 'TA',
        'all': 'ALL'
    };

    if (filtered.length === 0) {
        container.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--gray-500);">No newspapers available for classified ads. Please select Box Ad type.</p>';
        return;
    }

    container.innerHTML = filtered.map((paper, index) => {
        const isUnavailable = adType === 'classified' && (!paper.classifiedBase || paper.classifiedBase === 0);

        return `
            <div class="newspaper-card-wrapper" data-newspaper-id="${paper.id}">
                <div class="newspaper-card ${isUnavailable ? 'unavailable' : ''}" onclick="selectNewspaper('${paper.id}')">
                    <div class="card-content">
                        <span class="lang-badge">${langLabels[paper.language?.toLowerCase()] || 'EN'}</span>
                        <span class="paper-name">${paper.name}</span>
                        ${!isUnavailable ? `
                            <span class="paper-rate">From Rs. ${paper.bwRate}/sq cm</span>
                            ${paper.isSundayPaper ? '<span class="sunday-badge">Sunday</span>' : ''}
                        ` : '<span class="unavailable-badge">Classified not available</span>'}
                    </div>
                </div>
                ${!isUnavailable ? `
                    <button type="button" class="btn btn-primary btn-sm add-paper-btn" onclick="handleAddPaper('${paper.id}')">
                        Add to Cart
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    // Select first available newspaper
    if (filtered.length > 0) {
        selectNewspaper(filtered[0].id);
    }
}

/**
 * Select a newspaper
 */
function selectNewspaper(newspaperId) {
    // Remove active class from all cards
    document.querySelectorAll('.newspaper-card').forEach(card => {
        card.classList.remove('active');
    });

    // Add active class to selected card
    const selectedWrapper = document.querySelector(`.newspaper-card-wrapper[data-newspaper-id="${newspaperId}"]`);
    if (selectedWrapper) {
        const card = selectedWrapper.querySelector('.newspaper-card');
        if (card) {
            card.classList.add('active');
        }
    }

    // Find newspaper in config
    selectedNewspaper = getNewspaperById(newspaperId);

    if (selectedNewspaper) {
        updatePreviewPanel();
        updatePrice();
    }
}
window.selectNewspaper = selectNewspaper;

/**
 * Handle add paper button click
 */
function handleAddPaper(newspaperId) {
    // First select the newspaper
    selectNewspaper(newspaperId);

    // Then open date picker
    openDatePicker(newspaperId);
}
window.handleAddPaper = handleAddPaper;

/**
 * Firebase Authentication
 */
function initFirebaseAuth() {
    if (!auth) return;

    auth.onAuthStateChanged((user) => {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');

        if (user) {
            // User signed in
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userName) userName.textContent = user.displayName || user.email;

            // Pre-fill form
            const nameField = document.getElementById('customerName');
            const emailField = document.getElementById('customerEmail');
            if (nameField && !nameField.value) nameField.value = user.displayName || '';
            if (emailField && !emailField.value) emailField.value = user.email || '';
        } else {
            // User signed out
            if (loginBtn) loginBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
        }
    });
}

function signInWithGoogle() {
    if (!auth) {
        showNotification('Authentication not available', 'error');
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log('Logged in:', result.user.displayName);
            showNotification(`Welcome, ${result.user.displayName}!`, 'success');
        })
        .catch((error) => {
            console.error('Login error:', error);
            showNotification('Login failed. Please try again.', 'error');
        });
}
window.signInWithGoogle = signInWithGoogle;

function signOut() {
    if (!auth) return;

    auth.signOut()
        .then(() => {
            showNotification('Logged out successfully', 'info');
            // Clear pre-filled form data
            document.getElementById('customerName').value = '';
            document.getElementById('customerEmail').value = '';
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}
window.signOut = signOut;

/**
 * Sample Popup Functions
 */
function showSamplePopup(type) {
    const popup = document.getElementById(type + 'AdSamples');
    if (popup) {
        popup.style.display = 'flex';
    }
}
window.showSamplePopup = showSamplePopup;

function hideSamplePopup() {
    document.querySelectorAll('.sample-popup').forEach(p => {
        p.style.display = 'none';
    });
}
window.hideSamplePopup = hideSamplePopup;

/**
 * Date Picker Functions
 */
function openDatePicker(newspaperId) {
    if (!newspaperId) {
        showNotification('Please select a newspaper first', 'warning');
        return;
    }

    pendingNewspaperAdd = newspaperId;

    // Set minimum date to 2 days from now
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    const dateInput = document.getElementById('selectedDate');
    if (dateInput) {
        dateInput.min = minDate.toISOString().split('T')[0];
        dateInput.value = '';
    }

    const modal = document.getElementById('datePickerModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}
window.openDatePicker = openDatePicker;

function closeDatePicker() {
    const modal = document.getElementById('datePickerModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    pendingNewspaperAdd = null;
}
window.closeDatePicker = closeDatePicker;

function confirmAddToCart() {
    const selectedDate = document.getElementById('selectedDate')?.value;
    if (!selectedDate) {
        showNotification('Please select a date', 'warning');
        return;
    }

    // Validate date
    const newspaper = selectedNewspaper;
    if (!newspaper) {
        showNotification('No newspaper selected', 'error');
        closeDatePicker();
        return;
    }

    const validation = validateBookingDate(selectedDate, newspaper);
    if (!validation.isValid) {
        showNotification(validation.errors[0], 'error');
        return;
    }

    // Add to cart with date
    addToCartWithDate(selectedDate);
    closeDatePicker();
}
window.confirmAddToCart = confirmAddToCart;

/**
 * Update preview panel (right sidebar)
 */
function updatePreviewPanel() {
    if (!selectedNewspaper) return;

    const adType = document.querySelector('input[name="adType"]:checked')?.value || 'box';

    // Toggle preview sections
    const boxPreview = document.getElementById('boxAdPreviewSection');
    const classifiedPreview = document.getElementById('classifiedPreviewSection');

    if (adType === 'box') {
        if (boxPreview) boxPreview.style.display = 'block';
        if (classifiedPreview) classifiedPreview.style.display = 'none';
        updateBoxAdPreview();
    } else {
        if (boxPreview) boxPreview.style.display = 'none';
        if (classifiedPreview) classifiedPreview.style.display = 'block';
        updateClassifiedPreview();
    }
}

/**
 * Update box ad preview in right panel
 */
function updateBoxAdPreview() {
    const width = parseFloat(document.getElementById('adWidth')?.value) || 10;
    const height = parseFloat(document.getElementById('adHeight')?.value) || 10;
    const colorOption = document.getElementById('colorOption')?.value || 'bw';

    // Calculate proportional size (max 40cm = 200px)
    const maxPixels = 200;
    const maxSize = 40;
    const pixelWidth = (width / maxSize) * maxPixels;
    const pixelHeight = (height / maxSize) * maxPixels;

    const preview = document.getElementById('adBoxPreview');
    if (preview) {
        preview.style.width = pixelWidth + 'px';
        preview.style.height = pixelHeight + 'px';

        const dimensions = preview.querySelector('.ad-dimensions');
        if (dimensions) {
            dimensions.textContent = `${width} × ${height} cm`;
        }

        // Update color
        if (colorOption === 'color') {
            preview.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
        } else {
            preview.style.background = 'linear-gradient(135deg, #e5e7eb, #9ca3af)';
        }
    }
}

/**
 * Update classified preview in right panel
 */
function updateClassifiedPreview() {
    const text = document.getElementById('classifiedText')?.value || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    const previewText = document.getElementById('classifiedPreviewText');
    const previewWordCount = document.getElementById('previewWordCount');

    if (previewText) {
        previewText.textContent = text || 'Type your ad to see preview...';
    }

    if (previewWordCount) {
        previewWordCount.textContent = words;
    }

    // Also update main word count
    const wordCount = document.getElementById('wordCount');
    if (wordCount) {
        wordCount.textContent = words;
    }
}

/**
 * Initialize booking form
 */
function initBookingForm() {
    // Ad type toggle
    document.querySelectorAll('input[name="adType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            toggleAdOptions();
            updateQuickRates();
            updatePrice();
        });
    });

    // Box ad inputs
    ['adWidth', 'adHeight'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                // Enforce max height
                if (parseFloat(this.value) > CONFIG.MAX_HEIGHT) {
                    this.value = CONFIG.MAX_HEIGHT;
                }
                updatePrice();
                checkFullPage();
                updateBoxAdPreview();
            });
            el.addEventListener('change', function() {
                updatePrice();
                checkFullPage();
                updateBoxAdPreview();
            });
        }
    });

    document.getElementById('colorOption')?.addEventListener('change', function() {
        updatePrice();
        updateBoxAdPreview();
    });

    // Classified text counter
    const classifiedText = document.getElementById('classifiedText');
    if (classifiedText) {
        classifiedText.addEventListener('input', function() {
            updateClassifiedPreview();
            updatePrice();
        });
    }

    // Continue button
    document.getElementById('continueBtn')?.addEventListener('click', () => goToStep(2));

    // Navigation buttons
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', () => goToStep(currentStep + 1));
    });

    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', () => goToStep(currentStep - 1));
    });

    // Form submission
    document.getElementById('bookingForm')?.addEventListener('submit', handleSubmit);

    // Payment method toggle
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', togglePaymentMethod);
    });

    // Full page contact form
    document.getElementById('fullPageContactForm')?.addEventListener('submit', handleFullPageContact);
}

/**
 * Toggle ad type options
 */
function toggleAdOptions() {
    const adType = document.querySelector('input[name="adType"]:checked')?.value || 'box';
    const boxConfig = document.getElementById('boxAdConfig');
    const classifiedConfig = document.getElementById('classifiedConfig');

    if (adType === 'box') {
        if (boxConfig) boxConfig.style.display = 'block';
        if (classifiedConfig) classifiedConfig.style.display = 'none';
        updateBoxAdPreview();
    } else {
        if (boxConfig) boxConfig.style.display = 'none';
        if (classifiedConfig) classifiedConfig.style.display = 'block';
        updateClassifiedPreview();
    }

    // Re-render newspapers to filter based on ad type
    initAllNewspapers();
    updatePreviewPanel();
}

/**
 * Update word count for classified ads
 */
function updateWordCount() {
    updateClassifiedPreview();
    updatePrice();
}

/**
 * Validate selected publication date
 */
function validateSelectedDate() {
    const pubDate = document.getElementById('pubDate');
    const dateWarning = document.getElementById('dateWarning');

    if (!pubDate || !pubDate.value) return;

    const validation = validateBookingDate(pubDate.value, selectedNewspaper);

    if (!validation.isValid) {
        if (dateWarning) {
            dateWarning.innerHTML = validation.errors.map(err => `<p>${err}</p>`).join('');
            dateWarning.style.display = 'block';
        }
        pubDate.classList.add('invalid');
    } else {
        if (dateWarning) {
            dateWarning.style.display = 'none';
        }
        pubDate.classList.remove('invalid');

        // Show Sunday paper warning
        if (selectedNewspaper && selectedNewspaper.isSundayPaper && isSunday(pubDate.value)) {
            if (dateWarning) {
                dateWarning.innerHTML = '<p>This is a Sunday paper. Booking deadline is Friday before the publication date.</p>';
                dateWarning.style.display = 'block';
                dateWarning.classList.add('warning');
            }
        }
    }
}

/**
 * Check if full page ad and show alert
 */
function checkFullPage() {
    const width = parseFloat(document.getElementById('adWidth')?.value) || 10;
    const height = parseFloat(document.getElementById('adHeight')?.value) || 10;
    const alert = document.getElementById('fullPageAlert');

    if (alert) {
        if (isFullPageAd(width, height)) {
            alert.style.display = 'flex';
        } else {
            alert.style.display = 'none';
        }
    }
}


/**
 * Update price calculation
 */
function updatePrice() {
    if (!selectedNewspaper) {
        const priceDetails = document.getElementById('priceDetails');
        if (priceDetails) {
            priceDetails.innerHTML = '<div class="price-row"><span>Select newspaper to see pricing</span></div>';
        }
        return;
    }

    const adType = document.querySelector('input[name="adType"]:checked')?.value || 'box';
    let total = 0;
    let details = [];

    if (adType === 'box') {
        const width = parseFloat(document.getElementById('adWidth')?.value) || 10;
        const height = parseFloat(document.getElementById('adHeight')?.value) || 10;
        const colorOption = document.getElementById('colorOption')?.value || 'bw';

        const area = width * height;
        const rate = colorOption === 'color' ? selectedNewspaper.colorRate : selectedNewspaper.bwRate;
        const adTotal = area * rate;
        const commission = adTotal * CONFIG.CHARGES.boxAdCommission;
        const subtotal = adTotal + commission;
        const vat = subtotal * CONFIG.CHARGES.vatRate;
        total = subtotal + vat;

        details = [
            { label: 'Newspaper', value: selectedNewspaper.name },
            { label: 'Size', value: `${width} x ${height} cm` },
            { label: 'Area', value: `${area.toFixed(1)} sq cm` },
            { label: colorOption === 'color' ? 'Color Rate' : 'B&W Rate', value: `Rs. ${rate}/sq cm` },
            { label: 'Ad Cost', value: formatCurrency(adTotal) },
            { label: 'Commission (10%)', value: formatCurrency(commission) },
            { label: 'VAT (18%)', value: formatCurrency(vat) }
        ];

        // Update preview
        updateBoxAdPreview();
        checkFullPage();
    } else {
        const text = document.getElementById('classifiedText')?.value || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;

        const calc = calculateClassifiedPrice(selectedNewspaper, words);
        total = calc.total;

        details = [
            { label: 'Newspaper', value: selectedNewspaper.name },
            { label: 'Word Count', value: words },
            { label: `Base (${calc.freeWords} words)`, value: formatCurrency(calc.basePrice) }
        ];

        if (calc.extraWords > 0) {
            details.push({ label: `Extra (${calc.extraWords} x Rs. ${calc.extraRate})`, value: formatCurrency(calc.extraCost) });
        }

        details.push({ label: 'Ad Total', value: formatCurrency(calc.adTotal) });
        details.push({ label: 'Service Charge', value: formatCurrency(calc.serviceCharge) });
    }

    // Update price display
    const priceDetails = document.getElementById('priceDetails');
    if (priceDetails) {
        priceDetails.innerHTML = details.map(d => `
            <div class="price-row">
                <span>${d.label}:</span>
                <span>${d.value}</span>
            </div>
        `).join('');
    }

    const totalElement = document.getElementById('currentAdTotal');
    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }

    // Store for cart
    window.currentAdPrice = total;
}

/**
 * Add current ad to cart with date
 */
function addToCartWithDate(pubDate) {
    if (!selectedNewspaper) {
        showNotification('Please select a newspaper', 'warning');
        return;
    }

    const adType = document.querySelector('input[name="adType"]:checked')?.value || 'box';

    let cartItem = {
        id: Date.now(),
        newspaperId: selectedNewspaper.id,
        newspaperName: selectedNewspaper.name,
        newspaperLanguage: selectedNewspaper.language,
        groupName: selectedNewspaper.groupName || 'Newspaper',
        adType: adType,
        pubDate: pubDate,
        price: window.currentAdPrice || 0
    };

    if (adType === 'box') {
        const width = parseFloat(document.getElementById('adWidth')?.value) || 10;
        const height = parseFloat(document.getElementById('adHeight')?.value) || 10;
        const colorOption = document.getElementById('colorOption')?.value || 'bw';

        if (isFullPageAd(width, height)) {
            showNotification('For full page ads, please contact us directly', 'warning');
            showContactForm();
            return;
        }

        const area = width * height;
        const rate = colorOption === 'color' ? selectedNewspaper.colorRate : selectedNewspaper.bwRate;
        const adTotal = area * rate;
        const commission = adTotal * CONFIG.CHARGES.boxAdCommission;
        const subtotal = adTotal + commission;
        const vat = subtotal * CONFIG.CHARGES.vatRate;
        const total = subtotal + vat;

        cartItem.details = {
            width: width,
            height: height,
            area: area,
            colorOption: colorOption,
            rate: rate,
            adTotal: adTotal,
            commission: commission,
            vat: vat
        };
        cartItem.price = total;
        cartItem.description = `Box Ad: ${width} x ${height}cm (${colorOption === 'color' ? 'Color' : 'B&W'})`;
    } else {
        const text = document.getElementById('classifiedText')?.value || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;

        if (words === 0) {
            showNotification('Please enter your classified ad text', 'warning');
            return;
        }

        const calc = calculateClassifiedPrice(selectedNewspaper, words);

        cartItem.details = {
            text: text,
            wordCount: words,
            adTotal: calc.adTotal,
            serviceCharge: calc.serviceCharge
        };
        cartItem.price = calc.total;
        cartItem.description = `Classified: ${words} words`;
    }

    // Allow multiple entries of same newspaper with different dates
    adCart.push(cartItem);

    updateCartDisplay();
    showNotification(`Added ${selectedNewspaper.name} to cart!`, 'success');
}
window.addToCartWithDate = addToCartWithDate;

/**
 * Update cart display
 */
function updateCartDisplay() {
    const cartContainer = document.getElementById('adCart');
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    const continueBtn = document.getElementById('continueBtn');

    if (adCart.length === 0) {
        cartContainer.style.display = 'none';
        continueBtn.style.display = 'none';
        return;
    }

    cartContainer.style.display = 'block';
    continueBtn.style.display = 'flex';

    cartCount.textContent = `${adCart.length} item${adCart.length > 1 ? 's' : ''}`;

    cartItems.innerHTML = adCart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-info">
                <strong>${item.newspaperName}</strong>
                <span class="cart-item-date">📅 ${formatDate(item.pubDate)}</span>
                <span class="cart-item-desc">${item.description}</span>
            </div>
            <div class="cart-item-price">${formatCurrency(item.price)}</div>
            <button type="button" class="cart-item-remove" onclick="removeFromCart(${item.id})" title="Remove">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `).join('');

    const total = adCart.reduce((sum, item) => sum + item.price, 0);
    cartTotal.textContent = formatCurrency(total);
}

/**
 * Remove item from cart
 */
function removeFromCart(itemId) {
    adCart = adCart.filter(item => item.id !== itemId);
    updateCartDisplay();
    showNotification('Item removed from cart', 'info');
}
window.removeFromCart = removeFromCart;

/**
 * Navigate to step
 */
function goToStep(step) {
    if (step < 1 || step > 3) return;

    // Validate before proceeding
    if (step > currentStep && !validateStep(currentStep)) {
        return;
    }

    // Update step display
    document.querySelectorAll('.form-step').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

    // Update progress
    document.querySelectorAll('.progress-step').forEach(el => {
        const stepNum = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (stepNum === step) {
            el.classList.add('active');
        } else if (stepNum < step) {
            el.classList.add('completed');
        }
    });

    currentStep = step;

    // Update order summary on payment step
    if (step === 3) {
        updateOrderSummary();
    }

    // Scroll to top
    document.querySelector('.booking-form-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Validate step with detailed error messages
 */
function validateStep(step) {
    const errors = [];

    switch(step) {
        case 1:
            if (adCart.length === 0) {
                showNotification('Please add at least one ad to your cart before proceeding', 'warning');
                // Scroll to cart area
                document.getElementById('priceCalculation')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            return true;

        case 2:
            const nameField = document.getElementById('customerName');
            const emailField = document.getElementById('customerEmail');
            const phoneField = document.getElementById('customerPhone');

            const name = nameField?.value.trim();
            const email = emailField?.value.trim();
            const phone = phoneField?.value.trim();

            // Clear previous error states
            [nameField, emailField, phoneField].forEach(field => {
                if (field) field.classList.remove('field-error');
            });

            // Validate name
            if (!name) {
                errors.push('Full name is required');
                nameField?.classList.add('field-error');
                nameField?.focus();
            } else if (name.length < 2) {
                errors.push('Please enter your full name');
                nameField?.classList.add('field-error');
            }

            // Validate email
            if (!email) {
                errors.push('Email address is required');
                emailField?.classList.add('field-error');
                if (!errors.some(e => e.includes('name'))) emailField?.focus();
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push('Please enter a valid email address (e.g., name@example.com)');
                emailField?.classList.add('field-error');
            }

            // Validate phone
            if (!phone) {
                errors.push('Phone number is required');
                phoneField?.classList.add('field-error');
                if (errors.length === 1) phoneField?.focus();
            } else if (!/^[\d\s\-\+\(\)]{8,15}$/.test(phone)) {
                errors.push('Please enter a valid phone number');
                phoneField?.classList.add('field-error');
            }

            if (errors.length > 0) {
                showNotification(errors[0], 'warning');
                return false;
            }
            return true;

        case 3:
            const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
            if (!paymentMethod) {
                showNotification('Please select a payment method', 'warning');
                return false;
            }
            return true;

        default:
            return true;
    }
}

/**
 * Update order summary
 */
function updateOrderSummary() {
    const summary = document.getElementById('orderSummary');
    const customerName = document.getElementById('customerName')?.value;
    const customerEmail = document.getElementById('customerEmail')?.value;

    const subtotal = adCart.reduce((sum, item) => {
        if (item.adType === 'box') {
            return sum + item.details.adTotal;
        } else {
            return sum + item.details.adTotal;
        }
    }, 0);

    const totalCommission = adCart.reduce((sum, item) => {
        if (item.adType === 'box') {
            return sum + (item.details.commission || 0);
        }
        return sum;
    }, 0);

    const totalVAT = adCart.reduce((sum, item) => {
        if (item.adType === 'box') {
            return sum + (item.details.vat || 0);
        }
        return sum;
    }, 0);

    const totalServiceCharge = adCart.reduce((sum, item) => {
        if (item.adType === 'classified') {
            return sum + (item.details.serviceCharge || 0);
        }
        return sum;
    }, 0);

    const total = adCart.reduce((sum, item) => sum + item.price, 0);

    summary.innerHTML = `
        <div class="summary-section">
            <h4>Customer</h4>
            <p>${customerName}<br><small>${customerEmail}</small></p>
        </div>
        <div class="summary-section">
            <h4>Ad Items (${adCart.length})</h4>
            ${adCart.map(item => `
                <div class="summary-item">
                    <div class="item-info">
                        <strong>${item.newspaperName}</strong>
                        <span>${item.description}</span>
                        <small>${formatDate(item.pubDate)}</small>
                    </div>
                    <div class="item-price">${formatCurrency(item.details.adTotal)}</div>
                </div>
            `).join('')}
        </div>
        <div class="summary-charges">
            <div class="charge-row">
                <span>Ad Subtotal:</span>
                <span>${formatCurrency(subtotal)}</span>
            </div>
            ${totalCommission > 0 ? `
            <div class="charge-row">
                <span>Platform Commission (10%):</span>
                <span>${formatCurrency(totalCommission)}</span>
            </div>
            ` : ''}
            ${totalVAT > 0 ? `
            <div class="charge-row">
                <span>VAT (18%):</span>
                <span>${formatCurrency(totalVAT)}</span>
            </div>
            ` : ''}
            ${totalServiceCharge > 0 ? `
            <div class="charge-row">
                <span>Service Charge:</span>
                <span>${formatCurrency(totalServiceCharge)}</span>
            </div>
            ` : ''}
        </div>
        <div class="summary-total">
            <span>Total Amount:</span>
            <strong>${formatCurrency(total)}</strong>
        </div>
    `;

    // Update submit button text
    const submitText = document.getElementById('submitText');
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (paymentMethod === 'card') {
        submitText.textContent = `Pay ${formatCurrency(total)}`;
    } else {
        submitText.textContent = 'Submit & Pay Later';
    }
}

/**
 * Toggle payment method
 */
function togglePaymentMethod() {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    document.getElementById('cardPayment').style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('bankPayment').style.display = method === 'bank' ? 'block' : 'none';
    updateOrderSummary();
}

/**
 * Set minimum date
 */
function setMinDate() {
    const pubDate = document.getElementById('pubDate');
    if (pubDate) {
        pubDate.min = getMinBookingDate();
    }
}

/**
 * Initialize Stripe
 */
function initStripe() {
    if (typeof Stripe === 'undefined') {
        setTimeout(initStripe, 100);
        return;
    }

    stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
    const elements = stripe.elements();

    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#1e293b',
                '::placeholder': { color: '#94a3b8' }
            },
            invalid: { color: '#ef4444' }
        }
    });

    cardElement.mount('#card-element');

    cardElement.on('change', function(event) {
        const displayError = document.getElementById('card-errors');
        displayError.textContent = event.error ? event.error.message : '';
    });
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitLoader = document.getElementById('submitLoader');

    submitBtn.disabled = true;
    submitText.style.display = 'none';
    submitLoader.style.display = 'block';

    try {
        const quotationNumber = generateQuotationNumber();
        const invoiceNumber = generateInvoiceNumber();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

        // Collect form data
        const formData = {
            quotation_number: quotationNumber,
            invoice_number: invoiceNumber,
            items: adCart,
            total_amount: adCart.reduce((sum, item) => sum + item.price, 0),
            customer_name: document.getElementById('customerName')?.value,
            customer_company: document.getElementById('customerCompany')?.value,
            customer_email: document.getElementById('customerEmail')?.value,
            customer_phone: document.getElementById('customerPhone')?.value,
            customer_address: document.getElementById('customerAddress')?.value,
            notes: document.getElementById('adNotes')?.value,
            payment_method: paymentMethod,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        // Process payment if card
        if (paymentMethod === 'card' && stripe && cardElement) {
            const { error, paymentMethod: pm } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: {
                    name: formData.customer_name,
                    email: formData.customer_email
                }
            });

            if (error) throw error;
            formData.payment_status = 'completed';
            formData.payment_reference = pm.id;
        } else {
            formData.payment_status = 'pending';
        }

        // Save to Firebase if available
        let saveSuccess = false;
        if (db) {
            try {
                const docRef = await db.collection('bookings').add(formData);
                console.log('Booking saved to Firebase:', docRef.id);
                formData.firebaseId = docRef.id;
                saveSuccess = true;
            } catch (dbError) {
                console.warn('Firebase save failed, using local storage:', dbError);
            }
        }

        // Fallback: Save to local storage if Firebase not available
        if (!saveSuccess) {
            const orders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
            const orderId = Date.now();
            orders.push({
                ...formData,
                id: orderId,
                created_at: new Date().toISOString()
            });
            localStorage.setItem('adspot_orders', JSON.stringify(orders));
            console.log('Order saved to local storage:', quotationNumber);

            // Generate and store PDF for later retrieval
            if (typeof InvoiceGenerator !== 'undefined') {
                try {
                    const quotationForPdf = {
                        id: orderId,
                        quotation_number: quotationNumber,
                        invoice_number: invoiceNumber,
                        newspaper_name: adCart[0]?.newspaperName || 'Multiple',
                        ad_type: adCart[0]?.adType || 'box',
                        publication_date: adCart[0]?.pubDate,
                        total_amount: formData.total_amount,
                        items: adCart,
                        ad_details: adCart[0]?.details || {}
                    };
                    const customerForPdf = {
                        name: formData.customer_name,
                        email: formData.customer_email,
                        phone: formData.customer_phone,
                        company: formData.customer_company,
                        address: formData.customer_address
                    };

                    // Save to local storage
                    if (typeof PdfStorage !== 'undefined') {
                        InvoiceGenerator.generateAndSave(quotationForPdf, customerForPdf);
                        console.log('PDF saved to local storage:', quotationNumber);
                    }

                    // Also upload to Google Drive if configured
                    if (typeof GoogleDriveStorage !== 'undefined' && GoogleDriveStorage.isConfigured()) {
                        GoogleDriveStorage.generateAndUpload(quotationForPdf, customerForPdf)
                            .then(result => {
                                if (result.success) {
                                    console.log('PDF uploaded to Google Drive:', result.viewUrl);
                                }
                            })
                            .catch(err => console.warn('Google Drive upload failed:', err));
                    }
                } catch (pdfError) {
                    console.warn('Failed to generate PDF:', pdfError);
                }
            }
        }

        // Send admin notification and customer confirmation emails
        console.log('Checking EmailService...', {
            exists: typeof EmailService !== 'undefined',
            configured: typeof EmailService !== 'undefined' ? EmailService.isConfigured() : false
        });

        if (typeof EmailService !== 'undefined' && EmailService.isConfigured()) {
            try {
                console.log('Sending order notification emails...');
                // Prepare data for emails
                const quotationData = {
                    quotation_number: quotationNumber,
                    invoice_number: invoiceNumber,
                    newspaper_name: adCart[0]?.newspaperName || 'Multiple',
                    ad_type: adCart[0]?.adType || 'box',
                    total_amount: formData.total_amount,
                    items: adCart.map(item => ({
                        newspaperName: item.newspaperName,
                        adType: item.adType,
                        pubDate: item.pubDate,
                        price: item.price,
                        description: item.description,
                        details: item.details // Includes classified text
                    }))
                };

                const customerData = {
                    name: formData.customer_name,
                    email: formData.customer_email,
                    phone: formData.customer_phone
                };

                // Send admin notification (you receive the order)
                EmailService.notifyAdmin(quotationData, customerData)
                    .then(() => console.log('Admin notification sent'))
                    .catch(err => console.warn('Admin notification failed:', err));

                // Send quotation/confirmation to customer
                EmailService.sendQuotation(quotationData, customerData)
                    .then(() => console.log('Customer confirmation sent'))
                    .catch(err => console.warn('Customer email failed:', err));

            } catch (emailError) {
                console.warn('Email sending failed:', emailError);
            }
        }

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        // If Pay Later (bank transfer), redirect to home
        if (paymentMethod === 'bank') {
            showNotification('Booking submitted! Check your email for payment details.', 'success');
            await new Promise(resolve => setTimeout(resolve, 1500));
            window.location.href = 'index.html';
            return;
        }

        // Otherwise show success modal for card payment
        showSuccessModal(quotationNumber, formData.customer_email, paymentMethod);

    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Submission failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitText.style.display = 'block';
        submitLoader.style.display = 'none';
    }
}

/**
 * Show success modal with detailed confirmation
 */
function showSuccessModal(quotationNumber, email, paymentMethod) {
    const modal = document.getElementById('successModal');
    const content = modal.querySelector('.modal-content') || modal;

    const total = adCart.reduce((sum, item) => sum + item.price, 0);
    const itemsList = adCart.map(item => `
        <div class="confirmation-item">
            <strong>${item.newspaperName}</strong>
            <span>${item.description}</span>
            <span>${formatDate(item.pubDate)}</span>
            <span>${formatCurrency(item.price)}</span>
        </div>
    `).join('');

    const bankDetails = paymentMethod === 'bank' ? `
        <div class="bank-details-box">
            <h4>Bank Transfer Details</h4>
            <div class="bank-info">
                <div class="bank-row"><span>Bank:</span> <strong>${CONFIG.BANK_DETAILS.bankName}</strong></div>
                <div class="bank-row"><span>Account Name:</span> <strong>${CONFIG.BANK_DETAILS.accountName}</strong></div>
                <div class="bank-row"><span>Account Number:</span> <strong>${CONFIG.BANK_DETAILS.accountNumber}</strong></div>
                <div class="bank-row"><span>Branch:</span> <strong>${CONFIG.BANK_DETAILS.branch}</strong></div>
                <div class="bank-row"><span>Reference:</span> <strong>${quotationNumber}</strong></div>
            </div>
            <p class="bank-note">Please use your quotation number as the payment reference. Your ad will be processed once payment is confirmed.</p>
        </div>
    ` : '';

    content.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h2>${paymentMethod === 'card' ? 'Payment Successful!' : 'Booking Submitted!'}</h2>
            <p class="success-message">
                ${paymentMethod === 'card'
                    ? 'Your payment has been processed and your ad booking is confirmed.'
                    : 'Your ad booking has been received. Please complete the payment to confirm.'}
            </p>

            <div class="confirmation-details">
                <div class="confirmation-row">
                    <span>Quotation Number:</span>
                    <strong class="quotation-highlight">${quotationNumber}</strong>
                </div>
                <div class="confirmation-row">
                    <span>Confirmation Email:</span>
                    <strong>${email}</strong>
                </div>
                <div class="confirmation-row">
                    <span>Total Amount:</span>
                    <strong>${formatCurrency(total)}</strong>
                </div>
            </div>

            <div class="order-items">
                <h4>Your Order</h4>
                ${itemsList}
            </div>

            ${bankDetails}

            <div class="success-actions">
                <a href="index.html" class="btn btn-primary">Return to Home</a>
                <button class="btn btn-ghost" onclick="window.print()">Print Confirmation</button>
            </div>

            <p class="contact-info">
                Questions? Contact us at <a href="mailto:${CONFIG.COMPANY.email}">${CONFIG.COMPANY.email}</a>
                or call <a href="tel:${CONFIG.COMPANY.phone.replace(/\s/g, '')}">${CONFIG.COMPANY.phone}</a>
            </p>
        </div>
    `;

    modal.classList.add('active');

    // Clear cart after successful submission
    adCart = [];
}

/**
 * Show contact form for full page ads
 */
function showContactForm() {
    const modal = document.getElementById('contactModal');
    document.getElementById('fpNewspaper').value = selectedNewspaper?.name || '';
    modal.classList.add('active');
}
window.showContactForm = showContactForm;

function closeContactModal() {
    document.getElementById('contactModal').classList.remove('active');
}
window.closeContactModal = closeContactModal;

/**
 * Handle full page contact form
 */
async function handleFullPageContact(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('fpName')?.value,
        phone: document.getElementById('fpPhone')?.value,
        email: document.getElementById('fpEmail')?.value,
        newspaper: document.getElementById('fpNewspaper')?.value,
        message: document.getElementById('fpMessage')?.value
    };

    // Here you would send this to your backend/email
    console.log('Full page enquiry:', data);

    showNotification('Enquiry submitted! We will contact you soon.', 'success');
    closeContactModal();
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, 5000);
}
window.showNotification = showNotification;
