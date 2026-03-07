var db = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const moment = require("moment-timezone");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

//Add a new label
async function addSerial(req, res) {
  const { serial } = req.body;

  if (!checkAfterColon(serial)) {
    return res.send({ code: "400", message: "Formato incorrecto" });
  }

  try {
    const numero_parte = serial.substring(serial.indexOf("P") + 1, serial.indexOf("P") + 9);
    
    // 1. Búsqueda optimizada del Número de Parte
    const response = await db.Numeropt.findOne({
      where: { linea: "FA-9", numero_parte: numero_parte },
      raw: true // <--- Optimización: no crea modelo Sequelize
    });

    if (!response) {
      return res.send({ code: "400", message: "Número de parte no dado de alta" });
    }

    const numero_serie = serial.slice(-14);

    try {
      // 2. Intento de creación
      const serialStored = await db.Fa9.create({
        serial: serial,
        numero_parte: numero_parte,
        numero_serie: numero_serie,
      });

      return res.send({ code: "200", serialStored, message: "Etiqueta correcta" });

    } catch (err) {
      // 3. Manejo de duplicados optimizado
      if (err.name === 'SequelizeUniqueConstraintError') {
        // Marcamos como repetida usando el numero_serie (que es el índice único)
        await db.Fa9.update(
          { repetida: true },
          { where: { numero_serie: numero_serie } } // <--- Usar el índice único es mucho más rápido
        );
        return res.send({ code: "400", message: "Número de serie repetido" });
      }
      throw err; // Si es otro error, lo lanza al catch principal
    }

  } catch (error) {
    console.error("Error crítico:", error);
    return res.status(500).send({ code: "500", message: "Error de servidor" });
  }
}

//Fin the last six pieces produced
function getLastSixLabels(req, res) {
  db.Fa9.count()
    .then((count) => {
      db.Fa9.findAll({
        where: {
          id: {
            [Op.gte]: count * 0,
          },
        },
        limit: 6,
        order: [["createdAt", "DESC"]],
      })
        .then(function(response) {
          // res.json(dbDaimler);
          if (!response) {
            return res
              .status(404)
              .send({ message: "Etiquetas no encontradas", alert: "Error" });
          } else {
            return res.status(200).send({ data: response, alert: "Success" });
          }
          //console.log(dbDaimler)
        })
        .catch((err) => {
          return res.status(500).send({ err: err, alert: "Error" });
        });
    })
    .catch((err) => {
      console.log(err);
      return;
    });
}

//Get production per hour
function productionPerHour(req, res) {
  let fechainicial = moment
    .unix(req.params.fechainicial)
    .format("YYYY-MM-DD HH:mm:ss");
  let fechafinal = moment
    .unix(req.params.fechafinal)
    .format("YYYY-MM-DD HH:mm:ss");
  //console.log(fechainicial)
  //console.log(fechafinal)
  //console.log(req.params.fechafinal)
  db.Fa9.count()
    .then((count) => {
      // console.log(count)
      db.Fa9.findAndCountAll({
        where: {
          /* id: {
              [Op.gte]: count * 0,
            },*/
          createdAt: {
            [Op.gte]: fechainicial,
            [Op.lte]: fechafinal,
          },
          //Le agregue esto para que no cuente las cambiadas
        },
        distinct: true,
        col: "serial",
      })
        .then((data) => {
          //console.log(data)
          if (!data) {
            return res
              .status(404)
              .send({ message: "Datos no encontrados", alert: "Error" });
          } else {
            return res.status(200).send({ data: data, alert: "Success" });
          }
        })
        .catch(function(err) {
          return res
            .status(500)
            .send({ message: "Error de servidor", err: err, alert: "Error" });
        });
    })
    .catch((err) => {
      console.log(err);
      return;
    });
}

