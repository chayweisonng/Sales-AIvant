const { GoogleGenAI } = require('@google/genai');

if (!process.env.GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is missing. AI chat will not function.');
}

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

module.exports = { gemini };
