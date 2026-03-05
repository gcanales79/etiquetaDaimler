const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ⏱️ Función auxiliar para hacer que Node.js espere (Sleep)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getIntent(incomingText) {
  
  const maxRetries = 3; // Número máximo de intentos para manejar el error 429

  // Intentaremos con el modelo Lite primero, y si falla, usaremos el 1.5 Flash estable
  const modelsToTry = ["gemini-2.0-flash-lite-001", "gemini-1.5-flash"];
  

  const systemPrompt = `
You are a bilingual (English and Spanish) Production Intent Router for a manufacturing plant in Monterrey, Mexico.
    
    Analyze the user request: "${incomingText}"
    
    The user may write in English, Spanish, or a mix of both. 
    Regardless of the user's language, you must return ONLY a JSON object using these EXACT English keys and values:
    
    - intent: ("graph", "production_count", "last_record", or "unknown")
    - line: ("daimler", "fa-1", "fa-9", "fa-11", "fa-13", or null)
    - timeframe: ("current_shift", "today", "last_week", "this_week", or null)
    - language: ("es" or "en")

    Operational Business Rules:
    - "Production Day" starts at 23:00 of the previous calendar day.
    - Normalize line names: "fa11" or "fa 11" becomes "fa-11". "daimler line" becomes "daimler".
    - Set the "language" key to "es" if the user speaks Spanish, or "en" if English. Default to "en" if unsure.

    Language Mapping Rules:
    - "hoy", "el día de hoy", "today" -> timeframe: "today"
    - "turno", "turno actual", "este turno", "current shift" -> timeframe: "current_shift"
    - "semana pasada", "last week" -> timeframe: "last_week"
    - "esta semana", "this week" -> timeframe: "this_week"
    - "gráfica", "grafica", "reporte visual", "graph", "chart" -> intent: "graph"
    - "último", "ultimo registro", "reciente", "last record" -> intent: "last_record"
    - "producción", "cuántos llevamos", "números", "como va", "production" -> intent: "production_count"

    INFERENCE RULE (CRITICAL):
    If the user mentions a timeframe and a line (e.g., "turno actual fa-11"), but does NOT explicitly state an intent, you MUST assume the intent is "production_count". Do NOT return "unknown" if a line and timeframe are present.
  `.trim();

for (const modelName of modelsToTry) {
    let attempts = 0;
    while (attempts < 2) { // 2 intentos por cada modelo
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const cleanJson = response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(cleanJson);
      } catch (error) {
        attempts++;
        if (error.status === 429) {
          console.warn(`[Gemini] 429 en ${modelName}. Reintentando en 2s...`);
          await delay(2000); // Esperamos 2 segundos completos
        } else {
          break; // Si es otro error, saltamos al siguiente modelo
        }
      }
    }
  }

  // Si todo falla, devolvemos el fallback
  return { intent: "unknown", line: null, timeframe: null };
}

module.exports = { getIntent };