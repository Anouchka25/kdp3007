/*
  # Add Loyalty Points System

  1. New Features
    - Add `loyalty_points` column to users table to track accumulated points
    - Add trigger to automatically award points when transfers to Gabon are completed
    - Add function to calculate loyalty points based on transfer amount

  2. Business Logic
    - 1 EUR sent to Gabon = 1 loyalty point
    - Points are awarded only for completed transfers TO Gabon
    - Points can be used for discounts on transfers FROM Gabon

  3. Security
    - Only completed transfers award points
    - Points are automatically calculated and awarded
*/

-- Add loyalty_points column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'loyalty_points'
  ) THEN
    ALTER TABLE users ADD COLUMN loyalty_points numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Create index for loyalty_points for better performance
CREATE INDEX IF NOT EXISTS idx_users_loyalty_points ON users(loyalty_points);

-- Function to award loyalty points when transfer to Gabon is completed
CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award numeric := 0;
  eur_amount numeric := 0;
BEGIN
  -- Only award points for completed transfers TO Gabon
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if this is a transfer TO Gabon (any country to GA)
    IF NEW.direction LIKE '%_TO_GABON' THEN
      -- Convert amount to EUR for point calculation
      IF NEW.sender_currency = 'EUR' THEN
        eur_amount := NEW.amount_sent;
      ELSIF NEW.sender_currency = 'XAF' THEN
        -- Convert XAF to EUR (1 EUR = 655.96 XAF)
        eur_amount := NEW.amount_sent / 655.96;
      ELSIF NEW.sender_currency = 'USD' THEN
        -- Convert USD to EUR (approximate rate, should use exchange_rates table)
        eur_amount := NEW.amount_sent / 1.08;
      ELSIF NEW.sender_currency = 'CHF' THEN
        -- Convert CHF to EUR
        eur_amount := NEW.amount_sent / 0.93;
      ELSIF NEW.sender_currency = 'GBP' THEN
        -- Convert GBP to EUR
        eur_amount := NEW.amount_sent * 1.20;
      ELSIF NEW.sender_currency = 'CAD' THEN
        -- Convert CAD to EUR
        eur_amount := NEW.amount_sent / 1.47;
      ELSE
        -- Default to amount_sent if currency not recognized
        eur_amount := NEW.amount_sent;
      END IF;
      
      -- Award 1 point per EUR sent (rounded down)
      points_to_award := FLOOR(eur_amount);
      
      -- Update user's loyalty points
      IF points_to_award > 0 THEN
        UPDATE users 
        SET loyalty_points = loyalty_points + points_to_award
        WHERE id = NEW.user_id;
        
        -- Log the points award (optional, for debugging)
        RAISE NOTICE 'Awarded % loyalty points to user % for transfer %', 
          points_to_award, NEW.user_id, NEW.reference;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to award loyalty points
DROP TRIGGER IF EXISTS award_loyalty_points_trigger ON transfers;
CREATE TRIGGER award_loyalty_points_trigger
  AFTER UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION award_loyalty_points();

-- Function to calculate loyalty discount
CREATE OR REPLACE FUNCTION calculate_loyalty_discount(
  user_id_param uuid,
  points_to_use numeric,
  transfer_amount numeric,
  sender_currency text
) RETURNS TABLE (
  discount_amount numeric,
  discount_percentage numeric,
  points_used numeric,
  remaining_points numeric
) AS $$
DECLARE
  user_points numeric := 0;
  max_usable_points numeric := 5000; -- Maximum 50% discount
  actual_points_to_use numeric := 0;
  discount_eur numeric := 0;
  discount_in_sender_currency numeric := 0;
  exchange_rate numeric := 1;
BEGIN
  -- Get user's current loyalty points
  SELECT loyalty_points INTO user_points
  FROM users
  WHERE id = user_id_param;
  
  IF user_points IS NULL THEN
    user_points := 0;
  END IF;
  
  -- Limit points to use based on availability and maximum
  actual_points_to_use := LEAST(points_to_use, user_points, max_usable_points);
  
  -- Calculate discount in EUR (1 point = 0.01 EUR discount)
  discount_eur := actual_points_to_use * 0.01;
  
  -- Convert discount to sender currency
  IF sender_currency = 'EUR' THEN
    discount_in_sender_currency := discount_eur;
  ELSIF sender_currency = 'XAF' THEN
    discount_in_sender_currency := discount_eur * 655.96;
  ELSIF sender_currency = 'USD' THEN
    discount_in_sender_currency := discount_eur * 1.08;
  ELSIF sender_currency = 'CHF' THEN
    discount_in_sender_currency := discount_eur * 0.93;
  ELSIF sender_currency = 'GBP' THEN
    discount_in_sender_currency := discount_eur / 1.20;
  ELSIF sender_currency = 'CAD' THEN
    discount_in_sender_currency := discount_eur * 1.47;
  ELSE
    discount_in_sender_currency := discount_eur;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT
    discount_in_sender_currency,
    (actual_points_to_use / 100.0), -- Convert points to percentage
    actual_points_to_use,
    (user_points - actual_points_to_use);
END;
$$ LANGUAGE plpgsql;