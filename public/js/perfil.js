$(document).ready(function() {
  // --- INICIALIZAR intlTelInput ---
  const phoneInputField = document.querySelector("#perfilTelefono");
  const phoneInputPlugin = window.intlTelInput(phoneInputField, {
    preferredCountries: ["mx", "us"], // Países favoritos hasta arriba
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js", // Necesario para el formato correcto
  });

  // 1. MARCAR LOS CHECKBOXES AL CARGAR LA PÁGINA
  // Leemos el valor del input oculto que Handlebars llenó
  let alertasGuardadas = $("#misAlertasGuardadas").val();

  if (alertasGuardadas && alertasGuardadas.trim() !== "") {
    let arregloAlertas = alertasGuardadas.split(",");
    arregloAlertas.forEach((alerta) => {
      let alertaLimpia = alerta.trim().toLowerCase();
      $(`.alerta-checkbox[value="${alertaLimpia}"]`).prop("checked", true);
    });
  }

  // 2. GUARDAR ALERTAS
  $("#btnGuardarAlertas").on("click", function() {
    let alertasArray = [];
    $(".alerta-checkbox:checked").each(function() {
      alertasArray.push($(this).val());
    });
    let alertasTexto = alertasArray.join(",");

    const btn = $(this);
    btn.prop("disabled", true).text("Guardando...");

    $.ajax({
      url: "/api/perfil/alertas",
      type: "PUT",
      data: { alertas: alertasTexto },
    })
      .then(function(res) {
        $("#mensajeAlertas").html(
          `<span class="text-success fw-bold">✓ ${res.message}</span>`,
        );
        btn.prop("disabled", false).text("Guardar Preferencias");
        setTimeout(() => $("#mensajeAlertas").empty(), 3000);
      })
      .catch(function(err) {
        $("#mensajeAlertas").html(
          `<span class="text-danger">✖ Hubo un error.</span>`,
        );
        btn.prop("disabled", false).text("Guardar Preferencias");
      });
  });

  // 3. CAMBIAR CONTRASEÑA
  $("#btnCambiarPass").on("click", function() {
    let pass1 = $("#perfilNuevaPass")
      .val()
      .trim();
    let pass2 = $("#perfilConfirmarPass")
      .val()
      .trim();

    if (pass1 === "" || pass2 === "") {
      return $("#mensajePass").html(
        `<span class="text-danger">Ingresa la contraseña en ambos campos.</span>`,
      );
    }
    if (pass1 !== pass2) {
      return $("#mensajePass").html(
        `<span class="text-danger">Las contraseñas no coinciden.</span>`,
      );
    }

    const btn = $(this);
    btn.prop("disabled", true).text("Actualizando...");

    $.ajax({
      url: "/api/perfil/password",
      type: "PUT",
      data: { newPassword: pass1 },
    })
      .then(function(res) {
        $("#mensajePass").html(
          `<span class="text-success fw-bold">✓ ${res.message}</span>`,
        );
        $("#perfilNuevaPass, #perfilConfirmarPass").val(""); // Limpiar campos
        btn.prop("disabled", false).text("Actualizar Contraseña");
        setTimeout(() => $("#mensajePass").empty(), 3000);
      })
      .catch(function(err) {
        $("#mensajePass").html(
          `<span class="text-danger">✖ Hubo un error.</span>`,
        );
        btn.prop("disabled", false).text("Actualizar Contraseña");
      });
  });

  // --- LÓGICA DE CAMBIO DE TELÉFONO ---

  // 1. Solicitar el código
  $("#btnSolicitarCambioTel").on("click", function() {
    // Usamos el plugin para obtener el número con el código de país
    let nuevoTelefono = phoneInputPlugin.getNumber();
    // Nota: Si usas el plugin intlTelInput, usa su método para obtener el número con formato E164
    if (!phoneInputPlugin.isValidNumber()) {
      // Validamos que sea un teléfono real
      return $("#mensajeTelefono").html(
        `<span class="text-danger">Ingresa un número de teléfono válido.</span>`,
      );
    }

    const btn = $(this);
    btn.prop("disabled", true).text("Enviando...");

    $.post("/api/perfil/solicitar-telefono", { nuevoTelefono: nuevoTelefono })
      .then(function(res) {
        $("#mensajeTelefono").html(
          `<span class="text-primary fw-bold">✓ ${res.message}</span>`,
        );
        $("#seccionVerificarTel").removeClass("d-none"); // Mostramos el cuadro del código
        $("#perfilTelefono").prop("disabled", true); // Bloqueamos el input temporalmente
        btn.text("Cambiar Número"); // Restauramos texto original
      })
      .catch(function(err) {
        let errorMsg = err.responseJSON
          ? err.responseJSON.error
          : "Error al enviar código.";
        $("#mensajeTelefono").html(
          `<span class="text-danger">✖ ${errorMsg}</span>`,
        );
        btn.prop("disabled", false).text("Cambiar Número");
      });
  });

  // 2. Verificar el código y guardar
  $("#btnVerificarTel").on("click", function() {
    // Volvemos a usar el plugin para mandar el mismo número formateado
    let nuevoTelefono = phoneInputPlugin.getNumber();
    let otpCode = $("#perfilOtpTelefono")
      .val()
      .trim();

    if (otpCode.length !== 6) {
      return $("#mensajeTelefono").html(
        `<span class="text-danger">El código debe ser de 6 dígitos.</span>`,
      );
    }

    const btn = $(this);
    btn.prop("disabled", true).text("Verificando...");

    $.post("/api/perfil/verificar-telefono", {
      nuevoTelefono: nuevoTelefono,
      otpCode: otpCode,
    })
      .then(function(res) {
        $("#mensajeTelefono").html(
          `<span class="text-success fw-bold">✓ ${res.message}</span>`,
        );
        $("#seccionVerificarTel").addClass("d-none"); // Ocultamos el cuadro del código
        $("#btnSolicitarCambioTel").prop("disabled", false);
        $("#perfilTelefono").prop("disabled", false);
        $("#perfilOtpTelefono").val(""); // Limpiamos el código
        btn.prop("disabled", false).text("Verificar y Guardar");

        // Borrar mensaje de éxito después de unos segundos
        setTimeout(() => $("#mensajeTelefono").empty(), 4000);
      })
      .catch(function(err) {
        let errorMsg = err.responseJSON
          ? err.responseJSON.error
          : "Código incorrecto.";
        $("#mensajeTelefono").html(
          `<span class="text-danger">✖ ${errorMsg}</span>`,
        );
        btn.prop("disabled", false).text("Verificar y Guardar");
      });
  });

  // 3. Botón de Cancelar
  $("#btnCancelarCambioTel").on("click", function() {
    $("#seccionVerificarTel").addClass("d-none");
    $("#perfilTelefono").prop("disabled", false);
    $("#perfilOtpTelefono").val("");
    $("#btnSolicitarCambioTel").prop("disabled", false);
    $("#mensajeTelefono").empty();
  });
});
