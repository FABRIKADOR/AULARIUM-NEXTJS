import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Inicializar el cliente de Supabase con la clave de servicio para evitar restricciones RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request: Request) {
  try {
    // Obtener el ID de la notificación de la URL
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID de notificación no proporcionado" }, { status: 400 })
    }

    // Marcar la notificación como leída
    const { error } = await supabaseAdmin.from("notificaciones").update({ leida: true }).eq("id", id)

    if (error) {
      console.error("Error al marcar notificación como leída:", error)
      return NextResponse.json({ error: "Error al marcar notificación como leída" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en el endpoint de marcar como leída:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
