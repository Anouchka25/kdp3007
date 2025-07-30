import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import TransfersManager from '../components/Admin/TransfersManager';
import UsersManager from '../components/Admin/UsersManager';
import ExchangeRatesManager from '../components/Admin/ExchangeRatesManager';
import TransferFeesManager from '../components/Admin/TransferFeesManager';
import PromoCodesManager from '../components/Admin/PromoCodesManager';
import TransferConditionsManager from '../components/Admin/TransferConditionsManager';
import WeeklyLimitManager from '../components/Admin/WeeklyLimitManager';
import StatisticsManager from '../components/Admin/StatisticsManager';
import TransferRevenue from '../components/Admin/TransferRevenue';
import Navbar from '../components/Navbar';
import { Home, Users, DollarSign, Percent, Tag, Settings, Trash2, BarChart, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stats {
  userCount: number;
  uniqueBeneficiaryCount: number;
  transferStats: {
    direction: string;
    count: number;
    totalAmount: number;
    currency: string;
  }[];
}

interface MonthlyRevenueByDirection {
  direction: string;
  total: number;
  currency: string;
  count: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('transfers');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>(
    new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  );
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueByDirection[]>([]);
  const [totalRevenueEUR, setTotalRevenueEUR] = useState<number>(0);

  useEffect(() => {
    fetchStats();
    fetchMonthlyRevenue();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Get all beneficiaries
      const { data: beneficiaries, error: beneficiariesError } = await supabase
        .from('beneficiaries')
        .select(`
          id,
          email
        `);

      if (beneficiariesError) throw beneficiariesError;

      // Count unique beneficiaries by email
      const uniqueEmails = new Set();
      beneficiaries?.forEach(b => {
        if (b.email) uniqueEmails.add(b.email.toLowerCase());
      });

      // Get all completed transfers
      const { data: transfers, error: transfersError } = await supabase
        .from('transfers')
        .select('*')
        .eq('status', 'completed');

      if (transfersError) throw transfersError;

      // Aggregate transfer stats by direction
      const statsByDirection = transfers?.reduce((acc, transfer) => {
        // Skip if no direction
        if (!transfer.direction) return acc;

        if (!acc[transfer.direction]) {
          acc[transfer.direction] = {
            direction: transfer.direction,
            count: 0,
            totalAmount: 0,
            currency: transfer.sender_currency
          };
        }
        acc[transfer.direction].count++;
        acc[transfer.direction].totalAmount += Number(transfer.amount_sent) || 0;
        return acc;
      }, {} as Record<string, any>);

      setStats({
        userCount: users?.length || 0,
        uniqueBeneficiaryCount: uniqueEmails.size,
        transferStats: Object.values(statsByDirection || {})
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Une erreur est survenue lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyRevenue = async () => {
    try {
      // Get current month's first and last day
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Format dates for query
      const startDate = firstDay.toISOString();
      const endDate = lastDay.toISOString();
      
      // Get completed transfers for current month
      const { data: transfers, error } = await supabase
        .from('transfers')
        .select('fees, kundapay_fees, withdrawal_fees, sender_currency, direction')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      if (error) throw error;
      
      // Calculate total fees by direction and currency
      const feesByDirectionAndCurrency: Record<string, MonthlyRevenueByDirection> = {};
      let totalEUR = 0;
      
      transfers?.forEach(transfer => {
        const currency = transfer.sender_currency;
        const direction = transfer.direction || 'Unknown';
        const key = `${direction}-${currency}`;
        
        // Only count KundaPay fees, not withdrawal fees
        const kundapayFees = Number(transfer.kundapay_fees || (transfer.fees - (transfer.withdrawal_fees || 0))) || 0;
        
        if (!feesByDirectionAndCurrency[key]) {
          feesByDirectionAndCurrency[key] = {
            direction,
            total: 0,
            currency,
            count: 0
          };
        }
        
        feesByDirectionAndCurrency[key].total += kundapayFees;
        feesByDirectionAndCurrency[key].count += 1;
        
        // Convert to EUR for total calculation
        if (currency === 'EUR') {
          totalEUR += kundapayFees;
        } else if (currency === 'XAF') {
          // Convert XAF to EUR (1 EUR = 655.96 XAF)
          totalEUR += kundapayFees / 655.96;
        }
      });
      
      setMonthlyRevenue(Object.values(feesByDirectionAndCurrency));
      setTotalRevenueEUR(totalEUR);
      
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
    }
  };

  const cleanupTestData = async () => {
    try {
      setCleanupLoading(true);
      setError(null);

      // Get test users first
      const { data: testUsers } = await supabase
        .from('users')
        .select('id')
        .in('email', ['alloglacons.ga@gmail.com', 'minkoueobamea@gmail.com']);

      if (testUsers && testUsers.length > 0) {
        const testUserIds = testUsers.map(u => u.id);

        // First get all transfers from test users
        const { data: testTransfers } = await supabase
          .from('transfers')
          .select('id')
          .in('user_id', testUserIds);

        if (testTransfers && testTransfers.length > 0) {
          const transferIds = testTransfers.map(t => t.id);

          // Delete additional fees first
          await supabase
            .from('additional_fees')
            .delete()
            .in('transfer_id', transferIds);

          // Delete notifications first
          await supabase
            .from('notifications')
            .delete()
            .in('transfer_id', transferIds);

          // Then delete beneficiaries
          await supabase
            .from('beneficiaries')
            .delete()
            .in('transfer_id', transferIds);

          // Finally delete transfers
          await supabase
            .from('transfers')
            .delete()
            .in('user_id', testUserIds);
        }

        // Refresh stats
        await fetchStats();
        alert('Les données de test ont été supprimées avec succès');
      } else {
        alert('Aucune donnée de test à supprimer');
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      setError('Une erreur est survenue lors de la suppression des données de test');
    } finally {
      setCleanupLoading(false);
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

  // Function to convert XAF to EUR
  const convertToEUR = (amount: number, currency: string): number => {
    if (currency === 'EUR') return amount;
    if (currency === 'XAF') return amount / 655.96; // 1 EUR = 655.96 XAF
    return amount; // Default case
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <Navbar /> */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Administration KundaPay</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
            >
              <Home className="h-5 w-5 mr-2" />
              Retour à l'accueil
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Revenue Card */}
        <div className="mb-8 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center mb-4">
            <Calendar className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-bold">Revenus du mois de {currentMonth}</h2>
          </div>
          
          {monthlyRevenue.length > 0 ? (
            <div className="space-y-6">
              {/* Total for all directions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-yellow-400 pb-4">
                <div>
                  <p className="text-yellow-100 text-sm">Revenus totaux (frais KundaPay uniquement)</p>
                  <p className="text-3xl font-bold">
                    {totalRevenueEUR.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} EUR
                  </p>
                  {monthlyRevenue.some(item => item.currency === 'XAF') && (
                    <p className="text-sm text-yellow-100">
                      {monthlyRevenue
                        .filter(item => item.currency === 'XAF')
                        .reduce((sum, item) => sum + item.total, 0)
                        .toLocaleString('fr-FR')} XAF
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-yellow-100 text-sm">Nombre de transferts</p>
                  <p className="text-3xl font-bold">
                    {monthlyRevenue.reduce((sum, item) => sum + item.count, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-yellow-100 text-sm">Revenu moyen par transfert</p>
                  <p className="text-3xl font-bold">
                    {monthlyRevenue.reduce((sum, item) => sum + item.count, 0) > 0 
                      ? (totalRevenueEUR / 
                         monthlyRevenue.reduce((sum, item) => sum + item.count, 0)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                      : '0'} EUR
                  </p>
                </div>
              </div>
              
              {/* Breakdown by direction */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Détail par direction</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthlyRevenue.map((item, index) => (
                    <div key={index} className="bg-yellow-400 bg-opacity-20 rounded-lg p-4">
                      <h4 className="font-medium mb-2">{getDirectionLabel(item.direction)}</h4>
                      <div className="flex justify-between mb-1">
                        <span className="text-yellow-100">Revenus:</span>
                        <span className="font-medium">
                          {item.total.toLocaleString('fr-FR')} {item.currency}
                          {item.currency === 'XAF' && (
                            <span className="block text-xs text-yellow-100">
                              ({(item.total / 655.96).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} EUR)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-100">Transferts:</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-yellow-100">Aucun revenu pour ce mois</p>
          )}
        </div>

        {/* Statistiques globales */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Utilisateurs</h3>
                <Users className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-yellow-600">{stats.userCount}</p>
              <p className="text-sm text-gray-500">expéditeurs enregistrés</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Bénéficiaires uniques</h3>
                <Users className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-yellow-600">{stats.uniqueBeneficiaryCount}</p>
              <p className="text-sm text-gray-500">bénéficiaires distincts</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Transferts terminés</h3>
                <BarChart className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="mt-4 space-y-3">
                {stats.transferStats.length > 0 ? (
                  stats.transferStats.map((stat) => (
                    <div key={stat.direction} className="flex justify-between items-center">
                      <span className="text-gray-600">{getDirectionLabel(stat.direction)}</span>
                      <div className="text-right">
                        <span className="font-medium text-yellow-600">
                          {stat.totalAmount.toLocaleString('fr-FR')} {stat.currency}
                        </span>
                        <span className="text-gray-500 text-sm block">
                          ({stat.count} transfert{stat.count > 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Aucun transfert terminé</p>
                )}
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white p-1 rounded-lg shadow-sm mb-6">
            <TabsTrigger value="transfers" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Transferts
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="rates" className="flex items-center">
              <Percent className="h-4 w-4 mr-2" />
              Taux de change
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Frais
            </TabsTrigger>
            <TabsTrigger value="promo" className="flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Codes promo
            </TabsTrigger>
            <TabsTrigger value="weekly-limits" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Plafonds
            </TabsTrigger>
            <TabsTrigger value="conditions" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Conditions
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Plafonds
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Statistiques
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Revenus
            </TabsTrigger>
          </TabsList>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <TabsContent value="transfers">
              <TransfersManager />
            </TabsContent>

            <TabsContent value="users">
              <UsersManager />
            </TabsContent>

            <TabsContent value="rates">
              <ExchangeRatesManager />
            </TabsContent>

            <TabsContent value="fees">
              <TransferFeesManager />
            </TabsContent>

            <TabsContent value="promo">
              <PromoCodesManager />
            </TabsContent>

            <TabsContent value="weekly-limits">
              <WeeklyLimitManager />
            </TabsContent>

            <TabsContent value="conditions">
              <TransferConditionsManager />
            </TabsContent>
            
            <TabsContent value="limits">
              <WeeklyLimitManager />
            </TabsContent>

            <TabsContent value="statistics">
              <StatisticsManager />
            </TabsContent>

            <TabsContent value="revenue">
              <TransferRevenue />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;