-- ============================================
-- Enriquecer tabla jugadores con campos del MAESTRO
-- + nuevo enum estado_mes + campos apoderados
-- ============================================

-- Enum para estado mensual
CREATE TYPE estado_mes AS ENUM ('SEGURO', 'INSEGURO', 'OUT');

-- Nuevos campos en jugadores
ALTER TABLE jugadores
  ADD COLUMN estado_mes estado_mes DEFAULT 'SEGURO',
  ADD COLUMN tipo TEXT DEFAULT 'PRO',
  ADD COLUMN anio_nacimiento INT,
  ADD COLUMN sexo TEXT,
  ADD COLUMN nacionalidad TEXT,
  ADD COLUMN comuna TEXT,
  ADD COLUMN direccion TEXT,
  ADD COLUMN colegio TEXT,
  ADD COLUMN comuna_colegio TEXT,
  ADD COLUMN talla_ropa TEXT,
  ADD COLUMN nombre_camiseta TEXT,
  ADD COLUMN numero_camiseta TEXT,
  ADD COLUMN antecedentes_deportivos TEXT,
  ADD COLUMN como_llego TEXT,
  ADD COLUMN objetivo TEXT,
  ADD COLUMN centro_salud_emergencia TEXT,
  ADD COLUMN situacion_pagos TEXT,
  ADD COLUMN grupo_whatsapp TEXT,
  ADD COLUMN nombre_apoderado TEXT,
  ADD COLUMN email_apoderado TEXT,
  ADD COLUMN rut_apoderado TEXT,
  ADD COLUMN profesion_apoderado TEXT,
  ADD COLUMN comuna_apoderado TEXT,
  ADD COLUMN uniforme_negro TEXT,
  ADD COLUMN uniforme_rosado TEXT,
  ADD COLUMN poleron TEXT;

-- Indices útiles
CREATE INDEX idx_jugadores_estado_mes ON jugadores(estado_mes);
CREATE INDEX idx_jugadores_tipo ON jugadores(tipo);

-- Policy: admin puede INSERT jugadores (ya tiene FOR ALL, pero asegurar)
-- Policy: entrenadores pueden UPDATE jugadores de sus categorías
CREATE POLICY "entrenador_update_jugadores" ON jugadores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM entrenador_categoria ec
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND ec.categoria_id = jugadores.categoria_id
    )
  );
