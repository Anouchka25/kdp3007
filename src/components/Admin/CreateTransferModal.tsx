import React, { useState, useEffect } from 'react';
import { supabase, checkWeeklyTransferLimit } from '../../lib/supabase';
import { calculateTransferDetails } from '../../lib/utils';
import { X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferCreated: () => void;
}

const DIRECTIONS = [
  { value: 'FRANCE_TO_GABON', label: 'France → Gabon' },
  { value: 'GABON_TO_FRANCE', label: 'Gabon → France' },
  { value: 'BELGIUM_TO_GABON', label: 'Belgique → Gabon' },
  { value: 'GABON_TO_BELGIUM', label: 'Gabon → Belgique' },
  { value: 'GERMANY_TO_GABON', label: 'Allemagne → Gabon' },
  { value: 'GABON_TO_GERMANY', label: 'Gabon → Allemagne' },
  { value: 'GABON_TO_CHINA', label: 'Gabon → Chine' },
  { value: 'USA_TO_GABON', label: 'États-Unis → Gabon' },
  { value: 'GABON_TO_USA', label: 'Gabon → États-Unis' },
  { value: 'CANADA_TO_GABON', label: 'Canada → Gabon' },
  { value: 'GABON_TO_CANADA', label: 'Gabon → Canada' },
  { value: 'SWITZERLAND_TO_GABON', label: 'Suisse → Gabon' },
  { value: 'GABON_TO_SWITZERLAND', label: 'Gabon → Suisse' },
  { value: 'UK_TO_GABON', label: 'Royaume-Uni → Gabon' },
  { value: 'GABON_TO_UK', label: 'Gabon → Royaume-Uni' },
  { value: 'SPAIN_TO_GABON', label: 'Espagne → Gabon' },
  { value: 'GABON_TO_SPAIN', label: 'Gabon → Espagne' },
  { value: 'ITALY_TO_GABON', label: 'Italie → Gabon' },
  { value: 'GABON_TO_ITALY', label: 'Gabon → Italie' },
  { value: 'NETHERLANDS_TO_GABON', label: 'Pays-Bas → Gabon' },
  { value: 'GABON_TO_NETHERLANDS', label: 'Gabon → Pays-Bas' },
  { value: 'FRANCE_TO_MOROCCO', label: 'France → Maroc' },
  { value: 'MOROCCO_TO_FRANCE', label: 'Maroc → France' },
  { value: 'FRANCE_TO_SENEGAL', label: 'France → Sénégal' },
  { value: 'SENEGAL_TO_FRANCE', label: 'Sénégal → France' },
  { value: 'GABON_TO_MOROCCO', label: 'Gabon → Maroc' },
  { value: 'MOROCCO_TO_GABON', label: 'Maroc → Gabon' },
  { value: 'MOROCCO_TO_SENEGAL', label: 'Maroc → Sénégal' },
  { value: 'SENEGAL_TO_MOROCCO', label: 'Sénégal → Maroc' }
];

