-- Días de entrenamiento por sede/categoría (0=Domingo, 1=Lunes...6=Sábado)
CREATE TABLE IF NOT EXISTS dias_entrenamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES sedes(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sede_id, categoria_id, dia_semana)
);

-- Planificación de entrenamiento
CREATE TABLE IF NOT EXISTS planificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES sedes(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  fecha DATE NOT NULL,
  contenido TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'ENTRENAMIENTO',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sede_id, categoria_id, fecha)
);

-- RLS
ALTER TABLE dias_entrenamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE planificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dias_read" ON dias_entrenamiento FOR SELECT USING (true);
CREATE POLICY "dias_write" ON dias_entrenamiento FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','entrenador'))
);

CREATE POLICY "plan_read" ON planificacion FOR SELECT USING (true);
CREATE POLICY "plan_write" ON planificacion FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','entrenador'))
);

COMMENT ON TABLE dias_entrenamiento IS 'Días de la semana en que entrena cada sede/categoría';
COMMENT ON TABLE planificacion IS 'Contenido planificado para cada día de entrenamiento';
