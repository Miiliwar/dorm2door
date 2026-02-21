-- Allow delivery workers to view order_items for orders assigned to them
CREATE POLICY "Delivery workers can view assigned order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.delivery_assignments da
    JOIN public.delivery_workers dw ON dw.id = da.worker_id
    WHERE da.order_id = order_id
    AND dw.user_id = auth.uid()
  )
);
