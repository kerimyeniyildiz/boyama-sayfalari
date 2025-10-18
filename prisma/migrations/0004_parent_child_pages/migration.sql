-- Drop existing assets table as pages will represent individual coloring entries
DROP TABLE IF EXISTS "ColoringPageAsset";

-- Add parentId column to ColoringPage for hierarchy
ALTER TABLE "ColoringPage"
ADD COLUMN "parentId" TEXT;

ALTER TABLE "ColoringPage"
ADD CONSTRAINT "ColoringPage_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "ColoringPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ColoringPage_parentId_idx" ON "ColoringPage"("parentId");
