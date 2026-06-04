import { NextResponse } from "next/server";
import { getPublishedCampaigns, isCampaignTableMissingError } from "../../../../lib/campaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const campaigns = await getPublishedCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Failed to load public campaigns", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json({ campaigns: [] });
    }

    return NextResponse.json({ error: "Unable to load campaigns." }, { status: 500 });
  }
}
