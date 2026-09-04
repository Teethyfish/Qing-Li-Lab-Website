ALTER TABLE "User" ADD COLUMN "profileContent" JSONB;

CREATE TABLE "AnnouncementRead" (
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("userId", "announcementId")
);

CREATE INDEX "AnnouncementRead_announcementId_idx" ON "AnnouncementRead"("announcementId");

ALTER TABLE "AnnouncementRead"
ADD CONSTRAINT "AnnouncementRead_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnnouncementRead"
ADD CONSTRAINT "AnnouncementRead_announcementId_fkey"
FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnnouncementRead" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lab_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."AnnouncementRead" TO lab_app;
        CREATE POLICY "lab_app_all_announcementread"
        ON public."AnnouncementRead"
        FOR ALL TO lab_app
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;
