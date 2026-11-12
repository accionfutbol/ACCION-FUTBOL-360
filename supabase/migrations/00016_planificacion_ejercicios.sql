-- Agregar campos estructurados a planificacion
ALTER TABLE planificacion
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS objetivo TEXT,
  ADD COLUMN IF NOT EXISTS observaciones TEXT,
  ADD COLUMN IF NOT EXISTS materiales TEXT,
  ADD COLUMN IF NOT EXISTS espacio_cancha TEXT,
  ADD COLUMN IF NOT EXISTS cantidad_jugadores TEXT,
  ADD COLUMN IF NOT EXISTS horario TEXT,
  ADD COLUMN IF NOT EXISTS sede_nombre TEXT;

-- Ejercicios dentro de una planificación
CREATE TABLE IF NOT EXISTS planificacion_ejercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planificacion_id UUID NOT NULL REFERENCES planificacion(id) ON DELETE CASCADE,
  orden SMALLINT NOT NULL DEFAULT 0,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  duracion_min SMALLINT,
  materiales TEXT,
  espacio_cancha TEXT,
  imagen_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_ejerc_plan ON planificacion_ejercicios(planificacion_id);

-- RLS
ALTER TABLE planificacion_ejercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ejerc_read" ON planificacion_ejercicios FOR SELECT USING (true);
CREATE POLICY "ejerc_write" ON planificacion_ejercicios FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','entrenador'))
);
