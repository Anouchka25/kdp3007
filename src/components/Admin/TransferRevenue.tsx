import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, TrendingUp, Calendar, ArrowUpDown, Info } from 'lucide-react';

interface RevenueByDirection {
  direction: string;
  total_fees: number;
  total_withdrawal_fees: number;
  total_additional_fees: number;
  net_revenue: number;
  currency: string;
  transfer_count: number;
}

interface TransferRevenueItem {
  transfer_id: string;
  reference: string;
  amount_sent: number;
  fees: number;
  kundapay_fees: number;
  withdrawal_fees: number;
  sender_currency: string;
  receiver_currency: string;
  payment_method: string;
  receiving_method: string;
  status: string;
  created_at: string;
  user_id: string;
  direction: string;
  total_additional_fees: number;
  net_revenue: number;
}

const TransferRevenue = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueByDirection, setRevenueByDirection] = useState<RevenueByDirection[]>([]);
  const [totalNetRevenue, setTotalNetRevenue] = useState<{[key: string]: number}>({});
  const [totalTransfers, setTotalTransfers] = useState(0);
  const [timeframe, setTimeframe] = useState<'month' | '3months' | 'year' | 'all'>('month');
  const [currentMonth, setCurrentMonth] = useState<string>(
    new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  );
  const [recentTransfers, setRecentTransfers] = useState<TransferRevenueItem[]>([]);
  const [showAdditionalFeesInfo, setShowAdditionalFeesInfo] = useState(false);

  useEffect(() => {
    fetchRevenueData();
  }, [timeframe]);

  const fetchRevenueData = async () => {
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

      // Fetch completed transfers
      let query = supabase
        .from('transfer_revenue')
        .select('*')
        .eq('status', 'completed');

      // Apply date filter if needed
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data by direction
      const revenueMap = new Map<string, RevenueByDirection>();
      const totals: {[key: string]: number} = {};
      let count = 0;

      data?.forEach(transfer => {
        const direction = transfer.direction || 'Unknown';
        const currency = transfer.sender_currency;
        const key = `${direction}-${currency}`;

        if (!revenueMap.has(key)) {
          revenueMap.set(key, {
            direction,
            total_fees: 0,
            total_withdrawal_fees: 0,
            total_additional_fees: 0,
            net_revenue: 0,
            currency,
            transfer_count: 0
          });
        }

        const entry = revenueMap.get(key)!;
        
        // Calculate fees
        const kundapayFees = Number(transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0))) || 0;
        const withdrawalFees = Number(transfer.withdrawal_fees || 0);
        const additionalFees = Number(transfer.total_additional_fees || 0);
        const netRevenue = Number(transfer.net_revenue || 0);

        entry.total_fees += kundapayFees;
        entry.total_withdrawal_fees += withdrawalFees;
        entry.total_additional_fees += additionalFees;
        entry.net_revenue += netRevenue;
        entry.transfer_count += 1;

        // Track totals
        if (!totals[currency]) {
          totals[currency] = 0;
        }
        totals[currency] += netRevenue;
        count++;
      });

      setRevenueByDirection(Array.from(revenueMap.values()));
      setTotalNetRevenue(totals);
      setTotalTransfers(count);
      
      // Get recent transfers for detailed view
      if (data) {
        setRecentTransfers(data.slice(0, 20));
      }

    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError('Une erreur est survenue lors du chargement des données de revenus');
    } finally {
      setLoading(false);
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

  // Convert amount to EUR for comparison
  const convertToEUR = (amount: number, currency: string): number => {
    if (currency === 'EUR') return amount;
    if (currency === 'XAF') return amount / 655.96; // 1 EUR = 655.96 XAF
    if (currency === 'USD') return amount / 1.08; // 1 EUR = 1.08 USD
    if (currency === 'CNY') return amount / 7.51; // 1 EUR = 7.51 CNY
    return amount; // Default case
  };

  // Get timeframe label
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'month':
        return currentMonth;
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Revenus des transferts</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'month' 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ce mois
          </button>
          <button
            onClick={() => setTimeframe('3months')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === '3months' 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            3 mois
          </button>
          <button
            onClick={() => setTimeframe('year')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'year' 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Année
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'all' 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tout
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Revenus nets</h3>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="mt-4">
            {Object.entries(totalNetRevenue).length > 0 ? (
              Object.entries(totalNetRevenue).map(([currency, amount]) => (
                <p key={currency} className="text-3xl font-bold text-yellow-600">
                  {amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {currency}
                </p>
              ))
            ) : (
              <p className="text-3xl font-bold text-yellow-600">0</p>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {getTimeframeLabel()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Nombre de transferts</h3>
            <ArrowUpDown className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-yellow-600">{totalTransfers}</p>
          <p className="mt-1 text-sm text-gray-500">
            {getTimeframeLabel()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Revenu moyen par transfert</h3>
            <TrendingUp className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="mt-4">
            {Object.entries(totalNetRevenue).length > 0 && totalTransfers > 0 ? (
              Object.entries(totalNetRevenue).map(([currency, amount]) => (
                <p key={currency} className="text-3xl font-bold text-yellow-600">
                  {(amount / totalTransfers).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {currency}
                </p>
              ))
            ) : (
              <p className="text-3xl font-bold text-yellow-600">0</p>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {getTimeframeLabel()}
          </p>
        </div>
      </div>

      {/* Revenue by Direction */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Revenus par direction</h3>
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
                  Nombre de transferts
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenu moyen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenueByDirection.length > 0 ? (
                revenueByDirection
                  .sort((a, b) => {
                    // Sort by EUR equivalent of net revenue
                    const aEUR = convertToEUR(a.net_revenue, a.currency);
                    const bEUR = convertToEUR(b.net_revenue, b.currency);
                    return bEUR - aEUR;
                  })
                  .map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getDirectionLabel(item.direction)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.total_fees.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {item.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.total_withdrawal_fees.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {item.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.total_additional_fees.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {item.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {item.net_revenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {item.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.transfer_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.transfer_count > 0 
                          ? (item.net_revenue / item.transfer_count).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                          : '0'} {item.currency}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucun revenu pour cette période
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transfers with Revenue Details */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-yellow-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Détail des revenus par transfert</h3>
            </div>
            <button 
              onClick={() => setShowAdditionalFeesInfo(!showAdditionalFeesInfo)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              title="Informations sur les frais annexes"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {showAdditionalFeesInfo && (
          <div className="bg-blue-50 p-4 border-b border-blue-100">
            <h4 className="text-sm font-medium text-blue-800 mb-2">À propos des frais annexes</h4>
            <p className="text-sm text-blue-700">
              Les frais annexes sont des frais supplémentaires qui sont déduits des revenus KundaPay. 
              Ces frais sont convertis dans la devise du transfert pour le calcul des revenus nets.
              Par exemple, si un transfert est en EUR et que des frais annexes sont en XAF, 
              ces frais sont convertis en EUR avant d'être déduits des revenus.
            </p>
          </div>
        )}
        
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
                  Direction
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais KundaPay
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais annexes
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenus nets
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransfers.length > 0 ? (
                recentTransfers.map((transfer, index) => (
                  <tr key={transfer.transfer_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transfer.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDirectionLabel(transfer.direction)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transfer.amount_sent.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0))).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transfer.total_additional_fees > 0 ? (
                        <span className="text-red-600">
                          {transfer.total_additional_fees.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                        </span>
                      ) : (
                        <span>0 {transfer.sender_currency}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {transfer.net_revenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {transfer.sender_currency}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucun transfert pour cette période
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

export default TransferRevenue;