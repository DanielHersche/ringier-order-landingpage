async function forwardOrderToRingiere({ order, orderItems, stripeSession }) {
  const endpoint = process.env.RINGIERE_FORWARD_URL;
  if (!endpoint) {
    throw new Error('RINGIERE_FORWARD_URL ist nicht gesetzt');
  }

  const payload = {
    // Order/Customer
    orderId: order.id,
    offerId: order.offer_id,
    offerCartReferenceUrl: order.offer_cart_reference,
    items: Array.isArray(orderItems)
      ? orderItems.map((i) => ({
          offerId: i.offer_id,
          offerCartReferenceUrl: i.offer_cart_reference,
          quantity: i.quantity,
        }))
      : [],

    customer: {
      firstName: order.first_name,
      lastName: order.last_name,
      email: order.email,
      phone: order.phone,
      address: {
        street: order.street,
        houseNo: order.house_no,
        postalCode: order.postal_code,
        city: order.city,
        country: order.country,
      },
      consent: {
        termsAccepted: !!order.consent_terms,
        privacyAccepted: !!order.consent_privacy,
      },
    },

    giftSubscription: !!order.gift_subscription,
    shippingAddress: order.gift_subscription
      ? {
          firstName: order.shipping_first_name,
          lastName: order.shipping_last_name,
          address: {
            street: order.shipping_street,
            houseNo: order.shipping_house_no,
            postalCode: order.shipping_postal_code,
            city: order.shipping_city,
            country: order.shipping_country,
          },
        }
      : null,

    // Payment info
    payment: {
      status: stripeSession?.payment_status || stripeSession?.status || 'unknown',
      stripe: {
        checkoutSessionId: order.stripe_checkout_session_id || stripeSession?.id,
        paymentIntentId: order.stripe_payment_intent_id || stripeSession?.payment_intent || null,
      },
      currency: order.currency || stripeSession?.currency,
      amountTotal: order.amount_total ?? stripeSession?.amount_total ?? null,
      receiptUrl: stripeSession?.receipt_url ?? null,
    },

    // Traceability / idempotency
    stripe: {
      checkoutSessionId: order.stripe_checkout_session_id || stripeSession?.id,
      eventId: order.stripe_event_id || stripeSession?._eventId,
    },
    source: 'familleSuisse-ringier-forward',
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  if (process.env.RINGIERE_FORWARD_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.RINGIERE_FORWARD_API_KEY}`;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Ringier Forward fehlgeschlagen (${res.status}): ${text.slice(0, 1000)}`);
  }

  // Optional: response parse
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

module.exports = { forwardOrderToRingiere };

