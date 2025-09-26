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
      $sort: { createdAt: -1 } // Latest first
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
    else if (status === "in-progress") acc.inProgress++;
    else if (status === "success") acc.success++;
    else if (status === "failed") acc.failed++;
    return acc;
  }, { total: 0, inQueue: 0, inProgress: 0, success: 0, failed: 0 });

  const queryTime = Date.now() - startTime;

  // Generate table data with optimized processing
  const tableData = allDocs
    .slice(0, 1000) // Limit initial display for performance
    .map((doc, i) => {
      const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
      const wacInfo = wacMap[String(doc.videoAppId)] || { appName: "Unknown App", appUrl: "-" };
      const status = doc.webhookResponse?.status || "unknown";
      
      const queuedFor = status === "in-queue" && createdAt
        ? formatDuration(Math.floor((Date.now() - createdAt.getTime()) / 1000))
        : "-";

      return {
        id: i + 1,
        driveId: doc._id ? doc._id.toString() : "-",
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

/**
 * Generate re-transcode data (in-queue videos only)
 */
async function generateRetranscodeData() {
  const startTime = Date.now();
  
  // Get only in-queue videos from last 3 months
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: since },
        "webhookResponse.status": "in-queue",
        appId: { $exists: true, $ne: null } // Ensure appId exists for re-transcoding
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $limit: 1000 // Reasonable limit
    }
  ];

  const inQueueDocs = await Drives.aggregate(pipeline);


  const queryTime = Date.now() - startTime;

  // Generate table data
  const tableData = inQueueDocs.map((doc, i) => {
    return {
      id: i + 1,
      driveId: doc._id ? doc._id.toString() : "-",
      wacId: doc.appId ? doc.appId.toString() : "-", // This is the correct WAC ID from appId field
      title: doc.title || "-",
      status: doc.webhookResponse?.status || "unknown"
    };
  });

  return {
    tableData,
    queryTime,
    totalRecords: inQueueDocs.length
  };
}

module.exports = { generateReportPage, generateRetranscodeData };