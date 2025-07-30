/*
  # Correction de l'accès aux bénéficiaires dans les transferts
  
  1. Problème
    - Les bénéficiaires sont correctement limités par utilisateur
    - Mais ils n'apparaissent plus dans l'historique des transferts et les détails
  
  2. Solution
    - Ajuster les politiques pour permettre la jointure entre transferts et bénéficiaires
    - Maintenir la sécurité en limitant l'accès aux bénéficiaires des transferts de l'utilisateur
*/

-- Désactiver RLS temporairement
ALTER TABLE beneficiaries DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les politiques existantes pour les bénéficiaires
DO $$ 
BEGIN
  -- Supprimer les politiques de la table beneficiaries
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON beneficiaries;', E'\n')
    FROM pg_policies 
    WHERE tablename = 'beneficiaries'
  );
END $$;

-- Réactiver RLS
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- Créer des politiques pour les bénéficiaires
-- Politique de sélection: les utilisateurs peuvent voir les bénéficiaires de leurs propres transferts
CREATE POLICY "beneficiaries_select_policy"
ON beneficiaries
FOR SELECT
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

-- Politique d'insertion: les utilisateurs peuvent ajouter des bénéficiaires à leurs propres transferts
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

-- Politique de mise à jour: les utilisateurs peuvent modifier les bénéficiaires de leurs propres transferts
CREATE POLICY "beneficiaries_update_policy"
ON beneficiaries
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = transfer_id
    AND transfers.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = transfer_id
    AND transfers.user_id = auth.uid()
  )
);

-- Politique de suppression: les utilisateurs peuvent supprimer les bénéficiaires de leurs propres transferts
CREATE POLICY "beneficiaries_delete_policy"
ON beneficiaries
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = transfer_id
    AND transfers.user_id = auth.uid()
  )
);

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_beneficiaries_transfer_id ON beneficiaries(transfer_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON beneficiaries(email);

-- Vérifier que les politiques ont été créées correctement
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