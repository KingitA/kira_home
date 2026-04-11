-- ============================================
-- KIRA HOME - Migración: Comisiones y Movimientos
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Tabla de comisiones por método de pago
CREATE TABLE IF NOT EXISTS comisiones (
  id BIGSERIAL PRIMARY KEY,
  tipo_billetera TEXT NOT NULL,
  porcentaje NUMERIC(6,3) NOT NULL DEFAULT 0,
  descripcion TEXT,
  cuotas INTEGER DEFAULT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comisiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on comisiones" ON comisiones FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabla de movimientos entre billeteras
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id BIGSERIAL PRIMARY KEY,
  desde TEXT NOT NULL,
  hacia TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  nota TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on movimientos_caja" ON movimientos_caja FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE movimientos_caja;
ALTER PUBLICATION supabase_realtime ADD TABLE comisiones;

-- 3. Renombrar billetera "transferencia" a "banco" conceptualmente
-- (no cambiamos el valor en DB para no romper datos existentes, 
--  lo manejamos en el frontend)

-- 4. Agregar columna comision a ventas para registro
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS comision NUMERIC(12,2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS neto NUMERIC(12,2);
