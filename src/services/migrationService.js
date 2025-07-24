const axios = require('axios');
const { OPENAI_API_KEY } = require('../../config');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateMigrationGuideForChunk(fileContent, sourceLanguage, targetLanguage, retries = 3) {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set. Please check your .env file.');
    }
    console.log(`[MigrationService] Requesting migration guide for file (${sourceLanguage} -> ${targetLanguage}), size: ${fileContent.length} chars`);
    const prompt = `
        You are a senior software architect and migration expert.

        Your task: Create a comprehensive, actionable migration guide for converting the following code from ${sourceLanguage} to ${targetLanguage}.

        **Instructions:**
        - Analyze the code for syntax, libraries, architecture, and patterns.
        - For each major section or file, provide:
        1. A summary of what the code does.
        2. A step-by-step migration plan.
        3. Before/after code snippets for key changes.
        4. Recommended libraries or frameworks in ${targetLanguage}.
        5. Best practices and idioms in ${targetLanguage}.
        6. Common pitfalls to avoid during migration.
        - If database or API usage is detected, include migration advice for those as well.
        - Output should be clear, organized, and in fluent English.
        - Format the output in Markdown with headings, bullet points, and code blocks.

        **Code to migrate:**
        \n\n\`\`\`
        ${fileContent}
        \`\`\`
        `;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[MigrationService] Received migration guide for file (${sourceLanguage} -> ${targetLanguage})`);
        return response.data.choices[0].message.content;
    } catch (error) {
        if (retries > 0) {
            console.warn(`[MigrationService] Error from OpenAI, retrying... (${retries} retries left)`);
            await sleep(1000);
            return generateMigrationGuideForChunk(fileContent, sourceLanguage, targetLanguage, retries - 1);
        }
        console.error('Error generating migration guide with ChatGPT:', error);
        return 'An error occurred while generating the migration guide for this file.';
    }
}

module.exports = { generateMigrationGuideForChunk };
