export interface Aula {
  id: number
  nombre: string
  capacidad: number
}

export interface Grupo {
  id: number
  materia_id: number
  numero: string
  alumnos: number
  turno: "MAÑANA" | "TARDE"
  periodo_id: number
  horarios: {
    dia: string
    hora_inicio: string
    hora_fin: string
  }[]
}

export interface Materia {
  id: number
  nombre: string
  profesor_id: number
  periodo_id: number
}

export interface Asignacion {
  id: number
  grupo_id: number
  aula_id: number | null
  materia_id: number
  dia: string
  hora_inicio: string
  hora_fin: string
  turno: "MAÑANA" | "TARDE"
  periodo_id: number
}

export interface Profesor {
  id: number
  nombre: string
  email: string
}

export interface Horario {
  dia: string
  hora_inicio: string
  hora_fin: string
}
