"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DataTable } from "@/components/ui/data-table"
import { toast } from "@/components/ui/use-toast"
import { Upload, Search, AlertTriangle, UserPlus, Info, Link2Off, Clock, Eye, Edit, Plus, Mail } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CSVUpload } from "./CSVUpload"
import DisponibilidadProfesor from "./DisponibilidadProfesor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Profesor {
  id: string
  nombre: string
  email: string
  usuario_id?: string
  is_associated?: boolean
  disponibilidad?: any
}

const EditModal = ({ isOpen, onClose, profesor, onSave, fetchProfesores }) => {
  const [nombreEdit, setNombreEdit] = useState(profesor?.nombre || "")
  const [emailEdit, setEmailEdit] = useState(profesor?.email || "")
  const [activeTab, setActiveTab] = useState("info")
  const [disponibilidadKey, setDisponibilidadKey] = useState(0) // Añadir esta línea

  useEffect(() => {
    if (profesor) {
      setNombreEdit(profesor.nombre)
      setEmailEdit(profesor.email)
      setActiveTab("info") // Reset to info tab when opening
      setDisponibilidadKey((prev) => prev + 1) // Añadir esta línea para forzar re-render
    }
  }, [profesor])

  const handleSave = () => {
    onSave({ ...profesor, nombre: nombreEdit, email: emailEdit })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar Profesor</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="nombre" className="text-sm font-medium">
                  Nombre del profesor
                </label>
                <Input
                  id="nombre"
                  placeholder="Nombre del profesor"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email del profesor
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email del profesor"
                  value={emailEdit}
                  onChange={(e) => setEmailEdit(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar cambios</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="disponibilidad" className="mt-4">
            {profesor && activeTab === "disponibilidad" && (
              <DisponibilidadProfesor
                key={disponibilidadKey} // Añadir esta línea para forzar re-render
                profesorId={profesor.id}
                onSave={() => {
                  toast({
                    title: "Disponibilidad actualizada",
                    description: "La disponibilidad del profesor ha sido actualizada correctamente",
                  })
                  // Refrescar la lista de profesores para mostrar los cambios
                  fetchProfesores()
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default function ProfesorManagement() {
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [editingProfesor, setEditingProfesor] = useState<Profesor | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [validationMessage, setValidationMessage] = useState("")
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [profesorToDelete, setProfesorToDelete] = useState<Profesor | null>(null)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [existingProfesors, setExistingProfesors] = useState<Profesor[]>([])
  const [showAssociateDialog, setShowAssociateDialog] = useState(false)
  const [selectedProfesorId, setSelectedProfesorId] = useState<string | null>(null)
  const [isTableCreated, setIsTableCreated] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [showDisassociateDialog, setShowDisassociateDialog] = useState(false)
  const [profesorToDisassociate, setProfesorToDisassociate] = useState<Profesor | null>(null)
  const [showDisponibilidadDialog, setShowDisponibilidadDialog] = useState(false)
  const [selectedProfesorForDisponibilidad, setSelectedProfesorForDisponibilidad] = useState<Profesor | null>(null)
  const [viewMode, setViewMode] = useState(true) // Nuevo estado para controlar el modo de visualización

  // Función para verificar si el usuario es administrador usando localStorage
  const checkAdminFromLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("userRole")
      if (storedRole === "admin") {
        console.log("Usando rol admin desde localStorage")
        setIsUserAdmin(true)
        setUserRole("admin")
        return true
      }
    }
    return false
  }, [])

  // Función para obtener datos del usuario y verificar si es administrador
  const fetchUserData = useCallback(async () => {
    try {
      // Primero intentar obtener el rol desde localStorage para evitar consultas innecesarias
      if (checkAdminFromLocalStorage()) {
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUser(user)
        setCurrentUserId(user.id)

        // Consulta directa a la tabla usuarios para obtener el rol
        const { data, error } = await supabase.from("usuarios").select("rol").eq("id", user.id).single()

        if (!error && data) {
          const rol = data.rol.toLowerCase().trim()
          console.log("Rol de usuario encontrado:", rol)

          setUserRole(rol)
          setIsUserAdmin(rol === "admin")
          setDebugInfo(`Usuario ID: ${user.id}, Rol: ${rol}`)

          // Guardar en localStorage para futuras visitas
          if (typeof window !== "undefined") {
            localStorage.setItem("userRole", rol)
          }
        } else {
          console.log("No se encontró rol, estableciendo rol por defecto")
          setUserRole("usuario")
          setDebugInfo(`Usuario ID: ${user.id}, Rol: No encontrado (usando 'usuario' por defecto)`)
        }
      }
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error)
    }
  }, [checkAdminFromLocalStorage])

  // Función para verificar si la tabla profesor_usuario existe
  const checkTableExists = useCallback(async () => {
    try {
      const { error } = await supabase.from("profesor_usuario").select("*", { count: "exact", head: true })

      const exists = !error
      console.log(exists ? "Tabla profesor_usuario encontrada" : "Error al verificar tabla profesor_usuario")
      setIsTableCreated(exists)
      return exists
    } catch (error) {
      console.error("Error verificando tabla:", error)
      setIsTableCreated(false)
      return false
    }
  }, [])

  // Función para cargar profesores
  const fetchProfesores = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Cargar todos los profesores primero para mostrar algo rápidamente
      const { data: allProfesores, error: loadError } = await supabase
        .from("profesores")
        .select("*")
        .order("nombre", { ascending: true })

      if (loadError) throw loadError

      // Mostrar todos los profesores inmediatamente
      setProfesores(allProfesores || [])

      // Si el usuario es admin (verificado por localStorage o estado), no necesitamos filtrar
      if (isUserAdmin || userRole === "admin") {
        console.log("Usuario es admin, mostrando todos los profesores")
        setDebugInfo(`Total profesores cargados: ${allProfesores?.length || 0}`)
        setIsLoading(false)
        return
      }

      // Si no tenemos usuario o ID, no podemos filtrar
      if (!currentUserId) {
        setIsLoading(false)
        return
      }

      // Para usuarios normales, filtrar los profesores
      const tableExists = await checkTableExists()

      // Consulta 1: Profesores propios
      const { data: ownedProfesors } = await supabase.from("profesores").select("*").eq("usuario_id", currentUserId)

      // Consulta 2: Profesores asociados
      let associatedProfesors: Profesor[] = []

      if (tableExists) {
        const { data: associatedIds } = await supabase
          .from("profesor_usuario")
          .select("profesor_id")
          .eq("usuario_id", currentUserId)

        if (associatedIds?.length > 0) {
          const ids = associatedIds.map((item) => item.profesor_id)

          const { data: profesorsData } = await supabase.from("profesores").select("*").in("id", ids)

          if (profesorsData) {
            associatedProfesors = profesorsData.map((prof) => ({ ...prof, is_associated: true }))
          }
        }
      }

      // Combinar y eliminar duplicados
      const allProfesors = [...(ownedProfesors || []), ...associatedProfesors]
      const uniqueProfesors = Array.from(new Map(allProfesors.map((item) => [item.id, item])).values())

      // Actualizar la lista de profesores filtrada
      setProfesores(uniqueProfesors.sort((a, b) => a.nombre.localeCompare(b.nombre)))
    } catch (error) {
      console.error("Error fetching profesores:", error)
      setError("Error al cargar los profesores: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLoading(false)
    }
  }, [isUserAdmin, userRole, currentUserId, checkTableExists])

  // Efecto para inicializar datos al montar el componente
  useEffect(() => {
    // Intentar cargar el rol desde localStorage primero
    const hasAdminRole = checkAdminFromLocalStorage()

    // Cargar profesores inmediatamente
    fetchProfesores()

    // Si no tenemos el rol en localStorage, obtenerlo del servidor
    if (!hasAdminRole) {
      fetchUserData()
    }

    // Verificar si la tabla existe
    checkTableExists()
  }, [checkAdminFromLocalStorage, fetchProfesores, fetchUserData, checkTableExists])

  // Efecto para recargar profesores cuando cambia el rol o usuario
  useEffect(() => {
    if (userRole !== null) {
      console.log("Ejecutando fetchProfesores debido a cambio en userRole:", userRole)
      fetchProfesores()
    }
  }, [userRole, fetchProfesores])

  async function addProfesor() {
    if (!nombre || !email) {
      setValidationMessage("Por favor, complete todos los campos obligatorios.")
      setShowValidationDialog(true)
      return
    }

    if (!isValidEmail(email)) {
      setValidationMessage("Por favor, ingrese un email válido.")
      setShowValidationDialog(true)
      return
    }

    // Buscar profesores existentes por nombre o email
    const { data: existingProfesors, error: searchError } = await supabase
      .from("profesores")
      .select("*")
      .or(`nombre.ilike.%${nombre}%,email.ilike.${email}`)

    if (searchError) {
      console.error("Error buscando profesores existentes:", searchError)
      setValidationMessage("Error al buscar profesores existentes. Por favor, intente de nuevo.")
      setShowValidationDialog(true)
      return
    }

    // Si encontramos profesores existentes, mostrar el diálogo de asociación
    if (existingProfesors && existingProfesors.length > 0) {
      setExistingProfesors(existingProfesors)
      setShowAssociateDialog(true)
      return
    }

    // Si no hay profesores existentes, proceder con la inserción normal
    const { error: insertError } = await supabase.from("profesores").insert([
      {
        nombre,
        email,
        usuario_id: currentUserId,
      },
    ])

    if (insertError) {
      console.error("Error adding profesor:", insertError)
      setValidationMessage(`Error al agregar el profesor: ${insertError.message}`)
      setShowValidationDialog(true)
    } else {
      fetchProfesores()
      setNombre("")
      setEmail("")
      toast({
        title: "Éxito",
        description: "Profesor agregado correctamente",
      })
    }
  }

  async function updateProfesor() {
    if (!editingProfesor || !nombre || !email) {
      return
    }

    const { data, error } = await supabase.from("profesores").update({ nombre, email }).eq("id", editingProfesor.id)
    if (error) {
      console.error("Error updating profesor:", error)
      if (error.code === "23505") {
        setError("El nombre o correo del profesor ya está en uso por otro registro.")
      } else {
        setError("Error al actualizar el profesor. Por favor, intenta de nuevo.")
      }
    } else {
      fetchProfesores()
      setEditingProfesor(null)
      setNombre("")
      setEmail("")
      setIsEditModalOpen(false)
    }
  }

  async function deleteProfesor(profesor: Profesor) {
    // Verificar si el usuario tiene permiso para eliminar este profesor
    if (!isUserAdmin && profesor.usuario_id !== currentUserId) {
      setError("No tienes permiso para eliminar este profesor.")
      return
    }

    setProfesorToDelete(profesor)
    setShowDeleteConfirmDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!profesorToDelete) return

    try {
      // Actualizar las materias en todas las tablas específicas por periodo
      const tablasMaterias = [
        "materias", // Tabla general
        "materias_enero_abril",
        "materias_mayo_agosto",
        "materias_septiembre_diciembre",
      ]

      for (const tabla of tablasMaterias) {
        const { error: updateError } = await supabase
          .from(tabla)
          .update({ profesor_id: null })
          .eq("profesor_id", profesorToDelete.id)

        if (updateError) {
          console.error(`Error actualizando ${tabla}:`, updateError)
          throw updateError
        }
      }

      // Luego, eliminar el profesor
      const { error: deleteError } = await supabase.from("profesores").delete().eq("id", profesorToDelete.id)

      if (deleteError) throw deleteError

      fetchProfesores()
      console.log("Profesor eliminado y materias actualizadas correctamente.")
    } catch (error) {
      console.error("Error en la operación de eliminación:", error)
      setError("Hubo un problema al eliminar el profesor. Por favor, intente de nuevo.")
    } finally {
      setShowDeleteConfirmDialog(false)
      setProfesorToDelete(null)
    }
  }

  async function disassociateProfesor(profesor: Profesor) {
    if (!profesor || !currentUserId) return

    setProfesorToDisassociate(profesor)
    setShowDisassociateDialog(true)
  }

  async function handleDisassociateConfirm() {
    if (!profesorToDisassociate || !currentUserId) return

    try {
      // Convertir el ID a número si es necesario
      const profesorIdNumber = Number.parseInt(profesorToDisassociate.id, 10)

      if (isNaN(profesorIdNumber)) {
        throw new Error("ID de profesor inválido")
      }

      // Eliminar la asociación de la tabla profesor_usuario
      const { error } = await supabase
        .from("profesor_usuario")
        .delete()
        .eq("profesor_id", profesorIdNumber)
        .eq("usuario_id", currentUserId)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Profesor desasociado correctamente",
      })

      // Actualizar la lista de profesores
      fetchProfesores()
    } catch (error) {
      console.error("Error al desasociar profesor:", error)
      setError("Error al desasociar el profesor: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setShowDisassociateDialog(false)
      setProfesorToDisassociate(null)
    }
  }

  async function associateProfesor(profesorId: string) {
    try {
      if (!currentUserId) {
        setValidationMessage("No se pudo identificar tu usuario. Por favor, inicia sesión nuevamente.")
        setShowValidationDialog(true)
        return
      }

      // Verificar si la tabla profesor_usuario existe
      const tableExists = await checkTableExists()

      if (!tableExists) {
        setValidationMessage(
          "La funcionalidad de asociación de profesores no está disponible en este momento. Por favor, contacta al administrador.",
        )
        setShowValidationDialog(true)
        setShowAssociateDialog(false)
        return
      }

      // Verificar si ya existe una asociación
      const { data: existingAssociation, error: checkError } = await supabase
        .from("profesor_usuario")
        .select("*")
        .eq("profesor_id", profesorId)
        .eq("usuario_id", currentUserId)
        .single()

      if (!checkError && existingAssociation) {
        setValidationMessage("Este profesor ya está asociado a tu cuenta.")
        setShowValidationDialog(true)
        setShowAssociateDialog(false)
        return
      }

      // Crear la asociación en la tabla profesor_usuario
      // Nota: profesorId es un string pero necesitamos convertirlo a número para la BD
      const profesorIdNumber = Number.parseInt(profesorId, 10)

      if (isNaN(profesorIdNumber)) {
        throw new Error("ID de profesor inválido")
      }

      const { error: associateError } = await supabase.from("profesor_usuario").insert([
        {
          profesor_id: profesorIdNumber, // Usar el ID como número
          usuario_id: currentUserId,
        },
      ])

      if (associateError) {
        throw associateError
      }

      fetchProfesores()
      setShowAssociateDialog(false)
      setNombre("")
      setEmail("")
      toast({
        title: "Éxito",
        description: "Profesor asociado correctamente a tu cuenta",
      })
    } catch (error) {
      console.error("Error al asociar profesor:", error)
      setValidationMessage("Error al asociar el profesor: " + (error instanceof Error ? error.message : String(error)))
      setShowValidationDialog(true)
    }
  }

  const handleEditProfesor = (profesor: Profesor) => {
    // Verificar si el usuario tiene permiso para editar este profesor
    if (!isUserAdmin && profesor.usuario_id !== currentUserId) {
      setError("No tienes permiso para editar este profesor.")
      return
    }

    setEditingProfesor(profesor)
    setNombre(profesor.nombre)
    setEmail(profesor.email)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingProfesor(null)
    setNombre("")
    setEmail("")
  }

  const handleSaveEdit = async (updatedProfesor: Profesor) => {
    if (!updatedProfesor.nombre || !updatedProfesor.email) {
      setValidationMessage("Por favor, complete todos los campos obligatorios.")
      setShowValidationDialog(true)
      return
    }

    if (!isValidEmail(updatedProfesor.email)) {
      setValidationMessage("Por favor, ingrese un email válido.")
      setShowValidationDialog(true)
      return
    }

    // Check for existing professor with same name
    const { data: existingName } = await supabase
      .from("profesores")
      .select("nombre")
      .ilike("nombre", updatedProfesor.nombre)
      .neq("id", updatedProfesor.id)
      .single()

    if (existingName) {
      setValidationMessage("Ya existe otro profesor con este nombre en la base de datos.")
      setShowValidationDialog(true)
      return
    }

    // Check for existing professor with same email
    const { data: existingEmail } = await supabase
      .from("profesores")
      .select("email")
      .ilike("email", updatedProfesor.email)
      .neq("id", updatedProfesor.id)
      .single()

    if (existingEmail) {
      setValidationMessage("Este email ya le pertenece a otro profesor en la base de datos.")
      setShowValidationDialog(true)
      return
    }

    // If no duplicates found, proceed with update
    const { error: updateError } = await supabase
      .from("profesores")
      .update({ nombre: updatedProfesor.nombre, email: updatedProfesor.email })
      .eq("id", updatedProfesor.id)

    if (updateError) {
      console.error("Error updating profesor:", updateError)
      setValidationMessage("Error al actualizar el profesor. Por favor, intente de nuevo.")
      setShowValidationDialog(true)
    } else {
      fetchProfesores()
      handleCloseEditModal()
    }
  }

  const handleShowDisponibilidad = (profesor: Profesor) => {
    setSelectedProfesorForDisponibilidad(profesor)
    setViewMode(true) // Establecer en modo de solo lectura
    setShowDisponibilidadDialog(true)
  }

  const handleEditDisponibilidad = (profesor: Profesor) => {
    setSelectedProfesorForDisponibilidad(profesor)
    setViewMode(false) // Establecer en modo de edición
    setShowDisponibilidadDialog(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Verificar que sea un archivo CSV
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast({
        title: "Error",
        description: "Por favor, seleccione un archivo CSV válido",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const text = e.target?.result as string
        const rows = text.split("\n")

        // Eliminar filas vacías
        const validRows = rows.filter((row) => row.trim() !== "")

        // Verificar formato: nombre,email
        const profesoresData = validRows.map((row) => {
          const [nombre, email] = row.split(",").map((item) => item.trim())
          if (!nombre || !email) {
            throw new Error("Formato de CSV inválido. Debe ser: nombre,email")
          }
          return { nombre, email }
        })

        // Insertar profesores en la base de datos
        for (const profesor of profesoresData) {
          const { error } = await supabase.from("profesores").insert([profesor])
          if (error) throw error
        }

        toast({
          title: "Éxito",
          description: `Se han importado ${profesoresData.length} profesores correctamente.`,
        })

        // Recargar la lista de profesores
        fetchProfesores()
      }
      reader.readAsText(file)
    } catch (error) {
      console.error("Error processing CSV:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el archivo CSV",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      // Limpiar el input file
      event.target.value = ""
    }
  }

  // Verificar si un profesor tiene disponibilidad configurada
  const tieneDisponibilidad = (profesor: Profesor) => {
    return profesor.disponibilidad && Object.keys(profesor.disponibilidad).length > 0
  }

  // Contar horas disponibles de un profesor
  const contarHorasDisponibles = (profesor: Profesor) => {
    if (!profesor.disponibilidad) return 0

    let total = 0
    Object.keys(profesor.disponibilidad).forEach((dia) => {
      if (profesor.disponibilidad[dia]) {
        Object.values(profesor.disponibilidad[dia]).forEach((disponible) => {
          if (disponible === true) total++
        })
      }
    })

    return total
  }

  // Filtrar profesores según el término de búsqueda
  const filteredProfesores = profesores.filter(
    (profesor) =>
      profesor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profesor.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const columns: ColumnDef<Profesor>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="flex items-center">
          <span className="text-base font-medium">{row.original.nombre}</span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center">
          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      id: "disponibilidad",
      header: "Disponibilidad",
      cell: ({ row }) => {
        const profesor = row.original
        const horasDisponibles = contarHorasDisponibles(profesor)
        const tieneConfig = tieneDisponibilidad(profesor)

        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={tieneConfig ? "outline" : "secondary"}
              className={`px-2 py-0.5 ${tieneConfig ? "border-green-500 text-green-600" : "text-amber-600"}`}
            >
              <Clock className="h-3 w-3 mr-1" />
              {horasDisponibles} horas
            </Badge>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShowDisponibilidad(profesor)}
                className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Ver
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditDisponibilidad(profesor)}
                className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
            </div>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const profesor = row.original
        const canEdit = isUserAdmin || profesor.usuario_id === currentUserId
        const isAssociated = profesor.is_associated === true

        return (
          <div className="flex justify-end space-x-2">
            {isAssociated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disassociateProfesor(profesor)}
                className="text-amber-500 border-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/20"
              >
                <Link2Off className="h-4 w-4 mr-1" />
                Desasociar
              </Button>
            ) : (
              canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleEditProfesor(profesor)}>
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteProfesor(profesor)}>
                    Eliminar
                  </Button>
                </>
              )
            )}
          </div>
        )
      },
    },
  ]

  const AssociateDialog = () => (
    <AlertDialog open={showAssociateDialog} onOpenChange={setShowAssociateDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Profesor existente encontrado</AlertDialogTitle>
          <AlertDialogDescription>
            Hemos encontrado uno o más profesores con información similar. Puedes asociar uno de estos profesores a tu
            cuenta para verlo y utilizarlo sin crear un duplicado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-60 overflow-y-auto my-4 space-y-2">
          {existingProfesors.map((profesor) => (
            <div
              key={profesor.id}
              className={`p-3 rounded-md border cursor-pointer transition-all ${
                selectedProfesorId === profesor.id
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "border-border hover:bg-muted/50 hover:border-primary/30"
              }`}
              onClick={() => setSelectedProfesorId(profesor.id)}
            >
              <div className="font-medium">{profesor.nombre}</div>
              <div className="text-sm text-muted-foreground">{profesor.email}</div>
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowAssociateDialog(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => selectedProfesorId && associateProfesor(selectedProfesorId)}
            disabled={!selectedProfesorId}
            className={!selectedProfesorId ? "opacity-50 cursor-not-allowed" : ""}
          >
            Asociar Profesor
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary">Profesores</h2>

      {/* Información de depuración para administradores */}
      {isUserAdmin && debugInfo && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <Info className="h-4 w-4" />
          <AlertTitle>Información de depuración (solo visible para administradores)</AlertTitle>
          <AlertDescription className="font-mono text-xs">{debugInfo}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isTableCreated && (
        <Alert variant="warning" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <UserPlus className="h-4 w-4" />
          <AlertTitle>Funcionalidad limitada</AlertTitle>
          <AlertDescription>
            La funcionalidad de asociación de profesores no está disponible. Contacta al administrador para habilitar
            esta característica.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-auto sm:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar profesores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex justify-end">
          <Button variant="default" className="relative overflow-hidden" disabled={isLoading}>
            <Upload className="h-4 w-4 mr-2" />
            Cargar CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isLoading}
            />
          </Button>
        </div>
      </div>

      {/* Formulario para agregar profesores manualmente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Agregar Nuevo Profesor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="nombre" className="text-sm font-medium text-muted-foreground">
                Nombre del profesor
              </label>
              <Input
                id="nombre"
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={addProfesor} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Procesando..." : "Agregar Profesor"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Lista de Profesores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredProfesores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No se encontraron profesores con ese término de búsqueda"
                : "No hay profesores disponibles"}
            </div>
          ) : (
            <DataTable columns={columns} data={filteredProfesores} />
          )}
        </CardContent>
      </Card>

      <EditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        profesor={editingProfesor}
        onSave={handleSaveEdit}
        fetchProfesores={fetchProfesores}
      />

      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error de Validación</AlertDialogTitle>
            <AlertDialogDescription>{validationMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationDialog(false)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea eliminar este profesor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las materias asignadas a este profesor cambiarán automáticamente a
              "Pendiente por asignar".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Confirmar Eliminación</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCSVUpload} onOpenChange={setShowCSVUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar Profesores desde CSV</DialogTitle>
          </DialogHeader>
          <CSVUpload
            onUploadComplete={() => {
              setShowCSVUpload(false)
              fetchProfesores()
            }}
          />
        </DialogContent>
      </Dialog>

      <AssociateDialog />

      <AlertDialog open={showDisassociateDialog} onOpenChange={setShowDisassociateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desasociar profesor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas desasociar este profesor de tu cuenta? Esto no eliminará al profesor de la
              base de datos, solo lo quitará de tu lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDisassociateDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisassociateConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDisponibilidadDialog} onOpenChange={setShowDisponibilidadDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Disponibilidad del Profesor</DialogTitle>
          </DialogHeader>
          {selectedProfesorForDisponibilidad && (
            <DisponibilidadProfesor
              profesorId={selectedProfesorForDisponibilidad.id}
              readOnly={viewMode}
              onSave={() => {
                fetchProfesores()
                setShowDisponibilidadDialog(false)
              }}
              onCancel={() => setShowDisponibilidadDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
