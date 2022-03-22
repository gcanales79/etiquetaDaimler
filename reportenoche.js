const moment = require('moment-timezone');
const axios = require("axios");

if (moment().tz("America/Monterrey").isDST()) {
  console.log("Es horario de verano")
  var horainicial = moment().add(0, "day").format("YYYY-MM-DD") + " 04:00:00"
  var horainicialx = moment(horainicial).format("X")
  var horafinal = moment().add(0, "day").format("YYYY-MM-DD") + " 12:00:00"
  var horafinalx = moment(horafinal).format("X")
  var dia = moment(horafinal).format("dddd")
  if (dia != "S") {
    reporte();
  }
}
else {
  console.log("No es horario de verano")
  var horainicial = moment().add(0, "day").format("YYYY-MM-DD") + " 05:00:00"
  var horainicialx = moment(horainicial).format("X")
  var horafinal = moment().add(0, "day").format("YYYY-MM-DD") + " 13:00:00"
  var horafinalx = moment(horafinal).format("X")
  var dia = moment(horafinal).format("dddd")

}



function reporte() {
  console.log("https://shielded-stream-29921.herokuapp.com/produccionhora/" + horainicialx + "/" + horafinalx)
  axios.get("https://shielded-stream-29921.herokuapp.com/produccionhora/" + horainicialx + "/" + horafinalx)
    .then(data => {
      console.log(data.data.count)
      axios.post("https://shielded-stream-29921.herokuapp.com/reporte", {
        piezasProducidas: data.data.count,
        turno: "noche"
      })
        .then(function (response) {
          console.log(response.data)
        })
        .catch(function (err) {
          console.log(err)
        })
    }).catch(function (err) {
      console.log(err)
    })

}