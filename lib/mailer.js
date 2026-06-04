import nodemailer from "nodemailer";
import { DEFAULT_NOTIFY_EMAIL } from "./constants";

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
  if (!isMailConfigured()) {
    console.warn("SMTP is not configured. Skipping OTP email delivery.");
    return { delivered: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const transporter = getTransport();

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: "Your Lesaal profile verification OTP",
    text: `Your verification code is ${otpCode}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${otpCode}</strong>.</p><p>It expires in 10 minutes.</p>`,
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
    .map(([key, value]) => `<li><strong>${key}</strong>: ${value ?? ""}</li>`)
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
      <p>A new response has been submitted for <strong>${campaignTitle}</strong>.</p>
      ${campaignSlug ? `<p>Campaign URL: <code>/campaigns/${campaignSlug}</code></p>` : ""}
      <ul>${htmlRows}</ul>
    `,
  });

  return { delivered: true };
}
