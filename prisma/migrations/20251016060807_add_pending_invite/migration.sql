-- CreateTable
CREATE TABLE "PendingInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    "decidedById" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingInvite_email_key" ON "PendingInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PendingInvite_slug_key" ON "PendingInvite"("slug");
