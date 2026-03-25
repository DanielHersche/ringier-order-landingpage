# familleSuisse Ringier Bestellseite (Stripe)

Dieses Projekt ist eine Nachbildung der Landingpage `online-kiosk.ch/famillesuisse` mit einem eigenen Bestell-/Zahlungs-Flow:

1. Info/Landing: Angebot auswählen
2. Formular: Kundendaten erfassen
3. Payment: Stripe Checkout
4. Nach Zahlung: Stripe Webhook => Daten an Ringiere weiterleiten

## Voraussetzungen

- Node.js 18+
- Stripe Test-/Live-Keys
- Stripe Webhook Secret
- Mapping `STRIPE_PRICE_MAPPING_JSON` (Offer-Id -> Stripe Price-ID)
- Ringier-Endpoint für die Weiterleitung (`RINGIERE_FORWARD_URL`)

## Installation

```bash
npm install
```

## Konfiguration

Kopiere `.env.example` zu `.env` und setze:

- `BASE_URL` (wichtig für `success_url`/`cancel_url`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MAPPING_JSON`
- `RINGIERE_FORWARD_URL`

## Start

```bash
npm run dev
```

Öffne dann:

- `http://localhost:3000/`

## Stripe Webhook einrichten

In deinem Stripe Dashboard:

- Endpoint URL: `BASE_URL/api/stripe/webhook`
- Event-Typen (empfohlen):
  - `checkout.session.completed`
  - optional: `checkout.session.async_payment_succeeded`

Signatur wird serverseitig geprüft.

## Wie die Weiterleitung an Ringiere funktioniert

Nach erfolgreicher Zahlung verarbeitet der Webhook:

- `checkout.session.completed` (oder async payment succeeded)
- Order wird in der SQLite DB gespeichert/aktualisiert
- Danach wird per HTTP `POST` an `RINGIERE_FORWARD_URL` weitergeleitet:
  - Offer-Id / Referenz auf das online-kiosk Angebot
  - Kundendaten
  - Stripe Payment-Details (Session/PaymentIntent, amount, currency, payment status)

Wenn der Forward-Call fehlschlägt, bleibt der Status als `forward_failed` und der Fehler wird gespeichert.

## Hinweis zu "genau wie online-kiosk"

Die Landingpage (Texte/Angebotssektionen) ist nachgebaut. Für Pixel-Perfect Layouts wären zusätzlich die Original-CSS Assets/DOM-Struktur erforderlich (die online-kiosk Seite ist Next.js basiert).

