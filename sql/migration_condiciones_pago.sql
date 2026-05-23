-- ============================================
-- KIRA HOME - Condiciones de pago
-- Reemplaza sistema de posnets
-- Ejecutar en Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS condiciones_pago (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('efectivo', 'transferencia', 'tarjeta')),
  descuento NUMERIC(6,3) DEFAULT 0,
  comision NUMERIC(6,3) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE condiciones_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on condiciones_pago" ON condiciones_pago FOR ALL USING (true) WITH CHECK (true);

INSERT INTO condiciones_pago (nombre, tipo, descuento, comision) VALUES
  ('Efectivo', 'efectivo', 25, 0),
  ('Transferencia', 'transferencia', 10, 0),
  ('Tarjeta', 'tarjeta', 0, 15);
