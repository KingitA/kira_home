'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Articulo } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Search, Plus, Pencil, Trash2, X, Check, AlertTriangle,
  ArrowUpDown, Filter, Package, Save, Upload, FileSpreadsheet,
  ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Download
} from 'lucide-react'
import * as XLSX from 'xlsx'

// DB fields that can be mapped
const DB_FIELDS = [
  { key: 'codigo', label: 'Código', type: 'text' },
  { key: 'descripcion', label: 'Descripción', type: 'text' },
  { key: 'proveedor', label: 'Proveedor', type: 'text' },
  { key: 'cantidad', label: 'Stock / Cantidad', type: 'number' },
  { key: 'costo_unitario', label: 'Costo unitario', type: 'number' },
  { key: 'precio_comparativo', label: 'Precio comparativo', type: 'number' },
  { key: 'precio_venta', label: 'Precio de venta', type: 'number' },
  { key: 'nota', label: 'Nota', type: 'text' },
] as const

type DbField = typeof DB_FIELDS[number]['key']

// Auto-detect column mapping based on common names
function autoDetect(col: string): DbField | '' {
  const c = col.toLowerCase().trim()
  if (/^(sku|cod|codigo|código|code|art)/.test(c)) return 'codigo'
  if (/^(desc|descripcion|descripción|nombre|product|articulo)/.test(c)) return 'descripcion'
  if (/^(prov|proveedor|supplier|marca)/.test(c)) return 'proveedor'
  if (/^(stock|cant|cantidad|qty|quantity|unidades)/.test(c)) return 'cantidad'
  if (/^(costo|cost|precio.?costo|costo.?unit|precio.?compra|compra)/.test(c)) return 'costo_unitario'
  if (/^(comp|comparativo|precio.?comp|referencia)/.test(c)) return 'precio_comparativo'
  if (/^(venta|precio.?venta|precio|price|pvp|\$\s*venta)/.test(c)) return 'precio_venta'
  if (/^(nota|obs|observ|comment|detalle)/.test(c)) return 'nota'
  return ''
}

