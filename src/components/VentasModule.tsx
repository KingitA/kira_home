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
  const [condActiva, setCondActiva] = useState<number | null>(null)
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
  function clearAll() { setCart([]); setErr(''); setCondActiva(null) }

  const subtotal = cart.reduce((s, i) => s + (i.articulo.precio_venta * i.cantidad), 0)
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0)

  const cond = condiciones.find(c => c.id === condActiva)
  const descuentoMonto = cond ? subtotal * cond.descuento / 100 : 0
  const totalACobrar = subtotal - descuentoMonto
  const comisionMonto = cond ? totalACobrar * cond.comision / 100 : 0
  const netoEnCaja = totalACobrar - comisionMonto

  // Which billetera type receives the money
  function getBilleteraTipo(): string {
    if (!cond) return 'efectivo'
    if (cond.tipo === 'efectivo') return 'efectivo'
    if (cond.tipo === 'transferencia') return 'transferencia'
    return 'tarjeta_debito' // tarjeta goes to T. Débito by default
  }

  async function procesarVenta() {
    if (cart.length === 0 || !cond) { setErr('Seleccioná una condición de pago'); return }
    setProc(true); setErr('')
    try {
      const notas: string[] = []
      notas.push(`Pago: ${cond.nombre}`)
      if (cond.descuento > 0) notas.push(`Dto ${cond.descuento}%: -${formatCurrency(descuentoMonto)}`)
      if (cond.comision > 0) notas.push(`Com. posnet ${cond.comision}%: -${formatCurrency(comisionMonto)}`)
      notas.push(`Neto: ${formatCurrency(netoEnCaja)}`)

      const { data: venta, error: ve } = await supabase.from('ventas').insert([{
        total: totalACobrar, metodo_pago: getBilleteraTipo(), cuotas: 1,
        nota: notas.join(' | '), comision: comisionMonto, neto: netoEnCaja
      }]).select().single()
      if (ve) throw ve

      await supabase.from('venta_items').insert(cart.map(i => ({
        venta_id: venta.id, articulo_id: i.articulo.id, cantidad: i.cantidad,
        precio_unitario: i.articulo.precio_venta, subtotal: i.articulo.precio_venta * i.cantidad
      })))

      for (const i of cart) await supabase.from('articulos').update({ cantidad: i.articulo.cantidad - i.cantidad }).eq('id', i.articulo.id)

      // Billetera: entra el neto (total cobrado - comisión posnet)
      const billTipo = getBilleteraTipo()
      const { data: b } = await supabase.from('billetera').select('*').eq('tipo', billTipo).single()
      if (b) await supabase.from('billetera').update({ saldo: b.saldo + netoEnCaja }).eq('id', b.id)

      setOk(true); setCart([]); setCondActiva(null); load(); onVentaCompleta()
      setTimeout(() => setOk(false), 3000)
    } catch (e: any) { setErr(e.message || 'Error') } finally { setProc(false) }
  }

  const cntCat = (c: typeof CATS[0]) => arts.filter(a => { const d = a.descripcion.toLowerCase(), n = (a.nota || '').toLowerCase(); return c.kw.some(k => d.includes(k) || n.includes(k)) }).length

  const condIcon = (tipo: string) => {
    if (tipo === 'efectivo') return <Banknote size={18} className="text-emerald-500" />
    if (tipo === 'transferencia') return <CreditCard size={18} className="text-blue-500" />
    return <Wallet size={18} className="text-purple-500" />
  }

  const condColor = (tipo: string, active: boolean) => {
    if (!active) return 'bg-white border-gray-200 hover:bg-gray-50'
    if (tipo === 'efectivo') return 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
    if (tipo === 'transferencia') return 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
    return 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
  }

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
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Precio de lista ({totalItems} art.)</span>
              <span className="text-sm text-gray-700">{formatCurrency(subtotal)}</span>
            </div>

            {/* Condiciones de pago */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Condición de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {condiciones.map(c => (
                  <button key={c.id} onClick={() => setCondActiva(condActiva === c.id ? null : c.id)}
                    className={cn("flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all",
                      condColor(c.tipo, condActiva === c.id))}>
                    {condIcon(c.tipo)}
                    <span className="text-xs font-medium text-gray-700">{c.nombre}</span>
                    {c.descuento > 0 && <span className="text-[10px] text-emerald-600 font-semibold">-{c.descuento}%</span>}
                    {c.comision > 0 && <span className="text-[10px] text-purple-500">Com. {c.comision}%</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            {cond && (
              <div className="space-y-1.5 animate-fade-in">
                {cond.descuento > 0 && (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-emerald-50 text-xs">
                    <span className="text-emerald-700">Descuento {cond.nombre} {cond.descuento}%</span>
                    <span className="font-semibold text-emerald-600">-{formatCurrency(descuentoMonto)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total a cobrar</span>
                  <span style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-bold text-gray-900">{formatCurrency(totalACobrar)}</span>
                </div>
                {cond.comision > 0 && (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-purple-50 text-xs">
                    <span className="text-purple-700">Comisión posnet {cond.comision}%</span>
                    <span className="font-semibold text-purple-600">-{formatCurrency(comisionMonto)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-2 py-1 text-xs">
                  <span className="text-gray-500">Neto en caja</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(netoEnCaja)}</span>
                </div>
              </div>
            )}

            {!cond && (
              <div className="text-center py-2 text-xs text-amber-500">Seleccioná una condición de pago</div>
            )}

            {err && <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs animate-fade-in"><AlertCircle size={14} />{err}</div>}
            <button onClick={procesarVenta} disabled={proc || !cond}
              className={cn("w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2",
                proc || !cond ? "bg-gray-400 cursor-not-allowed" : "bg-kira-500 hover:bg-kira-600 active:scale-[0.98] shadow-md shadow-kira-500/20")}>
              {proc ? 'Procesando...' : <><CheckCircle2 size={16} />Cerrar Venta{cond ? ` — ${formatCurrency(totalACobrar)}` : ''}</>}
            </button>
          </div>
        )}
        {ok && <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in z-50"><CheckCircle2 size={20} /><div><p className="font-semibold text-sm">Venta registrada</p><p className="text-xs text-emerald-100">Stock y caja actualizados</p></div></div>}
      </div>
    </div>
  )
}
