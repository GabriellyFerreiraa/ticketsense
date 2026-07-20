-- Allow requesters to delete their own tickets (e.g. test/duplicate tickets),
-- and agents/admins to delete any ticket for cleanup purposes.

GRANT DELETE ON public.tickets TO authenticated;

CREATE POLICY "Requesters can delete their own tickets, agents can delete any"
ON public.tickets FOR DELETE
TO authenticated
USING (
  requester_id = auth.uid()
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'admin')
);
