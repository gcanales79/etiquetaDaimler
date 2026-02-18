const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const path = require("path");
const fs = require("fs");
const db = require("../models");
const os = require("os");
const cloudinary = require('cloudinary').v2;


// Configure Cloudinary (Add these to your Heroku Config Vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

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
  // Use the local Monterrey date for labels
  const labels = rows.map((r) => {
    const d = new Date(r.day);
    // Adjusting for the UTC-6 offset manually if toLocaleDateString fails to shift correctly
    return d.toLocaleDateString("es-MX", { weekday: 'short', day: 'numeric' });
  });

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

  /*const image = await chartJSNodeCanvas.renderToBuffer(config);
  const filePath = path.join(chartsDir, fileName);
  await fs.promises.writeFile(filePath, image);
  
  return fileName; // Just return the name, the controller builds the URL*/

  // 1. Render to a Buffer instead of writing a file
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(config);

  // 2. Upload directly to Cloudinary using a Promise
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "production_charts", public_id: fileName.replace('.png', '') },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url); // This is the permanent HTTPS link
      }
    ).end(imageBuffer);
  });

}

module.exports = {
  generateWeeklyChart,
};
