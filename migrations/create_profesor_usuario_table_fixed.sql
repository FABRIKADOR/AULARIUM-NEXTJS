-- Crear tabla de asociación entre profesores y usuarios con el tipo correcto
CREATE TABLE IF NOT EXISTS profesor_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesor_id INTEGER NOT NULL,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profesor_id, usuario_id)
);

-- Agregar las restricciones de clave foránea después de verificar los tipos
ALTER TABLE profesor_usuario
ADD CONSTRAINT fk_profesor_usuario_profesor
FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE;

ALTER TABLE profesor_usuario
ADD CONSTRAINT fk_profesor_usuario_usuario
FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_profesor_usuario_profesor_id ON profesor_usuario(profesor_id);
CREATE INDEX IF NOT EXISTS idx_profesor_usuario_usuario_id ON profesor_usuario(usuario_id);

-- Comentarios para documentar la tabla
COMMENT ON TABLE profesor_usuario IS 'Tabla de asociación que permite a los usuarios acceder a profesores creados por otros usuarios';
COMMENT ON COLUMN profesor_usuario.profesor_id IS 'ID del profesor asociado';
COMMENT ON COLUMN profesor_usuario.usuario_id IS 'ID del usuario que tiene acceso al profesor';
