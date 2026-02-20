//const { getSQLfromQuestion, explainResult } = require("../services/ai");
const { getIntent } = require("../services/geminiai"); // Import your new AI router
const db = require("../models");
const { generateWeeklyChart } = require("../services/chart");
const path = require("path");
const twilio = require("twilio");
const moment = require("moment-timezone");
const { error } = require("console");
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

async function generateAndSendGraph(from, line, isLastWeek, language) {
  console.log(`Generating graph for table ${line}, lastWeek=${isLastWeek}`);
  const tz = "America/Monterrey";
  const tableName = TABLES[line];

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
    errorMsg =
      language === "es"
        ? "No se encontraron datos para el período solicitado."
        : "No data found for the requested period.";
    await sendTextMessage(from, errorMsg);
    return;
  }

  // Calculate the grand total from the database results
  const weeklyTotal = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);

  const fileName = `week-${Date.now()}.png`;

  /*await generateWeeklyChart(rows, fileName);
  
        const url = `${process.env.APP_URL}/charts/${fileName}`;
        console.log("Sending URL to Twilio:", url);*/

  // Now this returns a REAL https://res.cloudinary.com/... URL
  const chartUrl = await generateWeeklyChart(rows, fileName);

  console.log("Generated chart URL:", chartUrl);

  // 2. Send to WhatsApp
  try {
    labelOne = language === "es" ? "Gráfica Semanal" : "Weekly Chart";
    labelTwo = language === "es" ? "Total de la Semana" : "Weekly Total";
    await sendGraphMessage(
      from,
      `📊 ${labelOne}: ${line.toUpperCase()} \n${labelTwo}: ${weeklyTotal}`,
      chartUrl,
    );
  } catch (err) {
    console.error("Twilio Media Error:", err);
    crashMsg =
      language === "es"
        ? "La gráfica se generó pero no pude enviarla por WhatsApp. Por favor revisa el servidor."
        : "The chart was generated but I couldn't send it via WhatsApp. Please check the server.";
    await sendTextMessage(from, crashMsg);
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

  return;
}

async function processProductionRequest(from, incomingText) {
  if (!incomingText) return;

  // 1. ASK THE AI ROUTER
  // It returns { intent, line, timeframe }
  const aiResult = await getIntent(incomingText);
  console.log("🤖 AI Decision:", aiResult);

  let { intent, timeframe, language, line } = aiResult;

  // Initialize session
  if (!sessions[from]) sessions[from] = {};
  const session = sessions[from];

  // ---------------------------------------------------------
  // 🛡️ 2. VALIDATION GATE (Fixed to remember the intent)
  // ---------------------------------------------------------

  // If AI extracted a line, verify it actually exists in our TABLES config
  if (line) {
    const normalizedLine = line.toLowerCase(); // Ensure matching case with TABLES keys

    if (!TABLES[normalizedLine]) {
      // 🧠 NEW: Save what they wanted to do before stopping them
      if (intent !== "unknown") {
        session.pendingIntent = { intent, timeframe, language };
      }
      // 🛑 STOP! This line doesn't exist (e.g., "FA-8")
      const validLines = Object.keys(TABLES)
        .map((k) => k.toUpperCase())
        .join(", ");

      wrongLineMsg =
        language === "es"
          ? `⚠️ La línea *"${line}"* no es válida.\n\nLíneas disponibles: ${validLines}`
          : `⚠️ The line *"${line}"* is not valid.\n\nAvailable lines: ${validLines}`;

      await sendTextMessage(from, wrongLineMsg);
      return; // Exit function so we don't crash
    }

    // If valid, use the normalized version
    line = normalizedLine;
    session.line = line;
  }

  // ---------------------------------------------------------
  // 🧠 3. RESTORE PENDING INTENT
  // ---------------------------------------------------------
  // If the user just replied with a line ("FA11"), the AI intent is "unknown".
  // We restore the original intent here so the bot remembers the context.
  if (session.pendingIntent && session.line) {
    if (intent === "unknown") {
      intent = session.pendingIntent.intent;
      timeframe = session.pendingIntent.timeframe || timeframe;
      // 🐛 EL ARREGLO: Rescatar el idioma original ("es")
      language = session.pendingIntent.language || language
    }
    // Clear it so it doesn't get stuck in a loop later
    delete session.pendingIntent;
  }

  // If we still don't have a line, checking if it's a known intent that needs one
  // 2. Bilingual "Which Line?" Prompt
  if (intent !== "unknown" && !session.line) {
    // Store the intent so we can run it after they answer "Which line?"
    session.pendingIntent = { intent, timeframe, language };

    const askLineMsg =
      language === "es"
        ? "¿De qué línea? (Daimler, FA-1, FA-9, FA-11, FA-13)"
        : "Which line? (Daimler, FA-1, FA-9, FA-11, FA-13)";

    await sendTextMessage(from, askLineMsg);
    return;
  }

 /* // If they just answered the "Which line?" question:
  if (!line && session.line && session.pendingIntent) {
    // Restore the previous intent (e.g., they asked for "Graph" before)
    return routeRequest(
      from,
      session.pendingIntent.intent,
      session.line,
      session.pendingIntent.timeframe,
    );
  }*/

  // 3. FALLBACK MENU
  // If intent is unknown and we aren't waiting for a line, show the menu.
  // 3. Bilingual Fallback Menu
  if (intent === "unknown") {
    const menuEn = `
🤖 *Production Bot Menu*

I didn't recognize a production request. Try asking:

📊 *"Graph this week for FA-11"*
🏭 *"How is Daimler doing today?"*
🔢 *"Current shift FA-9"*
📋 *"Last record FA-1"*

*Active Line:* ${session.line ? session.line.toUpperCase() : "None"}
`.trim();

    const menuEs = `
🤖 *Menú de Producción*

No reconocí la solicitud. Intenta preguntar:

📊 *"Gráfica de esta semana de FA-11"*
🏭 *"¿Cómo va Daimler hoy?"*
🔢 *"Turno actual FA-9"*

*Linea Seleccionada:* ${session.line ? session.line.toUpperCase() : "Ninguna"}
`.trim();

    await sendTextMessage(from, language === "es" ? menuEs : menuEn);
    return;
  }

  // 4. EXECUTE THE REQUEST
  await routeRequest(from, intent, session.line, timeframe, language);
}

