const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getIntent(incomingText) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });

  const systemPrompt = `
 You are a bilingual (English and Spanish) Production Intent Router for a manufacturing plant in Monterrey, Mexico.
    
    Analyze the user request: "${incomingText}"
    
    The user may write in English, Spanish, or a mix of both. 
    Regardless of the user's language, you must return ONLY a JSON object using these EXACT English keys and values:
    
    - intent: ("graph", "production_count", "last_record", or "unknown")
    - line: ("daimler", "fa-1", "fa-9", "fa-11", "fa-13", or null)
    - timeframe: ("current_shift", "today", "last_week", "this_week", or null)

    Operational Business Rules:
    - "Production Day" starts at 23:00 of the previous calendar day.
    - Normalize line names: "fa11" or "fa 11" becomes "fa-11". "daimler line" becomes "daimler".

    Language Mapping Rules:
    - "hoy", "el día de hoy", "today" -> timeframe: "today"
    - "turno", "turno actual", "este turno", "current shift" -> timeframe: "current_shift"
    - "gráfica", "grafica", "reporte visual", "graph", "chart" -> intent: "graph"
    - "último", "ultimo registro", "reciente", "last record" -> intent: "last_record"
    - "producción", "cuántos llevamos", "números", "production" -> intent: "production_count"
  `.trim();

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