type ImportStep = 'idle' | 'mapping' | 'preview' | 'importing' | 'done'

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
  const [newArticulo, setNewArticulo] = useState({ proveedor: '', codigo: '', descripcion: '', cantidad: 0, costo_unitario: 0, precio_comparativo: 0, precio_venta: 0, nota: '' })
  const [proveedores, setProveedores] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Import state
  const [importStep, setImportStep] = useState<ImportStep>('idle')
  const [excelCols, setExcelCols] = useState<string[]>([])
  const [excelData, setExcelData] = useState<Record<string, any>[]>([])
  const [mapping, setMapping] = useState<Record<string, DbField | ''>>({})
  const [matchKey, setMatchKey] = useState<DbField>('codigo')
  const [importMode, setImportMode] = useState<'update' | 'upsert'>('update')
  const [importResult, setImportResult] = useState({ updated: 0, created: 0, skipped: 0, errors: 0 })
  const [importLog, setImportLog] = useState<{ codigo: string; estado: 'actualizado' | 'creado' | 'omitido' | 'error'; detalle: string; row: Record<string, any> }[]>([])
  const [importLogFilter, setImportLogFilter] = useState<'todos' | 'actualizado' | 'creado' | 'omitido' | 'error'>('todos')
  const [showHistory, setShowHistory] = useState(false)
  const [importHistory, setImportHistory] = useState<{ id: number; archivo: string; fecha: string; total_filas: number; actualizados: number; creados: number; omitidos: number; errores: number; log: any[] }[]>([])
  const [historyDetail, setHistoryDetail] = useState<number | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchArticulos = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('articulos').select('*').eq('activo', true).order(sortField, { ascending: sortDir === 'asc' })
    if (search) query = query.or(`descripcion.ilike.%${search}%,codigo.ilike.%${search}%,proveedor.ilike.%${search}%`)
    if (proveedorFilter) query = query.eq('proveedor', proveedorFilter)
    const { data } = await query
    if (data) { setArticulos(data); setProveedores(Array.from(new Set(data.map(a => a.proveedor))).filter(Boolean).sort() as string[]) }
    setLoading(false)
  }, [search, proveedorFilter, sortField, sortDir])

  useEffect(() => {
    fetchArticulos()
    const ch = supabase.channel('art-ch').on('postgres_changes', { event: '*', schema: 'public', table: 'articulos' }, () => fetchArticulos()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchArticulos])

  function handleSort(f: keyof Articulo) { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc') } }
  function startEdit(a: Articulo) { setEditingId(a.id); setEditData({ ...a }) }
  async function saveEdit() { if (!editingId) return; await supabase.from('articulos').update({ proveedor: editData.proveedor, codigo: editData.codigo, descripcion: editData.descripcion, cantidad: editData.cantidad, costo_unitario: editData.costo_unitario, precio_comparativo: editData.precio_comparativo, precio_venta: editData.precio_venta, nota: editData.nota }).eq('id', editingId); setEditingId(null); setEditData({}) }
  async function deleteArticulo(id: number) { if (!confirm('¿Eliminar artículo?')) return; await supabase.from('articulos').update({ activo: false }).eq('id', id) }
  async function addArticulo() { if (!newArticulo.descripcion) return; await supabase.from('articulos').insert([newArticulo]); setShowAdd(false); setNewArticulo({ proveedor: '', codigo: '', descripcion: '', cantidad: 0, costo_unitario: 0, precio_comparativo: 0, precio_venta: 0, nota: '' }) }

  // ========== IMPORT LOGIC ==========

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })
      if (json.length === 0) return
      const cols = Object.keys(json[0])
      setExcelCols(cols)
      setExcelData(json)
      // Auto-detect mappings
      const auto: Record<string, DbField | ''> = {}
      cols.forEach(c => { auto[c] = autoDetect(c) })
      setMapping(auto)
      setImportStep('mapping')
    }
    reader.readAsArrayBuffer(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  function cancelImport() {
    setImportStep('idle'); setExcelCols([]); setExcelData([]); setMapping({}); setFileName(''); setImportLog([])
  }

  async function fetchHistory() {
    const { data } = await supabase.from('importaciones').select('*').order('fecha', { ascending: false }).limit(20)
    if (data) setImportHistory(data)
  }

  // Normalize a value for comparison: trim, lowercase, remove extra spaces
  function norm(v: any): string {
    return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC')
  }

  // Preview: build what will be updated
  function getPreviewData() {
    const matchCol = Object.entries(mapping).find(([_, v]) => v === matchKey)?.[0]
    if (!matchCol) return []
    return excelData.slice(0, 20).map(row => {
      const matchVal = String(row[matchCol] ?? '').trim()
      const existing = articulos.find(a => norm((a as any)[matchKey]) === norm(matchVal))
      const changes: Record<string, { from: any; to: any }> = {}
      Object.entries(mapping).forEach(([exCol, dbField]) => {
        if (!dbField || dbField === matchKey) return
        const newVal = row[exCol]
        if (existing) {
          const oldVal = (existing as any)[dbField]
          const nv = typeof oldVal === 'number' ? (parseFloat(newVal) || 0) : String(newVal ?? '')
          if (String(nv) !== String(oldVal ?? '')) changes[dbField] = { from: oldVal, to: nv }
        }
      })
      return { matchVal, found: !!existing, existingId: existing?.id, changes, rowData: row }
    })
  }

  async function executeImport() {
    setImportStep('importing')
    const matchCol = Object.entries(mapping).find(([_, v]) => v === matchKey)?.[0]
    if (!matchCol) return
    let updated = 0, created = 0, skipped = 0, errors = 0
    const log: typeof importLog = []

    for (const row of excelData) {
      const matchVal = String(row[matchCol] ?? '').trim()
      if (!matchVal) { skipped++; log.push({ codigo: '(vacío)', estado: 'omitido', detalle: 'Código vacío', row }); continue }

      const existing = articulos.find(a => norm((a as any)[matchKey]) === norm(matchVal))

      const updateObj: Record<string, any> = {}
      const cambios: string[] = []
      Object.entries(mapping).forEach(([exCol, dbField]) => {
        if (!dbField || dbField === matchKey) return
        const val = row[exCol]
        const fieldDef = DB_FIELDS.find(f => f.key === dbField)
        const newVal = fieldDef?.type === 'number' ? (parseFloat(val) || 0) : String(val ?? '')
        updateObj[dbField] = newVal
        if (existing) {
          const oldVal = (existing as any)[dbField]
          if (String(newVal) !== String(oldVal ?? '')) cambios.push(`${fieldDef?.label}: ${oldVal} → ${newVal}`)
        }
      })

      if (Object.keys(updateObj).length === 0) { skipped++; log.push({ codigo: matchVal, estado: 'omitido', detalle: 'Sin campos mapeados', row }); continue }

      if (existing) {
        if (cambios.length === 0) { skipped++; log.push({ codigo: matchVal, estado: 'omitido', detalle: 'Sin cambios', row }); continue }
        const { error } = await supabase.from('articulos').update(updateObj).eq('id', existing.id)
        if (error) { errors++; log.push({ codigo: matchVal, estado: 'error', detalle: error.message, row }) }
        else { updated++; log.push({ codigo: matchVal, estado: 'actualizado', detalle: cambios.join(' | '), row }) }
      } else if (importMode === 'upsert') {
        updateObj[matchKey] = matchVal
        if (!updateObj.descripcion) updateObj.descripcion = matchVal
        const { error } = await supabase.from('articulos').insert([updateObj])
        if (error) { errors++; log.push({ codigo: matchVal, estado: 'error', detalle: error.message, row }) }
        else { created++; log.push({ codigo: matchVal, estado: 'creado', detalle: 'Artículo nuevo', row }) }
      } else {
        skipped++; log.push({ codigo: matchVal, estado: 'omitido', detalle: 'No encontrado en DB', row })
      }
    }

    setImportLog(log)
    setImportResult({ updated, created, skipped, errors })
    setImportStep('done')
    fetchArticulos()
    // Save to history
    await supabase.from('importaciones').insert([{
      archivo: fileName, total_filas: excelData.length,
      actualizados: updated, creados: created, omitidos: skipped, errores: errors,
      log: log.map(l => ({ codigo: l.codigo, estado: l.estado, detalle: l.detalle }))
    }])
  }

  const stockBajo = articulos.filter(a => a.cantidad <= 0).length
  const totalItems = articulos.reduce((s, a) => s + a.cantidad, 0)
  const valorStock = articulos.reduce((s, a) => s + (a.costo_unitario * a.cantidad), 0)

  const mappedFields = Object.values(mapping).filter(Boolean)
  const hasMatchKey = mappedFields.includes(matchKey)
  const preview = importStep === 'preview' ? getPreviewData() : []

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto bg-botanical min-h-full">
      <div className="relative z-10">
        <div className="mb-6">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">Artículos</h2>
          <p className="text-sm text-gray-500 mt-1">Gestión de inventario y precios</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><p className="text-xs text-gray-400 uppercase tracking-wider">Productos</p><p className="text-2xl font-semibold text-gray-900 mt-1">{articulos.length}</p></div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><p className="text-xs text-gray-400 uppercase tracking-wider">Unidades</p><p className="text-2xl font-semibold text-gray-900 mt-1">{totalItems.toLocaleString('es-AR')}</p></div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><p className="text-xs text-gray-400 uppercase tracking-wider">Valor stock (costo)</p><p className="text-xl font-semibold text-gray-900 mt-1">{formatCurrency(valorStock)}</p></div>
          <div className={cn("rounded-xl px-4 py-3 border", stockBajo > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100")}><p className="text-xs text-gray-400 uppercase tracking-wider">Sin stock</p><div className="flex items-center gap-2 mt-1">{stockBajo > 0 && <AlertTriangle size={16} className="text-red-500" />}<p className={cn("text-2xl font-semibold", stockBajo > 0 ? "text-red-600" : "text-emerald-600")}>{stockBajo}</p></div></div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por descripción, código o proveedor..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-kira-400/30 placeholder:text-gray-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("px-3 py-2.5 rounded-lg border text-sm flex items-center gap-2 transition-colors", showFilters || proveedorFilter ? "bg-kira-50 border-kira-200 text-kira-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50")}>
              <Filter size={15} /><span className="hidden sm:inline">Filtros</span>
            </button>
            <label className="px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 cursor-pointer">
              <Upload size={15} /><span className="hidden sm:inline">Importar</span>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
            <button onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory() }}
              className={cn("px-3 py-2.5 rounded-lg border text-sm flex items-center gap-2 transition-colors",
                showHistory ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50")}>
              <FileSpreadsheet size={15} /><span className="hidden sm:inline">Historial</span>
            </button>
            <button onClick={() => setShowAdd(!showAdd)}
              className="px-4 py-2.5 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 transition-colors flex items-center gap-2">
              <Plus size={15} /><span className="hidden sm:inline">Agregar</span>
            </button>
          </div>
        </div>

        {/* ========== IMPORT PANEL ========== */}
        {importStep !== 'idle' && (
          <div className="mb-4 bg-white rounded-xl border border-blue-100 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Importar desde Excel</span>
                <span className="text-xs text-blue-500">{fileName}</span>
                <span className="text-xs text-blue-400">· {excelData.length} filas</span>
              </div>
              <button onClick={cancelImport} className="p-1 rounded hover:bg-blue-100"><X size={14} className="text-blue-400" /></button>
            </div>

            {/* Step: Mapping */}
            {importStep === 'mapping' && (
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-700 mb-1">Columnas detectadas en tu Excel. Asigná cada una al campo correspondiente de la base de datos:</p>
                  <p className="text-xs text-gray-400">Las sugerencias automáticas están preseleccionadas. Verificá y ajustá si es necesario.</p>
                </div>

                <div className="space-y-2">
                  {excelCols.map(col => (
                    <div key={col} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="w-48 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-700">{col}</span>
                        <span className="text-[10px] text-gray-400 block truncate">ej: {String(excelData[0]?.[col] ?? '—').slice(0, 30)}</span>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                      <select value={mapping[col] || ''} onChange={e => setMapping(m => ({ ...m, [col]: e.target.value as DbField | '' }))}
                        className={cn("flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30",
                          mapping[col] ? "border-blue-200 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-500")}>
                        <option value="">— No importar —</option>
                        {DB_FIELDS.map(f => (
                          <option key={f.key} value={f.key} disabled={mappedFields.includes(f.key) && mapping[col] !== f.key}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Columna clave (para buscar el artículo):</span>
                    <select value={matchKey} onChange={e => setMatchKey(e.target.value as DbField)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg">
                      <option value="codigo">Código</option>
                      <option value="descripcion">Descripción</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Si no existe:</span>
                    <select value={importMode} onChange={e => setImportMode(e.target.value as any)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg">
                      <option value="update">Solo actualizar existentes</option>
                      <option value="upsert">Crear artículo nuevo</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={cancelImport} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button onClick={() => setImportStep('preview')} disabled={!hasMatchKey || mappedFields.length < 2}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 flex items-center gap-2">
                    Vista previa <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Preview */}
            {importStep === 'preview' && (
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-700">Vista previa de cambios (primeras 20 filas):</p>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Estado</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{matchKey === 'codigo' ? 'Código' : 'Descripción'}</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Cambios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {preview.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">
                            {row.found ? (
                              Object.keys(row.changes).length > 0
                                ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Actualizar</span>
                                : <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">Sin cambios</span>
                            ) : importMode === 'upsert'
                              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">Crear nuevo</span>
                              : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">No encontrado</span>
                            }
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-700">{row.matchVal}</td>
                          <td className="px-3 py-2">
                            {Object.keys(row.changes).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(row.changes).map(([field, { from, to }]) => (
                                  <span key={field} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                    <span className="font-medium">{DB_FIELDS.find(f => f.key === field)?.label}</span>:
                                    <span className="text-red-400 line-through">{typeof from === 'number' ? from.toLocaleString('es-AR') : String(from ?? '').slice(0, 20)}</span>
                                    <span>→</span>
                                    <span className="text-emerald-600 font-semibold">{typeof to === 'number' ? to.toLocaleString('es-AR') : String(to ?? '').slice(0, 20)}</span>
                                  </span>
                                ))}
                              </div>
                            ) : row.found ? <span className="text-gray-300">—</span> : (
                              importMode === 'upsert' && <span className="text-emerald-500 text-[10px]">Se creará con los datos del Excel</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                  Total: {excelData.length} filas · 
                  {preview.filter(r => r.found && Object.keys(r.changes).length > 0).length} actualizaciones · 
                  {importMode === 'upsert' ? `${preview.filter(r => !r.found).length} nuevos · ` : ''}
                  {preview.filter(r => r.found && Object.keys(r.changes).length === 0).length} sin cambios
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setImportStep('mapping')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">← Volver al mapeo</button>
                  <button onClick={executeImport}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 flex items-center gap-2">
                    <Upload size={14} /> Ejecutar importación ({excelData.length} filas)
                  </button>
                </div>
              </div>
            )}

            {/* Step: Importing */}
            {importStep === 'importing' && (
              <div className="p-8 text-center">
                <RefreshCw size={24} className="mx-auto mb-3 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">Importando {excelData.length} filas...</p>
                <p className="text-xs text-gray-400 mt-1">No cierres esta ventana</p>
              </div>
            )}

            {/* Step: Done */}
            {importStep === 'done' && (() => {
              const [logFilter, setLogFilter] = [importLogFilter, setImportLogFilter]
              const filtered = logFilter === 'todos' ? importLog : importLog.filter(l => l.estado === logFilter)

              function exportLog(items: typeof importLog, name: string) {
                const ws = XLSX.utils.json_to_sheet(items.map(l => ({ Código: l.codigo, Estado: l.estado, Detalle: l.detalle, ...l.row })))
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Resultado')
                XLSX.writeFile(wb, `importacion_${name}_${new Date().toISOString().slice(0, 10)}.xlsx`)
              }

              return (
                <div className="p-4 space-y-4">
                  <div className="text-center">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-semibold text-gray-700">Importación completada</p>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <button onClick={() => setImportLogFilter('actualizado')} className={cn("rounded-lg px-3 py-2 text-left border transition-colors", logFilter === 'actualizado' ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100 hover:bg-gray-50")}>
                      <p className="text-[10px] text-gray-400 uppercase">Actualizados</p>
                      <p className="text-lg font-semibold text-blue-600">{importResult.updated}</p>
                    </button>
                    <button onClick={() => setImportLogFilter('creado')} className={cn("rounded-lg px-3 py-2 text-left border transition-colors", logFilter === 'creado' ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100 hover:bg-gray-50")}>
                      <p className="text-[10px] text-gray-400 uppercase">Creados</p>
                      <p className="text-lg font-semibold text-emerald-600">{importResult.created}</p>
                    </button>
                    <button onClick={() => setImportLogFilter('omitido')} className={cn("rounded-lg px-3 py-2 text-left border transition-colors", logFilter === 'omitido' ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100 hover:bg-gray-50")}>
                      <p className="text-[10px] text-gray-400 uppercase">Omitidos</p>
                      <p className="text-lg font-semibold text-amber-600">{importResult.skipped}</p>
                    </button>
                    <button onClick={() => setImportLogFilter('error')} className={cn("rounded-lg px-3 py-2 text-left border transition-colors", logFilter === 'error' ? "bg-red-50 border-red-200" : "bg-white border-gray-100 hover:bg-gray-50")}>
                      <p className="text-[10px] text-gray-400 uppercase">Errores</p>
                      <p className="text-lg font-semibold text-red-600">{importResult.errors}</p>
                    </button>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setImportLogFilter('todos')} className={cn("px-2 py-1 rounded text-[10px] font-medium", logFilter === 'todos' ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>Todos ({importLog.length})</button>
                    <div className="flex-1" />
                    <button onClick={() => exportLog(filtered, logFilter)} className="px-3 py-1.5 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"><Download size={10} /> Exportar {logFilter !== 'todos' ? logFilter + 's' : 'todo'}</button>
                    {logFilter !== 'todos' && <button onClick={() => exportLog(importLog.filter(l => l.estado === 'omitido' || l.estado === 'error'), 'no_importados')} className="px-3 py-1.5 text-[10px] bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center gap-1"><Download size={10} /> Exportar no importados</button>}
                  </div>

                  {/* Log table */}
                  <div className="overflow-x-auto rounded-lg border border-gray-100 max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-500 font-medium">Estado</th>
                          <th className="px-3 py-2 text-left text-gray-500 font-medium">Código</th>
                          <th className="px-3 py-2 text-left text-gray-500 font-medium">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtered.map((l, i) => (
                          <tr key={i} className={cn(l.estado === 'error' && "bg-red-50/50", l.estado === 'omitido' && "bg-amber-50/30")}>
                            <td className="px-3 py-2">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                                l.estado === 'actualizado' ? "bg-blue-50 text-blue-600" :
                                l.estado === 'creado' ? "bg-emerald-50 text-emerald-600" :
                                l.estado === 'error' ? "bg-red-50 text-red-600" :
                                "bg-amber-50 text-amber-600"
                              )}>{l.estado}</span>
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-700">{l.codigo}</td>
                            <td className="px-3 py-2 text-gray-500 max-w-[400px] truncate">{l.detalle}</td>
                          </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Sin resultados en esta categoría</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <button onClick={cancelImport} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">Cerrar</button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ========== IMPORT HISTORY ========== */}
        {showHistory && importStep === 'idle' && (
          <div className="mb-4 bg-white rounded-xl border border-blue-100 overflow-hidden animate-fade-in">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2"><FileSpreadsheet size={16} className="text-blue-600" /><span className="text-sm font-semibold text-blue-800">Historial de importaciones</span></div>
              <button onClick={() => { setShowHistory(false); setHistoryDetail(null) }} className="p-1 rounded hover:bg-blue-100"><X size={14} className="text-blue-400" /></button>
            </div>
            {historyDetail !== null ? (() => {
              const imp = importHistory.find(h => h.id === historyDetail)
              if (!imp) return null
              const logItems = (imp.log || []) as { codigo: string; estado: string; detalle: string }[]

              function exportHistoryLog(items: typeof logItems, name: string) {
                if (!imp) return
                const ws = XLSX.utils.json_to_sheet(items.map(l => ({ Código: l.codigo, Estado: l.estado, Detalle: l.detalle })))
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Log')
                XLSX.writeFile(wb, `importacion_${imp.archivo}_${name}.xlsx`)
              }

              return (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setHistoryDetail(null)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ArrowRight size={10} className="rotate-180" /> Volver</button>
                    <div className="flex gap-2">
                      <button onClick={() => exportHistoryLog(logItems, 'todo')} className="px-3 py-1.5 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"><Download size={10} /> Exportar todo</button>
                      <button onClick={() => exportHistoryLog(logItems.filter(l => l.estado === 'omitido' || l.estado === 'error'), 'no_importados')} className="px-3 py-1.5 text-[10px] bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center gap-1"><Download size={10} /> No importados</button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{imp.archivo}</span> · {new Date(imp.fecha).toLocaleString('es-AR')} · {imp.total_filas} filas ·
                    <span className="text-blue-600 ml-1">{imp.actualizados} act.</span> ·
                    <span className="text-emerald-600 ml-1">{imp.creados} creados</span> ·
                    <span className="text-amber-600 ml-1">{imp.omitidos} omit.</span> ·
                    <span className="text-red-600 ml-1">{imp.errores} err.</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-100 max-h-[35vh] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-50"><tr><th className="px-3 py-2 text-left text-gray-500">Estado</th><th className="px-3 py-2 text-left text-gray-500">Código</th><th className="px-3 py-2 text-left text-gray-500">Detalle</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {logItems.map((l, i) => (
                          <tr key={i} className={cn(l.estado === 'error' && "bg-red-50/50", l.estado === 'omitido' && "bg-amber-50/30")}>
                            <td className="px-3 py-1.5"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", l.estado === 'actualizado' ? "bg-blue-50 text-blue-600" : l.estado === 'creado' ? "bg-emerald-50 text-emerald-600" : l.estado === 'error' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>{l.estado}</span></td>
                            <td className="px-3 py-1.5 font-mono text-gray-700">{l.codigo}</td>
                            <td className="px-3 py-1.5 text-gray-500 max-w-[350px] truncate">{l.detalle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })() : (
              <div className="divide-y divide-gray-50">
                {importHistory.length === 0 ? <div className="px-4 py-8 text-center text-gray-400 text-sm">Sin importaciones previas</div> :
                importHistory.map(h => (
                  <button key={h.id} onClick={() => setHistoryDetail(h.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                    <FileSpreadsheet size={14} className="text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{h.archivo}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(h.fecha).toLocaleString('es-AR')} · {h.total_filas} filas ·
                        <span className="text-blue-500 ml-1">{h.actualizados} act.</span>
                        <span className="text-emerald-500 ml-1">{h.creados} creados</span>
                        <span className="text-amber-500 ml-1">{h.omitidos} omit.</span>
                        {h.errores > 0 && <span className="text-red-500 ml-1">{h.errores} err.</span>}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showFilters && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-100 animate-fade-in">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 font-medium">Proveedor:</label>
              <select value={proveedorFilter} onChange={e => setProveedorFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-kira-400/30">
                <option value="">Todos</option>
                {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {proveedorFilter && <button onClick={() => setProveedorFilter('')} className="text-xs text-kira-600 hover:underline">Limpiar</button>}
            </div>
          </div>
        )}

        {showAdd && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-kira-100 animate-fade-in">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Nuevo Artículo</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <input placeholder="Proveedor" value={newArticulo.proveedor} onChange={e => setNewArticulo(p => ({ ...p, proveedor: e.target.value }))} className="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input placeholder="Código" value={newArticulo.codigo} onChange={e => setNewArticulo(p => ({ ...p, codigo: e.target.value }))} className="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input placeholder="Descripción *" value={newArticulo.descripcion} onChange={e => setNewArticulo(p => ({ ...p, descripcion: e.target.value }))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input type="number" placeholder="Cantidad" value={newArticulo.cantidad || ''} onChange={e => setNewArticulo(p => ({ ...p, cantidad: Number(e.target.value) }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input type="number" placeholder="Costo unitario" value={newArticulo.costo_unitario || ''} onChange={e => setNewArticulo(p => ({ ...p, costo_unitario: Number(e.target.value) }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input type="number" placeholder="Precio comparativo" value={newArticulo.precio_comparativo || ''} onChange={e => setNewArticulo(p => ({ ...p, precio_comparativo: Number(e.target.value) }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input type="number" placeholder="Precio de venta" value={newArticulo.precio_venta || ''} onChange={e => setNewArticulo(p => ({ ...p, precio_venta: Number(e.target.value) }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input placeholder="Nota" value={newArticulo.nota} onChange={e => setNewArticulo(p => ({ ...p, nota: e.target.value }))} className="col-span-2 lg:col-span-3 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <button onClick={addArticulo} disabled={!newArticulo.descripcion} className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 disabled:opacity-40 flex items-center justify-center gap-2"><Save size={14} /> Guardar</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {[{ key: 'proveedor', label: 'Proveedor' }, { key: 'codigo', label: 'Código' }, { key: 'descripcion', label: 'Descripción' }, { key: 'cantidad', label: 'Stock', align: 'right' }, { key: 'costo_unitario', label: 'Costo', align: 'right' }, { key: 'precio_venta', label: 'Venta', align: 'right' }, { key: 'nota', label: 'Nota' }].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key as keyof Articulo)}
                      className={cn("px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap", (col as any).align === 'right' ? 'text-right' : 'text-left')}>
                      <span className="inline-flex items-center gap-1">{col.label}{sortField === col.key && <ArrowUpDown size={11} className="text-kira-500" />}</span>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Cargando...</td></tr> :
                articulos.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400"><Package size={32} className="mx-auto mb-2 text-gray-300" />Sin artículos</td></tr> :
                articulos.map(a => {
                  const isEd = editingId === a.id
                  const mp = a.costo_unitario > 0 ? ((a.precio_venta - a.costo_unitario) / a.costo_unitario * 100).toFixed(0) : '—'
                  return (
                    <tr key={a.id} className={cn("hover:bg-kira-50/30 transition-colors", a.cantidad <= 0 && "bg-red-50/40")}>
                      <td className="px-3 py-2">{isEd ? <input value={editData.proveedor ?? ''} onChange={e => setEditData(d => ({ ...d, proveedor: e.target.value }))} className="w-full px-2 py-1 text-sm border rounded" /> : <span className="text-xs text-gray-500">{a.proveedor}</span>}</td>
                      <td className="px-3 py-2">{isEd ? <input value={editData.codigo ?? ''} onChange={e => setEditData(d => ({ ...d, codigo: e.target.value }))} className="w-24 px-2 py-1 text-sm border rounded" /> : <span className="font-mono text-xs text-gray-600">{a.codigo}</span>}</td>
                      <td className="px-3 py-2 max-w-[240px]">{isEd ? <input value={editData.descripcion ?? ''} onChange={e => setEditData(d => ({ ...d, descripcion: e.target.value }))} className="w-full px-2 py-1 text-sm border rounded" /> : <span className="font-medium text-gray-800 truncate block">{a.descripcion}</span>}</td>
                      <td className="px-3 py-2 text-right">{isEd ? <input type="number" value={editData.cantidad ?? 0} onChange={e => setEditData(d => ({ ...d, cantidad: Number(e.target.value) }))} className="w-16 px-2 py-1 text-sm border rounded text-right" /> : <span className={cn("inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md text-xs font-semibold", a.cantidad <= 0 ? "bg-red-100 text-red-700" : a.cantidad <= 2 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{a.cantidad}</span>}</td>
                      <td className="px-3 py-2 text-right">{isEd ? <input type="number" value={editData.costo_unitario ?? 0} onChange={e => setEditData(d => ({ ...d, costo_unitario: Number(e.target.value) }))} className="w-24 px-2 py-1 text-sm border rounded text-right" /> : <span className="text-gray-600 text-xs">{formatCurrency(a.costo_unitario)}</span>}</td>
                      <td className="px-3 py-2 text-right">{isEd ? <input type="number" value={editData.precio_venta ?? 0} onChange={e => setEditData(d => ({ ...d, precio_venta: Number(e.target.value) }))} className="w-24 px-2 py-1 text-sm border rounded text-right" /> : <div><span className="font-semibold text-gray-800">{formatCurrency(a.precio_venta)}</span><span className={cn("block text-[10px]", Number(mp) < 0 ? "text-red-500" : Number(mp) < 30 ? "text-amber-500" : "text-emerald-500")}>{mp !== '—' ? `+${mp}%` : ''}</span></div>}</td>
                      <td className="px-3 py-2 max-w-[160px]">{isEd ? <input value={editData.nota ?? ''} onChange={e => setEditData(d => ({ ...d, nota: e.target.value }))} className="w-full px-2 py-1 text-sm border rounded" /> : <span className="text-xs text-gray-400 truncate block">{a.nota}</span>}</td>
                      <td className="px-3 py-2"><div className="flex items-center justify-end gap-1">{isEd ? (<><button onClick={saveEdit} className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600"><Check size={14} /></button><button onClick={() => { setEditingId(null); setEditData({}) }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X size={14} /></button></>) : (<><button onClick={() => startEdit(a)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil size={13} /></button><button onClick={() => deleteArticulo(a.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button></>)}</div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
