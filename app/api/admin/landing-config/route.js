import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import {
  addTemplateSectionToConfig,
  getLandingConfig,
  LANDING_CONFIG_CACHE_TAG,
  updateLandingConfig,
} from "../../../../lib/landing-config";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getLandingConfig({ bypassCache: true });
    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to load landing config", error);
    return NextResponse.json({ error: "Unable to load landing config." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const config = await updateLandingConfig(payload);
    revalidateTag(LANDING_CONFIG_CACHE_TAG);

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Failed to update landing config", error);
    return NextResponse.json({ error: "Unable to update landing config." }, { status: 500 });
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
    const templateType = String(body?.templateType || "HERO");
    const config = await addTemplateSectionToConfig(templateType);
    revalidateTag(LANDING_CONFIG_CACHE_TAG);

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Failed to add template section", error);
    return NextResponse.json({ error: "Unable to add template section." }, { status: 500 });
  }
}
