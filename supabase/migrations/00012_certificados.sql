-- Registro de certificados emitidos
CREATE TABLE certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('PARTICIPACION','PERTENENCIA','LOGRO','ASISTENCIA','OTRO')),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  emitido_por UUID REFERENCES profiles(id),
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificados_jugador ON certificados(jugador_id);
ALTER TABLE certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_certificados" ON certificados
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "entrenador_all_certificados" ON certificados
  FOR ALL USING (
    EXISTS (SELECT 1 FROM entrenadores WHERE user_id = auth.uid())
  );

CREATE POLICY "apoderado_read_certificados" ON certificados
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = certificados.jugador_id
    )
  );
