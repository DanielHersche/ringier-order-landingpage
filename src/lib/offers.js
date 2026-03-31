/**
 * Angebotskatalog (Landing-Page) + Zuordnung zu den Ringier/online-kiosk Angeboten.
 * Die Stripe-Price-Ids werden später per ENV oder per Mapping ergänzt.
 */
const offers = {
  beobachter: {
    anchorId: 'be',
    name: 'Beobachter',
    headlineHtml: '<strong>Jahresabo für nur CHF 129.– statt CHF 201.60*</strong>',
    bullets: [
      '24 Print-Ausgaben',
      'Kostenlose Rechtsberatung per Telefon und E-Mail',
      'Exklusive Preisrabatte auf Ratgeber-Bücher',
      'BONUS: E-Paper, Rechtsratgeber, Musterbriefe, App, Webinar, Podcast – digitale Vorteile inklusive',
    ],
    cartReferenceUrl: 'https://www.online-kiosk.ch/cart/30229429',
    cartLabel: '30229429',
    priceDisplay: 'CHF 129.–',
    priceCents: 12900,
    imageSrc: '/images/beobachter.png',
    imageAlt: 'Magazin | Beobachter',
  },
  gluecksPost: {
    anchorId: 'gp',
    name: 'GlücksPost',
    headlineHtml: 'Halbjahresabo für nur CHF 129.– statt CHF 139.–*',
    bullets: [
      '26 gedruckte Ausgaben der GlücksPost',
      'kostenloser Zugriff per App auf das E-Paper',
      'Exklusive Konditionen beim Kauf von Beobachter- und LandLiebe-Büchern',
      'wöchentliche Programmzeitschrift TVtäglich',
    ],
    cartReferenceUrl: 'https://www.online-kiosk.ch/cart/30229433',
    cartLabel: '30229433',
    priceDisplay: 'CHF 129.–',
    priceCents: 12900,
    imageSrc: '/images/gluecksPost.png',
    imageAlt: 'Magazin | GlücksPost',
  },
  landLiebe: {
    anchorId: 'lal',
    name: 'Schweizer LandLiebe',
    headlineHtml: '2-Jahresabo für nur CHF 129.– statt CHF 169.–*',
    bullets: [
      '13 Ausgaben inkl. einer umfangreichen Sommerferien- und Weihnachtsnummer direkt in Ihren Briefkasten',
      'Exklusive Preisrabatte auf alle LandLiebe-Bücher',
      'CHF 30.– Vergünstigung auf unsere beliebten LandLiebe-Kurse im LandLiebe-Haus',
      'Gratis E-Paper & App',
    ],
    cartReferenceUrl: 'https://www.online-kiosk.ch/cart/30228714',
    cartLabel: '30228714',
    priceDisplay: 'CHF 129.–',
    priceCents: 12900,
    imageSrc: '/images/landLiebe.png',
    imageAlt: 'Magazin | Schweizer LandLiebe',
  },
  schweizerIllustrierte: {
    anchorId: 'si',
    name: 'Schweizer Illustrierte',
    headlineHtml: 'Halbjahresabo für nur CHF 129.– statt CHF 153,40*',
    bullets: [
      '26 Ausgaben der Schweizer Illustrierten bequem nach Hause geliefert',
      'kostenloser Zugriff auf das E-Paper',
      'regelmässig spannende Sonderhefte',
      'Exklusive Konditionen beim Kauf von Beobachter- und LandLiebe-Büchern',
      'wöchentlich die Programmzeitschrift TVtäglich',
      'viele zusätzliche Geschichten & Services online',
    ],
    cartReferenceUrl: 'https://www.online-kiosk.ch/cart/30229435',
    cartLabel: '30229435',
    priceDisplay: 'CHF 129.–',
    priceCents: 12900,
    imageSrc: '/images/schweizerIllustrierte.png',
    imageAlt: 'Magazin | Schweizer Illustrierte',
  },
  tele: {
    anchorId: 'te',
    name: 'TELE',
    headlineHtml: 'Halbjahresabo für CHF 129.– statt CHF 179.–*',
    bullets: [
      '26 gedruckte Ausgaben von TELE',
      'Mit täglich über 100 Sendern',
      'Tipps zu den besten Netflix & Co. Inhalten',
      'TV-Tagestipps der TELE-Redaktion',
      'grosser Magazinteil mit Rätseln',
      'TV-Newsletter mit aktuellen Programmänderungen',
      'Exklusive Konditionen beim Kauf von Beobachter- und LandLiebe-Büchern',
    ],
    cartReferenceUrl: 'https://www.online-kiosk.ch/cart/30229441',
    cartLabel: '30229441',
    priceDisplay: 'CHF 129.–',
    priceCents: 12900,
    imageSrc: '/images/tele.png',
    imageAlt: 'Magazin | TELE',
  },
  blick: {
    anchorId: 'bl',
    name: 'Blick',
    headlineHtml: '<strong>3-Monatsabo für nur CHF 129.– statt CHF 228.–</strong>*',
    bullets: [
      'Mo.-Sa. das aktuelle Tagesgeschehen im Briefkasten',
      'Einmaliger Preisvorteil gegenüber dem Einzelverkauf',
      'Inkl. Digitalabo Blick+',
      'Gratis-Zugriff auf das E-Paper',
      'Gratis Sonderhefte',
      'Inkl. Versandkosten',
      'Exklusive Konditionen beim Kauf von Beobachter- und LandLiebe-Büchern',
    ],
    cartReferenceUrl: 'https://www.online-kiosk.ch/cart/30229431',
    cartLabel: '30229431',
    priceDisplay: 'CHF 129.–',
    priceCents: 12900,
    imageSrc: '/images/blick.png',
    imageAlt: 'Magazin | Blick',
  },
  sonntagsBlick: {
    anchorId: 'sbl',
    name: 'SonntagsBlick',
    headlineHtml: '<strong>Halbjahresabo für nur CHF 129.– statt CHF 143.–</strong>*',
    bullets: [
      'Jeden Sonntag aktuelle und relevante Themen im Briefkasten',
      'Einmaliger Preisvorteil gegenüber dem Einzelverkauf',
      'Gratis-Zugriff auf das E-Paper',
      'Gratis Sonderhefte',
      'Inkl. Versandkosten',
      'Exklusive Konditionen beim Kauf von Beobachter- und LandLiebe-Büchern',
    ],
    cartReferenceUrl: 'https://www.online-kiosk.ch/cart/30229439',
    cartLabel: '30229439',
    priceDisplay: 'CHF 129.–',
    priceCents: 12900,
    imageSrc: '/images/sonntagsBlick.png',
    imageAlt: 'Magazin | SonntagsBlick',
  },
  lIllustrE: {
    anchorId: 'ill',
    name: "L'Illustré",
    headlineHtml: '6 mois pour <strong>CHF 129.– au lieu de CHF 143.–</strong>*',
    bullets: [
      'Abonnement de 6 mois soit 26 numéros',
      "Accès illimité à l’e-magazine et à tous les contenus du site sur www.illustre.ch",
      "Accès gratuit à l’app e-magazine L'illustré",
      'Le contenu de TV8 (88 chaînes)',
    ],
    cartReferenceUrl: 'https://www.online-kiosk.ch/cart/30229437',
    cartLabel: '30229437',
    priceDisplay: 'CHF 129.–',
    priceCents: 12900,
    imageSrc: "/images/lIllustrE.png",
    imageAlt: "Magazin | L'Illustré",
  },
};

function getOfferById(offerId) {
  return offers[offerId] || null;
}

function getAllOffers() {
  return Object.entries(offers).map(([offerId, offer]) => ({ offerId, ...offer }));
}

module.exports = {
  offers,
  getOfferById,
  getAllOffers,
};

