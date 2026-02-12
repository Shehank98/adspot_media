# 🔧 Maintenance Mode - Setup Instructions

## ⚡ **Quick Integration (5 Minutes)**

You need to add 2 script tags to ALL your pages. Here's how:

---

## 📝 **Step 1: Add Scripts to Your Pages**

### **Add to EVERY HTML file** (before closing `</body>` tag):

```html
<!-- Maintenance Mode Scripts -->
<script src="/js/maintenance-config.js"></script>
<script src="/js/maintenance-check.js"></script>
</body>
</html>
```

### **Files to Update:**

✅ Required (add to these files):
- [ ] `index.html`
- [ ] `book.html`
- [ ] `my-bookings.html`
- [ ] `admin-bookings.html`
- [ ] `admin-customers.html`
- [ ] `admin-publications.html`
- [ ] `admin-promo-codes.html`
- [ ] `setup-admin.html`

❌ Don't add to:
- `maintenance.html` (already has its own script)
- Files in `/samples/` folder (test files)

---

## 🎯 **Step 2: Test It Works**

### **Test Locally:**

1. **Add scripts to `index.html`** (as example):
   ```html
   <!-- Find the closing </body> tag -->
   <!-- Add these 2 lines BEFORE it -->
   <script src="/js/maintenance-config.js"></script>
   <script src="/js/maintenance-check.js"></script>
   </body>
   </html>
   ```

2. **Enable maintenance mode:**
   - Open `js/maintenance-config.js`
   - Change `maintenanceMode: false` to `maintenanceMode: true`

3. **Start local server:**
   ```bash
   cd /home/user/adspot_media
   python3 -m http.server 8000
   ```

4. **Visit http://localhost:8000**
   - Should redirect to maintenance page ✅

5. **Test admin access:**
   - Click 🔑 icon (bottom-right)
   - Enter: `adspot2026`
   - Should see site normally ✅
   - Should see "🔓 Admin Mode" indicator ✅

6. **Disable maintenance:**
   - Change back to `maintenanceMode: false`
   - Refresh page
   - Should see site normally ✅

---

## 📋 **Step 3: Deploy to Production**

### **Option A: Manual Integration (Safest)**

Do it page by page to avoid breaking anything:

```bash
# 1. Add scripts to index.html
# Test locally

# 2. Commit just index.html
git add index.html js/maintenance-config.js js/maintenance-check.js maintenance.html
git commit -m "Add maintenance mode to homepage"
git push

# 3. Test on live site

# 4. If works, add to other pages
git add book.html my-bookings.html
git commit -m "Add maintenance mode to booking pages"
git push

# 5. Continue until all pages done
```

### **Option B: Bulk Integration (Faster)**

Add to all pages at once:

```bash
# Add scripts to ALL HTML files
# Test locally first!

git add .
git commit -m "Add maintenance mode system"
git push
```

---

## 🔍 **Where to Add the Scripts**

### **Example: index.html**

Find the end of the file:
```html
    <!-- Existing scripts -->
    <script src="js/firebase-init.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/translations.js"></script>

    <!-- ADD THESE 2 LINES HERE -->
    <script src="/js/maintenance-config.js"></script>
    <script src="/js/maintenance-check.js"></script>
</body>
</html>
```

### **Example: book.html**

Find the end of the file:
```html
    <!-- Existing scripts -->
    <script src="js/booking.js"></script>

    <!-- ADD THESE 2 LINES HERE -->
    <script src="/js/maintenance-config.js"></script>
    <script src="/js/maintenance-check.js"></script>
</body>
</html>
```

---

## ⚙️ **Automated Script (Optional)**

Want to add scripts automatically? Run this:

```bash
cd /home/user/adspot_media

# Find all HTML files and add scripts (except maintenance.html and samples)
find . -name "*.html" \
  ! -path "./maintenance.html" \
  ! -path "./samples/*" \
  -exec sed -i 's|</body>|<script src="/js/maintenance-config.js"></script>\n<script src="/js/maintenance-check.js"></script>\n</body>|g' {} \;

# Check what changed
git diff

# If looks good, commit
git add .
git commit -m "Add maintenance mode to all pages"
git push
```

⚠️ **Warning:** Test this on a backup first!

---

## ✅ **Verification Checklist**

After adding scripts to all pages:

### **Test Each Page:**

```bash
# Start server
python3 -m http.server 8000

# Visit each page:
http://localhost:8000/                     # index.html
http://localhost:8000/book                 # book.html
http://localhost:8000/my-bookings          # my-bookings.html
http://localhost:8000/admin-bookings       # admin-bookings.html

# For each page:
1. Page loads normally ✅
2. No console errors (F12 → Console) ✅
3. Scripts load (check Network tab) ✅
```

### **Test Maintenance Mode:**

```bash
# Enable maintenance
# Set maintenanceMode: true in js/maintenance-config.js

# Test:
1. Visit any page → Redirects to maintenance ✅
2. Click 🔑 → Enter password → Access granted ✅
3. See "🔓 Admin Mode" indicator ✅
4. Can browse all pages ✅

# Disable maintenance
# Set maintenanceMode: false

# Test:
1. All pages work normally ✅
2. No redirects ✅
```

---

## 🐛 **Common Issues**

### **Scripts not loading**
```
Error: Failed to load resource: js/maintenance-config.js

Fix: Check file path - use /js/ (with leading slash)
```

### **Redirects not working**
```
Issue: Page loads but doesn't redirect

Fix:
1. Check browser console for errors
2. Clear cache (Ctrl+Shift+R)
3. Try incognito mode
4. Verify maintenanceMode: true
```

### **Admin access not working**
```
Issue: Password prompt doesn't show

Fix:
1. Check if 🔑 icon is visible (bottom-right)
2. Try clicking anywhere on page first
3. Check console for JavaScript errors
```

---

## 📊 **Integration Status**

Track your progress:

```
Integration Checklist:
□ Created maintenance files ✅ (Done automatically)
□ Tested maintenance.html locally
□ Added scripts to index.html
□ Added scripts to book.html
□ Added scripts to my-bookings.html
□ Added scripts to admin pages
□ Tested on all pages locally
□ Changed default password
□ Tested admin access
□ Deployed to production
□ Tested on live site
```

---

## 🚀 **Quick Start (Copy-Paste)**

### **1. Add to index.html:**
```html
<script src="/js/maintenance-config.js"></script>
<script src="/js/maintenance-check.js"></script>
</body>
```

### **2. Test locally:**
```bash
python3 -m http.server 8000
```

### **3. Enable maintenance:**
```javascript
// In js/maintenance-config.js
maintenanceMode: true
```

### **4. Test admin access:**
```
Password: adspot2026
```

### **5. Deploy:**
```bash
git add .
git commit -m "Add maintenance mode"
git push
```

---

## 📞 **Need Help?**

If you get stuck:
1. Check `MAINTENANCE-GUIDE.md` for detailed docs
2. Check browser console (F12 → Console)
3. Test in incognito mode
4. Try clearing cache

---

**Ready to integrate?** Start with `index.html` and test before adding to other pages! 🎯