//* SMS Produccion del turno
function productionReport(req, res) {
  var telefonos = [
    process.env.GUS_PHONE,
    process.env.CHAVA_PHONE,
    process.env.CHAGO_PHONE,
    process.env.BERE_PHONE,
    process.env.BERNARDO
  ];

  //* Send messages thru SMS
  /*
  for (var i = 0; i < telefonos.length; i++) {
    client.messages.create({
      from: process.env.TWILIO_PHONE, // From a valid Twilio number
      body: "La producción de la linea Daimler del turno de " + req.body.turno + " fue de: " + req.body.piezasProducidas,
      to: telefonos[i],  // Text this number

    })
      .then(function (message) {
        console.log("Mensaje de texto: " + message.sid);
        res.json(message);
      });
  }
*/

  //* Send message thry whatsapp
  let responseMessage = [];
  for (var i = 0; i < telefonos.length; i++) {
    //console.log("whatsapp:" + telefonos[i]);
    client.messages
      .create({
        /*from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
        body:
          "La producción de la linea de FA-1 del turno de " +
          req.body.turno +
          " fue de: " +
          req.body.piezasProducidas,
        to: "whatsapp:" + t/*elefonos[i], // Text this number
        /*La producción de la linea de Daimler del turno de {{1}} fue de: {{2}}*/
        contentSid: "HXb454791f97e9b548a336957d567d7c9d",
        from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
        to: "whatsapp:" + telefonos[i], // Text this number,
        messagingServiceSid: process.env.serviceSid,
        contentVariables: JSON.stringify({
          1: "FA-9",
          2: String(req.body.turno),
          3: String(req.body.piezasProducidas),
        }),
      })
      .then(function(message) {
        //console.log("Whatsapp:" + message.sid);
        console.log(
          `El mensaje a ${message.to} con sid: ${
            message.sid
          } tiene el status de: ${message.status}`
        );
        responseMessage.push(message);
        //console.log(responseMessage);
        if (responseMessage.length == telefonos.length) {
          return res.json(responseMessage);
        }
      })
      .catch(function(error) {
        return res.json(error);
      });
  }
}

function checkAfterColon(str) {
  // Find the position of the colon
  const colonIndex = str.indexOf(":");

  // If no colon is found, or no content after the colon, return false
  if (colonIndex === -1 || colonIndex === str.length - 1) {
    return false;
  }

  // Get the part after the colon
  const afterColon = str.slice(colonIndex + 1);

  // Regular expression to check if the part after the colon contains only letters and numbers
  const regex = /^[a-zA-Z0-9]+$/;

  // Check if the length is exactly 58 characters and if it matches the regular expression
  return afterColon.length === 55 && regex.test(afterColon);
}

