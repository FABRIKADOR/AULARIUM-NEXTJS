import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    // Get all users with admin role
    const { data, error } = await supabaseAdmin.from("usuarios").select("id, email, nombre").eq("rol", "admin")

    if (error) {
      console.error("Error fetching admins:", error)
      return NextResponse.json({ error: "Error al obtener administradores: " + error.message }, { status: 500 })
    }

    return NextResponse.json({ admins: data || [] })
  } catch (error: any) {
    console.error("Error in admins API:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 })
  }
}
