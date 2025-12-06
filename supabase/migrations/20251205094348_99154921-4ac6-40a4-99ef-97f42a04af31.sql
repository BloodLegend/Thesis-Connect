-- Add INSERT policy for supervisors table so supervisors can create their own record
CREATE POLICY "Supervisors can insert their own supervisor record"
ON public.supervisors
FOR INSERT
WITH CHECK (id = auth.uid());

-- Add target_audience column to global_notices for supervisor-only notices
ALTER TABLE public.global_notices 
ADD COLUMN target_audience text NOT NULL DEFAULT 'all';

-- Add comment for clarity
COMMENT ON COLUMN public.global_notices.target_audience IS 'Can be: all, supervisors_only';