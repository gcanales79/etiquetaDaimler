$(document).ready(function () {

    getLast6();
    // produccionPorhora();
    // produccionTurnos();
    // produccionPorsemana();

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
        var primNumeros = nuevoSerial.substring(0, 6);
        revisarNumerodeParte(nuevoSerial);
        localStorage.setItem("ultimaEtiqueta", nuevoSerial)
        var usuario=document.cookie.replace(/(?:(?:^|.*;\s*)usuario\s*\=\s*([^;]*).*$)|^.*$/, "$1")
        localStorage.setItem("usuario",usuario)
        
        var newSerial = {
            serial: nuevoSerial,
        }
        if (nuevoSerial.length === 22 && primNumeros==="247490") {
            $.get("/api/" + nuevoSerial, function (data) {

                if (data) {
                    //console.log(data);
                    var newDiv = $("<div>")
                    var resultadoImagen = $("<img>")
                    resultadoImagen.attr("src", "./images/wrong.png");
                    resultadoImagen.attr("class", "resultadoImagen");
                    newDiv.text("La etiqueta ya existe, por favor segregar la pieza para inspección de calidad");
                    newDiv.attr("class", "comentario");
                    var newButton = $("<button>");
                    newButton.attr("class", "btn btn-primary");
                    newButton.attr("type", "submit");
                    newButton.attr("id", "cambioDeetiqueta");
                    newButton.text("Pieza Segregada");
                    $("#Resultado").append(resultadoImagen);
                    $("#Resultado").append(newDiv);
                    $("#Resultado").append(newButton);
                    $("#submit").prop("disabled", true);

                    $.post("/api/repetido", newSerial)
                        .then(newSerial);
                    $.post("/message", newSerial)
                        .then(newSerial)
                    $.post("/api/crearregistro/repetido", newSerial)
                        .then(newSerial)

                    return;
                }
                else {

                    $.post("/api/serial", newSerial)
                        .then(function () {
                            //console.log("El newSerial es: " + JSON.stringify(newSerial));
                            var newDiv = $("<div>")
                            var resultadoImagen = $("<img>")
                            resultadoImagen.attr("src", "./images/good.png");
                            resultadoImagen.attr("class", "resultadoImagen");
                            newDiv.text("Etiqueta Correcta");
                            newDiv.attr("class", "comentariobueno");
                            //Borra el dato de la etiqueta despues de 3 segundos
                            setTimeout(function () {
                                $("#serialEtiqueta").val("");
                            }, 2000);
                            $("#Resultado").append(resultadoImagen);
                            $("#Resultado").append(newDiv);
                            //Borrar el resultado despues de unos segundos
                            setTimeout(function () {
                                $("#Resultado").empty();
                            }, 3000);
                            getLast6();
                            produccionPorhora();
                            produccionTurnos();
                            produccionPorsemana();
                            //Esta funcion permite recargar la pagina para que saliera la tabla    
                            /*
                            setTimeout(function () {
                                window.location.href = "./";
                            }, 5000);*/


                        });
                    return;
                }

            });


        }
        else {
            var newDiv = $("<div>")
            var resultadoImagen = $("<img>")
            resultadoImagen.attr("src", "./images/wrong.png");
            resultadoImagen.attr("class", "resultadoImagen");
            newDiv.text("La etiqueta debe ser de 22 digitos o tiene el inicio incorrecto");
            newDiv.attr("class", "comentario");
            $("#Resultado").append(resultadoImagen);
            $("#Resultado").append(newDiv);

        }




    })

    $(document).on("click", "#cambioDeetiqueta", function (event) {
        event.preventDefault();
        $("#serialEtiqueta").val("");
        window.location.href = "./produccion";
        getLast6();
    });


    // Function to make the table with the 6 last results
    function getLast6() {
        $("#tablaDe6").empty();
        // Grab the last 6 scan labels

        $.get("/api/all/tabla/seisetiquetas", function (datos) {
            //console.log(data);
            const {data}=datos;
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
                var fechaCreacion = moment(data[i].createdAt).tz("America/Monterrey").format("DD/MM/YYYY hh:mm:ss a");
                $("#tablaDe6").prepend("<tr><th scope='row'>" + data[i].serial + "</th> <td> <span class= "
                    + resultadoIcono + "></span> </td> <td>" + fechaCreacion + "</td> </tr>");
            }
        })

    }

    function produccionPorhora() {

        let produccion = [];
        for (let i = 0; i < 9; i++) {
            //calcula la hora actual y resta 9 horas atras
            let hora = moment().startOf("hour").subtract(i, "hour").format("h:mm a")
            //let horafinal=moment().startOf("hour").subtract(i-1,"hour").format("h:mm a")
            let fechainicial = moment().startOf("hour").subtract(i, "hour").format("X")
            let fechafinal = moment().startOf("hour").subtract(i - 1, "hour").format("X")
            //console.log(hora)
            //console.log("La fecha inicial es: " + fechainicial + " o " + hora)
            //console.log("La fecha final es: " + fechafinal + " o " + horafinal)
            $.get("/produccionhora/" + fechainicial + "/" + fechafinal, function (data) {
                //console.log("De "+ fechainicial + " a " + fechafinal)
                //console.log("A " + fechafinal)
                //console.log("Lleva piezas " + data.count)
                //console.log("En la hora " + hora)

                produccion.push({
                    fecha: fechainicial,
                    producidas: data.count
                })
                tablaProduccion(produccion)

            })

        }

    }

    //Funcion para que siempre la horas salgan ordenadas
    function tablaProduccion(produccion) {
        produccion.sort(function (a, b) {
            if (a.fecha > b.fecha) {
                return -1;
            }
            if (b.fecha > a.fecha) {
                return 1;
            }
            return 0;
        })
        //console.log(produccion)
        $("#tablaHora").empty();
        for (let i = 0; i < produccion.length; i++) {
            let hora = moment.unix(produccion[i].fecha).format("h:mm a")
            let horafinal = moment.unix(produccion[i].fecha).add(1, "hour").format("h:mm a")
            $("#tablaHora").prepend("<tr><th scope='row'>" + hora + " a " + horafinal + "</th> <td> " + produccion[i].producidas + "</td>")

        }

    }

    //Funcion para comparar los digitos de la ultima etiqueta escaneada contra la etiqueta escaneada

    function revisarNumerodeParte(nuevoSerial) {
        let ultimaEtiqueta = localStorage.getItem("ultimaEtiqueta")
        if (ultimaEtiqueta) {
            var numeroDepartePasado = ultimaEtiqueta.slice(0, 10)
        }
        let numeroDeparteNuevo = nuevoSerial.slice(0, 10)
        if (numeroDepartePasado === numeroDeparteNuevo) {
            //console.log("Son iguales");
        }
        else {
            $("#exampleModal").modal("show")
        }
    }

   

    //Funcion para sacar en que turno se esta
    function turnoActual() {
        let horaActual = moment().hour()
        let turno = ""
        if (horaActual >= 7 && horaActual <= 15) {
            turno = "Dia"
        }
        else {
            if (horaActual > 15 && horaActual <= 23) {
                turno = "Tarde"
            }
            else {
                turno = "Noche"
            }
        }
        return turno


    }
    

    //Funcion para sacar el día que esta
    function diaActual(){
        let diaActual=moment().day()
        return diaActual
    }

    // Grafica por turno 7 dias

    //* Se poner afuera la variable para que no muestre datos viejos.
    var myChart;


    function graficaProduccion(datosTurno1, datosTurno2, datosTurno3) {
        if (myChart) {
            myChart.destroy();
        }

        if (datosTurno1.length === 7 && datosTurno2.length === 7 && datosTurno3.length === 7) {
            let maximo = datosTurno1.concat(datosTurno2, datosTurno3)
            let mejorTurno = Math.max(...maximo)
            $("#mejorTurno").text(mejorTurno)
            let turno = turnoActual()
            let dia=diaActual()
            //console.log("El turno es " + turno)
            //console.log("Entro chart")
            if (turno === "Dia") {
                if(dia!=0){
                let produccionAhora = datosTurno1[dia-1]
                $("#turnoActual").text(produccionAhora)
                }
                else{
                    let produccionAhora = datosTurno1[dia+6]
                    $("#turnoActual").text(produccionAhora) 
                }
            }

            if (turno === "Tarde") {
                if(dia!=0){
                    let produccionAhora = datosTurno2[dia-1]
                    $("#turnoActual").text(produccionAhora)
                    }
                    else{
                        let produccionAhora = datosTurno2[dia+6]
                        $("#turnoActual").text(produccionAhora) 
                    }
            }

            if (turno === "Noche") {
                if(dia!=0){
                    let produccionAhora = datosTurno3[dia-1]
                    $("#turnoActual").text(produccionAhora)
                    }
                    else{
                        let produccionAhora = datosTurno3[dia+6]
                        $("#turnoActual").text(produccionAhora) 
                    }
            }
            var ctx = $("#myChart");
            myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"],
                    datasets: [{
                        label: "Turno 1",
                        data: datosTurno1,
                        backgroundColor: [
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                        ],
                        borderColor: [
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                        ],
                        borderWidth: 1
                    }, {
                        label: "Turno 2",
                        data: datosTurno2,
                        backgroundColor: [
                            "rgba(54, 162, 235, 0.2)",
                            "rgba(54, 162, 235, 0.2)",
                            "rgba(54, 162, 235, 0.2)",
                            "rgba(54, 162, 235, 0.2)",
                            "rgba(54, 162, 235, 0.2)",
                            "rgba(54, 162, 235, 0.2)",
                            "rgba(54, 162, 235, 0.2)"
                        ],
                        borderColor: [
                            "rgba(54,162,235,1)",
                            "rgba(54,162,235,1)",
                            "rgba(54,162,235,1)",
                            "rgba(54,162,235,1)",
                            "rgba(54,162,235,1)",
                            "rgba(54,162,235,1)",
                            "rgba(54,162,235,1)"
                        ],
                        borderWidth: 1
                    }, {
                        label: "Turno 3",
                        data: datosTurno3,
                        backgroundColor: [
                            "rgba(255, 99, 132, 0.2)",
                            "rgba(255, 99, 132, 0.2)",
                            "rgba(255, 99, 132, 0.2)",
                            "rgba(255, 99, 132, 0.2)",
                            "rgba(255, 99, 132, 0.2)",
                            "rgba(255, 99, 132, 0.2)",
                            "rgba(255, 99, 132, 0.2)",
                        ],
                        borderColor: [
                            "rgba(255, 99, 132, 1)",
                            "rgba(255, 99, 132, 1)",
                            "rgba(255, 99, 132, 1)",
                            "rgba(255, 99, 132, 1)",
                            "rgba(255, 99, 132, 1)",
                            "rgba(255, 99, 132, 1)",
                            "rgba(255, 99, 132, 1)",
                        ],
                        borderWidth: 1
                    }
                    ]
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            }
                        }]
                    },
                    animation: {
                        duration: 2000,
                        onProgress: function () {

                            $("#loadingTurno").hide()
                        },

                    }
                }
            });
        }
    }


    //Produccion Turno 1
    function produccionTurnos() {

        let datosTurno1 = [];
        let datosTurno2 = [];
        let datosTurno3 = [];
        let horaFinaldia = moment().startOf('isoweek').format("YYYY-MM-DD") + " 15:00:00"
        let horaInicialdia = moment(horaFinaldia).subtract(0, "day").format("YYYY-MM-DD") + " 07:00:00"
        //*Produccion Turno 2

        let horafinaltarde = moment().startOf('isoweek').format("YYYY-MM-DD") + " 23:00:00"
        let horainicialtarde = moment(horafinaltarde).subtract(0, "day").format("YYYY-MM-DD") + " 15:00:00"

        //* Produccion Turno 3
        let horafinalnoche = moment().startOf('isoweek').format("YYYY-MM-DD") + " 07:00:00"
        let horainicialnoche = moment(horafinalnoche).subtract(1, "day").format("YYYY-MM-DD") + " 23:00:00"

        for (let i = 0; i < 7; i++) {
            let fechainicialDia = moment(horaInicialdia).add(i, "day").format("YYYY-MM-DD") + " 07:00:00"
            let fechafinalDia = moment(horaFinaldia).add(i, "day").format("YYYY-MM-DD") + " 15:00:00"
            let fechaInicalDiax = moment(fechainicialDia).format("X");
            let fechaFinaldiax = moment(fechafinalDia).format("X");
            //Turno Tarde
            let fechainicialTarde = moment(horainicialtarde).add(i, "day").format("YYYY-MM-DD") + " 15:00:00"
            let fechafinalTarde = moment(horafinaltarde).add(i, "day").format("YYYY-MM-DD") + " 23:00:00"
            let fechaInicaltardex = moment(fechainicialTarde).format("X");
            let fechaFinaltardex = moment(fechafinalTarde).format("X")
            //Turno Noche
            let fechainicialNoche = moment(horainicialnoche).add(i, "day").format("YYYY-MM-DD") + " 23:00:00"
            let fechafinalNoche = moment(horafinalnoche).add(i, "day").format("YYYY-MM-DD") + " 07:00:00"
            let fechaInicalnochex = moment(fechainicialNoche).format("X");
            let fechaFinalnochex = moment(fechafinalNoche).format("X")

            $.when(

                $.get("/produccionhora/" + fechaInicalDiax + "/" + fechaFinaldiax, function (data) {
                    datosTurno1.splice(i, 0, data.count)
                    //console.log(datosTurno1)
                    //graficaProduccion(datosTurno1, datosTurno2, datosTurno3)

                }),

                $.get("/produccionhora/" + fechaInicaltardex + "/" + fechaFinaltardex, function (data) {
                    datosTurno2.splice(i, 0, data.count)
                    //console.log(datosTurno2)
                    //graficaProduccion(datosTurno1, datosTurno2, datosTurno3)

                }),

                $.get("/produccionhora/" + fechaInicalnochex + "/" + fechaFinalnochex, function (data) {
                    datosTurno3.splice(i, 0, data.count)
                    //console.log(datosTurno3)
                    //graficaProduccion(datosTurno1, datosTurno2, datosTurno3)


                })
            ).then(function () {
                graficaProduccion(datosTurno1, datosTurno2, datosTurno3)
            })

        }
    }


    //*Funcion para sacar la producción por semana

    function produccionPorsemana() {
        let datosSemana = [];
        let numSemana = [];
        let datos = [];
        //console.log("Inicio de semana " + moment().startOf("week").subtract(2,"weeks"))
        //console.log("Fin de semana " + moment().endOf("week"))
        for (let i = 9; i >= 0; i--) {
            //console.log("entro")
            let fechainicial = moment().startOf("week").subtract(i, "weeks").format("X")
            //console.log(fechainicial)
            let fecha = moment().startOf("week").subtract(i, "weeks")
            //console.log(fecha)
            let fechafinal = moment().endOf("week").subtract(i, "weeks").format("X")
            //console.log(fechafinal)
            numSemana.splice(9 - i, 0, moment(fecha).week())
            //console.log(fechainicial)
            $.when(
                $.get("/produccionhora/" + fechainicial + "/" + fechafinal, function (data) {
                    datos.push({
                        semana: moment(fecha).week(),
                        valor: data.count
                    })
                    //console.log(datos)

                    //console.log(moment(fechainicial).week())


                }),
            ).then(function () {

                if (datos.length === 10) {
                    // console.log(datos)
                    //console.log(numSemana)
                    for (let i = 0; i < numSemana.length; i++) {
                        for (let j = 0; j < datos.length; j++) {
                            if (numSemana[i] === datos[j].semana) {
                                datosSemana.push(datos[j].valor)
                            }
                        }
                    }
                    //console.log(datosSemana)
                    let mejorSemana = Math.max(...datosSemana)
                    $("#mejorSemana").text(mejorSemana)
                    let semanaActual = datosSemana[datosSemana.length - 1]
                    $("#semanaActual").text(semanaActual)
                    graficaProduccionsemana(datosSemana, numSemana)
                }
            })

        }

    }

    //* Se poner afuera la variable para que no muestre datos viejos.
    var myChart2;

    function graficaProduccionsemana(datosSemana, numSemana) {
        //console.log(datosSemana);
        if (myChart2) {
            myChart2.destroy();
        }

        if (datosSemana.length === 10) {
            //console.log("Entro chart2")
            var ctx2 = $("#myChart2");
            myChart2 = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: numSemana,
                    datasets: [{
                        label: "Production per Week",
                        data: datosSemana,
                        backgroundColor: [
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                            "rgba(75, 192, 192, 0.2)",
                        ],
                        borderColor: [
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                            'rgba(75,192,192,1)',
                        ],
                        borderWidth: 1
                    },
                    ]
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            }
                        }]
                    },
                    animation: {
                        duration: 2000,
                        onProgress: function () {

                            $("#loadingSemana").hide()
                        },

                    }
                }
            });
        }
    }

})