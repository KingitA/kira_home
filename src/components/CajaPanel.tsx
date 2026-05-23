'use client'

import { useState, useEffect } from 'react'
import { supabase, Billetera, CondicionPago, MetodoPago } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { Wallet, ArrowRightLeft, X, Pencil, Save, CreditCard, Banknote } from 'lucide-react'

interface Props { billetera: Billetera[]; onUpdate: () => void }

export default function CajaPanel({ billetera, onUpdate }: Props) {
  const [showMov, setShowMov] = useState(false)
  const [movForm, setMovForm] = useState({ desde: 'efectivo', hacia: 'transferencia', monto: '', nota: '' })
  const [condiciones, setCondiciones] = useState<CondicionPago[]>([])
  const [showCond, setShowCond] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ descuento: '', comision: '' })

  useEffect(() => { fetchCondiciones() }, [])

  async function fetchCondiciones() {
    const { data } = await supabase.from('condiciones_pago').select('*').eq('activo', true).order('id')
    if (data) setCondiciones(data)
  }

  async function hacerMovimiento() {
    const monto = parseFloat(movForm.monto) || 0
    if (monto <= 0 || movForm.desde === movForm.hacia) return
    const { data: bDesde } = await supabase.from('billetera').select('*').eq('tipo', movForm.desde).single()
    const { data: bHacia } = await supabase.from('billetera').select('*').eq('tipo', movForm.hacia).single()
    if (bDesde && bHacia) {
      await supabase.from('billetera').update({ saldo: bDesde.saldo - monto }).eq('id', bDesde.id)
      await supabase.from('billetera').update({ saldo: bHacia.saldo + monto }).eq('id', bHacia.id)
      await supabase.from('movimientos_caja').insert([{ desde: movForm.desde, hacia: movForm.hacia, monto, nota: movForm.nota || null }])
    }
    setMovForm({ desde: 'efectivo', hacia: 'transferencia', monto: '', nota: '' })
    setShowMov(false)
    onUpdate()
  }

  function startEdit(c: CondicionPago) {
    setEditId(c.id)
    setEditForm({ descuento: c.descuento.toString(), comision: c.comision.toString() })
  }

  async function saveEdit() {
    if (!editId) return
    await supabase.from('condiciones_pago').update({
      descuento: parseFloat(editForm.descuento) || 0,
      comision: parseFloat(editForm.comision) || 0,
    }).eq('id', editId)
    setEditId(null)
    fetchCondiciones()
  }

  const efectivo = billetera.find(b => b.tipo === 'efectivo')?.saldo ?? 0
  const transferencia = billetera.find(b => b.tipo === 'transferencia')?.saldo ?? 0
  const tdebito = billetera.find(b => b.tipo === 'tarjeta_debito')?.saldo ?? 0
  const tcredito = billetera.find(b => b.tipo === 'tarjeta_credito')?.saldo ?? 0
  const banco = transferencia + tdebito + tcredito

  const tipos: { key: MetodoPago; label: string }[] = [
    { key: 'efectivo', label: 'Efectivo' },
    { key: 'transferencia', label: 'Transferencia' },
    { key: 'tarjeta_debito', label: 'T. Débito' },
    { key: 'tarjeta_credito', label: 'T. Crédito' },
  ]

  const condIcono = (tipo: string) => {
    if (tipo === 'efectivo') return <Banknote size={12} className="text-emerald-400" />
    if (tipo === 'transferencia') return <CreditCard size={12} className="text-blue-400" />
    return <Wallet size={12} className="text-purple-400" />
  }

  return (
    <div className="px-4 py-4 border-t border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-white/40" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Caja</span>
        </div>
        <button onClick={() => setShowMov(!showMov)}
          className={cn("text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-colors",
            showMov ? "bg-kira-400/20 text-kira-300" : "text-white/30 hover:text-white/60 hover:bg-white/5")}>
          <ArrowRightLeft size={10} /> Movimiento
        </button>
      </div>

      {showMov && (
        <div className="mb-3 p-2.5 bg-white/5 rounded-lg space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <select value={movForm.desde} onChange={e => setMovForm(f => ({ ...f, desde: e.target.value }))}
              className="flex-1 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 border-0">
              {tipos.map(t => <option key={t.key} value={t.key} className="text-black">{t.label}</option>)}
            </select>
            <span className="text-white/30 text-xs self-center">→</span>
            <select value={movForm.hacia} onChange={e => setMovForm(f => ({ ...f, hacia: e.target.value }))}
              className="flex-1 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 border-0">
              {tipos.map(t => <option key={t.key} value={t.key} className="text-black">{t.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="Monto" value={movForm.monto}
              onChange={e => setMovForm(f => ({ ...f, monto: e.target.value }))}
              className="flex-1 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 placeholder:text-white/20 border-0" />
            <button onClick={hacerMovimiento} className="px-3 py-1.5 bg-kira-500 text-white text-[10px] rounded hover:bg-kira-600 font-medium">Mover</button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
          <span className="text-xs text-white/50">Efectivo</span>
          <span className="text-sm font-semibold text-emerald-400">{formatCurrency(efectivo)}</span>
        </div>
        <div className="rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/3">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Banco</span>
            <span className="text-[10px] font-semibold text-white/40">{formatCurrency(banco)}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 px-3 py-1.5">
            <span className="text-xs text-white/50 pl-2">Transferencia</span>
            <span className="text-sm font-semibold text-blue-400">{formatCurrency(transferencia)}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 px-3 py-1.5">
            <span className="text-xs text-white/50 pl-2">T. Débito</span>
            <span className="text-sm font-semibold text-purple-400">{formatCurrency(tdebito)}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 px-3 py-1.5">
            <span className="text-xs text-white/50 pl-2">T. Crédito</span>
            <span className="text-sm font-semibold text-pink-400">{formatCurrency(tcredito)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-white/30">Total</span>
          <span className="text-sm font-bold text-white/80">{formatCurrency(efectivo + banco)}</span>
        </div>
      </div>

      {/* Condiciones de pago */}
      <div className="mt-3">
        <button onClick={() => { setShowCond(!showCond); if (!showCond) fetchCondiciones() }}
          className={cn("w-full flex items-center justify-between text-[10px] px-2 py-1.5 rounded transition-colors",
            showCond ? "bg-kira-400/10 text-kira-300" : "text-white/30 hover:text-white/50 hover:bg-white/5")}>
          <span className="flex items-center gap-1"><Wallet size={10} /> Condiciones de pago</span>
        </button>
        {showCond && (
          <div className="mt-2 p-2.5 bg-white/5 rounded-lg space-y-2 animate-fade-in">
            {condiciones.map(c => (
              <div key={c.id} className="bg-white/5 rounded px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {condIcono(c.tipo)}
                    <span className="text-[11px] font-semibold text-white/80">{c.nombre}</span>
                  </div>
                  {editId === c.id ? (
                    <button onClick={saveEdit} className="p-0.5 hover:bg-white/10 rounded"><Save size={10} className="text-emerald-400" /></button>
                  ) : (
                    <button onClick={() => startEdit(c)} className="p-0.5 hover:bg-white/10 rounded"><Pencil size={9} className="text-white/30 hover:text-white/60" /></button>
                  )}
                </div>
                {editId === c.id ? (
                  <div className="flex gap-2 mt-1">
                    <div className="flex-1">
                      <span className="text-[9px] text-white/30">Dto %</span>
                      <input type="number" value={editForm.descuento} onChange={e => setEditForm(f => ({ ...f, descuento: e.target.value }))}
                        className="w-full bg-white/10 text-white text-[11px] rounded px-2 py-1 border-0" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[9px] text-white/30">Com. posnet %</span>
                      <input type="number" value={editForm.comision} onChange={e => setEditForm(f => ({ ...f, comision: e.target.value }))}
                        className="w-full bg-white/10 text-white text-[11px] rounded px-2 py-1 border-0" />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 text-[10px]">
                    {c.descuento > 0 && <span className="text-emerald-400">Dto: {c.descuento}%</span>}
                    {c.comision > 0 && <span className="text-purple-400">Com: {c.comision}%</span>}
                    {c.descuento === 0 && c.comision === 0 && <span className="text-white/30">Sin dto ni comisión</span>}
                  </div>
                )}
              </div>
            ))}
            <p className="text-[9px] text-white/20 pt-1">Dto = descuento al cliente · Com = comisión del posnet que se descuenta de la billetera</p>
          </div>
        )}
      </div>
    </div>
  )
}
