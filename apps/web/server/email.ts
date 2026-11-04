import nodemailer from "nodemailer";
import type { ReportSummary } from "@repo/shared-types";

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Creates Nodemailer SMTP transporter using Brevo SMTP configuration
 */
export function getEmailTransporter() {
  const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends an email using configured Brevo SMTP transporter or logs fallback (AC 25.1, AC 25.3)
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const from = process.env.SMTP_FROM || "no-reply@jobintel.local";
  const transporter = getEmailTransporter();

  if (!transporter) {
    console.warn(`[EMAIL FALLBACK] SMTP not configured. Mocking delivery to ${options.to}:`, options.subject);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });
    console.log(`Email successfully dispatched to ${options.to}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`Email delivery to ${options.to} failed:`, err);
    return { success: false, error: err.message || "Failed to send email" };
  }
}

/**
 * Formats and sends the daily job intelligence summary email (AC 25.1, AC 25.2)
 */
export async function sendDailyReportEmail(
  to: string,
  summary: ReportSummary,
  recipientName?: string,
  excelAttachment?: Buffer
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const name = recipientName || "Job Seeker";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `AI Job Intelligence Daily Summary — ${today}`;

  // Check AC 25.2: "Graceful nothing new case"
  const isNothingNew =
    summary.newJobs === 0 &&
    summary.bestMatches.length === 0 &&
    summary.statusChanges.length === 0;

  let textContent = `Hello ${name},\n\nHere is your daily job intelligence briefing for ${today}.\n\n`;

  if (isNothingNew) {
    textContent += `Good news: your pipeline is steady! There are no new positions or status updates for your tracked criteria in the last 24 hours.\n\nWe will continue scanning ATS boards and alert you as soon as new opportunities emerge.\n\n`;
    if (excelAttachment) {
      textContent += `📎 Attached: Complete spreadsheet of your tracked jobs (.xlsx).\n\n`;
    }
    textContent += `Best,\nAI Job Intelligence Platform`;
  } else {
    textContent += `📊 Today's Highlights:\n`;
    textContent += `- New Positions Discovered: ${summary.newJobs}\n`;
    textContent += `- Status Changes: ${summary.statusChanges.length}\n\n`;

    if (summary.bestMatches.length > 0) {
      textContent += `🎯 Top Matching Positions:\n`;
      for (const m of summary.bestMatches.slice(0, 5)) {
        textContent += `• [${Math.round(m.matchScore)}% Fit] ${m.title} at ${m.company}\n`;
      }
      textContent += `\n`;
    }

    if (summary.skillGaps.length > 0) {
      textContent += `💡 Top In-Demand Skill Gaps:\n`;
      for (const g of summary.skillGaps.slice(0, 5)) {
        textContent += `• ${g.skill}: required by ${g.frequency} recent jobs\n`;
      }
      textContent += `\n`;
    }

    if (excelAttachment) {
      textContent += `📎 Attached: Full jobs spreadsheet (.xlsx) with salary ranges and clickable application links.\n\n`;
    }

    textContent += `Open your dashboard to review and manage your applications.\n\nBest,\nAI Job Intelligence Platform`;
  }

  // HTML neobrutalist email layout
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAFA; margin: 0; padding: 24px; color: #141414; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 3px solid #141414; box-shadow: 4px 4px 0px #141414; padding: 28px; }
    .badge { display: inline-block; padding: 4px 10px; background: #D1FAE5; border: 2px solid #141414; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px; }
    h1 { font-size: 22px; text-transform: uppercase; margin: 0 0 16px 0; border-bottom: 3px solid #141414; padding-bottom: 10px; }
    .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 18px 0 8px 0; letter-spacing: 0.5px; }
    .card { background: #F4F4F5; border: 2px solid #141414; padding: 12px; margin-bottom: 10px; font-size: 13px; }
    .job-item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E4E4E7; padding: 8px 0; }
    .job-item:last-child { border-bottom: none; }
    .score-badge { background: #A7F3D0; border: 1.5px solid #141414; padding: 2px 6px; font-weight: bold; font-family: monospace; font-size: 11px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #141414; font-size: 11px; color: #71717A; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Daily Report</div>
    <h1>Job Intelligence Summary</h1>
    <p style="font-size: 13px; margin-top: 0;">Hello <strong>${name}</strong>, here is your daily briefing for ${today}.</p>

    ${
      excelAttachment
        ? `
      <div class="card" style="background: #F0FDF4; border: 2px solid #141414; margin-bottom: 14px;">
        <div style="font-weight: bold; margin-bottom: 4px; font-size: 13px;">📎 Attached: Full Job Pipeline Spreadsheet (.xlsx)</div>
        <div style="font-size: 12px; color: #52525B;">Your complete tracked job inventory is attached to this email with clickable application links, compensation, and match scores.</div>
      </div>
    `
        : ""
    }

    ${
      isNothingNew
        ? `
      <div class="card" style="background: #E0F2FE;">
        <strong>Your pipeline is steady today.</strong><br/>
        No new jobs or application milestone changes in the last 24 hours. We continue monitoring your target ATS boards.
      </div>
      `
        : `
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <div class="card" style="flex: 1; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">${summary.newJobs}</div>
          <div style="font-size: 11px; text-transform: uppercase; color: #52525B;">New Jobs</div>
        </div>
        <div class="card" style="flex: 1; text-align: center;">
          <div style="font-size: 24px; font-weight: bold;">${summary.statusChanges.length}</div>
          <div style="font-size: 11px; text-transform: uppercase; color: #52525B;">Status Updates</div>
        </div>
      </div>

      ${
        summary.bestMatches.length > 0
          ? `
        <div class="section-title">🎯 Top Matching Opportunities</div>
        <div class="card" style="background: #FFFFFF;">
          ${summary.bestMatches
            .slice(0, 5)
            .map(
              (m) => `
            <div class="job-item">
              <div>
                <strong>${m.title}</strong><br/>
                <span style="font-size: 11px; color: #71717A;">${m.company}</span>
              </div>
              <span class="score-badge">${Math.round(m.matchScore)}%</span>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }

      ${
        summary.skillGaps.length > 0
          ? `
        <div class="section-title">💡 High Impact Skill Gaps</div>
        <div class="card" style="background: #FFFFFF;">
          ${summary.skillGaps
            .slice(0, 4)
            .map(
              (g) => `
            <div class="job-item">
              <span><strong>${g.skill}</strong></span>
              <span style="font-family: monospace; font-size: 11px; color: #71717A;">in ${g.frequency} jobs</span>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }
    `
    }

    <div class="footer">
      Generated automatically by AI Job Intelligence Platform • Reminder: Applications are submitted manually by you.
    </div>
  </div>
</body>
</html>
  `;

  const dateStr = new Date().toISOString().split("T")[0];
  const attachments = excelAttachment
    ? [
        {
          filename: `job-intel-pipeline-${dateStr}.xlsx`,
          content: excelAttachment,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ]
    : undefined;

  return sendEmail({
    to,
    subject,
    text: textContent,
    html: htmlContent,
    attachments,
  });
}
