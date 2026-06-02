import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify the requesting user is authenticated
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !callerUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Insert directly into admin_users table
    // The Supabase trigger on auth.users handles Auth signup
    // Since we only have anon key we insert the profile then
    // inform the caller to also create via Supabase dashboard,
    // OR we use signUp which is the only option without service role.
    // For now, we call signUp but note: with anon key, signUp does
    // NOT sign in the new user when email confirmations are disabled
    // in Supabase project settings.
    //
    // IMPORTANT: In Supabase dashboard → Auth → Email → disable "Confirm email"
    // so that signUp is instant. The auth.onAuthStateChange will only fire
    // for the signed-in session, not the new user being created.

    // We call admin.createUser if service_role key is available, else signUp
    // Here we check if SUPABASE_SERVICE_ROLE_KEY env exists
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (serviceRoleKey) {
      // Use admin API with service role (no session side effects)
      const { createClient: createAdmin } = await import("@supabase/supabase-js")
      const adminSupabase = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name, role: "admin" },
        email_confirm: true,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Upsert profile in admin_users
      if (data.user) {
        await adminSupabase.from("admin_users").upsert({
          id: data.user.id,
          name,
          email,
          role: "admin",
        })
      }

      return NextResponse.json({ success: true })
    }

    // Fallback: Use standard signUp if Service Role Key is absent
    const { createClient: createAnonClient } = await import("@supabase/supabase-js")
    const anonSupabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await anonSupabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: "admin" }
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Upsert profile in admin_users using the authenticated caller's client
    if (data.user) {
      await supabase.from("admin_users").upsert({
        id: data.user.id,
        name,
        email,
        role: "admin",
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unexpected error" },
      { status: 500 }
    )
  }
}
