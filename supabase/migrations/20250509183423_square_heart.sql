/*
  # Ajout du code promo LEGORI
  
  1. Nouveau code promo
    - Code: LEGORI
    - Directions: Toutes les directions
    - Réduction: 50% sur les frais
    - Validité: Jusqu'au 31 décembre 2025
*/

-- Ajouter le code promo LEGORI pour toutes les directions
INSERT INTO promo_codes (
  code,
  direction,
  discount_type,
  discount_value,
  start_date,
  end_date,
  max_uses,
  current_uses,
  active
) VALUES 
-- France -> Gabon
(
  'LEGORI',
  'FRANCE_TO_GABON',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Gabon -> France
(
  'LEGORI',
  'GABON_TO_FRANCE',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Gabon -> Chine
(
  'LEGORI',
  'GABON_TO_CHINA',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- USA -> Gabon
(
  'LEGORI',
  'USA_TO_GABON',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Gabon -> USA
(
  'LEGORI',
  'GABON_TO_USA',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Canada -> Gabon
(
  'LEGORI',
  'CANADA_TO_GABON',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Gabon -> Canada
(
  'LEGORI',
  'GABON_TO_CANADA',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Belgium -> Gabon
(
  'LEGORI',
  'BELGIUM_TO_GABON',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Gabon -> Belgium
(
  'LEGORI',
  'GABON_TO_BELGIUM',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Germany -> Gabon
(
  'LEGORI',
  'GERMANY_TO_GABON',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
),
-- Gabon -> Germany
(
  'LEGORI',
  'GABON_TO_GERMANY',
  'PERCENTAGE',
  50,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  1000,
  0,
  true
)
ON CONFLICT (code, direction) 
DO UPDATE SET 
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  start_date = CURRENT_TIMESTAMP,
  end_date = EXCLUDED.end_date,
  max_uses = EXCLUDED.max_uses,
  active = true;

-- Vérifier que les codes ont été ajoutés correctement
DO $$
DECLARE
  code_count integer;
BEGIN
  SELECT COUNT(*) INTO code_count
  FROM promo_codes
  WHERE code = 'LEGORI' AND active = true;
  
  IF code_count < 11 THEN
    RAISE WARNING 'Certains codes promo LEGORI n''ont pas été ajoutés correctement';
  END IF;
END $$;