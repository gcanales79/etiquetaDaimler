// ai.js
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Prompt to describe DB schema
const SYSTEM_PROMPT = `
You generate MySQL SELECT queries for production data.

Rules:
- Only SELECT
- No explanations
- No markdown
- No comments
- Start with SELECT
- Do NOT invent table names

The system will choose the table automatically.
Focus only on filters and conditions.

Use CURRENT_DATE for today.

Explain in 2 short sentences. Be concise.
`;


async function getSQLfromQuestion(question, lineName, dbName) {

  if (!question || typeof question !== "string") {
    throw new Error("Invalid question");
  }

  const contextPrompt = `
You are querying production data for:

Line: ${lineName}
Database: ${dbName}

Return ONLY a MySQL SELECT query.
Do not explain.
Do not ask questions.
Start with SELECT.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextPrompt },
      { role: "user", content: question }
    ],
    temperature: 0
  });

  return response.choices[0].message.content;
}


async function explainResult(question, data) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Explain these SQL results clearly." },
      { role: "user", content: `
Question: ${question}
Data: ${JSON.stringify(data)}
` }
    ]
  });

  return response.choices[0].message.content;
}

module.exports = { getSQLfromQuestion, explainResult };
