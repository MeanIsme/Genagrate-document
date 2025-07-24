function splitContentIntoChunks(content, chunkSize = 1500) {
    let chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks;
}

module.exports = { splitContentIntoChunks };
