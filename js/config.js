/**
 * AdSpot Website Configuration
 * Complete publication data with B&W and Color rates
 * Language-based column system for Box Ads
 *
 * IMPORTANT: Replace API keys before deploying!
 */

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

    // Stripe Configuration (Publishable Key)
    STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_KEY',

    // Company Information
    COMPANY: {
        name: 'AdSpot Media Services',
        email: 'adspot77@gmail.com',
        phone: '070 642 1998',
        address: '130 High Level Road, Colombo 06'
    },

    // Bank Details for Bank Transfer
    BANK_DETAILS: {
        bankName: 'Sampath Bank PLC',
        accountName: 'P S Kavishka',
        accountNumber: '1210 5770 0812',
        branch: 'Karagampitiya'
    },

    // Newspaper Physical Dimensions (for preview)
    NEWSPAPER_SIZE: {
        width: 38, // cm
        height: 52  // cm
    },

    // Maximum ad height for all papers
    MAX_HEIGHT: 40, // cm

    // Booking Rules
    BOOKING_RULES: {
        minDaysInAdvance: 2,  // Ads must be booked at least 2 days in advance
        sundayDeadline: 'friday' // Sunday papers must be booked on or before Friday
    },

    // Service Charges and Commissions
    CHARGES: {
        classifiedServiceCharge: 100, // Rs. 100 for classified ads
        boxAdCommission: 0.10 // 10% platform commission for box ads
    },

    // Column Widths by Language (in cm)
    // English & Tamil use the same column widths
    // Sinhala uses different column widths
    COLUMN_WIDTHS: {
        english: {
            1: 3.0,
            2: 6.3,
            3: 9.6,
            4: 12.9,
            5: 16.2,
            6: 19.5,
            7: 22.8,
            8: 26.1,
            9: 29.4,
            10: 32.7
        },
        tamil: {
            1: 3.0,
            2: 6.3,
            3: 9.6,
            4: 12.9,
            5: 16.2,
            6: 19.5,
            7: 22.8,
            8: 26.1,
            9: 29.4,
            10: 32.7
        },
        sinhala: {
            1: 3.8,
            2: 8.0,
            3: 12.2,
            4: 16.4,
            5: 20.6,
            6: 24.8,
            7: 29.0,
            8: 33.2
        }
    },

    // Publication Groups by Language
    PUBLICATION_GROUPS: {
        'english': {
            id: 'english',
            name: 'English Newspapers',
            language: 'english'
        },
        'sinhala': {
            id: 'sinhala',
            name: 'Sinhala Newspapers',
            language: 'sinhala'
        },
        'tamil': {
            id: 'tamil',
            name: 'Tamil Newspapers',
            language: 'tamil'
        }
    },

    // Publications - All newspapers organized by traditional groups
    // bwRate and colorRate are SEPARATE fixed rates (no multiplier)
    PUBLICATIONS: {
        'lake-house': {
            name: 'Lake House (ANCL)',
            newspapers: [
                {
                    id: 'daily-news',
                    name: 'Daily News',
                    language: 'english',
                    bwRate: 180,
                    colorRate: 320,
                    classifiedBase: 1800,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 45,
                    isSundayPaper: false
                },
                {
                    id: 'sunday-observer',
                    name: 'Sunday Observer',
                    language: 'english',
                    bwRate: 220,
                    colorRate: 380,
                    classifiedBase: 2200,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 55,
                    isSundayPaper: true
                },
                {
                    id: 'dinamina',
                    name: 'Dinamina',
                    language: 'sinhala',
                    bwRate: 150,
                    colorRate: 280,
                    classifiedBase: 1500,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 40,
                    isSundayPaper: false
                },
                {
                    id: 'silumina',
                    name: 'Silumina',
                    language: 'sinhala',
                    bwRate: 200,
                    colorRate: 350,
                    classifiedBase: 2000,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 50,
                    isSundayPaper: true
                },
                {
                    id: 'thinakaran',
                    name: 'Thinakaran',
                    language: 'tamil',
                    bwRate: 140,
                    colorRate: 260,
                    classifiedBase: 1400,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 35,
                    isSundayPaper: false
                },
                {
                    id: 'thinakaran-varamanjari',
                    name: 'Thinakaran Varamanjari',
                    language: 'tamil',
                    bwRate: 160,
                    colorRate: 290,
                    classifiedBase: 1600,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 40,
                    isSundayPaper: true
                }
            ]
        },
        'wijeya': {
            name: 'Wijeya Newspapers',
            newspapers: [
                {
                    id: 'sunday-times',
                    name: 'Sunday Times',
                    language: 'english',
                    bwRate: 280,
                    colorRate: 480,
                    classifiedBase: 2800,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 70,
                    isSundayPaper: true
                },
                {
                    id: 'daily-mirror',
                    name: 'Daily Mirror',
                    language: 'english',
                    bwRate: 200,
                    colorRate: 350,
                    classifiedBase: 2000,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 50,
                    isSundayPaper: false
                },
                {
                    id: 'lankadeepa',
                    name: 'Lankadeepa',
                    language: 'sinhala',
                    bwRate: 220,
                    colorRate: 400,
                    classifiedBase: 2200,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 55,
                    isSundayPaper: false
                },
                {
                    id: 'lankadeepa-irida',
                    name: 'Irida Lankadeepa',
                    language: 'sinhala',
                    bwRate: 260,
                    colorRate: 450,
                    classifiedBase: 2600,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 65,
                    isSundayPaper: true
                },
                {
                    id: 'ada',
                    name: 'Ada',
                    language: 'sinhala',
                    bwRate: 180,
                    colorRate: 320,
                    classifiedBase: 1800,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 45,
                    isSundayPaper: false
                }
            ]
        },
        'upali': {
            name: 'Upali Newspapers',
            newspapers: [
                {
                    id: 'the-island',
                    name: 'The Island',
                    language: 'english',
                    bwRate: 200,
                    colorRate: 360,
                    classifiedBase: 2000,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 50,
                    isSundayPaper: false
                },
                {
                    id: 'sunday-island',
                    name: 'Sunday Island',
                    language: 'english',
                    bwRate: 240,
                    colorRate: 420,
                    classifiedBase: 2400,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 60,
                    isSundayPaper: true
                },
                {
                    id: 'divaina',
                    name: 'Divaina',
                    language: 'sinhala',
                    bwRate: 180,
                    colorRate: 320,
                    classifiedBase: 1800,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 45,
                    isSundayPaper: false
                },
                {
                    id: 'irida-divaina',
                    name: 'Irida Divaina',
                    language: 'sinhala',
                    bwRate: 220,
                    colorRate: 380,
                    classifiedBase: 2200,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 55,
                    isSundayPaper: true
                },
                {
                    id: 'navaliya',
                    name: 'Navaliya',
                    language: 'sinhala',
                    bwRate: 160,
                    colorRate: 290,
                    classifiedBase: 1600,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 40,
                    isSundayPaper: false
                }
            ]
        },
        'express': {
            name: 'Express Newspapers',
            newspapers: [
                {
                    id: 'virakesari',
                    name: 'Virakesari',
                    language: 'tamil',
                    bwRate: 160,
                    colorRate: 300,
                    classifiedBase: 1600,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 40,
                    isSundayPaper: false
                },
                {
                    id: 'virakesari-sunday',
                    name: 'Sunday Virakesari',
                    language: 'tamil',
                    bwRate: 200,
                    colorRate: 360,
                    classifiedBase: 2000,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 50,
                    isSundayPaper: true
                },
                {
                    id: 'sudar-oli',
                    name: 'Sudar Oli',
                    language: 'tamil',
                    bwRate: 140,
                    colorRate: 260,
                    classifiedBase: 1400,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 35,
                    isSundayPaper: false
                }
            ]
        },
        'mawbima': {
            name: 'Mawbima Group',
            newspapers: [
                {
                    id: 'mawbima',
                    name: 'Mawbima',
                    language: 'sinhala',
                    bwRate: 170,
                    colorRate: 310,
                    classifiedBase: 1700,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 42,
                    isSundayPaper: false
                },
                {
                    id: 'rivira',
                    name: 'Rivira',
                    language: 'sinhala',
                    bwRate: 200,
                    colorRate: 360,
                    classifiedBase: 2000,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 50,
                    isSundayPaper: true
                },
                {
                    id: 'ceylon-today',
                    name: 'Ceylon Today',
                    language: 'english',
                    bwRate: 180,
                    colorRate: 320,
                    classifiedBase: 1800,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 45,
                    isSundayPaper: false
                }
            ]
        },
        'ravaya': {
            name: 'Ravaya Group',
            newspapers: [
                {
                    id: 'ravaya',
                    name: 'Ravaya',
                    language: 'sinhala',
                    bwRate: 150,
                    colorRate: 280,
                    classifiedBase: 1500,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 38,
                    isSundayPaper: true
                },
                {
                    id: 'aruna',
                    name: 'Aruna',
                    language: 'sinhala',
                    bwRate: 140,
                    colorRate: 260,
                    classifiedBase: 1400,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 35,
                    isSundayPaper: false
                }
            ]
        },
        'lakbima': {
            name: 'Lakbima Group',
            newspapers: [
                {
                    id: 'lakbima',
                    name: 'Lakbima',
                    language: 'sinhala',
                    bwRate: 160,
                    colorRate: 290,
                    classifiedBase: 1600,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 40,
                    isSundayPaper: false
                },
                {
                    id: 'lakbima-sunday',
                    name: 'Sunday Lakbima',
                    language: 'sinhala',
                    bwRate: 190,
                    colorRate: 340,
                    classifiedBase: 1900,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 48,
                    isSundayPaper: true
                }
            ]
        },
        'government': {
            name: 'Government Gazette',
            newspapers: [
                {
                    id: 'gazette',
                    name: 'Government Gazette',
                    language: 'english',
                    bwRate: 250,
                    colorRate: 250, // No color option
                    classifiedBase: 2500,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 62,
                    isSundayPaper: false
                }
            ]
        }
    },

    // Classified Categories (no emojis)
    CLASSIFIED_CATEGORIES: {
        'jobs': { name: 'Jobs / Vacancies' },
        'property': { name: 'Property / Real Estate' },
        'vehicles': { name: 'Vehicles' },
        'matrimonial': { name: 'Matrimonial' },
        'education': { name: 'Education' },
        'services': { name: 'Services' },
        'obituary': { name: 'Obituary' },
        'tenders': { name: 'Tenders / Notices' },
        'general': { name: 'General' }
    },

    // Classified Ads Configuration
    CLASSIFIED_CONFIG: {
        baseWordLimit: { min: 10, max: 30 }, // Admin configurable range
        defaultFreeWords: 20, // Default base word limit
        serviceCharge: 100 // Rs. 100 service charge for classified ads
    },

    // Full page dimensions (triggers contact form)
    FULL_PAGE_WIDTH: 25, // cm - if width >= this, it's full page
    FULL_PAGE_THRESHOLD: 800, // sq cm - area threshold for full page

    // Quotation Number Prefix
    QUOTATION_PREFIX: 'ADM',

    // Currency
    CURRENCY: {
        code: 'LKR',
        symbol: 'Rs.',
        name: 'Sri Lankan Rupee'
    }
};

