-- ============================================
-- ACCIÓN FÚTBOL — Schema Inicial
-- ============================================

-- Enums
CREATE TYPE estado_jugador AS ENUM ('ACTIVO', 'FULL', 'NEW', 'LESIONADO', 'DESACTIVADO', 'BECADO');
CREATE TYPE marca_asistencia AS ENUM ('OK', 'F', 'J', 'L', 'NA');
CREATE TYPE rol_entrenador AS ENUM ('DT', 'ASISTENTE', 'PF');
CREATE TYPE tipo_categoria AS ENUM ('COMPETITIVO', 'RECREATIVO');
CREATE TYPE tipo_observacion AS ENUM ('DESACTIVAR', 'CAMBIO_CATEGORIA', 'LESION', 'OTRO');
CREATE TYPE user_role AS ENUM ('entrenador', 'apoderado', 'admin');

-- ============================================
-- TABLAS CORE
-- ============================================

CREATE TABLE sedes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  direccion TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo tipo_categoria NOT NULL DEFAULT 'COMPETITIVO',
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sede_id, nombre)
);

CREATE TABLE jugadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  fecha_nacimiento DATE,
  estado estado_jugador NOT NULL DEFAULT 'ACTIVO',
  sede_id UUID NOT NULL REFERENCES sedes(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  nivel TEXT,
  subnivel TEXT,
  posicion_principal TEXT,
  posicion_secundaria TEXT,
  pie_dominante TEXT,
  email_jugador TEXT,
  telefono_jugador TEXT,
  telefono_apoderado TEXT,
  foto_url TEXT,
  fecha_ingreso DATE,
  fecha_salida DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'apoderado',
  nombre TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE apoderados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jugador_apoderado (
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  apoderado_id UUID NOT NULL REFERENCES apoderados(id) ON DELETE CASCADE,
  PRIMARY KEY (jugador_id, apoderado_id)
);

CREATE TABLE entrenadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  rol rol_entrenador NOT NULL DEFAULT 'DT',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entrenador_categoria (
  entrenador_id UUID NOT NULL REFERENCES entrenadores(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (entrenador_id, categoria_id)
);

-- ============================================
-- TABLAS ASISTENCIA
-- ============================================

CREATE TABLE sesiones_entrenamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  sede_id UUID NOT NULL REFERENCES sedes(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  horario TEXT,
  observacion TEXT,
  entrenador_id UUID REFERENCES entrenadores(id),
  balones INT,
  en_cancha INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fecha, categoria_id)
);

CREATE TABLE asistencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id UUID NOT NULL REFERENCES sesiones_entrenamiento(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  marca marca_asistencia NOT NULL DEFAULT 'F',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sesion_id, jugador_id)
);

CREATE TABLE justificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  motivo TEXT NOT NULL,
  informado_entrenador BOOLEAN NOT NULL DEFAULT false,
  reportado_por TEXT NOT NULL DEFAULT 'APODERADO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  zona_cuerpo TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE observaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  entrenador_id UUID NOT NULL REFERENCES entrenadores(id),
  tipo tipo_observacion NOT NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX idx_jugadores_sede ON jugadores(sede_id);
CREATE INDEX idx_jugadores_categoria ON jugadores(categoria_id);
CREATE INDEX idx_jugadores_estado ON jugadores(estado);
CREATE INDEX idx_jugadores_rut ON jugadores(rut);
CREATE INDEX idx_asistencia_sesion ON asistencia(sesion_id);
CREATE INDEX idx_asistencia_jugador ON asistencia(jugador_id);
CREATE INDEX idx_sesiones_fecha ON sesiones_entrenamiento(fecha);
CREATE INDEX idx_sesiones_categoria ON sesiones_entrenamiento(categoria_id);
CREATE INDEX idx_justificaciones_jugador ON justificaciones(jugador_id);
CREATE INDEX idx_lesiones_jugador ON lesiones(jugador_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jugadores_updated_at
  BEFORE UPDATE ON jugadores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER asistencia_updated_at
  BEFORE UPDATE ON asistencia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: crear profile al registrarse
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, nombre)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'apoderado'),
    COALESCE(NEW.raw_user_meta_data->>'nombre', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE apoderados ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugador_apoderado ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrenadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrenador_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_entrenamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE justificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE observaciones ENABLE ROW LEVEL SECURITY;

-- Profiles: usuario ve su propio perfil
CREATE POLICY "profiles_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Sedes y categorías: todos los autenticados pueden leer
CREATE POLICY "sedes_read" ON sedes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "categorias_read" ON categorias
  FOR SELECT TO authenticated USING (true);

-- Admin: acceso total
CREATE POLICY "admin_all_jugadores" ON jugadores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_asistencia" ON asistencia
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_sesiones" ON sesiones_entrenamiento
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Entrenadores: ven y editan jugadores de sus categorías
CREATE POLICY "entrenador_read_jugadores" ON jugadores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entrenador_categoria ec
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND ec.categoria_id = jugadores.categoria_id
    )
  );

