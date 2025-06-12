"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  School,
  Calendar,
  Home,
  HelpCircle,
  Building,
  LayoutGrid,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTheme } from "next-themes"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { ConfigDialog } from "./ConfigDialog"

// Add global styles for compact mode
if (typeof document !== "undefined") {
  const style = document.createElement("style")
  style.textContent = `
  .compact-mode .p-4 { padding: 0.75rem !important; }
  .compact-mode .space-y-4 { margin-top: 0.5rem !important; }
  .compact-mode .gap-4 { gap: 0.5rem !important; }
  .compact-mode table td { padding: 0.5rem !important; }
  .compact-mode .card { padding: 0.75rem !important; }
  `
  document.head.appendChild(style)
}

interface Periodo {
  id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
}

interface SidebarProps {
  currentSection: string
  onNavigate: (section: string) => void
  onSignOut?: () => void
  selectedPeriod?: string
  onPeriodChange?: (period: string) => void
  periodoNombre?: string
  isAdmin?: boolean
  refreshUserRole?: () => Promise<void>
  isCollapsed?: boolean
  setIsCollapsed?: (collapsed: boolean) => void
  setIsMobileOpen?: (open: boolean) => void
}

const menuItems = [
  {
    id: "dashboard",
    label: "Inicio",
    icon: Home,
    description: "Panel principal con resumen de datos",
    path: "/",
  },
  {
    id: "profesores",
    label: "Profesores",
    icon: GraduationCap,
    description: "Gestión de profesores",
    path: "/profesores",
  },
  {
    id: "materias-grupos",
    label: "Materias y Grupos",
    icon: BookOpen,
    description: "Gestión de materias y grupos",
    path: "/materias-grupos",
  },
  {
    id: "aulas",
    label: "Aulas",
    icon: School,
    description: "Gestión de aulas",
    path: "/aulas",
  },
  {
    id: "asignacion",
    label: "Asignación",
    icon: LayoutDashboard,
    description: "Asignación de aulas a grupos",
    path: "/asignacion",
  },
  {
    id: "horarios",
    label: "Horarios",
    icon: Calendar,
    description: "Visualización de horarios",
    path: "/horarios",
  },
]

// Define administrative roles
const ADMIN_ROLES = ["admin", "administrador"]

// Declare getUserRole function
async function getUserRole(userId: string) {
  try {
    // Intentamos obtener el rol directamente
    const { data, error } = await supabase.from("usuarios").select("carrera_nombre, rol").eq("id", userId).maybeSingle()

    if (error) {
      console.error("Error fetching user role:", error)
      return { carrera_nombre: null, rol: null }
    }

    // Si no hay datos, intentamos crear el usuario
    if (!data) {
      console.log("Usuario no encontrado en sidebar, intentando crear registro...")
      const { data: sessionData } = await supabase.auth.getSession()
      const userEmail = sessionData?.session?.user?.email || "unknown@email.com"

      // Usamos upsert para evitar errores de clave duplicada
      const { error: upsertError } = await supabase.from("usuarios").upsert(
        [
          {
            id: userId,
            email: userEmail,
            rol: "usuario",
            nombre: sessionData?.session?.user?.user_metadata?.full_name || "Usuario",
          },
        ],
        {
          onConflict: "id",
          ignoreDuplicates: false,
        },
      )

      if (upsertError) {
        console.error("Error creando usuario:", upsertError)
        return { carrera_nombre: null, rol: "usuario" }
      }

      return { carrera_nombre: null, rol: "usuario" }
    }

    return data || { carrera_nombre: null, rol: null }
  } catch (error) {
    console.error("Error fetching user role:", error)
    return { carrera_nombre: null, rol: null }
  }
}

// Declare viewMode variable
if (typeof window !== "undefined") {
  window.viewMode = window.viewMode || "tabla"
}

