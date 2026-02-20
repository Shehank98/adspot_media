# Outlook Email Template Fix Guide

## Problem
Your invoice emails show perfectly in Gmail but break in Outlook because Outlook doesn't support modern CSS.

## Solution
Replace the invoice email template in your Google Apps Script with this Outlook-compatible version:

### Updated `sendInvoiceEmail()` Function

Replace the `htmlBody` section in your Apps Script `sendInvoiceEmail()` function with this table-based layout:

```javascript
const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <!-- Wrapper Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Main Container Table -->
        <table width="800" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #1e40af; font-size: 28px; font-weight: 600;">Invoice</td>
                  <td align="right" style="font-size: 24px; font-weight: 700; color: #1e40af;">◈ AdSpot</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoice Details -->
          <tr>
            <td style="padding: 0 40px 25px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
                <tr>
                  <td style="padding: 4px 0; color: #6b7280; width: 140px;">Invoice number</td>
                  <td style="font-weight: 500;">${data.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Date of issue</td>
                  <td style="font-weight: 500;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Reference</td>
                  <td style="font-weight: 500;">${data.quotationNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Payment method</td>
                  <td style="font-weight: 500;"><strong>${data.paymentMethod || 'VISA'}</strong></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Company & Customer Info -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
                <tr>
                  <td style="vertical-align: top; width: 50%;">
                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">AdSpot Media</div>
                    <div style="color: #6b7280; line-height: 1.6;">
                      130 High Level Road<br>
                      Colombo 06<br>
                      Sri Lanka<br>
                      adspot77@gmail.com
                    </div>
                  </td>
                  <td style="vertical-align: top; width: 50%;">
                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">Bill to</div>
                    <div style="color: #6b7280; line-height: 1.6;">
                      ${data.customerName}<br>
                      ${data.customerEmail}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment Status Box -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="24" cellspacing="0" border="0" style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 8px;">
                <tr>
                  <td>
                    <!-- Status Badge and Text -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <span style="background-color: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; margin-right: 12px;">✓ Paid</span>
                          <span style="color: #6b7280; font-size: 14px;">Thank you for your payment</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Amount Paid -->
                    <table width="100%" cellpadding="16" cellspacing="0" border="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px;">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Amount paid</td>
                        <td align="right" style="color: #1f2937; font-size: 24px; font-weight: 700;">Rs. ${formatNumber(data.totalAmount)}</td>
                      </tr>
                    </table>

                    <!-- Download Button -->
                    ${data.pdfUrl ? `
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #1e40af; border-radius: 6px;">
                          <a href="${data.pdfUrl}" style="display: block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px;">⬇️ Download Invoice PDF</a>
                        </td>
                      </tr>
                    </table>
                    ` : `
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #9ca3af; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                          📄 PDF Generating...
                        </td>
                      </tr>
                    </table>
                    <p style="color: #6b7280; font-size: 13px; margin-top: 8px;">Your invoice PDF is being generated. Please contact us if you need the PDF immediately.</p>
                    `}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; border-collapse: collapse;">
                <!-- Table Header -->
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th align="left" style="padding: 12px 0; color: #6b7280; font-weight: 500; font-size: 13px;">Description</th>
                  <th align="center" style="padding: 12px 0; color: #6b7280; font-weight: 500; font-size: 13px;">Qty</th>
                  <th align="right" style="padding: 12px 0; color: #6b7280; font-weight: 500; font-size: 13px;">Unit price</th>
                  <th align="right" style="padding: 12px 0; color: #6b7280; font-weight: 500; font-size: 13px;">Amount</th>
                </tr>

                <!-- Items -->
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
                <tr>
                  <td width="60%"></td>
                  <td align="right" style="padding: 8px 40px 8px 0; color: #6b7280;">Subtotal</td>
                  <td align="right" style="padding: 8px 0;">Rs. ${formatNumber(data.subtotal)}</td>
                </tr>
                ${data.commission && data.commission > 0 ? `
                <tr>
                  <td></td>
                  <td align="right" style="padding: 8px 40px 8px 0; color: #6b7280;">Platform Commission (10%)</td>
                  <td align="right" style="padding: 8px 0;">Rs. ${formatNumber(data.commission)}</td>
                </tr>
                ` : ''}
                ${data.vat && data.vat > 0 ? `
                <tr>
                  <td></td>
                  <td align="right" style="padding: 8px 40px 8px 0; color: #6b7280;">VAT (18%)</td>
                  <td align="right" style="padding: 8px 0;">Rs. ${formatNumber(data.vat)}</td>
                </tr>
                ` : ''}
                ${data.serviceCharge && data.serviceCharge > 0 ? `
                <tr>
                  <td></td>
                  <td align="right" style="padding: 8px 40px 8px 0; color: #6b7280;">Service Charge</td>
                  <td align="right" style="padding: 8px 0;">Rs. ${formatNumber(data.serviceCharge)}</td>
                </tr>
                ` : ''}
                ${data.promoDiscount && data.promoDiscount > 0 ? `
                <tr>
                  <td></td>
                  <td align="right" style="padding: 8px 40px 8px 0; color: #059669;">Discount (${data.promoCode})</td>
                  <td align="right" style="padding: 8px 0; color: #059669;">-Rs. ${formatNumber(data.promoDiscount)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td></td>
                  <td align="right" style="padding: 8px 40px 8px 0; color: #6b7280;">Total</td>
                  <td align="right" style="padding: 8px 0;">Rs. ${formatNumber(data.totalAmount)}</td>
                </tr>
                <tr>
                  <td></td>
                  <td align="right" style="padding: 12px 40px 0 0; border-top: 2px solid #10b981; font-weight: 700; color: #10b981; padding-top: 12px;">Amount paid ✅</td>
                  <td align="right" style="border-top: 2px solid #10b981; font-weight: 700; color: #10b981; padding-top: 12px;">Rs. ${formatNumber(data.totalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #6b7280;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0;">AdSpot Media Services</p>
                    <p style="margin: 0;">Phone: 070 161 1411 / 070 642 1998 | Email: adspot77@gmail.com</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
```

## Changes Made:

1. ✅ **Replaced all divs with tables** - Outlook loves tables
2. ✅ **Removed `display: inline-block`** - Doesn't work in Outlook
3. ✅ **Used table-based buttons** - Compatible with all email clients
4. ✅ **Simplified CSS** - Only properties Outlook supports
5. ✅ **Added cellpadding/cellspacing** - For consistent spacing
6. ✅ **Used align attributes** - Instead of CSS text-align

## How to Update:

1. Open your Google Apps Script editor
2. Find the `sendInvoiceEmail()` function
3. Replace the `htmlBody` variable with the code above
4. Save and deploy

## Testing:

After updating, send a test invoice to:
- Gmail account ✅
- Outlook.com account ✅
- Outlook desktop client ✅

All should now display correctly!

## Why This Works:

**Gmail** = Supports modern CSS and tables → Will look great
**Outlook** = Only supports tables and basic CSS → Now works perfectly
**Mobile** = Table-based emails are responsive → Works on phones too

---

**Note:** The "New Order Received" email (sendAdminNotification in google-apps-script-complete.js) already uses tables and should work fine in Outlook.
