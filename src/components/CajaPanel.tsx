'use client'

import { useState, useEffect } from 'react'
import { supabase, Billetera, Comision, Posnet, PosnetComision, MetodoPago, BILLETERA_LABELS, BILLETERA_GRUPO } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { Wallet, ArrowRightLeft, X, Plus, Save, Trash2, Percent } from 'lucide-react'

interface Props {
  billetera: Billetera[]
  onUpdate: () => void
}

export default function CajaPanel({ billetera, onUpdate }: Props) {
  const [showMov, setShowMov] = useState(false)
  const [showCom, setShowCom] = useState<MetodoPago | null>(null)
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [movForm, setMovForm] = useState({ desde: 'efectivo', hacia: 'transferencia', monto: '', nota: '' })
  const [posnets, setPosnets] = useState<Posnet[]>([])
  const [posnetComs, setPosnetComs] = useState<PosnetComision[]>([])
  const [showPosnets, setShowPosnets] = useState(false)
  const [newPosnet, setNewPosnet] = useState('')
  const [editPosnetId, setEditPosnetId] = useState<number|null>(null)
  const [pcForm, setPcForm] = useState({tipo:'debito' as 'debito'|'credito',cuotas:'1',porcentaje:'',descripcion:''})

  useEffect(() => { fetchComisiones(); fetchPosnets() }, [])

  async function fetchComisiones() {
    const { data } = await supabase.from('comisiones').select('*').eq('activo', true).order('id')
    if (data) setComisiones(data)
  }

  async function fetchPosnets() {
    const{data:p}=await supabase.from('posnets').select('*').eq('activo',true).order('nombre')
    if(p)setPosnets(p)
    const{data:pc}=await supabase.from('posnet_comisiones').select('*').eq('activo',true)
    if(pc)setPosnetComs(pc)
  }

  async function addPosnet(){if(!newPosnet)return;await supabase.from('posnets').insert([{nombre:newPosnet}]);setNewPosnet('');fetchPosnets()}
  async function deletePosnet(id:number){await supabase.from('posnets').update({activo:false}).eq('id',id);fetchPosnets()}
  async function addPosnetComision(){if(!editPosnetId)return;const pct=parseFloat(pcForm.porcentaje)||0;await supabase.from('posnet_comisiones').insert([{posnet_id:editPosnetId,tipo:pcForm.tipo,cuotas:parseInt(pcForm.cuotas)||1,porcentaje:pct,descripcion:pcForm.descripcion||null}]);setPcForm({tipo:'debito',cuotas:'1',porcentaje:'',descripcion:''});fetchPosnets()}
  async function deletePosnetCom(id:number){await supabase.from('posnet_comisiones').update({activo:false}).eq('id',id);fetchPosnets()}

  async function hacerMovimiento() {
    const monto = parseFloat(movForm.monto) || 0
    if (monto <= 0 || movForm.desde === movForm.hacia) return

    const { data: bDesde } = await supabase.from('billetera').select('*').eq('tipo', movForm.desde).single()
    const { data: bHacia } = await supabase.from('billetera').select('*').eq('tipo', movForm.hacia).single()

    if (bDesde && bHacia) {
      await supabase.from('billetera').update({ saldo: bDesde.saldo - monto }).eq('id', bDesde.id)
      await supabase.from('billetera').update({ saldo: bHacia.saldo + monto }).eq('id', bHacia.id)
      await supabase.from('movimientos_caja').insert([{
        desde: movForm.desde, hacia: movForm.hacia, monto, nota: movForm.nota || null
      }])
    }

    setMovForm({ desde: 'efectivo', hacia: 'transferencia', monto: '', nota: '' })
    setShowMov(false)
    onUpdate()
  }

  async function agregarComision() {
    if (!showCom) return
    const pct = parseFloat(comForm.porcentaje) || 0
    if (pct <= 0) return
    await supabase.from('comisiones').insert([{
      tipo_billetera: showCom,
      porcentaje: pct,
      descripcion: comForm.descripcion || null,
      cuotas: comForm.cuotas ? parseInt(comForm.cuotas) : null,
    }])
    setComForm({ porcentaje: '', descripcion: '', cuotas: '' })
    fetchComisiones()
  }

  async function eliminarComision(id: number) {
    await supabase.from('comisiones').update({ activo: false }).eq('id', id)
    fetchComisiones()
  }

  const efectivo = billetera.find(b => b.tipo === 'efectivo')?.saldo ?? 0
  const transferencia = billetera.find(b => b.tipo === 'transferencia')?.saldo ?? 0
  const tdebito = billetera.find(b => b.tipo === 'tarjeta_debito')?.saldo ?? 0
  const tcredito = billetera.find(b => b.tipo === 'tarjeta_credito')?.saldo ?? 0
  const banco = transferencia + tdebito + tcredito

  const tipos: { key: MetodoPago; label: string; saldo: number; color: string }[] = [
    { key: 'efectivo', label: 'Efectivo', saldo: efectivo, color: 'text-emerald-400' },
    { key: 'transferencia', label: 'Transferencia', saldo: transferencia, color: 'text-blue-400' },
    { key: 'tarjeta_debito', label: 'T. Débito', saldo: tdebito, color: 'text-purple-400' },
    { key: 'tarjeta_credito', label: 'T. Crédito', saldo: tcredito, color: 'text-pink-400' },
  ]

  const comisionesDeTipo = showCom ? comisiones.filter(c => c.tipo_billetera === showCom) : []

  return (
    <div className="px-4 py-4 border-t border-white/10">
      {/* Header with movimiento button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-white/40" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Caja</span>
        </div>
        <button
          onClick={() => { setShowMov(!showMov); setShowCom(null) }}
          className={cn("text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-colors",
            showMov ? "bg-kira-400/20 text-kira-300" : "text-white/30 hover:text-white/60 hover:bg-white/5")}
        >
          <ArrowRightLeft size={10} /> Movimiento
        </button>
      </div>

      {/* Movimiento form */}
      {showMov && (
        <div className="mb-3 p-2.5 bg-white/5 rounded-lg space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <select value={movForm.desde} onChange={e => setMovForm(f => ({ ...f, desde: e.target.value }))}
              className="flex-1 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 border-0 focus:ring-1 focus:ring-kira-400">
              {tipos.map(t => <option key={t.key} value={t.key} className="text-black">{t.label}</option>)}
            </select>
            <span className="text-white/30 text-xs self-center">→</span>
            <select value={movForm.hacia} onChange={e => setMovForm(f => ({ ...f, hacia: e.target.value }))}
              className="flex-1 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 border-0 focus:ring-1 focus:ring-kira-400">
              {tipos.map(t => <option key={t.key} value={t.key} className="text-black">{t.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="Monto" value={movForm.monto}
              onChange={e => setMovForm(f => ({ ...f, monto: e.target.value }))}
              className="flex-1 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 placeholder:text-white/20 border-0 focus:ring-1 focus:ring-kira-400" />
            <button onClick={hacerMovimiento}
              className="px-3 py-1.5 bg-kira-500 text-white text-[10px] rounded hover:bg-kira-600 font-medium">
              Mover
            </button>
          </div>
          <input placeholder="Nota (opcional)" value={movForm.nota}
            onChange={e => setMovForm(f => ({ ...f, nota: e.target.value }))}
            className="w-full bg-white/10 text-white text-[11px] rounded px-2 py-1.5 placeholder:text-white/20 border-0 focus:ring-1 focus:ring-kira-400" />
        </div>
      )}

      {/* Billeteras */}
      <div className="space-y-1.5">
        {/* Efectivo */}
        <button onClick={() => { setShowCom(showCom === 'efectivo' ? null : 'efectivo'); setShowMov(false) }}
          className={cn("w-full flex items-center justify-between rounded-lg px-3 py-2 transition-colors",
            showCom === 'efectivo' ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "bg-white/5 hover:bg-white/8")}>
          <span className="text-xs text-white/50">Efectivo</span>
          <span className="text-sm font-semibold text-emerald-400">{formatCurrency(efectivo)}</span>
        </button>

        {/* Banco group */}
        <div className="rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/3">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Banco</span>
            <span className="text-[10px] font-semibold text-white/40">{formatCurrency(banco)}</span>
          </div>
          {tipos.filter(t => t.key !== 'efectivo').map(t => (
            <button key={t.key} onClick={() => { setShowCom(showCom === t.key ? null : t.key); setShowMov(false) }}
              className={cn("w-full flex items-center justify-between px-3 py-1.5 transition-colors",
                showCom === t.key ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5 hover:bg-white/8")}>
              <span className="text-xs text-white/50 pl-2">{t.label}</span>
              <span className={cn("text-sm font-semibold", t.color)}>{formatCurrency(t.saldo)}</span>
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-white/30">Total</span>
          <span className="text-sm font-bold text-white/80">{formatCurrency(efectivo + banco)}</span>
        </div>
      </div>

      {/* Comisiones panel */}
      {showCom && (
        <div className="mt-3 p-2.5 bg-white/5 rounded-lg space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Percent size={11} className="text-white/40" />
              <span className="text-[11px] text-white/60 font-medium">
                Comisiones — {BILLETERA_LABELS[showCom]}
              </span>
            </div>
            <button onClick={() => setShowCom(null)}>
              <X size={12} className="text-white/30 hover:text-white/60" />
            </button>
          </div>

          {/* Existing comisiones */}
          {comisionesDeTipo.length > 0 && (
            <div className="space-y-1">
              {comisionesDeTipo.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white/5 rounded px-2 py-1.5">
                  <div>
                    <span className="text-[11px] text-white/70 font-semibold">{c.porcentaje}%</span>
                    {c.descripcion && <span className="text-[10px] text-white/40 ml-1.5">{c.descripcion}</span>}
                    {c.cuotas && <span className="text-[10px] text-pink-400 ml-1.5">{c.cuotas} cuotas</span>}
                  </div>
                  <button onClick={() => eliminarComision(c.id)} className="p-0.5 hover:bg-white/10 rounded">
                    <Trash2 size={10} className="text-white/30 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add comision */}
          <div className="flex gap-1.5">
            <input type="number" placeholder="%" value={comForm.porcentaje}
              onChange={e => setComForm(f => ({ ...f, porcentaje: e.target.value }))}
              className="w-14 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 placeholder:text-white/20 border-0" />
            <input placeholder="Descripción" value={comForm.descripcion}
              onChange={e => setComForm(f => ({ ...f, descripcion: e.target.value }))}
              className="flex-1 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 placeholder:text-white/20 border-0" />
            {showCom === 'tarjeta_credito' && (
              <input type="number" placeholder="Cuotas" value={comForm.cuotas}
                onChange={e => setComForm(f => ({ ...f, cuotas: e.target.value }))}
                className="w-16 bg-white/10 text-white text-[11px] rounded px-2 py-1.5 placeholder:text-white/20 border-0" />
            )}
            <button onClick={agregarComision}
              className="px-2 py-1.5 bg-kira-500 text-white text-[10px] rounded hover:bg-kira-600">
              <Plus size={12} />
            </button>
          </div>

          {showCom === 'tarjeta_credito' && (
            <p className="text-[9px] text-white/30">Para T. Crédito podés poner comisiones distintas por cuota. Dejá cuotas vacío para comisión general.</p>
          )}
        </div>
      )}

      {/* Posnets section */}
      <div className="mt-3">
        <button onClick={()=>setShowPosnets(!showPosnets)} className={cn("w-full flex items-center justify-between text-[10px] px-2 py-1.5 rounded transition-colors",showPosnets?"bg-purple-500/10 text-purple-300":"text-white/30 hover:text-white/50 hover:bg-white/5")}>
          <span className="flex items-center gap-1"><Wallet size={10}/>Posnets</span>
          <span>{posnets.length}</span>
        </button>
        {showPosnets&&(
          <div className="mt-2 p-2.5 bg-white/5 rounded-lg space-y-2 animate-fade-in">
            {/* Posnet list */}
            {posnets.map(pos=>(
              <div key={pos.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <button onClick={()=>setEditPosnetId(editPosnetId===pos.id?null:pos.id)} className={cn("text-[11px] font-semibold",editPosnetId===pos.id?"text-purple-300":"text-white/70 hover:text-white")}>{pos.nombre}</button>
                  <button onClick={()=>deletePosnet(pos.id)} className="p-0.5 hover:bg-white/10 rounded"><Trash2 size={9} className="text-white/20 hover:text-red-400"/></button>
                </div>
                {/* Show comisiones for this posnet */}
                {editPosnetId===pos.id&&(
                  <div className="pl-2 space-y-1 animate-fade-in">
                    {posnetComs.filter(pc=>pc.posnet_id===pos.id).map(pc=>(
                      <div key={pc.id} className="flex items-center justify-between bg-white/5 rounded px-2 py-1">
                        <span className="text-[10px] text-white/60">{pc.tipo==='debito'?'Débito':'Crédito'}{pc.cuotas>1?` ${pc.cuotas}c`:''}: <span className="text-white/80 font-semibold">{pc.porcentaje}%</span>{pc.descripcion&&` · ${pc.descripcion}`}</span>
                        <button onClick={()=>deletePosnetCom(pc.id)} className="p-0.5"><Trash2 size={8} className="text-white/20 hover:text-red-400"/></button>
                      </div>
                    ))}
                    <div className="flex gap-1 mt-1">
                      <select value={pcForm.tipo} onChange={e=>setPcForm(f=>({...f,tipo:e.target.value as any}))} className="bg-white/10 text-white text-[10px] rounded px-1.5 py-1 border-0 w-16"><option value="debito" className="text-black">Débito</option><option value="credito" className="text-black">Crédito</option></select>
                      {pcForm.tipo==='credito'&&<input type="number" placeholder="Cuotas" value={pcForm.cuotas} onChange={e=>setPcForm(f=>({...f,cuotas:e.target.value}))} className="w-12 bg-white/10 text-white text-[10px] rounded px-1.5 py-1 border-0 placeholder:text-white/20"/>}
                      <input type="number" placeholder="%" value={pcForm.porcentaje} onChange={e=>setPcForm(f=>({...f,porcentaje:e.target.value}))} className="w-12 bg-white/10 text-white text-[10px] rounded px-1.5 py-1 border-0 placeholder:text-white/20"/>
                      <input placeholder="Desc." value={pcForm.descripcion} onChange={e=>setPcForm(f=>({...f,descripcion:e.target.value}))} className="flex-1 bg-white/10 text-white text-[10px] rounded px-1.5 py-1 border-0 placeholder:text-white/20"/>
                      <button onClick={addPosnetComision} className="px-1.5 py-1 bg-purple-500 text-white text-[9px] rounded hover:bg-purple-600"><Plus size={10}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {/* Add new posnet */}
            <div className="flex gap-1.5 pt-1 border-t border-white/5">
              <input placeholder="Nuevo posnet..." value={newPosnet} onChange={e=>setNewPosnet(e.target.value)} className="flex-1 bg-white/10 text-white text-[10px] rounded px-2 py-1.5 border-0 placeholder:text-white/20"/>
              <button onClick={addPosnet} className="px-2 py-1.5 bg-purple-500 text-white text-[9px] rounded hover:bg-purple-600 font-medium">Agregar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
