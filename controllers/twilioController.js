const { getSQLfromQuestion, explainResult } = require("../services/ai");
const db = require("../models");

const SUPPORTED_INTENTS = {
  today: ["today", "production today"],
  last: ["last", "latest", "recent"],
  shift: ["shift", "current shift", "this shift"],
};

// Map lines → tables
const TABLES = {
  daimler: "daimlers",
  "fa-1": "fa1s",
  "fa-9": "fa9s",
  "fa-11": "fa11s",
  "fa-13": "fa13s",
};

// In-memory sessions
const sessions = {};

// Helper: send Twilio reply
function reply(res, message) {
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${message}</Message>
    </Response>
  `);
}

// SQL safety check
function isSafeSQL(sql) {
  const lower = sql.toLowerCase().trim();

  // Must start with SELECT
  if (!lower.startsWith("select")) return false;

  // Block dangerous keywords
  const blocked = [
    "drop",
    "delete",
    "update",
    "insert",
    "alter",
    "truncate",
    "--",
    ";--",
    "/*",
    "*/",
  ];

  for (const word of blocked) {
    if (lower.includes(word)) return false;
  }

  // Allow ORDER BY and LIMIT
  return true;
}

function isSupportedQuestion(text) {
  return (
    text.includes("production") ||
    text.includes("last") ||
    text.includes("latest") ||
    text.includes("shift") ||
    text.includes("today")
  );
}

async function handleTwilioMessage(req, res) {
  const from = req.body.From || "unknown";
  let incomingText = (req.body.Body || "").toLowerCase().trim();

  console.log("From:", from);
  console.log("Message:", incomingText);

  if (!incomingText) {
    return reply(res, "Please send a valid message.");
  }

  // 🚫 BLOCK UNSUPPORTED QUESTIONS

  // Init session
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

      // 🚫 BLOCK UNSUPPORTED QUESTIONS
      // Only block if we are NOT waiting for line selection
      if (!isSupportedQuestion(incomingText) && !session.pendingQuestion) {
        return reply(
          res,
          `
I can help with:

• Production today
• Production this shift
• Last production
• Production by line (Daimler, FA-1, FA-9, FA-11, FA-13)

Examples:
• "production today fa-9"
• "production this shift"
• "last production fa-11"
`.trim()
        );
      }

      // Detect line
      for (const key in TABLES) {
        if (incomingText.includes(key)) {
          session.line = key;
          break;
        }
      }

      if (!session.line) {
        return reply(res, "Which line? Daimler, FA-1, FA-9, FA-11, or FA-13");
      }

      // If only line sent
      if (incomingText === session.line) {
        incomingText = session.pendingQuestion;
      }
    }

    // ===============================
    // 2️⃣ GET TABLE NAME
    // ===============================

    const tableName = TABLES[session.line];

    if (!tableName) {
      throw new Error("Invalid line: " + session.line);
    }

    console.log("Using table:", tableName);

    // ===============================
    // 3️⃣ GENERATE SQL (AI)
    // ===============================

    let sql = await getSQLfromQuestion(
      incomingText,
      session.line.toUpperCase(),
      tableName
    );

    // Clean markdown
    sql = sql
      .replace(/```sql/g, "")
      .replace(/```/g, "")
      .trim();

    // ===============================
    // 4️⃣ NORMALIZE SQL
    // ===============================

    // Force correct table
    sql = sql.replace(/from\s+\w+/i, `FROM ${tableName}`);

    // Remove invalid "line = 'FA-X'"
    sql = sql.replace(/where\s+line\s*=\s*'[^']+'\s*(and\s*)?/i, "WHERE ");

    // Fix production_date → createdAt
    sql = sql.replace(/production_date/gi, "createdAt");

    // Fix CURRENT_DATE → CURDATE()
    sql = sql.replace(/current_date/gi, "CURDATE()");

    // Fix today filter
    sql = sql.replace(
      /createdAt\s*=\s*CURDATE\(\)/i,
      "DATE(createdAt) = CURDATE()"
    );

    // Clean broken WHERE
    sql = sql.replace(/where\s+and/i, "WHERE");
    sql = sql.replace(/where\s*$/i, "");

    // ===============================
    // HANDLE "LAST / LATEST" REQUESTS
    // ===============================

    const isLastRequest =
      incomingText.includes("last") ||
      incomingText.includes("latest") ||
      incomingText.includes("recent") ||
      incomingText.includes("previous");

    // ===============================
    // HANDLE "CURRENT SHIFT" REQUESTS
    // ===============================

    const isShiftRequest =
      incomingText.includes("shift") ||
      incomingText.includes("current shift") ||
      incomingText.includes("this shift");

    if (isLastRequest) {
      sql = `
    SELECT *
    FROM ${tableName}
    ORDER BY createdAt DESC
    LIMIT 1
  `;
    }

    if (isShiftRequest) {
      sql = `
    SELECT COUNT(*) AS total
    FROM ${tableName}
    WHERE
(
  -- Shift 1: 07:00–15:00 Monterrey
  (
    TIME(CONVERT_TZ(createdAt, 'UTC', 'America/Monterrey'))
      BETWEEN '07:00:00' AND '14:59:59'
    AND DATE(CONVERT_TZ(createdAt, 'UTC', 'America/Monterrey'))
      = DATE(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'America/Monterrey'))
  )

  OR

  -- Shift 2: 15:00–23:00 Monterrey
  (
    TIME(CONVERT_TZ(createdAt, 'UTC', 'America/Monterrey'))
      BETWEEN '15:00:00' AND '22:59:59'
    AND DATE(CONVERT_TZ(createdAt, 'UTC', 'America/Monterrey'))
      = DATE(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'America/Monterrey'))
  )

  OR

  -- Shift 3: 23:00–07:00 (crosses midnight Monterrey)
  (
    (
      TIME(CONVERT_TZ(createdAt, 'UTC', 'America/Monterrey')) >= '23:00:00'
      AND DATE(CONVERT_TZ(createdAt, 'UTC', 'America/Monterrey'))
        = DATE(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'America/Monterrey'))
    )

    OR

    (
      TIME(CONVERT_TZ(createdAt, 'UTC', 'America/Monterrey')) < '07:00:00'
      AND DATE(CONVERT_TZ(createdAt, 'UTC', 'America/Monterrey'))
        = DATE_SUB(
            DATE(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'America/Monterrey')),
            INTERVAL 1 DAY
          )
    )
  )
);
  `;
    }

    console.log("Final SQL:", sql);

    // ===============================
    // 5️⃣ VALIDATE SQL
    // ===============================

    if (!isSafeSQL(sql)) {
      throw new Error("Unsafe SQL blocked");
    }

    // ===============================
    // 6️⃣ RUN QUERY (SEQUELIZE)
    // ===============================

    const sequelize = db.sequelize;

    if (!sequelize) {
      throw new Error("Database connection not found");
    }

    const [rows] = await sequelize.query(sql);

    // ===============================
    // 7️⃣ EXPLAIN RESULT
    // ===============================

    let answer;

    if (!rows || rows.length === 0) {
      answer = "No production records were found.";
    } else if (isShiftRequest) {
      answer = `Current shift production: ${rows[0].total}`;
    } else if (isLastRequest) {
      const r = rows[0];

      answer = `
Last production:

Date: ${r.createdAt}
Part: ${r.numero_parte}
Serial: ${r.numero_serie}
Repeated: ${r.repetida ? "Yes" : "No"}
`.trim();
    } else {
      answer = await explainResult(incomingText, rows);
    }

    // ===============================
    // 8️⃣ CLEAR SESSION
    // ===============================

    delete sessions[from];

    return reply(res, answer);
  } catch (error) {
    console.error("Error:", error);

    let msg = "Sorry, I couldn’t process that.";

    if (error.code === "insufficient_quota") {
      msg = "AI service unavailable. Contact admin.";
    }

    return reply(res, msg);
  }
}

module.exports = { handleTwilioMessage };
