/*
  # Fix Beneficiaries Visibility in Transfers
  
  1. Changes
    - Create a new policy specifically for admins to view all beneficiaries
    - Ensure regular users can see beneficiaries for their own transfers
    - Fix the issue where beneficiaries don't appear in transfer history
    
  2. Security
    - Maintain proper security by restricting access to appropriate users
    - Allow admins full access to all beneficiaries
*/

-- Disable RLS temporarily
ALTER TABLE beneficiaries DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for beneficiaries
DO $$ 
BEGIN
  -- Delete all policies for the beneficiaries table
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON beneficiaries;', E'\n')
    FROM pg_policies 
    WHERE tablename = 'beneficiaries'
  );
END $$;

-- Re-enable RLS
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- Create policies for beneficiaries
-- Policy for users to view beneficiaries of their own transfers
CREATE POLICY "beneficiaries_select_by_user"
ON beneficiaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = beneficiaries.transfer_id
    AND transfers.user_id = auth.uid()
  )
);

-- Policy for admins to view all beneficiaries
CREATE POLICY "beneficiaries_select_by_admin"
ON beneficiaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Policy for users to insert beneficiaries for their own transfers
CREATE POLICY "beneficiaries_insert_policy"
ON beneficiaries
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = transfer_id
    AND transfers.user_id = auth.uid()
  )
);

-- Policy for users to update beneficiaries of their own transfers
CREATE POLICY "beneficiaries_update_policy"
ON beneficiaries
FOR UPDATE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = beneficiaries.transfer_id
    AND transfers.user_id = auth.uid()
  )) OR
  (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = beneficiaries.transfer_id
    AND transfers.user_id = auth.uid()
  )) OR
  (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  ))
);

-- Policy for users to delete beneficiaries of their own transfers
CREATE POLICY "beneficiaries_delete_policy"
ON beneficiaries
FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = beneficiaries.transfer_id
    AND transfers.user_id = auth.uid()
  )) OR
  (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  ))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_beneficiaries_transfer_id ON beneficiaries(transfer_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON beneficiaries(email);

-- Verify that the policies were created correctly
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'beneficiaries';
  
  IF policy_count < 5 THEN
    RAISE WARNING 'Expected at least 5 policies for beneficiaries table, but found %', policy_count;
  END IF;
END $$;