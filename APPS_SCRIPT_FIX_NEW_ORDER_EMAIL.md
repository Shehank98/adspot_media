# How to Add "New Order Received" Email to Your Google Apps Script

## Problem
You're not receiving "New Ad Booking" notification emails because your Google Apps Script is missing the `sendAdminNotification` action.

## Solution

### Step 1: Open Your Google Apps Script
1. Go to https://script.google.com
2. Open your "AdSpot Backend" or "AdSpot Email Service" project

### Step 2: Add the Missing Action to doPost()

Find the `switch(actionType)` section in your `doPost()` function and add this case:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const actionType = data.action || data.type;

    Logger.log('Received request: ' + actionType);

    switch(actionType) {
      case 'booking_confirmation':
      case 'sendBookingConfirmation':
        return sendBookingConfirmation(data);

      case 'invoice_email':
      case 'sendInvoice':
        return sendInvoiceEmail(data);

      case 'payment_confirmation':
      case 'sendPaymentConfirmation':
        return sendPaymentConfirmation(data);

      // ⭐ ADD THIS NEW CASE ⭐
      case 'sendAdminNotification':
        return sendAdminNotification(data);

      case 'file_upload_notification':
        return sendFileNotification(data);

      case 'contact_message':
      case 'sendContactForm':
        return sendContactMessage(data);

      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Unknown email type: ' + actionType
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Step 3: Add the sendAdminNotification Function

Add this complete function to your Apps Script (after the doPost function):

```javascript
/**
 * Send notification to admin when new order received
 */
function sendAdminNotification(data) {
  const {
    quotation_number,
    customer_name,
    customer_email,
    customer_phone,
    newspaper_name,
    total_amount,
    subtotalAmount,
    promoCode,
    promoDiscount,
    ad_type,
    items
  } = data;

  const subject = `New Ad Booking: ${quotation_number}`;

  // Build items list HTML
  const itemsList = items ? items.map(item => {
    const classifiedText = item.details?.text || item.adText || '';
    const adTypeDisplay = item.adType === 'classified' ? 'Classified Ad' : 'Box Ad';
    const adFileUrl = item.adFileUrl || '';

    let textSection = '';
    if (classifiedText) {
      textSection = `
        <tr style="background: #fffbeb;">
          <td colspan="4" style="padding: 12px;">
            <div style="background: #fef3c7; border-radius: 8px; padding: 12px; border-left: 4px solid #f59e0b;">
              <strong style="color: #92400e;">📝 Ad Text:</strong>
              <p style="color: #1f2937; margin: 8px 0 0 0; white-space: pre-wrap;">${classifiedText}</p>
            </div>
          </td>
        </tr>
      `;
    }

    let fileSection = '';
    if (adFileUrl) {
      fileSection = `
        <tr style="background: #eff6ff;">
          <td colspan="4" style="padding: 12px;">
            <div style="background: #dbeafe; border-radius: 8px; padding: 12px; border-left: 4px solid #3b82f6;">
              <strong style="color: #1e40af;">📎 Ad File:</strong>
              <a href="${adFileUrl}" style="color: #2563eb; text-decoration: underline; margin-left: 8px;" target="_blank">Download Ad Artwork</a>
            </div>
          </td>
        </tr>
      `;
    }

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px;">${item.newspaperName || 'N/A'}</td>
        <td style="padding: 12px;">${adTypeDisplay}</td>
        <td style="padding: 12px;">${item.pubDate || 'N/A'}</td>
        <td style="padding: 12px; text-align: right; font-weight: 600;">Rs. ${(item.price || 0).toLocaleString()}</td>
      </tr>
      ${textSection}
      ${fileSection}
    `;
  }).join('') : '';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fa; }
      </style>
    </head>
    <body>
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">

              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 12px;">🔔</div>
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">New Order Received!</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">${quotation_number}</p>
                </td>
              </tr>

              <!-- Customer Info -->
              <tr>
                <td style="padding: 30px;">
                  <div style="background: #eff6ff; border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px;">Customer Details</h3>
                    <table width="100%">
                      <tr><td style="color: #6b7280; padding: 4px 0;">Name:</td><td style="font-weight: 600;">${customer_name}</td></tr>
                      <tr><td style="color: #6b7280; padding: 4px 0;">Email:</td><td style="font-weight: 600;">${customer_email}</td></tr>
                      <tr><td style="color: #6b7280; padding: 4px 0;">Phone:</td><td style="font-weight: 600;">${customer_phone}</td></tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Order Details -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <div style="background: #f9fafb; border-radius: 12px; padding: 24px;">
                    <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Order Details</h3>
                    <table width="100%" style="border-collapse: collapse;">
                      <thead>
                        <tr style="border-bottom: 2px solid #e5e7eb;">
                          <th style="text-align: left; padding: 12px; color: #6b7280; font-weight: 600;">Newspaper</th>
                          <th style="text-align: left; padding: 12px; color: #6b7280; font-weight: 600;">Type</th>
                          <th style="text-align: left; padding: 12px; color: #6b7280; font-weight: 600;">Date</th>
                          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsList}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Total Amount -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 12px; padding: 24px; text-align: center;">
                    <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; font-weight: 500;">TOTAL AMOUNT</p>
                    <h2 style="color: #ffffff; margin: 8px 0 0 0; font-size: 36px; font-weight: 700;">Rs. ${total_amount.toLocaleString()}</h2>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 30px; background: #f9fafb; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 13px;">
                    Received on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    MailApp.sendEmail({
      to: 'adspot77@gmail.com',
      replyTo: customer_email,
      name: 'AdSpot System',
      subject: subject,
      htmlBody: htmlBody
    });

    Logger.log('✅ Admin notification sent for: ' + quotation_number);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Admin notification sent'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('❌ Failed to send admin notification: ' + error.toString());
    throw error;
  }
}
```

### Step 4: Save and Deploy

1. Click **Save** (💾 icon)
2. Click **Deploy** > **Manage deployments**
3. Click **✏️ Edit** on your current deployment
4. Under "Version", select **New version**
5. Click **Deploy**
6. Copy the new Web App URL (should be the same as before)

### Step 5: Test

1. Place a new test order on your website
2. Check `adspot77@gmail.com` inbox
3. You should now receive "🔔 New Ad Booking: QT-xxx" emails!

## Summary

**What was missing:**
- Your Apps Script didn't have the `sendAdminNotification` action handler
- This is called from `js/firebase-db.js` line 355 when a new booking is created

**What you added:**
- ✅ New case in doPost() switch statement
- ✅ Complete sendAdminNotification() function
- ✅ Beautiful email template for new order notifications

**Result:**
- 🎉 You'll now receive instant email notifications when customers place orders!

---

**💡 Pro Tip:** The email shows:
- Customer details (name, email, phone)
- All ad items with newspaper, type, date, and price
- Ad text for classified ads
- Download links for uploaded ad files
- Total amount
- Timestamp of when the order was received

Perfect for keeping track of new orders in real-time!
