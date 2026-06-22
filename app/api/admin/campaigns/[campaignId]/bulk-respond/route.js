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
import { getEnvInteger } from "../../../../../../lib/env";
import { ensureDatabaseReady, prisma } from "../../../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../../../lib/request-security";

const DEFAULT_BULK_RESPOND_CONCURRENCY = 5;
const DEFAULT_BULK_RESPOND_MAX_RECIPIENTS = 2000;
const MAX_BULK_RESPOND_CONCURRENCY = 20;

function normalizeMode(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function clampPositiveInteger(value, fallback, max = Number.POSITIVE_INFINITY) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function getBulkRespondConfig() {
  const maxRecipients = clampPositiveInteger(
    getEnvInteger("BULK_RESPOND_MAX_RECIPIENTS", DEFAULT_BULK_RESPOND_MAX_RECIPIENTS),
    DEFAULT_BULK_RESPOND_MAX_RECIPIENTS
  );
  const concurrency = clampPositiveInteger(
    getEnvInteger("BULK_RESPOND_CONCURRENCY", DEFAULT_BULK_RESPOND_CONCURRENCY),
    DEFAULT_BULK_RESPOND_CONCURRENCY,
    MAX_BULK_RESPOND_CONCURRENCY
  );

  return {
    maxRecipients,
    concurrency,
  };
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

    const bulkRespondConfig = getBulkRespondConfig();

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

    const totalResponsesAvailable = responses.length;
    const responsesToProcess = responses.slice(0, bulkRespondConfig.maxRecipients);
    const skippedByCap = Math.max(0, totalResponsesAvailable - responsesToProcess.length);

    const deliveryResults = new Array(responsesToProcess.length);
    let nextIndex = 0;

    async function processResponse(response) {
      const recipientEmail = getCampaignResponseRecipientEmail(campaign.questions, response.data);

      if (!recipientEmail) {
        return { outcome: "skipped", recipientEmail: "" };
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
          return { outcome: "sent", recipientEmail };
        }

        return { outcome: "failed", recipientEmail };
      } catch (mailError) {
        console.error("Failed sending campaign bulk response email", {
          campaignId,
          responseId: response.id,
          recipientEmail,
          error: mailError,
        });
        return { outcome: "failed", recipientEmail };
      }
    }

    async function worker() {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= responsesToProcess.length) {
          return;
        }

        deliveryResults[currentIndex] = await processResponse(responsesToProcess[currentIndex]);
      }
    }

    if (responsesToProcess.length) {
      const workerCount = Math.min(bulkRespondConfig.concurrency, responsesToProcess.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }

    let sentCount = 0;
    let skippedCount = skippedByCap;
    let failedCount = 0;
    const failedRecipients = [];

    for (const result of deliveryResults) {
      if (!result) {
        continue;
      }

      if (result.outcome === "sent") {
        sentCount += 1;
        continue;
      }

      if (result.outcome === "skipped") {
        skippedCount += 1;
        continue;
      }

      failedCount += 1;
      if (result.recipientEmail) {
        failedRecipients.push(result.recipientEmail);
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

    if (mode === "one_time" && !responsesToProcess.length) {
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
      cappedByMaxRecipients: skippedByCap > 0,
      maxRecipients: bulkRespondConfig.maxRecipients,
      concurrency: responsesToProcess.length ? Math.min(bulkRespondConfig.concurrency, responsesToProcess.length) : 0,
      totalResponsesAvailable,
      totalResponsesConsidered: responsesToProcess.length,
      totalResponsesSkippedByCap: skippedByCap,
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
