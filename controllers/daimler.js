var db = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const moment = require("moment-timezone");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

// ── NUEVO ENDPOINT MAESTRO PARA DAIMLER ──
// Agrega esto en tu archivo de rutas o en tu controlador de Daimler
async function getDaimlerDashboardMaster(req, res) {
  try {
    const TZ = "America/Monterrey";
    
    // Reglas de negocio únicas de Daimler para contar la producción real
    const baseWhere = {
      etiqueta_remplazada: null,
      registro_auto: 1 
    };

    // 1. Promesa: Últimas 6 etiquetas (solo de producción)
    const pLast6 = db.Daimler.findAll({
      where: { uso_etiqueta: "Produccion" },
      limit: 6,
      order: [["createdAt", "DESC"]],
    });

    // 2. Promesas: Producción por hora
    let pHoras = [];
    for (let i = 0; i < 9; i++) {
      let inicioMty = moment().tz(TZ).startOf("hour").subtract(i, "hour");
      let finMty = moment().tz(TZ).startOf("hour").subtract(i - 1, "hour");
      
      let prom = db.Daimler.count({
        where: { 
          ...baseWhere, // Agregamos las reglas de negocio
          createdAt: { [Op.gte]: inicioMty.toDate(), [Op.lt]: finMty.toDate() } 
        },
        distinct: true, col: "serial"
      }).then(count => ({
        fecha: inicioMty.format("X"),
        producidas: count
      }));
      pHoras.push(prom);
    }

    // 3. Promesas: Producción por turnos
    let pTurnos = [];
    let inicioSemanaMty = moment().tz(TZ).startOf("isoweek");

    for (let i = 0; i < 7; i++) {
      let diaActualStr = inicioSemanaMty.clone().add(i, "days").format("YYYY-MM-DD");
      let diaAnteriorStr = inicioSemanaMty.clone().add(i - 1, "days").format("YYYY-MM-DD");

      let t1Inicio = moment.tz(`${diaActualStr} 07:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();
      let t1Fin    = moment.tz(`${diaActualStr} 15:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();
      let t2Inicio = moment.tz(`${diaActualStr} 15:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();
      let t2Fin    = moment.tz(`${diaActualStr} 23:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();
      let t3Inicio = moment.tz(`${diaAnteriorStr} 23:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();
      let t3Fin    = moment.tz(`${diaActualStr} 07:00:00`, "YYYY-MM-DD HH:mm:ss", TZ).toDate();

      pTurnos.push(db.Daimler.count({ where: { ...baseWhere, createdAt: { [Op.gte]: t1Inicio, [Op.lt]: t1Fin } }, distinct: true, col: "serial" }).then(c => ({ turno: 1, dia: i, count: c })));
      pTurnos.push(db.Daimler.count({ where: { ...baseWhere, createdAt: { [Op.gte]: t2Inicio, [Op.lt]: t2Fin } }, distinct: true, col: "serial" }).then(c => ({ turno: 2, dia: i, count: c })));
      pTurnos.push(db.Daimler.count({ where: { ...baseWhere, createdAt: { [Op.gte]: t3Inicio, [Op.lt]: t3Fin } }, distinct: true, col: "serial" }).then(c => ({ turno: 3, dia: i, count: c })));
    }

    // 4. Promesas: Producción por semana (Ajustado a Domingo 23:00)
    let pSemanas = [];
    for (let i = 9; i >= 0; i--) {
      let inicioSemana = moment().tz(TZ).startOf("isoweek").subtract(i, "weeks").subtract(1, "days").hour(23).minute(0).second(0).millisecond(0);
      let finSemana = inicioSemana.clone().add(7, "days");
      let numeroDeSemana = inicioSemana.clone().add(1, "days").week(); // Usamos Lunes para el número

      let prom = db.Daimler.count({
        where: { 
          ...baseWhere, 
          createdAt: { [Op.gte]: inicioSemana.toDate(), [Op.lt]: finSemana.toDate() } 
        },
        distinct: true, col: "serial"
      }).then(count => ({
        semana: numeroDeSemana,
        valor: count
      }));
      pSemanas.push(prom);
    }

    // Ejecutamos todo
    const [ultimas6, produccionHora, turnosRaw, semanasRaw] = await Promise.all([
      pLast6, Promise.all(pHoras), Promise.all(pTurnos), Promise.all(pSemanas)
    ]);

    // Acomodamos arreglos
    let d1 = new Array(7).fill(0), d2 = new Array(7).fill(0), d3 = new Array(7).fill(0);
    turnosRaw.forEach(res => {
      if (res.turno === 1) d1[res.dia] = res.count;
      if (res.turno === 2) d2[res.dia] = res.count;
      if (res.turno === 3) d3[res.dia] = res.count;
    });

    let numSemana = semanasRaw.map(s => s.semana);
    let datosSemana = semanasRaw.map(s => s.valor);

    res.status(200).json({
      code: "200",
      data: { ultimas6, produccionHora, turnos: { d1, d2, d3 }, semanas: { numSemana, datosSemana } }
    });

  } catch (error) {
    console.error("Error en getDaimlerDashboardMaster:", error);
    res.status(500).json({ code: "500", message: "Error interno" });
  }
}

module.exports = {
  getDaimlerDashboardMaster
};