import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Articulo {
  id: number; proveedor: string; codigo: string; descripcion: string; cantidad: number
  costo_unitario: number; precio_comparativo: number | null; precio_venta: number
  nota: string; activo: boolean; created_at: string; updated_at: string
}

export interface Venta {
  id: number; fecha: string; total: number; metodo_pago: 'efectivo' | 'transferencia'
  estado: 'completada' | 'anulada'; nota: string | null; created_at: string
}

export interface VentaItem {
  id: number; venta_id: number; articulo_id: number; cantidad: number
  precio_unitario: number; subtotal: number; articulo?: Articulo
}

export interface Billetera {
  id: number; tipo: 'efectivo' | 'transferencia'; saldo: number; updated_at: string
}

export interface CarritoItem { articulo: Articulo; cantidad: number }

// Proveedores
export interface Proveedor {
  id: number; nombre: string; tipo: 'mercaderia' | 'servicio'
  cuit: string | null; direccion: string | null; localidad: string | null; provincia: string | null
  emails: string[]; whatsapps: string[]
  frecuencia_pago: 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | null
  proximo_vencimiento: string | null
  activo: boolean; created_at: string; updated_at: string
}

export type TipoComprobante =
  'factura_a' | 'factura_b' | 'factura_c' |
  'debito_a' | 'debito_b' | 'debito_c' |
  'credito_a' | 'credito_b' | 'credito_c' |
  'presupuesto' | 'reversa'

export interface Comprobante {
  id: number; proveedor_id: number; tipo_comprobante: TipoComprobante
  numero: string | null; fecha: string; fecha_vencimiento: string | null
  subtotal: number; iva_105: number; iva_21: number; iva_27: number
  percepciones: number; otros_impuestos: number; total: number
  descripcion: string | null; estado: 'pendiente' | 'parcial' | 'pagado' | 'anulado'
  saldo_pendiente: number; created_at: string
}

export interface OrdenPago {
  id: number; proveedor_id: number; fecha: string
  metodo_pago: 'efectivo' | 'transferencia'; monto: number
  comprobante_id: number | null; es_a_cuenta: boolean
  nota: string | null; created_at: string
}

export interface OrdenCompra {
  id: number; proveedor_id: number; numero: string | null; fecha: string
  estado: 'borrador' | 'enviada' | 'recibida' | 'anulada'
  subtotal: number; iva: number; total: number
  nota: string | null; created_at: string
}

export interface OrdenCompraItem {
  id: number; orden_compra_id: number; articulo_id: number
  cantidad: number; precio_unitario: number; subtotal: number
  articulo?: Articulo
}

export interface Gasto {
  id: number; descripcion: string; monto: number
  metodo_pago: 'efectivo' | 'transferencia'; fecha: string
  proveedor_id: number | null; tiene_comprobante: boolean
  tipo_comprobante: string | null; numero_comprobante: string | null
  nota: string | null; created_at: string
}

export const COMPROBANTE_LABELS: Record<TipoComprobante, string> = {
  factura_a: 'Factura A', factura_b: 'Factura B', factura_c: 'Factura C',
  debito_a: 'Nota de Débito A', debito_b: 'Nota de Débito B', debito_c: 'Nota de Débito C',
  credito_a: 'Nota de Crédito A', credito_b: 'Nota de Crédito B', credito_c: 'Nota de Crédito C',
  presupuesto: 'Presupuesto', reversa: 'Reversa'
}

// Comprobantes que suman a la deuda (facturas y débitos)
export const COMPROBANTES_DEUDA: TipoComprobante[] = [
  'factura_a','factura_b','factura_c','debito_a','debito_b','debito_c','presupuesto'
]
// Comprobantes que restan de la deuda (créditos y reversas)
export const COMPROBANTES_CREDITO: TipoComprobante[] = [
  'credito_a','credito_b','credito_c','reversa'
]
// Comprobantes con IVA
export const COMPROBANTES_CON_IVA: TipoComprobante[] = [
  'factura_a','factura_b','factura_c','debito_a','debito_b','debito_c',
  'credito_a','credito_b','credito_c'
]
