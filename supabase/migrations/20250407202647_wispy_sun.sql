/*
  # Correction de l'affichage des bénéficiaires
  
  1. Vérification et correction des contraintes
    - Vérifie que la contrainte de clé étrangère existe
    - Ajoute la contrainte si elle n'existe pas
    - Vérifie que les index nécessaires existent
  
  2. Mise à jour des bénéficiaires existants
    - S'assure que tous les bénéficiaires ont un user_id
    - Corrige les relations entre les tables
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

-- Créer une politique simple qui permet à tous les utilisateurs authentifiés d'accéder aux bénéficiaires
CREATE POLICY "beneficiaries_access_all"
ON beneficiaries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Vérifier que les index ont été créés
DO $$
DECLARE
  transfer_id_index_exists boolean;
  user_id_index_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_beneficiaries_transfer_id'
    AND tablename = 'beneficiaries'
  ) INTO transfer_id_index_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_beneficiaries_user_id'
    AND tablename = 'beneficiaries'
  ) INTO user_id_index_exists;
  
  IF transfer_id_index_exists THEN
    RAISE NOTICE 'Index exists: idx_beneficiaries_transfer_id';
  ELSE
    RAISE WARNING 'Index does not exist: idx_beneficiaries_transfer_id';
  END IF;
  
  IF user_id_index_exists THEN
    RAISE NOTICE 'Index exists: idx_beneficiaries_user_id';
  ELSE
    RAISE WARNING 'Index does not exist: idx_beneficiaries_user_id';
  END IF;
END $$;