import { NextResponse } from "next/server";
import { getLandingConfig } from "../../../../lib/landing-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getLandingConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to fetch public landing config", error);
    return NextResponse.json({ error: "Unable to load landing page." }, { status: 500 });
  }
}
