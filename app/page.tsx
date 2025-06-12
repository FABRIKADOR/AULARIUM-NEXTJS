"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, getSessionSafely } from "@/lib/supabase"
import Auth from "../components/Auth"
import ProfesorManagement from "../components/ProfesorManagement"
import MateriaGrupoManagement from "../components/MateriaGrupoManagement"
import AsignacionAulas from "../components/AsignacionAulas"
import AulaManagement from "../components/AulaManagement"
import HorarioGrupo from "../components/HorarioGrupo"
import Dashboard from "../components/Dashboard"
import { MainLayout } from "@/components/layout/main-layout"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/lib/auth"
import UserManagement from "@/components/UserManagement"

// Define administrative roles
const ADMIN_ROLES = ["admin", "administrador"]

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [currentSection, setCurrentSection] = useState("dashboard")
  const [selectedPeriod, setSelectedPeriod] = useState("1")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { isAdmin, userRole, refreshUserRole } = useAuth()
  const [localIsAdmin, setLocalIsAdmin] = useState(false)
  const [authError, setAuthError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Usar useRef en lugar de useState para el contador de intentos
  // para evitar el bucle infinito de renderizados
  const sessionCheckAttemptsRef = useRef(0)
  const isMountedRef = useRef(true)

  // Add this effect to check URL parameters for section
  useEffect(() => {
    // Check if there's a section parameter in the URL
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const sectionParam = urlParams.get("section")

      if (sectionParam) {
        setCurrentSection(sectionParam)
      }
    }
  }, [])

  // Function to check admin status directly from database
  const checkAdminStatus = async () => {
    try {
      // Primero intentamos obtener el rol del localStorage
      if (typeof window !== "undefined") {
        const storedRole = window.localStorage.getItem("userRoleState")
        if (storedRole) {
          console.log("User role from localStorage:", storedRole)
          const isUserAdmin = ADMIN_ROLES.includes(storedRole.toLowerCase())
          setLocalIsAdmin(isUserAdmin)
          return isUserAdmin
        }
      }

      // Obtener la sesión de manera segura
      const session = await getSessionSafely()

      if (!session?.user) {
        console.log("No hay sesión activa")
        return false
      }

      const userId = session.user.id
      console.log("Checking admin status directly from database for user:", userId)

      const { data, error } = await supabase.from("usuarios").select("rol").eq("id", userId).single()

      if (error) {
        console.error("Error checking admin status:", error)
        return false
      }

      if (!data) {
        console.log("No user data found")
        return false
      }

      const userRole = data.rol
      console.log("User role from database:", userRole)

      // Check if the role is admin (case insensitive)
      const isUserAdmin = userRole && ADMIN_ROLES.includes(userRole.toLowerCase())

      console.log("Is user admin (from database check):", isUserAdmin)
      setLocalIsAdmin(isUserAdmin)

      // Store in localStorage for persistence
      if (typeof window !== "undefined") {
        window.localStorage.setItem("userRoleState", userRole)
        if (isUserAdmin) {
          window.localStorage.setItem("force_admin_access", "true")
        }
      }

      return isUserAdmin
    } catch (error) {
      console.error("Error in checkAdminStatus:", error)
      return false
    }
  }

  // Immediately check admin status when component mounts
  useEffect(() => {
    checkAdminStatus()
  }, [])

  // Efecto para limpiar las referencias cuando el componente se desmonta
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Efecto para verificar la sesión
  useEffect(() => {
    // Función para verificar la sesión
    async function checkSession() {
      try {
        setLoading(true)

        // Obtener la sesión de manera segura
        const session = await getSessionSafely(5000)

        // Verificar si el componente sigue montado
        if (!isMountedRef.current) return

        // Actualizar el estado de la sesión
        setSession(session)

        // Si hay una sesión, verificar el estado de administrador
        if (session) {
          try {
            await checkAdminStatus()
          } catch (adminError) {
            console.error("Error al verificar estado de administrador:", adminError)
          }
        }

        // Finalizar la carga
        setLoading(false)
      } catch (error) {
        console.error("Error general al verificar la sesión:", error)

        // Verificar si el componente sigue montado
        if (!isMountedRef.current) return

        // Incrementar el contador de reintentos
        setRetryCount((prev) => prev + 1)

        if (retryCount < 3) {
          // Reintentar después de un breve retraso
          setTimeout(() => {
            checkSession()
          }, 1000)
          return
        }

        // En caso de error, mostrar la pantalla de login
        setSession(null)
        setLoading(false)
        setAuthError(new Error("Error al obtener la sesión después de varios intentos"))
      }
    }

    // Ejecutar la verificación de sesión
    checkSession()

    // Configurar el listener de cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Verificar si el componente sigue montado
      if (!isMountedRef.current) return

      // Actualizar el estado de la sesión
      setSession(session)

      // Si hay una sesión, verificar el estado de administrador
      if (session) {
        try {
          await checkAdminStatus()
        } catch (error) {
          console.error("Error al verificar estado de administrador:", error)
        }
      }
    })

    // Limpiar la suscripción cuando el componente se desmonte
    return () => {
      subscription.unsubscribe()
    }
  }, [retryCount]) // Dependencia para reintentar

  // Modificar la función handlePeriodChange para cambiar la variante de la notificación
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    // Cambiamos la variante a default en lugar de success
    toast({
      title: "Periodo actualizado",
      description: getPeriodoNombre(period),
      variant: "default",
    })
  }

  // Función auxiliar para obtener el nombre del periodo
  const getPeriodoNombre = (periodId: string) => {
    switch (periodId) {
      case "1":
        return "Enero-Abril"
      case "2":
        return "Mayo-Agosto"
      case "3":
        return "Septiembre-Diciembre"
      default:
        return "Desconocido"
    }
  }

  // Función para navegar entre secciones
  const handleNavigate = async (section: string) => {
    console.log("Navigating to section:", section)

    // If trying to access admin section, check admin status directly
    if (section === "admin") {
      // Check for force_admin_access flag
      const forceAdminAccess =
        typeof window !== "undefined" && window.localStorage.getItem("force_admin_access") === "true"

      if (forceAdminAccess) {
        console.log("Force admin access flag detected, allowing navigation")
        // Clear the flag after use
        window.localStorage.removeItem("force_admin_access")
        setCurrentSection(section)
        return
      }

      // Check if user has admin role from localStorage
      const storedUserRole = typeof window !== "undefined" ? window.localStorage.getItem("userRoleState") : null
      const hasAdminRole = storedUserRole && ADMIN_ROLES.includes(storedUserRole.toLowerCase())

      // Check if user is admin from any source
      if (isAdmin || localIsAdmin || hasAdminRole) {
        console.log("User is admin, allowing navigation")
        setCurrentSection(section)
        return
      }

      // If not admin, check directly from database
      const isUserAdmin = await checkAdminStatus()
      if (isUserAdmin) {
        console.log("User is admin (from database check), allowing navigation")
        setCurrentSection(section)
        return
      }

      console.log("Cannot navigate to admin section - user is not admin")
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para acceder a esta sección",
        variant: "destructive",
      })
      return
    }

    setCurrentSection(section)
  }

  // Si hay un error de autenticación, mostrar un mensaje de error con opción para reintentar
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error de conexión</h2>
          <p className="text-gray-700 mb-4">
            No se pudo conectar con el servidor de autenticación. Por favor, verifica tu conexión a internet.
          </p>
          <button
            onClick={() => {
              setAuthError(null)
              sessionCheckAttemptsRef.current = 0
              setRetryCount(0)
              setLoading(true)
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    // Incrementar el contador de intentos
    sessionCheckAttemptsRef.current += 1

    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500">Cargando aplicación...</p>
        {sessionCheckAttemptsRef.current > 1 && (
          <button
            onClick={() => {
              // Limpiar la sesión y mostrar la pantalla de login
              setLoading(false)
              setSession(null)
              // Limpiar localStorage para evitar problemas
              if (typeof window !== "undefined") {
                window.localStorage.removeItem("supabase.auth.token")
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Ir al login
          </button>
        )}
      </div>
    )
  }

  if (!session) {
    return (
      <>
        <Auth />
        <Toaster />
      </>
    )
  }

  console.log("Rendering with isAdmin:", isAdmin, "currentSection:", currentSection, "localIsAdmin:", localIsAdmin)

  const renderCurrentSection = () => {
    // Check for admin sections that only admins should access
    if (!session) {
      return <Auth />
    }

    // Check if user has admin role from userRoleState in localStorage
    const storedUserRole = typeof window !== "undefined" ? window.localStorage.getItem("userRoleState") : null
    const hasAdminRole = storedUserRole && ADMIN_ROLES.includes(storedUserRole.toLowerCase())

    // If trying to access admin section but not admin, redirect to dashboard
    if (currentSection === "admin" && !isAdmin && !localIsAdmin && !hasAdminRole) {
      console.log("User is not admin, redirecting to dashboard")
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        setCurrentSection("dashboard")
      }, 0)
      return <Dashboard selectedPeriod={selectedPeriod} onNavigate={handleNavigate} />
    }

    switch (currentSection) {
      case "dashboard":
        return <Dashboard selectedPeriod={selectedPeriod} onNavigate={handleNavigate} />
      case "profesores":
        return <ProfesorManagement />
      case "materias-grupos":
        return <MateriaGrupoManagement selectedPeriod={selectedPeriod} />
      case "aulas":
        return <AulaManagement />
      case "asignacion":
        return <AsignacionAulas selectedPeriod={selectedPeriod} />
      case "horarios":
        return <HorarioGrupo />
      case "admin":
        // Add a check to ensure only admins can access this section
        // Include the hasAdminRole check
        return isAdmin || localIsAdmin || hasAdminRole ? (
          <UserManagement />
        ) : (
          <Dashboard selectedPeriod={selectedPeriod} onNavigate={handleNavigate} />
        )
      default:
        return <Dashboard selectedPeriod={selectedPeriod} onNavigate={handleNavigate} />
    }
  }

  return (
    <>
      <MainLayout
        currentSection={currentSection}
        onNavigate={handleNavigate}
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        isAdmin={
          isAdmin ||
          localIsAdmin ||
          (typeof window !== "undefined" &&
            ADMIN_ROLES.includes((window.localStorage.getItem("userRoleState") || "").toLowerCase()))
        }
      >
        {renderCurrentSection()}
      </MainLayout>
      <Toaster />
    </>
  )
}
