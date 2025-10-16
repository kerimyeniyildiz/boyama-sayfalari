-- Create Enums
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "Orientation" AS ENUM ('PORTRAIT', 'LANDSCAPE');
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- Create Tables
CREATE TABLE "ColoringPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "difficulty" "Difficulty" NOT NULL,
  "orientation" "Orientation" NOT NULL,
  "ageMin" INTEGER,
  "ageMax" INTEGER,
  "artist" TEXT,
  "license" TEXT,
  "sourceUrl" TEXT,
  "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
  "language" TEXT NOT NULL DEFAULT 'tr',
  "pdfKey" TEXT NOT NULL,
  "coverImageKey" TEXT NOT NULL,
  "thumbWebpKey" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "fileSizeBytes" INTEGER,
  "views" INTEGER NOT NULL DEFAULT 0,
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "searchVector" tsvector,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ColoringPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ColoringPageCategory" (
  "pageId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "ColoringPageCategory_pkey" PRIMARY KEY ("pageId", "categoryId"),
  CONSTRAINT "ColoringPageCategory_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ColoringPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ColoringPageCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ColoringPageTag" (
  "pageId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "ColoringPageTag_pkey" PRIMARY KEY ("pageId", "tagId"),
  CONSTRAINT "ColoringPageTag_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ColoringPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ColoringPageTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadEvent" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DownloadEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DownloadEvent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ColoringPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX "ColoringPage_slug_key" ON "ColoringPage" ("slug");
CREATE INDEX "ColoringPage_status_idx" ON "ColoringPage" ("status");
CREATE INDEX "ColoringPage_createdAt_idx" ON "ColoringPage" ("createdAt");
CREATE INDEX "ColoringPage_searchVector_idx" ON "ColoringPage" USING GIN ("searchVector");

CREATE UNIQUE INDEX "Category_slug_key" ON "Category" ("slug");
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag" ("slug");
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser" ("email");
CREATE INDEX "DownloadEvent_pageId_createdAt_idx" ON "DownloadEvent" ("pageId", "createdAt");

-- Trigger to keep search vector updated
CREATE OR REPLACE FUNCTION set_coloring_page_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    to_tsvector(
      'turkish',
      coalesce(NEW."title", '') || ' ' ||
      coalesce(NEW."description", '') || ' ' ||
      coalesce(NEW."artist", '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coloring_page_search_vector_trigger
BEFORE INSERT OR UPDATE ON "ColoringPage"
FOR EACH ROW EXECUTE FUNCTION set_coloring_page_search_vector();

-- Keep updatedAt in sync
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coloring_page_set_updated_at
BEFORE UPDATE ON "ColoringPage"
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER category_set_updated_at
BEFORE UPDATE ON "Category"
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER tag_set_updated_at
BEFORE UPDATE ON "Tag"
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER admin_user_set_updated_at
BEFORE UPDATE ON "AdminUser"
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
