import React from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

const TopTransferFlows = () => {
  const topFlows = [
    {
      from: {
        country: 'France',
        flag: 'https://flagcdn.com/fr.svg',
        currency: 'EUR'
      },
      to: {
        country: 'Gabon',
        flag: 'https://flagcdn.com/ga.svg',
        currency: 'XAF'
      },
      amount: 73000,
      currency: 'EUR'
    },
    {
      from: {
        country: 'Gabon',
        flag: 'https://flagcdn.com/ga.svg',
        currency: 'XAF'
      },
      to: {
        country: 'France',
        flag: 'https://flagcdn.com/fr.svg',
        currency: 'EUR'
      },
      amount: 42000000,
      currency: 'XAF'
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-yellow-600 mr-3" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Nos plus grands flux de transfert
            </h2>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les volumes de transfert les plus importants traités par KundaPay depuis 5 mois seulement
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {topFlows.map((flow, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <img
                      src={flow.from.flag}
                      alt={`Drapeau ${flow.from.country}`}
                      className="w-8 h-6 rounded shadow-sm"
                    />
                    <span className="font-medium text-gray-700">{flow.from.country}</span>
                  </div>
                  
                  <ArrowRight className="h-6 w-6 text-yellow-500" />
                  
                  <div className="flex items-center space-x-2">
                    <img
                      src={flow.to.flag}
                      alt={`Drapeau ${flow.to.country}`}
                      className="w-8 h-6 rounded shadow-sm"
                    />
                    <span className="font-medium text-gray-700">{flow.to.country}</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-yellow-600 mb-2">
                  {formatCurrency(flow.amount, flow.currency)} {flow.currency}
                </div>
                <p className="text-gray-500 text-sm">
                  Volume total transféré en 5 mois
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Transferts sécurisés et vérifiés
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 text-lg">
            Rejoignez les centaines d'utilisateurs qui font confiance à KundaPay pour leurs transferts d'argent
          </p>
        </div>
      </div>
    </section>
  );
};

export default TopTransferFlows;