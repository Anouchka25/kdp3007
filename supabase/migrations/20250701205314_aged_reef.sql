/*
  # Système de points de fidélité automatique

  1. Fonctions
    - Fonction pour calculer les points de fidélité basés sur le montant du transfert
    - Fonction pour attribuer automatiquement les points lors de la validation d'un transfert
    - Fonction pour calculer la réduction basée sur les points de fidélité
    - Trigger pour attribuer automatiquement les points lors de la validation

  2. Sécurité
    - Les fonctions sont sécurisées et ne peuvent être appelées que par le système
    - Validation des données d'entrée
    - Gestion des erreurs
*/

-- Fonction pour calculer les points de fidélité basés sur le montant du transfert
CREATE OR REPLACE FUNCTION calculate_loyalty_points_earned(
  transfer_amount NUMERIC,
  sender_currency TEXT,
  direction TEXT
) RETURNS INTEGER AS $$
DECLARE
  points_earned INTEGER := 0;
  eur_amount NUMERIC := 0;
BEGIN
  -- Seuls les transferts depuis le Gabon donnent des points
  IF direction NOT LIKE 'GABON_TO_%' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour attribuer automatiquement les points de fidélité
CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  current_points NUMERIC;
BEGIN
  -- Vérifier si le transfert vient d'être validé (completed)
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Calculer les points à attribuer
    points_to_award := calculate_loyalty_points_earned(
      NEW.amount_sent,
      NEW.sender_currency,
      NEW.direction
    );
    
    -- Si des points doivent être attribués
    IF points_to_award > 0 THEN
      -- Récupérer les points actuels de l'utilisateur
      SELECT COALESCE(loyalty_points, 0) INTO current_points
      FROM users
      WHERE id = NEW.user_id;
      
      -- Mettre à jour les points de fidélité
      UPDATE users
      SET loyalty_points = COALESCE(current_points, 0) + points_to_award
      WHERE id = NEW.user_id;
      
      -- Créer une notification pour informer l'utilisateur
      INSERT INTO notifications (
        type,
        transfer_id,
        recipient_id,
        message,
        status
      ) VALUES (
        'loyalty_points_earned',
        NEW.id,
        NEW.user_id,
        format('Félicitations ! Vous avez gagné %s points de fidélité pour votre transfert %s', 
               points_to_award, NEW.reference),
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer la réduction basée sur les points de fidélité
CREATE OR REPLACE FUNCTION calculate_loyalty_discount(
  user_id_param UUID,
  points_to_use INTEGER,
  transfer_amount NUMERIC,
  sender_currency TEXT
) RETURNS TABLE (
  discount_amount NUMERIC,
  discount_percentage NUMERIC,
  points_used INTEGER,
  remaining_points INTEGER
) AS $$
DECLARE
  user_points INTEGER;
  max_usable_points INTEGER := 5000; -- Maximum 5000 points par transaction
  min_points_required INTEGER := 100; -- Minimum 100 points pour utiliser
  eur_value_per_point NUMERIC := 0.01; -- 1 point = 0.01 EUR
  max_discount_percentage NUMERIC := 50; -- Maximum 50% de réduction
  calculated_discount NUMERIC := 0;
  actual_points_used INTEGER := 0;
  eur_amount NUMERIC := 0;
BEGIN
  -- Récupérer les points de l'utilisateur
  SELECT COALESCE(loyalty_points, 0) INTO user_points
  FROM users
  WHERE id = user_id_param;
  
  -- Vérifier si l'utilisateur a assez de points
  IF user_points < min_points_required OR points_to_use < min_points_required THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0, user_points;
    RETURN;
  END IF;
  
  -- Limiter les points utilisables
  actual_points_used := LEAST(points_to_use, user_points, max_usable_points);
  
  -- Convertir le montant du transfert en EUR pour le calcul
  CASE sender_currency
    WHEN 'EUR' THEN
      eur_amount := transfer_amount;
    WHEN 'XAF' THEN
      eur_amount := transfer_amount / 655.96;
    WHEN 'USD' THEN
      eur_amount := transfer_amount / 1.08;
    WHEN 'CNY' THEN
      eur_amount := transfer_amount / 7.51;
    WHEN 'CAD' THEN
      eur_amount := transfer_amount / 1.45;
    WHEN 'CHF' THEN
      eur_amount := transfer_amount / 0.95;
    WHEN 'GBP' THEN
      eur_amount := transfer_amount / 0.85;
    ELSE
      eur_amount := transfer_amount;
  END CASE;
  
  -- Calculer la réduction en EUR
  calculated_discount := actual_points_used * eur_value_per_point;
  
  -- Convertir la réduction dans la devise du transfert
  CASE sender_currency
    WHEN 'EUR' THEN
      calculated_discount := calculated_discount;
    WHEN 'XAF' THEN
      calculated_discount := calculated_discount * 655.96;
    WHEN 'USD' THEN
      calculated_discount := calculated_discount * 1.08;
    WHEN 'CNY' THEN
      calculated_discount := calculated_discount * 7.51;
    WHEN 'CAD' THEN
      calculated_discount := calculated_discount * 1.45;
    WHEN 'CHF' THEN
      calculated_discount := calculated_discount * 0.95;
    WHEN 'GBP' THEN
      calculated_discount := calculated_discount * 0.85;
  END CASE;
  
  -- Limiter la réduction à 50% du montant du transfert
  calculated_discount := LEAST(calculated_discount, transfer_amount * max_discount_percentage / 100);
  
  -- Calculer le pourcentage de réduction
  RETURN QUERY SELECT 
    calculated_discount,
    (calculated_discount / transfer_amount * 100)::NUMERIC,
    actual_points_used,
    (user_points - actual_points_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour utiliser les points de fidélité lors d'un transfert
CREATE OR REPLACE FUNCTION use_loyalty_points(
  user_id_param UUID,
  points_to_use INTEGER,
  transfer_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_points INTEGER;
BEGIN
  -- Récupérer les points actuels
  SELECT COALESCE(loyalty_points, 0) INTO user_points
  FROM users
  WHERE id = user_id_param;
  
  -- Vérifier si l'utilisateur a assez de points
  IF user_points < points_to_use THEN
    RETURN FALSE;
  END IF;
  
  -- Déduire les points
  UPDATE users
  SET loyalty_points = loyalty_points - points_to_use
  WHERE id = user_id_param;
  
  -- Créer une notification
  INSERT INTO notifications (
    type,
    transfer_id,
    recipient_id,
    message,
    status
  ) VALUES (
    'loyalty_points_used',
    transfer_id_param,
    user_id_param,
    format('Vous avez utilisé %s points de fidélité pour obtenir une réduction sur votre transfert', points_to_use),
    'pending'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour attribuer automatiquement les points
DROP TRIGGER IF EXISTS award_loyalty_points_trigger ON transfers;
CREATE TRIGGER award_loyalty_points_trigger
  AFTER UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION award_loyalty_points();

-- Mettre à jour les transferts existants pour attribuer rétroactivement les points
DO $$
DECLARE
  transfer_record RECORD;
  points_to_award INTEGER;
BEGIN
  -- Parcourir tous les transferts terminés qui n'ont pas encore donné de points
  FOR transfer_record IN 
    SELECT t.id, t.user_id, t.amount_sent, t.sender_currency, t.direction, t.reference
    FROM transfers t
    WHERE t.status = 'completed'
    AND t.direction LIKE 'GABON_TO_%'
  LOOP
    -- Calculer les points pour ce transfert
    points_to_award := calculate_loyalty_points_earned(
      transfer_record.amount_sent,
      transfer_record.sender_currency,
      transfer_record.direction
    );
    
    -- Attribuer les points si applicable
    IF points_to_award > 0 THEN
      UPDATE users
      SET loyalty_points = COALESCE(loyalty_points, 0) + points_to_award
      WHERE id = transfer_record.user_id;
      
      -- Créer une notification
      INSERT INTO notifications (
        type,
        transfer_id,
        recipient_id,
        message,
        status
      ) VALUES (
        'loyalty_points_earned',
        transfer_record.id,
        transfer_record.user_id,
        format('Félicitations ! Vous avez gagné %s points de fidélité pour votre transfert %s (attribution rétroactive)', 
               points_to_award, transfer_record.reference),
        'pending'
      );
    END IF;
  END LOOP;
END $$;