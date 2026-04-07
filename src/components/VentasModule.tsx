'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Articulo, CarritoItem } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  Banknote, CheckCircle2, AlertCircle, X, Package, ArrowLeft
} from 'lucide-react'

interface Props {
  onVentaCompleta: () => void
}

/* ---- SVG illustrations for categories ---- */
const IllCocina = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/>
    {/* Pan */}
    <rect x="25" y="40" width="40" height="8" rx="4" fill="currentColor" opacity="0.25"/>
    <rect x="25" y="35" width="40" height="10" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
    <line x1="65" y1="40" x2="85" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
    {/* Spatula */}
    <rect x="78" y="18" width="3" height="25" rx="1.5" fill="currentColor" opacity="0.3" transform="rotate(15 79 30)"/>
    <rect x="76" y="12" width="7" height="8" rx="2" fill="currentColor" opacity="0.2" transform="rotate(15 79 16)"/>
    {/* Steam */}
    <path d="M35 30 Q37 24 35 18" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round"/>
    <path d="M43 28 Q45 22 43 16" stroke="currentColor" strokeWidth="1" opacity="0.15" fill="none" strokeLinecap="round"/>
    <path d="M51 30 Q53 24 51 18" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round"/>
    {/* Knife */}
    <rect x="12" y="25" width="2" height="20" rx="1" fill="currentColor" opacity="0.3"/>
    <rect x="10" y="20" width="6" height="7" rx="1" fill="currentColor" opacity="0.2"/>
  </svg>
)

const IllVajilla = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/>
    {/* Cup */}
    <path d="M30 30 L30 55 Q30 65 45 65 L55 65 Q70 65 70 55 L70 30 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15"/>
    <path d="M70 38 Q82 38 82 48 Q82 58 70 58" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3"/>
    {/* Steam */}
    <path d="M42 25 Q44 18 42 12" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round"/>
    <path d="M50 23 Q52 16 50 10" stroke="currentColor" strokeWidth="1" opacity="0.15" fill="none" strokeLinecap="round"/>
    <path d="M58 25 Q60 18 58 12" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round"/>
    {/* Plate */}
    <ellipse cx="100" cy="58" rx="14" ry="5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.1"/>
    <ellipse cx="100" cy="58" rx="8" ry="3" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.2"/>
  </svg>
)

const IllDeco = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/>
    {/* Vase */}
    <path d="M45 70 L48 45 Q42 40 42 35 Q42 28 50 28 L60 28 Q68 28 68 35 Q68 40 62 45 L65 70 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    {/* Flowers */}
    <circle cx="50" cy="20" r="5" fill="currentColor" opacity="0.2"/>
    <circle cx="60" cy="16" r="5" fill="currentColor" opacity="0.15"/>
    <circle cx="55" cy="12" r="4" fill="currentColor" opacity="0.25"/>
    <line x1="50" y1="25" x2="52" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
    <line x1="60" y1="21" x2="58" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
    <line x1="55" y1="16" x2="55" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
    {/* Frame */}
    <rect x="80" y="20" width="22" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.08"/>
    <rect x="84" y="24" width="14" height="20" rx="1" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.15"/>
  </svg>
)

const IllTextil = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/>
    {/* Pillow */}
    <rect x="15" y="30" width="35" height="28" rx="8" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="20" y1="35" x2="20" y2="53" stroke="currentColor" strokeWidth="0.8" opacity="0.15"/>
    <line x1="45" y1="35" x2="45" y2="53" stroke="currentColor" strokeWidth="0.8" opacity="0.15"/>
    {/* Blanket fold */}
    <path d="M60 65 L60 35 Q60 28 68 28 L95 28 Q102 28 102 35 L102 65" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.1"/>
    <path d="M60 50 Q80 45 102 50" stroke="currentColor" strokeWidth="1" opacity="0.15" fill="none"/>
    <path d="M60 40 Q80 35 102 40" stroke="currentColor" strokeWidth="0.8" opacity="0.1" fill="none"/>
  </svg>
)

