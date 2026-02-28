$(document).ready(function() {
    getLast6();
    produccionPorhora();
    produccionTurnos();
    produccionPorsemana();
  
    $("#exampleModal").modal({
      show: false,
      backdrop: "static",
      keyboard: false,
    });
  
    $("#submit").on("click", function(event) {
      event.preventDefault();
      $("#spanLogoResultado").removeClass("fa fa-ban ban");
      $("#spanLogoResultado").removeClass("fa fa-check-circle check");
      $("#mensajeResultadoBueno").empty();
      $("#mensajeResultadoMalo").empty();
      var nuevoSerial = $("#serialEtiqueta").val().trim();
      localStorage.setItem("ultimaEtiqueta", nuevoSerial);
      var usuario = document.cookie.replace(
        /(?:(?:^|.*;\s*)usuario\s*\=\s*([^;]*).*$)|^.*$/,
        "$1"
      );
      localStorage.setItem("usuario", usuario);
  
      $.post("/api/fa11/serial", { serial: nuevoSerial }).then((data) => {
        switch (data.code) {
          case "200":
            $("#spanLogoResultado").addClass("fa fa-check-circle check");
            $("#mensajeResultadoBueno").text(data.message);
            setTimeout(function() {
              $("#serialEtiqueta").val("");
              $("#spanLogoResultado").removeClass("fa fa-ban ban");
              $("#spanLogoResultado").removeClass("fa fa-check-circle check");
              $("#mensajeResultadoBueno").empty();
              $("#mensajeResultadoMalo").empty();
            }, 2000);
            getLast6();
            produccionPorhora();
            produccionTurnos();
            produccionPorsemana();
            break;
  
          case "400":
            $("#spanLogoResultado").addClass("fa fa-ban ban");
            $("#mensajeResultadoMalo").text(data.message);
            var newButton = $("<button>");
            newButton.attr("class", "btn btn-primary");
            newButton.attr("type", "submit");
            newButton.attr("id", "cambioDeetiqueta");
            newButton.text("Contención de Pieza");
            $("#buttonResultado").append(newButton);
            $("#submit").prop("disabled", true);
            getLast6();
            produccionPorhora();
            produccionTurnos();
            produccionPorsemana();
            break;
  
          case "500":
            $("#mensajeResultadoMalo").text(data.message);
            $("#spanLogoResultado").addClass("fa fa-ban ban");
            setTimeout(function() {
              $("#serialEtiqueta").val("");
              $("#spanLogoResultado").removeClass("fa fa-ban ban");
              $("#spanLogoResultado").removeClass("fa fa-check-circle check");
              $("#mensajeResultadoBueno").empty();
              $("#mensajeResultadoMalo").empty();
            }, 3000);
            getLast6();
            produccionPorhora();
            produccionTurnos();
            produccionPorsemana();
            break;
        }
      });
    });
  
    $(document).on("click", "#cambioDeetiqueta", function(event) {
      event.preventDefault();
      $("#serialEtiqueta").val("");
      $("#spanLogoResultado").removeClass("fa fa-ban ban");
      $("#spanLogoResultado").removeClass("fa fa-check-circle check");
      $("#mensajeResultadoBueno").empty();
      $("#mensajeResultadoMalo").empty();
      $("#buttonResultado").empty();
      $("#submit").prop("disabled", false);
      getLast6();
    });
  
    // ── Últimas 6 etiquetas ──
    function getLast6() {
      $("#tablaDe6").empty();
      $.get("/api/fa11/all/tabla/seisetiquetas", function(datos) {
        const { data } = datos;
        for (var i = 0; i < data.length; i++) {
          if (data[i].repetida) {
            var resultadoIcono = "'fa fa-ban ban'";
          } else {
            var resultadoIcono = "'fa fa-check-circle check'";
          }
          moment.tz.add(
            "America/Monterrey|LMT CST CDT|6F.g 60 50|0121212121212121212121212121212121212121212121212121212121212121212121212121212121212121|-1UQG0 2FjC0 1nX0 i6p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 1fB0 WL0 1fB0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|41e5"
          );
          var fechaCreacion = moment(data[i].createdAt)
            .tz("America/Monterrey")
            .format("DD/MM/YYYY hh:mm:ss a");
          $("#tablaDe6").prepend(
            "<tr><th scope='row'>" +
              data[i].numero_serie +
              "</th><td><span class=" +
              resultadoIcono +
              "></span></td><td>" +
              fechaCreacion +
              "</td></tr>"
          );
        }
        // Eliminar checkboxes sueltos que DataTables/Bootstrap inyectan
        $("input[type='checkbox']").not(".modal input, form input").remove();
      });
    }
  
    function produccionPorhora() {
      let produccion = [];
      for (let i = 0; i < 9; i++) {
        let hora = moment().startOf("hour").subtract(i, "hour").format("h:mm a");
        let fechainicial = moment().startOf("hour").subtract(i, "hour").format("X");
        let fechafinal = moment().startOf("hour").subtract(i - 1, "hour").format("X");
        $.get("/fa11/produccionhora/" + fechainicial + "/" + fechafinal, function(datos) {
          const { data } = datos;
          produccion.push({ fecha: fechainicial, producidas: data.count });
          tablaProduccion(produccion);
        });
      }
    }
  
    function tablaProduccion(produccion) {
      produccion.sort(function(a, b) {
        if (a.fecha > b.fecha) return -1;
        if (b.fecha > a.fecha) return 1;
        return 0;
      });
      $("#tablaHora").empty();
      for (let i = 0; i < produccion.length; i++) {
        let hora = moment.unix(produccion[i].fecha).format("h:mm a");
        let horafinal = moment.unix(produccion[i].fecha).add(1, "hour").format("h:mm a");
        $("#tablaHora").prepend(
          "<tr><th scope='row'>" + hora + " a " + horafinal + "</th><td>" + produccion[i].producidas + "</td>"
        );
      }
    }
  
    function turnoActual() {
      let horaActual = moment().hour();
      if (horaActual >= 7 && horaActual <= 15) return "Dia";
      if (horaActual > 15 && horaActual <= 23) return "Tarde";
      return "Noche";
    }
  
    function diaActual() {
      return moment().day();
    }
  
    var myChart;
  
    function graficaProduccion(datosTurno1, datosTurno2, datosTurno3) {
      if (myChart) myChart.destroy();
      if (datosTurno1.length === 7 && datosTurno2.length === 7 && datosTurno3.length === 7) {
        let maximo = datosTurno1.concat(datosTurno2, datosTurno3);
        let mejorTurno = Math.max(...maximo);
        $("#mejorTurno").text(mejorTurno);
        let turno = turnoActual();
        let dia = diaActual();
        if (turno === "Dia")   $("#turnoActual").text(datosTurno1[dia !== 0 ? dia - 1 : dia + 6]);
        if (turno === "Tarde") $("#turnoActual").text(datosTurno2[dia !== 0 ? dia - 1 : dia + 6]);
        if (turno === "Noche") $("#turnoActual").text(datosTurno3[dia !== 0 ? dia - 1 : dia + 6]);
  
        var ctx = $("#myChart");
        myChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado","Domingo"],
            datasets: [
              { label: "Turno 1", data: datosTurno1, backgroundColor: "rgba(75,192,192,0.2)", borderColor: "rgba(75,192,192,1)", borderWidth: 1 },
              { label: "Turno 2", data: datosTurno2, backgroundColor: "rgba(54,162,235,0.2)", borderColor: "rgba(54,162,235,1)", borderWidth: 1 },
              { label: "Turno 3", data: datosTurno3, backgroundColor: "rgba(255,99,132,0.2)",  borderColor: "rgba(255,99,132,1)",  borderWidth: 1 },
            ],
          },
          options: {
            scales: { yAxes: [{ ticks: { beginAtZero: true } }] },
            animation: { duration: 2000, onProgress: function() { $("#loadingTurno").hide(); } },
          },
        });
      }
    }
  
    function produccionTurnos() {
      let datosTurno1 = [], datosTurno2 = [], datosTurno3 = [];
      let horaFinaldia     = moment().startOf("isoweek").format("YYYY-MM-DD") + " 15:00:00";
      let horaInicialdia   = moment(horaFinaldia).format("YYYY-MM-DD") + " 07:00:00";
      let horafinaltarde   = moment().startOf("isoweek").format("YYYY-MM-DD") + " 23:00:00";
      let horainicialtarde = moment(horafinaltarde).format("YYYY-MM-DD") + " 15:00:00";
      let horafinalnoche   = moment().startOf("isoweek").format("YYYY-MM-DD") + " 07:00:00";
      let horainicialnoche = moment(horafinalnoche).subtract(1, "day").format("YYYY-MM-DD") + " 23:00:00";
  
      for (let i = 0; i < 7; i++) {
        let fechaInicalDiax  = moment(moment(horaInicialdia).add(i,"day").format("YYYY-MM-DD") + " 07:00:00").format("X");
        let fechaFinaldiax   = moment(moment(horaFinaldia).add(i,"day").format("YYYY-MM-DD") + " 15:00:00").format("X");
        let fechaInicaltardex = moment(moment(horainicialtarde).add(i,"day").format("YYYY-MM-DD") + " 15:00:00").format("X");
        let fechaFinaltardex  = moment(moment(horafinaltarde).add(i,"day").format("YYYY-MM-DD") + " 23:00:00").format("X");
        let fechaInicalnochex = moment(moment(horainicialnoche).add(i,"day").format("YYYY-MM-DD") + " 23:00:00").format("X");
        let fechaFinalnochex  = moment(moment(horafinalnoche).add(i,"day").format("YYYY-MM-DD") + " 07:00:00").format("X");
  
        $.when(
          $.get("/fa11/produccionhora/" + fechaInicalDiax + "/" + fechaFinaldiax,   function(d) { datosTurno1.splice(i, 0, d.data.count); }),
          $.get("/fa11/produccionhora/" + fechaInicaltardex + "/" + fechaFinaltardex, function(d) { datosTurno2.splice(i, 0, d.data.count); }),
          $.get("/fa11/produccionhora/" + fechaInicalnochex + "/" + fechaFinalnochex, function(d) { datosTurno3.splice(i, 0, d.data.count); })
        ).then(function() { graficaProduccion(datosTurno1, datosTurno2, datosTurno3); });
      }
    }
  
    var myChart2;
  
    function produccionPorsemana() {
      let datosSemana = [], numSemana = [], datos = [];
      for (let i = 9; i >= 0; i--) {
        let fechainicial = moment().startOf("week").subtract(i, "weeks").format("X");
        let fecha        = moment().startOf("week").subtract(i, "weeks");
        let fechafinal   = moment().endOf("week").subtract(i, "weeks").format("X");
        numSemana.splice(9 - i, 0, moment(fecha).week());
        $.when(
          $.get("/fa11/produccionhora/" + fechainicial + "/" + fechafinal, function(info) {
            datos.push({ semana: moment(fecha).week(), valor: info.data.count });
          })
        ).then(function() {
          if (datos.length === 10) {
            for (let i = 0; i < numSemana.length; i++)
              for (let j = 0; j < datos.length; j++)
                if (numSemana[i] === datos[j].semana) datosSemana.push(datos[j].valor);
            let mejorSemana = Math.max(...datosSemana);
            $("#mejorSemana").text(mejorSemana);
            $("#semanaActual").text(datosSemana[datosSemana.length - 1]);
            graficaProduccionsemana(datosSemana, numSemana);
          }
        });
      }
    }
  
    function graficaProduccionsemana(datosSemana, numSemana) {
      if (myChart2) myChart2.destroy();
      if (datosSemana.length === 10) {
        var ctx2 = $("#myChart2");
        myChart2 = new Chart(ctx2, {
          type: "bar",
          data: {
            labels: numSemana,
            datasets: [{
              label: "Production per Week",
              data: datosSemana,
              backgroundColor: "rgba(75,192,192,0.2)",
              borderColor: "rgba(75,192,192,1)",
              borderWidth: 1,
            }],
          },
          options: {
            scales: { yAxes: [{ ticks: { beginAtZero: true } }] },
            animation: { duration: 2000, onProgress: function() { $("#loadingSemana").hide(); } },
          },
        });
      }
    }
  });