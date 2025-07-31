import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pdsiyzpqzqwkqytsitxe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkc2l5enBxenF3a3F5dHNpdHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNjA2NTAsImV4cCI6MjA1MzgzNjY1MH0.--I0QRj8RZh7jTV9f5m_Kk66XiCVtToOZJKAVP2ZqBc';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please connect to Supabase using the button in the top right corner.');
}

// Create Supabase client with proper configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'kundapay.supabase.auth.token',
    flowType: 'pkce'
  }
});

// Add a debug function to check connection
const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};

// Default values for when data can't be fetched
const DEFAULT_MAX_AMOUNT = { value: 500, currency: 'EUR' };

// Default exchange rates with exact values
const DEFAULT_EXCHANGE_RATES = [
  // EUR <-> XAF (fixed rate)
  { from_currency: 'EUR', to_currency: 'XAF', rate: 655.96 },
  { from_currency: 'XAF', to_currency: 'EUR', rate: 0.001524 },  // 1/655.96

  // EUR <-> XOF (Sénégal - fixed rate, same as XAF)
  { from_currency: 'EUR', to_currency: 'XOF', rate: 655.96 },
  { from_currency: 'XOF', to_currency: 'EUR', rate: 0.001524 },  // 1/655.96

  // EUR <-> MAD (Maroc - floating rate)
  { from_currency: 'EUR', to_currency: 'MAD', rate: 10.75 },
  { from_currency: 'MAD', to_currency: 'EUR', rate: 0.093023 },  // 1/10.75

  // XAF <-> XOF (parity via EUR)
  { from_currency: 'XAF', to_currency: 'XOF', rate: 1.0000 },
  { from_currency: 'XOF', to_currency: 'XAF', rate: 1.0000 },

  // XAF <-> MAD (via EUR)
  { from_currency: 'XAF', to_currency: 'MAD', rate: 0.016393 },  // (1/655.96) * 10.75
  { from_currency: 'MAD', to_currency: 'XAF', rate: 61.01953 },   // (1/10.75) * 655.96

  // XOF <-> MAD (via EUR)
  { from_currency: 'XOF', to_currency: 'MAD', rate: 0.016393 },  // (1/655.96) * 10.75
  { from_currency: 'MAD', to_currency: 'XAF', rate: 61.01953 },   // (1/10.75) * 655.96

  // EUR <-> CNY
  { from_currency: 'EUR', to_currency: 'CNY', rate: 7.5099 },
  { from_currency: 'CNY', to_currency: 'EUR', rate: 0.133157 },  // 1/7.5099

  // XAF <-> CNY
  { from_currency: 'XAF', to_currency: 'CNY', rate: 0.011445 },  // 7.5099/655.96
  { from_currency: 'CNY', to_currency: 'XAF', rate: 87.34 }      // 655.96/7.5099
];

