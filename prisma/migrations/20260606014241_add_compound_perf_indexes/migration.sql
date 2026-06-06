-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "targetMarket" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AdminNote_adminId_updatedAt_id_idx" ON "AdminNote"("adminId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "AdminNotification_isRead_createdAt_id_idx" ON "AdminNotification"("isRead", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Campaign_isPublished_deadline_order_createdAt_idx" ON "Campaign"("isPublished", "deadline", "order", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignResponse_campaignId_submittedAt_id_idx" ON "CampaignResponse"("campaignId", "submittedAt", "id");
