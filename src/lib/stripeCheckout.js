const Stripe = require('stripe');

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY ist nicht gesetzt');
  // Stripe nutzt eine feste API-Version; wir lassen sie hier implizit, um Kompatibilität zu wahren.
  return new Stripe(secretKey);
}

async function createCheckoutSession({ lineItems, order }) {
  const stripe = getStripe();
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error('lineItems ist leer');
  }

  let mode = null;
  // Stripe Checkout erlaubt nur einheitliche mode (payment vs subscription) pro Session.
  for (const li of lineItems) {
    const price = await stripe.prices.retrieve(li.stripePriceId);
    const itemMode = price.recurring ? 'subscription' : 'payment';
    if (!mode) mode = itemMode;
    if (mode !== itemMode) {
      throw new Error('Mischung aus subscription- und payment-preisen ist aktuell nicht unterstützt.');
    }
  }

  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) throw new Error('BASE_URL ist nicht gesetzt (z.B. https://deine-domain.ch)');

  const successUrl = `${baseUrl}/success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/form`;

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: lineItems.map((li) => ({
      price: li.stripePriceId,
      quantity: Math.max(1, Number(li.quantity || 1)),
    })),
    customer_email: order.email,
    client_reference_id: order.id,
    locale: 'de',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      orderId: order.id,
    },
  });

  return session;
}

module.exports = { createCheckoutSession };

