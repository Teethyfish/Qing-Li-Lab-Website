CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LabDocument" ADD COLUMN "categoryId" TEXT;

CREATE UNIQUE INDEX "DocumentCategory_name_key" ON "DocumentCategory"("name");
CREATE UNIQUE INDEX "DocumentCategory_slug_key" ON "DocumentCategory"("slug");
CREATE INDEX "DocumentCategory_sortOrder_name_idx" ON "DocumentCategory"("sortOrder", "name");
CREATE INDEX "LabDocument_categoryId_createdAt_idx" ON "LabDocument"("categoryId", "createdAt");

ALTER TABLE "LabDocument"
    ADD CONSTRAINT "LabDocument_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentCategory" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lab_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."DocumentCategory" TO lab_app;
        CREATE POLICY "lab_app_all_documentcategory"
            ON public."DocumentCategory" FOR ALL TO lab_app
            USING (true) WITH CHECK (true);
    END IF;
END
$$;
