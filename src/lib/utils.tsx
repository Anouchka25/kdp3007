import { supabase } from './supabase';
import { DEFAULT_TRANSFER_FEES } from './supabase';
import { LOYALTY_POINTS } from './constants';
import type { TransferDirection, PaymentMethod, ReceivingMethod } from './constants';

// Format currency with proper rounding
export function formatCurrency(amount: number, currency: string): string {
  if (!amount || isNaN(amount)) {
    return '0,00';
  }
  
  if (currency === 'XAF') {
    // Round to nearest 5 for FCFA
    const roundedAmount = Math.round(amount / 5) * 5;
    return roundedAmount.toLocaleString('fr-FR');
  }
  
  if (currency === 'BTC') {
    // Format BTC with 8 decimal places
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8
    });
  }

  // For EUR, USD, CNY, CAD, CHF, GBP - always show 2 decimal places
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Generate a unique transfer reference
export async function generateTransferReference(): Promise<string> {
  const maxAttempts = 50; // Increased from 10 to 50 attempts
  let attempts = 0;
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (attempts < maxAttempts) {
    const prefix = 'KP';
    // Use more entropy in the reference generation
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase(); // Increased from 4 to 6 characters
    const reference = `${prefix}${timestamp}${random}`;
    
    try {
      // Check if reference already exists
      const { data, error } = await supabase
        .from('transfers')
        .select('reference')
        .eq('reference', reference)
        .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116
      
      if (!data) {
        // Reference doesn't exist, we can use it
        return reference;
      }
      
      // Add a small random delay between retries to avoid race conditions
      await sleep(Math.random() * 100);
    } catch (error) {
      console.error('Error checking reference uniqueness:', error);
      // Add a small delay before retrying
      await sleep(Math.random() * 100);
    }
    
    attempts++;
  }
  
  throw new Error('Impossible de générer une référence unique pour le transfert. Veuillez réessayer.');
}

// Convert country codes to transfer direction
function getTransferDirection(fromCountry: string, toCountry: string): TransferDirection {
  const directionMap: Record<string, Record<string, TransferDirection>> = {
    'GA': {
      'FR': 'GABON_TO_FRANCE',
      'BE': 'GABON_TO_BELGIUM',
      'DE': 'GABON_TO_GERMANY',
      'CN': 'GABON_TO_CHINA',
      'US': 'GABON_TO_USA',
      'CA': 'GABON_TO_CANADA',
      'CH': 'GABON_TO_SWITZERLAND',
      'GB': 'GABON_TO_UK',
      'ES': 'GABON_TO_SPAIN',
      'IT': 'GABON_TO_ITALY',
      'NL': 'GABON_TO_NETHERLANDS',
      'MA': 'GABON_TO_MOROCCO',
      'SN': 'GABON_TO_SENEGAL'
    },
    'MA': {
      'GA': 'MOROCCO_TO_GABON',
      'SN': 'MOROCCO_TO_SENEGAL',
      'FR': 'MOROCCO_TO_FRANCE'
  },
   'SN': {
    'GA': 'SENEGAL_TO_GABON',
    'FR': 'SENEGAL_TO_FRANCE',
    'MA': 'SENEGAL_TO_MOROCCO'
  },
    'FR': {
      'GA': 'FRANCE_TO_GABON',
      'MA': 'FRANCE_TO_MOROCCO',
      'SN': 'FRANCE_TO_SENEGAL'
    },
    'BE': {
      'GA': 'BELGIUM_TO_GABON'
    },
    'DE': {
      'GA': 'GERMANY_TO_GABON'
    },
    'US': {
      'GA': 'USA_TO_GABON'
    },
    'CA': {
      'GA': 'CANADA_TO_GABON'
    },
    'CH': {
      'GA': 'SWITZERLAND_TO_GABON'
    },
    'GB': {
      'GA': 'UK_TO_GABON'
    },
    'ES': {
      'GA': 'SPAIN_TO_GABON'
    },
    'IT': {
      'GA': 'ITALY_TO_GABON'
    },
    'NL': {
      'GA': 'NETHERLANDS_TO_GABON'
    }
  };

  const direction = directionMap[fromCountry]?.[toCountry];
  if (!direction) {
    throw new Error('Direction de transfert non valide');
  }

  return direction;
}

