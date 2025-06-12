-- Agregar columna de disponibilidad a la tabla de profesores
ALTER TABLE profesores ADD COLUMN IF NOT EXISTS disponibilidad JSONB;

-- Comentario para la columna
COMMENT ON COLUMN profesores.disponibilidad IS 'Almacena la disponibilidad del profesor por día y hora en formato JSON';

-- Crear un índice GIN para búsquedas eficientes en la columna JSONB
CREATE INDEX IF NOT EXISTS idx_profesores_disponibilidad ON profesores USING GIN (disponibilidad);

-- Actualizar la política de seguridad para permitir actualizar la disponibilidad
ALTER POLICY IF EXISTS update_profesores ON profesores 
  USING (auth.uid() = usuario_id OR auth.uid() IN (SELECT usuario_id FROM profesor_usuario WHERE profesor_id = id))
  WITH CHECK (auth.uid() = usuario_id OR auth.uid() IN (SELECT usuario_id FROM profesor_usuario WHERE profesor_id = id));
