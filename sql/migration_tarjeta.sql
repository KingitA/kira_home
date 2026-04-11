-- ============================================
-- KIRA HOME - Migración: Tarjeta + cuotas
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Actualizar check constraints para incluir 'tarjeta_debito' y 'tarjeta_credito'
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_metodo_pago_check;
ALTER TABLE ventas ADD CONSTRAINT ventas_metodo_pago_check CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito'));

ALTER TABLE ordenes_pago DROP CONSTRAINT IF EXISTS ordenes_pago_metodo_pago_check;
ALTER TABLE ordenes_pago ADD CONSTRAINT ordenes_pago_metodo_pago_check CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito'));

ALTER TABLE gastos DROP CONSTRAINT IF EXISTS gastos_metodo_pago_check;
ALTER TABLE gastos ADD CONSTRAINT gastos_metodo_pago_check CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito'));

ALTER TABLE billetera DROP CONSTRAINT IF EXISTS billetera_tipo_check;
ALTER TABLE billetera ADD CONSTRAINT billetera_tipo_check CHECK (tipo IN ('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito'));

-- 2. Agregar columna de cuotas a ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cuotas INTEGER DEFAULT 1;

-- 3. Insertar registros de billetera para tarjeta
INSERT INTO billetera (tipo, saldo) VALUES ('tarjeta_debito', 0), ('tarjeta_credito', 0)
ON CONFLICT DO NOTHING;
