const redisClient = require('../config/redis');

async function deleteKeysByPattern(pattern) {
  if (!pattern) {
    throw new Error('A pattern is required to delete keys from Redis.');
  }

  let cursor = '0';
  let totalDeleted = 0;

  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    if (Array.isArray(keys) && keys.length > 0) {
      const deleted = await redisClient.del(...keys);
      totalDeleted += deleted;
    }
    cursor = nextCursor;
  } while (cursor !== '0');

  return totalDeleted;
}

module.exports = {
  deleteKeysByPattern,
};