// ---------------------------------------------------------
// 🚦 THE ROUTER
// ---------------------------------------------------------
async function routeRequest(from, intent, line, timeframe, language) {
  // Clear any pending intent now that we are executing
  if (sessions[from]) delete sessions[from].pendingIntent;

  try {
    switch (intent) {
      case "production_count":
        await handleProductionCount(from, line, timeframe, language);
        break;
      case "graph":
        await handleGraphReport(from, line, timeframe, language);
        break;
      case "last_record":
        await handleLastRecord(from, line, language);
        break;
      default:
        const errorMsg =
          language === "es"
            ? "Entendí la solicitud, pero aún no tengo una función para ella."
            : "I understood the request but don't have a function for it yet.";
        await sendTextMessage(from, errorMsg);
    }
  } catch (error) {
    console.error("Routing Error:", error);
    const crashMsg =
      language === "es"
        ? "⚠️ Error procesando la solicitud."
        : "⚠️ Error processing request.";
    await sendTextMessage(from, crashMsg);
  }
}

// ---------------------------------------------------------
// 🏭 HANDLER: Production Counts (Shift / Today)
// ---------------------------------------------------------
async function handleProductionCount(from, line, timeframe, language) {
  const tableName = TABLES[line];
  if (!tableName)
    return sendTextMessage(from, "Error: Unknown table for line " + line);

  let start, end, label;
  const tz = "America/Monterrey";

  if (timeframe === "today") {
    // MONTERREY LOGIC: "Today" starts at 23:00 of the PREVIOUS day
    const now = moment().tz(tz);
    const startWindow =
      now.hour() >= 23
        ? now
            .clone()
            .hour(23)
            .startOf("hour")
        : now
            .clone()
            .subtract(1, "day")
            .hour(23)
            .startOf("hour");

    start = startWindow.utc().format("YYYY-MM-DD HH:mm:ss");
    end = moment()
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");

    l; // Bilingual Label
    label = language === "es" ? "Total de Hoy" : "Today's Total";
  } else {
    const window = getCurrentShiftUtcWindow();
    start = window.start;
    end = window.end;

    // Bilingual Label
    label = language === "es" ? "Turno Actual" : "Current Shift";
  }

  const [rows] = await db.sequelize.query(
    `SELECT COUNT(*) AS total FROM ${tableName} WHERE createdAt BETWEEN :start AND :end`,
    { replacements: { start, end } },
  );

  const total = rows[0].total ?? 0;
  // Translate the word "units"
  const unitsText = language === "es" ? "unidades" : "units";
  await sendTextMessage(
    from,
    `📊 *${label} (${line.toUpperCase()})*\nTotal: *${total}* ${unitsText}`,
  );
}

// ---------------------------------------------------------
// 📊 HANDLER: Weekly Graphs
// ---------------------------------------------------------
async function handleGraphReport(from, line, timeframe, language) {
  const isLastWeek = timeframe === "last_week";
  // Reuse your existing graph logic here.
  // You can wrap your previous "isGraphRequest" code into a function called 'generateAndSendGraph'
  // checking 'isLastWeek' to adjust the date range.

  waitMsg =
    language === "es"
      ? `📉 Generando la gráfica de ${
          isLastWeek ? "la semana pasada" : "esta semana"
        } para ${line.toUpperCase()}...`
      : `📉 Generating ${
          isLastWeek ? "Last Week's" : "Weekly"
        } Graph for ${line.toUpperCase()}...`;

  await sendTextMessage(from, waitMsg);

  // Call your existing graph generation logic logic here...
  // (Let me know if you need me to repackage your graph code too!)

  await generateAndSendGraph(from, line, isLastWeek, language);
}

// ---------------------------------------------------------
// 📋 HANDLER: Last Record
// ---------------------------------------------------------
async function handleLastRecord(from, line) {
  const tableName = TABLES[line];
  const [rows] = await db.sequelize.query(
    `SELECT * FROM ${tableName} ORDER BY createdAt DESC LIMIT 1`,
  );

  if (rows.length === 0) {
    const noRecordsMsg =
      language === "es" ? "No se encontraron registros." : "No records found.";
    return sendTextMessage(from, noRecordsMsg);
  }

  const r = rows[0];

  // Set up bilingual dictionary for the labels
  const t =
    language === "es"
      ? {
          title: "Último Registro",
          part: "No. Parte",
          serial: "No. Serie",
        }
      : {
          title: "Last Scan",
          part: "Part",
          serial: "Serial",
        };

  const msg = `
🆕 *${t.title} (${line.toUpperCase()})*
📅 ${moment(r.createdAt)
    .tz("America/Monterrey")
    .format("DD/MM HH:mm:ss")}
📦 ${t.part}: ${r.numero_parte || "N/A"}
${t.serial}: ${r.numero_serie || "N/A"}
`.trim();

  await sendTextMessage(from, msg);
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
