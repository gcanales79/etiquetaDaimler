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
  
    // ── Colores dinámicos según el tema activo ──
    // Chart.js v2 no tiene soporte nativo de dark mode, así que leemos
    // el atributo data-theme del <html> cada vez que se construye la gráfica.
    function chartColors() {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      return {
        gridColor:  dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        tickColor:  dark ? "#94a3b8" : "#64748b",
        legendColor: dark ? "#cbd5e1" : "#475569",
        // Paleta de colores consistente con el design system
        t1bg: dark ? "rgba(56,189,248,0.25)"  : "rgba(14,165,233,0.15)",
        t1border: dark ? "rgba(56,189,248,1)"  : "rgba(14,165,233,1)",
        t2bg: dark ? "rgba(99,102,241,0.25)"  : "rgba(99,102,241,0.15)",
        t2border: dark ? "rgba(99,102,241,1)"  : "rgba(99,102,241,1)",
        t3bg: dark ? "rgba(251,113,133,0.25)" : "rgba(244,63,94,0.15)",
        t3border: dark ? "rgba(251,113,133,1)" : "rgba(244,63,94,1)",
      };
    }

    function chartOptions(onProgress) {
      const c = chartColors();
      const fs = window.innerWidth < 480 ? 9 : 11;
      return {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          yAxes: [{
            ticks: { beginAtZero: true, fontColor: c.tickColor, fontSize: fs, maxTicksLimit: 6, padding: 4 },
            gridLines: { color: c.gridColor, zeroLineColor: c.gridColor, drawBorder: false },
          }],
          xAxes: [{
            ticks: { fontColor: c.tickColor, fontSize: fs, maxRotation: 35, minRotation: 0, padding: 4 },
            gridLines: { display: false },
          }],
        },
        legend: { labels: { fontColor: c.legendColor, fontSize: fs, boxWidth: 14, padding: 12 } },
        layout: { padding: { left: 4, right: 8, top: 4, bottom: 0 } },
        animation: { duration: 2000, onProgress: onProgress },
      };
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

        const c = chartColors();
        var ctx = $("#myChart");
        myChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"],
            datasets: [
              { label: "Turno 1", data: datosTurno1, backgroundColor: c.t1bg, borderColor: c.t1border, borderWidth: 1.5 },
              { label: "Turno 2", data: datosTurno2, backgroundColor: c.t2bg, borderColor: c.t2border, borderWidth: 1.5 },
              { label: "Turno 3", data: datosTurno3, backgroundColor: c.t3bg, borderColor: c.t3border, borderWidth: 1.5 },
            ],
          },
          options: chartOptions(function() { $("#loadingTurno").hide(); }),
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
        const c = chartColors();
        var ctx2 = $("#myChart2");
        myChart2 = new Chart(ctx2, {
          type: "bar",
          data: {
            labels: numSemana,
            datasets: [{
              label: "Producción por Semana",
              data: datosSemana,
              backgroundColor: c.t1bg,
              borderColor: c.t1border,
              borderWidth: 1.5,
            }],
          },
          options: chartOptions(function() { $("#loadingSemana").hide(); }),
        });
      }
    }
  });