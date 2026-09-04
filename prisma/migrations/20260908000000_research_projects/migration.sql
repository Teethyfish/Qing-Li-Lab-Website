CREATE TABLE "ResearchProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tileImageUrl" TEXT,
    "mainImageUrl" TEXT,
    "supportingImages" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchProjectParticipant" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ResearchProjectParticipant_pkey" PRIMARY KEY ("projectId", "userId")
);

CREATE UNIQUE INDEX "ResearchProject_slug_key" ON "ResearchProject"("slug");
CREATE INDEX "ResearchProject_isPublished_createdAt_idx" ON "ResearchProject"("isPublished", "createdAt");
CREATE INDEX "ResearchProjectParticipant_userId_idx" ON "ResearchProjectParticipant"("userId");

ALTER TABLE "ResearchProjectParticipant"
    ADD CONSTRAINT "ResearchProjectParticipant_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchProjectParticipant"
    ADD CONSTRAINT "ResearchProjectParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResearchProjectParticipant" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    target_table TEXT;
    policy_name TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lab_app') THEN
        RETURN;
    END IF;

    FOREACH target_table IN ARRAY ARRAY['ResearchProject', 'ResearchProjectParticipant']
    LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO lab_app', target_table);
        policy_name := 'lab_app_all_' || lower(target_table);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO lab_app USING (true) WITH CHECK (true)',
            policy_name,
            target_table
        );
    END LOOP;
END
$$;
