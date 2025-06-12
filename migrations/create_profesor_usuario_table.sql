-- Crear tabla de asociación entre profesores y usuarios
CREATE TABLE IF NOT EXISTS profesor_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profesor_id, usuario_id)
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_profesor_usuario_profesor_id ON profesor_usuario(profesor_id);
CREATE INDEX IF NOT EXISTS idx_profesor_usuario_usuario_id ON profesor_usuario(usuario_id);

-- Comentarios para documentar la tabla
COMMENT ON TABLE profesor_usuario IS 'Tabla de asociación que permite a los usuarios acceder a profesores creados por otros usuarios';
COMMENT ON COLUMN profesor_usuario.profesor_id IS 'ID del profesor asociado';
COMMENT ON COLUMN profesor_usuario.usuario_id IS 'ID del usuario que tiene acceso al profesor';
