/*
  # Correction de l'affichage des bénéficiaires
  
  1. Vérification et correction des contraintes
    - Vérifie que la contrainte de clé étrangère existe
    - Ajoute la contrainte si elle n'existe pas
    - Vérifie que les index nécessaires existent
  
  2. Mise à jour des bénéficiaires existants
    - S'assure que tous les bénéficiaires ont un user_id
    - Corrige les relations entre les tables
    
  3. Politiques d'accès
    - Crée des politiques RLS spécifiques pour limiter l'accès aux bénéficiaires
    - Les utilisateurs ne peuvent voir que leurs propres bénéficiaires
    - Les administrateurs peuvent voir tous les bénéficiaires
*/

-- Vérifier si la foreign key existe déjà
DO $$
DECLARE
  fk_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'beneficiaries_transfer_id_fkey'
    AND conrelid = 'beneficiaries'::regclass
  ) INTO fk_exists;

  -- Si la foreign key n'existe pas, la créer
  IF NOT fk_exists THEN
    EXECUTE 'ALTER TABLE beneficiaries ADD CONSTRAINT beneficiaries_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES transfers(id)';
    RAISE NOTICE 'Foreign key constraint added: beneficiaries_transfer_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists: beneficiaries_transfer_id_fkey';
  END IF;
END $$;

-- S'assurer que la colonne user_id existe
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);

-- Mettre à jour les bénéficiaires existants qui n'ont pas de user_id
UPDATE beneficiaries
SET user_id = transfers.user_id
FROM transfers
WHERE beneficiaries.transfer_id = transfers.id
AND beneficiaries.user_id IS NULL;

-- Créer des index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_beneficiaries_transfer_id ON beneficiaries(transfer_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);

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
CREATE POLICY "beneficiaries_select_by_user"
ON beneficiaries
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = beneficiaries.transfer_id
    AND transfers.user_id = auth.uid()
  )
);

-- Politique de sélection pour les administrateurs
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

-- Politique d'insertion: les utilisateurs peuvent ajouter des bénéficiaires à leurs propres transferts
CREATE POLICY "beneficiaries_insert_policy"
ON beneficiaries
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM transfers
    WHERE transfers.id = transfer_id
    AND transfers.user_id = auth.uid()
  )
);

-- Politique de mise à jour: les utilisateurs peuvent modifier leurs propres bénéficiaires
CREATE POLICY "beneficiaries_update_by_user"
ON beneficiaries
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Politique de mise à jour pour les administrateurs
CREATE POLICY "beneficiaries_update_by_admin"
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

-- Politique de suppression: les utilisateurs peuvent supprimer leurs propres bénéficiaires
CREATE POLICY "beneficiaries_delete_by_user"
ON beneficiaries
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Politique de suppression pour les administrateurs
CREATE POLICY "beneficiaries_delete_by_admin"
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

-- Vérifier que les politiques ont été créées correctement
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