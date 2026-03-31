const nodemailer = require('nodemailer');
const { getOfferById } = require('./offers');
const db = require('./db');

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTitleLines(orderItems) {
  const lines = [];
  for (const it of orderItems || []) {
    const offer = getOfferById(it.offer_id);
    const name = offer?.name || it.offer_id;
    const qty = Math.max(1, Number(it.quantity || 1));
    lines.push({ name, qty });
  }
  return lines;
}

function buildPlainText({ order, titleLines }) {
  const lines = [];
  lines.push('Ringier Abo Landingpage');
  lines.push('');
  lines.push('Bestellte Titel');
  for (const t of titleLines) {
    lines.push(`  - ${t.name}${t.qty > 1 ? ` (${t.qty}×)` : ''}`);
  }
  lines.push('');
  lines.push('Kunde');
  lines.push(`  ${order.first_name} ${order.last_name}`);
  lines.push('');
  lines.push('Adresse');
  lines.push(`  ${order.street} ${order.house_no}`);
  lines.push(`  ${order.postal_code} ${order.city}`);
  if (order.country && String(order.country).toUpperCase() !== 'CH') {
    lines.push(`  ${order.country}`);
  }
  lines.push('');
  if (order.gift_subscription) {
    lines.push('Lieferadresse (Geschenkempfänger)');
    const sf = order.shipping_first_name;
    const sl = order.shipping_last_name;
    if (sf || sl) {
      lines.push(`  ${[sf, sl].filter(Boolean).join(' ')}`);
    }
    if (order.shipping_street || order.shipping_house_no) {
      lines.push(`  ${order.shipping_street || ''} ${order.shipping_house_no || ''}`.trim());
    }
    if (order.shipping_postal_code || order.shipping_city) {
      lines.push(`  ${order.shipping_postal_code || ''} ${order.shipping_city || ''}`.trim());
    }
    if (order.shipping_country && String(order.shipping_country).toUpperCase() !== 'CH') {
      lines.push(`  ${order.shipping_country}`);
    }
    lines.push('');
  }
  lines.push(`Bestell-ID: ${order.id}`);
  return lines.join('\n');
}

