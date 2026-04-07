'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Venta, VentaItem } from '@/lib/supabase'
import { formatCurrency, formatDateShort, cn } from '@/lib/utils'
import {
  Receipt, ChevronDown, ChevronUp, Banknote, CreditCard,
  Calendar, XCircle, Package, TrendingUp, ArrowDownRight,
  Filter, BarChart3
} from 'lucide-react'

interface VentaConItems extends Venta {
  venta_items: (VentaItem & { articulo: { descripcion: string; codigo: string; proveedor: string } })[]
}

type RangoRapido = 'hoy' | 'ayer' | 'semana' | 'mes' | '2meses' | 'todo'

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r }

function getRangoFechas(rango: RangoRapido): [Date, Date] {
  const hoy = startOfDay(new Date())
  const fin = new Date(); fin.setHours(23,59,59,999)
  switch (rango) {
    case 'hoy': return [hoy, fin]
    case 'ayer': { const a = new Date(hoy); a.setDate(a.getDate()-1); const af = new Date(a); af.setHours(23,59,59,999); return [a, af] }
    case 'semana': { const s = new Date(hoy); s.setDate(s.getDate()-7); return [s, fin] }
    case 'mes': { const m = new Date(hoy); m.setMonth(m.getMonth()-1); return [m, fin] }
    case '2meses': { const m = new Date(hoy); m.setMonth(m.getMonth()-2); return [m, fin] }
    case 'todo': return [new Date(2020,0,1), fin]
  }
}

