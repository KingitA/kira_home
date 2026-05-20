-- ============================================
-- KIRA HOME - Historial de importaciones
-- Ejecutar en Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS importaciones (
  id BIGSERIAL PRIMARY KEY,
  archivo TEXT NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  total_filas INTEGER DEFAULT 0,
  actualizados INTEGER DEFAULT 0,
  creados INTEGER DEFAULT 0,
  omitidos INTEGER DEFAULT 0,
  errores INTEGER DEFAULT 0,
  log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE importaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on importaciones" ON importaciones FOR ALL USING (true) WITH CHECK (true);
