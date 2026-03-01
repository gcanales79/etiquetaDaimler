$(document).on("click", "#searchButton", function(event) {
  event.preventDefault();

  const db     = document.getElementById("dbSelect").value;
  const serial = document.getElementById("serialInput").value.trim();

  if (!serial) return;

  // Feedback visual mientras carga
  const btn = document.getElementById("searchButton");
  btn.disabled = true;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"
      style="animation:spin .7s linear infinite">
      <circle cx="12" cy="12" r="9" stroke-opacity=".25"/>
      <path d="M12 3a9 9 0 0 1 9 9"/>
    </svg>
    Buscando…`;

  $.get(`/search-serial/${db}/${serial}`, () => {}).then((data) => {
    const { serialData, code } = data;
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
        <circle cx="11" cy="11" r="7"/><path d="M16.5 16.5l4 4"/>
      </svg>
      Buscar`;

    if (code === "200") {
      $("#resultsTable tbody").empty();

      if (serialData.length > 0) {
        serialData.forEach((item) => {
          const newRow = $("<tr>");

          // Formatear fechas
          function formatDate(dateStr) {
            const d = new Date(dateStr);
            const date = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
            const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
            return `${date} ${time}`;
          }

          // Badge para columna Repetida
          const repetidaBadge = item.repetida
            ? `<span class="bs-badge bs-badge--si">Sí</span>`
            : `<span class="bs-badge bs-badge--no">No</span>`;

          newRow
            .append($("<td>").text(item.serial))
            .append($("<td>").text(item.numero_parte))
            .append($("<td>").text(item.numero_serie))
            .append($("<td>").addClass("text-center").html(repetidaBadge))
            .append($("<td>").addClass("text-nowrap").text(formatDate(item.createdAt)))
            .append($("<td>").addClass("text-nowrap").text(formatDate(item.updatedAt)));

          $("#resultsTable tbody").append(newRow);
        });
      } else {
        $("#resultsTable tbody").append(
          $("<tr>").append(
            $("<td>").attr("colspan", 6).addClass("text-center")
              .css({ padding: "32px", color: "var(--slate-400)", fontStyle: "italic" })
              .text("No se encontraron resultados para este serial")
          )
        );
      }
    } else {
      alert("Error al obtener datos: " + code);
    }
  });
});

// Copiar tabla al portapapeles
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("copyTableBtn").addEventListener("click", function() {
    const table = document.getElementById("resultsTable");
    let text = "";

    const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.innerText.trim());
    text += headers.join("\t") + "\n";

    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll("td")).map(td => td.innerText.trim());
      text += cells.join("\t") + "\n";
    });

    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById("copyTableBtn");
      btn.classList.add("bs-copy-btn--copied");
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        ¡Copiado!`;
      setTimeout(() => {
        btn.classList.remove("bs-copy-btn--copied");
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copiar resultados`;
      }, 1500);
    });
  });

  // Permitir buscar con Enter en el input
  document.getElementById("serialInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("searchButton").click();
    }
  });
});