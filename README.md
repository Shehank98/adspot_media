# AdSpot Media Services - Website

A modern, professional website for newspaper advertising services in Sri Lanka. Built with HTML, CSS, and JavaScript with Supabase backend and Stripe payments.

## Features

### Customer Website
- 🎨 Modern, responsive design
- 📰 Publication/newspaper selector
- 📝 Ad booking form (Box & Classified ads)
- 💰 Real-time price calculator
- 💳 Stripe card payments
- 🏦 Bank transfer option
- ✉️ Automatic quotation emails

### Admin Dashboard
- 🔐 Secure authentication
- 📊 Dashboard with statistics
- 📋 Order/quotation management
- 💵 Payment tracking
- 📰 Publication management
- 👥 Customer database
- 📤 CSV export

## Quick Start

### 1. Deploy to Netlify (Recommended)

1. **Create a GitHub repository**
   - Upload all files to a new GitHub repo

2. **Deploy on Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repo
   - Deploy settings: Leave defaults
   - Click "Deploy"

3. **Your site is live!** 🎉

### 2. Set Up Supabase (Free Database)

1. **Create a Supabase account**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to initialize (~2 minutes)

2. **Set up the database**
   - Go to "SQL Editor" in Supabase dashboard
   - Copy contents of `database/schema.sql`
   - Paste and run the SQL

3. **Get your API keys**
   - Go to "Settings" → "API"
   - Copy your:
     - Project URL (e.g., `https://xxxxx.supabase.co`)
     - `anon` public key

4. **Update config.js**
   ```javascript
   SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
   SUPABASE_ANON_KEY: 'YOUR_ANON_KEY',
   ```

5. **Create admin user**
   - Go to "Authentication" → "Users"
   - Click "Add user" → "Create new user"
   - Enter your email and password
   - This will be your admin login

### 3. Set Up Stripe (Card Payments)

1. **Create a Stripe account**
   - Go to [stripe.com](https://stripe.com)
   - Complete verification

2. **Get your API key**
   - Go to "Developers" → "API keys"
   - Copy your "Publishable key" (starts with `pk_`)
   - ⚠️ Use test key for testing (`pk_test_...`)

3. **Update config.js**
   ```javascript
   STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_KEY',
   ```

4. **For production payments** (optional server-side):
   - You'll need a backend to create PaymentIntents
   - Consider Netlify Functions or Supabase Edge Functions

### 4. Set Up Email Notifications (Optional)

For sending quotations and invoices via email:

1. **Option A: EmailJS (Easiest)**
   - Go to [emailjs.com](https://emailjs.com)
   - Create account and email templates
   - Add to your booking.js

2. **Option B: Supabase Edge Functions**
   - More powerful, requires coding
   - Can send via any email provider

## File Structure

```
adspot-website/
├── index.html          # Landing page
├── book.html           # Ad booking page
├── admin/
│   ├── index.html      # Admin login
│   └── dashboard.html  # Admin dashboard
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── config.js       # Configuration
│   ├── supabase.js     # Database client
│   ├── app.js          # Landing page JS
│   ├── booking.js      # Booking page JS
│   └── admin.js        # Admin dashboard JS
├── database/
│   └── schema.sql      # Supabase schema
└── README.md           # This file
```

## Configuration

Edit `js/config.js` to customize:

```javascript
const CONFIG = {
    // API Keys (replace with yours)
    SUPABASE_URL: 'https://xxx.supabase.co',
    SUPABASE_ANON_KEY: 'your-key',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_xxx',
    
    // Company Info
    COMPANY: {
        name: 'AdSpot Media Services',
        email: 'adspot77@gmail.com',
        phone: '+94 77 XXX XXXX'
    },
    
    // Bank Details
    BANK_DETAILS: {
        bankName: 'Sampath Bank PLC',
        accountNumber: '1210 5770 0812',
        branch: 'Karagampitiya'
    },
    
    // Publications & Rates
    PUBLICATIONS: { ... }
};
```

## Customization

### Change Colors
Edit CSS variables in `css/styles.css`:
```css
:root {
    --primary: #1a56db;      /* Main brand color */
    --secondary: #0f172a;    /* Dark color */
    --accent: #f59e0b;       /* Accent color */
}
```

### Add New Publications
Add to `CONFIG.PUBLICATIONS` in `config.js`:
```javascript
'new-group': {
    name: 'New Publication Group',
    newspapers: [
        { 
            id: 'paper-id',
            name: 'Paper Name',
            language: 'english',
            boxRate: 500,
            classifiedRate: 25,
            colorMultiplier: 1.5
        }
    ]
}
```

### Change Logo
Replace the logo icon (◈) in HTML files with your own:
- Use an SVG icon
- Or upload an image and use `<img src="logo.png">`

## Testing

### Test the booking flow:
1. Open `index.html` in browser
2. Click "Book Your Ad"
3. Complete the form
4. Use Stripe test card: `4242 4242 4242 4242`

### Test admin dashboard:
1. Open `admin/index.html`
2. Login with your Supabase user
3. View demo data

## Deployment Checklist

- [ ] Update `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [ ] Update `STRIPE_PUBLISHABLE_KEY` with live key
- [ ] Run `schema.sql` in Supabase
- [ ] Create admin user in Supabase Auth
- [ ] Update company contact info
- [ ] Update bank details
- [ ] Test full booking flow
- [ ] Deploy to Netlify

## Security Notes

⚠️ **Never commit sensitive data:**
- Stripe Secret Key (use only server-side)
- Supabase Service Role Key
- Admin passwords

The Supabase `anon` key and Stripe publishable key are safe for frontend use.

## Support

For issues or customization help:
- Email: adspot77@gmail.com

## License

Private use for AdSpot Media Services.

---

Built with ❤️ for AdSpot Media Services
