-- Ajouter des colonnes pour stocker séparément les frais de retrait
ALTER TABLE transfers 
ADD COLUMN IF NOT EXISTS kundapay_fees numeric,
ADD COLUMN IF NOT EXISTS withdrawal_fees numeric,
ADD COLUMN IF NOT EXISTS withdrawal_fees_included boolean DEFAULT false;

-- Mettre à jour les transferts existants
-- Pour les transferts existants, nous considérons que les frais actuels sont les frais KundaPay
UPDATE transfers
SET 
  kundapay_fees = fees,
  withdrawal_fees = 0,
  withdrawal_fees_included = COALESCE(
    (SELECT payment_details->>'withdrawalFeesIncluded' FROM beneficiaries WHERE transfer_id = transfers.id LIMIT 1)::boolean,
    false
  );

-- Créer un trigger pour mettre à jour les frais totaux automatiquement
CREATE OR REPLACE FUNCTION update_total_fees()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fees = COALESCE(NEW.kundapay_fees, 0) + COALESCE(NEW.withdrawal_fees, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS update_total_fees_trigger ON transfers;
CREATE TRIGGER update_total_fees_trigger
BEFORE INSERT OR UPDATE OF kundapay_fees, withdrawal_fees ON transfers
FOR EACH ROW
EXECUTE FUNCTION update_total_fees();

-- Ajouter des commentaires pour la documentation
COMMENT ON COLUMN transfers.kundapay_fees IS 'Frais de service KundaPay';
COMMENT ON COLUMN transfers.withdrawal_fees IS 'Frais de retrait Airtel/Moov Money';
COMMENT ON COLUMN transfers.withdrawal_fees_included IS 'Indique si les frais de retrait sont inclus dans le transfert';