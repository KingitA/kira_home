'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Proveedor, Comprobante, OrdenPago, OrdenCompra, Gasto, Articulo, COMPROBANTE_LABELS, COMPROBANTES_DEUDA, COMPROBANTES_CREDITO, COMPROBANTES_CON_IVA, TipoComprobante } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, X, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Building2, Zap, FileText, CreditCard, Banknote, AlertTriangle, Package, Save, DollarSign, Download, CheckSquare, Square, Pencil, History } from 'lucide-react'

type Vista = 'lista' | 'detalle'
type Tab = 'info' | 'cc' | 'comprobantes' | 'pagos' | 'ordenes'

export default function ProveedoresModule() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('lista')
  const [provActivo, setProvActivo] = useState<Proveedor | null>(null)
  const [tab, setTab] = useState<Tab>('cc')
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos'|'mercaderia'|'servicio'>('todos')
  const [showAdd, setShowAdd] = useState(false)
  const [showGasto, setShowGasto] = useState(false)
  const [formProv, setFormProv] = useState({nombre:'',tipo:'mercaderia' as 'mercaderia'|'servicio',cuit:'',direccion:'',localidad:'',provincia:'',emails:'',whatsapps:'',frecuencia_pago:'' as string,proximo_vencimiento:''})
  const [editingProv, setEditingProv] = useState(false)
  const [showCompForm, setShowCompForm] = useState(false)
  const [compForm, setCompForm] = useState({tipo_comprobante:'factura_a' as TipoComprobante,numero:'',fecha:new Date().toISOString().slice(0,10),fecha_vencimiento:'',subtotal:'',iva_21:'',iva_105:'',iva_27:'',percepciones:'',otros_impuestos:'',descripcion:''})
  const [showOPForm, setShowOPForm] = useState(false)
  const [opForm, setOpForm] = useState({metodo_pago:'transferencia' as 'efectivo'|'transferencia',monto:'',nota:''})
  const [gastoForm, setGastoForm] = useState({descripcion:'',monto:'',metodo_pago:'efectivo' as 'efectivo'|'transferencia',fecha:new Date().toISOString().slice(0,10),tiene_comprobante:false,tipo_comprobante:'',numero_comprobante:'',nota:''})
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [ordenesPago, setOrdenesPago] = useState<OrdenPago[]>([])
  const [articulosProv, setArticulosProv] = useState<Articulo[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [selectedComps, setSelectedComps] = useState<Set<number>>(new Set())
  const [ocItems, setOcItems] = useState<Record<number,number>>({})
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [showAnteriores, setShowAnteriores] = useState(false)
  // OC history
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([])
  const [ocHistorial, setOcHistorial] = useState(false)
  const [editingOC, setEditingOC] = useState<OrdenCompra|null>(null)
  const [editOCItems, setEditOCItems] = useState<Record<number,{qty:number,precio:number}>>({})

  useEffect(()=>{fetchProveedores()},[])

  async function fetchProveedores(){setLoading(true);const{data}=await supabase.from('proveedores').select('*').eq('activo',true).order('nombre');if(data)setProveedores(data);setLoading(false)}

  async function fetchDetalle(prov:Proveedor){
    const[comp,op,ga,ocs]=await Promise.all([
      supabase.from('comprobantes').select('*').eq('proveedor_id',prov.id).order('fecha',{ascending:false}),
      supabase.from('ordenes_pago').select('*').eq('proveedor_id',prov.id).order('fecha',{ascending:false}),
      supabase.from('gastos').select('*').eq('proveedor_id',prov.id).order('fecha',{ascending:false}),
      supabase.from('ordenes_compra').select('*').eq('proveedor_id',prov.id).order('fecha',{ascending:false}),
    ])
    if(comp.data)setComprobantes(comp.data);if(op.data)setOrdenesPago(op.data);if(ga.data)setGastos(ga.data);if(ocs.data)setOrdenesCompra(ocs.data)
    if(prov.tipo==='mercaderia'){
      const{data:pa}=await supabase.from('proveedor_articulos').select('articulo_id').eq('proveedor_id',prov.id)
      if(pa&&pa.length>0){const{data:arts}=await supabase.from('articulos').select('*').in('id',pa.map(x=>x.articulo_id)).eq('activo',true).order('descripcion');if(arts)setArticulosProv(arts)}else setArticulosProv([])
    }
  }

  function openDetalle(prov:Proveedor){setProvActivo(prov);setVista('detalle');setTab('cc');setSelectedComps(new Set());setOcItems({});setShowAnteriores(false);setOcHistorial(false);setEditingOC(null)
    setFormProv({nombre:prov.nombre,tipo:prov.tipo,cuit:prov.cuit||'',direccion:prov.direccion||'',localidad:prov.localidad||'',provincia:prov.provincia||'',emails:(prov.emails||[]).join(', '),whatsapps:(prov.whatsapps||[]).join(', '),frecuencia_pago:prov.frecuencia_pago||'',proximo_vencimiento:prov.proximo_vencimiento||''})
    fetchDetalle(prov)
  }

  async function saveProv(){const d={nombre:formProv.nombre,tipo:formProv.tipo,cuit:formProv.cuit||null,direccion:formProv.direccion||null,localidad:formProv.localidad||null,provincia:formProv.provincia||null,emails:formProv.emails?formProv.emails.split(',').map(e=>e.trim()).filter(Boolean):[],whatsapps:formProv.whatsapps?formProv.whatsapps.split(',').map(w=>w.trim()).filter(Boolean):[],frecuencia_pago:formProv.frecuencia_pago||null,proximo_vencimiento:formProv.proximo_vencimiento||null}
    if(editingProv&&provActivo){await supabase.from('proveedores').update(d).eq('id',provActivo.id);setEditingProv(false);const{data:u}=await supabase.from('proveedores').select('*').eq('id',provActivo.id).single();if(u)setProvActivo(u)}
    else{await supabase.from('proveedores').insert([d]);setShowAdd(false);setFormProv({nombre:'',tipo:'mercaderia',cuit:'',direccion:'',localidad:'',provincia:'',emails:'',whatsapps:'',frecuencia_pago:'',proximo_vencimiento:''})}
    fetchProveedores()
  }

  async function saveComprobante(){if(!provActivo)return;const tieneIva=COMPROBANTES_CON_IVA.includes(compForm.tipo_comprobante);const sub=parseFloat(compForm.subtotal)||0,i21=tieneIva?(parseFloat(compForm.iva_21)||0):0,i105=tieneIva?(parseFloat(compForm.iva_105)||0):0,i27=tieneIva?(parseFloat(compForm.iva_27)||0):0,perc=tieneIva?(parseFloat(compForm.percepciones)||0):0,otros=tieneIva?(parseFloat(compForm.otros_impuestos)||0):0;const total=sub+i21+i105+i27+perc+otros;const esCredito=COMPROBANTES_CREDITO.includes(compForm.tipo_comprobante)
    await supabase.from('comprobantes').insert([{proveedor_id:provActivo.id,tipo_comprobante:compForm.tipo_comprobante,numero:compForm.numero||null,fecha:compForm.fecha,fecha_vencimiento:compForm.fecha_vencimiento||null,subtotal:sub,iva_21:i21,iva_105:i105,iva_27:i27,percepciones:perc,otros_impuestos:otros,total,descripcion:compForm.descripcion||null,saldo_pendiente:total,estado:'pendiente'}])
    setShowCompForm(false);setCompForm({tipo_comprobante:'factura_a',numero:'',fecha:new Date().toISOString().slice(0,10),fecha_vencimiento:'',subtotal:'',iva_21:'',iva_105:'',iva_27:'',percepciones:'',otros_impuestos:'',descripcion:''});fetchDetalle(provActivo)
  }

  async function saveOrdenPago(){if(!provActivo)return;const monto=parseFloat(opForm.monto)||0;if(monto<=0)return;const compIds=Array.from(selectedComps);const esACuenta=compIds.length===0
    if(esACuenta){await supabase.from('ordenes_pago').insert([{proveedor_id:provActivo.id,metodo_pago:opForm.metodo_pago,monto,comprobante_id:null,es_a_cuenta:true,nota:opForm.nota||null}])}
    else{let rem=monto;for(const cid of compIds){const comp=comprobantes.find(c=>c.id===cid);if(!comp||rem<=0)continue
      const esCredito=COMPROBANTES_CREDITO.includes(comp.tipo_comprobante)
      const aplicar=Math.min(rem,comp.saldo_pendiente)
      await supabase.from('ordenes_pago').insert([{proveedor_id:provActivo.id,metodo_pago:opForm.metodo_pago,monto:aplicar,comprobante_id:cid,es_a_cuenta:false,nota:opForm.nota||null}])
      const ns=Math.max(0,comp.saldo_pendiente-aplicar);await supabase.from('comprobantes').update({saldo_pendiente:ns,estado:ns<=0?'pagado':'parcial'}).eq('id',cid);rem-=aplicar}
      if(rem>0) await supabase.from('ordenes_pago').insert([{proveedor_id:provActivo.id,metodo_pago:opForm.metodo_pago,monto:rem,comprobante_id:null,es_a_cuenta:true,nota:'Sobrante'}])
    }
    const{data:bill}=await supabase.from('billetera').select('*').eq('tipo',opForm.metodo_pago).single();if(bill)await supabase.from('billetera').update({saldo:bill.saldo-monto}).eq('id',bill.id)
    setShowOPForm(false);setOpForm({metodo_pago:'transferencia',monto:'',nota:''});setSelectedComps(new Set());fetchDetalle(provActivo)
  }

  async function saveGasto(){const monto=parseFloat(gastoForm.monto)||0;if(!gastoForm.descripcion||monto<=0)return;await supabase.from('gastos').insert([{descripcion:gastoForm.descripcion,monto,metodo_pago:gastoForm.metodo_pago,fecha:gastoForm.fecha,tiene_comprobante:gastoForm.tiene_comprobante,tipo_comprobante:gastoForm.tipo_comprobante||null,numero_comprobante:gastoForm.numero_comprobante||null,nota:gastoForm.nota||null}]);const{data:bill}=await supabase.from('billetera').select('*').eq('tipo',gastoForm.metodo_pago).single();if(bill)await supabase.from('billetera').update({saldo:bill.saldo-monto}).eq('id',bill.id);setShowGasto(false);setGastoForm({descripcion:'',monto:'',metodo_pago:'efectivo',fecha:new Date().toISOString().slice(0,10),tiene_comprobante:false,tipo_comprobante:'',numero_comprobante:'',nota:''})}

  function toggleComp(id:number){setSelectedComps(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n})}
  const selectedTotal=useMemo(()=>comprobantes.filter(c=>selectedComps.has(c.id)).reduce((s,c)=>{const esCredito=COMPROBANTES_CREDITO.includes(c.tipo_comprobante);return s+(esCredito?-c.saldo_pendiente:c.saldo_pendiente)},0),[selectedComps,comprobantes])
  function openPaySelected(){setShowOPForm(true);setOpForm({metodo_pago:'transferencia',monto:Math.abs(selectedTotal).toString(),nota:''})}

  function setOcQty(id:number,q:number){setOcItems(p=>{const n={...p};if(q<=0)delete n[id];else n[id]=q;return n})}
  const ocTotal=useMemo(()=>Object.entries(ocItems).reduce((s,[id,q])=>{const a=articulosProv.find(x=>x.id===parseInt(id));return s+(a?a.costo_unitario*q:0)},0),[ocItems,articulosProv])
  const ocIva=ocTotal*0.21

  async function generarOCPdf(){if(!provActivo||Object.keys(ocItems).length===0)return;setGeneratingPdf(true)
    const ocNum=`OC-${Date.now().toString().slice(-6)}`;const{data:oc}=await supabase.from('ordenes_compra').insert([{proveedor_id:provActivo.id,numero:ocNum,subtotal:ocTotal,iva:ocIva,total:ocTotal+ocIva,estado:'enviada'}]).select().single()
    if(oc){const items=Object.entries(ocItems).map(([id,q])=>{const a=articulosProv.find(x=>x.id===parseInt(id))!;return{orden_compra_id:oc.id,articulo_id:parseInt(id),cantidad:q,precio_unitario:a.costo_unitario,subtotal:a.costo_unitario*q}});await supabase.from('orden_compra_items').insert(items)}
    const il=Object.entries(ocItems).map(([id,q])=>{const a=articulosProv.find(x=>x.id===parseInt(id))!;return{desc:a.descripcion,codigo:a.codigo,qty:q,precio:a.costo_unitario,sub:a.costo_unitario*q}})
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:40px;color:#333}.header{display:flex;justify-content:space-between;border-bottom:2px solid #d78133;padding-bottom:15px;margin-bottom:20px}.logo h1{margin:0;color:#d78133;font-size:22px}.logo p{margin:2px 0;font-size:11px;color:#666}.oc-info{text-align:right}.oc-info h2{margin:0;font-size:16px}.oc-info p{margin:2px 0;font-size:11px;color:#666}.prov{background:#f9f5f0;padding:12px;border-radius:6px;margin-bottom:20px;font-size:12px}.prov strong{color:#d78133}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1c1917;color:white;padding:8px 10px;text-align:left}td{padding:8px 10px;border-bottom:1px solid #eee}tr:nth-child(even){background:#faf8f5}.tr{text-align:right}.totals{margin-top:15px;text-align:right;font-size:13px}.totals .row{display:flex;justify-content:flex-end;gap:30px;padding:4px 0}.totals .total{font-size:16px;font-weight:bold;color:#d78133;border-top:2px solid #d78133;padding-top:8px;margin-top:4px}.footer{margin-top:40px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px}</style></head><body><div class="header"><div class="logo"><h1>Kira Home</h1><p>Bazar & Deco</p><p>14 de Julio 3915</p><p>Bahía Blanca, Buenos Aires</p></div><div class="oc-info"><h2>Orden de Compra</h2><p><strong>${ocNum}</strong></p><p>Fecha: ${new Date().toLocaleDateString('es-AR')}</p></div></div><div class="prov"><strong>Proveedor:</strong> ${provActivo.nombre}${provActivo.cuit?`<br>CUIT: ${provActivo.cuit}`:''}${provActivo.direccion?`<br>${provActivo.direccion}`:''}</div><table><thead><tr><th>Código</th><th>Descripción</th><th class="tr">Cant.</th><th class="tr">P.Unit.</th><th class="tr">Subtotal</th></tr></thead><tbody>${il.map(i=>`<tr><td>${i.codigo||'—'}</td><td>${i.desc}</td><td class="tr">${i.qty}</td><td class="tr">$${i.precio.toLocaleString('es-AR')}</td><td class="tr">$${i.sub.toLocaleString('es-AR')}</td></tr>`).join('')}</tbody></table><div class="totals"><div class="row"><span>Subtotal:</span><span>$${ocTotal.toLocaleString('es-AR')}</span></div><div class="row"><span>IVA 21%:</span><span>$${ocIva.toLocaleString('es-AR')}</span></div><div class="row total"><span>TOTAL:</span><span>$${(ocTotal+ocIva).toLocaleString('es-AR')}</span></div></div><div class="footer">Kira Home - Bazar & Deco | kirahomebazar.com</div></body></html>`
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500)}
    setOcItems({});setGeneratingPdf(false);fetchDetalle(provActivo)
  }

  async function loadOCForEdit(oc:OrdenCompra){
    setEditingOC(oc);const{data}=await supabase.from('orden_compra_items').select('*').eq('orden_compra_id',oc.id)
    if(data){const items:Record<number,{qty:number,precio:number}>={};data.forEach(i=>{items[i.articulo_id]={qty:i.cantidad,precio:i.precio_unitario}});setEditOCItems(items)}
  }

  async function saveOCEdit(){if(!editingOC||!provActivo)return
    await supabase.from('orden_compra_items').delete().eq('orden_compra_id',editingOC.id)
    const items=Object.entries(editOCItems).filter(([,v])=>v.qty>0).map(([id,v])=>({orden_compra_id:editingOC.id,articulo_id:parseInt(id),cantidad:v.qty,precio_unitario:v.precio,subtotal:v.precio*v.qty}))
    if(items.length>0)await supabase.from('orden_compra_items').insert(items)
    const sub=items.reduce((s,i)=>s+i.subtotal,0);const iva=sub*0.21
    await supabase.from('ordenes_compra').update({subtotal:sub,iva,total:sub+iva}).eq('id',editingOC.id)
    setEditingOC(null);setEditOCItems({});fetchDetalle(provActivo)
  }

  const provsFiltrados=useMemo(()=>{let l=proveedores;if(filtroTipo!=='todos')l=l.filter(p=>p.tipo===filtroTipo);if(search){const q=search.toLowerCase();l=l.filter(p=>p.nombre.toLowerCase().includes(q)||p.cuit?.includes(q))}return l},[proveedores,filtroTipo,search])
  const saldoCC=useMemo(()=>{const d=comprobantes.filter(c=>COMPROBANTES_DEUDA.includes(c.tipo_comprobante)&&c.estado!=='anulado').reduce((s,c)=>s+c.total,0);const cr=comprobantes.filter(c=>COMPROBANTES_CREDITO.includes(c.tipo_comprobante)&&c.estado!=='anulado').reduce((s,c)=>s+c.total,0);const p=ordenesPago.reduce((s,o)=>s+o.monto,0);return d-cr-p},[comprobantes,ordenesPago])
  const compsPendientes=comprobantes.filter(c=>c.estado==='pendiente'||c.estado==='parcial')
  const compsPagados=comprobantes.filter(c=>c.estado==='pagado')
  const serviciosAlerta=proveedores.filter(p=>{if(p.tipo!=='servicio'||!p.proximo_vencimiento)return false;return(new Date(p.proximo_vencimiento).getTime()-new Date().setHours(0,0,0,0))/(1000*60*60*24)<=7})

  // ======= DETALLE =======
  if(vista==='detalle'&&provActivo){
    const tabs:{id:Tab;label:string}[]=[{id:'cc',label:'Cuenta Corriente'},{id:'comprobantes',label:'Comprobantes'},{id:'pagos',label:'Pagos'},...(provActivo.tipo==='mercaderia'?[{id:'ordenes' as Tab,label:'Orden de Compra'}]:[]),{id:'info',label:'Datos'}]

    return(
      <div className="p-4 lg:p-6 max-w-6xl mx-auto bg-botanical min-h-full"><div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={()=>{setVista('lista');setProvActivo(null)}} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={18}/></button>
          <div className="flex-1"><div className="flex items-center gap-2"><div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",provActivo.tipo==='mercaderia'?"bg-kira-100":"bg-blue-100")}>{provActivo.tipo==='mercaderia'?<Building2 size={14} className="text-kira-600"/>:<Zap size={14} className="text-blue-600"/>}</div><div><h2 style={{fontFamily:'var(--font-display)'}} className="text-xl font-semibold text-gray-900">{provActivo.nombre}</h2><p className="text-xs text-gray-400 capitalize">{provActivo.tipo}{provActivo.cuit&&` · CUIT: ${provActivo.cuit}`}</p></div></div></div>
          <div className={cn("px-3 py-1.5 rounded-lg text-sm font-semibold",saldoCC>0?"bg-red-50 text-red-700":saldoCC<0?"bg-emerald-50 text-emerald-700":"bg-gray-50 text-gray-600")}>Saldo: {formatCurrency(saldoCC)}</div>
        </div>
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">{tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className={cn("px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",tab===t.id?"bg-kira-500 text-white":"bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>{t.label}</button>))}</div>

        {/* === CC === */}
        {tab==='cc'&&(<div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><p className="text-xs text-gray-400 uppercase tracking-wider">Deuda</p><p className={cn("text-xl font-semibold mt-1",saldoCC>0?"text-red-600":"text-emerald-600")}>{formatCurrency(Math.abs(saldoCC))}</p></div>
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><p className="text-xs text-gray-400 uppercase tracking-wider">Pendientes</p><p className="text-xl font-semibold text-gray-900 mt-1">{compsPendientes.length}</p></div>
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><p className="text-xs text-gray-400 uppercase tracking-wider">Pagado</p><p className="text-xl font-semibold text-gray-900 mt-1">{formatCurrency(ordenesPago.reduce((s,o)=>s+o.monto,0))}</p></div>
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-100"><p className="text-xs text-gray-400 uppercase tracking-wider">Comprobantes</p><p className="text-xl font-semibold text-gray-900 mt-1">{comprobantes.length}</p></div>
          </div>

          {selectedComps.size>0&&(<div className="bg-kira-50 border border-kira-200 rounded-xl p-3 flex items-center justify-between animate-fade-in">
            <span className="text-sm text-kira-800">{selectedComps.size} seleccionado{selectedComps.size>1?'s':''} · Neto: <strong>{formatCurrency(selectedTotal)}</strong></span>
            <div className="flex gap-2"><button onClick={()=>setSelectedComps(new Set())} className="text-xs text-gray-500 hover:underline">Deseleccionar</button><button onClick={openPaySelected} className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1"><Banknote size={12}/>Pagar</button></div>
          </div>)}

          {showOPForm&&(<div className="bg-white rounded-xl border border-emerald-100 p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-3"><h4 className="text-sm font-semibold text-gray-700">Orden de Pago</h4><button onClick={()=>setShowOPForm(false)}><X size={14} className="text-gray-400"/></button></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <select value={opForm.metodo_pago} onChange={e=>setOpForm(f=>({...f,metodo_pago:e.target.value as any}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option></select>
              <input type="number" placeholder="Monto" value={opForm.monto} onChange={e=>setOpForm(f=>({...f,monto:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
              <input placeholder="Nota" value={opForm.nota} onChange={e=>setOpForm(f=>({...f,nota:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
              <button onClick={saveOrdenPago} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 flex items-center justify-center gap-2"><Save size={14}/>Pagar</button>
            </div>
            <p className="text-xs text-gray-400 mt-2">{selectedComps.size>0?`Afecta ${selectedComps.size} comprobante${selectedComps.size>1?'s':''}`:'Pago a cuenta'}</p>
          </div>)}

          {showCompForm&&(<div className="bg-white rounded-xl border border-kira-100 p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-3"><h4 className="text-sm font-semibold text-gray-700">Nuevo Comprobante</h4><button onClick={()=>setShowCompForm(false)}><X size={14} className="text-gray-400"/></button></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <select value={compForm.tipo_comprobante} onChange={e=>setCompForm(f=>({...f,tipo_comprobante:e.target.value as TipoComprobante}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg">{Object.entries(COMPROBANTE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
              <input placeholder="Número" value={compForm.numero} onChange={e=>setCompForm(f=>({...f,numero:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
              <div><label className="text-[10px] text-gray-400">Emisión</label><input type="date" value={compForm.fecha} onChange={e=>setCompForm(f=>({...f,fecha:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"/></div>
              <div><label className="text-[10px] text-gray-400">Vencimiento</label><input type="date" value={compForm.fecha_vencimiento} onChange={e=>setCompForm(f=>({...f,fecha_vencimiento:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"/></div>
              <input type="number" placeholder="Subtotal (neto)" value={compForm.subtotal} onChange={e=>setCompForm(f=>({...f,subtotal:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
              {COMPROBANTES_CON_IVA.includes(compForm.tipo_comprobante)&&(<><input type="number" placeholder="IVA 21%" value={compForm.iva_21} onChange={e=>setCompForm(f=>({...f,iva_21:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/><input type="number" placeholder="Percepciones" value={compForm.percepciones} onChange={e=>setCompForm(f=>({...f,percepciones:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/></>)}
              <input placeholder="Descripción" value={compForm.descripcion} onChange={e=>setCompForm(f=>({...f,descripcion:e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
              <button onClick={saveComprobante} className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 flex items-center justify-center gap-2"><Save size={14}/>Guardar</button>
            </div>
          </div>)}

          {/* Movimientos pendientes */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">Pendientes y movimientos recientes</h3>
              <div className="flex gap-2">
                <button onClick={()=>{setShowCompForm(true);setShowOPForm(false)}} className="px-3 py-1.5 text-xs bg-kira-500 text-white rounded-lg hover:bg-kira-600 flex items-center gap-1"><Plus size={12}/>Comprobante</button>
                <button onClick={()=>{setShowOPForm(true);setShowCompForm(false)}} className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1"><Plus size={12}/>Pago</button>
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[40vh] overflow-auto">
              {[...compsPendientes.map(c=>({type:'comp' as const,date:c.fecha,data:c})),...ordenesPago.map(o=>({type:'pago' as const,date:o.fecha,data:o}))].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(mov=>{
                if(mov.type==='comp'){const c=mov.data as Comprobante;const esDeuda=COMPROBANTES_DEUDA.includes(c.tipo_comprobante);const esCredito=COMPROBANTES_CREDITO.includes(c.tipo_comprobante)
                  return(<div key={`c-${c.id}`} className={cn("flex items-center gap-3 px-4 py-3",selectedComps.has(c.id)&&"bg-kira-50/50")}>
                    <button onClick={()=>toggleComp(c.id)} className="flex-shrink-0">{selectedComps.has(c.id)?<CheckSquare size={16} className="text-kira-500"/>:<Square size={16} className="text-gray-300"/>}</button>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",esDeuda?"bg-red-50":"bg-emerald-50")}><FileText size={14} className={esDeuda?"text-red-500":"text-emerald-500"}/></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{COMPROBANTE_LABELS[c.tipo_comprobante]}{c.numero&&` #${c.numero}`}</p><p className="text-xs text-gray-400">Em: {c.fecha}{c.fecha_vencimiento&&` · Vto: ${c.fecha_vencimiento}`}{c.descripcion&&` · ${c.descripcion}`}</p></div>
                    <div className="text-right"><p className={cn("text-sm font-semibold",esCredito?"text-emerald-600":"text-red-600")}>{esCredito?'-':'+'}{formatCurrency(c.total)}</p>{c.saldo_pendiente>0&&c.saldo_pendiente<c.total&&<p className="text-[10px] text-amber-500">Pend: {formatCurrency(c.saldo_pendiente)}</p>}<span className={cn("text-[10px] px-1.5 py-0.5 rounded",c.estado==='parcial'?'bg-amber-50 text-amber-600':'bg-red-50 text-red-600')}>{c.estado}</span></div>
                  </div>)}
                else{const o=mov.data as OrdenPago;return(<div key={`p-${o.id}`} className="flex items-center gap-3 px-4 py-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 ml-6">{o.metodo_pago==='efectivo'?<Banknote size={14} className="text-blue-500"/>:<CreditCard size={14} className="text-blue-500"/>}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">OP #{o.id}{o.es_a_cuenta&&' (A cuenta)'}</p><p className="text-xs text-gray-400">{o.fecha} · {o.metodo_pago}{o.nota&&` · ${o.nota}`}</p></div><p className="text-sm font-semibold text-blue-600">-{formatCurrency(o.monto)}</p></div>)}
              })}
              {compsPendientes.length===0&&ordenesPago.length===0&&<div className="px-4 py-8 text-center text-gray-400 text-sm">Sin movimientos</div>}
            </div>
          </div>

          {/* Anteriores (pagados) */}
          {compsPagados.length>0&&(
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={()=>setShowAnteriores(!showAnteriores)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2"><History size={14} className="text-gray-400"/><span className="text-sm font-medium text-gray-600">Anteriores ({compsPagados.length} pagados)</span></div>
                {showAnteriores?<ChevronUp size={14} className="text-gray-400"/>:<ChevronDown size={14} className="text-gray-400"/>}
              </button>
              {showAnteriores&&(<div className="divide-y divide-gray-50 border-t border-gray-100 max-h-[30vh] overflow-auto">
                {compsPagados.map(c=>{const esCredito=COMPROBANTES_CREDITO.includes(c.tipo_comprobante);return(
                  <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 opacity-70">
                    <FileText size={14} className={esCredito?"text-emerald-400":"text-gray-400"}/>
                    <div className="flex-1 min-w-0"><p className="text-sm text-gray-700">{COMPROBANTE_LABELS[c.tipo_comprobante]}{c.numero&&` #${c.numero}`}</p><p className="text-xs text-gray-400">Em: {c.fecha}{c.fecha_vencimiento&&` · Vto: ${c.fecha_vencimiento}`}{c.descripcion&&` · ${c.descripcion}`}</p></div>
                    <p className="text-sm text-gray-500">{formatCurrency(c.total)}</p><span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">pagado</span>
                  </div>
                )})}
              </div>)}
            </div>
          )}
        </div>)}

        {/* === COMPROBANTES TAB === */}
        {tab==='comprobantes'&&(<div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center"><h3 className="text-sm font-semibold text-gray-700">Todos los comprobantes</h3><button onClick={()=>setShowCompForm(!showCompForm)} className="px-3 py-1.5 text-xs bg-kira-500 text-white rounded-lg hover:bg-kira-600 flex items-center gap-1"><Plus size={12}/>Nuevo</button></div>
          {showCompForm&&(<div className="bg-white rounded-xl border border-kira-100 p-4 animate-fade-in"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><select value={compForm.tipo_comprobante} onChange={e=>setCompForm(f=>({...f,tipo_comprobante:e.target.value as TipoComprobante}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg">{Object.entries(COMPROBANTE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input placeholder="Número" value={compForm.numero} onChange={e=>setCompForm(f=>({...f,numero:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/><div><label className="text-[10px] text-gray-400">Emisión</label><input type="date" value={compForm.fecha} onChange={e=>setCompForm(f=>({...f,fecha:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"/></div><div><label className="text-[10px] text-gray-400">Vencimiento</label><input type="date" value={compForm.fecha_vencimiento} onChange={e=>setCompForm(f=>({...f,fecha_vencimiento:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"/></div><input type="number" placeholder="Subtotal" value={compForm.subtotal} onChange={e=>setCompForm(f=>({...f,subtotal:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>{COMPROBANTES_CON_IVA.includes(compForm.tipo_comprobante)&&(<><input type="number" placeholder="IVA 21%" value={compForm.iva_21} onChange={e=>setCompForm(f=>({...f,iva_21:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/><input type="number" placeholder="Percepciones" value={compForm.percepciones} onChange={e=>setCompForm(f=>({...f,percepciones:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/></>)}<input placeholder="Descripción" value={compForm.descripcion} onChange={e=>setCompForm(f=>({...f,descripcion:e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"/><button onClick={saveComprobante} className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 flex items-center justify-center gap-2"><Save size={14}/>Guardar</button></div></div>)}
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">{comprobantes.map(c=>(<div key={c.id} className="flex items-center gap-3 px-4 py-3"><FileText size={14} className={COMPROBANTES_DEUDA.includes(c.tipo_comprobante)?"text-red-400":"text-emerald-400"}/><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{COMPROBANTE_LABELS[c.tipo_comprobante]}{c.numero&&` #${c.numero}`}</p><p className="text-xs text-gray-400">Em: {c.fecha}{c.fecha_vencimiento&&` · Vto: ${c.fecha_vencimiento}`}{c.descripcion&&` · ${c.descripcion}`}</p></div><p className="text-sm font-semibold text-gray-800">{formatCurrency(c.total)}</p><span className={cn("text-[10px] px-1.5 py-0.5 rounded",c.estado==='pagado'?'bg-emerald-50 text-emerald-600':c.estado==='parcial'?'bg-amber-50 text-amber-600':'bg-red-50 text-red-600')}>{c.estado}</span></div>))}{comprobantes.length===0&&<div className="px-4 py-8 text-center text-gray-400 text-sm">Sin comprobantes</div>}</div>
        </div>)}

        {/* === PAGOS TAB === */}
        {tab==='pagos'&&(<div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center"><h3 className="text-sm font-semibold text-gray-700">Órdenes de Pago</h3><button onClick={()=>setShowOPForm(!showOPForm)} className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1"><Plus size={12}/>Nueva</button></div>
          {showOPForm&&(<div className="bg-white rounded-xl border border-emerald-100 p-4 animate-fade-in"><div className="grid grid-cols-2 lg:grid-cols-3 gap-3"><select value={opForm.metodo_pago} onChange={e=>setOpForm(f=>({...f,metodo_pago:e.target.value as any}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option></select><input type="number" placeholder="Monto" value={opForm.monto} onChange={e=>setOpForm(f=>({...f,monto:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/><button onClick={saveOrdenPago} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 flex items-center justify-center gap-2"><Save size={14}/>Pagar a cuenta</button></div></div>)}
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">{ordenesPago.map(o=>(<div key={o.id} className="flex items-center gap-3 px-4 py-3">{o.metodo_pago==='efectivo'?<Banknote size={14} className="text-emerald-400"/>:<CreditCard size={14} className="text-blue-400"/>}<div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">OP #{o.id}{o.es_a_cuenta&&' (A cuenta)'}</p><p className="text-xs text-gray-400">{o.fecha} · {o.metodo_pago}{o.nota&&` · ${o.nota}`}</p></div><p className="text-sm font-semibold text-gray-800">{formatCurrency(o.monto)}</p></div>))}{ordenesPago.length===0&&<div className="px-4 py-8 text-center text-gray-400 text-sm">Sin pagos</div>}</div>
        </div>)}

        {/* === ORDENES DE COMPRA === */}
        {tab==='ordenes'&&provActivo.tipo==='mercaderia'&&(<div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">{editingOC?`Editando OC #${editingOC.numero||editingOC.id}`:'Nueva Orden de Compra'}</h3>
            <div className="flex gap-2">
              {editingOC&&<button onClick={()=>{setEditingOC(null);setEditOCItems({})}} className="text-xs text-gray-500 hover:underline">Cancelar</button>}
              {editingOC?<button onClick={saveOCEdit} className="px-3 py-1.5 text-xs bg-kira-500 text-white rounded-lg hover:bg-kira-600 flex items-center gap-1"><Save size={12}/>Guardar cambios</button>
              :Object.keys(ocItems).length>0&&<button onClick={generarOCPdf} disabled={generatingPdf} className="px-3 py-1.5 text-xs bg-kira-500 text-white rounded-lg hover:bg-kira-600 flex items-center gap-1.5 disabled:opacity-50"><Download size={12}/>{generatingPdf?'Generando...':`Cerrar OC — ${formatCurrency(ocTotal+ocIva)}`}</button>}
              <button onClick={()=>setOcHistorial(!ocHistorial)} className={cn("px-3 py-1.5 text-xs rounded-lg flex items-center gap-1",ocHistorial?"bg-gray-800 text-white":"bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}><History size={12}/>Anteriores</button>
            </div>
          </div>

          {Object.keys(editingOC?editOCItems:ocItems).length>0&&!editingOC&&(<div className="bg-kira-50 border border-kira-200 rounded-xl p-3"><span className="text-sm text-kira-800">{Object.keys(ocItems).length} art. · Sub: {formatCurrency(ocTotal)} · IVA: {formatCurrency(ocIva)} · <strong>Total: {formatCurrency(ocTotal+ocIva)}</strong></span></div>)}

          {/* OC historial */}
          {ocHistorial&&(<div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 mb-4">
            {ordenesCompra.length===0?<div className="px-4 py-6 text-center text-gray-400 text-sm">Sin órdenes anteriores</div>:
            ordenesCompra.map(oc=>(<div key={oc.id} className="flex items-center gap-3 px-4 py-3">
              <FileText size={14} className="text-kira-400"/>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">OC #{oc.numero||oc.id}</p><p className="text-xs text-gray-400">{oc.fecha} · {oc.estado}</p></div>
              <span className="text-sm font-semibold text-gray-800">{formatCurrency(oc.total)}</span>
              <button onClick={()=>{loadOCForEdit(oc);setOcHistorial(false)}} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-kira-600"><Pencil size={13}/></button>
            </div>))}
          </div>)}

          {/* Articles table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-left">Código</th>
              <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-left">Descripción</th>
              <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-right">Stock</th>
              <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-right">Costo</th>
              <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-center w-36">Pedir</th>
              <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-right">Subtotal</th>
            </tr></thead><tbody className="divide-y divide-gray-50">
              {articulosProv.map(a=>{
                const items=editingOC?editOCItems:ocItems
                const qty=editingOC?(editOCItems[a.id]?.qty||0):(ocItems[a.id]||0)
                const precio=editingOC?(editOCItems[a.id]?.precio||a.costo_unitario):a.costo_unitario
                return(<tr key={a.id} className={cn(qty>0&&"bg-kira-50/30")}>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{a.codigo||'—'}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{a.descripcion}</td>
                  <td className="px-3 py-2 text-right"><span className={cn("text-xs px-1.5 py-0.5 rounded font-semibold",a.cantidad<=0?"bg-red-100 text-red-700":a.cantidad<=2?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700")}>{a.cantidad}</span></td>
                  <td className="px-3 py-2 text-right">{editingOC?<input type="number" value={precio} onChange={e=>{const p=parseFloat(e.target.value)||0;setEditOCItems(prev=>({...prev,[a.id]:{qty:prev[a.id]?.qty||0,precio:p}}))}} className="w-20 text-right px-1 py-0.5 text-sm border rounded"/>:<span className="text-gray-600">{formatCurrency(a.costo_unitario)}</span>}</td>
                  <td className="px-3 py-2"><div className="flex items-center justify-center gap-1.5">
                    {qty>0&&<button onClick={()=>{if(editingOC){setEditOCItems(p=>({...p,[a.id]:{...p[a.id],qty:Math.max(0,qty-1)}}))}else setOcQty(a.id,qty-1)}} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-500">−</button>}
                    {qty>0?<input type="number" value={qty} onChange={e=>{const v=parseInt(e.target.value)||0;if(editingOC)setEditOCItems(p=>({...p,[a.id]:{...p[a.id],qty:v}}));else setOcQty(a.id,v)}} className="w-14 text-center px-1 py-1 text-sm border border-gray-200 rounded-md"/>
                    :<button onClick={()=>{if(editingOC)setEditOCItems(p=>({...p,[a.id]:{qty:1,precio:a.costo_unitario}}));else setOcQty(a.id,1)}} className="w-7 h-7 rounded-md border border-kira-200 bg-kira-50 flex items-center justify-center hover:bg-kira-100 text-kira-600"><Plus size={14}/></button>}
                    {qty>0&&<button onClick={()=>{if(editingOC)setEditOCItems(p=>({...p,[a.id]:{...p[a.id],qty:qty+1}}));else setOcQty(a.id,qty+1)}} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-500">+</button>}
                  </div></td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">{qty>0?formatCurrency(precio*qty):'—'}</td>
                </tr>)
              })}
              {articulosProv.length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Sin artículos vinculados</td></tr>}
            </tbody></table>
          </div>
        </div>)}

        {/* === INFO === */}
        {tab==='info'&&(<div className="space-y-4 animate-fade-in"><div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-semibold text-gray-700">Datos</h3><button onClick={()=>setEditingProv(!editingProv)} className="text-xs text-kira-600 hover:underline">{editingProv?'Cancelar':'Editar'}</button></div>
          {editingProv?(<div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <input placeholder="Nombre" value={formProv.nombre} onChange={e=>setFormProv(f=>({...f,nombre:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
            <select value={formProv.tipo} onChange={e=>setFormProv(f=>({...f,tipo:e.target.value as any}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="mercaderia">Mercadería</option><option value="servicio">Servicio</option></select>
            <input placeholder="CUIT" value={formProv.cuit} onChange={e=>setFormProv(f=>({...f,cuit:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
            <input placeholder="Dirección" value={formProv.direccion} onChange={e=>setFormProv(f=>({...f,direccion:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
            <input placeholder="Localidad" value={formProv.localidad} onChange={e=>setFormProv(f=>({...f,localidad:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
            <input placeholder="Provincia" value={formProv.provincia} onChange={e=>setFormProv(f=>({...f,provincia:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
            <input placeholder="Emails (coma)" value={formProv.emails} onChange={e=>setFormProv(f=>({...f,emails:e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
            <input placeholder="WhatsApp (coma)" value={formProv.whatsapps} onChange={e=>setFormProv(f=>({...f,whatsapps:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>
            {formProv.tipo==='servicio'&&(<><select value={formProv.frecuencia_pago} onChange={e=>setFormProv(f=>({...f,frecuencia_pago:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">Sin frecuencia</option><option value="mensual">Mensual</option><option value="bimestral">Bimestral</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select><input type="date" value={formProv.proximo_vencimiento} onChange={e=>setFormProv(f=>({...f,proximo_vencimiento:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/></>)}
            <button onClick={saveProv} className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 flex items-center justify-center gap-2"><Save size={14}/>Guardar</button>
          </div>):(<div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-gray-400">Tipo</p><p className="capitalize">{provActivo.tipo}</p></div>
            <div><p className="text-xs text-gray-400">CUIT</p><p>{provActivo.cuit||'—'}</p></div>
            <div><p className="text-xs text-gray-400">Dirección</p><p>{provActivo.direccion||'—'}</p></div>
            <div><p className="text-xs text-gray-400">Localidad</p><p>{provActivo.localidad||'—'}</p></div>
            <div><p className="text-xs text-gray-400">Provincia</p><p>{provActivo.provincia||'—'}</p></div>
            <div><p className="text-xs text-gray-400">Emails</p><p>{provActivo.emails?.length?provActivo.emails.join(', '):'—'}</p></div>
            <div><p className="text-xs text-gray-400">WhatsApp</p><p>{provActivo.whatsapps?.length?provActivo.whatsapps.join(', '):'—'}</p></div>
            {provActivo.tipo==='servicio'&&(<><div><p className="text-xs text-gray-400">Frecuencia</p><p className="capitalize">{provActivo.frecuencia_pago||'—'}</p></div><div><p className="text-xs text-gray-400">Próx. vencimiento</p><p>{provActivo.proximo_vencimiento||'—'}</p></div></>)}
          </div>)}
        </div></div>)}
      </div></div>
    )
  }

  // ======= LISTA =======
  return(
    <div className="p-4 lg:p-6 max-w-5xl mx-auto bg-botanical min-h-full"><div className="relative z-10">
      <div className="flex items-center justify-between mb-5"><div><h2 style={{fontFamily:'var(--font-display)'}} className="text-2xl font-semibold text-gray-900">Proveedores</h2><p className="text-sm text-gray-500 mt-1">Cuenta corriente, compras y gastos</p></div><div className="flex gap-2"><button onClick={()=>setShowGasto(true)} className="px-3 py-2 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1.5"><DollarSign size={13}/>Gasto</button><button onClick={()=>setShowAdd(true)} className="px-3 py-2 text-xs bg-kira-500 text-white rounded-lg hover:bg-kira-600 flex items-center gap-1.5"><Plus size={13}/>Proveedor</button></div></div>

      {serviciosAlerta.length>0&&(<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 animate-fade-in"><div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-600"/><span className="text-xs font-semibold text-amber-700">Vencimientos próximos</span></div>{serviciosAlerta.map(p=>(<div key={p.id} className="flex items-center justify-between text-sm"><span className="text-amber-800">{p.nombre}</span><span className="text-xs text-amber-600">{p.proximo_vencimiento}</span></div>))}</div>)}

      {showGasto&&(<div className="bg-white rounded-xl border border-amber-100 p-4 mb-4 animate-fade-in"><div className="flex justify-between items-center mb-3"><h3 className="text-sm font-semibold text-gray-700">Registrar Gasto</h3><button onClick={()=>setShowGasto(false)}><X size={14} className="text-gray-400"/></button></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><input placeholder="Descripción *" value={gastoForm.descripcion} onChange={e=>setGastoForm(f=>({...f,descripcion:e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"/><input type="number" placeholder="Monto *" value={gastoForm.monto} onChange={e=>setGastoForm(f=>({...f,monto:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/><select value={gastoForm.metodo_pago} onChange={e=>setGastoForm(f=>({...f,metodo_pago:e.target.value as any}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option></select><input type="date" value={gastoForm.fecha} onChange={e=>setGastoForm(f=>({...f,fecha:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/><label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={gastoForm.tiene_comprobante} onChange={e=>setGastoForm(f=>({...f,tiene_comprobante:e.target.checked}))}/>Comprobante</label>{gastoForm.tiene_comprobante&&(<><input placeholder="Tipo" value={gastoForm.tipo_comprobante} onChange={e=>setGastoForm(f=>({...f,tipo_comprobante:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/><input placeholder="Nro" value={gastoForm.numero_comprobante} onChange={e=>setGastoForm(f=>({...f,numero_comprobante:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/></>)}<input placeholder="Nota" value={gastoForm.nota} onChange={e=>setGastoForm(f=>({...f,nota:e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"/><button onClick={saveGasto} disabled={!gastoForm.descripcion||!gastoForm.monto} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-2"><Save size={14}/>Registrar</button></div></div>)}

      {showAdd&&(<div className="bg-white rounded-xl border border-kira-100 p-4 mb-4 animate-fade-in"><div className="flex justify-between items-center mb-3"><h3 className="text-sm font-semibold text-gray-700">Nuevo Proveedor</h3><button onClick={()=>setShowAdd(false)}><X size={14} className="text-gray-400"/></button></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><input placeholder="Nombre *" value={formProv.nombre} onChange={e=>setFormProv(f=>({...f,nombre:e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"/><select value={formProv.tipo} onChange={e=>setFormProv(f=>({...f,tipo:e.target.value as any}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="mercaderia">Mercadería</option><option value="servicio">Servicio</option></select><input placeholder="CUIT" value={formProv.cuit} onChange={e=>setFormProv(f=>({...f,cuit:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/>{formProv.tipo==='servicio'&&(<><select value={formProv.frecuencia_pago} onChange={e=>setFormProv(f=>({...f,frecuencia_pago:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">Frecuencia</option><option value="mensual">Mensual</option><option value="bimestral">Bimestral</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select><input type="date" value={formProv.proximo_vencimiento} onChange={e=>setFormProv(f=>({...f,proximo_vencimiento:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"/></>)}<button onClick={saveProv} disabled={!formProv.nombre} className="px-4 py-2 rounded-lg bg-kira-500 text-white text-sm font-medium hover:bg-kira-600 disabled:opacity-40 flex items-center justify-center gap-2"><Save size={14}/>Guardar</button></div></div>)}

      <div className="flex flex-col sm:flex-row gap-3 mb-4"><div className="flex-1 relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" placeholder="Buscar proveedor..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-kira-400/30 placeholder:text-gray-400"/></div><div className="flex gap-2">{(['todos','mercaderia','servicio'] as const).map(f=>(<button key={f} onClick={()=>setFiltroTipo(f)} className={cn("px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize",filtroTipo===f?"bg-kira-500 text-white":"bg-white border border-gray-200 text-gray-500 hover:bg-gray-50")}>{f==='todos'?'Todos':f==='mercaderia'?'Mercadería':'Servicios'}</button>))}</div></div>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {loading?<div className="px-4 py-12 text-center text-gray-400 text-sm">Cargando...</div>:
        provsFiltrados.length===0?<div className="px-4 py-12 text-center text-gray-400 text-sm"><Building2 size={32} className="mx-auto mb-2 text-gray-300"/>Sin proveedores</div>:
        provsFiltrados.map(p=>(<button key={p.id} onClick={()=>openDetalle(p)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-kira-50/30 transition-colors"><div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",p.tipo==='mercaderia'?"bg-kira-100":"bg-blue-100")}>{p.tipo==='mercaderia'?<Building2 size={16} className="text-kira-600"/>:<Zap size={16} className="text-blue-600"/>}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{p.nombre}</p><p className="text-xs text-gray-400 capitalize">{p.tipo}{p.cuit&&` · ${p.cuit}`}{p.tipo==='servicio'&&p.frecuencia_pago&&` · ${p.frecuencia_pago}`}{p.tipo==='servicio'&&p.proximo_vencimiento&&<span className={cn("ml-1",new Date(p.proximo_vencimiento)<=new Date()?"text-red-500 font-semibold":"")}> · Vence: {p.proximo_vencimiento}</span>}</p></div><ChevronRight size={14} className="text-gray-300"/></button>))}
      </div>
    </div></div>
  )
}
