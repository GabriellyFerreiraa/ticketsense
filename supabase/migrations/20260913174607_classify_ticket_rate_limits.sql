-- Backs a simple per-user rate limit for the classify-ticket Edge Function.
-- Written to and read from only via the function's service-role client,
-- so no RLS policies are needed (and none are granted to client roles).

CREATE TABLE IF NOT EXISTS public.classify_ticket_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.classify_ticket_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (used exclusively inside the Edge
-- Function) can read/write this table; it's not part of the public API.
