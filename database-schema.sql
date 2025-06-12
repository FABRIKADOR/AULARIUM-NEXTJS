-- Tablas para Enero-Abril (Periodo 1)
CREATE TABLE materias_enero_abril (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  profesor_id INTEGER REFERENCES profesores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE grupos_enero_abril (
  id SERIAL PRIMARY KEY,
  materia_id INTEGER REFERENCES materias_enero_abril(id),
  numero TEXT NOT NULL,
  alumnos INTEGER NOT NULL,
  turno TEXT NOT NULL,
  horarios JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE asignaciones_enero_abril (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER REFERENCES grupos_enero_abril(id),
  aula_id INTEGER REFERENCES aulas(id),
  materia_id INTEGER REFERENCES materias_enero_abril(id),
  dia TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  turno TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Tablas para Mayo-Agosto (Periodo 2)
CREATE TABLE materias_mayo_agosto (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  profesor_id INTEGER REFERENCES profesores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE grupos_mayo_agosto (
  id SERIAL PRIMARY KEY,
  materia_id INTEGER REFERENCES materias_mayo_agosto(id),
  numero TEXT NOT NULL,
  alumnos INTEGER NOT NULL,
  turno TEXT NOT NULL,
  horarios JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE asignaciones_mayo_agosto (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER REFERENCES grupos_mayo_agosto(id),
  aula_id INTEGER REFERENCES aulas(id),
  materia_id INTEGER REFERENCES materias_mayo_agosto(id),
  dia TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  turno TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Tablas para Septiembre-Diciembre (Periodo 3)
CREATE TABLE materias_septiembre_diciembre (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  profesor_id INTEGER REFERENCES profesores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE grupos_septiembre_diciembre (
  id SERIAL PRIMARY KEY,
  materia_id INTEGER REFERENCES materias_septiembre_diciembre(id),
  numero TEXT NOT NULL,
  alumnos INTEGER NOT NULL,
  turno TEXT NOT NULL,
  horarios JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE asignaciones_septiembre_diciembre (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER REFERENCES grupos_septiembre_diciembre(id),
  aula_id INTEGER REFERENCES aulas(id),
  materia_id INTEGER REFERENCES materias_septiembre_diciembre(id),
  dia TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  turno TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_materias_ea_profesor ON materias_enero_abril(profesor_id);
CREATE INDEX idx_materias_ma_profesor ON materias_mayo_agosto(profesor_id);
CREATE INDEX idx_materias_sd_profesor ON materias_septiembre_diciembre(profesor_id);

CREATE INDEX idx_grupos_ea_materia ON grupos_enero_abril(materia_id);
CREATE INDEX idx_grupos_ma_materia ON grupos_mayo_agosto(materia_id);
CREATE INDEX idx_grupos_sd_materia ON grupos_septiembre_diciembre(materia_id);

CREATE INDEX idx_asignaciones_ea_grupo ON asignaciones_enero_abril(grupo_id);
CREATE INDEX idx_asignaciones_ma_grupo ON asignaciones_mayo_agosto(grupo_id);
CREATE INDEX idx_asignaciones_sd_grupo ON asignaciones_septiembre_diciembre(grupo_id);
