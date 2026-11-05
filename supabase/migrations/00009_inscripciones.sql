-- Inscripciones online (formulario público)
CREATE TABLE IF NOT EXISTS inscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_jugador TEXT NOT NULL,
  rut_jugador TEXT,
  fecha_nacimiento DATE,
  sexo TEXT,
  sede_id UUID REFERENCES sedes(id),
  categoria_preferida TEXT,
  nombre_apoderado TEXT NOT NULL,
  email_apoderado TEXT NOT NULL,
  telefono_apoderado TEXT NOT NULL,
  rut_apoderado TEXT,
  comuna TEXT,
  como_llego TEXT,
  antecedentes_deportivos TEXT,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
  revisado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inscripciones ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede crear inscripciones (formulario público, anon key)
CREATE POLICY "inscripciones_insert_public" ON inscripciones FOR INSERT WITH CHECK (true);

-- Solo admin puede leer/editar
CREATE POLICY "inscripciones_admin_read" ON inscripciones FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "inscripciones_admin_update" ON inscripciones FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

COMMENT ON TABLE inscripciones IS 'Inscripciones online de nuevos jugadores pendientes de validación';
