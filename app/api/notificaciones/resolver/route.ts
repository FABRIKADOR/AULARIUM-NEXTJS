import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Inicializar el cliente de Supabase con la clave de servicio para evitar restricciones RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request: Request) {
  try {
    const { notificacionId, remitenteId, periodo } = await request.json()

    if (!notificacionId) {
      return NextResponse.json({ error: "ID de notificación no proporcionado" }, { status: 400 })
    }

    console.log("Procesando notificación:", { notificacionId, remitenteId, periodo })

    // 1. Obtener la notificación original para asegurarnos de tener el remitente_id correcto
    const { data: notificacion, error: fetchError } = await supabaseAdmin
      .from("notificaciones")
      .select("*")
      .eq("id", notificacionId)
      .single()

    if (fetchError) {
      console.error("Error al obtener notificación:", fetchError)
      return NextResponse.json({ error: "Error al obtener notificación: " + fetchError.message }, { status: 500 })
    }

    console.log("Notificación obtenida:", notificacion)

    // Usar el remitente_id de la notificación si no se proporcionó
    // Si no hay remitente_id, intentar obtenerlo de los datos
    let remitente = remitenteId || notificacion.remitente_id

    // Si no hay remitente_id, intentar obtenerlo de los datos.solicitante.id
    if (!remitente && notificacion.datos && notificacion.datos.solicitante && notificacion.datos.solicitante.id) {
      remitente = notificacion.datos.solicitante.id
      console.log("Usando remitente_id de datos.solicitante.id:", remitente)
    }

    // Si aún no hay remitente, usar un valor por defecto (el primer director)
    if (!remitente) {
      console.log("No se encontró remitente_id, buscando un director...")

      // Buscar un usuario con rol director
      const { data: directores, error: directorError } = await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("rol", "director")
        .limit(1)

      if (!directorError && directores && directores.length > 0) {
        remitente = directores[0].id
        console.log("Usando director como remitente:", remitente)
      } else {
        console.error("No se encontró ningún director:", directorError)
      }
    }

    // 2. Marcar la notificación actual como resuelta
    const { error: updateError } = await supabaseAdmin
      .from("notificaciones")
      .update({
        resuelta: true,
        leida: true,
      })
      .eq("id", notificacionId)

    if (updateError) {
      console.error("Error al actualizar notificación:", updateError)
      return NextResponse.json({ error: "Error al actualizar notificación: " + updateError.message }, { status: 500 })
    }

    // 3. Si tenemos un remitente, crear una notificación de respuesta
    if (remitente) {
      console.log("Enviando notificación de resolución al remitente:", remitente)

      const { data: nuevaNotificacion, error: insertError } = await supabaseAdmin
        .from("notificaciones")
        .insert({
          tipo: "SOLICITUD_RESUELTA",
          mensaje: `Tu solicitud de asignación de aulas para el periodo ${periodo || notificacion.datos?.periodo || ""} ha sido resuelta`,
          datos: {
            notificacionOriginalId: notificacionId,
            periodo: periodo || notificacion.datos?.periodo,
          },
          destinatario_id: remitente,
          remitente_id: null, // No hay remitente para esta notificación de sistema
          leida: false,
          resuelta: false,
        })
        .select()

      if (insertError) {
        console.error("Error al crear notificación de respuesta:", insertError)
        return NextResponse.json(
          { error: "Error al crear notificación de respuesta: " + insertError.message },
          { status: 500 },
        )
      }

      console.log("Notificación de resolución creada:", nuevaNotificacion)

      return NextResponse.json({
        success: true,
        message: "Notificación marcada como resuelta y respuesta enviada al remitente",
        notificacion: nuevaNotificacion,
      })
    } else {
      // Si no hay remitente, solo informar que se marcó como resuelta
      return NextResponse.json({
        success: true,
        message: "Notificación marcada como resuelta (no se pudo enviar respuesta al remitente)",
      })
    }
  } catch (error: any) {
    console.error("Error en el endpoint de resolver notificación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor: " + (error.message || "Desconocido") },
      { status: 500 },
    )
  }
}
