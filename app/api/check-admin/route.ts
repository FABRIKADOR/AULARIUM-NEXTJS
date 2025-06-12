import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

// Creamos un cliente de Supabase directamente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Definimos los roles que tienen acceso administrativo
const ADMIN_ROLES = ["admin", "director"]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Se requiere userId" }, { status: 400 })
    }

    const { data, error } = await supabase.from("usuarios").select("rol").eq("id", userId).single()

    if (error) {
      console.error("Error verificando rol de administrador:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Verificación de admin para userId:", userId, "resultado:", data?.rol === "admin")

    return NextResponse.json({
      isAdmin: data?.rol === "admin",
      role: data?.rol,
    })
  } catch (error: any) {
    console.error("Error en check-admin API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
