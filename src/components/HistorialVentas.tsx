'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Venta, VentaItem, OrdenPago, Gasto, COMPROBANTE_LABELS, METODO_PAGO_LABELS, MetodoPago } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { Receipt, ChevronDown, ChevronUp, Banknote, CreditCard, Calendar, Package, TrendingUp, ArrowDownRight, ArrowUpRight, Filter, BarChart3, Building2, DollarSign, Zap, Trash2, Wallet } from 'lucide-react'

interface VentaConItems extends Venta { venta_items: (VentaItem & { articulo: { descripcion: string; codigo: string; proveedor: string } })[] }
interface OrdenPagoConProv extends OrdenPago { proveedor?: { nombre: string; tipo: string }; comprobante?: { tipo_comprobante: string; numero: string | null; total: number; saldo_pendiente: number } }
type RangoRapido = 'hoy'|'ayer'|'semana'|'mes'|'2meses'|'todo'
type FiltroTipo = 'todo'|'ventas'|'pagos'|'gastos'

function getRango(r: RangoRapido): [Date, Date] {
  const h = new Date(); h.setHours(0,0,0,0); const f = new Date(); f.setHours(23,59,59,999)
  switch(r){ case 'hoy':return[h,f]; case 'ayer':{const a=new Date(h);a.setDate(a.getDate()-1);const af=new Date(a);af.setHours(23,59,59,999);return[a,af]}; case 'semana':{const s=new Date(h);s.setDate(s.getDate()-7);return[s,f]}; case 'mes':{const m=new Date(h);m.setMonth(m.getMonth()-1);return[m,f]}; case '2meses':{const m=new Date(h);m.setMonth(m.getMonth()-2);return[m,f]}; case 'todo':return[new Date(2020,0,1),f] }
}

interface Mov { id:string; tipo:'venta'|'pago_proveedor'|'gasto'; fecha:string; monto:number; dir:'in'|'out'; metodo:string; titulo:string; sub:string; det?:any; exp:boolean }

function mpIcon(m: string) {
  if (m==='efectivo') return <Banknote size={14} className="text-emerald-600"/>
  if (m==='transferencia') return <CreditCard size={14} className="text-blue-600"/>
  return <Wallet size={14} className="text-purple-600"/>
}

