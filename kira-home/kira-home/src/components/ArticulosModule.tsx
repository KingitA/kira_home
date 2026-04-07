'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Articulo } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Search, Plus, Pencil, Trash2, X, Check, AlertTriangle,
  ArrowUpDown, Filter, Package, Save, ChevronDown
} from 'lucide-react'

export default function ArticulosModule() {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [proveedorFilter, setProveedorFilter] = useState('')
  const [sortField, setSortField] = useState<keyof Articulo>('descripcion')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<Articulo>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newArticulo, setNewArticulo] = useState({
    proveedor: '', codigo: '', descripcion: '', cantidad: 0,
    costo_unitario: 0, precio_comparativo: 0, precio_venta: 0, nota: ''
  })
  const [proveedores, setProveedores] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const fetchArticulos = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('articulos')
      .select('*')
      .eq('activo', true)
      .order(sortField, { ascending: sortDir === 'asc' })

    if (search) {
      query = query.or(`descripcion.ilike.%${search}%,codigo.ilike.%${search}%,proveedor.ilike.%${search}%`)
    }
    if (proveedorFilter) {
      query = query.eq('proveedor', proveedorFilter)
    }

    const { data } = await query
    if (data) {
      setArticulos(data)
      const provs = [...new Set(data.map(a => a.proveedor))].filter(Boolean).sort()
      setProveedores(provs)
    }
    setLoading(false)
  }, [search, proveedorFilter, sortField, sortDir])

  useEffect(() => {
    fetchArticulos()
    const channel = supabase
      .channel('articulos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articulos' }, () => {
        fetchArticulos()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchArticulos])

  function handleSort(field: keyof Articulo) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function startEdit(a: Articulo) {
    setEditingId(a.id)
    setEditData({ ...a })
  }

  async function saveEdit() {
    if (!editingId || !editData) return
    await supabase.from('articulos').update({
      proveedor: editData.proveedor,
      codigo: editData.codigo,
      descripcion: editData.descripcion,
      cantidad: editData.cantidad,
      costo_unitario: editData.costo_unitario,
      precio_comparativo: editData.precio_comparativo,
      precio_venta: editData.precio_venta,
      nota: editData.nota,
    }).eq('id', editingId)
    setEditingId(null)
    setEditData({})
  }

  async function deleteArticulo(id: number) {
    if (!confirm('¿Seguro que querés eliminar este artículo?')) return
    await supabase.from('articulos').update({ activo: false }).eq('id', id)
  }

  async function addArticulo() {
    if (!newArticulo.descripcion) return
    await supabase.from('articulos').insert([newArticulo])
    setShowAdd(false)
    setNewArticulo({
      proveedor: '', codigo: '', descripcion: '', cantidad: 0,
      costo_unitario: 0, precio_comparativo: 0, precio_venta: 0, nota: ''
    })
  }

  const stockBajo = articulos.filter(a => a.cantidad <= 0).length
  const totalItems = articulos.reduce((s, a) => s + a.cantidad, 0)
  const valorStock = articulos.reduce((s, a) => s + (a.costo_unitario * a.cantidad), 0)

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">
          Artículos
        </h2>
        <p className="text-sm text-gray-500 mt-1">Gestión de inventario y precios</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Productos</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{articulos.length}</p>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Unidades</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{totalItems.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Valor stock</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{formatCurrency(valorStock)}</p>
        </div>
        <div className={cn(
          "rounded-xl px-4 py-3 border",
          stockBajo > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
        )}>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Sin stock</p>
          <div className="flex items-center gap-2 mt-1">
            {stockBajo > 0 && <AlertTriangle size={16} className="text-red-500" />}
            <p className={cn("text-2xl font-semibold", stockBajo > 0 ? "text-red-600" : "text-emerald-600")}>
              {stockBajo}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descripción, código o proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm
              focus:outline-none focus:ring-2 focus:ring-kira-400/30 focus:border-kira-400
              placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-3 py-2.5 rounded-lg border text-sm flex items-center gap-2 transition-colors",
              showFilters || proveedorFilter
                ? "bg-kira-50 border-kira-200 text-kira-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            <Filter size={15} />
            <span className="hidden sm:inline">Filtros</span>
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2.5 rounded-lg bg-kira-500 text-white text-sm font-medium
              hover:bg-kira-600 transition-colors flex items-center gap-2"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-100 animate-fade-in">
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 font-medium">Proveedor:</label>
            <select
              value={proveedorFilter}
              onChange={e => setProveedorFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            >
              <option value="">Todos</option>
              {proveedores.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {proveedorFilter && (
              <button onClick={() => setProveedorFilter('')} className="text-xs text-kira-600 hover:underline">
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-kira-100 animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Nuevo Artículo</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              placeholder="Proveedor"
              value={newArticulo.proveedor}
              onChange={e => setNewArticulo(p => ({ ...p, proveedor: e.target.value }))}
              className="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            />
            <input
              placeholder="Código"
              value={newArticulo.codigo}
              onChange={e => setNewArticulo(p => ({ ...p, codigo: e.target.value }))}
              className="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            />
            <input
              placeholder="Descripción *"
              value={newArticulo.descripcion}
              onChange={e => setNewArticulo(p => ({ ...p, descripcion: e.target.value }))}
              className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            />
            <input
              type="number" placeholder="Cantidad"
              value={newArticulo.cantidad || ''}
              onChange={e => setNewArticulo(p => ({ ...p, cantidad: Number(e.target.value) }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            />
            <input
              type="number" placeholder="Costo unitario"
              value={newArticulo.costo_unitario || ''}
              onChange={e => setNewArticulo(p => ({ ...p, costo_unitario: Number(e.target.value) }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            />
            <input
              type="number" placeholder="Precio comparativo"
              value={newArticulo.precio_comparativo || ''}
              onChange={e => setNewArticulo(p => ({ ...p, precio_comparativo: Number(e.target.value) }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            />
            <input
              type="number" placeholder="Precio de venta"
              value={newArticulo.precio_venta || ''}
              onChange={e => setNewArticulo(p => ({ ...p, precio_venta: Number(e.target.value) }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            />
            <input
              placeholder="Nota"
              value={newArticulo.nota}
              onChange={e => setNewArticulo(p => ({ ...p, nota: e.target.value }))}
              className="col-span-2 lg:col-span-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30"
            />
            <button
              onClick={addArticulo}
              disabled={!newArticulo.descripcion}
              className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium
                hover:bg-kira-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                flex items-center justify-center gap-2"
            >
              <Save size={14} />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {[
                  { key: 'proveedor', label: 'Proveedor' },
                  { key: 'codigo', label: 'Código' },
                  { key: 'descripcion', label: 'Descripción' },
                  { key: 'cantidad', label: 'Stock', align: 'right' },
                  { key: 'costo_unitario', label: 'Costo', align: 'right' },
                  { key: 'precio_venta', label: 'Venta', align: 'right' },
                  { key: 'nota', label: 'Nota' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key as keyof Articulo)}
                    className={cn(
                      "px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap",
                      (col as any).align === 'right' ? 'text-right' : 'text-left'
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortField === col.key && (
                        <ArrowUpDown size={11} className="text-kira-500" />
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Cargando artículos...
                  </td>
                </tr>
              ) : articulos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <Package size={32} className="mx-auto mb-2 text-gray-300" />
                    No se encontraron artículos
                  </td>
                </tr>
              ) : (
                articulos.map((a) => {
                  const isEditing = editingId === a.id
                  const margenPct = a.costo_unitario > 0
                    ? ((a.precio_venta - a.costo_unitario) / a.costo_unitario * 100).toFixed(0)
                    : '—'

                  return (
                    <tr
                      key={a.id}
                      className={cn(
                        "hover:bg-kira-50/30 transition-colors",
                        a.cantidad <= 0 && "bg-red-50/40"
                      )}
                    >
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            value={editData.proveedor ?? ''}
                            onChange={e => setEditData(d => ({ ...d, proveedor: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-kira-400"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">{a.proveedor}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            value={editData.codigo ?? ''}
                            onChange={e => setEditData(d => ({ ...d, codigo: e.target.value }))}
                            className="w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-kira-400"
                          />
                        ) : (
                          <span className="font-mono text-xs text-gray-600">{a.codigo}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[240px]">
                        {isEditing ? (
                          <input
                            value={editData.descripcion ?? ''}
                            onChange={e => setEditData(d => ({ ...d, descripcion: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-kira-400"
                          />
                        ) : (
                          <span className="font-medium text-gray-800 truncate block">{a.descripcion}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.cantidad ?? 0}
                            onChange={e => setEditData(d => ({ ...d, cantidad: Number(e.target.value) }))}
                            className="w-16 px-2 py-1 text-sm border rounded text-right focus:outline-none focus:ring-1 focus:ring-kira-400"
                          />
                        ) : (
                          <span className={cn(
                            "inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md text-xs font-semibold",
                            a.cantidad <= 0 ? "bg-red-100 text-red-700" :
                            a.cantidad <= 2 ? "bg-amber-100 text-amber-700" :
                            "bg-emerald-100 text-emerald-700"
                          )}>
                            {a.cantidad}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.costo_unitario ?? 0}
                            onChange={e => setEditData(d => ({ ...d, costo_unitario: Number(e.target.value) }))}
                            className="w-24 px-2 py-1 text-sm border rounded text-right focus:outline-none focus:ring-1 focus:ring-kira-400"
                          />
                        ) : (
                          <span className="text-gray-600 text-xs">{formatCurrency(a.costo_unitario)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.precio_venta ?? 0}
                            onChange={e => setEditData(d => ({ ...d, precio_venta: Number(e.target.value) }))}
                            className="w-24 px-2 py-1 text-sm border rounded text-right focus:outline-none focus:ring-1 focus:ring-kira-400"
                          />
                        ) : (
                          <div>
                            <span className="font-semibold text-gray-800">{formatCurrency(a.precio_venta)}</span>
                            <span className={cn(
                              "block text-[10px]",
                              Number(margenPct) < 0 ? "text-red-500" :
                              Number(margenPct) < 30 ? "text-amber-500" :
                              "text-emerald-500"
                            )}>
                              {margenPct !== '—' ? `+${margenPct}%` : ''}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[160px]">
                        {isEditing ? (
                          <input
                            value={editData.nota ?? ''}
                            onChange={e => setEditData(d => ({ ...d, nota: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-kira-400"
                          />
                        ) : (
                          <span className="text-xs text-gray-400 truncate block">{a.nota}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={saveEdit} className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600">
                                <Check size={14} />
                              </button>
                              <button onClick={() => { setEditingId(null); setEditData({}) }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(a)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => deleteArticulo(a.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
