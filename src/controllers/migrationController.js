const PDFDocument = require('pdfkit');
const axios = require('axios');
const { fetchGithubRepoData } = require('../services/githubService');
const { generateMigrationGuideForChunk } = require('../services/migrationService');
const { splitContentIntoChunks } = require('../utils/chunkUtils');
const { analyzeDependencies } = require('../utils/dependencyUtils');
const path = require('path');

function addCoverPage(doc, repoName) {
    doc.fontSize(28).fillColor('#3366cc').text('Migration Guide', { align: 'center', underline: true });
    doc.moveDown(2);
    doc.fontSize(18).fillColor('black').text(`Repository: ${repoName}`, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(14).text(`Generated at: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(4);
    doc.fontSize(12).text('This document provides a detailed migration guide for your project, including code analysis and recommendations.', { align: 'center' });
    doc.addPage();
}

function addTableOfContents(doc, migrationResults) {
    doc.fontSize(16).fillColor('#3366cc').text('Table of Contents', { underline: true });
    doc.moveDown();
    migrationResults.forEach((result, idx) => {
        doc.fontSize(12).fillColor('black').text(
            `${idx + 1}. ${result.filePath}`,
            { link: `#${result.filePath}` }
        );
    });
    doc.addPage();
}

function addMigrationContent(doc, migrationResults) {
    migrationResults.forEach((result, idx) => {
        if (idx !== 0) doc.addPage();
        doc.fontSize(16).fillColor('#3366cc').text(
            `${idx + 1}. ${result.filePath}`,
            { underline: true, destination: result.filePath }
        );
        doc.moveDown();
        if (result.dependencies && result.dependencies.length > 0) {
            doc.fontSize(12).fillColor('black').text('Dependencies:', { bold: true });
            doc.fontSize(11).fillColor('black').list(result.dependencies);
            doc.moveDown();
        }
        doc.fontSize(12).fillColor('black').text(result.migrationGuide, { lineGap: 4 });
        doc.moveDown();
    });
}

function generateBeautifulPDF(res, migrationResults, repoName) {
    const doc = new PDFDocument({ autoFirstPage: true, margin: 50 });
    const filename = `migration-guide-${repoName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    addCoverPage(doc, repoName);
    addTableOfContents(doc, migrationResults);
    addMigrationContent(doc, migrationResults);

    // Footer with page numbers
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.fontSize(8).fillColor('gray').text(`Page ${i + 1} of ${range.count}`, 0.5 * (doc.page.width - 100), doc.page.height - 50, { align: 'center' });
    }

    doc.end();
}

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
            const dependencies = analyzeDependencies(file.name, fileContent.data);
            const guide = await generateMigrationGuideForChunk(fileContent.data, sourceLanguage, targetLanguage);
            migrationResults.push({
                fileName: file.name,
                filePath: file.path,
                dependencies,
                migrationGuide: guide
            });
        }

        generateBeautifulPDF(res, migrationResults, githubRepoName);
    } catch (error) {
        console.error('Error generating migration guide:', error);
        res.status(500).json({ error: 'An error occurred while generating the migration guide.' });
    }
};

module.exports = { generateMigrationGuidePDF };
