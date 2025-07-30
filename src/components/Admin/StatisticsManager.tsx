import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, PieChart, DollarSign, Users, ArrowUpDown, Calendar, TrendingUp, CheckCircle } from 'lucide-react';

interface UserStat {
  user_id: string;
  user_email: string;
  user_name: string;
  total_amount: number;
  currency: string;
  transfer_count: number;
}

interface DirectionStat {
  direction: string;
  total_amount: number;
  currency: string;
  transfer_count: number;
  total_fees: number;
  total_withdrawal_fees: number;
  total_additional_fees: number;
  net_revenue: number;
}

interface MonthlyRevenue {
  month: string;
  year: number;
  total_fees: number;
  total_withdrawal_fees: number;
  total_additional_fees: number;
  net_revenue: number;
  currency: string;
  transfer_count: number;
  direction?: string;
}

interface AdditionalFee {
  id: string;
  transfer_id: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
}

const StatisticsManager = () => {
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [directionStats, setDirectionStats] = useState<DirectionStat[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<{[key: string]: number}>({});
  const [totalCount, setTotalCount] = useState(0);
  const [totalFees, setTotalFees] = useState<{[key: string]: number}>({});
  const [totalWithdrawalFees, setTotalWithdrawalFees] = useState<{[key: string]: number}>({});
  const [totalAdditionalFees, setTotalAdditionalFees] = useState<{[key: string]: number}>({});
  const [totalNetRevenue, setTotalNetRevenue] = useState<{[key: string]: number}>({});
  const [totalFeesEUR, setTotalFeesEUR] = useState<number>(0);
  const [totalNetRevenueEUR, setTotalNetRevenueEUR] = useState<number>(0);
  const [timeframe, setTimeframe] = useState<'all' | 'month' | '3months' | 'year'>('all');
  const [recentCompletedTransfers, setRecentCompletedTransfers] = useState<any[]>([]);
  const [feeCurrency, setFeeCurrency] = useState<string>('XAF');
  const [showAdditionalFeesInfo, setShowAdditionalFeesInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [cumulativeRevenue, setCumulativeRevenue] = useState<{[key: string]: number}>({});
  const [cumulativeTransferCount, setCumulativeTransferCount] = useState<number>(0);

  useEffect(() => {
    fetchStatistics();
    fetchRecentCompletedTransfers();
  }, [timeframe, feeCurrency, viewMode]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare date filters based on timeframe
      let startDate: Date | null = null;
      if (timeframe === 'month') {
        const today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (timeframe === '3months') {
        const today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      } else if (timeframe === 'year') {
        const today = new Date();
        startDate = new Date(today.getFullYear(), 0, 1);
      }

      // Fetch all completed transfers to calculate accurate statistics
      let query = supabase
        .from('transfers')
        .select(`
          id, 
          created_at, 
          amount_sent, 
          fees, 
          kundapay_fees, 
          withdrawal_fees, 
          sender_currency, 
          receiver_currency,
          status, 
          direction,
          user_id,
          user:users!transfers_user_id_fkey (
            email, 
            first_name, 
            last_name
          )
        `)
        .eq('status', 'completed');

      // Apply date filter if needed
      if (startDate && viewMode === 'monthly') {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: transfers, error: transfersError } = await query;

      if (transfersError) throw transfersError;

      // Fetch additional fees for all transfers
      const { data: additionalFees, error: additionalFeesError } = await supabase
        .from('additional_fees')
        .select('*');

      if (additionalFeesError) throw additionalFeesError;

      // Group additional fees by transfer_id
      const feesByTransfer: Record<string, AdditionalFee[]> = {};
      additionalFees?.forEach(fee => {
        if (!feesByTransfer[fee.transfer_id]) {
          feesByTransfer[fee.transfer_id] = [];
        }
        feesByTransfer[fee.transfer_id].push(fee);
      });

      if (!transfers || transfers.length === 0) {
        setUserStats([]);
        setDirectionStats([]);
        setMonthlyRevenue([]);
        setTotalAmount({});
        setTotalCount(0);
        setTotalFees({});
        setTotalWithdrawalFees({});
        setTotalAdditionalFees({});
        setTotalNetRevenue({});
        setTotalFeesEUR(0);
        setTotalNetRevenueEUR(0);
        setCumulativeRevenue({});
        setCumulativeTransferCount(0);
        setLoading(false);
        return;
      }

      // Process user statistics
      const userStatsMap = new Map<string, UserStat>();
      
      transfers.forEach(transfer => {
        const userId = transfer.user_id;
        const amount = Number(transfer.amount_sent) || 0;
        const currency = transfer.sender_currency;
        const email = transfer.user?.email || 'Unknown';
        const firstName = transfer.user?.first_name || '';
        const lastName = transfer.user?.last_name || '';
        
        if (!userStatsMap.has(userId)) {
          userStatsMap.set(userId, {
            user_id: userId,
            user_email: email,
            user_name: `${firstName} ${lastName}`,
            total_amount: 0,
            currency: currency,
            transfer_count: 0
          });
        }
        
        const stat = userStatsMap.get(userId)!;
        stat.total_amount += amount;
        stat.transfer_count += 1;
      });
      
      setUserStats(Array.from(userStatsMap.values()));

      // Process direction statistics
      const directionStatsMap = new Map<string, DirectionStat>();
      
      transfers.forEach(transfer => {
        const direction = transfer.direction || 'Unknown';
        const amount = Number(transfer.amount_sent) || 0;
        const currency = transfer.sender_currency;
        
        // Calculate KundaPay fees (excluding withdrawal fees)
        const kundapayFee = Number(transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0))) || 0;
        
        // Get withdrawal fees
        const withdrawalFee = Number(transfer.withdrawal_fees || 0);
        
        // Get additional fees for this transfer
        const transferAdditionalFees = feesByTransfer[transfer.id] || [];
        const additionalFeesAmount = transferAdditionalFees.reduce((sum, fee) => {
          // Convert fee to transfer currency if needed
          if (fee.currency === currency) {
            return sum + fee.amount;
          } else {
            // Simple conversion - in a real app, use proper conversion rates
            if (fee.currency === 'XAF' && currency === 'EUR') {
              return sum + (fee.amount / 655.96);
            } else if (fee.currency === 'EUR' && currency === 'XAF') {
              return sum + (fee.amount * 655.96);
            }
            return sum + fee.amount; // Fallback if no conversion available
          }
        }, 0);
        
        // Calculate net revenue (KundaPay fees minus additional fees)
        const netRevenue = kundapayFee - additionalFeesAmount;
        
        if (!directionStatsMap.has(direction)) {
          directionStatsMap.set(direction, {
            direction: direction,
            total_amount: 0,
            currency: currency,
            transfer_count: 0,
            total_fees: 0,
            total_withdrawal_fees: 0,
            total_additional_fees: 0,
            net_revenue: 0
          });
        }
        
        const stat = directionStatsMap.get(direction)!;
        stat.total_amount += amount;
        stat.transfer_count += 1;
        stat.total_fees += kundapayFee;
        stat.total_withdrawal_fees += withdrawalFee;
        stat.total_additional_fees += additionalFeesAmount;
        stat.net_revenue += netRevenue;
      });
      
      setDirectionStats(Array.from(directionStatsMap.values()));

      // Process monthly revenue by direction
      const monthlyData: { [key: string]: MonthlyRevenue } = {};
      
      transfers.forEach(transfer => {
        const date = new Date(transfer.created_at);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('fr-FR', { month: 'long' });
        const direction = transfer.direction || 'Unknown';
        const currency = transfer.sender_currency;
        
        // Create a unique key that includes direction and currency
        const key = `${monthYear}-${direction}-${currency}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = {
            month: monthName,
            year: date.getFullYear(),
            total_fees: 0,
            total_withdrawal_fees: 0,
            total_additional_fees: 0,
            net_revenue: 0,
            currency: currency,
            transfer_count: 0,
            direction: direction
          };
        }
        
        // Only add kundapay_fees to the total, not withdrawal_fees
        const kundapayFee = Number(transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0))) || 0;
        const withdrawalFee = Number(transfer.withdrawal_fees || 0);
        
        // Get additional fees for this transfer
        const transferAdditionalFees = feesByTransfer[transfer.id] || [];
        const additionalFeesAmount = transferAdditionalFees.reduce((sum, fee) => {
          // Convert fee to transfer currency if needed
          if (fee.currency === currency) {
            return sum + fee.amount;
          } else {
            // Simple conversion - in a real app, use proper conversion rates
            if (fee.currency === 'XAF' && currency === 'EUR') {
              return sum + (fee.amount / 655.96);
            } else if (fee.currency === 'EUR' && currency === 'XAF') {
              return sum + (fee.amount * 655.96);
            }
            return sum + fee.amount; // Fallback if no conversion available
          }
        }, 0);
        
        const netRevenue = kundapayFee - additionalFeesAmount;
        
        monthlyData[key].total_fees += kundapayFee;
        monthlyData[key].total_withdrawal_fees += withdrawalFee;
        monthlyData[key].total_additional_fees += additionalFeesAmount;
        monthlyData[key].net_revenue += netRevenue;
        monthlyData[key].transfer_count += 1;
      });
      
      // Sort monthly revenue by date (newest first)
      const sortedMonthlyRevenue = Object.values(monthlyData).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        const monthOrder = {
          'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
          'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
        };
        return monthOrder[b.month as keyof typeof monthOrder] - monthOrder[a.month as keyof typeof monthOrder];
      });
      
      setMonthlyRevenue(sortedMonthlyRevenue);

      // Calculate totals - only include kundapay_fees, not withdrawal_fees
      const totals: {[key: string]: number} = {};
      const feeTotals: {[key: string]: number} = {};
      const withdrawalFeeTotals: {[key: string]: number} = {};
      const additionalFeeTotals: {[key: string]: number} = {};
      const netRevenueTotals: {[key: string]: number} = {};
      let count = 0;
      let totalFeesInEUR = 0;
      let totalNetRevenueInEUR = 0;
      
      // Calculate cumulative revenue
      const cumulativeRevenueTotals: {[key: string]: number} = {};
      let cumulativeCount = 0;
      
      transfers.forEach(transfer => {
        const currency = transfer.sender_currency;
        if (!totals[currency]) {
          totals[currency] = 0;
        }
        if (!feeTotals[currency]) {
          feeTotals[currency] = 0;
        }
        if (!withdrawalFeeTotals[currency]) {
          withdrawalFeeTotals[currency] = 0;
        }
        if (!additionalFeeTotals[currency]) {
          additionalFeeTotals[currency] = 0;
        }
        if (!netRevenueTotals[currency]) {
          netRevenueTotals[currency] = 0;
        }
        if (!cumulativeRevenueTotals[currency]) {
          cumulativeRevenueTotals[currency] = 0;
        }
        
        totals[currency] += Number(transfer.amount_sent) || 0;
        
        // Only add kundapay_fees to the total, not withdrawal_fees
        const kundapayFee = Number(transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0))) || 0;
        const withdrawalFee = Number(transfer.withdrawal_fees || 0);
        
        // Get additional fees for this transfer
        const transferAdditionalFees = feesByTransfer[transfer.id] || [];
        const additionalFeesAmount = transferAdditionalFees.reduce((sum, fee) => {
          // Convert fee to transfer currency if needed
          if (fee.currency === currency) {
            return sum + fee.amount;
          } else {
            // Simple conversion - in a real app, use proper conversion rates
            if (fee.currency === 'XAF' && currency === 'EUR') {
              return sum + (fee.amount / 655.96);
            } else if (fee.currency === 'EUR' && currency === 'XAF') {
              return sum + (fee.amount * 655.96);
            }
            return sum + fee.amount; // Fallback if no conversion available
          }
        }, 0);
        
        const netRevenue = kundapayFee - additionalFeesAmount;
        
        feeTotals[currency] += kundapayFee;
        withdrawalFeeTotals[currency] += withdrawalFee;
        additionalFeeTotals[currency] += additionalFeesAmount;
        netRevenueTotals[currency] += netRevenue;
        
        // Add to cumulative totals (all time)
        cumulativeRevenueTotals[currency] += netRevenue;
        cumulativeCount++;
        
        // Convert to EUR for total calculation
        if (currency === 'EUR') {
          totalFeesInEUR += kundapayFee;
          totalNetRevenueInEUR += netRevenue;
        } else if (currency === 'XAF') {
          // Convert XAF to EUR (1 EUR = 655.96 XAF)
          totalFeesInEUR += kundapayFee / 655.96;
          totalNetRevenueInEUR += netRevenue / 655.96;
        } else if (currency === 'USD') {
          // Convert USD to EUR (1 EUR = 1.08 USD)
          totalFeesInEUR += kundapayFee / 1.08;
          totalNetRevenueInEUR += netRevenue / 1.08;
        } else if (currency === 'CNY') {
          // Convert CNY to EUR (1 EUR = 7.51 CNY)
          totalFeesInEUR += kundapayFee / 7.51;
          totalNetRevenueInEUR += netRevenue / 7.51;
        }
        
        count++;
      });

      setTotalAmount(totals);
      setTotalCount(count);
      setTotalFees(feeTotals);
      setTotalWithdrawalFees(withdrawalFeeTotals);
      setTotalAdditionalFees(additionalFeeTotals);
      setTotalNetRevenue(netRevenueTotals);
      setTotalFeesEUR(totalFeesInEUR);
      setTotalNetRevenueEUR(totalNetRevenueInEUR);
      setCumulativeRevenue(cumulativeRevenueTotals);
      setCumulativeTransferCount(cumulativeCount);

    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Une erreur est survenue lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCompletedTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          id,
          reference,
          created_at,
          amount_sent,
          amount_received,
          fees,
          kundapay_fees,
          withdrawal_fees,
          sender_currency,
          receiver_currency,
          direction,
          payment_method,
          receiving_method,
          status,
          user:users!transfers_user_id_fkey (
            email, first_name, last_name
          ),
          beneficiaries (
            first_name, last_name, email
          ),
          additional_fees:additional_fees (
            id, amount, currency, description, created_at
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentCompletedTransfers(data || []);
    } catch (err) {
      console.error('Error fetching recent transfers:', err);
    }
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
      'GABON_TO_GERMANY': 'Gabon → Allemagne'
    };
    return directions[direction] || direction;
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

  // Convert amount to selected currency
  const convertToCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // Conversion rates
    const rates: Record<string, Record<string, number>> = {
      'EUR': {
        'XAF': 655.96,
        'USD': 1.08,
        'CNY': 7.51
      },
      'XAF': {
        'EUR': 1/655.96,
        'USD': 1/610.35,
        'CNY': 0.011445
      },
      'USD': {
        'EUR': 0.93,
        'XAF': 610.35,
        'CNY': 6.95
      },
      'CNY': {
        'EUR': 0.133,
        'XAF': 87.34,
        'USD': 0.144
      }
    };
    
    if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
      return amount * rates[fromCurrency][toCurrency];
    }
    
    // Fallback to EUR as intermediate currency if direct conversion not available
    if (rates[fromCurrency] && rates[fromCurrency]['EUR'] && rates['EUR'][toCurrency]) {
      return amount * rates[fromCurrency]['EUR'] * rates['EUR'][toCurrency];
    }
    
    console.error(`Conversion not available from ${fromCurrency} to ${toCurrency}`);
    return amount;
  };

  // Calculate total additional fees for a transfer
  const calculateTotalAdditionalFees = (transfer: any) => {
    if (!transfer.additional_fees || transfer.additional_fees.length === 0) {
      return 0;
    }
    
    return transfer.additional_fees.reduce((total: number, fee: any) => {
      // Convert to transfer currency if needed
      if (fee.currency === transfer.sender_currency) {
        return total + fee.amount;
      }
      
      return total + convertToCurrency(fee.amount, fee.currency, transfer.sender_currency);
    }, 0);
  };

  // Get timeframe label
  const getTimeframeLabel = () => {
    if (viewMode === 'cumulative') {
      return 'Revenus cumulés (depuis le début)';
    }
    
    switch (timeframe) {
      case 'month':
        const now = new Date();
        return now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      case '3months':
        return 'Les 3 derniers mois';
      case 'year':
        return 'Cette année';
      case 'all':
        return 'Tous les temps';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistiques des transferts validés</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timeframe and Currency Selector */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Période et devise d'affichage</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode d'affichage</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-md ${
                  viewMode === 'monthly' 
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setViewMode('cumulative')}
                className={`px-4 py-2 rounded-md ${
                  viewMode === 'cumulative' 
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cumulé
              </button>
            </div>
          </div>
          
          {viewMode === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTimeframe('all')}
                  className={`px-4 py-2 rounded-md ${
                    timeframe === 'all' 
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tout
                </button>
                <button
                  onClick={() => setTimeframe('month')}
                  className={`px-4 py-2 rounded-md ${
                    timeframe === 'month' 
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Mois en cours
                </button>
                <button
                  onClick={() => setTimeframe('3months')}
                  className={`px-4 py-2 rounded-md ${
                    timeframe === '3months' 
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  3 derniers mois
                </button>
                <button
                  onClick={() => setTimeframe('year')}
                  className={`px-4 py-2 rounded-md ${
                    timeframe === 'year' 
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Année
                </button>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Devise d'affichage</label>
            <select
              value={feeCurrency}
              onChange={(e) => setFeeCurrency(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
            >
              <option value="XAF">XAF (FCFA)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="CNY">CNY (¥)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Total des transferts</h3>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="mt-4">
            {viewMode === 'monthly' ? (
              Object.entries(totalAmount).length > 0 ? (
                Object.entries(totalAmount).map(([currency, amount]) => (
                  <p key={currency} className="text-3xl font-bold text-yellow-600">
                    {feeCurrency === currency 
                      ? amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                      : convertToCurrency(amount, currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                    } {feeCurrency}
                    {currency !== feeCurrency && (
                      <span className="block text-sm text-gray-500">
                        ({amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {currency})
                      </span>
                    )}
                  </p>
                ))
              ) : (
                <p className="text-3xl font-bold text-yellow-600">0 {feeCurrency}</p>
              )
            ) : (
              // Cumulative view
              Object.entries(totalAmount).length > 0 ? (
                Object.entries(totalAmount).map(([currency, amount]) => (
                  <p key={currency} className="text-3xl font-bold text-yellow-600">
                    {feeCurrency === currency 
                      ? amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                      : convertToCurrency(amount, currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                    } {feeCurrency}
                    {currency !== feeCurrency && (
                      <span className="block text-sm text-gray-500">
                        ({amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {currency})
                      </span>
                    )}
                  </p>
                ))
              ) : (
                <p className="text-3xl font-bold text-yellow-600">0 {feeCurrency}</p>
              )
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Nombre de transferts</h3>
            <ArrowUpDown className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-yellow-600">
            {viewMode === 'monthly' ? totalCount : cumulativeTransferCount}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Revenus nets KundaPay</h3>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-4">
            {viewMode === 'monthly' ? (
              Object.entries(totalNetRevenue).length > 0 ? (
                Object.entries(totalNetRevenue).map(([currency, amount]) => (
                  <p key={currency} className="text-3xl font-bold text-green-600">
                    {feeCurrency === currency 
                      ? amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                      : convertToCurrency(amount, currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                    } {feeCurrency}
                    {currency !== feeCurrency && (
                      <span className="block text-sm text-gray-500">
                        ({amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {currency})
                      </span>
                    )}
                  </p>
                ))
              ) : (
                <p className="text-3xl font-bold text-green-600">0 {feeCurrency}</p>
              )
            ) : (
              // Cumulative view
              Object.entries(cumulativeRevenue).length > 0 ? (
                Object.entries(cumulativeRevenue).map(([currency, amount]) => (
                  <p key={currency} className="text-3xl font-bold text-green-600">
                    {feeCurrency === currency 
                      ? amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                      : convertToCurrency(amount, currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                    } {feeCurrency}
                    {currency !== feeCurrency && (
                      <span className="block text-sm text-gray-500">
                        ({amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {currency})
                      </span>
                    )}
                  </p>
                ))
              ) : (
                <p className="text-3xl font-bold text-green-600">0 {feeCurrency}</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <BarChart className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {viewMode === 'monthly' ? 'Revenus mensuels par direction' : 'Revenus cumulés par direction'}
            </h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">{getTimeframeLabel()}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {viewMode === 'monthly' ? 'Mois' : 'Direction'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {viewMode === 'monthly' ? 'Direction' : ''}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais KundaPay bruts
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais de retrait
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais annexes
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenus nets
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Équivalent en {feeCurrency}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre de transferts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {viewMode === 'monthly' ? (
                monthlyRevenue.length > 0 ? (
                  monthlyRevenue.map((stat, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stat.month} {stat.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getDirectionLabel(stat.direction || 'Unknown')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(stat.total_fees).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(stat.total_withdrawal_fees).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(stat.total_additional_fees || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {Number(stat.net_revenue).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {convertToCurrency(Number(stat.net_revenue), stat.currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.transfer_count}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                      Aucune donnée disponible
                    </td>
                  </tr>
                )
              ) : (
                // Cumulative view - show direction stats
                directionStats.length > 0 ? (
                  directionStats.map((stat, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" colSpan={2}>
                        {getDirectionLabel(stat.direction)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(stat.total_fees).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(stat.total_withdrawal_fees).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(stat.total_additional_fees || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {Number(stat.net_revenue).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {convertToCurrency(Number(stat.net_revenue), stat.currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.transfer_count}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                      Aucune donnée disponible
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics by Direction */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <BarChart className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Statistiques par direction</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais KundaPay bruts
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais de retrait
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais annexes
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenus nets
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Équivalent en {feeCurrency}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre de transferts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {directionStats.length > 0 ? (
                directionStats.map((stat, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getDirectionLabel(stat.direction)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.total_amount).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.total_fees).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.total_withdrawal_fees).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.total_additional_fees || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {Number(stat.net_revenue).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {convertToCurrency(Number(stat.net_revenue), stat.currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.transfer_count}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucune donnée disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Completed Transfers */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Transferts récemment terminés</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expéditeur
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bénéficiaire
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais KundaPay
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais de retrait
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais annexes
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenus nets
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCompletedTransfers.length > 0 ? (
                recentCompletedTransfers.map((transfer, index) => {
                  // Calculate KundaPay fees (excluding withdrawal fees)
                  const kundapayFee = Number(transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0))) || 0;
                  
                  // Get withdrawal fees
                  const withdrawalFee = Number(transfer.withdrawal_fees || 0);
                  
                  // Get additional fees
                  const additionalFees = transfer.additional_fees || [];
                  const additionalFeesTotal = calculateTotalAdditionalFees(transfer);
                  
                  // Calculate net revenue (KundaPay fees minus additional fees)
                  const netRevenue = kundapayFee - additionalFeesTotal;
                  
                  return (
                    <tr key={transfer.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transfer.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transfer.user?.first_name} {transfer.user?.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transfer.beneficiaries && transfer.beneficiaries.length > 0 
                          ? `${transfer.beneficiaries[0].first_name} ${transfer.beneficiaries[0].last_name}`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(transfer.amount_sent).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                        {transfer.sender_currency !== feeCurrency && (
                          <span className="block text-xs text-gray-500">
                            ({convertToCurrency(Number(transfer.amount_sent), transfer.sender_currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {kundapayFee.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                        {transfer.sender_currency !== feeCurrency && (
                          <span className="block text-xs text-gray-500">
                            ({convertToCurrency(kundapayFee, transfer.sender_currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {withdrawalFee.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                        {transfer.sender_currency !== feeCurrency && withdrawalFee > 0 && (
                          <span className="block text-xs text-gray-500">
                            ({convertToCurrency(withdrawalFee, transfer.sender_currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {additionalFeesTotal.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                        {transfer.sender_currency !== feeCurrency && additionalFeesTotal > 0 && (
                          <span className="block text-xs text-gray-500">
                            ({convertToCurrency(additionalFeesTotal, transfer.sender_currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency})
                          </span>
                        )}
                        {additionalFees.length > 0 && (
                          <span className="text-xs text-gray-500 block">
                            ({additionalFees.length} frais)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {netRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                        {transfer.sender_currency !== feeCurrency && (
                          <span className="block text-xs text-gray-500">
                            ({convertToCurrency(netRevenue, transfer.sender_currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getDirectionLabel(transfer.direction)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucun transfert récent
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics by User */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <PieChart className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Statistiques par utilisateur</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Équivalent en {feeCurrency}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre de transferts
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant moyen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userStats.length > 0 ? (
                userStats.map((stat, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.user_name || 'Utilisateur inconnu'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.total_amount).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {stat.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {convertToCurrency(Number(stat.total_amount), stat.currency, feeCurrency).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {feeCurrency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.transfer_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.transfer_count > 0 
                        ? (Number(stat.total_amount) / stat.transfer_count).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) 
                        : '0'} {stat.currency}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucune donnée disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatisticsManager;