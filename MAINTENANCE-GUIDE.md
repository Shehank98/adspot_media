# 🔧 Maintenance Mode - Complete Guide

Easy-to-use maintenance mode system with admin access for AdSpot Media.

---

## 📋 **Quick Start**

### **To Enable Maintenance Mode:**

1. Open `js/maintenance-config.js`
2. Change line 16:
   ```javascript
   maintenanceMode: false,  // Change to true
   ```
   to:
   ```javascript
   maintenanceMode: true,  // ✅ Maintenance is ON
   ```
3. Commit and push to GitHub:
   ```bash
   git add js/maintenance-config.js
   git commit -m "Enable maintenance mode"
   git push
   ```
4. **Done!** Site now shows maintenance page to all visitors

### **To Disable Maintenance Mode:**

1. Open `js/maintenance-config.js`
2. Change back to:
   ```javascript
   maintenanceMode: false,  // ✅ Site is back online
   ```
3. Commit and push to GitHub
4. **Done!** Site is back online

---

## 🔐 **Admin Access (For You)**

### **How to Access Site During Maintenance:**

**Method 1: Password Access (Recommended)**
1. Visit your site (you'll see maintenance page)
2. Click the 🔑 icon (bottom-right corner)
3. Enter password: `adspot2026`
4. You now have full access!

**Method 2: Direct Access**
- Password is saved in your browser
- Works until you clear browser data
- Click "Logout" button (top-right) to exit admin mode

### **Change Admin Password:**

Open `js/maintenance-config.js` and change:
```javascript
adminPassword: 'adspot2026',  // Change to your password
```

Also update in `maintenance.html` (line 272):
```javascript
if (password === 'adspot2026') { // Change here too
```

---

## 📁 **Files Created:**

| File | Purpose |
|------|---------|
| `maintenance.html` | Beautiful maintenance page |
| `js/maintenance-config.js` | Easy ON/OFF toggle |
| `js/maintenance-check.js` | Auto-checker (runs on all pages) |
| `MAINTENANCE-GUIDE.md` | This guide |

---

## 🎯 **How It Works:**

### **For Public Visitors:**
```
1. Visit any page
2. maintenance-check.js loads
3. Checks if maintenanceMode = true
4. Redirects to maintenance.html
5. Shows "We'll be right back" message
```

### **For Admin (You):**
```
1. Visit any page
2. Click 🔑 icon
3. Enter password
4. Access granted
5. Browse site normally
6. See "🔓 Admin Mode" indicator
```

---

## ⚙️ **Configuration Options:**

Edit `js/maintenance-config.js`:

```javascript
const MaintenanceConfig = {
    // Toggle maintenance ON/OFF
    maintenanceMode: false, // ← Change this

    // Admin password
    adminPassword: 'adspot2026', // ← Change this

    // Estimated duration (hours)
    estimatedDuration: 2, // ← Change this

    // Custom message
    message: 'We\'re performing maintenance...', // ← Change this
};
```

---

## 🚀 **Common Scenarios:**

### **Scenario 1: Quick Bug Fix (30 mins)**
```bash
# Enable maintenance
git add js/maintenance-config.js
git commit -m "Enable maintenance - bug fix"
git push

# ... fix bugs ...

# Disable maintenance
git add js/maintenance-config.js
git commit -m "Disable maintenance - fixed"
git push
```

### **Scenario 2: Testing New Feature**
```bash
# Enable maintenance
# You can access via password
# Public sees maintenance page
# Test everything
# Disable when ready
```

### **Scenario 3: Scheduled Maintenance**
```bash
# Announce maintenance 24 hours ahead
# Enable maintenance at scheduled time
# Perform updates
# Disable when done
```

---

## 📧 **Maintenance Page Features:**

- ✅ Countdown timer (auto-updates)
- ✅ Progress bar animation
- ✅ Contact buttons (Email, Phone, WhatsApp)
- ✅ Auto-refresh (every 10 minutes)
- ✅ Mobile responsive
- ✅ Beautiful gradient design
- ✅ Hidden admin access button (🔑)

---

## 🔄 **Testing Maintenance Mode:**

### **Test Locally:**

1. **Start local server:**
   ```bash
   cd /home/user/adspot_media
   python3 -m http.server 8000
   ```

2. **Enable maintenance:**
   - Edit `js/maintenance-config.js`
   - Set `maintenanceMode: true`
   - Save (don't commit yet)

3. **Visit:** http://localhost:8000
   - Should see maintenance page

4. **Test admin access:**
   - Click 🔑 icon
   - Enter: `adspot2026`
   - Should see site normally
   - See "🔓 Admin Mode" indicator

5. **Disable maintenance:**
   - Set `maintenanceMode: false`
   - Refresh page
   - Should see site normally

### **Test on Staging:**

If you have a staging site:
1. Enable maintenance on staging first
2. Test admin access
3. Verify everything works
4. Then enable on production

---

## ⚠️ **Important Notes:**

### **SEO Protection:**
- Maintenance page has `noindex, nofollow` meta tags
- Won't hurt your SEO rankings
- Temporary maintenance is fine for search engines

### **Browser Caching:**
- Maintenance page auto-refreshes every 10 minutes
- Checks if site is back online
- Users don't need to manually refresh

### **Admin Access:**
- Password stored in `localStorage`
- Persists until browser data is cleared
- Click "Logout" to exit admin mode

### **Security:**
- Change default password (`adspot2026`)
- Don't share admin password
- Password is client-side only (not super secure)
- Fine for temporary maintenance

---

## 🎨 **Customizing Maintenance Page:**

### **Change Countdown:**
Edit `maintenance.html` (line 230):
```javascript
const targetTime = new Date().getTime() + (2 * 60 * 60 * 1000);
                                           ↑
                                      2 hours
```

### **Change Message:**
Edit `maintenance.html` (line 140):
```html
<p class="subtitle">
    Your custom message here
</p>
```

### **Change Contact Info:**
Edit `maintenance.html` (lines 168-194):
```html
<a href="mailto:your@email.com">Email</a>
<a href="tel:+94123456789">Call</a>
```

---

## 🐛 **Troubleshooting:**

### **Problem: Maintenance page not showing**
**Solution:**
1. Check `js/maintenance-config.js` - is `maintenanceMode: true`?
2. Clear browser cache
3. Try incognito mode
4. Check browser console for errors

### **Problem: Admin password not working**
**Solution:**
1. Check password in `js/maintenance-config.js`
2. Check password in `maintenance.html` (line 272)
3. Passwords must match exactly
4. Case-sensitive!

### **Problem: Stuck in maintenance mode**
**Solution:**
1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Refresh page
4. Or set `maintenanceMode: false`

### **Problem: Admin indicator not showing**
**Solution:**
- It only shows when admin is logged in
- Try logging out and in again
- Check browser console for errors

---

## 📞 **Need Help?**

If you encounter issues:
1. Check browser console (F12 → Console tab)
2. Look for error messages
3. Try in incognito mode
4. Clear browser cache
5. Contact development team

---

## ✅ **Checklist: Before Enabling Maintenance**

- [ ] Changed admin password from default
- [ ] Tested maintenance mode locally
- [ ] Verified admin access works
- [ ] Announced maintenance to users (if needed)
- [ ] Have rollback plan ready
- [ ] Know how to disable quickly

---

## 📝 **Quick Reference:**

```bash
# Enable Maintenance
maintenanceMode: true  (in js/maintenance-config.js)

# Disable Maintenance
maintenanceMode: false

# Admin Password
Default: adspot2026
Change in: js/maintenance-config.js AND maintenance.html

# Test Locally
python3 -m http.server 8000

# Clear Admin Access
localStorage.clear() (in browser console)
```

---

**Created:** 2026-02-12
**Status:** Ready to Use
**Safe:** Yes (won't break site if misconfigured)

---

## 🎯 **Summary:**

1. **Enable:** Set `maintenanceMode: true` → Commit → Push
2. **Access:** Click 🔑 → Enter `adspot2026`
3. **Disable:** Set `maintenanceMode: false` → Commit → Push

**That's it!** Simple, safe, and effective. 🚀
