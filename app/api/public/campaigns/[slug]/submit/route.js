import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "../../../../../../lib/captcha";
import { resolveNotificationAdminId } from "../../../../../../lib/admin-notifications";
import {
  buildCampaignResponseTemplateVariables,
  getCampaignResponseRecipientEmail,
  isCampaignMediaFieldType,
  isCampaignTableMissingError,
  normalizeCampaignResponseData,
} from "../../../../../../lib/campaigns";
import { sendCampaignNotification, sendCampaignResponseTemplateEmail } from "../../../../../../lib/mailer";
import { ensureDatabaseReady, prisma } from "../../../../../../lib/prisma";
import { consumeRateLimit } from "../../../../../../lib/rate-limit";
import { getRequestRateLimitIdentity } from "../../../../../../lib/request-utils";
import { createRateLimitResponse } from "../../../../../../lib/request-security";
import { getSecurityConfig } from "../../../../../../lib/security-config";

const IMAGE_MAX_FILE_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_FILE_SIZE = 50 * 1024 * 1024;
const UPLOAD_ROOT_DIRECTORY = path.join(process.cwd(), "public", "uploads", "campaign-responses");
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const EXTENSION_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};
const MIME_TO_EXTENSION = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

function sanitizeFilename(name) {
  return String(name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function detectMimeTypeFromMagic(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (buffer.length >= 6) {
    const gifSignature = buffer.toString("ascii", 0, 6);
    if (gifSignature === "GIF87a" || gifSignature === "GIF89a") {
      return "image/gif";
    }
  }

  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (brand === "qt  ") {
      return "video/quicktime";
    }
    return "video/mp4";
  }

  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "video/webm";
  }

  return "";
}

function getAllowedMimeTypesByQuestionType(questionType) {
  if (questionType === "image") {
    return IMAGE_MIME_TYPES;
  }

  if (questionType === "video") {
    return VIDEO_MIME_TYPES;
  }

  return null;
}

function getMaxFileSizeByQuestionType(questionType) {
  if (questionType === "video") {
    return VIDEO_MAX_FILE_SIZE;
  }

  return IMAGE_MAX_FILE_SIZE;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function parseSubmissionPayload(request) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payloadRaw = formData.get("payload");

    if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
      throw new Error("Invalid response payload.");
    }

    let parsedBody = null;
    try {
      parsedBody = JSON.parse(payloadRaw);
    } catch {
      throw new Error("Invalid response payload.");
    }

    if (!isPlainObject(parsedBody)) {
      throw new Error("Invalid response payload.");
    }

    const sourceData = isPlainObject(parsedBody.data) ? parsedBody.data : parsedBody;
    const submittedData = isPlainObject(sourceData) ? { ...sourceData } : null;

    return {
      body: parsedBody,
      submittedData,
      formData,
    };
  }

  const parsedBody = await request.json();
  const sourceData = isPlainObject(parsedBody?.data) ? parsedBody.data : parsedBody;
  const submittedData = isPlainObject(sourceData) ? { ...sourceData } : null;

  return {
    body: parsedBody,
    submittedData,
    formData: null,
  };
}

