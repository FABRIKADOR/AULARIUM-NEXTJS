import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { Asignacion, Aula, Grupo } from "@/interfaces/interfaces"

export async function POST(request: Request) {
  try {
    const { grupos, aulas, periodoId } = await request.json()

    // Validate required data
    if (!periodoId) {
      throw new Error("Se requiere el ID del periodo")
    }

    if (!aulas || aulas.length === 0) {
      throw new Error("No hay aulas disponibles para asignar")
    }

    // Get groups for the specific period with their relationships
    const { data: gruposData, error: gruposError } = await supabase
      .from("grupos")
      .select(`
        id,
        horarios,
        turno,
        materia_id,
        alumnos,
        materias (
          id,
          nombre,
          profesor_id
        )
      `)
      .eq("periodo_id", periodoId)

    if (gruposError) {
      console.error("Error fetching grupos:", gruposError)
      throw new Error("Error al obtener los grupos del periodo")
    }

    if (!gruposData || gruposData.length === 0) {
      throw new Error("No hay grupos disponibles para asignar en el periodo seleccionado")
    }

    console.log("Grupos encontrados:", gruposData.length)

    // Sort groups by number of students (descending)
    const sortedGrupos = gruposData.sort((a: Grupo, b: Grupo) => b.alumnos - a.alumnos)

    // Sort aulas by capacity (descending)
    const sortedAulas = [...aulas].sort((a: Aula, b: Aula) => b.capacidad - a.capacidad)

    const newAsignaciones: Asignacion[] = []

    // Process each group and its schedules
    for (const grupo of sortedGrupos) {
      try {
        // Parse horarios if it's a string
        const horarios = typeof grupo.horarios === "string" ? JSON.parse(grupo.horarios) : grupo.horarios

        if (!Array.isArray(horarios)) {
          console.warn(`Grupo ${grupo.id} - horarios inválidos:`, horarios)
          continue
        }

        console.log(`Procesando grupo ${grupo.id} con ${horarios.length} horarios`)

        for (const horario of horarios) {
          let assigned = false

          // Validate horario data
          if (!horario.dia || !horario.hora_inicio || !horario.hora_fin) {
            console.warn(`Horario inválido para grupo ${grupo.id}:`, horario)
            continue
          }

          // Try each classroom
          for (const aula of sortedAulas) {
            // Check for conflicts
            const conflicts = newAsignaciones.filter(
              (asignacion) =>
                asignacion.aula_id === aula.id &&
                asignacion.dia === horario.dia &&
                asignacion.turno === grupo.turno &&
                ((asignacion.hora_inicio <= horario.hora_inicio && asignacion.hora_fin > horario.hora_inicio) ||
                  (asignacion.hora_inicio < horario.hora_fin && asignacion.hora_fin >= horario.hora_fin)),
            )

            if (conflicts.length === 0) {
              // No conflicts, assign the classroom
              newAsignaciones.push({
                id: newAsignaciones.length + 1,
                grupo_id: grupo.id,
                aula_id: aula.id,
                materia_id: grupo.materia_id,
                dia: horario.dia,
                hora_inicio: horario.hora_inicio,
                hora_fin: horario.hora_fin,
                turno: grupo.turno,
                periodo_id: Number(periodoId),
              })
              assigned = true
              console.log(`Asignada aula ${aula.id} al grupo ${grupo.id} para ${horario.dia} ${horario.hora_inicio}`)
              break
            }
          }

          if (!assigned) {
            // If no classroom was available, mark as unassigned
            newAsignaciones.push({
              id: newAsignaciones.length + 1,
              grupo_id: grupo.id,
              aula_id: null,
              materia_id: grupo.materia_id,
              dia: horario.dia,
              hora_inicio: horario.hora_inicio,
              hora_fin: horario.hora_fin,
              turno: grupo.turno,
              periodo_id: Number(periodoId),
            })
            console.log(`Grupo ${grupo.id} sin aula asignada para ${horario.dia} ${horario.hora_inicio}`)
          }
        }
      } catch (error) {
        console.error(`Error procesando grupo ${grupo.id}:`, error)
      }
    }

    if (newAsignaciones.length === 0) {
      throw new Error("No se pudieron crear asignaciones para ningún grupo")
    }

    console.log(`Creando ${newAsignaciones.length} asignaciones nuevas`)

    // Clear existing assignments for this period
    const { error: deleteError } = await supabase.from("asignaciones").delete().eq("periodo_id", periodoId)

    if (deleteError) {
      console.error("Error deleting existing assignments:", deleteError)
      throw new Error("Error al limpiar asignaciones existentes")
    }

    // Insert new assignments
    const { data: insertedData, error: insertError } = await supabase
      .from("asignaciones")
      .insert(newAsignaciones)
      .select()

    if (insertError) {
      console.error("Error inserting new assignments:", insertError)
      throw new Error("Error al crear nuevas asignaciones")
    }

    console.log(`Creadas ${insertedData.length} asignaciones exitosamente`)
    return NextResponse.json(insertedData)
  } catch (error) {
    console.error("Error in classroom assignment:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al asignar aulas" },
      { status: 500 },
    )
  }
}
