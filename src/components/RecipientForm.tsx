import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './Auth/AuthProvider';
import type { TransferDirection, ReceivingMethod } from '../lib/constants';

export interface RecipientData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  alipayId?: string;
  weroName?: string;
  bitcoinAddress?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
  cardDetails?: {
    cardNumber: string;
    expiryDate: string;
    cardholderName: string;
  };
  fundsOrigin: string;
  transferReason: string;
}

interface RecipientFormProps {
  transferDetails: {
    direction: TransferDirection;
    receivingMethod: ReceivingMethod;
    amountSent: number;
    amountReceived: number;
    senderCurrency: string;
    receiverCurrency: string;
    fees: number;
    includeWithdrawalFees?: boolean;
  };
  onBack: () => void;
  onSubmit: (recipientData: RecipientData) => void;
}

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  payment_details: {
    phone?: string;
    bankDetails?: { accountNumber?: string };
    alipayId?: string;
    weroName?: string;
    bitcoinAddress?: string;
    address?: RecipientData['address'];
  };
  transfer_id: string;
}

const FUNDS_ORIGINS = [
  { value: 'salary', label: 'Salaire' },
  { value: 'savings', label: 'Épargne' },
  { value: 'business', label: "Revenus d'entreprise" },
  { value: 'investment', label: 'Investissements' },
  { value: 'gift', label: 'Don' },
  { value: 'other', label: 'Autre' }
];

const TRANSFER_REASONS = [
  { value: 'family_support', label: 'Soutien familial' },
  { value: 'business', label: 'Affaires' },
  { value: 'education', label: 'Éducation' },
  { value: 'medical', label: 'Frais médicaux' },
  { value: 'travel', label: 'Voyage' },
  { value: 'other', label: 'Autre' }
];

