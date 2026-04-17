-- ============================================
-- KIRA HOME - Migración: Sistema de Posnet
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de posnets
CREATE TABLE IF NOT EXISTS posnets (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comisiones por posnet (reemplaza el uso genérico de comisiones)
CREATE TABLE IF NOT EXISTS posnet_comisiones (
  id BIGSERIAL PRIMARY KEY,
  posnet_id BIGINT NOT NULL REFERENCES posnets(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('debito', 'credito')),
  cuotas INTEGER DEFAULT 1,
  porcentaje NUMERIC(6,3) NOT NULL DEFAULT 0,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(posnet_id, tipo, cuotas)
);

ALTER TABLE posnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE posnet_comisiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on posnets" ON posnets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on posnet_comisiones" ON posnet_comisiones FOR ALL USING (true) WITH CHECK (true);

-- Agregar posnet_id a ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS posnet_id BIGINT REFERENCES posnets(id);

-- Insertar posnets iniciales
INSERT INTO posnets (nombre) VALUES ('PayWay'), ('Getnet');

-- Comisiones PayWay
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, descripcion)
SELECT id, 'debito', 1, 0, 'Sin comisión débito' FROM posnets WHERE nombre = 'PayWay';
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, descripcion)
SELECT id, 'credito', 1, 2, 'Comisión crédito 1 cuota' FROM posnets WHERE nombre = 'PayWay';

-- Comisiones Getnet (0% placeholder para configurar después)
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, descripcion)
SELECT id, 'debito', 1, 0, 'Pendiente definir' FROM posnets WHERE nombre = 'Getnet';
INSERT INTO posnet_comisiones (posnet_id, tipo, cuotas, porcentaje, descripcion)
SELECT id, 'credito', 1, 0, 'Pendiente definir' FROM posnets WHERE nombre = 'Getnet';
