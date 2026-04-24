-- ============================================
-- KIRA HOME - Comisiones Getnet por cuota + recargos
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Agregar columna de recargo a posnet_comisiones
ALTER TABLE posnet_comisiones ADD COLUMN IF NOT EXISTS recargo NUMERIC(6,3) DEFAULT 0;

-- Limpiar comisiones de Getnet
DELETE FROM posnet_comisiones WHERE posnet_id = (SELECT id FROM posnets WHERE nombre = 'Getnet');

-- Getnet: débito 0%, sin recargo
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, recargo, descripcion)
SELECT id, 'debito', 1, 0, 0, 'Sin comisión' FROM posnets WHERE nombre = 'Getnet';

-- Getnet crédito 1 cuota: 2% comisión, 0% recargo
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, recargo, descripcion)
SELECT id, 'credito', 1, 2, 0, 'Crédito 1 cuota' FROM posnets WHERE nombre = 'Getnet';

-- Getnet crédito 3 cuotas: 11% comisión, 0% recargo
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, recargo, descripcion)
SELECT id, 'credito', 3, 11, 0, 'Crédito 3 cuotas' FROM posnets WHERE nombre = 'Getnet';

-- Getnet crédito 6 cuotas: 15% comisión, 5% recargo al cliente
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, recargo, descripcion)
SELECT id, 'credito', 6, 15, 5, 'Crédito 6 cuotas + recargo 5%' FROM posnets WHERE nombre = 'Getnet';
