const config = require('../../config');

const BASE_BACKOFF_MS = 30000;
const MAX_BACKOFF_MS = 15 * 60 * 1000;
const MIN_BACKOFF_MS = 5000;
const EXHAUSTED_LOG_INTERVAL_MS = 60000;

const tokens = Array.isArray(config.githubTokens)
  ? config.githubTokens.map((value) => ({
      value,
      cooldownUntil: 0,
      backoffLevel: 0,
    }))
  : [];

let currentTokenIndex = 0;
let lastExhaustedLogTime = 0;

function now() {
  return Date.now();
}

function hasTokens() {
  return tokens.length > 0;
}

function getTokenPoolSize() {
  return tokens.length;
}

function maskToken(token) {
  if (!token) {
    return 'unknown';
  }

  if (token.length <= 8) {
    return token;
  }

  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

function getNextToken() {
  if (!hasTokens()) {
    return null;
  }

  const startIndex = currentTokenIndex;
  const total = tokens.length;
  const nowMs = now();

  for (let offset = 0; offset < total; offset += 1) {
    const candidateIndex = (startIndex + offset) % total;
    const candidate = tokens[candidateIndex];

    if (candidate.cooldownUntil <= nowMs) {
      currentTokenIndex = (candidateIndex + 1) % total;
      return candidate.value;
    }
  }

  if (nowMs - lastExhaustedLogTime > EXHAUSTED_LOG_INTERVAL_MS) {
    const soonestAvailability = tokens.reduce(
      (min, token) => Math.min(min, token.cooldownUntil),
      Infinity,
    );
    const waitMs = Math.max(0, soonestAvailability - nowMs);
    const waitSeconds = Math.ceil(waitMs / 1000);
    console.warn(
      `[GitHub Tokens] All ${total} tokens are cooling down. Next token available in approximately ${waitSeconds}s.`,
    );
    lastExhaustedLogTime = nowMs;
  }

  return null;
}

function recordTokenSuccess(tokenValue) {
  if (!tokenValue) {
    return;
  }

  const entry = tokens.find((token) => token.value === tokenValue);
  if (!entry) {
    return;
  }

  entry.backoffLevel = 0;
  entry.cooldownUntil = 0;
}

function calculateCooldown(backoffLevel, resetTimestamp) {
  const exponentialDelay = Math.min(
    BASE_BACKOFF_MS * 2 ** Math.max(backoffLevel - 1, 0),
    MAX_BACKOFF_MS,
  );

  let resetDelay = 0;
  if (resetTimestamp) {
    const resetMs = Number(resetTimestamp) * 1000;
    if (!Number.isNaN(resetMs)) {
      resetDelay = Math.max(0, resetMs - now());
    }
  }

  return Math.max(exponentialDelay, resetDelay, MIN_BACKOFF_MS);
}

function markTokenRateLimited(tokenValue, resetTimestamp) {
  if (!tokenValue) {
    return;
  }

  const entry = tokens.find((token) => token.value === tokenValue);
  if (!entry) {
    return;
  }

  entry.backoffLevel += 1;
  const cooldownMs = calculateCooldown(entry.backoffLevel, resetTimestamp);
  entry.cooldownUntil = now() + cooldownMs;

  const waitSeconds = Math.ceil(cooldownMs / 1000);
  console.warn(
    `[GitHub Tokens] Token ${maskToken(tokenValue)} hit the rate limit. Cooling down for ${waitSeconds}s (level ${entry.backoffLevel}).`,
  );
}

function getCooldownSummary() {
  if (!hasTokens()) {
    return null;
  }

  const nowMs = now();
  const waits = tokens
    .map((token) => Math.max(0, token.cooldownUntil - nowMs))
    .filter((ms) => ms > 0);

  if (waits.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...waits),
    max: Math.max(...waits),
  };
}

module.exports = {
  hasTokens,
  getTokenPoolSize,
  getNextToken,
  recordTokenSuccess,
  markTokenRateLimited,
  getCooldownSummary,
};
