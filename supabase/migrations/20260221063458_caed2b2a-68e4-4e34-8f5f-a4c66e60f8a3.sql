
-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'cafe_manager', 'student', 'delivery_worker');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create cafes table
CREATE TABLE public.cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  image_url TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  opening_time TIME DEFAULT '07:00',
  closing_time TIME DEFAULT '22:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'Lunch',
  available_quantity INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  estimated_prep_time INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL UNIQUE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_availability',
  delivery_type TEXT NOT NULL DEFAULT 'pickup',
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  service_fee NUMERIC(10,2) DEFAULT 5,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_screenshot_url TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  delivery_full_name TEXT,
  delivery_phone TEXT,
  delivery_building TEXT,
  delivery_dorm_number TEXT,
  delivery_floor TEXT,
  delivery_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create delivery_workers table
CREATE TABLE public.delivery_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_free BOOLEAN NOT NULL DEFAULT true,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create delivery_assignments table
CREATE TABLE public.delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.delivery_workers(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_cafes_updated_at BEFORE UPDATE ON public.cafes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Generate order code function
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.order_code := 'DORM2DOOR' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_code BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_code();

-- RLS Policies

-- Profiles: users can read all, update own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles: admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Cafes: everyone can read, admins can manage
CREATE POLICY "Anyone can view active cafes" ON public.cafes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert cafes" ON public.cafes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update cafes" ON public.cafes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cafes" ON public.cafes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Cafe managers can update own cafe" ON public.cafes FOR UPDATE TO authenticated USING (manager_id = auth.uid());

-- Menu items: everyone can read, cafe managers can manage their cafe items
CREATE POLICY "Anyone can view menu items" ON public.menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cafe managers can insert menu items" ON public.menu_items FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.cafes WHERE id = cafe_id AND manager_id = auth.uid()));
CREATE POLICY "Cafe managers can update menu items" ON public.menu_items FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.cafes WHERE id = cafe_id AND manager_id = auth.uid()));
CREATE POLICY "Cafe managers can delete menu items" ON public.menu_items FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.cafes WHERE id = cafe_id AND manager_id = auth.uid()));
CREATE POLICY "Admins can manage all menu items" ON public.menu_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Orders: students see own, managers see their cafe, admins see all
CREATE POLICY "Students can view own orders" ON public.orders FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Cafe managers can view cafe orders" ON public.orders FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.cafes WHERE id = cafe_id AND manager_id = auth.uid()));
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own orders" ON public.orders FOR UPDATE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Cafe managers can update cafe orders" ON public.orders FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.cafes WHERE id = cafe_id AND manager_id = auth.uid()));
CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Order items
CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.cafes WHERE id = orders.cafe_id AND manager_id = auth.uid())))
);
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can insert order items" ON public.order_items FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND student_id = auth.uid()));

-- Delivery workers
CREATE POLICY "Anyone can view delivery workers" ON public.delivery_workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Workers can update own status" ON public.delivery_workers FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage delivery workers" ON public.delivery_workers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers can insert own record" ON public.delivery_workers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Delivery assignments
CREATE POLICY "Workers can view own assignments" ON public.delivery_assignments FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.delivery_workers WHERE id = worker_id AND user_id = auth.uid()));
CREATE POLICY "Cafe managers can view assignments" ON public.delivery_assignments FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.cafes c ON c.id = o.cafe_id WHERE o.id = order_id AND c.manager_id = auth.uid()));
CREATE POLICY "Admins can view all assignments" ON public.delivery_assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Cafe managers can create assignments" ON public.delivery_assignments FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o JOIN public.cafes c ON c.id = o.cafe_id WHERE o.id = order_id AND c.manager_id = auth.uid()));
CREATE POLICY "Admins can create assignments" ON public.delivery_assignments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers can update own assignments" ON public.delivery_assignments FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.delivery_workers WHERE id = worker_id AND user_id = auth.uid()));
CREATE POLICY "Cafe managers can update assignments" ON public.delivery_assignments FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.cafes c ON c.id = o.cafe_id WHERE o.id = order_id AND c.manager_id = auth.uid()));

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
