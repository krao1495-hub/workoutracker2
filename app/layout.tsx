import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import CoachButton from '@/components/CoachButton'

export const metadata: Metadata = {
  title: 'Workout Tracker',
  description: 'Personal workout tracking with progressive overload',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Workout',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {/* Main scroll area — leaves room for bottom nav */}
        <main className="max-w-lg mx-auto px-4 pt-5 pb-24 min-h-screen">
          {children}
        </main>
        <BottomNav />
        <CoachButton />
      </body>
    </html>
  )
}
