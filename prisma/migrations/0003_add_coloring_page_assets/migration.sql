-- Create Table
CREATE TABLE "ColoringPageAsset" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "pdfKey" TEXT NOT NULL,
  "coverImageKey" TEXT NOT NULL,
  "thumbLargeKey" TEXT NOT NULL,
  "thumbSmallKey" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "fileSizeBytes" INTEGER,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ColoringPageAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ColoringPageAsset_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ColoringPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX "ColoringPageAsset_pageId_position_idx" ON "ColoringPageAsset" ("pageId", "position");
