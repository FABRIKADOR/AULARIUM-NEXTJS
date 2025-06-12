"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

interface Notificacion {
  id: number
  tipo: string
  mensaje: string
  datos: any
  leida: boolean
  resuelta: boolean
  fecha_creacion: string
  destinatario_id: string
  remitente_id: string
}

export default function NotificacionesAdmin() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar el menú cuando se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        setUserId(data.session.user.id)
      }
    }

    fetchUserId()
  }, [])

  useEffect(() => {
    if (!userId) return

    const fetchNotificaciones = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("notificaciones")
          .select("*")
          .eq("destinatario_id", userId)
          .order("fecha_creacion", { ascending: false })
          .limit(10)

        if (error) throw error

        setNotificaciones(data || [])
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotificaciones()

    // Set up real-time subscription
    const channel = supabase
      .channel("notificaciones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificaciones",
          filter: `destinatario_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Cambio en notificaciones detectado:", payload)
          fetchNotificaciones()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const marcarComoLeida = async (id: number) => {
    try {
      // Obtener el usuario actual para asegurarnos de que estamos autenticados
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("Usuario no autenticado")
        return
      }

      // Actualizar directamente con el cliente de Supabase
      const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("id", id)

      if (error) {
        console.error("Error marking notification as read:", error)
        return
      }

      // Actualizar el estado local
      setNotificaciones(notificaciones.map((notif) => (notif.id === id ? { ...notif, leida: true } : notif)))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const marcarComoResuelta = async (notificacion: Notificacion) => {
    try {
      setProcesando(notificacion.id)

      // Primero, actualizar localmente para feedback inmediato
      setNotificaciones(
        notificaciones.map((notif) =>
          notif.id === notificacion.id ? { ...notif, resuelta: true, leida: true } : notif,
        ),
      )

      // Luego, enviar al servidor
      const response = await fetch("/api/notificaciones/resolver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificacionId: notificacion.id,
          remitenteId: notificacion.remitente_id,
          periodo: notificacion.datos?.periodo || "Mayo-Agosto",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al resolver la notificación")
      }

      const responseData = await response.json()
      console.log("Respuesta del servidor:", responseData)

      toast({
        title: "Solicitud resuelta",
        description: "Se ha notificado al usuario que su solicitud ha sido resuelta",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error resolving notification:", error)

      // Revertir el cambio local en caso de error
      setNotificaciones(
        notificaciones.map((notif) => (notif.id === notificacion.id ? { ...notif, resuelta: false } : notif)),
      )

      toast({
        title: "Error",
        description: error.message || "No se pudo resolver la solicitud",
        variant: "destructive",
      })
    } finally {
      setProcesando(null)
    }
  }

  const noLeidasCount = notificaciones.filter((n) => !n.leida).length

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const cerrarMenu = () => {
    setIsOpen(false)
  }

  // Función para formatear la fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button variant="ghost" size="icon" className="relative" onClick={toggleMenu} type="button">
        <Bell className="h-5 w-5" />
        {noLeidasCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs"
            variant="default"
          >
            {noLeidasCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 border rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-primary/10">
            <h3 className="font-medium text-lg">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {notificaciones.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {notificaciones.length} {notificaciones.length === 1 ? "notificación" : "notificaciones"}
                </span>
              )}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={cerrarMenu}>
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Bell className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No tienes notificaciones</p>
              </div>
            ) : (
              <div>
                {notificaciones.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b last:border-b-0 transition-colors hover:bg-muted/10 ${
                      notif.resuelta
                        ? "bg-green-50 dark:bg-green-900/20"
                        : !notif.leida
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : ""
                    }`}
                    onClick={() => !notif.leida && marcarComoLeida(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex-shrink-0 ${
                          notif.resuelta ? "text-green-500" : !notif.leida ? "text-blue-500" : "text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${!notif.leida ? "font-medium" : ""}`}>{notif.mensaje}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(notif.fecha_creacion)}</p>

                        {notif.tipo === "SOLICITUD_ASIGNACION" && !notif.resuelta && (
                          <Button
                            variant="default"
                            size="sm"
                            className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              marcarComoResuelta(notif)
                            }}
                            disabled={procesando === notif.id}
                          >
                            {procesando === notif.id ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                Procesando...
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Marcar como resuelto
                              </>
                            )}
                          </Button>
                        )}

                        {notif.resuelta && (
                          <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center">
                            <Check className="mr-1 h-3 w-3" />
                            Solicitud resuelta
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
