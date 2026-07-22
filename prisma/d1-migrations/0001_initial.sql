CREATE TABLE "ColoringPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seoContent" TEXT,
    "orientation" TEXT NOT NULL DEFAULT 'PORTRAIT',
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "artist" TEXT,
    "license" TEXT,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishAt" DATETIME,
    "language" TEXT NOT NULL DEFAULT 'tr',
    "pdfKey" TEXT NOT NULL,
    "coverImageKey" TEXT NOT NULL,
    "thumbWebpKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSizeBytes" INTEGER,
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "parentId" TEXT,
    CONSTRAINT "ColoringPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ColoringPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ColoringPageCategory" (
    "pageId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    PRIMARY KEY ("pageId", "categoryId"),
    CONSTRAINT "ColoringPageCategory_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ColoringPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColoringPageCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ColoringPageTag" (
    "pageId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("pageId", "tagId"),
    CONSTRAINT "ColoringPageTag_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ColoringPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColoringPageTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "DownloadEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DownloadEvent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ColoringPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ColoringPage_slug_key" ON "ColoringPage"("slug");
CREATE INDEX "ColoringPage_status_idx" ON "ColoringPage"("status");
CREATE INDEX "ColoringPage_publishAt_idx" ON "ColoringPage"("publishAt");
CREATE INDEX "ColoringPage_createdAt_idx" ON "ColoringPage"("createdAt");
CREATE INDEX "ColoringPage_parentId_idx" ON "ColoringPage"("parentId");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE INDEX "DownloadEvent_pageId_createdAt_idx" ON "DownloadEvent"("pageId", "createdAt");
