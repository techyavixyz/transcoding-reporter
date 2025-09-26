const express = require("express");
const bodyParser = require("body-parser");
const { generateReportPage } = require("./utils/reportPage");
const { generateRetranscodeData } = require("./utils/reportPage");
const { initializeScheduler } = require("./utils/cronScheduler");
const config = require("./config");
const { getConnection } = require("./db/connection");
require("./environment/setEnv")();

// Server-side data caching
let cachedReportData = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

// Function to update cache
async function updateCache() {
  try {
    console.log("🔄 Updating report cache...");
    const startTime = Date.now();
    cachedReportData = await generateReportPage();
    lastCacheUpdate = Date.now();
    const updateTime = Date.now() - startTime;
    console.log(`✅ Cache updated successfully in ${updateTime}ms`);
  } catch (error) {
    console.error("❌ Failed to update cache:", error.message);
  }
}

// Initialize cache and set up periodic updates
async function initializeCache() {
  await updateCache(); // Initial cache load
  
  // Update cache every 2 minutes
  setInterval(updateCache, CACHE_DURATION);
  console.log("🕒 Cache refresh scheduled every 2 minutes");
}

console.log("ENV CHECK:", {
  SMTP_USER: process.env.AWS_SES_SMTP_USER ? "LOADED" : "MISSING",
  SCHEDULE_MODE: config.schedule.mode,
  SCHEDULE_TYPE: config.schedule.type,
  SCHEDULE_VALUE: config.schedule.value,
  CRON_EXPRESSION: config.schedule.cronExpression,
});

// Connect DBs
getConnection("wacProd");
getConnection("driveProd");

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));


app.get("/", (req, res) => {
  const welcomeHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Video Transcoding Reporter</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                color: #333;
            }
            .container {
                background: white;
                border-radius: 15px;
                padding: 40px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 600px;
                margin: 20px;
            }
            h1 {
                color: #4a5568;
                margin-bottom: 20px;
                font-size: 2.5em;
            }
            .subtitle {
                color: #718096;
                font-size: 1.2em;
                margin-bottom: 30px;
            }
            .links {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-top: 30px;
            }
            .link-button {
                display: inline-block;
                padding: 12px 24px;
                background: #4299e1;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                transition: background 0.3s ease;
                font-weight: bold;
            }
            .link-button:hover {
                background: #3182ce;
            }
            .info {
                background: #f7fafc;
                padding: 20px;
                border-radius: 8px;
                margin-top: 20px;
                text-align: left;
            }
            .info h3 {
                margin-top: 0;
                color: #4a5568;
            }
            .endpoints {
                list-style: none;
                padding: 0;
            }
            .endpoints li {
                padding: 5px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .endpoints li:last-child {
                border-bottom: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1> Video Transcoding Reporter</h1>
            <div class="subtitle">Welcome to the automated video transcoding monitoring system</div>
            
            <div class="links">
                <a href="/report" class="link-button"> View Live Report</a>

            </div>

            <div class="info">
                <h3> Available Endpoints:</h3>
                <ul class="endpoints">
                    <li><strong>GET /</strong> - This welcome page</li>
                    <li><strong>GET /report</strong> - Generate and view transcoding report</li>
                </ul>
            </div>

            <div style="margin-top: 20px; color: #718096; font-size: 0.9em;">
                System Status: <span style="color: #48bb78;">✅ Operational</span>
            </div>
        </div>
    </body>
    </html>
  `;
  res.type("html").send(welcomeHtml);
});

// ---------------------- API ---------------------- //
app.get("/emails", (req, res) => {
  res.json({ 
    recipients: config.recipients, 
    bcc: config.bcc,
    total: config.recipients.length + config.bcc.length
  });
});

app.post("/emails/add", (req, res) => {
  const { recipients, bcc } = req.body;
  
  if (!recipients && !bcc) {
    return res.status(400).json({ error: "Please provide recipients or bcc emails to add" });
  }
  
  if (recipients) config.setRecipients([...new Set([...config.recipients, ...recipients])]);
  if (bcc) config.setBcc([...new Set([...config.bcc, ...bcc])]);
  
  res.json({ 
    message: "Emails added successfully",
    recipients: config.recipients, 
    bcc: config.bcc,
    total: config.recipients.length + config.bcc.length
  });
});

app.post("/emails/remove", (req, res) => {
  const { recipients, bcc } = req.body;
  
  if (!recipients && !bcc) {
    return res.status(400).json({ error: "Please provide recipients or bcc emails to remove" });
  }
  
  if (recipients) config.setRecipients(config.recipients.filter((r) => !recipients.includes(r)));
  if (bcc) config.setBcc(config.bcc.filter((b) => !bcc.includes(b)));
  
  res.json({ 
    message: "Emails removed successfully",
    recipients: config.recipients, 
    bcc: config.bcc,
    total: config.recipients.length + config.bcc.length
  });
});

// Email management page
app.get("/email", (req, res) => {
  res.sendFile(__dirname + "/public/email.html");
});

// Manual trigger (for browser)
app.get("/report", async (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Re-transcode page
app.get("/retranscode", (req, res) => {
  res.sendFile(__dirname + "/public/retranscode.html");
});

// API endpoint for re-transcode data
app.get("/api/retranscode", async (req, res) => {
  try {
    const retranscodeData = await generateRetranscodeData();
    res.json(retranscodeData);
  } catch (err) {
    console.error("❌ Re-transcode API error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint for report data
app.get("/api/report", async (req, res) => {
  try {
    // Check if cache is valid
    const now = Date.now();
    const cacheAge = now - lastCacheUpdate;
    
    if (!cachedReportData || cacheAge > CACHE_DURATION) {
      console.log("⚠️ Cache expired or missing, updating...");
      await updateCache();
    }
    
    // Add cache info to response
    const responseData = {
      ...cachedReportData,
      cacheInfo: {
        lastUpdated: new Date(lastCacheUpdate).toLocaleString(),
        cacheAge: Math.floor(cacheAge / 1000), // in seconds
        nextUpdate: Math.floor((CACHE_DURATION - cacheAge) / 1000) // seconds until next update
      }
    };
    
    res.json(responseData);
  } catch (err) {
    console.error("❌ API error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ------------------ Start ------------------ //
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(` API + Reporter running at http://localhost:${PORT}`);
  console.log(` Access the dashboard at: http://localhost:${PORT}`);
  console.log(` View reports at: http://localhost:${PORT}/report`);
  console.log(` Manage emails at: http://localhost:${PORT}/emails`);
  
  // Initialize cache system
  initializeCache();
  
  // Initialize scheduler
  initializeScheduler();
});