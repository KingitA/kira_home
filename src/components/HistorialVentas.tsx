'use client'

import { useState, useEffect } from 'react'
import { supabase, Venta, VentaItem } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Receipt, ChevronDown, ChevronUp, Banknote, CreditCard,
  Calendar, XCircle, Package
} from 'lucide-react'

interface VentaConItems extends Venta {
  venta_items: (VentaItem & { articulo: { descripcion: string; codigo: string } })[]
}

export default function HistorialVentas() {
  const [ventas, setVentas] = useState<VentaConItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'efectivo' | 'transferencia'>('todas')

  useEffect(() => {
    fetchVentas()
    const channel = supabase.channel('ventas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => fetchVentas())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchVentas() {
    setLoading(true)
    const { data } = await supabase.from('ventas')
      .select(`*, venta_items (*, articulo:articulos ( descripcion, codigo ))`)
      .order('fecha', { ascending: false }).limit(100)
    if (data) setVentas(data as VentaConItems[])
    setLoading(false)
  }

  async function anularVenta(venta: VentaConItems) {
    if (!confirm('¿Seguro que querés anular esta venta? Se devolverá el stock y se ajustará la caja.')) return
    try {
      await supabase.from('ventas').update({ estado: 'anulada' }).eq('id', venta.id)
      for (const item of venta.venta_items) {
        const { data: art } = await supabase.from('articulos').select('cantidad').eq('id', item.articulo_id).single()
        if (art) await supabase.from('articulos').update({ cantidad: art.cantidad + item.cantidad }).eq('id', item.articulo_id)
      }
      const { data: bill } = await supabase.from('billetera').select('*').eq('tipo', venta.metodo_pago).single()
      if (bill) await supabase.from('billetera').update({ saldo: bill.saldo - venta.total }).eq('id', bill.id)
      fetchVentas()
    } catch (err) { console.error('Error anulando venta:', err) }
  }

  const ventasFiltradas = filtro === 'todas' ? ventas : ventas.filter(v => v.metodo_pago === filtro)
  const totalVentas = ventasFiltradas.filter(v => v.estado === 'completada').reduce((s, v) => s + v.total, 0)
  const cantVentas = ventasFiltradas.filter(v => v.estado === 'completada').length

  const ventasPorFecha: Record<string, VentaConItems[]> = {}
  ventasFiltradas.forEach(v => {
    const fecha = new Date(v.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!ventasPorFecha[fecha]) ventasPorFecha[fecha] = []
    ventasPorFecha[fecha].push(v)
  })

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto bg-botanical min-h-full">
      <div className="relative z-10">
        <div className="mb-6">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">Historial de Ventas</h2>
          <p className="text-sm text-gray-500 mt-1">Registro de todas las ventas realizadas</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Ventas</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{cantVentas}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total facturado</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">{formatCurrency(totalVentas)}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 col-span-2 lg:col-span-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Ticket promedio</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">
              {cantVentas > 0 ? formatCurrency(totalVentas / cantVentas) : '$0'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(['todas', 'efectivo', 'transferencia'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                filtro === f ? "bg-kira-100 text-kira-700 border border-kira-200" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando ventas...</div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Receipt size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">No hay ventas registradas</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(ventasPorFecha).map(([fecha, ventasDelDia]) => (
              <div key={fecha}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={13} className="text-gray-400" />
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider capitalize">{fecha}</h3>
                  <span className="text-xs text-gray-300">
                    ({ventasDelDia.filter(v => v.estado === 'completada').length} ventas ·{' '}
                    {formatCurrency(ventasDelDia.filter(v => v.estado === 'completada').reduce((s, v) => s + v.total, 0))})
                  </span>
                </div>
                <div className="space-y-2">
                  {ventasDelDia.map(venta => {
                    const isExpanded = expandedId === venta.id
                    const isAnulada = venta.estado === 'anulada'
                    return (
                      <div key={venta.id} className={cn("bg-white rounded-xl border overflow-hidden transition-all",
                        isAnulada ? "border-red-100 opacity-60" : "border-gray-100")}>
                        <button onClick={() => setExpandedId(isExpanded ? null : venta.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition-colors">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            isAnulada ? "bg-red-100" : venta.metodo_pago === 'efectivo' ? "bg-emerald-100" : "bg-blue-100")}>
                            {isAnulada ? <XCircle size={14} className="text-red-500" /> :
                              venta.metodo_pago === 'efectivo' ? <Banknote size={14} className="text-emerald-600" /> :
                              <CreditCard size={14} className="text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              Venta #{venta.id}
                              {isAnulada && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">ANULADA</span>}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(venta.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}{venta.venta_items?.length ?? 0} artículo{(venta.venta_items?.length ?? 0) !== 1 ? 's' : ''}
                              {' · '}{venta.metodo_pago}
                              {venta.nota && venta.nota.includes('Pago mixto') && ' · mixto'}
                            </p>
                          </div>
                          <span className={cn("text-sm font-semibold", isAnulada ? "text-red-400 line-through" : "text-gray-800")}>
                            {formatCurrency(venta.total)}
                          </span>
                          {isExpanded ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/30 animate-fade-in">
                            <div className="space-y-1.5 mb-3">
                              {venta.venta_items?.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Package size={12} className="text-gray-300" />
                                    <span className="text-gray-700">{item.articulo?.descripcion ?? 'Artículo eliminado'}</span>
                                    <span className="text-xs text-gray-400">x{item.cantidad}</span>
                                  </div>
                                  <span className="text-gray-600">{formatCurrency(item.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                            {venta.nota && (
                              <div className="text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-1.5 mb-2">
                                {venta.nota}
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div>
                                {!isAnulada && (
                                  <button onClick={() => anularVenta(venta)}
                                    className="text-xs text-red-500 hover:text-red-600 hover:underline">Anular venta</button>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Total</p>
                                <p className="font-semibold text-gray-800">{formatCurrency(venta.total)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
