-- The Next.js server uses one restricted PostgreSQL login. Application-level
-- authorization decides which signed-in user may access each row; these RLS
-- policies allow that trusted server role to perform those checked operations
-- while anon/authenticated Supabase API roles remain blocked by default.
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
        'User',
        'PendingInvite',
        'AppConfig',
        'Announcement',
        'LabDocument',
        'DocumentRecipient',
        'Notification',
        'GoogleConnection'
    ]
    LOOP
        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO lab_app',
            target_table
        );

        policy_name := 'lab_app_all_' || lower(target_table);
        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = target_table
              AND policyname = policy_name
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO lab_app USING (true) WITH CHECK (true)',
                policy_name,
                target_table
            );
        END IF;
    END LOOP;
END
$$;