// Default transfer fees with exact values
export const DEFAULT_TRANSFER_FEES = [
  // France -> Gabon (tous à 0.6%)
  { from_country: 'FR', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'FR', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'FR', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'FR', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'FR', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'FR', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'FR', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'FR', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'CASH',         fee_percentage: 0.006 },

  // Belgique → Gabon
  { from_country: 'BE', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'BE', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'BE', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'BE', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'BE', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'BE', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'BE', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'BE', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'CASH',         fee_percentage: 0.006 },

  // Allemagne → Gabon
  { from_country: 'DE', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'DE', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'DE', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'DE', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'DE', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'DE', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'DE', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'DE', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'CASH',         fee_percentage: 0.006 },

  // Suisse → Gabon
  { from_country: 'CH', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.008 },
  { from_country: 'CH', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'CASH',         fee_percentage: 0.008 },
  { from_country: 'CH', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.008 },
  { from_country: 'CH', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'CASH',         fee_percentage: 0.008 },
  { from_country: 'CH', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.008 },
  { from_country: 'CH', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'CASH',         fee_percentage: 0.008 },
  { from_country: 'CH', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.008 },
  { from_country: 'CH', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'CASH',         fee_percentage: 0.008 },

  // Royaume-Uni → Gabon
  { from_country: 'GB', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.008 },
  { from_country: 'GB', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'CASH',         fee_percentage: 0.008 },
  { from_country: 'GB', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.008 },
  { from_country: 'GB', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'CASH',         fee_percentage: 0.008 },
  { from_country: 'GB', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.008 },
  { from_country: 'GB', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'CASH',         fee_percentage: 0.008 },
  { from_country: 'GB', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.008 },
  { from_country: 'GB', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'CASH',         fee_percentage: 0.008 },

  // Espagne → Gabon
  { from_country: 'ES', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'ES', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'ES', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'ES', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'ES', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'ES', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'ES', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'ES', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'CASH',         fee_percentage: 0.006 },

  // Italie → Gabon
  { from_country: 'IT', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'IT', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'IT', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'IT', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'IT', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'IT', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'IT', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'IT', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'CASH',         fee_percentage: 0.006 },

  // Pays-Bas → Gabon
  { from_country: 'NL', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'NL', to_country: 'GA', payment_method: 'BANK_TRANSFER', receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'NL', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'NL', to_country: 'GA', payment_method: 'WERO',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'NL', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'NL', to_country: 'GA', payment_method: 'CARD',          receiving_method: 'CASH',         fee_percentage: 0.006 },
  { from_country: 'NL', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.006 },
  { from_country: 'NL', to_country: 'GA', payment_method: 'PAYPAL',        receiving_method: 'CASH',         fee_percentage: 0.006 },


  // France → Maroc
  { from_country: 'FR', to_country: 'MA', payment_method: 'CARD',          receiving_method: 'ORANGE_MONEY', fee_percentage: 0.009 },
  { from_country: 'FR', to_country: 'MA', payment_method: 'BANK_TRANSFER', receiving_method: 'ORANGE_MONEY', fee_percentage: 0.009 },
  { from_country: 'FR', to_country: 'MA', payment_method: 'PAYPAL',        receiving_method: 'ORANGE_MONEY', fee_percentage: 0.009 },
  { from_country: 'FR', to_country: 'MA', payment_method: 'WERO',          receiving_method: 'ORANGE_MONEY', fee_percentage: 0.009 },

  // France → Sénégal
  { from_country: 'FR', to_country: 'SN', payment_method: 'CARD',          receiving_method: 'WAVE',         fee_percentage: 0.009 },
  { from_country: 'FR', to_country: 'SN', payment_method: 'BANK_TRANSFER', receiving_method: 'WAVE',         fee_percentage: 0.009 },
  { from_country: 'FR', to_country: 'SN', payment_method: 'PAYPAL',        receiving_method: 'WAVE',         fee_percentage: 0.009 },
  { from_country: 'FR', to_country: 'SN', payment_method: 'WERO',          receiving_method: 'WAVE',         fee_percentage: 0.009 },

  // Gabon → Maroc
  { from_country: 'GA', to_country: 'MA', payment_method: 'AIRTEL_MONEY',  receiving_method: 'ORANGE_MONEY', fee_percentage: 0.09 },
  { from_country: 'GA', to_country: 'MA', payment_method: 'MOOV_MONEY',    receiving_method: 'ORANGE_MONEY', fee_percentage: 0.09 },
  { from_country: 'GA', to_country: 'MA', payment_method: 'CASH',          receiving_method: 'ORANGE_MONEY', fee_percentage: 0.09 },

  // Maroc → Gabon
  { from_country: 'MA', to_country: 'GA', payment_method: 'ORANGE_MONEY',  receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.09 },
  { from_country: 'MA', to_country: 'GA', payment_method: 'ORANGE_MONEY',  receiving_method: 'MOOV_MONEY',   fee_percentage: 0.09 },
  { from_country: 'MA', to_country: 'GA', payment_method: 'ORANGE_MONEY',  receiving_method: 'CASH',         fee_percentage: 0.09 },

  // Maroc → Sénégal
  { from_country: 'MA', to_country: 'SN', payment_method: 'ORANGE_MONEY',  receiving_method: 'WAVE',         fee_percentage: 0.09 },

  // Sénégal → Maroc
  { from_country: 'SN', to_country: 'MA', payment_method: 'WAVE',          receiving_method: 'ORANGE_MONEY', fee_percentage: 0.09 },

  // Maroc → France (direction de retour)
  { from_country: 'MA', to_country: 'FR', payment_method: 'ORANGE_MONEY',  receiving_method: 'BANK_TRANSFER', fee_percentage: 0.09 },
  { from_country: 'MA', to_country: 'FR', payment_method: 'ORANGE_MONEY',  receiving_method: 'WERO',          fee_percentage: 0.09 },
  { from_country: 'MA', to_country: 'FR', payment_method: 'ORANGE_MONEY',  receiving_method: 'PAYPAL',        fee_percentage: 0.09 },

  // Sénégal → France (direction de retour)
  { from_country: 'SN', to_country: 'FR', payment_method: 'WAVE',          receiving_method: 'BANK_TRANSFER', fee_percentage: 0.09 },
  { from_country: 'SN', to_country: 'FR', payment_method: 'WAVE',          receiving_method: 'WERO',          fee_percentage: 0.09 },
  { from_country: 'SN', to_country: 'FR', payment_method: 'WAVE',          receiving_method: 'PAYPAL',        fee_percentage: 0.09 },

  // Gabon -> France
  { from_country: 'GA', to_country: 'FR', payment_method: 'AIRTEL_MONEY', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'FR', payment_method: 'CASH', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'FR', payment_method: 'AIRTEL_MONEY', receiving_method: 'WERO', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'FR', payment_method: 'CASH', receiving_method: 'WERO', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'FR', payment_method: 'AIRTEL_MONEY', receiving_method: 'PAYPAL', fee_percentage: 0.08 },

  // Gabon → Belgique
  { from_country: 'GA', to_country: 'BE', payment_method: 'AIRTEL_MONEY', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'BE', payment_method: 'CASH',         receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'BE', payment_method: 'AIRTEL_MONEY', receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'BE', payment_method: 'CASH',         receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'BE', payment_method: 'AIRTEL_MONEY', receiving_method: 'PAYPAL',        fee_percentage: 0.08 },

  // Gabon → Allemagne
  { from_country: 'GA', to_country: 'DE', payment_method: 'AIRTEL_MONEY', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'DE', payment_method: 'CASH',         receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'DE', payment_method: 'AIRTEL_MONEY', receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'DE', payment_method: 'CASH',         receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'DE', payment_method: 'AIRTEL_MONEY', receiving_method: 'PAYPAL',        fee_percentage: 0.08 },

  // Gabon → Suisse
  { from_country: 'GA', to_country: 'CH', payment_method: 'AIRTEL_MONEY', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'CH', payment_method: 'CASH',         receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'CH', payment_method: 'AIRTEL_MONEY', receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'CH', payment_method: 'CASH',         receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'CH', payment_method: 'AIRTEL_MONEY', receiving_method: 'PAYPAL',        fee_percentage: 0.08 },

  // Gabon → Royaume-Uni
  { from_country: 'GA', to_country: 'GB', payment_method: 'AIRTEL_MONEY', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'GB', payment_method: 'CASH',         receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'GB', payment_method: 'AIRTEL_MONEY', receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'GB', payment_method: 'CASH',         receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'GB', payment_method: 'AIRTEL_MONEY', receiving_method: 'PAYPAL',        fee_percentage: 0.08 },

  // Gabon → Espagne
  { from_country: 'GA', to_country: 'ES', payment_method: 'AIRTEL_MONEY', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'ES', payment_method: 'CASH',         receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'ES', payment_method: 'AIRTEL_MONEY', receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'ES', payment_method: 'CASH',         receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'ES', payment_method: 'AIRTEL_MONEY', receiving_method: 'PAYPAL',        fee_percentage: 0.08 },

  // Gabon → Italie
  { from_country: 'GA', to_country: 'IT', payment_method: 'AIRTEL_MONEY', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'IT', payment_method: 'CASH',         receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'IT', payment_method: 'AIRTEL_MONEY', receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'IT', payment_method: 'CASH',         receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'IT', payment_method: 'AIRTEL_MONEY', receiving_method: 'PAYPAL',        fee_percentage: 0.08 },

  // Gabon → Pays-Bas
  { from_country: 'GA', to_country: 'NL', payment_method: 'AIRTEL_MONEY', receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'NL', payment_method: 'CASH',         receiving_method: 'BANK_TRANSFER', fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'NL', payment_method: 'AIRTEL_MONEY', receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'NL', payment_method: 'CASH',         receiving_method: 'WERO',          fee_percentage: 0.08 },
  { from_country: 'GA', to_country: 'NL', payment_method: 'AIRTEL_MONEY', receiving_method: 'PAYPAL',        fee_percentage: 0.08 },


  // Gabon → Sénégal
  { from_country: 'GA', to_country: 'SN', payment_method: 'AIRTEL_MONEY',  receiving_method: 'WAVE',         fee_percentage: 0.09 },
  { from_country: 'GA', to_country: 'SN', payment_method: 'MOOV_MONEY',    receiving_method: 'WAVE',         fee_percentage: 0.09 },
  { from_country: 'GA', to_country: 'SN', payment_method: 'CASH',          receiving_method: 'WAVE',         fee_percentage: 0.09 },

  // Sénégal → Gabon
  { from_country: 'SN', to_country: 'GA', payment_method: 'WAVE',          receiving_method: 'AIRTEL_MONEY', fee_percentage: 0.09 },
  { from_country: 'SN', to_country: 'GA', payment_method: 'WAVE',          receiving_method: 'MOOV_MONEY',   fee_percentage: 0.09 },
  { from_country: 'SN', to_country: 'GA', payment_method: 'WAVE',          receiving_method: 'CASH',         fee_percentage: 0.09 },

  // Gabon -> Chine
  { from_country: 'GA', to_country: 'CN', payment_method: 'AIRTEL_MONEY', receiving_method: 'ALIPAY', fee_percentage: 0.085 },
  { from_country: 'GA', to_country: 'CN', payment_method: 'CASH', receiving_method: 'ALIPAY', fee_percentage: 0.075 }
];

