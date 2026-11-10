-- Fix F-02 (Supabase Launch Check, 2026-10-27): requesters could set workflow
-- fields when creating a ticket.
--
-- The INSERT policy on public.tickets only checks requester_id = auth.uid(),
-- so a self-registered user could create tickets that are already
-- "resolved", marked "critical" or assigned to a specific agent.
--
-- This trigger resets the workflow fields to their defaults for inserts made
-- through the Data API (role "authenticated"). Inserts from the dashboard or
-- with the service role are left alone. The normal ticket form never sends
-- these fields, so the app keeps working unchanged.
--
-- Phase 2 (not in this migration): move the ai_* fields to the
-- classify-ticket Edge Function and reset them here too.
--
-- Rollback:
--   drop trigger if exists enforce_ticket_insert_defaults on public.tickets;
--   drop function if exists public.enforce_ticket_insert_defaults();

create or replace function public.enforce_ticket_insert_defaults()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  if current_user = 'authenticated' then
    new.status         := 'open';
    new.assigned_to    := null;
    new.final_category := null;
    new.final_urgency  := null;
    new.resolved_at    := null;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_ticket_insert_defaults on public.tickets;
create trigger enforce_ticket_insert_defaults
  before insert on public.tickets
  for each row execute function public.enforce_ticket_insert_defaults();
