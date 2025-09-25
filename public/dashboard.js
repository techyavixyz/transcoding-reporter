let filterTimeout;
let reportData = null;

// DOM elements
const searchBox = document.getElementById("searchBox");
const statusFilter = document.getElementById("statusFilter");
const settingsBtn = document.getElementById("settingsBtn");
const settingsDropdown = document.getElementById("settingsDropdown");
const tableBody = document.getElementById("tableBody");
const loading = document.getElementById("loading");
const noResults = document.getElementById("noResults");
const tableWrapper = document.getElementById("tableWrapper");
const statsGrid = document.getElementById("statsGrid");
const performanceInfo = document.getElementById("performanceInfo");

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    
    // Event listeners
    searchBox.addEventListener("input", filterTable);
    statusFilter.addEventListener("change", filterTable);
    settingsBtn.addEventListener("click", toggleSettingsDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener("click", function(e) {
        if (!settingsBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
            settingsDropdown.classList.remove("show");
        }
    });
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (!searchBox.value && !statusFilter.value) {
            loadDashboardData();
        }
    }, 30000);
});

function toggleSettingsDropdown() {
    settingsDropdown.classList.toggle("show");
}

async function loadDashboardData() {
    try {
        showLoading();
        
        const response = await fetch('/api/report');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        reportData = await response.json();
        
        renderStats(reportData.stats);
        renderTable(reportData.tableData);
        updatePerformanceInfo(reportData);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data. Please try again.');
        hideLoading();
    }
}

function renderStats(stats) {
    statsGrid.innerHTML = `
        <div class="stat-card stat-total">
            <div class="stat-number">${stats.total.toLocaleString()}</div>
            <div class="stat-label">Total Videos</div>
        </div>
        <div class="stat-card stat-queue">
            <div class="stat-number">${stats.inQueue.toLocaleString()}</div>
            <div class="stat-label">In Queue</div>
        </div>
        <div class="stat-card stat-progress">
            <div class="stat-number">${stats.inProgress.toLocaleString()}</div>
            <div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card stat-success">
            <div class="stat-number">${stats.success.toLocaleString()}</div>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card stat-failed">
            <div class="stat-number">${stats.failed.toLocaleString()}</div>
            <div class="stat-label">Failed</div>
        </div>
    `;
}

function renderTable(tableData) {
    if (!tableData || tableData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="13" class="text-center" style="padding: 40px;">No videos found</td></tr>';
        return;
    }
    
    const rows = tableData.map(row => {
        const statusClass = {
            'success': 'status-success',
            'failed': 'status-failed',
            'in-queue': 'status-queue',
            'in-progress': 'status-progress'
        }[row.status] || 'status-unknown';

        return `
            <tr class="table-row" data-status="${row.status}">
                <td class="text-center">${row.id}</td>
                <td class="font-mono text-sm">${row.driveId}</td>
                <td class="font-mono text-sm">${row.videoAppId}</td>
                <td class="font-medium">${row.appName}</td>
                <td class="text-sm text-gray-600">${row.appUrl}</td>
                <td class="font-mono text-sm">${row.encodeId}</td>
                <td class="max-w-xs truncate" title="${row.title}">${row.title}</td>
                <td class="text-center">${row.duration}</td>
                <td class="text-center">${row.size}</td>
                <td class="text-sm">${row.createdAt}</td>
                <td class="text-center">
                    <span class="status-badge ${statusClass}">${row.status}</span>
                </td>
                <td class="text-center">${row.queuedFor}</td>
                <td class="text-sm text-blue-600 hover:text-blue-800">
                    ${row.sourceUrl ? 
                        `<a href="${row.sourceUrl}" target="_blank" class="underline">View</a>` : 
                        "-"
                    }
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = rows;
}

function updatePerformanceInfo(data) {
    performanceInfo.innerHTML = `
        <i class="fas fa-tachometer-alt"></i>
        Query: ${data.queryTime}ms | Showing: ${Math.min(1000, data.totalRecords)} of ${data.stats.total.toLocaleString()}
    `;
}

function showLoading() {
    loading.style.display = "flex";
    tableWrapper.style.display = "none";
    noResults.style.display = "none";
}

function hideLoading() {
    loading.style.display = "none";
    tableWrapper.style.display = "block";
}

function showError(message) {
    tableBody.innerHTML = `<tr><td colspan="13" class="text-center" style="padding: 40px; color: #ef4444;">${message}</td></tr>`;
    tableWrapper.style.display = "block";
}

function filterTable() {
    clearTimeout(filterTimeout);
    
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
        tableWrapper.style.display = visibleCount === 0 ? "none" : "block";
        
    }, 300);
}

console.log("🚀 Dashboard loaded successfully!");