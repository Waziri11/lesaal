import { NextResponse } from "next/server";
import { isCampaignTableMissingError, normalizeCampaignResponseData } from "../../../../../../lib/campaigns";
import { sendCampaignNotification } from "../../../../../../lib/mailer";
import { ensureDatabaseReady, prisma } from "../../../../../../lib/prisma";

export async function POST(request, { params }) {
  try {
    await ensureDatabaseReady();

    const slug = String(params?.slug || "");

    const campaign = await prisma.campaign.findFirst({
      where: {
        slug,
        isPublished: true,
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

    const body = await request.json();
    const submittedData = body?.data && typeof body.data === "object" ? body.data : body;

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
