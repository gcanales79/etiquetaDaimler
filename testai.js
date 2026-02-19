// test-ai.js
require('dotenv').config(); // Loads your GEMINI_API_KEY
const { getIntent } = require('./services/geminiai');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Initialize the client OUTSIDE the function so it is available everywhere
/*const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function testConnection() {
  console.log("🔌 Testing Gemini API Connection...");
  
  try {
    // 2. Use the stable model name
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });
    
    const prompt = "Reply with 'OK' if you can hear me.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    console.log("✅ SUCCESS! API is working.");
    console.log("🤖 AI Replied:", response.text());
    
  } catch (error) {
    console.error("❌ Error Details:", error.message);
    
    if (error.message.includes("404")) {
      console.log("👉 Tip: The model name is wrong. Try 'gemini-1.5-flash-001' or 'gemini-pro'.");
    } else if (error.message.includes("API key")) {
      console.log("👉 Tip: Check your .env file. The key might be missing or have a space.");
    }
  }
}

testConnection();*/

/*async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ ERROR: No API key found in your .env file!");
    return;
  }

  console.log("🔍 Asking Google what models this key can access...");

  // Bypassing the SDK to call the raw REST API
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ API ERROR details:");
      console.error(JSON.stringify(data.error, null, 2));
      return;
    }

    if (data.models && data.models.length > 0) {
      console.log("\n✅ YOUR KEY HAS ACCESS TO THESE MODELS:");
      const modelNames = data.models.map(m => m.name.replace('models/', ''));
      console.log(modelNames.join('\n'));
      
      console.log("\n👉 TIP: Look at the list above and use exactly one of those names in your ai.js file.");
    } else {
      console.log("⚠️ Your key connects, but no models are available for it.");
    }

  } catch (err) {
    console.error("❌ Network Request Failed:", err.message);
  }
}

checkModels();*/

/*async function listModels() {
  console.log("Checking available models for your API Key...");
  try {
    // This fetches the list of models your key has access to
    // Note: We use the generic 'getGenerativeModel' just to get the client, 
    // but strictly speaking, we are checking the model list logic below.
    // Actually, the SDK doesn't have a direct 'listModels' helper in the high-level client 
    // easily exposed, so we will try a standard model first to test connection.
    
    // Let's try the absolute safest fallback model first: 'gemini-pro'
    console.log("Attempting handshake with 'gemini-pro'...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello, are you there?");
    console.log("✅ SUCCESS! 'gemini-pro' is working.");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("❌ Handshake failed:", error.message);
    console.log("\nPossible causes:");
    console.log("1. API Key is invalid or copied incorrectly.");
    console.log("2. Your Google Cloud Project does not have the Generative AI API enabled.");
    console.log("3. 'gemini-pro' is also not found (Account issue).");
  }
}

listModels();*/

async function runTests() {
  const testPhrases = [
    "Hello",
    "How is the FA-11 doing today?",
    "Dame la grafica de la semana pasada de daimler",
    "Current shift production fa-9",
    "último registro de fa-1"
  ];

  console.log("🚀 Starting AI Router Tests...\n");

  for (const phrase of testPhrases) {
    console.log(`User: "${phrase}"`);
    try {
      const result = await getIntent(phrase);
      console.log("AI Result:", JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Error testing phrase:", error.message);
    }
    console.log("----------------------------");
  }
}

runTests();