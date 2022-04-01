$(document).ready(function() {
  getUsers(1);

  function getUsers(pageNum) {
    $.get("/get-all-users", {}).then((usersList) => {
      const { code, data, message } = usersList;
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        //console.log(data);
        paginationUser(pageNum, data);
      }
    });
  }

  //List all the users
  function paginationUser(pageNumber, dataSource) {
    $("#pagination-containerUsers").empty();
    if ($("#pagination-containerUsers").length) {
      //console.log("Entro")
      //Pagination
      $("#pagination-containerUsers").pagination({
        dataSource: dataSource,
        pageSize: 5,
        pageNumber: pageNumber,
        callback: function(data, pagination) {
          $("#usersList").empty();
          for (let i = 0; i < data.length; i++) {
            newItem = $("<tr>");
            emailUser = $("<td>");
            emailUser.text(data[i].email);
            roleUser = $("<td>");
            roleUser.text(data[i].role);
            actionUser = $("<td>");

            //Button Edit
            buttonEdit = $("<button>");
            buttonEdit.attr("type", "button");
            buttonEdit.attr("class", "btn btn-primary editUser");
            buttonEdit.css("margin", "5px");
            buttonEdit.attr("value", data[i].id);
            buttonEdit.attr("page", pagination.pageNumber);
            editIcon = $("<i>");
            editIcon.attr("class", "fas fa-edit");
            buttonEdit.append(editIcon);

            //Button Delete
            buttonDelete = $("<button>");
            buttonDelete.attr("type", "button");
            buttonDelete.attr("class", "btn btn-danger deleteUser");
            buttonDelete.css("margin", "5px");
            buttonDelete.attr("value", data[i].id);
            buttonDelete.attr("page", pagination.pageNumber);
            deleteIcon = $("<i>");
            deleteIcon.attr("class", "fas fa-trash-alt");
            buttonDelete.append(deleteIcon);

            //Append Icons to Div
            actionUser.append(buttonEdit);
            actionUser.append(buttonDelete);

            newItem.append(emailUser);
            newItem.append(roleUser);
            newItem.append(actionUser);

            //Append Item to List
            $("#usersList").append(newItem);
          }
        },
      });
    }
  }

  //Open Modal to Edit User
  $(document).on("click", ".editUser", function(event) {
    event.preventDefault();
    let pageNum = $(this).attr("page");
    let userId = $(this).attr("value");

    $.get(`/get-user/${userId}`, () => {}).then((data) => {
      const { user, code } = data;
      //console.log(user)
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        $("#modalUserLongTitle").text("Editar Usuario");
        $("#createUser").text("Actualizar Usuario");
        $("#createUser").attr("userId", userId);
        $("#createUser").attr("page", pageNum);
        $("#modalUserCenter").attr("type", "Update");
        $("#emailUser").val(user.email);
        $("#roleUser").val(user.role);
        $("#modalUserCenter").modal("show");
      }
    });
  });

  //Open Modal to Delete User
  $(document).on("click", ".deleteUser", function(event) {
    event.preventDefault();
    let userId = $(this).attr("value");
    let pageNum = $(this).attr("page");
    $.get(`/get-user/${userId}`, () => {}).then((data) => {
      const { code, message, user } = data;
      //console.log(post);
      if (code !== "200") {
        notificationToast(code, message);
      } else {
        buttonBorrarUser(userId, pageNum);
        $("#adminModalCenter").modal("show");
        clearUserForm();
        $("#adminModalLongTitle").text("Borrar Usuario");
        $("#modalBodyAlert").css("display", "inline-block");
        $("#modalBodyAlert").text(
          `Seguro que quieres borrar el usuario: ${user.email}`
        );
      }
    });
  });

  //Crear boton Borrar User
  function buttonBorrarUser(userId, pageNum) {
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
    buttonBorrar.attr("id", "buttonBorrarUser");
    buttonBorrar.text("Eliminar");
    buttonBorrar.attr("value", userId);
    buttonBorrar.attr("page", pageNum);
    $("#modalFooter").append(buttonBorrar);
  }

  //Limpiar User Form Modal Admin
  function clearUserForm() {
    $("#userForm").css("display", "none");
  }

  //Confirmar Borrar User
  $(document).on("click", "#buttonBorrarUser", function(event) {
    event.preventDefault();
    let userId = $(this).attr("value");
    let pageNum = $(this).attr("page");
    $.ajax({
      url: `/delete-user/${userId}`,
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
          getUsers(pageNum);
        }
      },
    });
  });

  //Open Modal to Add User
  $("#addUser").on("click", function(event) {
    event.preventDefault();
    console.log("Añadir Usuario");
    $("#userForm")[0].reset();
    $("#modalUserLongTitle").text("Añadir Nuevo Usuario");
    $("#createUser").text("Añadir Usuario");
    $("#modalUserCenter").attr("type", "Create");
    $("#modalUserCenter").modal("show");
  });

  //Add or Edit User
  $("#userForm").submit(function(event) {
    event.preventDefault();

    let email = $("#emailUser")
      .val()
      .trim()
      .toLowerCase();
    let password = $("#passwordUser")
      .val()
      .trim();
    let repeatPassword = $("#repeatPasswordUser")
      .val()
      .trim();
    let role = $("#roleUser").val();
    let buttonType = $("#modalUserCenter").attr("type");
    let pageNum = $(this)
      .find("#createUser")
      .attr("page");
    let userId = $(this)
      .find("#createUser")
      .attr("userId");
    //console.log(pageNum);
    //console.log(postId);
    if (
      email.length !== 0 &&
      password.length !== 0 &&
      repeatPassword.length !== 0 &&
      password === repeatPassword
    ) {
      if (buttonType == "Create") {
        // console.log("Create")
        $.post("/add-user", {
          email: email,
          password: password,
          role: role,
        }).then((data) => {
          //console.log(data);
          const { code, message } = data;
          $("#modalUserCenter").modal("hide");
          //Limpiar la forma despues de hacer submit
          $("#userForm")[0].reset();
          notificationToast(code, message);
          getUsers();
        });
      } else if (buttonType == "Update") {
        // console.log("Update");
        let changes = {
          email: email,
          password: password,
          role: role,
        };
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
              $();
              $("#modalUserCenter").modal("hide");
              //Limpiar la forma despues de hacer submit
              $("#userForm")[0].reset();
              notificationToast(code, message);
              getUsers(pageNum);
            }
          },
        });
      }
    } else {
      if (password !== repeatPassword) {
        notificationToast("500", "Las contraseñas no coinciden");
        return false;
      } else {
        notificationToast("500", "Todos los datos son obligatorios");
        return false;
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
