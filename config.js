// config.js

const fs = require("fs");
const path = require("path");

const EMAILS_FILE = path.join(__dirname, "emails.json");

function loadEmails() {
  try {
    if (fs.existsSync(EMAILS_FILE)) {
      const data = JSON.parse(fs.readFileSync(EMAILS_FILE, "utf-8"));
      return { recipients: data.recipients || [], bcc: data.bcc || [] };
    }
  } catch (err) {
    console.error("⚠️ Failed to load emails.json:", err.message);
  }
  return {
    recipients: process.env.EMAIL_RECIPIENTS ? process.env.EMAIL_RECIPIENTS.split(",") : [],
    bcc: process.env.EMAIL_BCC ? process.env.EMAIL_BCC.split(",") : []
  };
}

function saveEmails(recipients, bcc) {
  const data = { recipients, bcc };
  fs.writeFileSync(EMAILS_FILE, JSON.stringify(data, null, 2));
}

let { recipients, bcc } = loadEmails();

module.exports = {
  get recipients() { return recipients; },
  get bcc() { return bcc; },

  setRecipients(newRecipients) {
    recipients = newRecipients;
    saveEmails(recipients, bcc);
  },
  setBcc(newBcc) {
    bcc = newBcc;
    saveEmails(recipients, bcc);
  },

  subject: process.env.EMAIL_SUBJECT || "Video Transcoding Report",
  appId: process.env.EMAIL_APP_ID || "64f96255d759ff00082ca770",

  schedule: {
    mode: process.env.SCHEDULE_MODE || "interval",  // 👈 added
    type: process.env.SCHEDULE_TYPE || "minutes",   // still used for interval
    value: parseInt(process.env.SCHEDULE_VALUE || "5"),
    cronExpression: process.env.CRON_EXPRESSION || "" // 👈 added
  }
};
