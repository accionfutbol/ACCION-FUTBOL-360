-- ============================================
-- FASE 2: Partidos, Stats, Eval Físicas, Mensualidades
-- ============================================

-- Partidos
CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  sede_id UUID NOT NULL REFERENCES sedes(id),
  rival TEXT NOT NULL,
  torneo TEXT,
  resultado TEXT,
  marcador_favor INT DEFAULT 0,
  marcador_contra INT DEFAULT 0,
  entrenador_id UUID REFERENCES entrenadores(id),
  link_video TEXT,
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partidos_categoria ON partidos(categoria_id);
CREATE INDEX idx_partidos_fecha ON partidos(fecha);

CREATE TRIGGER partidos_updated_at
  BEFORE UPDATE ON partidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Participación de jugador en partido
CREATE TYPE estado_convocatoria AS ENUM ('TITULAR', 'SUPLENTE', 'INGRESO', 'NO_CITADO');

CREATE TABLE partido_jugador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  estado estado_convocatoria NOT NULL DEFAULT 'NO_CITADO',
  minutos INT DEFAULT 0,
  posicion TEXT,
  goles INT DEFAULT 0,
  asistencias_gol INT DEFAULT 0,
  tarj_amarilla INT DEFAULT 0,
  tarj_roja INT DEFAULT 0,
  nota DECIMAL(3,1),
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partido_id, jugador_id)
);

CREATE INDEX idx_pj_partido ON partido_jugador(partido_id);
CREATE INDEX idx_pj_jugador ON partido_jugador(jugador_id);

-- Evaluaciones físicas y antropométricas
CREATE TABLE eval_fisicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  salto DECIMAL(5,2),
  velocidad_30m DECIMAL(5,2),
  ift DECIMAL(5,2),
  altura DECIMAL(5,2),
  peso DECIMAL(5,2),
  imc DECIMAL(5,2),
  grasa_corporal DECIMAL(5,2),
  masa_muscular DECIMAL(5,2),
  flexibilidad DECIMAL(5,2),
  resistencia TEXT,
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jugador_id, fecha)
);

CREATE INDEX idx_ef_jugador ON eval_fisicas(jugador_id);

-- Mensualidades (reemplaza el campo pago_mensual de jugadores)
CREATE TYPE estado_pago AS ENUM ('PAGADO', 'PENDIENTE', 'ATRASADO', 'BECADO', 'CONGELADO');

CREATE TABLE mensualidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  monto INT,
  estado estado_pago NOT NULL DEFAULT 'PENDIENTE',
  fecha_pago DATE,
  metodo_pago TEXT,
  comprobante_url TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jugador_id, mes)
);

CREATE INDEX idx_mensualidades_jugador ON mensualidades(jugador_id);
CREATE INDEX idx_mensualidades_estado ON mensualidades(estado);
CREATE INDEX idx_mensualidades_mes ON mensualidades(mes);

CREATE TRIGGER mensualidades_updated_at
  BEFORE UPDATE ON mensualidades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comunicaciones / Avisos
CREATE TABLE comunicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'AVISO',
  autor_id UUID REFERENCES auth.users(id),
  sede_id UUID REFERENCES sedes(id),
  categoria_id UUID REFERENCES categorias(id),
  para_todos BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comunicaciones_fecha ON comunicaciones(created_at);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE partido_jugador ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_fisicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensualidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicaciones ENABLE ROW LEVEL SECURITY;

-- Admin: todo
CREATE POLICY "admin_all_partidos" ON partidos FOR ALL USING (is_admin());
CREATE POLICY "admin_all_pj" ON partido_jugador FOR ALL USING (is_admin());
CREATE POLICY "admin_all_ef" ON eval_fisicas FOR ALL USING (is_admin());
CREATE POLICY "admin_all_mensualidades" ON mensualidades FOR ALL USING (is_admin());
CREATE POLICY "admin_all_comunicaciones" ON comunicaciones FOR ALL USING (is_admin());

-- Entrenadores: partidos de sus categorías
CREATE POLICY "entrenador_read_partidos" ON partidos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entrenador_categoria ec
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND ec.categoria_id = partidos.categoria_id
    )
  );

CREATE POLICY "entrenador_insert_partidos" ON partidos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM entrenador_categoria ec
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND ec.categoria_id = partidos.categoria_id
    )
  );

CREATE POLICY "entrenador_update_partidos" ON partidos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM entrenador_categoria ec
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND ec.categoria_id = partidos.categoria_id
    )
  );

-- Entrenadores: partido_jugador de partidos de sus categorías
CREATE POLICY "entrenador_read_pj" ON partido_jugador
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partidos p
      JOIN entrenador_categoria ec ON ec.categoria_id = p.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND p.id = partido_jugador.partido_id
    )
  );

CREATE POLICY "entrenador_write_pj" ON partido_jugador
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM partidos p
      JOIN entrenador_categoria ec ON ec.categoria_id = p.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND p.id = partido_jugador.partido_id
    )
  );

CREATE POLICY "entrenador_update_pj" ON partido_jugador
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM partidos p
      JOIN entrenador_categoria ec ON ec.categoria_id = p.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND p.id = partido_jugador.partido_id
    )
  );

-- Entrenadores: eval_fisicas de jugadores de sus categorías
CREATE POLICY "entrenador_read_ef" ON eval_fisicas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = eval_fisicas.jugador_id
    )
  );

CREATE POLICY "entrenador_insert_ef" ON eval_fisicas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = eval_fisicas.jugador_id
    )
  );

CREATE POLICY "entrenador_update_ef" ON eval_fisicas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = eval_fisicas.jugador_id
    )
  );

-- Entrenadores: ven mensualidades de sus jugadores (solo lectura)
CREATE POLICY "entrenador_read_mensualidades" ON mensualidades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugadores j
      JOIN entrenador_categoria ec ON ec.categoria_id = j.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND j.id = mensualidades.jugador_id
    )
  );

-- Comunicaciones: todos los autenticados pueden leer
CREATE POLICY "comunicaciones_read" ON comunicaciones
  FOR SELECT TO authenticated USING (true);

-- Entrenadores: pueden crear comunicaciones
CREATE POLICY "entrenador_insert_comunicaciones" ON comunicaciones
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('entrenador', 'admin'))
  );

-- Apoderados: ven partidos de sus hijos
CREATE POLICY "apoderado_read_partidos" ON partidos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      JOIN jugadores j ON j.id = ja.jugador_id
      WHERE a.user_id = auth.uid() AND j.categoria_id = partidos.categoria_id
    )
  );

CREATE POLICY "apoderado_read_pj" ON partido_jugador
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = partido_jugador.jugador_id
    )
  );

-- Apoderados: ven eval_fisicas de sus hijos
CREATE POLICY "apoderado_read_ef" ON eval_fisicas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = eval_fisicas.jugador_id
    )
  );

-- Apoderados: ven mensualidades de sus hijos
CREATE POLICY "apoderado_read_mensualidades" ON mensualidades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = mensualidades.jugador_id
    )
  );
