const { getSQLfromQuestion, explainResult } = require("../services/ai");
const db = require("../models");
const { generateWeeklyChart } = require("../services/chart");
const path = require("path");
const twilio = require("twilio");
const fs = require("fs");
const os = require("os");
const chartDir = path.join(__dirname, "../public/charts");

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
  console.log("Sending graph message to:", to);
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
  const moment = require("moment-timezone");
  const tz = "America/Monterrey";

  // Get current time in Monterrey
  const now = moment().tz(tz);
  const hour = now.hour();

  let start = now.clone();
  let end = now.clone();

  // 🌙 Night Shift: 23:00–06:59 (Monterrey Time)
  if (hour >= 23 || hour < 7) {
    if (hour >= 23) {
      // It's between 23:00 and midnight
      start
        .hour(23)
        .minute(0)
        .second(0)
        .millisecond(0);
      end
        .add(1, "day")
        .hour(7)
        .minute(0)
        .second(0)
        .millisecond(0);
    } else {
      // It's after midnight but before 07:00
      start
        .subtract(1, "day")
        .hour(23)
        .minute(0)
        .second(0)
        .millisecond(0);
      end
        .hour(7)
        .minute(0)
        .second(0)
        .millisecond(0);
    }
  }
  // ☀️ Day Shift: 07:00–14:59 (Monterrey Time)
  else if (hour >= 7 && hour < 15) {
    start
      .hour(7)
      .minute(0)
      .second(0)
      .millisecond(0);
    end
      .hour(15)
      .minute(0)
      .second(0)
      .millisecond(0);
  }
  // 🌇 Afternoon Shift: 15:00–22:59 (Monterrey Time)
  else {
    start
      .hour(15)
      .minute(0)
      .second(0)
      .millisecond(0);
    end
      .hour(23)
      .minute(0)
      .second(0)
      .millisecond(0);
  }

  // Convert these Local Monterrey shift times back to UTC for the SQL query
  return {
    start: start.utc().format("YYYY-MM-DD HH:mm:ss"),
    end: end.utc().format("YYYY-MM-DD HH:mm:ss"),
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
    t.includes("current") ||
    t.includes("ultimo") ||
    t.includes("último") ||
    t.includes("shift") ||
    t.includes("turno") ||
    t.includes("today") ||
    t.includes("graph") ||
    t.includes("chart") ||
    t.includes("grafica") ||
    t.includes("gráfica") ||
    t.includes("hoy")
  );
}

