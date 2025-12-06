-- Add leisure_time field to supervisors table
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS leisure_time text;

-- Create meetings table for scheduling
CREATE TABLE public.meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  supervisor_id uuid REFERENCES public.supervisors(id) ON DELETE CASCADE,
  proposed_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies for meetings
CREATE POLICY "Team creators can create meetings"
ON public.meetings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams WHERE teams.id = meetings.team_id AND teams.creator_id = auth.uid()
  )
);

CREATE POLICY "Team creators and supervisors can view meetings"
ON public.meetings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM teams WHERE teams.id = meetings.team_id AND teams.creator_id = auth.uid()
  )
  OR supervisor_id = auth.uid()
);

CREATE POLICY "Supervisors can update meetings"
ON public.meetings FOR UPDATE
USING (supervisor_id = auth.uid());

-- Supervisors can update their own profile (for leisure_time)
CREATE POLICY "Supervisors can update their own supervisor record"
ON public.supervisors FOR UPDATE
USING (id = auth.uid());

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;