// Calculate Airtel Money or Moov Money withdrawal fees based on amount
function calculateWithdrawalFees(amount: number, receivingMethod: ReceivingMethod): { 
  totalFees: number, 
  feeDetails: { amount: number, fee: number, description: string }[] 
} {
  const feeDetails: { amount: number, fee: number, description: string }[] = [];
  let totalFees = 0;

  if (receivingMethod === 'AIRTEL_MONEY') {
    // Airtel Money: 
    // - 3% up to 166,670 XAF
    // - Fixed 5,000 XAF for amounts between 166,671 and 500,000 XAF
    // - For amounts over 500,000 XAF, split into tranches
    if (amount <= 166670) {
      const fee = Math.round(amount * 0.03 / 5) * 5; // Round to nearest 5
      totalFees = fee;
      feeDetails.push({ 
        amount: amount, 
        fee: fee, 
        description: `3% sur ${Math.round(amount).toLocaleString('fr-FR')} XAF` 
      });
    } else if (amount <= 500000) {
      totalFees = 5000;
      feeDetails.push({ 
        amount: amount, 
        fee: 5000, 
        description: `Frais fixes pour montant entre 166 671 et 500 000 XAF` 
      });
    } else {
      // For amounts over 500,000 XAF, split into tranches
      const fullTranches = Math.floor(amount / 500000);
      const remainder = amount % 500000;
      
      // Add full tranches
      if (fullTranches > 0) {
        const trancheFee = fullTranches * 5000;
        totalFees += trancheFee;
        feeDetails.push({ 
          amount: fullTranches * 500000, 
          fee: trancheFee, 
          description: `${fullTranches} tranche(s) de 500 000 XAF à 5 000 XAF chacune` 
        });
      }
      
      // Add remainder
      if (remainder > 0) {
        let remainderFee = 0;
        if (remainder <= 166670) {
          remainderFee = Math.round(remainder * 0.03 / 5) * 5; // Round to nearest 5
          feeDetails.push({ 
            amount: remainder, 
            fee: remainderFee, 
            description: `3% sur le reste de ${Math.round(remainder).toLocaleString('fr-FR')} XAF` 
          });
        } else {
          remainderFee = 5000;
          feeDetails.push({ 
            amount: remainder, 
            fee: remainderFee, 
            description: `Frais fixes pour le reste entre 166 671 et 500 000 XAF` 
          });
        }
        totalFees += remainderFee;
      }
    }
  } else if (receivingMethod === 'MOOV_MONEY') {
    // Moov Money: 
    // - 3% up to 160,000 XAF
    // - Fixed 5,000 XAF for amounts between 160,001 and 500,000 XAF
    // - For amounts over 500,000 XAF, split into tranches
    if (amount <= 160000) {
      const fee = Math.round(amount * 0.03 / 5) * 5; // Round to nearest 5
      totalFees = fee;
      feeDetails.push({ 
        amount: amount, 
        fee: fee, 
        description: `3% sur ${Math.round(amount).toLocaleString('fr-FR')} XAF` 
      });
    } else if (amount <= 500000) {
      totalFees = 5000;
      feeDetails.push({ 
        amount: amount, 
        fee: 5000, 
        description: `Frais fixes pour montant entre 160 001 et 500 000 XAF` 
      });
    } else {
      // For amounts over 500,000 XAF, split into tranches
      const fullTranches = Math.floor(amount / 500000);
      const remainder = amount % 500000;
      
      // Add full tranches
      if (fullTranches > 0) {
        const trancheFee = fullTranches * 5000;
        totalFees += trancheFee;
        feeDetails.push({ 
          amount: fullTranches * 500000, 
          fee: trancheFee, 
          description: `${fullTranches} tranche(s) de 500 000 XAF à 5 000 XAF chacune` 
        });
      }
      
      // Add remainder
      if (remainder > 0) {
        let remainderFee = 0;
        if (remainder <= 160000) {
          remainderFee = Math.round(remainder * 0.03 / 5) * 5; // Round to nearest 5
          feeDetails.push({ 
            amount: remainder, 
            fee: remainderFee, 
            description: `3% sur le reste de ${Math.round(remainder).toLocaleString('fr-FR')} XAF` 
          });
        } else {
          remainderFee = 5000;
          feeDetails.push({ 
            amount: remainder, 
            fee: remainderFee, 
            description: `Frais fixes pour le reste entre 160 001 et 500 000 XAF` 
          });
        }
        totalFees += remainderFee;
      }
    }
  }
  
  // Ensure total fees are rounded to nearest 5
  totalFees = Math.round(totalFees / 5) * 5;
  
  return { totalFees, feeDetails };
}

