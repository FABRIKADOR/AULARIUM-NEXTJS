"use client"

import type React from "react"

import { useState } from "react"
import { supabase, fetchWithRetry } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { School, Mail, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { Label } from "@/components/ui/label"

// Modificar el componente Auth para aplicar el color naranja por defecto
// Agregar después de las importaciones y antes del componente

// Función para aplicar el esquema de color naranja por defecto
if (typeof document !== "undefined") {
  // Aplicar el color naranja por defecto en la vista de login
  const applyDefaultColor = () => {
    const root = document.documentElement

    // Definir los colores para el esquema naranja
    const orangeScheme = {
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
    }

    // Aplicar el esquema de colores
    Object.entries(orangeScheme).forEach(([property, value]) => {
      root.style.setProperty(`--${property}`, value)
    })

    // Crear un estilo dinámico para aplicar colores a elementos específicos
    let styleElement = document.getElementById("dynamic-color-styles-auth")
    if (!styleElement) {
      styleElement = document.createElement("style")
      styleElement.id = "dynamic-color-styles-auth"
      document.head.appendChild(styleElement)
    }

    // Aplicar estilos específicos
    styleElement.textContent = `
      .bg-primary { background-color: ${orangeScheme.primary}; }
      .text-primary { color: ${orangeScheme.primary}; }
      .border-primary { border-color: ${orangeScheme.primary}; }
      .ring-primary { --tw-ring-color: ${orangeScheme.primary}; }
      
      /* Asegurar que los botones primarios tengan el color correcto */
      .btn-primary, 
      [data-variant="default"],
      .bg-primary {
        background-color: ${orangeScheme.primary};
        color: ${orangeScheme.primaryForeground};
      }
      
      /* Asegurar que los bordes y anillos tengan el color correcto */
      .border-primary, 
      .ring-primary,
      .focus-within\\:ring-primary:focus-within,
      .focus\\:ring-primary:focus {
        border-color: ${orangeScheme.primary};
        --tw-ring-color: ${orangeScheme.primary};
      }
      
      /* Asegurar que los hovers también cambien de color */
      .hover\\:text-primary:hover {
        color: ${orangeScheme.primary};
      }
      
      .hover\\:bg-primary:hover {
        background-color: ${orangeScheme.primary};
      }
      
      .hover\\:border-primary:hover {
        border-color: ${orangeScheme.primary};
      }
    `
  }

  // Ejecutar la función inmediatamente
  applyDefaultColor()
}

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [message, setMessage] = useState<string | null>(null)

  const validateForm = () => {
    if (!email.trim()) {
      setError("Por favor, ingresa tu correo electrónico")
      return false
    }

    if (!password.trim()) {
      setError("Por favor, ingresa tu contraseña")
      return false
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Por favor, ingresa un correo electrónico válido")
      return false
    }

    // Password validation
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return false
    }

    setError(null)
    return true
  }

  // Actualizar la función handleLogin para manejar mejor los errores
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await fetchWithRetry(async () => {
        return await supabase.auth.signInWithPassword({
          email,
          password,
        })
      })

      if (error) throw error

      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente.",
      })
    } catch (error: any) {
      console.error("Error during login:", error)
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        setError("Error de conexión. Verifica tu conexión a internet e intenta nuevamente.")
      } else {
        setError(error.error_description || error.message || "Error al iniciar sesión")
      }
    } finally {
      setLoading(false)
    }
  }

  // Actualizar la función handleSignUp para manejar mejor los errores
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await fetchWithRetry(async () => {
        return await supabase.auth.signUp({
          email,
          password,
        })
      })

      if (error) throw error

      toast({
        title: "Registro exitoso",
        description: "Por favor, verifica tu email para completar el registro.",
      })

      setMessage("Revisa tu correo electrónico para confirmar tu cuenta")
    } catch (error: any) {
      console.error("Error during signup:", error)
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        setError("Error de conexión. Verifica tu conexión a internet e intenta nuevamente.")
      } else {
        setError(error.error_description || error.message || "Error al registrarse")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return

    if (isLogin) {
      await handleLogin(e)
    } else {
      await handleSignUp(e)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-white to-accent/10 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="w-[400px] card-shadow border-secondary/20">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <School className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Aularium</CardTitle>
            <CardDescription className="text-base mt-1">
              {isLogin ? "Inicia sesión en tu cuenta" : "Crea una nueva cuenta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="mb-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 border-secondary/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 border-secondary/30"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {isLogin ? "Iniciando sesión..." : "Registrando..."}
                  </>
                ) : isLogin ? (
                  "Iniciar Sesión"
                ) : (
                  "Registrarse"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
            </Button>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Sistema de Asignación de Aulas © {new Date().getFullYear()}
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
