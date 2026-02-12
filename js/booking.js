/**
 * AdSpot - Booking Page JavaScript
 * Multi-step form with ad cart system and column-based calculations
 * Box Ad: Height (cm) x Column Width (cm) x Rate + 10% Commission
 * Classified: Base price + Extra words + Rs. 100 Service Charge
 */

let currentStep = 1;
let selectedNewspaper = null;
let selectedGroup = null;
let selectedLanguage = 'sinhala'; // Default language
let adCart = [];
let stripe = null;
let cardElement = null;
let appliedPromoCode = null; // { code, discount, type }
let promoDiscount = 0;

document.addEventListener('DOMContentLoaded', async function() {
    // Load newspapers from Firebase first
    await initNewspapersFromFirebase();

    initLanguageSelection();
    initBookingForm();
    initStripe();
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
});

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

    const langLabels = {
        'english': 'EN',
        'sinhala': 'SI',
        'tamil': 'TA'
    };

    container.innerHTML = classifiedNewspapers.map((paper, index) => `
        <label class="newspaper-card">
            <input type="radio" name="classifiedNewspaper" value="${paper.id}" ${index === 0 ? 'checked' : ''}>
            <div class="card-content">
                <span class="lang-badge">${langLabels[paper.language] || 'EN'}</span>
                <span class="paper-name">${paper.name}</span>
                <span class="paper-rate">From Rs. ${paper.classifiedBase}</span>
                ${paper.isSundayPaper ? '<span class="sunday-badge">Sunday</span>' : ''}
            </div>
        </label>
    `).join('');

    // Add change listeners
    container.querySelectorAll('input[name="classifiedNewspaper"]').forEach(radio => {
        radio.addEventListener('change', function() {
            selectedNewspaper = classifiedNewspapers.find(p => p.id === this.value);
            selectedGroup = selectedNewspaper.groupId;
            updateQuickRates();
            updateWordCount();
            updatePrice();
        });
    });
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
            { label: colorOption === 'color' ? 'Color Rate' : 'B&W Rate', value: `${formatCurrency(calc.rate)}/col-cm` },
            { label: 'Calculation', value: `${columns} col x ${height} cm x ${formatCurrency(calc.rate)}` },
            { label: 'Ad Total', value: formatCurrency(calc.adTotal) },
            { label: 'Platform Commission (10%)', value: formatCurrency(calc.commission) },
            { label: 'VAT (18%)', value: formatCurrency(calc.vat) }
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

        // Show file name
        fileName.textContent = file.name;
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
    } else if (step === 3) {
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
            ${promoDiscount > 0 ? `
            <div class="charge-row discount-row">
                <span>Promo Discount (${appliedPromoCode?.code}):</span>
                <span class="discount-amount">-${formatCurrency(promoDiscount)}</span>
            </div>
            ` : ''}
        </div>
        <div class="summary-total">
            <span>Total Amount:</span>
            <strong>${formatCurrency(total - promoDiscount)}</strong>
        </div>
    `;

    // Update submit button text
    const submitText = document.getElementById('submitText');
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const finalTotal = total - promoDiscount;
    if (paymentMethod === 'card') {
        submitText.textContent = `Pay ${formatCurrency(finalTotal)}`;
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

                // Prepare booking data for Firebase
                const cartTotal = adCart.reduce((sum, item) => sum + item.price, 0);
                const finalTotal = cartTotal - promoDiscount;

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
                    paymentMethod: paymentMethod,
                    paymentStatus: formData.payment_status,
                    paymentReference: formData.payment_reference || '',
                    notes: formData.notes || ''
                };

                // Save to Firebase (also triggers email via Apps Script)
                const bookingId = await saveBookingToFirebase(bookingData);
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
                <button class="btn btn-ghost" onclick="printBookingConfirmation()">Print Confirmation</button>
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
