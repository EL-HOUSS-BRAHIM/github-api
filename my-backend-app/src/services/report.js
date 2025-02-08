const { UserRanking } = require('../models'); // Add this import

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
      organizations: user.organizations,
      gists_count: user.gists_count,
      last_fetched: user.last_fetched
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
    trophies: calculateTrophies(user),
    achievements: calculateAchievements(user),
    country_ranking: calculateCountryRanking(user),
  };

  // Aggregate activity data with proper date handling
  user.Activities.forEach(activity => {
    const activityData = activity.toJSON ? activity.toJSON() : activity;
    const activityDate = activityData.date instanceof Date
      ? activityData.date
      : new Date(activityData.date);

    if (!isNaN(activityDate.getTime())) {
      const date = activityDate.toISOString().slice(0, 10);
      const month = date.slice(0, 7);

      // Initialize counts if needed
      if (!report.activity.daily[date]) {
        report.activity.daily[date] = {
          commits: 0,
          pull_requests: 0,
          issues_opened: 0,
        };
      }
      if (!report.activity.monthly[month]) {
        report.activity.monthly[month] = {
          commits: 0,
          pull_requests: 0,
          issues_opened: 0,
        };
      }

      const counts = {
        commits: activityData.commits || 0,
        pull_requests: activityData.pull_requests || 0,
        issues_opened: activityData.issues_opened || 0,
      };

      report.activity.daily[date].commits += counts.commits;
      report.activity.daily[date].pull_requests += counts.pull_requests;
      report.activity.daily[date].issues_opened += counts.issues_opened;

      report.activity.monthly[month].commits += counts.commits;
      report.activity.monthly[month].pull_requests += counts.pull_requests;
      report.activity.monthly[month].issues_opened += counts.issues_opened;
    }
  });

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

  // Super Follower Trophy (Gold, Silver, Bronze)
  if (user.followers >= 10000) trophies.push({ name: 'Super Follower', level: 'Gold', description: 'For users with over 10,000 followers - a true influencer!' });
  else if (user.followers >= 5000) trophies.push({ name: 'Super Follower', level: 'Silver', description: 'For users with over 5,000 followers - a rising star!' });
  else if (user.followers >= 1000) trophies.push({ name: 'Super Follower', level: 'Bronze', description: 'For users with over 1,000 followers - well-respected in the community.' });

  // Code Contributor Trophy (Gold, Silver, Bronze) - based on total commits
  const totalCommits = user.Activities.reduce((sum, activity) => sum + (activity.commits || 0), 0);
  if (totalCommits >= 10000) trophies.push({ name: 'Code Contributor', level: 'Gold', description: 'For contributing over 10,000 commits - a code machine!' });
  else if (totalCommits >= 5000) trophies.push({ name: 'Code Contributor', level: 'Silver', description: 'For contributing over 5,000 commits - a significant contributor.' });
  else if (totalCommits >= 1000) trophies.push({ name: 'Code Contributor', level: 'Bronze', description: 'For contributing over 1,000 commits - making a difference.' });

  // Star Gazer Trophy (Gold, Silver, Bronze) - based on total stars across repos
  const totalRepoStars = user.Repositories.reduce((sum, repo) => sum + (repo.stars || 0), 0);
  if (totalRepoStars >= 5000) trophies.push({ name: 'Star Gazer', level: 'Gold', description: 'For accumulating over 5,000 stars across all repositories - a star magnet!' });
  else if (totalRepoStars >= 1000) trophies.push({ name: 'Star Gazer', level: 'Silver', description: 'For accumulating over 1,000 stars - projects are getting noticed.' });
  else if (totalRepoStars >= 100) trophies.push({ name: 'Star Gazer', level: 'Bronze', description: 'For accumulating over 100 stars - projects are gaining recognition.' });

    // Prolific Repository Creator (Gold, Silver, Bronze) - based on public_repos
  if (user.public_repos >= 100) trophies.push({ name: 'Prolific Repository Creator', level: 'Gold', description: 'For creating over 100 public repositories - a repository powerhouse!' });
  else if (user.public_repos >= 50) trophies.push({ name: 'Prolific Repository Creator', level: 'Silver', description: 'For creating over 50 public repositories - a consistent creator.' });
  else if (user.public_repos >= 20) trophies.push({ name: 'Prolific Repository Creator', level: 'Bronze', description: 'For creating over 20 public repositories - getting started with sharing.' });


  return trophies;
}

function calculateAchievements(user) {
  const achievements = [];

  // Jack of All Trades - for users with repos in many topics
  const topicCount = new Set();
  user.Repositories.forEach(repo => {
    if (repo.topics) {
      repo.topics.forEach(topic => topicCount.add(topic));
    }
  });

  if (topicCount.size >= 10) achievements.push({ name: 'Jack of All Trades', level: 3, description: 'For contributing to projects covering 10 or more topics - diverse skillset!' });
  else if (topicCount.size >= 5) achievements.push({ name: 'Jack of All Trades', level: 2, description: 'For contributing to projects covering 5 or more topics - exploring different domains.' });
  else if (topicCount.size >= 3) achievements.push({ name: 'Jack of All Trades', level: 1, description: 'For contributing to projects covering 3 or more topics - broadening horizons.' });


  // Open Source Bug Hunter - based on issues opened
  const totalIssuesOpened = user.Activities.reduce((sum, activity) => sum + (activity.issues_opened || 0), 0);
  if (totalIssuesOpened >= 100) achievements.push({ name: 'Open Source Bug Hunter', level: 3, description: 'For opening over 100 issues - helping improve open source quality!' });
  else if (totalIssuesOpened >= 50) achievements.push({ name: 'Open Source Bug Hunter', level: 2, description: 'For opening over 50 issues - contributing to project stability.' });
  else if (totalIssuesOpened >= 10) achievements.push({ name: 'Open Source Bug Hunter', level: 1, description: 'For opening over 10 issues - reporting and helping fix problems.' });


  // Pull Request Pro - based on pull requests
  const totalPullRequests = user.Activities.reduce((sum, activity) => sum + (activity.pull_requests || 0), 0);
  if (totalPullRequests >= 50) achievements.push({ name: 'Pull Request Pro', level: 3, description: 'For creating over 50 pull requests - a code integration expert!' });
  else if (totalPullRequests >= 20) achievements.push({ name: 'Pull Request Pro', level: 2, description: 'For creating over 20 pull requests - actively contributing code changes.' });
  else if (totalPullRequests >= 5) achievements.push({ name: 'Pull Request Pro', level: 1, description: 'For creating over 5 pull requests - getting code merged into projects.' });


  // Repository Forker - based on repository forks
  const totalForks = user.Repositories.reduce((sum, repo) => sum + (repo.forks || 0), 0);
  if (totalForks >= 1000) achievements.push({ name: 'Repository Forker', level: 3, description: 'For accumulating over 1,000 forks on repositories - creating highly valuable starting points!' });
  else if (totalForks >= 500) achievements.push({ name: 'Repository Forker', level: 2, description: 'For accumulating over 500 forks - projects are highly reusable.' });
  else if (totalForks >= 100) achievements.push({ name: 'Repository Forker', level: 1, description: 'For accumulating over 100 forks - projects are useful to others.' });


  return achievements;
}


function calculateCountryRanking(user) {
  if (!user.location) return 'N/A';

  // Extract country from location (basic implementation)
  const location = user.location.trim().toLowerCase();
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