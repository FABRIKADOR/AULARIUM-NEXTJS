import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { Materia, Profesor, Grupo } from "@/interfaces/interfaces"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      persistSession: false,
    },
  },
)

interface DuplicateItem {
  type: "profesor" | "materia"
  name: string
  existingId: number
  action: "replace" | "skip" | "keep_both"
}

// Modificar la función verificarDisponibilidadProfesor para verificar correctamente la disponibilidad del profesor
// Buscar la función verificarDisponibilidadProfesor y reemplazarla con esta versión mejorada:

async function verificarDisponibilidadProfesor(profesorId: number, dia: string, horaInicio: string, horaFin: string) {
  try {
    // Obtener la disponibilidad del profesor
    const { data: profesorData, error: profesorError } = await supabaseAdmin
      .from("profesores")
      .select("disponibilidad")
      .eq("id", profesorId)
      .single()

    if (profesorError) {
      console.error("Error al obtener disponibilidad del profesor:", profesorError)
      return false
    }

    // Si el profesor no tiene configurada su disponibilidad, asumimos que está disponible
    if (!profesorData || !profesorData.disponibilidad) {
      return true
    }

    const disponibilidad = profesorData.disponibilidad

    // Verificar si el profesor está disponible en el horario solicitado
    // Verificar si existe la disponibilidad para este día
    if (!disponibilidad[dia]) {
      console.log(`No hay disponibilidad configurada para ${dia}`)
      return false
    }

    // CORRECCIÓN: Verificar cada hora en el rango del horario
    // Convertir las horas de inicio y fin a números para facilitar la comparación
    const horaInicioNum = Number.parseInt(horaInicio.split(":")[0])
    const horaFinNum = Number.parseInt(horaFin ? horaFin.split(":")[0] : (horaInicioNum + 1).toString())

    // Verificar cada hora en el rango
    for (let hora = horaInicioNum; hora < horaFinNum; hora++) {
      const horaFormateada = `${hora.toString().padStart(2, "0")}:00`

      // Comprobar si la hora específica está marcada como disponible
      const estaDisponible = disponibilidad[dia][horaFormateada] === true
      console.log(`Disponibilidad para ${dia} ${horaFormateada}: ${estaDisponible}`)

      if (!estaDisponible) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error al verificar disponibilidad:", error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    const { periodoId, duplicates, processingResults } = await request.json()

    if (!periodoId || !duplicates || !processingResults) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const { materias, profesores, grupos } = processingResults

    // Procesar duplicados según las acciones seleccionadas
    const profesoresActualizados = await procesarProfesoresDuplicados(profesores, duplicates)
    const materiasActualizadas = await procesarMateriasDuplicadas(
      materias,
      duplicates,
      periodoId,
      profesoresActualizados,
    )

    // Insertar grupos con las referencias actualizadas
    const stats = await insertarGrupos(grupos, materiasActualizadas, periodoId)

    return NextResponse.json({
      success: true,
      stats,
      periodoId,
    })
  } catch (error) {
    console.error("Error processing duplicates:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al procesar los duplicados" },
      { status: 500 },
    )
  }
}

async function procesarProfesoresDuplicados(profesores: Partial<Profesor>[], duplicates: DuplicateItem[]) {
  const profesoresActualizados: Record<number, number> = {}

  for (let i = 0; i < profesores.length; i++) {
    const profesor = profesores[i]

    // Buscar si este profesor está en la lista de duplicados
    const duplicado = duplicates.find((d) => d.type === "profesor" && d.name === profesor.nombre)

    if (duplicado) {
      switch (duplicado.action) {
        case "replace":
          // Actualizar el profesor existente
          await supabase.from("profesores").update({ email: profesor.email }).eq("id", duplicado.existingId)

          // Mapear el índice del profesor al ID existente
          profesoresActualizados[i + 1] = duplicado.existingId
          break

        case "skip":
          // No hacer nada, solo mapear el índice al ID existente
          profesoresActualizados[i + 1] = duplicado.existingId
          break

        case "keep_both":
          // Insertar como nuevo profesor
          const { data: nuevoProfesor } = await supabase
            .from("profesores")
            .insert([{ ...profesor, nombre: `${profesor.nombre} (Nuevo)` }])
            .select()

          if (nuevoProfesor && nuevoProfesor.length > 0) {
            profesoresActualizados[i + 1] = nuevoProfesor[0].id
          }
          break
      }
    } else {
      // No es un duplicado, insertar normalmente
      const { data: nuevoProfesor } = await supabase.from("profesores").insert([profesor]).select()

      if (nuevoProfesor && nuevoProfesor.length > 0) {
        profesoresActualizados[i + 1] = nuevoProfesor[0].id
      }
    }
  }

  return profesoresActualizados
}

