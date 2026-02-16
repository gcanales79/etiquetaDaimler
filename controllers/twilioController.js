const { getSQLfromQuestion, explainResult } = require("../services/ai");
const db = require("../models");

// ===============================
// LINE → TABLE MAP
// ===============================
const TABLES = {
  daimler: "daimlers",
  "fa-1": "fa1s",
  "fa-9": "fa9s",
  "fa-11": "fa11s",
  "fa-13": "fa13s",
};

// In-memory sessions
const sessions = {};

// ===============================
// HELPERS
// ===============================
function reply(res, message) {
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${message}</Message>
    </Response>
  `);
}

// -------------------------------
// SQL safety
// -------------------------------
function isSafeSQL(sql) {
  const lower = sql.toLowerCase().trim();

  if (!lower.startsWith("select")) return false;

  const blocked = [
    "drop", "delete", "update", "insert",
    "alter", "truncate", "--", "/*", "*/"
  ];

  return !blocked.some(w => lower.includes(w));
}

// -------------------------------
// Natural language → intent
// -------------------------------
function normalizeIntent(text) {
  let t = text;

  // Spanish → English intent helpers
  if (t.includes("como va") || t.includes("cómo va")) {
    t += " production";
  }

  if (t.includes("hoy")) {
    t += " today";
  }

  if (t.includes("turno")) {
    t += " shift";
  }

  if (t.includes("ultima") || t.includes("última")) {
    t += " last";
  }

  return t;
}

// -------------------------------
// Supported intent check
// -------------------------------
function isSupportedQuestion(text) {
  return (
    text.includes("production") ||
    text.includes("produccion") ||
    text.includes("producción") ||
    text.includes("shift") ||
    text.includes("turno") ||
    text.includes("last") ||
    text.includes("ultimo") ||
    text.includes("último") ||
    text.includes("today") ||
    text.includes("hoy")
  );
}

// ===============================
// CONTROLLER
// ===============================
async function handleTwilioMessage(req, res) {
  const from = req.body.From || "unknown";

  let incomingText = (req.body.Body || "")
    .toLowerCase()
    .trim();

  // Normalize FA formats
  incomingText = incomingText
    .replace(/\bfa\s*11\b/gi, "fa-11")
    .replace(/\bfa\s*9\b/gi, "fa-9")
    .replace(/\bfa\s*1\b/gi, "fa-1")
    .replace(/\bfa\s*13\b/gi, "fa-13")
    .replace(/\bdaimler\b/gi, "daimler");

  // Normalize language
  incomingText = normalizeIntent(incomingText);

  console.log("[BOT] From:", from);
  console.log("[BOT] Message:", incomingText);

  if (!incomingText) {
    return reply(res, "Please send a valid message.");
  }

  if (!sessions[from]) {
    sessions[from] = {};
  }

  const session = sessions[from];

  try {
    // ===============================
    // 1️⃣ HANDLE LINE
    // ===============================
    if (!session.line) {
      if (!session.pendingQuestion) {
        session.pendingQuestion = incomingText;
      }

      // Block unsupported (first message only)
      if (!isSupportedQuestion(incomingText) && !session.pendingQuestion) {
        return reply(
          res,
          `
I can help with:

• Production today / hoy
• Production this shift / este turno
• Last production / última producción
• Lines: Daimler, FA-1, FA-9, FA-11, FA-13

Examples:
• como va la produccion hoy fa11
• production
