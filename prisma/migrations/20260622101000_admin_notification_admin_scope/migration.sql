-- Add notification ownership by admin.
ALTER TABLE "AdminNotification"
ADD COLUMN "adminId" TEXT;

WITH default_admin AS (
  SELECT "id"
  FROM "AdminUser"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
UPDATE "AdminNotification" AS notification
SET "adminId" = default_admin."id"
FROM default_admin
WHERE notification."adminId" IS NULL;

ALTER TABLE "AdminNotification"
ALTER COLUMN "adminId" SET NOT NULL;

CREATE INDEX "AdminNotification_adminId_idx" ON "AdminNotification"("adminId");

CREATE INDEX "AdminNotification_adminId_createdAt_id_idx"
ON "AdminNotification"("adminId", "createdAt", "id");

ALTER TABLE "AdminNotification"
ADD CONSTRAINT "AdminNotification_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
