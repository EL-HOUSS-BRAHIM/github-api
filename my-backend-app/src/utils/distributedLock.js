const { randomUUID } = require('crypto');

const RELEASE_LOCK_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`;

async function runWithDistributedLock(redisClient, lockKey, ttlMs, task) {
  const token = randomUUID();
  let lockAcquired = false;

  try {
    const result = await redisClient.set(lockKey, token, 'PX', ttlMs, 'NX');

    if (result !== 'OK') {
      return false;
    }

    lockAcquired = true;
    await task();
    return true;
  } finally {
    if (lockAcquired) {
      try {
        await redisClient.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
      } catch (releaseError) {
        console.warn(`Failed to release lock "${lockKey}":`, releaseError);
      }
    }
  }
}

module.exports = {
  runWithDistributedLock,
};