// ── NUEVO ENDPOINT MAESTRO PARA FA-9 ──
async function getDashboardMaster(req, res) {
  try {
    // Definimos la constante de la zona horaria como nuestra fuente de verdad
    const TZ = "America/Monterrey";

    // 1. Promesa: Últimas 6 etiquetas
    const pLast6 = db.Fa9.findAll({
      limit: 6,
      order: [["createdAt", "DESC"]],
    });

    // 2. Promesas: Producción por hora (9 horas)
    let pHoras = [];
    for (let i = 0; i < 9; i++) {
      // Calculamos TODO basado explícitamente en la hora de Monterrey
      let inicioMty = moment().tz(TZ).startOf("hour").subtract(i, "hour");
      let finMty = moment().tz(TZ).startOf("hour").subtract(i - 1, "hour");
      
      // Al usar .toDate(), Sequelize traduce la zona horaria por nosotros sin fallar
      let prom = db.Fa9.count({
        where: { createdAt: { [Op.gte]: inicioMty.toDate(), [Op.lt]: finMty.toDate() } },
        distinct: true, col: "serial"
      }).then(count => ({
        fecha: inicioMty.format("X"), // Sigue siendo un timestamp Unix para el FrontEnd
        producidas: count
      }));
      pHoras.push(prom);
    }

    // 3. Promesas: Producción por turnos (7 días)
    let pTurnos = [];
    // Inicio de la semana (Lunes) en Monterrey
    let inicioSemanaMty = moment().tz(TZ).startOf("isoweek");

    for (let i = 0; i < 7; i++) {
      let diaActualStr = inicioSemanaMty.clone().add(i, "days").format("YYYY-MM-DD");
      let diaAnteriorStr = inicioSemanaMty.clone().add(i - 1, "days").format("YYYY-MM-DD");

      // Armamos la hora exacta en MTY y luego la convertimos a Date universal
      // Nota: Usamos "YYYY-MM-DD HH:mm:ss" para decirle a moment exactamente qué leer
      let t1Inicio = moment.tz(`${diaActualStr} 07:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();
      let t1Fin    = moment.tz(`${diaActualStr} 15:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();

      let t2Inicio = moment.tz(`${diaActualStr} 15:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();
      let t2Fin    = moment.tz(`${diaActualStr} 23:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();

      // El turno 3 empieza el día anterior a las 23:00
      let t3Inicio = moment.tz(`${diaAnteriorStr} 23:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();
      let t3Fin    = moment.tz(`${diaActualStr} 07:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();

      // TIP: Usamos [Op.lt] (menor que) en lugar de [Op.lte] (menor o igual) para el fin del turno.
      // Así evitamos que si una pieza se escanea exactamente a las 15:00:00, se cuente en ambos turnos.
      pTurnos.push(db.Fa9.count({ where: { createdAt: { [Op.gte]: t1Inicio, [Op.lt]: t1Fin } }, distinct: true, col: "serial" }).then(c => ({ turno: 1, dia: i, count: c })));
      pTurnos.push(db.Fa9.count({ where: { createdAt: { [Op.gte]: t2Inicio, [Op.lt]: t2Fin } }, distinct: true, col: "serial" }).then(c => ({ turno: 2, dia: i, count: c })));
      pTurnos.push(db.Fa9.count({ where: { createdAt: { [Op.gte]: t3Inicio, [Op.lt]: t3Fin } }, distinct: true, col: "serial" }).then(c => ({ turno: 3, dia: i, count: c })));
    }

    // 4. Promesas: Producción por semana (10 semanas)
    let pSemanas = [];
    for (let i = 9; i >= 0; i--) {
      // 1. Nos paramos en el Lunes de la semana que queremos calcular
      // 2. Retrocedemos 1 día para caer en Domingo
      // 3. Fijamos la hora exactamente a las 23:00:00
      let inicioSemana = moment().tz(TZ)
        .startOf("isoweek")
        .subtract(i, "weeks")
        .subtract(1, "days")
        .hour(23).minute(0).second(0).millisecond(0);

      // El fin de semana de producción es exactamente 7 días después (Siguiente domingo a las 23:00)
      let finSemana = inicioSemana.clone().add(7, "days");

      // Obtenemos el número de semana (usamos el lunes para que cuadre con el calendario oficial)
      let numeroDeSemana = inicioSemana.clone().add(1, "days").week();

      let prom = db.Fa9.count({
        where: { createdAt: { [Op.gte]: inicioSemana.toDate(), [Op.lt]: finSemana.toDate() } },
        distinct: true, col: "serial"
      }).then(count => ({
        semana: numeroDeSemana,
        valor: count
      }));
      pSemanas.push(prom);
    }
    // Ejecutamos todo de golpe
    const [ultimas6, produccionHora, turnosRaw, semanasRaw] = await Promise.all([
      pLast6,
      Promise.all(pHoras),
      Promise.all(pTurnos),
      Promise.all(pSemanas)
    ]);

    // Acomodamos arreglos para el FrontEnd
    let d1 = new Array(7).fill(0), d2 = new Array(7).fill(0), d3 = new Array(7).fill(0);
    turnosRaw.forEach(res => {
      if (res.turno === 1) d1[res.dia] = res.count;
      if (res.turno === 2) d2[res.dia] = res.count;
      if (res.turno === 3) d3[res.dia] = res.count;
    });

    let numSemana = semanasRaw.map(s => s.semana);
    let datosSemana = semanasRaw.map(s => s.valor);

    // Respuesta
    res.status(200).json({
      code: "200",
      data: {
        ultimas6,
        produccionHora,
        turnos: { d1, d2, d3 },
        semanas: { numSemana, datosSemana }
      }
    });

  } catch (error) {
    console.error("Error en getDashboardMaster (FA9):", error);
    res.status(500).json({ code: "500", message: "Error interno cargando dashboards" });
  }
}

module.exports = {
  addSerial,
  getLastSixLabels,
  productionPerHour,
  productionReport,
  getDashboardMaster,
};
