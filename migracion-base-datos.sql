-- Paso 1: Asegurar que la tabla de periodos tenga los registros correctos
-- Primero verificamos si la tabla existe
CREATE TABLE IF NOT EXISTS periodos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE
);

-- Insertar los periodos si no existen
INSERT INTO periodos (id, nombre, fecha_inicio, fecha_fin)
SELECT 1, 'Enero-Abril', '2023-01-01', '2023-04-30'
WHERE NOT EXISTS (SELECT 1 FROM periodos WHERE id = 1);

INSERT INTO periodos (id, nombre, fecha_inicio, fecha_fin)
SELECT 2, 'Mayo-Agosto', '2023-05-01', '2023-08-31'
WHERE NOT EXISTS (SELECT 1 FROM periodos WHERE id = 2);

INSERT INTO periodos (id, nombre, fecha_inicio, fecha_fin)
SELECT 3, 'Septiembre-Diciembre', '2023-09-01', '2023-12-31'
WHERE NOT EXISTS (SELECT 1 FROM periodos WHERE id = 3);

-- Paso 2: Crear las nuevas tablas específicas por periodo
-- Tablas para Enero-Abril (Periodo 1)
CREATE TABLE IF NOT EXISTS materias_enero_abril (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  profesor_id INTEGER REFERENCES profesores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS grupos_enero_abril (
  id SERIAL PRIMARY KEY,
  materia_id INTEGER REFERENCES materias_enero_abril(id),
  numero TEXT NOT NULL,
  alumnos INTEGER NOT NULL,
  turno TEXT NOT NULL,
  horarios JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS asignaciones_enero_abril (
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
CREATE TABLE IF NOT EXISTS materias_mayo_agosto (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  profesor_id INTEGER REFERENCES profesores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS grupos_mayo_agosto (
  id SERIAL PRIMARY KEY,
  materia_id INTEGER REFERENCES materias_mayo_agosto(id),
  numero TEXT NOT NULL,
  alumnos INTEGER NOT NULL,
  turno TEXT NOT NULL,
  horarios JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS asignaciones_mayo_agosto (
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
CREATE TABLE IF NOT EXISTS materias_septiembre_diciembre (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  profesor_id INTEGER REFERENCES profesores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS grupos_septiembre_diciembre (
  id SERIAL PRIMARY KEY,
  materia_id INTEGER REFERENCES materias_septiembre_diciembre(id),
  numero TEXT NOT NULL,
  alumnos INTEGER NOT NULL,
  turno TEXT NOT NULL,
  horarios JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS asignaciones_septiembre_diciembre (
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

-- Paso 3: Migrar los datos existentes a las nuevas tablas específicas por periodo
-- Migrar materias
INSERT INTO materias_enero_abril (id, nombre, profesor_id)
SELECT id, nombre, profesor_id
FROM materias
WHERE periodo_id = 1;

INSERT INTO materias_mayo_agosto (id, nombre, profesor_id)
SELECT id, nombre, profesor_id
FROM materias
WHERE periodo_id = 2;

INSERT INTO materias_septiembre_diciembre (id, nombre, profesor_id)
SELECT id, nombre, profesor_id
FROM materias
WHERE periodo_id = 3;

-- Migrar grupos
INSERT INTO grupos_enero_abril (id, materia_id, numero, alumnos, turno, horarios)
SELECT g.id, g.materia_id, g.numero, g.alumnos, g.turno, g.horarios
FROM grupos g
JOIN materias m ON g.materia_id = m.id
WHERE m.periodo_id = 1;

INSERT INTO grupos_mayo_agosto (id, materia_id, numero, alumnos, turno, horarios)
SELECT g.id, g.materia_id, g.numero, g.alumnos, g.turno, g.horarios
FROM grupos g
JOIN materias m ON g.materia_id = m.id
WHERE m.periodo_id = 2;

INSERT INTO grupos_septiembre_diciembre (id, materia_id, numero, alumnos, turno, horarios)
SELECT g.id, g.materia_id, g.numero, g.alumnos, g.turno, g.horarios
FROM grupos g
JOIN materias m ON g.materia_id = m.id
WHERE m.periodo_id = 3;

-- Migrar asignaciones
INSERT INTO asignaciones_enero_abril (id, grupo_id, aula_id, materia_id, dia, hora_inicio, hora_fin, turno)
SELECT a.id, a.grupo_id, a.aula_id, a.materia_id, a.dia, a.hora_inicio, a.hora_fin, a.turno
FROM asignaciones a
WHERE a.periodo_id = 1;

INSERT INTO asignaciones_mayo_agosto (id, grupo_id, aula_id, materia_id, dia, hora_inicio, hora_fin, turno)
SELECT a.id, a.grupo_id, a.aula_id, a.materia_id, a.dia, a.hora_inicio, a.hora_fin, a.turno
FROM asignaciones a
WHERE a.periodo_id = 2;

INSERT INTO asignaciones_septiembre_diciembre (id, grupo_id, aula_id, materia_id, dia, hora_inicio, hora_fin, turno)
SELECT a.id, a.grupo_id, a.aula_id, a.materia_id, a.dia, a.hora_inicio, a.hora_fin, a.turno
FROM asignaciones a
WHERE a.periodo_id = 3;

-- Paso 4: Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_materias_ea_profesor ON materias_enero_abril(profesor_id);
CREATE INDEX IF NOT EXISTS idx_materias_ma_profesor ON materias_mayo_agosto(profesor_id);
CREATE INDEX IF NOT EXISTS idx_materias_sd_profesor ON materias_septiembre_diciembre(profesor_id);

CREATE INDEX IF NOT EXISTS idx_grupos_ea_materia ON grupos_enero_abril(materia_id);
CREATE INDEX IF NOT EXISTS idx_grupos_ma_materia ON grupos_mayo_agosto(materia_id);
CREATE INDEX IF NOT EXISTS idx_grupos_sd_materia ON grupos_septiembre_diciembre(materia_id);

CREATE INDEX IF NOT EXISTS idx_asignaciones_ea_grupo ON asignaciones_enero_abril(grupo_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_ea_aula ON asignaciones_enero_abril(aula_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_ea_materia ON asignaciones_enero_abril(materia_id);

CREATE INDEX IF NOT EXISTS idx_asignaciones_ma_grupo ON asignaciones_mayo_agosto(grupo_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_ma_aula ON asignaciones_mayo_agosto(aula_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_ma_materia ON asignaciones_mayo_agosto(materia_id);

CREATE INDEX IF NOT EXISTS idx_asignaciones_sd_grupo ON asignaciones_septiembre_diciembre(grupo_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_sd_aula ON asignaciones_septiembre_diciembre(aula_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_sd_materia ON asignaciones_septiembre_diciembre(materia_id);

-- Paso 5: Actualizar las secuencias para que continúen desde el último ID
-- Para materias
SELECT setval('materias_enero_abril_id_seq', (SELECT COALESCE(MAX(id), 0) FROM materias_enero_abril), true);
SELECT setval('materias_mayo_agosto_id_seq', (SELECT COALESCE(MAX(id), 0) FROM materias_mayo_agosto), true);
SELECT setval('materias_septiembre_diciembre_id_seq', (SELECT COALESCE(MAX(id), 0) FROM materias_septiembre_diciembre), true);

-- Para grupos
SELECT setval('grupos_enero_abril_id_seq', (SELECT COALESCE(MAX(id), 0) FROM grupos_enero_abril), true);
SELECT setval('grupos_mayo_agosto_id_seq', (SELECT COALESCE(MAX(id), 0) FROM grupos_mayo_agosto), true);
SELECT setval('grupos_septiembre_diciembre_id_seq', (SELECT COALESCE(MAX(id), 0) FROM grupos_septiembre_diciembre), true);

-- Para asignaciones
SELECT setval('asignaciones_enero_abril_id_seq', (SELECT COALESCE(MAX(id), 0) FROM asignaciones_enero_abril), true);
SELECT setval('asignaciones_mayo_agosto_id_seq', (SELECT COALESCE(MAX(id), 0) FROM asignaciones_mayo_agosto), true);
SELECT setval('asignaciones_septiembre_diciembre_id_seq', (SELECT COALESCE(MAX(id), 0) FROM asignaciones_septiembre_diciembre), true);