/**
 * Helper Functions
 */

// Format currency
function formatCurrency(amount) {
    return `Rs. ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Generate quotation number
function generateQuotationNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${CONFIG.QUOTATION_PREFIX}-${year}-${random}`;
}

// Get column width for a specific language and column count
function getColumnWidth(language, columns) {
    const lang = language.toLowerCase();
    const widths = CONFIG.COLUMN_WIDTHS[lang] || CONFIG.COLUMN_WIDTHS.english;
    return widths[columns] || widths[1];
}

// Get max columns for a language
function getMaxColumns(language) {
    const lang = language.toLowerCase();
    const widths = CONFIG.COLUMN_WIDTHS[lang] || CONFIG.COLUMN_WIDTHS.english;
    return Math.max(...Object.keys(widths).map(Number));
}

// Calculate Box Ad price with column system
// Formula: Height (cm) x Column width (cm) x Rate
function calculateBoxAdPrice(newspaper, height, columns, colorOption) {
    const language = newspaper.language || 'english';
    const columnWidth = getColumnWidth(language, columns);
    const area = height * columnWidth;
    const rate = colorOption === 'color' ? newspaper.colorRate : newspaper.bwRate;
    const adTotal = area * rate;

    // Add 10% platform commission
    const commission = adTotal * CONFIG.CHARGES.boxAdCommission;
    const total = adTotal + commission;

    return {
        height: height,
        columns: columns,
        columnWidth: columnWidth,
        area: area,
        rate: rate,
        adTotal: adTotal,
        commission: commission,
        total: total
    };
}

