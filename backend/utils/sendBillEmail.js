/**
 * utils/sendBillEmail.js
 * Clean table-based HTML invoice email — no overlapping, email-client safe.
 * Requires: npm install nodemailer
 *
 * .env:
 *   MAIL_HOST=smtp.gmail.com
 *   MAIL_PORT=587
 *   MAIL_USER=your@gmail.com
 *   MAIL_PASS=your_16char_app_password
 *   MAIL_FROM="StyleSync <your@gmail.com>"
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host:   process.env.MAIL_HOST || 'smtp.gmail.com',
    port:   Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

const n  = (v, fb=0) => { const x=Number(v); return isNaN(x)?fb:x; };
const s  = (v, fb='') => (v==null?fb:String(v));
const arr= (v) => (Array.isArray(v)?v:[]);

async function sendBillEmail(sale, toEmail) {
    if (!toEmail || !toEmail.includes('@')) throw new Error(`Invalid email: "${toEmail}"`);

    const invId    = s(sale.invoiceId) || ('#'+s(sale._id).slice(-6).toUpperCase());
    const dateStr  = new Date(sale.date||Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
    const timeStr  = new Date(sale.date||Date.now()).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    const payLabel = sale.paymentMethod==='upi'?'UPI':sale.paymentMethod==='card'?'Card':'Cash';
    const totalAmt = `Rs.${n(sale.totalAmount).toFixed(2)}`;
    const subAmt   = `Rs.${n(sale.subtotal??sale.totalAmount).toFixed(2)}`;
    const discAmt  = `Rs.${n(sale.discount).toFixed(2)}`;
    const custName = s(sale.customerName,'Valued Customer');

    // Build item rows
    const itemRows = arr(sale.items).map((item, i) => {
        const bg    = i%2===0 ? '#ffffff' : '#f8fafc';
        const qty   = n(item.quantity,1);
        const price = n(item.price);
        return `
        <tr>
          <td style="background:${bg};padding:10px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #e8edf2;">${s(item.name)}</td>
          <td style="background:${bg};padding:10px 8px;font-size:13px;color:#64748b;text-align:center;border-bottom:1px solid #e8edf2;">${qty}</td>
          <td style="background:${bg};padding:10px 8px;font-size:13px;color:#64748b;text-align:right;border-bottom:1px solid #e8edf2;">Rs.${price.toFixed(2)}</td>
          <td style="background:${bg};padding:10px 16px;font-size:13px;font-weight:700;color:#0f172a;text-align:right;border-bottom:1px solid #e8edf2;">Rs.${(price*qty).toFixed(2)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>StyleSync Invoice ${invId}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:Arial,Helvetica,sans-serif;">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 0;">
  <tr>
    <td align="center" valign="top">

      <!-- Email card — fixed 600px -->
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">

        <!-- ═══ HEADER ═══ -->
        <tr>
          <td style="background-color:#0f172a;padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:28px 32px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="top">
                        <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;margin:0;">STYLESYNC</div>
                        <div style="font-size:9px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Retail &amp; Fashion</div>
                      </td>
                      <td valign="top" align="right">
                        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Tax Invoice</div>
                        <div style="font-size:14px;font-weight:700;color:#818cf8;margin-top:4px;">${invId}</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${dateStr}</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${timeStr}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- accent line -->
              <tr><td style="background-color:#6366f1;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- ═══ GREETING ═══ -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <div style="font-size:18px;font-weight:700;color:#0f172a;">Hi ${custName}! 👋</div>
            <div style="font-size:13px;color:#64748b;margin-top:8px;line-height:1.7;">
              Thank you for shopping at <strong style="color:#0f172a;">StyleSync</strong>.
              Here is your invoice for the purchase on <strong style="color:#0f172a;">${dateStr}</strong>.
            </div>
          </td>
        </tr>

        <!-- ═══ BILLED TO / SALE INFO CARDS ═══ -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>

                <!-- Billed To -->
                <td width="48%" valign="top" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
                  <div style="font-size:9px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Billed To</div>
                  <div style="font-size:14px;font-weight:700;color:#0f172a;">${s(sale.customerName,'Walk-in Customer')}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:4px;">Ph: ${s(sale.customerPhone,'N/A')}</div>
                  ${sale.storeLocation ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">City: ${sale.storeLocation}</div>` : ''}
                </td>

                <td width="4%">&nbsp;</td>

                <!-- Sale Info -->
                <td width="48%" valign="top" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
                  <div style="font-size:9px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Served By</div>
                  <div style="font-size:14px;font-weight:700;color:#0f172a;">${s(sale.staffName,'Staff')}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:4px;">Payment: ${payLabel}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px;">Invoice: ${invId}</div>
                </td>

              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ ITEMS TABLE ═══ -->
        <tr>
          <td style="padding:0 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
              <!-- Header row -->
              <tr style="background-color:#0f172a;">
                <th align="left"   style="padding:11px 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Item</th>
                <th align="center" style="padding:11px 8px; font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;width:40px;">Qty</th>
                <th align="right"  style="padding:11px 8px; font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;width:80px;">Price</th>
                <th align="right"  style="padding:11px 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;width:90px;">Total</th>
              </tr>
              ${itemRows}
            </table>
          </td>
        </tr>

        <!-- ═══ TOTALS ═══ -->
        <tr>
          <td style="padding:16px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">

              <!-- Subtotal -->
              <tr style="background-color:#f8fafc;">
                <td style="padding:10px 16px;font-size:13px;color:#64748b;">Subtotal</td>
                <td style="padding:10px 16px;font-size:13px;color:#0f172a;text-align:right;font-family:monospace;">${subAmt}</td>
              </tr>

              <!-- Discount -->
              <tr style="background-color:#f0fdf4;">
                <td style="padding:10px 16px;font-size:13px;color:#16a34a;">Discount</td>
                <td style="padding:10px 16px;font-size:13px;color:#16a34a;text-align:right;font-family:monospace;">− ${discAmt}</td>
              </tr>

              <!-- Total -->
              <tr style="background-color:#0f172a;">
                <td style="padding:14px 16px;font-size:13px;font-weight:800;color:#ffffff;">Total Paid</td>
                <td style="padding:14px 16px;font-size:16px;font-weight:900;color:#818cf8;text-align:right;font-family:monospace;">${totalAmt}</td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- ═══ PAYMENT BADGE ═══ -->
        <tr>
          <td style="padding:14px 32px 0;" align="right">
            <span style="display:inline-block;background-color:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700;padding:5px 16px;border-radius:999px;text-transform:uppercase;letter-spacing:1px;border:1px solid #c4b5fd;">
              Paid via ${payLabel}
            </span>
          </td>
        </tr>

        <!-- ═══ DIVIDER ═══ -->
        <tr>
          <td style="padding:24px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:1px solid #e2e8f0;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- ═══ FOOTER ═══ -->
        <tr>
          <td style="padding:20px 32px 32px;text-align:center;">
            <div style="font-size:15px;font-weight:700;color:#6366f1;">Thank you for shopping with StyleSync! 🛍️</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:8px;">Returns &amp; exchanges accepted within 7 days with this invoice.</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">www.stylesync.in &nbsp;|&nbsp; support@stylesync.in</div>
          </td>
        </tr>

      </table>
      <!-- End card -->

    </td>
  </tr>
</table>
<!-- End outer wrapper -->

</body>
</html>`;

    const text = `Hi ${custName},

Thank you for shopping at StyleSync!

Invoice: ${invId}
Date: ${dateStr} ${timeStr}
Payment: ${payLabel}

Items:
${arr(sale.items).map(i=>`  - ${s(i.name)} x${n(i.quantity,1)}  Rs.${(n(i.price)*n(i.quantity,1)).toFixed(2)}`).join('\n')}

Subtotal : ${subAmt}
Discount : -${discAmt}
Total    : ${totalAmt}

Returns & exchanges accepted within 7 days.
StyleSync Team | www.stylesync.in`;

    await transporter.sendMail({
        from:    process.env.MAIL_FROM || `"StyleSync" <${process.env.MAIL_USER}>`,
        to:      toEmail,
        subject: `Your StyleSync Invoice ${invId} — ${dateStr}`,
        text,
        html,
    });

    console.log(`✅ Invoice email sent → ${toEmail} [${invId}]`);
}

module.exports = { sendBillEmail };