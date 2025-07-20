const express = require('express');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

// Function to generate migration guide using ChatGPT for a chunk of file content
async function generateMigrationGuideForChunk(chunkContent, sourceLanguage, targetLanguage) {
    const prompt = `Create a detailed migration guide for migrating the following code from ${sourceLanguage} to ${targetLanguage}. Consider syntax differences, best practices, and libraries for the migration.\n\n${chunkContent}`;

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
        return 'An error occurred while generating the migration guide for this file chunk.';
    }
}

// Function to split large text into chunks
function splitContentIntoChunks(content, chunkSize = 1500) {
    let chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks;
}

// Route to generate migration guides and return as PDF
app.post('/generate-migration-guide-pdf', async (req, res) => {
    const { sourceLanguage, targetLanguage, githubRepoOwner, githubRepoName } = req.body;

    if (!sourceLanguage || !targetLanguage || !githubRepoOwner || !githubRepoName) {
        return res.status(400).json({ error: 'Source and target languages, along with GitHub repository owner and name, are required' });
    }

    try {
        const githubRepoData = await fetchGithubRepoData(githubRepoOwner, githubRepoName);
        const migrationResults = [];

        for (const file of githubRepoData) {
            const fileContent = await axios.get(file.download_url);
            const chunks = splitContentIntoChunks(fileContent.data); // Split file content into chunks

            for (const chunk of chunks) {
                const guide = await generateMigrationGuideForChunk(chunk, sourceLanguage, targetLanguage);
                migrationResults.push({
                    fileName: file.name,
                    migrationGuide: guide
                });
            }
        }

        // Create a PDF document
        const doc = new PDFDocument();
        const filename = `migration-guide-${githubRepoName}.pdf`;

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe the PDF document to the response
        doc.pipe(res);

        // Add title to the PDF
        doc.fontSize(18).text('Migration Guide', { align: 'center' });
        doc.moveDown();

        // Add content to the PDF
        migrationResults.forEach((result, index) => {
            doc.fontSize(14).text(`${index + 1}. ${result.fileName}`);
            doc.moveDown();
            doc.fontSize(12).text(result.migrationGuide);
            doc.moveDown();
            doc.addPage();
        });

        // Finalize the PDF and send it
        doc.end();
    } catch (error) {
        console.error('Error generating migration guide:', error);
        res.status(500).json({ error: 'An error occurred while generating the migration guide.' });
    }
});

// Fetch GitHub repository data (files and directories)
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

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
