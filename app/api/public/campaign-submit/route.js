import { NextResponse } from "next/server";
import { getLandingConfig } from "../../../../lib/landing-config";
import { prisma } from "../../../../lib/prisma";
import { sendCampaignNotification } from "../../../../lib/mailer";

export async function POST(request) {
  try {
    const body = await request.json();
    const submittedData = body?.data && typeof body.data === "object" ? body.data : body;

    if (!submittedData || typeof submittedData !== "object") {
      return NextResponse.json({ error: "Invalid submission payload." }, { status: 400 });
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

    const emailResult = await sendCampaignNotification({ submissionData: cleanedData });

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
