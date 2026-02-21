'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Users, 
  TestTube,
  PlayCircle,
  BarChart3,
  HelpCircle
} from 'lucide-react'

interface SidebarItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  description: string
  requiredRole?: string[]
}

const navigation: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and recent activity'
  },
  {
    name: 'Rules',
    href: '/dashboard/rules',
    icon: FileText,
    description: 'Manage eCR rules and conditions',
    requiredRole: ['ADMIN', 'BUILDER']
  },
  {
    name: 'FHIR Testing',
    href: '/dashboard/rules/fhir-testing',
    icon: TestTube,
    description: 'Test FHIR validation and data extraction',
    requiredRole: ['ADMIN', 'BUILDER']
  },
  {
    name: 'Rule Testing',
    href: '/dashboard/testing',
    icon: PlayCircle,
    description: 'Test rules with sample data',
    requiredRole: ['ADMIN', 'BUILDER']
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    description: 'eCR generation and analytics'
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: Users,
    description: 'Manage organization users',
    requiredRole: ['ADMIN']
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Organization and system settings',
    requiredRole: ['ADMIN']
  },
]

const helpItems: SidebarItem[] = [
  {
    name: 'Documentation',
    href: '/docs',
    icon: HelpCircle,
    description: 'API docs and guides'
  }
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role

  const hasAccess = (requiredRole?: string[]) => {
    if (!requiredRole) return true
    if (!userRole) return false
    return requiredRole.includes(userRole)
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pt-6">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">eCR</span>
          </div>
          <span className="ml-2 text-lg font-semibold">Rule Builder</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  if (!hasAccess(item.requiredRole)) return null
                  
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold hover:bg-gray-50 transition-colors',
                          isActive(item.href)
                            ? 'bg-gray-50 text-blue-600'
                            : 'text-gray-700 hover:text-blue-600'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-6 w-6 shrink-0',
                            isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="truncate">{item.name}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="ml-2">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>

            {/* Help Section */}
            <li className="mt-auto">
              <div className="text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wider mb-2">
                Help & Support
              </div>
              <ul role="list" className="-mx-2 space-y-1">
                {helpItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    >
                      <item.icon className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-blue-600" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}