import React from 'react';

const countries = [
  { code: 'fr', name: 'France' },
  { code: 'be', name: 'Belgique' },
  { code: 'de', name: 'Allemagne' },
  { code: 'cn', name: 'Chine' },
  { code: 'us', name: 'États-Unis' },
  { code: 'ca', name: 'Canada' },
  { code: 'ga', name: 'Gabon' }, // mettre au centre ensuite si tu veux
  { code: 'ch', name: 'Suisse' },
  { code: 'gb', name: 'Royaume-Uni' },
  { code: 'es', name: 'Espagne' },
  { code: 'it', name: 'Italie' },
  { code: 'nl', name: 'Pays-Bas' },
  { code: 'ma', name: 'Maroc' },
  { code: 'sn', name: 'Sénégal' }
];

const CountryFlags = () => {
  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Nos flux de transferts actuels
        </h2>
        <p className="mt-4 text-xl text-gray-600">
          Nos flux de transferts d'argent entre le Gabon, Sénégal, Maroc, Europe, Chine, Canada, USA.<br />
          D'autres pays viendront au fur et à mesure se compléter à nos flux actuels.
        </p>

        <div className="mt-12 relative">
          <div className="flex gap-8 animate-slide whitespace-nowrap">
            {countries.map(({ code, name }) => (
              <div key={code} className="flex flex-col items-center min-w-[90px]">
                <img
                  src={`https://flagcdn.com/${code}.svg`}
                  alt={name}
                  className={`w-16 h-16 object-cover rounded-full shadow-md ${
                    code === 'ga' ? 'border-4 border-blue-500' : ''
                  }`}
                />
                <span className={`mt-2 text-sm font-medium ${code === 'ga' ? 'text-blue-700 font-bold' : ''}`}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CountryFlags;
