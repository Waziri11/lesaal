-- CreateTable
CREATE TABLE "AdminProject" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminProject_adminId_idx" ON "AdminProject"("adminId");

-- CreateIndex
CREATE INDEX "AdminProject_updatedAt_idx" ON "AdminProject"("updatedAt");

-- CreateIndex
CREATE INDEX "AdminProject_adminId_updatedAt_id_idx" ON "AdminProject"("adminId", "updatedAt", "id");

-- AddForeignKey
ALTER TABLE "AdminProject"
ADD CONSTRAINT "AdminProject_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
