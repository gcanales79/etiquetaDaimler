$(document).ready(function() {
  // ── Eliminar checkboxes que paginationjs inyecta en el DOM ──
  function removeStrayCheckboxes() {
    document.querySelectorAll("input[type='checkbox']").forEach(el => {
      if (!el.closest("#modalLineCenter")) {
        el.remove();
      }
    });
  }
  const observer = new MutationObserver(removeStrayCheckboxes);
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(removeStrayCheckboxes, 100);
  setTimeout(removeStrayCheckboxes, 500);

  getLines(1);

  function getLines(pageNum) {
    $.get("/get-all-lines", {}).then((LineList) => {
      const { code, data, message } = LineList;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        paginationPartNumber(pageNum, data);
      }
    });
  }

  // List all lines
  function paginationPartNumber(pageNumber, dataSource) {
    $("#pagination-containerLine").empty();
    if ($("#pagination-containerLine").length) {
      $("#pagination-containerLine").pagination({
        dataSource: dataSource,
        pageSize: 5,
        pageNumber: pageNumber,
        callback: function(data, pagination) {
          $("#lineList").empty();
          // Eliminar checkboxes que paginationjs inyecta en el DOM
          setTimeout(() => $("input[type='checkbox']:not(.alerta-checkbox)").remove(), 0);
          for (let i = 0; i < data.length; i++) {
            newItem = $("<tr>");

            lineNumber = $("<td>").addClass("align-middle");
            lineNumber.text(data[i].linea);

            actionLine = $("<td>").addClass("align-middle text-center");

            // Botones como template strings para que el SVG renderice bien
            buttonEdit = $(
              `<button type="button" class="btn-action btn-action--edit editLine"
                value="${data[i].id}" page="${pagination.pageNumber}" title="Editar línea">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>`
            );

            buttonDelete = $(
              `<button type="button" class="btn-action btn-action--delete deleteLine"
                value="${data[i].id}" page="${pagination.pageNumber}" title="Eliminar línea">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>`
            );

            actionLine.append(buttonEdit);
            actionLine.append(buttonDelete);

            newItem.append(lineNumber);
            newItem.append(actionLine);
            $("#lineList").append(newItem);
          }
        },
      });
    }
  }

  // Open Modal to Edit Line
  $(document).on("click", ".editLine", function(event) {
    event.preventDefault();
    let pageNum = $(this).attr("page");
    let lineId = $(this).attr("value");

    $.get(`/get-line/${lineId}`, () => {}).then((data) => {
      const { line, code } = data;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        $("#modalLineLongTitle").text("Editar Línea");
        $("#createLine").text("Actualizar Línea");
        $("#createLine").attr("lineId", lineId);
        $("#createLine").attr("page", pageNum);
        $("#modalLineCenter").attr("type", "Update");
        $("#lineName").val(line.linea);
        $("#modalLineCenter").modal("show");
      }
    });
  });

  // Open Modal to Delete Line
  $(document).on("click", ".deleteLine", function(event) {
    event.preventDefault();
    let lineId = $(this).attr("value");
    let pageNum = $(this).attr("page");
    $.get(`/get-line/${lineId}`, () => {}).then((data) => {
      const { code, message, line } = data;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        buttonBorrarLine(lineId, pageNum);
        $("#adminModalCenter").modal("show");
        clearUserForm();
        $("#adminModalLongTitle").text("Eliminar Línea");
        $("#modalBodyAlert").css("display", "inline-block");
        $("#modalBodyAlert").text(`¿Seguro que quieres eliminar la línea: ${line.linea}?`);
      }
    });
  });

  // Botones del modal de confirmación
  function buttonBorrarLine(lineId, pageNum) {
    $("#modalFooter").empty();

    let buttonClose = $("<button>");
    buttonClose.attr("class", "btn btn-secondary");
    buttonClose.attr("data-dismiss", "modal");
    buttonClose.text("Cancelar");
    $("#modalFooter").append(buttonClose);

    let buttonBorrar = $("<button>");
    buttonBorrar.attr("class", "btn btn-danger");
    buttonBorrar.attr("id", "buttonBorrarLine");
    buttonBorrar.text("Eliminar");
    buttonBorrar.attr("value", lineId);
    buttonBorrar.attr("page", pageNum);
    $("#modalFooter").append(buttonBorrar);
  }

  function clearUserForm() {
    $("#userForm").css("display", "none");
  }

  // Confirmar borrar línea
  $(document).on("click", "#buttonBorrarLine", function(event) {
    event.preventDefault();
    let lineId = $(this).attr("value");
    let pageNum = $(this).attr("page");
    $.ajax({
      url: `/delete-line/${lineId}`,
      type: "DELETE",
      contentType: "application/json",
      success: function(data) {
        const { code, message } = data;
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          $("#adminModalCenter").modal("hide");
          notificationToast(code, message);
          getLines(pageNum);
        }
      },
    });
  });

  // Abrir modal agregar línea
  $("#addLine").on("click", function(event) {
    event.preventDefault();
    $("#lineForm")[0].reset();
    $("#modalLineLongTitle").text("Nueva Línea");
    $("#createLine").text("Agregar Línea");
    $("#modalLineCenter").attr("type", "Create");
    $("#modalLineCenter").modal("show");
  });

  // Submit formulario línea
  $("#lineForm").submit(function(event) {
    event.preventDefault();
    let linea = $("#lineName").val().trim();
    let buttonType = $("#modalLineCenter").attr("type");
    let pageNum = $(this).find("#createLine").attr("page");
    let lineId = $(this).find("#createLine").attr("lineId");

    if (linea.length === 0) return;

    if (buttonType == "Create") {
      $.post("/add-line", { linea }).then((data) => {
        const { code, message } = data;
        $("#modalLineCenter").modal("hide");
        $("#lineForm")[0].reset();
        notificationToast(code, message);
        getLines();
      });
    } else if (buttonType == "Update") {
      $.ajax({
        url: `/update-line/${lineId}`,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify({ linea }),
        success: function(data) {
          const { code, message } = data;
          if (code !== "200") {
            notificationToast(code, message);
          } else {
            $("#modalLineCenter").modal("hide");
            $("#lineForm")[0].reset();
            notificationToast(code, message);
            getLines(pageNum);
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