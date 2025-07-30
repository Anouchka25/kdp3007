import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './Auth/AuthProvider';
import { generateTransferReference } from '../lib/utils';
import type { RecipientData } from './RecipientForm';

interface PaymentFormProps {
  transferDetails: any;
  recipientDetails: RecipientData;
  onBack: () => void;
  onSubmit: () => void;
  onComplete?: () => void;
  transferComplete?: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  transferDetails,
  recipientDetails,
  onBack,
  onSubmit,
  onComplete,
  transferComplete = false
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const hasSubmitted = useRef(false);

  useEffect(() => {
    // Détecte si on est sur mobile (pour d'éventuels styles spécifiques)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Réinitialise l'icône ✔️ après 2 s
  };

  // Renvoie les blocks d'instructions selon le mode de paiement
  const getPaymentInstructions = (paymentMethod: string, reference: string) => {
    switch (paymentMethod) {
      case 'AIRTEL_MONEY':
        return (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Instructions de paiement Airtel Money</h4>
            <ol className="list-decimal pl-5 text-blue-700">
            <li>Ouvrez l'application Airtel Money</li>
               <li>
                Envoyez le montant  à payer à l'un des numéro&nbsp; ci-dessous :
                <span className="font-medium">N° 1 : 074 18 60 37</span>
                <button
                  onClick={() => copyToClipboard('074186037')}
                  className="ml-2 inline-flex items-center"
                  aria-label="Copier le numéro Airtel Money"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  )}
                </button> - Anouchka MINKOUE OBAME
<br />
                 <span className="font-medium">N° 2 :  074 24 07 47</span>
                <button
                  onClick={() => copyToClipboard(' 074240747')}
                  className="ml-2 inline-flex items-center"
                  aria-label="Copier le numéro Airtel Money"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  )}
                </button> - SONIA OKOME
              </li>
              <li>
                Partagez-nous la capture d'écran du dépot avec l'ID via notre messagerie WhatsApp sur le site.
              </li>

