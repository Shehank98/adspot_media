/**
 * AdSpot - Booking Page JavaScript
 * Multi-step form with ad cart system and proper rate calculations
 * Box Ad: Height × Width × Rate (B&W or Color)
 * Classified: Base price (first X words) + Extra words × Rate
 */

let currentStep = 1;
let selectedNewspaper = null;
let selectedGroup = null;
let adCart = [];
let stripe = null;
let cardElement = null;

document.addEventListener('DOMContentLoaded', function() {
    initPublicationGroups();
    initBookingForm();
    initStripe();
    setMinDate();
    
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
 * Initialize Publication Groups
 */
function initPublicationGroups() {
    const container = document.getElementById('pubGroupSelect');
    if (!container) return;
    
    container.innerHTML = Object.entries(CONFIG.PUBLICATIONS).map(([groupId, group], index) => `
        <label class="pub-group-card">
            <input type="radio" name="pubGroup" value="${groupId}" ${index === 0 ? 'checked' : ''}>
            <div class="card-content">
                <span class="pub-name">${group.name}</span>
                <span class="pub-count">${group.newspapers.length} papers</span>
            </div>
        </label>
    `).join('');
    
    // Add change listeners
    container.querySelectorAll('input[name="pubGroup"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updateNewspaperOptions(this.value);
        });
    });
    
    // Initialize with first group
    const firstGroup = Object.keys(CONFIG.PUBLICATIONS)[0];
    updateNewspaperOptions(firstGroup);
}

/**
 * Update newspaper options based on selected group
 */
function updateNewspaperOptions(groupId) {
    const container = document.getElementById('newspaperSelect');
    const group = CONFIG.PUBLICATIONS[groupId];
    
    if (!group) return;
    
    selectedGroup = groupId;
    
    const langIcons = {
        'english': '🇬🇧',
        'sinhala': '🇱🇰',
        'tamil': '🇮🇳',
        'all': '🌐'
    };
    
    container.innerHTML = group.newspapers.map((paper, index) => `
        <label class="newspaper-card">
            <input type="radio" name="newspaper" value="${paper.id}" ${index === 0 ? 'checked' : ''}>
            <div class="card-content">
                <span class="lang-icon">${langIcons[paper.language] || '📰'}</span>
                <span class="paper-name">${paper.name}</span>
                <span class="paper-rate">From Rs. ${paper.bwRate}/sq cm</span>
            </div>
        </label>
    `).join('');
    
    // Add change listeners
    container.querySelectorAll('input[name="newspaper"]').forEach(radio => {
        radio.addEventListener('change', function() {
            selectedNewspaper = group.newspapers.find(p => p.id === this.value);
            updateQuickRates();
            updatePrice();
        });
    });
    
    // Select first by default
    selectedNewspaper = group.newspapers[0];
    updateQuickRates();
    updatePrice();
}

/**
 * Update quick rates display
 */
function updateQuickRates() {
    const container = document.getElementById('quickRates');
    if (!selectedNewspaper || !container) return;
    
    const adType = document.querySelector('input[name="adType"]:checked').value;
    
    if (adType === 'box') {
        container.innerHTML = `
            <div class="rate-item">
                <span>B&W Rate:</span>
                <strong>Rs. ${selectedNewspaper.bwRate}/sq cm</strong>
            </div>
            <div class="rate-item">
                <span>Color Rate:</span>
                <strong>Rs. ${selectedNewspaper.colorRate}/sq cm</strong>
            </div>
            <div class="rate-item small">
                <span>Max Height:</span>
                <strong>${CONFIG.MAX_HEIGHT} cm</strong>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="rate-item">
                <span>Base Price:</span>
                <strong>Rs. ${selectedNewspaper.classifiedBase.toLocaleString()}</strong>
            </div>
            <div class="rate-item">
                <span>Includes:</span>
                <strong>First ${selectedNewspaper.classifiedFreeWords} words</strong>
            </div>
            <div class="rate-item">
                <span>Extra Words:</span>
                <strong>Rs. ${selectedNewspaper.classifiedExtraRate}/word</strong>
            </div>
        `;
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
                if (id === 'adHeight' && parseFloat(this.value) > CONFIG.MAX_HEIGHT) {
                    this.value = CONFIG.MAX_HEIGHT;
                }
                updatePrice();
                checkFullPage();
            });
        }
    });
    
    document.getElementById('colorOption')?.addEventListener('change', updatePrice);
    
    // Classified text counter
    const classifiedText = document.getElementById('classifiedText');
    if (classifiedText) {
        classifiedText.addEventListener('input', function() {
            updateWordCount();
            updatePrice();
        });
    }
    
    // Add to cart button
    document.getElementById('addToCartBtn')?.addEventListener('click', addToCart);
    
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
    const adType = document.querySelector('input[name="adType"]:checked').value;
    const boxConfig = document.getElementById('boxAdConfig');
    const classifiedConfig = document.getElementById('classifiedConfig');
    
    if (adType === 'box') {
        boxConfig.style.display = 'block';
        classifiedConfig.style.display = 'none';
    } else {
        boxConfig.style.display = 'none';
        classifiedConfig.style.display = 'block';
        updateWordCount();
    }
}

