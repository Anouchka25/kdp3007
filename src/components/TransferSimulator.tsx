import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './Auth/AuthProvider';
import { ArrowRight, Info } from 'lucide-react';
import { calculateTransferDetails, formatCurrency, isEligibleForLoyaltyDiscount } from '../lib/utils';
import { validate_promo_code, supabase } from '../lib/supabase';
import { COUNTRIES, type CountryCode } from '../lib/constants';
import LoyaltyPointsDisplay from '../components/LoyaltyPointsDisplay';


const TRANSFER_ROUTES: Record<CountryCode, CountryCode[]> = {
  GA: ['FR', 'BE', 'DE', 'CH', 'GB', 'ES', 'IT', 'NL', 'CN', 'US', 'CA', 'MA', 'SN'],
  FR: ['GA', 'MA', 'SN'],
  BE: ['GA'],
  DE: ['GA'],
  CH: ['GA'],
  GB: ['GA'],
  ES: ['GA'],
  IT: ['GA'],
  NL: ['GA'],
  US: ['GA'],
  CA: ['GA'],
  CN: [],
  MA: ['FR', 'GA', 'SN'],
  SN: ['FR', 'MA', 'GA']
};

const PAYMENT_METHODS = {
  'GA': {
    'FR': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'BE': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'DE': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'IT': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'NL': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'ES': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'CH': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'GB': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'CN': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'US': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'CA': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'MA': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'SN': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      { value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ]
  },
  'FR': {
    'GA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
     // { value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'MA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' }
    ],
    'SN': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' }
    ]
  },
  'BE': {
    'GA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'DE': {
    'GA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'IT': {
    'GA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
    'NL': {
    'GA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
    'ES': {
    'GA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
    'CH': {
    'GA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
    'GB': {
    'GA': [
      { value: 'CARD', label: 'Carte Bancaire', icon: '/cb.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'US': {
    'GA': [
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      { value: 'ACH', label: 'Virement ACH', icon: '/virement-bancaire.jpg' },
      { value: 'VISA_DIRECT', label: 'Visa Direct', icon: '/cb.png' },
      { value: 'MASTERCARD_SEND', label: 'Mastercard Send', icon: '/cb.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'CA': {
    'GA': [
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      { value: 'INTERAC', label: 'Virement Interac', icon: '/virement-bancaire.jpg' },
      { value: 'VISA_DIRECT', label: 'Visa Direct', icon: '/cb.png' },
      { value: 'MASTERCARD_SEND', label: 'Mastercard Send', icon: '/cb.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'MA': {
    'FR': [
      { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '/orange-money.png' }
    ],
    'GA': [
      { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '/orange-money.png' }
    ],
    'SN': [
      { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '/orange-money.png' }
    ]
  },
  'SN': {
    'FR': [
      { value: 'WAVE', label: 'Wave', icon: '/wave.png' }
    ],
    'MA': [
      { value: 'WAVE', label: 'Wave', icon: '/wave.png' }
    ],
    'GA': [
      { value: 'WAVE', label: 'Wave', icon: '/wave.png' }
    ]
  }
};

const RECEIVING_METHODS = {
  'GA': {
    'FR': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'BE': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'DE': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'IT': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'NL': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'ES': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'CH': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'GB': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'US': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'CA': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'MA': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ],
    'SN': [
      { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: '/airtel-money.png' },
      //{ value: 'MOOV_MONEY', label: 'Moov Money', icon: '/moov-money.png' }
    ]
  },
  'FR': {
    'GA': [
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' },
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ],
    'MA': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' }
    ],
    'SN': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' }
    ]
  },
  'BE': {
    'GA': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'DE': {
    'GA': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'WERO', label: 'Wero ou PayLib', icon: '/wero.png' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'CH': {
    'GA': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' }
    ]
  },
  'GB': {
    'GA': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' }
    ]
  },
  'ES': {
    'GA': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' }
    ]
  },
  'IT': {
    'GA': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' }
    ]
  },
  'NL': {
    'GA': [
      { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: '/virement-bancaire.jpg' },
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' }
    ]
  },
  'CN': {
    'GA': [
      { value: 'ALIPAY', label: 'Alipay', icon: '/1000133611.6795ed4372fe81.90775491.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'US': {
    'GA': [
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      { value: 'ACH', label: 'Virement ACH', icon: '/virement-bancaire.jpg' },
      { value: 'VISA_DIRECT', label: 'Visa Direct', icon: '/cb.png' },
      { value: 'MASTERCARD_SEND', label: 'Mastercard Send', icon: '/cb.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'CA': {
    'GA': [
      { value: 'PAYPAL', label: 'PayPal', icon: '/paypal.png' },
      { value: 'INTERAC', label: 'Virement Interac', icon: '/virement-bancaire.jpg' },
      { value: 'VISA_DIRECT', label: 'Visa Direct', icon: '/cb.png' },
      { value: 'MASTERCARD_SEND', label: 'Mastercard Send', icon: '/cb.png' },
      //{ value: 'BITCOIN', label: 'Bitcoin', icon: '/bitcoin.png' }
    ]
  },
  'MA': {
    'FR': [
      { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '/orange-money.png' }
    ],
    'GA': [
      { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '/orange-money.png' }
    ],
    'SN': [
      { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '/orange-money.png' }
    ]
  },
  'SN': {
    'FR': [
      { value: 'WAVE', label: 'Wave', icon: '/wave.png' }
    ],
    'GA': [
      { value: 'WAVE', label: 'Wave', icon: '/wave.png' }
    ],
    'MA': [
      { value: 'WAVE', label: 'Wave', icon: '/wave.png' }
    ],
  }
};

const getDefaultPaymentMethod = (fromCountry: CountryCode, toCountry: CountryCode) => {
  const methods = PAYMENT_METHODS[fromCountry]?.[toCountry];
  if (!methods?.length) return '';
  return methods[0].value;
};

const getDefaultReceivingMethod = (fromCountry: CountryCode, toCountry: CountryCode) => {
  const methods = RECEIVING_METHODS[toCountry]?.[fromCountry];
  if (!methods?.length) return '';
  return methods[0].value;
};

const getDirectionFromCountries = (fromCountry: string, toCountry: string): string => {
  const countryNameMap: Record<string, string> = {
    'GA': 'GABON',
    'FR': 'FRANCE',
    'BE': 'BELGIUM',
    'DE': 'GERMANY', 
    'CH': 'SWITZERLAND',
    'GB': 'UNITED KINGDOM',
    'ES': 'SPAIN',
    'IT': 'ITALY',
    'NL': 'NETHERLANDS',
    'CN': 'CHINA',
    'US': 'USA',
    'CA': 'CANADA',
    'MA': 'MOROCCO',
    'SN': 'SENEGAL'
  };

  return `${countryNameMap[fromCountry]}_TO_${countryNameMap[toCountry]}`;
};

// Fonction pour valider le montant du transfert
const validateTransferAmount = async (amount: number, direction: string): Promise<{
  valid: boolean;
  message: string;
  max_amount: number;
}> => {
  try {
    const { data, error } = await supabase.rpc('validate_transfer_amount', {
      amount,
      direction
    });

    if (error) throw error;
    return data[0] || { valid: true, message: 'Montant valide', max_amount: 0 };
  } catch (err) {
    console.error('Error validating transfer amount:', err);
    return { valid: true, message: 'Erreur de validation', max_amount: 0 };
  }
};

const TransferSimulator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sendAmount, setSendAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [fromCountry, setFromCountry] = useState<CountryCode>('FR');
  const [toCountry, setToCountry] = useState<CountryCode>('GA');
  const [paymentMethod, setPaymentMethod] = useState(getDefaultPaymentMethod('FR', 'GA'));
  const [receivingMethod, setReceivingMethod] = useState(getDefaultReceivingMethod('FR', 'GA'));
  const [calculation, setCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'send' | 'receive'>('send');
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeValid, setPromoCodeValid] = useState(false);
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [suggestedPromoCode, setSuggestedPromoCode] = useState<string | null>(null);
  const [includeWithdrawalFees, setIncludeWithdrawalFees] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  const [lastCalculatedField, setLastCalculatedField] = useState<'send' | 'receive'>('send');
  const [amountValidation, setAmountValidation] = useState<{
    valid: boolean;
    message: string;
    max_amount: number;
  } | null>(null);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);

  // Define the missing variables based on existing state
  const selectedDirection = getDirectionFromCountries(fromCountry, toCountry);
  const amount = activeField === 'send' ? sendAmount : receiveAmount;
  const senderCurrency = COUNTRIES[fromCountry].currency;

  useEffect(() => {
    const validDestinations = TRANSFER_ROUTES[fromCountry] || [];
    if (!validDestinations.includes(toCountry)) {
      setToCountry(validDestinations[0] || 'GA');
    }
    
    setPaymentMethod(getDefaultPaymentMethod(fromCountry, toCountry));
    setReceivingMethod(getDefaultReceivingMethod(fromCountry, toCountry));
    setIncludeWithdrawalFees(false);
    
    setSendAmount('');
    setReceiveAmount('');
    setCalculation(null);
  }, [fromCountry, toCountry]);

  useEffect(() => {
    const calculateAmounts = async () => {
      if ((!sendAmount || sendAmount === '0') && (!receiveAmount || receiveAmount === '0')) {
        setCalculation(null);
        return;
      }

      const amount = activeField === 'send' ? sendAmount : receiveAmount;
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setCalculation(null);
        setError(null);
        setSuggestedPromoCode(null);
        return;
      }

      setLoading(true);
      setError(null);
      setLastCalculatedField(activeField);

      try {
        // Valider le montant du transfert
        const direction = getDirectionFromCountries(fromCountry, toCountry);
        
        if (activeField === 'send') {
          const validation = await validateTransferAmount(Number(amount), direction);
          setAmountValidation(validation);
          
          if (!validation.valid) {
            setError(validation.message);
            setCalculation(null);
            setLoading(false);
            return;
          }
        }

    
        {/* if (toCountry === 'GA' && activeField === 'send') {
          const amountNum = Number(amount);
          if (amountNum >= 1000) {
            setSuggestedPromoCode('WELCOME75');
          } else if (amountNum >= 500) {
            setSuggestedPromoCode('WELCOME50');
          } else {
            setSuggestedPromoCode(null);
          }
        } else {
          setSuggestedPromoCode(null);
        } */}

        const result = await calculateTransferDetails(
          Number(amount),
          direction,
          paymentMethod,
          receivingMethod,
          activeField === 'receive',
          promoCodeValid ? promoCode : undefined,
          includeWithdrawalFees,
          loyaltyPointsToUse,
          user?.id
        );
        
        setCalculation(result);
        
        if (activeField === 'send') {
          setReceiveAmount(result.amountReceived.toFixed(2));
        } else {
          setSendAmount(result.amountSent.toFixed(2));
          
          // Valider le montant calculé
          const sendValidation = await validateTransferAmount(result.amountSent, direction);
          setAmountValidation(sendValidation);
          
          if (!sendValidation.valid) {
            setError(sendValidation.message);
          }
        }
        
        setError(null);
      } catch (err) {
        setCalculation(null);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Une erreur inattendue est survenue');
        }
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(calculateAmounts, 500);
    return () => clearTimeout(timeoutId);
  }, [sendAmount, receiveAmount, fromCountry, toCountry, paymentMethod, receivingMethod, activeField, promoCode, promoCodeValid, includeWithdrawalFees]);

  const handlePromoCodeChange = async (code: string) => {
    setPromoCode(code);
    if (!code) {
      setPromoCodeValid(false);
      setPromoCodeMessage('');
      return;
    }

    try {
      const direction = getDirectionFromCountries(fromCountry, toCountry);
      const { data, error } = await validate_promo_code(code, direction, user?.id);
      
      if (error) throw error;

      if (data && data.length > 0) {
        const validation = data[0];
        setPromoCodeValid(validation.valid);
        setPromoCodeMessage(validation.message);
      } else {
        setPromoCodeValid(false);
        setPromoCodeMessage('Code promo invalide');
      }
    } catch (err) {
      console.error('Error validating promo code:', err);
      setPromoCodeValid(false);
      setPromoCodeMessage('Erreur lors de la validation du code promo');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculation) {
      localStorage.setItem('transferDetails', JSON.stringify({
        ...calculation,
        direction: getDirectionFromCountries(fromCountry, toCountry),
        paymentMethod,
        receivingMethod,
        promoCode: promoCodeValid ? promoCode : undefined,
        includeWithdrawalFees
      }));
      navigate('/transfer');
    }
  };

  const getWithdrawalFeeLabel = () => {
    if (receivingMethod === 'AIRTEL_MONEY') {
      return 'Ajouter les frais de retrait Airtel Money';
    } else if (receivingMethod === 'MOOV_MONEY') {
      return 'Ajouter les frais de retrait Moov Money';
    }
    return '';
  };

  const showWithdrawalFees = () => {
    return toCountry === 'GA' && 
           (receivingMethod === 'AIRTEL_MONEY' || receivingMethod === 'MOOV_MONEY');
  };

  const handleFeeDetailsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFeeDetails(!showFeeDetails);
  };

  const getTotalWithdrawalFeesXAF = (withdrawalFeesDetails: any[]) => {
    if (!withdrawalFeesDetails || withdrawalFeesDetails.length === 0) return 0;
    return withdrawalFeesDetails.reduce((total, detail) => total + detail.fee, 0);
  };

  const handleSendAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    setActiveField('send');
    setSendAmount(newValue);
    setError(null);
  };

  const handleReceiveAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActiveField('receive');
    setReceiveAmount(e.target.value);
    setError(null);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="w-full mx-auto px-2 sm:px-4">
          <div className="bg-white rounded-lg shadow-lg px-2 py-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Effectuer un transfert d'argent
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fromCountry" className="block text-sm font-medium text-gray-700 mb-2">
                    Expéditeur
                  </label>
                  <div className="relative">
                    <select
                      id="fromCountry"
                      value={fromCountry}
                      onChange={(e) => setFromCountry(e.target.value as CountryCode)}
                      className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 rounded-lg"
                    >
                      {Object.entries(COUNTRIES)
                        .filter(([code]) => TRANSFER_ROUTES[code as CountryCode]?.length > 0)
                        .map(([code, country]) => (
                          <option key={code} value={code}>
                            {country.name}
                          </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <img 
                        src={COUNTRIES[fromCountry].flag} 
                        alt={COUNTRIES[fromCountry].name} 
                        className="w-6 h-4 rounded shadow-sm" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="toCountry" className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <div className="relative">
                    <select
                      id="toCountry"
                      value={toCountry}
                      onChange={(e) => setToCountry(e.target.value as CountryCode)}
                      className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 rounded-lg"
                    >
                      {TRANSFER_ROUTES[fromCountry]?.map((code) => (
                        <option key={code} value={code}>
                          {COUNTRIES[code].name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <img 
                        src={COUNTRIES[toCountry].flag} 
                        alt={COUNTRIES[toCountry].name} 
                        className="w-6 h-4 rounded shadow-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label htmlFor="sendAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Montant à envoyer ({COUNTRIES[fromCountry].currency})
                  </label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      name="sendAmount"
                      id="sendAmount"
                      value={sendAmount}
                      onChange={handleSendAmountChange}
                      onFocus={() => setActiveField('send')}
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                      className="w-full min-w-0 px-2 border-2 rounded-lg py-2 text-base font-bold focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label htmlFor="receiveAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Montant à recevoir ({COUNTRIES[toCountry].currency})
                  </label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      name="receiveAmount"
                      id="receiveAmount"
                      value={receiveAmount}
                      onChange={handleReceiveAmountChange}
                      onFocus={() => setActiveField('receive')}
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                      className="w-full min-w-0 px-2 border-2 rounded-lg py-2 text-base font-bold focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                </div>
              </div>

              {/* Afficher le message de validation du montant */}
              {amountValidation && !amountValidation.valid && (
                <div className="mt-2 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{amountValidation.message}</p>
                </div>
              )}

              {showWithdrawalFees() && (
                <div className="flex items-center">
                  <input
                    id="withdrawalFees"
                    type="checkbox"
                    checked={includeWithdrawalFees}
                    onChange={(e) => setIncludeWithdrawalFees(e.target.checked)}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="withdrawalFees" className="ml-2 block text-sm text-gray-900">
                    {getWithdrawalFeeLabel()}
                  </label>
                 
                </div>
              )}

              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de paiement
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {PAYMENT_METHODS[fromCountry]?.[toCountry]?.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex items-center justify-center p-4 border-2 rounded-lg ${
                        paymentMethod === method.value
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-gray-200 hover:border-yellow-200'
                      }`}
                    >
                      <img src={method.icon} alt={method.label} className="h-6 w-6 mr-2 object-contain" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="receivingMethod" className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de réception
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {RECEIVING_METHODS[toCountry]?.[fromCountry]?.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setReceivingMethod(method.value)}
                      className={`flex items-center justify-center p-4 border-2 rounded-lg ${
                        receivingMethod === method.value
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-gray-200 hover:border-yellow-200'
                      }`}
                    >
                      <img src={method.icon} alt={method.label} className="h-6 w-6 mr-2 object-contain" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {suggestedPromoCode && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Utilisez le code promo <strong>{suggestedPromoCode}</strong> pour bénéficier d'une réduction de {suggestedPromoCode === 'WELCOME75' ? '75%' : '50%'} sur les frais !
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Code promo (optionnel)
                </label>
                <input
                  type="text"
                  id="promoCode"
                  value={promoCode}
                  onChange={(e) => handlePromoCodeChange(e.target.value)}
                  className={`mt-1 block w-full rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm border-2 ${
                    promoCodeValid ? 'border-green-300' : promoCode ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Entrez votre code promo"
                />
                {promoCodeMessage && (
                  <p className={`mt-2 text-sm ${promoCodeValid ? 'text-green-600' : 'text-red-600'}`}>
                    {promoCodeMessage}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Ajoutez le composant LoyaltyPointsDisplay */}
              {user && isEligibleForLoyaltyDiscount(selectedDirection) && (
                <LoyaltyPointsDisplay
                  userId={user.id}
                  direction={selectedDirection}
                  transferAmount={Number(amount)}
                  senderCurrency={senderCurrency}
                  onPointsToUseChange={setLoyaltyPointsToUse}
                  className="mt-6"
                />
              )}

              {calculation && (
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Montant à envoyer</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(calculation.amountSent, calculation.senderCurrency)} {calculation.senderCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">Frais totaux inclus</span>
                      <button 
                        type="button"
                        onClick={handleFeeDetailsClick}
                        className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                        title="Voir le détail des frais"
                      >
                        <Info size={16} />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(calculation.fees, calculation.senderCurrency)} {calculation.senderCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Montant à recevoir</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(calculation.amountReceived, calculation.receiverCurrency)} {calculation.receiverCurrency}
                    </span>
                  </div>

                  {calculation.loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Réduction fidélité ({calculation.loyaltyPointsUsed} pts)</span>
                      <span className="font-medium">
                        -{calculation.loyaltyDiscount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {calculation.senderCurrency}
                      </span>
                    </div>
                  )}

                  {showFeeDetails && (
                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Détail des frais</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600">Frais KundaPay</span>
                          <span className="text-xs font-medium">
                            {formatCurrency(calculation.kundapayFees, calculation.senderCurrency)} {calculation.senderCurrency}
                          </span>
                        </div>
                        
                        {calculation.withdrawalFees > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">
                                Frais de retrait {receivingMethod === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Moov Money'}
                              </span>
                              <span className="text-xs font-medium">
                                {formatCurrency(calculation.withdrawalFees, calculation.senderCurrency)} {calculation.senderCurrency}
                              </span>
                            </div>
                            
                            <div className="text-xs bg-gray-50 p-2 rounded mt-2">
                              <div className="flex justify-between mb-1">
                                <span className="font-medium">Frais de retrait:</span>
                                <span className="font-medium text-gray-700">
                                  {calculation.withdrawalFeesDetails && 
                                   getTotalWithdrawalFeesXAF(calculation.withdrawalFeesDetails).toLocaleString('fr-FR')} FCFA
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Ces frais permettent au bénéficiaire de retirer <strong>{formatCurrency(calculation.amountReceived, calculation.receiverCurrency)} {calculation.receiverCurrency}</strong> en espèces sans frais supplémentaires.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!calculation || loading || (amountValidation && !amountValidation.valid)}
              >
                {loading ? 'Chargement...' : 'Continuer'} <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransferSimulator;