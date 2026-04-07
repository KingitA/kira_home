'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Articulo, CarritoItem } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  Banknote, CheckCircle2, AlertCircle, X, Package, ArrowLeft,
  UtensilsCrossed, Sofa, Lamp, Coffee,
  Bath
} from 'lucide-react'

interface Props {
  onVentaCompleta: () => void
}

const CATEGORIAS = [
  {
    id: 'cocina',
    nombre: 'Cocina',
    keywords: ['sarten', 'cacerola', 'olla', 'wok', 'hervidor', 'pava', 'cafetera', 'jarra', 'botella', 'fuente', 'molde', 'tabla', 'rallador', 'escurridor', 'especiero', 'dispenser', 'contenedor', 'portarollo', 'repasador', 'vaso termico', 'yerbero', 'azucarero', 'bateria', 'bifera', 'abrelata', 'aceitero', 'afilador', 'cuchillo', 'tenedor', 'cuchara', 'cucharita', 'espumadera', 'espatula', 'pinza', 'colador', 'hudson', 'tramontina'],
    color: 'from-amber-600/80 to-orange-700/90',
    icon: UtensilsCrossed,
    img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
  },
  {
    id: 'vajilla',
    nombre: 'Vajilla',
    keywords: ['plato', 'bowl', 'taza', 'vaso', 'copa', 'jarro', 'mug', 'vassa', 'set de', 'juego de'],
    color: 'from-sky-600/80 to-blue-700/90',
    icon: Coffee,
    img: 'https://images.unsplash.com/photo-1603199506016-5d54bd2caa0f?w=400&h=300&fit=crop',
  },
  {
    id: 'decoracion',
    nombre: 'Decoración',
    keywords: ['adorno', 'florero', 'jarron', 'maceta', 'planta', 'cuadro', 'espejo', 'reloj', 'vela', 'posavela', 'portarretrato', 'posavaso', 'plato de sitio', 'bandeja', 'cesto', 'organizador', 'canasto', 'lampara'],
    color: 'from-rose-600/80 to-pink-700/90',
    icon: Lamp,
    img: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=400&h=300&fit=crop',
  },
  {
    id: 'textil',
    nombre: 'Textil',
    keywords: ['alfombra', 'almohadon', 'almohada', 'manta', 'mantel', 'camino', 'cortina', 'individual', 'pie de cama', 'felpudo', 'funda', 'matero'],
    color: 'from-violet-600/80 to-purple-700/90',
    icon: Sofa,
    img: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=400&h=300&fit=crop',
  },
  {
    id: 'termos',
    nombre: 'Termos y Mates',
    keywords: ['termo', 'mate ', 'bombilla'],
    color: 'from-emerald-600/80 to-green-700/90',
    icon: Coffee,
    img: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&h=300&fit=crop',
  },
  {
    id: 'baño',
    nombre: 'Baño',
    keywords: ['baño', 'jabonera', 'cesto de basura', 'portacepillo'],
    color: 'from-cyan-600/80 to-teal-700/90',
    icon: Bath,
    img: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400&h=300&fit=crop',
  },
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
    const { data } = await supabase
      .from('articulos').select('*').eq('activo', true).gt('cantidad', 0).order('descripcion')
    if (data) setArticulos(data)
  }

  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase()
      setResults(articulos.filter(a =>
        a.descripcion.toLowerCase().includes(q) ||
        a.codigo?.toLowerCase().includes(q) ||
        a.proveedor?.toLowerCase().includes(q)
      ).slice(0, 15))
    } else if (categoriaActiva && categoriaActiva !== 'todos') {
      const cat = CATEGORIAS.find(c => c.id === categoriaActiva)
      if (cat) {
        setResults(articulos.filter(a => {
          const desc = a.descripcion.toLowerCase()
          const nota = (a.nota || '').toLowerCase()
          return cat.keywords.some(k => desc.includes(k) || nota.includes(k))
        }))
      }
    } else if (categoriaActiva === 'todos') {
      setResults(articulos)
    } else {
      setResults([])
    }
  }, [search, articulos, categoriaActiva])

  function addToCart(articulo: Articulo) {
    setCarrito(prev => {
      const existing = prev.find(i => i.articulo.id === articulo.id)
      if (existing) {
        if (existing.cantidad >= articulo.cantidad) {
          setError(`Stock máximo: ${articulo.cantidad} unidades`)
          setTimeout(() => setError(''), 2500)
          return prev
        }
        return prev.map(i => i.articulo.id === articulo.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { articulo, cantidad: 1 }]
    })
    setSearch('')
    if (!categoriaActiva) setResults([])
  }

  function updateQuantity(articuloId: number, delta: number) {
    setCarrito(prev => prev.map(item => {
      if (item.articulo.id !== articuloId) return item
      const newQty = item.cantidad + delta
      if (newQty <= 0 || newQty > item.articulo.cantidad) return item
      return { ...item, cantidad: newQty }
    }))
  }

  function removeFromCart(articuloId: number) {
    setCarrito(prev => prev.filter(i => i.articulo.id !== articuloId))
  }

  function clearCart() {
    setCarrito([])
    setMontoEfectivo('')
    setMontoTransferencia('')
    setError('')
  }

  const total = carrito.reduce((s, i) => s + (i.articulo.precio_venta * i.cantidad), 0)
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)
  const pagoEfectivo = parseFloat(montoEfectivo) || 0
  const pagoTransferencia = parseFloat(montoTransferencia) || 0
  const totalPagado = pagoEfectivo + pagoTransferencia
  const ajuste = totalPagado - total

  async function procesarVenta() {
    if (carrito.length === 0 || totalPagado <= 0) {
      setError('Ingresá el monto de pago')
      return
    }
    setProcessing(true)
    setError('')

    try {
      let metodoPago: 'efectivo' | 'transferencia' = 'efectivo'
      if (pagoEfectivo > 0 && pagoTransferencia > 0) {
        metodoPago = pagoEfectivo >= pagoTransferencia ? 'efectivo' : 'transferencia'
      } else if (pagoTransferencia > 0) {
        metodoPago = 'transferencia'
      }

      const notaParts: string[] = []
      if (pagoEfectivo > 0 && pagoTransferencia > 0) {
        notaParts.push(`Pago mixto: Efectivo ${formatCurrency(pagoEfectivo)} + Transferencia ${formatCurrency(pagoTransferencia)}`)
      }
      if (ajuste !== 0) {
        notaParts.push(`Ajuste: ${formatCurrency(ajuste)}`)
      }

      const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .insert([{ total, metodo_pago: metodoPago, nota: notaParts.length > 0 ? notaParts.join(' | ') : null }])
        .select().single()
      if (ventaError) throw ventaError

      const items = carrito.map(i => ({
        venta_id: venta.id, articulo_id: i.articulo.id, cantidad: i.cantidad,
        precio_unitario: i.articulo.precio_venta, subtotal: i.articulo.precio_venta * i.cantidad,
      }))
      const { error: itemsError } = await supabase.from('venta_items').insert(items)
      if (itemsError) throw itemsError

      for (const item of carrito) {
        await supabase.from('articulos')
          .update({ cantidad: item.articulo.cantidad - item.cantidad })
          .eq('id', item.articulo.id)
      }

      if (pagoEfectivo > 0) {
        const { data: b } = await supabase.from('billetera').select('*').eq('tipo', 'efectivo').single()
        if (b) await supabase.from('billetera').update({ saldo: b.saldo + pagoEfectivo }).eq('id', b.id)
      }
      if (pagoTransferencia > 0) {
        const { data: b } = await supabase.from('billetera').select('*').eq('tipo', 'transferencia').single()
        if (b) await supabase.from('billetera').update({ saldo: b.saldo + pagoTransferencia }).eq('id', b.id)
      }

      setVentaExitosa(true)
      setCarrito([])
      setMontoEfectivo('')
      setMontoTransferencia('')
      fetchArticulos()
      onVentaCompleta()
      setTimeout(() => setVentaExitosa(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al procesar la venta')
    } finally {
      setProcessing(false)
    }
  }

  const countByCategory = (cat: typeof CATEGORIAS[0]) => {
    return articulos.filter(a => {
      const desc = a.descripcion.toLowerCase()
      const nota = (a.nota || '').toLowerCase()
      return cat.keywords.some(k => desc.includes(k) || nota.includes(k))
    }).length
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-botanical">
      {/* Left: Product search & categories */}
      <div className="flex-1 p-4 lg:p-6 overflow-auto relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-5">
            <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">
              Punto de Venta
            </h2>
            <p className="text-sm text-gray-500 mt-1">Seleccioná una categoría o buscá artículos</p>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar por nombre, código o proveedor..."
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value.length >= 2) setCategoriaActiva(null) }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
                focus:outline-none focus:ring-2 focus:ring-kira-400/30 focus:border-kira-400
                placeholder:text-gray-400 shadow-sm"
            />
            {search && (
              <button onClick={() => { setSearch(''); setResults([]); setCategoriaActiva(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>

          {/* Back button */}
          {categoriaActiva && !search && (
            <button onClick={() => { setCategoriaActiva(null); setResults([]) }}
              className="flex items-center gap-2 text-sm text-kira-600 hover:text-kira-700 mb-4 animate-fade-in">
              <ArrowLeft size={14} /> Volver a categorías
            </button>
          )}

          {/* Categories grid */}
          {!categoriaActiva && search.length < 2 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6 animate-fade-in">
              {CATEGORIAS.map((cat) => (
                <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)}
                  className="group relative overflow-hidden rounded-xl h-32 lg:h-36 text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">
                  <img src={cat.img} alt={cat.nombre}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${cat.color}`} />
                  <div className="absolute inset-0 flex flex-col justify-end p-3">
                    <cat.icon size={20} className="text-white/80 mb-1" />
                    <h3 className="text-white font-semibold text-sm lg:text-base">{cat.nombre}</h3>
                    <p className="text-white/60 text-[10px]">{countByCategory(cat)} productos</p>
                  </div>
                </button>
              ))}
              <button onClick={() => setCategoriaActiva('todos')}
                className="group relative overflow-hidden rounded-xl h-32 lg:h-36 text-left transition-all hover:scale-[1.02] hover:shadow-lg bg-[#1c1917]">
                <div className="absolute inset-0 flex flex-col justify-end p-3">
                  <Package size={20} className="text-white/80 mb-1" />
                  <h3 className="text-white font-semibold text-sm lg:text-base">Todos</h3>
                  <p className="text-white/60 text-[10px]">{articulos.length} productos</p>
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
                  const remaining = a.cantidad - (inCart?.cantidad ?? 0)
                  return (
                    <button key={a.id} onClick={() => addToCart(a)} disabled={remaining <= 0}
                      className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                        remaining <= 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-kira-50/50")}>
                      <div className="w-8 h-8 rounded-lg bg-kira-100 flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-kira-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.descripcion}</p>
                        <p className="text-xs text-gray-400">
                          {a.codigo && `${a.codigo} · `}{a.proveedor}
                          {inCart && <span className="text-kira-500 ml-1">· {inCart.cantidad} en carrito</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-800">{formatCurrency(a.precio_venta)}</p>
                        <p className={cn("text-[10px]", remaining <= 2 ? "text-amber-500" : "text-gray-400")}>
                          Stock: {remaining}
                        </p>
                      </div>
                      <Plus size={16} className="text-gray-300 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {search.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm animate-fade-in">
              <Package size={28} className="mx-auto mb-2 text-gray-300" />
              No se encontraron artículos con stock
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col relative z-10">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Venta actual</h3>
            {totalItems > 0 && (
              <span className="bg-kira-100 text-kira-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{totalItems}</span>
            )}
          </div>
          {carrito.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 hover:underline">Vaciar</button>
          )}
        </div>

        <div className="flex-1 overflow-auto px-4 py-2">
          {carrito.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-300 text-sm">Carrito vacío</div>
          ) : (
            <div className="space-y-2">
              {carrito.map((item, idx) => (
                <div key={item.articulo.id}
                  className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg animate-slide-in"
                  style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.articulo.descripcion}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.articulo.precio_venta)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(item.articulo.id, -1)} disabled={item.cantidad <= 1}
                      className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-700">{item.cantidad}</span>
                    <button onClick={() => updateQuantity(item.articulo.id, 1)} disabled={item.cantidad >= item.articulo.cantidad}
                      className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 w-20 text-right">
                    {formatCurrency(item.articulo.precio_venta * item.cantidad)}
                  </p>
                  <button onClick={() => removeFromCart(item.articulo.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {carrito.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total ({totalItems} art.)</span>
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-bold text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Split payment */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Forma de pago</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                    <Banknote size={14} className="text-emerald-500" />
                    <span className="text-xs text-gray-600">Efectivo</span>
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <input type="number" placeholder="0" value={montoEfectivo}
                      onChange={e => setMontoEfectivo(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-right
                        focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" />
                  </div>
                  {!montoTransferencia && (
                    <button onClick={() => { setMontoEfectivo(total.toString()); setMontoTransferencia('') }}
                      className="text-[10px] text-emerald-600 hover:underline whitespace-nowrap">Todo</button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                    <CreditCard size={14} className="text-blue-500" />
                    <span className="text-xs text-gray-600">Transferencia</span>
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <input type="number" placeholder="0" value={montoTransferencia}
                      onChange={e => setMontoTransferencia(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-right
                        focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                  </div>
                  {!montoEfectivo && (
                    <button onClick={() => { setMontoTransferencia(total.toString()); setMontoEfectivo('') }}
                      className="text-[10px] text-blue-600 hover:underline whitespace-nowrap">Todo</button>
                  )}
                </div>
              </div>

              {totalPagado > 0 && ajuste !== 0 && (
                <div className={cn("flex items-center justify-between mt-2 px-2 py-1.5 rounded-lg text-xs",
                  ajuste > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600")}>
                  <span>{ajuste > 0 ? 'Vuelto / Ajuste a favor' : 'Falta cobrar'}</span>
                  <span className="font-semibold">{formatCurrency(Math.abs(ajuste))}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs animate-fade-in">
                <AlertCircle size={14} />{error}
              </div>
            )}

            <button onClick={procesarVenta} disabled={processing || totalPagado <= 0}
              className={cn("w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2",
                processing || totalPagado <= 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-kira-500 hover:bg-kira-600 active:scale-[0.98] shadow-md shadow-kira-500/20")}>
              {processing ? 'Procesando...' : (<><CheckCircle2 size={16} /> Cerrar Venta — {formatCurrency(total)}</>)}
            </button>
          </div>
        )}

        {ventaExitosa && (
          <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in z-50">
            <CheckCircle2 size={20} />
            <div>
              <p className="font-semibold text-sm">Venta registrada</p>
              <p className="text-xs text-emerald-100">Stock y caja actualizados</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
