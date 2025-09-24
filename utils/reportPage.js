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
 * Generate optimized report data (JSON only)
 */
async function generateReportPage() {
  const startTime = Date.now();
  
  // Optimized query with proper indexing
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  // Use aggregation pipeline for better performance
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: since }
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $limit: 10000 // Reasonable limit for performance
    }
  ];

  const allDocs = await Drives.aggregate(pipeline);

  // Get unique app IDs efficiently
  const appIds = [...new Set(allDocs.map(d => String(d.videoAppId)).filter(Boolean))];
  
  // Batch fetch WAC configs
  const wacConfigs = await WacConfig.find(
    { videoAppId: { $in: appIds } },
    { videoAppId: 1, appName: 1, appUrl: 1 } // Only fetch needed fields
  ).lean();

  // Create lookup map
  const wacMap = {};
  wacConfigs.forEach(cfg => {
    wacMap[String(cfg.videoAppId)] = {
      appName: cfg.appName || "Unknown App",
      appUrl: cfg.appUrl || "-"
    };
  });

  // Calculate summary stats efficiently
  const stats = allDocs.reduce((acc, doc) => {
    const status = doc.webhookResponse?.status;
    acc.total++;
    if (status === "in-queue") acc.inQueue++;
    else if (status === "success") acc.success++;
    else if (status === "failed") acc.failed++;
    else acc.pending++;
    return acc;
  }, { total: 0, inQueue: 0, success: 0, failed: 0, pending: 0 });

  const queryTime = Date.now() - startTime;

  // Generate table data with optimized processing
  const tableData = allDocs
    .slice(0, 1000) // Limit initial display for performance
    .map((doc, i) => {
      const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
      const wacInfo = wacMap[String(doc.videoAppId)] || { appName: "Unknown App", appUrl: "-" };
      const status = doc.webhookResponse?.status || "pending";
      
      const queuedFor = status === "in-queue" && createdAt
        ? formatDuration(Math.floor((Date.now() - createdAt.getTime()) / 1000))
        : "-";

      return {
        id: i + 1,
        videoAppId: doc.videoAppId || "-",
        appName: wacInfo.appName,
        appUrl: wacInfo.appUrl,
        encodeId: doc.encodeId || "-",
        title: doc.title || "-",
        duration: formatDuration(doc.videoMetadata?.duration || 0),
        size: formatSize(doc.videoMetadata?.size || 0),
        createdAt: createdAt ? createdAt.toLocaleString() : "-",
        status: status,
        queuedFor: queuedFor,
        sourceUrl: doc.webhookResponse?.sourceUrl || null
      };
    });

  return {
    stats,
    tableData,
    queryTime,
    totalRecords: allDocs.length
  };
}

module.exports = { generateReportPage };