-- Entrenadores: ven y crean sesiones de sus categorías
CREATE POLICY "entrenador_read_sesiones" ON sesiones_entrenamiento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entrenador_categoria ec
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND ec.categoria_id = sesiones_entrenamiento.categoria_id
    )
  );

CREATE POLICY "entrenador_insert_sesiones" ON sesiones_entrenamiento
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM entrenador_categoria ec
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND ec.categoria_id = sesiones_entrenamiento.categoria_id
    )
  );

-- Entrenadores: ven y editan asistencia de sus categorías
CREATE POLICY "entrenador_read_asistencia" ON asistencia
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sesiones_entrenamiento s
      JOIN entrenador_categoria ec ON ec.categoria_id = s.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND s.id = asistencia.sesion_id
    )
  );

CREATE POLICY "entrenador_write_asistencia" ON asistencia
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sesiones_entrenamiento s
      JOIN entrenador_categoria ec ON ec.categoria_id = s.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND s.id = asistencia.sesion_id
    )
  );

CREATE POLICY "entrenador_update_asistencia" ON asistencia
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sesiones_entrenamiento s
      JOIN entrenador_categoria ec ON ec.categoria_id = s.categoria_id
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND s.id = asistencia.sesion_id
    )
  );

-- Entrenadores: pueden crear justificaciones y observaciones
CREATE POLICY "entrenador_insert_justificaciones" ON justificaciones
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('entrenador', 'admin'))
  );

CREATE POLICY "entrenador_read_justificaciones" ON justificaciones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('entrenador', 'admin'))
  );

CREATE POLICY "entrenador_insert_observaciones" ON observaciones
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('entrenador', 'admin'))
  );

CREATE POLICY "entrenador_read_observaciones" ON observaciones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('entrenador', 'admin'))
  );

-- Entrenadores: pueden gestionar lesiones
CREATE POLICY "entrenador_all_lesiones" ON lesiones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('entrenador', 'admin'))
  );

-- Entrenadores: ven sus propios datos
CREATE POLICY "entrenador_read_self" ON entrenadores
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "entrenador_read_ec" ON entrenador_categoria
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM entrenadores WHERE id = entrenador_categoria.entrenador_id AND user_id = auth.uid())
  );

-- Apoderados: ven solo datos de sus hijos
CREATE POLICY "apoderado_read_jugadores" ON jugadores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = jugadores.id
    )
  );

CREATE POLICY "apoderado_read_asistencia" ON asistencia
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = asistencia.jugador_id
    )
  );

CREATE POLICY "apoderado_read_self" ON apoderados
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "apoderado_read_ja" ON jugador_apoderado
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM apoderados WHERE id = jugador_apoderado.apoderado_id AND user_id = auth.uid())
  );

-- Apoderados: pueden crear justificaciones para sus hijos
CREATE POLICY "apoderado_insert_justificaciones" ON justificaciones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = justificaciones.jugador_id
    )
  );

CREATE POLICY "apoderado_read_justificaciones" ON justificaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jugador_apoderado ja
      JOIN apoderados a ON a.id = ja.apoderado_id
      WHERE a.user_id = auth.uid() AND ja.jugador_id = justificaciones.jugador_id
    )
  );

-- Admin: acceso total a todo lo demás
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "admin_all_apoderados" ON apoderados
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_ja" ON jugador_apoderado
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_entrenadores" ON entrenadores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_ec" ON entrenador_categoria
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_justificaciones" ON justificaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_observaciones" ON observaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_sedes_write" ON sedes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_categorias_write" ON categorias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
