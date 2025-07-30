// Currency codes
export type CountryCode = 'GA' | 'FR' | 'BE' | 'DE' | 'CH' | 'GB' | 'ES' | 'IT' | 'NL'| 'US' | 'CA'| 'CN';
type CurrencyCode = 'XAF' | 'EUR' | 'CNY' | 'USD' | 'CAD' | 'CHF' | 'GBP' | 'BTC';
export type PaymentMethod = 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'CASH' | 'BANK_TRANSFER' | 'ALIPAY' | 'CARD' | 'ACH' | 'PAYPAL' | 'WERO' | 'BITCOIN';
export type ReceivingMethod = 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'CASH' | 'BANK_TRANSFER' | 'ALIPAY' | 'CARD' | 'ACH' | 'VISA_DIRECT' | 'MASTERCARD_SEND' | 'WERO' | 'BITCOIN';
export type TransferDirection = 'GABON_TO_CHINA' | 'FRANCE_TO_GABON' | 'GABON_TO_FRANCE' | 'USA_TO_GABON' | 'GABON_TO_USA' | 'CANADA_TO_GABON' | 'GABON_TO_CANADA' | 'BELGIUM_TO_GABON' | 'GABON_TO_BELGIUM' | 'GERMANY_TO_GABON' | 'GABON_TO_GERMANY' | 'SWITZERLAND_TO_GABON' | 'GABON_TO_SWITZERLAND' | 'UK_TO_GABON' | 'GABON_TO_UK' | 'SPAIN_TO_GABON' | 'GABON_TO_SPAIN' | 'ITALY_TO_GABON' | 'GABON_TO_ITALY' | 'NETHERLANDS_TO_GABON' | 'GABON_TO_NETHERLANDS';

// Country information with proper flag URLs
export const COUNTRIES: Record<CountryCode, { name: string; currency: CurrencyCode; flag: string }> = {
  GA: {
    name: 'Gabon',
    currency: 'XAF',
    flag: 'https://flagcdn.com/ga.svg'
  },
  FR: {
    name: 'France',
    currency: 'EUR',
    flag: 'https://flagcdn.com/fr.svg'
  },
  BE: {
    name: 'Belgique',
    currency: 'EUR',
    flag: 'https://flagcdn.com/be.svg'
  },
  DE: {
    name: 'Allemagne',
    currency: 'EUR',
    flag: 'https://flagcdn.com/de.svg'
  },
  CH: {
    name: 'Suisse',
    currency: 'CHF',
    flag: 'https://flagcdn.com/ch.svg'
  },
  GB: {
    name: 'Royaume-Uni',
    currency: 'GBP',
    flag: 'https://flagcdn.com/gb.svg'
  },
  ES: {
    name: 'Espagne',
    currency: 'EUR',
    flag: 'https://flagcdn.com/es.svg'
  },
  IT: {
    name: 'Italie',
    currency: 'EUR',
    flag: 'https://flagcdn.com/it.svg'
  },
  NL: {
    name: 'Pays-Bas',
    currency: 'EUR',
    flag: 'https://flagcdn.com/nl.svg'
  },
  US: {
    name: 'États-Unis',
    currency: 'USD',
    flag: 'https://flagcdn.com/us.svg'
  },
  CA: {
    name: 'Canada',
    currency: 'CAD',
    flag: 'https://flagcdn.com/ca.svg'
  },
  CN: {
    name: 'Chine',
    currency: 'CNY',
    flag: 'https://flagcdn.com/cn.svg'
  },
};

// Loyalty Points Constants
export const LOYALTY_POINTS = {
  // 1 EUR sent to Gabon = 1 loyalty point
  POINTS_PER_EUR: 1,
  
  // 1 point = 0.01 EUR discount (1% discount per 100 points)
  EUR_VALUE_PER_POINT: 0.01,
  
  // Maximum discount percentage (50%)
  MAX_DISCOUNT_PERCENTAGE: 50,
  
  // Maximum points usable per transaction (5000 points = 50% discount)
  MAX_POINTS_PER_TRANSACTION: 5000,
  
  // Minimum points required to use loyalty discount
  MIN_POINTS_TO_USE: 100
} as const;

// Payment method names
const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  AIRTEL_MONEY: 'Airtel Money',
  MOOV_MONEY: 'Moov Money',
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  WERO: 'Wero',
  ALIPAY: 'Alipay',
  CARD: 'Carte bancaire',
  ACH: 'Virement ACH',
  PAYPAL: 'PayPal',
  BITCOIN: 'Bitcoin'
};

// Receiving method names
const RECEIVING_METHODS: Record<ReceivingMethod, string> = {
  AIRTEL_MONEY: 'Airtel Money',
  MOOV_MONEY: 'Moov Money',
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  ALIPAY: 'Alipay',
  CARD: 'Carte bancaire',
  ACH: 'Dépôt ACH',
  VISA_DIRECT: 'Visa Direct',
  MASTERCARD_SEND: 'Mastercard Send',
  WERO: 'Wero',
  BITCOIN: 'Bitcoin'
};