const RecipientForm: React.FC<RecipientFormProps> = ({ transferDetails, onBack, onSubmit }) => {
  const { user } = useAuth();
  const [existingBeneficiaries, setExistingBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('');
  const [formData, setFormData] = useState<RecipientData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alipayId: '',
    weroName: '',
    bitcoinAddress: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country:
        transferDetails.direction === 'GABON_TO_USA' ? 'US'
        : transferDetails.direction === 'GABON_TO_CANADA' ? 'CA'
        : ''
    },
    bankDetails: {
      bankName: '',
      accountNumber: '',
      routingNumber: '',
      swiftCode: ''
    },
    cardDetails: {
      cardNumber: '',
      expiryDate: '',
      cardholderName: ''
    },
    fundsOrigin: '',
    transferReason: ''
  });
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => {
    if (user?.id) fetchBeneficiaries();
  }, [user]);

  async function fetchBeneficiaries() {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('id, first_name, last_name, email, payment_details, transfer_id')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    const unique = (data ?? []).reduce<Beneficiary[]>((acc, cur) => {
      const key = `${cur.first_name}-${cur.last_name}`.toLowerCase();
      if (!acc.find(b => (`${b.first_name}-${b.last_name}`).toLowerCase() === key)) {
        acc.push(cur);
      }
      return acc;
    }, []);
    setExistingBeneficiaries(unique);
  }

  function handleBeneficiarySelect(id: string) {
    setSelectedBeneficiary(id);
    const b = existingBeneficiaries.find(x => x.id === id);
    if (!b) {
      setFormData(prev => ({
        ...prev,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        alipayId: '',
        weroName: '',
        bitcoinAddress: ''
      }));
      return;
    }
    setFormData({
      firstName: b.first_name,
      lastName: b.last_name,
      email: b.email || '',
      phone: b.payment_details.phone || '',
      alipayId: b.payment_details.alipayId || '',
      weroName: b.payment_details.weroName || '',
      bitcoinAddress: b.payment_details.bitcoinAddress || '',
      address: b.payment_details.address ?? formData.address!,
      bankDetails: {
        bankName: formData.bankDetails!.bankName,
        accountNumber: b.payment_details.bankDetails?.accountNumber || formData.bankDetails!.accountNumber,
        routingNumber: formData.bankDetails!.routingNumber,
        swiftCode: formData.bankDetails!.swiftCode
      },
      cardDetails: formData.cardDetails!,
      fundsOrigin: formData.fundsOrigin,
      transferReason: formData.transferReason
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [sec, key] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [sec]: {
          ...(prev as any)[sec],
          [key]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors(prev => { const c = { ...prev }; delete c[name]; return c; });
    }
  }

  function validateForm() {
    const errs: Record<string,string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) errs.lastName = 'Le nom est requis';
    if (!formData.fundsOrigin) errs.fundsOrigin = 'Origine des fonds requise';
    if (!formData.transferReason) errs.transferReason = 'Raison du transfert requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validateForm()) onSubmit(formData);
  }

  const isToGabon = () => transferDetails.direction.includes('_TO_GABON');
  const needsAlipay = () => transferDetails.receivingMethod === 'ALIPAY';
  const needsWero   = () => transferDetails.receivingMethod === 'WERO';
  const needsBtc    = () => transferDetails.receivingMethod === 'BITCOIN';
  const needsAddr   = () => ['ACH','VISA_DIRECT','MASTERCARD_SEND'].includes(transferDetails.receivingMethod);
  const needsBank   = () => ['ACH','BANK_TRANSFER'].includes(transferDetails.receivingMethod);
  const needsCard   = () => ['VISA_DIRECT','MASTERCARD_SEND'].includes(transferDetails.receivingMethod);
  const needsPaypal = () => transferDetails.receivingMethod === 'PAYPAL';

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={onBack}
                className="inline-flex items-center px-3 py-1.5 border rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:ring-yellow-500"
              >
                <ArrowLeft className="h-4 w-4 mr-1"/> Retour
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Informations du bénéficiaire
              </h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Détails du transfert</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500">Montant à envoyer</p>
                  <p className="font-medium text-gray-900">
                    {transferDetails.amountSent.toLocaleString('fr-FR')} {transferDetails.senderCurrency}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Frais</p>
                  <p className="font-medium text-gray-900">
                    {transferDetails.fees.toLocaleString('fr-FR')} {transferDetails.senderCurrency}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-gray-500">Montant à recevoir</p>
                  <p className="font-medium text-green-600">
                    {transferDetails.amountReceived.toLocaleString('fr-FR')} {transferDetails.receiverCurrency}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {existingBeneficiaries.length > 0 && (
                <div className="beneficiary-container rounded-lg p-4 mb-6">
                  <div
                    onClick={() => handleBeneficiarySelect('')}
                    className={`
                      cursor-pointer flex items-center p-3 rounded-lg border
                      ${!selectedBeneficiary
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:bg-green-50'}
                    `}
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-green-200 flex items-center justify-center text-white font-bold">+</div>
                      <span className="ml-3 font-medium text-gray-900">Nouveau bénéficiaire</span>
                    </div>
                  </div>
                  <label className="block font-medium text-gray-700 mt-4 mb-2">
                    Sélectionnez un bénéficiaire existant
                  </label>
                  <div className="grid gap-2">
                    {existingBeneficiaries.map(b => {
                      const phone = b.payment_details.phone || '—';
                      const iban = b.payment_details.bankDetails?.accountNumber;
                      return (
                        <div
                          key={b.id}
                          onClick={() => handleBeneficiarySelect(b.id)}
                          className={`
                            cursor-pointer flex justify-between items-center p-3 rounded-lg border
                            ${selectedBeneficiary === b.id
                              ? 'border-green-600 bg-green-50'
                              : 'border-gray-200 hover:bg-green-50'}
                          `}
                        >
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-700">
                              {b.first_name[0]}{b.last_name[0]}
                            </div>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900">
                                {b.first_name} {b.last_name}
                              </p>
                              <p className="text-gray-500 text-sm">
                                📱 {phone}
                                {iban && <> | 🏦 {iban}</>}
                              </p>
                            </div>
                          </div>
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prénom</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-yellow-500 focus:border-yellow-500`}
                    required
                  />
                  {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 ${
                      errors.lastName ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-yellow-500 focus:border-yellow-500`}
                    required
                  />
                  {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {(needsPaypal() || !isToGabon()) && (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {needsPaypal() ? 'Email PayPal (obligatoire)' : 'Email (optionnel)'}
      </label>
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        className={`mt-1 block w-full rounded-md border-2 ${
          errors.email ? 'border-red-300' : 'border-gray-300'
        } focus:ring-yellow-500 focus:border-yellow-500`}
        required={needsPaypal()}
      />
      {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
    </div>
  )}

  <div>
    <label className="block text-sm font-medium text-gray-700">
      {needsWero() ? 'Numéro Wero (obligatoire)' : 'Téléphone'}
    </label>
    <input
      name="phone"
      type="tel"
      value={formData.phone}
      onChange={handleChange}
      required={needsWero()}
      className={`mt-1 block w-full rounded-md border-2 ${
        errors.phone ? 'border-red-300' : 'border-gray-300'
      } focus:ring-yellow-500 focus:border-yellow-500`}
      placeholder={needsWero() ? '+33 6 XX XX XX XX' : undefined}
    />
    {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
  </div>
</div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Origine des fonds</label>
                  <select
                    name="fundsOrigin"
                    value={formData.fundsOrigin}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 ${
                      errors.fundsOrigin ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-yellow-500 focus:border-yellow-500`}
                    required
                  >
                    <option value="">Sélectionnez</option>
                    {FUNDS_ORIGINS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {errors.fundsOrigin && <p className="text-red-600 text-xs mt-1">{errors.fundsOrigin}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Raison du transfert</label>
                  <select
                    name="transferReason"
                    value={formData.transferReason}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 ${
                      errors.transferReason ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-yellow-500 focus:border-yellow-500`}
                    required
                  >
                    <option value="">Sélectionnez</option>
                    {TRANSFER_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {errors.transferReason && <p className="text-red-600 text-xs mt-1">{errors.transferReason}</p>}
                </div>
              </div>

              {needsAlipay() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Identifiant Alipay</label>
                  <input
                    name="alipayId"
                    value={formData.alipayId}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 ${
                      errors.alipayId ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-yellow-500 focus:border-yellow-500`}
                    required
                  />
                  {errors.alipayId && <p className="text-red-600 text-xs mt-1">{errors.alipayId}</p>}
                </div>
              )}

              {needsWero() && transferDetails.direction !== 'GABON_TO_FRANCE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom sur Wero</label>
                  <input
                    name="weroName"
                    value={formData.weroName}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 ${
                      errors.weroName ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-yellow-500 focus:border-yellow-500`}
                    required
                  />
                  {errors.weroName && <p className="text-red-600 text-xs mt-1">{errors.weroName}</p>}
                </div>
              )}

              {needsBtc() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Adresse Bitcoin</label>
                  <input
                    name="bitcoinAddress"
                    value={formData.bitcoinAddress}
                    onChange={handleChange}
                    placeholder="bc1..."
                    className={`mt-1 block w-full rounded-md border-2 ${
                      errors.bitcoinAddress ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-yellow-500 focus:border-yellow-500`}
                    required
                  />
                  {errors.bitcoinAddress && <p className="text-red-600 text-xs mt-1">{errors.bitcoinAddress}</p>}
                  <p className="text-gray-500 text-xs mt-1">Les transactions Bitcoin sont irréversibles.</p>
                </div>
              )}

              {needsAddr() && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Adresse</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      name="address.street"
                      value={formData.address?.street}
                      onChange={handleChange}
                      placeholder="Rue"
                      className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        name="address.city"
                        value={formData.address?.city}
                        onChange={handleChange}
                        placeholder="Ville"
                        className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                      {transferDetails.direction === 'GABON_TO_USA' && (
                        <input
                          name="address.state"
                          value={formData.address?.state}
                          onChange={handleChange}
                          placeholder="État"
                          className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      )}
                      <input
                        name="address.zipCode"
                        value={formData.address?.zipCode}
                        onChange={handleChange}
                        placeholder="Code postal"
                        className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {needsBank() && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Informations bancaires</h3>
                  <input
                    name="bankDetails.bankName"
                    value={formData.bankDetails?.bankName}
                    onChange={handleChange}
                    placeholder="Nom de la banque"
                    className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  <input
                    name="bankDetails.accountNumber"
                    value={formData.bankDetails?.accountNumber}
                    onChange={handleChange}
                    placeholder="IBAN / Numéro de compte"
                    className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {transferDetails.direction === 'GABON_TO_USA' && (
                    <input
                      name="bankDetails.routingNumber"
                      value={formData.bankDetails?.routingNumber}
                      onChange={handleChange}
                      placeholder="Numéro de routage ACH"
                      className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  )}
                </div>
              )}

              {needsCard() && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Détails de la carte</h3>
                  <input
                    name="cardDetails.cardNumber"
                    value={formData.cardDetails?.cardNumber}
                    onChange={handleChange}
                    placeholder="Numéro de carte"
                    className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name="cardDetails.expiryDate"
                      value={formData.cardDetails?.expiryDate}
                      onChange={handleChange}
                      placeholder="MM/AA"
                      className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <input
                      name="cardDetails.cardholderName"
                      value={formData.cardDetails?.cardholderName}
                      onChange={handleChange}
                      placeholder="Nom du titulaire"
                      className="mt-1 block w-full rounded-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <button
                  type="submit"
                  className="w-full py-3 rounded-md bg-yellow-600 text-white font-medium hover:bg-yellow-700 focus:ring-yellow-500"
                >
                  Continuer vers le paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientForm;