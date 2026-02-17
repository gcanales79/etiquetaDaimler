const { getSQLfromQuestion, explainResult } = require("../services/ai");
const db = require("../models");
const { generateWeeklyChart } = require("../services/chart");
const path = require("path");
const twilio = require("twilio");
const fs = require("fs");
const os = require("os");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

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

function sendTwiml(res, xml) {
  res
    .status(200)
    .type("text/xml")
    .send(xml);
}

function reply(res, message) {
  const twiml = `
<Response>
  <Message>${message}</Message>
</Response>
`.trim();

  sendTwiml(res, twiml);
}

function replyWithImage(res, text, imageUrl) {
  const twiml = `
<Response>
  <Message>
    <Body>${text}</Body>
    <Media>${imageUrl}</Media>
  </Message>
</Response>
`.trim();

  console.log("TWIML RESPONSE:\n", twiml);

  sendTwiml(res, twiml);
}

//Twilio message sender (for charts)
async function sendGraphMessage(to, text, imageUrl) {
  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_PHONE}`, // Twilio sandbox or your WA number
    to: to,
    body: text,
    mediaUrl: [imageUrl],
  });
}

async function sendTextMessage(to, text) {
  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_PHONE}`,
    to,
    body: text,
  });
}


function getWeekRangeUTC(lastWeek = false) {
  const now = new Date();

  // Get Monday of current week
  const day = now.getUTCDay() || 7; // Sunday = 7
  const diff = now.getUTCDate() - day + 1;

  const monday = new Date(now);
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);

  // Move to last week if needed
  if (lastWeek) {
    monday.setUTCDate(monday.getUTCDate() - 7);
  }

  // Get Sunday 23:59:59
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 8);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    start: monday
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
    end: sunday
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
  };
}

function getWeekRangeUTC(lastWeek = false) {
  const now = new Date();

  const day = now.getUTCDay() || 7;
  const diff = now.getUTCDate() - day + 1;

  const monday = new Date(now.setUTCDate(diff));
  monday.setUTCHours(0, 0, 0, 0);

  if (lastWeek) {
    monday.setUTCDate(monday.getUTCDate() - 7);
  }

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 7);

  return {
    start: monday
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
    end: sunday
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
  };
}

function getCurrentShiftUtcWindow() {
  const now = new Date(); // UTC
  const hour = now.getUTCHours();

  let start = new Date(now);
  let end = new Date(now);

  // 🌙 Night: 23:00–06:59
  if (hour >= 23 || hour < 7) {
    if (hour >= 23) {
      // Night started today
      start.setUTCHours(23, 0, 0, 0);
      end.setUTCDate(end.getUTCDate() + 1);
      end.setUTCHours(7, 0, 0, 0);
    } else {
      // After midnight (still night)
      start.setUTCDate(start.getUTCDate() - 1);
      start.setUTCHours(23, 0, 0, 0);
      end.setUTCHours(7, 0, 0, 0);
    }
  }

  // ☀️ Day: 07:00–14:59
  else if (hour >= 7 && hour < 15) {
    start.setUTCHours(7, 0, 0, 0);
    end.setUTCHours(15, 0, 0, 0);
  }

  // 🌇 Afternoon: 15:00–22:59
  else {
    start.setUTCHours(15, 0, 0, 0);
    end.setUTCHours(23, 0, 0, 0);
  }

  return {
    start: start
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
    end: end
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
  };
}

