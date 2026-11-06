-- Albums de fotos y videos por categoría
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID REFERENCES sedes(id),
  categoria_id UUID REFERENCES categorias(id),
  mes TEXT,
  concepto TEXT NOT NULL,
  link_drive TEXT,
  tipo TEXT NOT NULL DEFAULT 'FOTO' CHECK (tipo IN ('FOTO','VIDEO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_albums_categoria ON albums(categoria_id);
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_albums" ON albums
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "entrenador_all_albums" ON albums
  FOR ALL USING (
    EXISTS (SELECT 1 FROM entrenadores WHERE user_id = auth.uid())
  );

CREATE POLICY "apoderado_read_albums" ON albums
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM apoderados WHERE user_id = auth.uid())
  );
