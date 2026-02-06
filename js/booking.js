/**
 * AdSpot - Booking Page JavaScript
 * Multi-step form with ad cart system and column-based calculations
 * Box Ad: Height (cm) x Column Width (cm) x Rate + 10% Commission
 * Classified: Base price + Extra words + Rs. 100 Service Charge
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

    const langLabels = {
        'english': 'EN',
        'sinhala': 'SI',
        'tamil': 'TA',
        'all': 'ALL'
    };

    container.innerHTML = group.newspapers.map((paper, index) => `
        <label class="newspaper-card">
            <input type="radio" name="newspaper" value="${paper.id}" ${index === 0 ? 'checked' : ''}>
            <div class="card-content">
                <span class="lang-badge">${langLabels[paper.language] || 'EN'}</span>
                <span class="paper-name">${paper.name}</span>
                <span class="paper-rate">From Rs. ${paper.bwRate}/sq cm</span>
                ${paper.isSundayPaper ? '<span class="sunday-badge">Sunday</span>' : ''}
            </div>
        </label>
    `).join('');

    // Add change listeners
    container.querySelectorAll('input[name="newspaper"]').forEach(radio => {
        radio.addEventListener('change', function() {
            selectedNewspaper = group.newspapers.find(p => p.id === this.value);
            updateColumnOptions();
            updateQuickRates();
            updatePrice();
        });
    });

    // Select first by default
    selectedNewspaper = group.newspapers[0];
    updateColumnOptions();
    updateQuickRates();
    updatePrice();
}

/**
 * Update column options based on newspaper language
 */
function updateColumnOptions() {
    const columnSelect = document.getElementById('adColumns');
    if (!columnSelect || !selectedNewspaper) return;

    const language = selectedNewspaper.language || 'english';
    const maxColumns = getMaxColumns(language);

    let options = '';
    for (let i = 1; i <= maxColumns; i++) {
        const width = getColumnWidth(language, i);
        options += `<option value="${i}">${i} col (${width} cm)</option>`;
    }
    columnSelect.innerHTML = options;
    columnSelect.value = '1';
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
            <div class="rate-item">
                <span>Commission:</span>
                <strong>10%</strong>
            </div>
            <div class="rate-item">
                <span>VAT:</span>
                <strong>18%</strong>
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
            <div class="rate-item">
                <span>Service Charge:</span>
                <strong>Rs. ${CONFIG.CHARGES.classifiedServiceCharge}</strong>
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
    ['adHeight', 'adColumns'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                // Enforce max height
                if (id === 'adHeight' && parseFloat(this.value) > CONFIG.MAX_HEIGHT) {
                    this.value = CONFIG.MAX_HEIGHT;
                }
                updatePrice();
                checkFullPage();
                updateNewspaperPreview();
            });
            el.addEventListener('change', function() {
                updatePrice();
                checkFullPage();
                updateNewspaperPreview();
            });
        }
    });

    document.getElementById('colorOption')?.addEventListener('change', function() {
        updatePrice();
        updateNewspaperPreview();
    });

    // Classified text counter
    const classifiedText = document.getElementById('classifiedText');
    if (classifiedText) {
        classifiedText.addEventListener('input', function() {
            updateWordCount();
            updatePrice();
        });
    }

    // Publication date validation
    const pubDate = document.getElementById('pubDate');
    if (pubDate) {
        pubDate.addEventListener('change', function() {
            validateSelectedDate();
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
        updateColumnOptions();
        updateNewspaperPreview();
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
        const serviceRow = document.getElementById('serviceChargeRow');

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

            // Show service charge
            if (serviceRow) {
                serviceRow.style.display = 'flex';
                document.getElementById('serviceChargeAmount').textContent = formatCurrency(CONFIG.CHARGES.classifiedServiceCharge);
            }

            const total = calculateClassifiedPrice(selectedNewspaper, words);
            document.getElementById('classifiedTotal').textContent = formatCurrency(total.total);
        } else {
            breakdown.style.display = 'none';
        }
    }
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
    const columns = parseInt(document.getElementById('adColumns')?.value) || 1;
    const height = parseFloat(document.getElementById('adHeight')?.value) || 0;
    const language = selectedNewspaper?.language || 'english';
    const width = getColumnWidth(language, columns);
    const alert = document.getElementById('fullPageAlert');

    if (isFullPageAd(width, height)) {
        alert.style.display = 'flex';
    } else {
        alert.style.display = 'none';
    }
}

