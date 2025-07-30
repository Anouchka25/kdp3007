/*
  # Correction de la relation entre beneficiaries et transfers
  
  1. Vérification et correction de la foreign key
    - Vérifie que beneficiaries.transfer_id est bien une foreign key vers transfers.id
    - Ajoute la contrainte si elle n'existe pas
    
  2. Ajout d'index pour améliorer les performances
    - Index sur beneficiaries.transfer_id
    - Index sur beneficiaries.user_id
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

-- Créer des index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_beneficiaries_transfer_id ON beneficiaries(transfer_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);

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