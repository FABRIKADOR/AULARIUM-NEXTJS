-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias notificaciones" ON notificaciones;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias notificaciones" ON notificaciones;
DROP POLICY IF EXISTS "Los administradores pueden actualizar cualquier notificación" ON notificaciones;
DROP POLICY IF EXISTS "Los usuarios pueden crear notificaciones" ON notificaciones;

-- Verificar si la columna remitente_id existe, si no, crearla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notificaciones'
        AND column_name = 'remitente_id'
    ) THEN
        ALTER TABLE notificaciones ADD COLUMN remitente_id UUID REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notificaciones'
        AND column_name = 'resuelta'
    ) THEN
        ALTER TABLE notificaciones ADD COLUMN resuelta BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Crear políticas de seguridad
-- Política para que los usuarios vean sus propias notificaciones (como destinatario o remitente)
CREATE POLICY "Los usuarios pueden ver sus propias notificaciones"
ON notificaciones
FOR SELECT
USING (
  auth.uid() = destinatario_id OR 
  auth.uid() = remitente_id
);

-- Política para que los usuarios actualicen sus propias notificaciones
CREATE POLICY "Los usuarios pueden actualizar sus propias notificaciones"
ON notificaciones
FOR UPDATE
USING (auth.uid() = destinatario_id);

-- Política para que los administradores actualicen cualquier notificación
CREATE POLICY "Los administradores pueden actualizar cualquier notificación"
ON notificaciones
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- Política para que los usuarios creen notificaciones
CREATE POLICY "Los usuarios pueden crear notificaciones"
ON notificaciones
FOR INSERT
WITH CHECK (true);
