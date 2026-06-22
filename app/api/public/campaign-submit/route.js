import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "../../../../lib/captcha";
import { resolveNotificationAdminId } from "../../../../lib/admin-notifications";
import { getLandingConfig } from "../../../../lib/landing-config";
import { prisma } from "../../../../lib/prisma";
import { consumeRateLimit } from "../../../../lib/rate-limit";
import { getRequestRateLimitIdentity } from "../../../../lib/request-utils";
import { createRateLimitResponse } from "../../../../lib/request-security";
import { getSecurityConfig } from "../../../../lib/security-config";
import { sendCampaignNotification } from "../../../../lib/mailer";

export async function POST(request) {
  try {
    const body = await request.json();
    const sourceData = body?.data && typeof body.data === "object" ? body.data : body;
    const submittedData =
      sourceData && typeof sourceData === "object" && !Array.isArray(sourceData)
        ? {
            ...sourceData,
          }
        : null;

    if (!submittedData || typeof submittedData !== "object") {
      return NextResponse.json({ error: "Invalid submission payload." }, { status: 400 });
    }

    const honeypot = String(body?.website || submittedData.website || "").trim();
    const captchaToken = String(body?.captchaToken || "").trim();

    if (honeypot) {
      return NextResponse.json({ error: "Invalid submission payload." }, { status: 400 });
    }

    if (!captchaToken) {
      return NextResponse.json({ error: "Captcha token is required." }, { status: 400 });
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
        key: `public-submit:campaign:legacy:identity:${requestIdentity.keyPart}`,
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

    const config = await getLandingConfig();
    const activeFields = config.formFields.filter((field) => field.isVisible);

    const missingRequired = activeFields
      .filter((field) => field.required)
      .filter((field) => {
        const value = submittedData[field.key];
        return value === undefined || value === null || String(value).trim() === "";
      })
      .map((field) => field.label);

    if (missingRequired.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingRequired.join(", ")}` },
        { status: 400 }
      );
    }

    const cleanedData = {};

    for (const field of activeFields) {
      const rawValue = submittedData[field.key];
      cleanedData[field.key] = rawValue == null ? "" : String(rawValue).trim();
    }

    await prisma.campaignSubmission.create({
      data: {
        configId: config.id,
        data: cleanedData,
      },
    });

    try {
      const matchingCampaign = await prisma.campaign.findFirst({
        where: {
          isPublished: true,
          OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          slug: true,
        },
      });

      const notificationAdminId = await resolveNotificationAdminId();

      if (notificationAdminId) {
        await prisma.adminNotification.create({
          data: {
            adminId: notificationAdminId,
            type: "CAMPAIGN_RESPONSE",
            title: "New landing campaign response",
            message: "A response was submitted from the landing campaign form.",
            payload: cleanedData,
            campaignId: matchingCampaign?.id || null,
          },
        });
      }
    } catch (notificationError) {
      console.warn("Unable to create campaign notification for legacy form:", notificationError);
    }

    const emailResult = await sendCampaignNotification({
      submissionData: cleanedData,
      campaignTitle: "Landing Campaign Form",
    });

    const campaignSection = config.sections.find((section) => section.type === "CAMPAIGN_FORM");
    const successMessage = campaignSection?.settings?.successMessage || "Submission received.";

    return NextResponse.json({
      success: true,
      delivered: emailResult.delivered,
      message: successMessage,
    });
  } catch (error) {
    console.error("Campaign submission failed", error);
    return NextResponse.json({ error: "Unable to submit campaign form." }, { status: 500 });
  }
}
