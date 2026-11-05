-- Convocatorias de partido (entrenador cita jugadores, apoderado confirma)
CREATE TABLE IF NOT EXISTS convocatorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID REFERENCES partidos(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  sede_id UUID NOT NULL REFERENCES sedes(id),
  fecha DATE NOT NULL,
  hora TEXT,
  lugar TEXT,
  rival TEXT,
  mensaje TEXT,
  entrenador_id UUID REFERENCES entrenadores(id),
  estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Respuesta de cada jugador a la convocatoria
CREATE TABLE IF NOT EXISTS convocatoria_jugador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convocatoria_id UUID NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id),
  citado BOOLEAN NOT NULL DEFAULT true,
  respuesta TEXT CHECK (respuesta IN ('CONFIRMADO', 'NO_PUEDE', 'PENDIENTE')),
  respondido_por TEXT,
  respondido_at TIMESTAMPTZ,
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(convocatoria_id, jugador_id)
);

ALTER TABLE convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocatoria_jugador ENABLE ROW LEVEL SECURITY;

-- Entrenadores y admin pueden crear/leer convocatorias
CREATE POLICY "convocatorias_entrenador_all" ON convocatorias FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('entrenador', 'admin'))
);

-- Entrenadores y admin pueden gestionar jugadores convocados
CREATE POLICY "conv_jugador_entrenador_all" ON convocatoria_jugador FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('entrenador', 'admin'))
);

-- Apoderados pueden leer convocatorias de sus hijos
CREATE POLICY "convocatorias_apoderado_read" ON convocatorias FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM convocatoria_jugador cj
    JOIN jugador_apoderado ja ON ja.jugador_id = cj.jugador_id
    JOIN apoderados a ON a.id = ja.apoderado_id
    WHERE cj.convocatoria_id = convocatorias.id AND a.user_id = auth.uid()
  )
);

-- Apoderados pueden leer y actualizar respuestas de sus hijos
CREATE POLICY "conv_jugador_apoderado_read" ON convocatoria_jugador FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jugador_apoderado ja
    JOIN apoderados a ON a.id = ja.apoderado_id
    WHERE ja.jugador_id = convocatoria_jugador.jugador_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "conv_jugador_apoderado_update" ON convocatoria_jugador FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM jugador_apoderado ja
    JOIN apoderados a ON a.id = ja.apoderado_id
    WHERE ja.jugador_id = convocatoria_jugador.jugador_id AND a.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM jugador_apoderado ja
    JOIN apoderados a ON a.id = ja.apoderado_id
    WHERE ja.jugador_id = convocatoria_jugador.jugador_id AND a.user_id = auth.uid()
  )
);

COMMENT ON TABLE convocatorias IS 'Convocatorias de partido creadas por entrenadores';
COMMENT ON TABLE convocatoria_jugador IS 'Respuesta de cada jugador/apoderado a una convocatoria';
