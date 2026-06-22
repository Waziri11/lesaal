import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import {
  deleteCampaign,
  getCampaignByIdForAdmin,
  isCampaignTableMissingError,
  PUBLIC_CAMPAIGNS_CACHE_TAG,
  setCampaignPublishedState,
  updateCampaign,
} from "../../../../../lib/campaigns";
import { validateAdminMutationRequest } from "../../../../../lib/request-security";

export async function GET(request, { params }) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const campaignId = String(resolvedParams?.campaignId || "");
    const campaign = await getCampaignByIdForAdmin(campaignId);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Failed to load campaign", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json(
        { error: "Campaign tables are not initialized. Run database migrations and retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Unable to load campaign." }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const campaignId = String(resolvedParams?.campaignId || "");
    const body = await request.json();

    const existing = await getCampaignByIdForAdmin(campaignId);

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const campaign = await updateCampaign(campaignId, body);
    revalidateTag(PUBLIC_CAMPAIGNS_CACHE_TAG);
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Failed to update campaign", error);

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

    return NextResponse.json({ error: "Unable to update campaign." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const campaignId = String(resolvedParams?.campaignId || "");
    const existing = await getCampaignByIdForAdmin(campaignId);

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    await deleteCampaign(campaignId);
    revalidateTag(PUBLIC_CAMPAIGNS_CACHE_TAG);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete campaign", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json(
        { error: "Campaign tables are not initialized. Run database migrations and retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Unable to delete campaign." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const campaignId = String(resolvedParams?.campaignId || "");
    const body = await request.json();
    const isPublished = body?.isPublished;

    if (typeof isPublished !== "boolean") {
      return NextResponse.json({ error: "isPublished must be a boolean value." }, { status: 400 });
    }

    const existing = await getCampaignByIdForAdmin(campaignId);

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const campaign = await setCampaignPublishedState(campaignId, isPublished);
    revalidateTag(PUBLIC_CAMPAIGNS_CACHE_TAG);
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Failed to update campaign publish state", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json(
        { error: "Campaign tables are not initialized. Run database migrations and retry." },
        { status: 500 }
      );
    }

    const rawMessage = String(error?.message || "").trim();
    const isValidationError = /required|invalid|not found/i.test(rawMessage);

    if (isValidationError) {
      return NextResponse.json({ error: rawMessage || "Invalid publish state payload." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to update campaign publish state." }, { status: 500 });
  }
}
