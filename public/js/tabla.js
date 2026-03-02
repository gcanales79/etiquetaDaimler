$(document).ready(function () {

    // ── 1. Inicializar DataTables solo si hay filas ────────────────────────
    if ($("#tablaConsulta tbody tr").length > 0) {
        $("#tablaConsulta").DataTable({
            language: {
                search:       "Buscar:",
                lengthMenu:   "Mostrar _MENU_ registros por página",
                info:         "Mostrando _START_ a _END_ de _TOTAL_ registros",
                infoEmpty:    "Mostrando 0 a 0 de 0 registros",
                infoFiltered: "(filtrado de _MAX_ registros totales)",
                zeroRecords:  "No hay datos que mostrar",
                paginate: {
                    first:    "Primero",
                    last:     "Último",
                    next:     "Siguiente",
                    previous: "Previo"
                }
            },
            order: [[3, "desc"]],  // Ordenar por Fecha Creación descendente
            pageLength: 10
        });
    }

    // ── 2. Botón Buscar ───────────────────────────────────────────────────
    $(document).on("click", "#buscarRegistros", function (event) {
        event.preventDefault();

        var cantidad = $("#cantidadAbuscar").val().trim();

        if (!cantidad || cantidad < 1) {
            $("#cantidadAbuscar").addClass("is-invalid");
            return;
        }
        $("#cantidadAbuscar").removeClass("is-invalid");

        window.location.href = "/tabla/" + cantidad;
    });

    // ── 3. Buscar con Enter ───────────────────────────────────────────────
    $(document).on("keydown", "#cantidadAbuscar", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            $("#buscarRegistros").trigger("click");
        }
    });

    // ── 4. Limpiar validación al escribir ─────────────────────────────────
    $(document).on("input", "#cantidadAbuscar", function () {
        $(this).removeClass("is-invalid");
    });

});