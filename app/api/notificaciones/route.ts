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

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.tipo || !data.mensaje || !data.destinatario_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Insert notification into database using admin client
    const { data: notification, error } = await supabaseAdmin
      .from("notificaciones")
      .insert({
        tipo: data.tipo,
        mensaje: data.mensaje,
        datos: data.datos || {},
        destinatario_id: data.destinatario_id,
        leida: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating notification:", error)
      return NextResponse.json({ error: "Error al crear la notificación: " + error.message }, { status: 500 })
    }

    return NextResponse.json(notification)
  } catch (error: any) {
    console.error("Error in notification API:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Se requiere el ID de usuario" }, { status: 400 })
    }

    // Get notifications for user
    const { data, error } = await supabaseAdmin
      .from("notificaciones")
      .select("*")
      .eq("destinatario_id", userId)
      .order("fecha_creacion", { ascending: false })

    if (error) {
      console.error("Error fetching notifications:", error)
      return NextResponse.json({ error: "Error al obtener notificaciones: " + error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("Error in notification API:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 })
  }
}