const IllTermos = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/>
    {/* Thermos */}
    <rect x="30" y="18" width="16" height="50" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="30" y="18" width="16" height="10" rx="4" fill="currentColor" opacity="0.25"/>
    <rect x="32" y="14" width="12" height="6" rx="2" fill="currentColor" opacity="0.2"/>
    {/* Mate */}
    <path d="M65 40 Q60 40 58 50 Q56 65 65 68 L80 68 Q89 65 87 50 Q85 40 80 40 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    {/* Bombilla */}
    <line x1="72" y1="42" x2="75" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
    <circle cx="75" cy="18" r="3" fill="currentColor" opacity="0.2"/>
  </svg>
)

const IllBano = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/>
    {/* Soap dispenser */}
    <rect x="25" y="35" width="20" height="30" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="32" y="25" width="6" height="12" rx="2" fill="currentColor" opacity="0.2"/>
    <path d="M38 28 L45 28 L45 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3"/>
    {/* Towel */}
    <rect x="60" y="28" width="30" height="38" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="65" y1="28" x2="65" y2="66" stroke="currentColor" strokeWidth="0.8" opacity="0.15"/>
    <line x1="70" y1="28" x2="70" y2="66" stroke="currentColor" strokeWidth="0.8" opacity="0.1"/>
    <path d="M60 48 Q75 44 90 48" stroke="currentColor" strokeWidth="0.8" opacity="0.15" fill="none"/>
  </svg>
)

