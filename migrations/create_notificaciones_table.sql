-- Create notifications table
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  datos JSONB DEFAULT '{}'::jsonb,
  leida BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  destinatario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notificaciones_destinatario ON notificaciones(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_creacion);

-- Add RLS policies
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own notifications
CREATE POLICY "Users can view their own notifications" 
  ON notificaciones 
  FOR SELECT 
  USING (auth.uid() = destinatario_id);

-- Policy to allow users to update only their own notifications
CREATE POLICY "Users can update their own notifications" 
  ON notificaciones 
  FOR UPDATE 
  USING (auth.uid() = destinatario_id);

-- Policy to allow service role to insert notifications
CREATE POLICY "Service role can insert notifications" 
  ON notificaciones 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Policy to allow service role to manage all notifications
CREATE POLICY "Service role can manage all notifications" 
  ON notificaciones 
  USING (true);