function buildHtml({ order, titleLines }) {
  const name = escapeHtml(`${order.first_name} ${order.last_name}`.trim());
  const street = escapeHtml(`${order.street || ''} ${order.house_no || ''}`.trim());
  const plzOrt = escapeHtml(`${order.postal_code || ''} ${order.city || ''}`.trim());
  const country = order.country && String(order.country).toUpperCase() !== 'CH' ? escapeHtml(order.country) : '';

  const titlesHtml = titleLines
    .map(
      (t) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e8ecec;">${escapeHtml(t.name)}${
          t.qty > 1 ? ` <span style="color:#5c6f6d;">(${t.qty}×)</span>` : ''
        }</td></tr>`
    )
    .join('');

  let giftBlock = '';
  if (order.gift_subscription) {
    const gName = [order.shipping_first_name, order.shipping_last_name].filter(Boolean).join(' ');
    const gStreet = [order.shipping_street, order.shipping_house_no].filter(Boolean).join(' ');
    const gPlz = [order.shipping_postal_code, order.shipping_city].filter(Boolean).join(' ');
    const gCountry =
      order.shipping_country && String(order.shipping_country).toUpperCase() !== 'CH'
        ? escapeHtml(order.shipping_country)
        : '';
    giftBlock = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
        <tr>
          <td style="padding:16px 20px;background:#f0f7f6;border-radius:8px;border:1px solid #cfe3e0;">
            <div style="font-size:12px;font-weight:600;color:#0d5c54;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;">Lieferadresse (Geschenk)</div>
            ${gName ? `<div style="font-size:15px;color:#1a2f2d;margin-bottom:6px;">${escapeHtml(gName)}</div>` : ''}
            ${gStreet ? `<div style="font-size:15px;color:#3d524f;line-height:1.5;">${escapeHtml(gStreet)}</div>` : ''}
            ${gPlz ? `<div style="font-size:15px;color:#3d524f;line-height:1.5;">${escapeHtml(gPlz)}</div>` : ''}
            ${gCountry ? `<div style="font-size:14px;color:#5c6f6d;">${gCountry}</div>` : ''}
          </td>
        </tr>
      </table>`;
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Ringier Abo Landingpage</title>
</head>
<body style="margin:0;padding:0;background:#e8eeed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8eeed;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,92,84,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d6e64 0%,#0a5c54 100%);background-color:#0d6e64;padding:28px 24px;text-align:center;">
              <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);letter-spacing:0.06em;text-transform:uppercase;">familleSuisse</div>
              <div style="font-size:20px;font-weight:700;color:#ffffff;margin-top:8px;line-height:1.3;">Neue bezahlte Bestellung</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.88);margin-top:6px;">Ringier Abo Landingpage</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 32px;">
              <div style="font-size:12px;font-weight:600;color:#0d5c54;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px;">Bestellte Titel</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${titlesHtml}</table>

              <div style="font-size:12px;font-weight:600;color:#0d5c54;text-transform:uppercase;letter-spacing:0.04em;margin:28px 0 12px;">Kunde</div>
              <div style="font-size:17px;font-weight:600;color:#1a2f2d;">${name}</div>

              <div style="font-size:12px;font-weight:600;color:#0d5c54;text-transform:uppercase;letter-spacing:0.04em;margin:24px 0 12px;">Adresse</div>
              <div style="font-size:15px;color:#3d524f;line-height:1.6;">
                <div>${street}</div>
                <div style="margin-top:4px;">${plzOrt}</div>
                ${country ? `<div style="margin-top:4px;">${country}</div>` : ''}
              </div>
              ${giftBlock}

              <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e0ebe9;font-size:12px;color:#7a8c89;">
                Bestell-ID: <span style="font-family:ui-monospace,monospace;color:#3d524f;">${escapeHtml(order.id)}</span>
              </div>
            </td>
          </tr>
        </table>
        <div style="max-width:560px;margin:16px auto 0;font-size:11px;color:#8a9a97;text-align:center;line-height:1.5;">
          Automatische Benachrichtigung von der Bestellseite · familleSuisse
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  const debugEnabled =
    process.env.SMTP_DEBUG === 'true' ||
    process.env.SMTP_DEBUG === '1' ||
    process.env.SMTP_DEBUG === 'yes';
  const requireTls =
    process.env.SMTP_REQUIRE_TLS === 'true' ||
    process.env.SMTP_REQUIRE_TLS === '1' ||
    process.env.SMTP_REQUIRE_TLS === 'yes';
  const authMethod = process.env.SMTP_AUTH_METHOD?.trim() || undefined; // e.g. LOGIN | PLAIN

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: pass ?? '' } : undefined,
    authMethod,
    requireTLS: requireTls || undefined,
    logger: debugEnabled || undefined,
    debug: debugEnabled || undefined,
  });
}

/**
 * Sendet nach erfolgreicher Zahlung eine Benachrichtigung an den Vertrieb.
 * Ohne SMTP_HOST wird nichts gesendet ({ skipped: true }).
 */
async function sendSalesPaidNotification({ order, orderItems }) {
  const transport = getSmtpTransport();
  if (!transport) {
    return { skipped: true, reason: 'SMTP_HOST nicht gesetzt' };
  }

  if (!db.claimSalesEmailSend(order.id)) {
    return { skipped: true, reason: 'Sales-E-Mail bereits gesendet' };
  }

  const to = process.env.SALES_NOTIFICATION_TO?.trim() || 'sales@famillesuisse.ch';
  const from = process.env.SMTP_FROM?.trim() || 'noreply@famillesuisse.ch';

  const titleLines = buildTitleLines(orderItems);
  const subject = 'Ringier Abo Landingpage';
  const text = buildPlainText({ order, titleLines });
  const html = buildHtml({ order, titleLines });

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return { sent: true, to };
  } catch (err) {
    db.releaseSalesEmailSend(order.id);
    throw err;
  }
}

module.exports = {
  sendSalesPaidNotification,
};
