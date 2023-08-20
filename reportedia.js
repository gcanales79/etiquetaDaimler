const moment = require("moment-timezone");
const axios = require("axios");

/**Si es horario de verna */
if (
  moment()
    .tz("America/Monterrey")
    .isDST()
) {
  console.log("Es horario de verano");
  var horainicial = moment().format("YYYY-MM-DD") + " 12:00:00";
  var horainicialx = moment(horainicial).format("X");
  var horafinal = moment().format("YYYY-MM-DD") + " 20:00:00";
  var horafinalx = moment(horafinal).format("X");
  var dia = moment(horafinal).format("dddd");
  console.log(dia);
  if (dia != "S") {
    reporte();
    //console.log("Hello World")
  }
} else {
  console.log("No es horario de verano");
  var horainicial = moment().format("YYYY-MM-DD") + " 13:00:00";
  var horainicialx = moment(horainicial).format("X");
  var horafinal = moment().format("YYYY-MM-DD") + " 21:00:00";
  var horafinalx = moment(horafinal).format("X");
  var dia = moment(horafinal).format("dddd");
  //console.log(dia)
}

function reporte() {
  console.log(
    "https://shielded-stream-29921.herokuapp.com/produccionhora/" +
      horainicialx +
      "/" +
      horafinalx
  );
  axios
    .get(
      "https://shielded-stream-29921.herokuapp.com/produccionhora/" +
        horainicialx +
        "/" +
        horafinalx
    )
    .then((datos) => {
      const { data } = datos;
      //console.log(data.data.count);
      if(parseInt(data.data.count)!=0){
      axios
        .post("https://shielded-stream-29921.herokuapp.com/reporte", {
          piezasProducidas: data.data.count,
          turno: "dia",
        })
        .then(function(response) {
          console.log(response.data);
        })
        .catch(function(err) {
          console.log(err);
        });
      }else{
        console.log("Produccion fue cero")
      }
    })
    .catch(function(err) {
      console.log(err);
    });
}