// Normalize a string: lowercase + remove non-alphanum (so "FA-11","fa11","Fa 11" -> "fa11")
function normalize(text = "") {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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

  // Immediately acknowledge Twilio (avoid timeout)
  res.status(200).type("text/xml").send(`
<Response>
  <Message>⏳ Processing your request...</Message>
</Response>
`);

  if (!incomingText) {
    await sendTextMessage(from, "Please send a valid message.");
return;

  }

  // Init session
  if (!sessions[from]) {
    sessions[from] = {};
  }
  const session = sessions[from];

  //Reset line on new message
  //session.line = null;

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
`.trim(),
        );
      }

      // detect line robustly: normalize both incoming text and known keys
      const normalizedIncoming = normalize(incomingText);
      // sort keys by length to prefer 'fa-11' before 'fa-1'
      const sortedKeys = Object.keys(TABLES).sort(
        (a, b) => b.length - a.length,
      );

      for (const key of sortedKeys) {
        if (
          normalizedIncoming === normalize(key) ||
          normalizedIncoming.includes(normalize(key))
        ) {
          session.line = key;
          break;
        }
      }

      // If still no line, ask
      if (!session.line) {
        await sendTextMessage(from, "Which line? Daimler, FA-1, FA-9, FA-11, or FA-13");
return;
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
    let sql;
    let manualSQL = false;
    sql = await getSQLfromQuestion(
      incomingText,
      session.line.toUpperCase(),
      tableName,
    );

    // Clean up markdown
    sql = sql
      .replace(/```sql/g, "")
      .replace(/```/g, "")
      .trim();

    // 4) Normalize SQL so it fits our schema and allowed columns
    // ===============================
    // 4️⃣ NORMALIZE SQL (AI ONLY)
    // ===============================

    if (!manualSQL) {
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
        "DATE(createdAt) = CURDATE()",
      );

      // Clean broken WHERE
      sql = sql.replace(/where\s+and/i, "WHERE");
      sql = sql.replace(/where\s*$/i, "");
    }

    // 5) Special intents: last/latest, shift
    const normalizedIncoming = incomingText.toLowerCase();

    // GRAPH (first priority)
    const isGraphRequest =
      normalizedIncoming.includes("graph") ||
      normalizedIncoming.includes("chart") ||
      normalizedIncoming.includes("grafica") ||
      normalizedIncoming.includes("gráfica") ||
      normalizedIncoming.includes("week") ||
      normalizedIncoming.includes("semana");

    // LAST WEEK (Only for graphs)
    const isLastWeek =
      normalizedIncoming.includes("last week") ||
      normalizedIncoming.includes("semana pasada");

    //SHIFT
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

    //LAST RECORD
    const isLastRequest =
      !isGraphRequest &&
      (normalizedIncoming.includes("last") ||
        normalizedIncoming.includes("latest") ||
        normalizedIncoming.includes("recent") ||
        normalizedIncoming.includes("previous") ||
        normalizedIncoming.includes("ultimo") ||
        normalizedIncoming.includes("último"));

    console.log("INTENTS:", {
      isGraphRequest,
      isLastWeek,
      isLastRequest,
      isShiftRequest,
    });

    if (isLastRequest) {
      manualSQL = true;
      sql = `
        SELECT *
        FROM ${tableName}
        ORDER BY createdAt DESC
        LIMIT 1
      `;
    }

    if (isShiftRequest) {
      manualSQL = true;
      const { start, end } = getCurrentShiftUtcWindow();

      console.log("SHIFT WINDOW UTC:", start, "→", end);

      sql = `
    SELECT COUNT(*) AS total
    FROM ${tableName}
    WHERE createdAt BETWEEN '${start}' AND '${end}'
  `;
    }

    // ===============================
    // WEEKLY GRAPH
    // ===============================

    if (isGraphRequest) {
      const moment = require("moment-timezone");
      const sequelize = db.sequelize;

      const weekStart = moment()
        .tz("America/Monterrey")
        .startOf("isoWeek");

      if (isLastWeek) {
        weekStart.subtract(1, "week");
      }

      let rows = [];

      for (let i = 0; i < 7; i++) {
        const baseDay = weekStart.clone().add(i, "days");

        const labelDay = baseDay.format("YYYY-MM-DD");

        // DAY SHIFT
        const dayStart = baseDay
          .clone()
          .hour(7)
          .minute(0)
          .second(0);
        const dayEnd = baseDay
          .clone()
          .hour(14)
          .minute(59)
          .second(59);

        // AFTERNOON SHIFT
        const afternoonStart = baseDay
          .clone()
          .hour(15)
          .minute(0)
          .second(0);
        const afternoonEnd = baseDay
          .clone()
          .hour(22)
          .minute(59)
          .second(59);

        // NIGHT SHIFT (previous day 23:00 → 06:59)
        const nightStart = baseDay
          .clone()
          .subtract(1, "day")
          .hour(23)
          .minute(0)
          .second(0);
        const nightEnd = baseDay
          .clone()
          .hour(6)
          .minute(59)
          .second(59);

        // Convert to UTC
        const formatUTC = (m) =>
          m
            .clone()
            .tz("UTC")
            .format("YYYY-MM-DD HH:mm:ss");

        const [dayRows] = await sequelize.query(`
      SELECT COUNT(*) AS total
      FROM ${tableName}
      WHERE createdAt BETWEEN '${formatUTC(dayStart)}'
      AND '${formatUTC(dayEnd)}'
    `);

        const [afternoonRows] = await sequelize.query(`
      SELECT COUNT(*) AS total
      FROM ${tableName}
      WHERE createdAt BETWEEN '${formatUTC(afternoonStart)}'
      AND '${formatUTC(afternoonEnd)}'
    `);

        const [nightRows] = await sequelize.query(`
      SELECT COUNT(*) AS total
      FROM ${tableName}
      WHERE createdAt BETWEEN '${formatUTC(nightStart)}'
      AND '${formatUTC(nightEnd)}'
    `);

        const d = dayRows[0].total;
        const a = afternoonRows[0].total;
        const n = nightRows[0].total;

        rows.push({
          day: labelDay,
          shift_day: d,
          shift_afternoon: a,
          shift_night: n,
          total: d + a + n,
        });
      }

      const file = `week-${Date.now()}.png`;

      await generateWeeklyChart(rows, file);

      //Debug info
      const fullPath = path.join(os.tmpdir(), file);
      console.log("Chart full path:", fullPath);
      console.log("Chart file exists:", fs.existsSync(fullPath));

      const url = `${process.env.APP_URL}/charts/${file}`;

      console.log("Generated chart URL:", url);

      // Respond immediately to Twilio (avoid timeout)
      await sendTextMessage(from, "📊 Generating weekly report...");
      //reply(res, "📊 Generating weekly report...");

      // Send media AFTER webhook response
      try {
        await sendGraphMessage(from, "📊 Weekly Production Report", url);
      } catch (err) {
        console.error("Media send failed:", err);
      }

      return;
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
      const total =
        rows[0].total ??
        rows[0]["COUNT(*)"] ??
        rows[0][Object.keys(rows[0])[0]];
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
    } else if (isGraphRequest) {
      const fileName = `week-${Date.now()}.png`;

      await generateWeeklyChart(rows, fileName);

      const url = `${process.env.APP_URL}/charts/${fileName}`;
      console.log("Chart filename:", fileName);
      console.log("Chart URL:", url);
      const sum = rows.reduce((a, b) => a + Number(b.total), 0);

      if (!rows || rows.length === 0) {
        await sendTextMessage(from, "No data found for that week.");
        return
        //return reply(res, "No data found for that week.");
      }

      return replyWithImage(
        res,
        `📊 Weekly Production Report\nTotal: ${sum}`,
        url,
      );
    } else {
      answer = await explainResult(incomingText, rows);
    }

    // 9) Clear session and reply
    delete sessions[from];
    await sendTextMessage(from, answer);
return;
  } catch (error) {
    console.error("Error:", error);
    let msg = "Sorry, I couldn’t process that.";
    if (error.code === "insufficient_quota") {
      msg = "AI service unavailable. Contact admin.";
    }
    await sendTextMessage(from, msg);
    return;
    //return reply(res, msg);
  }
}

module.exports = { handleTwilioMessage };
