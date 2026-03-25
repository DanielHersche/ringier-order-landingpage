const { getOfferById } = require('./offers');

const CART_COOKIE_NAME = 'cartItems';

function parseCartItemsCookie(req) {
  const raw = req.cookies?.[CART_COOKIE_NAME];
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Normalisiere: {offer_id, quantity}
    const normalized = parsed
      .filter((x) => x && typeof x.offer_id === 'string')
      .map((x) => ({
        offer_id: x.offer_id,
        // Regel: jedes Abo nur einmal einfügen => quantity maximal 1
        quantity: 1,
      }));

    // Dedupe by offer_id (falls alte Cookies Duplikate enthalten)
    const map = new Map();
    for (const item of normalized) {
      if (!map.has(item.offer_id)) map.set(item.offer_id, item);
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function upsertCartItem(items, offerId, qtyToAdd) {
  // Regel: jedes Abo nur einmal => immer quantity=1, und doppelte Einträge werden nicht addiert.
  const qty = 1;
  const idx = items.findIndex((x) => x.offer_id === offerId);
  if (idx >= 0) {
    items[idx].quantity = 1;
    // Doppelt hinzugefügt -> keine Änderung.
    return { items, alreadyPresent: true };
  }
  items.push({ offer_id: offerId, quantity: qty });
  return { items, alreadyPresent: false };
}

function addToCartCookie({ req, res, offerId, quantity }) {
  const offer = getOfferById(offerId);
  if (!offer) return { ok: false, reason: 'Ungültiges Angebot' };

  const items = parseCartItemsCookie(req);
  const nextResult = upsertCartItem(items, offerId, quantity || 1);
  const next = nextResult.items;
  const alreadyPresent = !!nextResult.alreadyPresent;

  // Cookie: einfache Persistenz; max-age anpassen falls nötig.
  res.cookie(CART_COOKIE_NAME, JSON.stringify(next), {
    httpOnly: false, // wir lesen optional clientseitig nicht; aber ok für simple Debugging
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 Tage
  });

  return { ok: true, items: next, alreadyPresent };
}

function setCartCookie({ res, items }) {
  res.cookie(CART_COOKIE_NAME, JSON.stringify(items), {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

module.exports = {
  CART_COOKIE_NAME,
  parseCartItemsCookie,
  addToCartCookie,
  removeFromCartCookie,
  setCartCookie,
};

function removeFromCartCookie({ req, res, offerId }) {
  if (!offerId) return { ok: false, reason: 'offerId fehlt' };
  const items = parseCartItemsCookie(req);
  const next = items.filter((x) => x.offer_id !== offerId);
  res.cookie(CART_COOKIE_NAME, JSON.stringify(next), {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
  return { ok: true, items: next, removed: next.length !== items.length };
}

