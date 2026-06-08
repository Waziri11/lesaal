import nodemailer from "nodemailer";
import { DEFAULT_NOTIFY_EMAIL } from "./constants";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function interpolateTemplate(template, variables = {}) {
  const source = String(template ?? "");
  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, variableName) => {
    const value = variables?.[variableName];
    if (value == null) return "";
    return String(value);
  });
}

function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER;
}

export async function sendOtpEmail({ to, otpCode }) {
  return sendOneTimeCodeEmail({
    to,
    otpCode,
    subject: "Your Lesaal profile verification OTP",
    introText: "Your verification code",
    introHtml: "Your verification code",
  });
}

export async function sendPasswordResetOtpEmail({ to, otpCode }) {
  return sendOneTimeCodeEmail({
    to,
    otpCode,
    subject: "Your Lesaal password reset OTP",
    introText: "Your password reset code",
    introHtml: "Your password reset code",
  });
}

async function sendOneTimeCodeEmail({ to, otpCode, subject, introText, introHtml }) {
  if (!isMailConfigured()) {
    console.warn("SMTP is not configured. Skipping OTP email delivery.");
    return { delivered: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const transporter = getTransport();

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text: `${introText} is ${otpCode}. It expires in 10 minutes.`,
    html: `<p>${introHtml} is <strong>${otpCode}</strong>.</p><p>It expires in 10 minutes.</p>`,
  });

  return { delivered: true };
}

export async function sendCampaignNotification({
  submissionData,
  campaignTitle = "Campaign Form",
  campaignSlug = "",
}) {
  if (!isMailConfigured()) {
    console.warn("SMTP is not configured. Skipping campaign notification email.");
    return { delivered: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const notifyTo = process.env.NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL;
  const transporter = getTransport();

  const rows = Object.entries(submissionData)
    .map(([key, value]) => `${key}: ${value ?? ""}`)
    .join("\n");

  const htmlRows = Object.entries(submissionData)
    .map(([key, value]) => `<li><strong>${escapeHtml(key)}</strong>: ${escapeHtml(value)}</li>`)
    .join("");

  await transporter.sendMail({
    from: getFromAddress(),
    to: notifyTo,
    subject: `New campaign response: ${campaignTitle}`,
    text: [
      `A new response has been submitted for "${campaignTitle}".`,
      campaignSlug ? `Campaign URL: /campaigns/${campaignSlug}` : "",
      "",
      rows,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <p>A new response has been submitted for <strong>${escapeHtml(campaignTitle)}</strong>.</p>
      ${campaignSlug ? `<p>Campaign URL: <code>/campaigns/${escapeHtml(campaignSlug)}</code></p>` : ""}
      <ul>${htmlRows}</ul>
    `,
  });

  return { delivered: true };
}

export async function sendCampaignResponseTemplateEmail({
  to,
  subjectTemplate = "",
  bodyTemplate = "",
  variables = {},
}) {
  if (!isMailConfigured()) {
    console.warn("SMTP is not configured. Skipping campaign responder email.");
    return { delivered: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const transporter = getTransport();
  const renderedSubject = interpolateTemplate(subjectTemplate, variables).trim() || "Campaign response update";
  const renderedBodyText = interpolateTemplate(bodyTemplate, variables).trim();
  const escapedHtmlBody = escapeHtml(renderedBodyText || "").replace(/\r?\n/g, "<br />");

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: renderedSubject,
    text: renderedBodyText,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#10254e;">${escapedHtmlBody}</div>`,
  });

  return { delivered: true };
}
