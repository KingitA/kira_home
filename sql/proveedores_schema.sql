-- ============================================
-- KIRA HOME - Módulo Proveedores
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('mercaderia', 'servicio')),
  cuit TEXT,
  direccion TEXT,
  localidad TEXT,
  provincia TEXT,
  emails TEXT[] DEFAULT '{}',
  whatsapps TEXT[] DEFAULT '{}',
  -- Campos para servicios
  frecuencia_pago TEXT CHECK (frecuencia_pago IN ('mensual', 'bimestral', 'trimestral', 'semestral', 'anual', NULL)),
  proximo_vencimiento DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Relación proveedor-artículo (para proveedores de mercadería)
CREATE TABLE IF NOT EXISTS proveedor_articulos (
  id BIGSERIAL PRIMARY KEY,
  proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  articulo_id BIGINT NOT NULL REFERENCES articulos(id) ON DELETE CASCADE,
  precio_proveedor NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proveedor_id, articulo_id)
);

-- 3. Comprobantes de cuenta corriente
CREATE TABLE IF NOT EXISTS comprobantes (
  id BIGSERIAL PRIMARY KEY,
  proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  tipo_comprobante TEXT NOT NULL CHECK (tipo_comprobante IN (
    'factura_a', 'factura_b', 'factura_c',
    'debito_a', 'debito_b', 'debito_c',
    'credito_a', 'credito_b', 'credito_c',
    'presupuesto', 'reversa'
  )),
  numero TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_105 NUMERIC(12,2) DEFAULT 0,
  iva_21 NUMERIC(12,2) DEFAULT 0,
  iva_27 NUMERIC(12,2) DEFAULT 0,
  percepciones NUMERIC(12,2) DEFAULT 0,
  otros_impuestos NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  descripcion TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagado', 'anulado')),
  saldo_pendiente NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Items de comprobante (detalle de mercadería/servicio)
CREATE TABLE IF NOT EXISTS comprobante_items (
  id BIGSERIAL PRIMARY KEY,
  comprobante_id BIGINT NOT NULL REFERENCES comprobantes(id) ON DELETE CASCADE,
  articulo_id BIGINT REFERENCES articulos(id),
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- 5. Órdenes de pago
CREATE TABLE IF NOT EXISTS ordenes_pago (
  id BIGSERIAL PRIMARY KEY,
  proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'transferencia')),
  monto NUMERIC(12,2) NOT NULL,
  comprobante_id BIGINT REFERENCES comprobantes(id),
  es_a_cuenta BOOLEAN DEFAULT FALSE,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id BIGSERIAL PRIMARY KEY,
  proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  numero TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviada', 'recibida', 'anulada')),
  subtotal NUMERIC(12,2) DEFAULT 0,
  iva NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Items de orden de compra
CREATE TABLE IF NOT EXISTS orden_compra_items (
  id BIGSERIAL PRIMARY KEY,
  orden_compra_id BIGINT NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  articulo_id BIGINT NOT NULL REFERENCES articulos(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- 8. Gastos rápidos (para el botón de gastos)
CREATE TABLE IF NOT EXISTS gastos (
  id BIGSERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'transferencia')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  proveedor_id BIGINT REFERENCES proveedores(id),
  tiene_comprobante BOOLEAN DEFAULT FALSE,
  tipo_comprobante TEXT,
  numero_comprobante TEXT,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_proveedores_tipo ON proveedores(tipo);
CREATE INDEX IF NOT EXISTS idx_comprobantes_proveedor ON comprobantes(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_estado ON comprobantes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_pago_proveedor ON ordenes_pago(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor ON ordenes_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_proveedor_articulos_prov ON proveedor_articulos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);

-- Trigger updated_at para proveedores
CREATE TRIGGER tr_proveedores_updated
  BEFORE UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedor_articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobante_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on proveedores" ON proveedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on proveedor_articulos" ON proveedor_articulos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comprobantes" ON comprobantes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comprobante_items" ON comprobante_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ordenes_pago" ON ordenes_pago FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ordenes_compra" ON ordenes_compra FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orden_compra_items" ON orden_compra_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gastos" ON gastos FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE proveedores;
ALTER PUBLICATION supabase_realtime ADD TABLE comprobantes;
ALTER PUBLICATION supabase_realtime ADD TABLE ordenes_pago;
ALTER PUBLICATION supabase_realtime ADD TABLE ordenes_compra;
ALTER PUBLICATION supabase_realtime ADD TABLE gastos;

-- Migrar proveedores existentes del campo 'proveedor' en artículos
INSERT INTO proveedores (nombre, tipo)
SELECT DISTINCT proveedor, 'mercaderia'
FROM articulos
WHERE proveedor IS NOT NULL AND proveedor != '' AND proveedor != 'SIN PROVEEDOR' AND activo = true
ON CONFLICT DO NOTHING;

-- Vincular artículos con sus proveedores
INSERT INTO proveedor_articulos (proveedor_id, articulo_id, precio_proveedor)
SELECT p.id, a.id, a.costo_unitario
FROM articulos a
JOIN proveedores p ON p.nombre = a.proveedor
WHERE a.activo = true AND a.proveedor IS NOT NULL AND a.proveedor != '' AND a.proveedor != 'SIN PROVEEDOR'
ON CONFLICT (proveedor_id, articulo_id) DO NOTHING;

-- Insertar proveedores de servicios comunes
INSERT INTO proveedores (nombre, tipo, frecuencia_pago) VALUES
  ('EDES (Luz)', 'servicio', 'mensual'),
  ('ABSA (Agua)', 'servicio', 'bimestral'),
  ('Camuzzi (Gas)', 'servicio', 'bimestral'),
  ('Internet', 'servicio', 'mensual'),
  ('Alquiler', 'servicio', 'mensual'),
  ('ARCA', 'servicio', 'mensual'),
  ('ARBA', 'servicio', 'mensual'),
  ('Municipal', 'servicio', 'trimestral')
ON CONFLICT DO NOTHING;
