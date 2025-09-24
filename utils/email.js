/**
 * utils/email.js
 * - Send reports via AWS SES SMTP using Nodemailer
 */

const nodemailer = require("nodemailer");
const config = require("../config");

function getTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

async function sendReportEmail(html, attachmentBuffer) {
  try {
    const transporter = nodemailer.createTransport({
      host: "email-smtp.ap-south-1.amazonaws.com", 
      port: 587,
      secure: false,
      auth: {
        user: process.env.AWS_SES_SMTP_USER,
        pass: process.env.AWS_SES_SMTP_PASS,
      },
    });

    //  Add timestamp to subject
    const timestamp = getTimestamp();
    const subject = attachmentBuffer
      ? `Video Transcoding Report (CSV attached) - ${timestamp}`
      : `Video Transcoding Report - ${timestamp}`;

    // ✉️ Email options
    const mailOptions = {
      from: "transcoding-report@mogiio.com", 
      to: config.recipients,
      bcc: config.bcc,
      subject,
      html,
      attachments: attachmentBuffer
        ? [
            {
              filename: `video-transcoding-report-${timestamp.replace(
                /[: ]/g,
                "-"
              )}.csv`,
              content: attachmentBuffer,
            },
          ]
        : [],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Report email sent successfully (subject: "${subject}")`);
  } catch (err) {
    console.error("Email sending failed:", err.message);
    throw err;
  }
}

module.exports = { sendReportEmail };
