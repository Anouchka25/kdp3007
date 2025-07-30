-- Function to get transfer statistics by user
CREATE OR REPLACE FUNCTION get_user_transfer_stats()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_name text,
  total_amount numeric,
  currency text,
  transfer_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.user_id,
    u.email as user_email,
    concat(u.first_name, ' ', u.last_name) as user_name,
    SUM(t.amount_sent) as total_amount,
    t.sender_currency as currency,
    COUNT(t.id) as transfer_count
  FROM 
    transfers t
  JOIN 
    users u ON t.user_id = u.id
  WHERE 
    t.status = 'completed'
  GROUP BY 
    t.user_id, u.email, user_name, t.sender_currency
  ORDER BY 
    total_amount DESC;
END;
$$;

-- Function to get transfer statistics by direction
CREATE OR REPLACE FUNCTION get_direction_transfer_stats()
RETURNS TABLE (
  direction text,
  total_amount numeric,
  currency text,
  transfer_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.direction,
    SUM(t.amount_sent) as total_amount,
    t.sender_currency as currency,
    COUNT(t.id) as transfer_count
  FROM 
    transfers t
  WHERE 
    t.status = 'completed'
    AND t.direction IS NOT NULL
  GROUP BY 
    t.direction, t.sender_currency
  ORDER BY 
    total_amount DESC;
END;
$$;