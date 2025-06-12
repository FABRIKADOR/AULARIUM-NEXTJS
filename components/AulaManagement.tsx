"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2, AlertTriangle, Info, Lightbulb } from "lucide-react"

interface Aula {
  id: number
  nombre: string
  capacidad: number
  equipamiento: string
}

const EditModal = ({ isOpen, onClose, aula, onSave }) => {
  const [nombreEdit, setNombreEdit] = useState(aula?.nombre || "")
  const [capacidadEdit, setCapacidadEdit] = useState(aula?.capacidad.toString() || "")
  const [equipamientoEdit, setEquipamientoEdit] = useState(aula?.equipamiento || "")

  useEffect(() => {
    if (aula) {
      setNombreEdit(aula.nombre)
      setCapacidadEdit(aula.capacidad.toString())
      setEquipamientoEdit(aula.equipamiento)
    }
  }, [aula])

  const handleSave = () => {
    onSave({
      ...aula,
      nombre: nombreEdit,
      capacidad: Number.parseInt(capacidadEdit),
      equipamiento: equipamientoEdit,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Aula</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Nombre del aula" value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} />
          <Input
            type="number"
            placeholder="Capacidad"
            value={capacidadEdit}
            onChange={(e) => setCapacidadEdit(e.target.value)}
          />
          <Input
            placeholder="Equipamiento"
            value={equipamientoEdit}
            onChange={(e) => setEquipamientoEdit(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AulaManagement() {
  const [aulas, setAulas] = useState<Aula[]>([])
  const [nombre, setNombre] = useState("")
  const [capacidad, setCapacidad] = useState("")
  const [equipamiento, setEquipamiento] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [editingAula, setEditingAula] = useState<Aula | null>(null)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [showNoEquipmentConfirmDialog, setShowNoEquipmentConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [showCapacidadAlertDialog, setShowCapacidadAlertDialog] = useState(false)
  const [filterAula, setFilterAula] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [currentAulaInfo, setCurrentAulaInfo] = useState<{ id: number; nombre: string } | null>(null)
  const [hasAssignments, setHasAssignments] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [alertDialogTitle, setAlertDialogTitle] = useState("")
  const [alertDialogDescription, setAlertDialogDescription] = useState<React.ReactNode>("")
  const [alertDialogAction, setAlertDialogAction] = useState<"acknowledge" | "cancel">("acknowledge")
  const [showDuplicateNameDialog, setShowDuplicateNameDialog] = useState(false)
  const [duplicateAulaName, setDuplicateAulaName] = useState("")

  useEffect(() => {
    fetchAulas()
  }, [])

  const fetchAulas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("aulas").select("*")

      if (error) throw error

      // Ordenar las aulas alfabéticamente por nombre
      const sortedAulas = data.sort((a, b) => {
        // Extraer números del nombre para ordenar numéricamente
        const aMatch = a.nombre.match(/(\D+)(\d+)/)
        const bMatch = b.nombre.match(/(\D+)(\d+)/)

        if (aMatch && bMatch) {
          const [, aPrefix, aNum] = aMatch
          const [, bPrefix, bNum] = bMatch

          // Primero ordenar por prefijo (parte alfabética)
          if (aPrefix !== bPrefix) {
            return aPrefix.localeCompare(bPrefix)
          }

          // Luego ordenar numéricamente
          return Number.parseInt(aNum) - Number.parseInt(bNum)
        }

        // Si no se puede extraer un patrón, ordenar como texto normal
        return a.nombre.localeCompare(b.nombre)
      })

      setAulas(sortedAulas)
    } catch (error) {
      console.error("Error fetching aulas:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las aulas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateAula = () => {
    if (!nombre.trim()) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "El nombre del aula es requerido.",
      })
      return false
    }

    const capacidadNum = Number.parseInt(capacidad)
    if (isNaN(capacidadNum) || capacidadNum <= 0) {
      setShowCapacidadAlertDialog(true)
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateAula()) return

    // Verificar si ya existe un aula con el mismo nombre (al editar)
    if (editingAula) {
      const duplicateAula = aulas.find(
        (a) => a.nombre.toLowerCase() === nombre.toLowerCase() && a.id !== editingAula.id,
      )
      if (duplicateAula) {
        setAlertDialogOpen(true)
        setAlertDialogTitle("Nombre duplicado")
        setAlertDialogDescription(
          <div className="flex flex-col space-y-2">
            <div className="flex items-center text-amber-500 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>Ya existe un aula con el nombre "{nombre}".</span>
            </div>
            <p>Por favor, elige un nombre diferente para esta aula.</p>
          </div>,
        )
        setAlertDialogAction("acknowledge")
        return
      }
    } else {
      // Verificar duplicados al agregar
      const duplicateAula = aulas.find((a) => a.nombre.toLowerCase() === nombre.toLowerCase())
      if (duplicateAula) {
        setDuplicateAulaName(nombre)
        setShowDuplicateNameDialog(true)
        return
      }
    }

    if (editingAula) {
      await updateAula()
    } else {
      await addAula()
    }
  }

  async function addAula() {
    if (!validateAula()) return

    // Verificar si ya existe un aula con el mismo nombre
    const { data: existingAula, error: checkError } = await supabase
      .from("aulas")
      .select("id")
      .ilike("nombre", nombre.trim())
      .single()

    if (existingAula) {
      setDuplicateAulaName(nombre)
      setShowDuplicateNameDialog(true)
      return
    }

    const { data, error } = await supabase.from("aulas").insert([
      {
        nombre,
        capacidad: Number.parseInt(capacidad),
        equipamiento,
      },
    ])

    if (error) {
      console.error("Error adding aula:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al agregar el aula. Por favor, intente de nuevo.",
      })
    } else {
      fetchAulas()
      setNombre("")
      setCapacidad("")
      setEquipamiento("")
      toast({
        title: "Éxito",
        description: "Aula agregada correctamente.",
      })
    }
    setShowNoEquipmentConfirmDialog(false)
    setPendingAction(null)
  }

  async function updateAula() {
    if (!editingAula) return

    // Verificar si ya existe otra aula con el mismo nombre
    const { data: existingAula, error: checkError } = await supabase
      .from("aulas")
      .select("id")
      .ilike("nombre", nombre.trim())
      .neq("id", editingAula.id)
      .single()

    if (existingAula) {
      setDuplicateAulaName(nombre)
      setShowDuplicateNameDialog(true)
      return
    }

    const { data, error } = await supabase
      .from("aulas")
      .update({
        nombre,
        capacidad: Number.parseInt(capacidad),
        equipamiento,
      })
      .eq("id", editingAula.id)

    if (error) {
      console.error("Error updating aula:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar el aula. Por favor, intente de nuevo.",
      })
    } else {
      fetchAulas()
      setEditingAula(null)
      setNombre("")
      setCapacidad("")
      setEquipamiento("")
      toast({
        title: "Éxito",
        description: "Aula actualizada correctamente.",
      })
    }
    setIsEditModalOpen(false)
  }

  async function deleteAula(id: number) {
    // Obtener el nombre del aula para mostrar en el modal
    const { data: aulaData } = await supabase.from("aulas").select("nombre").eq("id", id).single()
    const aulaNombre = aulaData?.nombre || "esta aula"

    // Verificar asignaciones
    const { data: assignments, error: checkError } = await supabase.from("asignaciones").select("id").eq("aula_id", id)

    if (checkError) {
      console.error("Error checking assignments:", checkError)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al verificar asignaciones. Por favor, intente de nuevo.",
      })
      return
    }

    // Guardar información del aula actual y si tiene asignaciones
    setCurrentAulaInfo({ id, nombre: aulaNombre })
    setHasAssignments(assignments && assignments.length > 0)

    // Configurar la acción pendiente según tenga o no asignaciones
    if (assignments && assignments.length > 0) {
      setPendingAction(() => async () => {
        const { error: deleteAssignmentsError } = await supabase.from("asignaciones").delete().eq("aula_id", id)

        if (deleteAssignmentsError) {
          console.error("Error deleting assignments:", deleteAssignmentsError)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al eliminar asignaciones asociadas. Por favor, intente de nuevo.",
          })
          return
        }

        const { error: deleteAulaError } = await supabase.from("aulas").delete().eq("id", id)

        if (deleteAulaError) {
          console.error("Error deleting aula:", deleteAulaError)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al eliminar el aula. Por favor, intente de nuevo.",
          })
        } else {
          fetchAulas()
          toast({
            title: "Éxito",
            description: "Aula y sus asignaciones eliminadas correctamente.",
          })
        }
        setShowDeleteConfirmDialog(false)
        setPendingAction(null)
      })
    } else {
      setPendingAction(() => async () => {
        const { error } = await supabase.from("aulas").delete().eq("id", id)

        if (error) {
          console.error("Error deleting aula:", error)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al eliminar el aula. Por favor, intente de nuevo.",
          })
        } else {
          fetchAulas()
          toast({
            title: "Éxito",
            description: "Aula eliminada correctamente.",
          })
        }
        setShowDeleteConfirmDialog(false)
        setPendingAction(null)
      })
    }

    // Mostrar el diálogo de confirmación
    setShowDeleteConfirmDialog(true)
  }

  const columns: ColumnDef<Aula>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="flex items-center">
          <span className="text-base font-medium">{row.original.nombre}</span>
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const parseAulaName = (nombre: string) => {
          // Extraer prefijo alfabético y número por separado
          const prefix = nombre.match(/[A-Za-z]+/)?.[0] || ""
          const number = Number.parseInt(nombre.match(/\d+/)?.[0] || "0", 10)
          return { prefix, number }
        }

        const aulaA = parseAulaName(rowA.original.nombre)
        const aulaB = parseAulaName(rowB.original.nombre)

        // Primero comparar por prefijo alfabético
        if (aulaA.prefix.toLowerCase() !== aulaB.prefix.toLowerCase()) {
          return aulaA.prefix.toLowerCase().localeCompare(aulaB.prefix.toLowerCase())
        }

        // Luego comparar por número
        return aulaA.number - aulaB.number
      },
    },
    {
      accessorKey: "capacidad",
      header: "Capacidad",
      cell: ({ row }) => (
        <div className="flex items-center">
          <span className="text-sm">{row.original.capacidad} estudiantes</span>
        </div>
      ),
    },
    {
      accessorKey: "equipamiento",
      header: "Equipamiento",
      cell: ({ row }) => (
        <div className="flex items-center">
          <span className="text-sm text-muted-foreground">{row.original.equipamiento}</span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const aula = row.original
        return (
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleEditAula(aula)}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => deleteAula(aula.id)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          </div>
        )
      },
    },
  ]

  const filteredAulas = aulas.filter(
    (aula) =>
      aula.nombre.toLowerCase().includes(filterAula.toLowerCase()) ||
      aula.equipamiento.toLowerCase().includes(filterAula.toLowerCase()),
  )

  const handleEditAula = (aula: Aula) => {
    setEditingAula(aula)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingAula(null)
  }

  const handleSaveEdit = async (updatedAula: Aula) => {
    // Verificar si ya existe otra aula con el mismo nombre
    const duplicateAula = aulas.find(
      (a) => a.nombre.toLowerCase() === updatedAula.nombre.toLowerCase() && a.id !== updatedAula.id,
    )

    if (duplicateAula) {
      setDuplicateAulaName(updatedAula.nombre)
      setShowDuplicateNameDialog(true)
      return
    }

    const { error } = await supabase
      .from("aulas")
      .update({
        nombre: updatedAula.nombre,
        capacidad: updatedAula.capacidad,
        equipamiento: updatedAula.equipamiento,
      })
      .eq("id", updatedAula.id)

    if (error) {
      console.error("Error updating aula:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar el aula. Por favor, intente de nuevo.",
      })
    } else {
      fetchAulas()
      toast({
        title: "Éxito",
        description: "Aula actualizada correctamente.",
      })
      handleCloseEditModal()
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary">Gestión de Aulas</h2>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{editingAula ? "Editar Aula" : "Agregar Nueva Aula"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
              <label htmlFor="nombre" className="block text-sm font-medium text-muted-foreground mb-2">
                Nombre del aula
              </label>
              <Input
                id="nombre"
                placeholder="Nombre del aula"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <div className="md:col-span-4">
              <label htmlFor="capacidad" className="block text-sm font-medium text-muted-foreground mb-2">
                Capacidad
              </label>
              <Input
                id="capacidad"
                type="number"
                placeholder="Capacidad"
                value={capacidad}
                onChange={(e) => setCapacidad(e.target.value)}
                min="1"
                className="h-10 w-full"
              />
            </div>
            <div className="md:col-span-4">
              <div className="space-y-2">
                <label htmlFor="equipamiento" className="block text-sm font-medium text-muted-foreground">
                  Equipamiento <span className="text-xs text-muted-foreground">(opcional)</span>
                </label>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8">
                    <Input
                      id="equipamiento"
                      placeholder="Equipamiento"
                      value={equipamiento}
                      onChange={(e) => setEquipamiento(e.target.value)}
                      className="h-10 w-full"
                    />
                  </div>
                  <div className="col-span-4">
                    <Button onClick={handleSubmit} className="h-10 w-full">
                      {editingAula ? "Actualizar" : "Agregar"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Especificar el equipamiento facilita la asignación de aulas según las necesidades.
                </p>
              </div>
            </div>
            {editingAula && (
              <div className="md:col-span-12">
                <Button variant="outline" onClick={() => setEditingAula(null)} className="h-10">
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aulas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Buscar aulas..."
                value={filterAula}
                onChange={(e) => setFilterAula(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="rounded-md border">
              <DataTable columns={columns} data={filteredAulas} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNoEquipmentConfirmDialog} onOpenChange={setShowNoEquipmentConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-web">
              <Info className="h-5 w-5" />
              Confirmar acción
            </DialogTitle>
            <DialogDescription className="pt-2">
              No ha especificado ningún equipamiento para esta aula.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500 my-2">
            <div className="flex gap-2">
              <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Especificar el equipamiento facilita la asignación de aulas según las necesidades de cada grupo.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNoEquipmentConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (pendingAction) {
                  pendingAction()
                }
                setShowNoEquipmentConfirmDialog(false)
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea eliminar el aula {currentAulaInfo?.nombre}?
            </DialogDescription>
          </DialogHeader>
          {hasAssignments ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-l-4 border-amber-500 my-2">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Atención</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Esta aula tiene asignaciones asociadas. Si continúa, se eliminarán todas las asignaciones
                    relacionadas.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500 my-2">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Esta acción no se puede deshacer. El aula será eliminada permanentemente.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingAction) {
                  pendingAction()
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCapacidadAlertDialog} onOpenChange={setShowCapacidadAlertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Capacidad inválida
            </DialogTitle>
            <DialogDescription className="pt-2">
              La capacidad del aula debe ser un número mayor que cero.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500 my-2">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Por favor, ingrese un valor numérico válido para la capacidad del aula.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCapacidadAlertDialog(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EditModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} aula={editingAula} onSave={handleSaveEdit} />

      <Dialog open={alertDialogOpen} onOpenChange={() => setAlertDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {alertDialogTitle}
            </DialogTitle>
            <DialogDescription className="pt-2">{alertDialogDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {alertDialogAction === "acknowledge" ? (
              <Button onClick={() => setAlertDialogOpen(false)}>Entendido</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={() => setAlertDialogOpen(false)}>
                  Confirmar
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para nombres duplicados */}
      <Dialog open={showDuplicateNameDialog} onOpenChange={setShowDuplicateNameDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Nombre de aula duplicado
            </DialogTitle>
            <DialogDescription className="pt-2">
              No se puede {editingAula ? "actualizar" : "agregar"} el aula
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-l-4 border-amber-500 my-2">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Error de duplicación</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Ya existe un aula con el nombre "{duplicateAulaName}". Los nombres de aulas deben ser únicos en el
                  sistema.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500 my-2">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Por favor, elija un nombre diferente para esta aula.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDuplicateNameDialog(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
