import React from 'react';

const Hero = () => {
  return (
    <div className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">KundaPay :</span>
                <span className="block text-yellow-500">Le transfert en toute confiance </span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Transférez de l'argent facilement entre le Gabon, l'Europe, la Chine, USA avec KundaPay. Profitez de frais compétitifs et d'une expérience utilisateur optimisée.
              </p>
            </div>

            {/* Bloc Taux de Change */}
            <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Taux de change
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-lg font-medium">
                    1 EUR = 655,96 XAF
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
      <p className="text-lg font-medium">1 EUR = 0,94 CHF</p>
    </div>
    <div className="bg-yellow-50 rounded-lg p-4">
      <p className="text-lg font-medium">1 EUR = 0,86 GBP</p>
    </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-lg font-medium">
                    1 EUR = 7,51 CNY
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-lg font-medium">
                    1 EUR = 1,45 CAD
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-lg font-medium">
                    1 EUR = 1,08 USD
                  </p>
                </div>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
};

export default Hero;
