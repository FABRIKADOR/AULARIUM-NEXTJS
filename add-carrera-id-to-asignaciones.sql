-- Función para verificar si una columna existe antes de añadirla
CREATE OR REPLACE FUNCTION column_exists(tbl text, col text) RETURNS boolean AS $$
DECLARE
  exists boolean;
BEGIN
  SELECT count(*) > 0 INTO exists
  FROM information_schema.columns
  WHERE table_name = tbl AND column_name = col;
  RETURN exists;
END;
$$ LANGUAGE plpgsql;

-- Añadir carrera_id a asignaciones_enero_abril si no existe
DO $$
BEGIN
  IF NOT column_exists('asignaciones_enero_abril', 'carrera_id') THEN
    ALTER TABLE asignaciones_enero_abril ADD COLUMN carrera_id INTEGER REFERENCES carreras(id);
    CREATE INDEX idx_asignaciones_ea_carrera_id ON asignaciones_enero_abril(carrera_id);
  END IF;
END $$;

-- Añadir carrera_id a asignaciones_mayo_agosto si no existe
DO $$
BEGIN
  IF NOT column_exists('asignaciones_mayo_agosto', 'carrera_id') THEN
    ALTER TABLE asignaciones_mayo_agosto ADD COLUMN carrera_id INTEGER REFERENCES carreras(id);
    CREATE INDEX idx_asignaciones_ma_carrera_id ON asignaciones_mayo_agosto(carrera_id);
  END IF;
END $$;

-- Añadir carrera_id a asignaciones_septiembre_diciembre si no existe
DO $$
BEGIN
  IF NOT column_exists('asignaciones_septiembre_diciembre', 'carrera_id') THEN
    ALTER TABLE asignaciones_septiembre_diciembre ADD COLUMN carrera_id INTEGER REFERENCES carreras(id);
    CREATE INDEX idx_asignaciones_sd_carrera_id ON asignaciones_septiembre_diciembre(carrera_id);
  END IF;
END $$;
