CREATE TYPE "LabCityType" AS ENUM ('KABUPATEN', 'KOTA');

CREATE TYPE "LabVillageType" AS ENUM ('KELURAHAN', 'DESA');

ALTER TABLE "Lab"
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
ADD COLUMN "villageType" "LabVillageType";

CREATE INDEX "Lab_provinceName_idx" ON "Lab"("provinceName");
CREATE INDEX "Lab_cityName_idx" ON "Lab"("cityName");
CREATE INDEX "Lab_districtName_idx" ON "Lab"("districtName");
CREATE INDEX "Lab_villageName_idx" ON "Lab"("villageName");
