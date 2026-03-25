const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'orders.sqlite');
const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL,
    offer_cart_reference TEXT,

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,

    street TEXT NOT NULL,
    house_no TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'CH',

    consent_terms INTEGER NOT NULL DEFAULT 0,
    consent_privacy INTEGER NOT NULL DEFAULT 0,

    gift_subscription INTEGER NOT NULL DEFAULT 0,

    shipping_first_name TEXT,
    shipping_last_name TEXT,
    shipping_street TEXT,
    shipping_house_no TEXT,
    shipping_postal_code TEXT,
    shipping_city TEXT,
    shipping_country TEXT NOT NULL DEFAULT 'CH',

    status TEXT NOT NULL DEFAULT 'created',
    stripe_checkout_session_id TEXT,
    stripe_payment_intent_id TEXT,
    stripe_event_id TEXT,

    currency TEXT,
    amount_total INTEGER,

    forwarded_at TEXT,
    forward_error TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    offer_cart_reference TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stripe_processed_events (
    stripe_event_id TEXT PRIMARY KEY,
    received_at TEXT NOT NULL
  );
`);

function ensureOrderColumns() {
  const columns = db
    .prepare(`PRAGMA table_info(orders)`)
    .all()
    .map((c) => c.name);

  const desired = [
    { name: 'gift_subscription', sql: "INTEGER NOT NULL DEFAULT 0" },
    { name: 'shipping_first_name', sql: 'TEXT' },
    { name: 'shipping_last_name', sql: 'TEXT' },
    { name: 'shipping_street', sql: 'TEXT' },
    { name: 'shipping_house_no', sql: 'TEXT' },
    { name: 'shipping_postal_code', sql: 'TEXT' },
    { name: 'shipping_city', sql: 'TEXT' },
    { name: 'shipping_country', sql: "TEXT NOT NULL DEFAULT 'CH'" },
  ];

  for (const col of desired) {
    if (columns.includes(col.name)) continue;
    db.exec(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.sql}`);
  }
}

ensureOrderColumns();

function nowIso() {
  return new Date().toISOString();
}

