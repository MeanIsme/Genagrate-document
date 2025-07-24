const PDFDocument = require('pdfkit');
const axios = require('axios');
const { fetchGithubRepoData } = require('../services/githubService');
const { generateMigrationGuideForChunk } = require('../services/migrationService');
const { splitContentIntoChunks } = require('../utils/chunkUtils');

const generateMigrationGuidePDF = async (req, res) => {
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
};

module.exports = { generateMigrationGuidePDF };