export default function HistorialVentas() {
  const [ventas, setVentas] = useState<VentaConItems[]>([])
  const [ordenesPago, setOrdenesPago] = useState<OrdenPagoConProv[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [rangoR, setRangoR] = useState<RangoRapido>('todo')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')
  const [fPago, setFPago] = useState<'todas'|MetodoPago>('todas')
  const [fTipo, setFTipo] = useState<FiltroTipo>('todo')
  const [showF, setShowF] = useState(false)

  useEffect(() => {
    fetchAll()
    const c1=supabase.channel('h1').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>fetchAll()).subscribe()
    const c2=supabase.channel('h2').on('postgres_changes',{event:'*',schema:'public',table:'ordenes_pago'},()=>fetchAll()).subscribe()
    const c3=supabase.channel('h3').on('postgres_changes',{event:'*',schema:'public',table:'gastos'},()=>fetchAll()).subscribe()
    return()=>{supabase.removeChannel(c1);supabase.removeChannel(c2);supabase.removeChannel(c3)}
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [v,op,g] = await Promise.all([
      supabase.from('ventas').select(`*,venta_items(*,articulo:articulos(descripcion,codigo,proveedor))`).order('fecha',{ascending:false}).limit(500),
      supabase.from('ordenes_pago').select(`*,proveedor:proveedores(nombre,tipo),comprobante:comprobantes(tipo_comprobante,numero,total,saldo_pendiente)`).order('fecha',{ascending:false}).limit(500),
      supabase.from('gastos').select('*').order('fecha',{ascending:false}).limit(500),
    ])
    if(v.data)setVentas(v.data as VentaConItems[]);if(op.data)setOrdenesPago(op.data as OrdenPagoConProv[]);if(g.data)setGastos(g.data)
    setLoading(false)
  }

  const movs:Mov[]=useMemo(()=>{
    const l:Mov[]=[]
    ventas.forEach(v=>{if(v.estado==='anulada')return;l.push({id:`v-${v.id}`,tipo:'venta',fecha:v.fecha,monto:v.total,dir:'in',metodo:v.metodo_pago,titulo:`Venta #${v.id}`,sub:`${v.venta_items?.length??0} art. · ${METODO_PAGO_LABELS[v.metodo_pago]||v.metodo_pago}${v.cuotas>1?` · ${v.cuotas} cuotas`:''}${v.nota?.includes('mixto')?' · mixto':''}`,det:v,exp:true})})
    ordenesPago.forEach(o=>{const pn=(o.proveedor as any)?.nombre??'Proveedor';const pt=(o.proveedor as any)?.tipo??'';const c=o.comprobante as any;let s=`${pn} · ${METODO_PAGO_LABELS[o.metodo_pago]||o.metodo_pago}`;if(o.es_a_cuenta)s+=' · A cuenta';if(c?.tipo_comprobante)s+=` · ${COMPROBANTE_LABELS[c.tipo_comprobante as keyof typeof COMPROBANTE_LABELS]||c.tipo_comprobante}`;if(o.nota)s+=` · ${o.nota}`;l.push({id:`op-${o.id}`,tipo:'pago_proveedor',fecha:o.fecha,monto:o.monto,dir:'out',metodo:o.metodo_pago,titulo:`Pago a ${pn}`,sub:s,det:{...o,provTipo:pt},exp:true})})
    gastos.forEach(g=>{let s=METODO_PAGO_LABELS[g.metodo_pago]||g.metodo_pago;if(g.tiene_comprobante&&g.tipo_comprobante)s+=` · ${g.tipo_comprobante}`;if(g.nota)s+=` · ${g.nota}`;l.push({id:`g-${g.id}`,tipo:'gasto',fecha:g.fecha,monto:g.monto,dir:'out',metodo:g.metodo_pago,titulo:g.descripcion,sub:s,det:g,exp:true})})
    return l.sort((a,b)=>new Date(b.fecha).getTime()-new Date(a.fecha).getTime())
  },[ventas,ordenesPago,gastos])

  const filtered=useMemo(()=>{
    let l=movs
    if(fDesde||fHasta){const d=fDesde?new Date(fDesde+'T00:00:00'):new Date(2020,0,1);const h=fHasta?new Date(fHasta+'T23:59:59'):new Date();l=l.filter(m=>{const f=new Date(m.fecha);return f>=d&&f<=h})}
    else if(rangoR!=='todo'){const[d,h]=getRango(rangoR);l=l.filter(m=>{const f=new Date(m.fecha);return f>=d&&f<=h})}
    if(fPago!=='todas')l=l.filter(m=>m.metodo===fPago)
    if(fTipo==='ventas')l=l.filter(m=>m.tipo==='venta');else if(fTipo==='pagos')l=l.filter(m=>m.tipo==='pago_proveedor');else if(fTipo==='gastos')l=l.filter(m=>m.tipo==='gasto')
    return l
  },[movs,fDesde,fHasta,rangoR,fPago,fTipo])

  const tIn=filtered.filter(m=>m.dir==='in').reduce((s,m)=>s+m.monto,0)
  const tOut=filtered.filter(m=>m.dir==='out').reduce((s,m)=>s+m.monto,0)
  const bal=tIn-tOut
  const cntV=filtered.filter(m=>m.tipo==='venta').length

  const topProd=useMemo(()=>{const mp=new Map<string,{n:string;c:number;t:number}>();ventas.filter(v=>v.estado==='completada').forEach(v=>v.venta_items?.forEach(i=>{const k=i.articulo?.descripcion||'?';const c=mp.get(k)||{n:k,c:0,t:0};c.c+=i.cantidad;c.t+=i.subtotal;mp.set(k,c)}));return Array.from(mp.values()).sort((a,b)=>b.c-a.c).slice(0,5)},[ventas])

  const porFecha:Record<string,Mov[]>={}
  filtered.forEach(m=>{const f=new Date(m.fecha).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});if(!porFecha[f])porFecha[f]=[];porFecha[f].push(m)})

  function selRango(r:RangoRapido){setRangoR(r);setFDesde('');setFHasta('')}

  async function anularVenta(id:number){
    const v=ventas.find(x=>x.id===id);if(!v||!confirm('¿Anular venta? Se restaurará el stock.'))return
    await supabase.from('ventas').update({estado:'anulada'}).eq('id',v.id)
    for(const i of v.venta_items){const{data:a}=await supabase.from('articulos').select('cantidad').eq('id',i.articulo_id).single();if(a)await supabase.from('articulos').update({cantidad:a.cantidad+i.cantidad}).eq('id',i.articulo_id)}
    const{data:b}=await supabase.from('billetera').select('*').eq('tipo',v.metodo_pago).single();if(b)await supabase.from('billetera').update({saldo:b.saldo-v.total}).eq('id',b.id)
    fetchAll()
  }

  async function anularPago(id:number){
    const o=ordenesPago.find(x=>x.id===id);if(!o||!confirm('¿Eliminar este pago? Se revertirá en billetera y comprobante.'))return
    // Restore comprobante saldo
    if(o.comprobante_id){
      const{data:c}=await supabase.from('comprobantes').select('*').eq('id',o.comprobante_id).single()
      if(c){const ns=c.saldo_pendiente+o.monto;await supabase.from('comprobantes').update({saldo_pendiente:ns,estado:ns>=c.total?'pendiente':'parcial'}).eq('id',o.comprobante_id)}
    }
    // Restore billetera
    const{data:b}=await supabase.from('billetera').select('*').eq('tipo',o.metodo_pago).single();if(b)await supabase.from('billetera').update({saldo:b.saldo+o.monto}).eq('id',b.id)
    await supabase.from('ordenes_pago').delete().eq('id',o.id)
    fetchAll()
  }

  async function anularGasto(id:number){
    const g=gastos.find(x=>x.id===id);if(!g||!confirm('¿Eliminar este gasto? Se revertirá en billetera.'))return
    const{data:b}=await supabase.from('billetera').select('*').eq('tipo',g.metodo_pago).single();if(b)await supabase.from('billetera').update({saldo:b.saldo+g.monto}).eq('id',b.id)
    await supabase.from('gastos').delete().eq('id',g.id)
    fetchAll()
  }

  function movBg(m:Mov){if(m.tipo==='venta')return'bg-emerald-50';if(m.tipo==='pago_proveedor')return(m.det as any)?.provTipo==='servicio'?'bg-orange-50':'bg-red-50';return'bg-amber-50'}
  function movIc(m:Mov){if(m.tipo==='venta')return mpIcon(m.metodo);if(m.tipo==='pago_proveedor')return(m.det as any)?.provTipo==='servicio'?<Zap size={14} className="text-orange-500"/>:<Building2 size={14} className="text-red-500"/>;return<DollarSign size={14} className="text-amber-500"/>}

  return(
    <div className="p-4 lg:p-6 max-w-5xl mx-auto bg-botanical min-h-full"><div className="relative z-10">
      <div className="mb-5"><h2 style={{fontFamily:'var(--font-display)'}} className="text-2xl font-semibold text-gray-900">Historial & Dashboard</h2><p className="text-sm text-gray-500 mt-1">Movimientos de caja: ventas, pagos y gastos</p></div>

      <div className="flex flex-wrap gap-2 mb-4">
        {([['hoy','Hoy'],['ayer','Ayer'],['semana','Semana'],['mes','Mes'],['2meses','2 meses'],['todo','Todo']] as [RangoRapido,string][]).map(([k,l])=>(<button key={k} onClick={()=>selRango(k)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",rangoR===k&&!fDesde?"bg-kira-500 text-white":"bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>{l}</button>))}
        <button onClick={()=>setShowF(!showF)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ml-auto",showF?"bg-kira-100 text-kira-700 border border-kira-200":"bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}><Filter size={12}/>Filtros</button>
      </div>

      <div className="flex gap-2 mb-4">
        {([['todo','Todo'],['ventas','Ventas'],['pagos','Pagos prov.'],['gastos','Gastos']] as [FiltroTipo,string][]).map(([k,l])=>(<button key={k} onClick={()=>setFTipo(k)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",fTipo===k?"bg-gray-800 text-white":"bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>{l}</button>))}
      </div>

      {showF&&(<div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className="text-xs text-gray-500 font-medium mb-1 block">Desde</label><input type="date" value={fDesde} onChange={e=>{setFDesde(e.target.value);setRangoR('todo')}} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"/></div>
        <div><label className="text-xs text-gray-500 font-medium mb-1 block">Hasta</label><input type="date" value={fHasta} onChange={e=>{setFHasta(e.target.value);setRangoR('todo')}} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"/></div>
        <div><label className="text-xs text-gray-500 font-medium mb-1 block">Método</label><select value={fPago} onChange={e=>setFPago(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="todas">Todos</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta_debito">Tarjeta Débito</option><option value="tarjeta_credito">Tarjeta Crédito</option></select></div>
      </div>{(fDesde||fHasta||fPago!=='todas')&&<button onClick={()=>{setFDesde('');setFHasta('');setFPago('todas');setRangoR('todo')}} className="mt-2 text-xs text-kira-600 hover:underline">Limpiar</button>}</div>)}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><div className="flex items-center gap-1.5 mb-1"><ArrowUpRight size={12} className="text-emerald-500"/><p className="text-xs text-gray-400 uppercase tracking-wider">Entradas</p></div><p className="text-xl font-semibold text-emerald-600">{formatCurrency(tIn)}</p><p className="text-[10px] text-gray-400">{cntV} ventas</p></div>
        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><div className="flex items-center gap-1.5 mb-1"><ArrowDownRight size={12} className="text-red-500"/><p className="text-xs text-gray-400 uppercase tracking-wider">Salidas</p></div><p className="text-xl font-semibold text-red-600">{formatCurrency(tOut)}</p></div>
        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><div className="flex items-center gap-1.5 mb-1"><TrendingUp size={12} className="text-gray-400"/><p className="text-xs text-gray-400 uppercase tracking-wider">Balance</p></div><p className={cn("text-xl font-semibold",bal>=0?"text-emerald-600":"text-red-600")}>{formatCurrency(bal)}</p></div>
        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><div className="flex items-center gap-1.5 mb-1"><BarChart3 size={12} className="text-gray-400"/><p className="text-xs text-gray-400 uppercase tracking-wider">Ticket prom.</p></div><p className="text-xl font-semibold text-gray-900">{cntV>0?formatCurrency(tIn/cntV):'$0'}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Productos más vendidos</p>
          {topProd.length===0?<p className="text-sm text-gray-300 text-center py-4">Sin datos</p>:(<div className="space-y-2">{topProd.map((p,i)=>(<div key={p.n} className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-kira-100 text-kira-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span><span className="text-sm text-gray-700 flex-1 truncate">{p.n}</span><span className="text-xs text-gray-400">{p.c}u</span><span className="text-xs font-semibold text-gray-600">{formatCurrency(p.t)}</span></div>))}</div>)}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Resumen</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Ventas</span><span className="font-semibold text-emerald-600">+{formatCurrency(tIn)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pagos proveedores</span><span className="font-semibold text-red-500">-{formatCurrency(filtered.filter(m=>m.tipo==='pago_proveedor').reduce((s,m)=>s+m.monto,0))}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gastos</span><span className="font-semibold text-amber-500">-{formatCurrency(filtered.filter(m=>m.tipo==='gasto').reduce((s,m)=>s+m.monto,0))}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="font-medium text-gray-700">Balance</span><span className={cn("font-bold",bal>=0?"text-emerald-600":"text-red-600")}>{formatCurrency(bal)}</span></div>
          </div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">Movimientos ({filtered.length})</h3>

      {loading?<div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>:
      filtered.length===0?<div className="text-center py-12 text-gray-400"><Receipt size={36} className="mx-auto mb-3 text-gray-200"/><p className="text-sm">Sin movimientos</p></div>:
      <div className="space-y-5">{Object.entries(porFecha).map(([fecha,ms])=>{
        const eD=ms.filter(m=>m.dir==='in').reduce((s,m)=>s+m.monto,0);const sD=ms.filter(m=>m.dir==='out').reduce((s,m)=>s+m.monto,0)
        return(<div key={fecha}>
          <div className="flex items-center gap-2 mb-2"><Calendar size={13} className="text-gray-400"/><h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider capitalize">{fecha}</h3><span className="text-xs text-gray-300">{eD>0&&<span className="text-emerald-500">+{formatCurrency(eD)}</span>}{eD>0&&sD>0&&' / '}{sD>0&&<span className="text-red-400">-{formatCurrency(sD)}</span>}</span></div>
          <div className="space-y-2">{ms.map(m=>{const isE=expandedId===m.id;return(
            <div key={m.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={()=>m.exp&&setExpandedId(isE?null:m.id)} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",m.exp&&"hover:bg-gray-50/50")}>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",movBg(m))}>{movIc(m)}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{m.titulo}</p><p className="text-xs text-gray-400 truncate">{new Date(m.fecha).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})} · {m.sub}</p></div>
                <span className={cn("text-sm font-semibold",m.dir==='in'?"text-emerald-600":"text-red-600")}>{m.dir==='in'?'+':'-'}{formatCurrency(m.monto)}</span>
                {m.exp&&(isE?<ChevronUp size={14} className="text-gray-300"/>:<ChevronDown size={14} className="text-gray-300"/>)}
              </button>
              {isE&&m.tipo==='venta'&&(<div className="border-t border-gray-50 px-4 py-3 bg-gray-50/30 animate-fade-in">
                <div className="space-y-1.5 mb-3">{(m.det as VentaConItems).venta_items?.map(i=>(<div key={i.id} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><Package size={12} className="text-gray-300"/><span className="text-gray-700">{i.articulo?.descripcion??'Eliminado'}</span><span className="text-xs text-gray-400">x{i.cantidad}</span></div><span className="text-gray-600">{formatCurrency(i.subtotal)}</span></div>))}</div>
                {(m.det as VentaConItems).nota&&<div className="text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-1.5 mb-2">{(m.det as VentaConItems).nota}</div>}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100"><button onClick={()=>anularVenta((m.det as VentaConItems).id)} className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"><Trash2 size={11}/>Anular venta</button><p className="font-semibold text-gray-800">{formatCurrency(m.monto)}</p></div>
              </div>)}
              {isE&&m.tipo==='pago_proveedor'&&(<div className="border-t border-gray-50 px-4 py-3 bg-gray-50/30 animate-fade-in">
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div><span className="text-xs text-gray-400">Proveedor</span><p className="text-gray-700">{(m.det as any).proveedor?.nombre}</p></div>
                  <div><span className="text-xs text-gray-400">Método</span><p className="text-gray-700 capitalize">{METODO_PAGO_LABELS[m.metodo as MetodoPago]||m.metodo}</p></div>
                  {(m.det as any).comprobante?.tipo_comprobante&&<div><span className="text-xs text-gray-400">Comprobante</span><p className="text-gray-700">{COMPROBANTE_LABELS[(m.det as any).comprobante.tipo_comprobante as keyof typeof COMPROBANTE_LABELS]}{(m.det as any).comprobante.numero&&` #${(m.det as any).comprobante.numero}`}</p></div>}
                  {(m.det as OrdenPago).es_a_cuenta&&<div><span className="text-xs text-gray-400">Tipo</span><p className="text-amber-600 font-medium">A cuenta</p></div>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100"><button onClick={()=>anularPago((m.det as OrdenPago).id)} className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"><Trash2 size={11}/>Eliminar pago</button><p className="font-semibold text-gray-800">{formatCurrency(m.monto)}</p></div>
              </div>)}
              {isE&&m.tipo==='gasto'&&(<div className="border-t border-gray-50 px-4 py-3 bg-gray-50/30 animate-fade-in">
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div><span className="text-xs text-gray-400">Descripción</span><p className="text-gray-700">{(m.det as Gasto).descripcion}</p></div>
                  <div><span className="text-xs text-gray-400">Método</span><p className="text-gray-700">{METODO_PAGO_LABELS[(m.det as Gasto).metodo_pago]}</p></div>
                  {(m.det as Gasto).tiene_comprobante&&<div><span className="text-xs text-gray-400">Comprobante</span><p className="text-gray-700">{(m.det as Gasto).tipo_comprobante} {(m.det as Gasto).numero_comprobante&&`#${(m.det as Gasto).numero_comprobante}`}</p></div>}
                  {(m.det as Gasto).nota&&<div><span className="text-xs text-gray-400">Nota</span><p className="text-gray-700">{(m.det as Gasto).nota}</p></div>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100"><button onClick={()=>anularGasto((m.det as Gasto).id)} className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"><Trash2 size={11}/>Eliminar gasto</button><p className="font-semibold text-gray-800">{formatCurrency(m.monto)}</p></div>
              </div>)}
            </div>
          )})}</div>
        </div>)
      })}</div>}
    </div></div>
  )
}
