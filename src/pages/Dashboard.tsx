import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getStatusLabel, getPaymentInstructions } from '../lib/utils';
import { ArrowUpDown, TrendingUp, Star, Plus, Eye, Calendar, User, MapPin, Clock } from 'lucide-react';

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
  fees: number;
  kundapay_fees: number;
  withdrawal_fees: number;
  withdrawal_fees_included: boolean;
  direction: string;
  beneficiaries: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    payment_details: any;
  }>;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  country: string;
  phone: string;
  address: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  } | null;
  loyalty_points: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

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
    fetchUserData();
    fetchTransfers();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error) throw error;
        
        // Ensure loyalty_points is 0 if null or undefined
        const userData = {
          ...data,
          loyalty_points: data.loyalty_points || 0
        };
        
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchTransfers = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data, error } = await supabase
          .from('transfers')
          .select(`
            *,
            beneficiaries (
              id, first_name, last_name, email, payment_details
            )
          `)
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTransfers(data || []);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
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
      'INTERAC': 'Interac'
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
      'GABON_TO_NETHERLANDS': 'Gabon → Pays-Bas'
    };
    return directions[direction] || direction;
  };

  const completedTransfers = transfers.filter(t => t.status === 'completed');
  const loyaltyPoints = user?.loyalty_points || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Welcome Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Bonjour {user ? formatName(user.first_name, user.last_name) : ''} !
                  </h1>
                  <p className="text-gray-600">Gérez vos transferts et consultez vos statistiques</p>
                </div>
                <button
                  onClick={() => navigate('/transfer')}
                  className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Faire un nouveau transfert →
                </button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total transferts</p>
                    <p className="text-3xl font-bold text-blue-900">{transfers.length}</p>
                  </div>
                  <ArrowUpDown className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Transferts terminés</p>
                    <p className="text-3xl font-bold text-green-900">{completedTransfers.length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Points de fidélité</p>
                    <p className="text-3xl font-bold text-yellow-900">{loyaltyPoints}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Historique des transferts</h2>
              </div>
              
              {transfers.length === 0 ? (
                <div className="p-6 text-center">
                  <ArrowUpDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Aucun transfert pour le moment</p>
                  <button
                    onClick={() => navigate('/transfer')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer votre premier transfert
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {transfers.slice(0, 5).map((transfer) => (
                    <div key={transfer.id} className="p-6 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTransfer(transfer)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-900">
                              {transfer.reference}
                            </p>
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
                          
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>{getDirectionLabel(transfer.direction)}</span>
                            <span>{transfer.amount_sent.toLocaleString('fr-FR')} {transfer.sender_currency} → {transfer.amount_received.toLocaleString('fr-FR')} {transfer.receiver_currency}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="flex items-center">
                              <Eye className="h-3 w-3 mr-1" />
                              Voir détails
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {transfers.length > 100 && (
                    <div className="p-4 text-center">
                      <button
                        onClick={() => navigate('/transfers')}
                        className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                      >
                        Voir tous les transferts ({transfers.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>


          {/* User Profile Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-yellow-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {user ? formatName(user.first_name, user.last_name) : ''}
                </h3>
                <p className="text-sm text-gray-500">Membre KundaPay</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="truncate">{user?.email}</span>
                </div>

                {user?.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="h-4 w-4 mr-3 text-gray-400">📞</span>
                    <span>{user.phone}</span>
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-3 text-gray-400" />
                  <span>
                    {user?.country === 'GA' ? 'Gabon' :
                     user?.country === 'FR' ? 'France' :
                     user?.country === 'BE' ? 'Belgique' :
                     user?.country === 'DE' ? 'Allemagne' :
                     user?.country === 'CH' ? 'Suisse' :
                     user?.country === 'GB' ? 'Royaume-Uni' :
                     user?.country === 'ES' ? 'Espagne' :
                     user?.country === 'IT' ? 'Italie' :
                     user?.country === 'NL' ? 'Pays-Bas' :
                     user?.country === 'CN' ? 'Chine' :
                     user?.country === 'US' ? 'États-Unis' :
                     user?.country === 'CA' ? 'Canada' :
                     user?.country}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-3 text-gray-400" />
                  <span>Membre depuis janvier 2025</span>
                </div>

                {user?.address && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Adresse</h4>
                    <div className="text-sm text-gray-600">
                      <p>{user.address.street}</p>
                      <p>{user.address.city}, {user.address.zipCode}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Modifier le profil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Détails du transfert {selectedTransfer.reference}
            </h3>
            
            <div className="space-y-6">
              {/* Informations générales */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Informations générales</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><span className="font-medium">Référence :</span> {selectedTransfer.reference}</p>
                      <p><span className="font-medium">Date :</span> {new Date(selectedTransfer.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Statut :</span> {getStatusLabel(selectedTransfer.status)}</p>
                      {selectedTransfer.validated_at && (
                        <p><span className="font-medium">Validé le :</span> {new Date(selectedTransfer.validated_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Montants */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Montants</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><span className="font-medium">Montant envoyé :</span> {selectedTransfer.amount_sent.toLocaleString('fr-FR')} {selectedTransfer.sender_currency}</p>
                      <p><span className="font-medium">Frais :</span> {selectedTransfer.fees.toLocaleString('fr-FR')} {selectedTransfer.sender_currency}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Montant reçu :</span> {selectedTransfer.amount_received.toLocaleString('fr-FR')} {selectedTransfer.receiver_currency}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Méthodes */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Méthodes</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><span className="font-medium">Mode de paiement :</span> {getPaymentMethodDisplay(selectedTransfer.payment_method)}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Mode de réception :</span> {getPaymentMethodDisplay(selectedTransfer.receiving_method)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations supplémentaires */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Informations supplémentaires</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><span className="font-medium">Origine des fonds :</span> {getFundsOriginDisplay(selectedTransfer.funds_origin)}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Raison du transfert :</span> {getTransferReasonDisplay(selectedTransfer.transfer_reason)}</p>
                    </div>
                  </div>
                </div>
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
              </div>

              {/* Bénéficiaire */}
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

              {/* Instructions de paiement */}
              {selectedTransfer.status === 'pending' && getPaymentInstructions(selectedTransfer.payment_method, selectedTransfer.reference)}

              {/* Boutons d'action */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedTransfer(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;