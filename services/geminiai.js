const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getIntent(incomingText) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });

  const systemPrompt = `
    You are a Production Intent Router for a manufacturing plant in Monterrey, Mexico.
    
    Analyze the user request: "${incomingText}"
    
    Return ONLY a JSON object with these keys:
    - intent: ("graph", "production_count", "last_record", or "unknown")
    - line: ("daimler", "fa-1", "fa-9", "fa-11", "fa-13", or null)
    - timeframe: ("current_shift", "today", "last_week", "this_week", or null)

    Rules:
    - If the user says "hoy" or "today", timeframe is "today".
    - "Production Day" starts at 23:00 of the previous calendar day.
    - Normalize lines: "fa11" -> "fa-11", "daimler line" -> "daimler".
  `;

  const result = await model.generateContent(systemPrompt);
  const response = await result.response;
  
  try {
    // Strip markdown formatting if AI includes it
    const cleanJson = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    return { intent: "unknown", line: null, timeframe: null };
  }
}

module.exports = { getIntent };