-- Añadir columna resuelta a la tabla notificaciones
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS resuelta BOOLEAN DEFAULT FALSE;

-- Añadir columna remitente_id a la tabla notificaciones (para saber a quién enviar la confirmación)
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS remitente_id UUID REFERENCES auth.users(id);

-- Eliminar políticas existentes si existen (para evitar errores)
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias notificaciones" ON notificaciones;
DROP POLICY IF EXISTS "Los administradores pueden ver todas las notificaciones" ON notificaciones;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias notificaciones" ON notificaciones;
DROP POLICY IF EXISTS "Los administradores pueden actualizar todas las notificaciones" ON notificaciones;
DROP POLICY IF EXISTS "Los usuarios pueden insertar notificaciones" ON notificaciones;

-- Crear política para permitir a los usuarios ver sus propias notificaciones
CREATE POLICY "Los usuarios pueden ver sus propias notificaciones" ON notificaciones
  FOR SELECT USING (auth.uid() = destinatario_id);

-- Crear política para permitir a los administradores ver todas las notificaciones
CREATE POLICY "Los administradores pueden ver todas las notificaciones" ON notificaciones
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol = 'admin'
    )
  );

-- Crear política para permitir a los usuarios actualizar sus propias notificaciones
CREATE POLICY "Los usuarios pueden actualizar sus propias notificaciones" ON notificaciones
  FOR UPDATE USING (auth.uid() = destinatario_id);

-- Crear política para permitir a los administradores actualizar todas las notificaciones
CREATE POLICY "Los administradores pueden actualizar todas las notificaciones" ON notificaciones
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol = 'admin'
    )
  );

-- Crear política para permitir a los usuarios insertar notificaciones
CREATE POLICY "Los usuarios pueden insertar notificaciones" ON notificaciones
  FOR INSERT WITH CHECK (
    auth.uid() = remitente_id OR
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol IN ('admin', 'director')
    )
  );
