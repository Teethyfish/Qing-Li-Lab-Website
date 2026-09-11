ALTER TABLE "ResearchProject"
    ADD COLUMN "isCollaboration" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ResearchProject_isCollaboration_isPublished_createdAt_idx"
    ON "ResearchProject"("isCollaboration", "isPublished", "createdAt");
