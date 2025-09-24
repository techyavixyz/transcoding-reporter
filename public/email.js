let emailData = { recipients: [], bcc: [] };

// DOM elements
const recipientInput = document.getElementById("recipientInput");
const bccInput = document.getElementById("bccInput");
const recipientList = document.getElementById("recipientList");
const bccList = document.getElementById("bccList");
const recipientCount = document.getElementById("recipientCount");
const bccCount = document.getElementById("bccCount");
const bulkEmails = document.getElementById("bulkEmails");
const toast = document.getElementById("toast");

// Initialize email management
document.addEventListener('DOMContentLoaded', function() {
    loadEmails();
    
    // Enter key listeners
    recipientInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addRecipient();
    });
    
    bccInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addBcc();
    });
});

async function loadEmails() {
    try {
        const response = await fetch('/emails');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        emailData = await response.json();
        renderEmailLists();
        updateCounts();
        
    } catch (error) {
        console.error('Error loading emails:', error);
        showToast('Failed to load email data', 'error');
    }
}

function renderEmailLists() {
    // Render recipients
    recipientList.innerHTML = emailData.recipients.map(email => `
        <div class="email-item">
            <span class="email-address">${email}</span>
            <button class="remove-btn" onclick="removeRecipient('${email}')" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    // Render BCC
    bccList.innerHTML = emailData.bcc.map(email => `
        <div class="email-item">
            <span class="email-address">${email}</span>
            <button class="remove-btn" onclick="removeBcc('${email}')" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function updateCounts() {
    recipientCount.textContent = `${emailData.recipients.length} recipients`;
    bccCount.textContent = `${emailData.bcc.length} BCC`;
}

async function addRecipient() {
    const email = recipientInput.value.trim();
    if (!email) {
        showToast('Please enter an email address', 'warning');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (emailData.recipients.includes(email)) {
        showToast('Email already exists in recipients', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/emails/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients: [email] })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        emailData = result;
        renderEmailLists();
        updateCounts();
        recipientInput.value = '';
        showToast('Recipient added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding recipient:', error);
        showToast('Failed to add recipient', 'error');
    }
}

async function addBcc() {
    const email = bccInput.value.trim();
    if (!email) {
        showToast('Please enter an email address', 'warning');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (emailData.bcc.includes(email)) {
        showToast('Email already exists in BCC', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/emails/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bcc: [email] })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        emailData = result;
        renderEmailLists();
        updateCounts();
        bccInput.value = '';
        showToast('BCC recipient added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding BCC:', error);
        showToast('Failed to add BCC recipient', 'error');
    }
}

async function removeRecipient(email) {
    try {
        const response = await fetch('/emails/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients: [email] })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        emailData = result;
        renderEmailLists();
        updateCounts();
        showToast('Recipient removed successfully', 'success');
        
    } catch (error) {
        console.error('Error removing recipient:', error);
        showToast('Failed to remove recipient', 'error');
    }
}

async function removeBcc(email) {
    try {
        const response = await fetch('/emails/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bcc: [email] })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        emailData = result;
        renderEmailLists();
        updateCounts();
        showToast('BCC recipient removed successfully', 'success');
        
    } catch (error) {
        console.error('Error removing BCC:', error);
        showToast('Failed to remove BCC recipient', 'error');
    }
}

async function bulkAddRecipients() {
    const emails = parseEmailList(bulkEmails.value);
    if (emails.length === 0) {
        showToast('Please enter at least one email address', 'warning');
        return;
    }
    
    const validEmails = emails.filter(email => isValidEmail(email));
    const invalidCount = emails.length - validEmails.length;
    
    if (validEmails.length === 0) {
        showToast('No valid email addresses found', 'error');
        return;
    }
    
    try {
        const response = await fetch('/emails/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients: validEmails })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        emailData = result;
        renderEmailLists();
        updateCounts();
        bulkEmails.value = '';
        
        let message = `Added ${validEmails.length} recipients`;
        if (invalidCount > 0) {
            message += ` (${invalidCount} invalid emails skipped)`;
        }
        showToast(message, 'success');
        
    } catch (error) {
        console.error('Error bulk adding recipients:', error);
        showToast('Failed to add recipients', 'error');
    }
}

async function bulkAddBcc() {
    const emails = parseEmailList(bulkEmails.value);
    if (emails.length === 0) {
        showToast('Please enter at least one email address', 'warning');
        return;
    }
    
    const validEmails = emails.filter(email => isValidEmail(email));
    const invalidCount = emails.length - validEmails.length;
    
    if (validEmails.length === 0) {
        showToast('No valid email addresses found', 'error');
        return;
    }
    
    try {
        const response = await fetch('/emails/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bcc: validEmails })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        emailData = result;
        renderEmailLists();
        updateCounts();
        bulkEmails.value = '';
        
        let message = `Added ${validEmails.length} BCC recipients`;
        if (invalidCount > 0) {
            message += ` (${invalidCount} invalid emails skipped)`;
        }
        showToast(message, 'success');
        
    } catch (error) {
        console.error('Error bulk adding BCC:', error);
        showToast('Failed to add BCC recipients', 'error');
    }
}

function parseEmailList(text) {
    return text
        .split(/[,\n\r\s]+/)
        .map(email => email.trim())
        .filter(email => email.length > 0);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

console.log("📧 Email management loaded successfully!");