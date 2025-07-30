-- Add user_id column to beneficiaries table
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);

-- Update existing beneficiaries with user_id from their transfers
UPDATE beneficiaries
SET user_id = transfers.user_id
FROM transfers
WHERE beneficiaries.transfer_id = transfers.id
AND beneficiaries.user_id IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);

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

-- Policy for users to view their own beneficiaries OR
-- any beneficiary linked to one of their transfers
CREATE POLICY "beneficiaries_select_own"
ON beneficiaries
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = beneficiaries.transfer_id
    AND transfers.user_id = auth.uid()
  )
);


-- Policy for admins to view all beneficiaries
CREATE POLICY "beneficiaries_select_admin"
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

-- Policy for users to insert their own beneficiaries
CREATE POLICY "beneficiaries_insert_policy"
ON beneficiaries
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own beneficiaries
CREATE POLICY "beneficiaries_update_policy"
ON beneficiaries
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy for admins to update any beneficiary
CREATE POLICY "beneficiaries_update_admin"
ON beneficiaries
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Policy for users to delete their own beneficiaries
CREATE POLICY "beneficiaries_delete_policy"
ON beneficiaries
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Policy for admins to delete any beneficiary
CREATE POLICY "beneficiaries_delete_admin"
ON beneficiaries
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Verify that the policies were created correctly
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'beneficiaries';
  
  IF policy_count < 7 THEN
    RAISE WARNING 'Expected at least 7 policies for beneficiaries table, but found %', policy_count;
  END IF;
END $$;