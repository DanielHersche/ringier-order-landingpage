const path = require('path');
const crypto = require('crypto');

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const Stripe = require('stripe');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const { createCheckoutSession } = require('./src/lib/stripeCheckout');
const { getAllOffers, getOfferById } = require('./src/lib/offers');
const db = require('./src/lib/db');
const { forwardOrderToRingiere } = require('./src/lib/forwardRingiere');
const { addToCartCookie, parseCartItemsCookie, removeFromCartCookie } = require('./src/lib/cart');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Wir verwenden Inline-Skripte (z.B. Formular-UI-Interaktionen).
// Die Standard-CSP von helmet blockiert Inline-Scripts, daher CSP deaktivieren.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('/', (req, res) => {
  res.render('index', {
    offers: getAllOffers(),
  });
});

function formatChf(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '-';
  const value = n / 100;
  if (Number.isInteger(value)) return `CHF ${value}.–`;
  return `CHF ${value.toFixed(2)} `;
}

app.get('/cart/add', (req, res) => {
  const offerId = req.query.offer;
  if (!offerId) return res.redirect('/');
  const result = addToCartCookie({ req, res, offerId, quantity: 1 });
  if (!result.ok) return res.redirect('/');
  if (result.alreadyPresent) {
    return res.redirect(`/cart?info=already&offerId=${encodeURIComponent(offerId)}`);
  }
  return res.redirect('/cart');
});

app.get('/cart', (req, res) => {
  // Legay: falls jemand noch /cart?offer=... aufruft
  if (req.query.offer) {
    const items = parseCartItemsCookie(req);
    if (!items.some((i) => i.offer_id === req.query.offer)) {
      addToCartCookie({ req, res, offerId: req.query.offer, quantity: 1 });
    }
  }

  const cartItems = parseCartItemsCookie(req);
  if (!cartItems.length) return res.redirect('/');

  const items = cartItems
    .map((ci) => {
      const offer = getOfferById(ci.offer_id);
      if (!offer) return null;
      const quantity = Math.max(1, Number(ci.quantity || 1));
      const lineTotalCents = offer.priceCents * quantity;
      return {
        offerId: ci.offer_id,
        offer,
        quantity,
        lineTotalCents,
        lineTotalDisplay: formatChf(lineTotalCents),
      };
    })
    .filter(Boolean);

  if (!items.length) return res.redirect('/');

  const totalCents = items.reduce((sum, i) => sum + i.lineTotalCents, 0);
  const totalDisplay = formatChf(totalCents);
  return res.render('cart', {
    items,
    totalCents,
    totalDisplay,
    info: req.query.info || null,
    infoOfferName: req.query.offerId ? getOfferById(String(req.query.offerId))?.name : null,
  });
});

app.get('/cart/remove', (req, res) => {
  const offerId = req.query.offer;
  if (!offerId) return res.redirect('/cart');
  removeFromCartCookie({ req, res, offerId });
  return res.redirect('/cart');
});

app.get('/form', (req, res) => {
  // Legay: falls jemand noch /form?offer=... benutzt
  if (req.query.offer) {
    const items = parseCartItemsCookie(req);
    if (!items.length) {
      addToCartCookie({ req, res, offerId: req.query.offer, quantity: 1 });
    }
  }

  const cartItems = parseCartItemsCookie(req);
  if (!cartItems.length) return res.redirect('/cart');

  const cartItemsDetailed = cartItems
    .map((ci) => {
      const offer = getOfferById(ci.offer_id);
      if (!offer) return null;
      const quantity = Math.max(1, Number(ci.quantity || 1));
      const lineTotalCents = offer.priceCents * quantity;
      return {
        offer,
        quantity,
        lineTotalCents,
        lineTotalDisplay: formatChf(lineTotalCents),
      };
    })
    .filter(Boolean);

  if (!cartItemsDetailed.length) return res.redirect('/cart');

  return res.render('form', {
    cartItemsDetailed,
    cartItemsJson: JSON.stringify(cartItems),
  });
});