const PAYMENT_METHODS = {
  'FRANCE_TO_GABON': ['BANK_TRANSFER', 'WERO', 'CARD', 'PAYPAL'],
  'BELGIUM_TO_GABON': ['BANK_TRANSFER', 'WERO', 'CARD', 'PAYPAL'],
  'GERMANY_TO_GABON': ['BANK_TRANSFER', 'WERO', 'CARD', 'PAYPAL'],
  'GABON_TO_FRANCE': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_BELGIUM': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_GERMANY': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_CHINA': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'USA_TO_GABON': ['PAYPAL', 'ACH', 'VISA_DIRECT', 'MASTERCARD_SEND'],
  'GABON_TO_USA': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'CANADA_TO_GABON': ['PAYPAL', 'INTERAC', 'VISA_DIRECT', 'MASTERCARD_SEND'],
  'GABON_TO_CANADA': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'SWITZERLAND_TO_GABON': ['CARD', 'PAYPAL'],
  'GABON_TO_SWITZERLAND': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'UK_TO_GABON': ['CARD', 'PAYPAL'],
  'GABON_TO_UK': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'SPAIN_TO_GABON': ['CARD', 'PAYPAL'],
  'GABON_TO_SPAIN': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'ITALY_TO_GABON': ['CARD', 'PAYPAL'],
  'GABON_TO_ITALY': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'NETHERLANDS_TO_GABON': ['CARD', 'PAYPAL'],
  'GABON_TO_NETHERLANDS': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'FRANCE_TO_MOROCCO': ['CARD', 'BANK_TRANSFER', 'PAYPAL', 'WERO'],
  'MOROCCO_TO_FRANCE': ['ORANGE_MONEY'],
  'FRANCE_TO_SENEGAL': ['CARD', 'BANK_TRANSFER', 'PAYPAL', 'WERO'],
  'SENEGAL_TO_FRANCE': ['WAVE'],
  'GABON_TO_MOROCCO': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'MOROCCO_TO_GABON': ['ORANGE_MONEY'],
  'MOROCCO_TO_SENEGAL': ['ORANGE_MONEY'],
  'SENEGAL_TO_MOROCCO': ['WAVE']
};

const RECEIVING_METHODS = {
  'FRANCE_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'BELGIUM_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GERMANY_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_FRANCE': ['BANK_TRANSFER', 'WERO', 'PAYPAL'],
  'GABON_TO_BELGIUM': ['BANK_TRANSFER', 'WERO', 'PAYPAL'],
  'GABON_TO_GERMANY': ['BANK_TRANSFER', 'WERO', 'PAYPAL'],
  'GABON_TO_CHINA': ['ALIPAY'],
  'USA_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_USA': ['ACH', 'VISA_DIRECT', 'MASTERCARD_SEND', 'PAYPAL'],
  'CANADA_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_CANADA': ['INTERAC', 'VISA_DIRECT', 'MASTERCARD_SEND', 'PAYPAL'],
  'SWITZERLAND_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_SWITZERLAND': ['BANK_TRANSFER', 'PAYPAL'],
  'UK_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_UK': ['BANK_TRANSFER', 'PAYPAL'],
  'SPAIN_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_SPAIN': ['BANK_TRANSFER', 'PAYPAL'],
  'ITALY_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_ITALY': ['BANK_TRANSFER', 'PAYPAL'],
  'NETHERLANDS_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'GABON_TO_NETHERLANDS': ['BANK_TRANSFER', 'PAYPAL'],
  'FRANCE_TO_MOROCCO': ['ORANGE_MONEY'],
  'MOROCCO_TO_FRANCE': ['BANK_TRANSFER', 'WERO', 'PAYPAL'],
  'FRANCE_TO_SENEGAL': ['WAVE'],
  'SENEGAL_TO_FRANCE': ['BANK_TRANSFER', 'WERO', 'PAYPAL'],
  'GABON_TO_MOROCCO': ['ORANGE_MONEY'],
  'MOROCCO_TO_GABON': ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  'MOROCCO_TO_SENEGAL': ['WAVE'],
  'SENEGAL_TO_MOROCCO': ['ORANGE_MONEY']
};

const METHOD_LABELS = {
  'BANK_TRANSFER': 'Virement bancaire',
  'WERO': 'Wero ou PayLib',
  'CARD': 'Carte bancaire',
  'PAYPAL': 'PayPal',
  'AIRTEL_MONEY': 'Airtel Money',
  'MOOV_MONEY': 'Moov Money',
  'CASH': 'Espèces',
  'ALIPAY': 'Alipay',
  'ACH': 'Virement ACH',
  'VISA_DIRECT': 'Visa Direct',
  'MASTERCARD_SEND': 'Mastercard Send',
  'INTERAC': 'Virement Interac',
  'ORANGE_MONEY': 'Orange Money',
  'WAVE': 'Wave'
};

const getDefaultPaymentMethod = (fromCountry: string, toCountry: string) => {
  const methods = PAYMENT_METHODS[`${fromCountry}_TO_${toCountry}`];
  if (!methods?.length) return '';
  return methods[0];
};

