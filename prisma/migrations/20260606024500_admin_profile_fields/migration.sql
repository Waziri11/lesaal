-- AlterTable
ALTER TABLE "AdminUser"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "companyName" TEXT NOT NULL DEFAULT 'Lesaal',
ADD COLUMN "companyDescription" TEXT,
ADD COLUMN "gender" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "district" TEXT,
ADD COLUMN "ward" TEXT;
