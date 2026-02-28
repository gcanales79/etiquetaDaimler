$(document).ready(function() {
  // 1. Configuramos el selector de banderas
  const phoneInputField = document.querySelector("#telefonoUser");
  const phoneInput = window.intlTelInput(phoneInputField, {
    initialCountry: "mx",
    preferredCountries: ["mx", "us", "ca"],
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/20.3.0/js/utils.min.js",
  });
  getUsers(1);

  function getUsers(pageNum) {
    $.get("/get-all-users", {}).then((usersList) => {
      const { code, data, message } = usersList;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        paginationUser(pageNum, data);
      }
    });
  }

  // List all the users
  function paginationUser(pageNumber, dataSource) {
    $("#pagination-containerUsers").empty();
    if ($("#pagination-containerUsers").length) {
      $("#pagination-containerUsers").pagination({
        dataSource: dataSource,
        pageSize: 5,
        pageNumber: pageNumber,
        callback: function(data, pagination) {
          $("#usersList").empty();
          for (let i = 0; i < data.length; i++) {
            newItem = $("<tr>");

            // Email
            emailUser = $("<td>").addClass("align-middle");
            emailUser.text(data[i].email);

            // Teléfono
            phoneUser = $("<td>").addClass("align-middle");
            if (!data[i].telefono || data[i].telefono === "null") {
              phoneUser.text("—");
            } else {
              let formattedPhone = data[i].telefono.replace(
                /(\+\d{2})(\d{2})(\d{4})(\d{4})/,
                "$1 $2 $3 $4",
              );
              phoneUser.text(formattedPhone);
            }

            // Rol — pill con color según tipo
            roleUser = $("<td>").addClass("align-middle");
            let roleText = data[i].role;
            let roleClass = "role-pill--" + roleText;
            let rolePill = $("<span>").addClass("role-pill " + roleClass).text(roleText);
            roleUser.append(rolePill);

            // Alertas — badges con nuevo estilo
            let alertasUser = $("<td>").addClass("align-middle");
            if (!data[i].alertas || data[i].alertas.trim() === "") {
              alertasUser.text("—");
            } else {
              let arregloAlertas = data[i].alertas.split(",");
              arregloAlertas.forEach((alerta) => {
                let textoFormateado = alerta.trim().toUpperCase();
                if (textoFormateado === "DAIMLER") textoFormateado = "Daimler";
                // ── CAMBIO: usamos la nueva clase alerta-badge ──
                let etiqueta = $("<span>")
                  .addClass("alerta-badge")
                  .text(textoFormateado);
                alertasUser.append(etiqueta);
              });
            }

            // Acciones — botones con nuevas clases
            actionUser = $("<td>").addClass("align-middle text-center");

            // ── CAMBIO: btn-action en lugar de btn btn-primary ──
            buttonEdit = $("<button>");
            buttonEdit.attr("type", "button");
            buttonEdit.attr("class", "btn-action btn-action--edit editUser");
            buttonEdit.attr("value", data[i].id);
            buttonEdit.attr("page", pagination.pageNumber);
            buttonEdit.attr("title", "Editar usuario");
            editIcon = $("<svg>").attr({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", width: "15", height: "15" });
            editIcon.html('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>');
            buttonEdit.append(editIcon);

            // ── CAMBIO: btn-action--delete en lugar de btn btn-danger ──
            buttonDelete = $("<button>");
            buttonDelete.attr("type", "button");
            buttonDelete.attr("class", "btn-action btn-action--delete deleteUser");
            buttonDelete.attr("value", data[i].id);
            buttonDelete.attr("page", pagination.pageNumber);
            buttonDelete.attr("title", "Eliminar usuario");
            deleteIcon = $("<svg>").attr({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", width: "15", height: "15" });
            deleteIcon.html('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>');
            buttonDelete.append(deleteIcon);

            actionUser.append(buttonEdit);
            actionUser.append(buttonDelete);

            newItem.append(emailUser, phoneUser, roleUser, alertasUser, actionUser);
            $("#usersList").append(newItem);
          }
        },
      });
    }
  }

  // Open Modal to Edit User
  $(document).on("click", ".editUser", function(event) {
    event.preventDefault();
    let pageNum = $(this).attr("page");
    let userId = $(this).attr("value");

    $.get(`/get-user/${userId}`, () => {}).then((data) => {
      const { user, code } = data;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        $("#userForm").show();
        $("#userDataSection").show();
        $("#otpSection").hide();
        $("#otpCode").val("");

        $("#passwordUser").prop("required", false);
        $("#repeatPasswordUser").prop("required", false);

        $("#modalUserLongTitle").text("Editar Usuario");
        $("#createUser").text("Actualizar Usuario");
        $("#createUser").attr("userId", userId);
        $("#createUser").attr("page", pageNum);
        $("#modalUserCenter").attr("type", "Update");
        $("#emailUser").val(user.email);
        $("#roleUser").val(user.role);
        phoneInput.setNumber(user.telefono || "");
        $("#telefonoUser").attr("data-original", user.telefono || "");

        $(".alerta-checkbox").prop("checked", false);
        if (user.alertas && user.alertas.trim() !== "") {
          let arregloAlertas = user.alertas.split(",");
          arregloAlertas.forEach(alerta => {
            let alertaLimpia = alerta.trim().toLowerCase();
            $(`.alerta-checkbox[value="${alertaLimpia}"]`).prop("checked", true);
          });
        }
        $("#modalUserCenter").modal("show");
      }
    });
  });

  // Open Modal to Delete User
  $(document).on("click", ".deleteUser", function(event) {
    event.preventDefault();
    let userId = $(this).attr("value");
    let pageNum = $(this).attr("page");
    $.get(`/get-user/${userId}`, () => {}).then((data) => {
      const { code, message, user } = data;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        buttonBorrarUser(userId, pageNum);
        $("#adminModalCenter").modal("show");
        clearUserForm();
        $("#adminModalLongTitle").text("Eliminar Usuario");
        $("#modalBodyAlert").css("display", "inline-block");
        $("#modalBodyAlert").text(
          `¿Seguro que quieres eliminar al usuario: ${user.email}?`,
        );
      }
    });
  });

  // Crear botones del modal de borrar — con nuevas clases
  function buttonBorrarUser(userId, pageNum) {
    $("#modalFooter").empty();

    let buttonClose = $("<button>");
    buttonClose.attr("class", "btn btn-secondary");
    buttonClose.attr("data-dismiss", "modal");
    buttonClose.text("Cancelar");
    $("#modalFooter").append(buttonClose);

    let buttonBorrar = $("<button>");
    buttonBorrar.attr("class", "btn btn-danger");
    buttonBorrar.attr("id", "buttonBorrarUser");
    buttonBorrar.text("Eliminar");
    buttonBorrar.attr("value", userId);
    buttonBorrar.attr("page", pageNum);
    $("#modalFooter").append(buttonBorrar);
  }

  function clearUserForm() {
    $("#userForm").css("display", "none");
  }

  // Confirmar Borrar User
  $(document).on("click", "#buttonBorrarUser", function(event) {
    event.preventDefault();
    let userId = $(this).attr("value");
    let pageNum = $(this).attr("page");
    $.ajax({
      url: `/delete-user/${userId}`,
      type: "DELETE",
      contentType: "application/json",
      success: function(data) {
        const { code, message } = data;
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          $("#adminModalCenter").modal("hide");
          notificationToast(code, message);
          getUsers(pageNum);
        }
      },
    });
  });

  // Open Modal to Add User
  $("#addUser").on("click", function(event) {
    event.preventDefault();
    $("#userForm")[0].reset();

    $("#userForm").show();
    $("#userDataSection").show();
    $("#otpSection").hide();
    $("#otpCode").val("");

    $("#passwordUser").prop("required", true);
    $("#repeatPasswordUser").prop("required", true);

    $("#telefonoUser").attr("data-original", "");
    phoneInput.setNumber("");

    $("#modalUserLongTitle").text("Nuevo Usuario");
    $("#createUser").text("Añadir Usuario");
    $("#modalUserCenter").attr("type", "Create");
    $("#modalUserCenter").modal("show");
  });

  // Add or Edit User
  $("#userForm").submit(function(event) {
    event.preventDefault();

    let email = $("#emailUser").val().trim().toLowerCase();
    let password = $("#passwordUser").val().trim();
    let repeatPassword = $("#repeatPasswordUser").val().trim();
    let role = $("#roleUser").val();
    let telefono = phoneInput.getNumber(intlTelInputUtils.numberFormat.E164);

    let alertasArray = [];
    $(".alerta-checkbox:checked").each(function() {
      alertasArray.push($(this).val());
    });
    let alertas = alertasArray.join(",");

    if (!phoneInput.isValidNumber()) {
      notificationToast("500", "El número de teléfono no es válido. Revisa el código de país y los dígitos.");
      return false;
    }
    if (password !== repeatPassword) {
      return notificationToast("500", "Las contraseñas no coinciden");
    }

    let buttonType = $("#modalUserCenter").attr("type");
    let pageNum = $(this).find("#createUser").attr("page");
    let userId = $(this).find("#createUser").attr("userId");

    if (buttonType === "Create") {
      if (email.length === 0 || password.length === 0 || repeatPassword.length === 0 || telefono.length === 0) {
        return notificationToast("500", "Todos los datos son obligatorios");
      }
    } else if (buttonType === "Update") {
      if (email.length === 0 || telefono.length === 0) {
        return notificationToast("500", "El email y teléfono no pueden estar vacíos");
      }
      if (password.length > 0 || repeatPassword.length > 0) {
        if (password !== repeatPassword) {
          return notificationToast("500", "Las contraseñas no coinciden");
        }
      }
    }

    if (buttonType == "Create") {
      let isOtpVisible = $("#otpSection").is(":visible");
      if (!isOtpVisible) {
        $("#createUser").prop("disabled", true).text("Enviando...");
        $.post("/api/send-otp", { telefono: telefono }).then((data) => {
          $("#createUser").prop("disabled", false);
          if (data.code === "200") {
            notificationToast("200", data.message);
            $("#userDataSection").hide();
            $("#otpSection").show();
            $("#createUser").text("Verificar Código y Guardar");
          } else {
            notificationToast("500", data.message);
          }
        });
      } else {
        let otpCode = $("#otpCode").val().trim();
        if (otpCode.length === 0) {
          return notificationToast("500", "Debes ingresar el código de verificación");
        }
        $.post("/add-user", { email, password, telefono, role, otpCode, alertas })
          .then((data) => {
            const { code, message } = data;
            if (code === "200") {
              $("#modalUserCenter").modal("hide");
              $("#userForm")[0].reset();
              notificationToast(code, message);
              getUsers();
            }
          })
          .fail((err) => {
            let errorData = err.responseJSON;
            let mensajeError = errorData ? errorData.message : "Error al verificar el código OTP";
            notificationToast("500", mensajeError);
          });
      }
    } else if (buttonType == "Update") {
      let originalPhone = $("#telefonoUser").attr("data-original");
      let phoneChanged = telefono !== originalPhone;

      let changes = { email, password, telefono, role, alertas };
      if (password.length > 0) changes.password = password;

      if (phoneChanged) {
        let isOtpVisible = $("#otpSection").is(":visible");
        if (!isOtpVisible) {
          $("#createUser").prop("disabled", true).text("Enviando...");
          $.post("/api/send-otp", { telefono })
            .then((data) => {
              $("#createUser").prop("disabled", false);
              if (data.code === "200") {
                notificationToast("200", "Código enviado al nuevo número");
                $("#userDataSection").hide();
                $("#otpSection").show();
                $("#createUser").text("Verificar y Actualizar");
              }
            })
            .fail((err) => {
              $("#createUser").prop("disabled", false);
              notificationToast("500", err.responseJSON ? err.responseJSON.message : "Error");
            });
          return;
        } else {
          let otpCode = $("#otpCode").val().trim();
          if (otpCode.length === 0) return notificationToast("500", "Ingresa el código");
          changes.otpCode = otpCode;
        }
      }

      $.ajax({
        url: `/update-user/${userId}`,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify(changes),
        success: function(data) {
          const { code, message } = data;
          if (code !== "200") {
            notificationToast(code, message);
          } else {
            $("#modalUserCenter").modal("hide");
            $("#userForm")[0].reset();
            notificationToast(code, message);
            getUsers(pageNum);
          }
        },
      }).fail((err) => {
        notificationToast("500", err.responseJSON ? err.responseJSON.message : "Error al actualizar");
      });
    }
  });

  // Pop up notifications
  function notificationToast(code, message) {
    if (code != "200") {
      toastr.error(message);
    } else {
      toastr.success(message);
    }
  }
});