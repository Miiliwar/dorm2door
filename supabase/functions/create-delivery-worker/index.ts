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

        const { worker_name, worker_email, worker_password, worker_phone } = await req.json();

        if (!worker_name || !worker_email || !worker_password) {
            return new Response(JSON.stringify({ error: 'Missing required fields: name, email, password' }), { status: 400, headers: corsHeaders });
        }

        // Create delivery worker user account
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email: worker_email,
            password: worker_password,
            email_confirm: true,
            user_metadata: { full_name: worker_name },
        });

        if (createError) {
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const workerId = userData.user.id;

        // Update profile with name and phone
        await supabase.from('profiles').update({
            full_name: worker_name,
            phone: worker_phone || null,
        }).eq('user_id', workerId);

        // Assign delivery_worker role
        await supabase.from('user_roles').insert({ user_id: workerId, role: 'delivery_worker' });

        // Create delivery worker record
        const { data: workerRecord, error: workerError } = await supabase.from('delivery_workers').insert({
            user_id: workerId,
            is_free: true,
        }).select().single();

        if (workerError) {
            return new Response(JSON.stringify({ error: workerError.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            worker_id: workerRecord.id,
            user_id: workerId,
            worker_email,
            worker_name,
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
