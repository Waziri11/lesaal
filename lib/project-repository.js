export const ADMIN_PROJECT_REPOSITORY_SELECT = {
  id: true,
  adminId: true,
  name: true,
  driveFolderId: true,
  driveFolderName: true,
  driveFolderUrl: true,
  driveFolderLinkedAt: true,
  createdAt: true,
  updatedAt: true,
};

export const ADMIN_GOOGLE_DRIVE_CONNECTION_SELECT = {
  id: true,
  adminId: true,
  googleUserId: true,
  googleEmail: true,
  googleDisplayName: true,
  refreshTokenEncrypted: true,
  scopes: true,
  createdAt: true,
  updatedAt: true,
};

export function isMissingAdminProjectTableError(error) {
  if (!error) return false;
  if (error?.code !== "P2021" && error?.code !== "P2022") {
    return false;
  }

  const message = String(error?.message || "").toLowerCase();
  return message.includes("adminproject");
}

export function isMissingAdminGoogleDriveConnectionTableError(error) {
  if (!error) return false;
  if (error?.code !== "P2021" && error?.code !== "P2022") {
    return false;
  }

  const message = String(error?.message || "").toLowerCase();
  return message.includes("admingoogledriveconnection");
}

export function isMissingProjectRepositoryColumnsError(error) {
  if (!error || error?.code !== "P2022") {
    return false;
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("drivefolderid") ||
    message.includes("drivefoldername") ||
    message.includes("drivefolderurl") ||
    message.includes("drivefolderlinkedat")
  );
}

export function toRepositoryPayload(project) {
  return {
    projectId: project?.id || "",
    projectName: project?.name || "Untitled project",
    folderId: project?.driveFolderId || "",
    folderName: project?.driveFolderName || "",
    folderUrl: project?.driveFolderUrl || "",
    linkedAt: project?.driveFolderLinkedAt ? new Date(project.driveFolderLinkedAt).toISOString() : "",
  };
}
