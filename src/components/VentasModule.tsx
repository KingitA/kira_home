'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Articulo, CarritoItem, CondicionPago } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, CheckCircle2, AlertCircle, X, Package, ArrowLeft, Wallet } from 'lucide-react'

interface Props { onVentaCompleta: () => void }

const Ill=(d:string)=>()=>(<svg viewBox="0 0 120 80" className="w-full h-full" fill="none" dangerouslySetInnerHTML={{__html:d}}/>)
const IllCocina=Ill('<ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="25" y="40" width="40" height="8" rx="4" fill="currentColor" opacity="0.25"/><rect x="25" y="35" width="40" height="10" rx="5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5"/><line x1="65" y1="40" x2="85" y2="35" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>')
const IllVajilla=Ill('<ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><path d="M30 30L30 55Q30 65 45 65L55 65Q70 65 70 55L70 30Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.15"/><path d="M70 38Q82 38 82 48Q82 58 70 58" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/>')
const IllDeco=Ill('<ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><path d="M45 70L48 45Q42 40 42 35Q42 28 50 28L60 28Q68 28 68 35Q68 40 62 45L65 70Z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/><circle cx="50" cy="20" r="5" fill="currentColor" opacity="0.2"/><circle cx="60" cy="16" r="5" fill="currentColor" opacity="0.15"/>')
const IllTextil=Ill('<ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="15" y="30" width="35" height="28" rx="8" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/><path d="M60 65L60 35Q60 28 68 28L95 28Q102 28 102 35L102 65" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.1"/>')
const IllTermos=Ill('<ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="30" y="18" width="16" height="50" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/><rect x="30" y="18" width="16" height="10" rx="4" fill="currentColor" opacity="0.25"/><path d="M65 40Q60 40 58 50Q56 65 65 68L80 68Q89 65 87 50Q85 40 80 40Z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/>')
const IllBano=Ill('<ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="25" y="35" width="20" height="30" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/><rect x="32" y="25" width="6" height="12" rx="2" fill="currentColor" opacity="0.2"/><rect x="60" y="28" width="30" height="38" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="1.5"/>')

const CATS=[
  {id:'cocina',nombre:'Cocina',kw:['sarten','cacerola','olla','wok','hervidor','pava','cafetera','jarra','botella','fuente','molde','tabla','rallador','escurridor','especiero','dispenser','contenedor','portarollo','repasador','vaso termico','yerbero','azucarero','bateria','bifera','abrelata','aceitero','afilador','cuchillo','tenedor','cuchara','cucharita','espumadera','espatula','pinza','colador','hudson','tramontina'],bg:'bg-amber-50 border-amber-200',t:'text-amber-800',a:'text-amber-600',I:IllCocina},
  {id:'vajilla',nombre:'Vajilla',kw:['plato','bowl','taza','vaso','copa','jarro','mug','vassa','set de','juego de'],bg:'bg-sky-50 border-sky-200',t:'text-sky-800',a:'text-sky-600',I:IllVajilla},
  {id:'decoracion',nombre:'Decoración',kw:['adorno','florero','jarron','maceta','planta','cuadro','espejo','reloj','vela','posavela','portarretrato','posavaso','plato de sitio','bandeja','cesto','organizador','canasto','lampara'],bg:'bg-rose-50 border-rose-200',t:'text-rose-800',a:'text-rose-600',I:IllDeco},
  {id:'textil',nombre:'Textil',kw:['alfombra','almohadon','almohada','manta','mantel','camino','cortina','individual','pie de cama','felpudo','funda','matero'],bg:'bg-violet-50 border-violet-200',t:'text-violet-800',a:'text-violet-600',I:IllTextil},
  {id:'termos',nombre:'Termos y Mates',kw:['termo','mate ','bombilla'],bg:'bg-emerald-50 border-emerald-200',t:'text-emerald-800',a:'text-emerald-600',I:IllTermos},
  {id:'baño',nombre:'Baño',kw:['baño','jabonera','cesto de basura','portacepillo'],bg:'bg-cyan-50 border-cyan-200',t:'text-cyan-800',a:'text-cyan-600',I:IllBano},
]

interface PagoLine { condId: number; monto: string; esDebito: boolean; pagaCon: string; vueltoReal: string; refPrecio: boolean }

