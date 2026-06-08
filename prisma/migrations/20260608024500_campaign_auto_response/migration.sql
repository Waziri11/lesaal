-- AlterTable
ALTER TABLE "Campaign"
ADD COLUMN "autoResponseEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoResponseSubject" TEXT,
ADD COLUMN "autoResponseBody" TEXT,
ADD COLUMN "autoResponseUpdatedAt" TIMESTAMP(3);
