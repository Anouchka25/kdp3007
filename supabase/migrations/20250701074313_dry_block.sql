/*
  # Ajout du support pour les nouveaux pays européens

  1. Nouveaux taux de change
    - CHF (Franc suisse) <-> XAF
    - GBP (Livre sterling) <-> XAF  
    - EUR (pour Espagne, Italie, Pays-Bas) <-> XAF (déjà existant)

  2. Nouveaux frais de transfert
    - Suisse <-> Gabon (frais identiques à la France)
    - Royaume-Uni <-> Gabon (frais différents)
    - Espagne <-> Gabon (frais identiques à la France)
    - Italie <-> Gabon (frais identiques à la France)
    - Pays-Bas <-> Gabon (frais identiques à la France)

  3. Moyens de paiement : Carte bancaire et PayPal
*/

-- Ajouter les nouveaux taux de change
INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at) VALUES
-- CHF (Franc suisse) <-> XAF
('CHF', 'XAF', 730.45, now()),  -- 1 CHF = 730.45 XAF (approximatif)
('XAF', 'CHF', 0.001369, now()), -- 1 XAF = 0.001369 CHF

-- GBP (Livre sterling) <-> XAF  
('GBP', 'XAF', 820.50, now()),  -- 1 GBP = 820.50 XAF (approximatif)
('XAF', 'GBP', 0.001219, now()) -- 1 XAF = 0.001219 GBP
ON CONFLICT (from_currency, to_currency) DO UPDATE SET
  rate = EXCLUDED.rate,
  updated_at = EXCLUDED.updated_at;

