$(document).ready(function() {

  getLast6();

  $("#exampleModal").modal({ show: false, backdrop: "static", keyboard: false });

  // ── Submit ──
  $("#submit").on("click", function(event) {
    event.preventDefault();
    $("#submit").prop("disabled", true);

    var nuevoSerial = $("#serialEtiqueta").val().trim();
    revisarNumerodeParte(nuevoSerial);
    localStorage.setItem("ultimaEtiqueta", nuevoSerial);

    var newSerial = { serial: nuevoSerial };

    if (nuevoSerial.length !== 22) {
      mostrarResultado("warn",
        "Serial Incorrecto",
        "La etiqueta debe contener exactamente 22 dígitos.",
        null
      );
      $("#serialEtiqueta").val("");
      $("#submit").prop("disabled", false);
      return;
    }

    $.get("/api/all/" + nuevoSerial, function(data) {

      if (data.length > 1) {
        duplicatedLabel(newSerial);
        return;
      }

      if (data.length === 1) {
        var item = data[0];
        var esRepetida = item.repetida && (item.etiqueta_remplazada == null || item.etiqueta_remplazada === "");
        if (esRepetida) {
          duplicatedLabel(newSerial);
        } else {
          etiquetaCorrecta(newSerial);
        }
        return;
      }

      if (data.length === 0) {
        etiquetaFaltante(newSerial);
      }

    }).fail(function() {
      mostrarResultado("warn", "Error de Conexión", "No se pudo conectar al servidor. Intenta de nuevo.", null);
      $("#submit").prop("disabled", false);
    });
  });

  // Permitir Enter en el input
  $("#serialEtiqueta").on("keydown", function(e) {
    if (e.key === "Enter") { e.preventDefault(); $("#submit").click(); }
  });

  // ── Funciones de resultado ──

  function duplicatedLabel(newSerial) {
    mostrarResultado("error",
      "Etiqueta Duplicada",
      "Esta etiqueta ya fue escaneada. Contener la pieza para inspección de Calidad.",
      `<button class="gp-segregar-btn" id="Segregada">Pieza Segregada</button>`
    );
    $("#serialEtiqueta").val("");
    $.post("/repeatgp12", newSerial);
    $.ajax({ url: "/api/gp12/" + newSerial.serial, type: "PUT", success: function() { getLast6(); } });
  }

  function etiquetaFaltante(newSerial) {
    mostrarResultado("warn",
      "No Encontrada",
      "La etiqueta no está en la base de datos. Avisar a Calidad para cambiarla.",
      `<button class="gp-segregar-btn" id="Segregada" style="background:#ca8a04;">Pieza Segregada</button>`
    );
    $("#serialEtiqueta").val("");
    $.post("/notfound", newSerial);
  }

  function etiquetaCorrecta(newSerial) {
    mostrarResultado("ok",
      "Etiqueta Correcta",
      "El serial fue verificado exitosamente en GP-12.",
      null
    );
    $.ajax({ url: "/api/gp12/" + newSerial.serial, type: "PUT", success: function() { getLast6(); } });
    setTimeout(function() {
      $("#serialEtiqueta").val("");
      $("#submit").prop("disabled", false);
      resetResultado();
    }, 4000);
  }

  // ── Render del panel de resultado ──
  function mostrarResultado(tipo, titulo, mensaje, extra) {
    const icons = {
      ok:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="32" height="32"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      warn:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="32" height="32"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    };
    $("#gp-result-body").html(`
      <div class="gp-state">
        <div class="gp-state__icon gp-state__icon--${tipo}">${icons[tipo]}</div>
        <div class="gp-state__title gp-state__title--${tipo}">${titulo}</div>
        <div class="gp-state__msg">${mensaje}</div>
        ${extra || ""}
      </div>
    `);
  }

  function resetResultado() {
    $("#gp-result-body").html(`
      <div class="gp-idle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="52" height="52" opacity=".25">
          <rect x="2" y="4" width="3" height="16" rx="1"/>
          <rect x="7" y="4" width="2" height="16" rx="1"/>
          <rect x="11" y="4" width="4" height="16" rx="1"/>
          <rect x="17" y="4" width="2" height="16" rx="1"/>
          <rect x="21" y="4" width="1" height="16" rx="1"/>
        </svg>
        <p style="color:var(--slate-400); font-size:.85rem; margin-top:12px;">
          Escanea una etiqueta para ver el resultado
        </p>
      </div>
    `);
  }

  // ── Últimas 6 etiquetas GP-12 ──
  const TZ_DATA = "America/Monterrey|LMT CST CDT|6F.g 60 50|0121212121212121212121212121212121212121212121212121212121212121212121212121212121212121|-1UQG0 2FjC0 1nX0 i6p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 1fB0 WL0 1fB0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|41e5";

  function getLast6() {
    $("#tablaDe6").empty();
    $.getJSON("/api/all/tabla/gp12seisetiquetas", function(data) {
      moment.tz.add(TZ_DATA);
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        var badge = item.repetida
          ? `<span class="bs-badge bs-badge--si">Repetida</span>`
          : `<span class="bs-badge bs-badge--no">OK</span>`;
        var fecha = item.fecha_gp12
          ? moment(item.fecha_gp12).tz("America/Monterrey").format("DD/MM/YYYY hh:mm:ss a")
          : "—";
        $("#tablaDe6").prepend(
          `<tr>
            <th scope="row">${item.serial}</th>
            <td style="text-align:center">${badge}</td>
            <td class="text-nowrap">${fecha}</td>
          </tr>`
        );
      }
      $("input[type='checkbox']").not(".modal input, form input").remove();
    });
  }

  // ── Pieza Segregada ──
  $(document).on("click", "#Segregada", function(event) {
    event.preventDefault();
    $("#serialEtiqueta").val("");
    $("#submit").prop("disabled", false);
    resetResultado();
    getLast6();
  });

  // ── Revisar número de parte ──
  function revisarNumerodeParte(nuevoSerial) {
    let ultimaEtiqueta = localStorage.getItem("ultimaEtiqueta");
    var pasado = ultimaEtiqueta ? ultimaEtiqueta.slice(0, 10) : null;
    let nuevo  = nuevoSerial.slice(0, 10);
    if (pasado && pasado !== nuevo) {
      $("#exampleModal").modal("show");
    }
  }

});