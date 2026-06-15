-- Compatibility migration:
-- This migration originally referenced tables/columns introduced by later migrations.
-- Guard every operation so full migration replay (shadow DB) remains valid.

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'AdminNote'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "AdminNote_adminId_updatedAt_id_idx" ON "AdminNote"("adminId", "updatedAt", "id")';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'AdminNotification'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "AdminNotification_isRead_createdAt_id_idx" ON "AdminNotification"("isRead", "createdAt", "id")';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Campaign'
      AND column_name = 'deadline'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Campaign_isPublished_deadline_order_createdAt_idx" ON "Campaign"("isPublished", "deadline", "order", "createdAt")';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'CampaignResponse'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "CampaignResponse_campaignId_submittedAt_id_idx" ON "CampaignResponse"("campaignId", "submittedAt", "id")';
  END IF;
END $$;
