-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('HERO', 'STATS_BAND', 'CLIENT_LOGOS', 'SERVICES_GRID', 'COMMENTARY', 'PRICING', 'FAQ', 'FOOTER', 'SERVICES', 'CLIENTS_TESTIMONY', 'CAMPAIGN_FORM', 'CARDS', 'LIST', 'TABLE', 'RICH_TEXT', 'CTA', 'FORM');

-- CreateEnum
CREATE TYPE "ComponentVariant" AS ENUM ('DEFAULT', 'CARD', 'LIST', 'TABLE', 'GRID');

-- CreateEnum
CREATE TYPE "TextAnimationPreset" AS ENUM ('NONE', 'FADE_UP', 'SLIDE_IN', 'ZOOM_IN', 'TYPEWRITER');

-- CreateEnum
CREATE TYPE "SectionAnimationPreset" AS ENUM ('NONE', 'FADE_IN', 'SCALE_IN', 'SLIDE_UP');

-- CreateEnum
CREATE TYPE "ScrollAnimationPreset" AS ENUM ('NONE', 'PARALLAX', 'STICKY', 'REVEAL');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageConfig" (
    "id" TEXT NOT NULL,
    "siteTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingSection" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "componentVariant" "ComponentVariant" NOT NULL DEFAULT 'DEFAULT',
    "textAnimation" "TextAnimationPreset" NOT NULL DEFAULT 'FADE_UP',
    "sectionAnimation" "SectionAnimationPreset" NOT NULL DEFAULT 'FADE_IN',
    "scrollAnimation" "ScrollAnimationPreset" NOT NULL DEFAULT 'NONE',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "value" TEXT,
    "extra" JSONB,

    CONSTRAINT "SectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFormField" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "options" JSONB,
    "order" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CampaignFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSubmission" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOtpCode" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "LandingSection_configId_idx" ON "LandingSection"("configId");

-- CreateIndex
CREATE INDEX "LandingSection_order_idx" ON "LandingSection"("order");

-- CreateIndex
CREATE INDEX "SectionItem_sectionId_idx" ON "SectionItem"("sectionId");

-- CreateIndex
CREATE INDEX "SectionItem_order_idx" ON "SectionItem"("order");

-- CreateIndex
CREATE INDEX "CampaignFormField_configId_idx" ON "CampaignFormField"("configId");

-- CreateIndex
CREATE INDEX "CampaignFormField_order_idx" ON "CampaignFormField"("order");

-- CreateIndex
CREATE INDEX "CampaignSubmission_configId_idx" ON "CampaignSubmission"("configId");

-- CreateIndex
CREATE INDEX "CampaignSubmission_submittedAt_idx" ON "CampaignSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "EmailOtpCode_adminId_idx" ON "EmailOtpCode"("adminId");

-- CreateIndex
CREATE INDEX "EmailOtpCode_email_idx" ON "EmailOtpCode"("email");

-- CreateIndex
CREATE INDEX "EmailOtpCode_expiresAt_idx" ON "EmailOtpCode"("expiresAt");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingSection" ADD CONSTRAINT "LandingSection_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LandingPageConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionItem" ADD CONSTRAINT "SectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "LandingSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFormField" ADD CONSTRAINT "CampaignFormField_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LandingPageConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSubmission" ADD CONSTRAINT "CampaignSubmission_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LandingPageConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOtpCode" ADD CONSTRAINT "EmailOtpCode_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
