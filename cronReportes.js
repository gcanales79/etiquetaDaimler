require("dotenv").config();
const moment = require("moment-timezone");
const axios = require("axios");
const db = require("./models"); // Asegúrate de que la ruta a tus modelos sea correcta
const { Sequelize } = require("sequelize"); // Para la función FIND_IN_SET

// Configuración de Twilio (Reemplaza con tus credenciales reales o usa process.env)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const twilioWhatsAppNumber = process.env.TWILIO_PHONE;
const url = process.env.APP_URL;

// 1. FUNCIÓN PARA OBTENER LOS HORARIOS SEGÚN EL TURNO
function obtenerHorarios(turno) {
    // Usamos explícitamente la zona horaria de Monterrey para todos los cálculos
    const mty = moment().tz("America/Monterrey");
    const isDST = mty.isDST();
    const horaLocal = mty.hour(); // Nos devuelve la hora actual del 0 al 23
    
    let inicio, fin;
    let diaFinNumero; 
    let ejecutar = true;
    let horaEsperada; // Aquí guardaremos a qué hora DEBERÍA correr el script

    if (turno === "dia") {
        horaEsperada = isDST ? 20 : 21;
        inicio = isDST ? mty.format("YYYY-MM-DD") + " 12:00:00" : mty.format("YYYY-MM-DD") + " 13:00:00";
        fin = isDST ? mty.format("YYYY-MM-DD") + " 20:00:00" : mty.format("YYYY-MM-DD") + " 21:00:00";
        diaFinNumero = moment(fin).day();
        if (diaFinNumero === 0) ejecutar = false; 
    } 
    else if (turno === "tarde") {
        horaEsperada = isDST ? 4 : 5;
        // Para la tarde, el inicio fue "ayer"
        inicio = isDST ? mty.clone().subtract(1, "day").format("YYYY-MM-DD") + " 20:00:00" : mty.clone().subtract(1, "day").format("YYYY-MM-DD") + " 21:00:00";
        fin = isDST ? mty.format("YYYY-MM-DD") + " 04:00:00" : mty.format("YYYY-MM-DD") + " 05:00:00";
        diaFinNumero = moment(fin).day();
        if (diaFinNumero === 1) ejecutar = false;
    } 
    else if (turno === "noche") {
        horaEsperada = isDST ? 12 : 13;
        inicio = isDST ? mty.format("YYYY-MM-DD") + " 04:00:00" : mty.format("YYYY-MM-DD") + " 05:00:00";
        fin = isDST ? mty.format("YYYY-MM-DD") + " 12:00:00" : mty.format("YYYY-MM-DD") + " 13:00:00";
        diaFinNumero = moment(fin).day();
        if (diaFinNumero === 0) ejecutar = false;
    }

    // EL GUARDIÁN DEL TIEMPO (Evita la doble ejecución de Heroku)
    if (horaLocal !== horaEsperada) {
        console.log(`⏰ Ignorado: La hora local en MTY es ${horaLocal}:00 hrs. El reporte '${turno}' solo se envía a las ${horaEsperada}:00 hrs.`);
        ejecutar = false;
    }

    return {
        horainicialx: moment(inicio).format("X"),
        horafinalx: moment(fin).format("X"),
        ejecutar: ejecutar
    };
}

// 2. FUNCIÓN PRINCIPAL (EL MOTOR)
async function procesarReportes(turno) {
  console.log(
    `\n=== INICIANDO REPORTE MAESTRO: TURNO ${turno.toUpperCase()} ===`,
  );

  const { horainicialx, horafinalx, ejecutar } = obtenerHorarios(turno);

  if (!ejecutar) {
    console.log(
      `El reporte de ${turno} no se ejecuta el día de hoy según las reglas de negocio.`,
    );
    return;
  }

  const lineas = ["fa1", "fa9", "fa11", "fa13", "daimler"];

  for (let linea of lineas) {
    try {
      console.log(`\n--- Procesando línea: ${linea.toUpperCase()} ---`);

      // PASO A: Buscar usuarios suscritos a esta línea
      const usuarios = await db.User.findAll({
        where: db.sequelize.where(
          db.sequelize.fn("FIND_IN_SET", linea, db.sequelize.col("alertas")),
          ">",
          0,
        ),
      });

      if (usuarios.length === 0) {
        console.log(`No hay usuarios suscritos a ${linea}. Saltando...`);
        continue; // Brincamos a la siguiente línea para ahorrar recursos
      }

      console.log(
        `Se encontraron ${
          usuarios.length
        } usuarios para ${linea}. Obteniendo producción...`,
      );

      // PASO B: Obtener producción de Heroku
      const urlGet = `${url}/${linea}/produccionhora/${horainicialx}/${horafinalx}`;
      const apiRes = await axios.get(urlGet);
      const piezas = apiRes.data.data.count;
      console.log(urlGet);

      console.log(`Producción obtenida: ${piezas} piezas.`);

      // PASO C: Enviar WhatsApp a cada usuario
      //const mensajeWa = `*Reporte de Producción*\n🏭 Línea: *${linea.toUpperCase()}*\n⏱️ Turno: *${turno}*\n⚙️ Piezas producidas: *${piezas}*`;

      for (let usuario of usuarios) {
        if (usuario.telefono) {
          await client.messages.create({
            contentSid: "HXb454791f97e9b548a336957d567d7c9d",
            from: `whatsapp:${twilioWhatsAppNumber}`,
            to: `whatsapp:${usuario.telefono}`,
            messagingServiceSid: process.env.serviceSid,
            contentVariables: JSON.stringify({
              1: String(linea.toUpperCase()),
              2: String(turno),
              3: String(piezas),
            }),
          });
          console.log(`WhatsApp enviado a ${usuario.telefono}`);
        }
      }
    } catch (error) {
      console.error(`Error procesando la línea ${linea}:`, error.message);
      // No detenemos el script, dejamos que siga con la siguiente línea
    }
  }

  console.log("\n=== REPORTE MAESTRO FINALIZADO ===");
  process.exit(0); // Cerramos el script
}

// 3. LEER EL TURNO DESDE LA CONSOLA Y EJECUTAR
// Al correr "node cronReportes.js dia", atrapará la palabra "dia"
const turnoArgumento = process.argv[2];

if (!turnoArgumento || !["dia", "tarde", "noche"].includes(turnoArgumento)) {
  console.log(
    "Por favor, especifica un turno válido: node cronReportes.js [dia|tarde|noche]",
  );
  process.exit(1);
}

procesarReportes(turnoArgumento);
