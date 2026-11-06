-- Uniformes entregados a jugadores
CREATE TABLE uniformes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('NEGRO','ROSADO','POLERON','SHORT','MEDIAS','OTRO')),
  talla TEXT,
  entregado BOOLEAN NOT NULL DEFAULT false,
  fecha_entrega DATE,
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_uniformes_jugador ON uniformes(jugador_id);
ALTER TABLE uniformes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_uniformes" ON uniformes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "entrenador_read_uniformes" ON uniformes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = uniformes.jugador_id
    )
  );

CREATE POLICY "entrenador_write_uniformes" ON uniformes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = uniformes.jugador_id
    )
  );

CREATE POLICY "apoderado_read_uniformes" ON uniformes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = uniformes.jugador_id
    )
  );

-- Torneos
CREATE TABLE torneos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'EXTERNO' CHECK (tipo IN ('INTERNO','EXTERNO','AMISTOSO')),
  fecha_inicio DATE,
  fecha_fin DATE,
  sede_id UUID REFERENCES sedes(id),
  categoria_id UUID REFERENCES categorias(id),
  lugar TEXT,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'PLANIFICADO' CHECK (estado IN ('PLANIFICADO','EN_CURSO','FINALIZADO','CANCELADO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_torneos_categoria ON torneos(categoria_id);
ALTER TABLE torneos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_torneos" ON torneos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "entrenador_read_torneos" ON torneos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM entrenadores WHERE user_id = auth.uid())
  );

CREATE POLICY "entrenador_write_torneos" ON torneos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM entrenadores WHERE user_id = auth.uid())
  );

CREATE POLICY "entrenador_update_torneos" ON torneos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM entrenadores WHERE user_id = auth.uid())
  );

CREATE POLICY "apoderado_read_torneos" ON torneos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM apoderados WHERE user_id = auth.uid())
  );

-- Inscripciones a torneos
CREATE TABLE torneo_jugador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  inscrito BOOLEAN NOT NULL DEFAULT true,
  pagado BOOLEAN NOT NULL DEFAULT false,
  monto DECIMAL(10,0),
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(torneo_id, jugador_id)
);

CREATE INDEX idx_torneo_jugador_torneo ON torneo_jugador(torneo_id);
ALTER TABLE torneo_jugador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_torneo_jugador" ON torneo_jugador
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "entrenador_all_torneo_jugador" ON torneo_jugador
  FOR ALL USING (
    EXISTS (SELECT 1 FROM entrenadores WHERE user_id = auth.uid())
  );

CREATE POLICY "apoderado_read_torneo_jugador" ON torneo_jugador
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = torneo_jugador.jugador_id
    )
  );
