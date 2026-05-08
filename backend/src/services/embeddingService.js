const { gemini } = require('./geminiClient');

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;

async function generateEmbedding(text) {
  const result = await gemini.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {                                      // <-- Add this config wrapper
      outputDimensionality: EMBEDDING_DIMENSIONS,  // <-- Move this inside
    }
  });

  const values = result.embeddings?.[0]?.values;

  if (!Array.isArray(values)) {
    throw new Error('Gemini embedding response did not include embedding values.');
  }

  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Gemini embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, received ${values.length}.`
    );
  }

  return values;
}

async function generateEmbeddings(textChunks) {
  const embeddings = [];

  for (const chunk of textChunks) {
    embeddings.push(await generateEmbedding(chunk));
  }

  return embeddings;
}

function formatEmbeddingForRpc(embedding) {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Expected a non-empty embedding array.');
  }

  const values = embedding.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error('Embedding contains a non-finite value.');
    }

    return Number(value).toString();
  });

  return `[${values.join(',')}]`;
}

module.exports = {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  formatEmbeddingForRpc,
  generateEmbedding,
  generateEmbeddings,
};
