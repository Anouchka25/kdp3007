/*
  # Update loyalty points function to include France to Gabon transfers

  1. Changes
    - Modify calculate_loyalty_points_earned function to allow both GABON_TO_% and FRANCE_TO_GABON transfers to earn points
    - This ensures that transfers from France to Gabon also generate loyalty points for users

  2. Security
    - No changes to RLS policies
    - Function maintains existing security model
*/

CREATE OR REPLACE FUNCTION public.calculate_loyalty_points_earned(
  transfer_amount numeric,
  sender_currency text,
  direction text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  points_earned INTEGER := 0;
  eur_amount NUMERIC := 0;
BEGIN
  -- Seuls les transferts depuis le Gabon OU les transferts France -> Gabon donnent des points
  IF NOT (direction LIKE 'GABON_TO_%' OR direction = 'FRANCE_TO_GABON') THEN
    RETURN 0;
  END IF;

  -- Convertir le montant en EUR pour le calcul des points
  CASE sender_currency
    WHEN 'EUR' THEN
      eur_amount := transfer_amount;
    WHEN 'XAF' THEN
      -- 1 EUR = 655.96 XAF
      eur_amount := transfer_amount / 655.96;
    WHEN 'USD' THEN
      -- 1 EUR = 1.08 USD (approximatif)
      eur_amount := transfer_amount / 1.08;
    WHEN 'CNY' THEN
      -- 1 EUR = 7.51 CNY (approximatif)
      eur_amount := transfer_amount / 7.51;
    WHEN 'CAD' THEN
      -- 1 EUR = 1.45 CAD (approximatif)
      eur_amount := transfer_amount / 1.45;
    WHEN 'CHF' THEN
      -- 1 EUR = 0.95 CHF (approximatif)
      eur_amount := transfer_amount / 0.95;
    WHEN 'GBP' THEN
      -- 1 EUR = 0.85 GBP (approximatif)
      eur_amount := transfer_amount / 0.85;
    ELSE
      eur_amount := transfer_amount;
  END CASE;

  -- 1 point par EUR envoyé (arrondi à l'entier inférieur)
  points_earned := FLOOR(eur_amount);

  -- Minimum 0 points
  RETURN GREATEST(0, points_earned);
END;
$function$;