/**
 * Update word count for classified ads
 */
function updateWordCount() {
    const text = document.getElementById('classifiedText')?.value || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    document.getElementById('wordCount').textContent = words;
    
    if (selectedNewspaper) {
        document.getElementById('freeWordsCount').textContent = selectedNewspaper.classifiedFreeWords;
        
        const breakdown = document.getElementById('wordBreakdown');
        const extraRow = document.getElementById('extraWordsRow');
        
        if (words > 0) {
            breakdown.style.display = 'block';
            document.getElementById('baseWordCount').textContent = selectedNewspaper.classifiedFreeWords;
            document.getElementById('basePrice').textContent = formatCurrency(selectedNewspaper.classifiedBase);
            
            const extraWords = Math.max(0, words - selectedNewspaper.classifiedFreeWords);
            if (extraWords > 0) {
                extraRow.style.display = 'flex';
                document.getElementById('extraWordCount').textContent = extraWords;
                document.getElementById('extraWordRate').textContent = selectedNewspaper.classifiedExtraRate;
                document.getElementById('extraPrice').textContent = formatCurrency(extraWords * selectedNewspaper.classifiedExtraRate);
            } else {
                extraRow.style.display = 'none';
            }
            
            const total = calculateClassifiedPrice(selectedNewspaper, words);
            document.getElementById('classifiedTotal').textContent = formatCurrency(total.total);
        } else {
            breakdown.style.display = 'none';
        }
    }
}

/**
 * Check if full page ad and show alert
 */
function checkFullPage() {
    const width = parseFloat(document.getElementById('adWidth')?.value) || 0;
    const height = parseFloat(document.getElementById('adHeight')?.value) || 0;
    const alert = document.getElementById('fullPageAlert');
    
    if (isFullPageAd(width, height)) {
        alert.style.display = 'flex';
    } else {
        alert.style.display = 'none';
    }
}

/**
 * Update price calculation
 */