async function procesarMateriasDuplicadas(
  materias: Partial<Materia>[],
  duplicates: DuplicateItem[],
  periodoId: string,
  profesoresActualizados: Record<number, number>,
) {
  const tables = getTableNamesByPeriod(periodoId)
  const materiasActualizadas: Record<number, number> = {}

  for (let i = 0; i < materias.length; i++) {
    const materia = materias[i]

    // Actualizar la referencia al profesor
    if (materia.profesor_id && profesoresActualizados[materia.profesor_id]) {
      materia.profesor_id = profesoresActualizados[materia.profesor_id]
    }

    // Buscar si esta materia está en la lista de duplicados
    const duplicado = duplicates.find((d) => d.type === "materia" && d.name === materia.nombre)

    if (duplicado) {
      switch (duplicado.action) {
        case "replace":
          // Actualizar la materia existente
          await supabase
            .from(tables.materias)
            .update({ profesor_id: materia.profesor_id })
            .eq("id", duplicado.existingId)

          // Mapear el índice de la materia al ID existente
          materiasActualizadas[i + 1] = duplicado.existingId
          break

        case "skip":
          // No hacer nada, solo mapear el índice al ID existente
          materiasActualizadas[i + 1] = duplicado.existingId
          break

        case "keep_both":
          // Insertar como nueva materia
          const { data: nuevaMateria } = await supabase
            .from(tables.materias)
            .insert([{ ...materia, nombre: `${materia.nombre} (Nuevo)` }])
            .select()

          if (nuevaMateria && nuevaMateria.length > 0) {
            materiasActualizadas[i + 1] = nuevaMateria[0].id
          }
          break
      }
    } else {
      // No es un duplicado, insertar normalmente
      const { data: nuevaMateria } = await supabase.from(tables.materias).insert([materia]).select()

      if (nuevaMateria && nuevaMateria.length > 0) {
        materiasActualizadas[i + 1] = nuevaMateria[0].id
      }
    }
  }

  return materiasActualizadas
}

async function insertarGrupos(
  grupos: Partial<Grupo>[],
  materiasActualizadas: Record<number, number>,
  periodoId: string,
) {
  const tables = getTableNamesByPeriod(periodoId)
  const stats = { materias: Object.keys(materiasActualizadas).length, grupos: 0 }

  // Insertar grupos con las referencias actualizadas
  const gruposActualizados = grupos.map(async (grupo) => {
    if (grupo.materia_id && materiasActualizadas[grupo.materia_id]) {
      const materiaId = materiasActualizadas[grupo.materia_id]
      // Verificar la disponibilidad del profesor antes de insertar el grupo
      const materiaTable = getTableNamesByPeriod(periodoId).materias
      const { data: materia, error: materiaError } = await supabase
        .from(materiaTable)
        .select("profesor_id")
        .eq("id", materiaId)
        .single()

      if (materiaError) {
        console.error("Error al obtener el profesor de la materia:", materiaError)
        return grupo // No se pudo obtener el profesor, se retorna el grupo sin modificar
      }

      if (!materia || !materia.profesor_id) {
        console.warn("No se encontró el profesor para la materia:", materiaId)
        return grupo // No se encontró el profesor, se retorna el grupo sin modificar
      }

      const profesorId = materia.profesor_id

      // Extraer el día y la hora de inicio del grupo
      const dia = grupo.dia
      const horaInicio = grupo.hora_inicio
      const horaFin = grupo.hora_fin

      if (!dia || !horaInicio) {
        console.warn("El grupo no tiene día u hora de inicio definidos:", grupo)
        return grupo // El grupo no tiene día u hora de inicio, se retorna sin modificar
      }

      const profesorDisponible = await verificarDisponibilidadProfesor(profesorId, dia, horaInicio, horaFin)

      if (!profesorDisponible) {
        console.warn(`El profesor ${profesorId} no está disponible el ${dia} a las ${horaInicio}`)
        return grupo // El profesor no está disponible, se retorna el grupo sin modificar
      }

      return {
        ...grupo,
        materia_id: materiaId,
      }
    }
    return grupo
  })

  const resolvedGruposActualizados = await Promise.all(gruposActualizados)

  // Filtrar grupos que tienen una materia_id válida
  const gruposValidos = resolvedGruposActualizados.filter((g) => g.materia_id !== undefined && g.materia_id !== null)

  if (gruposValidos.length > 0) {
    const { data: gruposInsertados } = await supabase.from(tables.grupos).insert(gruposValidos).select()

    stats.grupos = gruposInsertados?.length || 0
  }

  return stats
}

function getTableNamesByPeriod(periodId: string) {
  switch (periodId) {
    case "1":
      return {
        materias: "materias_enero_abril",
        grupos: "grupos_enero_abril",
        asignaciones: "asignaciones_enero_abril",
      }
    case "2":
      return {
        materias: "materias_mayo_agosto",
        grupos: "grupos_mayo_agosto",
        asignaciones: "asignaciones_mayo_agosto",
      }
    case "3":
      return {
        materias: "materias_septiembre_diciembre",
        grupos: "grupos_septiembre_diciembre",
        asignaciones: "asignaciones_septiembre_diciembre",
      }
    default:
      throw new Error("Periodo no válido")
  }
}
