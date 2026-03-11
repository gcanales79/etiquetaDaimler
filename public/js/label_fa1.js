$(document).ready(function () {
  // 1. Caché de Selectores del DOM:
  // Guardamos las referencias para no consultar el DOM en cada evento.
  const $spanLogo = $("#spanLogoResultado");
  const $msgBueno = $("#mensajeResultadoBueno");
  const $msgMalo = $("#mensajeResultadoMalo");
  const $serialInput = $("#serialEtiqueta");
  const $btnSubmit = $("#submit");
  const $btnContainer = $("#buttonResultado");
  const $tablaDe6 = $("#tablaDe6");
  const $tablaHora = $("#tablaHora");

  const TZ_DATA = "America/Monterrey|LMT CST CDT|6F.g 60 50|0121212121212121212121212121212121212121212121212121212121212121212121212121212121212121|-1UQG0 2FjC0 1nX0 i6p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 1fB0 WL0 1fB0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|41e5";
  moment.tz.add(TZ_DATA);

  // 2. Sistema de auto-refresco para Administradores
  if (typeof ES_ADMIN !== 'undefined' && ES_ADMIN) {
    let timerInactividad;
    const TIEMPO_ESPERA = 300000; // 5 minutos

    function iniciarReloj() {
      clearTimeout(timerInactividad);
      timerInactividad = setTimeout(() => {
        actualizarTodosLosDashboards();
        iniciarReloj(); 
      }, TIEMPO_ESPERA);
    }

    iniciarReloj();

    $(document).on("keyup click", function() {
      iniciarReloj(); 
    });
  }

  // 3. Inicialización
  actualizarTodosLosDashboards();

  $("#exampleModal").modal({
    show: false,
    backdrop: "static",
    keyboard: false,
  });

  // 4. Funciones Helper (DRY - Don't Repeat Yourself)
  function limpiarMensajes() {
    $spanLogo.removeClass("fa fa-ban ban fa-check-circle check");
    $msgBueno.empty();
    $msgMalo.empty();
  }

  // ── FUNCIÓN MAESTRA QUE REEMPLAZA MÚLTIPLES PETICIONES ──
  // IMPORTANTE: Asegúrate de crear la ruta /api/fa1/dashboard-master en tu backend
  function actualizarTodosLosDashboards() {
    $.get("/api/fa1/dashboard-master")
      .then((respuesta) => {
        const { data } = respuesta;

        // Renderizar Últimas 6
        $tablaDe6.empty();
        data.ultimas6.forEach(item => {
          const resultadoIcono = item.repetida ? "fa fa-ban ban" : "fa fa-check-circle check";
          const fechaCreacion = moment(item.createdAt).tz("America/Monterrey").format("DD/MM/YYYY hh:mm:ss a");
          $tablaDe6.prepend(`
            <tr>
              <th scope='row'>${item.numero_serie}</th>
              <td><span class="${resultadoIcono}"></span></td>
              <td>${fechaCreacion}</td>
            </tr>
          `);
        });

        // Renderizar Producción por hora
        const produccion = data.produccionHora.sort((a, b) => Number(a.fecha) - Number(b.fecha));
        $tablaHora.empty();
        produccion.forEach(prod => {
          let hora = moment.unix(prod.fecha).format("h:mm a");
          let horafinal = moment.unix(prod.fecha).add(1, "hour").format("h:mm a");
          $tablaHora.append(`<tr><th scope='row'>${hora} a ${horafinal}</th><td>${prod.producidas}</td></tr>`);
        });

        // Renderizar Gráfica de Turnos
        graficaProduccion(data.turnos.d1, data.turnos.d2, data.turnos.d3);

        // Renderizar Gráfica de Semanas
        let mejorSemana = Math.max(...data.semanas.datosSemana);
        $("#mejorSemana").text(mejorSemana);
        $("#semanaActual").text(data.semanas.datosSemana[data.semanas.datosSemana.length - 1]);
        graficaProduccionsemana(data.semanas.datosSemana, data.semanas.numSemana);

      })
      .fail((error) => {
        console.error("Error al cargar el Dashboard Maestro de FA1", error);
      });
  }

  // 5. Manejo de Eventos Principal
  $btnSubmit.on("click", function (event) {
    event.preventDefault();
    limpiarMensajes();
    
    var nuevoSerial = $serialInput.val().trim();
    localStorage.setItem("ultimaEtiqueta", nuevoSerial);
    var usuario = document.cookie.replace(/(?:(?:^|.*;\s*)usuario\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    localStorage.setItem("usuario", usuario);

    $.post("/api/fa1/serial", { serial: nuevoSerial }).then((data) => {
      switch (data.code) {
        case "200":
          $spanLogo.addClass("fa fa-check-circle check");
          $msgBueno.text(data.message);
          setTimeout(() => {
            $serialInput.val("");
            limpiarMensajes();
          }, 2000);
          break;

        case "400":
          $spanLogo.addClass("fa fa-ban ban");
          $msgMalo.text(data.message);
          const $newButton = $("<button>", {
            class: "btn btn-primary",
            type: "submit",
            id: "cambioDeetiqueta",
            text: "Contención de Pieza"
          });
          $btnContainer.append($newButton);
          $btnSubmit.prop("disabled", true);
          break;

        case "500":
          $spanLogo.addClass("fa fa-ban ban");
          $msgMalo.text(data.message);
          setTimeout(() => {
            $serialInput.val("");
            limpiarMensajes();
          }, 3000);
          break;
      }
    }).always(() => {
      // Reemplazamos las 4 llamadas individuales por la función maestra
      actualizarTodosLosDashboards();
    });
  });

  $(document).on("click", "#cambioDeetiqueta", function (event) {
    event.preventDefault();
    $serialInput.val("");
    limpiarMensajes();
    $btnContainer.empty();
    $btnSubmit.prop("disabled", false);
    actualizarTodosLosDashboards();
  });

  // ── FUNCIONES DE CHART.JS (Sin modificaciones lógicas respecto a fa11) ──

  function turnoActual() {
    let horaActual = moment().hour();
    if (horaActual >= 7 && horaActual <= 15) return "Dia";
    if (horaActual > 15 && horaActual <= 23) return "Tarde";
    return "Noche";
  }

  function diaActual() { return moment().day(); }

  function chartColors() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
      gridColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      tickColor: dark ? "#94a3b8" : "#64748b",
      legendColor: dark ? "#cbd5e1" : "#475569",
      t1bg: dark ? "rgba(56,189,248,0.25)" : "rgba(14,165,233,0.15)",
      t1border: dark ? "rgba(56,189,248,1)" : "rgba(14,165,233,1)",
      t2bg: dark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)",
      t2border: dark ? "rgba(99,102,241,1)" : "rgba(99,102,241,1)",
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
      if (turno === "Dia") $("#turnoActual").text(datosTurno1[dia !== 0 ? dia - 1 : dia + 6]);
      if (turno === "Tarde") $("#turnoActual").text(datosTurno2[dia !== 0 ? dia - 1 : dia + 6]);
      if (turno === "Noche") $("#turnoActual").text(datosTurno3[dia !== 0 ? dia - 1 : dia + 6]);

      const c = chartColors();
      var ctx = $("#myChart");
      myChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
          datasets: [
            { label: "Turno 1", data: datosTurno1, backgroundColor: c.t1bg, borderColor: c.t1border, borderWidth: 1.5 },
            { label: "Turno 2", data: datosTurno2, backgroundColor: c.t2bg, borderColor: c.t2border, borderWidth: 1.5 },
            { label: "Turno 3", data: datosTurno3, backgroundColor: c.t3bg, borderColor: c.t3border, borderWidth: 1.5 },
          ],
        },
        options: chartOptions(function () { $("#loadingTurno").hide(); }),
      });
    }
  }

  var myChart2;
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
        options: chartOptions(function () { $("#loadingSemana").hide(); }),
      });
    }
  }
});