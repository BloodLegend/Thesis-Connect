-- Add unique constraint on student_id in profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_student_id_unique UNIQUE (student_id);

-- Add rejection_reason column to applications table
ALTER TABLE public.applications ADD COLUMN rejection_reason TEXT;

-- Create storage bucket for thesis draft files
INSERT INTO storage.buckets (id, name, public) VALUES ('thesis-drafts', 'thesis-drafts', false);

-- Add file_url column to progress_updates table
ALTER TABLE public.progress_updates ADD COLUMN file_url TEXT;

-- Storage policies for thesis-drafts bucket
CREATE POLICY "Authenticated users can upload thesis drafts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thesis-drafts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view thesis drafts they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'thesis-drafts'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own thesis drafts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'thesis-drafts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own thesis drafts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'thesis-drafts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);