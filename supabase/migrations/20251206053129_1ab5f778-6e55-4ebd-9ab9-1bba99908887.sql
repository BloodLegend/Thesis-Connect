-- Add RLS policy for supervisors to manage their own research cells
CREATE POLICY "Supervisors can manage their own research cells"
ON public.supervisor_research_cells
FOR ALL
USING (supervisor_id = auth.uid())
WITH CHECK (supervisor_id = auth.uid());