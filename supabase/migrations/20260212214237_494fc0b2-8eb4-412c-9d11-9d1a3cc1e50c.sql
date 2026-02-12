
-- Table of pre-authorized emails
CREATE TABLE public.allowed_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read (to check during signup flow via edge function)
-- No public access to prevent email enumeration
CREATE POLICY "No direct access" ON public.allowed_emails FOR SELECT USING (false);
