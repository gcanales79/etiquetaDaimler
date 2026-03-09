$(document).ready(function () {
  // Caché de selectores
  const $spanLogo = $("#spanLogoResultado");
  const $msgBueno = $("#mensajeResultadoBueno");
  const $msgMalo = $("#mensajeResultadoMalo");
  const $serialInput = $("#serialEtiqueta");
  const $btnSubmit = $("#submit");
  const $btnContainer = $("#buttonResultado");
  const $resultadoContenedor = $("#Resultado");
  const $tablaDe6 = $("#tablaDe6");
  const $tablaHora = $("#tablaHora");

  // Configuración de Moment Timezone
  const TZ_DATA = "America/Monterrey|LMT CST CDT|6F.g 60 50|0121212121212121212121212121212121212121212121212121212121212121212121212121212121212121|-1UQG0 2FjC0 1nX0 i6p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 1fB0 WL0 1fB0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|41e5";
  moment.tz.add(TZ_DATA);

  // Solo configuramos el temporizador si la variable ES_ADMIN es verdadera
    if (typeof ES_ADMIN !== 'undefined' && ES_ADMIN) {
        
        let timerInactividad;
        const TIEMPO_ESPERA = 300000; // 5 minuto

        function iniciarReloj() {
            clearTimeout(timerInactividad);
            timerInactividad = setTimeout(() => {
                //console.log("Admin inactivo: Actualizando datos...");
                actualizarTodosLosDashboards();
                iniciarReloj(); // Reiniciamos para la siguiente hora
            }, TIEMPO_ESPERA);
        }

        // Iniciamos el proceso
        iniciarReloj();

        // Si el admin empieza a escribir en el buscador o en el serial,
        // pausamos el refresco para no interrumpir su trabajo.
        $(document).on("keyup click", function() {
            iniciarReloj(); 
        });

        //console.log("🚀 Sistema de auto-refresco activado para Administrador.");
    } else {
        //console.log("🔒 Modo Operador: Refresco automático deshabilitado.");
    }

  // Inicialización
  actualizarDashboards();

  $("#exampleModal").modal({
    show: false,
    backdrop: "static",
    keyboard: false,
  });

  // ── FUNCIONES DE AYUDA ──
  function limpiarMensajes() {
    $spanLogo.removeClass("fa fa-ban ban fa-check-circle check");
    $msgBueno.empty();
    $msgMalo.empty();
    $resultadoContenedor.find(".comentario").remove();
  }

  function revisarNumerodeParte(nuevoSerial) {
    let ultimaEtiqueta = localStorage.getItem("ultimaEtiqueta");
    var numeroDepartePasado = ultimaEtiqueta ? ultimaEtiqueta.slice(0, 10) : null;
    let numeroDeparteNuevo = nuevoSerial.slice(0, 10);
    if (numeroDepartePasado && numeroDepartePasado !== numeroDeparteNuevo) {
      $("#exampleModal").modal("show");
    }
  }

  // ── FUNCIÓN MAESTRA DEL DASHBOARD ──
  function actualizarDashboards() {
    $.get("/api/daimler/dashboard-master") // <-- Asegúrate de que esta ruta coincida con tu backend
      .then((respuesta) => {
        const { data } = respuesta;

        // 1. Renderizar Últimas 6 (OJO: Daimler usa item.serial)
        $tablaDe6.empty();
        data.ultimas6.forEach(item => {
          const resultadoIcono = item.repetida ? "fa fa-ban ban" : "fa fa-check-circle check";
          const fechaCreacion = moment(item.createdAt).tz("America/Monterrey").format("DD/MM/YYYY hh:mm:ss a");
          $tablaDe6.prepend(`
            <tr>
              <th scope='row'>${item.serial}</th>
              <td><span class="${resultadoIcono}"></span></td>
              <td>${fechaCreacion}</td>
            </tr>
          `);
        });

        // 2. Renderizar Producción por hora
        const produccion = data.produccionHora.sort((a, b) => b.fecha > a.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
        $tablaHora.empty();
        produccion.forEach(prod => {
          let hora = moment.unix(prod.fecha).format("h:mm a");
          let horafinal = moment.unix(prod.fecha).add(1, "hour").format("h:mm a");
          $tablaHora.prepend(`<tr><th scope='row'>${hora} a ${horafinal}</th><td>${prod.producidas}</td></tr>`);
        });

        // 3. Renderizar Gráfica de Turnos
        graficaProduccion(data.turnos.d1, data.turnos.d2, data.turnos.d3);

        // 4. Renderizar Gráfica de Semanas
        let mejorSemana = Math.max(...data.semanas.datosSemana);
        $("#mejorSemana").text(mejorSemana);
        $("#semanaActual").text(data.semanas.datosSemana[data.semanas.datosSemana.length - 1]);
        graficaProduccionsemana(data.semanas.datosSemana, data.semanas.numSemana);
      })
      .fail((error) => {
        console.error("Error al cargar el Dashboard Maestro de Daimler", error);
      });
  }

  // ── Submit serial ──
  // Usamos el nuevo endpoint /api/daimler/serial que hace TODO en el servidor:
  // busca si existe, marca repetida, crea registro y notifica por WhatsApp.
  // Así evitamos la race condition del GET+POST anterior que causaba duplicados.
  $("#submit").on("click", function (event) {
    event.preventDefault();


    // Deshabilitar botón inmediatamente para evitar doble click / scanner rápido
    $btnSubmit.prop("disabled", true);
    limpiarMensajes();

    var nuevoSerial = $("#serialEtiqueta")
      .val()
      .trim();
    var primNumeros = nuevoSerial.substring(0, 6);

    // ← TEMPORAL: quita esto después de confirmar
    //console.log("Serial recibido:", JSON.stringify(nuevoSerial));
    //console.log("Longitud:", nuevoSerial.length);
    //console.log("Primeros 6:", nuevoSerial.substring(0, 6));

    // Valida número de parte contra la última etiqueta escaneada
    revisarNumerodeParte(nuevoSerial);

    localStorage.setItem("ultimaEtiqueta", nuevoSerial);
    var usuario = document.cookie.replace(
      /(?:(?:^|.*;\s*)usuario\s*\=\s*([^;]*).*$)|^.*$/,
      "$1",
    );
    localStorage.setItem("usuario", usuario);

    // Validación local: 22 dígitos y prefijo correcto
    if (nuevoSerial.length !== 22 || primNumeros !== "247490") {
      $("<div>")
        .text("La etiqueta debe ser de 22 dígitos o tiene el inicio incorrecto")
        .attr("class", "comentario")
        .appendTo($resultadoContenedor);
      $btnSubmit.prop("disabled", false);
      return;
    }

    // Un solo POST al servidor — él decide si es nuevo o repetido
    $.post("/api/daimler/serial", { serial: nuevoSerial })
      .then((data) => {
        switch (data.code) {
          case "200":
            $spanLogo.addClass("fa fa-check-circle check");
            $msgBueno.text(data.message);
            setTimeout(() => {
              $serialInput.val("");
              limpiarMensajes();
              $btnSubmit.prop("disabled", false);
            }, 2000);
            break;

          case "400":
            $spanLogo.addClass("fa fa-ban ban");
            $msgMalo.text(data.message);
            var $newButton = $("<button>", {
              class: "btn btn-primary",
              type: "submit",
              id: "cambioDeetiqueta",
              text: "Pieza Segregada"
            });
            $btnContainer.append($newButton);
            // Submit sigue deshabilitado
            break;

          case "500":
            $msgMalo.text(data.message);
            $spanLogo.addClass("fa fa-ban ban");
            setTimeout(() => {
              $serialInput.val("");
              limpiarMensajes();
              $btnSubmit.prop("disabled", false);
            }, 3000);
            break;
        }
        // Actualizar dashboard solo si hay conexión exitosa
        actualizarDashboards();
      })
      .fail(() => {
        $msgMalo.text("Error de conexión. Intenta de nuevo.");
        $spanLogo.addClass("fa fa-ban ban");
        $btnSubmit.prop("disabled", false);
      });
  });

  // Al confirmar segregación de pieza repetida
  $(document).on("click", "#cambioDeetiqueta", function (event) {
    event.preventDefault();
    $serialInput.val("");
    limpiarMensajes();
    $btnContainer.empty();
    $btnSubmit.prop("disabled", false);

    // Aquí es suficiente con llamar a actualizarDashboards(), 
    // pero si solo quieres las últimas 6, puedes dejar que esta acción repinte todo por seguridad.
    actualizarDashboards();
  });

  // ── Compara número de parte (primeros 10 chars) con última etiqueta ──
  function revisarNumerodeParte(nuevoSerial) {
    let ultimaEtiqueta = localStorage.getItem("ultimaEtiqueta");
    var numeroDepartePasado = ultimaEtiqueta
      ? ultimaEtiqueta.slice(0, 10)
      : null;
    let numeroDeparteNuevo = nuevoSerial.slice(0, 10);
    if (numeroDepartePasado && numeroDepartePasado !== numeroDeparteNuevo) {
      $("#exampleModal").modal("show");
    }
  }


 

 

  function tablaProduccion(produccion) {
    produccion.sort((a, b) =>
      b.fecha > a.fecha ? -1 : a.fecha > b.fecha ? 1 : 0,
    );
    $("#tablaHora").empty();
    for (let i = 0; i < produccion.length; i++) {
      let hora = moment.unix(produccion[i].fecha).format("h:mm a");
      let horafinal = moment
        .unix(produccion[i].fecha)
        .add(1, "hour")
        .format("h:mm a");
      $("#tablaHora").prepend(
        "<tr><th scope='row'>" +
        hora +
        " a " +
        horafinal +
        "</th><td>" +
        produccion[i].producidas +
        "</td></tr>",
      );
    }
  }

  function turnoActual() {
    let h = moment().hour();
    if (h >= 7 && h <= 15) return "Dia";
    if (h > 15 && h <= 23) return "Tarde";
    return "Noche";
  }
  function diaActual() {
    return moment().day();
  }

  // ══════════════════════════════════════════════
  // CHART.JS — DARK MODE HELPERS
  // ══════════════════════════════════════════════
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
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
              fontColor: c.tickColor,
              fontSize: fs,
              maxTicksLimit: 6,
              padding: 4,
            },
            gridLines: {
              color: c.gridColor,
              zeroLineColor: c.gridColor,
              drawBorder: false,
            },
          },
        ],
        xAxes: [
          {
            ticks: {
              fontColor: c.tickColor,
              fontSize: fs,
              maxRotation: 35,
              minRotation: 0,
              padding: 4,
            },
            gridLines: { display: false },
          },
        ],
      },
      legend: {
        labels: {
          fontColor: c.legendColor,
          fontSize: fs,
          boxWidth: 14,
          padding: 12,
        },
      },
      layout: { padding: { left: 4, right: 8, top: 4, bottom: 0 } },
      animation: { duration: 2000, onProgress: onProgress },
    };
  }

  // ── Gráfica por turno ──
  var myChart;
  function graficaProduccion(datosTurno1, datosTurno2, datosTurno3) {
    if (myChart) myChart.destroy();
    if (
      datosTurno1.length === 7 &&
      datosTurno2.length === 7 &&
      datosTurno3.length === 7
    ) {
      let mejorTurno = Math.max(
        ...datosTurno1.concat(datosTurno2, datosTurno3),
      );
      $("#mejorTurno").text(mejorTurno);
      let turno = turnoActual(),
        dia = diaActual(),
        idx = dia !== 0 ? dia - 1 : dia + 6;
      if (turno === "Dia") $("#turnoActual").text(datosTurno1[idx]);
      if (turno === "Tarde") $("#turnoActual").text(datosTurno2[idx]);
      if (turno === "Noche") $("#turnoActual").text(datosTurno3[idx]);
      const c = chartColors();
      myChart = new Chart($("#myChart"), {
        type: "bar",
        data: {
          labels: [
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
            "Domingo",
          ],
          datasets: [
            {
              label: "Turno 1",
              data: datosTurno1,
              backgroundColor: c.t1bg,
              borderColor: c.t1border,
              borderWidth: 1.5,
            },
            {
              label: "Turno 2",
              data: datosTurno2,
              backgroundColor: c.t2bg,
              borderColor: c.t2border,
              borderWidth: 1.5,
            },
            {
              label: "Turno 3",
              data: datosTurno3,
              backgroundColor: c.t3bg,
              borderColor: c.t3border,
              borderWidth: 1.5,
            },
          ],
        },
        options: chartOptions(function () {
          $("#loadingTurno").hide();
        }),
      });
    }
  }

 

  // ── Gráfica por semana ──
  var myChart2;


  function graficaProduccionsemana(datosSemana, numSemana) {
    if (myChart2) myChart2.destroy();
    if (datosSemana.length === 10) {
      const c = chartColors();
      myChart2 = new Chart($("#myChart2"), {
        type: "bar",
        data: {
          labels: numSemana,
          datasets: [
            {
              label: "Producción por Semana",
              data: datosSemana,
              backgroundColor: c.t1bg,
              borderColor: c.t1border,
              borderWidth: 1.5,
            },
          ],
        },
        options: chartOptions(function () {
          $("#loadingSemana").hide();
        }),
      });
    }
  }
});
