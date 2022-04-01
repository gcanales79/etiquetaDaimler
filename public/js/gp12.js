$(document).ready(function () {

    getLast6();

    $("#exampleModal").modal(
        {
            show: false,
            backdrop: "static",
            keyboard: false
        })

    $("#submit").on("click", function (event) {
        event.preventDefault();
        //console.log("Submitt button");
        $("#Resultado").empty();
        var nuevoSerial = $("#serialEtiqueta").val().trim();
        revisarNumerodeParte(nuevoSerial);
        localStorage.setItem("ultimaEtiqueta", nuevoSerial)
        var newSerial = {
            serial: nuevoSerial,
        }
        if (nuevoSerial.length === 22) {
            $.get("/api/all/" + nuevoSerial, function (data) {
                console.log(data);

                if (data.length > 1) {
                    duplicatedLabel(newSerial);


                    return;
                }

                if (data.length === 1) {
                    //console.log("Status de repetida " + data[0].repetida)
                    for (var i = 0; i < data.length; i++) {
                        //!En el futuro conviene quitar el AND.
                        if (data[i].repetida && (data[i].etiqueta_remplazada == null || data[i].etiqueta_remplazada == "")) {
                            duplicatedLabel(newSerial);
                        }


                        else {
                            etiquetaCorrecta(newSerial);
                        }
                    }
                }

                if (data.length === 0) {
                    etiquetaFaltante(newSerial);
                }


            });


        }
        else {
            serialIncorrecto();

        }
    })

    $(document).on("click", "#cambioDeetiqueta", function (event) {
        event.preventDefault();
        window.location.href = "./cambiar.html";
    });

    //Lo que muestra cuando el serial no es de la longitud correcta
    function serialIncorrecto() {
        var newDiv = $("<div>")
        var resultadoImagen = $("<img>")
        resultadoImagen.attr("src", "./images/wrong.png");
        resultadoImagen.attr("class", "resultadoImagen");
        newDiv.text("La etiqueta debe contener 22 digitos");
        newDiv.attr("class", "comentario");
        $("#serialEtiqueta").val("");
        $("#Resultado").append(resultadoImagen);
        $("#Resultado").append(newDiv);
    }

    function duplicatedLabel(newSerial) {
        var newDiv = $("<div>")
        var resultadoImagen = $("<img>")
        resultadoImagen.attr("src", "./images/wrong.png");
        resultadoImagen.attr("class", "resultadoImagen");
        newDiv.text("La etiqueta esta duplicada por favor contener la pieza para inspeccion de Calidad");
        newDiv.attr("class", "comentario");
        $("#serialEtiqueta").val("");
        var newButton = $("<button>");
        newButton.attr("class", "btn btn-primary");
        newButton.attr("type", "submit");
        newButton.attr("id", "Segregada");
        newButton.text("Pieza Segregada");
        $("#Resultado").append(resultadoImagen);
        $("#Resultado").append(newDiv);
        $("#Resultado").append(newButton);
        $("#submit").prop("disabled", true);
        $.post("/repeatgp12", newSerial)
            .then(newSerial);
        $.ajax({
            url: "/api/gp12/" + newSerial.serial,
            type: "PUT",
            success:
                function (data) {
                    getLast6();
                    console.log("Fecha de GP12 ok")
                }
        })


    }

    function etiquetaFaltante(newSerial) {
        var newDiv = $("<div>")
        var resultadoImagen = $("<img>")
        resultadoImagen.attr("src", "./images/wrong.png");
        resultadoImagen.attr("class", "resultadoImagen");
        newDiv.text("La etiqueta no esta en la base de datos. Por favor avisar a calidad para cambiarla");
        newDiv.attr("class", "comentario");
        $("#serialEtiqueta").val("");
        var newButton = $("<button>");
        newButton.attr("class", "btn btn-primary");
        newButton.attr("type", "submit");
        newButton.attr("id", "Segregada");
        newButton.text("Pieza Segregada");
        $("#Resultado").append(resultadoImagen);
        $("#Resultado").append(newDiv);
        $("#Resultado").append(newButton);
        $("#submit").prop("disabled", true);
        $.post("/notfound", newSerial)
            .then(newSerial);
    }

    function etiquetaCorrecta(newSerial) {
        var newDiv = $("<div>")
        var resultadoImagen = $("<img>")
        resultadoImagen.attr("src", "./images/good.png");
        resultadoImagen.attr("class", "resultadoImagen");
        newDiv.text("Etiqueta Correcta.");
        newDiv.attr("class", "comentariobueno");
        $("#Resultado").append(resultadoImagen);
        $("#Resultado").append(newDiv);
        //console.log("El nuevo serial es " + newSerial.serial)
        $.ajax({
            url: "/api/gp12/" + newSerial.serial,
            type: "PUT",
            success:
                function (data) {
                    getLast6();
                    console.log("Fecha de GP12 ok")
                }
        })
        setTimeout(function () {
            $("#serialEtiqueta").val("");
        }, 3000)
        setTimeout(function () {
            $("#Resultado").empty();
        }, 5000);

    }


    // Function to make the table with the 6 last results
    function getLast6() {
        $("#tablaDe6").empty();
        // Grab the last 6 scan labels

        $.getJSON("/api/all/tabla/gp12seisetiquetas", function (data) {
            console.log(data);
            // For each registry...
            for (var i = 0; i < data.length; i++) {
                // ...populate the results
                if (data[i].repetida) {
                    //var resultado = "Si"
                    var resultadoIcono = "'fa fa-ban ban'"
                }
                else {
                    //var resultado = "No";
                    var resultadoIcono = "'fa fa-check-circle check'";

                };
                moment.tz.add("America/Monterrey|LMT CST CDT|6F.g 60 50|0121212121212121212121212121212121212121212121212121212121212121212121212121212121212121|-1UQG0 2FjC0 1nX0 i6p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 1fB0 WL0 1fB0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|41e5")
                var fechagp12 = moment(data[i].fecha_gp12).tz("America/Monterrey").format("DD/MM/YYYY hh:mm:ss a");
                $("#tablaDe6").prepend("<tr><th scope='row'>" + data[i].serial + "</th> <td> <span class= "
                    + resultadoIcono + "></span> </td> <td>" + fechagp12 + "</td> </tr>");
            }
        })

    }

    $(document).on("click", "#Segregada", function (event) {
        event.preventDefault();
        $("#serialEtiqueta").val("");
        window.location.href = "./gp12";
        getLast6();
    });

    //Funcion para comparar los digitos de la ultima etiqueta escaneada contra la etiqueta escaneada

    function revisarNumerodeParte(nuevoSerial) {
        let ultimaEtiqueta = localStorage.getItem("ultimaEtiqueta")
        if (ultimaEtiqueta) {
            var numeroDepartePasado = ultimaEtiqueta.slice(0, 10)
        }
        let numeroDeparteNuevo = nuevoSerial.slice(0, 10)
        if (numeroDepartePasado === numeroDeparteNuevo) {
            console.log("Son iguales");
        }
        else {
            $("#exampleModal").modal("show")
        }
    }
})
