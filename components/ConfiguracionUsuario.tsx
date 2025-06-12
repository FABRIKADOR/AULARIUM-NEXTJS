"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

const ConfiguracionUsuario: React.FC = () => {
  const [userData, setUserData] = useState({
    nombre: "",
    email: "",
    rol: "",
    ultimoAcceso: "N/A",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true)

        // Get current session directly from supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!sessionData.session) {
          setError("No se ha iniciado sesión")
          setLoading(false)
          return
        }

        const userId = sessionData.session.user.id
        console.log("Fetching data for user ID:", userId)

        // Fetch user data from the usuarios table
        const { data, error } = await supabase.from("usuarios").select("*").eq("id", userId).single()

        if (error) {
          console.error("Database query error:", error)
          throw error
        }

        if (data) {
          console.log("User data retrieved:", data)
          setUserData({
            nombre: data.nombre || "",
            email: data.email || sessionData.session.user.email || "",
            rol: data.rol || "",
            ultimoAcceso: sessionData.session.user.last_sign_in_at
              ? new Date(sessionData.session.user.last_sign_in_at).toLocaleDateString()
              : "N/A",
          })
        } else {
          console.log("No user data found for ID:", userId)
          setError("No se encontraron datos de usuario")
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
        setError("Error al cargar los datos del usuario")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!currentPassword || !newPassword) {
      setPasswordError("Por favor complete ambos campos")
      return
    }

    try {
      // First verify the current password
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error("No hay sesión activa")
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPasswordSuccess("Contraseña actualizada correctamente")
      setCurrentPassword("")
      setNewPassword("")
    } catch (err: any) {
      console.error("Error changing password:", err)
      setPasswordError(err.message || "Error al cambiar la contraseña")
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">Configuración</h2>
      <div className="space-y-6">
        {error && <div className="text-red-500 p-3 bg-red-50 rounded-md">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="text-lg font-medium border-l-4 border-primary pl-3 mb-4">Información de Usuario</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre:</p>
                  <p className="font-medium">{userData.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email:</p>
                  <p className="font-medium">{userData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rol:</p>
                  <p className="font-medium">
                    {userData.rol === "admin" ? "Administrador" : userData.rol === "director" ? "Director" : "Usuario"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Último acceso:</p>
                  <p className="font-medium">{userData.ultimoAcceso}</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <h3 className="text-lg font-medium border-l-4 border-primary pl-3 mb-4">Cambiar Contraseña</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordError && <div className="text-red-500 p-3 bg-red-50 rounded-md">{passwordError}</div>}
                {passwordSuccess && <div className="text-green-500 p-3 bg-green-50 rounded-md">{passwordSuccess}</div>}

                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                          <line x1="2" x2="22" y1="2" y2="22"></line>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                          <line x1="2" x2="22" y1="2" y2="22"></line>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
                  Actualizar Contraseña
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ConfiguracionUsuario
