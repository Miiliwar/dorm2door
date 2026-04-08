-- Create student meal plans table for tracking prepaid amounts and usage
CREATE TABLE IF NOT EXISTS student_meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  used_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'low_balance', 'negative', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month_year TEXT NOT NULL, -- Format: "2024-04" for April 2024
  UNIQUE(student_id, cafe_id, month_year)
);

-- Create meal transactions table for tracking daily usage
CREATE TABLE IF NOT EXISTS meal_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES student_meal_plans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit', 'payment')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies
ALTER TABLE student_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_transactions ENABLE ROW LEVEL SECURITY;

-- Students can view their own meal plans
CREATE POLICY "Students can view own meal plans" ON student_meal_plans
  FOR SELECT USING (student_id = auth.uid());

-- Cafe managers can view meal plans for their cafes
CREATE POLICY "Cafe managers can view their cafe meal plans" ON student_meal_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cafes 
      WHERE cafes.id = student_meal_plans.cafe_id 
      AND cafes.manager_id = auth.uid()
    )
  );

-- Students can view their own transactions
CREATE POLICY "Students can view own transactions" ON meal_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_meal_plans 
      WHERE student_meal_plans.id = meal_transactions.meal_plan_id 
      AND student_meal_plans.student_id = auth.uid()
    )
  );

-- Cafe managers can view transactions for their cafes
CREATE POLICY "Cafe managers can view their cafe transactions" ON meal_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_meal_plans smp
      JOIN cafes c ON c.id = smp.cafe_id
      WHERE smp.id = meal_transactions.meal_plan_id 
      AND c.manager_id = auth.uid()
    )
  );

-- Create function to update meal plan status based on remaining amount
CREATE OR REPLACE FUNCTION update_meal_plan_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate percentage remaining
  DECLARE
    percentage_remaining DECIMAL;
  BEGIN
    IF NEW.total_amount > 0 THEN
      percentage_remaining := (NEW.remaining_amount / NEW.total_amount) * 100;
    ELSE
      percentage_remaining := 0;
    END IF;

    -- Update status based on remaining amount
    IF NEW.remaining_amount < 0 THEN
      NEW.status := 'negative';
    ELSIF percentage_remaining <= 25 THEN
      NEW.status := 'low_balance';
    ELSE
      NEW.status := 'active';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status
CREATE TRIGGER update_meal_plan_status_trigger
  BEFORE UPDATE ON student_meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_plan_status();

-- Create function to handle meal transactions
CREATE OR REPLACE FUNCTION process_meal_transaction(
  p_meal_plan_id UUID,
  p_amount DECIMAL,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_meal_plan student_meal_plans%ROWTYPE;
  v_transaction_id UUID;
BEGIN
  -- Get current meal plan
  SELECT * INTO v_meal_plan FROM student_meal_plans WHERE id = p_meal_plan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Meal plan not found');
  END IF;

  -- Insert transaction
  INSERT INTO meal_transactions (meal_plan_id, amount, transaction_type, description, created_by)
  VALUES (p_meal_plan_id, p_amount, p_transaction_type, p_description, auth.uid())
  RETURNING id INTO v_transaction_id;

  -- Update meal plan amounts
  IF p_transaction_type = 'debit' THEN
    UPDATE student_meal_plans 
    SET 
      remaining_amount = remaining_amount - p_amount,
      used_amount = used_amount + p_amount
    WHERE id = p_meal_plan_id;
  ELSIF p_transaction_type = 'credit' OR p_transaction_type = 'payment' THEN
    UPDATE student_meal_plans 
    SET 
      total_amount = total_amount + p_amount,
      remaining_amount = remaining_amount + p_amount
    WHERE id = p_meal_plan_id;
  END IF;

  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;