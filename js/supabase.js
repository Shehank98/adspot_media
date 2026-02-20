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
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxqC7dhbLgOB9PjLuMFHBwn2uyTVQyJnDdt92GwWLC-q-UlJ3mB0a7eWNvwOnyhDxHV/exec',  // e.g., 'https://script.google.com/macros/s/AKfycbx.../exec'
    ENABLED: true   // Set to true after adding SCRIPT_URL
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
     * Uses hidden iframe form submission to bypass CORS restrictions
     */
    async sendRequest(action, data) {
        if (!this.isConfigured()) {
            console.warn('Email service not configured. Set GOOGLE_APPS_CONFIG.SCRIPT_URL');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            // Method 1: Try regular fetch first
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(GOOGLE_APPS_CONFIG.SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action, ...data }),
                redirect: 'follow',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();
            console.log('Email request completed:', action, result);
            return result;
        } catch (error) {
            // Method 2: Use Image beacon as fallback (works even with CORS issues)
            console.log('Fetch failed, using beacon fallback for:', action);

            try {
                // Encode data for URL
                const params = new URLSearchParams({
                    action: action,
                    data: JSON.stringify(data)
                });

                // Use sendBeacon API if available (fires even if page closes)
                if (navigator.sendBeacon) {
                    const formData = new FormData();
                    formData.append('action', action);
                    formData.append('payload', JSON.stringify(data));
                    navigator.sendBeacon(GOOGLE_APPS_CONFIG.SCRIPT_URL, formData);
                    console.log('Email sent via beacon:', action);
                    return { success: true };
                }

                // Last resort: Create a hidden form and submit
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = GOOGLE_APPS_CONFIG.SCRIPT_URL;
                form.target = 'emailFrame_' + Date.now();
                form.style.display = 'none';

                const iframe = document.createElement('iframe');
                iframe.name = form.target;
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                const actionInput = document.createElement('input');
                actionInput.type = 'hidden';
                actionInput.name = 'action';
                actionInput.value = action;
                form.appendChild(actionInput);

                const dataInput = document.createElement('input');
                dataInput.type = 'hidden';
                dataInput.name = 'payload';
                dataInput.value = JSON.stringify(data);
                form.appendChild(dataInput);

                document.body.appendChild(form);
                form.submit();

                // Clean up after a delay
                setTimeout(() => {
                    document.body.removeChild(form);
                    document.body.removeChild(iframe);
                }, 5000);

                console.log('Email sent via form submission:', action);
                return { success: true };
            } catch (fallbackError) {
                console.error('All email methods failed:', fallbackError);
                return { success: false, error: error.message };
            }
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
     * Send invoice email after payment confirmed (with PDF attachment)
     */
    async sendInvoice(quotation, customer, pdfBase64 = null) {
        console.log('Sending invoice email to:', customer.email);

        const requestData = {
            customer_email: customer.email,
            customer_name: customer.name,
            quotation_number: quotation.quotation_number,
            invoice_number: quotation.invoice_number || generateInvoiceNumber(),
            items: quotation.items || [],
            total_amount: quotation.total_amount
        };

        // Include PDF if provided
        if (pdfBase64) {
            requestData.pdfBase64 = pdfBase64;
            console.log('Including PDF attachment in invoice email');
        }

        const result = await this.sendRequest('sendInvoice', requestData);

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
     * Generate PDF invoice - Simple Anthropic-style design
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

        // Safe string helper - prevents jsPDF.text errors
        const safe = (val) => String(val || '') || '-';

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 25;

        // Colors
        const blue = [30, 64, 175];
        const black = [31, 41, 55];
        const gray = [107, 114, 128];
        const green = [5, 150, 105];

        // Get data safely
        const invoiceNumber = safe(quotation.invoice_number || generateInvoiceNumber());
        const quotationNumber = safe(quotation.quotation_number);
        const customerName = safe(customer.name || customer.customer_name);
        const customerEmail = safe(customer.email || customer.customer_email);
        const customerPhone = safe(customer.phone || customer.customer_phone);
        const totalAmount = parseFloat(quotation.total_amount) || 0;

        // ============ HEADER ============
        // Invoice title
        doc.setTextColor(...blue);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text('Invoice', margin, y);

        // Company logo/name on right
        doc.setFontSize(18);
        doc.text('AdSpot', pageWidth - margin, y, { align: 'right' });

        // ============ INVOICE DETAILS ============
        y = 45;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);

        doc.text('Invoice number', margin, y);
        doc.setTextColor(...black);
        doc.text(invoiceNumber, margin + 35, y);

        y += 7;
        doc.setTextColor(...gray);
        doc.text('Date of issue', margin, y);
        doc.setTextColor(...black);
        doc.text(formatDate(new Date()), margin + 35, y);

        y += 7;
        doc.setTextColor(...gray);
        doc.text('Reference', margin, y);
        doc.setTextColor(...black);
        doc.text(quotationNumber, margin + 35, y);

        // ============ COMPANY & CUSTOMER INFO ============
        y = 80;
        const midX = pageWidth / 2;

        // Company info (left side)
        doc.setTextColor(...black);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(safe(CONFIG.COMPANY?.name || 'AdSpot Media Services'), margin, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        y += 6;
        doc.text(safe(CONFIG.COMPANY?.address || '130 High Level Road, Colombo 06'), margin, y);
        y += 5;
        doc.text(safe(CONFIG.COMPANY?.email || 'adspot77@gmail.com'), margin, y);

        // Bill to (right side)
        y = 80;
        doc.setTextColor(...black);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill to', midX, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        y += 6;
        doc.text(customerName, midX, y);
        y += 5;
        doc.text(customerEmail, midX, y);
        if (customerPhone && customerPhone !== '-') {
            y += 5;
            doc.text(customerPhone, midX, y);
        }

        // ============ AMOUNT DUE BOX ============
        y = 110;
        doc.setFillColor(240, 253, 244); // Light green background
        doc.rect(margin, y, pageWidth - (margin * 2), 18, 'F');
        doc.setDrawColor(...green);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin, y + 18); // Left border

        doc.setTextColor(...green);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Rs. ' + totalAmount.toLocaleString() + ' - PAID', margin + 5, y + 12);

        // ============ ITEMS TABLE ============
        y = 140;

        // Table header
        doc.setTextColor(...gray);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Description', margin, y);
        doc.text('Qty', pageWidth - 70, y, { align: 'center' });
        doc.text('Unit price', pageWidth - 45, y, { align: 'right' });
        doc.text('Amount', pageWidth - margin, y, { align: 'right' });

        y += 3;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);

        // Table rows - from items array or single item
        y += 10;
        doc.setTextColor(...black);
        doc.setFontSize(10);

        const items = quotation.items || [];
        if (items.length > 0) {
            items.forEach(item => {
                const desc = safe(item.newspaperName || 'Advertisement') + ' - ' +
                            (item.adType === 'classified' ? 'Classified Ad' : 'Box Ad');
                const price = parseFloat(item.price) || 0;

                doc.text(desc, margin, y);
                doc.text('1', pageWidth - 70, y, { align: 'center' });
                doc.text('Rs. ' + price.toLocaleString(), pageWidth - 45, y, { align: 'right' });
                doc.text('Rs. ' + price.toLocaleString(), pageWidth - margin, y, { align: 'right' });

                if (item.pubDate) {
                    y += 5;
                    doc.setTextColor(...gray);
                    doc.setFontSize(8);
                    doc.text('Publication: ' + safe(item.pubDate), margin, y);
                    doc.setTextColor(...black);
                    doc.setFontSize(10);
                }

                y += 8;
                doc.setDrawColor(229, 231, 235);
                doc.line(margin, y, pageWidth - margin, y);
                y += 8;
            });
        } else {
            // Single item fallback
            const desc = safe(quotation.newspaper_name || 'Advertisement') + ' - ' +
                        (quotation.ad_type === 'classified' ? 'Classified Ad' : 'Box Ad');

            doc.text(desc, margin, y);
            doc.text('1', pageWidth - 70, y, { align: 'center' });
            doc.text('Rs. ' + totalAmount.toLocaleString(), pageWidth - 45, y, { align: 'right' });
            doc.text('Rs. ' + totalAmount.toLocaleString(), pageWidth - margin, y, { align: 'right' });

            y += 8;
            doc.setDrawColor(229, 231, 235);
            doc.line(margin, y, pageWidth - margin, y);
            y += 8;
        }

        // ============ TOTALS ============
        y += 5;
        const totalsX = pageWidth - 80;

        doc.setTextColor(...gray);
        doc.setFontSize(10);
        doc.text('Subtotal', totalsX, y);
        doc.setTextColor(...black);
        doc.text('Rs. ' + totalAmount.toLocaleString(), pageWidth - margin, y, { align: 'right' });

        y += 8;
        doc.setTextColor(...gray);
        doc.text('Total', totalsX, y);
        doc.setTextColor(...black);
        doc.text('Rs. ' + totalAmount.toLocaleString(), pageWidth - margin, y, { align: 'right' });

        y += 3;
        doc.setDrawColor(...black);
        doc.setLineWidth(0.8);
        doc.line(totalsX, y, pageWidth - margin, y);

        y += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Amount paid', totalsX, y);
        doc.text('Rs. ' + totalAmount.toLocaleString(), pageWidth - margin, y, { align: 'right' });

        // ============ FOOTER ============
        const footerY = doc.internal.pageSize.getHeight() - 25;

        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        doc.setTextColor(...gray);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(safe(CONFIG.COMPANY?.name || 'AdSpot Media Services'), margin, footerY);
        doc.text('Phone: ' + safe(CONFIG.COMPANY?.phone || '070 161 1411') + ' | Email: ' + safe(CONFIG.COMPANY?.email || 'adspot77@gmail.com'), margin, footerY + 5);

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
            doc.save('Invoice-' + invoiceNumber + '.pdf');
            return true;
        }
        return false;
    },

    /**
     * Get invoice as base64 for email attachment
     */
    getBase64(quotation, customer) {
        const base64Uri = this.generate(quotation, customer, true);
        if (base64Uri && base64Uri.includes(',')) {
            return base64Uri.split(',')[1]; // Return only the base64 part, not the data URI prefix
        }
        return null;
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
// Google Drive uses the same Apps Script as email service
const GOOGLE_DRIVE_CONFIG = {
    // Uses the same URL as GOOGLE_APPS_CONFIG since it's the same Apps Script
    get SCRIPT_URL() { return GOOGLE_APPS_CONFIG.SCRIPT_URL; },
    get ENABLED() { return GOOGLE_APPS_CONFIG.ENABLED; }
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
                    action: 'uploadPdf',  // Match Apps Script action name
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
                    action: 'getPdf',  // Match Apps Script action name
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
                    action: 'listPdfs',  // Match Apps Script action name
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
