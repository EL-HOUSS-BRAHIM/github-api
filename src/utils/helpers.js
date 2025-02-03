// Example helper functions
function formatDate(date) {
  return date ? new Date(date).toISOString() : null;
}

module.exports = {
  formatDate,
};