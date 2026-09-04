CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InstrumentAccessRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "supervisor" TEXT,
    "email" TEXT NOT NULL,
    "requestedInstruments" TEXT NOT NULL,
    "experimentDescription" TEXT NOT NULL,
    "trainingRequired" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstrumentAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NoteWorkspace" (
    "userId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NoteWorkspace_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Instrument_name_idx" ON "Instrument"("name");
CREATE INDEX "InstrumentAccessRequest_createdAt_idx" ON "InstrumentAccessRequest"("createdAt");
CREATE INDEX "InstrumentAccessRequest_email_createdAt_idx" ON "InstrumentAccessRequest"("email", "createdAt");
CREATE INDEX "Reminder_userId_remindAt_idx" ON "Reminder"("userId", "remindAt");
CREATE INDEX "Reminder_emailedAt_remindAt_idx" ON "Reminder"("emailedAt", "remindAt");

ALTER TABLE "NoteWorkspace"
ADD CONSTRAINT "NoteWorkspace_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reminder"
ADD CONSTRAINT "Reminder_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Instrument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstrumentAccessRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NoteWorkspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reminder" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    target_table TEXT;
    policy_name TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lab_app') THEN
        RETURN;
    END IF;

    GRANT USAGE ON SCHEMA public TO lab_app;

    FOREACH target_table IN ARRAY ARRAY[
        'Instrument',
        'InstrumentAccessRequest',
        'NoteWorkspace',
        'Reminder'
    ]
    LOOP
        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO lab_app',
            target_table
        );

        policy_name := 'lab_app_all_' || lower(target_table);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO lab_app USING (true) WITH CHECK (true)',
            policy_name,
            target_table
        );
    END LOOP;
END
$$;
