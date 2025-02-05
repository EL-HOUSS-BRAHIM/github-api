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
          [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      }
    }) || 0;

    return baseScore + repoScore + activityScore;
  }

  async calculateTotalCommits(userId) {
    try {
      const totalCommits = await Activity.sum('commits', {
        where: { user_id: userId }
      });
      return totalCommits || 0;
    } catch (error) {
      console.error('Error calculating total commits:', error);
      return 0;
    }
  }

  async calculateTotalContributions(userId) {
    try {
      const activities = await Activity.findAll({
        where: { user_id: userId },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('commits')), 'commits'],
          [sequelize.fn('SUM', sequelize.col('pull_requests')), 'pull_requests'],
          [sequelize.fn('SUM', sequelize.col('issues_opened')), 'issues_opened']
        ],
        raw: true
      });

      const totals = activities[0];
      return (
        (totals.commits || 0) +
        (totals.pull_requests || 0) +
        (totals.issues_opened || 0)
      );
    } catch (error) {
      console.error('Error calculating total contributions:', error);
      return 0;
    }
  }

  async updateRankings(country = null) {
    try {
      const rankings = await UserRanking.findAll({
        where: country ? { country } : {},
        order: [['score', 'DESC']],
      });

      // Update ranks
      for (let i = 0; i < rankings.length; i++) {
        const ranking = rankings[i];
        if (country) {
          await ranking.update({ country_rank: i + 1 });
        } else {
          await ranking.update({ global_rank: i + 1 });
        }
      }
    } catch (error) {
      console.error('Error updating rankings:', error);
      throw error;
    }
  }

  async updateUserRanking(userId) {
    try {
      const user = await User.findOne({
        where: { id: userId },
        include: [Repository, Activity]
      });

      if (!user) return null;

      const score = await this.calculateUserScore(user);
      const totalCommits = await this.calculateTotalCommits(userId);
      const totalContributions = await this.calculateTotalContributions(userId);

      // Use try-catch to debug the UserRanking.findOrCreate call
      try {
        const [ranking, created] = await UserRanking.findOrCreate({
          where: { user_id: userId },
          defaults: {
            user_id: userId,
            country: user.location,
            score: score,
            total_commits: totalCommits,
            total_contributions: totalContributions,
            last_calculated_at: new Date(),
            global_rank: 0,
            country_rank: 0
          }
        });

        if (!created) {
          await ranking.update({
            score,
            country: user.location,
            total_commits: totalCommits,
            total_contributions: totalContributions,
            last_calculated_at: new Date()
          });
        }

        // Update rankings after score change
        if (user.location) {
          await this.updateRankings(user.location);
        }
        await this.updateRankings(); // Update global rankings

        return ranking;
      } catch (findOrCreateError) {
        console.error('Error in findOrCreate:', findOrCreateError);
        throw findOrCreateError;
      }
    } catch (error) {
      console.error('Error in updateUserRanking:', error);
      throw error;
    }
  }
}

module.exports = new RankingService();