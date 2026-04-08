'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Venta, VentaItem, OrdenPago, Gasto, COMPROBANTE_LABELS } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Receipt, ChevronDown, ChevronUp, Banknote, CreditCard,
  Calendar, XCircle, Package, TrendingUp, ArrowDownRight, ArrowUpRight,
  Filter, BarChart3, Building2, DollarSign, Zap
} from 'lucide-react'

interface VentaConItems extends Venta {
  venta_items: (VentaItem & { articulo: { descripcion: string; codigo: string; proveedor: string } })[]
}

interface OrdenPagoConProv extends OrdenPago {
  proveedor?: { nombre: string; tipo: string }
  comprobante?: { tipo_comprobante: string; numero: string | null; total: number }
}

type RangoRapido = 'hoy' | 'ayer' | 'semana' | 'mes' | '2meses' | 'todo'
type FiltroTipo = 'todo' | 'ventas' | 'pagos' | 'gastos'

function getRangoFechas(rango: RangoRapido): [Date, Date] {
  const hoy = new Date(); hoy.setHours(0,0,0,0)
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

// Unified movement type
interface Movimiento {
  id: string
  tipo: 'venta' | 'pago_proveedor' | 'gasto'
  fecha: string
  monto: number
  direccion: 'entrada' | 'salida'
  metodo_pago: string
  titulo: string
  subtitulo: string
  detalle?: any
  expandible: boolean
}

export default function HistorialVentas() {
  const [ventas, setVentas] = useState<VentaConItems[]>([])
  const [ordenesPago, setOrdenesPago] = useState<OrdenPagoConProv[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rangoRapido, setRangoRapido] = useState<RangoRapido>('todo')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtroPago, setFiltroPago] = useState<'todas' | 'efectivo' | 'transferencia'>('todas')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todo')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchAll()
    const ch1 = supabase.channel('hist-ventas').on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => fetchAll()).subscribe()
    const ch2 = supabase.channel('hist-op').on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_pago' }, () => fetchAll()).subscribe()
    const ch3 = supabase.channel('hist-gastos').on('postgres_changes', { event: '*', schema: 'public', table: 'gastos' }, () => fetchAll()).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3) }
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [v, op, g] = await Promise.all([
      supabase.from('ventas').select(`*, venta_items (*, articulo:articulos ( descripcion, codigo, proveedor ))`).order('fecha', { ascending: false }).limit(500),
      supabase.from('ordenes_pago').select(`*, proveedor:proveedores ( nombre, tipo ), comprobante:comprobantes ( tipo_comprobante, numero, total )`).order('fecha', { ascending: false }).limit(500),
      supabase.from('gastos').select('*').order('fecha', { ascending: false }).limit(500),
    ])
    if (v.data) setVentas(v.data as VentaConItems[])
    if (op.data) setOrdenesPago(op.data as OrdenPagoConProv[])
    if (g.data) setGastos(g.data)
    setLoading(false)
  }

  // Build unified movements list
  const movimientos: Movimiento[] = useMemo(() => {
    const list: Movimiento[] = []

    // Ventas = entradas
    ventas.forEach(v => {
      if (v.estado === 'anulada') return
      list.push({
        id: `v-${v.id}`, tipo: 'venta', fecha: v.fecha, monto: v.total,
        direccion: 'entrada', metodo_pago: v.metodo_pago,
        titulo: `Venta #${v.id}`,
        subtitulo: `${v.venta_items?.length ?? 0} artículo${(v.venta_items?.length ?? 0) !== 1 ? 's' : ''} · ${v.metodo_pago}${v.nota?.includes('mixto') ? ' · mixto' : ''}`,
        detalle: v, expandible: true,
      })
    })

    // Pagos a proveedores = salidas
    ordenesPago.forEach(o => {
      const provNombre = (o.proveedor as any)?.nombre ?? 'Proveedor'
      const provTipo = (o.proveedor as any)?.tipo ?? ''
      const comp = o.comprobante as any
      let sub = `${provNombre} · ${o.metodo_pago}`
      if (o.es_a_cuenta) sub += ' · A cuenta'
      if (comp?.tipo_comprobante) sub += ` · ${COMPROBANTE_LABELS[comp.tipo_comprobante as keyof typeof COMPROBANTE_LABELS] || comp.tipo_comprobante}`
      if (comp?.numero) sub += ` #${comp.numero}`
      if (o.nota) sub += ` · ${o.nota}`

      list.push({
        id: `op-${o.id}`, tipo: 'pago_proveedor', fecha: o.fecha, monto: o.monto,
        direccion: 'salida', metodo_pago: o.metodo_pago,
        titulo: `Pago a ${provNombre}`,
        subtitulo: sub,
        detalle: { ...o, provTipo }, expandible: true,
      })
    })

    // Gastos = salidas
    gastos.forEach(g => {
      let sub = `${g.metodo_pago}`
      if (g.tiene_comprobante && g.tipo_comprobante) sub += ` · ${g.tipo_comprobante}`
      if (g.tiene_comprobante && g.numero_comprobante) sub += ` #${g.numero_comprobante}`
      if (g.nota) sub += ` · ${g.nota}`

      list.push({
        id: `g-${g.id}`, tipo: 'gasto', fecha: g.fecha, monto: g.monto,
        direccion: 'salida', metodo_pago: g.metodo_pago,
        titulo: g.descripcion,
        subtitulo: sub,
        detalle: g, expandible: false,
      })
    })

    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [ventas, ordenesPago, gastos])

  // Apply filters
  const movsFiltrados = useMemo(() => {
    let list = movimientos

    // Date filter
    if (fechaDesde || fechaHasta) {
      const desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : new Date(2020,0,1)
      const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : new Date()
      list = list.filter(m => { const f = new Date(m.fecha); return f >= desde && f <= hasta })
    } else if (rangoRapido !== 'todo') {
      const [desde, hasta] = getRangoFechas(rangoRapido)
      list = list.filter(m => { const f = new Date(m.fecha); return f >= desde && f <= hasta })
    }

    // Payment method filter
    if (filtroPago !== 'todas') list = list.filter(m => m.metodo_pago === filtroPago)

    // Type filter
    if (filtroTipo === 'ventas') list = list.filter(m => m.tipo === 'venta')
    else if (filtroTipo === 'pagos') list = list.filter(m => m.tipo === 'pago_proveedor')
    else if (filtroTipo === 'gastos') list = list.filter(m => m.tipo === 'gasto')

    return list
  }, [movimientos, fechaDesde, fechaHasta, rangoRapido, filtroPago, filtroTipo])

  // Stats
  const totalEntradas = movsFiltrados.filter(m => m.direccion === 'entrada').reduce((s, m) => s + m.monto, 0)
  const totalSalidas = movsFiltrados.filter(m => m.direccion === 'salida').reduce((s, m) => s + m.monto, 0)
  const balance = totalEntradas - totalSalidas

  const entradasEfectivo = movsFiltrados.filter(m => m.direccion === 'entrada' && m.metodo_pago === 'efectivo').reduce((s, m) => s + m.monto, 0)
  const entradasTransf = movsFiltrados.filter(m => m.direccion === 'entrada' && m.metodo_pago === 'transferencia').reduce((s, m) => s + m.monto, 0)
  const salidasEfectivo = movsFiltrados.filter(m => m.direccion === 'salida' && m.metodo_pago === 'efectivo').reduce((s, m) => s + m.monto, 0)
  const salidasTransf = movsFiltrados.filter(m => m.direccion === 'salida' && m.metodo_pago === 'transferencia').reduce((s, m) => s + m.monto, 0)

  const cantVentas = movsFiltrados.filter(m => m.tipo === 'venta').length
  const cantPagos = movsFiltrados.filter(m => m.tipo === 'pago_proveedor').length
  const cantGastos = movsFiltrados.filter(m => m.tipo === 'gasto').length

  // Ajustes from ventas
  const totalAjuste = ventas.filter(v => v.estado === 'completada').reduce((s, v) => {
    if (!v.nota) return s
    const match = v.nota.match(/Ajuste: \$?([\d.,\-]+)/)
    if (match) { const val = parseFloat(match[1].replace(/\./g, '').replace(',', '.')); return s + (isNaN(val) ? 0 : val) }
    return s
  }, 0)

  // Top products
  const topProductos = useMemo(() => {
    const map = new Map<string, { nombre: string; cant: number; total: number }>()
    ventas.filter(v => v.estado === 'completada').forEach(v => v.venta_items?.forEach(i => {
      const key = i.articulo?.descripcion || '?'
      const cur = map.get(key) || { nombre: key, cant: 0, total: 0 }
      cur.cant += i.cantidad; cur.total += i.subtotal; map.set(key, cur)
    }))
    return Array.from(map.values()).sort((a, b) => b.cant - a.cant).slice(0, 5)
  }, [ventas])

  // Group by date
  const movsPorFecha: Record<string, Movimiento[]> = {}
  movsFiltrados.forEach(m => {
    const fecha = new Date(m.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!movsPorFecha[fecha]) movsPorFecha[fecha] = []
    movsPorFecha[fecha].push(m)
  })

  function selectRango(r: RangoRapido) { setRangoRapido(r); setFechaDesde(''); setFechaHasta('') }

  async function anularVenta(ventaId: number) {
    const venta = ventas.find(v => v.id === ventaId)
    if (!venta || !confirm('¿Anular esta venta? Se restaurará el stock.')) return
    await supabase.from('ventas').update({ estado: 'anulada' }).eq('id', venta.id)
    for (const item of venta.venta_items) {
      const { data: art } = await supabase.from('articulos').select('cantidad').eq('id', item.articulo_id).single()
      if (art) await supabase.from('articulos').update({ cantidad: art.cantidad + item.cantidad }).eq('id', item.articulo_id)
    }
    const { data: bill } = await supabase.from('billetera').select('*').eq('tipo', venta.metodo_pago).single()
    if (bill) await supabase.from('billetera').update({ saldo: bill.saldo - venta.total }).eq('id', bill.id)
    fetchAll()
  }

  function getMovIcon(m: Movimiento) {
    if (m.tipo === 'venta') return m.metodo_pago === 'efectivo' ? <Banknote size={14} className="text-emerald-600" /> : <CreditCard size={14} className="text-emerald-600" />
    if (m.tipo === 'pago_proveedor') return m.detalle?.provTipo === 'servicio' ? <Zap size={14} className="text-orange-500" /> : <Building2 size={14} className="text-red-500" />
    return <DollarSign size={14} className="text-amber-500" />
  }

  function getMovBg(m: Movimiento) {
    if (m.tipo === 'venta') return 'bg-emerald-50'
    if (m.tipo === 'pago_proveedor') return m.detalle?.provTipo === 'servicio' ? 'bg-orange-50' : 'bg-red-50'
    return 'bg-amber-50'
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto bg-botanical min-h-full">
      <div className="relative z-10">
        <div className="mb-5">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">Historial & Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Movimientos de caja: ventas, pagos y gastos</p>
        </div>

        {/* Quick date filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([['hoy','Hoy'],['ayer','Ayer'],['semana','Semana'],['mes','Mes'],['2meses','2 meses'],['todo','Todo']] as [RangoRapido,string][]).map(([k,l]) => (
            <button key={k} onClick={() => selectRango(k)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                rangoRapido === k && !fechaDesde ? "bg-kira-500 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>{l}</button>
          ))}
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ml-auto",
              showFilters ? "bg-kira-100 text-kira-700 border border-kira-200" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>
            <Filter size={12} /> Filtros
          </button>
        </div>

        {/* Type filter pills */}
        <div className="flex gap-2 mb-4">
          {([['todo','Todo'],['ventas','Ventas'],['pagos','Pagos prov.'],['gastos','Gastos']] as [FiltroTipo,string][]).map(([k,l]) => (
            <button key={k} onClick={() => setFiltroTipo(k)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filtroTipo === k ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>{l}</button>
          ))}
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="text-xs text-gray-500 font-medium mb-1 block">Desde</label>
                <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setRangoRapido('todo') }} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" /></div>
              <div><label className="text-xs text-gray-500 font-medium mb-1 block">Hasta</label>
                <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setRangoRapido('todo') }} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" /></div>
              <div><label className="text-xs text-gray-500 font-medium mb-1 block">Método pago</label>
                <select value={filtroPago} onChange={e => setFiltroPago(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30">
                  <option value="todas">Todos</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
                </select></div>
            </div>
            {(fechaDesde || fechaHasta || filtroPago !== 'todas') && (
              <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setFiltroPago('todas'); setRangoRapido('todo') }} className="mt-2 text-xs text-kira-600 hover:underline">Limpiar filtros</button>
            )}
          </div>
        )}

        {/* Dashboard cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1"><ArrowUpRight size={12} className="text-emerald-500" /><p className="text-xs text-gray-400 uppercase tracking-wider">Entradas</p></div>
            <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totalEntradas)}</p>
            <p className="text-[10px] text-gray-400">{cantVentas} ventas</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1"><ArrowDownRight size={12} className="text-red-500" /><p className="text-xs text-gray-400 uppercase tracking-wider">Salidas</p></div>
            <p className="text-xl font-semibold text-red-600">{formatCurrency(totalSalidas)}</p>
            <p className="text-[10px] text-gray-400">{cantPagos} pagos · {cantGastos} gastos</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={12} className="text-gray-400" /><p className="text-xs text-gray-400 uppercase tracking-wider">Balance</p></div>
            <p className={cn("text-xl font-semibold", balance >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(balance)}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1"><BarChart3 size={12} className="text-gray-400" /><p className="text-xs text-gray-400 uppercase tracking-wider">Ticket prom.</p></div>
            <p className="text-xl font-semibold text-gray-900">{cantVentas > 0 ? formatCurrency(totalEntradas / cantVentas) : '$0'}</p>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Flujo por método de pago</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2"><Banknote size={14} className="text-emerald-500" /><span className="text-sm text-gray-700">Efectivo</span></div>
                </div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-600">+{formatCurrency(entradasEfectivo)}</span>
                  <span className="text-red-500">-{formatCurrency(salidasEfectivo)}</span>
                  <span className={cn("font-semibold", entradasEfectivo - salidasEfectivo >= 0 ? "text-emerald-700" : "text-red-700")}>= {formatCurrency(entradasEfectivo - salidasEfectivo)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 flex overflow-hidden">
                  {totalEntradas + totalSalidas > 0 && (<>
                    <div className="bg-emerald-400 h-2" style={{ width: `${entradasEfectivo / (totalEntradas + totalSalidas) * 100}%` }} />
                    <div className="bg-red-300 h-2" style={{ width: `${salidasEfectivo / (totalEntradas + totalSalidas) * 100}%` }} />
                  </>)}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2"><CreditCard size={14} className="text-blue-500" /><span className="text-sm text-gray-700">Transferencia</span></div>
                </div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-600">+{formatCurrency(entradasTransf)}</span>
                  <span className="text-red-500">-{formatCurrency(salidasTransf)}</span>
                  <span className={cn("font-semibold", entradasTransf - salidasTransf >= 0 ? "text-emerald-700" : "text-red-700")}>= {formatCurrency(entradasTransf - salidasTransf)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 flex overflow-hidden">
                  {totalEntradas + totalSalidas > 0 && (<>
                    <div className="bg-blue-400 h-2" style={{ width: `${entradasTransf / (totalEntradas + totalSalidas) * 100}%` }} />
                    <div className="bg-red-300 h-2" style={{ width: `${salidasTransf / (totalEntradas + totalSalidas) * 100}%` }} />
                  </>)}
                </div>
              </div>
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Productos más vendidos</p>
            {topProductos.length === 0 ? <p className="text-sm text-gray-300 text-center py-4">Sin datos</p> : (
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

        {/* Timeline */}
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Movimientos ({movsFiltrados.length})
          </h3>
        </div>

        {loading ? <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div> :
        movsFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Receipt size={36} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">Sin movimientos en el período</p></div>
        ) : (
          <div className="space-y-5">
            {Object.entries(movsPorFecha).map(([fecha, movsDia]) => {
              const entradasDia = movsDia.filter(m => m.direccion === 'entrada').reduce((s,m) => s+m.monto, 0)
              const salidasDia = movsDia.filter(m => m.direccion === 'salida').reduce((s,m) => s+m.monto, 0)
              return (
                <div key={fecha}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={13} className="text-gray-400" />
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider capitalize">{fecha}</h3>
                    <span className="text-xs text-gray-300">
                      {entradasDia > 0 && <span className="text-emerald-500">+{formatCurrency(entradasDia)}</span>}
                      {entradasDia > 0 && salidasDia > 0 && ' / '}
                      {salidasDia > 0 && <span className="text-red-400">-{formatCurrency(salidasDia)}</span>}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {movsDia.map(mov => {
                      const isExp = expandedId === mov.id
                      return (
                        <div key={mov.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                          <button onClick={() => mov.expandible && setExpandedId(isExp ? null : mov.id)}
                            className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors", mov.expandible && "hover:bg-gray-50/50")}>
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", getMovBg(mov))}>
                              {getMovIcon(mov)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{mov.titulo}</p>
                              <p className="text-xs text-gray-400 truncate">{new Date(mov.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {mov.subtitulo}</p>
                            </div>
                            <span className={cn("text-sm font-semibold", mov.direccion === 'entrada' ? "text-emerald-600" : "text-red-600")}>
                              {mov.direccion === 'entrada' ? '+' : '-'}{formatCurrency(mov.monto)}
                            </span>
                            {mov.expandible && (isExp ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />)}
                          </button>

                          {/* Expanded detail */}
                          {isExp && mov.tipo === 'venta' && (
                            <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/30 animate-fade-in">
                              <div className="space-y-1.5 mb-3">
                                {(mov.detalle as VentaConItems).venta_items?.map(item => (
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
                              {(mov.detalle as VentaConItems).nota && (
                                <div className="text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-1.5 mb-2">{(mov.detalle as VentaConItems).nota}</div>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <button onClick={() => anularVenta((mov.detalle as VentaConItems).id)} className="text-xs text-red-500 hover:text-red-600 hover:underline">Anular venta</button>
                                <p className="font-semibold text-gray-800">{formatCurrency(mov.monto)}</p>
                              </div>
                            </div>
                          )}

                          {isExp && mov.tipo === 'pago_proveedor' && (
                            <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/30 animate-fade-in">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-xs text-gray-400">Proveedor</span><p className="text-gray-700">{(mov.detalle as any).proveedor?.nombre}</p></div>
                                <div><span className="text-xs text-gray-400">Método</span><p className="text-gray-700 capitalize">{mov.metodo_pago}</p></div>
                                {(mov.detalle as any).comprobante?.tipo_comprobante && (
                                  <div><span className="text-xs text-gray-400">Comprobante</span><p className="text-gray-700">{COMPROBANTE_LABELS[(mov.detalle as any).comprobante.tipo_comprobante as keyof typeof COMPROBANTE_LABELS]} {(mov.detalle as any).comprobante.numero && `#${(mov.detalle as any).comprobante.numero}`}</p></div>
                                )}
                                {(mov.detalle as OrdenPago).es_a_cuenta && <div><span className="text-xs text-gray-400">Tipo</span><p className="text-amber-600 font-medium">A cuenta</p></div>}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
