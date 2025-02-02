function validateUsername(username) {
  // Implement your username validation logic (e.g., using regex)
  return /^[a-zA-Z0-9-]+$/.test(username); // Example: only alphanumeric and hyphens
}

function validatePagination(page, perPage) {
  const pageInt = parseInt(page);
  const perPageInt = parseInt(perPage);
  return Number.isInteger(pageInt) && pageInt > 0 && Number.isInteger(perPageInt) && perPageInt > 0;
}

module.exports = {
  validateUsername,
  validatePagination,
};
