/// <reference path="../deno-types.d.ts" />
// @ts-ignore: Deno environment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno environment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
        user_metadata: { full_name: demo.full_name },
      });

      if (createError) {
        results.push({ email: demo.email, status: 'exists or error', error: createError.message });
        continue;
      }

      const userId = userData.user.id;
      await supabase.from('profiles').update({ full_name: demo.full_name }).eq('user_id', userId);
      await supabase.from('user_roles').insert({ user_id: userId, role: demo.role });

      if (demo.role === 'delivery_worker') {
        await supabase.from('delivery_workers').insert({ user_id: userId });
      }

      if (demo.role === 'cafe_manager') {
        const { data: cafe } = await supabase.from('cafes').insert({
          name: 'Main Campus Cafe',
          description: 'The main cafeteria serving fresh meals daily',
          location: 'Building A, Ground Floor',
          manager_id: userId,
          payment_info: { cbe: '1000123456789', telebirr: '0911222333', ebirr: '0922334455' },
        }).select().single();

        if (cafe) {
          await addDemoMenuItems(supabase, cafe.id);
        }
      }

      if (demo.role === 'admin') {
        const cafes = [
          { name: 'Engineering Block Cafe', description: 'Quick bites for engineering students', location: 'Engineering Building, 2nd Floor', payment_info: { cbe: '1000987654321', telebirr: '0912345678' } },
          { name: 'Library Cafe', description: 'Study fuel and quiet snacks', location: 'Central Library, Ground Floor', payment_info: { cbe: '1000111222333', telebirr: '0913456789' } },
        ];
        for (const c of cafes) {
          const { data: cafe } = await supabase.from('cafes').insert(c).select().single();
          if (cafe) await addDemoMenuItems(supabase, cafe.id);
        }
      }

      results.push({ email: demo.email, status: 'created', userId });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function addDemoMenuItems(supabase: any, cafeId: string) {
  await supabase.from('menu_items').insert([
    { cafe_id: cafeId, name: 'Injera with Doro Wot', price: 95, category: 'Lunch', description: 'Spicy chicken stew with injera', available_quantity: 15, estimated_prep_time: 25 },
    { cafe_id: cafeId, name: 'Firfir', price: 40, category: 'Breakfast', description: 'Shredded injera with spices & butter', available_quantity: 20, estimated_prep_time: 10 },
    { cafe_id: cafeId, name: 'Scrambled Eggs & Toast', price: 45, category: 'Breakfast', description: 'Fresh eggs with buttered toast', available_quantity: 20, estimated_prep_time: 10 },
    { cafe_id: cafeId, name: 'Shiro', price: 50, category: 'Lunch', description: 'Chickpea stew with injera', available_quantity: 25, estimated_prep_time: 15 },
    { cafe_id: cafeId, name: 'Injera with Tibs', price: 85, category: 'Lunch', description: 'Sauteed beef with injera', available_quantity: 15, estimated_prep_time: 20 },
    { cafe_id: cafeId, name: 'Pasta Bolognese', price: 65, category: 'Lunch', description: 'Spaghetti with rich meat sauce', available_quantity: 25, estimated_prep_time: 15 },
    { cafe_id: cafeId, name: 'Burger & Fries', price: 75, category: 'Dinner', description: 'Beef burger with crispy fries', available_quantity: 20, estimated_prep_time: 15 },
    { cafe_id: cafeId, name: 'Chicken Sandwich', price: 55, category: 'Lunch', description: 'Grilled chicken with veggies', available_quantity: 30, estimated_prep_time: 10 },
    { cafe_id: cafeId, name: 'Coffee (Buna)', price: 15, category: 'Drinks', description: 'Traditional Ethiopian coffee', available_quantity: 100, estimated_prep_time: 5 },
    { cafe_id: cafeId, name: 'Tea (Shai)', price: 10, category: 'Drinks', description: 'Hot Ethiopian tea', available_quantity: 100, estimated_prep_time: 3 },
    { cafe_id: cafeId, name: 'Fresh Juice', price: 25, category: 'Drinks', description: 'Mango or orange juice', available_quantity: 50, estimated_prep_time: 5 },
    { cafe_id: cafeId, name: 'Sambusa', price: 15, category: 'Snacks', description: 'Crispy pastry with lentil filling', available_quantity: 50, estimated_prep_time: 5 },
    { cafe_id: cafeId, name: 'Cake Slice', price: 35, category: 'Snacks', description: 'Freshly baked cake', available_quantity: 15, estimated_prep_time: 2 },
  ]);
}