/**
 * Update newspaper preview with ad placement
 */
function updateNewspaperPreview() {
    const previewContainer = document.getElementById('newspaperPreview');
    if (!previewContainer || !selectedNewspaper) return;

    const adType = document.querySelector('input[name="adType"]:checked').value;
    if (adType !== 'box') return;

    const columns = parseInt(document.getElementById('adColumns')?.value) || 1;
    const height = parseFloat(document.getElementById('adHeight')?.value) || 10;
    const language = selectedNewspaper.language || 'english';
    const width = getColumnWidth(language, columns);

    // Newspaper dimensions
    const paperWidth = CONFIG.NEWSPAPER_SIZE.width;
    const paperHeight = CONFIG.NEWSPAPER_SIZE.height;

    // Calculate scale factor for preview (max preview width: 200px)
    const maxPreviewWidth = 200;
    const scale = maxPreviewWidth / paperWidth;

    // Calculate scaled dimensions
    const scaledPaperWidth = paperWidth * scale;
    const scaledPaperHeight = paperHeight * scale;
    const scaledAdWidth = width * scale;
    const scaledAdHeight = height * scale;

    previewContainer.innerHTML = `
        <div class="newspaper-outline" style="width: ${scaledPaperWidth}px; height: ${scaledPaperHeight}px;">
            <div class="newspaper-header">
                <span class="paper-title">${selectedNewspaper.name}</span>
                <span class="paper-size">${paperWidth} x ${paperHeight} cm</span>
            </div>
            <div class="ad-placement" style="width: ${scaledAdWidth}px; height: ${scaledAdHeight}px;">
                <span class="ad-label">Your Ad</span>
                <span class="ad-size">${width.toFixed(1)} x ${height} cm</span>
            </div>
        </div>
    `;
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
        const columns = parseInt(document.getElementById('adColumns')?.value) || 1;
        const height = parseFloat(document.getElementById('adHeight')?.value) || 0;
        const colorOption = document.getElementById('colorOption')?.value || 'bw';

        const calc = calculateBoxAdPrice(selectedNewspaper, height, columns, colorOption);
        total = calc.total;

        // Update preview info
        document.getElementById('previewDimensions').textContent = `${calc.columnWidth.toFixed(1)} x ${height} cm`;
        document.getElementById('previewArea').textContent = calc.area.toFixed(1);
        document.getElementById('previewRate').textContent = formatCurrency(calc.rate);
        document.getElementById('previewTotal').textContent = formatCurrency(calc.total);

        // Update preview box size (scaled)
        const previewBox = document.getElementById('adPreview');
        if (previewBox) {
            const maxPreviewSize = 150;
            const maxDim = Math.max(calc.columnWidth, height);
            const scale = maxDim > 0 ? Math.min(maxPreviewSize / maxDim, 10) : 10;
            previewBox.style.width = `${calc.columnWidth * scale}px`;
            previewBox.style.height = `${height * scale}px`;
        }

        details = [
            { label: 'Newspaper', value: selectedNewspaper.name },
            { label: 'Size', value: `${columns} col x ${height} cm (H)` },
            { label: 'Column Width', value: `${calc.columnWidth.toFixed(1)} cm (${selectedNewspaper.language})` },
            { label: colorOption === 'color' ? 'Color Rate' : 'B&W Rate', value: `${formatCurrency(calc.rate)}/col-cm` },
            { label: 'Calculation', value: `${columns} col x ${height} cm x ${formatCurrency(calc.rate)}` },
            { label: 'Ad Total', value: formatCurrency(calc.adTotal) },
            { label: 'Platform Commission (10%)', value: formatCurrency(calc.commission) },
            { label: 'VAT (18%)', value: formatCurrency(calc.vat) }
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
            details.push({ label: `Extra (${calc.extraWords} x Rs. ${calc.extraRate})`, value: formatCurrency(calc.extraCost) });
        }

        details.push({ label: 'Ad Total', value: formatCurrency(calc.adTotal) });
        details.push({ label: 'Service Charge', value: formatCurrency(calc.serviceCharge) });
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

    // Validate the date
    const validation = validateBookingDate(pubDate, selectedNewspaper);
    if (!validation.isValid) {
        showNotification(validation.errors[0], 'error');
        return;
    }

    let cartItem = {
        id: Date.now(),
        newspaperId: selectedNewspaper.id,
        newspaperName: selectedNewspaper.name,
        newspaperLanguage: selectedNewspaper.language,
        groupName: CONFIG.PUBLICATIONS[selectedGroup].name,
        adType: adType,
        pubDate: pubDate,
        price: window.currentAdPrice || 0
    };

    if (adType === 'box') {
        const columns = parseInt(document.getElementById('adColumns')?.value) || 1;
        const height = parseFloat(document.getElementById('adHeight')?.value) || 0;
        const colorOption = document.getElementById('colorOption')?.value || 'bw';
        const columnWidth = getColumnWidth(selectedNewspaper.language, columns);

        if (isFullPageAd(columnWidth, height)) {
            showNotification('For full page ads, please contact us directly', 'warning');
            showContactForm();
            return;
        }

        const calc = calculateBoxAdPrice(selectedNewspaper, height, columns, colorOption);

        cartItem.details = {
            columns: columns,
            columnWidth: columnWidth,
            height: height,
            area: calc.area,
            colorOption: colorOption,
            rate: calc.rate,
            adTotal: calc.adTotal,
            commission: calc.commission
        };
        cartItem.description = `Box Ad: ${columns} col x ${height}cm (${colorOption === 'color' ? 'Color' : 'B&W'})`;
    } else {
        const text = document.getElementById('classifiedText')?.value || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const category = document.getElementById('classifiedCategory')?.value || 'general';

        if (words === 0) {
            showNotification('Please enter your classified ad text', 'warning');
            return;
        }

        const calc = calculateClassifiedPrice(selectedNewspaper, words);

        cartItem.details = {
            text: text,
            wordCount: words,
            category: category,
            adTotal: calc.adTotal,
            serviceCharge: calc.serviceCharge
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
                <span class="cart-item-date">${formatDate(item.pubDate)}</span>
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

        // Save to database (if available) or use local storage
        let saveSuccess = false;

        // Try to save to Supabase database
        if (typeof supabase !== 'undefined' && supabase && typeof QuotationDB !== 'undefined' && typeof CustomerDB !== 'undefined') {
            try {
                // Create or update customer
                const customer = await CustomerDB.create({
                    name: formData.customer_name,
                    company: formData.customer_company,
                    email: formData.customer_email,
                    phone: formData.customer_phone,
                    address: formData.customer_address
                });

                // Create quotation for each cart item
                for (const item of adCart) {
                    await QuotationDB.create({
                        quotation_number: quotationNumber,
                        customer_id: customer?.id,
                        publication_group: item.groupName,
                        newspaper_id: item.newspaperId,
                        newspaper_name: item.newspaperName,
                        ad_type: item.adType,
                        ad_details: item.details,
                        publication_date: item.pubDate,
                        total_amount: item.price,
                        status: formData.payment_status === 'completed' ? 'paid' : 'pending'
                    });
                }

                // Create payment record
                if (formData.payment_status === 'completed' && typeof PaymentDB !== 'undefined') {
                    await PaymentDB.create({
                        quotation_id: quotationNumber,
                        amount: formData.total_amount,
                        payment_method: paymentMethod,
                        reference_number: formData.payment_reference,
                        status: 'completed'
                    });
                }
                saveSuccess = true;
            } catch (dbError) {
                console.warn('Database save failed, using local storage:', dbError);
            }
        }

        // Fallback: Save to local storage if database not available
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

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));

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
