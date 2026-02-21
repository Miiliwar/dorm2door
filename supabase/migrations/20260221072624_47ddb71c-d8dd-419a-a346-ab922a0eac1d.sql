
-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload payment screenshots
CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots');

-- Anyone can view payment screenshots
CREATE POLICY "Anyone can view payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots');

-- Add payment_account_info column to cafes for payment details (CBE, Telebirr, etc.)
ALTER TABLE public.cafes ADD COLUMN IF NOT EXISTS payment_info jsonb DEFAULT '{}';
