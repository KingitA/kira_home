import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Articulo {
  id: number
  proveedor: string
  codigo: string
  descripcion: string
  cantidad: number
  costo_unitario: number
  precio_comparativo: number | null
  precio_venta: number
  nota: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Venta {
  id: number
  fecha: string
  total: number
  metodo_pago: 'efectivo' | 'transferencia'
  estado: 'completada' | 'anulada'
  nota: string | null
  created_at: string
}

export interface VentaItem {
  id: number
  venta_id: number
  articulo_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  articulo?: Articulo
}

export interface Billetera {
  id: number
  tipo: 'efectivo' | 'transferencia'
  saldo: number
  updated_at: string
}

export interface CarritoItem {
  articulo: Articulo
  cantidad: number
}
