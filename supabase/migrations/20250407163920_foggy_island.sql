/*
  # Fix admin access to beneficiaries

  1. Changes
    - Update beneficiaries admin policy to allow full access to all beneficiaries for admin users
    - Remove unnecessary check in the WITH CHECK clause

  2. Security
    - Maintains RLS enabled on beneficiaries table
    - Updates policy to properly handle admin access
*/

DROP POLICY IF EXISTS "beneficiaries_admin_policy_v2" ON beneficiaries;

CREATE POLICY "beneficiaries_admin_policy"
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