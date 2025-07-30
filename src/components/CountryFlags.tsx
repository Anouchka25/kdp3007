import React from 'react';

const countries = [
  { code: 'fr', name: 'France' },
  { code: 'be', name: 'Belgique' },
  { code: 'de', name: 'Allemagne' },
  { code: 'cn', name: 'Chine' },
  { code: 'us', name: 'États-Unis' },
  { code: 'ca', name: 'Canada' },
  { code: 'ch', name: 'Suisse' },
  { code: 'gb', name: 'Royaume-Uni' },
  { code: 'es', name: 'Espagne' },
  { code: 'it', name: 'Italie' },
  { code: 'nl', name: 'Pays-Bas' }
];

const CountryFlags = () => {
  // Répartir les pays autour du Gabon
  const half = Math.ceil(countries.length / 2);
  const leftSide = countries.slice(0, half);
  const rightSide = countries.slice(half);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Nos flux de transferts actuels
        </h2>
        <p className="mt-4 text-xl text-gray-600">
          Nos flux de transferts d'argent entre le Gabon et Europe, Chine, Canada, USA).<br />
          D'autres pays viendront au fur et à mesure se compléter à nos flux actuels.
        </p>

        <div className="mt-12 flex flex-wrap justify-center items-center gap-6">
          {leftSide.map(({ code, name }) => (
            <div key={code} className="flex flex-col items-center">
              <img src={`https://flagcdn.com/${code}.svg`} alt={name} className="w-16 h-16 object-cover rounded-full shadow-md" />
              <span className="mt-2 font-medium">{name}</span>
            </div>
          ))}

          <div className="flex flex-col items-center">
            <img src="https://flagcdn.com/ga.svg" alt="Gabon" className="w-20 h-20 object-cover rounded-full border-4 border-blue-500 shadow-lg" />
            <span className="mt-2 font-semibold text-blue-700">Gabon</span>
          </div>

          {rightSide.map(({ code, name }) => (
            <div key={code} className="flex flex-col items-center">
              <img src={`https://flagcdn.com/${code}.svg`} alt={name} className="w-16 h-16 object-cover rounded-full shadow-md" />
              <span className="mt-2 font-medium">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CountryFlags;
