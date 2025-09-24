

// telegram.js
const config = require("./config");
const { sendEmail } = require("./utils/email");

/**
 * Send message via AWS SES
 * @param {string} message - body content
 * @param {boolean} isHtml 
 * @param {Array} attachments 
 */
async function sendMessage(message, isHtml = false, attachments = []) {
  try {
    await sendEmail(
      config.recipients,
      config.subject,
      isHtml ? message : `<pre>${message}</pre>`,
      attachments
    );
    console.log("Email notification sent successfully");
  } catch (err) {
    console.error("Failed to send email:", err.message);
  }
}

module.exports = { sendMessage };
