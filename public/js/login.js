$(document).ready(function() {
  // Getting references to our form and inputs

  var loginForm = $("form.login");
  var emailInput = $("input#email-input");
  var passwordInput = $("input#password-input");

  // When the form is submitted, we validate there's an email and password entered
  loginForm.on("submit", function(event) {
    event.preventDefault();
    var userData = {
      email: emailInput.val().trim(),
      password: passwordInput.val().trim(),
    };
    if (!userData.email || !userData.password) {
      return;
    }

    // If we have an email and password we run the loginUser function and clear the form
    loginUser(userData.email, userData.password);
    emailInput.val("");
    passwordInput.val("");
  });

  // loginUser does a post to our "api/login" route and if successful, redirects us the the members page
  function loginUser(email, password) {
    $.post("/login", {
      email: email,
      password: password,
    }).then(function(data) {
      // console.log("Hello");
      // console.log(data);

      if (data.alert === "success") {
        //window.location.replace(data);
        window.location.href = data.redirect;
        // If there's an error, log the errorrs
      } else {
        notificationToast(data.alert, data.message);
      }
    });
  }

  // 1. Handle "Send Code" Button
  $("#btnSendRecoveryCode").on("click", function() {
    const email = $("#recoveryEmail")
      .val()
      .trim();
    if (!email)
      return showRecoveryMessage("Por favor ingresa tu correo.", true);

    // Disable button to prevent double-clicks
    const btn = $(this);
    btn.prop("disabled", true).text("Sending...");

    $.post("/api/forgot-password", { email: email })
      .then(function(response) {
        // Success: Hide Step 1, Show Step 2
        $("#recoveryAlert").addClass("d-none"); // Hide errors
        $("#step1-email").addClass("d-none");
        $("#step2-reset").removeClass("d-none");
        notificationToast(response.code, response.message);
      })
      .fail(function(err) {
        // Error handling (e.g., "No phone on record")
        let errorMsg = err.responseJSON
          ? err.responseJSON.error
          : "An error occurred.";
        showRecoveryMessage(errorMsg, true);
        //console.log(err);
        btn.prop("disabled", false).text("Send WhatsApp Code");
      });
  });

  // 2. Handle "Reset Password" Button
  $("#btnResetPassword").on("click", function() {
    const email = $("#recoveryEmail")
      .val()
      .trim();
    const otpCode = $("#recoveryOtp")
      .val()
      .trim();
    const newPassword = $("#newPassword")
      .val()
      .trim();

    if (!otpCode || !newPassword)
      return showRecoveryMessage("Por favor completa todos los campos.", true);

    const btn = $(this);
    btn.prop("disabled", true).text("Verifying...");

    $.post("/api/reset-password", {
      email: email,
      otpCode: otpCode,
      newPassword: newPassword,
    })
      .then(function(response) {
        // Success!
        $("#step2-reset").addClass("d-none");
        showRecoveryMessage(response.message, false);
      

        // Optional: Automatically close modal after 3 seconds
        setTimeout(() => {
          $("#recoveryModal").modal("hide");
          window.location.reload(); // Reload to let them log in
        }, 3000);
      })
      .catch(function(err) {
        let errorMsg = err.responseJSON
          ? err.responseJSON.error
          : "Invalid code.";
        showRecoveryMessage(errorMsg, true);
        btn.prop("disabled", false).text("Restablecer Contraseña");
      });
  });

  // Reset modal when closed so it's fresh next time
  $("#recoveryModal").on("hidden.bs.modal", function() {
    $("#step1-email").removeClass("d-none");
    $("#step2-reset").addClass("d-none");
    $("#recoveryAlert").addClass("d-none");
    $("#recoveryEmail, #recoveryOtp, #newPassword").val("");
    $("#btnSendRecoveryCode")
      .prop("disabled", false)
      .text("Enviar Código por Whatsapp");
    $("#btnResetPassword")
      .prop("disabled", false)
      .text("Restablecer Contraseña");
  });

  // Helper to show messages in the modal
    function showRecoveryMessage(message, isError = false) {
        const alertBox = $("#recoveryAlert");
        alertBox.removeClass("d-none alert-danger alert-success");
        alertBox.addClass(isError ? "alert-danger" : "alert-success");
        alertBox.text(message);
    }

  function notificationToast(result, message) {
    console.log(result, message);
    switch (result) {
      case "Success":
        toastr.success(message);
        break;
      case "Error":
        toastr.error(message);
        break;
    }
  }
});
