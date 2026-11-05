-- Agregar campos de pago mensual y morosidad a jugadores
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS pago_mensual TEXT DEFAULT NULL;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS numero_morosidad INTEGER DEFAULT 0;

COMMENT ON COLUMN jugadores.pago_mensual IS 'Estado del pago mensual: AL DIA, MOROSO, N/A';
COMMENT ON COLUMN jugadores.numero_morosidad IS 'Cantidad de meses de morosidad';
