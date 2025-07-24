# Genagrate Document - Migration Guide Generator

## Project Structure

```
Genagrate document/
  ├── src/
  │   ├── controllers/
  │   │   └── migrationController.js
  │   ├── routes/
  │   │   └── migrationRoutes.js
  │   ├── services/
  │   │   ├── githubService.js
  │   │   └── migrationService.js
  │   ├── utils/
  │   │   └── chunkUtils.js
  │   └── app.js
  ├── config/
  │   └── index.js
  ├── .env.example
  ├── package.json
  ├── package-lock.json
  ├── README.md
  ├── nodemon.json
  └── server.js
```

## Usage Instructions

1. Copy the `.env.example` file to `.env` and fill in the required environment variables.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. Send a POST request to the `/generate-migration-guide-pdf` endpoint with the following body:
   ```json
   {
     "sourceLanguage": "Source language name",
     "targetLanguage": "Target language name",
     "githubRepoOwner": "GitHub repository owner",
     "githubRepoName": "GitHub repository name"
   }
   ```

## Notes
- The project is clearly separated into controller, service, utils, and config modules.
- Make sure to keep your API keys secure using environment variables.
