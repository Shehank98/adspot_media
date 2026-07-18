/**
 * AdSpot - Booking Page JavaScript
 * Multi-step form with ad cart system and column-based calculations
 * Box Ad: Height (cm) x Column Width (cm) x Rate + 10% Commission
 * Classified: Base price + Extra words + Rs. 100 Service Charge
 */

let currentStep = 1;
let selectedNewspaper = null;
let selectedGroup = null;
let selectedLanguage = 'sinhala';
let adCart = [];
let appliedPromoCode = null;
let promoDiscount = 0;
let payhereBookingId = null;
let designAddonEnabled = false;
let DESIGN_FEE = 3000;
let COMMISSION_PCT = 5;
let VAT_PCT = 18;
let lastSubmittedBookingId = null;

async function loadServerSettings() {
    const keys = ['design_fee', 'box_commission_pct', 'vat_pct', 'classified_service_charge'];
    const results = await Promise.allSettled(
        keys.map(k => fetch('/api/settings/' + k).then(r => r.ok ? r.json() : null))
    );
    const [d1, d2, d3, d4] = results.map(r => r.status === 'fulfilled' ? r.value : null);

    if (d1?.value != null) {
        const v = parseFloat(d1.value);
        if (!isNaN(v)) DESIGN_FEE = v;
    }
    if (d2?.value != null) {
        const v = parseFloat(d2.value);
        if (!isNaN(v)) { COMMISSION_PCT = v; CONFIG.CHARGES.boxAdCommission = v / 100; }
    }
    if (d3?.value != null) {
        const v = parseFloat(d3.value);
        if (!isNaN(v)) { VAT_PCT = v; CONFIG.CHARGES.vatRate = v / 100; }
    }
    if (d4?.value != null) {
        const v = parseFloat(d4.value);
        if (!isNaN(v)) CONFIG.CHARGES.classifiedServiceCharge = v;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Load newspapers and server settings concurrently before anything renders
    await Promise.all([
        initNewspapersFromFirebase(),
        loadServerSettings()
    ]);

    initLanguageSelection();
    initBookingForm();
    initPayhere();
    setMinDate();
    loadSampleImages();
    initFileUpload();

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

    // Rebook: pre-fill cart from sessionStorage if arriving from my-bookings
    const rebookData = sessionStorage.getItem('adspot_rebook');
    if (rebookData) {
        sessionStorage.removeItem('adspot_rebook');
        try {
            const rebookItems = JSON.parse(rebookData);
            if (Array.isArray(rebookItems) && rebookItems.length) {
                prefillRebookCart(rebookItems);
                const banner = document.getElementById('rebookBanner');
                if (banner) banner.style.display = 'block';
            }
        } catch (_) {}
    }
});

function prefillRebookCart(items) {
    items.forEach(item => {
        const npName = item.newspaperName;
        const allNps = getAllNewspapers ? getAllNewspapers() : [];
        const np = allNps.find(n => n.name === npName);
        if (!np) return;

        let price = 0;
        if (item.adType === 'box' && item.details && typeof calculateBoxAdPrice === 'function') {
            const calc = calculateBoxAdPrice(np, item.details.height || 4, item.details.columns || 2, item.details.colorOption || 'bw');
            price = calc.total;
        } else if (item.adType === 'classified' && item.details && typeof calculateClassifiedPrice === 'function') {
            const calc = calculateClassifiedPrice(np, item.details.wordCount || 20);
            price = calc.total;
        } else {
            price = item.price || 0;
        }

        const cartItem = {
            id: Date.now() + Math.random(),
            newspaperId:       np.id,
            newspaperName:     np.name,
            newspaperLanguage: np.language,
            groupId:           np.groupId || '',
            adType:            item.adType,
            pubDate:           '',
            price:             price,
            details:           item.details || {},
            description:       item.description || np.name
        };
        adCart.push(cartItem);
    });
    if (typeof updateCartDisplay === 'function') updateCartDisplay();
}

/**
 * Initialize Newspapers from Firebase
 * Load newspaper data from Firebase and update CONFIG
 */
async function initNewspapersFromFirebase() {
    if (typeof loadNewspapersFromFirebase === 'function') {
        try {
            console.log('Loading newspapers from Firebase...');
            const newspapers = await loadNewspapersFromFirebase();

            // If newspapers loaded successfully, they're already set in CONFIG.PUBLICATIONS
            if (Object.keys(newspapers).length > 0) {
                console.log('✅ Newspapers loaded from Firebase:', Object.keys(newspapers).length, 'groups');
                console.log('📋 CONFIG.PUBLICATIONS now contains:', CONFIG.PUBLICATIONS);

                // Force refresh the newspaper display with new data
                updateNewspapersByLanguage(selectedLanguage);
            } else {
                console.log('⚠️ No newspapers loaded from Firebase, using default config');
            }
        } catch (error) {
            console.warn('❌ Failed to load newspapers from Firebase, using default config:', error);
        }
    } else {
        console.log('⚠️ Firebase not configured, using default newspaper config');
    }
}

/**
 * Initialize Language Selection
 */
function initLanguageSelection() {
    const languageButtons = document.querySelectorAll('.language-btn');

    languageButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            languageButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Update selected language
            selectedLanguage = this.dataset.language;
            // Update newspaper options
            updateNewspapersByLanguage(selectedLanguage);
        });
    });

    // Initialize with default language (Sinhala)
    updateNewspapersByLanguage(selectedLanguage);
}

/**
 * Update newspaper comparison table based on selected language
 */
function updateNewspapersByLanguage(language) {
    // Collect all newspapers from all publication groups
    let allNewspapers = [];
    Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
        group.newspapers.forEach(paper => {
            allNewspapers.push({
                ...paper,
                groupId: groupId,
                groupName: group.name
            });
        });
    });

    // Filter by selected language
    const filteredNewspapers = allNewspapers.filter(paper => paper.language === language);

    // Select first newspaper for preview and column options
    if (filteredNewspapers.length > 0) {
        selectedNewspaper = filteredNewspapers[0];
        selectedGroup = selectedNewspaper.groupId;
        updateColumnOptions();
        updateComparisonTable(filteredNewspapers);
        updateClassifiedNewspaperGrid(filteredNewspapers);
        updateNewspaperPreview();
    }
}

/**
 * Update classified newspaper selection grid
 */
