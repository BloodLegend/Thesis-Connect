-- Fix RLS policies for applications - allow all team members (not just creator)
DROP POLICY IF EXISTS "Users can view their related applications" ON public.applications;
CREATE POLICY "Users can view their related applications" 
ON public.applications 
FOR SELECT 
USING (
  (EXISTS ( 
    SELECT 1 FROM teams t
    JOIN profiles p ON p.id = auth.uid()
    WHERE t.id = applications.team_id 
    AND (
      t.member1_email = p.email OR 
      t.member2_email = p.email OR 
      t.member3_email = p.email
    )
  )) 
  OR (auth.uid() = supervisor_id) 
  OR (EXISTS ( 
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ))
);

-- Fix RLS policy for creating applications - allow any team member
DROP POLICY IF EXISTS "Students can create applications" ON public.applications;
CREATE POLICY "Team members can create applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (
  EXISTS ( 
    SELECT 1 FROM teams t
    JOIN profiles p ON p.id = auth.uid()
    WHERE t.id = applications.team_id 
    AND (
      t.member1_email = p.email OR 
      t.member2_email = p.email OR 
      t.member3_email = p.email
    )
  )
);

-- Fix RLS policies for meetings - allow all team members to view
DROP POLICY IF EXISTS "Team creators and supervisors can view meetings" ON public.meetings;
CREATE POLICY "Team members and supervisors can view meetings" 
ON public.meetings 
FOR SELECT 
USING (
  (EXISTS ( 
    SELECT 1 FROM teams t
    JOIN profiles p ON p.id = auth.uid()
    WHERE t.id = meetings.team_id 
    AND (
      t.member1_email = p.email OR 
      t.member2_email = p.email OR 
      t.member3_email = p.email
    )
  )) 
  OR (supervisor_id = auth.uid())
);

-- Fix RLS policy for creating meetings - allow any team member
DROP POLICY IF EXISTS "Team creators can create meetings" ON public.meetings;
CREATE POLICY "Team members can create meetings" 
ON public.meetings 
FOR INSERT 
WITH CHECK (
  EXISTS ( 
    SELECT 1 FROM teams t
    JOIN profiles p ON p.id = auth.uid()
    WHERE t.id = meetings.team_id 
    AND (
      t.member1_email = p.email OR 
      t.member2_email = p.email OR 
      t.member3_email = p.email
    )
  )
);

-- Fix RLS policies for progress_updates - allow all team members
DROP POLICY IF EXISTS "Users can view related progress updates" ON public.progress_updates;
CREATE POLICY "Users can view related progress updates" 
ON public.progress_updates 
FOR SELECT 
USING (
  EXISTS ( 
    SELECT 1 FROM applications a
    JOIN teams t ON a.team_id = t.id
    JOIN profiles p ON p.id = auth.uid()
    WHERE a.id = progress_updates.application_id 
    AND (
      t.member1_email = p.email OR 
      t.member2_email = p.email OR 
      t.member3_email = p.email OR
      a.supervisor_id = auth.uid()
    )
  )
);

-- Fix RLS policy for inserting progress updates - allow any team member
DROP POLICY IF EXISTS "Team creators and supervisors can add progress" ON public.progress_updates;
CREATE POLICY "Team members and supervisors can add progress" 
ON public.progress_updates 
FOR INSERT 
WITH CHECK (
  EXISTS ( 
    SELECT 1 FROM applications a
    JOIN teams t ON a.team_id = t.id
    JOIN profiles p ON p.id = auth.uid()
    WHERE a.id = progress_updates.application_id 
    AND (
      t.member1_email = p.email OR 
      t.member2_email = p.email OR 
      t.member3_email = p.email OR
      a.supervisor_id = auth.uid()
    )
  )
);