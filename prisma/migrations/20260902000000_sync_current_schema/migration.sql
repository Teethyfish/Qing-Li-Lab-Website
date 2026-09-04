-- Bring databases created from the original migration up to the current schema.
-- IF NOT EXISTS keeps this safe for the deployed database, which may previously
-- have been updated with `prisma db push`.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustResetPassword" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "User_slug_key" ON "User"("slug");

CREATE TABLE IF NOT EXISTS "AppConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

DO $$
BEGIN
    CREATE TYPE "AnnouncementStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '{"en":""}',
    "text" TEXT NOT NULL,
    "croppedArea" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'ACTIVE',
    "hasDetailsPage" BOOLEAN NOT NULL DEFAULT false,
    "detailsSlug" TEXT,
    "detailsContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '{"en":""}';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "croppedArea" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "status" "AnnouncementStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "hasDetailsPage" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "detailsSlug" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "detailsContent" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Announcement_detailsSlug_key"
    ON "Announcement"("detailsSlug");
