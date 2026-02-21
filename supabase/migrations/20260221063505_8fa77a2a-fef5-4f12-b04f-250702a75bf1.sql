
-- Fix overly permissive notification insert policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only admins and cafe managers can create notifications (plus the system via service role)
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cafe_manager'));
