var db = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const moment = require("moment-timezone");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);


//Add a new label
function addSerial(req, res) {
  const { serial } = req.body;
  if (checkAfterColon(serial)) {
    let numero_parte = serial.substring(
      serial.indexOf("P") + 1,
      serial.indexOf("P") + 9
    );
    //console.log(numero_parte);
    //console.log(-1*serial.length+14)
    //!Aqui iria desde donde se quiere tomar numero de serie a partir de la derecha
    //let numero_serie=serial.slice(-14);
    //console.log(`El numero de serie es ${numero_serie}`);
    db.Numeropt.findOne({
      where: {
        linea: {
          [Op.eq]: "FA-11",
        },
        numero_parte: {
          [Op.eq]: numero_parte,
        },
      },
    })
      .then((response) => {
        //console.log(response)
        if (!response) {
          return res.send({
            code: "400",
            message: "El número de parte no esta dado de alta en la línea",
          });
        } else {
          //res.status(200).send({code:"200", message:"Número encontrado" })
          /*if(serial.length!=parseInt(response.largo_etiqueta)){
                return res.send({code:"400", message: "Etiqueta no tiene el largo correcto"})
              }*/
          /*else{*/
          //!Cambiar esto si se utilizan los datos del NP
          //let numero_parte=serial.substring(parseInt(response.izq_etiqueta),parseInt(response.izq_etiqueta)+parseInt(response.largo_numero_parte));
          //let numero_serie=serial.slice(-1*parseInt(response.der_etiqueta))
          let numero_serie = serial.slice(-14);
          db.Fa11.create({
            serial: serial,
            numero_parte: numero_parte,
            numero_serie: numero_serie,
          })
            .then((serialStored) => {
              if (!serialStored) {
                console.log("Error en crear el NP");
                return res.send({ code: "500", message: "Error de servidor" });
              } else {
                res.send({
                  code: "200",
                  serialStored: serialStored,
                  message: "Etiqueta correcta",
                });
              }
            })
            .catch((err) => {
              //res.status(500).send({code:"500", message:"Error de servidor",err:err})
              for (let i = 0; i < err.errors.length; i++) {
                if (err.errors[i].message == "numero_serie must be unique") {
                  db.Fa11.update(
                    {
                      repetida: true,
                    },
                    {
                      where: {
                        serial: serial,
                      },
                    }
                  )
                    .then((labelUpdate) => {
                      if (!labelUpdate) {
                        return res.send({
                          code: "400",
                          message: "Etiqueta no encontrada",
                        });
                      } else {
                        return res.send({
                          code: "400",
                          message: "Numero de serie repetido",
                        });
                      }
                    })
                    .catch((err) => {
                      console.log(err);
                      return res.send({
                        code: "500",
                        message: "Error del servidor",
                      });
                    });
                } else {
                  console.log(err.errors[i].message);
                }
              }
            });
          /*}*/
        }
      })
      .catch((err) => {
        res.send({ code: "500", message: "Error de servidor", err: err });
      });
  } else {
    res.send({code:"400",message:"La etiqueta no tiene el formato correcto"})
  }
}

//Fin the last six pieces produced
function getLastSixLabels(req,res){
        db.Fa11.count()
          .then((count) => {
            db.Fa11.findAll({
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
            return
          });
      
}

//Get production per hour
async function productionPerHour(req, res) {
  try {
    const fechainicial = moment
      .unix(req.params.fechainicial)
      .format("YYYY-MM-DD HH:mm:ss");
    const fechafinal = moment
      .unix(req.params.fechafinal)
      .format("YYYY-MM-DD HH:mm:ss");

    // Usamos await para esperar los resultados de la DB de forma limpia
    // Nota: Si no usas 'count' para nada más, podrías omitir la primera llamada
    await db.Fa11.count(); 

    const data = await db.Fa11.findAndCountAll({
      where: {
        createdAt: {
          [Op.gte]: fechainicial,
          [Op.lte]: fechafinal,
        },
      },
      distinct: true,
      col: "serial",
    });

    if (!data) {
      return res.status(404).send({ 
        message: "Datos no encontrados", 
        alert: "Error" 
      });
    }

    return res.status(200).send({ 
      data: data, 
      alert: "Success" 
    });

  } catch (err) {
    // IMPORTANTE: Siempre enviar una respuesta en caso de error
    console.error("Error en productionPerHour:", err);
    return res.status(500).send({ 
      message: "Error de servidor", 
      err: err.message, 
      alert: "Error" 
    });
  }
}


//* SMS Produccion del turno
function productionReport (req, res) { 
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
  let responseMessage=[]
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
            contentSid:"HXb454791f97e9b548a336957d567d7c9d",
            from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
            to: "whatsapp:" + telefonos[i], // Text this number,
            messagingServiceSid: process.env.serviceSid,
            contentVariables:JSON.stringify({
              1:'FA-11',
              2: String(req.body.turno),
              3: String(req.body.piezasProducidas)
            })
      })
      .then(function(message) {
        //console.log("Whatsapp:" + message.sid);
        console.log(`El mensaje a ${message.to} con sid: ${message.sid} tiene el status de: ${message.status}`)
        responseMessage.push(message);
            //console.log(responseMessage);
            if(responseMessage.length==telefonos.length){
            return res.json(responseMessage);
            }
      })
      .catch(function(error) {
        return res.json(error);
      });
  }
};

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

