-- Corregir nombres de sedes sin tildes
UPDATE sedes SET nombre = 'MAIPÚ' WHERE nombre = 'MAIPU';
UPDATE sedes SET nombre = 'PEÑALOLÉN' WHERE nombre = 'PEÑALOLEN';
