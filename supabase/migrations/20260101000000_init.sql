-- ===================================================================
-- TicketSense — initial schema
-- Roles: requester (opens tickets), agent (works tickets), admin
-- ===================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'requester');
CREATE TYPE public.ticket_category AS ENUM ('hardware', 'software', 'network', 'access', 'other');
CREATE TYPE public.ticket_urgency AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- -------------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'requester',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- tickets
-- -------------------------------------------------------------------
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Set by the AI classification step (nullable until classified)
  ai_category public.ticket_category,
  ai_urgency public.ticket_urgency,
  ai_suggested_steps JSONB,
  ai_classified_at TIMESTAMP WITH TIME ZONE,

  -- Can be overridden by an agent; falls back to the AI's own read when null
  final_category public.ticket_category,
  final_urgency public.ticket_urgency,

  status public.ticket_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.profiles(user_id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- -------------------------------------------------------------------
-- ticket_comments (agent notes / responses, visible to the requester too)
-- -------------------------------------------------------------------
CREATE TABLE public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(user_id),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------
-- has_role(): SECURITY DEFINER function, avoids RLS recursion
-- (same pattern used in Desk Control)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- -------------------------------------------------------------------
-- RLS: profiles
-- -------------------------------------------------------------------
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- -------------------------------------------------------------------
-- RLS: tickets
-- Requesters: only their own tickets. Agents/Admins: everything.
-- -------------------------------------------------------------------
CREATE POLICY "Requesters can view their own tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (
  requester_id = auth.uid()
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Requesters can create their own tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Agents can update any ticket, requesters cannot"
ON public.tickets FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'admin')
);

-- -------------------------------------------------------------------
-- RLS: ticket_comments
-- Visible to the ticket's requester and to any agent/admin.
-- -------------------------------------------------------------------
CREATE POLICY "Comments visible to ticket owner and agents"
ON public.ticket_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
    AND (t.requester_id = auth.uid() OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Ticket owner and agents can add comments"
ON public.ticket_comments FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
    AND (t.requester_id = auth.uid() OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'admin'))
  )
);

-- -------------------------------------------------------------------
-- updated_at triggers
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- (role comes from the signup form's metadata, defaults to 'requester')
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'requester');
  EXCEPTION
    WHEN invalid_text_representation THEN
      user_role := 'requester';
  END;

  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
