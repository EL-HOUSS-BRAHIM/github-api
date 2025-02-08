function validateUsername(username) {
  // Allow alphanumeric, underscore, and hyphen characters, also limit length (GitHub usernames are max 39 characters)
  return /^[a-zA-Z0-9_-]{1,39}$/.test(username);
}

function validatePagination(page, perPage) {
  const pageInt = parseInt(page, 10);
  const perPageInt = parseInt(perPage, 10);
  return Number.isInteger(pageInt) && pageInt > 0 && Number.isInteger(perPageInt) && perPageInt > 0 && perPageInt <= 100; // Limit perPage to a reasonable value
}

module.exports = {
  validateUsername,
  validatePagination,
};