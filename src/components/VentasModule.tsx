'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Articulo, CarritoItem } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  Banknote, CheckCircle2, AlertCircle, X, Package
} from 'lucide-react'

interface Props {
  onVentaCompleta: () => void
}

export default function VentasModule({ onVentaCompleta }: Props) {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Articulo[]>([])
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [processing, setProcessing] = useState(false)
  const [ventaExitosa, setVentaExitosa] = useState(false)
  const [error, setError] = useState('')
  const [showSearch, setShowSearch] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchArticulos()
  }, [])

  async function fetchArticulos() {
    const { data } = await supabase
      .from('articulos')
      .select('*')
      .eq('activo', true)
      .gt('cantidad', 0)
      .order('descripcion')
    if (data) setArticulos(data)
  }

  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase()
      const filtered = articulos.filter(a =>
        a.descripcion.toLowerCase().includes(q) ||
        a.codigo?.toLowerCase().includes(q) ||
        a.proveedor?.toLowerCase().includes(q)
      ).slice(0, 8)
      setResults(filtered)
    } else {
      setResults([])
    }
  }, [search, articulos])

  function addToCart(articulo: Articulo) {
    setCarrito(prev => {
      const existing = prev.find(i => i.articulo.id === articulo.id)
      if (existing) {
        if (existing.cantidad >= articulo.cantidad) {
          setError(`Stock máximo: ${articulo.cantidad} unidades`)
          setTimeout(() => setError(''), 2500)
          return prev
        }
        return prev.map(i =>
          i.articulo.id === articulo.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      }
      return [...prev, { articulo, cantidad: 1 }]
    })
    setSearch('')
    setResults([])
    searchRef.current?.focus()
  }

  function updateQuantity(articuloId: number, delta: number) {
    setCarrito(prev => {
      return prev.map(item => {
        if (item.articulo.id !== articuloId) return item
        const newQty = item.cantidad + delta
        if (newQty <= 0) return item
        if (newQty > item.articulo.cantidad) {
          setError(`Stock máximo: ${item.articulo.cantidad}`)
          setTimeout(() => setError(''), 2500)
          return item
        }
        return { ...item, cantidad: newQty }
      })
    })
  }

  function removeFromCart(articuloId: number) {
    setCarrito(prev => prev.filter(i => i.articulo.id !== articuloId))
  }

  function clearCart() {
    setCarrito([])
    setError('')
  }

  const total = carrito.reduce((s, i) => s + (i.articulo.precio_venta * i.cantidad), 0)
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)

  async function procesarVenta() {
    if (carrito.length === 0) return
    setProcessing(true)
    setError('')

    try {
      // 1. Create venta
      const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .insert([{ total, metodo_pago: metodoPago }])
        .select()
        .single()

      if (ventaError) throw ventaError

      // 2. Create venta_items
      const items = carrito.map(i => ({
        venta_id: venta.id,
        articulo_id: i.articulo.id,
        cantidad: i.cantidad,
        precio_unitario: i.articulo.precio_venta,
        subtotal: i.articulo.precio_venta * i.cantidad,
      }))

      const { error: itemsError } = await supabase
        .from('venta_items')
        .insert(items)

      if (itemsError) throw itemsError

      // 3. Update stock for each item
      for (const item of carrito) {
        const { error: stockError } = await supabase
          .from('articulos')
          .update({ cantidad: item.articulo.cantidad - item.cantidad })
          .eq('id', item.articulo.id)

        if (stockError) throw stockError
      }

      // 4. Update billetera
      const { data: billData } = await supabase
        .from('billetera')
        .select('*')
        .eq('tipo', metodoPago)
        .single()

      if (billData) {
        await supabase
          .from('billetera')
          .update({ saldo: billData.saldo + total })
          .eq('id', billData.id)
      }

      // Success
      setVentaExitosa(true)
      setCarrito([])
      fetchArticulos()
      onVentaCompleta()

      setTimeout(() => setVentaExitosa(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al procesar la venta')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left: Product search */}
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">
              Punto de Venta
            </h2>
            <p className="text-sm text-gray-500 mt-1">Buscá artículos para agregar a la venta</p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar por nombre, código o proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
                focus:outline-none focus:ring-2 focus:ring-kira-400/30 focus:border-kira-400
                placeholder:text-gray-400 shadow-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setResults([]) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
              >
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>

          {/* Search results */}
          {results.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden mb-6 animate-fade-in">
              {results.map((a) => {
                const inCart = carrito.find(i => i.articulo.id === a.id)
                const remainingStock = a.cantidad - (inCart?.cantidad ?? 0)
                return (
                  <button
                    key={a.id}
                    onClick={() => addToCart(a)}
                    disabled={remainingStock <= 0}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0",
                      remainingStock <= 0
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-kira-50/50"
                    )}
                  >
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
                      <p className={cn(
                        "text-[10px]",
                        remainingStock <= 2 ? "text-amber-500" : "text-gray-400"
                      )}>
                        Stock: {remainingStock}
                      </p>
                    </div>
                    <Plus size={16} className="text-gray-300 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}

          {search.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm animate-fade-in">
              <Package size={28} className="mx-auto mb-2 text-gray-300" />
              No se encontraron artículos con stock
            </div>
          )}

          {/* Quick add: recent/popular could go here */}
          {search.length < 2 && carrito.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ShoppingCart size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Escribí al menos 2 caracteres para buscar</p>
              <p className="text-xs mt-1 text-gray-300">Los artículos se agregan al carrito de venta</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-[380px] bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col">
        {/* Cart header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Venta actual
            </h3>
            {totalItems > 0 && (
              <span className="bg-kira-100 text-kira-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          {carrito.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-600 hover:underline"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-auto px-4 py-2">
          {carrito.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-300 text-sm">
              Carrito vacío
            </div>
          ) : (
            <div className="space-y-2">
              {carrito.map((item, idx) => (
                <div
                  key={item.articulo.id}
                  className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg animate-slide-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.articulo.descripcion}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatCurrency(item.articulo.precio_venta)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.articulo.id, -1)}
                      disabled={item.cantidad <= 1}
                      className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center
                        hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-700">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.articulo.id, 1)}
                      disabled={item.cantidad >= item.articulo.cantidad}
                      className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center
                        hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 w-20 text-right">
                    {formatCurrency(item.articulo.precio_venta * item.cantidad)}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.articulo.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer */}
        {carrito.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            {/* Payment method */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMetodoPago('efectivo')}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                    metodoPago === 'efectivo'
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Banknote size={16} />
                  Efectivo
                </button>
                <button
                  onClick={() => setMetodoPago('transferencia')}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                    metodoPago === 'transferencia'
                      ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <CreditCard size={16} />
                  Transferencia
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Total ({totalItems} {totalItems === 1 ? 'artículo' : 'artículos'})</span>
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-bold text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs animate-fade-in">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={procesarVenta}
              disabled={processing}
              className={cn(
                "w-full py-3 rounded-xl text-white font-semibold text-sm transition-all",
                "flex items-center justify-center gap-2",
                processing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-kira-500 hover:bg-kira-600 active:scale-[0.98] shadow-md shadow-kira-500/20"
              )}
            >
              {processing ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Cerrar Venta — {formatCurrency(total)}
                </>
              )}
            </button>
          </div>
        )}

        {/* Success message */}
        {ventaExitosa && (
          <div className="absolute bottom-4 right-4 left-4 lg:left-auto lg:w-[360px]
            bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg
            flex items-center gap-3 animate-slide-in z-50">
            <CheckCircle2 size={20} />
            <div>
              <p className="font-semibold text-sm">¡Venta registrada!</p>
              <p className="text-xs text-emerald-100">Stock y billetera actualizados</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
