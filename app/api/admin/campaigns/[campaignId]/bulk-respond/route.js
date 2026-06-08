import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import {
  buildCampaignResponseTemplateVariables,
  getCampaignResponseRecipientEmail,
  isCampaignTableMissingError,
  PUBLIC_CAMPAIGNS_CACHE_TAG,
} from "../../../../../../lib/campaigns";
import { sendCampaignResponseTemplateEmail } from "../../../../../../lib/mailer";
import { ensureDatabaseReady, prisma } from "../../../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../../../lib/request-security";

function normalizeMode(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export async function POST(request, { params }) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDatabaseReady();

    const resolvedParams = await params;
    const campaignId = String(resolvedParams?.campaignId || "");
    const body = await request.json();

    const mode = normalizeMode(body?.mode);
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });
    }

    if (mode !== "one_time" && mode !== "ongoing") {
      return NextResponse.json({ error: "Mode must be one_time or ongoing." }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "Email subject is required." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Email message is required." }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        slug: true,
        targetMarket: true,
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            key: true,
            label: true,
            type: true,
            order: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    let responses = [];
    if (mode === "one_time" || mode === "ongoing") {
      responses = await prisma.campaignResponse.findMany({
        where: { campaignId: campaign.id },
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          submittedAt: true,
          data: true,
        },
      });
    }

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failedRecipients = [];

    for (const response of responses) {
      const recipientEmail = getCampaignResponseRecipientEmail(campaign.questions, response.data);

      if (!recipientEmail) {
        skippedCount += 1;
        continue;
      }

      try {
        const variables = buildCampaignResponseTemplateVariables({
          campaign,
          response,
          questions: campaign.questions,
        });

        const mailResult = await sendCampaignResponseTemplateEmail({
          to: recipientEmail,
          subjectTemplate: subject,
          bodyTemplate: message,
          variables,
        });

        if (mailResult?.delivered) {
          sentCount += 1;
        } else {
          failedCount += 1;
          failedRecipients.push(recipientEmail);
        }
      } catch (mailError) {
        failedCount += 1;
        failedRecipients.push(recipientEmail);
        console.error("Failed sending campaign bulk response email", {
          campaignId,
          responseId: response.id,
          recipientEmail,
          error: mailError,
        });
      }
    }

    if (mode === "ongoing") {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          autoResponseEnabled: true,
          autoResponseSubject: subject,
          autoResponseBody: message,
          autoResponseUpdatedAt: new Date(),
        },
      });
      revalidateTag(PUBLIC_CAMPAIGNS_CACHE_TAG);
    }

    if (mode === "one_time" && !responses.length) {
      return NextResponse.json(
        { error: "This campaign has no responses yet, so there is nothing to send." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      ongoingSaved: mode === "ongoing",
      sentCount,
      skippedCount,
      failedCount,
      failedRecipients: failedRecipients.slice(0, 10),
      totalResponsesConsidered: responses.length,
    });
  } catch (error) {
    console.error("Failed to bulk respond to campaign submissions", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json(
        { error: "Campaign tables are not initialized. Run database migrations and retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Unable to send campaign responses." }, { status: 500 });
  }
}
