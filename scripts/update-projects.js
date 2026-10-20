const fs = require('fs');
const path = require('path');

const USERNAME = 'And3rsonTorres';
const MAX_PROJECTS = 4;
const THEME = 'neon';
const EXCLUDE_REPOS = [
  'and3rsontorres', // profile README repo
  // Add any test/sandbox repository names in lowercase here to exclude them
];

const README_PATH = path.join(__dirname, '..', 'README.md');
const START_MARKER = '<!-- START_SECTION:featured-projects -->';
const END_MARKER = '<!-- END_SECTION:featured-projects -->';

async function fetchRepos() {
  const headers = {
    'User-Agent': 'Node.js/fetch',
    'Accept': 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed&direction=desc`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API returned status ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

function filterAndSortRepos(repos) {
  return repos
    .filter((repo) => {
      // Must be public, non-fork, non-archived
      if (repo.private || repo.fork || repo.archived) return false;
      // Exclude profile repo and any explicitly excluded repos
      if (EXCLUDE_REPOS.includes(repo.name.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, MAX_PROJECTS);
}

function generateMarkdown(repos) {
  if (repos.length === 0) {
    return '\n<p align="center"><em>No public projects available at the moment.</em></p>\n';
  }

  const cards = repos.map((repo) => {
    return `  <a href="${repo.html_url}" target="_blank">
    <img src="https://github-stats-extended.vercel.app/api/pin/?username=${USERNAME}&repo=${encodeURIComponent(repo.name)}&theme=${THEME}" alt="${repo.name}" />
  </a>`;
  });

  return `\n<p align="center">\n${cards.join('\n')}\n</p>\n`;
}

async function main() {
  console.log(`Fetching repositories for ${USERNAME}...`);
  const repos = await fetchRepos();
  console.log(`Fetched ${repos.length} repositories.`);

  const featured = filterAndSortRepos(repos);
  console.log(
    `Selected ${featured.length} featured project(s):`,
    featured.map((r) => `${r.name} (last pushed: ${r.pushed_at})`).join(', ')
  );

  const content = fs.readFileSync(README_PATH, 'utf-8');
  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Markers "${START_MARKER}" and/or "${END_MARKER}" not found in README.md`);
  }

  const newFeaturedMarkdown = generateMarkdown(featured);
  const updatedContent =
    content.substring(0, startIndex + START_MARKER.length) +
    newFeaturedMarkdown +
    content.substring(endIndex);

  if (content === updatedContent) {
    console.log('README.md is already up to date. No changes needed.');
  } else {
    fs.writeFileSync(README_PATH, updatedContent, 'utf-8');
    console.log('README.md has been successfully updated with the latest featured projects!');
  }
}

main().catch((err) => {
  console.error('Error updating projects:', err);
  process.exit(1);
});
