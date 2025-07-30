/*
  # Add loyalty_points column to users table

  1. Changes
    - Add `loyalty_points` column to `users` table with default value of 0
    - Column is nullable to allow for gradual migration

  2. Security
    - No RLS changes needed as existing user policies will apply
*/

-- Add loyalty_points column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'loyalty_points'
  ) THEN
    ALTER TABLE users ADD COLUMN loyalty_points numeric DEFAULT 0;
  END IF;
END $$;