// Calculate Classified Ad price
function calculateClassifiedPrice(newspaper, wordCount) {
    const freeWords = newspaper.classifiedFreeWords;
    const extraWords = Math.max(0, wordCount - freeWords);
    const extraCost = extraWords * newspaper.classifiedExtraRate;
    const adTotal = newspaper.classifiedBase + extraCost;

    // Add Rs. 100 service charge
    const serviceCharge = CONFIG.CHARGES.classifiedServiceCharge;
    const total = adTotal + serviceCharge;

    return {
        basePrice: newspaper.classifiedBase,
        freeWords: freeWords,
        wordCount: wordCount,
        extraWords: extraWords,
        extraRate: newspaper.classifiedExtraRate,
        extraCost: extraCost,
        adTotal: adTotal,
        serviceCharge: serviceCharge,
        total: total
    };
}

// Check if full page ad
function isFullPageAd(width, height) {
    const area = width * height;
    return width >= CONFIG.FULL_PAGE_WIDTH || area >= CONFIG.FULL_PAGE_THRESHOLD;
}

// Get newspaper by ID
function getNewspaperById(newspaperId) {
    for (const [groupId, group] of Object.entries(CONFIG.PUBLICATIONS)) {
        const paper = group.newspapers.find(p => p.id === newspaperId);
        if (paper) {
            return { ...paper, groupId, groupName: group.name };
        }
    }
    return null;
}