function updateClassifiedNewspaperGrid(newspapers) {
    const container = document.getElementById('classifiedNewspaperSelect');
    if (!container) return;

    // Filter out newspapers that don't support classified ads (classifiedBase = 0 or empty)
    const classifiedNewspapers = newspapers.filter(paper => {
        const classifiedBase = parseFloat(paper.classifiedBase) || 0;
        return classifiedBase > 0;
    });

    // If no newspapers support classified ads for this language, show message
    if (classifiedNewspapers.length === 0) {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--gray-500);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48" style="margin: 0 auto 1rem; opacity: 0.5;">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p style="margin: 0; font-size: 1rem;">No newspapers offer classified ads in this language</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Please select a different language or use Box Ads</p>
            </div>
        `;
        return;
    }

    const langClass = { 'english': 'en', 'sinhala': 'si', 'tamil': 'ta' };
    const langLabel = { 'english': 'EN', 'sinhala': 'SI', 'tamil': 'TA' };

    container.innerHTML = classifiedNewspapers.map((paper, index) => {
        const lc = langClass[paper.language] || 'en';
        const ll = langLabel[paper.language] || 'EN';
        const base = parseFloat(paper.classifiedBase) || 0;
        const free = paper.classifiedFreeWords || 0;
        const extra = paper.classifiedExtraRate || 0;
        return `
        <label class="np-card${index === 0 ? ' selected' : ''}">
            <input type="radio" name="classifiedNewspaper" value="${paper.id}" ${index === 0 ? 'checked' : ''}>
            <span class="np-lang ${lc}">${ll}</span>
            <span class="np-name">${paper.name}</span>
            <span class="np-rate">From Rs. ${base.toLocaleString()}</span>
            <span class="np-free">${free} words incl. &bull; Rs. ${extra}/extra</span>
            ${paper.isSundayPaper ? '<span class="np-sunday">Sunday</span>' : ''}
        </label>`;
    }).join('');

    // Add change listeners
    container.querySelectorAll('input[name="classifiedNewspaper"]').forEach(radio => {
        radio.addEventListener('change', function() {
            selectedNewspaper = classifiedNewspapers.find(p => p.id === this.value);
            selectedGroup = selectedNewspaper.groupId;
            // Update selected card styling
            container.querySelectorAll('.np-card').forEach(c => c.classList.remove('selected'));
            this.closest('.np-card')?.classList.add('selected');
            updateQuickRates();
            updateWordCount();
            updatePrice();
            // Show design addon once a newspaper is selected
            const addonBox = document.getElementById('designAddonBox');
            if (addonBox) addonBox.style.display = 'block';
        });
    });

    // Mark the initially-checked card as selected
    const checkedRadio = container.querySelector('input[name="classifiedNewspaper"]:checked');
    if (checkedRadio) checkedRadio.closest('.np-card')?.classList.add('selected');
}

/**
 * Update comparison table with all newspapers
 */
function updateComparisonTable(newspapers) {
    const tableBody = document.getElementById('comparisonTableBody');
    const adType = document.querySelector('input[name="adType"]:checked').value;

    if (adType !== 'box') {
        tableBody.innerHTML = '';
        return;
    }

    const columns = parseInt(document.getElementById('adColumns')?.value) || 1;
    const height = parseFloat(document.getElementById('adHeight')?.value) || 0;
    const colorOption = document.getElementById('colorOption')?.value || 'bw';
    const width = columns > 0 ? getColumnWidth(selectedNewspaper.language, columns) : 0;

    // Update ad size display
    document.getElementById('adSizeDisplay').textContent =
        `${columns} col (${width.toFixed(1)}cm) x ${height}cm - ${colorOption === 'color' ? 'Full Color' : 'Black & White'}`;

    const langLabels = {
        'english': 'English',
        'sinhala': 'Sinhala',
        'tamil': 'Tamil'
    };

    // Sort newspapers: Daily papers first, then by price (low to high)
    const sortedNewspapers = newspapers.map(paper => ({
        ...paper,
        calculatedPrice: calculateBoxAdPrice(paper, height, columns, colorOption).total,
        sortOrder: paper.isSundayPaper ? 1 : 0 // 0 for daily, 1 for sunday
    })).sort((a, b) => {
        // First sort by frequency (daily first)
        if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
        }
        // Then sort by price (low to high)
        return a.calculatedPrice - b.calculatedPrice;
    });

    tableBody.innerHTML = sortedNewspapers.map(paper => {
        const calc = calculateBoxAdPrice(paper, height, columns, colorOption);
        const frequency = paper.isSundayPaper ? 'Sunday' : 'Daily';

        return `
            <tr>
                <td><span class="newspaper-name">${paper.name}</span></td>
                <td><span class="newspaper-frequency">${frequency}</span></td>
                <td><span class="newspaper-language">${langLabels[paper.language] || paper.language}</span></td>
                <td><span class="newspaper-price">${formatCurrency(calc.total)}</span></td>
                <td>
                    <button type="button" class="btn-add-to-cart" data-paper-id="${paper.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 8v8M8 12h8"/>
                        </svg>
                        Add
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Add click listeners to table rows to update sidebar
    tableBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', function(e) {
            // Don't trigger if clicking the add button
            if (e.target.closest('.btn-add-to-cart')) return;

            const btn = this.querySelector('.btn-add-to-cart');
            const paperId = btn.dataset.paperId;
            selectedNewspaper = sortedNewspapers.find(p => p.id === paperId);
            selectedGroup = selectedNewspaper.groupId;

            // Update price sidebar and preview (DON'T update column options to prevent reset)
            updateQuickRates();
            updatePrice();
            updateNewspaperPreview();

            // Highlight selected row
            tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Add click listeners to all add buttons
    tableBody.querySelectorAll('.btn-add-to-cart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent row click
            const paperId = this.dataset.paperId;
            const newspaper = sortedNewspapers.find(p => p.id === paperId);

            // Set selected newspaper and calculate price for THIS newspaper
            selectedNewspaper = newspaper;
            selectedGroup = newspaper.groupId;

            // Calculate price for this specific newspaper
            const columns = parseInt(document.getElementById('adColumns')?.value) || 1;
            const height = parseFloat(document.getElementById('adHeight')?.value) || 0;
            const colorOption = document.getElementById('colorOption')?.value || 'bw';
            const calc = calculateBoxAdPrice(newspaper, height, columns, colorOption);
            window.currentAdPrice = calc.total;

            showPubDateModal();
        });
    });
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
                <span>VAT:</span>
                <strong>${VAT_PCT}%</strong>
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
    // Pre-fill contact details from Firebase auth when user is signed in
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        const emailField = document.getElementById('customerEmail');
        const nameField  = document.getElementById('customerName');
        if (emailField && !emailField.value) {
            emailField.value = user.email;
            emailField.setAttribute('readonly', 'true');
            emailField.style.background = '#f1f5f9';
            emailField.style.cursor = 'not-allowed';
            emailField.title = 'Email is tied to your account';
        }
        if (nameField && !nameField.value && user.displayName) {
            nameField.value = user.displayName;
        }
    });

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
                updateComparisonSection();
            });
            el.addEventListener('change', function() {
                updatePrice();
                checkFullPage();
                updateComparisonSection();
            });
        }
    });

    document.getElementById('colorOption')?.addEventListener('change', function() {
        updatePrice();
        updateComparisonSection();
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

    // Classified date validation
    const classifiedDate = document.getElementById('classifiedDate');
    if (classifiedDate) {
        classifiedDate.addEventListener('change', function() {
            validateClassifiedDate();
        });
    }

    // Confirm add to cart from modal
    document.getElementById('confirmAddToCart')?.addEventListener('click', function() {
        addToCart();
    });

    // Add to cart button for classified ads
    document.getElementById('addClassifiedToCartBtn')?.addEventListener('click', function() {
        // For classified, use the inline date field
        const pubDate = document.getElementById('classifiedDate');
        if (pubDate.value) {
            // Copy to main pubDate for validation
            document.getElementById('pubDate').value = pubDate.value;
            addToCart();
        } else {
            showNotification('Please select a publication date', 'warning');
        }
    });

    // Continue button
    document.getElementById('continueBtn')?.addEventListener('click', () => goToStep(2));

    // Promo code buttons
    document.getElementById('applyPromoBtn')?.addEventListener('click', applyPromoCode);
    document.getElementById('removePromoBtn')?.addEventListener('click', removePromoCode);
    document.getElementById('promoCode')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyPromoCode();
        }
    });

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

    // Design addon checkbox
    document.getElementById('designAddonCheck')?.addEventListener('change', function() {
        designAddonEnabled = this.checked;
        const label = document.getElementById('designAddonLabel');
        if (label) label.classList.toggle('checked', designAddonEnabled);
        updatePrice();
        updateCartDisplay();
    });

    // Update design fee label now that settings are loaded
    const designFeeLabel = document.getElementById('designAddonFeeLabel');
    if (designFeeLabel) designFeeLabel.textContent = '+ Rs. ' + DESIGN_FEE.toLocaleString();

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
    const classifiedPubDate = document.getElementById('classifiedPubDate');
    const addClassifiedBtn = document.getElementById('addClassifiedToCartBtn');
    const classifiedHint = document.getElementById('classifiedCartHint');

    if (adType === 'box') {
        boxConfig.style.display = 'block';
        classifiedConfig.style.display = 'none';
        classifiedPubDate.style.display = 'none';
        addClassifiedBtn.style.display = 'none';
        classifiedHint.style.display = 'none';
        updateColumnOptions();
        updateComparisonSection();
    } else {
        boxConfig.style.display = 'none';
        classifiedConfig.style.display = 'block';
        classifiedPubDate.style.display = 'block';
        addClassifiedBtn.style.display = 'flex';
        classifiedHint.style.display = 'block';
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
    updateClassifiedPreview();
}

