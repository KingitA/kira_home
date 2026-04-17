'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Articulo, CarritoItem, MetodoPago, METODO_PAGO_LABELS, Comision, Posnet, PosnetComision } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, CheckCircle2, AlertCircle, X, Package, ArrowLeft, UtensilsCrossed, Sofa, Lamp, Coffee, Bath, Wallet } from 'lucide-react'

interface Props { onVentaCompleta: () => void }
const IllCocina=()=>(<svg viewBox="0 0 120 80" className="w-full h-full" fill="none"><ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="25" y="40" width="40" height="8" rx="4" fill="currentColor" opacity="0.25"/><rect x="25" y="35" width="40" height="10" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/><line x1="65" y1="40" x2="85" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/><path d="M35 30Q37 24 35 18" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round"/><path d="M43 28Q45 22 43 16" stroke="currentColor" strokeWidth="1" opacity="0.15" fill="none" strokeLinecap="round"/></svg>)
const IllVajilla=()=>(<svg viewBox="0 0 120 80" className="w-full h-full" fill="none"><ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><path d="M30 30L30 55Q30 65 45 65L55 65Q70 65 70 55L70 30Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15"/><path d="M70 38Q82 38 82 48Q82 58 70 58" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3"/></svg>)
const IllDeco=()=>(<svg viewBox="0 0 120 80" className="w-full h-full" fill="none"><ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><path d="M45 70L48 45Q42 40 42 35Q42 28 50 28L60 28Q68 28 68 35Q68 40 62 45L65 70Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/><circle cx="50" cy="20" r="5" fill="currentColor" opacity="0.2"/><circle cx="60" cy="16" r="5" fill="currentColor" opacity="0.15"/></svg>)
const IllTextil=()=>(<svg viewBox="0 0 120 80" className="w-full h-full" fill="none"><ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="15" y="30" width="35" height="28" rx="8" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/><path d="M60 65L60 35Q60 28 68 28L95 28Q102 28 102 35L102 65" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.1"/></svg>)
const IllTermos=()=>(<svg viewBox="0 0 120 80" className="w-full h-full" fill="none"><ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="30" y="18" width="16" height="50" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/><rect x="30" y="18" width="16" height="10" rx="4" fill="currentColor" opacity="0.25"/><path d="M65 40Q60 40 58 50Q56 65 65 68L80 68Q89 65 87 50Q85 40 80 40Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/><line x1="72" y1="42" x2="75" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/></svg>)
const IllBano=()=>(<svg viewBox="0 0 120 80" className="w-full h-full" fill="none"><ellipse cx="60" cy="72" rx="50" ry="4" fill="currentColor" opacity="0.1"/><rect x="25" y="35" width="20" height="30" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/><rect x="32" y="25" width="6" height="12" rx="2" fill="currentColor" opacity="0.2"/><rect x="60" y="28" width="30" height="38" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5"/></svg>)

const CATEGORIAS=[
  {id:'cocina',nombre:'Cocina',keywords:['sarten','cacerola','olla','wok','hervidor','pava','cafetera','jarra','botella','fuente','molde','tabla','rallador','escurridor','especiero','dispenser','contenedor','portarollo','repasador','vaso termico','yerbero','azucarero','bateria','bifera','abrelata','aceitero','afilador','cuchillo','tenedor','cuchara','cucharita','espumadera','espatula','pinza','colador','hudson','tramontina'],bg:'bg-amber-50 border-amber-200',text:'text-amber-800',accent:'text-amber-600',Ill:IllCocina},
  {id:'vajilla',nombre:'Vajilla',keywords:['plato','bowl','taza','vaso','copa','jarro','mug','vassa','set de','juego de'],bg:'bg-sky-50 border-sky-200',text:'text-sky-800',accent:'text-sky-600',Ill:IllVajilla},
  {id:'decoracion',nombre:'Decoración',keywords:['adorno','florero','jarron','maceta','planta','cuadro','espejo','reloj','vela','posavela','portarretrato','posavaso','plato de sitio','bandeja','cesto','organizador','canasto','lampara'],bg:'bg-rose-50 border-rose-200',text:'text-rose-800',accent:'text-rose-600',Ill:IllDeco},
  {id:'textil',nombre:'Textil',keywords:['alfombra','almohadon','almohada','manta','mantel','camino','cortina','individual','pie de cama','felpudo','funda','matero'],bg:'bg-violet-50 border-violet-200',text:'text-violet-800',accent:'text-violet-600',Ill:IllTextil},
  {id:'termos',nombre:'Termos y Mates',keywords:['termo','mate ','bombilla'],bg:'bg-emerald-50 border-emerald-200',text:'text-emerald-800',accent:'text-emerald-600',Ill:IllTermos},
  {id:'baño',nombre:'Baño',keywords:['baño','jabonera','cesto de basura','portacepillo'],bg:'bg-cyan-50 border-cyan-200',text:'text-cyan-800',accent:'text-cyan-600',Ill:IllBano},
]

interface PagoLine { metodo:MetodoPago; monto:string; cuotas:number; posnetId:number|null }

export default function VentasModule({ onVentaCompleta }: Props) {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Articulo[]>([])
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [ventaExitosa, setVentaExitosa] = useState(false)
  const [error, setError] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string|null>(null)
  const [descuentoContado, setDescuentoContado] = useState(false)
  const [descuentoTransf, setDescuentoTransf] = useState(false)
  const [pagos, setPagos] = useState<PagoLine[]>([{metodo:'efectivo',monto:'',cuotas:1,posnetId:null}])
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [posnets, setPosnets] = useState<Posnet[]>([])
  const [posnetComs, setPosnetComs] = useState<PosnetComision[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{fetchArticulos();fetchComisiones();fetchPosnets()},[])
  async function fetchArticulos(){const{data}=await supabase.from('articulos').select('*').eq('activo',true).gt('cantidad',0).order('descripcion');if(data)setArticulos(data)}
  async function fetchComisiones(){const{data}=await supabase.from('comisiones').select('*').eq('activo',true);if(data)setComisiones(data)}
  async function fetchPosnets(){
    const{data:p}=await supabase.from('posnets').select('*').eq('activo',true).order('nombre')
    if(p)setPosnets(p)
    const{data:pc}=await supabase.from('posnet_comisiones').select('*').eq('activo',true)
    if(pc)setPosnetComs(pc)
  }

  useEffect(()=>{
    if(search.length>=2){const q=search.toLowerCase();setResults(articulos.filter(a=>a.descripcion.toLowerCase().includes(q)||a.codigo?.toLowerCase().includes(q)||a.proveedor?.toLowerCase().includes(q)).slice(0,15))}
    else if(categoriaActiva&&categoriaActiva!=='todos'){const cat=CATEGORIAS.find(c=>c.id===categoriaActiva);if(cat)setResults(articulos.filter(a=>{const d=a.descripcion.toLowerCase(),n=(a.nota||'').toLowerCase();return cat.keywords.some(k=>d.includes(k)||n.includes(k))}))}
    else if(categoriaActiva==='todos')setResults(articulos)
    else setResults([])
  },[search,articulos,categoriaActiva])

  function addToCart(a:Articulo){setCarrito(prev=>{const ex=prev.find(i=>i.articulo.id===a.id);if(ex){if(ex.cantidad>=a.cantidad){setError(`Stock máx: ${a.cantidad}`);setTimeout(()=>setError(''),2500);return prev}return prev.map(i=>i.articulo.id===a.id?{...i,cantidad:i.cantidad+1}:i)}return[...prev,{articulo:a,cantidad:1}]});setSearch('');if(!categoriaActiva)setResults([])}
  function updateQty(id:number,d:number){setCarrito(prev=>prev.map(i=>{if(i.articulo.id!==id)return i;const q=i.cantidad+d;if(q<=0||q>i.articulo.cantidad)return i;return{...i,cantidad:q}}))}
  const removeFromCart=(id:number)=>setCarrito(prev=>prev.filter(i=>i.articulo.id!==id))
  const clearCart=()=>{setCarrito([]);setPagos([{metodo:'efectivo',monto:'',cuotas:1,posnetId:null}]);setError('');setDescuentoContado(false);setDescuentoTransf(false)}

  const subtotal=carrito.reduce((s,i)=>s+(i.articulo.precio_venta*i.cantidad),0)
  const descuentoMonto=descuentoContado?subtotal*0.10:descuentoTransf?subtotal*0.05:0
  const total=subtotal-descuentoMonto
  const totalItems=carrito.reduce((s,i)=>s+i.cantidad,0)
  const totalPagado=pagos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0)
  const ajuste=totalPagado-total

  function addPago(){setPagos(p=>[...p,{metodo:'transferencia',monto:'',cuotas:1,posnetId:null}])}
  function removePago(idx:number){setPagos(p=>p.filter((_,i)=>i!==idx))}
  function updatePago(idx:number,field:string,val:any){setPagos(p=>p.map((x,i)=>i===idx?{...x,[field]:val}:x))}
  function setTodo(idx:number){const other=pagos.reduce((s,p,i)=>i===idx?s:s+(parseFloat(p.monto)||0),0);updatePago(idx,'monto',(total-other).toString())}

  // Get commission for a payment line
  function getComisionForPago(p:PagoLine):{pct:number;label:string} {
    const isTarjeta = p.metodo==='tarjeta_debito'||p.metodo==='tarjeta_credito'
    if(!isTarjeta||!p.posnetId) {
      // Use generic comisiones for non-tarjeta
      const gen = comisiones.filter(c=>c.tipo_billetera===p.metodo)
      if(p.metodo==='tarjeta_credito'){const s=gen.find(c=>c.cuotas===p.cuotas);if(s)return{pct:s.porcentaje,label:s.descripcion||`${s.porcentaje}%`}}
      const g=gen.find(c=>!c.cuotas);if(g)return{pct:g.porcentaje,label:g.descripcion||`${g.porcentaje}%`}
      return{pct:0,label:''}
    }
    // Posnet comisiones
    const tipo = p.metodo==='tarjeta_debito'?'debito':'credito'
    const pcs = posnetComs.filter(pc=>pc.posnet_id===p.posnetId&&pc.tipo===tipo)
    // For credito, find matching cuotas or closest
    if(tipo==='credito'){
      const exact=pcs.find(pc=>pc.cuotas===p.cuotas)
      if(exact)return{pct:exact.porcentaje,label:`${posnets.find(x=>x.id===p.posnetId)?.nombre} ${exact.porcentaje}%`}
      // Fallback to cuotas=1
      const base=pcs.find(pc=>pc.cuotas===1)
      if(base)return{pct:base.porcentaje,label:`${posnets.find(x=>x.id===p.posnetId)?.nombre} ${base.porcentaje}%`}
    }
    const base=pcs[0]
    if(base)return{pct:base.porcentaje,label:`${posnets.find(x=>x.id===p.posnetId)?.nombre} ${base.porcentaje}%`}
    return{pct:0,label:''}
  }

  const totalComision=pagos.reduce((s,p)=>{const m=parseFloat(p.monto)||0;const{pct}=getComisionForPago(p);return s+(m*pct/100)},0)
  const netoReal=totalPagado-totalComision

  async function procesarVenta(){
    if(carrito.length===0||totalPagado<=0){setError('Ingresá el monto de pago');return}
    setProcessing(true);setError('')
    try{
      const mainPago=pagos.reduce((a,b)=>(parseFloat(b.monto)||0)>(parseFloat(a.monto)||0)?b:a)
      const notaParts:string[]=[]
      if(pagos.length>1){const desc=pagos.filter(p=>parseFloat(p.monto)>0).map(p=>{let s=`${METODO_PAGO_LABELS[p.metodo]} ${formatCurrency(parseFloat(p.monto)||0)}`;if((p.metodo==='tarjeta_debito'||p.metodo==='tarjeta_credito')&&p.posnetId){const pn=posnets.find(x=>x.id===p.posnetId);if(pn)s+=` (${pn.nombre})`}if(p.metodo==='tarjeta_credito'&&p.cuotas>1)s+=` ${p.cuotas}c`;return s}).join(' + ');notaParts.push(`Pago: ${desc}`)}
      else{if((mainPago.metodo==='tarjeta_debito'||mainPago.metodo==='tarjeta_credito')&&mainPago.posnetId){const pn=posnets.find(x=>x.id===mainPago.posnetId);if(pn)notaParts.push(`Posnet: ${pn.nombre}`)}if(mainPago.metodo==='tarjeta_credito'&&mainPago.cuotas>1)notaParts.push(`${mainPago.cuotas} cuotas`)}
      if(descuentoContado)notaParts.push(`Dto contado 10%: -${formatCurrency(descuentoMonto)}`)
      if(descuentoTransf)notaParts.push(`Dto transf 5%: -${formatCurrency(descuentoMonto)}`)
      if(totalComision>0)notaParts.push(`Comisión posnet: -${formatCurrency(totalComision)}`)
      if(ajuste!==0)notaParts.push(`Ajuste: ${formatCurrency(ajuste)}`)

      const{data:venta,error:ve}=await supabase.from('ventas').insert([{total,metodo_pago:mainPago.metodo,cuotas:mainPago.metodo==='tarjeta_credito'?mainPago.cuotas:1,nota:notaParts.length>0?notaParts.join(' | '):null,comision:totalComision,neto:netoReal,posnet_id:mainPago.posnetId}]).select().single()
      if(ve)throw ve
      const items=carrito.map(i=>({venta_id:venta.id,articulo_id:i.articulo.id,cantidad:i.cantidad,precio_unitario:i.articulo.precio_venta,subtotal:i.articulo.precio_venta*i.cantidad}))
      const{error:ie}=await supabase.from('venta_items').insert(items);if(ie)throw ie
      for(const item of carrito)await supabase.from('articulos').update({cantidad:item.articulo.cantidad-item.cantidad}).eq('id',item.articulo.id)

      for(const p of pagos){const m=parseFloat(p.monto)||0;if(m<=0)continue;const{pct}=getComisionForPago(p);const neto=m-(m*pct/100);const{data:b}=await supabase.from('billetera').select('*').eq('tipo',p.metodo).single();if(b)await supabase.from('billetera').update({saldo:b.saldo+neto}).eq('id',b.id)}

      setVentaExitosa(true);setCarrito([]);setPagos([{metodo:'efectivo',monto:'',cuotas:1,posnetId:null}]);setDescuentoContado(false);setDescuentoTransf(false);fetchArticulos();onVentaCompleta()
      setTimeout(()=>setVentaExitosa(false),3000)
    }catch(err:any){setError(err.message||'Error')}finally{setProcessing(false)}
  }

  const countCat=(cat:typeof CATEGORIAS[0])=>articulos.filter(a=>{const d=a.descripcion.toLowerCase(),n=(a.nota||'').toLowerCase();return cat.keywords.some(k=>d.includes(k)||n.includes(k))}).length
  const isTarjeta=(m:MetodoPago)=>m==='tarjeta_debito'||m==='tarjeta_credito'
  const mpColors:Record<MetodoPago,string>={efectivo:'focus:ring-emerald-400/30',transferencia:'focus:ring-blue-400/30',tarjeta_debito:'focus:ring-purple-400/30',tarjeta_credito:'focus:ring-pink-400/30'}

  return(
    <div className="h-full flex flex-col lg:flex-row bg-botanical">
      <div className="flex-1 p-4 lg:p-6 overflow-auto relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-5"><h2 style={{fontFamily:'var(--font-display)'}} className="text-2xl font-semibold text-gray-900">Punto de Venta</h2><p className="text-sm text-gray-500 mt-1">Seleccioná una categoría o buscá artículos</p></div>
          <div className="relative mb-5"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><input ref={searchRef} type="text" placeholder="Buscar por nombre, código o proveedor..." value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value.length>=2)setCategoriaActiva(null)}} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-kira-400/30 focus:border-kira-400 placeholder:text-gray-400 shadow-sm"/>{search&&<button onClick={()=>{setSearch('');setResults([]);setCategoriaActiva(null)}} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"><X size={14} className="text-gray-400"/></button>}</div>
          {categoriaActiva&&!search&&<button onClick={()=>{setCategoriaActiva(null);setResults([])}} className="flex items-center gap-2 text-sm text-kira-600 hover:text-kira-700 mb-4 animate-fade-in"><ArrowLeft size={14}/>Volver</button>}
          {!categoriaActiva&&search.length<2&&(<div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6 animate-fade-in">{CATEGORIAS.map(cat=>(<button key={cat.id} onClick={()=>setCategoriaActiva(cat.id)} className={`group relative overflow-hidden rounded-xl border h-36 lg:h-40 text-left transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] ${cat.bg}`}><div className={`absolute top-2 right-2 w-20 h-20 lg:w-24 lg:h-24 ${cat.accent} opacity-60 group-hover:opacity-80 transition-opacity`}><cat.Ill/></div><div className="absolute inset-0 flex flex-col justify-end p-3.5"><h3 className={`font-semibold text-sm lg:text-base ${cat.text}`}>{cat.nombre}</h3><p className={`text-[11px] ${cat.accent} opacity-70`}>{countCat(cat)} prod.</p></div></button>))}<button onClick={()=>setCategoriaActiva('todos')} className="group relative overflow-hidden rounded-xl border border-gray-200 h-36 lg:h-40 text-left transition-all hover:scale-[1.02] hover:shadow-md bg-white"><div className="absolute top-3 right-3 text-gray-300 opacity-40"><Package size={48}/></div><div className="absolute inset-0 flex flex-col justify-end p-3.5"><h3 className="font-semibold text-sm lg:text-base text-gray-700">Ver Todo</h3><p className="text-[11px] text-gray-400">{articulos.length} prod.</p></div></button></div>)}
          {results.length>0&&(<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in"><div className="max-h-[55vh] overflow-auto divide-y divide-gray-50">{results.map(a=>{const ic=carrito.find(i=>i.articulo.id===a.id);const rem=a.cantidad-(ic?.cantidad??0);return(<button key={a.id} onClick={()=>addToCart(a)} disabled={rem<=0} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",rem<=0?"opacity-40 cursor-not-allowed":"hover:bg-kira-50/50")}><div className="w-8 h-8 rounded-lg bg-kira-100 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-kira-600"/></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{a.descripcion}</p><p className="text-xs text-gray-400">{a.codigo&&`${a.codigo} · `}{a.proveedor}{ic&&<span className="text-kira-500 ml-1">· {ic.cantidad} en carrito</span>}</p></div><div className="text-right flex-shrink-0"><p className="text-sm font-semibold text-gray-800">{formatCurrency(a.precio_venta)}</p><p className={cn("text-[10px]",rem<=2?"text-amber-500":"text-gray-400")}>Stock: {rem}</p></div><Plus size={16} className="text-gray-300 flex-shrink-0"/></button>)})}</div></div>)}
          {search.length>=2&&results.length===0&&<div className="text-center py-8 text-gray-400 text-sm animate-fade-in"><Package size={28} className="mx-auto mb-2 text-gray-300"/>Sin resultados</div>}
        </div>
      </div>

      {/* Cart */}
      <div className="w-full lg:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col relative z-10">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><ShoppingCart size={16} className="text-gray-400"/><h3 className="text-sm font-semibold text-gray-700">Venta actual</h3>{totalItems>0&&<span className="bg-kira-100 text-kira-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{totalItems}</span>}</div>
          {carrito.length>0&&<button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 hover:underline">Vaciar</button>}
        </div>
        <div className="flex-1 overflow-auto px-4 py-2">
          {carrito.length===0?<div className="flex items-center justify-center h-full text-gray-300 text-sm">Carrito vacío</div>:
          <div className="space-y-2">{carrito.map((item,idx)=>(<div key={item.articulo.id} className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg animate-slide-in" style={{animationDelay:`${idx*50}ms`}}><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{item.articulo.descripcion}</p><p className="text-xs text-gray-400">{formatCurrency(item.articulo.precio_venta)} c/u</p></div><div className="flex items-center gap-1.5"><button onClick={()=>updateQty(item.articulo.id,-1)} disabled={item.cantidad<=1} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Minus size={12}/></button><span className="w-8 text-center text-sm font-semibold text-gray-700">{item.cantidad}</span><button onClick={()=>updateQty(item.articulo.id,1)} disabled={item.cantidad>=item.articulo.cantidad} className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Plus size={12}/></button></div><p className="text-sm font-semibold text-gray-800 w-20 text-right">{formatCurrency(item.articulo.precio_venta*item.cantidad)}</p><button onClick={()=>removeFromCart(item.articulo.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={13}/></button></div>))}</div>}
        </div>
        {carrito.length>0&&(
          <div className="border-t border-gray-100 px-4 py-4 space-y-3 max-h-[60vh] overflow-auto">
            <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Subtotal ({totalItems} art.)</span><span className="text-sm text-gray-700">{formatCurrency(subtotal)}</span></div>

            {/* Discounts */}
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer group flex-1"><input type="checkbox" checked={descuentoContado} onChange={e=>{setDescuentoContado(e.target.checked);if(e.target.checked){setDescuentoTransf(false);if(pagos.length===1){updatePago(0,'metodo','efectivo');updatePago(0,'monto',(subtotal*0.9).toString())}}}} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"/><Banknote size={12} className="text-emerald-500"/><span className="text-[11px] text-gray-600 group-hover:text-gray-800">Dto. contado 10%</span></label>
              <label className="flex items-center gap-1.5 cursor-pointer group flex-1"><input type="checkbox" checked={descuentoTransf} onChange={e=>{setDescuentoTransf(e.target.checked);if(e.target.checked){setDescuentoContado(false);if(pagos.length===1){updatePago(0,'metodo','transferencia');updatePago(0,'monto',(subtotal*0.95).toString())}}}} className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"/><CreditCard size={12} className="text-blue-500"/><span className="text-[11px] text-gray-600 group-hover:text-gray-800">Dto. transf. 5%</span></label>
            </div>
            {(descuentoContado||descuentoTransf)&&<div className="flex items-center justify-between"><span className="text-xs text-gray-400">{descuentoContado?'Descuento contado 10%':'Descuento transferencia 5%'}</span><span className="text-xs font-semibold text-emerald-600">-{formatCurrency(descuentoMonto)}</span></div>}

            <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-700">Total</span><span style={{fontFamily:'var(--font-display)'}} className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span></div>

            {/* Payment methods */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Forma de pago</p>
                {pagos.length<4&&<button onClick={addPago} className="text-[10px] text-kira-600 hover:underline flex items-center gap-0.5"><Plus size={10}/>Agregar</button>}
              </div>
              <div className="space-y-2">
                {pagos.map((p,idx)=>{
                  const{pct,label:comLabel}=getComisionForPago(p)
                  const montoNum=parseFloat(p.monto)||0
                  const comMonto=montoNum*pct/100
                  return(
                    <div key={idx} className="space-y-1.5 pb-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <select value={p.metodo} onChange={e=>{updatePago(idx,'metodo',e.target.value);if(!isTarjeta(e.target.value as MetodoPago))updatePago(idx,'posnetId',null)}}
                          className="w-32 px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-kira-400/30">
                          <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta_debito">T. Débito</option><option value="tarjeta_credito">T. Crédito</option>
                        </select>
                        <div className="relative flex-1"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                          <input type="number" placeholder="0" value={p.monto} onChange={e=>updatePago(idx,'monto',e.target.value)}
                            className={`w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 ${mpColors[p.metodo]}`}/>
                        </div>
                        {pagos.length===1?<button onClick={()=>setTodo(0)} className="text-[10px] text-emerald-600 hover:underline whitespace-nowrap">Todo</button>
                        :<button onClick={()=>removePago(idx)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400"><X size={14}/></button>}
                      </div>

                      {/* Posnet selection for tarjeta */}
                      {isTarjeta(p.metodo)&&(
                        <div className="flex items-center gap-2 ml-1">
                          <span className="text-[10px] text-gray-400">Posnet:</span>
                          {posnets.map(pos=>(
                            <button key={pos.id} onClick={()=>updatePago(idx,'posnetId',p.posnetId===pos.id?null:pos.id)}
                              className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-colors border",
                                p.posnetId===pos.id?"bg-purple-100 text-purple-700 border-purple-200":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100")}>
                              {pos.nombre}
                            </button>
                          ))}
                          {!p.posnetId&&<span className="text-[9px] text-amber-500">Seleccioná un posnet</span>}
                        </div>
                      )}

                      {/* Cuotas for credito */}
                      {p.metodo==='tarjeta_credito'&&(
                        <div className="flex items-center gap-2 ml-1">
                          <span className="text-[10px] text-gray-400">Cuotas:</span>
                          {[1,3,6,12].map(c=>(
                            <button key={c} onClick={()=>updatePago(idx,'cuotas',c)}
                              className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-colors border",
                                p.cuotas===c?"bg-pink-100 text-pink-700 border-pink-200":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100")}>
                              {c}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Show commission inline */}
                      {pct>0&&montoNum>0&&(
                        <div className="flex items-center justify-between ml-1 text-[10px]">
                          <span className="text-purple-500">Comisión {comLabel} ({pct}%)</span>
                          <span className="text-purple-600 font-semibold">-{formatCurrency(comMonto)} → Neto: {formatCurrency(montoNum-comMonto)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {totalPagado>0&&ajuste!==0&&(
                <div className={cn("flex items-center justify-between mt-2 px-2 py-1.5 rounded-lg text-xs",ajuste>0?"bg-amber-50 text-amber-700":"bg-red-50 text-red-600")}>
                  <span>{ajuste>0?'Vuelto / Ajuste':'Falta cobrar'}</span><span className="font-semibold">{formatCurrency(Math.abs(ajuste))}</span>
                </div>
              )}
              {totalComision>0&&(
                <div className="flex items-center justify-between mt-2 px-2 py-1.5 rounded-lg text-xs bg-purple-50 text-purple-700">
                  <span>Comisión total posnet</span><span className="font-semibold">-{formatCurrency(totalComision)}</span>
                </div>
              )}
              {totalComision>0&&(
                <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-500">
                  <span>Neto real en caja</span><span className="font-semibold text-gray-700">{formatCurrency(netoReal)}</span>
                </div>
              )}
            </div>

            {error&&<div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs animate-fade-in"><AlertCircle size={14}/>{error}</div>}
            <button onClick={procesarVenta} disabled={processing||totalPagado<=0}
              className={cn("w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2",
                processing||totalPagado<=0?"bg-gray-400 cursor-not-allowed":"bg-kira-500 hover:bg-kira-600 active:scale-[0.98] shadow-md shadow-kira-500/20")}>
              {processing?'Procesando...':<><CheckCircle2 size={16}/>Cerrar Venta — {formatCurrency(total)}</>}
            </button>
          </div>
        )}
        {ventaExitosa&&<div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in z-50"><CheckCircle2 size={20}/><div><p className="font-semibold text-sm">Venta registrada</p><p className="text-xs text-emerald-100">Stock y caja actualizados</p></div></div>}
      </div>
    </div>
  )
}
