-- AlterTable
ALTER TABLE "LabEvent"
  ADD COLUMN "isGlobal" BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN "labId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "LabEvent_isGlobal_startDate_idx" ON "LabEvent"("isGlobal", "startDate");
