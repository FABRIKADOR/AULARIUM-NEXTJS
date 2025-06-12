"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabaseClient"
import NotificacionesAdmin from "@/components/NotificacionesAdmin"

interface MainLayoutProps {
  children: React.ReactNode
  currentSection?: string
  onNavigate?: (section: string) => void
  selectedPeriod?: string
  onPeriodChange?: (period: string) => void
  isAdmin?: boolean
}

export function MainLayout({
  children,
  currentSection = "dashboard",
  onNavigate = () => {},
  selectedPeriod = "1",
  onPeriodChange = () => {},
  isAdmin = false,
}: MainLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, refreshUserRole } = useAuth()
  const [session, setSession] = useState<any>(null)

  const periodo =
    selectedPeriod === "1" ? "enero-abril" : selectedPeriod === "2" ? "mayo-agosto" : "septiembre-diciembre"

  // Función para obtener el título de la sección actual
  const getSectionTitle = () => {
    switch (currentSection) {
      case "dashboard":
        return "Dashboard"
      case "profesores":
        return "Gestión de Profesores"
      case "materias-grupos":
        return "Materias y Grupos"
      case "aulas":
        return "Gestión de Aulas"
      case "asignacion":
        return "Asignación de Aulas"
      case "horarios":
        return "Horarios"
      case "admin":
        return "Panel de Administración"
      default:
        return "Dashboard"
    }
  }

  useEffect(() => {
    async function getSession() {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)
      } catch (error) {
        console.error("Error getting session in MainLayout:", error)
        // Si falla, asegurar que la interfaz se siga mostrando
        setSession(null)
      }
    }

    // Usar un timeout para evitar esperas infinitas
    const sessionTimeout = setTimeout(() => {
      console.warn("Session fetch timed out in MainLayout")
      setSession(null)
    }, 5000)

    getSession().finally(() => clearTimeout(sessionTimeout))
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  // Cerrar el menú móvil cuando cambia la sección
  useEffect(() => {
    setIsMobileOpen(false)
  }, [currentSection])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {/* Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={onNavigate}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        setIsMobileOpen={setIsMobileOpen}
        onSignOut={handleSignOut}
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
        isAdmin={isAdmin}
        refreshUserRole={refreshUserRole}
      />

      {/* Contenido principal */}
      <div className={`${isCollapsed ? "ml-20" : "ml-72"} transition-all duration-300 min-h-screen`}>
        {/* Nueva barra superior */}
        <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-oxford-blue text-oxford-blue dark:text-white">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            {/* Título de la sección actual */}
            <h1 className="text-xl font-bold">{getSectionTitle()}</h1>

            <div className="flex items-center gap-4">
              {/* Selector de periodos */}
              <div className="hidden md:flex items-center space-x-2">
                <button
                  onClick={() => onPeriodChange("1")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-oxford-blue/10 dark:hover:bg-white/10 ${
                    periodo === "enero-abril" ? "bg-oxford-blue/20 dark:bg-white/20" : ""
                  }`}
                >
                  Enero-Abril
                </button>
                <button
                  onClick={() => onPeriodChange("2")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-oxford-blue/10 dark:hover:bg-white/10 ${
                    periodo === "mayo-agosto" ? "bg-oxford-blue/20 dark:bg-white/20" : ""
                  }`}
                >
                  Mayo-Agosto
                </button>
                <button
                  onClick={() => onPeriodChange("3")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-oxford-blue/10 dark:hover:bg-white/10 ${
                    periodo === "septiembre-diciembre" ? "bg-oxford-blue/20 dark:bg-white/20" : ""
                  }`}
                >
                  Septiembre-Diciembre
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Botón de menú móvil */}
                <div className="md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileOpen(true)}
                    className="text-oxford-blue dark:text-white"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </div>

                {/* Notification Bell */}
                <NotificacionesAdmin />

                {/* Botón de tema */}
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Selector de periodo para móvil */}
        <div className="md:hidden p-4 border-b">
          <Tabs value={selectedPeriod} onValueChange={onPeriodChange} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="1" className="flex-1">
                Ene-Abr
              </TabsTrigger>
              <TabsTrigger value="2" className="flex-1">
                May-Ago
              </TabsTrigger>
              <TabsTrigger value="3" className="flex-1">
                Sep-Dic
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Contenido */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </ThemeProvider>
  )
}
