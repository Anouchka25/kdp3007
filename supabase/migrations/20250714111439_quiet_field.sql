/*
  # Fix weekly transfer limit function

  1. Function Updates
    - Fix format() function calls to properly escape literal % and . characters
    - Ensure all string formatting uses correct PostgreSQL syntax
    - Maintain existing functionality while fixing the format specifier error

  2. Security
    - Maintain existing RLS policies
    - Keep function security definer properties intact
*/

-- Drop and recreate the function with proper escaping
DROP FUNCTION IF EXISTS check_weekly_transfer_limit(uuid, text, text, text, text, numeric, text);

CREATE OR REPLACE FUNCTION check_weekly_transfer_limit(
  p_sender_user_id uuid,
  p_beneficiary_first_name text,
  p_beneficiary_last_name text,
  p_beneficiary_email text,
  p_beneficiary_phone text,
  p_transfer_amount numeric,
  p_transfer_currency text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_weekly_limit numeric;
  v_current_week_total numeric := 0;
  v_week_start timestamp with time zone;
  v_week_end timestamp with time zone;
  v_sender_country text;
  v_new_total numeric;
  v_limit_currency text := 'EUR';
  v_exchange_rate numeric := 1;
  v_amount_in_eur numeric;
BEGIN
  -- Get sender's country
  SELECT country INTO v_sender_country
  FROM users 
  WHERE id = p_sender_user_id;
  
  -- Only check limits for transfers FROM Gabon
  IF v_sender_country != 'GA' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'message', 'Aucune limite pour les transferts depuis ce pays',
      'current_total', 0,
      'weekly_limit', 0,
      'remaining', 0
    );
  END IF;

  -- Get weekly transfer limit
  SELECT value INTO v_weekly_limit
  FROM transfer_limits
  WHERE name = 'weekly_transfer_limit';
  
  -- Default limit if not found
  IF v_weekly_limit IS NULL THEN
    v_weekly_limit := 300;
  END IF;

  -- Calculate current week boundaries (Monday to Sunday)
  v_week_start := date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
  v_week_end := v_week_start + interval '7 days';

  -- Convert transfer amount to EUR if needed
  IF p_transfer_currency != v_limit_currency THEN
    SELECT rate INTO v_exchange_rate
    FROM exchange_rates
    WHERE from_currency = p_transfer_currency 
    AND to_currency = v_limit_currency;
    
    IF v_exchange_rate IS NULL THEN
      -- Default exchange rate for XAF to EUR
      IF p_transfer_currency = 'XAF' THEN
        v_exchange_rate := 0.001524;
      ELSE
        v_exchange_rate := 1;
      END IF;
    END IF;
  END IF;
  
  v_amount_in_eur := p_transfer_amount * v_exchange_rate;

  -- Calculate current week total for this sender to this specific beneficiary
  SELECT COALESCE(SUM(
    CASE 
      WHEN t.sender_currency = v_limit_currency THEN t.amount_sent
      ELSE t.amount_sent * COALESCE(er.rate, 
        CASE WHEN t.sender_currency = 'XAF' THEN 0.001524 ELSE 1 END
      )
    END
  ), 0) INTO v_current_week_total
  FROM transfers t
  LEFT JOIN beneficiaries b ON t.id = b.transfer_id
  LEFT JOIN exchange_rates er ON t.sender_currency = er.from_currency 
    AND er.to_currency = v_limit_currency
  WHERE t.user_id = p_sender_user_id
    AND t.created_at >= v_week_start
    AND t.created_at < v_week_end
    AND t.status IN ('pending', 'validated', 'completed')
    AND LOWER(b.first_name) = LOWER(p_beneficiary_first_name)
    AND LOWER(b.last_name) = LOWER(p_beneficiary_last_name)
    AND (
      (p_beneficiary_email IS NOT NULL AND LOWER(b.email) = LOWER(p_beneficiary_email))
      OR (p_beneficiary_phone IS NOT NULL AND b.payment_details->>'phone' = p_beneficiary_phone)
    );

  -- Calculate new total
  v_new_total := v_current_week_total + v_amount_in_eur;

  -- Check if limit would be exceeded
  IF v_new_total > v_weekly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', concat('Plafond hebdomadaire dépassé. Limite: ', v_weekly_limit::text, ' EUR, Total actuel: ', v_current_week_total::text, ' EUR, Nouveau total: ', v_new_total::text, ' EUR'),
      'current_total', v_current_week_total,
      'weekly_limit', v_weekly_limit,
      'remaining', GREATEST(0, v_weekly_limit - v_current_week_total),
      'requested_amount', v_amount_in_eur
    );
  END IF;

  -- Allow transfer
  RETURN jsonb_build_object(
    'allowed', true,
    'message', 'Transfert autorisé',
    'current_total', v_current_week_total,
    'weekly_limit', v_weekly_limit,
    'remaining', v_weekly_limit - v_new_total,
    'requested_amount', v_amount_in_eur
  );
END;
$$;