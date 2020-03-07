$("#cambiar").on("click", function (event) {
    event.preventDefault();
    //console.log("Submitt button");
    var serialRepetido = $("#serialEtiquetarepetida").val().trim();
    var nuevoSerial = $("#serialEtiquetanueva").val().trim();
    var newSerial = {
        serial: nuevoSerial,
        etiqueta_remplazada: serialRepetido
    }
    var repeteadedSerial={
        serial:serialRepetido,
    }
    console.log("El dato nuevo es " + newSerial)
    console.log("Serial Repetido Length " + serialRepetido.length);
    console.log("Nuevo Serial length " + nuevoSerial.length);

    numeroParterepetido = serialRepetido.slice(0, 10);
    numeroPartenuevo = nuevoSerial.slice(0, 10);

    console.log("El NP repetido es: " + numeroParterepetido);
    console.log("El NP nuevo es: " + numeroPartenuevo)

    if (serialRepetido.length === 22 && nuevoSerial.length === 22) {
        if (serialRepetido !== nuevoSerial) {
            if (numeroParterepetido === numeroPartenuevo) {
                
                $.get("/api/" + nuevoSerial, function (data) {

                    if (data) {
                        console.log(data);
                        $("#Respuesta").empty();
                        etiquetaRepetida();
                    }
                    else {
                        $.post("/api/cambioetiqueta", newSerial)
                            .then(function () {
                                $("#Respuesta").empty();
                                etiquetaExitosa();
                            });
                        //Marca la etiqueta cambiada como repetida
                        $.post("/api/repetido", repeteadedSerial)
                        .then(repeteadedSerial);


                    }

                });
            }
            else {
                //Si son de NP diferentes
                $("#Respuesta").empty();
                numeroParteIncorrecto();
            }
        }
        else{
            //Si son la misma etiqueta
            $("#Respuesta").empty()
            mismaEtiqueta();
        }


    }
    else {
        //Si tiene menos de 22 digitos
        $("#Respuesta").empty();
        digitosIncorrectos();

    }

});


$(document).on("click", "#polskaHtml", function (event) {
    event.preventDefault();
    window.location.href = "./polska.html";
});

function digitosIncorrectos() {
    var newDiv = $("<div>")
    var resultadoImagen = $("<img>")
    resultadoImagen.attr("src", "./images/wrong.png");
    resultadoImagen.attr("class", "resultadoImagen");
    newDiv.text("One of the label has less that 22 digits. Please change // La etiqueta tiene menos de 22 digitos. Por favor cambiala");
    newDiv.attr("class", "comentario");
    $("#Respuesta").append(resultadoImagen);
    $("#Respuesta").append(newDiv);

}


function numeroParteIncorrecto() {
    var newDiv = $("<div>")
    var resultadoImagen = $("<img>")
    resultadoImagen.attr("src", "./images/wrong.png");
    resultadoImagen.attr("class", "resultadoImagen");
    newDiv.text("The labels don't have the same Part Number. Please change // Las etiquetas son de NP diferentes. Por favor cambialas");
    newDiv.attr("class", "comentario");
    $("#Respuesta").append(resultadoImagen);
    $("#Respuesta").append(newDiv);
    limpiarInput();
};

function etiquetaRepetida() {
    var newDiv = $("<div>")
    var resultadoImagen = $("<img>")
    resultadoImagen.attr("src", "./images/wrong.png");
    resultadoImagen.attr("class", "resultadoImagen");
    newDiv.text("The new label is already repeat. Don't use it and change the label");
    newDiv.attr("class", "comentario");
    $("#Respuesta").append(resultadoImagen);
    $("#Respuesta").append(newDiv);
    limpiarInput();
};

function etiquetaExitosa() {
    var newDiv = $("<div>")
    var resultadoImagen = $("<img>")
    resultadoImagen.attr("src", "./images/good.png");
    resultadoImagen.attr("class", "resultadoImagen");
    newDiv.text("The label was changed succesfully");
    newDiv.attr("class", "comentariobueno");
    $("#Respuesta").append(resultadoImagen);
    $("#Respuesta").append(newDiv);
    limpiarInput();
};

function limpiarInput() {
    $("#serialEtiquetarepetida").val("");
    $("#serialEtiquetanueva").val("");
}

function mismaEtiqueta() {
    var newDiv = $("<div>")
    var resultadoImagen = $("<img>")
    resultadoImagen.attr("src", "./images/wrong.png");
    resultadoImagen.attr("class", "resultadoImagen");
    newDiv.text("The labels are exactly the same. Please change // Las etiquetas son iguales. Por favor cambialas");
    newDiv.attr("class", "comentario");
    $("#Respuesta").append(resultadoImagen);
    $("#Respuesta").append(newDiv);
    limpiarInput();
};