$(document).on("click", "#searchButton", function(event) {
  event.preventDefault();
  //console.log("Search button clicked");
  const db = document.getElementById("dbSelect").value;
  const serial = document.getElementById("serialInput").value;
  //console.log("Database:", db);
  //console.log("Serial:", serial);
  $.get(`/search-serial/${db}/${serial}`, () => {}).then((data) => {
    const { serialData, code } = data;
    //console.log(serialData);
    //console.log("Response code:", code);
    if (code === "200") {
      $("#resultsTable tbody").empty();
      if (serialData.length > 0) {
        serialData.forEach((item) => {
          const newRow = $("<tr>");
          const serialCell = $("<td>").text(item.serial);
          const numeroCell = $("<td>").text(item.numero_parte);
          const serieCell = $("<td>").text(item.numero_serie);
          const repetidaCell = $("<td>").text(item.repetida ? "Sí" : "No");
          //const createdAtCell = $("<td>").text(item.createdAt);
          const createdAt = new Date(item.createdAt);
          const createdAtFormatted = createdAt
            .toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            .replace(".", "");
          const createdAtTime = createdAt.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const createdAtCell = $("<td>")
            .addClass("text-nowrap")
            .text(`${createdAtFormatted} ${createdAtTime}`);
          const updatedAt = new Date(item.updatedAt);
          const updatedAtFormatted = updatedAt
            .toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            .replace(".", "");
          const updatedAtTime = updatedAt.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const updatedAtCell = $("<td>")
            .addClass("text-nowrap")
            .text(`${updatedAtFormatted} ${updatedAtTime}`);
          // Append cells to the new row
          newRow
            .append(serialCell)
            .append(numeroCell)
            .append(serieCell)
            .append(repetidaCell)
            .append(createdAtCell)
            .append(updatedAtCell);
          $("#resultsTable").append(newRow);
        });
      } else {
        $("#resultsTable tbody").append(
          $("<tr>").append(
            $("<td>")
              .attr("colspan", 6)
              .addClass("text-center")
              .text("No se encontraron resultados")
          )
        );
      }
    } else {
      alert("Error fetching data: " + code);
    }
  });
});

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("copyTableBtn").addEventListener("click", function() {
    const table = document.getElementById("resultsTable");
    let text = "";
    // Get headers
    const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.innerText.trim());
    text += headers.join("\t") + "\n";
    // Get rows
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll("td")).map(td => td.innerText.trim());
      text += cells.join("\t") + "\n";
    });
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      // Optional: show feedback
      const btn = document.getElementById("copyTableBtn");
      btn.innerText = "¡Copiado!";
      setTimeout(() => { btn.innerText = "Copiar resultados"; }, 1500);
    });
  });
});