app.get('/pay', (req, res) => {
  const orderId = req.query.orderId;
  if (!orderId) return res.redirect('/');
  const order = db.getOrder(orderId);
  if (!order) return res.status(404).render('error', { message: 'Bestellung nicht gefunden.' });

  const orderItems = db.getOrderItems(orderId) || [];
  const orderItemsDetailed = orderItems
    .map((it) => {
      const offer = getOfferById(it.offer_id);
      if (!offer) return null;
      const quantity = Math.max(1, Number(it.quantity || 1));
      const lineTotalCents = offer.priceCents * quantity;
      return {
        offer,
        quantity,
        lineTotalCents,
        lineTotalDisplay: formatChf(lineTotalCents),
      };
    })
    .filter(Boolean);

  const totalCents = orderItemsDetailed.reduce((sum, i) => sum + i.lineTotalCents, 0);
  const totalDisplay = formatChf(totalCents);

  res.render('pay', { order, orderItemsDetailed, totalDisplay });
});

app.get('/success', (req, res) => {
  const orderId = req.query.orderId;
  const sessionId = req.query.session_id;
  if (!orderId) return res.redirect('/');

  const order = db.getOrder(orderId);
  if (!order) return res.status(404).render('error', { message: 'Bestellung nicht gefunden.' });

  const orderItems = db.getOrderItems(orderId) || [];
  const orderItemsDetailed = orderItems
    .map((it) => {
      const offer = getOfferById(it.offer_id);
      if (!offer) return null;
      const quantity = Math.max(1, Number(it.quantity || 1));
      const lineTotalCents = offer.priceCents * quantity;
      return {
        offer,
        quantity,
        lineTotalCents,
        lineTotalDisplay: formatChf(lineTotalCents),
      };
    })
    .filter(Boolean);

  const totalCents = orderItemsDetailed.reduce((sum, i) => sum + i.lineTotalCents, 0);
  const totalDisplay = formatChf(totalCents);

  res.render('success', { order, orderItemsDetailed, totalDisplay, sessionId });
});

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/orders', express.json(), async (req, res) => {
  try {
    const {
      cart_items_json,
      first_name,
      last_name,
      email,
      phone,
      street,
      house_no,
      postal_code,
      city,
      country,
      consent_terms,
      consent_privacy,
      gift_subscription,
      shipping_first_name,
      shipping_last_name,
      shipping_street,
      shipping_house_no,
      shipping_postal_code,
      shipping_city,
      shipping_country,
    } = req.body || {};

    let cartItems = null;
    try {
      cartItems = cart_items_json ? JSON.parse(cart_items_json) : null;
    } catch {
      cartItems = null;
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'Warenkorb ist leer oder ungültig.' });
    }

    const normalizedItems = cartItems
      .map((x) => {
        const offer = getOfferById(x?.offer_id);
        if (!offer) return null;
        return {
          offer_id: x.offer_id,
          offer_cart_reference: offer.cartReferenceUrl,
          quantity: Math.max(1, Number(x.quantity || 1)),
        };
      })
      .filter(Boolean);

    if (!normalizedItems.length) {
      return res.status(400).json({ error: 'Keine gültigen Warenkorb-Artikel gefunden.' });
    }

    const errors = [];
    if (!first_name?.trim()) errors.push('Vorname fehlt.');
    if (!last_name?.trim()) errors.push('Nachname fehlt.');
    if (!validateEmail(email)) errors.push('E-Mail ist ungültig oder fehlt.');
    if (!street?.trim()) errors.push('Strasse fehlt.');
    if (!house_no?.toString().trim()) errors.push('Hausnummer fehlt.');
    if (!postal_code?.trim()) errors.push('PLZ fehlt.');
    if (!city?.trim()) errors.push('Ort fehlt.');
    if (!consent_terms) errors.push('Bitte AGB/Terms bestätigen.');
    if (!consent_privacy) errors.push('Bitte Datenschutz bestätigen.');
    const isGift = !!gift_subscription;
    if (isGift) {
      if (!shipping_first_name?.trim()) errors.push('Vorname (Empfänger) fehlt.');
      if (!shipping_last_name?.trim()) errors.push('Nachname (Empfänger) fehlt.');
      if (!shipping_street?.trim()) errors.push('Strasse (Lieferadresse) fehlt.');
      if (!shipping_house_no?.toString().trim()) errors.push('Hausnummer (Lieferadresse) fehlt.');
      if (!shipping_postal_code?.trim()) errors.push('PLZ (Lieferadresse) fehlt.');
      if (!shipping_city?.trim()) errors.push('Ort (Lieferadresse) fehlt.');
    }

    if (errors.length) return res.status(400).json({ errors });

    const id = crypto.randomUUID();
    db.createOrder({
      id,
      cartItems: normalizedItems,
      customer: {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        street: street.trim(),
        house_no: house_no.toString().trim(),
        postal_code: postal_code.trim(),
        city: city.trim(),
        country: country?.trim() || 'CH',
      },
      consent: {
        consent_terms: !!consent_terms,
        consent_privacy: !!consent_privacy,
      },
      gift_subscription: isGift,
      shipping: isGift
        ? {
            first_name: shipping_first_name.trim(),
            last_name: shipping_last_name.trim(),
            street: shipping_street.trim(),
            house_no: shipping_house_no.toString().trim(),
            postal_code: shipping_postal_code.trim(),
            city: shipping_city.trim(),
            country: shipping_country?.trim() || 'CH',
          }
        : null,
    });

    return res.json({ orderId: id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Fehler beim Erstellen der Bestellung.' });
  }
});