-- Ajouter les frais de transfert pour la Suisse (identiques à la France - 1%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
-- Suisse -> Gabon
('CH', 'GA', 'CARD', 'AIRTEL_MONEY', 0.01, now()),
('CH', 'GA', 'CARD', 'MOOV_MONEY', 0.01, now()),
('CH', 'GA', 'CARD', 'CASH', 0.01, now()),
('CH', 'GA', 'PAYPAL', 'AIRTEL_MONEY', 0.01, now()),
('CH', 'GA', 'PAYPAL', 'MOOV_MONEY', 0.01, now()),
('CH', 'GA', 'PAYPAL', 'CASH', 0.01, now()),

-- Gabon -> Suisse
('GA', 'CH', 'AIRTEL_MONEY', 'BANK_TRANSFER', 0.055, now()),
('GA', 'CH', 'MOOV_MONEY', 'BANK_TRANSFER', 0.04, now()),
('GA', 'CH', 'CASH', 'BANK_TRANSFER', 0.04, now()),
('GA', 'CH', 'AIRTEL_MONEY', 'PAYPAL', 0.052, now()),
('GA', 'CH', 'MOOV_MONEY', 'PAYPAL', 0.042, now()),
('GA', 'CH', 'CASH', 'PAYPAL', 0.042, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) DO UPDATE SET
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Ajouter les frais de transfert pour le Royaume-Uni (frais différents)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
-- Royaume-Uni -> Gabon (frais légèrement plus élevés)
('GB', 'GA', 'CARD', 'AIRTEL_MONEY', 0.015, now()),  -- 1.5%
('GB', 'GA', 'CARD', 'MOOV_MONEY', 0.015, now()),
('GB', 'GA', 'CARD', 'CASH', 0.015, now()),
('GB', 'GA', 'PAYPAL', 'AIRTEL_MONEY', 0.015, now()),
('GB', 'GA', 'PAYPAL', 'MOOV_MONEY', 0.015, now()),
('GB', 'GA', 'PAYPAL', 'CASH', 0.015, now()),

-- Gabon -> Royaume-Uni (frais légèrement plus élevés)
('GA', 'GB', 'AIRTEL_MONEY', 'BANK_TRANSFER', 0.06, now()),  -- 6%
('GA', 'GB', 'MOOV_MONEY', 'BANK_TRANSFER', 0.045, now()),   -- 4.5%
('GA', 'GB', 'CASH', 'BANK_TRANSFER', 0.045, now()),
('GA', 'GB', 'AIRTEL_MONEY', 'PAYPAL', 0.057, now()),       -- 5.7%
('GA', 'GB', 'MOOV_MONEY', 'PAYPAL', 0.047, now()),         -- 4.7%
('GA', 'GB', 'CASH', 'PAYPAL', 0.047, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) DO UPDATE SET
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Ajouter les frais de transfert pour l'Espagne (identiques à la France - 1%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
-- Espagne -> Gabon
('ES', 'GA', 'CARD', 'AIRTEL_MONEY', 0.01, now()),
('ES', 'GA', 'CARD', 'MOOV_MONEY', 0.01, now()),
('ES', 'GA', 'CARD', 'CASH', 0.01, now()),
('ES', 'GA', 'PAYPAL', 'AIRTEL_MONEY', 0.01, now()),
('ES', 'GA', 'PAYPAL', 'MOOV_MONEY', 0.01, now()),
('ES', 'GA', 'PAYPAL', 'CASH', 0.01, now()),

-- Gabon -> Espagne
('GA', 'ES', 'AIRTEL_MONEY', 'BANK_TRANSFER', 0.055, now()),
('GA', 'ES', 'MOOV_MONEY', 'BANK_TRANSFER', 0.04, now()),
('GA', 'ES', 'CASH', 'BANK_TRANSFER', 0.04, now()),
('GA', 'ES', 'AIRTEL_MONEY', 'PAYPAL', 0.052, now()),
('GA', 'ES', 'MOOV_MONEY', 'PAYPAL', 0.042, now()),
('GA', 'ES', 'CASH', 'PAYPAL', 0.042, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) DO UPDATE SET
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Ajouter les frais de transfert pour l'Italie (identiques à la France - 1%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
-- Italie -> Gabon
('IT', 'GA', 'CARD', 'AIRTEL_MONEY', 0.01, now()),
('IT', 'GA', 'CARD', 'MOOV_MONEY', 0.01, now()),
('IT', 'GA', 'CARD', 'CASH', 0.01, now()),
('IT', 'GA', 'PAYPAL', 'AIRTEL_MONEY', 0.01, now()),
('IT', 'GA', 'PAYPAL', 'MOOV_MONEY', 0.01, now()),
('IT', 'GA', 'PAYPAL', 'CASH', 0.01, now()),

-- Gabon -> Italie
('GA', 'IT', 'AIRTEL_MONEY', 'BANK_TRANSFER', 0.055, now()),
('GA', 'IT', 'MOOV_MONEY', 'BANK_TRANSFER', 0.04, now()),
('GA', 'IT', 'CASH', 'BANK_TRANSFER', 0.04, now()),
('GA', 'IT', 'AIRTEL_MONEY', 'PAYPAL', 0.052, now()),
('GA', 'IT', 'MOOV_MONEY', 'PAYPAL', 0.042, now()),
('GA', 'IT', 'CASH', 'PAYPAL', 0.042, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) DO UPDATE SET
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;

-- Ajouter les frais de transfert pour les Pays-Bas (identiques à la France - 1%)
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage, updated_at) VALUES
-- Pays-Bas -> Gabon
('NL', 'GA', 'CARD', 'AIRTEL_MONEY', 0.01, now()),
('NL', 'GA', 'CARD', 'MOOV_MONEY', 0.01, now()),
('NL', 'GA', 'CARD', 'CASH', 0.01, now()),
('NL', 'GA', 'PAYPAL', 'AIRTEL_MONEY', 0.01, now()),
('NL', 'GA', 'PAYPAL', 'MOOV_MONEY', 0.01, now()),
('NL', 'GA', 'PAYPAL', 'CASH', 0.01, now()),

-- Gabon -> Pays-Bas
('GA', 'NL', 'AIRTEL_MONEY', 'BANK_TRANSFER', 0.055, now()),
('GA', 'NL', 'MOOV_MONEY', 'BANK_TRANSFER', 0.04, now()),
('GA', 'NL', 'CASH', 'BANK_TRANSFER', 0.04, now()),
('GA', 'NL', 'AIRTEL_MONEY', 'PAYPAL', 0.052, now()),
('GA', 'NL', 'MOOV_MONEY', 'PAYPAL', 0.042, now()),
('GA', 'NL', 'CASH', 'PAYPAL', 0.042, now())
ON CONFLICT (from_country, to_country, payment_method, receiving_method) DO UPDATE SET
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = EXCLUDED.updated_at;