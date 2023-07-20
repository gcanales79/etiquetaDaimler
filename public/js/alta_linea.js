$(document).ready(function() {
    getLines(1);
  
    function getLines(pageNum) {
      $.get("/get-all-lines", {}).then((LineList) => {
        const { code, data, message } = LineList;
        //console.log(LineList)
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          //console.log(data);
          paginationPartNumber(pageNum, data);
        }
      });
    }
  
    //List all the part numbers
    function paginationPartNumber(pageNumber, dataSource) {
      $("#pagination-containerLine").empty();
      if ($("#pagination-containerLine").length) {
        //console.log("Entro")
        //Pagination
        $("#pagination-containerLine").pagination({
          dataSource: dataSource,
          pageSize: 5,
          pageNumber: pageNumber,
          callback: function(data, pagination) {
            $("#lineList").empty();
            for (let i = 0; i < data.length; i++) {
              newItem = $("<tr>");
           
              lineNumber = $("<td>");
              lineNumber.text(data[i].linea);
              actionLine = $("<td>");
  
              //Button Edit
              buttonEdit = $("<button>");
              buttonEdit.attr("type", "button");
              buttonEdit.attr("class", "btn btn-primary editLine");
              buttonEdit.css("margin", "5px");
              buttonEdit.attr("value", data[i].id);
              buttonEdit.attr("page", pagination.pageNumber);
              editIcon = $("<i>");
              editIcon.attr("class", "fas fa-edit");
              buttonEdit.append(editIcon);
  
              //Button Delete
              buttonDelete = $("<button>");
              buttonDelete.attr("type", "button");
              buttonDelete.attr("class", "btn btn-danger deleteLine");
              buttonDelete.css("margin", "5px");
              buttonDelete.attr("value", data[i].id);
              buttonDelete.attr("page", pagination.pageNumber);
              deleteIcon = $("<i>");
              deleteIcon.attr("class", "fas fa-trash-alt");
              buttonDelete.append(deleteIcon);
  
              //Append Icons to Div
              actionLine.append(buttonEdit);
              actionLine.append(buttonDelete);
  
              newItem.append(lineNumber);
              newItem.append(actionLine);
  
              //Append Item to List
              $("#lineList").append(newItem);
            }
          },
        });
      }
    }
  
    //Open Modal to Edit Part Number
    $(document).on("click", ".editLine", function(event) {
      //console.log("Edit Line Name")
      event.preventDefault();
      let pageNum = $(this).attr("page");
      let lineId= $(this).attr("value");
  
      $.get(`/get-line/${lineId}`, () => {}).then((data) => {
        const { line, code } = data;
        //console.log(user)
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          $("#modalLineLongTitle").text("Editar Nombre de la Línea");
          $("#createLine").text("Actualizar Nombre de la Línea");
          $("#createLine").attr("lineId", lineId);
          $("#createLine").attr("page", pageNum);
          $("#modalLineCenter").attr("type", "Update");
          $("#lineName").val(line.linea);
          $("#modalLineCenter").modal("show");
        }
      });
    });
  
    //Open Modal to Delete Part Number
    $(document).on("click", ".deleteLine", function(event) {
      event.preventDefault();
      let lineId= $(this).attr("value");
      let pageNum = $(this).attr("page");
      $.get(`/get-line/${lineId}`, () => {}).then((data) => {
        const { code, message, line } = data;
        //console.log(post);
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          buttonBorrarLine(lineId, pageNum);
          $("#adminModalCenter").modal("show");
          clearUserForm();
          $("#adminModalLongTitle").text("Borrar Línea");
          $("#modalBodyAlert").css("display", "inline-block");
          $("#modalBodyAlert").text(
            `Seguro que quieres borrar la línea: ${line.linea}`
          );
        }
      });
    });
  
    //Crear boton Borrar Part Number
    function buttonBorrarLine(lineId, pageNum) {
      $("#modalFooter").empty();
  
      //Boton Cerrar
      let buttonClose = $("<button>");
      buttonClose.attr("class", "btn btn-secondary");
      buttonClose.attr("data-dismiss", "modal");
      buttonClose.text("Cerrar");
      $("#modalFooter").append(buttonClose);
  
      //Boton Borrar
      let buttonBorrar = $("<button>");
      buttonBorrar.attr("class", "btn btn-danger");
      buttonBorrar.attr("id", "buttonBorrarLine");
      buttonBorrar.text("Eliminar");
      buttonBorrar.attr("value", lineId);
      buttonBorrar.attr("page", pageNum);
      $("#modalFooter").append(buttonBorrar);
    }
  
    //Limpiar User Form Modal Admin
    function clearUserForm() {
      $("#userForm").css("display", "none");
    }
  
    //Confirmar Borrar Part Number
    $(document).on("click", "#buttonBorrarLine", function(event) {
      event.preventDefault();
      let lineId= $(this).attr("value");
      let pageNum = $(this).attr("page");
      $.ajax({
        url: `/delete-line/${lineId}`,
        type: "DELETE",
        contentType: "application/json",
        success: function(data) {
          //console.log(data)
          const { code, message } = data;
          if (code !== "200") {
            notificationToast(code, message);
          } else {
            $("#adminModalCenter").modal("hide");
            notificationToast(code, message);
            //console.log("Usuario borrado");
            getLines(pageNum);
          }
        },
      });
    });
  
    //Open Modal to Add Part Number
    $("#addLine").on("click", function(event) {
      event.preventDefault();
      //console.log("Añadir Linea");
      $("#lineForm")[0].reset();
      $("#modalLineLongTitle").text("Añadir Nueva Línea");
      $("#createLine").text("Añadir Línea");
      $("#modalLineCenter").attr("type", "Create");
      $("#modalLineCenter").modal("show");
    });
  
    //Add or Edit User
    $("#lineForm").submit(function(event) {
      event.preventDefault();
  
      let linea = $("#lineName")
        .val()
        .trim()
      let buttonType = $("#modalLineCenter").attr("type");
      let pageNum = $(this)
        .find("#createLine")
        .attr("page");
      let lineId= $(this)
        .find("#createLine")
        .attr("lineId");
      //console.log(pageNum);
      //console.log(postId);
      if (
        linea.length !== 0 
      ) {
        if (buttonType == "Create") {
          // console.log("Create")
          $.post("/add-line", {
            linea: linea,
          }).then((data) => {
            //console.log(data);
            const { code, message } = data;
            $("#modalLineCenter").modal("hide");
            //Limpiar la forma despues de hacer submit
            $("#lineForm")[0].reset();
            notificationToast(code, message);
            getLines();
          });
        } else if (buttonType == "Update") {
          // console.log("Update");
          let changes = {
            linea:linea
          };
          $.ajax({
            url: `/update-line/${lineId}`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify(changes),
            success: function(data) {
              const { code, message } = data;
              if (code !== "200") {
                notificationToast(code, message);
              } else {
                $();
                $("#modalLineCenter").modal("hide");
                //Limpiar la forma despues de hacer submit
                $("#lineForm")[0].reset();
                notificationToast(code, message);
                getLines(pageNum);
              }
            },
          });
        }
      } 
    });
  
    //Pop up notifications
    function notificationToast(code, message) {
      if (code != "200") {
        toastr.error(message);
      } else {
        toastr.success(message);
      }
    }
  });