function updatePrice() {
    if (!selectedNewspaper) return;
    
    const adType = document.querySelector('input[name="adType"]:checked').value;
    let total = 0;
    let details = [];
    
    if (adType === 'box') {
        const width = parseFloat(document.getElementById('adWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('adHeight')?.value) || 0;
        const colorOption = document.getElementById('colorOption')?.value || 'bw';
        
        const calc = calculateBoxAdPrice(selectedNewspaper, width, height, colorOption);
        total = calc.total;
        
        // Update preview
        document.getElementById('previewDimensions').textContent = `${width} × ${height} cm`;
        document.getElementById('previewArea').textContent = calc.area.toFixed(1);
        document.getElementById('previewRate').textContent = formatCurrency(calc.rate);
        document.getElementById('previewTotal').textContent = formatCurrency(calc.total);
        
        // Update preview box size (scaled)
        const previewBox = document.getElementById('adPreview');
        const maxPreviewSize = 150;
        const scale = Math.min(maxPreviewSize / Math.max(width, height), 10);
        previewBox.style.width = `${width * scale}px`;
        previewBox.style.height = `${height * scale}px`;
        
        details = [
            { label: 'Newspaper', value: selectedNewspaper.name },
            { label: 'Size', value: `${width} × ${height} cm = ${calc.area} sq cm` },
            { label: colorOption === 'color' ? 'Color Rate' : 'B&W Rate', value: `${formatCurrency(calc.rate)}/sq cm` },
            { label: 'Calculation', value: `${calc.area} × ${formatCurrency(calc.rate)}` }
        ];
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
            details.push({ label: `Extra (${calc.extraWords} × Rs. ${calc.extraRate})`, value: formatCurrency(calc.extraCost) });
        }
    }
    
    // Update price display
    const priceDetails = document.getElementById('priceDetails');
    priceDetails.innerHTML = details.map(d => `
        <div class="price-row">
            <span>${d.label}:</span>
            <span>${d.value}</span>
        </div>
    `).join('');
    
    document.getElementById('currentAdTotal').textContent = formatCurrency(total);
    
    // Store for cart
    window.currentAdPrice = total;
}

/**
 * Add current ad to cart
 */
function addToCart() {
    if (!selectedNewspaper) {
        showNotification('Please select a newspaper', 'warning');
        return;
    }
    
    const adType = document.querySelector('input[name="adType"]:checked').value;
    const pubDate = document.getElementById('pubDate')?.value;
    
    if (!pubDate) {
        showNotification('Please select a publication date', 'warning');
        return;
    }
    
    let cartItem = {
        id: Date.now(),
        newspaperId: selectedNewspaper.id,
        newspaperName: selectedNewspaper.name,
        groupName: CONFIG.PUBLICATIONS[selectedGroup].name,
        adType: adType,
        pubDate: pubDate,
        price: window.currentAdPrice || 0
    };
    
    if (adType === 'box') {
        const width = parseFloat(document.getElementById('adWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('adHeight')?.value) || 0;
        const colorOption = document.getElementById('colorOption')?.value || 'bw';
        
        if (isFullPageAd(width, height)) {
            showNotification('For full page ads, please contact us directly', 'warning');
            showContactForm();
            return;
        }
        
        cartItem.details = {
            width: width,
            height: height,
            area: width * height,
            colorOption: colorOption,
            rate: colorOption === 'color' ? selectedNewspaper.colorRate : selectedNewspaper.bwRate
        };
        cartItem.description = `Box Ad: ${width}×${height}cm (${colorOption === 'color' ? 'Color' : 'B&W'})`;
    } else {
        const text = document.getElementById('classifiedText')?.value || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const category = document.getElementById('classifiedCategory')?.value || 'general';
        
        if (words === 0) {
            showNotification('Please enter your classified ad text', 'warning');
            return;
        }
        
        cartItem.details = {
            text: text,
            wordCount: words,
            category: category
        };
        cartItem.description = `Classified: ${words} words (${CONFIG.CLASSIFIED_CATEGORIES[category]?.name || category})`;
    }
    
    // Check if same newspaper already in cart
    const existingIndex = adCart.findIndex(item => item.newspaperId === cartItem.newspaperId && item.adType === cartItem.adType);
    if (existingIndex >= 0) {
        if (!confirm(`You already have a ${adType} ad for ${selectedNewspaper.name}. Replace it?`)) {
            return;
        }
        adCart[existingIndex] = cartItem;
    } else {
        adCart.push(cartItem);
    }
    
    updateCartDisplay();
    showNotification(`Added ${selectedNewspaper.name} to cart!`, 'success');
}

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
                <span class="cart-item-desc">${item.description}</span>
                <span class="cart-item-date">📅 ${formatDate(item.pubDate)}</span>
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
 * Validate step
 */
function validateStep(step) {
    switch(step) {
        case 1:
            if (adCart.length === 0) {
                showNotification('Please add at least one ad to your cart', 'warning');
                return false;
            }
            return true;
            
        case 2:
            const name = document.getElementById('customerName')?.value.trim();
            const email = document.getElementById('customerEmail')?.value.trim();
            const phone = document.getElementById('customerPhone')?.value.trim();
            
            if (!name || !email || !phone) {
                showNotification('Please fill in all required fields', 'warning');
                return false;
            }
            
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showNotification('Please enter a valid email address', 'warning');
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
                        <small>📅 ${formatDate(item.pubDate)}</small>
                    </div>
                    <div class="item-price">${formatCurrency(item.price)}</div>
                </div>
            `).join('')}
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
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        pubDate.min = tomorrow.toISOString().split('T')[0];
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
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        
        // Collect form data
        const formData = {
            quotation_number: quotationNumber,
            items: adCart,
            total_amount: adCart.reduce((sum, item) => sum + item.price, 0),
            customer_name: document.getElementById('customerName')?.value,
            customer_company: document.getElementById('customerCompany')?.value,
            customer_email: document.getElementById('customerEmail')?.value,
            customer_phone: document.getElementById('customerPhone')?.value,
            customer_address: document.getElementById('customerAddress')?.value,
            notes: document.getElementById('adNotes')?.value,
            payment_method: paymentMethod,
            status: 'pending'
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
        
        // Simulate save (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Show success
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
 * Show success modal
 */
function showSuccessModal(quotationNumber, email, paymentMethod) {
    document.getElementById('quotationNumber').textContent = quotationNumber;
    document.getElementById('confirmEmail').textContent = email;
    
    const note = document.getElementById('paymentNote');
    if (paymentMethod === 'card') {
        note.textContent = '✅ Payment confirmed! Your invoice has been sent to your email.';
    } else {
        note.textContent = '📌 Please complete the bank transfer using the details provided. We\'ll process your ad once payment is confirmed.';
    }
    
    document.getElementById('successModal').classList.add('active');
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
    
    showNotification('Enquiry submitted! We\'ll contact you soon.', 'success');
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
