const { User } = require('../models');
const rankingService = require('../services/ranking');
const githubService = require('../services/github'); // Add this import
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

// Update the harvestUsersByCountry function
async function harvestUsersByCountry(req, res, next) {
  const { country } = req.params;

  if (!country || typeof country !== 'string') {
    return next(new APIError(400, 'Invalid country parameter'));
  }

  // Format country name properly
  const formattedCountry = country.charAt(0).toUpperCase() + 
                          country.slice(1).toLowerCase();

  try {
    console.log(`Starting user harvest for country: ${formattedCountry}`);
    
    const searchResults = await githubService.searchUsersByLocation(formattedCountry);
    
    console.log(`Search results:`, {
      total_count: searchResults.total_count,
      items_count: searchResults.items?.length,
      rate_limit: searchResults.rateLimit
    });

    if (!searchResults.items?.length) {
      return res.json({
        success: true,
        message: `No users found for ${formattedCountry}`,
        total_found: 0,
        processed: 0,
        users: []
      });
    }

    const processedUsers = [];
    const errors = [];
    
    for (const user of searchResults.items) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`Processing user: ${user.login}`);
        const userProfile = await githubService.getUserProfile(user.login);
        
        if (userProfile) {
          const [dbUser] = await User.findOrCreate({
            where: { username: userProfile.login },
            defaults: {
              username: userProfile.login,
              location: userProfile.location,
              full_name: userProfile.name,
              avatar_url: userProfile.avatar_url,
              bio: userProfile.bio,
              company: userProfile.company,
              website: userProfile.blog,
              followers: userProfile.followers,
              following: userProfile.following,
              public_repos: userProfile.public_repos
            }
          });

          await rankingService.updateUserRanking(dbUser.id);
          processedUsers.push({
            username: user.login,
            followers: userProfile.followers,
            location: userProfile.location
          });
        }
      } catch (userError) {
        console.error(`Error processing user ${user.login}:`, userError);
        errors.push({
          username: user.login,
          error: userError.message
        });
        
        if (userError.status === 403) {
          console.log('Rate limit reached, stopping batch');
          break;
        }
      }
    }

    return res.json({
      success: true,
      message: `Processed GitHub users from ${formattedCountry}`,
      total_found: searchResults.total_count,
      processed: processedUsers.length,
      users: processedUsers,
      errors: errors.length > 0 ? errors : undefined,
      rate_limit: searchResults.rateLimit
    });

  } catch (error) {
    console.error(`Error harvesting users from ${formattedCountry}:`, error);
    
    if (error instanceof APIError) {
      return next(error);
    }
    
    return next(new APIError(500, `Failed to harvest users from ${formattedCountry}`));
  }
}

async function getCountryRankings(req, res, next) {
  const { country } = req.params;
  const { page = 1, per_page = 50 } = req.query;

  try {
    const rankings = await UserRanking.findAll({
      where: { country },
      include: [{
        model: User,
        attributes: ['username', 'full_name', 'avatar_url', 'location']
      }],
      order: [['score', 'DESC']],
      limit: parseInt(per_page),
      offset: (parseInt(page) - 1) * parseInt(per_page)
    });

    const total = await UserRanking.count({ where: { country } });

    return res.json({
      total,
      page: parseInt(page),
      per_page: parseInt(per_page),
      rankings: rankings.map(rank => ({
        username: rank.User.username,
        full_name: rank.User.full_name,
        avatar_url: rank.User.avatar_url,
        location: rank.User.location,
        score: rank.score,
        country_rank: rank.country_rank,
        global_rank: rank.global_rank,
        total_commits: rank.total_commits,
        total_contributions: rank.total_contributions
      }))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  calculateUserRanking,
  getUserRanking,
  harvestUsersByCountry,
  getCountryRankings, // Export the new method
};