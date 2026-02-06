/**
 * AdSpot - Supabase Client
 * Handles database operations and authentication
 */

// Initialize Supabase client
const supabaseUrl = CONFIG.SUPABASE_URL;
const supabaseKey = CONFIG.SUPABASE_ANON_KEY;

// Create Supabase client (loaded from CDN)
let supabase = null;
let supabaseReady = false;

// Promise that resolves when Supabase is ready
const supabasePromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = function() {
        try {
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            supabaseReady = true;
            console.log('Supabase initialized successfully');
            window.dispatchEvent(new Event('supabaseReady'));
            resolve(supabase);
        } catch (e) {
            console.error('Failed to initialize Supabase:', e);
            resolve(null);
        }
    };
    script.onerror = function() {
        console.error('Failed to load Supabase script');
        resolve(null);
    };
    document.head.appendChild(script);
});

// Helper function to ensure Supabase is ready
async function ensureSupabase() {
    if (supabaseReady && supabase) return supabase;
    return await supabasePromise;
}

// Check if Supabase is available
function isSupabaseAvailable() {
    return supabaseReady && supabase !== null;
}

/**
 * Database Operations
 */

// Quotations
const QuotationDB = {
    async create(quotationData) {
        const { data, error } = await supabase
            .from('quotations')
            .insert([quotationData])
            .select();
        
        if (error) throw error;
        return data[0];
    },
    
    async getAll(filters = {}) {
        let query = supabase.from('quotations').select(`
            *,
            customer:customers(name, email, phone, company),
            payments(amount, payment_method, status, created_at)
        `);
        
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.date) {
            query = query.eq('publication_date', filters.date);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    
    async getById(id) {
        const { data, error } = await supabase
            .from('quotations')
            .select(`
                *,
                customer:customers(*),
                payments(*)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async getByNumber(quotationNumber) {
        const { data, error } = await supabase
            .from('quotations')
            .select(`
                *,
                customer:customers(*),
                payments(*)
            `)
            .eq('quotation_number', quotationNumber)
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async updateStatus(id, status) {
        const { data, error } = await supabase
            .from('quotations')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data[0];
    },
    
    async getStats() {
        const { data: quotations, error } = await supabase
            .from('quotations')
            .select('id, total_amount, status');
        
        if (error) throw error;
        
        const total = quotations.length;
        const pending = quotations.filter(q => q.status === 'pending').length;
        const revenue = quotations
            .filter(q => q.status === 'paid' || q.status === 'published')
            .reduce((sum, q) => sum + parseFloat(q.total_amount), 0);
        
        return { total, pending, revenue };
    }
};

// Customers
const CustomerDB = {
    async create(customerData) {
        // Check if customer already exists by email
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('email', customerData.email)
            .single();
        
        if (existing) {
            // Update existing customer
            const { data, error } = await supabase
                .from('customers')
                .update(customerData)
                .eq('id', existing.id)
                .select();
            
            if (error) throw error;
            return data[0];
        }
        
        // Create new customer
        const { data, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select();
        
        if (error) throw error;
        return data[0];
    },
    
    async getAll() {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                quotations(id, total_amount, status)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    },
    
    async getById(id) {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                quotations(*)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async search(query) {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`);
        
        if (error) throw error;
        return data;
    },
    
    async getCount() {
        const { count, error } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        return count;
    }
};

// Payments
const PaymentDB = {
    async create(paymentData) {
        const { data, error } = await supabase
            .from('payments')
            .insert([paymentData])
            .select();
        
        if (error) throw error;
        
        // Update quotation status if fully paid
        if (paymentData.status === 'completed') {
            await QuotationDB.updateStatus(paymentData.quotation_id, 'paid');
        }
        
        return data[0];
    },
    
    async getAll(filters = {}) {
        let query = supabase.from('payments').select(`
            *,
            quotation:quotations(quotation_number, customer:customers(name, email))
        `);
        
        if (filters.method) {
            query = query.eq('payment_method', filters.method);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    
    async getByQuotation(quotationId) {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('quotation_id', quotationId);
        
        if (error) throw error;
        return data;
    },
    
    async updateStatus(id, status) {
        const { data, error } = await supabase
            .from('payments')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data[0];
    },
    
    async getPendingCount() {
        const { count, error } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        if (error) throw error;
        return count || 0;
    }
};

// Publications
const PublicationDB = {
    async getAll() {
        const { data, error } = await supabase
            .from('publications')
            .select('*')
            .order('name');
        
        if (error) throw error;
        return data;
    },
    
    async create(pubData) {
        const { data, error } = await supabase
            .from('publications')
            .insert([pubData])
            .select();
        
        if (error) throw error;
        return data[0];
    },
    
    async update(id, pubData) {
        const { data, error } = await supabase
            .from('publications')
            .update(pubData)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data[0];
    },
    
    async delete(id) {
        const { error } = await supabase
            .from('publications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    }
};

/**
 * Google Apps Script Configuration
 * Handles: Email Sending + PDF Storage in Google Drive
 *
 * SETUP:
 * 1. Deploy google-apps-script-complete.js to Google Apps Script
 * 2. Copy the Web App URL below
 * 3. Set ENABLED to true
 */
const GOOGLE_APPS_CONFIG = {
    // PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
    SCRIPT_URL: '',  // e.g., 'https://script.google.com/macros/s/AKfycbx.../exec'
    ENABLED: false   // Set to true after adding SCRIPT_URL
};

// Keep EMAIL_CONFIG for backwards compatibility (not used anymore)
const EMAIL_CONFIG = {
    serviceId: 'deprecated',
    publicKey: 'deprecated'
};

/**
 * Email Service - Using Google Apps Script
 * Beautiful HTML emails sent via your Google account
 */
const EmailService = {
    /**
     * Check if email service is configured
     */
    isConfigured() {
        return GOOGLE_APPS_CONFIG.ENABLED && GOOGLE_APPS_CONFIG.SCRIPT_URL.length > 0;
    },

    /**
     * Send request to Google Apps Script
     */
    async sendRequest(action, data) {
        if (!this.isConfigured()) {
            console.warn('Email service not configured. Set GOOGLE_APPS_CONFIG.SCRIPT_URL');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const response = await fetch(GOOGLE_APPS_CONFIG.SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            return await response.json();
        } catch (error) {
            console.error('Email service error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Send quotation/confirmation email to customer
     */
    async sendQuotation(quotation, customer) {
        console.log('Sending quotation email to:', customer.email);

        const result = await this.sendRequest('sendQuotation', {
            customer_email: customer.email,
            customer_name: customer.name,
            quotation_number: quotation.quotation_number,
            items: quotation.items || [],
            total_amount: quotation.total_amount
        });

        if (result.success) {
            console.log('Quotation email sent successfully');
        } else {
            console.error('Failed to send quotation:', result.error);
        }
        return result.success;
    },

    /**
     * Send invoice email after payment confirmed
     */
    async sendInvoice(quotation, customer, pdfBase64 = null) {
        console.log('Sending invoice email to:', customer.email);

        const result = await this.sendRequest('sendInvoice', {
            customer_email: customer.email,
            customer_name: customer.name,
            quotation_number: quotation.quotation_number,
            invoice_number: quotation.invoice_number || generateInvoiceNumber(),
            items: quotation.items || [],
            total_amount: quotation.total_amount
        });

        if (result.success) {
            console.log('Invoice email sent successfully');
        } else {
            console.error('Failed to send invoice:', result.error);
        }
        return result.success;
    },

    /**
     * Send payment confirmation email
     */
    async sendPaymentConfirmation(quotation, customer, payment) {
        console.log('Sending payment confirmation to:', customer.email);

        const result = await this.sendRequest('sendPaymentConfirmation', {
            customer_email: customer.email,
            customer_name: customer.name,
            quotation_number: quotation.quotation_number,
            amount: payment?.amount || quotation.total_amount
        });

        return result.success;
    },

    /**
     * Send admin notification for new order
     */
    async notifyAdmin(quotation, customer) {
        console.log('Sending admin notification for:', quotation.quotation_number);

        const result = await this.sendRequest('sendAdminNotification', {
            quotation_number: quotation.quotation_number,
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            newspaper_name: quotation.newspaper_name || quotation.items?.[0]?.newspaperName || 'N/A',
            total_amount: quotation.total_amount,
            ad_type: quotation.ad_type,
            items: quotation.items || []
        });

        return result.success;
    },

    /**
     * Send contact form message to admin
     */
    async sendContactMessage(name, email, message, phone = '', subject = '') {
        console.log('Sending contact form from:', email);

        const result = await this.sendRequest('sendContactForm', {
            name: name,
            email: email,
            phone: phone,
            subject: subject,
            message: message
        });

        // Fallback: Store in localStorage if API fails
        if (!result.success) {
            const messages = JSON.parse(localStorage.getItem('adspot_contact_messages') || '[]');
            messages.push({
                id: Date.now(),
                name, email, message, phone, subject,
                date: new Date().toISOString(),
                read: false
            });
            localStorage.setItem('adspot_contact_messages', JSON.stringify(messages));
            console.log('Contact message stored locally');
            return true;
        }

        return result.success;
    }
};

/**
 * PDF Invoice Generator using jsPDF
 * Load jsPDF from CDN: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
 */

// Load jsPDF library
(function loadJsPDF() {
    if (typeof jspdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = function() {
            console.log('jsPDF loaded');
        };
        document.head.appendChild(script);
    }
})();

const InvoiceGenerator = {
    /**
     * Generate PDF invoice
     * @param {Object} quotation - Quotation data
     * @param {Object} customer - Customer data
     * @returns {jsPDF} - PDF document or base64 string
     */
    generate(quotation, customer, returnBase64 = false) {
        const { jsPDF } = window.jspdf || {};

        if (!jsPDF) {
            console.error('jsPDF not loaded');
            return null;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 20;

        // Colors
        const primaryColor = [42, 57, 144]; // Dark blue
        const textColor = [51, 51, 51];
        const lightGray = [245, 245, 245];

        // Header - Company Logo Area
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Company Name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(CONFIG.COMPANY.name, margin, 25);

        // Company tagline
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Your Trusted Ad Booking Partner', margin, 35);

        // Invoice Title
        doc.setTextColor(...textColor);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        y = 65;
        doc.text('INVOICE', pageWidth - margin, y, { align: 'right' });

        // Invoice Details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        y = 75;
        const invoiceNumber = quotation.invoice_number || generateInvoiceNumber();
        doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - margin, y, { align: 'right' });
        y += 6;
        doc.text(`Quotation #: ${quotation.quotation_number}`, pageWidth - margin, y, { align: 'right' });
        y += 6;
        doc.text(`Date: ${formatDate(new Date())}`, pageWidth - margin, y, { align: 'right' });

        // Bill To Section
        y = 65;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('BILL TO:', margin, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        y += 8;
        doc.setFontSize(11);
        doc.text(customer.name, margin, y);
        y += 6;
        doc.setFontSize(10);
        if (customer.company) {
            doc.text(customer.company, margin, y);
            y += 6;
        }
        doc.text(customer.email, margin, y);
        y += 6;
        doc.text(customer.phone, margin, y);
        if (customer.address) {
            y += 6;
            doc.text(customer.address, margin, y);
        }

        // Ad Details Section
        y = 115;
        doc.setFillColor(...lightGray);
        doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('AD DETAILS', margin + 5, y + 7);

        y += 18;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);

        const adDetails = quotation.ad_details || {};

        // Table headers
        const col1 = margin;
        const col2 = 80;
        const col3 = pageWidth - margin;

        doc.setFont('helvetica', 'bold');
        doc.text('Description', col1, y);
        doc.text('Details', col2, y);
        doc.text('Amount', col3, y, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        y += 2;
        doc.line(margin, y, pageWidth - margin, y);

        // Newspaper
        y += 10;
        doc.text('Newspaper', col1, y);
        doc.text(quotation.newspaper_name, col2, y);

        // Ad Type
        y += 8;
        doc.text('Ad Type', col1, y);
        doc.text(quotation.ad_type === 'box' ? 'Box Advertisement' : 'Classified Ad', col2, y);

        // Publication Date
        y += 8;
        doc.text('Publication Date', col1, y);
        doc.text(formatDate(quotation.publication_date), col2, y);

        // Size/Details based on ad type
        if (quotation.ad_type === 'box') {
            y += 8;
            doc.text('Size', col1, y);
            doc.text(`${adDetails.columns || 1} col x ${adDetails.height || 0} cm (${(adDetails.area || 0).toFixed(1)} sq cm)`, col2, y);

            y += 8;
            doc.text('Color Option', col1, y);
            doc.text(adDetails.colorOption === 'color' ? 'Full Color' : 'Black & White', col2, y);
        } else {
            y += 8;
            doc.text('Word Count', col1, y);
            doc.text(`${adDetails.wordCount || 0} words`, col2, y);

            y += 8;
            doc.text('Category', col1, y);
            const categoryName = CONFIG.CLASSIFIED_CATEGORIES[adDetails.category]?.name || adDetails.category;
            doc.text(categoryName, col2, y);
        }

        // Price Breakdown Section
        y += 20;
        doc.setFillColor(...lightGray);
        doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('PRICE BREAKDOWN', margin + 5, y + 7);

        y += 18;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);

        // Ad Total
        doc.text('Ad Total', col1, y);
        doc.text(formatCurrency(adDetails.adTotal || quotation.total_amount), col3, y, { align: 'right' });

        // Commission or Service Charge
        if (quotation.ad_type === 'box' && adDetails.commission) {
            y += 8;
            doc.text('Platform Commission (10%)', col1, y);
            doc.text(formatCurrency(adDetails.commission), col3, y, { align: 'right' });
        } else if (quotation.ad_type === 'classified' && adDetails.serviceCharge) {
            y += 8;
            doc.text('Service Charge', col1, y);
            doc.text(formatCurrency(adDetails.serviceCharge), col3, y, { align: 'right' });
        }

        // Total
        y += 5;
        doc.line(pageWidth - 80, y, pageWidth - margin, y);
        y += 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('TOTAL', col1, y);
        doc.setTextColor(...primaryColor);
        doc.text(formatCurrency(quotation.total_amount), col3, y, { align: 'right' });

        // Payment Information
        y += 25;
        doc.setFillColor(...primaryColor);
        doc.rect(margin, y, pageWidth - (margin * 2), 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BANK TRANSFER DETAILS', margin + 5, y + 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        y += 18;
        doc.text(`Bank: ${CONFIG.BANK_DETAILS.bankName}`, margin + 5, y);
        doc.text(`Account Name: ${CONFIG.BANK_DETAILS.accountName}`, pageWidth/2, y);
        y += 8;
        doc.text(`Account Number: ${CONFIG.BANK_DETAILS.accountNumber}`, margin + 5, y);
        doc.text(`Branch: ${CONFIG.BANK_DETAILS.branch}`, pageWidth/2, y);

        // Footer
        const footerY = doc.internal.pageSize.getHeight() - 30;
        doc.setTextColor(...textColor);
        doc.setFontSize(9);
        doc.text(CONFIG.COMPANY.address, pageWidth / 2, footerY, { align: 'center' });
        doc.text(`Email: ${CONFIG.COMPANY.email} | Phone: ${CONFIG.COMPANY.phone}`, pageWidth / 2, footerY + 6, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Thank you for your business!', pageWidth / 2, footerY + 14, { align: 'center' });

        if (returnBase64) {
            return doc.output('datauristring');
        }

        return doc;
    },

    /**
     * Download invoice as PDF
     */
    download(quotation, customer) {
        const doc = this.generate(quotation, customer);
        if (doc) {
            const invoiceNumber = quotation.invoice_number || generateInvoiceNumber();
            doc.save(`Invoice-${invoiceNumber}.pdf`);
            return true;
        }
        return false;
    },

    /**
     * Get invoice as base64 for email attachment
     */
    getBase64(quotation, customer) {
        return this.generate(quotation, customer, true);
    },

    /**
     * Open invoice in new tab for preview
     */
    preview(quotation, customer) {
        // First check if we have a stored PDF
        const storedPdf = PdfStorage.getForOrder(quotation.id || quotation.quotation_number);
        if (storedPdf) {
            const byteCharacters = atob(storedPdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            return true;
        }

        // Generate new PDF if not stored
        const doc = this.generate(quotation, customer);
        if (doc) {
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');

            // Save for future use
            const base64 = doc.output('datauristring').split(',')[1];
            PdfStorage.saveForOrder(quotation.id || quotation.quotation_number, base64);

            return true;
        }
        return false;
    },

    /**
     * Generate and save PDF for an order
     */
    generateAndSave(quotation, customer) {
        const doc = this.generate(quotation, customer);
        if (doc) {
            const base64 = doc.output('datauristring').split(',')[1];
            PdfStorage.saveForOrder(quotation.id || quotation.quotation_number, base64);
            return base64;
        }
        return null;
    }
};

/**
 * PDF Storage - saves generated PDFs to localStorage for reliable retrieval
 */
const PdfStorage = {
    STORAGE_KEY: 'adspot_pdfs',

    /**
     * Save PDF for an order
     */
    saveForOrder(orderId, base64Data) {
        if (!orderId || !base64Data) return false;

        const pdfs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        pdfs[String(orderId)] = {
            data: base64Data,
            created_at: new Date().toISOString()
        };

        // Limit storage to last 50 PDFs to avoid localStorage limits
        const keys = Object.keys(pdfs);
        if (keys.length > 50) {
            const sortedKeys = keys.sort((a, b) =>
                new Date(pdfs[a].created_at) - new Date(pdfs[b].created_at)
            );
            for (let i = 0; i < keys.length - 50; i++) {
                delete pdfs[sortedKeys[i]];
            }
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pdfs));
        console.log('PDF saved for order:', orderId);
        return true;
    },

    /**
     * Get stored PDF for an order
     */
    getForOrder(orderId) {
        if (!orderId) return null;

        const pdfs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');

        // Try different ID formats
        const pdf = pdfs[String(orderId)] ||
                   pdfs[orderId] ||
                   Object.entries(pdfs).find(([key]) =>
                       key.includes(orderId) || String(orderId).includes(key)
                   )?.[1];

        return pdf?.data || null;
    },

    /**
     * Check if PDF exists for an order
     */
    hasForOrder(orderId) {
        return !!this.getForOrder(orderId);
    },

    /**
     * Delete PDF for an order
     */
    deleteForOrder(orderId) {
        const pdfs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        delete pdfs[String(orderId)];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pdfs));
    },

    /**
     * Open stored PDF in new tab
     */
    openInNewTab(orderId) {
        const base64 = this.getForOrder(orderId);
        if (!base64) return false;

        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return true;
    },

    /**
     * Download stored PDF
     */
    download(orderId, filename) {
        const base64 = this.getForOrder(orderId);
        if (!base64) return false;

        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = filename || `Invoice_${orderId}.pdf`;
        link.click();
        return true;
    }
};

/**
 * Orders Database (localStorage + Supabase sync)
 * Ensures data persists even when Supabase is not available
 */
const OrdersDB = {
    async getAll() {
        try {
            const sb = await ensureSupabase();
            if (sb) {
                const { data, error } = await sb
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    localStorage.setItem('adspot_orders', JSON.stringify(data));
                    return data;
                }
            }
        } catch (e) {
            console.log('Database not available, using localStorage');
        }
        return JSON.parse(localStorage.getItem('adspot_orders') || '[]');
    },

    async create(orderData) {
        const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        const order = {
            ...orderData,
            id: orderData.id || `local_${Date.now()}`,
            created_at: new Date().toISOString()
        };
        localOrders.unshift(order);
        localStorage.setItem('adspot_orders', JSON.stringify(localOrders));

        try {
            const sb = await ensureSupabase();
            if (sb) {
                const { data, error } = await sb
                    .from('orders')
                    .insert([orderData])
                    .select();
                if (!error && data) return data[0];
            }
        } catch (e) {
            console.log('Failed to sync to database, saved locally');
        }
        return order;
    },

    async update(id, updates) {
        const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        const idx = localOrders.findIndex(o => o.id === id || o.quotation_number === id);
        if (idx !== -1) {
            localOrders[idx] = { ...localOrders[idx], ...updates };
            localStorage.setItem('adspot_orders', JSON.stringify(localOrders));
        }
        return localOrders[idx];
    },

    async getById(id) {
        const localOrders = JSON.parse(localStorage.getItem('adspot_orders') || '[]');
        return localOrders.find(o => o.id === id || o.quotation_number === id || String(o.id) === String(id));
    }
};

/**
 * Helper functions
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return 'Rs. ' + num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
}

function generateQuotationNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QT-${year}${month}${day}-${random}`;
}

/**
 * Google Drive Storage Configuration
 * Update SCRIPT_URL after deploying the Google Apps Script
 */
const GOOGLE_DRIVE_CONFIG = {
    // IMPORTANT: Replace this URL with your deployed Google Apps Script Web App URL
    SCRIPT_URL: '', // e.g., 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
    ENABLED: false  // Set to true after configuring SCRIPT_URL
};

/**
 * Google Drive PDF Storage
 * Uploads PDFs to Google Drive via Google Apps Script
 */
const GoogleDriveStorage = {
    /**
     * Check if Google Drive storage is configured
     */
    isConfigured() {
        return GOOGLE_DRIVE_CONFIG.ENABLED && GOOGLE_DRIVE_CONFIG.SCRIPT_URL.length > 0;
    },

    /**
     * Upload PDF to Google Drive
     * @param {string} pdfBase64 - PDF content as base64 string
     * @param {string} filename - Filename for the PDF
     * @param {Object} metadata - Additional metadata (quotationNumber, customerName, etc.)
     * @returns {Promise<Object>} - Upload result with URLs
     */
    async upload(pdfBase64, filename, metadata = {}) {
        if (!this.isConfigured()) {
            console.warn('Google Drive storage not configured');
            return { success: false, error: 'Google Drive storage not configured' };
        }

        try {
            const response = await fetch(GOOGLE_DRIVE_CONFIG.SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'upload',
                    pdfBase64: pdfBase64,
                    filename: filename,
                    quotationNumber: metadata.quotationNumber || '',
                    customerName: metadata.customerName || '',
                    metadata: metadata
                })
            });

            const result = await response.json();

            if (result.success) {
                // Also save the Google Drive URL to localStorage for quick access
                const driveLinks = JSON.parse(localStorage.getItem('adspot_drive_links') || '{}');
                driveLinks[metadata.quotationNumber || filename] = {
                    fileId: result.fileId,
                    viewUrl: result.viewUrl,
                    downloadUrl: result.downloadUrl,
                    uploadedAt: new Date().toISOString()
                };
                localStorage.setItem('adspot_drive_links', JSON.stringify(driveLinks));
            }

            return result;
        } catch (error) {
            console.error('Google Drive upload error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get PDF info from Google Drive
     * @param {string} quotationNumber - Quotation number to search for
     * @returns {Promise<Object>} - File info with URLs
     */
    async get(quotationNumber) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Google Drive storage not configured' };
        }

        // First check localStorage for cached link
        const driveLinks = JSON.parse(localStorage.getItem('adspot_drive_links') || '{}');
        if (driveLinks[quotationNumber]) {
            return { success: true, ...driveLinks[quotationNumber] };
        }

        try {
            const response = await fetch(GOOGLE_DRIVE_CONFIG.SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'get',
                    quotationNumber: quotationNumber
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Google Drive get error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * List PDFs from Google Drive
     * @param {Object} options - Filter options (year, month, limit)
     * @returns {Promise<Object>} - List of files
     */
    async list(options = {}) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Google Drive storage not configured' };
        }

        try {
            const response = await fetch(GOOGLE_DRIVE_CONFIG.SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'list',
                    ...options
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Google Drive list error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Open PDF in Google Drive viewer
     * @param {string} quotationNumber - Quotation number
     */
    async openInDrive(quotationNumber) {
        const result = await this.get(quotationNumber);
        if (result.success && result.viewUrl) {
            window.open(result.viewUrl, '_blank');
            return true;
        }
        return false;
    },

    /**
     * Generate PDF and upload to Google Drive
     * @param {Object} quotation - Quotation data
     * @param {Object} customer - Customer data
     * @returns {Promise<Object>} - Upload result
     */
    async generateAndUpload(quotation, customer) {
        if (!this.isConfigured()) {
            console.log('Google Drive not configured, using local storage');
            return { success: false, error: 'Not configured' };
        }

        // Generate PDF
        const base64 = InvoiceGenerator.getBase64(quotation, customer);
        if (!base64) {
            return { success: false, error: 'Failed to generate PDF' };
        }

        // Create filename
        const filename = `Invoice_${quotation.quotation_number || quotation.invoice_number}.pdf`;

        // Upload to Google Drive
        return await this.upload(base64, filename, {
            quotationNumber: quotation.quotation_number,
            invoiceNumber: quotation.invoice_number,
            customerName: customer.name,
            customerEmail: customer.email,
            totalAmount: quotation.total_amount
        });
    }
};

// Export for global access
window.supabase = supabase;
window.supabasePromise = supabasePromise;
window.ensureSupabase = ensureSupabase;
window.isSupabaseAvailable = isSupabaseAvailable;
window.QuotationDB = QuotationDB;
window.CustomerDB = CustomerDB;
window.PaymentDB = PaymentDB;
window.PublicationDB = PublicationDB;
window.OrdersDB = OrdersDB;
window.EmailService = EmailService;
window.InvoiceGenerator = InvoiceGenerator;
window.PdfStorage = PdfStorage;
window.GoogleDriveStorage = GoogleDriveStorage;
window.GOOGLE_DRIVE_CONFIG = GOOGLE_DRIVE_CONFIG;
window.EMAIL_CONFIG = EMAIL_CONFIG;
window.GOOGLE_APPS_CONFIG = GOOGLE_APPS_CONFIG;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.generateInvoiceNumber = generateInvoiceNumber;
window.generateQuotationNumber = generateQuotationNumber;
