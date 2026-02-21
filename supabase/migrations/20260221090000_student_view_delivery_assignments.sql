-- Allow students to see delivery assignments for their own orders
CREATE POLICY "Students can view own order assignments" ON public.delivery_assignments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_id
    AND orders.student_id = auth.uid()
  )
);
