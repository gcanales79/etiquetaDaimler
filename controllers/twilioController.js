const { getSQLfromQuestion, explainResult } = require("../services/ai");
const db = require("../models");

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

// Normalize a string: lowercase + remove non-alphanum (so "FA-11","fa11","Fa 11" -> "fa11")
function normalize(text = "") {
  return text.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function containsAny(text, list) {
  const t = normalize(text);
  return list.some((kw) => t.includes(normalize(kw)));
}

// SQL safety check (keeps your current rules)
function isSafeSQL(sql) {
  const lower = sql.toLowerCase().trim();

  if (!lower.startsWith("select")) return false;

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

  return true;
}

// Supported question detection (english + spanish)
function isSupportedQuestion(text) {
  const t = text.toLowerCase();
  return (
    t.includes("production") ||
    t.includes("producción") ||
    t.includes("produccion") ||
    t.includes("last") ||
    t.includes("latest") ||
    t.includes("recent") ||
    t.includes("ultimo") ||
    t.includes("último") ||
    t.includes("shift") ||
    t.includes("turno") ||
    t.includes("today") ||
    t.includes("hoy")
  );
}

async function handleTwilioMessage(req, res) {
  const from = req.body.From || "unknown";
  let incomingText = (req.body.Body || "").toString().trim();

  console.log("From:", from);
  console.log("Raw message:", incomingText);

  if (!incomingText) {
    return reply(res, "Please send a valid message.");
  }

  // Init session
  if (!sessions[from]) {
    sessions[from] = {};
  }
  const session = sessions[from];

  try {
    // 1) If we haven't got a line selected yet, try to detect it.
    if (!session.line) {
      // store the original question while we ask for the line
      if (!session.pendingQuestion) {
        session.pendingQuestion = incomingText;
      }

      // If user sends something unsupported (and we don't yet have a pending question),
      // show the menu of capabilities.
      if (!isSupportedQuestion(incomingText) && !session.pendingQuestion) {
        return reply(
          res,
          `
I can help with:

• Production today / producción hoy
• Production this shift / producción turno actual
• Last production / última producción
• Production by line (Daimler, FA-1, FA-9, FA-11, FA-13)

Examples:
• "production today fa-9"
• "producción turno actual"
• "last production fa-11"
`.trim()
        );
      }

      // detect line robustly: normalize both incoming text and known keys
      const normalizedIncoming = normalize(incomingText);
      // sort keys by length to prefer 'fa-11' before 'fa-1'
      const sortedKeys = Object.keys(TABLES).sort((a, b) => b.length - a.length);

      for (const key of sortedKeys) {
        if (normalizedIncoming === normalize(key) || normalizedIncoming.includes(normalize(key))) {
          session.line = key;
          break;
        }
      }

      // If still no line, ask
      if (!session.line) {
        return reply(res, "Which line? Daimler, FA-1, FA-9, FA-11, or FA-13");
      }

      // The user picked a line — restore the original question (if we had one)
      if (session.pendingQuestion) {
        incomingText = session.pendingQuestion;
        delete session.pendingQuestion;
        console.log("Restored question:", incomingText);
      }
    }

    // 2) Table name
    const tableName = TABLES[session.line];
    if (!tableName) {
      throw new Error("Invalid line: " + session.line);
    }
    console.log("Using table:", tableName);

    // 3) Generate SQL (AI)
    let sql = await getSQLfromQuestion(incomingText, session.line.toUpperCase(), tableName);

    // Clean up markdown
    sql = sql.replace(/```sql/g, "").replace(/```/g, "").trim();

    // 4) Normalize SQL so it fits our schema and allowed columns
    // Force correct table name
    sql = sql.replace(/from\s+\w+/i, `FROM ${tableName}`);

    // Remove "line = 'FA-X'" because table doesn't have that column
    sql = sql.replace(/where\s+line\s*=\s*'[^']+'\s*(and\s*)?/i, "WHERE ");

    // Map production_date -> createdAt
    sql = sql.replace(/production_date/gi, "createdAt");
    sql = sql.replace(
  /current_date/gi,
  "DATE(UTC_TIMESTAMP())"
);

    sql = sql.replace(
  /createdAt\s*=\s*CURDATE\(\)/i,
  `
  createdAt >= DATE(UTC_TIMESTAMP())
  AND createdAt < DATE_ADD(DATE(UTC_TIMESTAMP()), INTERVAL 1 DAY)
  `
);


    // prevent broken WHERE / WHERE AND
    sql = sql.replace(/where\s+and/i, "WHERE");
    sql = sql.replace(/where\s*$/i, "");

    // 5) Special intents: last/latest, shift
    const normalizedIncoming = incomingText.toLowerCase();
    const isLastRequest =
      normalizedIncoming.includes("last") ||
      normalizedIncoming.includes("latest") ||
      normalizedIncoming.includes("recent") ||
      normalizedIncoming.includes("previous") ||
      normalizedIncoming.includes("ultimo") ||
      normalizedIncoming.includes("último");

    const isShiftRequest =
      normalizedIncoming.includes("shift") ||
      normalizedIncoming.includes("current shift") ||
      normalizedIncoming.includes("this shift") ||
      normalizedIncoming.includes("turno") ||
      normalizedIncoming.includes("turno actual") ||
      normalizedIncoming.includes("esta turno") ||
      normalizedIncoming.includes("esta turno") ||
      normalizedIncoming.includes("hoy turno") ||
      normalizedIncoming.includes("turno de hoy");

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

      
      (
        TIME(UTC_TIMESTAMP()) BETWEEN '13:00:00' AND '20:59:59'
        AND DATE(createdAt) = DATE(UTC_TIMESTAMP())
        AND TIME(createdAt) BETWEEN '13:00:00' AND '20:59:59'
      )

      OR

      
      (
        TIME(UTC_TIMESTAMP()) >= '21:00:00'
        AND
        (
          (
            DATE(createdAt) = DATE(UTC_TIMESTAMP())
            AND TIME(createdAt) >= '21:00:00'
          )
          OR
          (
            DATE(createdAt) = DATE_SUB(DATE(UTC_TIMESTAMP()), INTERVAL 1 DAY)
            AND TIME(createdAt) < '05:00:00'
          )
        )
      )

      OR

      
      (
        TIME(UTC_TIMESTAMP()) BETWEEN '05:00:00' AND '12:59:59'
        AND DATE(createdAt) = DATE(UTC_TIMESTAMP())
        AND TIME(createdAt) BETWEEN '05:00:00' AND '12:59:59'
      )

    );
  `;
}


    console.log("Final SQL:", sql);

    // 6) Validate SQL
    if (!isSafeSQL(sql)) {
      throw new Error("Unsafe SQL blocked");
    }

    // 7) Run query (Sequelize)
    const sequelize = db.sequelize;
    if (!sequelize) {
      throw new Error("Database connection not found");
    }

    // debug info (good to remove in prod)
    console.log("DB HOST:", sequelize.config?.host);
    console.log("DB NAME:", sequelize.config?.database);
    console.log("TABLE:", tableName);

    const [rows] = await sequelize.query(sql);

    // 8) Build answer
    let answer;
    if (!rows || rows.length === 0) {
      answer = "No production records were found.";
    } else if (isShiftRequest) {
      // some DB drivers return [{ total: 42 }] or [{ "COUNT(*)": 42 }] — we handle both
      const total = rows[0].total ?? rows[0]["COUNT(*)"] ?? rows[0][Object.keys(rows[0])[0]];
      answer = `Current shift production: ${total}`;
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

    // 9) Clear session and reply
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
