-- CreateTable
CREATE TABLE "AdminGoogleDriveConnection" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "googleUserId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "googleDisplayName" TEXT,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "scopes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminGoogleDriveConnection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AdminProject"
ADD COLUMN "driveFolderId" TEXT,
ADD COLUMN "driveFolderName" TEXT,
ADD COLUMN "driveFolderUrl" TEXT,
ADD COLUMN "driveFolderLinkedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "AdminGoogleDriveConnection_adminId_key" ON "AdminGoogleDriveConnection"("adminId");

-- CreateIndex
CREATE INDEX "AdminGoogleDriveConnection_googleEmail_idx" ON "AdminGoogleDriveConnection"("googleEmail");

-- CreateIndex
CREATE INDEX "AdminGoogleDriveConnection_updatedAt_idx" ON "AdminGoogleDriveConnection"("updatedAt");

-- CreateIndex
CREATE INDEX "AdminProject_driveFolderId_idx" ON "AdminProject"("driveFolderId");

-- AddForeignKey
ALTER TABLE "AdminGoogleDriveConnection"
ADD CONSTRAINT "AdminGoogleDriveConnection_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
