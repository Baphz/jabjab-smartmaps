-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('LIBUR_NASIONAL', 'CUTI_BERSAMA');

-- CreateTable
CREATE TABLE "LabEvent" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationName" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timeLabel" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterHoliday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HolidayType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabEvent_labId_startDate_idx" ON "LabEvent"("labId", "startDate");

-- CreateIndex
CREATE INDEX "LabEvent_isPublished_startDate_idx" ON "LabEvent"("isPublished", "startDate");

-- CreateIndex
CREATE INDEX "MasterHoliday_date_idx" ON "MasterHoliday"("date");

-- CreateIndex
CREATE INDEX "MasterHoliday_type_date_idx" ON "MasterHoliday"("type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MasterHoliday_date_type_key" ON "MasterHoliday"("date", "type");

-- AddForeignKey
ALTER TABLE "LabEvent" ADD CONSTRAINT "LabEvent_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
