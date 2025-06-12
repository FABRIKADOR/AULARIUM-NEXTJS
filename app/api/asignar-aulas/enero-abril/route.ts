import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isAdmin, getUserRole } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { aulas, carreraId } = await request.json()

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Error de autenticación: " + authError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("User authenticated:", user.id)

    // Verificar si el usuario es admin o tiene permisos
    const admin = await isAdmin(user.id)
    const { rol, carrera_id } = await getUserRole(user.id)

    console.log("User role:", { admin, rol, carrera_id })

    // Verificar que haya aulas
    if (!aulas || aulas.length === 0) {
      return NextResponse.json({ error: "No hay aulas disponibles para asignar" }, { status: 400 })
    }

    console.log("Aulas available:", aulas.length)

    // Obtener materias y grupos
    let materiasQuery = supabase.from("materias_enero_abril").select("*")

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
      return NextResponse.json({ error: "Error al obtener materias: " + materiasError.message }, { status: 500 })
    }

    if (!materias || materias.length === 0) {
      console.log("No materias found")
      return NextResponse.json({ error: "No hay materias disponibles para asignar" }, { status: 404 })
    }

    console.log("Materias found:", materias.length)

    // Obtener IDs de materias para filtrar grupos
    const materiaIds = materias.map((m) => m.id)

    // Consulta de grupos filtrada por materias del usuario
    const { data: grupos, error: gruposError } = await supabase
      .from("grupos_enero_abril")
      .select("*")
      .in("materia_id", materiaIds)

    if (gruposError) {
      console.error("Error fetching grupos:", gruposError)
      return NextResponse.json({ error: "Error al obtener grupos: " + gruposError.message }, { status: 500 })
    }

    if (!grupos || grupos.length === 0) {
      console.log("No grupos found")
      return NextResponse.json({ error: "No hay grupos disponibles para asignar" }, { status: 404 })
    }

    console.log("Grupos found:", grupos.length)

    // Eliminar asignaciones existentes para estos grupos
    const grupoIds = grupos.map((g) => g.id)
    const { error: deleteError } = await supabase.from("asignaciones_enero_abril").delete().in("grupo_id", grupoIds)

    if (deleteError) {
      console.error("Error deleting existing assignments:", deleteError)
      return NextResponse.json(
        { error: "Error al eliminar asignaciones existentes: " + deleteError.message },
        { status: 500 },
      )
    }

    console.log("Deleted existing assignments")

    // Preparar datos para el algoritmo de asignación
    const gruposConHorarios = grupos.map((grupo) => {
      try {
        const horarios = typeof grupo.horarios === "string" ? JSON.parse(grupo.horarios) : grupo.horarios
        return {
          ...grupo,
          horarios: Array.isArray(horarios) ? horarios : [],
        }
      } catch (error) {
        console.error(`Error parsing horarios for grupo ${grupo.id}:`, error)
        return {
          ...grupo,
          horarios: [],
        }
      }
    })

    // Algoritmo de asignación de aulas
    const asignaciones = []
    const aulasDisponibles = [...aulas]

    // Ordenar grupos por cantidad de alumnos (de mayor a menor)
    gruposConHorarios.sort((a, b) => b.alumnos - a.alumnos)

    console.log("Starting assignment algorithm with grupos:", gruposConHorarios.length)

    // Para cada grupo
    for (const grupo of gruposConHorarios) {
      // Para cada horario del grupo
      for (const horario of grupo.horarios) {
        // Encontrar la materia asociada al grupo
        const materia = materias.find((m) => m.id === grupo.materia_id)
        if (!materia) {
          console.log(`No materia found for grupo ${grupo.id}, materia_id ${grupo.materia_id}`)
          continue
        }

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

    console.log("Created assignments:", asignaciones.length)

    // Si no hay asignaciones, devolver un error
    if (asignaciones.length === 0) {
      return NextResponse.json({ error: "No se pudieron crear asignaciones para ningún grupo" }, { status: 404 })
    }

    // Insertar nuevas asignaciones
    const { data: insertedData, error: insertError } = await supabase
      .from("asignaciones_enero_abril")
      .insert(asignaciones)
      .select()

    if (insertError) {
      console.error("Error inserting new assignments:", insertError)
      return NextResponse.json({ error: "Error al crear nuevas asignaciones: " + insertError.message }, { status: 500 })
    }

    console.log("Successfully inserted assignments:", insertedData?.length || 0)
    return NextResponse.json(insertedData || [])
  } catch (error) {
    console.error("Error in classroom assignment:", error)
    return NextResponse.json(
      { error: "Error al crear nuevas asignaciones: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
