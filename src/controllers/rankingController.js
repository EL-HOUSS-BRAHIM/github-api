const { User } = require('../models');
const rankingService = require('../services/ranking');
const { UserRanking } = require('../models');
const { APIError } = require('../utils/errors');

async function calculateUserRanking(req, res, next) {
  const { username } = req.params;

  try {
    const user = await User.findOne({ 
      where: { username },
      attributes: ['id', 'username', 'location']
    });
    
    if (!user) {
      throw new APIError(404, 'User not found');
    }

    const ranking = await rankingService.updateUserRanking(user.id);
    if (!ranking) {
      throw new APIError(404, 'Could not calculate ranking');
    }

    return res.json({
      success: true,
      ranking: {
        score: ranking.score,
        globalRank: ranking.global_rank,
        countryRank: ranking.country_rank,
        totalCommits: ranking.total_commits,
        totalContributions: ranking.total_contributions,
        lastCalculated: ranking.last_calculated_at
      }
    });

  } catch (error) {
    console.error('Error calculating user ranking:', error);
    return next(error instanceof APIError ? error : new APIError(500, 'Internal server error'));
  }
}

async function getUserRanking(req, res, next) {
  const { username } = req.params;

  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw new APIError(404, 'User not found');
    }

    const ranking = await UserRanking.findOne({ where: { user_id: user.id } });
    if (!ranking) {
      throw new APIError(404, 'Ranking not found');
    }

    return res.json(ranking);
  } catch (error) {
    console.error('Error fetching user ranking:', error);
    return next(error);
  }
}

module.exports = {
  calculateUserRanking,
  getUserRanking,
};