function updateClassifiedPreview() {
    const text = document.getElementById('classifiedText')?.value || '';
    const preview = document.getElementById('classifiedPreview');
    if (!preview) return;

    if (!text.trim()) { preview.style.display = 'none'; return; }

    const np   = selectedNewspaper;
    const lang = (selectedLanguage || 'english').toLowerCase();
    const widths = (typeof CONFIG !== 'undefined' && CONFIG.COLUMN_WIDTHS)
        ? (CONFIG.COLUMN_WIDTHS[lang] || CONFIG.COLUMN_WIDTHS.english)
        : { 1: 3.0 };
    const colW = widths[1] || 3.0;
    const pxWidth = Math.round(colW * 37.8);

    document.getElementById('prevCol').style.width = pxWidth + 'px';
    document.getElementById('prevText').textContent = text;
    document.getElementById('prevNpName').textContent = np ? np.name : '';

    const wc    = text.trim().split(/\s+/).filter(Boolean).length;
    const free  = np?.classifiedFreeWords || 0;
    const extra = Math.max(0, wc - free);
    const metaParts = [wc + ' word' + (wc !== 1 ? 's' : '')];
    if (free) metaParts.push(free + ' free');
    if (extra > 0) metaParts.push(extra + ' extra at Rs. ' + (np?.classifiedExtraRate || 0) + '/word');
    document.getElementById('prevMeta').textContent = metaParts.join(' — ');

    preview.style.display = 'block';
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
 * Validate classified publication date
 */
function validateClassifiedDate() {
    const classifiedDate = document.getElementById('classifiedDate');
    const dateWarning = document.getElementById('classifiedDateWarning');

    if (!classifiedDate || !classifiedDate.value) return;

    const validation = validateBookingDate(classifiedDate.value, selectedNewspaper);

    if (!validation.isValid) {
        if (dateWarning) {
            dateWarning.innerHTML = validation.errors.map(err => `<p>${err}</p>`).join('');
            dateWarning.style.display = 'block';
        }
        classifiedDate.classList.add('invalid');
    } else {
        if (dateWarning) {
            dateWarning.style.display = 'none';
        }
        classifiedDate.classList.remove('invalid');

        // Show Sunday paper warning
        if (selectedNewspaper && selectedNewspaper.isSundayPaper && isSunday(classifiedDate.value)) {
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

        details = [
            { label: 'Newspaper', value: selectedNewspaper.name },
            { label: 'Size', value: `${columns} col x ${height} cm (H)` },
            { label: 'Column Width', value: `${calc.columnWidth.toFixed(1)} cm (${selectedNewspaper.language})` },
            { label: 'Ad Total', value: formatCurrency(calc.adTotal + calc.commission) },
            { label: `VAT (${VAT_PCT}%)`, value: formatCurrency(calc.vat) }
        ];

        // Update comparison section
        updateComparisonSection();
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

    // Add design fee line when enabled (must be before render)
    if (designAddonEnabled && DESIGN_FEE > 0) {
        details.push({ label: 'Ad Design Service', value: formatCurrency(DESIGN_FEE) });
        total += DESIGN_FEE;
    }

    // Update price display
    const priceDetails = document.getElementById('priceDetails');
    priceDetails.innerHTML = details.map(d => `
        <div class="price-row${d.label === 'Ad Design Service' ? '" style="color:#2563eb;font-weight:500' : ''}">
            <span>${d.label}:</span>
            <span>${d.value}</span>
        </div>
    `).join('');

    document.getElementById('currentAdTotal').textContent = formatCurrency(total);

    // Show design addon box once a newspaper is selected
    const addonBox = document.getElementById('designAddonBox');
    if (addonBox && selectedNewspaper) addonBox.style.display = 'block';

    // Store for cart
    window.currentAdPrice = total;

    // Update floating price bar
    updateFloatingPriceBar(total, details);
}

// ── Floating price bar ─────────────────────────────────────────────────────

function updateFloatingPriceBar(total, details) {
    const bar = document.getElementById('floatingPriceBar');
    if (!bar) return;
    if (total <= 0) { bar.classList.remove('visible'); return; }

    document.getElementById('fpbTotal').textContent = formatCurrency(total);

    // Build short breakdown line
    const adTotalRow = details.find(d => d.label === 'Ad Total');
    const vatRow     = details.find(d => d.label && d.label.startsWith('VAT'));
    const scRow      = details.find(d => d.label === 'Service Charge');
    const parts = [];
    if (adTotalRow) parts.push('Base ' + adTotalRow.value);
    if (vatRow)     parts.push('VAT ' + vatRow.value);
    if (scRow)      parts.push('Service ' + scRow.value);
    const bk = document.getElementById('fpbBreakdown');
    if (bk) bk.textContent = parts.join(' · ');

    bar.classList.add('visible');
}

/**
 * Update comparison section for box ads
 */
function updateComparisonSection() {
    if (!selectedNewspaper) return;

    // Collect newspapers in current language
    let allNewspapers = [];
    Object.entries(CONFIG.PUBLICATIONS).forEach(([groupId, group]) => {
        group.newspapers.forEach(paper => {
            allNewspapers.push({
                ...paper,
                groupId: groupId,
                groupName: group.name
            });
        });
    });

    const filteredNewspapers = allNewspapers.filter(paper => paper.language === selectedLanguage);
    updateComparisonTable(filteredNewspapers);
    updateNewspaperPreview();
}

/**
 * Update newspaper preview with ad placement
 */
function updateNewspaperPreview() {
    const previewContainer = document.getElementById('newspaperPreview');
    if (!previewContainer || !selectedNewspaper) return;

    const adType = document.querySelector('input[name="adType"]:checked').value;
    if (adType !== 'box') {
        previewContainer.innerHTML = '';
        return;
    }

    const columns = parseInt(document.getElementById('adColumns')?.value) || 1;
    const height = parseFloat(document.getElementById('adHeight')?.value) || 10;
    const colorOption = document.getElementById('colorOption')?.value || 'bw';
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

    // Add color class for color ads
    const colorClass = colorOption === 'color' ? 'color-ad' : '';

    previewContainer.innerHTML = `
        <div class="newspaper-outline" style="width: ${scaledPaperWidth}px; height: ${scaledPaperHeight}px;">
            <div class="newspaper-header">
                <span class="paper-title">${selectedNewspaper.name}</span>
                <span class="paper-size">${paperWidth} x ${paperHeight} cm</span>
            </div>
            <div class="ad-placement ${colorClass}" style="width: ${scaledAdWidth}px; height: ${scaledAdHeight}px;">
                <span class="ad-label">Your Ad</span>
                <span class="ad-size">${width.toFixed(1)} x ${height} cm</span>
            </div>
        </div>
    `;
}

/**
 * Initialize file upload
 */
function initFileUpload() {
    const fileInput = document.getElementById('adFile');
    const uploadArea = document.getElementById('fileUploadArea');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');
    const fileName = document.getElementById('fileName');
    const removeBtn = document.getElementById('removeFile');

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'var(--gray-300)';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--gray-300)';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });

    // Remove file
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        uploadPlaceholder.style.display = 'flex';
        uploadPreview.style.display = 'none';
        previewImage.style.display = 'none';
        previewImage.src = '';
    });

    function handleFileSelect() {
        const file = fileInput.files[0];
        if (!file) return;

        // Check file size (10MB limit)
        const maxSizeBytes = 10 * 1024 * 1024; // 10MB
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

        if (file.size > maxSizeBytes) {
            // Show warning and clear file input
            alert(`⚠️ File Size Too Large (${fileSizeMB} MB)\n\nYour file exceeds our 10 MB upload limit.\n\nPlease send your artwork via:\n\n📧 Email: info@adspotmedia.lk\n📱 WhatsApp: Contact us directly\n☁️ Cloud Storage: Upload to Google Drive/Dropbox and share the link\n\nWe'll process your ad and confirm within 24 hours.\n\nTip: You can still complete your booking and upload the artwork later!`);

            // Clear the file input
            fileInput.value = '';

            // Reset preview area
            uploadPlaceholder.style.display = 'flex';
            uploadPreview.style.display = 'none';
            previewImage.style.display = 'none';
            fileName.textContent = '';

            return;
        }

        // Show file name
        fileName.textContent = `${file.name} (${fileSizeMB} MB)`;
        uploadPlaceholder.style.display = 'none';
        uploadPreview.style.display = 'flex';

        // Show image preview if it's an image
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewImage.style.display = 'none';
        }
    }
}

/**
 * Show publication date modal
 */
function showPubDateModal() {
    const modal = document.getElementById('pubDateModal');
    modal.classList.add('active');

    // Reset date field
    const pubDate = document.getElementById('pubDate');
    pubDate.value = '';
    document.getElementById('dateWarning').style.display = 'none';
}

/**
 * Close publication date modal
 */
function closePubDateModal() {
    const modal = document.getElementById('pubDateModal');
    modal.classList.remove('active');
}
window.closePubDateModal = closePubDateModal;

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
        // Don't close modal if validation fails
        return;
    }

    // Close the modal if it's open
    closePubDateModal();

    let cartItem = {
        id: Date.now(),
        newspaperId: selectedNewspaper.id,
        newspaperName: selectedNewspaper.name,
        newspaperLanguage: selectedNewspaper.language,
        groupId: selectedGroup,
        groupName: selectedNewspaper.groupName || (CONFIG.PUBLICATIONS[selectedGroup]?.name || 'Unknown'),
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
            commission: calc.commission,
            vat: calc.vat
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
            language: selectedLanguage,
            freeWords: selectedNewspaper.classifiedFreeWords || 0,
            extraRate: selectedNewspaper.classifiedExtraRate || 0,
            adTotal: calc.adTotal,
            serviceCharge: calc.serviceCharge
        };
        cartItem.description = `Classified: ${words} words (${CONFIG.CLASSIFIED_CATEGORIES[category]?.name || category})`;
    }

    // Check if same newspaper already in cart — update it in place instead of
    // blocking with a native confirm() dialog.
    const existingIndex = adCart.findIndex(item => item.newspaperId === cartItem.newspaperId && item.adType === cartItem.adType);
    if (existingIndex >= 0) {
        adCart[existingIndex] = cartItem;
        updateCartDisplay();
        showNotification(`Updated your ${selectedNewspaper.name} ad`, 'success');
    } else {
        adCart.push(cartItem);
        updateCartDisplay();
        showNotification(`Added ${selectedNewspaper.name} to cart!`, 'success');
    }
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
            <div class="cart-item-actions">
                <button type="button" class="cart-item-edit" onclick="editCartItem(${item.id})" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button type="button" class="cart-item-remove" onclick="removeFromCart(${item.id})" title="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    const cartBase = adCart.reduce((sum, item) => sum + item.price, 0);
    const cartWithDesign = cartBase + (designAddonEnabled ? DESIGN_FEE : 0);
    cartTotal.textContent = formatCurrency(cartWithDesign);
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
 * Load a cart item back into the Step 1 form for editing.
 * Removes it from the cart so the customer reconfigures and re-adds it.
 */