async function storeCampaignMediaUpload({ file, question }) {
  const questionType = String(question?.type || "").trim().toLowerCase();
  const allowedMimeTypes = getAllowedMimeTypesByQuestionType(questionType);
  const maxSize = getMaxFileSizeByQuestionType(questionType);

  if (!allowedMimeTypes) {
    throw new Error(`Unsupported media response type for ${question?.label || "question"}.`);
  }

  if (!(file instanceof File) || file.size <= 0) {
    throw new Error(`File is required for ${question?.label || "this question"}.`);
  }

  if (file.size > maxSize) {
    const sizeLabel = questionType === "video" ? "50MB" : "10MB";
    throw new Error(`${question?.label || "File"} exceeds the ${sizeLabel} upload limit.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMimeType = detectMimeTypeFromMagic(buffer);
  const cleanedOriginalFilename = sanitizeFilename(file.name || "upload");
  const extension = path.extname(cleanedOriginalFilename).toLowerCase();
  const extensionMimeType = EXTENSION_TO_MIME[extension];

  if (!detectedMimeType || !extensionMimeType || detectedMimeType !== extensionMimeType) {
    throw new Error(`File type validation failed for ${question?.label || "uploaded media"}.`);
  }

  if (file.type && file.type !== detectedMimeType) {
    throw new Error(`File MIME type mismatch for ${question?.label || "uploaded media"}.`);
  }

  if (!allowedMimeTypes.has(detectedMimeType)) {
    throw new Error(`Unsupported file format for ${question?.label || "uploaded media"}.`);
  }

  const outputExtension = MIME_TO_EXTENSION[detectedMimeType] || extension;
  const filename = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${outputExtension}`;
  const filePath = path.join(UPLOAD_ROOT_DIRECTORY, filename);
  const url = `/uploads/campaign-responses/${filename}`;

  await fs.mkdir(UPLOAD_ROOT_DIRECTORY, { recursive: true });
  await fs.writeFile(filePath, buffer);

  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        filename,
        originalName: file.name || cleanedOriginalFilename,
        mimeType: detectedMimeType,
        size: buffer.byteLength,
        url,
      },
      select: {
        id: true,
      },
    });

    return {
      questionKey: question.key,
      answerValue: {
        mediaType: questionType,
        url,
        mimeType: detectedMimeType,
        size: buffer.byteLength,
        filename,
        originalName: file.name || cleanedOriginalFilename,
        assetId: asset.id,
      },
      storedMedia: {
        assetId: asset.id,
        filePath,
      },
    };
  } catch (error) {
    await fs.unlink(filePath).catch(() => {});
    throw error;
  }
}

async function processMediaResponses({ campaignQuestions, formData }) {
  if (!formData) {
    return {
      uploadedValues: {},
      storedMedia: [],
    };
  }

  const uploadedValues = {};
  const storedMedia = [];

  for (const question of campaignQuestions) {
    const questionType = String(question?.type || "").trim().toLowerCase();
    if (!isCampaignMediaFieldType(questionType)) {
      continue;
    }

    const file = formData.get(`media:${question.key}`);

    if (file == null) {
      continue;
    }

    if (!(file instanceof File)) {
      throw new Error(`Invalid media upload for ${question?.label || "question"}.`);
    }

    if (file.size <= 0) {
      continue;
    }

    const uploadResult = await storeCampaignMediaUpload({ file, question });
    uploadedValues[uploadResult.questionKey] = uploadResult.answerValue;
    storedMedia.push(uploadResult.storedMedia);
  }

  return {
    uploadedValues,
    storedMedia,
  };
}

async function rollbackUploadedMedia(storedMedia) {
  if (!Array.isArray(storedMedia) || !storedMedia.length) {
    return;
  }

  await Promise.all(
    storedMedia.map(async (entry) => {
      if (entry?.assetId) {
        await prisma.mediaAsset.delete({ where: { id: entry.assetId } }).catch(() => {});
      }

      if (entry?.filePath) {
        await fs.unlink(entry.filePath).catch(() => {});
      }
    })
  );
}

