const { getConnection } = require("../db/connection");
const wacSchema = require("../db/wacConfigModel").schema;
const driveSchema = require("../db/driveModel").schema;
const { Parser } = require("json2csv");

// DB connections
const wacConn = getConnection("wacProd");
const WacConfig = wacConn.model("wac_configs", wacSchema);

const driveConn = getConnection("driveProd");
const Drives = driveConn.model("drives", driveSchema);

// Helpers
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0 sec";
  seconds = Math.floor(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${d ? d + "d " : ""}${h ? h + "h " : ""}${m ? m + "m " : ""}${s ? s + "s" : ""}`.trim();
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return "-";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}

/**
 * Generate HTML + CSV Report (3 months data)
 * - Filters out invalid docs (duration=0 and size<1KB) for EMAIL only
 * - Keeps all data in CSV
 */
async function generateReports({ onlyInQueue = false } = {}) {
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  // Use aggregation pipeline for better performance
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: since },
        ...(onlyInQueue
          ? { "webhookResponse.status": "in-queue", encodeId: { $exists: true, $ne: "" } }
          : {}),
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $limit: 5000 // Reasonable limit for email reports
    }
  ];

  const allDocs = await Drives.aggregate(pipeline);

  // Lookup WAC configs
  const appIds = [...new Set(allDocs.map((d) => String(d.videoAppId)).filter(Boolean))];
  const wacConfigs = await WacConfig.find(
    { videoAppId: { $in: appIds } },
    { videoAppId: 1, appName: 1, appUrl: 1 } // Only fetch needed fields
  ).lean();

  const wacMap = {};
  wacConfigs.forEach((cfg) => {
    wacMap[String(cfg.videoAppId)] = {
      appName: cfg.appName || "-",
      appUrl: cfg.appUrl || "-",
    };
  });

  //  Filter for EMAIL only: remove docs with size < 1KB & duration = 0
  const emailDocs = allDocs.filter((d) => {
    const sizeBytes = d.videoMetadata?.size || 0;
    const duration = d.videoMetadata?.duration || 0;
    return !(duration === 0 && sizeBytes < 1024);
  });

  const emailRows = emailDocs.slice(0, 50); // last 50 valid docs

  //  Build HTML for email
  const rows = emailRows
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

          <td>${doc.encodeId || "-"}</td>
          <td>${doc.title || "-"}</td>
          <td>${formatDuration(doc.videoMetadata?.duration || 0)}</td>
          <td>${formatSize(doc.videoMetadata?.size || 0)}</td>
          <td>${createdAt ? createdAt.toLocaleString() : "-"}</td>
          <td>${doc.webhookResponse?.status || "-"}</td>
          <td>${queuedFor}</td>

        </tr>
      `;
    })
    .join("");

  const htmlReport = `
    <h2>Video Transcoding Report (Last 3 Months)</h2>
    <p>Showing ${emailRows.length} of ${allDocs.length} videos (filtered for valid data)</p>
    <table border="1" cellpadding="6" cellspacing="0"
           style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; width: 100%;">
      <thead style="background: #f2f2f2;">
        <tr>
          <th>Sn no</th>
          <th>AppId</th>
          <th>AppName</th>
          <th>Video id (encodeId)</th>
          <th>Title</th>
          <th>Duration</th>
          <th>Size</th>
          <th>CreateAt</th>
          <th>Status</th>
          <th>Queued For</th>

        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="12">No valid videos found</td></tr>`}</tbody>
    </table>
  `;


  const csvData = allDocs.map((doc, i) => {
    const wacInfo = wacMap[String(doc.videoAppId)] || { appName: "-", appUrl: "-" };
    const createdAt = doc.createdAt ? new Date(doc.createdAt).toLocaleString() : "-";
    const queuedFor =
      doc.webhookResponse?.status === "in-queue" && doc.createdAt
        ? formatDuration(Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 1000))
        : "-";

    return {
      SN: i + 1,
      DriveId: doc._id ? doc._id.toString() : "-",
      AppId: doc.videoAppId || "-",
      AppName: wacInfo.appName,
      AppUrl: wacInfo.appUrl,
      EncodeId: doc.encodeId || "-",
      Title: doc.title || "-",
      Duration: formatDuration(doc.videoMetadata?.duration || 0),
      Size: formatSize(doc.videoMetadata?.size || 0),
      CreatedAt: createdAt,
      Status: doc.webhookResponse?.status || "-",
      QueuedFor: queuedFor,
      SourceUrl: doc.webhookResponse?.sourceUrl || "-",
    };
  });

  const parser = new Parser();
  const csv = parser.parse(csvData);

  return { htmlReport, csv };
}

module.exports = { generateReports, formatDuration, formatSize };
