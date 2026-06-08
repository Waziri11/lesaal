import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "../../../../../../lib/captcha";
import {
  buildCampaignResponseTemplateVariables,
  getCampaignResponseRecipientEmail,
  isCampaignTableMissingError,
  normalizeCampaignResponseData,
} from "../../../../../../lib/campaigns";
import { sendCampaignNotification, sendCampaignResponseTemplateEmail } from "../../../../../../lib/mailer";
import { ensureDatabaseReady, prisma } from "../../../../../../lib/prisma";
import { consumeRateLimit } from "../../../../../../lib/rate-limit";
import { getClientIpAddress } from "../../../../../../lib/request-utils";
import { createRateLimitResponse } from "../../../../../../lib/request-security";
import { getSecurityConfig } from "../../../../../../lib/security-config";

export async function POST(request, { params }) {
  try {
    await ensureDatabaseReady();

    const resolvedParams = await params;
    const slug = String(resolvedParams?.slug || "");
    const body = await request.json();
    const sourceData = body?.data && typeof body.data === "object" ? body.data : body;
    const submittedData =
      sourceData && typeof sourceData === "object" && !Array.isArray(sourceData)
        ? {
            ...sourceData,
          }
        : null;

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

    const clientIp = getClientIpAddress(request);
    const { rateLimitMaxPublicIp, rateLimitMaxPublicCampaignIp } = getSecurityConfig();
    const windowMs = 60 * 60 * 1000;

    const [globalLimit, campaignLimit] = await Promise.all([
      consumeRateLimit({
        key: `public-submit:ip:${clientIp}`,
        limit: rateLimitMaxPublicIp,
        windowMs,
      }),
      consumeRateLimit({
        key: `public-submit:campaign:${slug}:${clientIp}`,
        limit: rateLimitMaxPublicCampaignIp,
        windowMs,
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

    const cleanedData = normalizeCampaignResponseData(campaign.questions, submittedData);

    const response = await prisma.campaignResponse.create({
      data: {
        campaignId: campaign.id,
        data: cleanedData,
      },
    });

    await prisma.adminNotification.create({
      data: {
        type: "CAMPAIGN_RESPONSE",
        title: `New campaign response: ${campaign.title}`,
        message: `A new response was submitted for ${campaign.title}.`,
        payload: cleanedData,
        campaignId: campaign.id,
        campaignResponseId: response.id,
      },
    });

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
    const status = /required|invalid/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
