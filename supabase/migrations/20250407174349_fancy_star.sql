/*
  # Fix beneficiary visibility in transfer history (secure version)

  1. Problem
    - Beneficiaries are correctly limited by user access
    - But they don't appear in transfer history and details

  2. Solution
    - Create a secure SELECT policy that only shows beneficiaries linked to user's own transfers
    - Maintain security for write operations
    - Allow admin access through separate logic if needed
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

-- Create SELECT policy: users can only see beneficiaries linked to their own transfers
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

-- INSERT: users can only add beneficiaries to their own transfers
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

-- UPDATE: users can only update beneficiaries of their own transfers, or admins can update any
CREATE POLICY "beneficiaries_update_policy"
ON beneficiaries
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = transfer_id
    AND transfers.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = transfer_id
    AND transfers.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- DELETE: same logic as update
CREATE POLICY "beneficiaries_delete_policy"
ON beneficiaries
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = transfer_id
    AND transfers.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Create indexes for better performance
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
  
  IF policy_count < 4 THEN
    RAISE WARNING 'Expected at least 4 policies for beneficiaries table, but found %', policy_count;
  END IF;
END $$;
