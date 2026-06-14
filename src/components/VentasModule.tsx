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

interface PagoLine {
  condId: number | null
  monto: string       // portion of list price this line covers
  esDebito: boolean
  pagaCon: string      // for efectivo: how much client gives
  vueltoReal: string   // for efectivo: actual change given
}

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
  const [pagos, setPagos] = useState<PagoLine[]>([{ condId: null, monto: '', esDebito: false, pagaCon: '', vueltoReal: '' }])
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
  function clearAll() { setCart([]); setErr(''); setPagos([{ condId: null, monto: '', esDebito: false, pagaCon: '', vueltoReal: '' }]) }

  const subtotal = cart.reduce((s, i) => s + (i.articulo.precio_venta * i.cantidad), 0)
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0)

  // Per-line calculations
  function lineCalc(p: PagoLine) {
    const cond = condiciones.find(c => c.id === p.condId)
    if (!cond) return { cond: null, montoLista: 0, dto: 0, cobrar: 0, comision: 0, neto: 0, billTipo: 'efectivo', pagaConNum: 0, vueltoSug: 0, vueltoRealNum: 0, entra: 0 }
    const montoLista = parseFloat(p.monto) || 0
    const dto = montoLista * cond.descuento / 100
    const cobrar = montoLista - dto
    const comPct = cond.tipo === 'transferencia' && p.esDebito ? cond.comision : cond.comision
    const comision = (cond.tipo === 'tarjeta' || (cond.tipo === 'transferencia' && p.esDebito)) ? cobrar * comPct / 100 : 0
    const neto = cobrar - comision
    const billTipo = cond.tipo === 'efectivo' ? 'efectivo' : cond.tipo === 'transferencia' ? (p.esDebito ? 'tarjeta_debito' : 'transferencia') : 'tarjeta_credito'
    // Efectivo: paga con logic
    const pagaConNum = parseFloat(p.pagaCon) || 0
    const vueltoSug = pagaConNum > cobrar ? pagaConNum - cobrar : 0
    const vueltoRealNum = p.vueltoReal !== '' ? (parseFloat(p.vueltoReal) || 0) : 0
    const entra = cond.tipo === 'efectivo' && pagaConNum > 0 ? pagaConNum - vueltoRealNum : neto
    return { cond, montoLista, dto, cobrar, comision, neto, billTipo, pagaConNum, vueltoSug, vueltoRealNum, entra }
  }

  const linesCalc = pagos.map(lineCalc)
  const totalCobrar = linesCalc.reduce((s, l) => s + l.cobrar, 0)
  const totalComision = linesCalc.reduce((s, l) => s + l.comision, 0)
  const totalEntraCaja = linesCalc.reduce((s, l) => s + l.entra, 0)
  const totalAsignado = linesCalc.reduce((s, l) => s + l.montoLista, 0)
  const faltaAsignar = subtotal - totalAsignado
  const allValid = pagos.every(p => p.condId !== null) && Math.abs(faltaAsignar) < 1

  function addPago() { setPagos(p => [...p, { condId: null, monto: '', esDebito: false, pagaCon: '', vueltoReal: '' }]) }
  function rmPago(i: number) { setPagos(p => p.length <= 1 ? p : p.filter((_, j) => j !== i)) }
  function updP(i: number, f: Partial<PagoLine>) { setPagos(p => p.map((x, j) => j === i ? { ...x, ...f } : x)) }
  function setCondForLine(i: number, condId: number) {
    const current = pagos[i]
    // If single line, auto-fill monto with subtotal
    if (pagos.length === 1) updP(i, { condId, monto: subtotal.toString(), esDebito: false, pagaCon: '', vueltoReal: '' })
    else updP(i, { condId, esDebito: false, pagaCon: '', vueltoReal: '' })
  }
  function autoFillResto(i: number) {
    const others = pagos.reduce((s, p, j) => j === i ? s : s + (parseFloat(p.monto) || 0), 0)
    updP(i, { monto: Math.max(0, subtotal - others).toString() })
  }

  const condIcon = (tipo: string, sz = 16) => {
    if (tipo === 'efectivo') return <Banknote size={sz} className="text-emerald-500" />
    if (tipo === 'transferencia') return <CreditCard size={sz} className="text-blue-500" />
    return <Wallet size={sz} className="text-purple-500" />
  }

  async function procesarVenta() {
    if (cart.length === 0 || !allValid) { setErr('Completá las formas de pago'); return }
    setProc(true); setErr('')
    try {
      // Build nota
      const notas: string[] = []
      linesCalc.forEach((l, i) => {
        if (!l.cond) return
        let s = `${l.cond.nombre}${pagos[i].esDebito ? ' (Débito)' : ''}: Lista ${formatCurrency(l.montoLista)}`
        if (l.dto > 0) s += ` → Dto ${l.cond.descuento}%: -${formatCurrency(l.dto)}`
        s += ` → Cobra ${formatCurrency(l.cobrar)}`
        if (l.comision > 0) s += ` → Com: -${formatCurrency(l.comision)}`
        if (l.cond.tipo === 'efectivo' && l.pagaConNum > 0) s += ` → PagaCon: ${formatCurrency(l.pagaConNum)}, Vuelto: ${formatCurrency(l.vueltoRealNum)}`
        s += ` → Caja: ${formatCurrency(l.entra)}`
        notas.push(s)
      })

      // Main payment method = largest line
      const mainIdx = linesCalc.reduce((best, l, i) => l.entra > (linesCalc[best]?.entra ?? 0) ? i : best, 0)
      const mainBill = linesCalc[mainIdx]?.billTipo || 'efectivo'

      const { data: venta, error: ve } = await supabase.from('ventas').insert([{
        total: totalCobrar, metodo_pago: mainBill, cuotas: 1,
        nota: notas.join(' | '), comision: totalComision, neto: totalEntraCaja
      }]).select().single()
      if (ve) throw ve

      await supabase.from('venta_items').insert(cart.map(i => ({
        venta_id: venta.id, articulo_id: i.articulo.id, cantidad: i.cantidad,
        precio_unitario: i.articulo.precio_venta, subtotal: i.articulo.precio_venta * i.cantidad
      })))

      for (const i of cart) await supabase.from('articulos').update({ cantidad: i.articulo.cantidad - i.cantidad }).eq('id', i.articulo.id)

      // Update billetera for each payment line
      for (const l of linesCalc) {
        if (l.entra <= 0) continue
        const { data: b } = await supabase.from('billetera').select('*').eq('tipo', l.billTipo).single()
        if (b) await supabase.from('billetera').update({ saldo: b.saldo + l.entra }).eq('id', b.id)
      }

      setOk(true); clearAll(); load(); onVentaCompleta()
      setTimeout(() => setOk(false), 3000)
    } catch (e: any) { setErr(e.message || 'Error') } finally { setProc(false) }
  }

  const cntCat = (c: typeof CATS[0]) => arts.filter(a => { const d = a.descripcion.toLowerCase(), n = (a.nota || '').toLowerCase(); return c.kw.some(k => d.includes(k) || n.includes(k)) }).length

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

            {/* Payment lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Formas de pago</p>
                <button onClick={addPago} className="text-[10px] text-kira-600 hover:underline flex items-center gap-0.5"><Plus size={10} />Agregar</button>
              </div>

              <div className="space-y-3">
                {pagos.map((p, idx) => {
                  const l = linesCalc[idx]
                  const cond = l.cond
                  return (
                    <div key={idx} className={cn("rounded-xl border p-3 space-y-2 transition-all",
                      cond ? (cond.tipo === 'efectivo' ? 'border-emerald-200 bg-emerald-50/30' : cond.tipo === 'transferencia' ? 'border-blue-200 bg-blue-50/30' : 'border-purple-200 bg-purple-50/30') : 'border-gray-200 bg-gray-50/30')}>

                      {/* Condition selector */}
                      <div className="flex items-center gap-1.5">
                        {condiciones.map(c => (
                          <button key={c.id} onClick={() => setCondForLine(idx, c.id)}
                            className={cn("flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                              p.condId === c.id ? (c.tipo === 'efectivo' ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : c.tipo === 'transferencia' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-purple-100 border-purple-300 text-purple-700') : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50')}>
                            {condIcon(c.tipo, 12)}
                            {c.nombre}
                          </button>
                        ))}
                        {pagos.length > 1 && <button onClick={() => rmPago(idx)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400"><X size={14} /></button>}
                      </div>

                      {cond && (
                        <>
                          {/* Amount */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16">Monto</span>
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                              <input type="number" value={p.monto} onChange={e => updP(idx, { monto: e.target.value })}
                                placeholder={pagos.length === 1 ? subtotal.toString() : '0'}
                                className="w-full pl-5 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                            </div>
                            {pagos.length > 1 && <button onClick={() => autoFillResto(idx)} className="text-[9px] text-kira-600 hover:underline whitespace-nowrap">Resto</button>}
                          </div>

                          {/* Line breakdown */}
                          {l.montoLista > 0 && (
                            <div className="space-y-1 text-[11px]">
                              {l.dto > 0 && <div className="flex justify-between"><span className="text-emerald-600">Dto {cond.descuento}%</span><span className="font-semibold text-emerald-600">-{formatCurrency(l.dto)}</span></div>}
                              <div className="flex justify-between"><span className="text-gray-600">Cobra</span><span className="font-semibold text-gray-800">{formatCurrency(l.cobrar)}</span></div>

                              {/* Debito toggle */}
                              {cond.tipo === 'transferencia' && (
                                <label className="flex items-center gap-1.5 cursor-pointer py-0.5">
                                  <input type="checkbox" checked={p.esDebito} onChange={e => updP(idx, { esDebito: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500" />
                                  <Wallet size={11} className="text-purple-500" />
                                  <span className="text-gray-500">Paga con débito</span>
                                  {p.esDebito && cond.comision > 0 && <span className="text-purple-500 ml-auto">Com. {cond.comision}%</span>}
                                </label>
                              )}

                              {l.comision > 0 && <div className="flex justify-between"><span className="text-purple-600">Com. posnet {cond.comision}%</span><span className="font-semibold text-purple-600">-{formatCurrency(l.comision)}</span></div>}

                              {/* Paga con (efectivo) */}
                              {cond.tipo === 'efectivo' && (
                                <div className="space-y-1 pt-1 border-t border-gray-100">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 w-16">Paga con</span>
                                    <div className="relative flex-1">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                                      <input type="number" placeholder={l.cobrar.toString()} value={p.pagaCon}
                                        onChange={e => updP(idx, { pagaCon: e.target.value, vueltoReal: '' })}
                                        className="w-full pl-5 pr-2 py-1 rounded border border-gray-200 text-[11px] text-right" />
                                    </div>
                                  </div>
                                  {l.pagaConNum > l.cobrar && (
                                    <>
                                      <div className="flex justify-between"><span className="text-amber-600">Vuelto sugerido</span><span className="text-amber-600 font-semibold">{formatCurrency(l.vueltoSug)}</span></div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500 w-16">Vuelto real</span>
                                        <div className="relative flex-1">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                                          <input type="number" placeholder={l.vueltoSug.toString()} value={p.vueltoReal}
                                            onChange={e => updP(idx, { vueltoReal: e.target.value })}
                                            className="w-full pl-5 pr-2 py-1 rounded border border-gray-200 text-[11px] text-right" />
                                        </div>
                                      </div>
                                      {p.vueltoReal !== '' && Math.abs(l.vueltoRealNum - l.vueltoSug) > 0.5 && (
                                        <div className={cn("flex justify-between", l.vueltoRealNum < l.vueltoSug ? "text-emerald-600" : "text-red-500")}>
                                          <span>{l.vueltoRealNum < l.vueltoSug ? 'Te quedás con' : 'Das de más'}</span>
                                          <span className="font-semibold">{formatCurrency(Math.abs(l.vueltoSug - l.vueltoRealNum))}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}

                              <div className="flex justify-between pt-1 border-t border-gray-100"><span className="text-gray-500 font-medium">Entra en caja</span><span className="font-bold text-gray-800">{formatCurrency(l.entra)}</span></div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Assignment check */}
              {Math.abs(faltaAsignar) >= 1 && totalAsignado > 0 && (
                <div className={cn("flex items-center justify-between mt-2 px-2 py-1.5 rounded-lg text-xs",
                  faltaAsignar > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600")}>
                  <span>{faltaAsignar > 0 ? 'Falta asignar' : 'Excede el total'}</span>
                  <span className="font-semibold">{formatCurrency(Math.abs(faltaAsignar))}</span>
                </div>
              )}
            </div>

            {/* Totals */}
            {totalCobrar > 0 && (
              <div className="space-y-1 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total a cobrar</span>
                  <span style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-bold text-gray-900">{formatCurrency(totalCobrar)}</span>
                </div>
                {totalComision > 0 && <div className="flex justify-between text-xs"><span className="text-purple-600">Comisiones totales</span><span className="font-semibold text-purple-600">-{formatCurrency(totalComision)}</span></div>}
                <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-lg text-xs">
                  <span className="text-gray-500 font-medium">Total entra en caja</span>
                  <span className="font-bold text-gray-800 text-sm">{formatCurrency(totalEntraCaja)}</span>
                </div>
              </div>
            )}

            {err && <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs animate-fade-in"><AlertCircle size={14} />{err}</div>}
            <button onClick={procesarVenta} disabled={proc || !allValid}
              className={cn("w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2",
                proc || !allValid ? "bg-gray-400 cursor-not-allowed" : "bg-kira-500 hover:bg-kira-600 active:scale-[0.98] shadow-md shadow-kira-500/20")}>
              {proc ? 'Procesando...' : <><CheckCircle2 size={16} />Cerrar Venta{totalCobrar > 0 ? ` — ${formatCurrency(totalCobrar)}` : ''}</>}
            </button>
          </div>
        )}
        {ok && <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in z-50"><CheckCircle2 size={20} /><div><p className="font-semibold text-sm">Venta registrada</p><p className="text-xs text-emerald-100">Stock y caja actualizados</p></div></div>}
      </div>
    </div>
  )
}
