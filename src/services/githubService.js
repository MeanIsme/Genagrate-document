const axios = require('axios');

async function fetchGithubRepoData(repoOwner, repoName) {
    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents`;

    try {
        const response = await axios.get(githubApiUrl, {
            headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` }
        });

        return response.data.filter(item => item.type === 'file'); // Return only files, not directories
    } catch (error) {
        console.error('Error fetching GitHub repository:', error);
        return [];
    }
}

module.exports = { fetchGithubRepoData };
