const express = require('express');
const router = express.Router();
const { generateMigrationGuidePDF } = require('../controllers/migrationController');

router.post('/generate-migration-guide-pdf', generateMigrationGuidePDF);

module.exports = router;
