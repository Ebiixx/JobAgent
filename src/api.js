// src/api.js
require("dotenv").config();
const axios = require("axios");

async function askOpenAI(messages) {
  const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-01`;

  const headers = {
    "Content-Type": "application/json",
    "api-key": process.env.AZURE_OPENAI_API_KEY,
  };

  const body = {
    messages: messages,
    max_tokens: 2500,
    temperature: 0.7,
  };

  const response = await axios.post(endpoint, body, { headers });
  return response.data;
}

module.exports = { askOpenAI };
