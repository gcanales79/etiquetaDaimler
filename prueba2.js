const moment = require('moment-timezone');
const axios = require("axios");


if (moment().tz("America/Monterrey").isDST()) {
    console.log("Es horario de verano")
    var horainicial = moment().subtract(1, "day").format("YYYY-MM-DD") + " 20:00:00"
    var horainicialx = moment(horainicial).format("X")
    var horafinal = moment().add(0, "day").format("YYYY-MM-DD") + " 04:00:00"
    var horafinalx = moment(horafinal).format("X")
    var dia = moment(horafinal).format("dddd")

}
else {
    console.log("No es horario de verano")
    var horainicial = moment().subtract(1, "day").format("YYYY-MM-DD") + " 21:00:00"
    var horainicialx = moment(horainicial).format("X")
    var horafinal = moment().add(0, "day").format("YYYY-MM-DD") + " 05:00:00"
    var horafinalx = moment(horafinal).format("X")
    var dia = moment(horafinal).format("dddd")
    if (dia != "M") {
        reporte();
    }

}



function reporte() {
    console.log("https://shielded-stream-29921.herokuapp.com/fa1/produccionhora/" + horainicialx + "/" + horafinalx)
    axios.get("https://shielded-stream-29921.herokuapp.com/fa1/produccionhora/" + horainicialx + "/" + horafinalx)
        .then(datos => {
            const {data}=datos;
            console.log(data.data.count)
            
        }).catch(function (err) {
            console.log(err)
        })

}