-- Indexes on foreign-key/filter columns used by the app's queries
-- (Postgres does not auto-index FK columns).
CREATE INDEX IF NOT EXISTS idx_tickets_requester_id ON public.tickets (requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments (ticket_id);

-- The "Users can view all profiles" policy (USING (true)) let any
-- authenticated requester enumerate every other user's name and role.
-- Only the owner's own profile fetch (useAuth.tsx) and the agent
-- dashboard (already role-gated) actually need this — tighten it.
DROP POLICY "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile, agents view all"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'admin')
);
