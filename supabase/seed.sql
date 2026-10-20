-- ============================================
-- DATOS INICIALES — Sedes y Categorías
-- ============================================

INSERT INTO sedes (nombre, direccion) VALUES
  ('PEÑALOLEN', 'Peñalolén, Santiago'),
  ('LAS CONDES', 'Las Condes, Santiago'),
  ('LA FLORIDA', 'La Florida, Santiago'),
  ('MAIPU', 'Maipú, Santiago');

-- Categorías para cada sede (las principales)
DO $$
DECLARE
  sede RECORD;
  cats TEXT[] := ARRAY['SUB-6', 'SUB-7', 'SUB-8', 'SUB-9', 'SUB-10', 'SUB-11', 'SUB-12', 'SUB-13', 'SUB-14', 'SUB-15', 'SUB-16', 'SUB-17', 'SUB-18'];
  cat TEXT;
BEGIN
  FOR sede IN SELECT id FROM sedes LOOP
    FOREACH cat IN ARRAY cats LOOP
      INSERT INTO categorias (sede_id, nombre, tipo)
      VALUES (sede.id, cat, 'COMPETITIVO')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Categorías especiales (sin sede fija, usan la primera sede como referencia)
INSERT INTO categorias (sede_id, nombre, tipo)
SELECT id, 'SENIOR AM', 'RECREATIVO' FROM sedes WHERE nombre = 'PEÑALOLEN'
ON CONFLICT DO NOTHING;

INSERT INTO categorias (sede_id, nombre, tipo)
SELECT id, 'SENIOR PM', 'RECREATIVO' FROM sedes WHERE nombre = 'PEÑALOLEN'
ON CONFLICT DO NOTHING;

INSERT INTO categorias (sede_id, nombre, tipo)
SELECT id, 'PROYECCION', 'COMPETITIVO' FROM sedes WHERE nombre = 'PEÑALOLEN'
ON CONFLICT DO NOTHING;

INSERT INTO categorias (sede_id, nombre, tipo)
SELECT id, 'PRO ELITE', 'COMPETITIVO' FROM sedes WHERE nombre = 'PEÑALOLEN'
ON CONFLICT DO NOTHING;

INSERT INTO categorias (sede_id, nombre, tipo)
SELECT id, 'FEMENINO', 'COMPETITIVO' FROM sedes WHERE nombre = 'PEÑALOLEN'
ON CONFLICT DO NOTHING;
