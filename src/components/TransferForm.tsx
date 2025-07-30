import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './Auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { generateTransferReference } from '../lib/utils';
import RecipientForm from './RecipientForm';
import PaymentForm from './PaymentForm';
import BitcoinPaymentForm from './BitcoinPaymentForm';
import type { RecipientData } from './RecipientForm';

const TransferForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferDetails, setTransferDetails] = useState<any>(null);
  const [step, setStep] = useState<'recipient' | 'payment'>('recipient');
  const [recipientData, setRecipientData] = useState<RecipientData | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [transferComplete, setTransferComplete] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    const loadTransferDetails = () => {
      const savedDetails = localStorage.getItem('transferDetails');
      if (savedDetails) {
        const details = JSON.parse(savedDetails);
        setTransferDetails(details);
      } else {
        navigate('/');
      }
    };

    loadTransferDetails();
    
    const urlParams = new URLSearchParams(location.search);
    const status = urlParams.get('status');
    
    if (status === 'success') {
      setTransferComplete(true);
      localStorage.removeItem('transferDetails');
    } else if (status === 'failure' || status === 'cancelled') {
      setError(status === 'failure' 
        ? 'Le paiement a échoué. Veuillez réessayer ou choisir un autre moyen de paiement.' 
        : 'Le paiement a été annulé.');
    }
  }, [navigate, location]);

  const handleBack = () => {
    if (step === 'payment') {
      setStep('recipient');
    } else {
      navigate('/');
    }
  };

  const validateTransferData = (data: any) => {
    if (!data.amountSent || data.amountSent <= 0) {
      throw new Error('Le montant envoyé est invalide');
    }
    if (!data.senderCurrency || !data.receiverCurrency) {
      throw new Error('Les devises sont invalides');
    }
    if (!data.paymentMethod || !data.receivingMethod) {
      throw new Error('Les méthodes de paiement sont invalides');
    }
  };

  const validateRecipientData = (data: RecipientData) => {
    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      throw new Error('Le nom du bénéficiaire est incomplet');
    }
    if (!data.fundsOrigin?.trim()) {
      throw new Error('L\'origine des fonds est requise');
    }
    if (!data.transferReason?.trim()) {
      throw new Error('La raison du transfert est requise');
    }
  };

  const handleRecipientSubmit = async (data: RecipientData) => {
    try {
      if (!user) {
        navigate('/auth', { 
          state: { 
            from: '/transfer',
            transferDetails: localStorage.getItem('transferDetails')
          }
        });
        return;
      }

      if (!termsAccepted) {
        setError('Vous devez accepter les conditions générales pour continuer');
        return;
      }

      validateRecipientData(data);
      setRecipientData(data);
      setStep('payment');
      setError(null);
    } catch (err) {
      console.error('Erreur de validation:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la validation des données');
    }
  };

  // This function is now just a pass-through to avoid duplicate transfer creation
  // The actual transfer creation happens in PaymentForm.tsx or BitcoinPaymentForm.tsx
  const handlePaymentSubmit = async () => {
    // Just set the transfer as complete, the actual creation is done in the payment form
    setTransferComplete(true);
  };

  const handleComplete = () => {
    localStorage.removeItem('transferDetails');
    navigate('/dashboard');
  };

  if (!transferDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-center text-gray-500">Aucun détail de transfert trouvé.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {step === 'recipient' ? (
        <div>
          <RecipientForm
            transferDetails={transferDetails}
            onBack={handleBack}
            onSubmit={handleRecipientSubmit}
          />

          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-t">
              <div className="flex items-center">
                <input
                  id="transfer-terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <label htmlFor="transfer-terms" className="ml-2 block text-sm text-gray-900">
                  J'accepte les{' '}
                  <a
                    href="/conditions-generales"
                    target="_blank"
                    className="font-medium text-yellow-600 hover:text-yellow-500"
                  >
                    conditions générales
                  </a>
                  {' '}et la{' '}
                  <a
                    href="/politique-de-confidentialite"
                    target="_blank"
                    className="font-medium text-yellow-600 hover:text-yellow-500"
                  >
                    politique de confidentialité
                  </a>
                </label>
              </div>
              {error && error.includes('conditions générales') && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {transferDetails.paymentMethod === 'BITCOIN' || transferDetails.receivingMethod === 'BITCOIN' ? (
            <BitcoinPaymentForm
              transferDetails={transferDetails}
              recipientDetails={recipientData!}
              onBack={handleBack}
              onSubmit={handlePaymentSubmit}
              onComplete={handleComplete}
              transferComplete={transferComplete}
            />
          ) : (
            <PaymentForm
              transferDetails={transferDetails}
              recipientDetails={recipientData!}
              onBack={handleBack}
              onSubmit={handlePaymentSubmit}
              onComplete={handleComplete}
              transferComplete={transferComplete}
            />
          )}

          {error && !error.includes('conditions générales') && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransferForm;