-- CreateEnum
CREATE TYPE "CalendarItemType" AS ENUM ('EVENT', 'TASK', 'REMINDER');

-- CreateEnum
CREATE TYPE "CalendarReminderChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "CalendarReminderDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "CalendarItem" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "type" "CalendarItemType" NOT NULL DEFAULT 'EVENT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "color" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarItemReminder" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "minutesBefore" INTEGER NOT NULL,
    "channels" "CalendarReminderChannel"[] NOT NULL,
    "nextTriggerAt" TIMESTAMP(3),
    "nextOccurrenceStartAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarItemReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarReminderDelivery" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "channel" "CalendarReminderChannel" NOT NULL,
    "occurrenceStartAt" TIMESTAMP(3) NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL,
    "status" "CalendarReminderDeliveryStatus" NOT NULL,
    "errorMessage" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarReminderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarItem_adminId_startAt_idx" ON "CalendarItem"("adminId", "startAt");

-- CreateIndex
CREATE INDEX "CalendarItem_adminId_updatedAt_idx" ON "CalendarItem"("adminId", "updatedAt");

-- CreateIndex
CREATE INDEX "CalendarItemReminder_itemId_idx" ON "CalendarItemReminder"("itemId");

-- CreateIndex
CREATE INDEX "CalendarItemReminder_nextTriggerAt_idx" ON "CalendarItemReminder"("nextTriggerAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarReminderDelivery_reminderId_occurrenceStartAt_channel_key" ON "CalendarReminderDelivery"("reminderId", "occurrenceStartAt", "channel");

-- CreateIndex
CREATE INDEX "CalendarReminderDelivery_adminId_channel_readAt_createdAt_idx" ON "CalendarReminderDelivery"("adminId", "channel", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "CalendarReminderDelivery_itemId_createdAt_idx" ON "CalendarReminderDelivery"("itemId", "createdAt");

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarItemReminder" ADD CONSTRAINT "CalendarItemReminder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CalendarItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminderDelivery" ADD CONSTRAINT "CalendarReminderDelivery_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminderDelivery" ADD CONSTRAINT "CalendarReminderDelivery_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CalendarItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminderDelivery" ADD CONSTRAINT "CalendarReminderDelivery_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "CalendarItemReminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
