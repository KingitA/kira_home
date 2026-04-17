import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito'

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta_debito: 'Tarjeta Débito', tarjeta_credito: 'Tarjeta Crédito'
}

// Display labels for billetera (banco agrupa transf/td/tc)
export const BILLETERA_LABELS: Record<MetodoPago, string> = {
  efectivo: 'Efectivo', transferencia: 'Banco - Transferencia', tarjeta_debito: 'Banco - T. Débito', tarjeta_credito: 'Banco - T. Crédito'
}

export const BILLETERA_GRUPO: Record<MetodoPago, 'efectivo' | 'banco'> = {
  efectivo: 'efectivo', transferencia: 'banco', tarjeta_debito: 'banco', tarjeta_credito: 'banco'
}

export interface Articulo {
  id: number; proveedor: string; codigo: string; descripcion: string; cantidad: number
  costo_unitario: number; precio_comparativo: number | null; precio_venta: number
  nota: string; activo: boolean; created_at: string; updated_at: string
}

export interface Venta {
  id: number; fecha: string; total: number; metodo_pago: MetodoPago
  estado: 'completada' | 'anulada'; nota: string | null; cuotas: number
  comision: number; neto: number | null; created_at: string
}

export interface VentaItem {
  id: number; venta_id: number; articulo_id: number; cantidad: number
  precio_unitario: number; subtotal: number; articulo?: Articulo
}

export interface Billetera {
  id: number; tipo: MetodoPago; saldo: number; updated_at: string
}

export interface CarritoItem { articulo: Articulo; cantidad: number }

export interface Proveedor {
  id: number; nombre: string; tipo: 'mercaderia' | 'servicio'
  cuit: string | null; direccion: string | null; localidad: string | null; provincia: string | null
  emails: string[]; whatsapps: string[]
  frecuencia_pago: 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | null
  proximo_vencimiento: string | null
  activo: boolean; created_at: string; updated_at: string
}

export type TipoComprobante = 'factura_a'|'factura_b'|'factura_c'|'debito_a'|'debito_b'|'debito_c'|'credito_a'|'credito_b'|'credito_c'|'presupuesto'|'reversa'

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
  metodo_pago: MetodoPago; monto: number
  comprobante_id: number | null; es_a_cuenta: boolean
  nota: string | null; created_at: string
}

export interface OrdenCompra {
  id: number; proveedor_id: number; numero: string | null; fecha: string
  estado: 'borrador' | 'enviada' | 'recibida' | 'anulada'
  subtotal: number; iva: number; total: number; nota: string | null; created_at: string
}

export interface OrdenCompraItem {
  id: number; orden_compra_id: number; articulo_id: number
  cantidad: number; precio_unitario: number; subtotal: number; articulo?: Articulo
}

export interface Gasto {
  id: number; descripcion: string; monto: number; metodo_pago: MetodoPago; fecha: string
  proveedor_id: number | null; tiene_comprobante: boolean
  tipo_comprobante: string | null; numero_comprobante: string | null
  nota: string | null; created_at: string
}

export interface Comision {
  id: number; tipo_billetera: string; porcentaje: number
  descripcion: string | null; cuotas: number | null; activo: boolean; created_at: string
}

export interface Posnet {
  id: number; nombre: string; activo: boolean; created_at: string
}

export interface PosnetComision {
  id: number; posnet_id: number; tipo: 'debito' | 'credito'
  cuotas: number; porcentaje: number; descripcion: string | null
  activo: boolean; created_at: string
}

export interface MovimientoCaja {
  id: number; desde: string; hacia: string; monto: number
  nota: string | null; fecha: string; created_at: string
}

export const COMPROBANTE_LABELS: Record<TipoComprobante, string> = {
  factura_a:'Factura A',factura_b:'Factura B',factura_c:'Factura C',
  debito_a:'N/D A',debito_b:'N/D B',debito_c:'N/D C',
  credito_a:'N/C A',credito_b:'N/C B',credito_c:'N/C C',
  presupuesto:'Presupuesto',reversa:'Reversa'
}

export const COMPROBANTES_DEUDA: TipoComprobante[] = ['factura_a','factura_b','factura_c','debito_a','debito_b','debito_c','presupuesto']
export const COMPROBANTES_CREDITO: TipoComprobante[] = ['credito_a','credito_b','credito_c','reversa']
export const COMPROBANTES_CON_IVA: TipoComprobante[] = ['factura_a','factura_b','factura_c','debito_a','debito_b','debito_c','credito_a','credito_b','credito_c']
