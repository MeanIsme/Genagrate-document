const express = require('express');
const app = express();

app.use(express.json());

const migrationRoutes = require('./routes/migrationRoutes');
app.use('/', migrationRoutes);

module.exports = app;
