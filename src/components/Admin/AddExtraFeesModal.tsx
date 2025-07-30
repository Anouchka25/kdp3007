import React, { useState, useEffect } from 'react';
import { X, DollarSign, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdditionalFee {
  id?: string;
  amount: number;
  currency: string;
  description: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface AddExtraFeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: any;
  onFeesAdded: () => void;
}

const AddExtraFeesModal: React.FC<AddExtraFeesModalProps> = ({
  isOpen,
  onClose,
  transfer,
  onFeesAdded
}) => {
  const [withdrawalFees, setWithdrawalFees] = useState<string>(
    transfer.withdrawal_fees ? transfer.withdrawal_fees.toString() : '0'
  );
  const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingFees, setFetchingFees] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conversion rates
  const conversionRates = {
    'XAF_EUR': 1 / 655.96, // 1 XAF = 0.001524 EUR
    'EUR_XAF': 655.96,     // 1 EUR = 655.96 XAF
    'XAF_USD': 1 / 610.35, // 1 XAF = 0.001638 USD
    'USD_XAF': 610.35,     // 1 USD = 610.35 XAF
    'XAF_CNY': 0.011445,   // 1 XAF = 0.011445 CNY
    'CNY_XAF': 87.34       // 1 CNY = 87.34 XAF
  };

  useEffect(() => {
    if (isOpen && transfer) {
      fetchAdditionalFees();
    }
  }, [isOpen, transfer]);

  const fetchAdditionalFees = async () => {
    setFetchingFees(true);
    try {
      const { data, error } = await supabase
        .from('additional_fees')
        .select('*')
        .eq('transfer_id', transfer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAdditionalFees(data || []);
    } catch (err) {
      console.error('Error fetching additional fees:', err);
      setError('Erreur lors du chargement des frais annexes');
    } finally {
      setFetchingFees(false);
    }
  };

  // Convert amount from one currency to another
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    const conversionKey = `${fromCurrency}_${toCurrency}`;
    const rate = conversionRates[conversionKey];
    
    if (!rate) {
      console.error(`Conversion rate not found for ${conversionKey}`);
      return amount;
    }
    
    return amount * rate;
  };

  const handleAddFee = () => {
    setAdditionalFees([
      ...additionalFees,
      {
        amount: 0,
        currency: transfer.sender_currency, // Utiliser la même devise que le transfert par défaut
        description: '',
        isNew: true
      }
    ]);
  };

  const handleFeeChange = (index: number, field: keyof AdditionalFee, value: any) => {
    const updatedFees = [...additionalFees];
    updatedFees[index][field] = value;
    setAdditionalFees(updatedFees);
  };

  const handleDeleteFee = (index: number) => {
    const updatedFees = [...additionalFees];
    
    // If it's an existing fee, mark it for deletion
    if (updatedFees[index].id) {
      updatedFees[index].isDeleted = true;
    } else {
      // If it's a new fee, remove it from the array
      updatedFees.splice(index, 1);
    }
    
    setAdditionalFees(updatedFees);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse withdrawal fees
      const newWithdrawalFees = parseFloat(withdrawalFees) || 0;
      
      // Get current KundaPay fees
      const kundapayFees = transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0)) || 0;
      
      // Calculate total fees
      const totalFees = kundapayFees + newWithdrawalFees;

      // Update the transfer with new withdrawal fees
      const { error: updateError } = await supabase
        .from('transfers')
        .update({
          withdrawal_fees: newWithdrawalFees,
          kundapay_fees: kundapayFees, // Keep KundaPay fees separate
          fees: totalFees,
          withdrawal_fees_included: newWithdrawalFees > 0
        })
        .eq('id', transfer.id);

      if (updateError) throw updateError;

      // Handle additional fees
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Utilisateur non connecté');

      // Process each additional fee
      for (const fee of additionalFees) {
        // Skip deleted fees that don't have an ID (they were never saved)
        if (fee.isDeleted && !fee.id) continue;
        
        if (fee.isDeleted && fee.id) {
          // Delete existing fee
          const { error: deleteError } = await supabase
            .from('additional_fees')
            .delete()
            .eq('id', fee.id);
            
          if (deleteError) throw deleteError;
        } else if (fee.isNew || !fee.id) {
          // Insert new fee
          const { error: insertError } = await supabase
            .from('additional_fees')
            .insert([{
              transfer_id: transfer.id,
              amount: fee.amount,
              currency: fee.currency,
              description: fee.description,
              added_by: user.id
            }]);
            
          if (insertError) throw insertError;
          
          // Create notification for the new fee
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert([{
              type: 'fee_update',
              transfer_id: transfer.id,
              recipient_id: transfer.user_id,
              message: `Des frais annexes de ${fee.amount.toLocaleString('fr-FR')} ${fee.currency} ont été ajoutés à votre transfert ${transfer.reference}: ${fee.description}`,
              status: 'pending'
            }]);

          if (notificationError) {
            console.error('Error creating notification:', notificationError);
          }
        } else {
          // Update existing fee
          const { error: updateFeeError } = await supabase
            .from('additional_fees')
            .update({
              amount: fee.amount,
              currency: fee.currency,
              description: fee.description
            })
            .eq('id', fee.id);
            
          if (updateFeeError) throw updateFeeError;
        }
      }

      onFeesAdded();
      onClose();
    } catch (err) {
      console.error('Error updating fees:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la mise à jour des frais');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total additional fees in transfer currency
  const calculateTotalAdditionalFees = () => {
    return additionalFees
      .filter(fee => !fee.isDeleted)
      .reduce((total, fee) => {
        const convertedAmount = fee.currency === transfer.sender_currency
          ? fee.amount
          : convertCurrency(fee.amount, fee.currency, transfer.sender_currency);
        return total + convertedAmount;
      }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gérer les frais du transfert</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Informations du transfert</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Référence</p>
                <p className="font-medium">{transfer.reference}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Montant</p>
                <p className="font-medium">{transfer.amount_sent.toLocaleString('fr-FR')} {transfer.sender_currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Direction</p>
                <p className="font-medium">{transfer.direction}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                <p className="font-medium">{transfer.status}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Frais de retrait</h3>
            <div>
              <label htmlFor="withdrawalFees" className="block text-sm font-medium text-gray-700">
                Frais de retrait {transfer.receiving_method === 'AIRTEL_MONEY' ? 'Airtel Money' : 
                                transfer.receiving_method === 'MOOV_MONEY' ? 'Moov Money' : ''}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  id="withdrawalFees"
                  value={withdrawalFees}
                  onChange={(e) => setWithdrawalFees(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
                  step="0.01"
                  min="0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">{transfer.sender_currency}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Ces frais sont payés par le client et ne sont pas déduits des revenus KundaPay.
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Frais annexes</h3>
              <button
                type="button"
                onClick={handleAddFee}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </button>
            </div>

            {fetchingFees ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {additionalFees.length === 0 || additionalFees.every(fee => fee.isDeleted) ? (
                  <p className="text-sm text-gray-500 italic">Aucun frais annexe pour ce transfert</p>
                ) : (
                  additionalFees
                    .filter(fee => !fee.isDeleted)
                    .map((fee, index) => (
                      <div key={fee.id || `new-${index}`} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">Frais annexe {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleDeleteFee(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Montant
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                              <input
                                type="number"
                                value={fee.amount}
                                onChange={(e) => handleFeeChange(index, 'amount', parseFloat(e.target.value) || 0)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Devise
                            </label>
                            <select
                              value={fee.currency}
                              onChange={(e) => handleFeeChange(index, 'currency', e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
                            >
                              <option value="XAF">XAF (FCFA)</option>
                              <option value="EUR">EUR (€)</option>
                              <option value="USD">USD ($)</option>
                              <option value="CNY">CNY (¥)</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <input
                              type="text"
                              value={fee.description}
                              onChange={(e) => handleFeeChange(index, 'description', e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
                              placeholder="Ex: Frais de traitement supplémentaires"
                            />
                          </div>
                          {fee.currency !== transfer.sender_currency && (
                            <div className="md:col-span-2 text-sm text-gray-500">
                              Équivalent: {convertCurrency(fee.amount, fee.currency, transfer.sender_currency).toLocaleString('fr-FR')} {transfer.sender_currency}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 p-4 rounded-md">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-yellow-500 mr-2" />
              <h3 className="text-sm font-medium text-yellow-800">Récapitulatif des frais</h3>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Frais KundaPay:</span>
                <span>{(transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0)) || 0).toLocaleString('fr-FR')} {transfer.sender_currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Frais de retrait:</span>
                <span>{parseFloat(withdrawalFees || '0').toLocaleString('fr-FR')} {transfer.sender_currency}</span>
              </div>
              {additionalFees.filter(fee => !fee.isDeleted).length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Frais annexes:</span>
                  <span>{calculateTotalAdditionalFees().toLocaleString('fr-FR')} {transfer.sender_currency}</span>
                </div>
              )}
              <div className="border-t border-yellow-200 pt-1 mt-1">
                <div className="flex justify-between text-sm font-bold">
                  <span>Total des frais:</span>
                  <span>
                    {((transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0)) || 0) + 
                      parseFloat(withdrawalFees || '0')).toLocaleString('fr-FR')} {transfer.sender_currency}
                  </span>
                </div>
              </div>
              <div className="pt-1 mt-1">
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Revenus nets KundaPay:</span>
                  <span>
                    {((transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0)) || 0) - 
                      calculateTotalAdditionalFees()).toLocaleString('fr-FR')} {transfer.sender_currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour les frais'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExtraFeesModal;