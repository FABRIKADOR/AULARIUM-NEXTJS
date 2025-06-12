"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from "../lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Shield, RefreshCw, Search, Filter } from "lucide-react"
import Image from "next/image"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import type { ConfiguracionHorario } from "@/types/config"
import { useToast } from "@/components/ui/use-toast"
import { isAdmin, getUserRole } from "@/lib/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

interface Profesor {
  id: number
  nombre: string
}

interface Materia {
  id: number
  nombre: string
  profesor_id: number
  usuario_id?: string
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

interface Asignacion {
  id: number
  grupo_id: number
  aula_id: number | null | undefined
  materia_id: number
  dia: string
  hora_inicio: string
  hora_fin: string
  turno: "MAÑANA" | "TARDE"
}

interface Aula {
  id: number
  nombre: string
}

interface HorarioCell {
  materias: {
    nombre: string
    profesor: string
    aula: string
    color: string
  }[]
}

interface Horario {
  dia: string
  hora_inicio: string
  hora_fin: string
}

interface FiltrosHorario {
  turno: string | null
  busqueda: string
  soloConAula: boolean
}

export default function HorarioGrupo({ selectedPeriod }) {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null)
  const [horario, setHorario] = useState<Record<string, Record<string, HorarioCell>>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userCarreraId, setUserCarreraId] = useState<number | null>(null)
  const [autoRefreshAttempts, setAutoRefreshAttempts] = useState(0)
  const [activeCycle, setActiveCycle] = useState<string>("1") // Default to Enero-Abril
  const [filtros, setFiltros] = useState<FiltrosHorario>({
    turno: null,
    busqueda: "",
    soloConAula: false,
  })
  const [config, setConfig] = useState<ConfiguracionHorario>({
    director: "ING. JONATHAN OSWALDO MORENO RAMÍREZ",
    secretario: "ING. MIGUEL ANGEL MEDINA CORTÁZAR",
    recursosHumanos: "LIC. GEORGINA CHI KEB",
    periodo: `${new Date().getMonth() < 6 ? "Enero-Abril" : "Agosto-Diciembre"} ${new Date().getFullYear()}`,
    fechaRevision: "12 de Julio de 2023",
    numeroRevision: "1",
    codigoDocumento: "CIT-P01-F01",
    nombreUniversidad: "Universidad Politécnica de Quintana Roo",
    nombreDireccion: "Dirección de Ingeniería en Software",
    direccionUniversidad:
      "Universidad Politécnica de Quintana Roo, Av. Arco Bicentenario, Mza. 11, Lote 1119-33, SM 255. Cancún, Quintana Roo, México",
    logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGpDqfZCrnvkiM62Chr0vWivZgUL-GmPhVHQ&s",
    fecha: new Date().toLocaleDateString(),
    horasFrenteGrupo: 0,
  })
  const { toast } = useToast()
  const horarioRef = useRef<HTMLDivElement>(null)

  const horasMañana = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"]
  const horasTarde = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"]
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

  // Paleta de 7 colores bien definidos y contrastados
  const paletaColores = useMemo(
    () => [
      "#FFB3BA", // Rosa suave
      "#BAFFC9", // Verde menta
      "#BAE1FF", // Azul cielo
      "#FFE4B5", // Melocotón
      "#E6E6FA", // Lavanda
      "#FFD700", // Amarillo dorado
      "#98FF98", // Verde pastel
    ],
    [],
  )

  // Get unique grupo numbers with filtering
  const filteredGrupos = useMemo(() => {
    let filtered = [...grupos]

    // Filtrar por turno si está seleccionado
    if (filtros.turno) {
      filtered = filtered.filter((g) => g.turno === filtros.turno)
    }

    // Filtrar por búsqueda (número de grupo)
    if (filtros.busqueda) {
      const busquedaLower = filtros.busqueda.toLowerCase()
      filtered = filtered.filter((g) => {
        const grupoNumero = g.numero.toLowerCase()
        return grupoNumero.includes(busquedaLower)
      })
    }

    // Filtrar grupos que tienen aula asignada
    if (filtros.soloConAula) {
      const gruposConAula = new Set(
        asignaciones.filter((a) => a.aula_id !== null && a.aula_id !== undefined).map((a) => a.grupo_id),
      )
      filtered = filtered.filter((g) => gruposConAula.has(g.id))
    }

    return filtered
  }, [grupos, filtros, asignaciones])

  // Get unique grupo numbers
  const uniqueGrupos = useMemo(() => {
    // Extract unique grupo numbers from filtered grupos
    const uniqueNumeros = Array.from(new Set(filteredGrupos.map((g) => g.numero)))

    // Sort them for better display
    return uniqueNumeros.sort()
  }, [filteredGrupos])

  // Función para asignar colores a materias
  const getColorForMateria = (materiaId: number) => {
    // Usar el ID de la materia módulo 7 para asignar un color
    return paletaColores[materiaId % paletaColores.length]
  }

  // Add the sorting function
  const sortHorarios = (horarios: Horario[]) => {
    return [...horarios].sort((a, b) => {
      const dayOrder = {
        Lunes: 0,
        Martes: 1,
        Miércoles: 2,
        Jueves: 3,
        Viernes: 4,
      }
      // First sort by day
      const dayDiff = dayOrder[a.dia] - dayOrder[b.dia]
      if (dayDiff !== 0) return dayDiff

      // Then sort by start time
      return a.hora_inicio.localeCompare(b.hora_inicio)
    })
  }

  // Determinar el periodo actual basado en el valor seleccionado
  const getPeriodId = (periodName: string | null) => {
    if (!periodName) return null

    switch (periodName.toLowerCase()) {
      case "enero-abril":
        return "1"
      case "mayo-agosto":
        return "2"
      case "septiembre-diciembre":
        return "3"
      default:
        return null
    }
  }

  // Usar el periodo seleccionado o el valor por defecto
  const effectivePeriod = useMemo(() => {
    // Si selectedPeriod es un ID, usarlo directamente
    if (selectedPeriod === "1" || selectedPeriod === "2" || selectedPeriod === "3") {
      return selectedPeriod
    }

    // Si selectedPeriod es un nombre, convertirlo a ID
    const periodId = getPeriodId(selectedPeriod)
    if (periodId) return periodId

    // Si no hay periodo seleccionado, usar el ciclo activo
    return activeCycle
  }, [selectedPeriod, activeCycle])

  // Agregar estos estados después de los otros estados
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editConfig, setEditConfig] = useState<ConfiguracionHorario>(config)

  // Obtener el nombre del periodo basado en el ID
  const getPeriodName = (periodId: string) => {
    switch (periodId) {
      case "1":
        return "Enero-Abril"
      case "2":
        return "Mayo-Agosto"
      case "3":
        return "Septiembre-Diciembre"
      default:
        return "Periodo Desconocido"
    }
  }

  // Actualizar la configuración cuando cambia el ciclo
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      periodo: `${getPeriodName(activeCycle)} ${new Date().getFullYear()}`,
    }))
  }, [activeCycle])

  useEffect(() => {
    async function fetchUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          const admin = await isAdmin(user.id)
          setIsUserAdmin(admin)
          const { rol, carrera_id } = await getUserRole(user.id)
          setUserRole(rol)
          setUserCarreraId(carrera_id)

          // Iniciar carga de datos después de obtener la información del usuario
          fetchData()
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Error al obtener datos del usuario")
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const getTableNamesByPeriod = (periodId: string) => {
    switch (periodId) {
      case "1":
        return {
          materias: "materias_enero_abril",
          grupos: "grupos_enero_abril",
          asignaciones: "asignaciones_enero_abril",
        }
      case "2":
        return {
          materias: "materias_mayo_agosto",
          grupos: "grupos_mayo_agosto",
          asignaciones: "asignaciones_mayo_agosto",
        }
      case "3":
        return {
          materias: "materias_septiembre_diciembre",
          grupos: "grupos_septiembre_diciembre",
          asignaciones: "asignaciones_septiembre_diciembre",
        }
      default:
        return {
          materias: "materias_enero_abril",
          grupos: "grupos_enero_abril",
          asignaciones: "asignaciones_enero_abril",
        }
    }
  }

  // Configurar suscripciones en tiempo real a cambios en la base de datos
  useEffect(() => {
    if (!effectivePeriod) return

    const tables = getTableNamesByPeriod(effectivePeriod)

    // Crear canales de suscripción para cada tabla relevante
    const materiasChannel = supabase
      .channel("materias-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tables.materias,
        },
        () => {
          console.log("Cambios detectados en materias, recargando datos...")
          fetchData()
        },
      )
      .subscribe()

    const gruposChannel = supabase
      .channel("grupos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tables.grupos,
        },
        () => {
          console.log("Cambios detectados en grupos, recargando datos...")
          fetchData()
        },
      )
      .subscribe()

    const asignacionesChannel = supabase
      .channel("asignaciones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tables.asignaciones,
        },
        () => {
          console.log("Cambios detectados en asignaciones, recargando datos...")
          fetchData()
        },
      )
      .subscribe()

    // Limpiar suscripciones al desmontar
    return () => {
      supabase.removeChannel(materiasChannel)
      supabase.removeChannel(gruposChannel)
      supabase.removeChannel(asignacionesChannel)
    }
  }, [effectivePeriod])

  // Efecto para recargar automáticamente hasta detectar materias (máximo 2 intentos)
  useEffect(() => {
    // Solo intentar recargar si ya se ha cargado una vez pero no hay materias
    if (!loading && materias.length === 0 && autoRefreshAttempts < 2) {
      console.log(`Intento automático de recarga #${autoRefreshAttempts + 1} para detectar materias`)

      // Esperar un momento antes de intentar recargar
      const timer = setTimeout(() => {
        fetchData()
        setAutoRefreshAttempts((prev) => prev + 1)
      }, 1500) // 1.5 segundos entre intentos

      return () => clearTimeout(timer)
    }
  }, [loading, materias.length, autoRefreshAttempts])

  // Efecto para cargar datos cuando cambia el ciclo
  useEffect(() => {
    if (currentUserId) {
      // Resetear el grupo seleccionado al cambiar de ciclo
      setSelectedGrupo(null)
      // Cargar datos del nuevo ciclo
      fetchData()
    }
  }, [activeCycle])

  useEffect(() => {
    if (selectedGrupo) {
      console.log("Llamando a generateHorario con grupo seleccionado:", selectedGrupo?.numero)
      generateHorario()
    } else {
      console.log("No hay grupo seleccionado para generar horario")
    }
  }, [selectedGrupo, materias, profesores, aulas, asignaciones])

  // Función para refrescar manualmente los datos
  const refreshData = async () => {
    setRefreshing(true)
    try {
      await fetchData()
      toast({
        title: "Datos actualizados",
        description: "Los datos se han actualizado correctamente",
      })
    } catch (error) {
      console.error("Error al refrescar datos:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar los datos. Intente nuevamente.",
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Modify the fetchData function to filter data based on admin status
  async function fetchData() {
    // Si ya está cargando, no hacer nada
    if (refreshing) return

    try {
      // Usar el periodo efectivo (que nunca será null)
      const periodId = effectivePeriod
      console.log("Usando periodo:", periodId)

      const tables = getTableNamesByPeriod(periodId)

      // Fetch user data and role first
      if (currentUserId === null) {
        console.log("No hay usuario actual, no se pueden cargar datos")
        setLoading(false)
        return
      }

      setLoading(true)
      console.log("Iniciando fetchData con periodo:", periodId)

      // Clear previous data
      setProfesores([])
      setMaterias([])
      setGrupos([])
      setAulas([])
      setAsignaciones([])

      // Fetch all professors regardless of user role
      const { data: profesoresData, error: profesoresError } = await supabase.from("profesores").select("*")
      if (profesoresError) {
        console.error("Error fetching profesores:", profesoresError)
        throw new Error("Error fetching profesores: " + profesoresError.message)
      }
      console.log("Profesores cargados:", profesoresData?.length || 0)
      setProfesores(profesoresData || [])

      // Fetch all aulas - Aulas are shared by all users
      const { data: aulasData, error: aulasError } = await supabase.from("aulas").select("*")
      if (aulasError) {
        console.error("Error fetching aulas:", aulasError)
        throw new Error("Error fetching aulas: " + aulasError.message)
      }
      console.log("Aulas cargadas:", aulasData?.length || 0)
      setAulas(aulasData || [])

      // Different query logic based on user role
      if (isUserAdmin) {
        // Admin users can see all schedules, groups, and assignments
        console.log("Admin user detected, fetching all data")

        // Fetch all materials without filtering
        const { data: materiasData, error: materiasError } = await supabase.from(tables.materias).select("*")

        if (materiasError) {
          console.error("Error fetching materias:", materiasError)
          throw new Error("Error fetching materias: " + materiasError.message)
        }
        console.log("Materias cargadas (admin):", materiasData?.length || 0)

        // Fetch all groups without filtering
        const { data: gruposData, error: gruposError } = await supabase.from(tables.grupos).select("*")

        if (gruposError) {
          console.error("Error fetching grupos:", gruposError)
          throw new Error("Error fetching grupos: " + gruposError.message)
        }
        console.log("Grupos cargados (admin):", gruposData?.length || 0, gruposData)

        // Parse horarios for each grupo
        const parsedGrupos = (gruposData || []).map((grupo) => {
          let horarios
          try {
            horarios =
              typeof grupo.horarios === "string"
                ? JSON.parse(grupo.horarios)
                : Array.isArray(grupo.horarios)
                  ? grupo.horarios
                  : []
          } catch (e) {
            console.error("Error parsing horarios for grupo:", grupo.id, e)
            horarios = []
          }
          return {
            ...grupo,
            horarios,
          }
        })
        console.log("Grupos parseados:", parsedGrupos.length, parsedGrupos)

        // Fetch all assignments without filtering
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from(tables.asignaciones)
          .select("*")

        if (asignacionesError) {
          console.error("Error fetching asignaciones:", asignacionesError)
          throw new Error("Error fetching asignaciones: " + asignacionesError.message)
        }
        console.log("Asignaciones cargadas (admin):", asignacionesData?.length || 0, asignacionesData)

        setMaterias(materiasData || [])
        setGrupos(parsedGrupos)
        setAsignaciones(asignacionesData || [])
      } else {
        // Regular users, directors, or coordinators can only see their own data
        let materiasQuery = supabase.from(tables.materias).select("*")

        // Filter by user_id or carrera_id based on role
        if (userRole === "coordinador" && userCarreraId) {
          // Coordinador: filter by carrera
          materiasQuery = materiasQuery.eq("carrera_id", userCarreraId)
        } else if (currentUserId) {
          // Usuario normal, director o profesor: filter by usuario_id
          // Esto asegura que solo vean sus propias materias
          materiasQuery = materiasQuery.eq("usuario_id", currentUserId)
        }

        const { data: materiasData, error: materiasError } = await materiasQuery
        if (materiasError) {
          console.error("Error fetching materias:", materiasError)
          throw new Error("Error fetching materias: " + materiasError.message)
        }
        setMaterias(materiasData || [])

        // If no materias, no need to fetch grupos or asignaciones
        if (!materiasData || materiasData.length === 0) {
          setLoading(false)
          return
        }

        // Get IDs of materias for filtering grupos
        const materiaIds = materiasData.map((m) => m.id)

        // Fetch groups for the user's materias
        const { data: gruposData, error: gruposError } = await supabase
          .from(tables.grupos)
          .select("*")
          .in("materia_id", materiaIds)
        if (gruposError) {
          console.error("Error fetching grupos:", gruposError)
          throw new Error("Error fetching grupos: " + gruposError.message)
        }

        // Parse horarios for each grupo
        const parsedGrupos = (gruposData || []).map((grupo) => ({
          ...grupo,
          horarios:
            typeof grupo.horarios === "string"
              ? JSON.parse(grupo.horarios)
              : Array.isArray(grupo.horarios)
                ? grupo.horarios
                : [],
        }))
        setGrupos(parsedGrupos)

        // If no grupos, no need to fetch asignaciones
        if (!gruposData || gruposData.length === 0) {
          setLoading(false)
          return
        }

        // Get IDs of grupos for filtering asignaciones
        const grupoIds = gruposData.map((g) => g.id)

        // Fetch assignments for the user's grupos
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from(tables.asignaciones)
          .select("*")
          .in("grupo_id", grupoIds)
        if (asignacionesError) {
          console.error("Error fetching asignaciones:", asignacionesError)
          throw new Error("Error fetching asignaciones: " + asignacionesError.message)
        }
        setAsignaciones(asignacionesData || [])
      }

      console.log("Datos cargados correctamente")
      setLoading(false)
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError(error.message || "Error al cargar los datos")
      setLoading(false)
    } finally {
      // Siempre terminar la carga, incluso si hay error
      setLoading(false)
    }
  }

  function generateHorario() {
    console.log("Generando horario para grupo:", selectedGrupo?.numero)
    console.log("Total de grupos disponibles:", grupos.length)

    const gruposDelNumero = grupos.filter((g) => g.numero === selectedGrupo?.numero)
    console.log("Grupos filtrados por número:", gruposDelNumero.length, gruposDelNumero)

    if (gruposDelNumero.length === 0) {
      console.warn("No se encontraron grupos con el número seleccionado")
      return
    }

    const primerGrupo = gruposDelNumero[0]
    const horas = primerGrupo.turno === "MAÑANA" ? horasMañana : horasTarde
    const horarioTemp: Record<string, Record<string, HorarioCell>> = {}

    // Inicializar estructura del horario
    horas.forEach((hora) => {
      horarioTemp[hora] = {}
      dias.forEach((dia) => {
        horarioTemp[hora][dia] = {
          materias: [],
        }
      })
    })

    // Llenar el horario con las asignaciones de todos los grupos
    gruposDelNumero.forEach((grupo) => {
      console.log("Procesando grupo:", grupo.id, "con materia_id:", grupo.materia_id)
      const asignacionesGrupo = asignaciones.filter((a) => a.grupo_id === grupo.id)
      console.log("Asignaciones para este grupo:", asignacionesGrupo.length, asignacionesGrupo)

      asignacionesGrupo.forEach((asignacion) => {
        const materia = materias.find((m) => m.id === asignacion.materia_id)
        if (!materia) {
          console.warn("No se encontró la materia con id:", asignacion.materia_id)
          return
        }

        const profesor = profesores.find((p) => p.id === materia.profesor_id)
        const aula = aulas.find((a) => a.id === asignacion.aula_id)

        console.log("Procesando asignación:", {
          dia: asignacion.dia,
          hora_inicio: asignacion.hora_inicio,
          hora_fin: asignacion.hora_fin,
          materia: materia.nombre,
          profesor: profesor?.nombre || "Sin profesor",
          aula: aula?.nombre || "Sin aula",
        })

        const horaInicio = asignacion.hora_inicio
        const horaFin = asignacion.hora_fin
        const horaIndex = horas.indexOf(horaInicio)
        const horasSpan = horas.indexOf(horaFin) - horaIndex

        console.log("Índices de horas:", { horaIndex, horasSpan, horas })

        if (horaIndex === -1) {
          console.warn("Hora de inicio no encontrada en el array de horas:", horaInicio)
          return
        }

        for (let i = 0; i < horasSpan; i++) {
          const hora = horas[horaIndex + i]
          if (hora && horarioTemp[hora]) {
            horarioTemp[hora][asignacion.dia].materias.push({
              nombre: materia.nombre,
              profesor: profesor?.nombre || "Sin profesor",
              aula: aula?.nombre || (asignacion.aula_id === undefined ? "Pendiente" : "Sin aula"),
              color: getColorForMateria(materia.id),
            })
          }
        }
      })
    })

    console.log("Horario generado:", horarioTemp)
    setHorario(horarioTemp)
  }

  const exportToCSV = () => {
    const gruposDelNumero = grupos.filter((g) => g.numero === selectedGrupo?.numero)
    if (gruposDelNumero.length === 0) return

    const primerGrupo = gruposDelNumero[0]
    const horas = primerGrupo.turno === "MAÑANA" ? horasMañana : horasTarde
    let csv = "Hora," + dias.join(",") + "\n"

    horas.slice(0, -1).forEach((hora, index) => {
      const horaFin = horas[index + 1]
      let row = `${hora}-${horaFin}`

      dias.forEach((dia) => {
        const cell = horario[hora]?.[dia]
        // Fix: Properly escape the newlines for CSV format
        const cellContent = cell?.materias.map((m) => `${m.nombre}\\n${m.profesor}\\n${m.aula}`).join("\\n---\\n") || ""
        row += `,"${cellContent}"`
      })

      csv += row + "\n"
    })

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `horario_grupo_${selectedGrupo?.numero}_${getPeriodName(activeCycle)}.csv`
    link.click()
  }

  const exportToPDF = async () => {
    const element = horarioRef.current
    if (!element) return

    try {
      // Crear un contenedor temporal para el horario
      const tempContainer = document.createElement("div")
      tempContainer.style.position = "absolute"
      tempContainer.style.left = "-9999px"
      tempContainer.style.top = "-9999px"
      document.body.appendChild(tempContainer)

      // Clonar el elemento del horario
      const clone = element.cloneNode(true) as HTMLElement
      tempContainer.appendChild(clone)

      // Forzar modo claro para el PDF
      clone.classList.remove("dark")
      clone.style.colorScheme = "light"

      // Aplicar estilos específicos para PDF
      clone.style.width = "1600px"
      clone.style.padding = "20px"
      clone.style.backgroundColor = "white"
      clone.style.color = "black"

      // Asegurar que todos los textos sean oscuros
      const allText = clone.querySelectorAll("*")
      allText.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.color = getComputedStyle(el).color
          if (el.classList.contains("text-muted-foreground")) {
            el.style.color = "#666666"
          }
          if (el.classList.contains("text-primary")) {
            el.style.color = "#1a237e"
          }
        }
      })

      // Asegurar que todas las celdas tengan el mismo ancho
      const cells = clone.querySelectorAll("td")
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          cell.style.width = "200px"
          cell.style.maxWidth = "200px"
          cell.style.minWidth = "200px"
          cell.style.height = "100px"
          cell.style.maxHeight = "100px"
          cell.style.boxSizing = "border-box"
          cell.style.padding = "8px"
        }
      })

      // Asegurar que todos los contenedores de materias tengan el mismo tamaño
      // y que los textos no se corten
      const materiaContainers = clone.querySelectorAll("td > div")
      materiaContainers.forEach((container) => {
        if (container instanceof HTMLElement) {
          container.style.width = "100%"
          container.style.height = "100%"
          container.style.margin = "0"
          container.style.boxSizing = "border-box"
          container.style.padding = "10px"
          container.style.display = "flex"
          container.style.flexDirection = "column"
          container.style.justifyContent = "center"
          container.style.overflow = "visible"
          container.style.wordBreak = "break-word"
          container.style.whiteSpace = "normal"
          container.style.borderRadius = "4px"
        }
      })

      // Ajustar el estilo de los textos dentro de los contenedores
      const materiaNombres = clone.querySelectorAll("td > div > div:first-child")
      materiaNombres.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.fontSize = "16px"
          el.style.fontWeight = "bold"
          el.style.marginBottom = "6px"
          el.style.lineHeight = "1.2"
          el.style.overflow = "visible"
          el.style.whiteSpace = "normal"
          el.style.wordBreak = "break-word"
          el.classList.remove("truncate")
          el.style.maxHeight = "none"
          el.style.WebkitLineClamp = "unset"
        }
      })

      const profesorNombres = clone.querySelectorAll("td > div > div:nth-child(2)")
      profesorNombres.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.fontSize = "14px"
          el.style.marginBottom = "4px"
          el.style.lineHeight = "1.2"
          el.style.overflow = "visible"
          el.style.whiteSpace = "normal"
          el.style.wordBreak = "break-word"
          el.classList.remove("truncate")
          el.style.maxHeight = "none"
          el.style.WebkitLineClamp = "unset"
        }
      })

      const aulaNombres = clone.querySelectorAll("td > div > div:nth-child(3)")
      aulaNombres.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.fontSize = "14px"
          el.style.fontWeight = "bold"
          el.style.overflow = "visible"
          el.style.whiteSpace = "normal"
          el.style.wordBreak = "break-word"
          el.classList.remove("truncate")
          el.style.maxHeight = "none"
          el.style.WebkitLineClamp = "unset"
        }
      })

      // Optimizar la configuración de html2canvas
      const canvas = await html2canvas(clone, {
        scale: 3, // Aumentado para mejor calidad
        useCORS: true,
        logging: false,
        width: 1600,
        height: clone.offsetHeight,
        backgroundColor: "#ffffff",
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Optimizar imágenes en el clon antes de renderizar
          const images = clonedDoc.getElementsByTagName("img")
          for (const img of Array.from(images)) {
            img.style.imageRendering = "optimizeQuality"
          }
        },
      })

      // Eliminar el contenedor temporal
      document.body.removeChild(tempContainer)

      // Optimizar la calidad de la imagen del canvas
      const optimizedDataUrl = canvas.toDataURL("image/jpeg", 1.0) // Calidad máxima

      // Crear PDF con configuración optimizada
      const pageWidth = 11
      const pageHeight = 8.5
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: [pageHeight, pageWidth],
        compress: true,
        putOnlyUsedFonts: true,
      })

      const imgWidth = pageWidth - 0.5
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const x = (pageWidth - imgWidth) / 2
      const y = (pageHeight - imgHeight) / 2

      // Agregar la imagen optimizada al PDF
      pdf.addImage(optimizedDataUrl, "JPEG", x, y, imgWidth, imgHeight, undefined, "FAST")

      // Optimizar el PDF final
      const pdfOutput = pdf.output("arraybuffer")
      const pdfBlob = new Blob([pdfOutput], { type: "application/pdf" })
      const pdfUrl = URL.createObjectURL(pdfBlob)

      // Crear un link temporal para la descarga
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = `horario_grupo_${selectedGrupo?.numero}_${getPeriodName(activeCycle)}.pdf`
      link.click()

      // Limpiar
      URL.revokeObjectURL(pdfUrl)
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un error al generar el PDF. Por favor, intente de nuevo.",
      })
    }
  }

  // Agregar esta función antes del return
  const handleModificarClick = () => {
    setEditConfig({ ...config })
    setIsEditModalOpen(true)
  }

  const handleSaveConfig = () => {
    setConfig(editConfig)
    setIsEditModalOpen(false)
    toast({
      title: "Configuración guardada",
      description: "Los cambios en la configuración se han guardado correctamente.",
    })
  }

  // Manejar cambios en los filtros
  const handleFiltroChange = (key: keyof FiltrosHorario, value: any) => {
    setFiltros((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltros({
      turno: null,
      busqueda: "",
      soloConAula: false,
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Cargando datos de horarios...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="bg-[#0f172a] text-white border-none">
      <CardContent className="p-2 sm:p-6">
        {/* Tabs para seleccionar el ciclo */}
        <Tabs defaultValue={activeCycle} onValueChange={setActiveCycle} className="mb-6">
          <TabsList className="w-full bg-[#1e293b] border-b border-[#334155]">
            <TabsTrigger value="1" className="flex-1 data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white">
              Enero-Abril
            </TabsTrigger>
            <TabsTrigger value="2" className="flex-1 data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white">
              Mayo-Agosto
            </TabsTrigger>
            <TabsTrigger value="3" className="flex-1 data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white">
              Septiembre-Diciembre
            </TabsTrigger>
          </TabsList>

          {/* Contenido para todos los tabs */}
          <div className="mt-4">
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {autoRefreshAttempts > 0 && materias.length === 0 && !loading && (
                    <span className="text-xs text-gray-400 animate-pulse mr-2">
                      Recargando datos ({autoRefreshAttempts}/2)...
                    </span>
                  )}

                  {/* Barra de búsqueda y filtros */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-[200px]">
                      <Input
                        placeholder="Buscar grupo..."
                        value={filtros.busqueda}
                        onChange={(e) => handleFiltroChange("busqueda", e.target.value)}
                        className="pl-8 bg-[#1e293b] border-[#334155] text-white"
                      />
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className={`bg-[#1e293b] border-[#334155] hover:bg-[#2d3748] ${
                            filtros.turno || filtros.soloConAula ? "text-[#3b82f6]" : "text-white"
                          }`}
                        >
                          <Filter className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] bg-[#1e293b] border-[#334155] text-white">
                        <div className="space-y-4">
                          <h4 className="font-medium">Filtros</h4>

                          <div className="space-y-2">
                            <Label htmlFor="turno">Turno</Label>
                            <select
                              id="turno"
                              value={filtros.turno || ""}
                              onChange={(e) => handleFiltroChange("turno", e.target.value || null)}
                              className="w-full h-9 rounded-md border border-[#334155] bg-[#1e293b] px-3 py-1 text-sm text-white"
                            >
                              <option value="">Todos</option>
                              <option value="MAÑANA">Mañana</option>
                              <option value="TARDE">Tarde</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="soloConAula"
                              checked={filtros.soloConAula}
                              onCheckedChange={(checked) => handleFiltroChange("soloConAula", checked === true)}
                              className="border-[#334155] data-[state=checked]:bg-[#3b82f6]"
                            />
                            <label
                              htmlFor="soloConAula"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Solo con aula asignada
                            </label>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={limpiarFiltros}
                            className="w-full mt-2 border-[#334155] hover:bg-[#2d3748] text-white"
                          >
                            Limpiar filtros
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <select
                      className="h-10 rounded-md border border-[#334155] bg-[#1e293b] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 hover:border-blue-400 cursor-pointer shadow-sm"
                      value={selectedGrupo?.numero || ""}
                      onChange={(e) => {
                        const grupo = grupos.find((g) => g.numero === e.target.value)
                        setSelectedGrupo(grupo || null)
                      }}
                    >
                      <option value="">Seleccionar Grupo</option>
                      {uniqueGrupos.map((numero) => {
                        const grupo = grupos.find((g) => g.numero === numero)
                        return (
                          <option key={numero} value={numero}>
                            Grupo {numero} ({grupo?.turno})
                          </option>
                        )
                      })}
                    </select>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={refreshData}
                      disabled={refreshing}
                      title="Refrescar datos manualmente (solo si es necesario)"
                      className="bg-[#1e293b] border-[#334155] hover:bg-[#2d3748] text-white"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="sr-only">Refrescar datos</span>
                    </Button>
                  </div>
                </div>

                {selectedGrupo && (
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="bg-[#3b82f6] hover:bg-[#60a5fa] text-white border-none flex items-center gap-1.5 px-4 py-2 h-10 rounded-md"
                          onClick={() => {
                            setEditConfig({ ...config })
                            setIsEditModalOpen(true)
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                          Modificar Información
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-[#0f1c3a] text-white border-none">
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Configuración del Horario</DialogTitle>
                          <DialogDescription className="text-sm sm:text-base text-gray-300">
                            Ajusta la información que aparecerá en el encabezado y pie de página del horario.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="nombreUniversidad" className="text-white">
                                Nombre de la Universidad
                              </Label>
                              <Input
                                id="nombreUniversidad"
                                value={editConfig.nombreUniversidad}
                                onChange={(e) => setEditConfig({ ...editConfig, nombreUniversidad: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nombreDireccion" className="text-white">
                                Nombre de la Dirección
                              </Label>
                              <Input
                                id="nombreDireccion"
                                value={editConfig.nombreDireccion}
                                onChange={(e) => setEditConfig({ ...editConfig, nombreDireccion: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="direccionUniversidad" className="text-white">
                              Dirección de la Universidad
                            </Label>
                            <Input
                              id="direccionUniversidad"
                              value={editConfig.direccionUniversidad}
                              onChange={(e) => setEditConfig({ ...editConfig, direccionUniversidad: e.target.value })}
                              className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="director" className="text-white">
                                Director de Programa Educativo
                              </Label>
                              <Input
                                id="director"
                                value={editConfig.director}
                                onChange={(e) => setEditConfig({ ...editConfig, director: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="secretario" className="text-white">
                                Secretario Académico
                              </Label>
                              <Input
                                id="secretario"
                                value={editConfig.secretario}
                                onChange={(e) => setEditConfig({ ...editConfig, secretario: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="recursosHumanos" className="text-white">
                                Recursos Humanos
                              </Label>
                              <Input
                                id="recursosHumanos"
                                value={editConfig.recursosHumanos}
                                onChange={(e) => setEditConfig({ ...editConfig, recursosHumanos: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="periodo" className="text-white">
                                Periodo Actual
                              </Label>
                              <Input
                                id="periodo"
                                value={editConfig.periodo}
                                onChange={(e) => setEditConfig({ ...editConfig, periodo: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="fechaRevision" className="text-white">
                                Fecha de Revisión
                              </Label>
                              <Input
                                id="fechaRevision"
                                value={editConfig.fechaRevision}
                                onChange={(e) => setEditConfig({ ...editConfig, fechaRevision: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="numeroRevision" className="text-white">
                                Número de Revisión
                              </Label>
                              <Input
                                id="numeroRevision"
                                value={editConfig.numeroRevision}
                                onChange={(e) => setEditConfig({ ...editConfig, numeroRevision: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="codigoDocumento" className="text-white">
                                Código de Documento
                              </Label>
                              <Input
                                id="codigoDocumento"
                                value={editConfig.codigoDocumento}
                                onChange={(e) => setEditConfig({ ...editConfig, codigoDocumento: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="fecha" className="text-white">
                                Fecha
                              </Label>
                              <Input
                                id="fecha"
                                value={editConfig.fecha}
                                onChange={(e) => setEditConfig({ ...editConfig, fecha: e.target.value })}
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="horasFrenteGrupo" className="text-white">
                                Horas Frente a Grupo
                              </Label>
                              <Input
                                id="horasFrenteGrupo"
                                type="number"
                                value={editConfig.horasFrenteGrupo}
                                onChange={(e) =>
                                  setEditConfig({ ...editConfig, horasFrenteGrupo: Number.parseInt(e.target.value) })
                                }
                                className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="logoUrl" className="text-white">
                              URL del Logo
                            </Label>
                            <Input
                              id="logoUrl"
                              value={editConfig.logoUrl}
                              onChange={(e) => setEditConfig({ ...editConfig, logoUrl: e.target.value })}
                              className="bg-[#1a2d5a] border-[#2a3d6a] text-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsEditModalOpen(false)}
                            className="bg-transparent hover:bg-[#2a3d6a] text-white border-white hover:border-white"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => {
                              setConfig(editConfig)
                              setIsEditModalOpen(false)
                              toast({
                                title: "Configuración guardada",
                                description: "Los cambios en la configuración se han guardado correctamente.",
                              })
                            }}
                            className="bg-[#f59e0b] hover:bg-[#d97706] text-white"
                          >
                            Guardar Cambios
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      onClick={exportToCSV}
                      className="bg-[#22c55e] hover:bg-[#16a34a] text-white border-none flex items-center gap-1.5 px-4 py-2 h-10 rounded-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        <path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <path d="M10 10v4" />
                        <path d="M14 12h-4" />
                        <path d="M14 16h-4" />
                      </svg>
                      Exportar CSV
                    </Button>

                    <Button
                      variant="outline"
                      onClick={exportToPDF}
                      className="bg-[#ef4444] hover:bg-[#dc2626] text-white border-none flex items-center gap-1.5 px-4 py-2 h-10 rounded-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Exportar PDF
                    </Button>
                  </div>
                )}

                {grupos.length === 0 && (
                  <Alert variant="warning" className="mt-2 bg-amber-900/20 text-amber-200 border-amber-800">
                    <AlertDescription>
                      No se han encontrado grupos en el periodo seleccionado. Por favor, verifica que existan grupos
                      creados.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {isUserAdmin && (
                    <Alert variant="info" className="mb-0 py-1 px-3 bg-blue-900/20 text-blue-200 border-blue-800">
                      <AlertDescription className="text-xs flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        Modo administrador: Acceso a todos los horarios
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {selectedGrupo ? (
                <div ref={horarioRef} className="bg-white overflow-x-auto -mx-2 sm:mx-0">
                  <div className="min-w-[800px] lg:w-full">
                    {/* Header */}
                    <div className="mb-6 border-b pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-4">
                          <Image
                            src={config.logoUrl || "/placeholder.svg"}
                            alt="Logo Universidad"
                            width={120}
                            height={60}
                            className="object-contain"
                          />
                          <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-[#1a237e]">{config.nombreUniversidad}</h1>
                            <h2 className="text-lg text-[#1a237e]">{config.nombreDireccion}</h2>
                            <div className="mt-2 bg-[#e8eaf6] text-[#1a237e] px-4 py-1 rounded-full inline-block w-fit">
                              {selectedGrupo.numero}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 text-right">
                          <p>Hrs. Frente a Grupo: {config.horasFrenteGrupo}</p>
                          <p>Fecha: {config.fecha}</p>
                          <p>Periodo: {config.periodo}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        <p>{config.direccionUniversidad}</p>
                      </div>
                    </div>

                    {/* Horario Table - Modified to preserve light mode appearance */}
                    <div className="rounded-md border bg-white" id="horario-table">
                      <Table className="table-fixed">
                        <TableHeader>
                          <TableRow className="bg-white">
                            <TableHead className="w-[100px] text-base text-black">Hora</TableHead>
                            {dias.map((dia) => (
                              <TableHead
                                key={dia}
                                className="text-center text-base text-black w-[200px]"
                                style={{ width: "200px" }}
                              >
                                {dia}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                          {Object.entries(horario).map(([hora, horaData], index, array) => {
                            if (index === array.length - 1) return null
                            const horaFin = array[index + 1]?.[0]
                            return (
                              <TableRow key={hora} className="bg-white">
                                <TableCell className="font-medium text-base text-black border-slate-200">
                                  {hora} - {horaFin}
                                </TableCell>
                                {dias.map((dia) => (
                                  <TableCell
                                    key={`${hora}-${dia}`}
                                    className="text-center align-top p-2 w-[200px] h-[100px] bg-white border-slate-200"
                                    style={{ width: "200px", height: "100px", maxWidth: "200px", maxHeight: "100px" }}
                                  >
                                    {horaData[dia].materias.map((materia, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 rounded-md h-full flex flex-col justify-center"
                                        style={{
                                          backgroundColor: materia.color,
                                          height: "100%",
                                          width: "100%",
                                        }}
                                      >
                                        <div
                                          className="font-medium text-gray-900 text-base leading-tight mb-1"
                                          style={{
                                            fontSize: "15px",
                                            wordBreak: "break-word",
                                            whiteSpace: "normal",
                                            overflow: "hidden",
                                            display: "-webkit-box",
                                            WebkitLineClamp: "2",
                                            WebkitBoxOrient: "vertical",
                                          }}
                                        >
                                          {materia.nombre}
                                        </div>
                                        <div
                                          className="text-sm text-gray-800 mb-1"
                                          style={{
                                            fontSize: "13px",
                                            wordBreak: "break-word",
                                            whiteSpace: "normal",
                                            overflow: "hidden",
                                            display: "-webkit-box",
                                            WebkitLineClamp: "1",
                                            WebkitBoxOrient: "vertical",
                                          }}
                                        >
                                          {materia.profesor}
                                        </div>
                                        <div
                                          className="text-sm font-medium text-gray-900"
                                          style={{
                                            fontSize: "13px",
                                            wordBreak: "break-word",
                                            whiteSpace: "normal",
                                            overflow: "hidden",
                                            display: "-webkit-box",
                                            WebkitLineClamp: "1",
                                            WebkitBoxOrient: "vertical",
                                          }}
                                        >
                                          {materia.aula}
                                        </div>
                                      </div>
                                    ))}
                                  </TableCell>
                                ))}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Footer - Modified for dark mode visibility */}
                    <div className="mt-6 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-8 mb-4">
                        <div className="text-center">
                          <div className="font-medium mb-8 text-black">DIRECTOR DE PROGRAMA EDUCATIVO</div>
                          <div className="border-t border-black pt-2">
                            <div className="text-sm text-black">{config.director}</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium mb-8 text-black">SECRETARIO ACADÉMICO</div>
                          <div className="border-t border-black pt-2">
                            <div className="text-sm text-black">{config.secretario}</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium mb-8 text-black">RECURSOS HUMANOS</div>
                          <div className="border-t border-black pt-2">
                            <div className="text-sm text-black">{config.recursosHumanos}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-black mt-4">
                        <p className="font-medium">NOTA: ES UNA HOJA DE CONCENTRADO DE HORAS DEL PROFESOR</p>
                        <p>
                          CUALQUIER VARIACIÓN EN EL HORARIO FAVOR DE NOTIFICARLA POR ESCRITO AL DEPTO. DE RECURSOS
                          HUMANOS DURANTE LAS 48 HORAS SIGUIENTES AL CAMBIO.
                        </p>
                      </div>
                      <div className="text-sm text-black mt-4 flex justify-between">
                        <div>Fecha de Revisión: {config.fechaRevision}</div>
                        <div>Revisión Num. {config.numeroRevision}</div>
                        <div>{config.codigoDocumento}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 space-y-6 bg-gradient-to-b from-blue-950/30 to-[#0f172a] rounded-lg border border-dashed border-[#334155] min-h-[500px]">
                  <div className="flex flex-col items-center text-center space-y-2 max-w-md">
                    <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-calendar-days"
                      >
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                        <line x1="16" x2="16" y1="2" y2="6" />
                        <line x1="8" x2="8" y1="2" y2="6" />
                        <line x1="3" x2="21" y1="10" y2="10" />
                        <path d="M8 14h.01" />
                        <path d="M12 14h.01" />
                        <path d="M16 14h.01" />
                        <path d="M8 18h.01" />
                        <path d="M12 18h.01" />
                        <path d="M16 18h.01" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-white">Visualizador de Horarios</h3>
                    <p className="text-gray-400">
                      Selecciona un grupo del menú desplegable para visualizar su horario completo. Podrás ver todas las
                      materias, profesores y aulas asignadas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
                    <div className="flex flex-col items-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-400 mb-2"
                      >
                        <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 1-2 2v3" />
                        <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
                        <path d="M4 12H2" />
                        <path d="M10 12H8" />
                        <path d="M16 12h-2" />
                        <path d="M22 12h-2" />
                      </svg>
                      <h4 className="font-semibold text-white">Vista Semanal</h4>
                      <p className="text-sm text-center text-gray-400">
                        Visualiza el horario completo de lunes a viernes
                      </p>
                    </div>

                    <div className="flex flex-col items-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-400 mb-2"
                      >
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                        <line x1="16" x2="16" y1="2" y2="6" />
                        <line x1="8" x2="8" y1="2" y2="6" />
                        <line x1="3" x2="21" y1="10" y2="10" />
                        <path d="M8 14h.01" />
                        <path d="M12 14h.01" />
                        <path d="M16 14h.01" />
                        <path d="M8 18h.01" />
                        <path d="M12 18h.01" />
                        <path d="M16 18h.01" />
                      </svg>
                      <h4 className="font-semibold text-white">Exportación</h4>
                      <p className="text-sm text-center text-gray-400">Descarga el horario en formato PDF o CSV</p>
                    </div>

                    <div className="flex flex-col items-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-400 mb-2"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      <h4 className="font-semibold text-white">Personalización</h4>
                      <p className="text-sm text-center text-gray-400">
                        Configura la información del encabezado y pie de página
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center mt-4 p-4 rounded-lg bg-blue-950/30 text-blue-300 max-w-md">
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
                      className="mr-2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                    <p className="text-sm">
                      Los horarios se generan automáticamente a partir de las asignaciones de aulas realizadas en el
                      sistema.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
