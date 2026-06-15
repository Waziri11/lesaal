import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import { getGoogleDriveAccessContextForAdmin, isGoogleOAuthReauthRequiredError } from "../../../../../../lib/google-drive-authz";
import { getGooglePickerConfig } from "../../../../../../lib/google-drive";
import { isMissingAdminGoogleDriveConnectionTableError } from "../../../../../../lib/project-repository";

let hasWarnedMissingGoogleDriveConnectionSchema = false;

function warnMissingGoogleDriveConnectionSchema() {
  if (hasWarnedMissingGoogleDriveConnectionSchema) {
    return;
  }

  console.warn("AdminGoogleDriveConnection table is missing. Google Drive integration endpoints are in compatibility mode.");
  hasWarnedMissingGoogleDriveConnectionSchema = true;
}

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let driveAccessContext = null;

    try {
      driveAccessContext = await getGoogleDriveAccessContextForAdmin(admin.id);
    } catch (error) {
      if (!isMissingAdminGoogleDriveConnectionTableError(error)) {
        throw error;
      }

      warnMissingGoogleDriveConnectionSchema();
      return NextResponse.json(
        { error: "Google Drive integration is unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    if (!driveAccessContext?.connection) {
      return NextResponse.json({ error: "Google Drive account is not connected." }, { status: 404 });
    }

    const pickerConfig = getGooglePickerConfig();

    return NextResponse.json({
      success: true,
      accessToken: driveAccessContext.accessToken,
      expiresIn: driveAccessContext.expiresIn,
      developerKey: pickerConfig.developerKey,
      appId: pickerConfig.appId,
    });
  } catch (error) {
    if (isGoogleOAuthReauthRequiredError(error)) {
      return NextResponse.json(
        { error: "Google authorization has expired. Please reconnect your Google account." },
        { status: 401 }
      );
    }

    console.error("Failed to create Google Picker token", error);
    return NextResponse.json({ error: "Unable to initialize Google Picker." }, { status: 500 });
  }
}
