"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase, getSessionSafely } from "@/lib/supabase"

// Define types
type User = any
type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  userRole: string | null
  refreshUserRole: () => Promise<boolean>
}

// Definimos los roles que tienen acceso administrativo
const ADMIN_ROLES = ["admin", "administrador"] // Only admin and administrador have administrative privileges

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  userRole: null,
  refreshUserRole: async () => false,
})

// User role functions - Versión simplificada y directa
export async function getUserRole(userId: string) {
  try {
    console.log("Obteniendo rol para usuario:", userId)

    // Consulta directa a la base de datos
    const { data, error } = await supabase.from("usuarios").select("*").eq("id", userId)

    if (error) {
      console.error("Error en consulta de rol:", error)
      return {
        rol: "usuario",
        carrera_id: null,
        carrera_nombre: null,
      }
    }

    // Si no hay datos, devolver valores predeterminados
    if (!data || data.length === 0) {
      console.log("No se encontró información de usuario")
      return {
        rol: "usuario",
        carrera_id: null,
        carrera_nombre: null,
      }
    }

    console.log("Datos de usuario obtenidos:", data[0])
    return {
      rol: data[0].rol || "usuario",
      carrera_id: data[0].carrera_id || null,
      carrera_nombre: data[0].carrera_nombre || null,
    }
  } catch (error) {
    console.error("Error general obteniendo rol de usuario:", error)
    return {
      rol: "usuario",
      carrera_id: null,
      carrera_nombre: null,
    }
  }
}

// Update the isAdmin function to check for admin role specifically
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("usuarios").select("rol").eq("id", userId).single()

    if (error) {
      console.error("Error verificando rol de administrador:", error)
      return false
    }

    console.log("Rol del usuario:", data?.rol)
    return data?.rol && ADMIN_ROLES.includes(data.rol.toLowerCase())
  } catch (error) {
    console.error("Error en isAdmin:", error)
    return false
  }
}

