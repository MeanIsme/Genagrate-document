const axios = require('axios');
const { GITHUB_TOKEN } = require('../../config');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGithubRepoData(repoOwner, repoName, dir = '', retries = 3) {
    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dir}`;
    if (!GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN is not set. Please check your .env file.');
    }

    try {
        console.log(`[GitHubService] Fetching: ${githubApiUrl}`);
        const response = await axios.get(githubApiUrl, {
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
        });

        let files = [];
        for (const item of response.data) {
            if (item.type === 'file') {
                console.log(`[GitHubService] Found file: ${item.path}`);
                files.push(item);
            } else if (item.type === 'dir') {
                console.log(`[GitHubService] Entering directory: ${item.path}`);
                await sleep(200); // Add delay to avoid rate limiting
                const subFiles = await fetchGithubRepoData(repoOwner, repoName, item.path, retries);
                files = files.concat(subFiles);
            }
        }
        // Deduplicate by file path
        const uniqueFiles = [];
        const seenPaths = new Set();
        for (const file of files) {
            if (!seenPaths.has(file.path)) {
                uniqueFiles.push(file);
                seenPaths.add(file.path);
            }
        }
        return uniqueFiles;
    } catch (error) {
        if (retries > 0 && (error.code === 'ECONNRESET' || error.message.includes('socket hang up'))) {
            console.warn(`Retrying fetchGithubRepoData for ${githubApiUrl} (${retries} retries left)...`);
            await sleep(1000);
            return fetchGithubRepoData(repoOwner, repoName, dir, retries - 1);
        }
        console.error('Error fetching GitHub repository:', error);
        return [];
    }
}

module.exports = { fetchGithubRepoData };
