-- Evaluaciones técnicas/físicas/actitudinales del entrenador
CREATE TABLE evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  entrenador_id UUID REFERENCES entrenadores(id),
  semestre INT NOT NULL DEFAULT 1,
  anio INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  nota_tecnica DECIMAL(3,1) CHECK (nota_tecnica BETWEEN 1 AND 7),
  nota_fisica DECIMAL(3,1) CHECK (nota_fisica BETWEEN 1 AND 7),
  nota_actitudinal DECIMAL(3,1) CHECK (nota_actitudinal BETWEEN 1 AND 7),
  promedio DECIMAL(3,1),
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jugador_id, semestre, anio)
);

CREATE INDEX idx_evaluaciones_jugador ON evaluaciones(jugador_id);
CREATE INDEX idx_evaluaciones_anio ON evaluaciones(anio, semestre);

ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_evaluaciones" ON evaluaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "entrenador_read_evaluaciones" ON evaluaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = evaluaciones.jugador_id
    )
  );

CREATE POLICY "entrenador_insert_evaluaciones" ON evaluaciones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = evaluaciones.jugador_id
    )
  );

CREATE POLICY "entrenador_update_evaluaciones" ON evaluaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = evaluaciones.jugador_id
    )
  );
