import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kira Home - Sistema de Gestión',
  description: 'Sistema de gestión de stock y ventas para Kira Home Bazar & Deco',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