async function processProductionRequest(from, incomingText) {
  if (!incomingText) return;

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

      // 1. Check if the message contains ANY known production keywords
      // If it DOES NOT, show the Menu/Help message immediately.
      if (!isSupportedQuestion(incomingText) && !session.pendingQuestion) {
        const menuMessage = `
🤖 *Production Bot Menu*

I didn't recognize a production request. I can help you with:

📊 *Reports:*
• "Weekly Graph" (Grafica semanal)
• "Last week chart"

🏭 *Real-time Data:*
• "Production today" (Hoy)
• "Current shift" (Turno actual)
• "Last record" (Ultimo)

*Please include a line in your request:* (Daimler, FA-1, FA-9, FA-11, or FA-13)`.trim();

        await sendTextMessage(from, menuMessage);

        // Reset the session so they start fresh next time
        if (sessions[from]) delete sessions[from];
        return;
      }

      // If user sends something unsupported (and we don't yet have a pending question),
      // show the menu of capabilities.
      if (!isSupportedQuestion(incomingText) && !session.pendingQuestion) {
        await sendTextMessage(
          from,
          'I can help with: \n\n• Production today / producción hoy\n• Production this shift / producción turno actual\n• Last production / última producción\n• Production by line (Daimler, FA-1, FA-9, FA-11, FA-13)\n\nExamples:\n• "production today fa-9"\n• "producción turno actual"\n• "last production fa-11"',
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
        await sendTextMessage(
          from,
          "Which line? Daimler, FA-1, FA-9, FA-11, or FA-13",
        );
        return;
      }

      // The user picked a line — restore the original question (if we had one)
      if (session.pendingQuestion) {
        incomingText = session.pendingQuestion;
        delete session.pendingQuestion;
        // IMPORTANT: Redefine normalizedIncoming so intents catch the restored question
        var normalizedIncoming = incomingText.toLowerCase();
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
      normalizedIncoming.includes("current production") ||
      normalizedIncoming.includes("produccion actual") ||
      normalizedIncoming.includes("producción actual") ||
      normalizedIncoming.includes("turno") ||
      normalizedIncoming.includes("turno actual") ||
      normalizedIncoming.includes("esta turno") ||
      normalizedIncoming.includes("esta turno") ||
      normalizedIncoming.includes("hoy turno") ||
      normalizedIncoming.includes("production today") ||
      normalizedIncoming.includes("produccion hoy") ||
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
      // Respond immediately to Twilio (avoid timeout)
      await sendTextMessage(from, "📊 Gathering weekly data...");
      const moment = require("moment-timezone");
      const sequelize = db.sequelize;

      const tz = "America/Monterrey";

      let startMoment = moment()
        .tz(tz)
        .startOf("isoWeek");
      if (isLastWeek) startMoment.subtract(1, "week");

      // 1. Get the Monday of the requested week
      let mondayLocal = moment()
        .tz(tz)
        .startOf("isoWeek");
      if (isLastWeek) mondayLocal.subtract(1, "week");

      // 2. Window starts Sunday at 23:00 (The start of Monday's Night Shift)
      const startUTC = mondayLocal
        .clone()
        .subtract(1, "hour")
        .utc()
        .format("YYYY-MM-DD HH:mm:ss");
      // Window ends the following Sunday at 22:59:59
      const endUTC = mondayLocal
        .clone()
        .add(7, "days")
        .subtract(1, "second")
        .subtract(1, "hour")
        .utc()
        .format("YYYY-MM-DD HH:mm:ss");

      // THE OFFSET QUERY:
      // We subtract 6 hours from createdAt to get the "Local" time for grouping
      const rows = await db.sequelize.query(
        `
          SELECT 
        -- 1. ALIGN THE DATE: 
        -- We subtract 6 hours for Monterrey + 1 hour so that 23:00 Sunday becomes 16:00 Sunday,
        -- BUT we actually want 23:00 Sunday to count as MONDAY. 
        -- To make 23:00 (Night Start) the start of the "next" day, we ADD 1 hour before getting the date.
        DATE(DATE_SUB(DATE_ADD(createdAt, INTERVAL 1 HOUR), INTERVAL 6 HOUR)) as day,

        -- 2. DEFINE THE SHIFTS (Monterrey Local Time):
        -- Night: 23:00 - 06:59
        COUNT(CASE WHEN HOUR(DATE_SUB(createdAt, INTERVAL 6 HOUR)) >= 23 
                    OR HOUR(DATE_SUB(createdAt, INTERVAL 6 HOUR)) < 7 THEN 1 END) as shift_night,
        
        -- Day: 07:00 - 14:59
        COUNT(CASE WHEN HOUR(DATE_SUB(createdAt, INTERVAL 6 HOUR)) BETWEEN 7 AND 14 THEN 1 END) as shift_day,
        
        -- Afternoon: 15:00 - 22:59
        COUNT(CASE WHEN HOUR(DATE_SUB(createdAt, INTERVAL 6 HOUR)) BETWEEN 15 AND 22 THEN 1 END) as shift_afternoon,
        
        COUNT(*) as total
            FROM ${tableName}
            WHERE createdAt BETWEEN :startUTC AND :endUTC
            GROUP BY day
            ORDER BY day ASC
        `,
        {
          replacements: { startUTC, endUTC },
          type: db.sequelize.QueryTypes.SELECT,
        },
      );

      console.log("Weekly data rows:", rows);

      if (!rows || rows.length === 0) {
        await sendTextMessage(from, "No data found for the requested period.");
        return;
      }

      // Calculate the grand total from the database results
      const weeklyTotal = rows.reduce(
        (sum, r) => sum + Number(r.total || 0),
        0,
      );

      const fileName = `week-${Date.now()}.png`;

      /*await generateWeeklyChart(rows, fileName);

      const url = `${process.env.APP_URL}/charts/${fileName}`;
      console.log("Sending URL to Twilio:", url);*/

      // Now this returns a REAL https://res.cloudinary.com/... URL
      const chartUrl = await generateWeeklyChart(rows, fileName);

      console.log("Generated chart URL:", chartUrl);

      // 2. Send to WhatsApp
      try {
        await sendGraphMessage(
          from,
          `📊 Weekly Production: ${session.line.toUpperCase()} \nTotal for the week: ${weeklyTotal}`,
          chartUrl,
        );
      } catch (err) {
        console.error("Twilio Media Error:", err);
        await sendTextMessage(
          from,
          "The chart was generated but I couldn't send it via WhatsApp. Please check the server.",
        );
      }

      // 3. Delete from Cloudinary after a 60-second delay
      // We wait 60 seconds to ensure Twilio's servers have finished downloading it.
      setTimeout(async () => {
        try {
          const cloudinary = require("cloudinary").v2;
          // The 'public_id' is the folder + filename without extension
          await cloudinary.uploader.destroy(`production_charts/${fileName}`);
          console.log(`Cloudinary file ${fileName} deleted.`);
        } catch (err) {
          console.error("Failed to delete Cloudinary image:", err);
        }
      }, 60000); // 60,000ms = 1 minute

      delete sessions[from];
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
      answer = `📊 *Current Shift Production*\nLine: ${session.line.toUpperCase()}\nTotal: *${total}* units`;
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
        return;
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

async function handleTwilioMessage(req, res) {
  const from = req.body.From || "unknown";
  let incomingText = (req.body.Body || "").toString().trim();

  console.log("From:", from);
  console.log("Raw message:", incomingText);

  // Immediately acknowledge Twilio (avoid timeout)
  res
    .status(200)
    .type("text/xml")
    .send(`<Response></Response>`);

  // Run the logic in the background
  try {
    await processProductionRequest(from, incomingText);
  } catch (err) {
    console.error("Background Processing Error:", err);
  }
}

module.exports = { handleTwilioMessage };