function createOrder({ id, cartItems, customer, consent, gift_subscription, shipping }) {
  const createdAt = nowIso();
  const firstItem = cartItems?.[0];
  if (!firstItem?.offer_id) {
    throw new Error('cartItems ist leer oder ungültig');
  }

  const stmt = db.prepare(
    `
      INSERT INTO orders (
        id, offer_id, offer_cart_reference,
        first_name, last_name, email, phone,
        street, house_no, postal_code, city, country,
        consent_terms, consent_privacy,
        gift_subscription,
        shipping_first_name, shipping_last_name,
        shipping_street, shipping_house_no,
        shipping_postal_code, shipping_city, shipping_country,
        status, created_at, updated_at
      ) VALUES (
        @id, @offer_id, @offer_cart_reference,
        @first_name, @last_name, @email, @phone,
        @street, @house_no, @postal_code, @city, @country,
        @consent_terms, @consent_privacy,
        @gift_subscription,
        @shipping_first_name, @shipping_last_name,
        @shipping_street, @shipping_house_no,
        @shipping_postal_code, @shipping_city, @shipping_country,
        'created', @created_at, @updated_at
      )
    `
  );

  const offer_id = firstItem.offer_id;
  const offer_cart_reference = firstItem.offer_cart_reference || null;

  stmt.run({
    id,
    offer_id,
    offer_cart_reference,
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email,
    phone: customer.phone || null,
    street: customer.street,
    house_no: customer.house_no,
    postal_code: customer.postal_code,
    city: customer.city,
    country: customer.country || 'CH',
    consent_terms: consent.consent_terms ? 1 : 0,
    consent_privacy: consent.consent_privacy ? 1 : 0,
    gift_subscription: gift_subscription ? 1 : 0,
    shipping_first_name: shipping?.first_name || null,
    shipping_last_name: shipping?.last_name || null,
    shipping_street: shipping?.street || null,
    shipping_house_no: shipping?.house_no || null,
    shipping_postal_code: shipping?.postal_code || null,
    shipping_city: shipping?.city || null,
    shipping_country: shipping?.country || 'CH',
    created_at: createdAt,
    updated_at: createdAt,
  });

  // Order items
  const itemStmt = db.prepare(
    `
      INSERT INTO order_items (
        order_id, offer_id, offer_cart_reference,
        quantity, created_at, updated_at
      ) VALUES (
        @order_id, @offer_id, @offer_cart_reference,
        @quantity, @created_at, @updated_at
      )
    `
  );

  const updatedAt = createdAt;
  for (const item of cartItems) {
    itemStmt.run({
      order_id: id,
      offer_id: item.offer_id,
      offer_cart_reference: item.offer_cart_reference || null,
      quantity: Math.max(1, Number(item.quantity || 1)),
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }
}

function getOrder(id) {
  return db
    .prepare(`SELECT * FROM orders WHERE id = ?`)
    .get(id) || null;
}

function getOrderItems(orderId) {
  return db
    .prepare(
      `SELECT offer_id, offer_cart_reference, quantity FROM order_items WHERE order_id = ? ORDER BY id ASC`
    )
    .all(orderId);
}

function setCheckoutSessionIds({ orderId, stripe_checkout_session_id, stripe_payment_intent_id }) {
  const updatedAt = nowIso();
  db.prepare(
    `
      UPDATE orders
      SET stripe_checkout_session_id = @stripe_checkout_session_id,
          stripe_payment_intent_id = @stripe_payment_intent_id,
          status = CASE WHEN status = 'created' THEN 'checkout_created' ELSE status END,
          updated_at = @updated_at
      WHERE id = @id
    `
  ).run({
    id: orderId,
    stripe_checkout_session_id,
    stripe_payment_intent_id: stripe_payment_intent_id || null,
    updated_at: updatedAt,
  });
}

function markPaidAndStorePayment({ orderId, stripe_event_id, currency, amount_total, stripe_payment_intent_id }) {
  const updatedAt = nowIso();
  db.prepare(
    `
      UPDATE orders
      SET status = CASE WHEN status IN ('created','checkout_created','forward_failed') THEN 'paid' ELSE status END,
          stripe_event_id = @stripe_event_id,
          stripe_payment_intent_id = COALESCE(@stripe_payment_intent_id, stripe_payment_intent_id),
          currency = @currency,
          amount_total = @amount_total,
          updated_at = @updated_at
      WHERE id = @id
    `
  ).run({
    id: orderId,
    stripe_event_id,
    currency: currency || null,
    amount_total: typeof amount_total === 'number' ? amount_total : null,
    stripe_payment_intent_id: stripe_payment_intent_id || null,
    updated_at: updatedAt,
  });
}

function isStripeEventProcessed(stripeEventId) {
  const row = db
    .prepare(`SELECT stripe_event_id FROM stripe_processed_events WHERE stripe_event_id = ?`)
    .get(stripeEventId);
  return !!row;
}

function markStripeEventProcessed(stripeEventId) {
  const receivedAt = nowIso();
  db.prepare(
    `INSERT INTO stripe_processed_events (stripe_event_id, received_at) VALUES (?, ?)`
  ).run(stripeEventId, receivedAt);
}

function markForwarded({ orderId }) {
  const updatedAt = nowIso();
  db.prepare(
    `
      UPDATE orders
      SET status = 'forwarded',
          forwarded_at = @forwarded_at,
          forward_error = NULL,
          updated_at = @updated_at
      WHERE id = @id
    `
  ).run({
    id: orderId,
    forwarded_at: updatedAt,
    updated_at: updatedAt,
  });
}

function markForwardFailed({ orderId, errorMessage }) {
  const updatedAt = nowIso();
  db.prepare(
    `
      UPDATE orders
      SET status = 'forward_failed',
          forward_error = @error_message,
          updated_at = @updated_at
      WHERE id = @id
    `
  ).run({
    id: orderId,
    error_message: errorMessage?.slice(0, 2000) || null,
    updated_at: updatedAt,
  });
}

module.exports = {
  createOrder,
  getOrder,
  getOrderItems,
  setCheckoutSessionIds,
  markPaidAndStorePayment,
  isStripeEventProcessed,
  markStripeEventProcessed,
  markForwarded,
  markForwardFailed,
};