// Get all newspapers flat list
function getAllNewspapers() {
    const all = [];
    for (const [groupId, group] of Object.entries(CONFIG.PUBLICATIONS)) {
        group.newspapers.forEach(paper => {
            all.push({ ...paper, groupId, groupName: group.name });
        });
    }
    return all;
}

// Get newspapers by language
function getNewspapersByLanguage(language) {
    const all = [];
    for (const [groupId, group] of Object.entries(CONFIG.PUBLICATIONS)) {
        group.newspapers.forEach(paper => {
            if (paper.language === language) {
                all.push({ ...paper, groupId, groupName: group.name });
            }
        });
    }
    return all;
}

// Validate booking date
function validateBookingDate(selectedDate, newspaper) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(0, 0, 0, 0);

    // Calculate minimum booking date (today + 2 days)
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + CONFIG.BOOKING_RULES.minDaysInAdvance);

    const errors = [];

    // Check if booking is at least 2 days in advance
    if (bookingDate < minDate) {
        errors.push(`Today's newspaper was printed yesterday. Please select a future date (minimum ${CONFIG.BOOKING_RULES.minDaysInAdvance} days in advance).`);
    }

    // Check Sunday paper deadline
    if (newspaper && newspaper.isSundayPaper) {
        const dayOfWeek = bookingDate.getDay();
        if (dayOfWeek === 0) { // Sunday
            // Find the Friday before
            const friday = new Date(bookingDate);
            friday.setDate(friday.getDate() - 2);

            if (today > friday) {
                errors.push(`Sunday papers must be booked on or before Friday. The deadline for this Sunday edition has passed.`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Get minimum booking date
function getMinBookingDate() {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + CONFIG.BOOKING_RULES.minDaysInAdvance);
    return minDate.toISOString().split('T')[0];
}

// Check if date is a Sunday
function isSunday(dateString) {
    const date = new Date(dateString);
    return date.getDay() === 0;
}

// Generate Invoice Number
function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${year}${month}-${random}`;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
