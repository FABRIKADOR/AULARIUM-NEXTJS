import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isAdmin, getUserRole } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { aulas, carreraId } = await request.json()

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

    // Obtener materias y grupos
    let materiasQuery = supabase.from("materias_septiembre_diciembre").select("*")

    // Filtrar materias según el rol del usuario
    if (!admin) {
      if (rol === "coordinador" && carrera_id) {
        // Coordinador: filtrar por carrera
        materiasQuery = materiasQuery.eq("carrera_id", carrera_id)
      } else {
        // Usuario normal: filtrar por usuario_id
        materiasQuery = materiasQuery.eq("usuario_id", user.id)
      }
    } else if (carreraId) {
      // Si es admin pero se especificó una carrera, filtrar por esa carrera
      materiasQuery = materiasQuery.eq("carrera_id", carreraId)
    }

    const { data: materias, error: materiasError } = await materiasQuery

    if (materiasError) {
      console.error("Error fetching materias:", materiasError)
      return NextResponse.json({ error: "Error al obtener materias" }, { status: 500 })
    }

    if (!materias || materias.length === 0) {
      return NextResponse.json({ error: "No hay materias disponibles para asignar" }, { status: 404 })
    }

    // Obtener IDs de materias para filtrar grupos
    const materiaIds = materias.map((m) => m.id)

    // Consulta de grupos filtrada por materias del usuario
    const { data: grupos, error: gruposError } = await supabase
      .from("grupos_septiembre_diciembre")
      .select("*")
      .in("materia_id", materiaIds)

    if (gruposError) {
      console.error("Error fetching grupos:", gruposError)
      return NextResponse.json({ error: "Error al obtener grupos" }, { status: 500 })
    }

    if (!grupos || grupos.length === 0) {
      return NextResponse.json({ error: "No hay grupos disponibles para asignar" }, { status: 404 })
    }

    // Eliminar asignaciones existentes para estos grupos
    const grupoIds = grupos.map((g) => g.id)
    const { error: deleteError } = await supabase
      .from("asignaciones_septiembre_diciembre")
      .delete()
      .in("grupo_id", grupoIds)

    if (deleteError) {
      console.error("Error deleting existing assignments:", deleteError)
      return NextResponse.json({ error: "Error al eliminar asignaciones existentes" }, { status: 500 })
    }

    // Preparar datos para el algoritmo de asignación
    const gruposConHorarios = grupos.map((grupo) => {
      const horarios = typeof grupo.horarios === "string" ? JSON.parse(grupo.horarios) : grupo.horarios
      return {
        ...grupo,
        horarios: Array.isArray(horarios) ? horarios : [],
      }
    })

    // Algoritmo de asignación de aulas
    const asignaciones = []
    const aulasDisponibles = [...aulas]

    // Ordenar grupos por cantidad de alumnos (de mayor a menor)
    gruposConHorarios.sort((a, b) => b.alumnos - a.alumnos)

    // Para cada grupo
    for (const grupo of gruposConHorarios) {
      // Para cada horario del grupo
      for (const horario of grupo.horarios) {
        // Encontrar la materia asociada al grupo
        const materia = materias.find((m) => m.id === grupo.materia_id)
        if (!materia) continue

        // Buscar aulas disponibles para este horario
        const aulasDisponiblesParaHorario = aulasDisponibles.filter((aula) => {
          // Verificar si el aula ya está asignada en este horario
          const aulaOcupada = asignaciones.some(
            (asignacion) =>
              asignacion.aula_id === aula.id &&
              asignacion.dia === horario.dia &&
              ((asignacion.hora_inicio <= horario.hora_inicio && asignacion.hora_fin > horario.hora_inicio) ||
                (asignacion.hora_inicio < horario.hora_fin && asignacion.hora_fin >= horario.hora_fin)),
          )
          // Verificar si el aula tiene capacidad suficiente
          const capacidadSuficiente = aula.capacidad >= grupo.alumnos

          return !aulaOcupada && capacidadSuficiente
        })

        // Ordenar aulas por capacidad (de menor a mayor, pero suficiente)
        aulasDisponiblesParaHorario.sort((a, b) => a.capacidad - b.capacidad)

        // Asignar el aula más pequeña que tenga capacidad suficiente
        const aulaAsignada = aulasDisponiblesParaHorario.find((aula) => aula.capacidad >= grupo.alumnos)

        // Crear la asignación
        asignaciones.push({
          grupo_id: grupo.id,
          aula_id: aulaAsignada?.id || null,
          materia_id: grupo.materia_id,
          dia: horario.dia,
          hora_inicio: horario.hora_inicio,
          hora_fin: horario.hora_fin,
          turno: grupo.turno,
          carrera_id: materia.carrera_id || null, // Añadir carrera_id desde la materia
        })
      }
    }

    // Insertar nuevas asignaciones
    const { data: insertedData, error: insertError } = await supabase
      .from("asignaciones_septiembre_diciembre")
      .insert(asignaciones)
      .select()

    if (insertError) {
      console.error("Error inserting new assignments:", insertError)
      return NextResponse.json({ error: "Error al crear nuevas asignaciones: " + insertError.message }, { status: 500 })
    }

    return NextResponse.json(insertedData || [])
  } catch (error) {
    console.error("Error in classroom assignment:", error)
    return NextResponse.json(
      { error: "Error al crear nuevas asignaciones: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
