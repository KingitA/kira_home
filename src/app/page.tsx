'use client'

import { useState, useEffect } from 'react'
import { supabase, Billetera } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import ArticulosModule from '@/components/ArticulosModule'
import VentasModule from '@/components/VentasModule'
import HistorialVentas from '@/components/HistorialVentas'
import ProveedoresModule from '@/components/ProveedoresModule'
import {
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  ChevronRight,
  Home,
  Menu,
  X,
  Building2,
} from 'lucide-react'

type Module = 'articulos' | 'ventas' | 'historial' | 'proveedores'

export default function HomePage() {
  const [activeModule, setActiveModule] = useState<Module>('ventas')
  const [billetera, setBilletera] = useState<Billetera[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetchBilletera()
    const channel = supabase
      .channel('billetera-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billetera' }, () => {
        fetchBilletera()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchBilletera() {
    const { data } = await supabase.from('billetera').select('*').order('id')
    if (data) setBilletera(data)
  }

  const efectivo = billetera.find(b => b.tipo === 'efectivo')?.saldo ?? 0
  const transferencia = billetera.find(b => b.tipo === 'transferencia')?.saldo ?? 0
  const tdebito = billetera.find(b => b.tipo === 'tarjeta_debito')?.saldo ?? 0
  const tcredito = billetera.find(b => b.tipo === 'tarjeta_credito')?.saldo ?? 0

  const modules = [
    { id: 'ventas' as Module, label: 'Punto de Venta', icon: ShoppingCart, desc: 'Registrar ventas' },
    { id: 'articulos' as Module, label: 'Artículos', icon: Package, desc: 'Gestionar stock' },
    { id: 'proveedores' as Module, label: 'Proveedores', icon: Building2, desc: 'CC y compras' },
    { id: 'historial' as Module, label: 'Historial', icon: Receipt, desc: 'Ventas realizadas' },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 bg-[#1c1917] text-white flex flex-col
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-kira-400 flex items-center justify-center">
                <Home size={18} className="text-white" />
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold tracking-tight">
                  Kira Home
                </h1>
                <p className="text-[11px] text-white/40 tracking-widest uppercase">Bazar & Deco</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {modules.map((m) => {
            const active = activeModule === m.id
            return (
              <button
                key={m.id}
                onClick={() => { setActiveModule(m.id); setSidebarOpen(false) }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-all duration-150 group
                  ${active
                    ? 'bg-kira-400/20 text-kira-300'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                  }
                `}
              >
                <m.icon size={18} className={active ? 'text-kira-400' : 'text-white/40 group-hover:text-white/60'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-[11px] opacity-50">{m.desc}</p>
                </div>
                {active && <ChevronRight size={14} className="text-kira-400" />}
              </button>
            )
          })}
        </nav>

        {/* Billetera */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} className="text-white/40" />
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Caja</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <span className="text-xs text-white/50">Efectivo</span>
              <span className="text-sm font-semibold text-emerald-400">
                {formatCurrency(efectivo)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <span className="text-xs text-white/50">Transferencia</span>
              <span className="text-sm font-semibold text-blue-400">
                {formatCurrency(transferencia)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <span className="text-xs text-white/50">T. Débito</span>
              <span className="text-sm font-semibold text-purple-400">
                {formatCurrency(tdebito)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <span className="text-xs text-white/50">T. Crédito</span>
              <span className="text-sm font-semibold text-pink-400">
                {formatCurrency(tcredito)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs text-white/30">Total</span>
              <span className="text-sm font-bold text-white/80">
                {formatCurrency(efectivo + transferencia + tdebito + tcredito)}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">
            Kira Home
          </h2>
          <div className="w-9" />
        </header>

        {/* Module content */}
        <div className="flex-1 overflow-auto">
          {activeModule === 'articulos' && <ArticulosModule />}
          {activeModule === 'ventas' && <VentasModule onVentaCompleta={fetchBilletera} />}
          {activeModule === 'historial' && <HistorialVentas />}
          {activeModule === 'proveedores' && <ProveedoresModule />}
        </div>
      </main>
    </div>
  )
}
