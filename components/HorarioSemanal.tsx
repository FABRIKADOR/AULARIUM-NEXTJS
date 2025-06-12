"use client"

import { TableHeader } from "@/components/ui/table"
import { restrictToWindowEdges } from "@dnd-kit/modifiers"
import { useState, useMemo, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { useDraggable, useDroppable, DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { useTheme } from "next-themes"
import jsPDF from "jspdf"
import "jspdf-autotable"

interface Aula {
  id: number
  nombre: string
  capacidad: number
}

interface Grupo {
  id: number
  materia_id: number
  numero: string
  alumnos: number
  turno: "MAÑANA" | "TARDE"
  horarios: {
    dia: string
    hora_inicio: string
    hora_fin: string
  }[]
}

interface Materia {
  id: number
  nombre: string
  profesor_id: number | null
}

interface Asignacion {
  id?: number
  grupo_id: number
  aula_id: number | null
  materia_id: number
  dia: string
  hora_inicio: string
  hora_fin: string
  turno: "MAÑANA" | "TARDE"
}

interface DraggableAsignacionProps {
  asignacion: Asignacion
  materia: Materia | undefined
  grupo: Grupo | undefined
  aula?: Aula
  color: string
  isReadOnly?: boolean
}

interface HorarioSemanalProps {
  asignaciones: Asignacion[]
  aulas: Aula[]
  materias: Materia[]
  grupos: Grupo[]
  isReadOnly?: boolean
}

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const horasClase = [
  "07:00 - 08:00",
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
  "20:00 - 21:00",
  "21:00 - 22:00",
]

const turnos = ["MAÑANA", "TARDE"]

function AsignacionItem({ asignacion, materias, grupos, isReadOnly }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `asignacion-${asignacion.id}`,
    disabled: isReadOnly,
  })

  const grupo = grupos.find((g: Grupo) => g.id === asignacion.grupo_id)
  const materia = materias.find((m: Materia) => m.id === asignacion.materia_id)

  if (!grupo || !materia) return null

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`p-1 text-xs rounded bg-orange-web/80 text-white cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{ fontSize: "0.7rem" }}
    >
      <div className="font-bold truncate">{materia.nombre}</div>
      <div className="truncate">Grupo: {grupo.numero}</div>
      <div className="truncate">Alumnos: {grupo.alumnos}</div>
    </div>
  )
}

function DraggableAsignacion({
  asignacion,
  materia,
  grupo,
  aula,
  color,
  isReadOnly = false,
}: DraggableAsignacionProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `asignacion-${asignacion.id}`,
    data: {
      asignacion,
      grupo,
      materia,
    },
    disabled: isReadOnly, // Deshabilitar arrastre si isReadOnly es true
  })

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const style = transform
    ? {
        transform: CSS.Transform.toString({
          ...transform,
          scaleX: 1,
          scaleY: 1,
        }),
        backgroundColor: color || "#f0f0f0",
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1000 : "auto",
        position: "relative",
        width: "100%",
        touchAction: "none",
        cursor: isReadOnly ? "default" : "grab",
        transition: "none",
        minHeight: "90px",
        maxHeight: "90px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }
    : {
        backgroundColor: color || "#f0f0f0",
        width: "100%",
        minHeight: "90px",
        maxHeight: "90px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: isReadOnly ? "default" : "grab",
      }

  const exceedsCapacity = grupo && aula && grupo.alumnos > aula.capacidad

  return (
    <div
      id={`asignacion-${asignacion.id}`}
      ref={setNodeRef}
      style={style}
      {...(isReadOnly ? {} : listeners)}
      {...(isReadOnly ? {} : attributes)}
      onDoubleClick={handleDoubleClick}
      className={`select-none p-3 rounded-md shadow-sm relative
      ${isDragging ? "shadow-lg" : ""}
      ${isReadOnly ? "" : "hover:shadow-md active:shadow-sm transform-gpu"}
      w-full flex flex-col justify-between
      border border-gray-200/20`}
    >
      <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{materia?.nombre}</div>

      <div className="flex justify-start gap-2 mt-2">
        <div className="bg-gray-700 dark:bg-gray-800 text-white text-xs font-medium px-2 py-1 rounded">
          {grupo?.numero}
        </div>
        <div className="bg-gray-700 dark:bg-gray-800 text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
          {grupo?.alumnos} alumnos
        </div>
      </div>

      {exceedsCapacity && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                !
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                El grupo sobrepasa la capacidad del aula ({grupo?.alumnos} alumnos / {aula?.capacidad} capacidad)
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

function DroppableCell({
  children,
  aulaId,
  hora,
  dia,
  turno,
  isUnassignedArea = false,
}: {
  children: React.ReactNode
  aulaId?: number
  hora?: string
  dia?: string
  turno?: string
  isUnassignedArea?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: isUnassignedArea ? `zona-desasignar-${hora}-${dia}-${turno}` : `aula-${aulaId}-${hora}-${dia}-${turno}`,
    data: {
      aulaId,
      hora,
      dia,
      turno,
      isUnassignedArea,
    },
  })

  return (
    <TableCell
      ref={setNodeRef}
      className={`p-1 sm:p-2 border border-platinum transition-colors duration-200 
        ${isUnassignedArea ? "bg-platinum hover:bg-platinum/80" : ""}
        ${isOver ? "bg-orange-web/20" : ""}`}
    >
      {children}
    </TableCell>
  )
}

const parseAulaName = (name: string) => {
  // Buscar un patrón como "Aula 1", "A101", etc.
  const match = name.match(/([A-Za-z\s]+)?(\d+)/)
  if (match) {
    // El primer grupo captura letras y espacios, el segundo grupo captura números
    const prefix = match[1] || ""
    const number = Number.parseInt(match[2], 10)
    return { prefix: prefix.trim(), number }
  }
  // Si no hay coincidencia, devolver el nombre completo como prefijo y NaN como número
  return { prefix: name, number: Number.NaN }
}

export default function HorarioSemanal({
  asignaciones: initialAsignaciones,
  aulas,
  materias,
  grupos,
  isReadOnly = false,
}: HorarioSemanalProps) {
  const { resolvedTheme } = useTheme()
  const [asignaciones, setAsignaciones] = useState(initialAsignaciones)
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>("Lunes")
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<"MAÑANA" | "TARDE">("MAÑANA")
  const [grupoFiltrado, setGrupoFiltrado] = useState<string>("todos")
  const [mounted, setMounted] = useState(false)

  const [selectedDia, setSelectedDia] = useState<string>("Lunes")
  const [selectedTurno, setSelectedTurno] = useState<string>("MAÑANA")
  const [selectedGrupo, setSelectedGrupo] = useState<string>("todos")
  const [filteredAsignaciones, setFilteredAsignaciones] = useState<Asignacion[]>(asignaciones)

  // Crear un conjunto de grupos únicos basados en su NÚMERO (no ID)
  const uniqueGrupos = Array.from(
    new Map(
      grupos.map((grupo) => {
        return [grupo.numero, { id: grupo.id, numero: grupo.numero }]
      }),
    ).values(),
  )

  useEffect(() => {
    let filtered = [...asignaciones]

    if (selectedDia !== "todos") {
      filtered = filtered.filter((a) => a.dia === selectedDia)
    }

    if (selectedTurno !== "todos") {
      filtered = filtered.filter((a) => a.turno === selectedTurno)
    }

    if (selectedGrupo !== "todos") {
      filtered = filtered.filter((a) => {
        const grupo = grupos.find((g) => g.id === a.grupo_id)
        return grupo?.numero === selectedGrupo
      })
    }

    setFilteredAsignaciones(filtered)
  }, [asignaciones, selectedDia, selectedTurno, selectedGrupo])

  const getAsignacionesForCellByAula = (hora: string, aula: Aula) => {
    const [horaInicio, horaFin] = hora.split(" - ")
    return filteredAsignaciones.filter(
      (a) => a.hora_inicio === horaInicio && a.hora_fin === horaFin && a.aula_id === aula.id,
    )
  }

  const getAsignacionesForCellSinAula = (hora: string) => {
    const [horaInicio, horaFin] = hora.split(" - ")
    return filteredAsignaciones.filter(
      (a) => a.hora_inicio === horaInicio && a.hora_fin === horaFin && (a.aula_id === null || a.aula_id === undefined),
    )
  }

  // Asegurarse de que el componente está montado para evitar problemas de hidratación
  useEffect(() => {
    setMounted(true)
  }, [])

  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
  const horasMañana = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00"]
  const horasTarde = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]

  const coloresPastel = useMemo(() => {
    if (!Array.isArray(materias) || materias.length === 0) {
      return {}
    }

    const isDark = resolvedTheme === "dark"

    // Colores para modo claro
    const coloresLight = [
      "#FFD6E0", // Rosa claro
      "#FFECB3", // Amarillo claro
      "#C8E6C9", // Verde claro
      "#BBDEFB", // Azul claro
      "#D1C4E9", // Púrpura claro
      "#F8BBD0", // Rosa más claro
      "#B2EBF2", // Cian claro
      "#DCEDC8", // Lima claro
      "#FFE0B2", // Ámbar claro
      "#E1BEE7", // Púrpura más claro
    ]

    // Colores para modo oscuro - más saturados pero aún pastel
    const coloresDark = [
      "#9C4D61", // Rosa oscuro
      "#B59B3B", // Amarillo oscuro
      "#4B7F4E", // Verde oscuro
      "#3A6EA5", // Azul oscuro
      "#614D7E", // Púrpura oscuro
      "#A35975", // Rosa más oscuro
      "#3E8A94", // Cian oscuro
      "#6A8D3F", // Lima oscuro
      "#B5813E", // Ámbar oscuro
      "#7D5490", // Púrpura más oscuro
    ]

    const colores = isDark ? coloresDark : coloresLight

    return materias.reduce(
      (acc, materia, index) => {
        acc[materia.id] = colores[index % colores.length]
        return acc
      },
      {} as Record<number, string>,
    )
  }, [materias, resolvedTheme])

  const asignacionesFiltradas = useMemo(() => {
    return asignaciones.filter((a) => {
      const matchesDiaYTurno = a.dia === diaSeleccionado && a.turno === turnoSeleccionado
      if (grupoFiltrado === "todos") return matchesDiaYTurno
      const grupo = grupos.find((g) => g.id === a.grupo_id)
      return matchesDiaYTurno && grupo?.numero === grupoFiltrado
    })
  }, [asignaciones, diaSeleccionado, turnoSeleccionado, grupoFiltrado, grupos])

  const getAsignaciones = (aulaId: number | null, hora: string) => {
    return asignacionesFiltradas.filter((a) => a.aula_id === aulaId && a.hora_inicio <= hora && a.hora_fin > hora)
  }

  // Ordenar aulas con lógica personalizada
  const aulasOrdenadas = useMemo(() => {
    return [...aulas].sort((a, b) => {
      // Extraer prefijo alfabético y número por separado
      const aulaA = parseAulaName(a.nombre)
      const aulaB = parseAulaName(b.nombre)

      // Primero comparar por prefijo alfabético (ignorando mayúsculas/minúsculas)
      if (aulaA.prefix.toLowerCase() !== aulaB.prefix.toLowerCase()) {
        return aulaA.prefix.toLowerCase().localeCompare(aulaB.prefix.toLowerCase())
      }

      // Luego comparar por número para ordenar correctamente (1, 2, 10 en lugar de 1, 10, 2)
      return aulaA.number - aulaB.number
    })
  }, [aulas])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const draggedAsignacionId = active.id.toString().split("-")[1]
    const droppedZoneId = over.id.toString()

    if (draggedAsignacionId) {
      try {
        const asignacionId = Number.parseInt(draggedAsignacionId)
        const updateData: { aula_id: number | null } = { aula_id: null }

        if (droppedZoneId.startsWith("zona-desasignar-")) {
          updateData.aula_id = null
        } else if (droppedZoneId.startsWith("aula-")) {
          const droppedAulaId = droppedZoneId.split("-")[1]
          const newAulaId = Number.parseInt(droppedAulaId)

          // Check if the aula is already occupied
          const draggedAsignacion = asignaciones.find((a) => a.id === asignacionId)
          if (draggedAsignacion) {
            // Check for any existing assignments in this classroom at the same time
            const conflictingAsignacion = asignaciones.find(
              (a) =>
                a.aula_id === newAulaId &&
                a.dia === draggedAsignacion.dia &&
                a.id !== draggedAsignacion.id &&
                ((a.hora_inicio <= draggedAsignacion.hora_inicio && a.hora_fin > draggedAsignacion.hora_inicio) ||
                  (a.hora_inicio < draggedAsignacion.hora_fin && a.hora_fin >= draggedAsignacion.hora_fin)),
            )

            if (conflictingAsignacion) {
              toast({
                title: "Error de asignación",
                description: "Esta aula ya está ocupada en este horario.",
                variant: "destructive",
              })
              return
            }
          }

          updateData.aula_id = newAulaId
        } else {
          return
        }

        // Optimistic update
        setAsignaciones((prevAsignaciones) =>
          prevAsignaciones.map((asignacion) =>
            asignacion.id === asignacionId ? { ...asignacion, aula_id: updateData.aula_id } : asignacion,
          ),
        )

        // Ya no actualizamos la base de datos aquí, solo notificamos el cambio
        const aula = aulas.find((a) => a.id === updateData.aula_id)
        const grupo = grupos.find((g) => g.id === asignacionId)
        toast({
          title: "Asignación actualizada",
          description: updateData.aula_id
            ? `Grupo ${grupo?.numero || ""} asignado al aula ${aula?.nombre || ""}`
            : "Grupo movido a desasignados",
        })
      } catch (error) {
        console.error("Error updating assignment:", error)
        toast({
          title: "Error",
          description: "Error al actualizar la asignación. Por favor, intente de nuevo.",
          variant: "destructive",
        })
      }
    }
  }

  const generateExcel = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,\n"
      const turnos = ["MAÑANA", "TARDE"]
      const horas = {
        MAÑANA: ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"],
        TARDE: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"],
      }

      for (const turno of turnos) {
        for (const dia of dias) {
          // Encabezado para cada día y turno
          csvContent += `\n${dia} - Turno ${turno}\n`

          // Encabezados de columnas
          csvContent += "Hora,"
          aulasOrdenadas.forEach((aula) => {
            csvContent += `${aula.nombre},`
          })
          csvContent += "Sin Asignar\n"

          // Filas de horarios
          const horasTurno = horas[turno]
          for (let i = 0; i < horasTurno.length - 1; i++) {
            const horaInicio = horasTurno[i]
            const horaFin = horasTurno[i + 1]

            // Agregar el rango de hora
            csvContent += `${horaInicio}-${horaFin},`

            // Procesar cada aula
            for (const aula of aulasOrdenadas) {
              const asignacionesAula = asignaciones.filter(
                (a) => a.aula_id === aula.id && a.dia === dia && a.turno === turno && a.hora_inicio === horaInicio,
              )

              let cellContent = ""
              asignacionesAula.forEach((asignacion) => {
                const materia = materias.find((m) => m.id === asignacion.materia_id)
                const grupo = grupos.find((g) => g.id === asignacion.grupo_id)
                if (materia && grupo) {
                  cellContent += `${materia.nombre} - Grupo ${grupo.numero} (${grupo.alumnos} alumnos)`
                }
              })
              csvContent += `"${cellContent}",`
            }

            // Procesar asignaciones sin aula
            const sinAsignar = asignaciones.filter(
              (a) => a.aula_id === null && a.dia === dia && a.turno === turno && a.hora_inicio === horaInicio,
            )

            let sinAsignarContent = ""
            sinAsignar.forEach((asignacion) => {
              const materia = materias.find((m) => m.id === asignacion.materia_id)
              const grupo = grupos.find((g) => g.id === asignacion.grupo_id)
              if (materia && grupo) {
                sinAsignarContent += `${materia.nombre} - Grupo ${grupo.numero} (${grupo.alumnos} alumnos)`
              }
            })
            csvContent += `"${sinAsignarContent}"\n`
          }
          csvContent += "\n" // Línea extra entre días
        }
        csvContent += "\n" // Línea extra entre turnos
      }

      // Crear y descargar el archivo
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `horario_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Excel generado",
        description: "El archivo CSV se ha descargado correctamente.",
      })
    } catch (error) {
      console.error("Error generando Excel:", error)
      toast({
        title: "Error",
        description: "Hubo un error al generar el archivo Excel. Por favor, intente de nuevo.",
        variant: "destructive",
      })
    }
  }

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
    })

    // Título
    doc.setFontSize(18)
    doc.text(
      `Horario de Aulas - ${selectedDia === "todos" ? "Todos los días" : selectedDia} - ${
        selectedTurno === "todos" ? "Todos los turnos" : selectedTurno === "MAÑANA" ? "Turno Mañana" : "Turno Tarde"
      }`,
      14,
      15,
    )

    // Configurar tabla
    const tableColumn = ["Hora", ...aulas.map((aula) => `${aula.nombre} (Cap: ${aula.capacidad})`)]
    const tableRows: any[] = []

    // Llenar datos
    horasClase.forEach((hora) => {
      const row = [hora]
      aulas.forEach((aula) => {
        const asignacionesCell = getAsignacionesForCellByAula(hora, aula)
        if (asignacionesCell.length > 0) {
          const asignacionInfo = asignacionesCell
            .map((asignacion) => {
              const materia = materias.find((m) => m.id === asignacion.materia_id)
              const grupo = grupos.find((g) => g.id === asignacion.grupo_id)
              return `${materia?.nombre || "Sin materia"} - Grupo ${grupo?.numero || "?"} (${grupo?.alumnos || 0} alumnos)`
            })
            .join("\n")
          row.push(asignacionInfo)
        } else {
          row.push("")
        }
      })
      tableRows.push(row)
    })

    // Añadir tabla al PDF
    doc.setFontSize(10)
    // @ts-ignore
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 20 },
      },
      didDrawPage: (data: any) => {
        // Pie de página
        const pageSize = doc.internal.pageSize
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
        doc.setFontSize(8)
        doc.text(
          `Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
          data.settings.margin.left,
          pageHeight - 10,
        )
      },
    })

    // Guardar PDF
    doc.save(
      `horario-aulas-${selectedDia === "todos" ? "todos" : selectedDia.toLowerCase()}-${
        selectedTurno === "todos" ? "todos" : selectedTurno.toLowerCase()
      }.pdf`,
    )
  }

  if (!asignaciones || asignaciones.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No hay asignaciones disponibles. Por favor, asigne aulas a los grupos primero.
        </AlertDescription>
      </Alert>
    )
  }

  // Si no está montado, no renderizar nada para evitar problemas de hidratación
  if (!mounted) return null

  return (
    <DndContext
      onDragEnd={isReadOnly ? undefined : handleDragEnd}
      modifiers={[restrictToWindowEdges]}
      collisionDetection={closestCenter}
    >
      <Card className="bg-white dark:bg-oxford-blue w-full">
        <CardContent className="pt-6 p-2 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <Select value={diaSeleccionado} onValueChange={setDiaSeleccionado}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-oxford-blue text-oxford-blue dark:text-white">
                  <SelectValue placeholder="Seleccionar día" />
                </SelectTrigger>
                <SelectContent>
                  {dias.map((dia) => (
                    <SelectItem key={dia} value={dia}>
                      {dia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={turnoSeleccionado}
                onValueChange={(value: "MAÑANA" | "TARDE") => setTurnoSeleccionado(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-oxford-blue text-oxford-blue dark:text-white">
                  <SelectValue placeholder="Seleccionar turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAÑANA">Turno Mañana</SelectItem>
                  <SelectItem value="TARDE">Turno Tarde</SelectItem>
                </SelectContent>
              </Select>

              <Select value={grupoFiltrado} onValueChange={setGrupoFiltrado}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-oxford-blue text-oxford-blue dark:text-white">
                  <SelectValue placeholder="Filtrar por grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los grupos</SelectItem>
                  {uniqueGrupos.map((grupo) => (
                    <SelectItem key={grupo.numero} value={grupo.numero}>
                      Grupo {grupo.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={generateExcel} className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar a Excel
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-[800px] lg:w-full horario-container">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="bg-platinum dark:bg-oxford-blue/50">
                    <TableHead className="w-20 sm:w-32 text-oxford-blue dark:text-white text-sm sm:text-base">
                      Hora
                    </TableHead>
                    {aulasOrdenadas.map((aula) => (
                      <TableHead
                        key={aula.id}
                        className="text-center w-36 sm:w-48 text-oxford-blue dark:text-white text-sm sm:text-base"
                      >
                        {aula.nombre}
                        <div className="text-xs text-muted-foreground">(Cap: {aula.capacidad})</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center w-36 sm:w-48 text-oxford-blue dark:text-white text-sm sm:text-base">
                      Desasignados
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(turnoSeleccionado === "MAÑANA" ? horasMañana : horasTarde).map((hora, index) => (
                    <TableRow key={hora} className="h-16 sm:h-24">
                      <TableCell className="font-medium whitespace-nowrap text-sm sm:text-base">
                        {hora} -{" "}
                        {(turnoSeleccionado === "MAÑANA" ? horasMañana : horasTarde)[index + 1] ||
                          (turnoSeleccionado === "MAÑANA" ? "14:00" : "21:00")}
                      </TableCell>
                      {aulasOrdenadas.map((aula) => {
                        const asignacionesAula = getAsignaciones(aula.id, hora)
                        return (
                          <DroppableCell
                            key={aula.id}
                            aulaId={aula.id}
                            hora={hora}
                            dia={diaSeleccionado}
                            turno={turnoSeleccionado}
                          >
                            <div className="space-y-2">
                              {asignacionesAula.map((asignacion) => {
                                const materia = materias.find((m) => m.id === asignacion.materia_id)
                                const grupo = grupos.find((g) => g.id === asignacion.grupo_id)
                                console.log(
                                  `Renderizando grupo ${grupo.id} en aula ${aula.id || "ninguna"}, asignación ${asignacion?.id}`,
                                )
                                return (
                                  <DraggableAsignacion
                                    key={asignacion.id}
                                    asignacion={asignacion}
                                    materia={materia}
                                    grupo={grupo}
                                    aula={aula}
                                    color={coloresPastel[asignacion.materia_id]}
                                    isReadOnly={isReadOnly}
                                  />
                                )
                              })}
                            </div>
                          </DroppableCell>
                        )
                      })}
                      <DroppableCell isUnassignedArea hora={hora} dia={diaSeleccionado} turno={turnoSeleccionado}>
                        <ScrollArea className="h-[120px]">
                          <div className="space-y-2 p-1">
                            {getAsignaciones(null, hora).map((asignacion) => {
                              const materia = materias.find((m) => m.id === asignacion.materia_id)
                              const grupo = grupos.find((g) => g.id === asignacion.grupo_id)
                              return (
                                <DraggableAsignacion
                                  key={asignacion.id}
                                  asignacion={asignacion}
                                  materia={materia}
                                  grupo={grupo}
                                  color={coloresPastel[asignacion.materia_id]}
                                  isReadOnly={isReadOnly}
                                />
                              )
                            })}
                          </div>
                        </ScrollArea>
                      </DroppableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </DndContext>
  )
}
