-- Fix: self-service privilege escalation via the profiles UPDATE policy.
--
-- The existing UPDATE policy on public.profiles has no WITH CHECK
-- clause, so any authenticated user could run
--   update({ role: 'agent' }).eq('user_id', myUserId)   -- or even 'admin'
-- and Postgres would accept it, since the USING predicate (reused as the
-- check when WITH CHECK is omitted) never references the `role` column.
-- Every RLS policy on tickets/ticket_comments that matters is gated on
-- has_role(auth.uid(), 'agent'/'admin'), so this was a full authorization
-- bypass for the whole app.
--
-- Note: unlike the sibling desk-control project, ticketsense has only
-- ONE UPDATE policy on profiles (no separate lead/admin-update policy),
-- so after this fix there is no in-app path left to promote a user to
-- agent/admin — that now has to be done directly against the database
-- (e.g. via the Supabase dashboard with the service role) until/unless a
-- dedicated admin-only promotion path is built.

DROP POLICY "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- Fix: signup trigger trusted client-supplied role metadata.
--
-- handle_new_user() previously read NEW.raw_user_meta_data->>'role' and
-- cast it directly to the app_role enum (which includes 'admin'), with
-- no allowlist — exploitable via a raw signup API call outside the UI,
-- independent of the policy fix above. Every new signup now always gets
-- 'requester'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    'requester'::public.app_role
  );
  RETURN NEW;
END;
$$;
