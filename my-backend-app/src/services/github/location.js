const configJson = require('../../config/config.json');
const { chunk } = require('./transformers');

const countryVariations = {
  'morocco': ['MA', 'maroc', 'المغرب', 'maghreb', 'marocco', 'marruecos', 'مراكش', 'MAROCCO'],
  'united states': ['usa', 'u.s.a', 'united states of america', 'us', 'u.s.'],
  'united kingdom': ['uk', 'u.k', 'great britain', 'england'],
  'france': ['république française', 'republique francaise', 'francia'],
  'germany': ['deutschland', 'allemagne'],
  'spain': ['españa', 'espana', 'espagne'],
  'china': ['中国', 'zhongguo', 'prc'],
  'japan': ['日本', 'nippon', 'nihon'],
  'south korea': ['한국', 'hanguk', 'korea'],
  'russia': ['российская федерация', 'rossiya', 'russian federation'],
  'united arab emirates': ['uae', 'u.a.e', 'emirates'],
};

function findCountryConfig(searchLocation) {
  const locations = configJson.locations || [];
  const search = searchLocation.toLowerCase().trim();

  let countryConfig = locations.find((c) =>
    c.country.toLowerCase() === search ||
    c.geoName.toLowerCase() === search,
  );

  if (countryConfig) {
    return countryConfig;
  }

  return locations.find((c) => {
    const variations = countryVariations[c.country.toLowerCase()] || [];
    return variations.some((variation) => variation.toLowerCase() === search);
  });
}

function buildLocationQueries(countryConfig) {
  const queries = new Set();
  const variations = countryVariations[countryConfig.country.toLowerCase()] || [];

  queries.add(`location:"${countryConfig.geoName}"`);
  queries.add(`location:"${countryConfig.country}"`);
  queries.add(`location:${countryConfig.geoName}`);
  variations.forEach((variation) => queries.add(`location:"${variation}"`));

  if (countryConfig.cities?.length > 0) {
    const cityChunks = chunk(countryConfig.cities, 2);
    for (const cities of cityChunks) {
      const cityQuery = cities
        .map((city) => `location:"${city.trim()}"`)
        .join(' OR ');
      queries.add(`(${cityQuery})`);
    }
  }

  queries.add(`location:*${countryConfig.geoName}*`);
  queries.add(`location:*${countryConfig.country}*`);

  return Array.from(queries);
}

module.exports = {
  buildLocationQueries,
  findCountryConfig,
};