export default function VentasModule({ onVentaCompleta }: Props) {
  const [arts, setArts] = useState<Articulo[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Articulo[]>([])
  const [cart, setCart] = useState<CarritoItem[]>([])
  const [proc, setProc] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  const [catAct, setCatAct] = useState<string | null>(null)
  const [condiciones, setCondiciones] = useState<CondicionPago[]>([])
  const [pagos, setPagos] = useState<PagoLine[]>([])
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data: a } = await supabase.from('articulos').select('*').eq('activo', true).gt('cantidad', 0).order('descripcion')
    if (a) setArts(a)
    const { data: c } = await supabase.from('condiciones_pago').select('*').eq('activo', true).order('id')
    if (c) setCondiciones(c)
  }

  useEffect(() => {
    if (search.length >= 2) { const q = search.toLowerCase(); setResults(arts.filter(a => a.descripcion.toLowerCase().includes(q) || a.codigo?.toLowerCase().includes(q) || a.proveedor?.toLowerCase().includes(q)).slice(0, 15)) }
    else if (catAct && catAct !== 'todos') { const c = CATS.find(x => x.id === catAct); if (c) setResults(arts.filter(a => { const d = a.descripcion.toLowerCase(), n = (a.nota || '').toLowerCase(); return c.kw.some(k => d.includes(k) || n.includes(k)) })) }
    else if (catAct === 'todos') setResults(arts)
    else setResults([])
  }, [search, arts, catAct])

  function addToCart(a: Articulo) { setCart(p => { const e = p.find(i => i.articulo.id === a.id); if (e) { if (e.cantidad >= a.cantidad) { setErr(`Stock máx: ${a.cantidad}`); setTimeout(() => setErr(''), 2500); return p } return p.map(i => i.articulo.id === a.id ? { ...i, cantidad: i.cantidad + 1 } : i) } return [...p, { articulo: a, cantidad: 1 }] }); setSearch(''); if (!catAct) setResults([]) }
  function updQty(id: number, d: number) { setCart(p => p.map(i => { if (i.articulo.id !== id) return i; const q = i.cantidad + d; if (q <= 0 || q > i.articulo.cantidad) return i; return { ...i, cantidad: q } })) }
  function clearAll() { setCart([]); setErr(''); setPagos([]) }

  const subtotal = cart.reduce((s, i) => s + (i.articulo.precio_venta * i.cantidad), 0)
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0)

  function addPago(condId: number) { setPagos(p => [...p, { condId, monto: '', esDebito: false, pagaCon: '', vueltoReal: '', refPrecio: false }]) }
  function removePago(idx: number) { setPagos(p => p.filter((_, i) => i !== idx)) }
  function updPago(idx: number, field: keyof PagoLine, val: any) { setPagos(p => p.map((x, i) => i === idx ? { ...x, [field]: val } : x)) }
  function fillResto(idx: number) { const ot = pagos.reduce((s, p, i) => i === idx ? s : s + (parseFloat(p.monto) || 0), 0); updPago(idx, 'monto', Math.max(0, subtotal - ot).toString()) }

  function toggleRef(idx: number) {
    setPagos(p => p.map((x, i) => {
      if (i === idx) {
        const cond = condiciones.find(c => c.id === x.condId)
        const refMonto = cond ? subtotal * (1 - cond.descuento / 100) : subtotal
        return { ...x, refPrecio: !x.refPrecio, monto: !x.refPrecio ? refMonto.toString() : x.monto }
      }
      return { ...x, refPrecio: false }
    }))
  }

  function getLineInfo(p: PagoLine) {
    const cond = condiciones.find(c => c.id === p.condId)
    if (!cond) return { cond: null, monto: 0, comision: 0, neto: 0, billTipo: 'efectivo' }
    const monto = parseFloat(p.monto) || 0
    const comPct = cond.tipo === 'tarjeta' ? cond.comision : (cond.tipo === 'transferencia' && p.esDebito ? cond.comision : 0)
    const comision = monto * comPct / 100
    let neto = monto - comision
    if (cond.tipo === 'efectivo') {
      const pc = parseFloat(p.pagaCon) || 0
      if (pc > 0) { const vr = p.vueltoReal !== '' ? (parseFloat(p.vueltoReal) || 0) : 0; neto = pc - vr }
    }
    const billTipo = cond.tipo === 'efectivo' ? 'efectivo' : cond.tipo === 'transferencia' ? (p.esDebito ? 'tarjeta_debito' : 'transferencia') : 'tarjeta_credito'
    return { cond, monto, comision, neto, billTipo }
  }

  const totalCobrado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const totalComisiones = pagos.reduce((s, p) => s + getLineInfo(p).comision, 0)
  const totalNetoCaja = pagos.reduce((s, p) => s + getLineInfo(p).neto, 0)
  const refEf = condiciones.find(c => c.tipo === 'efectivo')
  const refTr = condiciones.find(c => c.tipo === 'transferencia')

  async function procesarVenta() {
    if (cart.length === 0 || pagos.length === 0 || totalCobrado <= 0) { setErr('Agregá forma de pago con monto'); return }
    setProc(true); setErr('')
    try {
      const main = pagos.reduce((a, b) => (parseFloat(b.monto) || 0) > (parseFloat(a.monto) || 0) ? b : a)
      const mi = getLineInfo(main)
      const notas: string[] = []
      if (pagos.length > 1) {
        notas.push('Mixto: ' + pagos.map(p => { const i = getLineInfo(p); return i.cond ? `${i.cond.nombre}${p.esDebito ? '(Déb)' : ''} ${formatCurrency(i.monto)}` : '' }).filter(Boolean).join(' + '))
      } else { notas.push(`${mi.cond?.nombre}${main.esDebito ? ' (Débito)' : ''}`) }
      if (totalComisiones > 0) notas.push(`Com: -${formatCurrency(totalComisiones)}`)
      pagos.forEach(p => { const i = getLineInfo(p); if (i.cond?.tipo === 'efectivo' && parseFloat(p.pagaCon) > 0) { const vr = p.vueltoReal !== '' ? (parseFloat(p.vueltoReal) || 0) : 0; notas.push(`Paga ${formatCurrency(parseFloat(p.pagaCon))} Vuelto ${formatCurrency(vr)}`) } })
      notas.push(`Neto: ${formatCurrency(totalNetoCaja)}`)

      const { data: venta, error: ve } = await supabase.from('ventas').insert([{ total: totalCobrado, metodo_pago: mi.billTipo, cuotas: 1, nota: notas.join(' | '), comision: totalComisiones, neto: totalNetoCaja }]).select().single()
      if (ve) throw ve
      await supabase.from('venta_items').insert(cart.map(i => ({ venta_id: venta.id, articulo_id: i.articulo.id, cantidad: i.cantidad, precio_unitario: i.articulo.precio_venta, subtotal: i.articulo.precio_venta * i.cantidad })))
      for (const i of cart) await supabase.from('articulos').update({ cantidad: i.articulo.cantidad - i.cantidad }).eq('id', i.articulo.id)
      for (const p of pagos) { const i = getLineInfo(p); if (i.neto <= 0) continue; const { data: b } = await supabase.from('billetera').select('*').eq('tipo', i.billTipo).single(); if (b) await supabase.from('billetera').update({ saldo: b.saldo + i.neto }).eq('id', b.id) }

      setOk(true); clearAll(); load(); onVentaCompleta()
      setTimeout(() => setOk(false), 3000)
    } catch (e: any) { setErr(e.message || 'Error') } finally { setProc(false) }
  }

  const cntCat = (c: typeof CATS[0]) => arts.filter(a => { const d = a.descripcion.toLowerCase(), n = (a.nota || '').toLowerCase(); return c.kw.some(k => d.includes(k) || n.includes(k)) }).length
  const condIcon = (t: string, s = 18) => t === 'efectivo' ? <Banknote size={s} className="text-emerald-500" /> : t === 'transferencia' ? <CreditCard size={s} className="text-blue-500" /> : <Wallet size={s} className="text-purple-500" />

  return (
    <div className="h-full flex flex-col lg:flex-row bg-botanical">
      <div className="flex-1 p-4 lg:p-6 overflow-auto relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-5"><h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">Punto de Venta</h2><p className="text-sm text-gray-500 mt-1">Seleccioná una categoría o buscá artículos</p></div>
          <div className="relative mb-5"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input ref={ref} type="text" placeholder="Buscar por nombre, código o proveedor..." value={search} onChange={e => { setSearch(e.target.value); if (e.target.value.length >= 2) setCatAct(null) }} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-kira-400/30 focus:border-kira-400 placeholder:text-gray-400 shadow-sm" />{search && <button onClick={() => { setSearch(''); setResults([]); setCatAct(null) }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"><X size={14} className="text-gray-400" /></button>}</div>
          {catAct && !search && <button onClick={() => { setCatAct(null); setResults([]) }} className="flex items-center gap-2 text-sm text-kira-600 hover:text-kira-700 mb-4 animate-fade-in"><ArrowLeft size={14} />Volver</button>}
          {!catAct && search.length < 2 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6 animate-fade-in">
              {CATS.map(c => (<button key={c.id} onClick={() => setCatAct(c.id)} className={`group relative overflow-hidden rounded-xl border h-36 lg:h-40 text-left transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] ${c.bg}`}><div className={`absolute top-2 right-2 w-20 h-20 lg:w-24 lg:h-24 ${c.a} opacity-60 group-hover:opacity-80 transition-opacity`}><c.I /></div><div className="absolute inset-0 flex flex-col justify-end p-3.5"><h3 className={`font-semibold text-sm lg:text-base ${c.t}`}>{c.nombre}</h3><p className={`text-[11px] ${c.a} opacity-70`}>{cntCat(c)} prod.</p></div></button>))}
              <button onClick={() => setCatAct('todos')} className="group relative overflow-hidden rounded-xl border border-gray-200 h-36 lg:h-40 text-left transition-all hover:scale-[1.02] hover:shadow-md bg-white"><div className="absolute top-3 right-3 text-gray-300 opacity-40"><Package size={48} /></div><div className="absolute inset-0 flex flex-col justify-end p-3.5"><h3 className="font-semibold text-sm lg:text-base text-gray-700">Ver Todo</h3><p className="text-[11px] text-gray-400">{arts.length} prod.</p></div></button>
            </div>
          )}
          {results.length > 0 && (<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in"><div className="max-h-[55vh] overflow-auto divide-y divide-gray-50">{results.map(a => { const ic = cart.find(i => i.articulo.id === a.id); const rem = a.cantidad - (ic?.cantidad ?? 0); return (<button key={a.id} onClick={() => addToCart(a)} disabled={rem <= 0} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors", rem <= 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-kira-50/50")}><div className="w-8 h-8 rounded-lg bg-kira-100 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-kira-600" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{a.descripcion}</p><p className="text-xs text-gray-400">{a.codigo && `${a.codigo} · `}{a.proveedor}{ic && <span className="text-kira-500 ml-1">· {ic.cantidad} en carrito</span>}</p></div><div className="text-right flex-shrink-0"><p className="text-sm font-semibold text-gray-800">{formatCurrency(a.precio_venta)}</p><p className={cn("text-[10px]", rem <= 2 ? "text-amber-500" : "text-gray-400")}>Stock: {rem}</p></div><Plus size={16} className="text-gray-300 flex-shrink-0" /></button>) })}</div></div>)}
          {search.length >= 2 && results.length === 0 && <div className="text-center py-8 text-gray-400 text-sm animate-fade-in"><Package size={28} className="mx-auto mb-2 text-gray-300" />Sin resultados</div>}
        </div>
      </div>

      {/* Cart */}
      <div className="w-full lg:w-[440px] bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col relative z-10">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><ShoppingCart size={16} className="text-gray-400" /><h3 className="text-sm font-semibold text-gray-700">Venta actual</h3>{totalItems > 0 && <span className="bg-kira-100 text-kira-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{totalItems}</span>}</div>
          {cart.length > 0 && <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 hover:underline">Vaciar</button>}
        </div>
        <div className="flex-1 overflow-auto px-4 py-2">
          {cart.length === 0 ? <div className="flex items-center justify-center h-full text-gray-300 text-sm">Carrito vacío</div> :
            <div className="space-y-2">{cart.map((item, idx) => (<div key={item.articulo.id} className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg animate-slide-in" style={{ animationDelay: `${idx * 50}ms` }}><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{item.articulo.descripcion}</p><p className="text-xs text-gray-400">{formatCurrency(item.articulo.precio_venta)} c/u</p></div><div className="flex items-center gap-1.5"><button onClick={() => updQty(item.articulo.id, -1)} disabled={item.cantidad <= 1} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Minus size={12} /></button><span className="w-8 text-center text-sm font-semibold text-gray-700">{item.cantidad}</span><button onClick={() => updQty(item.articulo.id, 1)} disabled={item.cantidad >= item.articulo.cantidad} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Plus size={12} /></button></div><p className="text-sm font-semibold text-gray-800 w-20 text-right">{formatCurrency(item.articulo.precio_venta * item.cantidad)}</p><button onClick={() => setCart(p => p.filter(i => i.articulo.id !== item.articulo.id))} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button></div>))}</div>}
        </div>
        {cart.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3 max-h-[65vh] overflow-auto">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Precio de lista ({totalItems} art.)</span>
              <span className="text-sm font-semibold text-gray-700">{formatCurrency(subtotal)}</span>
            </div>
            {subtotal > 0 && (
              <div className="flex gap-2 text-[10px] text-gray-400">
                {refEf && <span>Efectivo: {formatCurrency(subtotal * (1 - refEf.descuento / 100))}</span>}
                {refTr && <span>· Transf: {formatCurrency(subtotal * (1 - refTr.descuento / 100))}</span>}
                <span>· Tarjeta: {formatCurrency(subtotal)}</span>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Agregar forma de pago</p>
              <div className="flex gap-2 mb-2">
                {condiciones.map(c => (
                  <button key={c.id} onClick={() => addPago(c.id)}
                    className="flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    {condIcon(c.tipo, 16)}
                    <span className="text-[10px] font-medium text-gray-600">{c.nombre}</span>
                    {c.descuento > 0 && <span className="text-[9px] text-emerald-500">-{c.descuento}%</span>}
                  </button>
                ))}
              </div>
            </div>

            {pagos.length > 0 && (
              <div className="space-y-2">
                {pagos.map((p, idx) => {
                  const info = getLineInfo(p)
                  if (!info.cond) return null
                  const c = info.cond
                  const mNum = parseFloat(p.monto) || 0
                  const pcNum = parseFloat(p.pagaCon) || 0
                  const vSug = pcNum > 0 && c.tipo === 'efectivo' ? pcNum - mNum : 0
                  const vrNum = p.vueltoReal !== '' ? (parseFloat(p.vueltoReal) || 0) : 0

                  return (
                    <div key={idx} className={cn("rounded-xl border p-3 space-y-2 animate-fade-in",
                      c.tipo === 'efectivo' ? 'border-emerald-200 bg-emerald-50/30' : c.tipo === 'transferencia' ? 'border-blue-200 bg-blue-50/30' : 'border-purple-200 bg-purple-50/30')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">{condIcon(c.tipo, 14)}<span className="text-xs font-semibold text-gray-700">{c.nombre}</span>{c.descuento > 0 && <span className="text-[10px] text-emerald-600">(-{c.descuento}%)</span>}</div>
                        <button onClick={() => removePago(idx)} className="p-0.5 rounded hover:bg-white/50"><X size={12} className="text-gray-400" /></button>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={p.refPrecio} onChange={() => toggleRef(idx)}
                          className={cn("w-3.5 h-3.5 rounded border-gray-300",
                            c.tipo === 'efectivo' ? "text-emerald-500" : c.tipo === 'transferencia' ? "text-blue-500" : "text-purple-500")} />
                        <span className="text-[10px] text-gray-500">Precio de referencia</span>
                        <span className="text-[10px] font-semibold text-gray-600 ml-auto">{formatCurrency(subtotal * (1 - c.descuento / 100))}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14">Cobra</span>
                        <div className="relative flex-1"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                          <input type="number" placeholder="0" value={p.monto} onChange={e => updPago(idx, 'monto', e.target.value)}
                            className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-kira-400/30 bg-white" /></div>
                        <button onClick={() => fillResto(idx)} className="text-[10px] text-kira-600 hover:underline whitespace-nowrap">Resto</button>
                      </div>
                      {c.tipo === 'transferencia' && (
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={p.esDebito} onChange={e => updPago(idx, 'esDebito', e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500" />
                          <Wallet size={11} className="text-purple-500" /><span className="text-gray-600">T. débito</span>
                          {p.esDebito && c.comision > 0 && <span className="text-purple-500 ml-auto">Com. {c.comision}%</span>}
                        </label>
                      )}
                      {c.tipo === 'efectivo' && mNum > 0 && (
                        <div className="space-y-1.5 bg-white/60 rounded-lg px-2 py-1.5">
                          <div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 w-14">Paga con</span>
                            <div className="relative flex-1"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                              <input type="number" placeholder={mNum.toString()} value={p.pagaCon} onChange={e => { updPago(idx, 'pagaCon', e.target.value); updPago(idx, 'vueltoReal', '') }}
                                className="w-full pl-5 pr-2 py-1 rounded border border-gray-200 text-xs text-right bg-white" /></div></div>
                          {pcNum > 0 && vSug > 0 && (<>
                            <div className="flex items-center justify-between text-[10px] px-1"><span className="text-gray-400">Vuelto sugerido</span><span className="text-amber-600 font-semibold">{formatCurrency(vSug)}</span></div>
                            <div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 w-14">Vuelto real</span>
                              <div className="relative flex-1"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                                <input type="number" placeholder={vSug.toString()} value={p.vueltoReal} onChange={e => updPago(idx, 'vueltoReal', e.target.value)}
                                  className="w-full pl-5 pr-2 py-1 rounded border border-gray-200 text-xs text-right bg-white" /></div></div>
                            {p.vueltoReal !== '' && Math.abs(vrNum - vSug) > 0.5 && (
                              <div className={cn("text-[9px] px-1", vrNum < vSug ? "text-emerald-600" : "text-red-500")}>{vrNum < vSug ? `Te quedás con ${formatCurrency(vSug - vrNum)}` : `Das de más ${formatCurrency(vrNum - vSug)}`}</div>
                            )}
                          </>)}
                          {pcNum > 0 && pcNum < mNum && <div className="text-[9px] text-red-500 px-1">Falta {formatCurrency(mNum - pcNum)}</div>}
                        </div>
                      )}
                      {mNum > 0 && (
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-200/50">
                          {info.comision > 0 ? <span className="text-purple-500">Com. {c.comision}%: -{formatCurrency(info.comision)}</span> : <span />}
                          <span className="text-gray-600 font-semibold">Entra: {formatCurrency(info.neto)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {pagos.length > 0 && totalCobrado > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total a cobrar</span>
                  <span style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-bold text-gray-900">{formatCurrency(totalCobrado)}</span>
                </div>
                {totalComisiones > 0 && (
                  <div className="flex items-center justify-between text-xs px-2 py-1 bg-purple-50 rounded-lg">
                    <span className="text-purple-600">Comisiones</span><span className="text-purple-700 font-semibold">-{formatCurrency(totalComisiones)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 font-medium">Neto en caja</span><span className="text-gray-800 font-bold text-sm">{formatCurrency(totalNetoCaja)}</span>
                </div>
              </div>
            )}

            {pagos.length === 0 && <div className="text-center py-2 text-xs text-amber-500">Seleccioná una o más formas de pago</div>}
            {err && <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs animate-fade-in"><AlertCircle size={14} />{err}</div>}
            <button onClick={procesarVenta} disabled={proc || pagos.length === 0 || totalCobrado <= 0}
              className={cn("w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2",
                proc || pagos.length === 0 || totalCobrado <= 0 ? "bg-gray-400 cursor-not-allowed" : "bg-kira-500 hover:bg-kira-600 active:scale-[0.98] shadow-md shadow-kira-500/20")}>
              {proc ? 'Procesando...' : <><CheckCircle2 size={16} />Cerrar Venta{totalCobrado > 0 ? ` — ${formatCurrency(totalCobrado)}` : ''}</>}
            </button>
          </div>
        )}
        {ok && <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in z-50"><CheckCircle2 size={20} /><div><p className="font-semibold text-sm">Venta registrada</p><p className="text-xs text-emerald-100">Stock y caja actualizados</p></div></div>}
      </div>
    </div>
  )
}
