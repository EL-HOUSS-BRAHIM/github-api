function mapRepository(repo, commitCount) {
  const license = repo.license?.spdx_id || repo.license?.key || repo.license?.name || null;
  const watchers = typeof repo.watchers_count === 'number'
    ? repo.watchers_count
    : (typeof repo.subscribers_count === 'number' ? repo.subscribers_count : 0);

  return {
    name: repo.name,
    description: repo.description,
    topics: repo.topics || [],
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    issues: repo.open_issues_count || 0,
    last_commit: repo.pushed_at ? new Date(repo.pushed_at) : null,
    commit_count: typeof commitCount === 'number' ? commitCount : 0,
    pull_request_count: 0,
    primary_language: repo.language || null,
    license,
    size: typeof repo.size === 'number' ? repo.size : 0,
    watchers,
    homepage: repo.homepage || null,
    default_branch: repo.default_branch || null,
    source_created_at: repo.created_at ? new Date(repo.created_at) : null,
    source_updated_at: repo.updated_at ? new Date(repo.updated_at) : null,
  };
}

function cleanUsername(str) {
  if (!str) return null;
  return str
    .replace(/\/$/, '')
    .split('/').pop()
    .split('?')[0]
    .replace(/^@/, '');
}

const socialPatterns = {
  linkedin: [
    /linkedin\.com\/in\/([^\/\s]+)/i,
    /linkedin\.com\/profile\/view\?id=([^\/\s]+)/i,
  ],
  twitter: [
    /twitter\.com\/([^\/\s]+)/i,
    /x\.com\/([^\/\s]+)/i,
    /@([a-zA-Z0-9_]+)/i,
  ],
  facebook: [
    /facebook\.com\/([^\/\s]+)/i,
    /fb\.com\/([^\/\s]+)/i,
  ],
  instagram: [
    /instagram\.com\/([^\/\s]+)/i,
    /insta\.gram\.com\/([^\/\s]+)/i,
  ],
  youtube: [
    /youtube\.com\/(?:c\/|channel\/|user\/)?([^\/\s@]+)/i,
    /youtube\.com\/@([^\/\s]+)/i,
  ],
  github: [
    /github\.com\/([^\/\s]+)/i,
  ],
  medium: [
    /medium\.com\/@([^\/\s]+)/i,
    /([^\/\s]+)\.medium\.com/i,
  ],
  dev: [
    /dev\.to\/([^\/\s]+)/i,
  ],
  stackoverflow: [
    /stackoverflow\.com\/users\/([^\/\s]+)/i,
  ],
  dribbble: [
    /dribbble\.com\/([^\/\s]+)/i,
  ],
  behance: [
    /behance\.net\/([^\/\s]+)/i,
  ],
};

function extractSocialAccounts(bio, blog, socialUrls = []) {
  const social = {};

  const processText = (text) => {
    if (!text) return;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];

    urls.forEach((url) => {
      Object.entries(socialPatterns).forEach(([platform, regexList]) => {
        regexList.forEach((regex) => {
          const match = url.match(regex);
          if (match) {
            const extracted = cleanUsername(match[match.length - 1]);
            console.log(`Found ${platform}: ${extracted} from URL: ${url}`);
            social[platform] = extracted;
          }
        });
      });
    });

    Object.entries(socialPatterns).forEach(([platform, regexList]) => {
      regexList.forEach((regex) => {
        const match = text.match(regex);
        if (match && !social[platform]) {
          const extracted = cleanUsername(match[match.length - 1]);
          console.log(`Found ${platform}: ${extracted} in text`);
          social[platform] = extracted;
        }
      });
    });
  };

  [bio, blog, ...socialUrls].filter(Boolean).forEach(processText);

  if (blog) {
    if (blog.includes('linkedin.com')) social.linkedin = cleanUsername(blog);
    if (blog.includes('twitter.com') || blog.includes('x.com')) social.twitter = cleanUsername(blog);
    if (blog.includes('medium.com')) social.medium = cleanUsername(blog);
    if (blog.includes('dev.to')) social.dev = cleanUsername(blog);
  }

  Object.keys(social).forEach((key) => {
    if (social[key] === '') {
      social[key] = null;
    }
  });

  return social;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  chunk,
  extractSocialAccounts,
  mapRepository,
};
