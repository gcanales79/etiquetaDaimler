$(document).ready(function () {

    // ── 1. Inicializar DataTables ──────────────────────────────────────────
    if ($("#tablaConsulta tbody tr").length > 0) {
        $("#tablaConsulta").DataTable({
            language: {
                search:       "Filtrar resultados:",
                lengthMenu:   "Mostrar _MENU_ registros",
                info:         "Mostrando _START_ a _END_ de _TOTAL_ registros",
                infoEmpty:    "Mostrando 0 registros",
                infoFiltered: "(filtrado de _MAX_ registros totales)",
                zeroRecords:  "No se encontraron resultados",
                paginate: {
                    first:    "Primero",
                    last:     "Último",
                    next:     "Siguiente",
                    previous: "Anterior"
                }
            },
            order: [[0, "desc"]],
            pageLength: 10
        });
    }

    // ── 2. Botón Buscar — usa delegación de eventos para evitar conflicto con DataTables ──
    $(document).on("click", "#buscarSerial", function (event) {
        event.preventDefault();
        event.stopPropagation();   // Evita que DataTables intercepte el evento

        var numeroDeserie = $("#numeroDeserie").val().trim();

        if (!numeroDeserie) {
            $("#numeroDeserie").addClass("is-invalid");
            return;
        }
        $("#numeroDeserie").removeClass("is-invalid");

        window.location.href = "/consulta/" + encodeURIComponent(numeroDeserie);
    });

    // ── 3. Buscar también con Enter en el input ────────────────────────────
    // "keydown" en lugar de "keypress" — keypress está deprecado en navegadores modernos
    $(document).on("keydown", "#numeroDeserie", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();    // Evita que DataTables o el form reaccionen al Enter
            $("#buscarSerial").trigger("click");
        }
    });

    // ── 4. Limpiar validación al escribir ────────────────────────────────
    $(document).on("input", "#numeroDeserie", function () {
        $(this).removeClass("is-invalid");
    });

});