$(document).ready(function() {
    getPartNumbers(1);
  
    function getPartNumbers(pageNum) {
      $.get("/get-all-part-numbers", {}).then((partNumberList) => {
        const { code, data, message } = partNumberList;
        //console.log(partNumberList)
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
      $("#pagination-containerPartNumber").empty();
      if ($("#pagination-containerPartNumber").length) {
        //console.log("Entro")
        //Pagination
        $("#pagination-containerPartNumber").pagination({
          dataSource: dataSource,
          pageSize: 10,
          pageNumber: pageNumber,
          callback: function(data, pagination) {
            $("#partNumberList").empty();
            for (let i = 0; i < data.length; i++) {
              newItem = $("<tr>");
              partNumber = $("<td>");
              partNumber.text(data[i].numero_parte);
              lineNumber = $("<td>");
              lineNumber.text(data[i].linea);
              actionPartNumber = $("<td>");
  
              //Button Edit
              buttonEdit = $("<button>");
              buttonEdit.attr("type", "button");
              buttonEdit.attr("class", "btn btn-primary editPartNumber");
              buttonEdit.css("margin", "5px");
              buttonEdit.attr("value", data[i].id);
              buttonEdit.attr("page", pagination.pageNumber);
              editIcon = $("<i>");
              editIcon.attr("class", "fas fa-edit");
              buttonEdit.append(editIcon);
  
              //Button Delete
              buttonDelete = $("<button>");
              buttonDelete.attr("type", "button");
              buttonDelete.attr("class", "btn btn-danger deletePartNumber");
              buttonDelete.css("margin", "5px");
              buttonDelete.attr("value", data[i].id);
              buttonDelete.attr("page", pagination.pageNumber);
              deleteIcon = $("<i>");
              deleteIcon.attr("class", "fas fa-trash-alt");
              buttonDelete.append(deleteIcon);
  
              //Append Icons to Div
              actionPartNumber.append(buttonEdit);
              actionPartNumber.append(buttonDelete);
  
              newItem.append(partNumber);
              newItem.append(lineNumber);
              newItem.append(actionPartNumber);
  
              //Append Item to List
              $("#partNumberList").append(newItem);
            }
          },
        });
      }
    }
  
    //Open Modal to Edit Part Number
    $(document).on("click", ".editPartNumber", function(event) {
      //console.log("Edit Part Number")
      event.preventDefault();
      let pageNum = $(this).attr("page");
      let partNumberId = $(this).attr("value");
  
      $.get(`/get-part-number/${partNumberId}`, () => {}).then((data) => {
        const { partNumber, code } = data;
        //console.log(user)
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          $("#modalPartNumberLongTitle").text("Editar Numero de Parte");
          $("#createPartNumber").text("Actualizar Numero de Parte");
          $("#createPartNumber").attr("partNumberId", partNumberId);
          $("#createPartNumber").attr("page", pageNum);
          $("#modalPartNumberCenter").attr("type", "Update");
          $("#partNumber").val(partNumber.numero_parte);
          $("#lineaNumber").val(partNumber.linea);
          $("#modalPartNumberCenter").modal("show");
        }
      });
    });
  
    //Open Modal to Delete Part Number
    $(document).on("click", ".deletePartNumber", function(event) {
      event.preventDefault();
      let partNumberId = $(this).attr("value");
      let pageNum = $(this).attr("page");
      $.get(`/get-part-number/${partNumberId}`, () => {}).then((data) => {
        const { code, message, partNumber } = data;
        //console.log(post);
        if (code !== "200") {
          notificationToast(code, message);
        } else {
          buttonBorrarPartNumber(partNumberId, pageNum);
          $("#adminModalCenter").modal("show");
          clearUserForm();
          $("#adminModalLongTitle").text("Borrar Numero de Parte");
          $("#modalBodyAlert").css("display", "inline-block");
          $("#modalBodyAlert").text(
            `Seguro que quieres borrar el numero de parte: ${partNumber.numero_parte}`
          );
        }
      });
    });
  
    //Crear boton Borrar Part Number
    function buttonBorrarPartNumber(partNumberId, pageNum) {
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
      buttonBorrar.attr("id", "buttonBorrarPartNumber");
      buttonBorrar.text("Eliminar");
      buttonBorrar.attr("value", partNumberId);
      buttonBorrar.attr("page", pageNum);
      $("#modalFooter").append(buttonBorrar);
    }
  
    //Limpiar User Form Modal Admin
    function clearUserForm() {
      $("#userForm").css("display", "none");
    }
  
    //Confirmar Borrar Part Number
    $(document).on("click", "#buttonBorrarPartNumber", function(event) {
      event.preventDefault();
      let partNumberId = $(this).attr("value");
      let pageNum = $(this).attr("page");
      $.ajax({
        url: `/delete-part-number/${partNumberId}`,
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
            getPartNumbers(pageNum);
          }
        },
      });
    });
  
    //Open Modal to Add Part Number
    $("#addPartNumber").on("click", function(event) {
      $.get("/get-all-lines",()=>{}).then((response)=>{
        //console.log(response)
        defaultOption=$("<option>");
        defaultOption.text("Escoge una línea");
        defaultOption.attr("selected","selected");
        defaultOption.val("");
        $("#lineName").append(defaultOption)

        for (let i=0;i<response.data.length;i++){
          //console.log(response.data[i].linea)
          newOption=$("<option>");
          newOption.text(response.data[i].linea);
          newOption.attr("value", response.data[i].linea);
  
          $("#lineName").append(newOption);
        }
        event.preventDefault();
        //console.log("Añadir Numero de Parte");
        $("#partNumberForm")[0].reset();
        $("#modalPartNumberLongTitle").text("Añadir Nuevo Numero de Parte");
        $("#createPartNumber").text("Añadir Numero de Parte");
        $("#modalPartNumberCenter").attr("type", "Create");
        $("#modalPartNumberCenter").modal("show");
      })
     
    });
  
    //Add or Edit User
    $("#partNumberForm").submit(function(event) {
      event.preventDefault();
  
      let numero_parte = $("#partNumber")
        .val()
        .trim()
      let linea = $("#lineName").find(":selected").val()
      if (linea==="Escoge una línea"){
        linea="";
      }
      let buttonType = $("#modalPartNumberCenter").attr("type");
      let pageNum = $(this)
        .find("#createPartNumber")
        .attr("page");
      let partNumberId = $(this)
        .find("#createPartNumber")
        .attr("partNumberId");
      //console.log(pageNum);
      //console.log(postId);
      if (
        numero_parte.length !== 0 &&
        linea.length !== 0 
      ) {
        if (buttonType == "Create") {
          // console.log("Create")
          $.post("/add-part-number", {
            numero_parte: numero_parte,
            linea: linea,
          }).then((data) => {
            //console.log(data);
            const { code, message } = data;
            $("#modalPartNumberCenter").modal("hide");
            //Limpiar la forma despues de hacer submit
            $("#partNumberForm")[0].reset();
            $("#lineName").empty();
            notificationToast(code, message);
            getPartNumbers();
          });
        } else if (buttonType == "Update") {
          // console.log("Update");
          let changes = {
            numero_parte:numero_parte,
            linea:linea
          };
          $.ajax({
            url: `/update-part-number/${partNumberId}`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify(changes),
            success: function(data) {
              const { code, message } = data;
              if (code !== "200") {
                notificationToast(code, message);
              } else {
                $();
                $("#modalPartNumberCenter").modal("hide");
                //Limpiar la forma despues de hacer submit
                $("#partNumberForm")[0].reset();
                $("#lineName").empty();
                notificationToast(code, message);
                getPartNumbers(pageNum);
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
  