-- ============================================
-- KIRA HOME - Soft delete artículos actuales
-- Marca como inactivos y prefija con --- 
-- para que no matcheen con los nuevos
-- ============================================

UPDATE articulos 
SET 
  activo = false,
  descripcion = '---' || descripcion,
  codigo = '---' || codigo
WHERE activo = true;