export async function POST(request, { params }) {
  try {
    await ensureDatabaseReady();

    const resolvedParams = await params;
    const slug = String(resolvedParams?.slug || "");
    const { body, submittedData, formData } = await parseSubmissionPayload(request);

    const honeypot = String(body?.website || submittedData?.website || "").trim();
    const captchaToken = String(body?.captchaToken || "").trim();

    if (honeypot) {
      return NextResponse.json({ error: "Invalid response payload." }, { status: 400 });
    }

    if (!captchaToken) {
      return NextResponse.json({ error: "Captcha token is required." }, { status: 400 });
    }

    if (!submittedData || typeof submittedData !== "object") {
      return NextResponse.json({ error: "Invalid response payload." }, { status: 400 });
    }

    delete submittedData.website;
    delete submittedData.captchaToken;

    const requestIdentity = getRequestRateLimitIdentity(request);
    const clientIp = requestIdentity.clientIp;
    const { rateLimitMaxPublicIp, rateLimitMaxPublicCampaignIp } = getSecurityConfig();
    const windowMs = 60 * 60 * 1000;

    const [globalLimit, campaignLimit] = await Promise.all([
      consumeRateLimit({
        key: `public-submit:identity:${requestIdentity.keyPart}`,
        limit: rateLimitMaxPublicIp,
        windowMs,
        denyOnMissingTable: true,
      }),
      consumeRateLimit({
        key: `public-submit:campaign:${slug}:identity:${requestIdentity.keyPart}`,
        limit: rateLimitMaxPublicCampaignIp,
        windowMs,
        denyOnMissingTable: true,
      }),
    ]);

    if (!globalLimit.allowed || !campaignLimit.allowed) {
      return createRateLimitResponse(
        "Too many submissions. Please try again later.",
        Math.max(globalLimit.retryAfterSeconds, campaignLimit.retryAfterSeconds)
      );
    }

    const captchaResult = await verifyTurnstileToken({ token: captchaToken, remoteIp: clientIp });

    if (!captchaResult.success) {
      return NextResponse.json({ error: "Captcha validation failed." }, { status: 400 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        slug,
        isPublished: true,
        OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
      },
      include: {
        questions: {
          where: { isVisible: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    let response = null;
    let cleanedData = null;
    let uploadedMedia = [];

    try {
      const mediaResponseResult = await processMediaResponses({
        campaignQuestions: campaign.questions,
        formData,
      });

      uploadedMedia = mediaResponseResult.storedMedia;
      const mergedData = {
        ...submittedData,
        ...mediaResponseResult.uploadedValues,
      };
      cleanedData = normalizeCampaignResponseData(campaign.questions, mergedData);

      response = await prisma.campaignResponse.create({
        data: {
          campaignId: campaign.id,
          data: cleanedData,
        },
      });

      const notificationAdminId = await resolveNotificationAdminId();

      if (notificationAdminId) {
        await prisma.adminNotification.create({
          data: {
            adminId: notificationAdminId,
            type: "CAMPAIGN_RESPONSE",
            title: `New campaign response: ${campaign.title}`,
            message: `A new response was submitted for ${campaign.title}.`,
            payload: cleanedData,
            campaignId: campaign.id,
            campaignResponseId: response.id,
          },
        });
      }
    } catch (submissionError) {
      if (!response) {
        await rollbackUploadedMedia(uploadedMedia);
      }
      throw submissionError;
    }

    const mailResult = await sendCampaignNotification({
      submissionData: cleanedData,
      campaignTitle: campaign.title,
      campaignSlug: campaign.slug,
    });

    if (campaign.autoResponseEnabled && campaign.autoResponseSubject && campaign.autoResponseBody) {
      const responderEmail = getCampaignResponseRecipientEmail(campaign.questions, cleanedData);

      if (responderEmail) {
        try {
          const variables = buildCampaignResponseTemplateVariables({
            campaign,
            response,
            questions: campaign.questions,
          });

          await sendCampaignResponseTemplateEmail({
            to: responderEmail,
            subjectTemplate: campaign.autoResponseSubject,
            bodyTemplate: campaign.autoResponseBody,
            variables,
          });
        } catch (autoResponseError) {
          console.error("Campaign auto response delivery failed", {
            campaignId: campaign.id,
            responseId: response.id,
            responderEmail,
            error: autoResponseError,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      delivered: mailResult.delivered,
      message: "Response submitted successfully.",
    });
  } catch (error) {
    console.error("Campaign response submission failed", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json({ error: "Campaigns are not available yet." }, { status: 503 });
    }

    const message = error?.message || "Unable to submit response.";
    const status = /required|invalid|unsupported|exceeds|mismatch|missing/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
