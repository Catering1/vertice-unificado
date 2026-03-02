
CREATE POLICY "No direct insert" ON public.allowed_emails
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct update" ON public.allowed_emails
  FOR UPDATE
  USING (false);

CREATE POLICY "No direct delete" ON public.allowed_emails
  FOR DELETE
  USING (false);
