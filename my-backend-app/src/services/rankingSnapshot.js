const { RankingSnapshot, UserRanking } = require('../models');

async function getLatestSnapshot(userId) {
  if (!userId) {
    return null;
  }

  return RankingSnapshot.findOne({
    where: { user_id: userId },
    order: [['recorded_at', 'DESC']],
  });
}

async function recordSnapshotForUser(user, { jobId } = {}) {
  if (!user || !user.id) {
    return null;
  }

  const ranking = await UserRanking.findOne({ where: { user_id: user.id } });

  const snapshotPayload = {
    user_id: user.id,
    followers: typeof user.followers === 'number' ? user.followers : 0,
    public_repos: typeof user.public_repos === 'number' ? user.public_repos : 0,
    job_id: jobId || null,
    recorded_at: new Date(),
  };

  if (ranking) {
    snapshotPayload.score = ranking.score ?? null;
    snapshotPayload.global_rank = ranking.global_rank ?? null;
    snapshotPayload.country_rank = ranking.country_rank ?? null;
    snapshotPayload.ranking_calculated_at = ranking.last_calculated_at || null;
  }

  return RankingSnapshot.create(snapshotPayload);
}

function isSnapshotFresh(snapshot, user, thresholdMs) {
  if (!snapshot || !user || !thresholdMs) {
    return false;
  }

  const recordedAt = snapshot.recorded_at instanceof Date
    ? snapshot.recorded_at
    : new Date(snapshot.recorded_at);

  if (Number.isNaN(recordedAt.getTime())) {
    return false;
  }

  const ageMs = Date.now() - recordedAt.getTime();
  if (ageMs > thresholdMs) {
    return false;
  }

  const followersMatch = typeof snapshot.followers === 'number'
    && typeof user.followers === 'number'
    && snapshot.followers === user.followers;

  const reposMatch = typeof snapshot.public_repos === 'number'
    && typeof user.public_repos === 'number'
    && snapshot.public_repos === user.public_repos;

  return followersMatch && reposMatch;
}

module.exports = {
  getLatestSnapshot,
  recordSnapshotForUser,
  isSnapshotFresh,
};
