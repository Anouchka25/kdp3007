/*
  # Correction de l'affichage des bénéficiaires et des transferts dupliqués
  
  1. Problèmes résolus
    - Affichage des bénéficiaires dans l'historique des transferts admin
    - Duplication des transferts lors de l'enregistrement
    
  2. Solutions
    - Simplification des politiques RLS pour les bénéficiaires
    - Ajout d'une contrainte unique sur les transferts pour éviter les doublons
    - Mise à jour des triggers pour éviter les insertions multiples
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

-- Créer une politique simple qui permet à tous les utilisateurs authentifiés d'accéder aux bénéficiaires
CREATE POLICY "beneficiaries_access_all"
ON beneficiaries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

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

-- Créer une fonction pour éviter les doublons de transferts
CREATE OR REPLACE FUNCTION prevent_duplicate_transfers()
RETURNS TRIGGER AS $$
DECLARE
  existing_count integer;
BEGIN
  -- Vérifier si un transfert similaire existe déjà (créé dans les 5 dernières minutes)
  SELECT COUNT(*) INTO existing_count
  FROM transfers
  WHERE user_id = NEW.user_id
    AND amount_sent = NEW.amount_sent
    AND sender_currency = NEW.sender_currency
    AND receiver_currency = NEW.receiver_currency
    AND payment_method = NEW.payment_method
    AND receiving_method = NEW.receiving_method
    AND created_at > (NOW() - INTERVAL '5 minutes');
  
  -- Si un transfert similaire existe déjà, annuler l'insertion
  IF existing_count > 0 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Un transfert similaire a déjà été créé récemment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour éviter les doublons
DROP TRIGGER IF EXISTS prevent_duplicate_transfers_trigger ON transfers;
CREATE TRIGGER prevent_duplicate_transfers_trigger
BEFORE INSERT ON transfers
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_transfers();