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
 * Generate optimized HTML report for /report page with stunning UI
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

  // Generate table rows with optimized rendering
  const rows = allDocs
    .slice(0, 1000) // Limit initial display for performance
    .map((doc, i) => {
      const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
      const wacInfo = wacMap[String(doc.videoAppId)] || { appName: "Unknown App", appUrl: "-" };
      const status = doc.webhookResponse?.status || "pending";
      
      const queuedFor = status === "in-queue" && createdAt
        ? formatDuration(Math.floor((Date.now() - createdAt.getTime()) / 1000))
        : "-";

      const statusClass = {
        'success': 'status-success',
        'failed': 'status-failed',
        'in-queue': 'status-queue',
        'pending': 'status-pending'
      }[status] || 'status-pending';

      return `
        <tr class="table-row" data-status="${status}">
          <td class="text-center">${i + 1}</td>
          <td class="font-mono text-sm">${doc.videoAppId || "-"}</td>
          <td class="font-medium">${wacInfo.appName}</td>
          <td class="text-sm text-gray-600">${wacInfo.appUrl}</td>
          <td class="font-mono text-sm">${doc.encodeId || "-"}</td>
          <td class="max-w-xs truncate" title="${doc.title || '-'}">${doc.title || "-"}</td>
          <td class="text-center">${formatDuration(doc.videoMetadata?.duration || 0)}</td>
          <td class="text-center">${formatSize(doc.videoMetadata?.size || 0)}</td>
          <td class="text-sm">${createdAt ? createdAt.toLocaleString() : "-"}</td>
          <td class="text-center">
            <span class="status-badge ${statusClass}">${status}</span>
          </td>
          <td class="text-center">${queuedFor}</td>
          <td class="text-sm text-blue-600 hover:text-blue-800">
            ${doc.webhookResponse?.sourceUrl ? 
              `<a href="${doc.webhookResponse.sourceUrl}" target="_blank" class="underline">View</a>` : 
              "-"
            }
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Video Transcoding Dashboard</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #1a202c;
            }

            .dashboard-container {
                max-width: 100%;
                margin: 0 auto;
                padding: 20px;
            }

            .header {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 30px;
                margin-bottom: 30px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .header h1 {
                font-size: 2.5rem;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .header .subtitle {
                color: #64748b;
                font-size: 1.1rem;
                margin-bottom: 20px;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 25px;
            }

            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 15px;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .stat-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            }

            .stat-number {
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 5px;
            }

            .stat-label {
                color: #64748b;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .stat-total .stat-number { color: #3b82f6; }
            .stat-queue .stat-number { color: #f59e0b; }
            .stat-success .stat-number { color: #10b981; }
            .stat-failed .stat-number { color: #ef4444; }
            .stat-pending .stat-number { color: #8b5cf6; }

            .controls {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 25px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .controls-row {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                align-items: center;
            }

            .search-box, .filter-select {
                padding: 12px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-size: 14px;
                transition: all 0.3s ease;
                background: white;
            }

            .search-box {
                flex: 1;
                min-width: 300px;
                padding-left: 45px;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'%3E%3C/path%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: 15px center;
                background-size: 20px;
            }

            .search-box:focus, .filter-select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .filter-select {
                min-width: 150px;
            }

            .performance-info {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 10px 20px;
                border-radius: 10px;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .table-container {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .table-wrapper {
                overflow-x: auto;
                max-height: 70vh;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
            }

            thead {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                position: sticky;
                top: 0;
                z-index: 10;
            }

            th {
                padding: 15px 12px;
                text-align: left;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-size: 12px;
            }

            .table-row {
                transition: all 0.2s ease;
                border-bottom: 1px solid #f1f5f9;
            }

            .table-row:hover {
                background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                transform: scale(1.001);
            }

            td {
                padding: 12px;
                vertical-align: middle;
            }

            .status-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .status-success {
                background: #dcfce7;
                color: #166534;
            }

            .status-failed {
                background: #fef2f2;
                color: #991b1b;
            }

            .status-queue {
                background: #fef3c7;
                color: #92400e;
            }

            .status-pending {
                background: #f3f4f6;
                color: #374151;
            }

            .text-center { text-align: center; }
            .font-mono { font-family: 'Monaco', 'Menlo', monospace; }
            .font-medium { font-weight: 500; }
            .text-sm { font-size: 0.875rem; }
            .text-gray-600 { color: #4b5563; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-800 { color: #1e40af; }
            .max-w-xs { max-width: 20rem; }
            .truncate { 
                overflow: hidden; 
                text-overflow: ellipsis; 
                white-space: nowrap; 
            }
            .underline { text-decoration: underline; }

            .loading {
                display: none;
                text-align: center;
                padding: 40px;
                color: #64748b;
            }

            .spinner {
                display: inline-block;
                width: 30px;
                height: 30px;
                border: 3px solid #f3f4f6;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 10px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .no-results {
                text-align: center;
                padding: 60px 20px;
                color: #64748b;
                display: none;
            }

            .no-results i {
                font-size: 4rem;
                margin-bottom: 20px;
                opacity: 0.5;
            }

            @media (max-width: 768px) {
                .dashboard-container {
                    padding: 10px;
                }
                
                .header h1 {
                    font-size: 2rem;
                }
                
                .controls-row {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .search-box {
                    min-width: auto;
                }
                
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
        </style>
    </head>
    <body>
        <div class="dashboard-container">
            <div class="header">
                <h1>
                    <i class="fas fa-video"></i>
                    Video Transcoding Dashboard
                </h1>
                <div class="subtitle">
                    Real-time monitoring and analytics for video processing pipeline
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card stat-total">
                        <div class="stat-number">${stats.total.toLocaleString()}</div>
                        <div class="stat-label">Total Videos</div>
                    </div>
                    <div class="stat-card stat-queue">
                        <div class="stat-number">${stats.inQueue.toLocaleString()}</div>
                        <div class="stat-label">In Queue</div>
                    </div>
                    <div class="stat-card stat-success">
                        <div class="stat-number">${stats.success.toLocaleString()}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-card stat-failed">
                        <div class="stat-number">${stats.failed.toLocaleString()}</div>
                        <div class="stat-label">Failed</div>
                    </div>
                    <div class="stat-card stat-pending">
                        <div class="stat-number">${stats.pending.toLocaleString()}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                </div>
            </div>

            <div class="controls">
                <div class="controls-row">
                    <input type="text" id="searchBox" class="search-box" 
                           placeholder="Search by title, app name, encode ID..." />
                    
                    <select id="statusFilter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="in-queue">In Queue</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                    </select>
                    
                    <div class="performance-info">
                        <i class="fas fa-tachometer-alt"></i>
                        Query: ${queryTime}ms | Showing: ${Math.min(1000, allDocs.length)} of ${stats.total.toLocaleString()}
                    </div>
                </div>
            </div>

            <div class="table-container">
                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    Filtering results...
                </div>
                
                <div class="table-wrapper">
                    <table id="reportTable">
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>App ID</th>
                                <th>App Name</th>
                                <th>App URL</th>
                                <th>Encode ID</th>
                                <th>Title</th>
                                <th>Duration</th>
                                <th>Size</th>
                                <th>Created</th>
                                <th>Status</th>
                                <th>Queued For</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            ${rows || '<tr><td colspan="12" class="text-center" style="padding: 40px;">No videos found</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <div class="no-results" id="noResults">
                    <i class="fas fa-search"></i>
                    <h3>No results found</h3>
                    <p>Try adjusting your search criteria or filters</p>
                </div>
            </div>
        </div>

        <script>
            let filterTimeout;
            const searchBox = document.getElementById("searchBox");
            const statusFilter = document.getElementById("statusFilter");
            const tableBody = document.getElementById("tableBody");
            const loading = document.getElementById("loading");
            const noResults = document.getElementById("noResults");
            
            function showLoading() {
                loading.style.display = "block";
                tableBody.style.opacity = "0.5";
            }
            
            function hideLoading() {
                loading.style.display = "none";
                tableBody.style.opacity = "1";
            }

            function filterTable() {
                clearTimeout(filterTimeout);
                showLoading();
                
                filterTimeout = setTimeout(() => {
                    const searchVal = searchBox.value.toLowerCase().trim();
                    const statusVal = statusFilter.value.toLowerCase();
                    const rows = tableBody.getElementsByTagName("tr");
                    let visibleCount = 0;

                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const rowText = row.innerText.toLowerCase();
                        const statusText = row.dataset.status || "";
                        
                        const matchesSearch = !searchVal || rowText.includes(searchVal);
                        const matchesStatus = !statusVal || statusText === statusVal;
                        const shouldShow = matchesSearch && matchesStatus;
                        
                        row.style.display = shouldShow ? "" : "none";
                        if (shouldShow) visibleCount++;
                    }
                    
                    // Show/hide no results message
                    noResults.style.display = visibleCount === 0 ? "block" : "none";
                    
                    hideLoading();
                }, 300);
            }

            // Event listeners with debouncing
            searchBox.addEventListener("input", filterTable);
            statusFilter.addEventListener("change", filterTable);
            
            // Auto-refresh every 30 seconds
            setInterval(() => {
                if (!searchBox.value && !statusFilter.value) {
                    location.reload();
                }
            }, 30000);
            
            console.log("🚀 Dashboard loaded successfully!");
        </script>
    </body>
    </html>
  `;
}

module.exports = { generateReportPage };