function editCartItem(itemId) {
    const item = adCart.find(i => i.id === itemId);
    if (!item) return;
    const d = item.details || {};

    // Remove from cart first so re-adding creates a clean entry
    adCart = adCart.filter(i => i.id !== itemId);
    updateCartDisplay();

    // Jump back to Step 1
    goToStep(1);

    // Restore ad type
    const typeRadio = document.querySelector(`input[name="adType"][value="${item.adType}"]`);
    if (typeRadio) typeRadio.checked = true;
    toggleAdOptions();

    // Restore language (rebuilds newspaper tables/grids, resets selectedNewspaper)
    const lang = item.newspaperLanguage || d.language;
    if (lang) {
        const langBtn = document.querySelector(`.language-btn[data-language="${lang}"]`);
        if (langBtn) {
            document.querySelectorAll('.language-btn').forEach(b => b.classList.remove('active'));
            langBtn.classList.add('active');
            selectedLanguage = lang;
            updateNewspapersByLanguage(lang);
        }
    }

    // Re-select the specific newspaper
    const paper = (typeof getNewspaperById === 'function') ? getNewspaperById(item.newspaperId) : null;
    if (paper) { selectedNewspaper = paper; selectedGroup = paper.groupId; }

    if (item.adType === 'box') {
        if (d.colorOption) document.getElementById('colorOption').value = d.colorOption;
        if (d.height != null) document.getElementById('adHeight').value = d.height;
        // Columns must be set after updateColumnOptions (triggered by language/type)
        updateColumnOptions();
        if (d.columns != null) document.getElementById('adColumns').value = d.columns;
        // Pre-fill the publication date used by the date modal
        const pd = document.getElementById('pubDate');
        if (pd && item.pubDate) pd.value = item.pubDate;
        window.currentAdPrice = item.price;
        updateComparisonSection();
        updatePrice();
        // Highlight the paper's row in the comparison table
        const row = document.querySelector(`#comparisonTableBody .btn-add-to-cart[data-paper-id="${item.newspaperId}"]`)?.closest('tr');
        if (row) { document.querySelectorAll('#comparisonTableBody tr').forEach(r => r.classList.remove('selected')); row.classList.add('selected'); }
        showNotification(`Editing your ${item.newspaperName} ad — adjust it, then click “Add” on that newspaper to put it back in your cart.`, 'info');
    } else {
        // Classified
        if (d.category) { const c = document.getElementById('classifiedCategory'); if (c) c.value = d.category; }
        const txt = document.getElementById('classifiedText');
        if (txt) txt.value = d.text || '';
        // Check the classified newspaper radio for this paper
        const radio = document.querySelector(`input[name="classifiedNewspaper"][value="${item.newspaperId}"]`);
        if (radio) {
            radio.checked = true;
            document.querySelectorAll('#classifiedNewspaperSelect .np-card').forEach(cd => cd.classList.remove('selected'));
            radio.closest('.np-card')?.classList.add('selected');
        }
        const cDate = document.getElementById('classifiedDate');
        if (cDate && item.pubDate) cDate.value = item.pubDate;
        const addonBox = document.getElementById('designAddonBox');
        if (addonBox) addonBox.style.display = 'block';
        updateWordCount();
        updatePrice();
        showNotification(`Editing your ${item.newspaperName} classified — adjust it, then click “Add Classified to Cart”.`, 'info');
    }

    // Scroll to the config so the customer sees the restored values
    setTimeout(() => {
        const target = item.adType === 'box'
            ? document.getElementById('boxAdConfig')
            : document.getElementById('classifiedConfig');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
}
window.editCartItem = editCartItem;

/**
 * Update sidebar for step 2 to show cart items
 */
function updateStep2Sidebar() {
    const priceCard = document.querySelector('.price-card');
    if (!priceCard) return;

    const total = adCart.reduce((sum, item) => sum + item.price, 0);

    priceCard.innerHTML = `
        <h3>Your Selected Newspapers</h3>
        <div class="cart-summary" id="sidebarCartItems">
            ${adCart.map(item => `
                <div class="sidebar-cart-item">
                    <div class="sidebar-item-info">
                        <strong>${item.newspaperName}</strong>
                        <small>${item.description}</small>
                        <small>${formatDate(item.pubDate)}</small>
                    </div>
                    <div class="sidebar-item-price">${formatCurrency(item.price)}</div>
                </div>
            `).join('')}
        </div>
        <div class="price-total">
            <span>Cart Total</span>
            <span class="total-amount">${formatCurrency(total)}</span>
        </div>
    `;
}

/**
 * Navigate to step
 */
function goToStep(step) {
    if (step < 1 || step > 3) return;

    // Validate before proceeding
    if (step > currentStep && !validateStep(currentStep)) {
        return;
    }

    // Check if user is logged in before going to payment step
    if (step === 3 && currentStep === 2) {
        const user = firebase.auth().currentUser;
        if (!user) {
            // Show login warning modal
            showLoginWarning();
            return;
        }
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

    // Update sidebar based on step
    if (step === 2) {
        updateStep2Sidebar();
        syncStickyPreview(2);
    } else if (step === 3) {
        updateOrderSummary();
        syncStickyPreview(3);
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

            // Validate phone (exactly 10 digits)
            if (!phone) {
                errors.push('Phone number is required');
                phoneField?.classList.add('field-error');
                if (errors.length === 1) phoneField?.focus();
            } else if (!/^[0-9]{10}$/.test(phone)) {
                if (phone.length < 10) {
                    errors.push('Phone number must be exactly 10 digits');
                } else if (phone.length > 10) {
                    errors.push('Phone number cannot exceed 10 digits');
                } else {
                    errors.push('Phone number must contain only digits (0-9)');
                }
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

    // Ad subtotal includes platform commission for box ads (commission is not
    // shown to the customer as a separate line).
    const subtotal = adCart.reduce((sum, item) => {
        if (item.adType === 'box') {
            return sum + item.details.adTotal + (item.details.commission || 0);
        } else {
            return sum + item.details.adTotal;
        }
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

    const cartSubtotal = adCart.reduce((sum, item) => sum + item.price, 0);
    const designFeeAmount = designAddonEnabled ? DESIGN_FEE : 0;
    const total = cartSubtotal + designFeeAmount;

    // Keep floating bar in sync with cart total on steps 2/3
    if (currentStep > 1) {
        const bar = document.getElementById('floatingPriceBar');
        const fpbTotalEl = document.getElementById('fpbTotal');
        if (bar && fpbTotalEl) {
            fpbTotalEl.textContent = formatCurrency(total);
            const fpbBk = document.getElementById('fpbBreakdown');
            if (fpbBk) fpbBk.textContent = adCart.length + (adCart.length === 1 ? ' ad' : ' ads') + ' in cart';
            if (total > 0) bar.classList.add('visible');
        }
    }

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
                    <div class="item-price">${formatCurrency(item.details.adTotal + (item.adType === 'box' ? (item.details.commission || 0) : 0))}</div>
                </div>
            `).join('')}
        </div>
        <div class="summary-charges">
            <div class="charge-row">
                <span>Ad Subtotal:</span>
                <span>${formatCurrency(subtotal)}</span>
            </div>
            ${totalVAT > 0 ? `
            <div class="charge-row">
                <span>VAT (${VAT_PCT}%):</span>
                <span>${formatCurrency(totalVAT)}</span>
            </div>
            ` : ''}
            ${totalServiceCharge > 0 ? `
            <div class="charge-row">
                <span>Service Charge:</span>
                <span>${formatCurrency(totalServiceCharge)}</span>
            </div>
            ` : ''}
            ${promoDiscount > 0 ? `
            <div class="charge-row discount-row">
                <span>Promo Discount (${appliedPromoCode?.code}):</span>
                <span class="discount-amount">-${formatCurrency(promoDiscount)}</span>
            </div>
            ` : ''}
            ${designFeeAmount > 0 ? `
            <div class="charge-row" style="color:#2563eb;font-weight:500;">
                <span>Ad Design Service:</span>
                <span>${formatCurrency(designFeeAmount)}</span>
            </div>
            ` : ''}
        </div>
        <div class="summary-total">
            <span>Total Amount:</span>
            <strong>${formatCurrency(total - promoDiscount)}</strong>
        </div>
    `;

    // Update submit button text based on payment method
    const submitText = document.getElementById('submitText');
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const finalTotal = total - promoDiscount;
    if (paymentMethod === 'helapay') {
        submitText.textContent = 'Pay Now';
    } else if (paymentMethod === 'card') {
        submitText.textContent = `Pay ${formatCurrency(finalTotal)}`;
    } else {
        submitText.textContent = 'Confirm Booking';
    }
}

/**
 * Toggle payment method
 */
function togglePaymentMethod() {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const cardEl = document.getElementById('cardPayment');
    if (cardEl) cardEl.style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('bankPayment').style.display = method === 'bank' ? 'block' : 'none';
    const helaEl = document.getElementById('helapayPayment');
    if (helaEl) helaEl.style.display = method === 'helapay' ? 'block' : 'none';
    // Update button label
    const submitText = document.getElementById('submitText');
    if (submitText) {
        if (method === 'helapay') submitText.textContent = 'Pay Now';
        else if (method === 'card') submitText.textContent = 'Pay Now';
        else submitText.textContent = 'Confirm Booking';
    }
    updateOrderSummary();
}

/**
 * Sync classified preview panels shown in steps 2 and 3
 */
function syncStickyPreview(stepNum) {
    const classifiedItem = adCart.find(item => item.adType === 'classified');
    const panelId = 'classifiedPreviewSticky' + stepNum;
    const panel = document.getElementById(panelId);
    if (!panel) return;

    if (!classifiedItem || !classifiedItem.details?.text) {
        panel.style.display = 'none';
        return;
    }

    const text = classifiedItem.details.text || '';
    const np = classifiedItem.details;
    const lang = (classifiedItem.details.language || 'sinhala').toLowerCase();
    const widths = (CONFIG.COLUMN_WIDTHS && CONFIG.COLUMN_WIDTHS[lang]) || CONFIG.COLUMN_WIDTHS.english || {};
    const colW = widths[1] || 3.0;
    const pxWidth = Math.round(colW * 37.8);

    const colEl = document.getElementById('prevColSticky' + stepNum);
    const metaEl = document.getElementById('prevMetaSticky' + stepNum);
    const npNameEl = document.getElementById('prevNpNameSticky' + stepNum);

    if (colEl) { colEl.textContent = text; colEl.style.width = pxWidth + 'px'; }
    if (npNameEl) npNameEl.textContent = classifiedItem.newspaperName || '';

    if (metaEl) {
        const wc = text.trim().split(/\s+/).filter(Boolean).length;
        const free = classifiedItem.details.freeWords || 0;
        const extra = Math.max(0, wc - free);
        const parts = [wc + ' word' + (wc !== 1 ? 's' : '')];
        if (free) parts.push(free + ' free');
        if (extra > 0) parts.push(extra + ' extra');
        metaEl.textContent = parts.join(' — ');
    }
    panel.style.display = 'block';
}

function editClassifiedText() {
    goToStep(1);
    setTimeout(() => {
        const el = document.getElementById('classifiedText');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
    }, 300);
}
window.editClassifiedText = editClassifiedText;

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
 * Initialize PayHere payment callbacks
 */
function initPayhere() {
    if (typeof payhere === 'undefined') {
        // PayHere script not loaded yet, try again
        setTimeout(initPayhere, 200);
        return;
    }

    // Payment completed — update booking status in Firebase
    payhere.onCompleted = async function(orderId) {
        console.log('✅ PayHere payment completed. Order ID:', orderId);
        try {
            if (payhereBookingId && typeof db !== 'undefined') {
                await db.collection('bookings').doc(payhereBookingId).update({
                    paymentStatus: 'completed',
                    paymentReference: orderId,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Booking updated to completed in Firebase');
            }
        } catch (err) {
            console.warn('Could not update booking status:', err);
        }

        // Show success modal
        const customerEmail = document.getElementById('customerEmail')?.value || '';
        const storedQuotation = sessionStorage.getItem('lastQuotationNumber') || orderId;
        showSuccessModal(storedQuotation, customerEmail, 'card');
    };

    // Payment dismissed (user closed popup)
    payhere.onDismissed = function() {
        console.log('ℹ️ PayHere popup dismissed by user');
        showNotification('Payment cancelled. You can try again or choose Bank Transfer.', 'info');
        const btn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitLoader = document.getElementById('submitLoader');
        if (btn) btn.disabled = false;
        if (submitText) submitText.style.display = 'block';
        if (submitLoader) submitLoader.style.display = 'none';
    };

    // Payment error
    payhere.onError = function(error) {
        console.error('❌ PayHere payment error:', error);
        showNotification('Payment failed: ' + error + '. Please try again or use Bank Transfer.', 'error');
        const btn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitLoader = document.getElementById('submitLoader');
        if (btn) btn.disabled = false;
        if (submitText) submitText.style.display = 'block';
        if (submitLoader) submitLoader.style.display = 'none';
    };

    console.log('✅ PayHere initialized');
}

/**
 * Start PayHere payment popup
 */
function startPayherePayment(quotationNumber, formData, amount) {
    if (typeof payhere === 'undefined') {
        showNotification('PayHere is not loaded. Please refresh the page and try again.', 'error');
        return;
    }

    // Generate hash: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase())
    const merchantId = CONFIG.PAYHERE_MERCHANT_ID;
    const merchantSecret = CONFIG.PAYHERE_MERCHANT_SECRET;
    const orderId = quotationNumber;
    const formattedAmount = parseFloat(amount).toFixed(2);
    const currency = 'LKR';

    const secretHash = CryptoJS.MD5(merchantSecret).toString().toUpperCase();
    const hash = CryptoJS.MD5(merchantId + orderId + formattedAmount + currency + secretHash).toString().toUpperCase();

    // Split customer name into first/last
    const nameParts = (formData.customer_name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const payment = {
        sandbox: CONFIG.PAYHERE_SANDBOX,
        merchant_id: merchantId,
        return_url: window.location.href,
        cancel_url: window.location.href,
        notify_url: 'https://script.google.com/macros/s/AKfycbxqC7dhbLgOB9PjLuMFHBwn2uyTVQyJnDdt92GwWLC-q-UlJ3mB0a7eWNvwOnyhDxHV/exec', // ← Update with your Apps Script URL
        order_id: orderId,
        items: 'Newspaper Advertisement - ' + orderId,
        amount: formattedAmount,
        currency: currency,
        hash: hash,
        first_name: firstName,
        last_name: lastName,
        email: formData.customer_email || '',
        phone: (formData.customer_phone || '').replace(/\D/g, '').substring(0, 10),
        address: formData.customer_address || 'N/A',
        city: 'Colombo',
        country: 'Sri Lanka',
    };

    console.log('🔁 Starting PayHere payment for:', orderId, '| Amount:', formattedAmount);
    payhere.startPayment(payment);
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

        // Calculate cart total and final amount (needed for PayHere and throughout)
        const cartTotal = adCart.reduce((sum, item) => sum + item.price, 0);
        const designFeeTotal = designAddonEnabled ? DESIGN_FEE : 0;
        const finalTotal = cartTotal + designFeeTotal - promoDiscount;

        // Always use the Firebase-authenticated email so my-bookings always finds the booking
        const firebaseUser = firebase.auth().currentUser;
        const authEmail = firebaseUser?.email || '';

        // Collect form data
        const formData = {
            quotation_number: quotationNumber,
            invoice_number: invoiceNumber,
            items: adCart,
            total_amount: adCart.reduce((sum, item) => sum + item.price, 0),
            customer_name: document.getElementById('customerName')?.value,
            customer_company: document.getElementById('customerCompany')?.value,
            // Authoritative email = Firebase token email (ignores whatever is typed in the field)
            customer_email: authEmail || document.getElementById('customerEmail')?.value,
            customer_phone: document.getElementById('customerPhone')?.value,
            customer_address: document.getElementById('customerAddress')?.value,
            notes: document.getElementById('adNotes')?.value,
            payment_method: paymentMethod,
            status: 'pending'
        };

        // For card: save as pending first, then trigger PayHere popup
        // For bank: save as pending (manual verification)
        formData.payment_status = 'pending';

        // Save to database (if available) or use local storage
        let saveSuccess = false;
        let preSubmitReceiptUrl = '';

        // Try to save to Firebase first
        if (typeof saveBookingToFirebase === 'function') {
            try {
                console.log('Saving booking to Firebase...');

                // Upload ad files to Firebase Storage if they exist
                const fileInput = document.getElementById('adFile');
                let adFileUrl = '';

                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    console.log('Uploading ad file to Firebase Storage...');

                    // Show progress bar
                    const progressContainer = document.getElementById('uploadProgressContainer');
                    const progressFill = document.getElementById('uploadProgressFill');
                    const progressPercent = document.getElementById('uploadProgressPercent');
                    const progressStatus = document.getElementById('uploadProgressStatus');

                    if (progressContainer) {
                        progressContainer.style.display = 'block';
                        progressStatus.textContent = 'Uploading artwork...';
                    }

                    if (typeof uploadAdFileToFirebase === 'function') {
                        try {
                            adFileUrl = await uploadAdFileToFirebase(file, quotationNumber, (progress) => {
                                // Update progress bar
                                if (progressFill && progressPercent) {
                                    progressFill.style.width = `${progress}%`;
                                    progressPercent.textContent = `${Math.round(progress)}%`;
                                }
                            });

                            console.log('Ad file uploaded:', adFileUrl);

                            // Show success status
                            if (progressStatus) {
                                progressStatus.textContent = '✓ Upload complete!';
                            }

                            // Hide progress bar after 1 second
                            setTimeout(() => {
                                if (progressContainer) {
                                    progressContainer.style.display = 'none';
                                }
                            }, 1000);

                        } catch (uploadError) {
                            console.warn('File upload failed, continuing without file:', uploadError);
                            if (progressStatus) {
                                progressStatus.textContent = '✗ Upload failed';
                            }
                            setTimeout(() => {
                                if (progressContainer) {
                                    progressContainer.style.display = 'none';
                                }
                            }, 2000);
                        }
                    }
                }

                // Upload receipt before booking if bank transfer + file selected
                if (paymentMethod === 'bank') {
                    const receiptInput = document.getElementById('receiptFileInput');
                    if (receiptInput?.files?.[0]) {
                        try {
                            const receiptFile = receiptInput.files[0];
                            const receiptRef = storage.ref(`receipts/pre_${quotationNumber}/${Date.now()}_${receiptFile.name}`);
                            const snap = await receiptRef.put(receiptFile);
                            preSubmitReceiptUrl = await snap.ref.getDownloadURL();
                            console.log('✅ Receipt pre-uploaded:', preSubmitReceiptUrl);
                        } catch (err) {
                            console.warn('Receipt pre-upload failed, continuing:', err);
                        }
                    }
                }

                // Prepare booking data for Firebase
                const bookingData = {
                    quotationNumber: quotationNumber,
                    invoiceNumber: invoiceNumber,
                    customerName: formData.customer_name,
                    customerEmail: formData.customer_email,
                    customerPhone: formData.customer_phone,
                    customerCompany: formData.customer_company || '',
                    customerAddress: formData.customer_address || '',
                    items: adCart.map(item => ({
                        newspaperId: item.newspaperId,
                        newspaperName: item.newspaperName,
                        groupName: item.groupName || '',
                        adType: item.adType,
                        pubDate: item.pubDate,
                        price: item.price,
                        details: item.details || {},
                        description: item.description || '',
                        adFileUrl: adFileUrl
                    })),
                    subtotalAmount: cartTotal,
                    promoCode: appliedPromoCode?.code || null,
                    promoDiscount: promoDiscount || 0,
                    totalAmount: finalTotal,
                    designRequested: designAddonEnabled,
                    designFee: designFeeTotal,
                    paymentMethod: paymentMethod,
                    paymentStatus: formData.payment_status,
                    paymentReference: formData.payment_reference || '',
                    notes: formData.notes || '',
                    receiptUrl: preSubmitReceiptUrl || null,
                    receiptUploadedAt: preSubmitReceiptUrl ? new Date().toISOString() : null,
                    receiptStatus: preSubmitReceiptUrl ? 'submitted' : 'none'
                };

                // Generate unpaid quotation PDF before saving (bank transfer only)
                if (paymentMethod === 'bank' && typeof generateInvoicePDF === 'function') {
                    try {
                        let qtSubtotal = 0, qtCommission = 0, qtVat = 0, qtServiceCharge = 0;
                        adCart.forEach(item => {
                            if (item.adType === 'box') {
                                qtSubtotal += item.details?.adTotal || 0;
                                qtCommission += item.details?.commission || 0;
                                qtVat += item.details?.vat || 0;
                            } else {
                                qtSubtotal += item.details?.adTotal || 0;
                                qtServiceCharge += item.details?.serviceCharge || 0;
                            }
                        });
                        const qtInvoiceData = {
                            invoiceNumber: invoiceNumber,
                            quotationNumber: quotationNumber,
                            subtotal: qtSubtotal,
                            commission: qtCommission,
                            vat: qtVat,
                            serviceCharge: qtServiceCharge,
                            promoCode: appliedPromoCode?.code || '',
                            promoDiscount: promoDiscount || 0,
                            total: finalTotal
                        };
                        const qtBookingData = {
                            customerName: formData.customer_name,
                            customerEmail: formData.customer_email,
                            customerPhone: formData.customer_phone,
                            customerCompany: formData.customer_company || '',
                            items: bookingData.items
                        };
                        bookingData.quotationPdfUrl = await generateInvoicePDF(qtInvoiceData, qtBookingData, false);
                        console.log('✅ Quotation PDF generated:', bookingData.quotationPdfUrl);
                    } catch (pdfErr) {
                        console.warn('⚠️ Quotation PDF generation failed, continuing:', pdfErr);
                    }
                }

                // Save to Firebase (also triggers email via Apps Script)
                const bookingId = await saveBookingToFirebase(bookingData);
                payhereBookingId = bookingId;
                lastSubmittedBookingId = bookingId;
                console.log('✅ Booking saved to Firebase:', bookingId);

                // Increment promo code usage count if promo was applied
                if (appliedPromoCode && appliedPromoCode.code) {
                    try {
                        await firebase.firestore().collection('promoCodes').doc(appliedPromoCode.code).update({
                            usedCount: firebase.firestore.FieldValue.increment(1),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log('✅ Promo code usage count incremented');
                    } catch (promoError) {
                        console.warn('Failed to increment promo code usage:', promoError);
                        // Don't fail the booking if promo increment fails
                    }
                }

                // Save invoice to Firebase
                if (typeof saveInvoiceToFirebase === 'function') {
                    // Calculate proper invoice breakdown based on ad types in cart
                    let subtotal = 0;
                    let commission = 0;
                    let vat = 0;
                    let serviceCharge = 0;

                    adCart.forEach(item => {
                        if (item.adType === 'box') {
                            // Box ad: Base + 10% commission + 18% VAT
                            const calc = item.details; // Already calculated
                            subtotal += calc.adTotal || 0;
                            commission += calc.commission || 0;
                            vat += calc.vat || 0;
                        } else if (item.adType === 'classified') {
                            // Classified ad: Base + Rs. 100 service charge (no commission, no VAT)
                            subtotal += item.details.adTotal || 0;
                            serviceCharge += item.details.serviceCharge || 0;
                        }
                    });

                    const invoiceData = {
                        invoiceNumber: invoiceNumber,
                        quotationNumber: quotationNumber,
                        bookingId: bookingId,
                        customerId: firebase?.auth()?.currentUser?.uid || 'guest',
                        customerName: formData.customer_name,
                        customerEmail: formData.customer_email,
                        items: bookingData.items,
                        subtotal: subtotal,
                        commission: commission, // Only for box ads
                        vat: vat, // Only for box ads
                        serviceCharge: serviceCharge, // Only for classified ads
                        promoCode: appliedPromoCode?.code || null,
                        promoDiscount: promoDiscount || 0,
                        total: finalTotal,
                        hasBoxAds: adCart.some(item => item.adType === 'box'),
                        hasClassifiedAds: adCart.some(item => item.adType === 'classified')
                    };
                    await saveInvoiceToFirebase(invoiceData);
                    console.log('✅ Invoice saved to Firebase');
                }

                saveSuccess = true;
            } catch (firebaseError) {
                console.warn('Firebase save failed, trying fallback:', firebaseError);
            }
        }

        // Fallback: Try to save to Supabase database if Firebase failed
        if (!saveSuccess && typeof supabase !== 'undefined' && supabase && typeof QuotationDB !== 'undefined' && typeof CustomerDB !== 'undefined') {
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
                        details: item.details, // Includes classified text
                        adFileUrl: item.adFileUrl || '' // Include file attachment URL
                    }))
                };

                const customerData = {
                    name: formData.customer_name,
                    email: formData.customer_email,
                    phone: formData.customer_phone
                };

                // NOTE: Emails are now sent via firebase-db.js sendBookingEmails()
                // - Booking confirmation sent to customer
                // - Admin notification sent to admin
                // Both handled in the Firebase save function (no quotation email)
                console.log('✅ Emails will be sent via Firebase DB function');

            } catch (emailError) {
                console.warn('Email sending failed:', emailError);
            }
        }

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        // Show success or trigger payment flow
        if (paymentMethod === 'card') {
            // Trigger PayHere popup for online payment
            sessionStorage.setItem('lastQuotationNumber', quotationNumber);
            startPayherePayment(quotationNumber, formData, finalTotal);
            // Note: success modal is shown inside payhere.onCompleted callback
            // Reset button state here since PayHere controls the flow
            submitBtn.disabled = false;
            submitText.style.display = 'block';
            submitLoader.style.display = 'none';
            return; // Don't fall through to finally block reset
        } else if (paymentMethod === 'helapay') {
            // HelaPay QR — show QR modal, reset button so user can interact
            submitBtn.disabled = false;
            submitText.style.display = 'block';
            submitLoader.style.display = 'none';
            startHelapayPayment(quotationNumber, finalTotal, formData);
            return;
        } else {
            // Bank transfer — show success modal immediately
            showSuccessModal(quotationNumber, formData.customer_email, paymentMethod, preSubmitReceiptUrl);
        }

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
function showSuccessModal(quotationNumber, email, paymentMethod, receiptUrl = '') {
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

    const isPaid = paymentMethod === 'card' || paymentMethod === 'helapay';
    const nextSteps = isPaid ? `
        <div class="next-steps">
            <h4>What happens next</h4>
            <ol>
                <li>Your payment is confirmed and your booking is locked in.</li>
                <li>We've emailed your invoice (PDF) to <strong>${email}</strong>.</li>
                <li>Our team places your ad and you'll get a proof once it's published.</li>
            </ol>
        </div>
    ` : `
        <div class="next-steps">
            <h4>What happens next</h4>
            <ol>
                <li>We've emailed your quotation (PDF) to <strong>${email}</strong>.</li>
                <li>Transfer the total to the bank account below, using <strong>${quotationNumber}</strong> as the reference.</li>
                <li>${receiptUrl
                    ? 'Your receipt is in — we\'ll verify it and confirm your booking shortly.'
                    : 'Upload your payment receipt so we can verify and confirm faster.'}</li>
            </ol>
        </div>
    `;

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
            ${receiptUrl
                ? `<div class="receipt-submitted-note"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Receipt uploaded — we'll verify and confirm your booking shortly.</div>`
                : `<p class="bank-note">Please complete the bank transfer and use your quotation number as the payment reference.</p>`
            }
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

            ${nextSteps}

            ${bankDetails}

            <div class="success-actions">
                <a href="my-bookings.html" class="btn btn-primary">${paymentMethod === 'bank' ? 'Track Booking & Upload Receipt' : 'Track My Booking'}</a>
                <button class="btn btn-ghost" onclick="printBookingConfirmation()">Print Confirmation</button>
                <a href="index.html" class="btn btn-ghost">Return to Home</a>
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

function previewReceiptFile(input) {
    const btn = document.getElementById('receiptUploadBtn');
    const wrap = document.getElementById('receiptThumbWrap');
    const nameEl = document.getElementById('receiptFileName');
    if (!input.files || !input.files[0]) return;
    if (btn) btn.disabled = false;
    const file = input.files[0];
    if (nameEl) nameEl.textContent = file.name;
    if (wrap && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
            wrap.innerHTML = `<img src="${e.target.result}" class="receipt-thumb" alt="Receipt preview">`;
        };
        reader.readAsDataURL(file);
    } else if (wrap) {
        wrap.innerHTML = `<p style="font-size:12px;color:#475569;margin-top:8px;">${file.name}</p>`;
    }
}
window.previewReceiptFile = previewReceiptFile;

async function uploadReceipt(quotationNumber) {
    const input = document.getElementById('receiptFileInput');
    const btn = document.getElementById('receiptUploadBtn');
    const statusEl = document.getElementById('receiptStatusMsg');
    if (!input || !input.files || !input.files[0]) return;

    const file = input.files[0];
    const bookingId = lastSubmittedBookingId;
    if (!bookingId) {
        if (statusEl) { statusEl.textContent = 'Booking ID not found. Please contact us.'; statusEl.className = 'receipt-status-msg error'; }
        return;
    }
    if (btn) btn.disabled = true;
    if (statusEl) { statusEl.textContent = 'Uploading...'; statusEl.className = 'receipt-status-msg'; }

    try {
        const storageRef = storage.ref(`receipts/${bookingId}/${Date.now()}_${file.name}`);
        const snap = await storageRef.put(file);
        const url = await snap.ref.getDownloadURL();

        const guestEmail = document.getElementById('customerEmail')?.value || '';
        await apiRequest('PATCH', `/api/bookings/${bookingId}/receipt`, {
            receipt_url: url,
            receipt_uploaded_at: new Date().toISOString(),
            receipt_status: 'submitted',
            customer_email: guestEmail
        });

        if (statusEl) { statusEl.textContent = 'Receipt uploaded. Our team will verify and confirm your booking shortly.'; statusEl.className = 'receipt-status-msg success'; }
        if (btn) btn.textContent = 'Uploaded';
    } catch (err) {
        console.error('Receipt upload failed:', err);
        if (statusEl) { statusEl.textContent = 'Upload failed. Please try again or email the receipt to ' + CONFIG.COMPANY.email; statusEl.className = 'receipt-status-msg error'; }
        if (btn) btn.disabled = false;
    }
}
window.uploadReceipt = uploadReceipt;

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

/**
 * Load sample images for ad types
 */
function loadSampleImages() {
    const boxAdContainer = document.getElementById('boxAdSamples');
    const classifiedContainer = document.getElementById('classifiedAdSamples');

    // Box Ad Samples
    const boxAdImages = [
        'images/samples/box-ad-sample-1.jpg',
        'images/samples/box-ad-sample-2.jpg',
        'images/samples/box-ad-sample-3.jpg'
    ];

    // Classified Ad Samples
    const classifiedImages = [
        'images/samples/classified-ad-sample-1.jpg',
        'images/samples/classified-ad-sample-2.jpg',
        'images/samples/classified-ad-sample-3.jpg'
    ];

    // Function to check if image exists and load it
    function loadImages(container, images) {
        let loadedCount = 0;
        const imageElements = images.map(src => {
            const img = new Image();
            img.onload = function() {
                loadedCount++;
                if (loadedCount === 1) {
                    // Replace placeholder when first image loads
                    container.innerHTML = '';
                }
                container.appendChild(img);
            };
            img.onerror = function() {
                // Image doesn't exist, skip it
                console.log('Sample image not found:', src);
            };
            img.src = src;
            img.alt = 'Ad Sample';
            return img;
        });
    }

    if (boxAdContainer) {
        loadImages(boxAdContainer, boxAdImages);
    }

    if (classifiedContainer) {
        loadImages(classifiedContainer, classifiedImages);
    }
}

/**
 * Print booking confirmation only (not entire page)
 */
function printBookingConfirmation() {
    // Get the success modal content
    const modalContent = document.querySelector('#successModal .success-content');

    if (!modalContent) {
        window.print(); // Fallback to regular print if modal not found
        return;
    }

    // Clone the content
    const printContent = modalContent.cloneNode(true);

    // Remove the action buttons from print
    const actions = printContent.querySelector('.success-actions');
    if (actions) actions.remove();

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Booking Confirmation</title>
            <style>
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    max-width: 800px;
                    margin: 20px auto;
                    padding: 20px;
                    color: #1f2937;
                }
                .success-icon {
                    text-align: center;
                    font-size: 48px;
                    margin-bottom: 20px;
                }
                .success-icon svg {
                    width: 64px;
                    height: 64px;
                    stroke: #10b981;
                }
                h2 {
                    text-align: center;
                    color: #1e40af;
                    margin-bottom: 10px;
                }
                .success-message {
                    text-align: center;
                    color: #6b7280;
                    margin-bottom: 30px;
                }
                .confirmation-details {
                    background: #f9fafb;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .confirmation-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                .confirmation-row:last-child {
                    border-bottom: none;
                }
                .quotation-highlight {
                    color: #1e40af;
                    font-size: 18px;
                }
                .order-items {
                    margin: 20px 0;
                }
                .order-items h4 {
                    color: #1f2937;
                    margin-bottom: 12px;
                }
                .confirmation-item {
                    background: #f9fafb;
                    padding: 12px;
                    margin-bottom: 8px;
                    border-radius: 6px;
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr auto;
                    gap: 10px;
                    align-items: center;
                }
                .confirmation-item strong {
                    font-weight: 600;
                }
                .bank-details-box {
                    background: #fffbeb;
                    border: 2px solid #f59e0b;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .bank-details-box h4 {
                    color: #92400e;
                    text-align: center;
                    margin-bottom: 16px;
                }
                .bank-info {
                    font-size: 14px;
                }
                .bank-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0;
                }
                .bank-note {
                    font-size: 13px;
                    color: #6b7280;
                    margin-top: 12px;
                    text-align: center;
                }
                .contact-info {
                    text-align: center;
                    font-size: 13px;
                    color: #6b7280;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 15px;
                    }
                }
            </style>
        </head>
        <body>
            ${printContent.innerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();

    // Wait for content to load, then print
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}
window.printBookingConfirmation = printBookingConfirmation;

/**
 * Show login warning modal before payment
 */
function showLoginWarning() {
    const modal = document.getElementById('loginWarningModal');
    if (modal) {
        modal.style.display = 'flex';
        // Store that we want to go to step 3 after login/continue
        sessionStorage.setItem('pendingStepNavigation', '3');
    }
}

/**
 * Close login warning and continue as guest
 */
function closeLoginWarning() {
    const modal = document.getElementById('loginWarningModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Continue to step 3 as guest
    proceedToStep3AsGuest();
}

/**
 * Proceed to step 3 without login
 */
function proceedToStep3AsGuest() {
    // Set a flag that user chose to continue as guest
    sessionStorage.setItem('continueAsGuest', 'true');

    // Actually go to step 3
    currentStep = 3;

    // Update step display
    document.querySelectorAll('.form-step').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`.form-step[data-step="3"]`).classList.add('active');

    // Update progress
    document.querySelectorAll('.progress-step').forEach(el => {
        const stepNum = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (stepNum === 3) {
            el.classList.add('active');
        } else if (stepNum < 3) {
            el.classList.add('completed');
        }
    });

    updateOrderSummary();
    document.querySelector('.booking-form-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Handle login button from warning modal
 */
function loginFromWarning() {
    const modal = document.getElementById('loginWarningModal');
    if (modal) {
        modal.style.display = 'none';
    }

    // Trigger login button click
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.click();
    }
}

/**
 * Apply promo code
 */
async function applyPromoCode() {
    const promoInput = document.getElementById('promoCode');
    const applyBtn = document.getElementById('applyPromoBtn');
    const btnText = document.getElementById('applyPromoText');
    const btnLoader = document.getElementById('applyPromoLoader');
    const promoMessage = document.getElementById('promoMessage');
    const promoDiscountDiv = document.getElementById('promoDiscount');

    const code = promoInput.value.trim().toUpperCase();

    if (!code) {
        showPromoMessage('Please enter a promo code', 'error');
        return;
    }

    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    applyBtn.disabled = true;

    try {
        // Validate promo code from Firebase
        const promoDoc = await firebase.firestore()
            .collection('promoCodes')
            .doc(code)
            .get();

        if (!promoDoc.exists) {
            showPromoMessage('Invalid promo code', 'error');
            return;
        }

        const promoData = promoDoc.data();
        const now = new Date();

        // Check if promo code is active
        if (!promoData.active) {
            showPromoMessage('This promo code is no longer active', 'error');
            return;
        }

        // Check validity period
        if (promoData.validFrom && now < promoData.validFrom.toDate()) {
            showPromoMessage('This promo code is not yet valid', 'error');
            return;
        }

        if (promoData.validUntil && now > promoData.validUntil.toDate()) {
            showPromoMessage('This promo code has expired', 'error');
            return;
        }

        // Check usage limit
        if (promoData.maxUses && promoData.usedCount >= promoData.maxUses) {
            showPromoMessage('This promo code has reached its usage limit', 'error');
            return;
        }

        // Apply the discount
        appliedPromoCode = {
            code: code,
            discount: promoData.discount,
            type: promoData.type, // 'percentage' or 'fixed'
            name: promoData.name
        };

        // Calculate discount
        const cartTotal = adCart.reduce((sum, item) => sum + item.price, 0);

        if (promoData.type === 'percentage') {
            promoDiscount = (cartTotal * promoData.discount) / 100;
        } else {
            promoDiscount = Math.min(promoData.discount, cartTotal); // Don't exceed cart total
        }

        // Show success message
        const discountText = promoData.type === 'percentage'
            ? `${promoData.discount}% off`
            : `Rs. ${promoData.discount} off`;

        showPromoMessage(`Promo code applied! You saved ${formatCurrency(promoDiscount)}`, 'success');

        // Show discount badge
        document.getElementById('promoDiscountText').textContent =
            `${code} - ${discountText} applied`;
        promoDiscountDiv.style.display = 'flex';

        // Hide input group
        promoInput.disabled = true;

        // Update order summary
        updateOrderSummary();

    } catch (error) {
        console.error('Error applying promo code:', error);
        showPromoMessage('Error validating promo code. Please try again.', 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        applyBtn.disabled = false;
    }
}

/**
 * Remove applied promo code
 */
function removePromoCode() {
    appliedPromoCode = null;
    promoDiscount = 0;

    const promoInput = document.getElementById('promoCode');
    const promoMessage = document.getElementById('promoMessage');
    const promoDiscountDiv = document.getElementById('promoDiscount');

    promoInput.value = '';
    promoInput.disabled = false;
    promoMessage.style.display = 'none';
    promoDiscountDiv.style.display = 'none';

    updateOrderSummary();
    showNotification('Promo code removed', 'info');
}

/**
 * Show promo code validation message
 */
function showPromoMessage(message, type) {
    const promoMessage = document.getElementById('promoMessage');
    promoMessage.textContent = message;
    promoMessage.className = `promo-message ${type}`;
    promoMessage.style.display = 'block';

    // Hide after 5 seconds for success, 8 seconds for error
    setTimeout(() => {
        if (type === 'success') {
            promoMessage.style.display = 'none';
        }
    }, type === 'success' ? 5000 : 8000);
}

// Make functions globally available
window.showLoginWarning = showLoginWarning;
window.closeLoginWarning = closeLoginWarning;
window.loginFromWarning = loginFromWarning;

// ─── HelaPay QR Payment ──────────────────────────────────────────────────────

let helapayQrReference = null;
let qrCountdownInterval = null;
let qrPollTimeout = null;

async function startHelapayPayment(quotationNumber, amount, formData) {
    showHelapayModal();
    setQrState('loading');

    try {
        const res = await fetch(CONFIG.HELAPAY.FUNCTIONS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generateQR', referenceId: quotationNumber, amount })
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.qr_data) throw new Error('No QR data returned');

        helapayQrReference = data.qr_reference;

        // Render QR code onto canvas
        await QRCode.toCanvas(document.getElementById('qrCanvas'), data.qr_data, {
            width: 240,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' }
        });

        document.getElementById('qrAmount').textContent = `Rs. ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('qrRef').textContent = `Ref: ${quotationNumber}`;
        setQrState('ready');
        startQrCountdown(5 * 60);
        pollHelapayStatus(data.qr_reference, quotationNumber, formData, amount);
    } catch (err) {
        console.error('[HelaPay] QR generation failed:', err.message);
        setQrState('failed', 'QR Generation Failed', err.message);
    }
}

async function pollHelapayStatus(qrReference, quotationNumber, formData, amount) {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes at 5s intervals

    const poll = async () => {
        if (attempts++ >= maxAttempts) {
            setQrState('failed', 'Payment Expired', 'QR code has expired. Please try again.');
            return;
        }
        try {
            const res = await fetch(CONFIG.HELAPAY.FUNCTIONS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkStatus', qrReference })
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            const status = data.payment_status ?? data.sale?.payment_status;

            if (status === 2 || status === '2') {
                clearQrCountdown();
                setQrState('success');
                await markQuotationPaidFromBooking(quotationNumber);
                setTimeout(() => {
                    closeHelapayModal();
                    showSuccessModal(quotationNumber, formData.customer_email, 'helapay');
                }, 2000);
            } else if (status === -1 || status === '-1') {
                setQrState('failed', 'Payment Failed', 'The payment was declined. Please try again or use Bank Transfer.');
            } else {
                qrPollTimeout = setTimeout(poll, 5000);
            }
        } catch {
            qrPollTimeout = setTimeout(poll, 5000);
        }
    };

    qrPollTimeout = setTimeout(poll, 5000);
}

async function markQuotationPaidFromBooking(quotationNumber) {
    // Update in Supabase if available
    if (typeof QuotationDB !== 'undefined' && typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            await QuotationDB.updateStatusByNumber(quotationNumber, 'paid');
        } catch (e) {
            console.warn('[HelaPay] DB update failed:', e.message);
        }
    }
    // Also update localStorage fallback
    try {
        const orders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        const idx = orders.findIndex(o => o.quotation_number === quotationNumber);
        if (idx !== -1) {
            orders[idx].status = 'paid';
            orders[idx].payment_status = 'paid';
            orders[idx].payment_method = 'helapay';
            localStorage.setItem('adspot_orders', JSON.stringify(orders));
        }
    } catch {/* ignore */}
}

// Modal helpers
function showHelapayModal() {
    document.getElementById('helapayModal')?.classList.add('active');
}

function closeHelapayModal() {
    document.getElementById('helapayModal')?.classList.remove('active');
    clearQrCountdown();
    if (qrPollTimeout) { clearTimeout(qrPollTimeout); qrPollTimeout = null; }
}

function setQrState(state, title, msg) {
    ['qrLoading', 'qrReady', 'qrSuccess', 'qrFailed'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const map = { loading: 'qrLoading', ready: 'qrReady', success: 'qrSuccess', failed: 'qrFailed' };
    const el = document.getElementById(map[state]);
    if (el) el.style.display = 'flex';
    if (state === 'failed') {
        const titleEl = document.getElementById('qrFailTitle');
        const msgEl = document.getElementById('qrFailMsg');
        if (title && titleEl) titleEl.textContent = title;
        if (msg && msgEl) msgEl.textContent = msg;
    }
}

function startQrCountdown(seconds) {
    const el = document.getElementById('qrTimer');
    let rem = seconds;
    qrCountdownInterval = setInterval(() => {
        if (rem <= 0) { clearInterval(qrCountdownInterval); return; }
        rem--;
        const m = String(Math.floor(rem / 60)).padStart(2, '0');
        const s = String(rem % 60).padStart(2, '0');
        if (el) el.textContent = `${m}:${s}`;
    }, 1000);
}

function clearQrCountdown() {
    if (qrCountdownInterval) { clearInterval(qrCountdownInterval); qrCountdownInterval = null; }
}

window.closeHelapayModal = closeHelapayModal;
