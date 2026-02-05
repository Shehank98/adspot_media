/**
 * AdSpot Website Configuration
 * Complete publication data with B&W and Color rates
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
    
    // Maximum ad height for all papers
    MAX_HEIGHT: 40, // cm
    
    // Publication Groups and Newspapers
    // Rates: bwRate = Black & White per sq cm, colorRate = Full Color per sq cm
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
                    classifiedExtraRate: 45
                },
                { 
                    id: 'sunday-observer', 
                    name: 'Sunday Observer', 
                    language: 'english',
                    bwRate: 220,
                    colorRate: 380,
                    classifiedBase: 2200,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 55
                },
                { 
                    id: 'dinamina', 
                    name: 'Dinamina', 
                    language: 'sinhala',
                    bwRate: 150,
                    colorRate: 280,
                    classifiedBase: 1500,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 40
                },
                { 
                    id: 'silumina', 
                    name: 'Silumina', 
                    language: 'sinhala',
                    bwRate: 200,
                    colorRate: 350,
                    classifiedBase: 2000,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 50
                },
                { 
                    id: 'thinakaran', 
                    name: 'Thinakaran', 
                    language: 'tamil',
                    bwRate: 140,
                    colorRate: 260,
                    classifiedBase: 1400,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 35
                },
                { 
                    id: 'thinakaran-varamanjari', 
                    name: 'Thinakaran Varamanjari', 
                    language: 'tamil',
                    bwRate: 160,
                    colorRate: 290,
                    classifiedBase: 1600,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 40
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
                    classifiedExtraRate: 70
                },
                { 
                    id: 'daily-mirror', 
                    name: 'Daily Mirror', 
                    language: 'english',
                    bwRate: 200,
                    colorRate: 350,
                    classifiedBase: 2000,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 50
                },
                { 
                    id: 'lankadeepa', 
                    name: 'Lankadeepa', 
                    language: 'sinhala',
                    bwRate: 220,
                    colorRate: 400,
                    classifiedBase: 2200,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 55
                },
                { 
                    id: 'lankadeepa-irida', 
                    name: 'Irida Lankadeepa', 
                    language: 'sinhala',
                    bwRate: 260,
                    colorRate: 450,
                    classifiedBase: 2600,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 65
                },
                { 
                    id: 'ada', 
                    name: 'Ada', 
                    language: 'sinhala',
                    bwRate: 180,
                    colorRate: 320,
                    classifiedBase: 1800,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 45
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
                    classifiedExtraRate: 50
                },
                { 
                    id: 'sunday-island', 
                    name: 'Sunday Island', 
                    language: 'english',
                    bwRate: 240,
                    colorRate: 420,
                    classifiedBase: 2400,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 60
                },
                { 
                    id: 'divaina', 
                    name: 'Divaina', 
                    language: 'sinhala',
                    bwRate: 180,
                    colorRate: 320,
                    classifiedBase: 1800,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 45
                },
                { 
                    id: 'irida-divaina', 
                    name: 'Irida Divaina', 
                    language: 'sinhala',
                    bwRate: 220,
                    colorRate: 380,
                    classifiedBase: 2200,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 55
                },
                { 
                    id: 'navaliya', 
                    name: 'Navaliya', 
                    language: 'sinhala',
                    bwRate: 160,
                    colorRate: 290,
                    classifiedBase: 1600,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 40
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
                    classifiedExtraRate: 40
                },
                { 
                    id: 'virakesari-sunday', 
                    name: 'Sunday Virakesari', 
                    language: 'tamil',
                    bwRate: 200,
                    colorRate: 360,
                    classifiedBase: 2000,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 50
                },
                { 
                    id: 'sudar-oli', 
                    name: 'Sudar Oli', 
                    language: 'tamil',
                    bwRate: 140,
                    colorRate: 260,
                    classifiedBase: 1400,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 35
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
                    classifiedExtraRate: 42
                },
                { 
                    id: 'rivira', 
                    name: 'Rivira', 
                    language: 'sinhala',
                    bwRate: 200,
                    colorRate: 360,
                    classifiedBase: 2000,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 50
                },
                { 
                    id: 'ceylon-today', 
                    name: 'Ceylon Today', 
                    language: 'english',
                    bwRate: 180,
                    colorRate: 320,
                    classifiedBase: 1800,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 45
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
                    classifiedExtraRate: 38
                },
                { 
                    id: 'aruna', 
                    name: 'Aruna', 
                    language: 'sinhala',
                    bwRate: 140,
                    colorRate: 260,
                    classifiedBase: 1400,
                    classifiedFreeWords: 20,
                    classifiedExtraRate: 35
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
                    classifiedExtraRate: 40
                },
                { 
                    id: 'lakbima-sunday', 
                    name: 'Sunday Lakbima', 
                    language: 'sinhala',
                    bwRate: 190,
                    colorRate: 340,
                    classifiedBase: 1900,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 48
                }
            ]
        },
        'government': {
            name: 'Government Gazette',
            newspapers: [
                { 
                    id: 'gazette', 
                    name: 'Government Gazette', 
                    language: 'all',
                    bwRate: 250,
                    colorRate: 250, // No color option
                    classifiedBase: 2500,
                    classifiedFreeWords: 25,
                    classifiedExtraRate: 62
                }
            ]
        }
    },
    
    // Classified Categories with descriptions
    CLASSIFIED_CATEGORIES: {
        'jobs': { name: 'Jobs / Vacancies', icon: '💼' },
        'property': { name: 'Property / Real Estate', icon: '🏠' },
        'vehicles': { name: 'Vehicles', icon: '🚗' },
        'matrimonial': { name: 'Matrimonial', icon: '💍' },
        'education': { name: 'Education', icon: '📚' },
        'services': { name: 'Services', icon: '🔧' },
        'obituary': { name: 'Obituary', icon: '🕯️' },
        'tenders': { name: 'Tenders / Notices', icon: '📋' },
        'general': { name: 'General', icon: '📝' }
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

// Calculate Box Ad price
function calculateBoxAdPrice(newspaper, width, height, colorOption) {
    const area = width * height;
    const rate = colorOption === 'color' ? newspaper.colorRate : newspaper.bwRate;
    return {
        area: area,
        rate: rate,
        total: area * rate
    };
}

// Calculate Classified Ad price
function calculateClassifiedPrice(newspaper, wordCount) {
    const freeWords = newspaper.classifiedFreeWords;
    const extraWords = Math.max(0, wordCount - freeWords);
    const extraCost = extraWords * newspaper.classifiedExtraRate;
    
    return {
        basePrice: newspaper.classifiedBase,
        freeWords: freeWords,
        wordCount: wordCount,
        extraWords: extraWords,
        extraRate: newspaper.classifiedExtraRate,
        extraCost: extraCost,
        total: newspaper.classifiedBase + extraCost
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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
