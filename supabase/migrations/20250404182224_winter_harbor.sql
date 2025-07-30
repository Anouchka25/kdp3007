-- Update transfer fees to include PayPal for Gabon -> US/Canada
INSERT INTO transfer_fees (from_country, to_country, payment_method, receiving_method, fee_percentage)
VALUES 
-- Gabon -> USA with PayPal
('GA', 'US', 'AIRTEL_MONEY', 'PAYPAL', 0.075),
('GA', 'US', 'MOOV_MONEY', 'PAYPAL', 0.075),
('GA', 'US', 'CASH', 'PAYPAL', 0.075),

-- Gabon -> Canada with PayPal
('GA', 'CA', 'AIRTEL_MONEY', 'PAYPAL', 0.075),
('GA', 'CA', 'MOOV_MONEY', 'PAYPAL', 0.075),
('GA', 'CA', 'CASH', 'PAYPAL', 0.075)

ON CONFLICT (from_country, to_country, payment_method, receiving_method) 
DO UPDATE SET 
  fee_percentage = EXCLUDED.fee_percentage,
  updated_at = CURRENT_TIMESTAMP;

-- Verify that the fees were added correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM transfer_fees 
    WHERE from_country = 'GA' 
    AND to_country IN ('US', 'CA')
    AND receiving_method = 'PAYPAL'
  ) THEN
    RAISE EXCEPTION 'Missing Gabon -> US/Canada PayPal transfer fees';
  END IF;
END $$;