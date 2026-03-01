$(document).ready(function() {
  getPartNumbers(1);

  function getPartNumbers(pageNum) {
    $.get("/get-all-part-numbers", {}).then((partNumberList) => {
      const { code, data, message } = partNumberList;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        paginationPartNumber(pageNum, data);
      }
    });
  }

  // Lista todos los números de parte con paginación
  function paginationPartNumber(pageNumber, dataSource) {
    $("#pagination-containerPartNumber").empty();
    if ($("#pagination-containerPartNumber").length) {
      $("#pagination-containerPartNumber").pagination({
        dataSource: dataSource,
        pageSize: 10,
        pageNumber: pageNumber,
        callback: function(data, pagination) {
          $("#partNumberList").empty();
          for (let i = 0; i < data.length; i++) {
            newItem = $("<tr>");

            partNumber = $("<td>").addClass("align-middle");
            partNumber.text(data[i].numero_parte);

            lineNumber = $("<td>").addClass("align-middle");
            lineNumber.text(data[i].linea);

            actionPartNumber = $("<td>").addClass("align-middle text-center");

            // Botones como template strings para que el SVG renderice correctamente
            buttonEdit = $(
              `<button type="button" class="btn-action btn-action--edit editPartNumber"
                value="${data[i].id}" page="${pagination.pageNumber}" title="Editar número de parte">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>`
            );

            buttonDelete = $(
              `<button type="button" class="btn-action btn-action--delete deletePartNumber"
                value="${data[i].id}" page="${pagination.pageNumber}" title="Eliminar número de parte">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>`
            );

            actionPartNumber.append(buttonEdit);
            actionPartNumber.append(buttonDelete);

            newItem.append(partNumber);
            newItem.append(lineNumber);
            newItem.append(actionPartNumber);
            $("#partNumberList").append(newItem);
          }
        },
      });
    }
  }

  // Función reutilizable para cargar el select de líneas
  function loadLines(callback) {
    $("#lineName").empty();
    $.get("/get-all-lines", () => {}).then((response) => {
      const defaultOption = $("<option>").text("Escoge una línea").val("").attr("selected", "selected");
      $("#lineName").append(defaultOption);
      for (let i = 0; i < response.data.length; i++) {
        const opt = $("<option>")
          .text(response.data[i].linea)
          .val(response.data[i].linea);
        $("#lineName").append(opt);
      }
      if (callback) callback();
    });
  }

  // Abrir modal Editar
  $(document).on("click", ".editPartNumber", function(event) {
    event.preventDefault();
    let pageNum = $(this).attr("page");
    let partNumberId = $(this).attr("value");

    loadLines(function() {
      $.get(`/get-part-number/${partNumberId}`, () => {}).then((data) => {
        const { partNumber, code } = data;
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          $("#modalPartNumberLongTitle").text("Editar Número de Parte");
          $("#createPartNumber").text("Actualizar Número de Parte");
          $("#createPartNumber").attr("partNumberId", partNumberId);
          $("#createPartNumber").attr("page", pageNum);
          $("#modalPartNumberCenter").attr("type", "Update");
          $("#partNumber").val(partNumber.numero_parte);
          $("#lineName").val(partNumber.linea);
          $("#modalPartNumberCenter").modal("show");
        }
      });
    });
  });

  // Abrir modal Eliminar
  $(document).on("click", ".deletePartNumber", function(event) {
    event.preventDefault();
    let partNumberId = $(this).attr("value");
    let pageNum = $(this).attr("page");
    $.get(`/get-part-number/${partNumberId}`, () => {}).then((data) => {
      const { code, message, partNumber } = data;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        buttonBorrarPartNumber(partNumberId, pageNum);
        $("#adminModalCenter").modal("show");
        clearUserForm();
        $("#adminModalLongTitle").text("Eliminar Número de Parte");
        $("#modalBodyAlert").css("display", "inline-block");
        $("#modalBodyAlert").text(`¿Seguro que quieres eliminar el número de parte: ${partNumber.numero_parte}?`);
      }
    });
  });

  // Botones del modal de confirmación
  function buttonBorrarPartNumber(partNumberId, pageNum) {
    $("#modalFooter").empty();

    let buttonClose = $("<button>");
    buttonClose.attr("class", "btn btn-secondary");
    buttonClose.attr("data-dismiss", "modal");
    buttonClose.text("Cancelar");
    $("#modalFooter").append(buttonClose);

    let buttonBorrar = $("<button>");
    buttonBorrar.attr("class", "btn btn-danger");
    buttonBorrar.attr("id", "buttonBorrarPartNumber");
    buttonBorrar.text("Eliminar");
    buttonBorrar.attr("value", partNumberId);
    buttonBorrar.attr("page", pageNum);
    $("#modalFooter").append(buttonBorrar);
  }

  function clearUserForm() {
    $("#userForm").css("display", "none");
  }

  // Confirmar borrar
  $(document).on("click", "#buttonBorrarPartNumber", function(event) {
    event.preventDefault();
    let partNumberId = $(this).attr("value");
    let pageNum = $(this).attr("page");
    $.ajax({
      url: `/delete-part-number/${partNumberId}`,
      type: "DELETE",
      contentType: "application/json",
      success: function(data) {
        const { code, message } = data;
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          $("#adminModalCenter").modal("hide");
          notificationToast(code, message);
          getPartNumbers(pageNum);
        }
      },
    });
  });

  // Abrir modal Agregar
  $("#addPartNumber").on("click", function(event) {
    event.preventDefault();
    loadLines(function() {
      $("#partNumberForm")[0].reset();
      // Reset select porque el form reset no lo reinicia bien
      $("#lineName").val("");
      $("#modalPartNumberLongTitle").text("Nuevo Número de Parte");
      $("#createPartNumber").text("Agregar Número de Parte");
      $("#modalPartNumberCenter").attr("type", "Create");
      $("#modalPartNumberCenter").modal("show");
    });
  });

  // Submit formulario
  $("#partNumberForm").submit(function(event) {
    event.preventDefault();
    let numero_parte = $("#partNumber").val().trim();
    let linea = $("#lineName").find(":selected").val();
    if (linea === "Escoge una línea") linea = "";

    let buttonType = $("#modalPartNumberCenter").attr("type");
    let pageNum = $(this).find("#createPartNumber").attr("page");
    let partNumberId = $(this).find("#createPartNumber").attr("partNumberId");

    if (numero_parte.length === 0 || linea.length === 0) return;

    if (buttonType == "Create") {
      $.post("/add-part-number", { numero_parte, linea }).then((data) => {
        const { code, message } = data;
        $("#modalPartNumberCenter").modal("hide");
        $("#partNumberForm")[0].reset();
        $("#lineName").empty();
        notificationToast(code, message);
        getPartNumbers();
      });
    } else if (buttonType == "Update") {
      $.ajax({
        url: `/update-part-number/${partNumberId}`,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify({ numero_parte, linea }),
        success: function(data) {
          const { code, message } = data;
          if (code !== "200") {
            notificationToast(code, message);
          } else {
            $("#modalPartNumberCenter").modal("hide");
            $("#partNumberForm")[0].reset();
            $("#lineName").empty();
            notificationToast(code, message);
            getPartNumbers(pageNum);
          }
        },
      });
    }
  });

  function notificationToast(code, message) {
    if (code != "200") {
      toastr.error(message);
    } else {
      toastr.success(message);
    }
  }
});