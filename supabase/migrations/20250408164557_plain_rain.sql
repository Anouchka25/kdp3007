/*
  # Correction des limites de transfert codées en dur
  
  1. Problème
    - Le message d'erreur affiche toujours "196 788 XAF (300 EUR)" même après modification des conditions
    - La fonction validate_transfer_amount ne prend pas en compte les mises à jour des conditions
    
  2. Solution
    - Recréer la fonction pour qu'elle lise les valeurs à chaque appel
    - Formater correctement les messages d'erreur
    - S'assurer que les calculs sont précis
*/

-- Drop and recreate the validate_transfer_amount function to use values from the table
CREATE OR REPLACE FUNCTION validate_transfer_amount(
  amount numeric,
  direction text
) RETURNS TABLE (
  valid boolean,
  message text,
  max_amount numeric
) LANGUAGE plpgsql AS $$
DECLARE
  max_amount_from_gabon numeric;
  max_amount_to_gabon numeric;
  max_amount_xaf numeric;
  max_amount_eur numeric;
BEGIN
  -- Get the limits from the transfer_conditions table
  SELECT value INTO max_amount_from_gabon
  FROM transfer_conditions
  WHERE name = 'MAX_AMOUNT_FROM_GABON';
  
  SELECT value INTO max_amount_to_gabon
  FROM transfer_conditions
  WHERE name = 'MAX_AMOUNT_TO_GABON';
  
  -- Calculate XAF equivalent (655.96 is the fixed EUR to XAF rate)
  max_amount_xaf := ROUND(max_amount_from_gabon * 655.96);
  max_amount_eur := max_amount_to_gabon;
  
  -- For transfers from Gabon, validate against XAF limit
  IF direction LIKE 'GABON_TO_%' THEN
    RETURN QUERY SELECT 
      amount <= max_amount_xaf as valid,
      CASE 
        WHEN amount <= max_amount_xaf THEN 'Montant valide'
        ELSE 'Le montant maximum autorisé pour les transferts depuis le Gabon est de ' || 
             TRIM(TO_CHAR(max_amount_xaf, '999,999,999')) || ' XAF (' || max_amount_from_gabon || ' EUR)'
      END as message,
      max_amount_xaf;
  ELSE
    -- For transfers to Gabon, validate against EUR limit
    RETURN QUERY SELECT 
      amount <= max_amount_eur as valid,
      CASE 
        WHEN amount <= max_amount_eur THEN 'Montant valide'
        ELSE 'Le montant maximum autorisé pour les transferts vers le Gabon est de ' || 
             TRIM(TO_CHAR(max_amount_eur, '999,999,999')) || ' EUR'
      END as message,
      max_amount_eur;
  END IF;
END;
$$;

-- Force update of the transfer_conditions to trigger any triggers
UPDATE transfer_conditions
SET updated_at = CURRENT_TIMESTAMP
WHERE name IN ('MAX_AMOUNT_FROM_GABON', 'MAX_AMOUNT_TO_GABON');

-- Verify that the function was updated correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'validate_transfer_amount'
  ) THEN
    RAISE EXCEPTION 'Function validate_transfer_amount does not exist';
  END IF;
END $$;