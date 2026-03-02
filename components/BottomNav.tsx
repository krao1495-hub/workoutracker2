'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, Clock, TrendingUp, Settings, CalendarDays, UtensilsCrossed, Flame } from 'lucide-react'

const navItems = [
  { href: '/',          label: 'Today',    icon: Dumbbell        },
  { href: '/history',  label: 'History',  icon: Clock           },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays    },
  { href: '/progress', label: 'Progress', icon: TrendingUp      },
  { href: '/meals',    label: 'Meals',    icon: UtensilsCrossed },
  { href: '/stats',    label: 'Stats',    icon: Flame           },
  { href: '/settings', label: 'Settings', icon: Settings        },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-blue-600' : ''}`} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
