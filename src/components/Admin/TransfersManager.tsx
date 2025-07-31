import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Check, X, Eye, Plus, Edit, DollarSign, AlertCircle, MessageCircle, Send } from 'lucide-react';
import { sendTransferStatusEmail } from '../../lib/onesignal';
import CreateTransferModal from './CreateTransferModal';
import AddExtraFeesModal from './AddExtraFeesModal';

interface Transfer {
  id: string;
  reference: string;
  created_at: string;
  amount_sent: number;
  amount_received: number;
  sender_currency: string;
  receiver_currency: string;
  payment_method: string;
  receiving_method: string;
  funds_origin: string;
  transfer_reason: string;
  status: string;
  kundapay_fees: number;
  withdrawal_fees: number;
  withdrawal_fees_included: boolean;
  fees: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  beneficiaries: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_id: string;
    payment_details: any;
    transfer_id: string;
  }>;
  additional_fees?: Array<{
    id: string;
    amount: number;
    currency: string;
    description: string;
    created_at: string;
    transfer_id: string;
  }>;
}

const TransfersManager = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtraFeesModal, setShowExtraFeesModal] = useState(false);
  const [processingTransfer, setProcessingTransfer] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [hasAdditionalFeesFilter, setHasAdditionalFeesFilter] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  // Format name with first name capitalized and last name uppercase
  const formatName = (firstName: string = '', lastName: string = '') => {
    // Split first name by spaces to handle multiple first names
    const firstNames = firstName.split(' ').map(name => 
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    ).join(' ');
    
    const formattedLastName = lastName.toUpperCase();
    return `${firstNames} ${formattedLastName}`;
  };

  // Format date with time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchTransfers();
    checkAdminStatus();
  }, [statusFilter, directionFilter, hasAdditionalFeesFilter]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setIsAdmin(userData?.is_admin || false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('transfers')
        .select(`
          *,
          user:users!transfers_user_id_fkey (
            id, email, first_name, last_name
          ),
          beneficiaries (
            id, first_name, last_name, email, user_id, payment_details
          ),
          additional_fees(
            id, amount, currency, description, created_at, transfer_id
          )
        `)
        .order('created_at', { ascending: false });

      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply direction filter if not 'all'
      if (directionFilter !== 'all') {
        query = query.eq('direction', directionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter by additional fees if needed
      let filteredData = data || [];
      if (hasAdditionalFeesFilter !== 'all') {
        filteredData = filteredData.filter(transfer => {
          const hasAdditionalFees = transfer.additional_fees && transfer.additional_fees.length > 0;
          return hasAdditionalFeesFilter === 'yes' ? hasAdditionalFees : !hasAdditionalFees;
        });
      }

      console.log('Transfers data:', filteredData);
      setTransfers(filteredData);
    } catch (err) {
      console.error('Error fetching transfers:', err);
      setError('Erreur lors du chargement des transferts');
    } finally {
      setLoading(false);
    }
  };

  const executeAirtelTransfer = async (transferId: string) => {
    try {
      setProcessingTransfer(transferId);
      setError(null);

      const response = await fetch('/api/execute-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transfer_id: transferId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'exécution du transfert');
      }

      await fetchTransfers();
      alert('Transfert exécuté avec succès');
    } catch (err) {
      console.error('Error executing transfer:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'exécution du transfert');
      alert('Erreur lors de l\'exécution du transfert');
    } finally {
      setProcessingTransfer(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'completed' | 'cancelled') => {
    try {
      setProcessingTransfer(id);
      setError(null);
      
      // Get the current user for validation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autorisé');

      // Update the transfer status
      const { error: updateError } = await supabase
        .from('transfers')
        .update({ 
          status: newStatus,
          validated_at: new Date().toISOString(),
          validated_by: user.id
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Get transfer details for notification
      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .select(`
          *,
          user:users!transfers_user_id_fkey (id, email, first_name, last_name, onesignal_id),
          beneficiaries (first_name, last_name, email, user_id)
        `)
        .eq('id', id)
        .single();

      if (transferError) throw transferError;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          type: 'transfer_status',
          transfer_id: id,
          recipient_id: transfer.user.id,
          message: `Votre transfert ${transfer.reference} a été ${newStatus === 'completed' ? 'validé' : 'annulé'}`,
          status: 'pending'
        }]);

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      try {
        // Send email notification
        await sendTransferStatusEmail(id, newStatus);
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Continue even if email fails
      }

      // Refresh the transfers list
      await fetchTransfers();

      // Show success message
      alert(newStatus === 'completed' ? 'Transfert validé avec succès' : 'Transfert annulé avec succès');
    } catch (err) {
      console.error('Error updating transfer status:', err);
      setError('Erreur lors de la mise à jour du statut');
      alert('Une erreur est survenue lors de la mise à jour du statut');
    } finally {
      setProcessingTransfer(null);
    }
  };

  const getPaymentMethodDisplay = (method: string) => {
    const methods: { [key: string]: string } = {
      'BANK_TRANSFER': 'Virement bancaire',
      'AIRTEL_MONEY': 'Airtel Money',
      'MOOV_MONEY': 'Moov Money',
      'CASH': 'Espèces',
      'ALIPAY': 'Alipay',
      'CARD': 'Carte bancaire',
      'ACH': 'Virement ACH',
      'PAYPAL': 'PayPal',
      'WERO': 'Wero',
      'VISA_DIRECT': 'Visa Direct',
      'MASTERCARD_SEND': 'Mastercard Send',
      'INTERAC': 'Interac',
      'ORANGE_MONEY': 'Orange Money',
      'WAVE': 'Wave'
    };
    return methods[method] || method;
  };

  const getFundsOriginDisplay = (origin: string) => {
    const origins: { [key: string]: string } = {
      'salary': 'Salaire',
      'savings': 'Épargne',
      'business': 'Revenus d\'entreprise',
      'investment': 'Investissements',
      'gift': 'Don',
      'other': 'Autre',
      'admin_created': 'Créé par l\'administrateur'
    };
    return origins[origin] || origin || 'Non spécifié';
  };

  const getTransferReasonDisplay = (reason: string) => {
    const reasons: { [key: string]: string } = {
      'family_support': 'Soutien familial',
      'business': 'Affaires',
      'education': 'Éducation',
      'medical': 'Frais médicaux',
      'travel': 'Voyage',
      'other': 'Autre',
      'admin_created': 'Créé par l\'administrateur'
    };
    return reasons[reason] || reason || 'Non spécifié';
  };

  const getDirectionLabel = (direction: string) => {
    const directions: Record<string, string> = {
      'FRANCE_TO_GABON': 'France → Gabon',
      'GABON_TO_FRANCE': 'Gabon → France',
      'GABON_TO_CHINA': 'Gabon → Chine',
      'USA_TO_GABON': 'États-Unis → Gabon',
      'GABON_TO_USA': 'Gabon → États-Unis',
      'CANADA_TO_GABON': 'Canada → Gabon',
      'GABON_TO_CANADA': 'Gabon → Canada',
      'BELGIUM_TO_GABON': 'Belgique → Gabon',
      'GABON_TO_BELGIUM': 'Gabon → Belgique',
      'GERMANY_TO_GABON': 'Allemagne → Gabon',
      'GABON_TO_GERMANY': 'Gabon → Allemagne',
      'SWITZERLAND_TO_GABON': 'Suisse → Gabon',
      'GABON_TO_SWITZERLAND': 'Gabon → Suisse',
      'UK_TO_GABON': 'Royaume-Uni → Gabon',
      'GABON_TO_UK': 'Gabon → Royaume-Uni',
      'SPAIN_TO_GABON': 'Espagne → Gabon',
      'GABON_TO_SPAIN': 'Gabon → Espagne',
      'ITALY_TO_GABON': 'Italie → Gabon',
      'GABON_TO_ITALY': 'Gabon → Italie',
      'NETHERLANDS_TO_GABON': 'Pays-Bas → Gabon',
      'GABON_TO_NETHERLANDS': 'Gabon → Pays-Bas',
      'FRANCE_TO_MOROCCO': 'France → Maroc',
      'MOROCCO_TO_FRANCE': 'Maroc → France',
      'FRANCE_TO_SENEGAL': 'France → Sénégal',
      'SENEGAL_TO_FRANCE': 'Sénégal → France',
      'GABON_TO_MOROCCO': 'Gabon → Maroc',
      'MOROCCO_TO_GABON': 'Maroc → Gabon',
      'MOROCCO_TO_SENEGAL': 'Maroc → Sénégal',
      'SENEGAL_TO_MOROCCO': 'Sénégal → Maroc'
    };
    return directions[direction] || direction;
  };

  // Calculate total additional fees for a transfer
  const calculateTotalAdditionalFees = (transfer: Transfer) => {
    if (!transfer.additional_fees || transfer.additional_fees.length === 0) {
      return 0;
    }
    
    return transfer.additional_fees.reduce((total, fee) => {
      // Convert to transfer currency if needed
      if (fee.currency === transfer.sender_currency) {
        return total + fee.amount;
      }
      
      // Convert from fee currency to transfer currency
      let rate = 1;
      if (fee.currency === 'XAF' && transfer.sender_currency === 'EUR') {
        rate = 1 / 655.96;
      } else if (fee.currency === 'EUR' && transfer.sender_currency === 'XAF') {
        rate = 655.96;
      } else if (fee.currency === 'USD' && transfer.sender_currency === 'XAF') {
        rate = 610.35;
      } else if (fee.currency === 'XAF' && transfer.sender_currency === 'USD') {
        rate = 1 / 610.35;
      } else if (fee.currency === 'CHF' && transfer.sender_currency === 'XAF') {
        rate = 730.45;
      } else if (fee.currency === 'XAF' && transfer.sender_currency === 'CHF') {
        rate = 1 / 730.45;
      } else if (fee.currency === 'GBP' && transfer.sender_currency === 'XAF') {
        rate = 820.50;
      } else if (fee.currency === 'XAF' && transfer.sender_currency === 'GBP') {
        rate = 1 / 820.50;
      }
      
      return total + (fee.amount * rate);
    }, 0);
  };

  // Generate WhatsApp message for a transfer
  const getWhatsAppMessage = (transfer: Transfer) => {
    const beneficiary = transfer.beneficiaries && transfer.beneficiaries.length > 0 
      ? transfer.beneficiaries[0] 
      : null;
    
    const beneficiaryName = beneficiary 
      ? `${beneficiary.first_name} ${beneficiary.last_name}` 
      : 'Non spécifié';
    
    const beneficiaryPhone = beneficiary?.payment_details?.phone || 'Non spécifié';
    
    const message = `📦 Nouveau transfert à traiter :

Référence : ${transfer.reference}

Montant envoyé : ${transfer.amount_sent.toLocaleString('fr-FR')} ${transfer.sender_currency}

Numéro : ${beneficiaryPhone}

Bénéficiaire : ${beneficiaryName}

Frais de retrait ${transfer.receiving_method === 'AIRTEL_MONEY' ? 'Airtel' : 'Moov'} : ${transfer.withdrawal_fees_included ? 'Oui' : 'Non'}

Mode de paiement : ${getPaymentMethodDisplay(transfer.payment_method)}`;

    // Encode the message for URL
    return encodeURIComponent(message);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Transferts</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Créer un transfert
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="directionFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Direction
            </label>
            <select
              id="directionFilter"
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
            >
              <option value="all">Toutes les directions</option>
              <option value="FRANCE_TO_GABON">France → Gabon</option>
              <option value="GABON_TO_FRANCE">Gabon → France</option>
              <option value="GABON_TO_CHINA">Gabon → Chine</option>
              <option value="USA_TO_GABON">USA → Gabon</option>
              <option value="GABON_TO_USA">Gabon → USA</option>
              <option value="CANADA_TO_GABON">Canada → Gabon</option>
              <option value="GABON_TO_CANADA">Gabon → Canada</option>
              <option value="BELGIUM_TO_GABON">Belgique → Gabon</option>
              <option value="GABON_TO_BELGIUM">Gabon → Belgique</option>
              <option value="GERMANY_TO_GABON">Allemagne → Gabon</option>
              <option value="GABON_TO_GERMANY">Gabon → Allemagne</option>
              <option value="SWITZERLAND_TO_GABON">Suisse → Gabon</option>
              <option value="GABON_TO_SWITZERLAND">Gabon → Suisse</option>
              <option value="UK_TO_GABON">Royaume-Uni → Gabon</option>
              <option value="GABON_TO_UK">Gabon → Royaume-Uni</option>
              <option value="SPAIN_TO_GABON">Espagne → Gabon</option>
              <option value="GABON_TO_SPAIN">Gabon → Espagne</option>
              <option value="ITALY_TO_GABON">Italie → Gabon</option>
              <option value="GABON_TO_ITALY">Gabon → Italie</option>
              <option value="NETHERLANDS_TO_GABON">Pays-Bas → Gabon</option>
              <option value="GABON_TO_NETHERLANDS">Gabon → Pays-Bas</option>
              <option value="FRANCE_TO_MOROCCO">France → Maroc</option>
              <option value="MOROCCO_TO_FRANCE">Maroc → France</option>
              <option value="FRANCE_TO_SENEGAL">France → Sénégal</option>
              <option value="SENEGAL_TO_FRANCE">Sénégal → France</option>
              <option value="GABON_TO_MOROCCO">Gabon → Maroc</option>
              <option value="MOROCCO_TO_GABON">Maroc → Gabon</option>
              <option value="MOROCCO_TO_SENEGAL">Maroc → Sénégal</option>
              <option value="SENEGAL_TO_MOROCCO">Sénégal → Maroc</option>
            </select>
          </div>

          <div>
            <label htmlFor="hasAdditionalFeesFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Frais annexes
            </label>
            <select
              id="hasAdditionalFeesFilter"
              value={hasAdditionalFeesFilter}
              onChange={(e) => setHasAdditionalFeesFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
            >
              <option value="all">Tous les transferts</option>
              <option value="yes">Avec frais annexes</option>
              <option value="no">Sans frais annexes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow-md rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Référence
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expéditeur
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bénéficiaire
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frais
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transfer.reference}
                      {transfer.additional_fees && transfer.additional_fees.length > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Frais annexes
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(transfer.created_at)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatName(transfer.user?.first_name, transfer.user?.last_name)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.beneficiaries && transfer.beneficiaries.length > 0 ? 
                        formatName(transfer.beneficiaries[0]?.first_name || '', transfer.beneficiaries[0]?.last_name || '') : 
                        <span className="text-gray-400 italic">Non spécifié</span>}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.amount_sent.toLocaleString('fr-FR')} {transfer.sender_currency}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(transfer.kundapay_fees || transfer.fees).toLocaleString('fr-FR')} {transfer.sender_currency}
                      {transfer.withdrawal_fees > 0 && (
                        <span className="text-xs text-gray-500 block">
                          +{transfer.withdrawal_fees.toLocaleString('fr-FR')} (retrait)
                        </span>
                      )}
                      {transfer.additional_fees && transfer.additional_fees.length > 0 && (
                        <span className="text-xs text-blue-600 font-medium block">
                          +{calculateTotalAdditionalFees(transfer).toLocaleString('fr-FR')} (annexes)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        transfer.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transfer.status === 'completed' ? 'Terminé' :
                         transfer.status === 'pending' ? 'En attente' :
                         transfer.status === 'cancelled' ? 'Annulé' :
                         transfer.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {transfer.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                if (window.confirm('Êtes-vous sûr de vouloir valider ce transfert ?')) {
                                  handleStatusChange(transfer.id, 'completed');
                                }
                              }}
                              className="p-1 text-green-600 hover:text-green-900 rounded-full hover:bg-green-50"
                              title="Valider"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Êtes-vous sûr de vouloir annuler ce transfert ?')) {
                                  handleStatusChange(transfer.id, 'cancelled');
                                }
                              }}
                              className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
                              title="Annuler"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setShowExtraFeesModal(false);
                          }}
                          className="p-1 text-yellow-600 hover:text-yellow-900 rounded-full hover:bg-yellow-50"
                          title="Voir les détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setShowExtraFeesModal(true);
                          }}
                          className={`p-1 rounded-full hover:bg-blue-50 ${
                            transfer.additional_fees && transfer.additional_fees.length > 0 
                              ? 'text-blue-600 hover:text-blue-900' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          title={transfer.additional_fees && transfer.additional_fees.length > 0 
                            ? "Modifier les frais annexes" 
                            : "Ajouter des frais annexes"}
                        >
                          <DollarSign className="h-5 w-5" />
                        </button>
                        {isAdmin && (
                          <a
                            href={`https://wa.me/24174476095?text=${getWhatsAppMessage(transfer)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-green-600 hover:text-green-900 rounded-full hover:bg-green-50"
                            title="Envoyer sur WhatsApp"
                          >
                            <MessageCircle className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile-friendly version */}
      <div className="md:hidden mt-6 space-y-4">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">{transfer.reference}</span>
                {transfer.additional_fees && transfer.additional_fees.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Frais annexes
                  </span>
                )}
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                transfer.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {transfer.status === 'completed' ? 'Terminé' :
                 transfer.status === 'pending' ? 'En attente' :
                 transfer.status === 'cancelled' ? 'Annulé' :
                 transfer.status}
              </span>
            </div>
            
            <div className="text-sm text-gray-500 mb-2">
              {formatDateTime(transfer.created_at)}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div className="text-xs text-gray-500">Expéditeur</div>
                <div className="text-sm font-medium">
                  {formatName(transfer.user?.first_name, transfer.user?.last_name)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500">Bénéficiaire</div>
                <div className="text-sm font-medium">
                  {transfer.beneficiaries && transfer.beneficiaries.length > 0 ? 
                    formatName(transfer.beneficiaries[0]?.first_name || '', transfer.beneficiaries[0]?.last_name || '') : 
                    <span className="text-gray-400 italic">Non spécifié</span>}
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs text-gray-500">Montant</div>
              <div className="text-sm font-medium">
                {transfer.amount_sent.toLocaleString('fr-FR')} {transfer.sender_currency}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs text-gray-500">Frais</div>
              <div className="text-sm font-medium">
                {(transfer.kundapay_fees || transfer.fees).toLocaleString('fr-FR')} {transfer.sender_currency}
                {transfer.withdrawal_fees > 0 && (
                  <span className="text-xs text-gray-500 block">
                    +{transfer.withdrawal_fees.toLocaleString('fr-FR')} (retrait)
                  </span>
                )}
                {transfer.additional_fees && transfer.additional_fees.length > 0 && (
                  <span className="text-xs text-blue-600 font-medium block">
                    +{calculateTotalAdditionalFees(transfer).toLocaleString('fr-FR')} (annexes)
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              {transfer.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      if (window.confirm('Êtes-vous sûr de vouloir valider ce transfert ?')) {
                        handleStatusChange(transfer.id, 'completed');
                      }
                    }}
                    className="p-2 text-green-600 hover:text-green-900 rounded-full hover:bg-green-50"
                    title="Valider"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Êtes-vous sûr de vouloir annuler ce transfert ?')) {
                        handleStatusChange(transfer.id, 'cancelled');
                      }
                    }}
                    className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
                    title="Annuler"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setSelectedTransfer(transfer);
                  setShowExtraFeesModal(false);
                }}
                className="p-2 text-yellow-600 hover:text-yellow-900 rounded-full hover:bg-yellow-50"
                title="Voir les détails"
              >
                <Eye className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setSelectedTransfer(transfer);
                  setShowExtraFeesModal(true);
                }}
                className={`p-2 rounded-full hover:bg-blue-50 ${
                  transfer.additional_fees && transfer.additional_fees.length > 0 
                    ? 'text-blue-600 hover:text-blue-900' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title={transfer.additional_fees && transfer.additional_fees.length > 0 
                  ? "Modifier les frais annexes" 
                  : "Ajouter des frais annexes"}
              >
                <DollarSign className="h-5 w-5" />
              </button>
              <a
                href={`https://wa.me/24174476095?text=${getWhatsAppMessage(transfer)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-green-600 hover:text-green-900 rounded-full hover:bg-green-50"
                title="Envoyer sur WhatsApp"
              >
                <Send className="h-5 w-5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal des détails */}
      {selectedTransfer && !showExtraFeesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Détails du transfert {selectedTransfer.reference}
            </h3>
            
            <div className="space-y-6">
              {/*  Informations de l'expéditeur */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Expéditeur</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p><span className="font-medium">Nom :</span> {formatName(selectedTransfer.user?.first_name, selectedTransfer.user?.last_name)}</p>
                  <p><span className="font-medium">Email :</span> {selectedTransfer.user?.email}</p>
                </div>
              </div>

              {/* Informations du bénéficiaire */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Bénéficiaire</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedTransfer.beneficiaries && selectedTransfer.beneficiaries.length > 0 ? (
                    <>
                      <p><span className="font-medium">Nom :</span> {formatName(
                        selectedTransfer.beneficiaries[0]?.first_name || '',
                        selectedTransfer.beneficiaries[0]?.last_name || ''
                      )}</p>
                      {selectedTransfer.beneficiaries[0]?.email && (
                        <p><span className="font-medium">Email :</span> {selectedTransfer.beneficiaries[0].email}</p>
                      )}
                      
                      {/* Détails de paiement spécifiques */}
                      {selectedTransfer.beneficiaries[0]?.payment_details?.phone && (
                        <p><span className="font-medium">Téléphone :</span> {selectedTransfer.beneficiaries[0].payment_details.phone}</p>
                      )}
                      {selectedTransfer.beneficiaries[0]?.payment_details?.alipayId && (
                        <p><span className="font-medium">ID Alipay :</span> {selectedTransfer.beneficiaries[0].payment_details.alipayId}</p>
                      )}
                      {selectedTransfer.beneficiaries[0]?.payment_details?.weroName && (
                        <p><span className="font-medium">Nom Wero :</span> {selectedTransfer.beneficiaries[0].payment_details.weroName}</p>
                      )}
                      
                      {/* Adresse si disponible */}
                      {selectedTransfer.beneficiaries[0]?.payment_details?.address && (
                        <div className="mt-2">
                          <p className="font-medium">Adresse :</p>
                          <p>{selectedTransfer.beneficiaries[0].payment_details.address.street}</p>
                          <p>{selectedTransfer.beneficiaries[0].payment_details.address.city}, {selectedTransfer.beneficiaries[0].payment_details.address.state} {selectedTransfer.beneficiaries[0].payment_details.address.zipCode}</p>
                        </div>
                      )}
                      
                      {/* Détails bancaires si disponibles */}
                      {selectedTransfer.beneficiaries[0]?.payment_details?.bankDetails && (
                        <div className="mt-2">
                          <p className="font-medium">Informations bancaires :</p>
                          <p>Banque : {selectedTransfer.beneficiaries[0].payment_details.bankDetails.bankName}</p>
                          <p>Compte : {selectedTransfer.beneficiaries[0].payment_details.bankDetails.accountNumber}</p>
                          {selectedTransfer.beneficiaries[0].payment_details.bankDetails.routingNumber && (
                            <p>Routing : {selectedTransfer.beneficiaries[0].payment_details.bankDetails.routingNumber}</p>
                          )}
                          {selectedTransfer.beneficiaries[0].payment_details.bankDetails.swiftCode && (
                            <p>SWIFT/BIC : {selectedTransfer.beneficiaries[0].payment_details.bankDetails.swiftCode}</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">Aucune information de bénéficiaire disponible</p>
                  )}
                </div>
              </div>

              {/* Détails du transfert */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Détails du transfert</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><span className="font-medium">Montant envoyé :</span> {selectedTransfer.amount_sent.toLocaleString('fr-FR')} {selectedTransfer.sender_currency}</p>
                      <p><span className="font-medium">Montant reçu :</span> {selectedTransfer.amount_received.toLocaleString('fr-FR')} {selectedTransfer.receiver_currency}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Mode de paiement :</span> {getPaymentMethodDisplay(selectedTransfer.payment_method)}</p>
                      <p><span className="font-medium">Mode de réception :</span> {getPaymentMethodDisplay(selectedTransfer.receiving_method)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p><span className="font-medium">Origine des fonds :</span> {getFundsOriginDisplay(selectedTransfer.funds_origin)}</p>
                    <p><span className="font-medium">Raison du transfert :</span> {getTransferReasonDisplay(selectedTransfer.transfer_reason)}</p>
                  </div>
                  
                  {/* Détails des frais */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="font-medium">Détails des frais :</p>
                    <p>Frais KundaPay : {selectedTransfer.kundapay_fees ? selectedTransfer.kundapay_fees.toLocaleString('fr-FR') : selectedTransfer.fees.toLocaleString('fr-FR')} {selectedTransfer.sender_currency}</p>
                    
                    {/* Frais de retrait Airtel/Moov Money */}
                    {(selectedTransfer.receiving_method === 'AIRTEL_MONEY' || selectedTransfer.receiving_method === 'MOOV_MONEY') && (
                      <div className="mt-2">
                        <p>
                          <span className="font-medium">Frais de retrait {selectedTransfer.receiving_method === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Moov Money'} :</span> 
                          {selectedTransfer.withdrawal_fees_included || (selectedTransfer.beneficiaries && selectedTransfer.beneficiaries.length > 0 && selectedTransfer.beneficiaries[0]?.payment_details?.withdrawalFeesIncluded) ? (
                            <span className="text-green-600 ml-2">Inclus dans le transfert ({selectedTransfer.withdrawal_fees ? selectedTransfer.withdrawal_fees.toLocaleString('fr-FR') : '0'} {selectedTransfer.sender_currency})</span>
                          ) : (
                            <span className="text-yellow-600 ml-2">Non inclus (à la charge du bénéficiaire)</span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {/* Frais annexes */}
                    {selectedTransfer.additional_fees && selectedTransfer.additional_fees.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Frais annexes :</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          {selectedTransfer.additional_fees.map((fee) => (
                            <li key={fee.id} className="text-sm">
                              {fee.amount.toLocaleString('fr-FR')} {fee.currency}
                              {fee.description && <span className="text-gray-500 ml-1">- {fee.description}</span>}
                              <span className="text-xs text-gray-500 ml-1">
                                ({new Date(fee.created_at).toLocaleDateString('fr-FR')})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-between items-center mt-6">
                {selectedTransfer.status === 'pending' && (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        if (window.confirm('Êtes-vous sûr de vouloir valider ce transfert ?')) {
                          handleStatusChange(selectedTransfer.id, 'completed');
                          setSelectedTransfer(null);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Valider le transfert
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Êtes-vous sûr de vouloir annuler ce transfert ?')) {
                          handleStatusChange(selectedTransfer.id, 'cancelled');
                          setSelectedTransfer(null);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Annuler le transfert
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setSelectedTransfer(null)}
                  className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 ${selectedTransfer.status === 'pending' ? '' : 'ml-auto'}`}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création de transfert */}
      <CreateTransferModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTransferCreated={fetchTransfers}
      />

      {/* Modal d'ajout de frais annexes */}
      {selectedTransfer && showExtraFeesModal && (
        <AddExtraFeesModal
          isOpen={showExtraFeesModal}
          onClose={() => {
            setShowExtraFeesModal(false);
            setSelectedTransfer(null);
          }}
          transfer={selectedTransfer}
          onFeesAdded={fetchTransfers}
        />
      )}
    </div>
  );
};

export default TransfersManager;