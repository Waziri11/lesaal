-- AlterTable
ALTER TABLE "Campaign"
ADD COLUMN "targetMarket" TEXT NOT NULL DEFAULT 'General Audience',
ADD COLUMN "deadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CampaignQuestion"
ADD COLUMN "sectionKey" TEXT,
ADD COLUMN "sectionTitle" TEXT,
ADD COLUMN "sectionDescription" TEXT,
ADD COLUMN "sectionOrder" INTEGER NOT NULL DEFAULT 0;
