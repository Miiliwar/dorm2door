import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const demoUsers = [
      { email: 'admin@dorm2door.com', password: 'Admin@123', full_name: 'Admin User', role: 'admin' },
      { email: 'manager@dorm2door.com', password: 'Manager@123', full_name: 'Cafe Manager', role: 'cafe_manager' },
      { email: 'student@dorm2door.com', password: 'Student@123', full_name: 'Demo Student', role: 'student' },
      { email: 'delivery@dorm2door.com', password: 'Delivery@123', full_name: 'Delivery Worker', role: 'delivery_worker' },
    ];

    const results: any[] = [];

    for (const demo of demoUsers) {
      // Create user
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
        user_metadata: { full_name: demo.full_name },
      });

      if (createError) {
        // User might already exist
        results.push({ email: demo.email, status: 'exists or error', error: createError.message });
        continue;
      }

      const userId = userData.user.id;

      // Update profile name
      await supabase.from('profiles').update({ full_name: demo.full_name }).eq('user_id', userId);

      // Assign role
      await supabase.from('user_roles').insert({ user_id: userId, role: demo.role });

      // If delivery worker, create worker record
      if (demo.role === 'delivery_worker') {
        await supabase.from('delivery_workers').insert({ user_id: userId });
      }

      // If cafe manager, create a demo cafe and assign
      if (demo.role === 'cafe_manager') {
        const { data: cafe } = await supabase.from('cafes').insert({
          name: 'Main Campus Cafe',
          description: 'The main cafeteria serving fresh meals daily',
          location: 'Building A, Ground Floor',
          manager_id: userId,
        }).select().single();

        if (cafe) {
          // Add some demo menu items
          await supabase.from('menu_items').insert([
            { cafe_id: cafe.id, name: 'Scrambled Eggs & Toast', price: 45, category: 'Breakfast', description: 'Fresh eggs with buttered toast', available_quantity: 20, estimated_prep_time: 10 },
            { cafe_id: cafe.id, name: 'Injera with Tibs', price: 85, category: 'Lunch', description: 'Traditional Ethiopian injera with beef tibs', available_quantity: 15, estimated_prep_time: 20 },
            { cafe_id: cafe.id, name: 'Pasta Bolognese', price: 65, category: 'Lunch', description: 'Spaghetti with rich meat sauce', available_quantity: 25, estimated_prep_time: 15 },
            { cafe_id: cafe.id, name: 'Chicken Sandwich', price: 55, category: 'Lunch', description: 'Grilled chicken with fresh vegetables', available_quantity: 30, estimated_prep_time: 10 },
            { cafe_id: cafe.id, name: 'Fresh Juice', price: 25, category: 'Drinks', description: 'Freshly squeezed orange or mango juice', available_quantity: 50, estimated_prep_time: 5 },
            { cafe_id: cafe.id, name: 'Coffee (Buna)', price: 15, category: 'Drinks', description: 'Traditional Ethiopian coffee', available_quantity: 100, estimated_prep_time: 5 },
            { cafe_id: cafe.id, name: 'Burger & Fries', price: 75, category: 'Dinner', description: 'Beef burger with crispy fries', available_quantity: 20, estimated_prep_time: 15 },
            { cafe_id: cafe.id, name: 'Samosa', price: 20, category: 'Snacks', description: 'Crispy pastry with spiced filling', available_quantity: 40, estimated_prep_time: 5 },
          ]);
        }
      }

      // If admin, create additional demo cafes
      if (demo.role === 'admin') {
        await supabase.from('cafes').insert([
          { name: 'Engineering Block Cafe', description: 'Quick bites for engineering students', location: 'Engineering Building, 2nd Floor' },
          { name: 'Library Cafe', description: 'Study fuel and quiet snacks', location: 'Central Library, Ground Floor' },
        ]);
      }

      results.push({ email: demo.email, status: 'created', userId });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
