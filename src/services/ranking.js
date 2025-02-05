const { User, UserRanking, Activity, Repository } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

class RankingService {
  async calculateUserScore(user) {
    const baseScore = (user.followers * 2) + (user.public_repos * 5);
    
    const repoScore = user.Repositories.reduce((sum, repo) => 
      sum + (repo.stars || 0) + (repo.forks * 2), 0);
    
    const activityScore = await Activity.sum('commits', {
      where: {
        user_id: user.id,
        date: {
          [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      }
    }) || 0;

    return baseScore + repoScore + activityScore;
  }

  async updateUserRanking(userId) {
    const user = await User.findOne({
      where: { id: userId },
      include: [Repository, Activity]
    });

    if (!user) return null;

    const score = await this.calculateUserScore(user);
    
    const [ranking] = await UserRanking.findOrCreate({
      where: { user_id: userId },
      defaults: {
        country: user.location,
        score: score,
        total_commits: await this.calculateTotalCommits(userId),
        total_contributions: await this.calculateTotalContributions(userId)
      }
    });

    if (!ranking.isNewRecord) {
      await ranking.update({
        score,
        country: user.location,
        last_calculated_at: new Date()
      });
    }

    await this.updateRankings(user.location);
    return ranking;
  }

  async updateRankings(country = null) {
    const queryOptions = country ? { where: { country } } : {};
    
    await sequelize.transaction(async (t) => {
      const rankings = await UserRanking.findAll({
        ...queryOptions,
        order: [['score', 'DESC']],
        transaction: t
      });

      for (let i = 0; i < rankings.length; i++) {
        if (country) {
          await rankings[i].update({ country_rank: i + 1 }, { transaction: t });
        } else {
          await rankings[i].update({ global_rank: i + 1 }, { transaction: t });
        }
      }
    });
  }

  async calculateTotalCommits(userId) {
    return Activity.sum('commits', { where: { user_id: userId } }) || 0;
  }

  async calculateTotalContributions(userId) {
    const activities = await Activity.findAll({ where: { user_id: userId } });
    return activities.reduce((sum, activity) => 
      sum + activity.commits + activity.pull_requests + activity.issues_opened, 0);
  }
}

module.exports = new RankingService();