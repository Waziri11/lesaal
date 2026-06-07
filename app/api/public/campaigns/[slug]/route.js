import { NextResponse } from "next/server";
import { getCampaignBySlugForPublic, isCampaignTableMissingError } from "../../../../../lib/campaigns";

export const revalidate = 60;

export async function GET(_request, { params }) {
  try {
    const resolvedParams = await params;
    const slug = String(resolvedParams?.slug || "");
    const campaign = await getCampaignBySlugForPublic(slug);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Failed to load campaign", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to load campaign." }, { status: 500 });
  }
}
