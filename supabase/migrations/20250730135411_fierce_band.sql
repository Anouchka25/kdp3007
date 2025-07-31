/*
  # Ajout des directions de transfert Maroc et Sénégal

  1. Nouveaux frais de transfert
    - France → Maroc (0,9%)
    - France → Sénégal (0,9%)
    - Gabon → Maroc (8%)
    - Maroc → Gabon (8%)
    - Maroc → Sénégal (8%)
    - Sénégal → Maroc (8%)

  2. Méthodes de paiement et réception
    - Orange Money pour le Maroc
    - Wave pour le Sénégal
    - Intégration avec les méthodes existantes

  3. Taux de change
    - Ajout des taux EUR pour Maroc et Sénégal (utilisation de l'EUR comme devise de référence)
*/

-- Insérer les nouveaux frais de transfert pour les directions Maroc et Sénégal

-- France → Maroc
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at)
VALUES 
  ('FR', 'MA', 'CARD', 'ORANGE_MONEY', 0.009, now()),
  ('FR', 'MA', 'BANK_TRANSFER', 'ORANGE_MONEY', 0.009, now()),
  ('FR', 'MA', 'PAYPAL', 'ORANGE_MONEY', 0.009, now()),
  ('FR', 'MA', 'WERO', 'ORANGE_MONEY', 0.009, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = now();

-- France → Sénégal
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at)
VALUES 
  ('FR', 'SN', 'CARD', 'WAVE', 0.009, now()),
  ('FR', 'SN', 'BANK_TRANSFER', 'WAVE', 0.009, now()),
  ('FR', 'SN', 'PAYPAL', 'WAVE', 0.009, now()),
  ('FR', 'SN', 'WERO', 'WAVE', 0.009, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = now();

-- Gabon → Maroc
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at)
VALUES 
  ('GA', 'MA', 'AIRTEL_MONEY', 'ORANGE_MONEY', 0.08, now()),
  ('GA', 'MA', 'MOOV_MONEY', 'ORANGE_MONEY', 0.08, now()),
  ('GA', 'MA', 'CASH', 'ORANGE_MONEY', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = now();

-- Maroc → Gabon
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at)
VALUES 
  ('MA', 'GA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 0.08, now()),
  ('MA', 'GA', 'ORANGE_MONEY', 'MOOV_MONEY', 0.08, now()),
  ('MA', 'GA', 'ORANGE_MONEY', 'CASH', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = now();

-- Maroc → Sénégal
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at)
VALUES 
  ('MA', 'SN', 'ORANGE_MONEY', 'WAVE', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = now();

-- Sénégal → Maroc
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at)
VALUES 
  ('SN', 'MA', 'WAVE', 'ORANGE_MONEY', 0.08, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = now();

-- Ajouter ou mettre à jour les taux de change pour EUR (utilisé pour Maroc et Sénégal)
-- Note: Les transferts vers/depuis Maroc et Sénégal utilisent EUR comme devise de référence

-- Taux de change EUR vers EUR (pour les transferts internes EUR)
INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
VALUES 
  ('EUR', 'EUR', 1.0000, now())
ON CONFLICT (from_currency, to_currency) 
DO UPDATE SET 
  rate = EXCLUDED.rate,
  updated_at = now();

-- Taux de change XAF vers EUR (pour les transferts depuis le Gabon vers Maroc/Sénégal)
INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
VALUES 
  ('XAF', 'EUR', 0.001524, now())
ON CONFLICT (from_currency, to_currency) 
DO UPDATE SET 
  rate = EXCLUDED.rate,
  updated_at = now();

-- Taux de change EUR vers XAF (pour les transferts depuis Maroc/Sénégal vers le Gabon)
INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
VALUES 
  ('EUR', 'XAF', 655.96, now())
ON CONFLICT (from_currency, to_currency) 
DO UPDATE SET 
  rate = EXCLUDED.rate,
  updated_at = now();