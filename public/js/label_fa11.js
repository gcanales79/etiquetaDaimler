$(document).ready(function () {
  // 1. Caché de Selectores del DOM: 
  // Guardamos las referencias a los elementos que usamos mucho.
  // Es una buena práctica usar '$' al inicio de la variable para saber que es un objeto de jQuery.
  const $spanLogo = $("#spanLogoResultado");
  const $msgBueno = $("#mensajeResultadoBueno");
  const $msgMalo = $("#mensajeResultadoMalo");
  const $serialInput = $("#serialEtiqueta");
  const $btnSubmit = $("#submit");
  const $btnContainer = $("#buttonResultado");
  const $tablaDe6 = $("#tablaDe6");
  const $tablaHora = $("#tablaHora");

  const TZ_DATA = "America/Monterrey|LMT CST CDT|6F.g 60 50|0121212121212121212121212121212121212121212121212121212121212121212121212121212121212121|-1UQG0 2FjC0 1nX0 i6p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 1fB0 WL0 1fB0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|41e5";
  moment.tz.add(TZ_DATA); // Inyectamos la zona horaria antes de usarla


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




  // Al cargar la página, inicializamos los datos
  actualizarTodosLosDashboards();


  $("#exampleModal").modal({
    show: false,
    backdrop: "static",
    keyboard: false,
  });

  // 2. Extraemos el código repetitivo en pequeñas funciones útiles
  function limpiarMensajes() {
    $spanLogo.removeClass("fa fa-ban ban fa-check-circle check");
    $msgBueno.empty();
    $msgMalo.empty();
  }

  // ── FUNCIÓN MAESTRA QUE REEMPLAZA LAS OTRAS 4 PETICIONES ──
  function actualizarTodosLosDashboards() {
    //console.log("Actualizando todos los dashboards con datos frescos...");
    $.get("/api/fa11/dashboard-master")
      .then((respuesta) => {
        const { data } = respuesta;

        // 1. Renderizar Últimas 6
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

        // 2. Renderizar Producción por hora
       // Explicación: Number() asegura que comparemos matemáticamente. 
        // a - b garantiza un orden Ascendente estricto (de más antiguo a más reciente).
        const produccion = data.produccionHora.sort((a, b) => Number(a.fecha) - Number(b.fecha));
        
        $tablaHora.empty();
        
        produccion.forEach(prod => {
          let hora = moment.unix(prod.fecha).format("h:mm a");
          let horafinal = moment.unix(prod.fecha).add(1, "hour").format("h:mm a");
          
          // Explicación: Cambiamos prepend() por append() para respetar el orden visual natural
          // insertando los renglones uno debajo del otro.
          $tablaHora.append(`<tr><th scope='row'>${hora} a ${horafinal}</th><td>${prod.producidas}</td></tr>`);
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
        console.error("Error al cargar el Dashboard Maestro", error);
      });
  }

  $btnSubmit.on("click", function (event) {
    event.preventDefault();
    limpiarMensajes();
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

          // Creación limpia del botón
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
      // Principio DRY: Esta actualización se ejecuta SIEMPRE, 
      // sin importar si fue 200, 400 o 500, ¡o incluso si falló el servidor!
      actualizarTodosLosDashboards();
    });
  });

  $(document).on("click", "#cambioDeetiqueta", function (event) {
    event.preventDefault();
    $serialInput.val("");
    limpiarMensajes();
    $btnContainer.empty();
    $btnSubmit.prop("disabled", false);
    getLast6();
  });



  function tablaProduccion(produccion) {
    produccion.sort(function (a, b) {
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
      gridColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      tickColor: dark ? "#94a3b8" : "#64748b",
      legendColor: dark ? "#cbd5e1" : "#475569",
      // Paleta de colores consistente con el design system
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