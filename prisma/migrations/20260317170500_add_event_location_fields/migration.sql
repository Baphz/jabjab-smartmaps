-- AlterTable
ALTER TABLE "LabEvent"
  ADD COLUMN "locationAddress" TEXT,
  ADD COLUMN "addressDetail" TEXT,
  ADD COLUMN "provinceId" TEXT,
  ADD COLUMN "provinceName" TEXT,
  ADD COLUMN "cityId" TEXT,
  ADD COLUMN "cityName" TEXT,
  ADD COLUMN "cityType" "LabCityType",
  ADD COLUMN "districtId" TEXT,
  ADD COLUMN "districtName" TEXT,
  ADD COLUMN "villageId" TEXT,
  ADD COLUMN "villageName" TEXT,
  ADD COLUMN "villageType" "LabVillageType",
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "LabEvent_provinceName_startDate_idx" ON "LabEvent"("provinceName", "startDate");
