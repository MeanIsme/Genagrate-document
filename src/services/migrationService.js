const axios = require('axios');

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

module.exports = { generateMigrationGuideForChunk };
