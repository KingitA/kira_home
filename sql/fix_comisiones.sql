-- ============================================
-- KIRA HOME - Configurar comisiones correctas
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Limpiar comisiones anteriores
DELETE FROM posnet_comisiones;

-- Getnet: débito 0%, crédito 2%
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, descripcion)
SELECT id, 'debito', 1, 0, 'Sin comisión' FROM posnets WHERE nombre = 'Getnet';

INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, descripcion)
SELECT id, 'credito', 1, 2, 'Comisión crédito' FROM posnets WHERE nombre = 'Getnet';

-- PayWay: débito 0%, crédito 2.5%
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, descripcion)
SELECT id, 'debito', 1, 0, 'Sin comisión' FROM posnets WHERE nombre = 'PayWay';

INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, descripcion)
SELECT id, 'credito', 1, 2.5, 'Comisión crédito' FROM posnets WHERE nombre = 'PayWay';