// Validate promo code
export async function validate_promo_code(code: string, direction: string, userId?: string | null) {
  try {
    // Call the RPC function with the correct parameters
    const params: any = {
      code_text: code,
      transfer_direction: direction
    };
    
    // Only include user_id if it's provided
    if (userId) {
      params.user_id = userId;
    }
    
    const { data, error } = await supabase.rpc('validate_promo_code', params);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error validating promo code:', err);
    return { data: null, error: err };
  }
}

// Fonction pour vérifier les plafonds de transfert hebdomadaires (uniquement depuis le Gabon)
export async function checkWeeklyTransferLimit(
  senderUserId: string,
  beneficiaryFirstName: string,
  beneficiaryLastName: string,
  beneficiaryEmail: string,
  beneficiaryPhone: string | null,
  transferAmount: number,
  transferCurrency: string
): Promise<{ allowed: boolean; message: string; details?: any }> {
  try {
    const { data, error } = await supabase.rpc('check_weekly_transfer_limit', {
      p_sender_user_id: senderUserId,
      p_beneficiary_first_name: beneficiaryFirstName,
      p_beneficiary_last_name: beneficiaryLastName,
      p_beneficiary_email: beneficiaryEmail,
      p_beneficiary_phone: beneficiaryPhone,
      p_transfer_amount: transferAmount,
      p_transfer_currency: transferCurrency
    });

    if (error) {
      console.error('Error checking weekly transfer limit:', error);
      return { 
        allowed: false, 
        message: 'Erreur lors de la vérification du plafond de transfert.' 
      };
    }

    return {
      allowed: data.allowed,
      message: data.message,
      details: data
    };
  } catch (err) {
    console.error('Unexpected error checking weekly transfer limit:', err);
    return { 
      allowed: false, 
      message: 'Une erreur inattendue est survenue lors de la vérification du plafond.' 
    };
  }
}