// Payment step: create Stripe checkout session + return URL to redirect.
app.post('/api/orders/:orderId/checkout', express.json(), async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = db.getOrder(orderId);
    if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden.' });

    if (!process.env.STRIPE_PRICE_MAPPING_JSON) {
      return res.status(500).json({
        error: 'STRIPE_PRICE_MAPPING_JSON ist nicht gesetzt. Beispiel siehe README.',
      });
    }

    const mapping = JSON.parse(process.env.STRIPE_PRICE_MAPPING_JSON);
    const orderItems = db.getOrderItems(orderId) || [];
    if (!orderItems.length) {
      return res.status(400).json({ error: 'Keine Bestellpositionen gefunden.' });
    }

    const lineItems = [];
    for (const it of orderItems) {
      const offerPrice = mapping[it.offer_id];
      if (!offerPrice?.stripePriceId) {
        return res.status(500).json({
          error: `Stripe Price-ID fehlt für offer_id="${it.offer_id}".`,
        });
      }
      lineItems.push({
        stripePriceId: offerPrice.stripePriceId,
        quantity: Math.max(1, Number(it.quantity || 1)),
      });
    }

    if (order.stripe_checkout_session_id) {
      // Idempotency: if we already created a session, just redirect to Stripe.
      // Stripe does not allow retrieving the checkout URL later without calling another endpoint;
      // we re-create it (safe) unless you want to store URLs in DB.
    }

    const session = await createCheckoutSession({ lineItems, order });

    // The checkout session id is enough for the webhook; we also store it.
    db.setCheckoutSessionIds({
      orderId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent || null,
    });

    return res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Fehler beim Erstellen der Stripe-Zahlung.' });
  }
});

// Stripe Webhook endpoint (raw body required)
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET ist nicht gesetzt');
      if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY ist nicht gesetzt');

      const stripe = new Stripe(stripeSecretKey);
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      if (db.isStripeEventProcessed(event.id)) {
        return res.status(200).send('ok');
      }

      const session = event?.data?.object;

      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const orderId = session?.metadata?.orderId;
        if (!orderId) {
          db.markStripeEventProcessed(event.id);
          return res.status(200).send('ok');
        }

        db.markStripeEventProcessed(event.id);

        const order = db.getOrder(orderId);
        if (!order) {
          return res.status(200).send('ok');
        }

        db.markPaidAndStorePayment({
          orderId,
          stripe_event_id: event.id,
          currency: session.currency,
          amount_total: session.amount_total,
          stripe_payment_intent_id: session.payment_intent || null,
        });

        const updatedOrder = db.getOrder(orderId);
        const orderItems = db.getOrderItems(orderId) || [];
        try {
          await forwardOrderToRingiere({ order: updatedOrder, orderItems, stripeSession: session });
          db.markForwarded({ orderId });
        } catch (forwardErr) {
          console.error('Ringier Forward fehlgeschlagen:', forwardErr);
          db.markForwardFailed({ orderId, errorMessage: forwardErr?.message || String(forwardErr) });
        }

        return res.status(200).send('ok');
      }

      // Nicht relevante Events ignorieren.
      return res.status(200).send('ok');
    } catch (err) {
      console.error('Stripe Webhook Error:', err?.message || err);
      return res.status(400).send(`Webhook Error: ${err?.message || err}`);
    }
  }
);

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});

