// src/utils/helpers.js
const config = require('../config/config.json');

function normalizeLocation(location) {
  if (!location) return null;

  const normalizedLocation = location.trim().toLowerCase();

  // Check for country match
  const countryMatch = config.locations.find(c => {
    const countryName = c.country.toLowerCase();
    const geoName = c.geoName.toLowerCase();

    // Check variations of the location
    return normalizedLocation === countryName ||
           normalizedLocation === geoName ||
           normalizedLocation.includes(countryName) ||
           normalizedLocation.includes(geoName) ||
           c.cities.some(city => normalizedLocation.includes(city.toLowerCase()));
  });

  return countryMatch ? countryMatch.geoName : null;
}

function formatDate(date) {
  return date ? new Date(date).toISOString() : null;
}

module.exports = {
  normalizeLocation,
  formatDate,
};