const { getConnection } = require("../db/connection");
const wacSchema = require("../db/wacConfigModel").schema;
const driveSchema = require("../db/driveModel").schema;
const { formatDuration, formatSize } = require("./reporter");

// DB connections
const wacConn = getConnection("wacProd");
const WacConfig = wacConn.model("wac_configs", wacSchema);

const driveConn = getConnection("driveProd");
const Drives = driveConn.model("drives", driveSchema);

/**
 * Generate full HTML report for /report page
 */
async function generateReportPage() {
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const allDocs = await Drives.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .lean();

  // Summary counts
  const inQueue = allDocs.filter((d) => d.webhookResponse?.status === "in-queue").length;
  const success = allDocs.filter((d) => d.webhookResponse?.status === "success").length;
  const failed = allDocs.filter((d) => d.webhookResponse?.status === "failed").length;

  // WAC configs
  const appIds = [...new Set(allDocs.map((d) => String(d.videoAppId)).filter(Boolean))];
  const wacConfigs = await WacConfig.find({ videoAppId: { $in: appIds } }).lean();

  const wacMap = {};
  wacConfigs.forEach((cfg) => {
    wacMap[String(cfg.videoAppId)] = {
      appName: cfg.appName || "-",
      appUrl: cfg.appUrl || "-",
    };
  });

  // Rows
  const rows = allDocs
    .map((doc, i) => {
      const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
      const wacInfo = wacMap[String(doc.videoAppId)] || { appName: "-", appUrl: "-" };
      const queuedFor =
        doc.webhookResponse?.status === "in-queue" && createdAt
          ? formatDuration(Math.floor((Date.now() - createdAt.getTime()) / 1000))
          : "-";

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${doc.videoAppId || "-"}</td>
          <td>${wacInfo.appName}</td>
          <td>${wacInfo.appUrl}</td>
          <td>${doc.encodeId || "-"}</td>
          <td>${doc.title || "-"}</td>
          <td>${formatDuration(doc.videoMetadata?.duration || 0)}</td>
          <td>${formatSize(doc.videoMetadata?.size || 0)}</td>
          <td>${createdAt ? createdAt.toLocaleString() : "-"}</td>
          <td>${doc.webhookResponse?.status || "-"}</td>
          <td>${queuedFor}</td>
          <td>${doc.webhookResponse?.sourceUrl || "-"}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <h2>Video Transcoding Report (Last 3 Months)</h2>
    <p>
      Total: <b>${allDocs.length}</b> | 
      In-Queue: <b>${inQueue}</b> | 
      Success: <b>${success}</b> | 
      Failed: <b>${failed}</b>
    </p>

    <!--  Search + Filter -->
    <div style="margin-bottom: 10px;">
      <input type="text" id="searchBox" placeholder="Search..." 
        style="padding:5px;width:300px;font-size:14px;" onkeyup="filterTable()" />

      <select id="statusFilter" onchange="filterTable()" 
        style="padding:5px;margin-left:10px;font-size:14px;">
        <option value="">All Status</option>
        <option value="in-queue">In-Queue</option>
        <option value="success">Success</option>
        <option value="failed">Failed</option>
      </select>
    </div>

    <table id="reportTable" border="1" cellpadding="6" cellspacing="0"
           style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; width: 100%;">
      <thead style="background: #f2f2f2;">
        <tr>
          <th>Sn no</th>
          <th>AppId</th>
          <th>AppName</th>
          <th>AppUrl</th>
          <th>Video id (encodeId)</th>
          <th>Title</th>
          <th>Duration</th>
          <th>Size</th>
          <th>CreateAt</th>
          <th>Status</th>
          <th>Queued For</th>
          <th>SourceUrl</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="12">No videos found</td></tr>`}</tbody>
    </table>

    <script>
      function filterTable() {
        const searchVal = document.getElementById("searchBox").value.toLowerCase();
        const statusVal = document.getElementById("statusFilter").value.toLowerCase();
        const table = document.getElementById("reportTable");
        const trs = table.getElementsByTagName("tr");

        for (let i = 1; i < trs.length; i++) {
          let rowText = trs[i].innerText.toLowerCase();
          let statusText = trs[i].cells[9]?.innerText.toLowerCase() || "";
          let matchesSearch = rowText.includes(searchVal);
          let matchesStatus = !statusVal || statusText === statusVal;

          trs[i].style.display = matchesSearch && matchesStatus ? "" : "none";
        }
      }
    </script>
  `;
}

module.exports = { generateReportPage };
