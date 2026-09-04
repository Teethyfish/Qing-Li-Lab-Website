DO $$
BEGIN
    CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'ALUMNI', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "LabDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emailSubject" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LabDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentRecipient" (
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    CONSTRAINT "DocumentRecipient_pkey" PRIMARY KEY ("documentId", "userId")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoogleConnection" (
    "id" TEXT NOT NULL DEFAULT 'google',
    "email" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LabDocument_driveFileId_key" ON "LabDocument"("driveFileId");
CREATE INDEX "LabDocument_isPublic_createdAt_idx" ON "LabDocument"("isPublic", "createdAt");
CREATE INDEX "DocumentRecipient_userId_idx" ON "DocumentRecipient"("userId");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

ALTER TABLE "LabDocument"
    ADD CONSTRAINT "LabDocument_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentRecipient"
    ADD CONSTRAINT "DocumentRecipient_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "LabDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentRecipient"
    ADD CONSTRAINT "DocumentRecipient_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "LabDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
