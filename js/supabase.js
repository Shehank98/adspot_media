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
 * Email Functions (using EmailJS or similar service)
 * For production, set up EmailJS at https://www.emailjs.com/
 */
const EmailService = {
    async sendQuotation(quotation, customer) {
        // In production, integrate with EmailJS or use Supabase Edge Functions
        console.log('Sending quotation email to:', customer.email);
        
        // Example EmailJS integration:
        // emailjs.send('service_id', 'quotation_template', {
        //     to_email: customer.email,
        //     to_name: customer.name,
        //     quotation_number: quotation.quotation_number,
        //     total_amount: formatCurrency(quotation.total_amount),
        //     ...
        // });
        
        return true;
    },
    
    async sendInvoice(quotation, customer, payment) {
        console.log('Sending invoice email to:', customer.email);
        // Similar to above
        return true;
    },
    
    async sendPaymentConfirmation(quotation, customer, payment) {
        console.log('Sending payment confirmation to:', customer.email);
        return true;
    }
};

// Export for global access
window.QuotationDB = QuotationDB;
window.CustomerDB = CustomerDB;
window.PaymentDB = PaymentDB;
window.PublicationDB = PublicationDB;
window.EmailService = EmailService;
