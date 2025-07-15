const express = require('express');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
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

// Route to generate migration guides and return as PDF
app.post('/generate-migration-guide-pdf', async (req, res) => {
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

        // Create a PDF document
        const doc = new PDFDocument();
        const filename = `migration-guide-${githubRepoName}.pdf`;

        // Set the response headers for the PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe the PDF document to the response
        doc.pipe(res);

        // Add title to the PDF
        doc.fontSize(18).text('Migration Guide', { align: 'center' });
        doc.moveDown();

        // Iterate over the migration results and add them to the PDF
        migrationResults.forEach((result, index) => {
            doc.fontSize(14).text(`${index + 1}. ${result.fileName}`);
            doc.moveDown();
            doc.fontSize(12).text(result.migrationGuide);
            doc.moveDown();
            doc.addPage();  // Add a new page for each file's guide
        });

        // Finalize the PDF and send it
        doc.end();
    } catch (error) {
        console.error('Error generating migration guide:', error);
        res.status(500).json({ error: 'An error occurred while generating the migration guide.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