// Fonction pour récupérer le plafond de transfert actuel
export async function getWeeklyTransferLimit(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('transfer_limits')
      .select('value')
      .eq('name', 'weekly_transfer_limit')
      .single();

    if (error) {
      console.error('Error fetching weekly transfer limit:', error);
      return 300; // Valeur par défaut
    }

    return data?.value || 300;
  } catch (err) {
    console.error('Unexpected error fetching weekly transfer limit:', err);
    return 300; // Valeur par défaut
  }
}

// Fonction pour mettre à jour le plafond de transfert (admin seulement)
export async function updateWeeklyTransferLimit(newLimit: number): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('transfer_limits')
      .update({ value: newLimit })
      .eq('name', 'weekly_transfer_limit');

    if (error) {
      console.error('Error updating weekly transfer limit:', error);
      return { 
        success: false, 
        message: 'Erreur lors de la mise à jour du plafond de transfert.' 
      };
    }

    return { 
      success: true, 
      message: 'Plafond de transfert mis à jour avec succès.' 
    };
  } catch (err) {
    console.error('Unexpected error updating weekly transfer limit:', err);
    return { 
      success: false, 
      message: 'Une erreur inattendue est survenue lors de la mise à jour du plafond.' 
    };
  }
}

// Get exchange rates with fallback
async function getExchangeRates() {
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('from_currency');

    if (error) throw error;
    return data || DEFAULT_EXCHANGE_RATES;
  } catch (err) {
    console.error('Failed to fetch exchange rates:', err);
    return DEFAULT_EXCHANGE_RATES;
  }
}

// Get exchange rate for specific currencies
async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  // If currencies are the same, return 1
  if (fromCurrency === toCurrency) {
    return 1;
  }

  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .maybeSingle();

    if (error) throw error;
    
    // If no rate found in database, try default rates
    if (!data) {
      const defaultRate = DEFAULT_EXCHANGE_RATES.find(
        rate => rate.from_currency === fromCurrency && rate.to_currency === toCurrency
      );
      if (defaultRate) {
        return defaultRate.rate;
      }
      throw new Error(`Taux de change non disponible (${fromCurrency} → ${toCurrency})`);
    }
    
    return data.rate;
  } catch (err) {
    console.error('Failed to fetch exchange rate:', err);
    
    // Try to find rate in defaults
    const defaultRate = DEFAULT_EXCHANGE_RATES.find(
      rate => rate.from_currency === fromCurrency && rate.to_currency === toCurrency
    );
    if (defaultRate) {
      return defaultRate.rate;
    }
    throw new Error(`Taux de change non disponible (${fromCurrency} → ${toCurrency})`);
  }
}

// Get transfer fees with fallback
async function getTransferFees() {
  try {
    const { data, error } = await supabase
      .from('transfer_fees')
      .select('*')
      .order('from_country');

    if (error) throw error;
    return data || DEFAULT_TRANSFER_FEES;
  } catch (err) {
    console.error('Failed to fetch transfer fees:', err);
    return DEFAULT_TRANSFER_FEES;
  }
}

// Get transfer conditions with fallback
async function getTransferConditions() {
  try {
    const { data, error } = await supabase
      .from('transfer_conditions')
      .select('*')
      .eq('name', 'MAX_AMOUNT_PER_TRANSFER')
      .maybeSingle();

    if (error) throw error;
    return data || DEFAULT_MAX_AMOUNT;
  } catch (err) {
    console.error('Error fetching max amount:', err);
    return DEFAULT_MAX_AMOUNT;
  }
}