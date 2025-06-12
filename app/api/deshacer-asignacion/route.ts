import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isAdmin, getUserRole } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { periodoId } = await request.json()

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es admin o tiene permisos
    const admin = await isAdmin(user.id)
    const { rol, carrera_id } = await getUserRole(user.id)

    // Determinar la tabla de asignaciones según el periodo
    let tablaAsignaciones = ""
    let tablaMaterias = ""
    switch (periodoId) {
      case "1":
        tablaAsignaciones = "asignaciones_enero_abril"
        tablaMaterias = "materias_enero_abril"
        break
      case "2":
        tablaAsignaciones = "asignaciones_mayo_agosto"
        tablaMaterias = "materias_mayo_agosto"
        break
      case "3":
        tablaAsignaciones = "asignaciones_septiembre_diciembre"
        tablaMaterias = "materias_septiembre_diciembre"
        break
      default:
        return NextResponse.json({ error: "Periodo no válido" }, { status: 400 })
    }

    // Obtener materias según el rol del usuario
    let materiasQuery = supabase.from(tablaMaterias).select("id")

    // Filtrar materias según el rol del usuario
    if (!admin) {
      if (rol === "coordinador" && carrera_id) {
        // Coordinador: filtrar por carrera
        materiasQuery = materiasQuery.eq("carrera_id", carrera_id)
      } else {
        // Usuario normal: filtrar por usuario_id
        materiasQuery = materiasQuery.eq("usuario_id", user.id)
      }
    }

    const { data: materias, error: materiasError } = await materiasQuery

    if (materiasError) {
      console.error("Error fetching materias:", materiasError)
      return NextResponse.json({ error: "Error al obtener materias" }, { status: 500 })
    }

    if (!materias || materias.length === 0) {
      return NextResponse.json({ error: "No hay materias disponibles" }, { status: 404 })
    }

    // Obtener IDs de materias
    const materiaIds = materias.map((m) => m.id)

    // Eliminar asignaciones para las materias del usuario
    const { error: deleteError } = await supabase.from(tablaAsignaciones).delete().in("materia_id", materiaIds)

    if (deleteError) {
      console.error("Error deleting assignments:", deleteError)
      return NextResponse.json({ error: "Error al eliminar asignaciones" }, { status: 500 })
    }

    return NextResponse.json([])
  } catch (error) {
    console.error("Error undoing assignments:", error)
    return NextResponse.json(
      { error: "Error al deshacer asignaciones: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
