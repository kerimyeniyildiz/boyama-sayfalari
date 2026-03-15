ALTER TABLE "ColoringPage"
ADD COLUMN "publishAt" TIMESTAMP(3);

CREATE INDEX "ColoringPage_publishAt_idx" ON "ColoringPage"("publishAt");
