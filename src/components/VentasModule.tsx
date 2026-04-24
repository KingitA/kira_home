'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Articulo, CarritoItem, MetodoPago, METODO_PAGO_LABELS, Posnet, PosnetComision } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, CheckCircle2, AlertCircle, X, Package, ArrowLeft, Wallet } from 'lucide-react'

interface Props { onVentaCompleta: () => void }

// Category illustrations (compact)
const Ill=(d:string)=>()=>(<svg viewBox="0 0 120 80" className="w-full h-full" fill="none" dangerouslySetInnerHTML={{__html:d}}/>)
const IllCocina=Ill('<ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="25" y="40" width="40" height="8" rx="4" fill="currentColor" opacity="0.25"/><rect x="25" y="35" width="40" height="10" rx="5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5"/><line x1="65" y1="40" x2="85" y2="35" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/><path d="M35 30Q37 24 35 18" stroke="currentColor" stroke-width="1" opacity="0.2" fill="none"/><path d="M43 28Q45 22 43 16" stroke="currentColor" stroke-width="1" opacity="0.15" fill="none"/>')
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

interface PagoLine { metodo: MetodoPago; monto: string; cuotas: number; posnetId: number | null }

export default function VentasModule({ onVentaCompleta }: Props) {
  const [arts, setArts] = useState<Articulo[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Articulo[]>([])
  const [cart, setCart] = useState<CarritoItem[]>([])
  const [proc, setProc] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  const [catAct, setCatAct] = useState<string | null>(null)
  const [dtoEfectivo, setDtoEfectivo] = useState(false)
  const [dtoTransf, setDtoTransf] = useState(false)
  const [pagos, setPagos] = useState<PagoLine[]>([{ metodo: 'efectivo', monto: '', cuotas: 1, posnetId: null }])
  const [posnets, setPosnets] = useState<Posnet[]>([])
  const [posComs, setPosComs] = useState<PosnetComision[]>([])
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data: a } = await supabase.from('articulos').select('*').eq('activo', true).gt('cantidad', 0).order('descripcion')
    if (a) setArts(a)
    const { data: p } = await supabase.from('posnets').select('*').eq('activo', true).order('nombre')
    if (p) setPosnets(p)
    const { data: pc } = await supabase.from('posnet_comisiones').select('*').eq('activo', true)
    if (pc) setPosComs(pc)
  }

  useEffect(() => {
    if (search.length >= 2) { const q = search.toLowerCase(); setResults(arts.filter(a => a.descripcion.toLowerCase().includes(q) || a.codigo?.toLowerCase().includes(q) || a.proveedor?.toLowerCase().includes(q)).slice(0, 15)) }
    else if (catAct && catAct !== 'todos') { const c = CATS.find(x => x.id === catAct); if (c) setResults(arts.filter(a => { const d = a.descripcion.toLowerCase(), n = (a.nota || '').toLowerCase(); return c.kw.some(k => d.includes(k) || n.includes(k)) })) }
    else if (catAct === 'todos') setResults(arts)
    else setResults([])
  }, [search, arts, catAct])

  function addToCart(a: Articulo) { setCart(p => { const e = p.find(i => i.articulo.id === a.id); if (e) { if (e.cantidad >= a.cantidad) { setErr(`Stock máx: ${a.cantidad}`); setTimeout(() => setErr(''), 2500); return p } return p.map(i => i.articulo.id === a.id ? { ...i, cantidad: i.cantidad + 1 } : i) } return [...p, { articulo: a, cantidad: 1 }] }); setSearch(''); if (!catAct) setResults([]) }
  function updQty(id: number, d: number) { setCart(p => p.map(i => { if (i.articulo.id !== id) return i; const q = i.cantidad + d; if (q <= 0 || q > i.articulo.cantidad) return i; return { ...i, cantidad: q } })) }
  function clearAll() { setCart([]); setPagos([{ metodo: 'efectivo', monto: '', cuotas: 1, posnetId: null }]); setErr(''); setDtoEfectivo(false); setDtoTransf(false) }

  const subtotal = cart.reduce((s, i) => s + (i.articulo.precio_venta * i.cantidad), 0)
  const dtoMonto = dtoEfectivo ? subtotal * 0.10 : dtoTransf ? subtotal * 0.05 : 0
  const total = subtotal - dtoMonto
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0)
  const totalPagado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const ajuste = totalPagado - totalConRecargo

  function addPago() { setPagos(p => [...p, { metodo: 'transferencia', monto: '', cuotas: 1, posnetId: null }]) }
  function rmPago(i: number) { setPagos(p => p.filter((_, j) => j !== i)) }
  function updPago(i: number, f: string, v: any) { setPagos(p => p.map((x, j) => j === i ? { ...x, [f]: v } : x)) }
  function setTodo(i: number) { const o = pagos.reduce((s, p, j) => j === i ? s : s + (parseFloat(p.monto) || 0), 0); updPago(i, 'monto', (totalConRecargo - o).toString()) }

  // Get posnet commission AND recargo for a payment line
  function getPosnetInfo(p: PagoLine): { pct: number; recargo: number } {
    if (!p.posnetId) return { pct: 0, recargo: 0 }
    const tipo = p.metodo === 'tarjeta_debito' ? 'debito' : 'credito'
    const comps = posComs.filter(pc => pc.posnet_id === p.posnetId && pc.tipo === tipo)
    if (tipo === 'credito' && p.cuotas > 1) {
      const exact = comps.find(pc => pc.cuotas === p.cuotas)
      if (exact) return { pct: exact.porcentaje, recargo: exact.recargo ?? 0 }
    }
    const base = comps.find(pc => pc.cuotas === 1) || comps[0]
    return { pct: base?.porcentaje ?? 0, recargo: base?.recargo ?? 0 }
  }

  const isTarjeta = (m: MetodoPago) => m === 'tarjeta_debito' || m === 'tarjeta_credito'

  // Calculate recargo on the total (increases what the client pays)
  const totalRecargo = pagos.reduce((s, p) => {
    const { recargo } = getPosnetInfo(p)
    if (recargo <= 0) return s
    return s + (total * recargo / 100)
  }, 0)

  const totalConRecargo = total + totalRecargo

  // Commission is calculated on the amount WITH recargo
  const totalComision = pagos.reduce((s, p) => {
    const m = parseFloat(p.monto) || 0
    const { pct } = getPosnetInfo(p)
    return s + (m * pct / 100)
  }, 0)
  const netoReal = totalPagado - totalComision

  async function procesarVenta() {
    if (cart.length === 0 || totalPagado <= 0) { setErr('Ingresá el monto'); return }
    setProc(true); setErr('')
    try {
      const main = pagos.reduce((a, b) => (parseFloat(b.monto) || 0) > (parseFloat(a.monto) || 0) ? b : a)
      const notas: string[] = []
      if (pagos.length > 1) {
        notas.push('Pago: ' + pagos.filter(p => parseFloat(p.monto) > 0).map(p => {
          let s = `${METODO_PAGO_LABELS[p.metodo]} ${formatCurrency(parseFloat(p.monto) || 0)}`
          if (isTarjeta(p.metodo) && p.posnetId) { const pn = posnets.find(x => x.id === p.posnetId); if (pn) s += ` (${pn.nombre})` }
          if (p.metodo === 'tarjeta_credito' && p.cuotas > 1) s += ` ${p.cuotas}c`
          return s
        }).join(' + '))
      } else {
        if (isTarjeta(main.metodo) && main.posnetId) { const pn = posnets.find(x => x.id === main.posnetId); if (pn) notas.push(`Posnet: ${pn.nombre}`) }
        if (main.metodo === 'tarjeta_credito' && main.cuotas > 1) notas.push(`${main.cuotas} cuotas`)
      }
      if (dtoEfectivo) notas.push(`Dto contado 10%: -${formatCurrency(dtoMonto)}`)
      if (dtoTransf) notas.push(`Dto transf 5%: -${formatCurrency(dtoMonto)}`)
      if (totalRecargo > 0) notas.push(`Recargo financiero ${pagos.map(p => { const { recargo } = getPosnetInfo(p); return recargo > 0 ? `${recargo}%` : null }).filter(Boolean).join('+')}: +${formatCurrency(totalRecargo)}`)
      if (totalComision > 0) notas.push(`Comisión posnet: -${formatCurrency(totalComision)}`)
      if (ajuste !== 0) notas.push(`Ajuste: ${formatCurrency(ajuste)}`)

      const { data: venta, error: ve } = await supabase.from('ventas').insert([{
        total: totalConRecargo, metodo_pago: main.metodo, cuotas: main.metodo === 'tarjeta_credito' ? main.cuotas : 1,
        nota: notas.length > 0 ? notas.join(' | ') : null, comision: totalComision, neto: netoReal,
        posnet_id: main.posnetId
      }]).select().single()
      if (ve) throw ve

      await supabase.from('venta_items').insert(cart.map(i => ({ venta_id: venta.id, articulo_id: i.articulo.id, cantidad: i.cantidad, precio_unitario: i.articulo.precio_venta, subtotal: i.articulo.precio_venta * i.cantidad })))
      for (const i of cart) await supabase.from('articulos').update({ cantidad: i.articulo.cantidad - i.cantidad }).eq('id', i.articulo.id)

      // Billetera: efectivo y transferencia entran al 100%, tarjeta entra neto (menos comision posnet)
      for (const p of pagos) {
        const m = parseFloat(p.monto) || 0; if (m <= 0) continue
        const pct = isTarjeta(p.metodo) ? getPosnetInfo(p).pct : 0
        const neto = m - (m * pct / 100)
        const { data: b } = await supabase.from('billetera').select('*').eq('tipo', p.metodo).single()
        if (b) await supabase.from('billetera').update({ saldo: b.saldo + neto }).eq('id', b.id)
      }

      setOk(true); setCart([]); setPagos([{ metodo: 'efectivo', monto: '', cuotas: 1, posnetId: null }])
      setDtoEfectivo(false); setDtoTransf(false); load(); onVentaCompleta()
      setTimeout(() => setOk(false), 3000)
    } catch (e: any) { setErr(e.message || 'Error') } finally { setProc(false) }
  }

  const cntCat = (c: typeof CATS[0]) => arts.filter(a => { const d = a.descripcion.toLowerCase(), n = (a.nota || '').toLowerCase(); return c.kw.some(k => d.includes(k) || n.includes(k)) }).length

  return (
    <div className="h-full flex flex-col lg:flex-row bg-botanical">
      {/* Left: search & categories */}
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

      {/* Right: cart */}
      <div className="w-full lg:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col relative z-10">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><ShoppingCart size={16} className="text-gray-400" /><h3 className="text-sm font-semibold text-gray-700">Venta actual</h3>{totalItems > 0 && <span className="bg-kira-100 text-kira-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{totalItems}</span>}</div>
          {cart.length > 0 && <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 hover:underline">Vaciar</button>}
        </div>
        <div className="flex-1 overflow-auto px-4 py-2">
          {cart.length === 0 ? <div className="flex items-center justify-center h-full text-gray-300 text-sm">Carrito vacío</div> :
            <div className="space-y-2">{cart.map((item, idx) => (<div key={item.articulo.id} className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg animate-slide-in" style={{ animationDelay: `${idx * 50}ms` }}><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{item.articulo.descripcion}</p><p className="text-xs text-gray-400">{formatCurrency(item.articulo.precio_venta)} c/u</p></div><div className="flex items-center gap-1.5"><button onClick={() => updQty(item.articulo.id, -1)} disabled={item.cantidad <= 1} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Minus size={12} /></button><span className="w-8 text-center text-sm font-semibold text-gray-700">{item.cantidad}</span><button onClick={() => updQty(item.articulo.id, 1)} disabled={item.cantidad >= item.articulo.cantidad} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Plus size={12} /></button></div><p className="text-sm font-semibold text-gray-800 w-20 text-right">{formatCurrency(item.articulo.precio_venta * item.cantidad)}</p><button onClick={() => setCart(p => p.filter(i => i.articulo.id !== item.articulo.id))} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button></div>))}</div>}
        </div>
        {cart.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3 max-h-[60vh] overflow-auto">
            <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Subtotal ({totalItems} art.)</span><span className="text-sm text-gray-700">{formatCurrency(subtotal)}</span></div>

            {/* Descuentos: solo reducen el precio, sin comisión */}
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer group flex-1">
                <input type="checkbox" checked={dtoEfectivo} onChange={e => { setDtoEfectivo(e.target.checked); if (e.target.checked) { setDtoTransf(false); if (pagos.length === 1) { updPago(0, 'metodo', 'efectivo'); updPago(0, 'monto', (subtotal * 0.9).toString()) } } }} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
                <Banknote size={12} className="text-emerald-500" /><span className="text-[11px] text-gray-600">Dto. efectivo 10%</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer group flex-1">
                <input type="checkbox" checked={dtoTransf} onChange={e => { setDtoTransf(e.target.checked); if (e.target.checked) { setDtoEfectivo(false); if (pagos.length === 1) { updPago(0, 'metodo', 'transferencia'); updPago(0, 'monto', (subtotal * 0.95).toString()) } } }} className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400" />
                <CreditCard size={12} className="text-blue-500" /><span className="text-[11px] text-gray-600">Dto. transf. 5%</span>
              </label>
            </div>
            {(dtoEfectivo || dtoTransf) && <div className="flex items-center justify-between"><span className="text-xs text-gray-400">{dtoEfectivo ? 'Descuento efectivo 10%' : 'Descuento transferencia 5%'}</span><span className="text-xs font-semibold text-emerald-600">-{formatCurrency(dtoMonto)}</span></div>}

            <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-700">Total a cobrar</span><span style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-bold text-gray-900">{formatCurrency(totalConRecargo)}</span></div>
            {totalRecargo > 0 && <div className="flex items-center justify-between"><span className="text-xs text-orange-500">Incluye recargo financiero</span><span className="text-xs font-semibold text-orange-600">+{formatCurrency(totalRecargo)}</span></div>}

            {/* Pagos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Forma de pago</p>
                {pagos.length < 4 && <button onClick={addPago} className="text-[10px] text-kira-600 hover:underline flex items-center gap-0.5"><Plus size={10} />Agregar</button>}
              </div>
              <div className="space-y-2">
                {pagos.map((p, idx) => {
                  const mNum = parseFloat(p.monto) || 0
                  return (
                    <div key={idx} className="space-y-1.5 pb-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <select value={p.metodo} onChange={e => { updPago(idx, 'metodo', e.target.value); if (!isTarjeta(e.target.value as MetodoPago)) updPago(idx, 'posnetId', null) }}
                          className="w-32 px-2 py-2 text-xs border border-gray-200 rounded-lg">
                          <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
                          <option value="tarjeta_debito">T. Débito</option><option value="tarjeta_credito">T. Crédito</option>
                        </select>
                        <div className="relative flex-1"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                          <input type="number" placeholder="0" value={p.monto} onChange={e => updPago(idx, 'monto', e.target.value)}
                            className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-kira-400/30" />
                        </div>
                        {pagos.length === 1 ? <button onClick={() => setTodo(0)} className="text-[10px] text-emerald-600 hover:underline whitespace-nowrap">Todo</button>
                          : <button onClick={() => rmPago(idx)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400"><X size={14} /></button>}
                      </div>
                      {/* Posnet for tarjeta */}
                      {isTarjeta(p.metodo) && posnets.length > 0 && (
                        <div className="flex items-center gap-2 ml-1">
                          <span className="text-[10px] text-gray-400">Posnet:</span>
                          {posnets.map(pos => (
                            <button key={pos.id} onClick={() => updPago(idx, 'posnetId', p.posnetId === pos.id ? null : pos.id)}
                              className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-colors border",
                                p.posnetId === pos.id ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100")}>
                              {pos.nombre}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Cuotas for credito */}
                      {p.metodo === 'tarjeta_credito' && (
                        <div className="flex items-center gap-2 ml-1">
                          <span className="text-[10px] text-gray-400">Cuotas:</span>
                          {[1, 3, 6, 12].map(c => (
                            <button key={c} onClick={() => updPago(idx, 'cuotas', c)}
                              className={cn("px-2 py-0.5 rounded text-[10px] font-medium border",
                                p.cuotas === c ? "bg-pink-100 text-pink-700 border-pink-200" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100")}>
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Commission and recargo inline */}
                      {isTarjeta(p.metodo) && p.posnetId && mNum > 0 && (() => {
                        const { pct: comPct, recargo: recPct } = getPosnetInfo(p)
                        const comMonto = mNum * comPct / 100
                        if (comPct === 0 && recPct === 0) return null
                        return (
                          <div className="ml-1 space-y-0.5">
                            {recPct > 0 && <div className="flex items-center justify-between text-[10px]"><span className="text-orange-500">Recargo al cliente {recPct}%</span><span className="text-orange-600 font-semibold">+{formatCurrency(total * recPct / 100)}</span></div>}
                            {comPct > 0 && <div className="flex items-center justify-between text-[10px]"><span className="text-purple-500">Comisión {posnets.find(x => x.id === p.posnetId)?.nombre} {comPct}%</span><span className="text-purple-600 font-semibold">-{formatCurrency(comMonto)} → Neto: {formatCurrency(mNum - comMonto)}</span></div>}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>

              {totalPagado > 0 && ajuste !== 0 && (
                <div className={cn("flex items-center justify-between mt-2 px-2 py-1.5 rounded-lg text-xs", ajuste > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600")}>
                  <span>{ajuste > 0 ? 'Vuelto / Ajuste' : 'Falta cobrar'}</span><span className="font-semibold">{formatCurrency(Math.abs(ajuste))}</span>
                </div>
              )}
              {totalComision > 0 && (
                <div className="flex items-center justify-between mt-2 px-2 py-1.5 rounded-lg text-xs bg-purple-50 text-purple-700">
                  <span>Comisión posnet total</span><span className="font-semibold">-{formatCurrency(totalComision)}</span>
                </div>
              )}
              {totalComision > 0 && (
                <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-500">
                  <span>Neto real en caja</span><span className="font-semibold text-gray-700">{formatCurrency(netoReal)}</span>
                </div>
              )}
            </div>

            {err && <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs animate-fade-in"><AlertCircle size={14} />{err}</div>}
            <button onClick={procesarVenta} disabled={proc || totalPagado <= 0}
              className={cn("w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2",
                proc || totalPagado <= 0 ? "bg-gray-400 cursor-not-allowed" : "bg-kira-500 hover:bg-kira-600 active:scale-[0.98] shadow-md shadow-kira-500/20")}>
              {proc ? 'Procesando...' : <><CheckCircle2 size={16} />Cerrar Venta — {formatCurrency(totalConRecargo)}</>}
            </button>
          </div>
        )}
        {ok && <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in z-50"><CheckCircle2 size={20} /><div><p className="font-semibold text-sm">Venta registrada</p><p className="text-xs text-emerald-100">Stock y caja actualizados</p></div></div>}
      </div>
    </div>
  )
}
