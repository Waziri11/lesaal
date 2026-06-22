import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import {
  createCampaign,
  getAdminCampaigns,
  isCampaignTableMissingError,
  PUBLIC_CAMPAIGNS_CACHE_TAG,
} from "../../../../lib/campaigns";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await getAdminCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Failed to list campaigns", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json({ campaigns: [], warning: "Campaign tables are not initialized yet." });
    }

    return NextResponse.json({ error: "Unable to load campaigns." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const campaign = await createCampaign(body);
    revalidateTag(PUBLIC_CAMPAIGNS_CACHE_TAG);

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Failed to create campaign", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json(
        { error: "Campaign tables are not initialized. Run database migrations and retry." },
        { status: 500 }
      );
    }

    const rawMessage = String(error?.message || "").trim();
    const isValidationError = /required|invalid|not found/i.test(rawMessage);

    if (isValidationError) {
      return NextResponse.json({ error: rawMessage || "Invalid campaign payload." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to create campaign." }, { status: 500 });
  }
}
