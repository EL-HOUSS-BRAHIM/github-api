// src/services/ranking.js
const { User, UserRanking, Activity, Repository } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { normalizeLocation } = require('../utils/helpers');
const githubService = require('./github');

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

      if (user.followers < 31) {
        console.log(`Skipping ranking for user ${user.username} - insufficient followers (${user.followers})`);
        return null;
      }

      // Use imported normalizeLocation instead of helpers
      const normalizedLocation = normalizeLocation(user.location);

      // Get existing ranking
      let ranking = await UserRanking.findOne({
        where: { user_id: userId }
      });

      // Check if we need to update
      const shouldUpdate = !ranking ||
                          this.shouldUpdateRanking(ranking, user) ||
                          ranking.country !== normalizedLocation;

      if (!shouldUpdate) {
        console.log(`Skipping update for ${user.username} - no significant changes`);
        return ranking;
      }

      const score = await this.calculateUserScore(user);
      const totalCommits = await this.calculateTotalCommits(userId);
      const totalContributions = await this.calculateTotalContributions(userId);

      const rankingPayload = {
        score,
        country: normalizedLocation,
        total_commits: totalCommits,
        total_contributions: totalContributions,
        last_calculated_at: new Date(),
        followers: user.followers,
        public_repos: user.public_repos,
      };

      if (!ranking) {
        ranking = await UserRanking.create({
          user_id: userId,
          global_rank: 0,
          country_rank: 0,
          ...rankingPayload,
        });
      } else {
        await ranking.update(rankingPayload);
      }

      // Update rankings after score change
      if (normalizedLocation) {
        await this.updateRankings(normalizedLocation);
      }
      await this.updateRankings();

      return ranking;
    } catch (error) {
      console.error('Error in updateUserRanking:', error);
      throw error;
    }
  }

  // Add helper method to check if update is needed
  shouldUpdateRanking(ranking, user) {
    const hoursSinceLastUpdate = (Date.now() - ranking.last_calculated_at) / (1000 * 60 * 60);

    // Always update if last update was more than 24 hours ago
    if (hoursSinceLastUpdate >= 24) return true;

    // Check if basic stats have changed
    if (ranking.followers == null || ranking.public_repos == null) {
      return true;
    }

    if (user.followers !== ranking.followers ||
        user.public_repos !== ranking.public_repos) {
      return true;
    }

    return false;
  }

  // Add this new method to fetch users by location
  async searchUsersByLocation(location, page = 1) {
    try {
      return githubService.searchUsersByLocation(location, page);
    } catch (error) {
      console.error(`Error searching users in ${location}:`, error);
      throw error;
    }
  }
}

module.exports = new RankingService();