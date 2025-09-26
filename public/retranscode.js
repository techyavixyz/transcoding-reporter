let filterTimeout;
let retranscodeData = null;
let currentVideo = null;

// DOM elements
const searchBox = document.getElementById("searchBox");
const tableBody = document.getElementById("tableBody");
const loading = document.getElementById("loading");
const noResults = document.getElementById("noResults");
const tableWrapper = document.getElementById("tableWrapper");
const performanceInfo = document.getElementById("performanceInfo");
const totalInQueue = document.getElementById("totalInQueue");
const retranscodeModal = document.getElementById("retranscodeModal");
const videoDetails = document.getElementById("videoDetails");
const confirmRetranscode = document.getElementById("confirmRetranscode");
const toast = document.getElementById("toast");

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadRetranscodeData();
    
    // Event listeners
    searchBox.addEventListener("input", filterTable);
    confirmRetranscode.addEventListener("click", executeRetranscode);
    
    // Close modal when clicking outside
    retranscodeModal.addEventListener("click", function(e) {
        if (e.target === retranscodeModal) {
            closeRetranscodeModal();
        }
    });
});

async function loadRetranscodeData() {
    try {
        showLoading();
        
        const response = await fetch('/api/retranscode');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        retranscodeData = await response.json();
        
        renderTable(retranscodeData.tableData);
        updateStats(retranscodeData);
        updatePerformanceInfo(retranscodeData);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading re-transcode data:', error);
        showError('Failed to load re-transcode data. Please try again.');
        hideLoading();
    }
}

function renderTable(tableData) {
    if (!tableData || tableData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">No videos in queue for re-transcoding</td></tr>';
        noResults.style.display = "block";
        tableWrapper.style.display = "none";
        return;
    }
    
    const rows = tableData.map(row => {
        return `
            <tr class="table-row">
                <td class="text-center">${row.id}</td>
                <td class="font-mono text-sm">${row.driveId}</td>
                <td class="font-mono text-sm">${row.wacId}</td>
                <td class="max-w-xs truncate" title="${row.title}">${row.title}</td>
                <td class="text-center">
                    <span class="status-badge status-queue">${row.status}</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-warning btn-sm" onclick="openRetranscodeModal('${row.driveId}', '${row.wacId}', '${row.title.replace(/'/g, "\\'")}')">
                        <i class="fas fa-redo"></i>
                        Re-transcode
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = rows;
    noResults.style.display = "none";
    tableWrapper.style.display = "block";
}

function updateStats(data) {
    totalInQueue.textContent = data.totalRecords.toLocaleString();
}

function updatePerformanceInfo(data) {
    performanceInfo.innerHTML = `
        <i class="fas fa-tachometer-alt"></i>
        Query: ${data.queryTime}ms | Showing: ${data.totalRecords} videos in queue
    `;
}

function openRetranscodeModal(driveId, wacId, title) {
    currentVideo = { driveId, wacId, title };
    
    videoDetails.innerHTML = `
        <div class="video-info">
            <p><strong>DriveId:</strong> <code>${driveId}</code></p>
            <p><strong>WacId:</strong> <code>${wacId}</code></p>
            <p><strong>Title:</strong> ${title}</p>
        </div>
    `;
    
    retranscodeModal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeRetranscodeModal() {
    retranscodeModal.style.display = "none";
    document.body.style.overflow = "auto";
    currentVideo = null;
}

async function executeRetranscode() {
    if (!currentVideo) return;
    
    const { driveId, wacId } = currentVideo;
    
    try {
        // Disable button and show loading
        confirmRetranscode.disabled = true;
        confirmRetranscode.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        const response = await fetch(`https://apis.mogiio.com/drives/retranscode/${driveId}`, {
            method: 'POST',
            headers: {
                'app-id': wacId, // This now correctly uses the appId from drives collection
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Re-transcode request sent successfully!', 'success');
            closeRetranscodeModal();
            // Reload data to reflect changes
            setTimeout(() => loadRetranscodeData(), 2000);
        } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
    } catch (error) {
        console.error('Re-transcode error:', error);
        showToast(`Failed to re-transcode: ${error.message}`, 'error');
    } finally {
        // Re-enable button
        confirmRetranscode.disabled = false;
        confirmRetranscode.innerHTML = '<i class="fas fa-redo"></i> Re-transcode';
    }
}

function showLoading() {
    loading.style.display = "flex";
    tableWrapper.style.display = "none";
    noResults.style.display = "none";
}

function hideLoading() {
    loading.style.display = "none";
}

function showError(message) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 40px; color: #ef4444;">${message}</td></tr>`;
    tableWrapper.style.display = "block";
}

function filterTable() {
    clearTimeout(filterTimeout);
    
    filterTimeout = setTimeout(() => {
        const searchVal = searchBox.value.toLowerCase().trim();
        const rows = tableBody.getElementsByTagName("tr");
        let visibleCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowText = row.innerText.toLowerCase();
            
            const shouldShow = !searchVal || rowText.includes(searchVal);
            
            row.style.display = shouldShow ? "" : "none";
            if (shouldShow) visibleCount++;
        }
        
        // Show/hide no results message
        noResults.style.display = visibleCount === 0 ? "block" : "none";
        tableWrapper.style.display = visibleCount === 0 ? "none" : "block";
        
    }, 300);
}

function showToast(message, type = 'success') {
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toastIcon.className = `toast-icon ${icons[type] || icons.success}`;
    toastMessage.textContent = message;
    
    // Set toast class
    toast.className = `toast ${type}`;
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

console.log("🔄 Re-transcode page loaded successfully!");