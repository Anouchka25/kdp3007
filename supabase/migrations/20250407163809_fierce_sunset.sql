/*
  # Fix admin access to beneficiaries
  
  1. Changes
    - Modify the admin policy for beneficiaries to ensure proper access
    - Simplify the policy to avoid potential issues with complex conditions
    
  2. Security
    - Maintain security by ensuring only admins have full access
    - Keep user-specific policies intact for regular users
*/

-- Disable RLS temporarily
ALTER TABLE beneficiaries DISABLE ROW LEVEL SECURITY;

-- Drop the existing admin policy
DROP POLICY IF EXISTS "beneficiaries_admin_policy" ON beneficiaries;

-- Re-enable RLS
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- Create a simpler admin policy with direct is_admin check
CREATE POLICY "beneficiaries_admin_policy_v2"
ON beneficiaries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Ensure admin users have proper permissions
UPDATE users
SET is_admin = true
WHERE email IN ('kundapay@gmail.com', 'minkoueobamea@gmail.com');

-- Verify that the policy was created correctly
DO $$
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'beneficiaries'
    AND policyname = 'beneficiaries_admin_policy_v2'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'Admin policy was not created correctly';
  END IF;
END $$;