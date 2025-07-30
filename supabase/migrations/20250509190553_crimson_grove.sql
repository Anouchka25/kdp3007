/*
  # Ajout d'un code promo à usage unique par utilisateur
  
  1. Modifications
    - Ajout d'une table pour suivre l'utilisation des codes promo par utilisateur
    - Mise à jour de la fonction de validation des codes promo
    - Ajout du code promo LEGORI pour toutes les directions
    
  2. Fonctionnalités
    - Le code LEGORI offre 100% de réduction sur les frais KundaPay
    - Chaque utilisateur ne peut utiliser ce code qu'une seule fois
    - Le code est valable pour tous les types de transferts
*/

-- Créer une table pour suivre l'utilisation des codes promo par utilisateur
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  promo_code_id uuid REFERENCES promo_codes(id) NOT NULL,
  used_at timestamptz DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

-- Activer RLS sur la nouvelle table
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Créer des politiques pour la table promo_code_usage
CREATE POLICY "Users can view their own promo code usage"
ON promo_code_usage
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own promo code usage"
ON promo_code_usage
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all promo code usage"
ON promo_code_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Mettre à jour la fonction de validation des codes promo pour vérifier l'utilisation par utilisateur
CREATE OR REPLACE FUNCTION validate_promo_code(
  code_text text,
  transfer_direction text,
  user_id uuid DEFAULT NULL
) RETURNS TABLE (
  valid boolean,
  message text,
  discount_type text,
  discount_value numeric,
  promo_code_id uuid
) LANGUAGE plpgsql AS $$
DECLARE
  promo_record RECORD;
  user_has_used boolean;
BEGIN
  -- Get the promo code record for the specific direction
  SELECT p.*
  INTO promo_record
  FROM promo_codes p
  WHERE UPPER(p.code) = UPPER(code_text)
    AND p.direction = transfer_direction
    AND p.active = true
    AND current_timestamp BETWEEN p.start_date AND p.end_date
  LIMIT 1;

  -- Handle not found case
  IF promo_record IS NULL THEN
    -- Check if code exists for other directions
    IF EXISTS (
      SELECT 1 FROM promo_codes 
      WHERE UPPER(code) = UPPER(code_text) 
      AND active = true
    ) THEN
      RETURN QUERY SELECT 
        false,
        'Code promo non valide pour cette direction'::text,
        null::text,
        null::numeric,
        null::uuid;
    ELSE
      RETURN QUERY SELECT 
        false,
        'Code promo invalide'::text,
        null::text,
        null::numeric,
        null::uuid;
    END IF;
    RETURN;
  END IF;

  -- Check if user has already used this promo code
  IF user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM promo_code_usage
      WHERE user_id = validate_promo_code.user_id
      AND promo_code_id = promo_record.id
    ) INTO user_has_used;
    
    IF user_has_used THEN
      RETURN QUERY SELECT 
        false,
        'Vous avez déjà utilisé ce code promo'::text,
        null::text,
        null::numeric,
        null::uuid;
      RETURN;
    END IF;
  END IF;

  -- Check if promo code has reached max uses
  IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN QUERY SELECT 
      false,
      'Code promo épuisé'::text,
      null::text,
      null::numeric,
      null::uuid;
    RETURN;
  END IF;

  -- Code is valid
  RETURN QUERY SELECT 
    true,
    'Code promo valide'::text,
    promo_record.discount_type,
    promo_record.discount_value,
    promo_record.id;
END;
$$;

-- Mettre à jour la fonction d'incrémentation pour enregistrer l'utilisation par utilisateur
CREATE OR REPLACE FUNCTION increment_promo_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.promo_code_id IS NOT NULL THEN
    -- Incrémenter le compteur d'utilisation global
    UPDATE promo_codes
    SET current_uses = current_uses + 1
    WHERE id = NEW.promo_code_id;
    
    -- Enregistrer l'utilisation par cet utilisateur
    INSERT INTO promo_code_usage (user_id, promo_code_id)
    VALUES (NEW.user_id, NEW.promo_code_id)
    ON CONFLICT (user_id, promo_code_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ajouter le code promo LEGORI pour toutes les directions avec 100% de réduction
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
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL, -- Pas de limite d'utilisation globale
  0,
  true
),
-- Gabon -> France
(
  'LEGORI',
  'GABON_TO_FRANCE',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- Gabon -> Chine
(
  'LEGORI',
  'GABON_TO_CHINA',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- USA -> Gabon
(
  'LEGORI',
  'USA_TO_GABON',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- Gabon -> USA
(
  'LEGORI',
  'GABON_TO_USA',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- Canada -> Gabon
(
  'LEGORI',
  'CANADA_TO_GABON',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- Gabon -> Canada
(
  'LEGORI',
  'GABON_TO_CANADA',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- Belgium -> Gabon
(
  'LEGORI',
  'BELGIUM_TO_GABON',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- Gabon -> Belgium
(
  'LEGORI',
  'GABON_TO_BELGIUM',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- Germany -> Gabon
(
  'LEGORI',
  'GERMANY_TO_GABON',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
  0,
  true
),
-- Gabon -> Germany
(
  'LEGORI',
  'GABON_TO_GERMANY',
  'PERCENTAGE',
  100,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59+00',
  NULL,
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