export default function HistorialVentas() {
  const [ventas, setVentas] = useState<VentaConItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [rangoRapido, setRangoRapido] = useState<RangoRapido>('todo')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtroPago, setFiltroPago] = useState<'todas' | 'efectivo' | 'transferencia'>('todas')
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchVentas()
    const ch = supabase.channel('ventas-h').on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => fetchVentas()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function fetchVentas() {
    setLoading(true)
    const { data } = await supabase.from('ventas')
      .select(`*, venta_items (*, articulo:articulos ( descripcion, codigo, proveedor ))`)
      .order('fecha', { ascending: false }).limit(500)
    if (data) setVentas(data as VentaConItems[])
    setLoading(false)
  }

  // Filter logic
  const ventasFiltradas = useMemo(() => {
    let filtered = ventas

    // Date filter
    if (fechaDesde || fechaHasta) {
      const desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : new Date(2020,0,1)
      const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : new Date()
      filtered = filtered.filter(v => { const f = new Date(v.fecha); return f >= desde && f <= hasta })
    } else if (rangoRapido !== 'todo') {
      const [desde, hasta] = getRangoFechas(rangoRapido)
      filtered = filtered.filter(v => { const f = new Date(v.fecha); return f >= desde && f <= hasta })
    }

    // Payment filter
    if (filtroPago !== 'todas') filtered = filtered.filter(v => v.metodo_pago === filtroPago)

    // Proveedor filter
    if (filtroProveedor) {
      filtered = filtered.filter(v => v.venta_items?.some(i => i.articulo?.proveedor === filtroProveedor))
    }

    return filtered
  }, [ventas, fechaDesde, fechaHasta, rangoRapido, filtroPago, filtroProveedor])

  // Stats
  const completadas = ventasFiltradas.filter(v => v.estado === 'completada')
  const totalVentas = completadas.reduce((s, v) => s + v.total, 0)
  const cantVentas = completadas.length

  const totalEfectivo = completadas.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + v.total, 0)
  const totalTransferencia = completadas.filter(v => v.metodo_pago === 'transferencia').reduce((s, v) => s + v.total, 0)

  // Ajustes: parse from notes
  const totalAjuste = completadas.reduce((s, v) => {
    if (!v.nota) return s
    const match = v.nota.match(/Ajuste: \$([\d.,]+)/)
    if (match) {
      const val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
      return s + (isNaN(val) ? 0 : val)
    }
    return s
  }, 0)

  // Proveedores list
  const proveedores = useMemo(() => {
    const set = new Set<string>()
    ventas.forEach(v => v.venta_items?.forEach(i => { if (i.articulo?.proveedor) set.add(i.articulo.proveedor) }))
    return Array.from(set).sort()
  }, [ventas])

  // Group by date
  const ventasPorFecha: Record<string, VentaConItems[]> = {}
  ventasFiltradas.forEach(v => {
    const fecha = new Date(v.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!ventasPorFecha[fecha]) ventasPorFecha[fecha] = []
    ventasPorFecha[fecha].push(v)
  })

  // Top products
  const topProductos = useMemo(() => {
    const map = new Map<string, { nombre: string; cant: number; total: number }>()
    completadas.forEach(v => v.venta_items?.forEach(i => {
      const key = i.articulo?.descripcion || 'Desconocido'
      const cur = map.get(key) || { nombre: key, cant: 0, total: 0 }
      cur.cant += i.cantidad; cur.total += i.subtotal
      map.set(key, cur)
    }))
    return Array.from(map.values()).sort((a, b) => b.cant - a.cant).slice(0, 5)
  }, [completadas])

  async function anularVenta(venta: VentaConItems) {
    if (!confirm('¿Anular esta venta? Se devolverá el stock y se ajustará la caja.')) return
    try {
      await supabase.from('ventas').update({ estado: 'anulada' }).eq('id', venta.id)
      for (const item of venta.venta_items) {
        const { data: art } = await supabase.from('articulos').select('cantidad').eq('id', item.articulo_id).single()
        if (art) await supabase.from('articulos').update({ cantidad: art.cantidad + item.cantidad }).eq('id', item.articulo_id)
      }
      const { data: bill } = await supabase.from('billetera').select('*').eq('tipo', venta.metodo_pago).single()
      if (bill) await supabase.from('billetera').update({ saldo: bill.saldo - venta.total }).eq('id', bill.id)
      fetchVentas()
    } catch (err) { console.error(err) }
  }

  function selectRango(r: RangoRapido) { setRangoRapido(r); setFechaDesde(''); setFechaHasta('') }

  const pctEfectivo = totalVentas > 0 ? (totalEfectivo / totalVentas * 100) : 0
  const pctTransferencia = totalVentas > 0 ? (totalTransferencia / totalVentas * 100) : 0

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto bg-botanical min-h-full">
      <div className="relative z-10">
        <div className="mb-5">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">Dashboard de Ventas</h2>
          <p className="text-sm text-gray-500 mt-1">Análisis y registro de ventas</p>
        </div>

        {/* Quick date filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            ['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Última semana'],
            ['mes', 'Último mes'], ['2meses', '2 meses'], ['todo', 'Todo']
          ] as [RangoRapido, string][]).map(([key, label]) => (
            <button key={key} onClick={() => selectRango(key)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                rangoRapido === key && !fechaDesde ? "bg-kira-500 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>
              {label}
            </button>
          ))}
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ml-auto",
              showFilters ? "bg-kira-100 text-kira-700 border border-kira-200" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>
            <Filter size={12} /> Filtros
          </button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Desde</label>
                <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setRangoRapido('todo') }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Hasta</label>
                <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setRangoRapido('todo') }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Forma de pago</label>
                <select value={filtroPago} onChange={e => setFiltroPago(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30">
                  <option value="todas">Todas</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Proveedor</label>
                <select value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30">
                  <option value="">Todos</option>
                  {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            {(fechaDesde || fechaHasta || filtroPago !== 'todas' || filtroProveedor) && (
              <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setFiltroPago('todas'); setFiltroProveedor(''); setRangoRapido('todo') }}
                className="mt-2 text-xs text-kira-600 hover:underline">Limpiar filtros</button>
            )}
          </div>
        )}

        {/* Dashboard cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Receipt size={12} className="text-gray-400" />
              <p className="text-xs text-gray-400 uppercase tracking-wider">Ventas</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{cantVentas}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-gray-400" />
              <p className="text-xs text-gray-400 uppercase tracking-wider">Facturado</p>
            </div>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalVentas)}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 size={12} className="text-gray-400" />
              <p className="text-xs text-gray-400 uppercase tracking-wider">Ticket prom.</p>
            </div>
            <p className="text-xl font-semibold text-gray-900">{cantVentas > 0 ? formatCurrency(totalVentas / cantVentas) : '$0'}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownRight size={12} className="text-amber-500" />
              <p className="text-xs text-gray-400 uppercase tracking-wider">Ajustes</p>
            </div>
            <p className={cn("text-xl font-semibold", totalAjuste > 0 ? "text-amber-600" : totalAjuste < 0 ? "text-red-600" : "text-gray-900")}>
              {formatCurrency(totalAjuste)}
            </p>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Desglose por método de pago</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><Banknote size={14} className="text-emerald-500" /><span className="text-sm text-gray-700">Efectivo</span></div>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(totalEfectivo)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: `${pctEfectivo}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{pctEfectivo.toFixed(0)}% del total</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><CreditCard size={14} className="text-blue-500" /><span className="text-sm text-gray-700">Transferencia</span></div>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(totalTransferencia)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${pctTransferencia}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{pctTransferencia.toFixed(0)}% del total</p>
              </div>
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Productos más vendidos</p>
            {topProductos.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {topProductos.map((p, i) => (
                  <div key={p.nombre} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-kira-100 text-kira-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{p.nombre}</span>
                    <span className="text-xs text-gray-400">{p.cant}u</span>
                    <span className="text-xs font-semibold text-gray-600">{formatCurrency(p.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sales list */}
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Detalle de ventas</h3>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando ventas...</div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Receipt size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">No hay ventas en el período seleccionado</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(ventasPorFecha).map(([fecha, ventasDelDia]) => (
              <div key={fecha}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={13} className="text-gray-400" />
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider capitalize">{fecha}</h3>
                  <span className="text-xs text-gray-300">
                    ({ventasDelDia.filter(v => v.estado === 'completada').length} ventas · {formatCurrency(ventasDelDia.filter(v => v.estado === 'completada').reduce((s, v) => s + v.total, 0))})
                  </span>
                </div>
                <div className="space-y-2">
                  {ventasDelDia.map(venta => {
                    const isExp = expandedId === venta.id
                    const isAn = venta.estado === 'anulada'
                    return (
                      <div key={venta.id} className={cn("bg-white rounded-xl border overflow-hidden transition-all", isAn ? "border-red-100 opacity-60" : "border-gray-100")}>
                        <button onClick={() => setExpandedId(isExp ? null : venta.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition-colors">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            isAn ? "bg-red-100" : venta.metodo_pago === 'efectivo' ? "bg-emerald-100" : "bg-blue-100")}>
                            {isAn ? <XCircle size={14} className="text-red-500" /> :
                              venta.metodo_pago === 'efectivo' ? <Banknote size={14} className="text-emerald-600" /> :
                              <CreditCard size={14} className="text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              Venta #{venta.id}
                              {isAn && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">ANULADA</span>}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(venta.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}{venta.venta_items?.length ?? 0} art.
                              {' · '}{venta.metodo_pago}
                              {venta.nota?.includes('mixto') && ' · mixto'}
                            </p>
                          </div>
                          <span className={cn("text-sm font-semibold", isAn ? "text-red-400 line-through" : "text-gray-800")}>{formatCurrency(venta.total)}</span>
                          {isExp ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
                        </button>

                        {isExp && (
                          <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/30 animate-fade-in">
                            <div className="space-y-1.5 mb-3">
                              {venta.venta_items?.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Package size={12} className="text-gray-300" />
                                    <span className="text-gray-700">{item.articulo?.descripcion ?? 'Eliminado'}</span>
                                    <span className="text-xs text-gray-400">x{item.cantidad}</span>
                                  </div>
                                  <span className="text-gray-600">{formatCurrency(item.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                            {venta.nota && <div className="text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-1.5 mb-2">{venta.nota}</div>}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              {!isAn ? <button onClick={() => anularVenta(venta)} className="text-xs text-red-500 hover:text-red-600 hover:underline">Anular venta</button> : <div />}
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
