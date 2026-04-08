'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Proveedor, Comprobante, OrdenPago, OrdenCompra, OrdenCompraItem, Gasto, Articulo, COMPROBANTE_LABELS, COMPROBANTES_DEUDA, COMPROBANTES_CREDITO, COMPROBANTES_CON_IVA, TipoComprobante } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, Pencil, Trash2, X, Check, ChevronRight, ArrowLeft, Building2, Zap, Phone, Mail, FileText, CreditCard, Banknote, AlertTriangle, Clock, Receipt, ShoppingCart, Save, Download, DollarSign, CalendarClock } from 'lucide-react'

type Vista = 'lista' | 'detalle'
type Tab = 'info' | 'cc' | 'comprobantes' | 'pagos' | 'ordenes'

export default function ProveedoresModule() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('lista')
  const [provActivo, setProvActivo] = useState<Proveedor | null>(null)
  const [tab, setTab] = useState<Tab>('cc')
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'mercaderia' | 'servicio'>('todos')
  const [showAdd, setShowAdd] = useState(false)
  const [showGasto, setShowGasto] = useState(false)

  // Form states
  const [formProv, setFormProv] = useState({ nombre: '', tipo: 'mercaderia' as 'mercaderia'|'servicio', cuit: '', direccion: '', localidad: '', provincia: '', emails: '', whatsapps: '', frecuencia_pago: '' as string, proximo_vencimiento: '' })
  const [editingProv, setEditingProv] = useState(false)

  // Comprobante form
  const [showCompForm, setShowCompForm] = useState(false)
  const [compForm, setCompForm] = useState({ tipo_comprobante: 'factura_a' as TipoComprobante, numero: '', fecha: new Date().toISOString().slice(0,10), fecha_vencimiento: '', subtotal: '', iva_21: '', iva_105: '', iva_27: '', percepciones: '', otros_impuestos: '', descripcion: '' })

  // Orden de pago form
  const [showOPForm, setShowOPForm] = useState(false)
  const [opForm, setOpForm] = useState({ metodo_pago: 'transferencia' as 'efectivo'|'transferencia', monto: '', comprobante_id: '' as string, es_a_cuenta: false, nota: '' })

  // Gasto form
  const [gastoForm, setGastoForm] = useState({ descripcion: '', monto: '', metodo_pago: 'efectivo' as 'efectivo'|'transferencia', fecha: new Date().toISOString().slice(0,10), tiene_comprobante: false, tipo_comprobante: '', numero_comprobante: '', nota: '' })

  // Data for detail view
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [ordenesPago, setOrdenesPago] = useState<OrdenPago[]>([])
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([])
  const [articulosProv, setArticulosProv] = useState<Articulo[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])

  useEffect(() => { fetchProveedores() }, [])

  async function fetchProveedores() {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').eq('activo', true).order('nombre')
    if (data) setProveedores(data)
    setLoading(false)
  }

  async function fetchDetalle(prov: Proveedor) {
    const [comp, op, oc, ga] = await Promise.all([
      supabase.from('comprobantes').select('*').eq('proveedor_id', prov.id).order('fecha', { ascending: false }),
      supabase.from('ordenes_pago').select('*').eq('proveedor_id', prov.id).order('fecha', { ascending: false }),
      supabase.from('ordenes_compra').select('*').eq('proveedor_id', prov.id).order('fecha', { ascending: false }),
      supabase.from('gastos').select('*').eq('proveedor_id', prov.id).order('fecha', { ascending: false }),
    ])
    if (comp.data) setComprobantes(comp.data)
    if (op.data) setOrdenesPago(op.data)
    if (oc.data) setOrdenesCompra(oc.data)
    if (ga.data) setGastos(ga.data)

    if (prov.tipo === 'mercaderia') {
      const { data: pa } = await supabase.from('proveedor_articulos').select('articulo_id').eq('proveedor_id', prov.id)
      if (pa && pa.length > 0) {
        const ids = pa.map(x => x.articulo_id)
        const { data: arts } = await supabase.from('articulos').select('*').in('id', ids).eq('activo', true)
        if (arts) setArticulosProv(arts)
      } else { setArticulosProv([]) }
    }
  }

  function openDetalle(prov: Proveedor) {
    setProvActivo(prov); setVista('detalle'); setTab('cc')
    setFormProv({ nombre: prov.nombre, tipo: prov.tipo, cuit: prov.cuit||'', direccion: prov.direccion||'', localidad: prov.localidad||'', provincia: prov.provincia||'', emails: (prov.emails||[]).join(', '), whatsapps: (prov.whatsapps||[]).join(', '), frecuencia_pago: prov.frecuencia_pago||'', proximo_vencimiento: prov.proximo_vencimiento||'' })
    fetchDetalle(prov)
  }

  async function saveProv() {
    const data = {
      nombre: formProv.nombre, tipo: formProv.tipo, cuit: formProv.cuit || null, direccion: formProv.direccion || null,
      localidad: formProv.localidad || null, provincia: formProv.provincia || null,
      emails: formProv.emails ? formProv.emails.split(',').map(e => e.trim()).filter(Boolean) : [],
      whatsapps: formProv.whatsapps ? formProv.whatsapps.split(',').map(w => w.trim()).filter(Boolean) : [],
      frecuencia_pago: formProv.frecuencia_pago || null,
      proximo_vencimiento: formProv.proximo_vencimiento || null,
    }
    if (editingProv && provActivo) {
      await supabase.from('proveedores').update(data).eq('id', provActivo.id)
      setEditingProv(false)
      const { data: updated } = await supabase.from('proveedores').select('*').eq('id', provActivo.id).single()
      if (updated) setProvActivo(updated)
    } else {
      await supabase.from('proveedores').insert([data])
      setShowAdd(false)
      setFormProv({ nombre: '', tipo: 'mercaderia', cuit: '', direccion: '', localidad: '', provincia: '', emails: '', whatsapps: '', frecuencia_pago: '', proximo_vencimiento: '' })
    }
    fetchProveedores()
  }

  async function saveComprobante() {
    if (!provActivo) return
    const tieneIva = COMPROBANTES_CON_IVA.includes(compForm.tipo_comprobante)
    const sub = parseFloat(compForm.subtotal) || 0
    const i21 = tieneIva ? (parseFloat(compForm.iva_21) || 0) : 0
    const i105 = tieneIva ? (parseFloat(compForm.iva_105) || 0) : 0
    const i27 = tieneIva ? (parseFloat(compForm.iva_27) || 0) : 0
    const perc = tieneIva ? (parseFloat(compForm.percepciones) || 0) : 0
    const otros = tieneIva ? (parseFloat(compForm.otros_impuestos) || 0) : 0
    const total = sub + i21 + i105 + i27 + perc + otros
    const esCredito = COMPROBANTES_CREDITO.includes(compForm.tipo_comprobante)

    await supabase.from('comprobantes').insert([{
      proveedor_id: provActivo.id, tipo_comprobante: compForm.tipo_comprobante,
      numero: compForm.numero || null, fecha: compForm.fecha,
      fecha_vencimiento: compForm.fecha_vencimiento || null,
      subtotal: sub, iva_21: i21, iva_105: i105, iva_27: i27,
      percepciones: perc, otros_impuestos: otros, total,
      descripcion: compForm.descripcion || null,
      saldo_pendiente: esCredito ? 0 : total,
      estado: esCredito ? 'pagado' : 'pendiente',
    }])
    setShowCompForm(false)
    setCompForm({ tipo_comprobante: 'factura_a', numero: '', fecha: new Date().toISOString().slice(0,10), fecha_vencimiento: '', subtotal: '', iva_21: '', iva_105: '', iva_27: '', percepciones: '', otros_impuestos: '', descripcion: '' })
    fetchDetalle(provActivo)
  }

  async function saveOrdenPago() {
    if (!provActivo) return
    const monto = parseFloat(opForm.monto) || 0
    if (monto <= 0) return

    const { data: op } = await supabase.from('ordenes_pago').insert([{
      proveedor_id: provActivo.id, metodo_pago: opForm.metodo_pago, monto,
      comprobante_id: opForm.comprobante_id ? parseInt(opForm.comprobante_id) : null,
      es_a_cuenta: opForm.es_a_cuenta, nota: opForm.nota || null,
    }]).select().single()

    // Update comprobante saldo if linked
    if (op && opForm.comprobante_id && !opForm.es_a_cuenta) {
      const compId = parseInt(opForm.comprobante_id)
      const comp = comprobantes.find(c => c.id === compId)
      if (comp) {
        const nuevoSaldo = Math.max(0, comp.saldo_pendiente - monto)
        await supabase.from('comprobantes').update({
          saldo_pendiente: nuevoSaldo,
          estado: nuevoSaldo <= 0 ? 'pagado' : 'parcial'
        }).eq('id', compId)
      }
    }

    // Update billetera
    const { data: bill } = await supabase.from('billetera').select('*').eq('tipo', opForm.metodo_pago).single()
    if (bill) await supabase.from('billetera').update({ saldo: bill.saldo - monto }).eq('id', bill.id)

    setShowOPForm(false)
    setOpForm({ metodo_pago: 'transferencia', monto: '', comprobante_id: '', es_a_cuenta: false, nota: '' })
    fetchDetalle(provActivo)
  }

  async function saveGasto() {
    const monto = parseFloat(gastoForm.monto) || 0
    if (!gastoForm.descripcion || monto <= 0) return

    await supabase.from('gastos').insert([{
      descripcion: gastoForm.descripcion, monto, metodo_pago: gastoForm.metodo_pago,
      fecha: gastoForm.fecha, tiene_comprobante: gastoForm.tiene_comprobante,
      tipo_comprobante: gastoForm.tipo_comprobante || null,
      numero_comprobante: gastoForm.numero_comprobante || null,
      nota: gastoForm.nota || null,
    }])

    const { data: bill } = await supabase.from('billetera').select('*').eq('tipo', gastoForm.metodo_pago).single()
    if (bill) await supabase.from('billetera').update({ saldo: bill.saldo - monto }).eq('id', bill.id)

    setShowGasto(false)
    setGastoForm({ descripcion: '', monto: '', metodo_pago: 'efectivo', fecha: new Date().toISOString().slice(0,10), tiene_comprobante: false, tipo_comprobante: '', numero_comprobante: '', nota: '' })
  }

  // Filtered list
  const provsFiltrados = useMemo(() => {
    let list = proveedores
    if (filtroTipo !== 'todos') list = list.filter(p => p.tipo === filtroTipo)
    if (search) { const q = search.toLowerCase(); list = list.filter(p => p.nombre.toLowerCase().includes(q) || p.cuit?.includes(q)) }
    return list
  }, [proveedores, filtroTipo, search])

  // CC calculations
  const saldoCC = useMemo(() => {
    const deuda = comprobantes.filter(c => COMPROBANTES_DEUDA.includes(c.tipo_comprobante) && c.estado !== 'anulado').reduce((s, c) => s + c.total, 0)
    const creditos = comprobantes.filter(c => COMPROBANTES_CREDITO.includes(c.tipo_comprobante) && c.estado !== 'anulado').reduce((s, c) => s + c.total, 0)
    const pagos = ordenesPago.reduce((s, o) => s + o.monto, 0)
    return deuda - creditos - pagos
  }, [comprobantes, ordenesPago])

  const compsPendientes = comprobantes.filter(c => c.estado === 'pendiente' || c.estado === 'parcial')

  // Servicios con vencimiento próximo
  const serviciosAlerta = proveedores.filter(p => {
    if (p.tipo !== 'servicio' || !p.proximo_vencimiento) return false
    const venc = new Date(p.proximo_vencimiento)
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const diff = (venc.getTime() - hoy.getTime()) / (1000*60*60*24)
    return diff <= 7
  })

  // ==================== RENDER ====================

  if (vista === 'detalle' && provActivo) {
    const tabs: { id: Tab; label: string }[] = [
      { id: 'cc', label: 'Cuenta Corriente' },
      { id: 'comprobantes', label: 'Comprobantes' },
      { id: 'pagos', label: 'Pagos' },
      ...(provActivo.tipo === 'mercaderia' ? [{ id: 'ordenes' as Tab, label: 'Órdenes de Compra' }] : []),
      { id: 'info', label: 'Datos' },
    ]

    return (
      <div className="p-4 lg:p-6 max-w-6xl mx-auto bg-botanical min-h-full">
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setVista('lista'); setProvActivo(null) }} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", provActivo.tipo === 'mercaderia' ? "bg-kira-100" : "bg-blue-100")}>
                  {provActivo.tipo === 'mercaderia' ? <Building2 size={14} className="text-kira-600" /> : <Zap size={14} className="text-blue-600" />}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-semibold text-gray-900">{provActivo.nombre}</h2>
                  <p className="text-xs text-gray-400 capitalize">{provActivo.tipo}{provActivo.cuit && ` · CUIT: ${provActivo.cuit}`}</p>
                </div>
              </div>
            </div>
            <div className={cn("px-3 py-1.5 rounded-lg text-sm font-semibold", saldoCC > 0 ? "bg-red-50 text-red-700" : saldoCC < 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-600")}>
              Saldo: {formatCurrency(saldoCC)}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  tab === t.id ? "bg-kira-500 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Cuenta Corriente */}
          {tab === 'cc' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Deuda total</p>
                  <p className={cn("text-xl font-semibold mt-1", saldoCC > 0 ? "text-red-600" : "text-emerald-600")}>{formatCurrency(Math.abs(saldoCC))}</p>
                  <p className="text-[10px] text-gray-400">{saldoCC > 0 ? 'Debemos' : saldoCC < 0 ? 'A favor' : 'Sin saldo'}</p>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Comp. pendientes</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{compsPendientes.length}</p>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Total pagado</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{formatCurrency(ordenesPago.reduce((s,o) => s+o.monto, 0))}</p>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Comprobantes</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{comprobantes.length}</p>
                </div>
              </div>

              {/* Movimientos CC */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Movimientos</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCompForm(true)} className="px-3 py-1.5 text-xs bg-kira-500 text-white rounded-lg hover:bg-kira-600 flex items-center gap-1"><Plus size={12}/>Comprobante</button>
                    <button onClick={() => setShowOPForm(true)} className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1"><Plus size={12}/>Pago</button>
                  </div>
                </div>

                {/* Merge and sort comprobantes + pagos by date */}
                <div className="divide-y divide-gray-50 max-h-[50vh] overflow-auto">
                  {[
                    ...comprobantes.filter(c=>c.estado!=='anulado').map(c => ({ type: 'comp' as const, date: c.fecha, data: c })),
                    ...ordenesPago.map(o => ({ type: 'pago' as const, date: o.fecha, data: o })),
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((mov, i) => {
                    if (mov.type === 'comp') {
                      const c = mov.data as Comprobante
                      const esDeuda = COMPROBANTES_DEUDA.includes(c.tipo_comprobante)
                      return (
                        <div key={`c-${c.id}`} className="flex items-center gap-3 px-4 py-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", esDeuda ? "bg-red-50" : "bg-emerald-50")}>
                            <FileText size={14} className={esDeuda ? "text-red-500" : "text-emerald-500"} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{COMPROBANTE_LABELS[c.tipo_comprobante]}{c.numero && ` #${c.numero}`}</p>
                            <p className="text-xs text-gray-400">{c.fecha}{c.descripcion && ` · ${c.descripcion}`}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-semibold", esDeuda ? "text-red-600" : "text-emerald-600")}>
                              {esDeuda ? '+' : '-'}{formatCurrency(c.total)}
                            </p>
                            {c.saldo_pendiente > 0 && c.saldo_pendiente < c.total && (
                              <p className="text-[10px] text-amber-500">Pendiente: {formatCurrency(c.saldo_pendiente)}</p>
                            )}
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                              c.estado === 'pagado' ? 'bg-emerald-50 text-emerald-600' : c.estado === 'parcial' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}>
                              {c.estado}
                            </span>
                          </div>
                        </div>
                      )
                    } else {
                      const o = mov.data as OrdenPago
                      return (
                        <div key={`p-${o.id}`} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                            {o.metodo_pago === 'efectivo' ? <Banknote size={14} className="text-blue-500" /> : <CreditCard size={14} className="text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">Orden de Pago #{o.id}</p>
                            <p className="text-xs text-gray-400">{o.fecha} · {o.metodo_pago}{o.es_a_cuenta && ' · A cuenta'}{o.nota && ` · ${o.nota}`}</p>
                          </div>
                          <p className="text-sm font-semibold text-blue-600">-{formatCurrency(o.monto)}</p>
                        </div>
                      )
                    }
                  })}
                  {comprobantes.length === 0 && ordenesPago.length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">Sin movimientos</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Comprobantes form */}
          {tab === 'comprobantes' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Comprobantes</h3>
                <button onClick={() => setShowCompForm(!showCompForm)} className="px-3 py-1.5 text-xs bg-kira-500 text-white rounded-lg hover:bg-kira-600 flex items-center gap-1"><Plus size={12}/>Nuevo</button>
              </div>
              {showCompForm && (
                <div className="bg-white rounded-xl border border-kira-100 p-4 animate-fade-in">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Nuevo Comprobante</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <select value={compForm.tipo_comprobante} onChange={e => setCompForm(f=>({...f, tipo_comprobante: e.target.value as TipoComprobante}))}
                      className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30">
                      {Object.entries(COMPROBANTE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input placeholder="Número" value={compForm.numero} onChange={e => setCompForm(f=>({...f, numero: e.target.value}))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                    <input type="date" value={compForm.fecha} onChange={e => setCompForm(f=>({...f, fecha: e.target.value}))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                    <input type="number" placeholder="Subtotal (neto)" value={compForm.subtotal} onChange={e => setCompForm(f=>({...f, subtotal: e.target.value}))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                    {COMPROBANTES_CON_IVA.includes(compForm.tipo_comprobante) && (<>
                      <input type="number" placeholder="IVA 21%" value={compForm.iva_21} onChange={e => setCompForm(f=>({...f, iva_21: e.target.value}))}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                      <input type="number" placeholder="IVA 10.5%" value={compForm.iva_105} onChange={e => setCompForm(f=>({...f, iva_105: e.target.value}))}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                      <input type="number" placeholder="Percepciones" value={compForm.percepciones} onChange={e => setCompForm(f=>({...f, percepciones: e.target.value}))}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                    </>)}
                    <input placeholder="Descripción" value={compForm.descripcion} onChange={e => setCompForm(f=>({...f, descripcion: e.target.value}))}
                      className="col-span-2 lg:col-span-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                    <button onClick={saveComprobante} className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 flex items-center justify-center gap-2"><Save size={14}/>Guardar</button>
                  </div>
                </div>
              )}
              {/* List */}
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {comprobantes.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText size={14} className={COMPROBANTES_DEUDA.includes(c.tipo_comprobante) ? "text-red-400" : "text-emerald-400"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{COMPROBANTE_LABELS[c.tipo_comprobante]}{c.numero && ` #${c.numero}`}</p>
                      <p className="text-xs text-gray-400">{c.fecha}{c.descripcion && ` · ${c.descripcion}`}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(c.total)}</p>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded", c.estado === 'pagado' ? 'bg-emerald-50 text-emerald-600' : c.estado === 'parcial' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}>{c.estado}</span>
                  </div>
                ))}
                {comprobantes.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Sin comprobantes</div>}
              </div>
            </div>
          )}

          {/* Tab: Pagos */}
          {tab === 'pagos' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Órdenes de Pago</h3>
                <button onClick={() => setShowOPForm(!showOPForm)} className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1"><Plus size={12}/>Nueva</button>
              </div>
              {showOPForm && (
                <div className="bg-white rounded-xl border border-emerald-100 p-4 animate-fade-in">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Nueva Orden de Pago</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <select value={opForm.metodo_pago} onChange={e => setOpForm(f=>({...f, metodo_pago: e.target.value as any}))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/30">
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                    <input type="number" placeholder="Monto" value={opForm.monto} onChange={e => setOpForm(f=>({...f, monto: e.target.value}))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
                    <select value={opForm.comprobante_id} onChange={e => setOpForm(f=>({...f, comprobante_id: e.target.value, es_a_cuenta: false}))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/30">
                      <option value="">Sin comprobante</option>
                      {compsPendientes.map(c => <option key={c.id} value={c.id}>{COMPROBANTE_LABELS[c.tipo_comprobante]} #{c.numero || c.id} - Pend: {formatCurrency(c.saldo_pendiente)}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={opForm.es_a_cuenta} onChange={e => setOpForm(f=>({...f, es_a_cuenta: e.target.checked, comprobante_id: ''}))} className="rounded" />
                      A cuenta
                    </label>
                    <input placeholder="Nota" value={opForm.nota} onChange={e => setOpForm(f=>({...f, nota: e.target.value}))}
                      className="col-span-2 lg:col-span-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
                    <button onClick={saveOrdenPago} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 flex items-center justify-center gap-2"><Save size={14}/>Guardar</button>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {ordenesPago.map(o => (
                  <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                    {o.metodo_pago === 'efectivo' ? <Banknote size={14} className="text-emerald-400" /> : <CreditCard size={14} className="text-blue-400" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">OP #{o.id}{o.es_a_cuenta && ' (A cuenta)'}</p>
                      <p className="text-xs text-gray-400">{o.fecha} · {o.metodo_pago}{o.nota && ` · ${o.nota}`}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(o.monto)}</p>
                  </div>
                ))}
                {ordenesPago.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Sin pagos</div>}
              </div>
            </div>
          )}

          {/* Tab: Órdenes de compra (solo mercadería) */}
          {tab === 'ordenes' && provActivo.tipo === 'mercaderia' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-gray-700">Artículos del proveedor ({articulosProv.length})</h3>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 max-h-[40vh] overflow-auto">
                {articulosProv.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{a.descripcion}</p>
                      <p className="text-xs text-gray-400">{a.codigo}</p>
                    </div>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded font-semibold", a.cantidad <= 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>{a.cantidad}</span>
                    <span className="text-xs text-gray-500">{formatCurrency(a.costo_unitario)}</span>
                  </div>
                ))}
                {articulosProv.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Sin artículos vinculados</div>}
              </div>
            </div>
          )}

          {/* Tab: Info / Datos */}
          {tab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Datos del proveedor</h3>
                  <button onClick={() => setEditingProv(!editingProv)} className="text-xs text-kira-600 hover:underline">{editingProv ? 'Cancelar' : 'Editar'}</button>
                </div>
                {editingProv ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <input placeholder="Nombre" value={formProv.nombre} onChange={e => setFormProv(f=>({...f, nombre: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    <select value={formProv.tipo} onChange={e => setFormProv(f=>({...f, tipo: e.target.value as any}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                      <option value="mercaderia">Mercadería</option><option value="servicio">Servicio</option>
                    </select>
                    <input placeholder="CUIT" value={formProv.cuit} onChange={e => setFormProv(f=>({...f, cuit: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    <input placeholder="Dirección" value={formProv.direccion} onChange={e => setFormProv(f=>({...f, direccion: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    <input placeholder="Localidad" value={formProv.localidad} onChange={e => setFormProv(f=>({...f, localidad: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    <input placeholder="Provincia" value={formProv.provincia} onChange={e => setFormProv(f=>({...f, provincia: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    <input placeholder="Emails (separados por coma)" value={formProv.emails} onChange={e => setFormProv(f=>({...f, emails: e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    <input placeholder="WhatsApp (separados por coma)" value={formProv.whatsapps} onChange={e => setFormProv(f=>({...f, whatsapps: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    {formProv.tipo === 'servicio' && (<>
                      <select value={formProv.frecuencia_pago} onChange={e => setFormProv(f=>({...f, frecuencia_pago: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        <option value="">Sin frecuencia</option><option value="mensual">Mensual</option><option value="bimestral">Bimestral</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option>
                      </select>
                      <input type="date" placeholder="Próximo venc." value={formProv.proximo_vencimiento} onChange={e => setFormProv(f=>({...f, proximo_vencimiento: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    </>)}
                    <button onClick={saveProv} className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 flex items-center justify-center gap-2"><Save size={14}/>Guardar</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-xs text-gray-400">Tipo</p><p className="capitalize">{provActivo.tipo}</p></div>
                    <div><p className="text-xs text-gray-400">CUIT</p><p>{provActivo.cuit || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Dirección</p><p>{provActivo.direccion || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Localidad</p><p>{provActivo.localidad || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Provincia</p><p>{provActivo.provincia || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Emails</p><p>{provActivo.emails?.length ? provActivo.emails.join(', ') : '—'}</p></div>
                    <div><p className="text-xs text-gray-400">WhatsApp</p><p>{provActivo.whatsapps?.length ? provActivo.whatsapps.join(', ') : '—'}</p></div>
                    {provActivo.tipo === 'servicio' && (<>
                      <div><p className="text-xs text-gray-400">Frecuencia</p><p className="capitalize">{provActivo.frecuencia_pago || '—'}</p></div>
                      <div><p className="text-xs text-gray-400">Próx. vencimiento</p><p>{provActivo.proximo_vencimiento || '—'}</p></div>
                    </>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ==================== LISTA ====================
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto bg-botanical min-h-full">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">Proveedores</h2>
            <p className="text-sm text-gray-500 mt-1">Gestión de proveedores, cuenta corriente y compras</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGasto(true)} className="px-3 py-2 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1.5"><DollarSign size={13}/>Gasto</button>
            <button onClick={() => setShowAdd(true)} className="px-3 py-2 text-xs bg-kira-500 text-white rounded-lg hover:bg-kira-600 flex items-center gap-1.5"><Plus size={13}/>Proveedor</button>
          </div>
        </div>

        {/* Alertas de vencimiento */}
        {serviciosAlerta.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-600" /><span className="text-xs font-semibold text-amber-700">Vencimientos próximos</span></div>
            <div className="space-y-1">
              {serviciosAlerta.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-800">{p.nombre}</span>
                  <span className="text-xs text-amber-600">{p.proximo_vencimiento}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gasto form modal */}
        {showGasto && (
          <div className="bg-white rounded-xl border border-amber-100 p-4 mb-4 animate-fade-in">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Registrar Gasto</h3>
              <button onClick={() => setShowGasto(false)}><X size={14} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <input placeholder="Descripción *" value={gastoForm.descripcion} onChange={e => setGastoForm(f=>({...f, descripcion: e.target.value}))}
                className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input type="number" placeholder="Monto *" value={gastoForm.monto} onChange={e => setGastoForm(f=>({...f, monto: e.target.value}))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <select value={gastoForm.metodo_pago} onChange={e => setGastoForm(f=>({...f, metodo_pago: e.target.value as any}))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
              </select>
              <input type="date" value={gastoForm.fecha} onChange={e => setGastoForm(f=>({...f, fecha: e.target.value}))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={gastoForm.tiene_comprobante} onChange={e => setGastoForm(f=>({...f, tiene_comprobante: e.target.checked}))} />Tiene comprobante
              </label>
              {gastoForm.tiene_comprobante && (<>
                <input placeholder="Tipo comp." value={gastoForm.tipo_comprobante} onChange={e => setGastoForm(f=>({...f, tipo_comprobante: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                <input placeholder="Nro comp." value={gastoForm.numero_comprobante} onChange={e => setGastoForm(f=>({...f, numero_comprobante: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </>)}
              <input placeholder="Nota" value={gastoForm.nota} onChange={e => setGastoForm(f=>({...f, nota: e.target.value}))}
                className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <button onClick={saveGasto} disabled={!gastoForm.descripcion || !gastoForm.monto}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-2"><Save size={14}/>Registrar</button>
            </div>
          </div>
        )}

        {/* Add proveedor */}
        {showAdd && (
          <div className="bg-white rounded-xl border border-kira-100 p-4 mb-4 animate-fade-in">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Nuevo Proveedor</h3>
              <button onClick={() => setShowAdd(false)}><X size={14} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <input placeholder="Nombre *" value={formProv.nombre} onChange={e => setFormProv(f=>({...f, nombre: e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <select value={formProv.tipo} onChange={e => setFormProv(f=>({...f, tipo: e.target.value as any}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                <option value="mercaderia">Mercadería</option><option value="servicio">Servicio</option>
              </select>
              <input placeholder="CUIT" value={formProv.cuit} onChange={e => setFormProv(f=>({...f, cuit: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              {formProv.tipo === 'servicio' && (<>
                <select value={formProv.frecuencia_pago} onChange={e => setFormProv(f=>({...f, frecuencia_pago: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                  <option value="">Frecuencia de pago</option><option value="mensual">Mensual</option><option value="bimestral">Bimestral</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option>
                </select>
                <input type="date" placeholder="Próx. vencimiento" value={formProv.proximo_vencimiento} onChange={e => setFormProv(f=>({...f, proximo_vencimiento: e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </>)}
              <button onClick={saveProv} disabled={!formProv.nombre} className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 disabled:opacity-40 flex items-center justify-center gap-2"><Save size={14}/>Guardar</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-kira-400/30 placeholder:text-gray-400" />
          </div>
          <div className="flex gap-2">
            {(['todos', 'mercaderia', 'servicio'] as const).map(f => (
              <button key={f} onClick={() => setFiltroTipo(f)}
                className={cn("px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize",
                  filtroTipo === f ? "bg-kira-500 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>
                {f === 'todos' ? 'Todos' : f === 'mercaderia' ? 'Mercadería' : 'Servicios'}
              </button>
            ))}
          </div>
        </div>

        {/* Provider list */}
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {loading ? <div className="px-4 py-12 text-center text-gray-400 text-sm">Cargando...</div> :
          provsFiltrados.length === 0 ? <div className="px-4 py-12 text-center text-gray-400 text-sm"><Building2 size={32} className="mx-auto mb-2 text-gray-300" />No se encontraron proveedores</div> :
          provsFiltrados.map(p => (
            <button key={p.id} onClick={() => openDetalle(p)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-kira-50/30 transition-colors">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", p.tipo === 'mercaderia' ? "bg-kira-100" : "bg-blue-100")}>
                {p.tipo === 'mercaderia' ? <Building2 size={16} className="text-kira-600" /> : <Zap size={16} className="text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{p.nombre}</p>
                <p className="text-xs text-gray-400 capitalize">{p.tipo}{p.cuit && ` · ${p.cuit}`}
                  {p.tipo === 'servicio' && p.frecuencia_pago && ` · ${p.frecuencia_pago}`}
                  {p.tipo === 'servicio' && p.proximo_vencimiento && (
                    <span className={cn("ml-1", new Date(p.proximo_vencimiento) <= new Date() ? "text-red-500 font-semibold" : "")}> · Vence: {p.proximo_vencimiento}</span>
                  )}
                </p>
              </div>
              <ChevronRight size={14} className="text-gray-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
