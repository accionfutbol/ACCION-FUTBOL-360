-- Agregar campos para el reporte de entrenamiento
ALTER TABLE sesiones_entrenamiento
  ADD COLUMN IF NOT EXISTS jugadores_no_inscritos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS entrenador_nombre TEXT;

-- Política UPDATE para que entrenadores actualicen sesiones de sus categorías
CREATE POLICY "entrenador_update_sesiones" ON sesiones_entrenamiento
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM entrenador_categoria ec
      JOIN entrenadores e ON e.id = ec.entrenador_id
      WHERE e.user_id = auth.uid() AND ec.categoria_id = sesiones_entrenamiento.categoria_id
    )
  );
