-- Finalize campaign defaults + performance indexes after all dependent columns/tables exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Campaign'
      AND column_name = 'targetMarket'
  ) THEN
    ALTER TABLE "Campaign" ALTER COLUMN "targetMarket" DROP DEFAULT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AdminNote_adminId_updatedAt_id_idx"
ON "AdminNote"("adminId", "updatedAt", "id");

CREATE INDEX IF NOT EXISTS "AdminNotification_isRead_createdAt_id_idx"
ON "AdminNotification"("isRead", "createdAt", "id");

CREATE INDEX IF NOT EXISTS "Campaign_isPublished_deadline_order_createdAt_idx"
ON "Campaign"("isPublished", "deadline", "order", "createdAt");

CREATE INDEX IF NOT EXISTS "CampaignResponse_campaignId_submittedAt_id_idx"
ON "CampaignResponse"("campaignId", "submittedAt", "id");
