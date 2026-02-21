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

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: caller.id, _role: 'admin' });
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });

    const { cafe_name, cafe_description, cafe_location, manager_email, manager_password, manager_name } = await req.json();

    if (!cafe_name || !manager_email || !manager_password || !manager_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    // Create manager user account
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: manager_email,
      password: manager_password,
      email_confirm: true,
      user_metadata: { full_name: manager_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const managerId = userData.user.id;

    // Update profile name
    await supabase.from('profiles').update({ full_name: manager_name }).eq('user_id', managerId);

    // Assign cafe_manager role
    await supabase.from('user_roles').insert({ user_id: managerId, role: 'cafe_manager' });

    // Create cafe assigned to this manager
    const { data: cafe, error: cafeError } = await supabase.from('cafes').insert({
      name: cafe_name,
      description: cafe_description || null,
      location: cafe_location || null,
      manager_id: managerId,
    }).select().single();

    if (cafeError) {
      return new Response(JSON.stringify({ error: cafeError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Add demo menu items for the new cafe
    await supabase.from('menu_items').insert([
      { cafe_id: cafe.id, name: 'Injera with Doro Wot', price: 95, category: 'Lunch', description: 'Spicy chicken stew with injera', available_quantity: 15, estimated_prep_time: 25 },
      { cafe_id: cafe.id, name: 'Firfir', price: 40, category: 'Breakfast', description: 'Shredded injera with spices', available_quantity: 20, estimated_prep_time: 10 },
      { cafe_id: cafe.id, name: 'Shiro', price: 50, category: 'Lunch', description: 'Chickpea stew with injera', available_quantity: 25, estimated_prep_time: 15 },
      { cafe_id: cafe.id, name: 'Pasta Special', price: 55, category: 'Lunch', description: 'Pasta with tomato sauce', available_quantity: 30, estimated_prep_time: 12 },
      { cafe_id: cafe.id, name: 'Tea (Shai)', price: 10, category: 'Drinks', description: 'Hot Ethiopian tea', available_quantity: 100, estimated_prep_time: 3 },
      { cafe_id: cafe.id, name: 'Coffee (Buna)', price: 15, category: 'Drinks', description: 'Traditional Ethiopian coffee', available_quantity: 100, estimated_prep_time: 5 },
      { cafe_id: cafe.id, name: 'Juice Mix', price: 30, category: 'Drinks', description: 'Mixed fruit juice', available_quantity: 40, estimated_prep_time: 5 },
      { cafe_id: cafe.id, name: 'Burger', price: 70, category: 'Dinner', description: 'Beef burger with fries', available_quantity: 20, estimated_prep_time: 15 },
      { cafe_id: cafe.id, name: 'Sambusa', price: 15, category: 'Snacks', description: 'Fried pastry with lentil filling', available_quantity: 50, estimated_prep_time: 5 },
      { cafe_id: cafe.id, name: 'Cake Slice', price: 35, category: 'Snacks', description: 'Fresh baked cake', available_quantity: 15, estimated_prep_time: 2 },
    ]);

    return new Response(JSON.stringify({
      success: true,
      cafe_id: cafe.id,
      manager_id: managerId,
      manager_email,
    }), {
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
