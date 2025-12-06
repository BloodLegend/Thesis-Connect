import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const adminEmail = 'admin@gmail.com'
    const adminPassword = '12345'

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail)

    if (existingAdmin) {
      // Update password if user exists
      await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
        password: adminPassword,
        email_confirm: true
      })

      // Update role to admin
      await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', existingAdmin.id)

      return new Response(
        JSON.stringify({ message: 'Admin account updated successfully', userId: existingAdmin.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      }
    })

    if (createError) {
      throw createError
    }

    // Update profile role to admin (trigger should have created the profile)
    if (newUser?.user) {
      await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', newUser.user.id)
    }

    return new Response(
      JSON.stringify({ message: 'Admin account created successfully', userId: newUser?.user?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