// Get user's loyalty points
export async function getUserLoyaltyPoints(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('loyalty_points')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.loyalty_points || 0;
  } catch (error) {
    console.error('Error fetching user loyalty points:', error);
    return 0;
  }
}

// Calculate loyalty discount
export async function calculateLoyaltyDiscount(
  userId: string,
  pointsToUse: number,
  transferAmount: number,
  senderCurrency: string
): Promise<{
  discountAmount: number;
  discountPercentage: number;
  pointsUsed: number;
  remainingPoints: number;
}> {
  try {
    const { data, error } = await supabase
      .rpc('calculate_loyalty_discount', {
        user_id_param: userId,
        points_to_use: pointsToUse,
        transfer_amount: transferAmount,
        sender_currency: senderCurrency
      });

    if (error) throw error;
    
    const result = data?.[0];
    if (!result) {
      return {
        discountAmount: 0,
        discountPercentage: 0,
        pointsUsed: 0,
        remainingPoints: 0
      };
    }

    return {
      discountAmount: result.discount_amount || 0,
      discountPercentage: result.discount_percentage || 0,
      pointsUsed: result.points_used || 0,
      remainingPoints: result.remaining_points || 0
    };
  } catch (error) {
    console.error('Error calculating loyalty discount:', error);
    return {
      discountAmount: 0,
      discountPercentage: 0,
      pointsUsed: 0,
      remainingPoints: 0
    };
  }
}

// Check if transfer direction is eligible for loyalty points usage
export function isEligibleForLoyaltyDiscount(direction: string): boolean {
  // Only transfers FROM Gabon are eligible for loyalty discount
  return direction.startsWith('GABON_TO_');
}

// Get status label for display
export function getStatusLabel(status: string): string {
  const statusLabels: { [key: string]: string } = {
    'completed': 'Terminé',
    'pending': 'En attente',
    'cancelled': 'Annulé',
    'processing': 'En cours',
    'failed': 'Échoué'
  };
  return statusLabels[status] || status;
}

// Get payment instructions for pending transfers
export function getPaymentInstructions(paymentMethod: string, reference: string) {
  if (paymentMethod === 'BANK_TRANSFER') {
    return (
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions de paiement</h4>
        <p className="text-sm text-blue-800">
          Veuillez effectuer un virement bancaire avec la référence : <strong>{reference}</strong>
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Les détails bancaires vous ont été envoyés par email.
        </p>
      </div>
    );
  }
  return null;
}

