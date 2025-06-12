"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Pencil, Trash2, UserPlus, Eye, EyeOff, AlertTriangle, ShieldAlert } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"

// Creamos un cliente de Supabase directamente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Usuario {
  id: string
  nombre: string
  rol: string
  email?: string
  carrera_id?: string | null
  carrera_nombre?: string | null
}

interface UserManagementProps {
  onUserAdded?: () => void
}

export default function UserManagement({ onUserAdded }: UserManagementProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [email, setEmail] = useState("")
  const [nombre, setNombre] = useState("")
  const [rol, setRol] = useState<string>("director")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [duplicateMessage, setDuplicateMessage] = useState("")
  const [isSelfDeleteModalOpen, setIsSelfDeleteModalOpen] = useState(false)
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Verificar si el usuario actual es admin
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          router.push("/")
          return
        }

        const userId = sessionData.session.user.id
        setCurrentUserId(userId)

        const { data, error } = await supabase.from("usuarios").select("rol").eq("id", userId).single()

        if (error || data?.rol !== "admin") {
          console.error("No es administrador:", error || "Rol incorrecto")
          router.push("/")
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error("Error verificando permisos:", error)
        router.push("/")
      }
    }

    checkAdminStatus()
  }, [router])

  useEffect(() => {
    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin])

  async function fetchData() {
    try {
      const { data, error } = await supabase.from("usuarios").select("*")

      if (error) throw error

      setUsuarios(data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Error al cargar los datos")
    }
  }

  async function addUser() {
    if (!email || !nombre || !rol || !password) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Verificar si el usuario ya existe
      const { data: existingUser, error: checkError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", email)
        .maybeSingle()

      if (!checkError && existingUser) {
        setDuplicateMessage("Este correo electrónico ya está registrado en la base de datos")
        setIsDuplicateModalOpen(true)
        setIsLoading(false)
        return
      }

      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            rol,
          },
        },
      })

      if (authError) {
        if (authError.message.includes("already registered")) {
          setDuplicateMessage("Este correo electrónico ya está registrado en el sistema de autenticación")
          setIsDuplicateModalOpen(true)
          setIsLoading(false)
          return
        }

        throw authError
      }

      if (!authData.user) {
        throw new Error("No se pudo crear el usuario")
      }

      const userId = authData.user.id

      // Crear registro en tabla usuarios
      const { error: insertError } = await supabase.from("usuarios").insert([
        {
          id: userId,
          nombre,
          rol,
          email,
        },
      ])

      if (insertError) throw insertError

      toast({
        title: "Éxito",
        description: "Usuario creado correctamente. Se ha enviado un correo de confirmación.",
      })

      fetchData()
      setEmail("")
      setNombre("")
      setRol("director")
      setPassword("")

      if (onUserAdded) {
        onUserAdded()
      }
    } catch (error) {
      console.error("Error adding user:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear el usuario",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function updateUser() {
    if (!editingUser || !nombre || !rol) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({
          nombre,
          rol,
        })
        .eq("id", editingUser.id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Usuario actualizado correctamente",
      })

      fetchData()
      setIsEditModalOpen(false)
      setEditingUser(null)

      if (onUserAdded) {
        onUserAdded()
      }
    } catch (error) {
      console.error("Error updating user:", error)
      setError("Error al actualizar el usuario")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = (userId: string) => {
    // Verificar si el usuario intenta eliminarse a sí mismo
    if (userId === currentUserId) {
      setIsSelfDeleteModalOpen(true)
      return
    }

    setUserToDelete(userId)
    setIsDeleteModalOpen(true)
  }

  async function deleteUser() {
    if (!userToDelete) return

    // Verificación adicional para asegurarse de que no se está eliminando a sí mismo
    if (userToDelete === currentUserId) {
      setIsSelfDeleteModalOpen(true)
      setIsDeleteModalOpen(false)
      setUserToDelete(null)
      return
    }

    setIsLoading(true)
    try {
      // Primero, obtener el email del usuario para referencia
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("email")
        .eq("id", userToDelete)
        .single()

      if (userError) {
        console.error("Error obteniendo datos del usuario:", userError)
        throw new Error("No se pudo obtener la información del usuario")
      }

      // Eliminar de la tabla usuarios
      const { error: dbError } = await supabase.from("usuarios").delete().eq("id", userToDelete)

      if (dbError) throw dbError

      // Eliminar de auth.users usando la API de administración
      const response = await fetch(`/api/users?id=${userToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error eliminando usuario de auth:", errorData)
        toast({
          title: "Advertencia",
          description: "Usuario eliminado de la tabla, pero no se pudo eliminar completamente de la autenticación.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: "Usuario eliminado completamente del sistema",
        })
      }

      fetchData()
      setIsDeleteModalOpen(false)
      setUserToDelete(null)

      if (onUserAdded) {
        onUserAdded()
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el usuario",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = (user: Usuario) => {
    setEditingUser(user)
    setNombre(user.nombre)
    setRol(user.rol)
    setIsEditModalOpen(true)
  }

  const columns: ColumnDef<Usuario>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "rol",
      header: "Rol",
      cell: ({ row }) => {
        const rol = row.getValue("rol") as string
        return rol === "admin" ? "Administrador" : rol === "director" ? "Director" : "Usuario"
      },
    },
    {
      accessorKey: "carrera_nombre",
      header: "Carrera",
      cell: ({ row }) => {
        const carrera = row.getValue("carrera_nombre") as string
        return carrera || "No asignada"
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original
        const isSelf = user.id === currentUserId

        return (
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            {!isSelf && (
              <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  // Si no es admin, no mostrar nada
  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary">Gestión de Usuarios</h2>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Agregar Nuevo Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Email del usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="nombre" className="text-sm font-medium text-muted-foreground">
                Nombre
              </label>
              <Input
                id="nombre"
                placeholder="Nombre del usuario"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="rol" className="text-sm font-medium text-muted-foreground">
                Rol
              </label>
              <Select value={rol} onValueChange={setRol}>
                <SelectTrigger id="rol">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña del usuario"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={addUser} className="flex items-center" disabled={isLoading}>
              {isLoading ? <span className="mr-2">Procesando...</span> : <UserPlus className="h-4 w-4 mr-2" />}
              Agregar Usuario
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={usuarios} />
        </CardContent>
      </Card>

      {/* Modal de edición de usuario */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-nombre" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="edit-nombre"
                placeholder="Nombre del usuario"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-rol" className="text-sm font-medium">
                Rol
              </label>
              <Select value={rol} onValueChange={setRol}>
                <SelectTrigger id="edit-rol">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateUser} disabled={isLoading}>
              {isLoading ? "Procesando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p>¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteUser} disabled={isLoading}>
              {isLoading ? "Procesando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de alerta de usuario duplicado */}
      <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Usuario Duplicado
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-l-4 border-amber-500 my-2">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Error de registro</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">{duplicateMessage}</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Por favor, utilice un correo electrónico diferente o contacte al administrador si necesita recuperar el
              acceso a esta cuenta.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDuplicateModalOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de alerta de intento de auto-eliminación */}
      <Dialog open={isSelfDeleteModalOpen} onOpenChange={setIsSelfDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Acción no permitida
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500 my-2">
              <div className="flex gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">Operación bloqueada</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    No puedes eliminar tu propia cuenta de usuario.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Por razones de seguridad, no se permite que un administrador elimine su propia cuenta. Esto evita
              situaciones donde el sistema se quede sin acceso administrativo.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSelfDeleteModalOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
