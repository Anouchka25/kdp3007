/*
  # Ajouter les directions de transfert Maroc et Sénégal

  1. Nouveaux taux de change
    - EUR ↔ XOF (Sénégal) : 1 EUR = 655.96 XOF (taux fixe)
    - EUR ↔ MAD (Maroc) : 1 EUR = 10.75 MAD (taux flottant)
    - XAF ↔ XOF : 1 XAF = 1 XOF (parité identique avec EUR)
    - XAF ↔ MAD : via EUR (XAF → EUR → MAD)

  2. Nouveaux frais de transfert
    - France → Maroc/Sénégal : 0.9%
    - Gabon → Maroc : 8%
    - Maroc → Gabon/Sénégal : 8%
    - Sénégal → Maroc : 8%

  3. Méthodes de paiement
    - Orange Money (Maroc)
    - Wave (Sénégal)
    - Méthodes existantes (cartes, virements, etc.)
*/

-- Ajouter les nouveaux taux de change
INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at) VALUES
  -- EUR ↔ XOF (Sénégal - Franc CFA BCEAO)
  ('EUR', 'XOF', 655.96, now()),
  ('XOF', 'EUR', 0.001524, now()), -- 1/655.96
  
  -- EUR ↔ MAD (Maroc - Dirham)
  ('EUR', 'MAD', 10.75, now()),
  ('MAD', 'EUR', 0.093023, now()), -- 1/10.75
  
  -- XAF ↔ XOF (parité identique via EUR)
  ('XAF', 'XOF', 1.0000, now()),
  ('XOF', 'XAF', 1.0000, now()),
  
  -- XAF ↔ MAD (via EUR : XAF → EUR → MAD)
  ('XAF', 'MAD', 0.016393, now()), -- (1/655.96) * 10.75
  ('MAD', 'XAF', 61.0088, now()) -- (1/10.75) * 655.96
ON CONFLICT (from_currency, to_currency) 
DO UPDATE SET 
  rate = EXCLUDED.rate,
  updated_at = EXCLUDED.updated_at;

-- Ajouter les nouveaux frais de transfert

-- France → Maroc (0.9%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
  ('FR', 'MA', 'CARD', 'ORANGE_MONEY', 0.009, now()),
  ('FR', 'MA', 'BANK_TRANSFER', 'ORANGE_MONEY', 0.009, now()),
  ('FR', 'MA', 'PAYPAL', 'ORANGE_MONEY', 0.009, now()),
  ('FR', 'MA', 'WERO', 'ORANGE_MONEY', 0.009, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- France → Sénégal (0.9%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
  ('FR', 'SN', 'CARD', 'WAVE', 0.009, now()),
  ('FR', 'SN', 'BANK_TRANSFER', 'WAVE', 0.009, now()),
  ('FR', 'SN', 'PAYPAL', 'WAVE', 0.009, now()),
  ('FR', 'SN', 'WERO', 'WAVE', 0.009, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Gabon → Maroc (8%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
  ('GA', 'MA', 'AIRTEL_MONEY', 'ORANGE_MONEY', 0.08, now()),
  ('GA', 'MA', 'MOOV_MONEY', 'ORANGE_MONEY', 0.08, now()),
  ('GA', 'MA', 'CASH', 'ORANGE_MONEY', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Maroc → Gabon (8%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
  ('MA', 'GA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 0.08, now()),
  ('MA', 'GA', 'ORANGE_MONEY', 'MOOV_MONEY', 0.08, now()),
  ('MA', 'GA', 'ORANGE_MONEY', 'CASH', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Maroc → Sénégal (8%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
  ('MA', 'SN', 'ORANGE_MONEY', 'WAVE', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Sénégal → Maroc (8%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
  ('SN', 'MA', 'WAVE', 'ORANGE_MONEY', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Maroc → France (8% - direction de retour)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
  ('MA', 'FR', 'ORANGE_MONEY', 'BANK_TRANSFER', 0.08, now()),
  ('MA', 'FR', 'ORANGE_MONEY', 'WERO', 0.08, now()),
  ('MA', 'FR', 'ORANGE_MONEY', 'PAYPAL', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Sénégal → France (8% - direction de retour)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
  ('SN', 'FR', 'WAVE', 'BANK_TRANSFER', 0.08, now()),
  ('SN', 'FR', 'WAVE', 'WERO', 0.08, now()),
  ('SN', 'FR', 'WAVE', 'PAYPAL', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;