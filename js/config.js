/**
 * AdSpot Website Configuration
 * Complete publication data with B&W and Color rates
 * Language-based column system for Box Ads
 *
 * IMPORTANT: Replace API keys before deploying!
 */

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://dwikjvghmpukghzgoizr.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aWtqdmdobXB1a2doemdvaXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTk3NTQsImV4cCI6MjA4NTg3NTc1NH0.fJy1S9Wuk17keuiniokzrerNz-1ixNjR7cl6TOAOeFk',

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
        width: 33, // cm
        height: 52  // cm
    },

    // Maximum ad height for all papers
    MAX_HEIGHT: 50, // cm

    // Booking Rules
    BOOKING_RULES: {
        minDaysInAdvance: 2,  // Ads must be booked at least 2 days in advance
        sundayDeadline: 'thursday' // Sunday papers must be booked on or before Thursday
    },

    // Service Charges and Commissions
    CHARGES: {
        classifiedServiceCharge: 50, // Rs. 100 for classified ads
        boxAdCommission: 0.5, // 10% platform commission for box ads
        vatRate: 0.18 // 18% VAT for box ads
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
            name: 'Lake House (ANCL) ලේක් හව්ස්',
            newspapers: [
                {
                    id: 'daily-news',
                    name: 'Daily News',
                    language: 'english',
                    bwRate: 400,
                    colorRate: 560,
                    classifiedBase: 1000,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 45,
                    isSundayPaper: false
                },
                {
                    id: 'sunday-observer',
                    name: 'Sunday Observer',
                    language: 'english',
                    bwRate: 550,
                    colorRate: 730,
                    classifiedBase: 2200,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 55,
                    isSundayPaper: true
                },
                {
                    id: 'dinamina',
                    name: 'Dinamina',
                    language: 'sinhala',
                    bwRate: 450,
                    colorRate: 575,
                    classifiedBase: 1500,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 40,
                    isSundayPaper: false
                },
                {
                    id: 'silumina',
                    name: 'Silumina',
                    language: 'sinhala',
                    bwRate: 910,
                    colorRate: 1195,
                    classifiedBase: 2000,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 50,
                    isSundayPaper: true
                },
                {
                    id: 'thinakaran',
                    name: 'Daily Thinakaran',
                    language: 'tamil',
                    bwRate: 360,
                    colorRate: 445,
                    classifiedBase: 1400,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 35,
                    isSundayPaper: false
                },
                {
                    id: 'thinakaran-varamanjari',
                    name: 'Sunday Thinakaran',
                    language: 'tamil',
                    bwRate: 450,
                    colorRate: 540,
                    classifiedBase: 1600,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 40,
                    isSundayPaper: true
                }
            ]
        },
        'wijeya': {
            name: 'Wijeya Newspapers විජය',
            newspapers: [
                {
                    id: 'sunday-times',
                    name: 'Sunday Times',
                    language: 'english',
                    bwRate: 650,
                    colorRate: 790,
                    classifiedBase: 500,
                    classifiedFreeWords: 15,
                    classifiedExtraRate: 20,
                    isSundayPaper: true
                },
                {
                    id: 'daily-mirror',
                    name: 'Daily Mirror',
                    language: 'english',
                    bwRate: 490,
                    colorRate: 580,
                    classifiedBase: 200,
                    classifiedFreeWords: 15,
                    classifiedExtraRate: 15,
                    isSundayPaper: false
                },
                {
                    id: 'lankadeepa',
                    name: 'Daily Lankadeepa',
                    language: 'sinhala',
                    bwRate: 650,
                    colorRate: 770,
                    classifiedBase: 525,
                    classifiedFreeWords: 15,
                    classifiedExtraRate: 25,
                    isSundayPaper: false
                },
                {
                    id: 'lankadeepa-irida',
                    name: 'Sunday Lankadeepa',
                    language: 'sinhala',
                    bwRate: 1120,
                    colorRate: 1310,
                    classifiedBase: 2200,
                    classifiedFreeWords: 15,
                    classifiedExtraRate: 50,
                    isSundayPaper: true
                },
                {
                    id: 'daily-ft',
                    name: 'Daily FT',
                    language: 'English',
                    bwRate: 420,
                    colorRate: 500,
                    classifiedBase: 0,
                    classifiedFreeWords: 0,
                    classifiedExtraRate: 0,
                    isSundayPaper: false
                }
            ]
        },
        'upali': {
            name: 'Upali Newspapers',
            newspapers: [
                {
                    id: 'the-island',
                    name: 'Daily Island',
                    language: 'english',
                    bwRate: 220,
                    colorRate: 352,
                    classifiedBase: 115,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 12,
                    isSundayPaper: false
                },
                {
                    id: 'sunday-island',
                    name: 'Sunday Island',
                    language: 'english',
                    bwRate: 285,
                    colorRate: 456,
                    classifiedBase: 160,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 12,
                    isSundayPaper: true
                },
                {
                    id: 'divaina',
                    name: 'Daily Divaina',
                    language: 'sinhala',
                    bwRate: 350,
                    colorRate: 560,
                    classifiedBase: 200,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 12,
                    isSundayPaper: false
                },
                {
                    id: 'irida-divaina',
                    name: 'Sunday Divaina',
                    language: 'sinhala',
                    bwRate: 650,
                    colorRate: 1040,
                    classifiedBase: 500,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 20,
                    isSundayPaper: true
                },
                {
                    id: 'navaliya',
                    name: 'Navaliya',
                    language: 'sinhala',
                    bwRate: 280,
                    colorRate: 448,
                    classifiedBase: 120,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 6,
                    isSundayPaper: false
                }
            ]
        },
        'express': {
            name: 'Express Newspapers',
            newspapers: [
                {
                    id: 'virakesari',
                    name: 'Daily Virakesari',
                    language: 'tamil',
                    bwRate: 400,
                    colorRate: 600,
                    classifiedBase: 500,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 10,
                    isSundayPaper: false
                },
                {
                    id: 'virakesari-sunday',
                    name: 'Sunday Virakesari',
                    language: 'tamil',
                    bwRate: 600,
                    colorRate: 900,
                    classifiedBase: 900,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 20,
                    isSundayPaper: true
                }
            ]
        },
        'mawbima': {
            name: 'Mawbima Group',
            newspapers: [
                {
                    id: 'mawbima',
                    name: 'Daily Mawbima',
                    language: 'sinhala',
                    bwRate: 400,
                    colorRate: 640,
                    classifiedBase: 0,
                    classifiedFreeWords: 0,
                    classifiedExtraRate: 0,
                    isSundayPaper: false
                },
                {
                    id: 'Sunday-Mawbima',
                    name: 'Sunday Mawbima',
                    language: 'sinhala',
                    bwRate: 750,
                    colorRate: 1150,
                    classifiedBase: 0,
                    classifiedFreeWords: 0,
                    classifiedExtraRate: 0,
                    isSundayPaper: true
                },
                {
                    id: 'ceylon-today',
                    name: 'Daily Ceylon Today',
                    language: 'english',
                    bwRate: 300,
                    colorRate: 450,
                    classifiedBase: 0,
                    classifiedFreeWords: 0,
                    classifiedExtraRate: 0,
                    isSundayPaper: false
                },
                {
                    id: 'Sunday-ceylon-today',
                    name: 'Sunday Ceylon Today',
                    language: 'english',
                    bwRate: 450,
                    colorRate: 600,
                    classifiedBase: 0,
                    classifiedFreeWords: 0,
                    classifiedExtraRate: 0,
                    isSundayPaper: false
                }
                
            ]
        },
        'Liberty': {
            name: 'Liberty Publication',
            newspapers: [
                {
                    id: 'Sunday-aruna',
                    name: 'Sathi aga Aruna',
                    language: 'sinhala',
                    bwRate: 780,
                    colorRate: 1260,
                    classifiedBase: 990,
                    classifiedFreeWords: 15,
                    classifiedExtraRate: 50,
                    isSundayPaper: true
                },
                {
                    id: 'the-morning',
                    name: 'The Morning',
                    language: 'english',
                    bwRate: 510,
                    colorRate: 620,
                    classifiedBase: 0,
                    classifiedFreeWords: 0,
                    classifiedExtraRate: 0,
                    isSundayPaper: true
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
    FULL_PAGE_WIDTH: 32, // cm - if width >= this, it's full page
    FULL_PAGE_THRESHOLD: 1450, // sq cm - area threshold for full page

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
// Formula: Height (cm) x Columns (count) x Rate
function calculateBoxAdPrice(newspaper, height, columns, colorOption) {
    const language = newspaper.language || 'english';
    const columnWidth = getColumnWidth(language, columns);
    const area = height * columns; // columns count x height (not column width x height)
    const rate = colorOption === 'color' ? newspaper.colorRate : newspaper.bwRate;
    const adTotal = area * rate;

    // Add 10% platform commission
    const commission = adTotal * CONFIG.CHARGES.boxAdCommission;

    // Add 18% VAT on adTotal only (not on adTotal + commission)
    const vat = adTotal * CONFIG.CHARGES.vatRate;

    // Total = Ad Total + Commission + VAT
    const total = adTotal + commission + vat;

    return {
        height: height,
        columns: columns,
        columnWidth: columnWidth,
        area: area, // This is now columns x height, not column width x height
        rate: rate,
        adTotal: adTotal,
        commission: commission,
        vat: vat,
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
    const now = new Date();
    const currentHour = now.getHours();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(0, 0, 0, 0);

    // Calculate minimum booking date (today + 2 days)
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + CONFIG.BOOKING_RULES.minDaysInAdvance);

    const errors = [];
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const todayDayOfWeek = now.getDay();

    // Check 1 PM deadline for tomorrow's paper
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (bookingDate.getTime() === tomorrow.getTime() && currentHour >= 13) {
        errors.push(`Cannot book tomorrow's paper after 1:00 PM. Please contact us for urgent bookings.`);
    }

    // Check if it's Friday after 1 PM and trying to book for Sunday
    if (todayDayOfWeek === 5 && currentHour >= 13) { // Friday after 1 PM
        const upcomingSunday = new Date(today);
        upcomingSunday.setDate(upcomingSunday.getDate() + (7 - todayDayOfWeek)); // Next Sunday

        if (bookingDate.getTime() === upcomingSunday.getTime() && newspaper && newspaper.isSundayPaper) {
            errors.push(`Cannot book Sunday papers after Friday 1:00 PM. Please contact us for urgent bookings.`);
        }
    }

    // Check if booking is at least 2 days in advance
    if (bookingDate < minDate) {
        errors.push(`Today's newspaper was printed yesterday. Please select a future date (minimum ${CONFIG.BOOKING_RULES.minDaysInAdvance} days in advance).`);
    }

    // Check publication type restrictions
    if (newspaper) {
        if (newspaper.isSundayPaper) {
            // Sunday papers: only allow Sunday dates
            if (dayOfWeek !== 0) {
                errors.push(`This is a Sunday paper. Please select a Sunday for publication.`);
            } else {
                // Find the Friday before this Sunday
                const friday = new Date(bookingDate);
                friday.setDate(friday.getDate() - 2);
                friday.setHours(13, 0, 0, 0); // Friday 1 PM deadline

                if (now > friday) {
                    errors.push(`Sunday papers must be booked by Friday 1:00 PM. The deadline for this Sunday edition has passed.`);
                }
            }
        } else {
            // Daily papers: only allow Monday-Friday (not Saturday or Sunday)
            if (dayOfWeek === 0) {
                errors.push(`Daily papers don't publish on Sundays. Please select a weekday (Monday-Friday).`);
            } else if (dayOfWeek === 6) {
                errors.push(`Daily papers don't publish on Saturdays. Please select a weekday (Monday-Friday).`);
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
