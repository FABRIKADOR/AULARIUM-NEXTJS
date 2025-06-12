"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, Moon, Sun, RotateCcw, Check, Layout, Type } from "lucide-react"
import { useTheme } from "next-themes"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface UserSettings {
  notifications: boolean
  autoRefresh: boolean
  refreshInterval: number
  colorScheme: string
  fontSize: string
  compactMode: boolean
  showTips: boolean
}

export function ConfigDialog() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("perfil")
  const { toast } = useToast()
  const { setTheme, theme } = useTheme()
  const [userSettings, setUserSettings] = useState<UserSettings>({
    notifications: true,
    autoRefresh: true,
    refreshInterval: 5,
    colorScheme: "default",
    fontSize: "normal",
    compactMode: false,
    showTips: true,
  })
  const [loading, setLoading] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    email: "",
    role: "",
  })
  const router = useRouter()

  // Fetch user profile when dialog opens
  useEffect(() => {
    async function fetchUserProfile() {
      if (open) {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          if (!sessionData.session) return

          const userId = sessionData.session.user.id

          // Get user data from database
          const { data, error } = await supabase.from("usuarios").select("*").eq("id", userId).single()

          if (error) throw error

          if (data) {
            setUserProfile({
              fullName: data.nombre || sessionData.session.user.user_metadata?.full_name || "Usuario",
              email: data.email || sessionData.session.user.email || "",
              role: data.rol || "usuario",
            })
          }
        } catch (err) {
          console.error("Error fetching user profile:", err)
        }
      }
    }

    fetchUserProfile()
  }, [open])

  // Load user settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("userSettings")
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setUserSettings(parsedSettings)

        // Apply saved view mode
        /*if (parsedSettings.defaultView) {
          if (typeof window !== "undefined") {
            window.viewMode = parsedSettings.defaultView
          }
        }*/
      } catch (e) {
        console.error("Error loading settings:", e)
        // Si hay un error, asegurar que el esquema de color sea el predeterminado (naranja)
        setUserSettings((prevSettings) => ({
          ...prevSettings,
          colorScheme: "default",
        }))
      }
    } else {
      // Si no hay configuración guardada, asegurar que el esquema de color sea el predeterminado (naranja)
      setUserSettings((prevSettings) => ({
        ...prevSettings,
        colorScheme: "default",
      }))
      // Aplicar el esquema naranja inmediatamente
      setTimeout(() => applyColorScheme("default"), 100)
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = (newSettings: UserSettings) => {
    setLoading(true)
    try {
      localStorage.setItem("userSettings", JSON.stringify(newSettings))
      setUserSettings(newSettings)
      toast({
        title: "Configuración guardada",
        description: "Sus preferencias han sido actualizadas correctamente.",
      })
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    // Validate passwords
    if (!passwordForm.currentPassword) {
      toast({
        title: "Error",
        description: "Debe ingresar su contraseña actual",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas nuevas no coinciden",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      toast({
        title: "Contraseña actualizada",
        description: "Su contraseña ha sido actualizada correctamente.",
      })

      // Reset form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la contraseña. Verifique que su contraseña actual sea correcta.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSetting = (setting: keyof UserSettings) => {
    const newSettings = {
      ...userSettings,
      [setting]: !userSettings[setting],
    }
    saveSettings(newSettings)
  }

  const handleChangeSetting = <K extends keyof UserSettings>(setting: K, value: UserSettings[K]) => {
    let finalValue = value

    // Aplicar límites específicos para ciertas configuraciones
    if (setting === "refreshInterval") {
      const numValue = value as number
      finalValue = (numValue > 60 ? 60 : numValue) as unknown as UserSettings[K]
    }

    const newSettings = {
      ...userSettings,
      [setting]: finalValue,
    }
    saveSettings(newSettings)
  }

  const applyColorScheme = (scheme: string) => {
    const root = document.documentElement

    // Definir los colores para cada esquema
    const colorSchemes: Record<string, Record<string, string>> = {
      default: {
        primary: "hsl(37 98% 53%)",
        primaryForeground: "hsl(0 0% 100%)",
        secondary: "hsl(221 51% 16%)",
        secondaryForeground: "hsl(0 0% 100%)",
        accent: "hsl(37 98% 53%)",
        accentForeground: "hsl(221 51% 16%)",
        ring: "hsl(37 98% 53%)",
        border: "hsl(0 0% 90%)",
        muted: "hsl(0 0% 90%)",
        mutedForeground: "hsl(221 51% 16%)",
      },
      blue: {
        primary: "hsl(221.2 83.2% 53.3%)",
        primaryForeground: "hsl(210 40% 98%)",
        secondary: "hsl(221 51% 16%)",
        secondaryForeground: "hsl(0 0% 100%)",
        accent: "hsl(221.2 83.2% 53.3%)",
        accentForeground: "hsl(210 40% 98%)",
        ring: "hsl(221.2 83.2% 53.3%)",
        border: "hsl(214.3 31.8% 91.4%)",
        muted: "hsl(214.3 31.8% 91.4%)",
        mutedForeground: "hsl(215.4 16.3% 46.9%)",
      },
      green: {
        primary: "hsl(142.1 76.2% 36.3%)",
        primaryForeground: "hsl(355.7 100% 97.3%)",
        secondary: "hsl(221 51% 16%)",
        secondaryForeground: "hsl(0 0% 100%)",
        accent: "hsl(142.1 76.2% 36.3%)",
        accentForeground: "hsl(355.7 100% 97.3%)",
        ring: "hsl(142.1 76.2% 36.3%)",
        border: "hsl(120 16.7% 90%)",
        muted: "hsl(120 16.7% 90%)",
        mutedForeground: "hsl(120 5.9% 40%)",
      },
      purple: {
        primary: "hsl(262.1 83.3% 57.8%)",
        primaryForeground: "hsl(210 40% 98%)",
        secondary: "hsl(221 51% 16%)",
        secondaryForeground: "hsl(0 0% 100%)",
        accent: "hsl(262.1 83.3% 57.8%)",
        accentForeground: "hsl(210 40% 98%)",
        ring: "hsl(262.1 83.3% 57.8%)",
        border: "hsl(260 30% 90%)",
        muted: "hsl(260 30% 90%)",
        mutedForeground: "hsl(260 10% 40%)",
      },
      pink: {
        primary: "hsl(338.5 86.3% 56.9%)",
        primaryForeground: "hsl(210 40% 98%)",
        secondary: "hsl(221 51% 16%)",
        secondaryForeground: "hsl(0 0% 100%)",
        accent: "hsl(338.5 86.3% 56.9%)",
        accentForeground: "hsl(210 40% 98%)",
        ring: "hsl(338.5 86.3% 56.9%)",
        border: "hsl(340 30% 90%)",
        muted: "hsl(340 30% 90%)",
        mutedForeground: "hsl(340 10% 40%)",
      },
    }

    // Obtener el esquema de colores seleccionado
    const selectedScheme = colorSchemes[scheme] || colorSchemes.default

    // Aplicar el nuevo esquema de colores
    Object.entries(selectedScheme).forEach(([property, value]) => {
      root.style.setProperty(`--${property}`, value)
    })

    // Crear un estilo dinámico para aplicar colores específicos
    let styleElement = document.getElementById("dynamic-color-styles")
    if (!styleElement) {
      styleElement = document.createElement("style")
      styleElement.id = "dynamic-color-styles"
      document.head.appendChild(styleElement)
    }

    // Aplicar estilos específicos basados en el esquema de colores
    styleElement.textContent = `
      .bg-primary { background-color: ${selectedScheme.primary}; }
      .text-primary { color: ${selectedScheme.primary}; }
      .border-primary { border-color: ${selectedScheme.primary}; }
      .ring-primary { --tw-ring-color: ${selectedScheme.primary}; }

      /* Asegurar que los botones primarios tengan el color correcto */
      .btn-primary, 
      [data-variant="default"],
      .bg-primary {
        background-color: ${selectedScheme.primary};
        color: ${selectedScheme.primaryForeground};
      }

      /* Asegurar que los bordes y anillos tengan el color correcto */
      .border-primary, 
      .ring-primary,
      .focus-within\\:ring-primary:focus-within,
      .focus\\:ring-primary:focus {
        border-color: ${selectedScheme.primary};
        --tw-ring-color: ${selectedScheme.primary};
      }

      /* Corregir los hovers para los botones y elementos interactivos */
      [data-variant="default"]:hover {
        background-color: ${selectedScheme.primary};
        opacity: 0.9;
      }

      [data-variant="ghost"]:hover {
        background-color: ${selectedScheme.accent}20;
        color: ${selectedScheme.accentForeground};
      }

      [data-variant="outline"]:hover {
        background-color: ${selectedScheme.accent}20;
        color: ${selectedScheme.accentForeground};
      }

      /* Asegurar que los elementos de navegación mantengan sus estilos en hover */
      .text-muted-foreground.hover\\:text-foreground:hover {
        color: ${selectedScheme.foreground};
      }

      .hover\\:bg-accent:hover {
        background-color: ${selectedScheme.accent}20;
      }

      .hover\\:text-accent-foreground:hover {
        color: ${selectedScheme.accentForeground};
      }
    `

    // Forzar una actualización visual
    document.body.classList.add("theme-changed")
    setTimeout(() => document.body.classList.remove("theme-changed"), 50)

    // Guardar el esquema de colores en localStorage para persistencia
    localStorage.setItem("colorScheme", scheme)

    handleChangeSetting("colorScheme", scheme)

    // Mostrar toast de confirmación
    toast({
      title: "Color aplicado",
      description: `Se ha cambiado el esquema de color a ${getColorName(scheme)}.`,
    })
  }

  // Helper function to get color name
  const getColorName = (scheme: string) => {
    switch (scheme) {
      case "blue":
        return "Azul"
      case "green":
        return "Verde"
      case "purple":
        return "Púrpura"
      case "pink":
        return "Rosa"
      default:
        return "Naranja"
    }
  }

  /*const applyViewMode = (viewMode: string) => {
    // Save the view mode to localStorage for persistence
    localStorage.setItem("defaultView", viewMode)

    // Apply the view mode to the current session
    if (typeof window !== "undefined") {
      window.viewMode = viewMode
    }

    // Dispatch a custom event that components can listen for
    if (typeof document !== "undefined") {
      const event = new CustomEvent("viewModeChanged", { detail: { mode: viewMode } })
      document.dispatchEvent(event)
    }

    handleChangeSetting("defaultView", viewMode)

    // Refresh the page to apply the new view mode
    setTimeout(() => {
      router.refresh()
    }, 500)

    // Show confirmation toast
    toast({
      title: "Vista cambiada",
      description: `Se ha cambiado la vista predeterminada a ${getViewName(viewMode)}.`,
    })
  }

  // Helper function to get view name
  const getViewName = (viewMode: string) => {
    switch (viewMode) {
      case "tarjetas":
        return "Tarjetas"
      case "calendario":
        return "Calendario"
      default:
        return "Tabla"
    }
  }*/

  const applyFontSize = (fontSize: string) => {
    if (typeof document === "undefined") return

    const root = document.documentElement

    // Apply new font size
    switch (fontSize) {
      case "small":
        root.style.fontSize = "14px"
        break
      case "large":
        root.style.fontSize = "18px"
        break
      default: // Normal (default)
        root.style.fontSize = "16px"
    }

    handleChangeSetting("fontSize", fontSize)

    // Show confirmation toast
    toast({
      title: "Tamaño de fuente cambiado",
      description: `Se ha cambiado el tamaño de fuente a ${getFontSizeName(fontSize)}.`,
    })
  }

  // Helper function to get font size name
  const getFontSizeName = (fontSize: string) => {
    switch (fontSize) {
      case "small":
        return "Pequeño"
      case "large":
        return "Grande"
      default:
        return "Normal"
    }
  }

  const toggleCompactMode = () => {
    if (typeof document === "undefined") return

    const newCompactMode = !userSettings.compactMode

    if (newCompactMode) {
      document.body.classList.add("compact-mode")
    } else {
      document.body.classList.remove("compact-mode")
    }

    handleChangeSetting("compactMode", newCompactMode)

    toast({
      title: newCompactMode ? "Modo compacto activado" : "Modo compacto desactivado",
      description: newCompactMode
        ? "La interfaz ahora muestra más contenido en menos espacio."
        : "La interfaz ahora muestra el espaciado normal.",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md relative">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Configuración</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 bg-card border border-input text-card-foreground">
        <div className="flex items-center gap-2 p-6 border-b border-input">
          <Settings className="h-5 w-5 text-primary" />
          <DialogTitle className="text-xl font-semibold">Configuración</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground ml-auto">
            Personalice su experiencia
          </DialogDescription>
        </div>

        <div className="flex border-b border-input">
          <button
            onClick={() => setActiveTab("perfil")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === "perfil"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab("apariencia")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === "apariencia"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Apariencia
          </button>
          <button
            onClick={() => setActiveTab("preferencias")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === "preferencias"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preferencias
          </button>
        </div>

        <ScrollArea className="p-6 max-h-[60vh]">
          {activeTab === "perfil" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary border-l-4 border-primary pl-3">
                  Información de Usuario
                </h3>

                <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nombre:</p>
                    <p className="font-medium">{userProfile.fullName}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-sm text-muted-foreground">Email:</p>
                    <p className="font-medium">{userProfile.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Rol:</p>
                    <p className="font-medium">
                      {userProfile.role === "admin"
                        ? "Administrador"
                        : userProfile.role === "director"
                          ? "Director"
                          : "Usuario"}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-sm text-muted-foreground">Último acceso:</p>
                    <p className="font-medium">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary border-l-4 border-primary pl-3">Cambiar Contraseña</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? "Ocultar" : "Mostrar"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? "Ocultar" : "Mostrar"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? "Ocultar" : "Mostrar"}
                      </Button>
                    </div>
                  </div>

                  <Button onClick={handleUpdatePassword} disabled={loading} className="w-full">
                    {loading ? "Actualizando..." : "Actualizar Contraseña"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "apariencia" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary border-l-4 border-primary pl-3">Tema</h3>
                <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    <div>
                      <p className="font-medium">Modo {theme === "dark" ? "Oscuro" : "Claro"}</p>
                      <p className="text-sm text-muted-foreground">Cambiar entre modo claro y oscuro</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="min-w-[80px]"
                    >
                      <Sun className="h-4 w-4 mr-1" />
                      Claro
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="min-w-[80px]"
                    >
                      <Moon className="h-4 w-4 mr-1" />
                      Oscuro
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary border-l-4 border-primary pl-3">Esquema de Color</h3>
                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={() => applyColorScheme("default")}
                    className={cn(
                      "p-2 rounded-md flex flex-col items-center gap-2 transition-all",
                      userSettings.colorScheme === "default"
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-[hsl(37,98%,53%)] flex items-center justify-center">
                      {userSettings.colorScheme === "default" && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-xs font-medium">Naranja</span>
                  </button>
                  <button
                    onClick={() => applyColorScheme("blue")}
                    className={cn(
                      "p-2 rounded-md flex flex-col items-center gap-2 transition-all",
                      userSettings.colorScheme === "blue"
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-[hsl(221.2,83.2%,53.3%)] flex items-center justify-center">
                      {userSettings.colorScheme === "blue" && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-xs font-medium">Azul</span>
                  </button>
                  <button
                    onClick={() => applyColorScheme("green")}
                    className={cn(
                      "p-2 rounded-md flex flex-col items-center gap-2 transition-all",
                      userSettings.colorScheme === "green"
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-[hsl(142.1,76.2%,36.3%)] flex items-center justify-center">
                      {userSettings.colorScheme === "green" && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-xs font-medium">Verde</span>
                  </button>
                  <button
                    onClick={() => applyColorScheme("purple")}
                    className={cn(
                      "p-2 rounded-md flex flex-col items-center gap-2 transition-all",
                      userSettings.colorScheme === "purple"
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-[hsl(262.1,83.3%,57.8%)] flex items-center justify-center">
                      {userSettings.colorScheme === "purple" && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-xs font-medium">Púrpura</span>
                  </button>
                  <button
                    onClick={() => applyColorScheme("pink")}
                    className={cn(
                      "p-2 rounded-md flex flex-col items-center gap-2 transition-all",
                      userSettings.colorScheme === "pink"
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-[hsl(338.5,86.3%,56.9%)] flex items-center justify-center">
                      {userSettings.colorScheme === "pink" && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-xs font-medium">Rosa</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary border-l-4 border-primary pl-3">Tamaño de Fuente</h3>
                <RadioGroup
                  value={userSettings.fontSize}
                  onValueChange={(value) => applyFontSize(value)}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg">
                    <RadioGroupItem value="small" id="font-small" />
                    <Label htmlFor="font-small" className="flex items-center cursor-pointer">
                      <Type className="h-4 w-4 mr-2" />
                      <span>Pequeño</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg">
                    <RadioGroupItem value="normal" id="font-normal" />
                    <Label htmlFor="font-normal" className="flex items-center cursor-pointer">
                      <Type className="h-5 w-5 mr-2" />
                      <span>Normal</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg">
                    <RadioGroupItem value="large" id="font-large" />
                    <Label htmlFor="font-large" className="flex items-center cursor-pointer">
                      <Type className="h-6 w-6 mr-2" />
                      <span>Grande</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary border-l-4 border-primary pl-3">Modo Compacto</h3>
                <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Modo Compacto</p>
                      <p className="text-sm text-muted-foreground">Reduce el espaciado para mostrar más contenido</p>
                    </div>
                  </div>
                  <Switch
                    checked={userSettings.compactMode}
                    onCheckedChange={toggleCompactMode}
                    className="data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-[#FFA500] border-2 border-white dark:border-gray-800 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferencias" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary border-l-4 border-primary pl-3">Comportamiento</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium">Actualización Automática</p>
                      <p className="text-sm text-muted-foreground">Actualizar datos automáticamente</p>
                    </div>
                    <Switch
                      checked={userSettings.autoRefresh}
                      onCheckedChange={() => handleToggleSetting("autoRefresh")}
                      className="data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-[#FFA500] border-2 border-white dark:border-gray-800 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    />
                  </div>

                  {userSettings.autoRefresh && (
                    <div className="pl-3 border-l-2 border-muted">
                      <Label htmlFor="refresh-interval" className="text-sm">
                        Intervalo de actualización (minutos)
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="refresh-interval"
                          type="number"
                          min="1"
                          max="60"
                          value={userSettings.refreshInterval > 60 ? 60 : userSettings.refreshInterval}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 5
                            handleChangeSetting("refreshInterval", value > 60 ? 60 : value)
                          }}
                          className="w-20"
                        />
                        <Slider
                          value={[userSettings.refreshInterval > 60 ? 60 : userSettings.refreshInterval]}
                          min={1}
                          max={60}
                          step={1}
                          className="flex-1"
                          onValueChange={(value) => {
                            const newValue = value[0]
                            handleChangeSetting("refreshInterval", newValue > 60 ? 60 : newValue)
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <div>
                    <p className="font-medium">Mostrar Consejos</p>
                    <p className="text-sm text-muted-foreground">Mostrar consejos y ayudas contextuales</p>
                  </div>
                  <Switch
                    checked={userSettings.showTips}
                    onCheckedChange={() => handleToggleSetting("showTips")}
                    className="data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-[#FFA500] border-2 border-white dark:border-gray-800 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <div>
                    <p className="font-medium">Notificaciones</p>
                    <p className="text-sm text-muted-foreground">Recibir notificaciones del sistema</p>
                  </div>
                  <Switch
                    checked={userSettings.notifications}
                    onCheckedChange={() => handleToggleSetting("notifications")}
                    className="data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-[#FFA500] border-2 border-white dark:border-gray-800 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary border-l-4 border-primary pl-3">Restablecer</h3>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    // Reset localStorage settings
                    localStorage.removeItem("userSettings")

                    // Reset CSS variables
                    if (typeof document !== "undefined") {
                      const root = document.documentElement
                      root.style.removeProperty("--primary")
                      root.style.removeProperty("--primary-foreground")

                      // Reset font size
                      root.style.fontSize = "16px"

                      // Reset compact mode
                      root.classList.remove("compact-mode")
                    }

                    // Reset view mode
                    /*if (typeof window !== "undefined") {
                      window.viewMode = "tabla"
                    }

                    if (typeof document !== "undefined") {
                      const event = new CustomEvent("viewModeChanged", { detail: { mode: "tabla" } })
                      document.dispatchEvent(event)
                    }*/

                    // Reset state
                    setUserSettings({
                      notifications: true,
                      autoRefresh: true,
                      refreshInterval: 5,
                      colorScheme: "default",
                      fontSize: "normal",
                      compactMode: false,
                      showTips: true,
                    })

                    // Apply default color scheme
                    applyColorScheme("default")

                    // Set theme to system
                    setTheme("system")

                    toast({
                      title: "Configuración restablecida",
                      description: "Todas las preferencias han sido restablecidas a los valores predeterminados.",
                    })
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restablecer a Valores Predeterminados
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
