-- Check if 'files' bucket exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'files') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false);
    END IF;
END $$;

-- Create storage policies only if they don't exist
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own files') THEN
        CREATE POLICY "Users can upload their own files"
        ON storage.objects
        FOR INSERT
        WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own files and task-related files') THEN
        CREATE POLICY "Users can view their own files and task-related files"
        ON storage.objects
        FOR SELECT
        USING (
          bucket_id = 'files' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
              SELECT 1 FROM file_uploads
              JOIN tasks ON file_uploads.task_id = tasks.id
              WHERE file_uploads.file_path = name 
              AND (tasks.assignee_id = auth.uid() OR tasks.created_by = auth.uid())
            )
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own files2') THEN
        CREATE POLICY "Users can delete their own files2"
        ON storage.objects
        FOR DELETE
        USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;