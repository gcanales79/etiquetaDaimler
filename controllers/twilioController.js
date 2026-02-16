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
• production this shift fa-9
• ultima produccion daimler
`.trim()
        );
      }

      // Detect line (longest first)
      const keys = Object.keys(TABLES).sort(
        (a, b) => b.length - a.length
      );

      for (const key of keys) {
        if (incomingText === key || incomingText.includes(key)) {
          session.line = key;
          break;
        }
      }

      if (!session.line) {
        return reply(
          res,
          "Which line? Daimler, FA-1, FA-9, FA-11, or FA-13"
        );
      }

      // Restore original intent
      if (incomingText === session.line) {
        incomingText = session.pendingQuestion;
      }

      console.log("[BOT] Restored:", incomingText);
    }

    // ===============================
    // 2️⃣ TABLE
    // ===============================
    const tableName = TABLES[session.line];

    if (!tableName) {
      throw new Error("Invalid line: " + session.line);
    }

    console.log("[BOT] Table:", tableName);

    // ===============================
    // 3️⃣ INTENTS
    // ===============================
    const isLastRequest =
      incomingText.includes("last") ||
      incomingText.includes("ultimo") ||
      incomingText.includes("último");

    const isShiftRequest =
      incomingText.includes("shift") ||
      incomingText.includes("turno");

    const isTodayRequest =
      incomingText.includes("today") ||
      incomingText.includes("hoy");

    let sql;

    // ===============================
    // 4️⃣ DETERMINISTIC SQL
    // ===============================

    // LAST
    if (isLastRequest) {
      sql = `
        SELECT *
        FROM ${tableName}
        ORDER BY createdAt DESC
        LIMIT 1
      `;
    }

    // SHIFT (UTC mapped)
    else if (isShiftRequest) {
      sql = `
        SELECT COUNT(*) AS total
        FROM ${tableName}
        WHERE
        (
          (TIME(createdAt) BETWEEN '13:00:00' AND '20:59:59'
            AND DATE(createdAt) = DATE(UTC_TIMESTAMP()))

          OR

          (
            (TIME(createdAt) >= '21:00:00'
              AND DATE(createdAt) = DATE(UTC_TIMESTAMP()))
            OR
            (TIME(createdAt) < '05:00:00'
              AND DATE(createdAt) = DATE_ADD(DATE(UTC_TIMESTAMP()), INTERVAL 1 DAY))
          )

          OR

          (TIME(createdAt) BETWEEN '05:00:00' AND '12:59:59'
            AND DATE(createdAt) = DATE(UTC_TIMESTAMP()))
        )
      `;
    }

    // TODAY
    else if (isTodayRequest) {
      sql = `
        SELECT COUNT(*) AS total
        FROM ${tableName}
        WHERE DATE(createdAt) = DATE(UTC_TIMESTAMP())
      `;
    }

    // ===============================
    // 5️⃣ AI (fallback only)
    // ===============================
    else {
      sql = await getSQLfromQuestion(
        incomingText,
        session.line.toUpperCase(),
        tableName
      );

      sql = sql
        .replace(/```sql/g, "")
        .replace(/```/g, "")
        .trim();

      sql = sql.replace(/from\s+\w+/i, `FROM ${tableName}`);
      sql = sql.replace(/production_date/gi, "createdAt");
    }

    console.log("[BOT] SQL:", sql);

    if (!isSafeSQL(sql)) {
      throw new Error("Unsafe SQL blocked");
    }

    // ===============================
    // 6️⃣ EXECUTE
    // ===============================
    const sequelize = db.sequelize;
    const [rows] = await sequelize.query(sql);

    // ===============================
    // 7️⃣ RESPONSE
    // ===============================
    let answer;

    if (!rows || rows.length === 0) {
      answer = "No production records were found.";
    }

    else if (isShiftRequest || isTodayRequest) {
      answer = `Production count: ${rows[0].total}`;
    }

    else if (isLastRequest) {
      const r = rows[0];

      answer = `
Last production:

Date: ${r.createdAt}
Part: ${r.numero_parte}
Serial: ${r.numero_serie}
Repeated: ${r.repetida ? "Yes" : "No"}
`.trim();
    }

    else {
      answer = await explainResult(incomingText, rows);
    }

    delete sessions[from];

    return reply(res, answer);

  } catch (error) {

    console.error("[BOT ERROR]", error);

    return reply(
      res,
      "Sorry, I couldn’t process that request. Please try again."
    );
  }
}

module.exports = { handleTwilioMessage };