const CATEGORIAS = [
  { id: 'cocina', nombre: 'Cocina', keywords: ['sarten', 'cacerola', 'olla', 'wok', 'hervidor', 'pava', 'cafetera', 'jarra', 'botella', 'fuente', 'molde', 'tabla', 'rallador', 'escurridor', 'especiero', 'dispenser', 'contenedor', 'portarollo', 'repasador', 'vaso termico', 'yerbero', 'azucarero', 'bateria', 'bifera', 'abrelata', 'aceitero', 'afilador', 'cuchillo', 'tenedor', 'cuchara', 'cucharita', 'espumadera', 'espatula', 'pinza', 'colador', 'hudson', 'tramontina'], bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', accent: 'text-amber-600', Ill: IllCocina },
  { id: 'vajilla', nombre: 'Vajilla', keywords: ['plato', 'bowl', 'taza', 'vaso', 'copa', 'jarro', 'mug', 'vassa', 'set de', 'juego de'], bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800', accent: 'text-sky-600', Ill: IllVajilla },
  { id: 'decoracion', nombre: 'Decoración', keywords: ['adorno', 'florero', 'jarron', 'maceta', 'planta', 'cuadro', 'espejo', 'reloj', 'vela', 'posavela', 'portarretrato', 'posavaso', 'plato de sitio', 'bandeja', 'cesto', 'organizador', 'canasto', 'lampara'], bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', accent: 'text-rose-600', Ill: IllDeco },
  { id: 'textil', nombre: 'Textil', keywords: ['alfombra', 'almohadon', 'almohada', 'manta', 'mantel', 'camino', 'cortina', 'individual', 'pie de cama', 'felpudo', 'funda', 'matero'], bg: 'bg-violet-50 border-violet-200', text: 'text-violet-800', accent: 'text-violet-600', Ill: IllTextil },
  { id: 'termos', nombre: 'Termos y Mates', keywords: ['termo', 'mate ', 'bombilla'], bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', accent: 'text-emerald-600', Ill: IllTermos },
  { id: 'baño', nombre: 'Baño', keywords: ['baño', 'jabonera', 'cesto de basura', 'portacepillo'], bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-800', accent: 'text-cyan-600', Ill: IllBano },
]

export default function VentasModule({ onVentaCompleta }: Props) {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Articulo[]>([])
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [ventaExitosa, setVentaExitosa] = useState(false)
  const [error, setError] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [montoEfectivo, setMontoEfectivo] = useState<string>('')
  const [montoTransferencia, setMontoTransferencia] = useState<string>('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchArticulos() }, [])

  async function fetchArticulos() {
    const { data } = await supabase.from('articulos').select('*').eq('activo', true).gt('cantidad', 0).order('descripcion')
    if (data) setArticulos(data)
  }

  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase()
      setResults(articulos.filter(a =>
        a.descripcion.toLowerCase().includes(q) || a.codigo?.toLowerCase().includes(q) || a.proveedor?.toLowerCase().includes(q)
      ).slice(0, 15))
    } else if (categoriaActiva && categoriaActiva !== 'todos') {
      const cat = CATEGORIAS.find(c => c.id === categoriaActiva)
      if (cat) {
        setResults(articulos.filter(a => {
          const d = a.descripcion.toLowerCase(); const n = (a.nota || '').toLowerCase()
          return cat.keywords.some(k => d.includes(k) || n.includes(k))
        }))
      }
    } else if (categoriaActiva === 'todos') {
      setResults(articulos)
    } else { setResults([]) }
  }, [search, articulos, categoriaActiva])

  function addToCart(articulo: Articulo) {
    setCarrito(prev => {
      const ex = prev.find(i => i.articulo.id === articulo.id)
      if (ex) {
        if (ex.cantidad >= articulo.cantidad) { setError(`Stock máximo: ${articulo.cantidad}`); setTimeout(() => setError(''), 2500); return prev }
        return prev.map(i => i.articulo.id === articulo.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { articulo, cantidad: 1 }]
    })
    setSearch('')
    if (!categoriaActiva) setResults([])
  }

  function updateQuantity(id: number, delta: number) {
    setCarrito(prev => prev.map(item => {
      if (item.articulo.id !== id) return item
      const q = item.cantidad + delta
      if (q <= 0 || q > item.articulo.cantidad) return item
      return { ...item, cantidad: q }
    }))
  }

  const removeFromCart = (id: number) => setCarrito(prev => prev.filter(i => i.articulo.id !== id))
  const clearCart = () => { setCarrito([]); setMontoEfectivo(''); setMontoTransferencia(''); setError('') }

  const total = carrito.reduce((s, i) => s + (i.articulo.precio_venta * i.cantidad), 0)
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)
  const pagoEfectivo = parseFloat(montoEfectivo) || 0
  const pagoTransferencia = parseFloat(montoTransferencia) || 0
  const totalPagado = pagoEfectivo + pagoTransferencia
  const ajuste = totalPagado - total

  async function procesarVenta() {
    if (carrito.length === 0 || totalPagado <= 0) { setError('Ingresá el monto de pago'); return }
    setProcessing(true); setError('')
    try {
      let metodoPago: 'efectivo' | 'transferencia' = pagoTransferencia > pagoEfectivo ? 'transferencia' : 'efectivo'
      const notaParts: string[] = []
      if (pagoEfectivo > 0 && pagoTransferencia > 0) notaParts.push(`Pago mixto: Efectivo ${formatCurrency(pagoEfectivo)} + Transferencia ${formatCurrency(pagoTransferencia)}`)
      if (ajuste !== 0) notaParts.push(`Ajuste: ${formatCurrency(ajuste)}`)

      const { data: venta, error: ve } = await supabase.from('ventas').insert([{ total, metodo_pago: metodoPago, nota: notaParts.length > 0 ? notaParts.join(' | ') : null }]).select().single()
      if (ve) throw ve
      const items = carrito.map(i => ({ venta_id: venta.id, articulo_id: i.articulo.id, cantidad: i.cantidad, precio_unitario: i.articulo.precio_venta, subtotal: i.articulo.precio_venta * i.cantidad }))
      const { error: ie } = await supabase.from('venta_items').insert(items)
      if (ie) throw ie
      for (const item of carrito) await supabase.from('articulos').update({ cantidad: item.articulo.cantidad - item.cantidad }).eq('id', item.articulo.id)
      if (pagoEfectivo > 0) { const { data: b } = await supabase.from('billetera').select('*').eq('tipo', 'efectivo').single(); if (b) await supabase.from('billetera').update({ saldo: b.saldo + pagoEfectivo }).eq('id', b.id) }
      if (pagoTransferencia > 0) { const { data: b } = await supabase.from('billetera').select('*').eq('tipo', 'transferencia').single(); if (b) await supabase.from('billetera').update({ saldo: b.saldo + pagoTransferencia }).eq('id', b.id) }
      setVentaExitosa(true); setCarrito([]); setMontoEfectivo(''); setMontoTransferencia(''); fetchArticulos(); onVentaCompleta()
      setTimeout(() => setVentaExitosa(false), 3000)
    } catch (err: any) { setError(err.message || 'Error al procesar la venta') } finally { setProcessing(false) }
  }

  const countCat = (cat: typeof CATEGORIAS[0]) => articulos.filter(a => { const d = a.descripcion.toLowerCase(); const n = (a.nota||'').toLowerCase(); return cat.keywords.some(k => d.includes(k)||n.includes(k)) }).length

  return (
    <div className="h-full flex flex-col lg:flex-row bg-botanical">
      <div className="flex-1 p-4 lg:p-6 overflow-auto relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-5">
            <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">Punto de Venta</h2>
            <p className="text-sm text-gray-500 mt-1">Seleccioná una categoría o buscá artículos</p>
          </div>

          <div className="relative mb-5">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={searchRef} type="text" placeholder="Buscar por nombre, código o proveedor..." value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value.length >= 2) setCategoriaActiva(null) }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-kira-400/30 focus:border-kira-400 placeholder:text-gray-400 shadow-sm" />
            {search && <button onClick={() => { setSearch(''); setResults([]); setCategoriaActiva(null) }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"><X size={14} className="text-gray-400" /></button>}
          </div>

          {categoriaActiva && !search && (
            <button onClick={() => { setCategoriaActiva(null); setResults([]) }} className="flex items-center gap-2 text-sm text-kira-600 hover:text-kira-700 mb-4 animate-fade-in">
              <ArrowLeft size={14} /> Volver a categorías
            </button>
          )}

          {/* Category cards with illustrations */}
          {!categoriaActiva && search.length < 2 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6 animate-fade-in">
              {CATEGORIAS.map((cat) => (
                <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)}
                  className={`group relative overflow-hidden rounded-xl border h-36 lg:h-40 text-left transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] ${cat.bg}`}>
                  <div className={`absolute top-2 right-2 w-20 h-20 lg:w-24 lg:h-24 ${cat.accent} opacity-60 group-hover:opacity-80 transition-opacity`}>
                    <cat.Ill />
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-end p-3.5">
                    <h3 className={`font-semibold text-sm lg:text-base ${cat.text}`}>{cat.nombre}</h3>
                    <p className={`text-[11px] ${cat.accent} opacity-70`}>{countCat(cat)} productos</p>
                  </div>
                </button>
              ))}
              <button onClick={() => setCategoriaActiva('todos')}
                className="group relative overflow-hidden rounded-xl border border-gray-200 h-36 lg:h-40 text-left transition-all hover:scale-[1.02] hover:shadow-md bg-white">
                <div className="absolute top-3 right-3 text-gray-300 opacity-40">
                  <Package size={48} />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-3.5">
                  <h3 className="font-semibold text-sm lg:text-base text-gray-700">Ver Todo</h3>
                  <p className="text-[11px] text-gray-400">{articulos.length} productos</p>
                </div>
              </button>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="max-h-[55vh] overflow-auto divide-y divide-gray-50">
                {results.map((a) => {
                  const inCart = carrito.find(i => i.articulo.id === a.id)
                  const rem = a.cantidad - (inCart?.cantidad ?? 0)
                  return (
                    <button key={a.id} onClick={() => addToCart(a)} disabled={rem <= 0}
                      className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors", rem <= 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-kira-50/50")}>
                      <div className="w-8 h-8 rounded-lg bg-kira-100 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-kira-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.descripcion}</p>
                        <p className="text-xs text-gray-400">{a.codigo && `${a.codigo} · `}{a.proveedor}{inCart && <span className="text-kira-500 ml-1">· {inCart.cantidad} en carrito</span>}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-800">{formatCurrency(a.precio_venta)}</p>
                        <p className={cn("text-[10px]", rem <= 2 ? "text-amber-500" : "text-gray-400")}>Stock: {rem}</p>
                      </div>
                      <Plus size={16} className="text-gray-300 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {search.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm animate-fade-in"><Package size={28} className="mx-auto mb-2 text-gray-300" />No se encontraron artículos con stock</div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col relative z-10">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Venta actual</h3>
            {totalItems > 0 && <span className="bg-kira-100 text-kira-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{totalItems}</span>}
          </div>
          {carrito.length > 0 && <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 hover:underline">Vaciar</button>}
        </div>

        <div className="flex-1 overflow-auto px-4 py-2">
          {carrito.length === 0 ? <div className="flex items-center justify-center h-full text-gray-300 text-sm">Carrito vacío</div> : (
            <div className="space-y-2">{carrito.map((item, idx) => (
              <div key={item.articulo.id} className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg animate-slide-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.articulo.descripcion}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.articulo.precio_venta)} c/u</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQuantity(item.articulo.id, -1)} disabled={item.cantidad <= 1} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Minus size={12} /></button>
                  <span className="w-8 text-center text-sm font-semibold text-gray-700">{item.cantidad}</span>
                  <button onClick={() => updateQuantity(item.articulo.id, 1)} disabled={item.cantidad >= item.articulo.cantidad} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Plus size={12} /></button>
                </div>
                <p className="text-sm font-semibold text-gray-800 w-20 text-right">{formatCurrency(item.articulo.precio_venta * item.cantidad)}</p>
                <button onClick={() => removeFromCart(item.articulo.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}</div>
          )}
        </div>

        {carrito.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total ({totalItems} art.)</span>
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Forma de pago</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 w-28 flex-shrink-0"><Banknote size={14} className="text-emerald-500" /><span className="text-xs text-gray-600">Efectivo</span></div>
                  <div className="relative flex-1"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <input type="number" placeholder="0" value={montoEfectivo} onChange={e => setMontoEfectivo(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" /></div>
                  {!montoTransferencia && <button onClick={() => { setMontoEfectivo(total.toString()); setMontoTransferencia('') }} className="text-[10px] text-emerald-600 hover:underline whitespace-nowrap">Todo</button>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 w-28 flex-shrink-0"><CreditCard size={14} className="text-blue-500" /><span className="text-xs text-gray-600">Transferencia</span></div>
                  <div className="relative flex-1"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <input type="number" placeholder="0" value={montoTransferencia} onChange={e => setMontoTransferencia(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" /></div>
                  {!montoEfectivo && <button onClick={() => { setMontoTransferencia(total.toString()); setMontoEfectivo('') }} className="text-[10px] text-blue-600 hover:underline whitespace-nowrap">Todo</button>}
                </div>
              </div>
              {totalPagado > 0 && ajuste !== 0 && (
                <div className={cn("flex items-center justify-between mt-2 px-2 py-1.5 rounded-lg text-xs", ajuste > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600")}>
                  <span>{ajuste > 0 ? 'Vuelto / Ajuste a favor' : 'Falta cobrar'}</span>
                  <span className="font-semibold">{formatCurrency(Math.abs(ajuste))}</span>
                </div>
              )}
            </div>
            {error && <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs animate-fade-in"><AlertCircle size={14} />{error}</div>}
            <button onClick={procesarVenta} disabled={processing || totalPagado <= 0}
              className={cn("w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2",
                processing || totalPagado <= 0 ? "bg-gray-400 cursor-not-allowed" : "bg-kira-500 hover:bg-kira-600 active:scale-[0.98] shadow-md shadow-kira-500/20")}>
              {processing ? 'Procesando...' : <><CheckCircle2 size={16} /> Cerrar Venta — {formatCurrency(total)}</>}
            </button>
          </div>
        )}

        {ventaExitosa && (
          <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in z-50">
            <CheckCircle2 size={20} /><div><p className="font-semibold text-sm">Venta registrada</p><p className="text-xs text-emerald-100">Stock y caja actualizados</p></div>
          </div>
        )}
      </div>
    </div>
  )
}