// Calculate transfer details
export async function calculateTransferDetails(
  amount: number,
  direction: string,
  paymentMethod: PaymentMethod,
  receivingMethod: ReceivingMethod,
  isReceiveAmount: boolean = false,
  promoCode?: string,
  includeWithdrawalFees: boolean = false,
  loyaltyPointsToUse: number = 0,
  userId?: string
) {
  try {
    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Le montant doit être supérieur à 0');
    }

    // Parse direction into from/to countries
    const [fromCountry, toCountry] = direction.split('_TO_').map(part => {
      switch (part) {
        case 'GABON': return 'GA';
        case 'FRANCE': return 'FR';
        case 'BELGIUM': return 'BE';
        case 'GERMANY': return 'DE';
        case 'CHINA': return 'CN';
        case 'USA': return 'US';
        case 'CANADA': return 'CA';
        case 'SWITZERLAND': return 'CH';
        case 'UK': return 'GB';
        case 'SPAIN': return 'ES';
        case 'ITALY': return 'IT';
        case 'NETHERLANDS': return 'NL';
        case 'MOROCCO': return 'MA';
        case 'SENEGAL': return 'SN';
        default: throw new Error('Pays non valide dans la direction');
      }
    });

    // Convert to standard direction format
    const standardDirection = getTransferDirection(fromCountry, toCountry);

    // Determine currencies
    let fromCurrency: string, toCurrency: string;
    switch (fromCountry) {
      case 'FR':
      case 'BE':
      case 'DE':
      case 'ES':
      case 'IT':
      case 'NL':
        fromCurrency = 'EUR';
        break;
      case 'MA':
      case 'SN':
        fromCurrency = fromCountry === 'MA' ? 'MAD' : 'XOF';
        break;
      case 'CH':
        fromCurrency = 'CHF';
        break;
      case 'GB':
        fromCurrency = 'GBP';
        break;
      case 'US':
        fromCurrency = 'USD';
        break;
      case 'CA':
        fromCurrency = 'CAD';
        break;
      case 'CN':
        fromCurrency = 'CNY';
        break;
      default:
        fromCurrency = 'XAF';
    }
    
    switch (toCountry) {
      case 'FR':
      case 'BE':
      case 'DE':
      case 'ES':
      case 'IT':
      case 'NL':
        toCurrency = 'EUR';
        break;
      case 'MA':
      case 'SN':
        toCurrency = toCountry === 'MA' ? 'MAD' : 'XOF';
        break;
      case 'CH':
        toCurrency = 'CHF';
        break;
      case 'GB':
        toCurrency = 'GBP';
        break;
      case 'US':
        toCurrency = 'USD';
        break;
      case 'CA':
        toCurrency = 'CAD';
        break;
      case 'CN':
        toCurrency = 'CNY';
        break;
      default:
        toCurrency = 'XAF';
    }

    // Get exchange rate from database
    const { data: exchangeRateData, error: exchangeRateError } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .single();

    if (exchangeRateError || !exchangeRateData) {
      throw new Error(`Taux de change non disponible (${fromCurrency} → ${toCurrency})`);
    }

    const exchangeRate = exchangeRateData.rate;

    let feePercentage: number;

    // Get fees from database
    const { data: fees, error: feesError } = await supabase
      .from('transfer_fees')
      .select('fee_percentage')
      .eq('from_country', fromCountry)
      .eq('to_country', toCountry)
      .eq('payment_method', paymentMethod)
      .eq('receiving_method', receivingMethod)
      .maybeSingle();

    if (feesError) {
      console.error('Error fetching fees:', feesError);
      throw new Error(`Frais non disponibles pour cette combinaison (${fromCountry} → ${toCountry})`);
    }

    if (!fees) {
      // Try to find fees in default values
      const defaultFee = DEFAULT_TRANSFER_FEES.find(
        fee => fee.from_country === fromCountry && 
               fee.to_country === toCountry &&
               fee.payment_method === paymentMethod &&
               fee.receiving_method === receivingMethod
      );
      
      if (!defaultFee) {
        throw new Error(`Frais non disponibles pour cette combinaison (${fromCountry} → ${toCountry})`);
      }
      
      feePercentage = defaultFee.fee_percentage;
    } else {
      feePercentage = fees.fee_percentage;
    }

    let effectiveFeePercentage = feePercentage;
    
    // Apply promo code if provided
    let promoCodeId = null;
    if (promoCode) {
      try {
        // Get current user ID for per-user promo code validation
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;

        // Call the validate_promo_code function with the user_id parameter
        const params: any = {
          code_text: promoCode,
          transfer_direction: standardDirection
        };
        
        // Only include user_id if we have a logged-in user
        if (currentUserId) {
          params.user_id = currentUserId;
        }
        
        const { data: validation, error: validationError } = await supabase
          .rpc('validate_promo_code', params);

        if (validationError) {
          console.error('Promo code validation error:', validationError);
          throw new Error('Erreur lors de la validation du code promo');
        }

        if (!validation || !validation[0]) {
          throw new Error('Code promo invalide');
        }

        const promoValidation = validation[0];
        if (!promoValidation.valid) {
          throw new Error(promoValidation.message || 'Code promo invalide');
        }

        // Apply discount to KundaPay fees only
        if (promoValidation.discount_type === 'PERCENTAGE') {
          effectiveFeePercentage *= (1 - promoValidation.discount_value / 100);
        } else if (promoValidation.discount_type === 'FIXED') {
          // Pour les réductions fixes, on les convertit en pourcentage basé sur le montant
          const fixedDiscount = promoValidation.discount_value / amount;
          effectiveFeePercentage = Math.max(0, effectiveFeePercentage - fixedDiscount);
        }

        // Get promo code ID for tracking
        promoCodeId = promoValidation.promo_code_id;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error('Erreur lors de la validation du code promo');
        }
      }
    }

    let amountSent: number;
    let amountReceived: number;
    let kundapayFees: number;
    let withdrawalFees: number = 0;
    let withdrawalFeesDetails: { amount: number, fee: number, description: string }[] = [];
    let totalFees: number;
    let loyaltyDiscount = 0;
    let loyaltyPointsUsed = 0;
    let remainingLoyaltyPoints = 0;

    // Calculate loyalty discount if applicable
    if (loyaltyPointsToUse > 0 && userId && isEligibleForLoyaltyDiscount(standardDirection)) {
      const loyaltyResult = await calculateLoyaltyDiscount(
        userId,
        loyaltyPointsToUse,
        amount,
        fromCurrency
      );
      
      loyaltyDiscount = loyaltyResult.discountAmount;
      loyaltyPointsUsed = loyaltyResult.pointsUsed;
      remainingLoyaltyPoints = loyaltyResult.remainingPoints;
    }

    // Calculate withdrawal fees if applicable
    if (includeWithdrawalFees && toCountry === 'GA' && 
        (receivingMethod === 'AIRTEL_MONEY' || receivingMethod === 'MOOV_MONEY')) {
      
      if (isReceiveAmount) {
        // For receive amount, we need to calculate backwards
        amountReceived = amount;
        
        // First, calculate the amount without withdrawal fees
        const baseAmountSent = amount / (exchangeRate * (1 - effectiveFeePercentage));
        
        // Calculate KundaPay fees
        kundapayFees = baseAmountSent * effectiveFeePercentage;
        
        // Apply loyalty discount to KundaPay fees
        kundapayFees = Math.max(0, kundapayFees - loyaltyDiscount);
        
        // Calculate the amount that would be received without KundaPay fees
        const amountAfterKundapayFees = baseAmountSent - kundapayFees;
        const amountReceivedBeforeWithdrawalFees = amountAfterKundapayFees * exchangeRate;
        
        // Then calculate the withdrawal fees based on the received amount in XAF
        const withdrawalFeeResult = calculateWithdrawalFees(amountReceivedBeforeWithdrawalFees, receivingMethod);
        withdrawalFees = withdrawalFeeResult.totalFees;
        withdrawalFeesDetails = withdrawalFeeResult.feeDetails;
        
        // Convert withdrawal fees to sender currency
        const withdrawalFeesInSenderCurrency = withdrawalFees / exchangeRate;
        
        // Add withdrawal fees to the amount sent
        amountSent = baseAmountSent + withdrawalFeesInSenderCurrency;
        
        // Total fees
        totalFees = kundapayFees + withdrawalFeesInSenderCurrency;
      } else {
        // For send amount
        amountSent = amount;
        
        // Calculate KundaPay fees
        kundapayFees = amount * effectiveFeePercentage;
        
        // Apply loyalty discount to KundaPay fees
        kundapayFees = Math.max(0, kundapayFees - loyaltyDiscount);
        
        // Calculate the amount that would be received without withdrawal fees
        const amountAfterKundapayFees = amount - kundapayFees;
        const baseAmountReceived = amountAfterKundapayFees * exchangeRate;
        
        // Calculate withdrawal fees based on the received amount
        const withdrawalFeeResult = calculateWithdrawalFees(baseAmountReceived, receivingMethod);
        withdrawalFees = withdrawalFeeResult.totalFees;
        withdrawalFeesDetails = withdrawalFeeResult.feeDetails;
        
        // Adjust the amount received by subtracting the withdrawal fees
        amountReceived = baseAmountReceived - withdrawalFees;
        
        // Convert withdrawal fees to sender currency
        const withdrawalFeesInSenderCurrency = withdrawalFees / exchangeRate;
        
        // Total fees
        totalFees = kundapayFees + withdrawalFeesInSenderCurrency;
      }
    } else {
      // Standard calculation without withdrawal fees
      if (isReceiveAmount) {
        // Calculate from receive amount
        amountReceived = amount;
        
        // For Gabon to USA/other, we need to calculate the amount sent correctly
        // The formula is: amountSent = amountReceived / (exchangeRate * (1 - feePercentage))
        amountSent = amount / (exchangeRate * (1 - effectiveFeePercentage));
        
        // Calculate KundaPay fees based on the amount sent
        kundapayFees = amountSent * effectiveFeePercentage;
        
        // Apply loyalty discount to KundaPay fees
        kundapayFees = Math.max(0, kundapayFees - loyaltyDiscount);
        
        // Double-check that the amount received is correct
        // amountReceived should equal (amountSent - kundapayFees) * exchangeRate
        const calculatedAmountReceived = (amountSent - kundapayFees) * exchangeRate;
        
        // If there's a significant difference, adjust the calculation
        if (Math.abs(calculatedAmountReceived - amountReceived) > 0.01) {
          console.warn('Calculated amount received differs from expected amount received');
          console.warn(`Expected: ${amountReceived}, Calculated: ${calculatedAmountReceived}`);
          
          // Adjust the calculation to ensure consistency
          amountSent = amount / (exchangeRate * (1 - effectiveFeePercentage));
          kundapayFees = amountSent * effectiveFeePercentage;
          kundapayFees = Math.max(0, kundapayFees - loyaltyDiscount);
          amountReceived = (amountSent - kundapayFees) * exchangeRate;
        }
        
        totalFees = kundapayFees;
      } else {
        // Calculate from send amount
        amountSent = amount;
        kundapayFees = amount * effectiveFeePercentage;
        
        // Apply loyalty discount to KundaPay fees
        kundapayFees = Math.max(0, kundapayFees - loyaltyDiscount);
        
        amountReceived = (amount - kundapayFees) * exchangeRate;
        totalFees = kundapayFees;
      }
    }

    // Round amounts according to currency
    if (fromCurrency === 'XAF') {
      amountSent = Math.ceil(amountSent / 5) * 5;
      kundapayFees = Math.ceil(kundapayFees / 5) * 5;
      totalFees = Math.ceil(totalFees / 5) * 5;
    }
    if (toCurrency === 'XAF') {
      amountReceived = Math.floor(amountReceived / 5) * 5;
      withdrawalFees = Math.ceil(withdrawalFees / 5) * 5;
    }

    return {
      amountSent: Number(amountSent.toFixed(2)),
      kundapayFees: Number(kundapayFees.toFixed(2)),
      withdrawalFees: Number((withdrawalFees / exchangeRate).toFixed(2)),
      withdrawalFeesDetails,
      fees: Number(totalFees.toFixed(2)),
      amountReceived: Number(amountReceived.toFixed(2)),
      senderCurrency: fromCurrency,
      receiverCurrency: toCurrency,
      exchangeRate: Number(exchangeRate.toFixed(4)),
      direction: standardDirection,
      paymentMethod,
      receivingMethod,
      promoCodeId,
      originalFeePercentage: feePercentage,
      effectiveFeePercentage,
      includeWithdrawalFees,
      loyaltyDiscount: Number(loyaltyDiscount.toFixed(2)),
      loyaltyPointsUsed,
      remainingLoyaltyPoints
    };
  } catch (error) {
    console.error('Error in calculateTransferDetails:', error);
    throw error instanceof Error ? error : new Error('Une erreur inattendue est survenue');
  }
}