                {/* <li>Ouvrez l'application Airtel Money</li>
               <li>
                Envoyez le montant  à payer au numéro&nbsp;
                <span className="font-medium">074 47 60 95</span>
                <button
                  onClick={() => copyToClipboard('074476095')}
                  className="ml-2 inline-flex items-center"
                  aria-label="Copier le numéro Airtel Money"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </li>
              <li>
                Le compte est au nom de&nbsp;
                <span className="font-medium">Yaelle Esther Essimengane</span>
              </li>*/}
            </ol>
          </div>
        );
      case 'MOOV_MONEY':
        return (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Instructions de paiement Moov Money</h4>
            <ol className="list-decimal pl-5 text-blue-700">
              <li>Ouvrez l'application Moov Money</li>
              <li>
                Envoyez le montant à payer au numéro&nbsp;
                <span className="font-medium">062 60 94 41</span>
                <button
                  onClick={() => copyToClipboard('062609441')}
                  className="ml-2 inline-flex items-center"
                  aria-label="Copier le numéro Moov Money"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </li>
              <li>
                Le compte est au nom de&nbsp;
                <span className="font-medium">Anouchka MINKOUE OBAME</span>
              </li>
               <li>
                Partagez-nous la capture d'écran du dépot avec le Ref via notre messagerie WhatsApp sur le site.
              </li>
            </ol>
          </div>
        );
      case 'WERO':
        return (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Instructions de paiement Wero</h4>
            <ol className="list-decimal pl-5 text-blue-700">
              <li>Ouvrez l'application Wero</li>
              <li>
                Envoyez le montant à payer au numéro&nbsp;
                <span className="font-medium">+33 6 58 89 85 31</span>
                <button
                  onClick={() => copyToClipboard('+33658898531')}
                  className="ml-2 inline-flex items-center"
                  aria-label="Copier le numéro Wero"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </li>
              <li>
                Le compte est au nom de&nbsp;
                <span className="font-medium">Anouchka MINKOUE OBAME</span>
              </li>
            </ol>
          </div>
        );
      case 'PAYPAL':
        return (
         <div className="mt-4 bg-blue-50 p-4 rounded-lg">
    <h4 className="font-medium text-blue-800 mb-2">Instructions de paiement PayPal</h4>
    <ol className="list-decimal pl-5 text-blue-700">
      <li>Connectez-vous à votre compte PayPal.</li>
      <li>
        Envoyez le montant à l'adresse :&nbsp;
        <span className="font-medium">minkoueobamea@gmail.com</span>
        <button
          onClick={() => copyToClipboard('minkoueobamea@gmail.com')}
          className="ml-2 inline-flex items-center"
          aria-label="Copier l'email PayPal"
        >
          {copied === 'email' ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
          )}
        </button>
      </li>
      <li>
        Nom du compte :&nbsp;
        <span className="font-medium">Anouchka MINKOUE OBAME</span>
      </li>
      <li>
        Indiquez la référence du transfert :&nbsp;
        <span className="font-medium">{reference}</span>
        <button
          onClick={() => copyToClipboard(reference, 'reference')}
          className="ml-2 inline-flex items-center"
          aria-label="Copier la référence"
        >
          {copied === 'reference' ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
          )}
        </button>
      </li>
            <li>
        Choisissez l'option payer à un proche
      </li>
    </ol>
    <div className="mt-4">
      <a
        href="https://www.paypal.com" // Optionnel : lien vers ton lien PayPal direct si tu en as un
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 underline hover:text-blue-900"
      >
        Ou cliquez ici pour ouvrir PayPal directement
      </a>
    </div>
  </div>
        );

        case 'CARD':
  return (
    <div className="mt-4 bg-green-50 p-4 rounded-lg">
      <h4 className="font-medium text-green-800 mb-3">Paiement par carte bancaire</h4>
      
      <a
        href="https://pay.sumup.com/b2c/Q3DPXJ23"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-green-600 text-white font-semibold px-4 py-2 rounded hover:bg-green-700 transition"
      >
        Accéder au paiement sécurisé
      </a>
    </div>
  );

        
      case 'BANK_TRANSFER':
        return (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Instructions pour le virement bancaire</h4>
            <div className="space-y-2 text-blue-700">
              {/* Bénéficiaire et IBAN */}
              <div className="flex justify-between items-center">
                <span className="font-medium">Bénéficiaire :</span>
                <span className="text-blue-900">Anouchka MINKOUE OBAME</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">IBAN :</span>
                <div className="flex items-center">
                  <span className="text-blue-900 mr-2">IE26SUMU99036512020786</span>
                  <button
                    onClick={() => copyToClipboard('IE26SUMU99036512020786')}
                    className="inline-flex items-center"
                    aria-label="Copier l'IBAN"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">BIC :</span>
                <div className="flex items-center">
                  <span className="text-blue-900 mr-2">SUMUIE22XXX</span>
                  <button
                    onClick={() => copyToClipboard('SUMUIE22XXX')}
                    className="inline-flex items-center"
                    aria-label="Copier le BIC"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Banque :</span>
                <span className="text-blue-900">SumUp</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Référence :</span>
                <div className="flex items-center">
                  <span className="text-blue-900 mr-2">{reference}</span>
                  <button
                    onClick={() => copyToClipboard(reference || '')}
                    className="inline-flex items-center"
                    aria-label="Copier la référence du virement"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-2">
                N'oubliez pas d'indiquer la référence du transfert dans le libellé du virement.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Empêche les soumissions en double
    
    if (!user || !transferDetails || !recipientDetails) {
      setError('Vous devez être connecté pour effectuer un transfert');
      return;
    }

    setLoading(true);
    setError(null);
    setIsSubmitting(true);
    hasSubmitted.current = true;

    try {
      // Génère une référence unique
      let transferReference: string;
      try {
        transferReference = await generateTransferReference();
      } catch (err) {
        console.error('Error generating reference:', err);
        throw new Error('Une erreur technique est survenue. Veuillez réessayer dans quelques instants.');
      }
      
      setReference(transferReference);
      
      // Crée l'enregistrement du transfert
      const { data: newTransfer, error: transferError } = await supabase
        .from('transfers')
        .insert([{
          reference: transferReference,
          user_id: user.id,
          amount_sent: transferDetails.amountSent,
          fees: transferDetails.fees,
          kundapay_fees: transferDetails.kundapayFees || transferDetails.fees,
          withdrawal_fees: transferDetails.withdrawalFees || 0,
          withdrawal_fees_included: transferDetails.includeWithdrawalFees || false,
          amount_received: transferDetails.amountReceived,
          sender_currency: transferDetails.senderCurrency,
          receiver_currency: transferDetails.receiverCurrency,
          payment_method: transferDetails.paymentMethod,
          receiving_method: transferDetails.receivingMethod,
          funds_origin: recipientDetails.fundsOrigin,
          transfer_reason: recipientDetails.transferReason,
          direction: transferDetails.direction,
          status: 'pending',
          promo_code_id: transferDetails.promoCodeId,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (transferError) {
        console.error('Transfer creation error:', transferError);
        throw new Error('Une erreur est survenue lors de la création du transfert: ' + transferError.message);
      }

      if (!newTransfer) {
        throw new Error('Aucun transfert n\'a été créé');
      }

      // Crée l'enregistrement du bénéficiaire
      const { error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .insert([{
          transfer_id: newTransfer.id,
          user_id: user.id,
          first_name: recipientDetails.firstName,
          last_name: recipientDetails.lastName,
          email: recipientDetails.email || '',
          payment_details: {
            phone: recipientDetails.phone,
            address: recipientDetails.address,
            bankDetails: recipientDetails.bankDetails,
            alipayId: recipientDetails.alipayId,
            weroName: recipientDetails.weroName,
            bitcoinAddress: transferDetails.receivingMethod === 'BITCOIN' ? recipientDetails.bitcoinAddress : null,
            fundsOrigin: recipientDetails.fundsOrigin,
            transferReason: recipientDetails.transferReason,
            withdrawalFeesIncluded: transferDetails.includeWithdrawalFees || false
          }
        }]);

      if (beneficiaryError) {
        console.error('Beneficiary creation error:', beneficiaryError);
        throw new Error('Une erreur est survenue lors de la création du bénéficiaire: ' + beneficiaryError.message);
      }

      // Affiche la confirmation
      setShowConfirmation(true);
      onSubmit();
    } catch (err) {
      console.error('Error creating transfer:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du transfert');
      hasSubmitted.current = false;
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // === Rendu de la page « Transfert confirmé » ===
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="mb-6 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Transfert confirmé</h2>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                  Votre transfert a été créé avec succès. Veuillez suivre les instructions pour finaliser le paiement.
                </p>
              </div>

              {/* Détails du transfert */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-4">Détails du transfert</h3>
                
                <div className="space-y-2">
                  {/* Référence */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Référence</span>
                    <div className="flex items-center">
                      <span className="text-sm sm:text-base font-medium text-gray-900">
                        {reference}
                      </span>
                      <button
                        onClick={() => copyToClipboard(reference || '')}
                        className="ml-2 inline-flex items-center"
                        aria-label="Copier la référence"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Montant à envoyer */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Montant à envoyer (Montant à payer)</span>
                    <div className="flex items-center">
                      <span className="text-sm sm:text-base font-medium text-gray-900">
                        {transferDetails.amountSent.toLocaleString('fr-FR')} {transferDetails.senderCurrency}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `${transferDetails.amountSent.toLocaleString(
                              'fr-FR'
                            )} ${transferDetails.senderCurrency}`
                          )
                        }
                        className="ml-2 inline-flex items-center"
                        aria-label="Copier le montant à envoyer"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Frais */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Frais Inclus</span>
                    <span className="text-sm sm:text-base font-medium text-gray-900">
                      {transferDetails.fees.toLocaleString('fr-FR')} {transferDetails.senderCurrency}
                    </span>
                  </div>

                  {/* Montant à recevoir */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-xs sm:text-sm text-gray-600">Montant à recevoir</span>
                    <span className="text-sm sm:text-base font-bold text-green-600">
                      {transferDetails.amountReceived.toLocaleString('fr-FR')} {transferDetails.receiverCurrency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bénéficiaire */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-4">Bénéficiaire</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Nom</span>
                    <span className="text-sm sm:text-base font-medium text-gray-900">
                      {recipientDetails.firstName} {recipientDetails.lastName}
                    </span>
                  </div>

                  {recipientDetails.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">Email</span>
                      <div className="flex items-center">
                        <span className="text-sm sm:text-base font-medium text-gray-900">
                          {recipientDetails.email}
                        </span>
                        <button
                          onClick={() => copyToClipboard(recipientDetails.email as string)}
                          className="ml-2 inline-flex items-center"
                          aria-label="Copier l'email"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {recipientDetails.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">Téléphone</span>
                      <div className="flex items-center">
                        <span className="text-sm sm:text-base font-medium text-gray-900">
                          {recipientDetails.phone}
                        </span>
                        <button
                          onClick={() => copyToClipboard(recipientDetails.phone as string)}
                          className="ml-2 inline-flex items-center"
                          aria-label="Copier le téléphone"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {recipientDetails.alipayId && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">ID Alipay</span>
                      <div className="flex items-center">
                        <span className="text-sm sm:text-base font-medium text-gray-900">
                          {recipientDetails.alipayId}
                        </span>
                        <button
                          onClick={() => copyToClipboard(recipientDetails.alipayId as string)}
                          className="ml-2 inline-flex items-center"
                          aria-label="Copier l'ID Alipay"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {recipientDetails.weroName && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">Nom Wero</span>
                      <div className="flex items-center">
                        <span className="text-sm sm:text-base font-medium text-gray-900">
                          {recipientDetails.weroName}
                        </span>
                        <button
                          onClick={() => copyToClipboard(recipientDetails.weroName as string)}
                          className="ml-2 inline-flex items-center"
                          aria-label="Copier le nom Wero"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions de paiement */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-4">
                  Instructions de paiement
                </h3>

                {/* On ajoute ici le montant à envoyer avec option « Copier » */}
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-gray-800">Montant à envoyer :</span>
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-900">
                      {transferDetails.amountSent.toLocaleString('fr-FR')} {transferDetails.senderCurrency}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${transferDetails.amountSent.toLocaleString(
                            'fr-FR'
                          )} ${transferDetails.senderCurrency}`
                        )
                      }
                      className="ml-2 inline-flex items-center"
                      aria-label="Copier le montant à envoyer"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                </div>

                {getPaymentInstructions(transferDetails.paymentMethod, reference || '')}
              </div>

              <button
                onClick={onComplete}
                className="w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Aller au tableau de bord
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === Rendu du formulaire de paiement (avant confirmation) ===
  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Retour</span>
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Paiement</h2>
            </div>

            {/* Détails du transfert (avant paiement) */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-4">Détails du transfert</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Montant à envoyer (Montant à Payer)</span>
                  <span className="text-sm sm:text-base font-medium text-gray-900">
                    {transferDetails.amountSent.toLocaleString('fr-FR')} {transferDetails.senderCurrency}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Frais Inclus</span>
                  <span className="text-sm sm:text-base font-medium text-gray-900">
                    {transferDetails.fees.toLocaleString('fr-FR')} {transferDetails.senderCurrency}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-600">Montant à recevoir</span>
                  <span className="text-sm sm:text-base font-bold text-green-600">
                    {transferDetails.amountReceived.toLocaleString('fr-FR')} {transferDetails.receiverCurrency}
                  </span>
                </div>
              </div>
            </div>

            {/* Bénéficiaire */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-4">Bénéficiaire</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Nom</span>
                  <span className="text-sm sm:text-base font-medium text-gray-900">
                    {recipientDetails.firstName} {recipientDetails.lastName}
                  </span>
                </div>

                {recipientDetails.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Email</span>
                    <span className="text-sm sm:text-base font-medium text-gray-900">
                      {recipientDetails.email}
                    </span>
                  </div>
                )}

                {recipientDetails.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Téléphone</span>
                    <span className="text-sm sm:text-base font-medium text-gray-900">
                      {recipientDetails.phone}
                    </span>
                  </div>
                )}

                {recipientDetails.alipayId && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">ID Alipay</span>
                    <span className="text-sm sm:text-base font-medium text-gray-900">
                      {recipientDetails.alipayId}
                    </span>
                  </div>
                )}

                {recipientDetails.weroName && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Nom Wero</span>
                    <span className="text-sm sm:text-base font-medium text-gray-900">
                      {recipientDetails.weroName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                disabled={loading || isSubmitting}
                className="w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                {loading ? 'Traitement en cours...' : 'Confirmer le transfert'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;