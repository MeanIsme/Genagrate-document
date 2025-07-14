const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// GitHub API URL to fetch repository contents
async function fetchGithubRepoData(repoOwner, repoName, path = '') {
    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents${path}`;

    try {
        const response = await axios.get(githubApiUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
            }
        });

        // Return the contents of the repository (files and directories)
        return response.data;
    } catch (error) {
        console.error('Error fetching GitHub repository:', error);
        return null;
    }
}

// Function to generate migration guide using ChatGPT for each file
async function generateMigrationGuideForFile(fileContent, sourceLanguage, targetLanguage) {
    const prompt = `Create a detailed migration guide for migrating the following code from ${sourceLanguage} to ${targetLanguage}. Consider syntax differences, best practices, and libraries for the migration.\n\n${fileContent}`;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error generating migration guide with ChatGPT:', error);
        return 'An error occurred while generating the migration guide for this file.';
    }
}

// Recursive function to fetch files in all directories
async function crawlRepoDirectories(repoOwner, repoName, path = '', sourceLanguage, targetLanguage) {
    const contents = await fetchGithubRepoData(repoOwner, repoName, path);
    const migrationResults = [];

    if (!contents) {
        return migrationResults;
    }

    for (const item of contents) {
        if (item.type === 'file') {
            // If it's a file, fetch its content and generate a migration guide
            const fileContentResponse = await axios.get(item.download_url);
            const fileContent = fileContentResponse.data;

            // Generate migration guide for the file content using ChatGPT
            const migrationGuide = await generateMigrationGuideForFile(fileContent, sourceLanguage, targetLanguage);
            migrationResults.push({
                fileName: item.name,
                migrationGuide
            });
        } else if (item.type === 'dir') {
            // If it's a directory, crawl its contents recursively
            const nestedResults = await crawlRepoDirectories(repoOwner, repoName, item.path, sourceLanguage, targetLanguage);
            migrationResults.push(...nestedResults);
        }
    }

    return migrationResults;
}

// Route to generate migration guides for all files in the GitHub repository
app.post('/generate-migration-guide', async (req, res) => {
    const { sourceLanguage, targetLanguage, githubRepoOwner, githubRepoName } = req.body;

    if (!sourceLanguage || !targetLanguage || !githubRepoOwner || !githubRepoName) {
        return res.status(400).json({ error: 'Source and target languages, along with GitHub repository owner and name, are required' });
    }

    try {
        // Fetch and process all files and directories in the GitHub repository
        const migrationResults = await crawlRepoDirectories(githubRepoOwner, githubRepoName, '', sourceLanguage, targetLanguage);

        if (migrationResults.length === 0) {
            return res.status(404).json({ error: 'No files found in the GitHub repository or failed to fetch repository data.' });
        }

        // Return the migration guides for all files
        res.json({
            migrationResults
        });
    } catch (error) {
        console.error('Error generating migration guide:', error);
        res.status(500).json({ error: 'An error occurred while generating the migration guide for the repository.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