// Auth Provider Component
export function AuthProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    userRole: null,
    refreshUserRole: async () => false,
  })

  // Usar useRef para controlar si el componente está montado
  const isMountedRef = useRef(true)

  // Función para refrescar el rol del usuario
  const refreshUserRole = async (): Promise<boolean> => {
    try {
      console.log("Refrescando rol de usuario...")

      // Obtener la sesión de manera segura
      const session = await getSessionSafely()

      if (!session?.user) {
        console.log("No hay sesión activa")
        setState((prev) => ({
          ...prev,
          isAdmin: false,
          userRole: null,
        }))
        return false
      }

      console.log("Usuario autenticado:", session.user.id)

      // Consulta directa a la base de datos
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (userError) {
        console.error("Error al verificar rol:", userError)
        setState((prev) => ({
          ...prev,
          isAdmin: false,
          userRole: null,
        }))
        return false
      }

      // Verificar si el rol está en la lista de roles administrativos
      const userRol = userData?.rol
      console.log("Rol del usuario encontrado:", userRol)
      const admin = userRol && ADMIN_ROLES.includes(userRol.toLowerCase())
      console.log("¿Es admin?", admin, "Rol:", userRol, "ADMIN_ROLES:", ADMIN_ROLES)

      // Guardar en localStorage para persistencia
      if (typeof window !== "undefined") {
        window.localStorage.setItem("userRoleState", userRol || "")
        if (admin) {
          window.localStorage.setItem("force_admin_access", "true")
        }
      }

      setState((prev) => ({
        ...prev,
        isAdmin: admin,
        userRole: userRol,
      }))

      return admin
    } catch (error) {
      console.error("Error refreshing user role:", error)
      setState((prev) => ({
        ...prev,
        isAdmin: false,
        userRole: null,
      }))
      return false
    }
  }

  // Efecto para limpiar las referencias cuando el componente se desmonta
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // Variable para almacenar el timeout
    let authTimeout: NodeJS.Timeout | null = null

    const loadUser = async () => {
      try {
        // Establecer un timeout para la carga de usuario
        authTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            console.log("Timeout alcanzado en la carga de usuario, mostrando pantalla de login")
            setState({
              user: null,
              loading: false,
              isAdmin: false,
              userRole: null,
              refreshUserRole,
            })
          }
        }, 5000)

        // Obtener la sesión de manera segura
        const session = await getSessionSafely()

        // Limpiar el timeout ya que obtuvimos una respuesta
        if (authTimeout) {
          clearTimeout(authTimeout)
          authTimeout = null
        }

        // Verificar si el componente sigue montado
        if (!isMountedRef.current) return

        if (!session?.user) {
          setState({
            user: null,
            loading: false,
            isAdmin: false,
            userRole: null,
            refreshUserRole,
          })
          return
        }

        try {
          // Consulta directa a la base de datos
          const { data: userData, error: userError } = await supabase
            .from("usuarios")
            .select("*")
            .eq("id", session.user.id)
            .single()

          // Verificar si el componente sigue montado
          if (!isMountedRef.current) return

          // Si hay error o no hay datos, no es admin
          if (userError || !userData) {
            setState({
              user: session.user,
              loading: false,
              isAdmin: false,
              userRole: null,
              refreshUserRole,
            })
            return
          }

          // Verificar si el rol está en la lista de roles administrativos
          const userRol = userData.rol
          const userIsAdmin = userRol && ADMIN_ROLES.includes(userRol.toLowerCase())

          // Guardar en localStorage para persistencia
          if (typeof window !== "undefined") {
            window.localStorage.setItem("userRoleState", userRol || "")
            if (userIsAdmin) {
              window.localStorage.setItem("force_admin_access", "true")
            }
          }

          setState({
            user: session.user,
            loading: false,
            isAdmin: userIsAdmin,
            userRole: userRol,
            refreshUserRole,
          })
        } catch (error) {
          console.error("Error al consultar datos de usuario:", error)

          // Verificar si el componente sigue montado
          if (!isMountedRef.current) return

          // En caso de error, permitir acceso básico
          setState({
            user: session.user,
            loading: false,
            isAdmin: false,
            userRole: null,
            refreshUserRole,
          })
        }
      } catch (error) {
        console.error("Auth error:", error)

        // Verificar si el componente sigue montado
        if (!isMountedRef.current) return

        // Limpiar el timeout
        if (authTimeout) {
          clearTimeout(authTimeout)
          authTimeout = null
        }

        setState({
          user: null,
          loading: false,
          isAdmin: false,
          userRole: null,
          refreshUserRole,
        })
      }
    }

    loadUser()

    // Configurar el listener de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Limpiar cualquier timeout pendiente
      if (authTimeout) {
        clearTimeout(authTimeout)
        authTimeout = null
      }

      // Verificar si el componente sigue montado
      if (!isMountedRef.current) return

      if (!session?.user) {
        setState({
          user: null,
          loading: false,
          isAdmin: false,
          userRole: null,
          refreshUserRole,
        })
        return
      }

      try {
        // Consulta directa a la base de datos
        const { data: newUserData, error: newError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()

        // Verificar si el componente sigue montado
        if (!isMountedRef.current) return

        // Si hay error o no hay datos, no es admin
        if (newError || !newUserData) {
          setState({
            user: session.user,
            loading: false,
            isAdmin: false,
            userRole: null,
            refreshUserRole,
          })
          return
        }

        // Verificar si el rol está en la lista de roles administrativos
        const newUserRol = newUserData.rol
        const newIsAdmin = newUserRol && ADMIN_ROLES.includes(newUserRol.toLowerCase())

        // Guardar en localStorage para persistencia
        if (typeof window !== "undefined") {
          window.localStorage.setItem("userRoleState", newUserRol || "")
          if (newIsAdmin) {
            window.localStorage.setItem("force_admin_access", "true")
          }
        }

        setState({
          user: session.user,
          loading: false,
          isAdmin: newIsAdmin,
          userRole: newUserRol,
          refreshUserRole,
        })
      } catch (error) {
        console.error("Error en consulta de usuario:", error)

        // Verificar si el componente sigue montado
        if (!isMountedRef.current) return

        setState({
          user: session.user,
          loading: false,
          isAdmin: false,
          userRole: null,
          refreshUserRole,
        })
      }
    })

    // Limpiar al desmontar
    return () => {
      isMountedRef.current = false
      if (authTimeout) {
        clearTimeout(authTimeout)
      }
      subscription.unsubscribe()
    }
  }, []) // Sin dependencias para evitar bucles

  // Render provider with children
  return React.createElement(AuthContext.Provider, { value: state }, props.children)
}

// Hook to use auth context
export const useAuth = () => useContext(AuthContext)
