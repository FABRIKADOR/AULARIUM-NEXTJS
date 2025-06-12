import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Creamos un cliente de Supabase directamente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
  try {
    // Añadir esta función al inicio de la función POST
    // Verificar que el usuario que hace la solicitud es un administrador
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session.user.id)
      .single()

    if (userError || !userData || userData.rol !== "admin") {
      return NextResponse.json({ error: "No tiene permisos para realizar esta acción" }, { status: 403 })
    }

    const body = await request.json()
    const { email, nombre, rol, password } = body

    if (!email || !nombre || !rol || !password) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }

    // Verificar si el usuario ya existe en la tabla usuarios
    const { data: existingUserRecord, error: checkError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .single()

    if (!checkError && existingUserRecord) {
      return NextResponse.json(
        {
          error: "Ya existe un usuario con este correo electrónico en la base de datos",
          code: "USER_ALREADY_REGISTERED",
        },
        { status: 400 },
      )
    }

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          rol,
        },
      },
    })

    if (authError) {
      // Si el error es que el usuario ya está registrado, devolvemos un mensaje específico
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          {
            error: "Este correo electrónico ya está registrado en el sistema de autenticación",
            code: "USER_ALREADY_REGISTERED",
          },
          { status: 400 },
        )
      }

      console.error("Error creating auth user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 })
    }

    const userId = authData.user.id

    // Crear registro en tabla usuarios
    const { error: insertError } = await supabase.from("usuarios").insert([
      {
        id: userId,
        nombre,
        rol,
        email,
      },
    ])

    if (insertError) {
      console.error("Error creating user record:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Usuario creado correctamente. Se ha enviado un correo de confirmación.",
    })
  } catch (error) {
    console.error("Error in user creation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Modificar la función DELETE para verificar que no se está eliminando a sí mismo
export async function DELETE(request: Request) {
  try {
    // Verificar que el usuario que hace la solicitud es un administrador
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const currentUserId = session.user.id

    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", currentUserId)
      .maybeSingle()

    if (userError || !userData || userData.rol !== "admin") {
      return NextResponse.json({ error: "No tiene permisos para realizar esta acción" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 })
    }

    // Verificar que no se está eliminando a sí mismo
    if (userId === currentUserId) {
      return NextResponse.json(
        {
          error: "No puedes eliminar tu propia cuenta de usuario",
          code: "SELF_DELETION_NOT_ALLOWED",
        },
        { status: 403 },
      )
    }

    // 1. Eliminar de la tabla usuarios
    const { error: dbError } = await supabase.from("usuarios").delete().eq("id", userId)

    if (dbError) {
      console.error("Error deleting user record:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // 2. Eliminar de auth.users usando la API de administración
    // Necesitamos un token de servicio para esta operación
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Eliminar el usuario de auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Error deleting auth user:", authError)
      return NextResponse.json({
        success: true,
        warning: true,
        message:
          "Usuario eliminado de la tabla, pero no se pudo eliminar completamente de la autenticación: " +
          authError.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado completamente del sistema",
    })
  } catch (error) {
    console.error("Error in user deletion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
