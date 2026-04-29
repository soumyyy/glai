// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return json(401, { error: 'Missing authorization header' })
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return json(401, { error: 'Invalid session' })
  }

  const accountId = user.id

  const { data: profiles, error: profilesError } = await adminClient
    .from('users')
    .select('id')
    .eq('account_id', accountId)

  if (profilesError) {
    return json(500, { error: profilesError.message })
  }

  const profileIds = (profiles ?? []).map((profile) => String(profile.id))

  if (profileIds.length > 0) {
    const { data: meals, error: mealsError } = await adminClient
      .from('meals')
      .select('id')
      .in('user_id', profileIds)

    if (mealsError) {
      return json(500, { error: mealsError.message })
    }

    const mealIds = (meals ?? []).map((meal) => String(meal.id))

    if (mealIds.length > 0) {
      const { error: mealItemsError } = await adminClient
        .from('meal_items')
        .delete()
        .in('meal_id', mealIds)

      if (mealItemsError) {
        return json(500, { error: mealItemsError.message })
      }
    }

    const { error: summariesError } = await adminClient
      .from('daily_summaries')
      .delete()
      .in('user_id', profileIds)

    if (summariesError) {
      return json(500, { error: summariesError.message })
    }

    const { error: mealsDeleteError } = await adminClient
      .from('meals')
      .delete()
      .in('user_id', profileIds)

    if (mealsDeleteError) {
      return json(500, { error: mealsDeleteError.message })
    }
  }

  const { error: pendingDeletesError } = await adminClient
    .from('pending_deletes')
    .delete()
    .eq('account_id', accountId)

  if (pendingDeletesError) {
    return json(500, { error: pendingDeletesError.message })
  }

  const { error: usersDeleteError } = await adminClient
    .from('users')
    .delete()
    .eq('account_id', accountId)

  if (usersDeleteError) {
    return json(500, { error: usersDeleteError.message })
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(accountId)
  if (authDeleteError) {
    return json(500, { error: authDeleteError.message })
  }

  return json(200, { success: true })
})