async function getDashboardMaster(req, res) {
  try {
    // 1. Promesa: Últimas 6 etiquetas
    const pLast6 = db.Fa11.findAll({
      limit: 6,
      order: [["createdAt", "DESC"]],
    });

    // 2. Promesas: Producción por hora (9 horas)
    let pHoras = [];
    for (let i = 0; i < 9; i++) {
      let inicioX = moment().startOf("hour").subtract(i, "hour");
      let fechainicial = inicioX.format("YYYY-MM-DD HH:mm:ss");
      let fechafinal = moment().startOf("hour").subtract(i - 1, "hour").format("YYYY-MM-DD HH:mm:ss");
      
      let prom = db.Fa11.count({
        where: { createdAt: { [Op.gte]: fechainicial, [Op.lte]: fechafinal } },
        distinct: true, col: "serial"
      }).then(count => ({
        fecha: inicioX.format("X"), // Formato Unix que usa tu Front-End
        producidas: count
      }));
      pHoras.push(prom);
    }

    // 3. Promesas: Producción por turnos (7 días)
    let pTurnos = [];
    let hFd = moment().startOf("isoweek").format("YYYY-MM-DD") + " 15:00:00";
    let hId = moment(hFd).format("YYYY-MM-DD") + " 07:00:00";
    let hFt = moment().startOf("isoweek").format("YYYY-MM-DD") + " 23:00:00";
    let hIt = moment(hFt).format("YYYY-MM-DD") + " 15:00:00";
    let hFn = moment().startOf("isoweek").format("YYYY-MM-DD") + " 07:00:00";
    let hIn = moment(hFn).subtract(1, "day").format("YYYY-MM-DD") + " 23:00:00";

    for (let i = 0; i < 7; i++) {
      let x1i = moment(moment(hId).add(i, "day").format("YYYY-MM-DD") + " 07:00:00").format("YYYY-MM-DD HH:mm:ss");
      let x1f = moment(moment(hFd).add(i, "day").format("YYYY-MM-DD") + " 15:00:00").format("YYYY-MM-DD HH:mm:ss");
      let x2i = moment(moment(hIt).add(i, "day").format("YYYY-MM-DD") + " 15:00:00").format("YYYY-MM-DD HH:mm:ss");
      let x2f = moment(moment(hFt).add(i, "day").format("YYYY-MM-DD") + " 23:00:00").format("YYYY-MM-DD HH:mm:ss");
      let x3i = moment(moment(hIn).add(i, "day").format("YYYY-MM-DD") + " 23:00:00").format("YYYY-MM-DD HH:mm:ss");
      let x3f = moment(moment(hFn).add(i, "day").format("YYYY-MM-DD") + " 07:00:00").format("YYYY-MM-DD HH:mm:ss");

      pTurnos.push(db.Fa11.count({ where: { createdAt: { [Op.gte]: x1i, [Op.lte]: x1f } }, distinct: true, col: "serial" }).then(c => ({ turno: 1, dia: i, count: c })));
      pTurnos.push(db.Fa11.count({ where: { createdAt: { [Op.gte]: x2i, [Op.lte]: x2f } }, distinct: true, col: "serial" }).then(c => ({ turno: 2, dia: i, count: c })));
      pTurnos.push(db.Fa11.count({ where: { createdAt: { [Op.gte]: x3i, [Op.lte]: x3f } }, distinct: true, col: "serial" }).then(c => ({ turno: 3, dia: i, count: c })));
    }

    // 4. Promesas: Producción por semana (10 semanas)
    let pSemanas = [];
    for (let i = 9; i >= 0; i--) {
      let fechaObj = moment().startOf("week").subtract(i, "weeks");
      let fechainicial = fechaObj.format("YYYY-MM-DD HH:mm:ss");
      let fechafinal = moment().endOf("week").subtract(i, "weeks").format("YYYY-MM-DD HH:mm:ss");

      let prom = db.Fa11.count({
        where: { createdAt: { [Op.gte]: fechainicial, [Op.lte]: fechafinal } },
        distinct: true, col: "serial"
      }).then(count => ({
        semana: fechaObj.week(),
        valor: count
      }));
      pSemanas.push(prom);
    }

    // 🚀 MAGIA SENIOR: Ejecutamos las 41 consultas simultáneamente en MySQL
    const [ultimas6, produccionHora, turnosRaw, semanasRaw] = await Promise.all([
      pLast6,
      Promise.all(pHoras),
      Promise.all(pTurnos),
      Promise.all(pSemanas)
    ]);

    // Ordenamos la data para entregársela "masticada" al Front-End
    let d1 = new Array(7).fill(0), d2 = new Array(7).fill(0), d3 = new Array(7).fill(0);
    turnosRaw.forEach(res => {
      if (res.turno === 1) d1[res.dia] = res.count;
      if (res.turno === 2) d2[res.dia] = res.count;
      if (res.turno === 3) d3[res.dia] = res.count;
    });

    let numSemana = semanasRaw.map(s => s.semana);
    let datosSemana = semanasRaw.map(s => s.valor);

    // Entregamos el "Carrito de Supermercado" lleno
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
    console.error("Error en getDashboardMaster (FA11):", error);
    res.status(500).json({ code: "500", message: "Error interno cargando dashboards" });
  }
}

module.exports={
   addSerial,
   getLastSixLabels,
   productionPerHour,
   productionReport,
   getDashboardMaster,
   

  }