export function Sidebar({
  currentSection,
  onNavigate,
  onSignOut,
  selectedPeriod,
  onPeriodChange,
  periodoNombre,
  isAdmin: isAdminProp = false,
  refreshUserRole,
  isCollapsed = false,
  setIsCollapsed = () => {},
  setIsMobileOpen = () => {},
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpenState] = useState(false)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const { setTheme, theme } = useTheme()
  const [userCarrera, setUserCarrera] = useState<string | null>(null)
  const router = useRouter()
  const [userRoleState, setUserRoleState] = useState<string | null>(null)
  const { isAdmin, userRole, refreshUserRole: refreshAuthUserRole } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Add this effect to check user role on component mount
  useEffect(() => {
    async function checkUserRole() {
      try {
        // Primero intentamos obtener el rol del localStorage
        if (typeof window !== "undefined") {
          const storedRole = window.localStorage.getItem("userRoleState")
          if (storedRole) {
            console.log("User role from localStorage:", storedRole)
            setUserRoleState(storedRole)
            return
          }
        }

        // Si no hay rol en localStorage, lo obtenemos de la base de datos
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          const { data: userData, error } = await supabase
            .from("usuarios")
            .select("rol")
            .eq("id", data.session.user.id)
            .single()

          if (userData) {
            console.log("User role from database:", userData.rol)
            setUserRoleState(userData.rol)

            // Store the role in localStorage for cross-component access
            if (typeof window !== "undefined") {
              window.localStorage.setItem("userRoleState", userData.rol)
              console.log("Stored user role in localStorage:", userData.rol)

              // If role is an admin role, set force_admin_access flag
              if (ADMIN_ROLES.includes(userData.rol.toLowerCase())) {
                window.localStorage.setItem("force_admin_access", "true")
                console.log("Setting force_admin_access flag for admin user")
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error)
      }
    }

    checkUserRole()
  }, [])

  // Añadir este useEffect para cargar los periodos académicos
  useEffect(() => {
    const loadPeriodos = async () => {
      setIsLoading(true)
      try {
        // Definir los periodos predeterminados
        const defaultPeriodos = [
          { id: 1, nombre: "Enero-Abril", fecha_inicio: "2025-01-01", fecha_fin: "2025-04-30" },
          { id: 2, nombre: "Mayo-Agosto", fecha_inicio: "2025-05-01", fecha_fin: "2025-08-31" },
          { id: 3, nombre: "Septiembre-Diciembre", fecha_inicio: "2025-09-01", fecha_fin: "2025-12-31" },
        ]

        // Intentar cargar periodos desde la base de datos
        const { data, error } = await supabase.from("periodos").select("*")

        if (error || !data || data.length === 0) {
          console.log("Usando periodos predeterminados")
          setPeriodos(defaultPeriodos)
        } else {
          console.log("Periodos cargados desde la base de datos:", data)
          setPeriodos(data)
        }
      } catch (error) {
        console.error("Error cargando periodos:", error)
        // En caso de error, usar periodos predeterminados
        setPeriodos([
          { id: 1, nombre: "Enero-Abril", fecha_inicio: "2025-01-01", fecha_fin: "2025-04-30" },
          { id: 2, nombre: "Mayo-Agosto", fecha_inicio: "2025-05-01", fecha_fin: "2025-08-31" },
          { id: 3, nombre: "Septiembre-Diciembre", fecha_inicio: "2025-09-01", fecha_fin: "2025-12-31" },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    loadPeriodos()
  }, [])

  // Render the admin button directly in the sidebar
  const renderAdminButton = () => {
    // Check if user has admin role - using case-insensitive comparison with ADMIN_ROLES array
    const storedRole = typeof window !== "undefined" ? window.localStorage.getItem("userRoleState") : null

    const hasAdminRole =
      isAdmin ||
      isAdminProp ||
      (userRole && ADMIN_ROLES.includes(userRole.toLowerCase())) ||
      (userRoleState && ADMIN_ROLES.includes(userRoleState.toLowerCase())) ||
      (storedRole && ADMIN_ROLES.includes(storedRole.toLowerCase()))

    console.log("Rendering admin button. Has admin role:", hasAdminRole, {
      isAdmin,
      userRole,
      userRoleState,
      storedRole,
      isAdminProp,
    })

    if (!hasAdminRole) {
      console.log("User does not have admin role, not rendering admin button")
      return null
    }

    console.log("User has admin role, rendering admin button")
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={currentSection === "admin" ? "default" : "ghost"}
            className={cn(
              "w-full justify-start gap-2 transition-all duration-200",
              currentSection === "admin"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground active:bg-accent/90",
              isCollapsed && "justify-center p-2",
            )}
            onClick={() => {
              console.log("Admin button clicked, navigating to admin section")
              // Force admin check before navigation
              if (typeof window !== "undefined") {
                // Set a temporary flag to indicate admin status
                window.localStorage.setItem("force_admin_access", "true")
                console.log("Setting force_admin_access flag for admin navigation")
              }
              onNavigate("admin")
              setIsMobileOpenState(false)
            }}
          >
            <ClipboardList className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "")} />
            {!isCollapsed && <span>Administración</span>}
          </Button>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right">
            <p>Administración</p>
            <p className="text-xs text-muted-foreground">Panel de administración del sistema</p>
          </TooltipContent>
        )}
      </Tooltip>
    )
  }

  const toggleMobileSidebar = () => {
    setIsMobileOpenState(!isMobileOpen)
    if (setIsMobileOpen) {
      setIsMobileOpen(!isMobileOpen)
    }
  }

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
  }

  const getCurrentPeriodoNombre = () => {
    const periodo = periodos.find((p) => p.id === Number(selectedPeriod))
    return periodo ? periodo.nombre : "Periodo no seleccionado"
  }

  const handleSignOut = async () => {
    try {
      // Evitar múltiples clics
      if (isSigningOut) return

      setIsSigningOut(true)
      console.log("Iniciando proceso de cierre de sesión")

      // Mostrar toast de información
      toast({
        title: "Cerrando sesión",
        description: "Por favor espere...",
      })

      // Limpiar localStorage para evitar problemas con múltiples instancias
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("force_admin_access")
        window.localStorage.removeItem("userRoleState")
        window.localStorage.removeItem("supabase.auth.token")
      }

      // Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("Error al cerrar sesión:", error)
        toast({
          title: "Error al cerrar sesión",
          description: "No se pudo cerrar la sesión. Intente nuevamente.",
          variant: "destructive",
        })
        setIsSigningOut(false)
        return
      }

      console.log("Sesión cerrada correctamente")

      // Redirigir inmediatamente
      window.location.href = "/"
    } catch (e) {
      console.error("Excepción al cerrar sesión:", e)
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al cerrar la sesión.",
        variant: "destructive",
      })
      setIsSigningOut(false)
    }
  }

  return (
    <TooltipProvider>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={toggleMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full bg-card text-card-foreground border-r border-input z-40 transition-all duration-300 card-shadow dark:bg-card dark:text-card-foreground overflow-hidden",
          isCollapsed ? "w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header with Logo */}
        <div className="p-4 border-b border-input flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <School className="w-6 h-6 text-primary" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-primary">Aularium</h1>
                <p className="text-xs text-muted-foreground">Sistema de Asignación</p>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden lg:flex">
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobileSidebar}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Period selector */}
        <div className={cn("p-4 border-b border-input", isCollapsed ? "hidden" : "block")}>
          <label className="text-xs text-muted-foreground block mb-2">Periodo Académico</label>
          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-full transition-colors duration-200 hover:border-primary focus:border-primary">
              <SelectValue placeholder="Seleccionar Periodo" />
            </SelectTrigger>
            <SelectContent className="animate-in fade-in-80 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:zoom-out-95">
              {isLoading ? (
                <div className="p-2 text-center text-sm text-muted-foreground">Cargando periodos...</div>
              ) : periodos.length > 0 ? (
                periodos.map((periodo) => (
                  <SelectItem
                    key={periodo.id}
                    value={periodo.id.toString()}
                    className="cursor-pointer transition-colors duration-200 hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent/50 focus:text-accent-foreground"
                  >
                    {periodo.nombre}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-center text-sm text-muted-foreground">No hay periodos disponibles</div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Collapsed Period Indicator */}
        {isCollapsed && selectedPeriod && (
          <div className="p-2 flex justify-center border-b border-input">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="px-2 py-1 cursor-help">
                  <Calendar className="h-4 w-4" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Periodo: {getCurrentPeriodoNombre()}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {menuItems.map((item) => {
            const Icon = item.icon

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentSection === item.id ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2 transition-all",
                      currentSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      isCollapsed && "justify-center p-2",
                    )}
                    onClick={() => {
                      if (typeof onNavigate === "function") {
                        onNavigate(item.id)
                      }
                      setIsMobileOpenState(false)
                    }}
                  >
                    <Icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "")} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}

          {/* Render admin button directly */}
          {renderAdminButton()}
        </nav>

        {/* Footer with Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-input bg-card">
          <div className="flex items-center justify-between mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "text-destructive hover:bg-destructive/10 hover:text-destructive",
                    isCollapsed ? "w-10 h-10 p-0" : "justify-start gap-2 w-full",
                  )}
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current"></div>
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                  {!isCollapsed && <span>{isSigningOut ? "Cerrando..." : "Cerrar Sesión"}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Cerrar sesión</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {!isCollapsed && (
            <div className="flex items-center justify-between">
              <a
                href="https://elfabrikador.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                by: ElFabrikador
              </a>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHelpDialog(true)}>
                  <HelpCircle className="h-4 w-4" />
                </Button>
                <ConfigDialog />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full card-shadow lg:hidden z-50"
        onClick={toggleMobileSidebar}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl flex items-center gap-2 text-primary">
              <HelpCircle className="h-6 w-6 text-primary" />
              Guía Completa del Sistema de Asignación de Aulas
            </DialogTitle>
            <DialogDescription>
              Manual detallado de todas las funcionalidades del sistema para la gestión y asignación de aulas
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Tabs defaultValue="inicio" className="w-full">
              <TabsList className="mb-4 w-full grid grid-cols-6 bg-muted/50">
                <TabsTrigger value="inicio" className="flex items-center gap-1.5">
                  <Home className="h-4 w-4" />
                  <span>Inicio</span>
                </TabsTrigger>
                <TabsTrigger value="profesores" className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  <span>Profesores</span>
                </TabsTrigger>
                <TabsTrigger value="materias" className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  <span>Materias</span>
                </TabsTrigger>
                <TabsTrigger value="aulas" className="flex items-center gap-1.5">
                  <Building className="h-4 w-4" />
                  <span>Aulas</span>
                </TabsTrigger>
                <TabsTrigger value="asignacion" className="flex items-center gap-1.5">
                  <LayoutGrid className="h-4 w-4" />
                  <span>Asignación</span>
                </TabsTrigger>
                <TabsTrigger value="horarios" className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Horarios</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh] pr-4">
                <TabsContent value="inicio" className="space-y-6 mt-0">
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2 text-primary">Panel de Control</h3>
                    <p className="mb-4">
                      El panel de control muestra un resumen de la información del sistema, permitiéndole visualizar
                      rápidamente el estado actual de la asignación de aulas.
                    </p>

                    <h4 className="font-medium text-primary mt-4">Características principales:</h4>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                      <li>Visualización de estadísticas generales del periodo académico actual</li>
                      <li>Gráficos de ocupación de aulas por día y hora</li>
                      <li>Resumen de materias y grupos sin aula asignada</li>
                      <li>Acceso rápido a las funciones más utilizadas</li>
                    </ul>

                    <h4 className="font-medium text-primary mt-4">Cómo utilizar:</h4>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Seleccione el periodo académico en el selector de la barra lateral</li>
                      <li>Revise las estadísticas generales en la parte superior</li>
                      <li>Utilice los gráficos para identificar horas pico y disponibilidad</li>
                      <li>Haga clic en cualquier sección para acceder directamente a ella</li>
                    </ol>
                  </div>
                </TabsContent>

                <TabsContent value="profesores" className="space-y-6 mt-0">
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2 text-primary">Gestión de Profesores</h3>
                    <p className="mb-4">
                      Este módulo le permite administrar la información de los profesores y su disponibilidad horaria.
                    </p>

                    <h4 className="font-medium text-primary mt-4">Funcionalidades principales:</h4>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                      <li>Registro y actualización de información de profesores</li>
                      <li>Gestión de disponibilidad horaria por profesor</li>
                      <li>Asignación de profesores a materias y grupos</li>
                      <li>Visualización de carga académica por profesor</li>
                    </ul>

                    <h4 className="font-medium text-primary mt-4">Pasos para registrar un profesor:</h4>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Acceda a la sección "Profesores" desde el menú lateral</li>
                      <li>Haga clic en el botón "Agregar Profesor"</li>
                      <li>Complete el formulario con la información requerida</li>
                      <li>Establezca la disponibilidad horaria del profesor</li>
                      <li>Guarde los cambios</li>
                    </ol>

                    <h4 className="font-medium text-primary mt-4">Gestión de disponibilidad:</h4>
                    <p className="mt-2">
                      Para cada profesor, puede establecer su disponibilidad por día y hora utilizando la matriz de
                      disponibilidad. Simplemente haga clic en las celdas correspondientes para marcar las horas
                      disponibles.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="materias" className="space-y-6 mt-0">
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2 text-primary">Materias y Grupos</h3>
                    <p className="mb-4">
                      Este módulo permite gestionar las materias académicas y los grupos asociados a cada una de ellas.
                    </p>

                    <h4 className="font-medium text-primary mt-4">Funcionalidades principales:</h4>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                      <li>Registro y actualización de materias</li>
                      <li>Creación y gestión de grupos por materia</li>
                      <li>Asignación de horarios a grupos</li>
                      <li>Importación masiva de materias y grupos desde archivos PDF o CSV</li>
                    </ul>

                    <h4 className="font-medium text-primary mt-4">Pasos para crear una materia:</h4>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Acceda a la sección "Materias y Grupos" desde el menú lateral</li>
                      <li>Haga clic en el botón "Agregar Materia"</li>
                      <li>Complete el formulario con el código, nombre y carrera</li>
                      <li>Guarde los cambios</li>
                    </ol>

                    <h4 className="font-medium text-primary mt-4">Gestión de grupos:</h4>
                    <p className="mt-2">
                      Para cada materia, puede crear múltiples grupos. Cada grupo debe tener un número identificador y
                      un horario asignado. Para crear un grupo:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Seleccione la materia en la lista</li>
                      <li>Haga clic en "Agregar Grupo"</li>
                      <li>Asigne un número de grupo y seleccione el profesor</li>
                      <li>Establezca los horarios del grupo utilizando la matriz de horarios</li>
                      <li>Guarde los cambios</li>
                    </ol>
                  </div>
                </TabsContent>

                <TabsContent value="aulas" className="space-y-6 mt-0">
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2 text-primary">Gestión de Aulas</h3>
                    <p className="mb-4">
                      Este módulo permite administrar las aulas disponibles en la institución, sus características y
                      disponibilidad.
                    </p>

                    <h4 className="font-medium text-primary mt-4">Funcionalidades principales:</h4>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                      <li>Registro y actualización de aulas</li>
                      <li>Configuración de capacidad y recursos disponibles</li>
                      <li>Visualización de ocupación de aulas por periodo</li>
                      <li>Filtrado de aulas por características</li>
                    </ul>

                    <h4 className="font-medium text-primary mt-4">Pasos para registrar un aula:</h4>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Acceda a la sección "Aulas" desde el menú lateral</li>
                      <li>Haga clic en el botón "Agregar Aula"</li>
                      <li>Complete el formulario con el código, nombre, capacidad y recursos</li>
                      <li>Guarde los cambios</li>
                    </ol>

                    <h4 className="font-medium text-primary mt-4">Gestión de recursos:</h4>
                    <p className="mt-2">
                      Para cada aula, puede especificar los recursos disponibles como proyector, computadoras, aire
                      acondicionado, etc. Estos recursos serán considerados durante el proceso de asignación para
                      encontrar el aula más adecuada para cada grupo.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="asignacion" className="space-y-6 mt-0">
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2 text-primary">Asignación de Aulas</h3>
                    <p className="mb-4">
                      Este módulo permite asignar aulas a los grupos de materias, considerando horarios, capacidad y
                      recursos necesarios.
                    </p>

                    <h4 className="font-medium text-primary mt-4">Funcionalidades principales:</h4>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                      <li>Asignación manual de aulas a grupos</li>
                      <li>Asignación automática basada en criterios</li>
                      <li>Detección y resolución de conflictos de horarios</li>
                      <li>Visualización de asignaciones por periodo</li>
                    </ul>

                    <h4 className="font-medium text-primary mt-4">Pasos para asignar aulas manualmente:</h4>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Acceda a la sección "Asignación" desde el menú lateral</li>
                      <li>Seleccione el periodo académico</li>
                      <li>Filtre los grupos sin aula asignada</li>
                      <li>Seleccione un grupo y haga clic en "Asignar Aula"</li>
                      <li>Elija un aula disponible de la lista</li>
                      <li>Confirme la asignación</li>
                    </ol>

                    <h4 className="font-medium text-primary mt-4">Asignación automática:</h4>
                    <p className="mt-2">
                      El sistema puede asignar aulas automáticamente a todos los grupos sin asignación. Para utilizar
                      esta función:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Haga clic en "Asignación Automática"</li>
                      <li>Configure los criterios de prioridad</li>
                      <li>Inicie el proceso</li>
                      <li>Revise y confirme las asignaciones propuestas</li>
                    </ol>
                  </div>
                </TabsContent>

                <TabsContent value="horarios" className="space-y-6 mt-0">
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2 text-primary">Visualización de Horarios</h3>
                    <p className="mb-4">
                      Este módulo permite visualizar los horarios de clases por aula, profesor o grupo.
                    </p>

                    <h4 className="font-medium text-primary mt-4">Funcionalidades principales:</h4>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                      <li>Visualización de horarios semanales</li>
                      <li>Filtrado por aula, profesor o carrera</li>
                      <li>Exportación de horarios en formato PDF</li>
                      <li>Vista detallada de ocupación por día y hora</li>
                    </ul>

                    <h4 className="font-medium text-primary mt-4">Cómo visualizar horarios:</h4>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Acceda a la sección "Horarios" desde el menú lateral</li>
                      <li>Seleccione el periodo académico</li>
                      <li>Elija el tipo de visualización (por aula, profesor o carrera)</li>
                      <li>Aplique los filtros necesarios</li>
                      <li>Explore el horario semanal generado</li>
                    </ol>

                    <h4 className="font-medium text-primary mt-4">Exportación de horarios:</h4>
                    <p className="mt-2">
                      Puede exportar los horarios visualizados en formato PDF para su impresión o distribución. Para
                      ello, haga clic en el botón "Exportar PDF" ubicado en la parte superior de la vista de horarios.
                    </p>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
