"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, BookOpen, School, Calendar, TrendingUp, BarChart3, PieChart, Activity, User } from "lucide-react"

interface DashboardProps {
  selectedPeriod: string
  onNavigate: (section: string) => void
  userRole?: string | null
  userCarreraId?: string | null
  isUserAdmin?: boolean
  currentUserId?: string | null
}

export default function Dashboard({ selectedPeriod, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    profesores: 0,
    materias: 0,
    grupos: 0,
    aulas: 0,
    asignaciones: 0,
    porcentajeAsignado: 0,
  })
  const [loading, setLoading] = useState(true)
  const [periodoNombre, setPeriodoNombre] = useState("")
  const [distribucionTurnos, setDistribucionTurnos] = useState({ mañana: 0, tarde: 0 })
  const [distribucionDias, setDistribucionDias] = useState({
    Lunes: 0,
    Martes: 0,
    Miércoles: 0,
    Jueves: 0,
    Viernes: 0,
  })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userCarreraId, setUserCarreraId] = useState<number | null>(null)
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userMateriaCount, setUserMateriaCount] = useState(0)
  const [userGrupoCount, setUserGrupoCount] = useState(0)
  const [userAsignacionCount, setUserAsignacionCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  const fetchStats = useCallback(async () => {
    setLoading(true)

    try {
      if (!selectedPeriod) {
        throw new Error("No se ha seleccionado un periodo académico")
      }

      const tables = getTableNamesByPeriod(selectedPeriod)

      // Fetch user data first
      const { data: userData, error: userError } = await supabase.from("usuarios").select("*").eq("id", currentUserId)

      // Manejar el caso de múltiples registros o ninguno
      if (userError) {
        console.error("Error fetching user data:", userError)
      } else if (userData && userData.length > 0) {
        // Tomar el primer registro si hay múltiples
        setUserName(userData[0].nombre)
        console.log("Usuario encontrado:", userData[0])
      } else {
        console.log("No se encontró información de usuario para ID:", currentUserId)
      }

      // Fetch counts based on user role
      if (isUserAdmin) {
        // Admin can see everything - global stats
        const [profesoresCount, materiasCount, gruposCount, aulasCount, asignacionesCount] = await Promise.all([
          supabase.from("profesores").select("id", { count: "exact", head: true }),
          supabase.from(tables.materias).select("id", { count: "exact", head: true }),
          supabase.from(tables.grupos).select("id", { count: "exact", head: true }),
          supabase.from("aulas").select("id", { count: "exact", head: true }),
          supabase.from(tables.asignaciones).select("id", { count: "exact", head: true }),
        ])

        // Calcular porcentaje de asignación
        const gruposTotal = gruposCount.count || 0
        const asignacionesTotal = asignacionesCount.count || 0
        // Limitar el porcentaje a un máximo de 100%
        const porcentajeAsignado =
          gruposTotal > 0 ? Math.min(100, Math.round((asignacionesTotal / gruposTotal) * 100)) : 0

        setStats({
          profesores: profesoresCount.count || 0,
          materias: materiasCount.count || 0,
          grupos: gruposCount.count || 0,
          aulas: aulasCount.count || 0,
          asignaciones: asignacionesTotal,
          porcentajeAsignado,
        })

        // Fetch global distribution data
        await fetchDistribucionTurnos()
        await fetchDistribucionDias()
      } else {
        // Director or regular user - personalized stats
        // Regular users or coordinators can only see their own data
        let materiasQuery = supabase.from(tables.materias).select("id", { count: "exact", head: true })

        // Filter by user_id for directors and regular users
        if (currentUserId) {
          materiasQuery = materiasQuery.eq("usuario_id", currentUserId)
        }

        const { count: materiasCount } = await materiasQuery

        // Store user's personal materia count
        setUserMateriaCount(materiasCount || 0)

        // Get the user's materias
        const { data: materiasData } = await supabase.from(tables.materias).select("id").eq("usuario_id", currentUserId)

        // Get grupos for the user's materias
        const materiaIds = materiasData?.map((m) => m.id) || []

        let gruposCount = 0
        if (materiaIds.length > 0) {
          const { count: gruposTotal } = await supabase
            .from(tables.grupos)
            .select("id", { count: "exact", head: true })
            .in("materia_id", materiaIds)

          gruposCount = gruposTotal || 0
        }

        // Store user's personal grupo count
        setUserGrupoCount(gruposCount)

        // Get asignaciones for the user's materias
        let asignacionesCount = 0
        if (materiaIds.length > 0) {
          const { count: asignacionesTotal } = await supabase
            .from(tables.asignaciones)
            .select("id", { count: "exact", head: true })
            .in("materia_id", materiaIds)

          asignacionesCount = asignacionesTotal || 0
        }

        // Store user's personal asignacion count
        setUserAsignacionCount(asignacionesCount)

        // Calculate personal assignment percentage
        const porcentajeAsignado =
          gruposCount > 0 ? Math.min(100, Math.round((asignacionesCount / gruposCount) * 100)) : 0

        // Get total counts for comparison
        const [profesoresCount, aulasCount] = await Promise.all([
          supabase.from("profesores").select("id", { count: "exact", head: true }),
          supabase.from("aulas").select("id", { count: "exact", head: true }),
        ])

        setStats({
          profesores: profesoresCount.count || 0,
          materias: materiasCount || 0,
          grupos: gruposCount,
          aulas: aulasCount.count || 0,
          asignaciones: asignacionesCount,
          porcentajeAsignado,
        })

        // Fetch personal distribution data
        await fetchPersonalDistribucionTurnos(materiaIds)
        await fetchPersonalDistribucionDias(materiaIds)

        // Fetch recent activity for this user
        await fetchRecentActivity(currentUserId)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, userRole, userCarreraId, isUserAdmin, currentUserId])

  const fetchRecentActivity = async (userId: string | null) => {
    if (!userId || !selectedPeriod) return

    const tables = getTableNamesByPeriod(selectedPeriod)

    try {
      // Get user's recent materias (last 5)
      const { data: recentMaterias } = await supabase
        .from(tables.materias)
        .select("nombre, created_at")
        .eq("usuario_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)

      // Format the activity data
      const activities = (recentMaterias || []).map((materia) => ({
        type: "materia",
        name: materia.nombre,
        date: new Date(materia.created_at).toLocaleDateString(),
        action: "creada",
      }))

      setRecentActivity(activities)
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    }
  }

  const fetchPeriodoNombre = async () => {
    try {
      const { data, error } = await supabase.from("periodos").select("nombre").eq("id", selectedPeriod).single()

      if (error) throw error
      if (data) setPeriodoNombre(data.nombre)
    } catch (error) {
      console.error("Error fetching periodo:", error)
    }
  }

  useEffect(() => {
    async function fetchUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)

        // Get user role from database
        const { data, error } = await supabase.from("usuarios").select("rol, carrera_id").eq("id", user.id)

        if (!error && data && data.length > 0) {
          // Tomar el primer registro si hay múltiples
          setUserRole(data[0].rol)
          setUserCarreraId(data[0].carrera_id)
          setIsUserAdmin(data[0].rol === "admin")
          console.log("Rol de usuario cargado:", data[0].rol)
        } else {
          console.log("No se encontró rol de usuario o hubo un error:", error)
        }
      }
    }

    fetchUserData()
  }, [])

  useEffect(() => {
    // Asegurar que se carguen los datos incluso si selectedPeriod ya está establecido
    if (currentUserId !== null) {
      fetchStats()
      fetchPeriodoNombre()
    }
  }, [selectedPeriod, fetchStats, currentUserId])

  const fetchDistribucionTurnos = async () => {
    try {
      if (!selectedPeriod) return

      const tables = getTableNamesByPeriod(selectedPeriod)

      const { data, error } = await supabase.from(tables.grupos).select("turno")

      if (error) throw error

      const mañana = data?.filter((g) => g.turno === "MAÑANA").length || 0
      const tarde = data?.filter((g) => g.turno === "TARDE").length || 0

      setDistribucionTurnos({ mañana, tarde })
    } catch (error) {
      console.error("Error fetching turnos:", error)
    }
  }

  const fetchPersonalDistribucionTurnos = async (materiaIds: number[]) => {
    try {
      if (!selectedPeriod || materiaIds.length === 0) return

      const tables = getTableNamesByPeriod(selectedPeriod)

      const { data, error } = await supabase.from(tables.grupos).select("turno").in("materia_id", materiaIds)

      if (error) throw error

      const mañana = data?.filter((g) => g.turno === "MAÑANA").length || 0
      const tarde = data?.filter((g) => g.turno === "TARDE").length || 0

      setDistribucionTurnos({ mañana, tarde })
    } catch (error) {
      console.error("Error fetching personal turnos:", error)
    }
  }

  const fetchDistribucionDias = async () => {
    try {
      if (!selectedPeriod) return

      const tables = getTableNamesByPeriod(selectedPeriod)

      const { data, error } = await supabase.from(tables.asignaciones).select("dia")

      if (error) throw error

      const distribucion = {
        Lunes: data?.filter((a) => a.dia === "Lunes").length || 0,
        Martes: data?.filter((a) => a.dia === "Martes").length || 0,
        Miércoles: data?.filter((a) => a.dia === "Miércoles").length || 0,
        Jueves: data?.filter((a) => a.dia === "Jueves").length || 0,
        Viernes: data?.filter((a) => a.dia === "Viernes").length || 0,
      }

      setDistribucionDias(distribucion)
    } catch (error) {
      console.error("Error fetching distribución por días:", error)
    }
  }

  const fetchPersonalDistribucionDias = async (materiaIds: number[]) => {
    try {
      if (!selectedPeriod || materiaIds.length === 0) return

      const tables = getTableNamesByPeriod(selectedPeriod)

      const { data, error } = await supabase.from(tables.asignaciones).select("dia").in("materia_id", materiaIds)

      if (error) throw error

      const distribucion = {
        Lunes: data?.filter((a) => a.dia === "Lunes").length || 0,
        Martes: data?.filter((a) => a.dia === "Martes").length || 0,
        Miércoles: data?.filter((a) => a.dia === "Miércoles").length || 0,
        Jueves: data?.filter((a) => a.dia === "Jueves").length || 0,
        Viernes: data?.filter((a) => a.dia === "Viernes").length || 0,
      }

      setDistribucionDias(distribucion)
    } catch (error) {
      console.error("Error fetching personal distribución por días:", error)
    }
  }

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

  // Función para obtener el color de la barra según el valor
  const getProgressColor = (value: number) => {
    if (value < 30) return "bg-red-500"
    if (value < 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  // Función para obtener el máximo valor en la distribución de días
  const getMaxDiaValue = () => {
    return Math.max(...Object.values(distribucionDias))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!selectedPeriod) {
    return (
      <Alert>
        <AlertDescription>Por favor, selecciona un periodo académico para ver el dashboard.</AlertDescription>
      </Alert>
    )
  }

  // Render different dashboards based on user role
  if (isUserAdmin) {
    // Admin Dashboard - Global View
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Panel de Control</h1>
            <p className="text-muted-foreground mt-1">
              Bienvenido al sistema de asignación de aulas - Periodo: {periodoNombre}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onNavigate("asignacion")} className="flex items-center gap-2">
              <School className="h-4 w-4" />
              Ir a Asignación
            </Button>
            <Button onClick={() => onNavigate("horarios")} className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ver Horarios
            </Button>
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Profesores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.profesores}</div>
              <p className="text-xs text-muted-foreground">Profesores registrados en el sistema</p>
            </CardContent>
            <CardFooter className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-xs"
                onClick={() => onNavigate("profesores")}
              >
                Ver profesores
                <span>→</span>
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Materias</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.materias}</div>
              <p className="text-xs text-muted-foreground">Materias en el periodo actual</p>
            </CardContent>
            <CardFooter className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-xs"
                onClick={() => onNavigate("materias-grupos")}
              >
                Ver materias
                <span>→</span>
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Grupos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.grupos}</div>
              <p className="text-xs text-muted-foreground">Grupos en el periodo actual</p>
            </CardContent>
            <CardFooter className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-xs"
                onClick={() => onNavigate("materias-grupos")}
              >
                Ver grupos
                <span>→</span>
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aulas</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aulas}</div>
              <p className="text-xs text-muted-foreground">Aulas disponibles</p>
            </CardContent>
            <CardFooter className="p-2">
              <Button variant="ghost" className="w-full justify-between text-xs" onClick={() => onNavigate("aulas")}>
                Ver aulas
                <span>→</span>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Gráficos y estadísticas adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progreso de asignación */}
          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Progreso de Asignación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Grupos con aula asignada</span>
                  <span className="font-medium">{stats.porcentajeAsignado}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(stats.porcentajeAsignado)} transition-all duration-500`}
                    style={{ width: `${stats.porcentajeAsignado}%` }}
                  ></div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total de grupos</p>
                    <p className="text-xl font-bold">{stats.grupos}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Asignaciones</p>
                    <p className="text-xl font-bold">{stats.asignaciones}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribución por turnos */}
          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Distribución por Turnos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[180px]">
                <div className="w-full max-w-xs">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-web mr-2"></div>
                      <span className="text-sm">Mañana</span>
                    </div>
                    <span className="text-sm font-medium">{distribucionTurnos.mañana} grupos</span>
                  </div>
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
                    <div
                      className="h-full bg-orange-web rounded-full"
                      style={{
                        width: `${
                          distribucionTurnos.mañana + distribucionTurnos.tarde > 0
                            ? (distribucionTurnos.mañana / (distribucionTurnos.mañana + distribucionTurnos.tarde)) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <span className="text-sm">Tarde</span>
                    </div>
                    <span className="text-sm font-medium">{distribucionTurnos.tarde} grupos</span>
                  </div>
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${
                          distribucionTurnos.mañana + distribucionTurnos.tarde > 0
                            ? (distribucionTurnos.tarde / (distribucionTurnos.mañana + distribucionTurnos.tarde)) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribución por días */}
          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Distribución por Días
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(distribucionDias).map(([dia, valor]) => (
                  <div key={dia} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{dia}</span>
                      <span className="font-medium">{valor} clases</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${getMaxDiaValue() > 0 ? (valor / getMaxDiaValue()) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resumen del periodo */}
          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Resumen del Periodo {periodoNombre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Estadísticas Generales</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Profesores:</span>
                      <span className="font-medium">{stats.profesores}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Materias:</span>
                      <span className="font-medium">{stats.materias}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Grupos:</span>
                      <span className="font-medium">{stats.grupos}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Aulas:</span>
                      <span className="font-medium">{stats.aulas}</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Distribución de Turnos</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Mañana:</span>
                      <span className="font-medium">{distribucionTurnos.mañana} grupos</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Tarde:</span>
                      <span className="font-medium">{distribucionTurnos.tarde} grupos</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Ratio:</span>
                      <span className="font-medium">
                        {distribucionTurnos.mañana + distribucionTurnos.tarde > 0
                          ? `${Math.round(
                              (distribucionTurnos.mañana / (distribucionTurnos.mañana + distribucionTurnos.tarde)) *
                                100,
                            )}% / ${Math.round(
                              (distribucionTurnos.tarde / (distribucionTurnos.mañana + distribucionTurnos.tarde)) * 100,
                            )}%`
                          : "N/A"}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Asignación de Aulas</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Asignados:</span>
                      <span className="font-medium">{stats.asignaciones}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Pendientes:</span>
                      <span className="font-medium">{Math.max(0, stats.grupos - stats.asignaciones)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Progreso:</span>
                      <span className="font-medium">{stats.porcentajeAsignado}%</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } else {
    // Director/User Dashboard - Personal View
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Mi Panel de Control</h1>
            <p className="text-muted-foreground mt-1">
              Bienvenido, {userName || "Director"} - Periodo: {periodoNombre}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onNavigate("materias-grupos")} className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Mis Materias
            </Button>
            <Button onClick={() => onNavigate("horarios")} className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ver Horarios
            </Button>
          </div>
        </div>

        {/* Tarjetas de estadísticas personales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mis Materias</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userMateriaCount}</div>
              <p className="text-xs text-muted-foreground">Materias creadas por ti</p>
            </CardContent>
            <CardFooter className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-xs"
                onClick={() => onNavigate("materias-grupos")}
              >
                Ver mis materias
                <span>→</span>
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mis Grupos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userGrupoCount}</div>
              <p className="text-xs text-muted-foreground">Grupos en tus materias</p>
            </CardContent>
            <CardFooter className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-xs"
                onClick={() => onNavigate("materias-grupos")}
              >
                Ver mis grupos
                <span>→</span>
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Asignaciones</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userAsignacionCount}</div>
              <p className="text-xs text-muted-foreground">Aulas asignadas a tus grupos</p>
            </CardContent>
            <CardFooter className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-xs"
                onClick={() => onNavigate("asignacion")}
              >
                Ver asignaciones
                <span>→</span>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Progreso personal */}
        <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Mi Progreso de Asignación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Grupos con aula asignada</span>
                <span className="font-medium">{stats.porcentajeAsignado}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(stats.porcentajeAsignado)} transition-all duration-500`}
                  style={{ width: `${stats.porcentajeAsignado}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de mis grupos</p>
                  <p className="text-xl font-bold">{userGrupoCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Mis asignaciones</p>
                  <p className="text-xl font-bold">{userAsignacionCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actividad reciente y distribución */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actividad reciente */}
          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Materia {activity.action} el {activity.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No hay actividad reciente</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribución por turnos personal */}
          <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Distribución de Mis Grupos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[180px]">
                <div className="w-full max-w-xs">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-web mr-2"></div>
                      <span className="text-sm">Mañana</span>
                    </div>
                    <span className="text-sm font-medium">{distribucionTurnos.mañana} grupos</span>
                  </div>
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
                    <div
                      className="h-full bg-orange-web rounded-full"
                      style={{
                        width: `${
                          distribucionTurnos.mañana + distribucionTurnos.tarde > 0
                            ? (distribucionTurnos.mañana / (distribucionTurnos.mañana + distribucionTurnos.tarde)) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <span className="text-sm">Tarde</span>
                    </div>
                    <span className="text-sm font-medium">{distribucionTurnos.tarde} grupos</span>
                  </div>
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${
                          distribucionTurnos.mañana + distribucionTurnos.tarde > 0
                            ? (distribucionTurnos.tarde / (distribucionTurnos.mañana + distribucionTurnos.tarde)) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información del sistema */}
        <Card className="bg-white dark:bg-oxford-blue border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Recursos Disponibles</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Total de profesores:</span>
                    <span className="font-medium">{stats.profesores}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Total de aulas:</span>
                    <span className="font-medium">{stats.aulas}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Periodo Actual</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium">{periodoNombre}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <span className="font-medium">Activo</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Mi Cuenta</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Rol:</span>
                    <span className="font-medium capitalize">{userRole || "Director"}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Materias creadas:</span>
                    <span className="font-medium">{userMateriaCount}</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
