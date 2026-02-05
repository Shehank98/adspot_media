/**
 * AdSpot - Supabase Client
 * Handles database operations and authentication
 */

// Initialize Supabase client
const supabaseUrl = CONFIG.SUPABASE_URL;
const supabaseKey = CONFIG.SUPABASE_ANON_KEY;

// Create Supabase client (loaded from CDN)
let supabase;

// Load Supabase from CDN
(function loadSupabase() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = function() {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase initialized');
        
        // Dispatch event when ready
        window.dispatchEvent(new Event('supabaseReady'));
    };
    document.head.appendChild(script);
})();

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
 * Email Service Configuration
 * Using EmailJS for sending professional branded emails
 * Set up at: https://www.emailjs.com/
 */
const EMAIL_CONFIG = {
    serviceId: 'YOUR_EMAILJS_SERVICE_ID', // Replace with your EmailJS service ID
    quotationTemplateId: 'quotation_template',
    invoiceTemplateId: 'invoice_template',
    paymentConfirmTemplateId: 'payment_confirm_template',
    adminNotifyTemplateId: 'admin_notify_template',
    publicKey: 'YOUR_EMAILJS_PUBLIC_KEY' // Replace with your EmailJS public key
};

// Load EmailJS library
(function loadEmailJS() {
    if (typeof emailjs === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        script.onload = function() {
            emailjs.init(EMAIL_CONFIG.publicKey);
            console.log('EmailJS initialized');
        };
        document.head.appendChild(script);
    }
})();

/**
 * Email Service - Professional branded emails
 */
const EmailService = {
    /**
     * Send quotation email to customer
     */
    async sendQuotation(quotation, customer) {
        const templateParams = {
            to_email: customer.email,
            to_name: customer.name,
            quotation_number: quotation.quotation_number,
            newspaper_name: quotation.newspaper_name,
            ad_type: quotation.ad_type === 'box' ? 'Box Advertisement' : 'Classified Ad',
            publication_date: formatDate(quotation.publication_date),
            total_amount: formatCurrency(quotation.total_amount),
            company_name: CONFIG.COMPANY.name,
            company_email: CONFIG.COMPANY.email,
            company_phone: CONFIG.COMPANY.phone,
            company_address: CONFIG.COMPANY.address,
            payment_link: `${window.location.origin}/payment.html?ref=${quotation.quotation_number}`,
            bank_name: CONFIG.BANK_DETAILS.bankName,
            account_name: CONFIG.BANK_DETAILS.accountName,
            account_number: CONFIG.BANK_DETAILS.accountNumber,
            bank_branch: CONFIG.BANK_DETAILS.branch
        };

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(
                    EMAIL_CONFIG.serviceId,
                    EMAIL_CONFIG.quotationTemplateId,
                    templateParams
                );
                console.log('Quotation email sent to:', customer.email);
            } else {
                console.log('EmailJS not loaded, quotation email would be sent to:', customer.email);
            }
            return true;
        } catch (error) {
            console.error('Failed to send quotation email:', error);
            throw error;
        }
    },

    /**
     * Send invoice email with PDF attachment
     */
    async sendInvoice(quotation, customer, pdfBase64 = null) {
        const templateParams = {
            to_email: customer.email,
            to_name: customer.name,
            quotation_number: quotation.quotation_number,
            invoice_number: quotation.invoice_number || generateInvoiceNumber(),
            newspaper_name: quotation.newspaper_name,
            ad_type: quotation.ad_type === 'box' ? 'Box Advertisement' : 'Classified Ad',
            publication_date: formatDate(quotation.publication_date),
            total_amount: formatCurrency(quotation.total_amount),
            company_name: CONFIG.COMPANY.name,
            company_email: CONFIG.COMPANY.email,
            company_phone: CONFIG.COMPANY.phone,
            company_address: CONFIG.COMPANY.address,
            pdf_attachment: pdfBase64 // Base64 encoded PDF
        };

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(
                    EMAIL_CONFIG.serviceId,
                    EMAIL_CONFIG.invoiceTemplateId,
                    templateParams
                );
                console.log('Invoice email sent to:', customer.email);
            } else {
                console.log('EmailJS not loaded, invoice email would be sent to:', customer.email);
            }
            return true;
        } catch (error) {
            console.error('Failed to send invoice email:', error);
            throw error;
        }
    },

    /**
     * Send payment confirmation email
     */
    async sendPaymentConfirmation(quotation, customer, payment) {
        const templateParams = {
            to_email: customer.email,
            to_name: customer.name,
            quotation_number: quotation.quotation_number,
            payment_amount: formatCurrency(payment.amount),
            payment_method: payment.payment_method === 'card' ? 'Credit/Debit Card' : 'Bank Transfer',
            payment_reference: payment.reference_number || 'N/A',
            payment_date: formatDate(payment.created_at),
            newspaper_name: quotation.newspaper_name,
            publication_date: formatDate(quotation.publication_date),
            company_name: CONFIG.COMPANY.name,
            company_email: CONFIG.COMPANY.email,
            company_phone: CONFIG.COMPANY.phone
        };

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(
                    EMAIL_CONFIG.serviceId,
                    EMAIL_CONFIG.paymentConfirmTemplateId,
                    templateParams
                );
                console.log('Payment confirmation sent to:', customer.email);
            } else {
                console.log('EmailJS not loaded, payment confirmation would be sent to:', customer.email);
            }
            return true;
        } catch (error) {
            console.error('Failed to send payment confirmation:', error);
            throw error;
        }
    },

    /**
     * Send admin notification for new order
     */
    async notifyAdmin(quotation, customer) {
        const templateParams = {
            to_email: CONFIG.COMPANY.email,
            quotation_number: quotation.quotation_number,
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            newspaper_name: quotation.newspaper_name,
            ad_type: quotation.ad_type === 'box' ? 'Box Advertisement' : 'Classified Ad',
            total_amount: formatCurrency(quotation.total_amount),
            publication_date: formatDate(quotation.publication_date),
            created_at: formatDate(quotation.created_at)
        };

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(
                    EMAIL_CONFIG.serviceId,
                    EMAIL_CONFIG.adminNotifyTemplateId,
                    templateParams
                );
                console.log('Admin notification sent');
            }
            return true;
        } catch (error) {
            console.error('Failed to send admin notification:', error);
            // Don't throw - admin notification failure shouldn't block user flow
            return false;
        }
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
    }
};

// Export for global access
window.QuotationDB = QuotationDB;
window.CustomerDB = CustomerDB;
window.PaymentDB = PaymentDB;
window.PublicationDB = PublicationDB;
window.EmailService = EmailService;
window.InvoiceGenerator = InvoiceGenerator;
window.EMAIL_CONFIG = EMAIL_CONFIG;
