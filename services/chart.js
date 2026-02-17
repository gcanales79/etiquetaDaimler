const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const path = require("path");
const fs = require("fs");
const db = require("../models");
const os = require("os");

// Chart size
const width = 900;
const height = 500;

// Chart renderer
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: "white",
});

// Public charts folder
const chartsDir = path.join(__dirname, "../public/charts");
//const chartsDir = os.tmpdir(); // Use temp directory for charts in production

// Ensure folder exists
if (!fs.existsSync(chartsDir)) {
  fs.mkdirSync(chartsDir, { recursive: true });
}

/**
 * Generate weekly production chart
 */
async function generateWeeklyChart(rows, fileName) {
  console.log("Weekly rows:", rows);
  // Prepare labels
  const labels = rows.map((r) => new Date(r.day).toLocaleDateString("es-MX"));

  const dayShift = rows.map((r) => r.shift_day);
  const afternoonShift = rows.map((r) => r.shift_afternoon);
  const nightShift = rows.map((r) => r.shift_night);
  //const totals = rows.map(r => r.total);
  const totals = rows.map((r) =>
    Number(r.total) === 0 ? null : Number(r.total),
  );
  const weeklyTotal = totals.reduce((a, b) => a + b, 0);

  // Chart config
  const config = {
    type: "bar",

    data: {
      labels,

      datasets: [
        {
          label: "Day Shift",
          data: dayShift,
          backgroundColor: "#4CAF50",
        },
        {
          label: "Afternoon Shift",
          data: afternoonShift,
          backgroundColor: "#FF9800",
        },
        {
          label: "Night Shift",
          data: nightShift,
          backgroundColor: "#3F51B5",
        },
        {
          label: "Total",
          data: totals,
          type: "line",
          borderColor: "#000000",
          borderWidth: 3,
          fill: false,
          tension: 0,
          spanGaps: true,
        },
      ],
    },

    options: {
      responsive: false,

      plugins: {
        title: {
          display: true,
          text: `Weekly Production by Shift (Total: ${weeklyTotal})`,
          font: {
            size: 18,
          },
        },

        legend: {
          position: "top",
        },
      },

      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 50,
          },
        },
      },
    },
  };

  // Render image
  const image = await chartJSNodeCanvas.renderToBuffer(config);

  // Save file

  const filePath = path.join(chartsDir, fileName);

  await fs.promises.writeFile(filePath, image);

  console.log("Chart saved:", filePath);

  // Return public URL path
  return `/charts/${fileName}`;
}

module.exports = {
  generateWeeklyChart,
};
