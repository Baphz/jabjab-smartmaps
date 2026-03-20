ALTER TABLE "LabEvent"
ADD COLUMN "relatedArticleId" TEXT;

CREATE INDEX "LabEvent_relatedArticleId_idx" ON "LabEvent"("relatedArticleId");

ALTER TABLE "LabEvent"
ADD CONSTRAINT "LabEvent_relatedArticleId_fkey"
FOREIGN KEY ("relatedArticleId")
REFERENCES "Article"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