const getDefaultReceivingMethod = (fromCountry: string, toCountry: string) => {
  const methods = RECEIVING_METHODS[`${fromCountry}_TO_${toCountry}`];
  if (!methods?.length) return '';
  return methods[0];
};

const getDirectionFromCountries = (fromCountry: string, toCountry: string): string => {
  const countryNameMap: Record<string, string> = {
    'GA': 'GABON',
    'FR': 'FRANCE',
    'BE': 'BELGIUM',
    'DE': 'GERMANY', 
    'CN': 'CHINA',
    'US': 'USA',
    'CA': 'CANADA',
    'CH': 'SWITZERLAND',
    'GB': 'UK',
    'ES': 'SPAIN',
    'IT': 'ITALY',
    'NL': 'NETHERLANDS',
    'MA': 'MOROCCO',
    'SN': 'SENEGAL'
  };

  return `${countryNameMap[fromCountry]}_TO_${countryNameMap[toCountry]}`;
};

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  onTransferCreated
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [direction, setDirection] = useState('FRANCE_TO_GABON');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [receivingMethod, setReceivingMethod] = useState('AIRTEL_MONEY');
  const [recipientFirstName, setRecipientFirstName] = useState('');
  const [recipientLastName, setRecipientLastName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [includeWithdrawalFees, setIncludeWithdrawalFees] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<any>(null);

  // Format name with first name capitalized and last name uppercase
  const formatName = (firstName: string = '', lastName: string = '') => {
    // Split first name by spaces to handle multiple first names
    const firstNames = firstName.split(' ').map(name => 
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    ).join(' ');
    
    const formattedLastName = lastName.toUpperCase();
    return `${firstNames} ${formattedLastName}`;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
      calculateAmount();
    }
  }, [amount, direction, paymentMethod, receivingMethod, includeWithdrawalFees]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erreur lors du chargement des utilisateurs');
    }
  };

  const calculateAmount = async () => {
    try {
      const result = await calculateTransferDetails(
        Number(amount),
        direction,
        paymentMethod,
        receivingMethod,
        false,
        undefined,
        includeWithdrawalFees
      );
      
      setCalculation(result);
      setError(null);
    } catch (err) {
      console.error('Error calculating transfer:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul du transfert');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !amount || !calculation) return;

    setLoading(true);
    setError(null);

    // Vérifier le plafond hebdomadaire uniquement pour les transferts depuis le Gabon
    if (calculation.direction.startsWith('GABON_TO_')) {
      try {
        const limitCheck = await checkWeeklyTransferLimit(
          selectedUser,
          recipientFirstName,
          recipientLastName,
          recipientEmail,
          recipientPhone,
          calculation.amountSent,
          calculation.senderCurrency
        );

        if (!limitCheck.allowed) {
          setError(limitCheck.message);
          setLoading(false);
          return;
        }
      } catch (limitError) {
        console.error('Error during limit check:', limitError);
        setError('Erreur lors de la vérification des plafonds de transfert.');
        setLoading(false);
        return;
      }
    }

    // Vérification du plafond hebdomadaire
    try {
      const limitCheck = await checkWeeklyTransferLimit(
        selectedUser,
        recipientFirstName,
        recipientLastName,
        recipientEmail,
        recipientPhone,
        calculation.amountSent,
        calculation.senderCurrency
      );

      if (!limitCheck.allowed) {
        setError(limitCheck.message);
        setLoading(false);
        return;
      }
    } catch (limitError) {
      console.error('Error during limit check:', limitError);
      setError('Erreur lors de la vérification des plafonds de transfert.');
      setLoading(false);
      return;
    }

    try {
      // Create transfer
      const { data: newTransfer, error: transferError } = await supabase
        .from('transfers')
        .insert([{
          reference: `KP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          user_id: selectedUser,
          amount_sent: calculation.amountSent,
          fees: calculation.fees,
          kundapay_fees: calculation.kundapayFees,
          withdrawal_fees: calculation.withdrawalFees || 0,
          withdrawal_fees_included: includeWithdrawalFees,
          amount_received: calculation.amountReceived,
          sender_currency: calculation.senderCurrency,
          receiver_currency: calculation.receiverCurrency,
          payment_method: paymentMethod,
          receiving_method: receivingMethod,
          direction,
          status: 'pending',
          funds_origin: 'admin_created',
          transfer_reason: 'admin_created',
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (transferError) throw transferError;

      // Create beneficiary
      const { error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .insert([{
          transfer_id: newTransfer.id,
          user_id: selectedUser,
          first_name: recipientFirstName,
          last_name: recipientLastName,
          email: recipientEmail,
          payment_details: {
            phone: recipientPhone,
            withdrawalFeesIncluded: includeWithdrawalFees
          }
        }]);

      if (beneficiaryError) throw beneficiaryError;

      onTransferCreated();
      onClose();
    } catch (err) {
      console.error('Error creating transfer:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du transfert');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Créer un transfert</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sélection de l'utilisateur */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Utilisateur
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              required
            >
              <option value="">Sélectionner un utilisateur</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({formatName(user.first_name, user.last_name)})
                </option>
              ))}
            </select>
          </div>

          {/* Direction du transfert */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Direction
            </label>
            <select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                // Reset payment and receiving methods when direction changes
                setPaymentMethod(PAYMENT_METHODS[e.target.value][0]);
                setReceivingMethod(RECEIVING_METHODS[e.target.value][0]);
                // Reset withdrawal fees checkbox when direction changes
                setIncludeWithdrawalFees(false);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              required
            >
              {DIRECTIONS.map((dir) => (
                <option key={dir.value} value={dir.value}>
                  {dir.label}
                </option>
              ))}
            </select>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Montant à envoyer
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* Méthode de paiement */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Méthode de paiement
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              required
            >
              {PAYMENT_METHODS[direction]?.map((method) => (
                <option key={method} value={method}>
                  {METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>

          {/* Méthode de réception */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Méthode de réception
            </label>
            <select
              value={receivingMethod}
              onChange={(e) => setReceivingMethod(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              required
            >
              {RECEIVING_METHODS[direction]?.map((method) => (
                <option key={method} value={method}>
                  {METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>

          {/* Option pour inclure les frais de retrait */}
          {(receivingMethod === 'AIRTEL_MONEY' || receivingMethod === 'MOOV_MONEY') && (
            <div className="flex items-center">
              <input
                id="includeWithdrawalFees"
                type="checkbox"
                checked={includeWithdrawalFees}
                onChange={(e) => setIncludeWithdrawalFees(e.target.checked)}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <label htmlFor="includeWithdrawalFees" className="ml-2 block text-sm text-gray-900">
                Inclure les frais de retrait {receivingMethod === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Moov Money'}
              </label>
            </div>
          )}

          {/* Informations du bénéficiaire */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Bénéficiaire</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Prénom
                </label>
                <input
                  type="text"
                  value={recipientFirstName}
                  onChange={(e) => setRecipientFirstName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <input
                  type="text"
                  value={recipientLastName}
                  onChange={(e) => setRecipientLastName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                required
              />
            </div>
          </div>

          {/* Détails du transfert */}
          {calculation && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Détails du transfert</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant envoyé</span>
                  <span className="font-medium">
                    {calculation.amountSent.toLocaleString()} {calculation.senderCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Frais</span>
                  <span className="font-medium">
                    {calculation.fees.toLocaleString()} {calculation.senderCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant reçu</span>
                  <span className="font-medium text-green-600">
                    {calculation.amountReceived.toLocaleString()} {calculation.receiverCurrency}
                  </span>
                </div>
                
                {/* Détails des frais de retrait si inclus */}
                {includeWithdrawalFees && (receivingMethod === 'AIRTEL_MONEY' || receivingMethod === 'MOOV_MONEY') && (
                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <p className="text-sm text-green-600">
                      ✓ Frais de retrait {receivingMethod === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Moov Money'} inclus
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !calculation}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le transfert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTransferModal;