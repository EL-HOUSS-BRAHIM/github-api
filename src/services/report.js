async function generateReport(user) {
  const report = {
    profile: {
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      location: user.location,
      company: user.company,
      website: user.website,
      followers: user.followers,
      following: user.following,
      public_repos: user.public_repos,
      social: user.social,
    },
    repositories: user.Repositories.map(repo => ({
      name: repo.name,
      description: repo.description,
      stars: repo.stars,
      forks: repo.forks,
      issues: repo.issues,
      last_commit: repo.last_commit,
      commit_count: repo.commit_count,
      pull_request_count: repo.pull_request_count,
      topics: repo.topics,
    })),
    activity: {
      daily: {},
      monthly: {},
    },
    trophies: [], // Calculate trophies (implement your logic)
    achievements: [], // Calculate achievements (implement your logic)
    country_ranking: 'N/A', // Calculate country ranking (implement your logic)
  };

  // Aggregate activity data with proper date handling
  user.Activities.forEach(activity => {
    // Convert activity to plain object if it's a Sequelize instance
    const activityData = activity.toJSON ? activity.toJSON() : activity;
    
    // Handle date conversion
    const activityDate = activityData.date instanceof Date ? 
      activityData.date : 
      new Date(activityData.date);
      
    if (!isNaN(activityDate.getTime())) {
      const date = activityDate.toISOString().slice(0, 10);
      const month = date.slice(0, 7);

      // Initialize daily counts
      if (!report.activity.daily[date]) {
        report.activity.daily[date] = {
          commits: 0,
          pull_requests: 0,
          issues_opened: 0,
        };
      }

      // Initialize monthly counts
      if (!report.activity.monthly[month]) {
        report.activity.monthly[month] = {
          commits: 0,
          pull_requests: 0,
          issues_opened: 0,
        };
      }

      // Add activity counts
      const counts = {
        commits: activityData.commits || 0,
        pull_requests: activityData.pull_requests || 0,
        issues_opened: activityData.issues_opened || 0,
      };

      // Update daily counts
      report.activity.daily[date].commits += counts.commits;
      report.activity.daily[date].pull_requests += counts.pull_requests;
      report.activity.daily[date].issues_opened += counts.issues_opened;

      // Update monthly counts
      report.activity.monthly[month].commits += counts.commits;
      report.activity.monthly[month].pull_requests += counts.pull_requests;
      report.activity.monthly[month].issues_opened += counts.issues_opened;
    }
  });

  // Calculate trophies
  report.trophies = calculateTrophies(user);

  // Calculate achievements
  report.achievements = calculateAchievements(user);

  // Calculate country ranking
  report.country_ranking = calculateCountryRanking(user);

  // Add ranking information
  const ranking = await UserRanking.findOne({
    where: { user_id: user.id }
  });

  if (ranking) {
    report.ranking = {
      score: ranking.score,
      country: ranking.country,
      country_rank: ranking.country_rank,
      global_rank: ranking.global_rank,
      total_commits: ranking.total_commits,
      total_contributions: ranking.total_contributions,
      last_calculated: ranking.last_calculated_at
    };
  }

  return report;
}

function calculateTrophies(user) {
  const trophies = [];

  // Follower-based trophies
  if (user.followers >= 1000) trophies.push({ name: 'Popular User', level: 'Gold' });
  else if (user.followers >= 500) trophies.push({ name: 'Popular User', level: 'Silver' });
  else if (user.followers >= 100) trophies.push({ name: 'Popular User', level: 'Bronze' });

  // Repository-based trophies
  if (user.public_repos >= 50) trophies.push({ name: 'Prolific Coder', level: 'Gold' });
  else if (user.public_repos >= 25) trophies.push({ name: 'Prolific Coder', level: 'Silver' });
  else if (user.public_repos >= 10) trophies.push({ name: 'Prolific Coder', level: 'Bronze' });

  // Star-based trophies
  const maxStars = Math.max(...user.Repositories.map(repo => repo.stars || 0));
  if (maxStars >= 1000) trophies.push({ name: 'Star Collector', level: 'Gold' });
  else if (maxStars >= 100) trophies.push({ name: 'Star Collector', level: 'Silver' });
  else if (maxStars >= 10) trophies.push({ name: 'Star Collector', level: 'Bronze' });

  return trophies;
}

function calculateAchievements(user) {
  const achievements = [];
  
  // Calculate total stats across all repos
  const totalStats = user.Repositories.reduce((acc, repo) => ({
    forks: acc.forks + (repo.forks || 0),
    issues: acc.issues + (repo.issues || 0),
    commits: acc.commits + (repo.commit_count || 0),
    prs: acc.prs + (repo.pull_request_count || 0)
  }), { forks: 0, issues: 0, commits: 0, prs: 0 });

  // Fork-based achievements
  if (totalStats.forks >= 500) achievements.push({ name: 'Fork Master', level: 3 });
  else if (totalStats.forks >= 100) achievements.push({ name: 'Fork Master', level: 2 });
  else if (totalStats.forks >= 10) achievements.push({ name: 'Fork Master', level: 1 });

  // Commit-based achievements
  if (totalStats.commits >= 5000) achievements.push({ name: 'Code Machine', level: 3 });
  else if (totalStats.commits >= 1000) achievements.push({ name: 'Code Machine', level: 2 });
  else if (totalStats.commits >= 100) achievements.push({ name: 'Code Machine', level: 1 });

  // PR-based achievements
  if (totalStats.prs >= 100) achievements.push({ name: 'PR Pro', level: 3 });
  else if (totalStats.prs >= 50) achievements.push({ name: 'PR Pro', level: 2 });
  else if (totalStats.prs >= 10) achievements.push({ name: 'PR Pro', level: 1 });

  return achievements;
}

function calculateCountryRanking(user) {
  if (!user.location) return 'N/A';

  // Extract country from location (basic implementation)
  const location = user.location.trim().toLowerCase();
  
  // Calculate score based on various metrics
  const score = (user.followers * 2) + 
                (user.public_repos * 5) + 
                (user.Repositories.reduce((sum, repo) => sum + (repo.stars || 0), 0));

  // Mock ranking calculation
  // In a real implementation, you would query a database to compare with other users
  if (score > 10000) return `Top 1% in ${user.location}`;
  else if (score > 5000) return `Top 5% in ${user.location}`;
  else if (score > 1000) return `Top 10% in ${user.location}`;
  else return `Active user in ${user.location}`;
}

module.exports = {
  generateReport,
};