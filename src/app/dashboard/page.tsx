'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Plus,
  TrendingUp,
  Users,
  Activity,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalRules: number
  activeRules: number
  draftRules: number
  testingRules: number
  validRules: number
  totalUsers: number
  reportsGenerated: number
}

interface RecentRule {
  id: string
  name: string
  status: string
  category: string
  updatedAt: string
  createdBy: {
    name: string
  }
}

const getStatusColor = (status: string) => {
  const colors = {
    PUBLISHED: 'bg-green-100 text-green-800',
    DRAFT: 'bg-yellow-100 text-yellow-800',
    TESTING: 'bg-blue-100 text-blue-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
    ERROR: 'bg-red-100 text-red-800'
  }
  return colors[status as keyof typeof colors] || colors.DRAFT
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentRules, setRecentRules] = useState<RecentRule[]>([])
  const [loading, setLoading] = useState(true)
  const userRole = session?.user?.role
  const canCreateRules = userRole === 'ADMIN' || userRole === 'BUILDER'

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch rules for stats
        const rulesResponse = await fetch('/api/rules')
        if (rulesResponse.ok) {
          const rulesData = await rulesResponse.json()
          const rules = rulesData.rules

          // Calculate stats
          const dashboardStats: DashboardStats = {
            totalRules: rules.length,
            activeRules: rules.filter((r: any) => r.status === 'PUBLISHED').length,
            draftRules: rules.filter((r: any) => r.status === 'DRAFT').length,
            testingRules: rules.filter((r: any) => r.status === 'TESTING').length,
            validRules: rules.filter((r: any) => r.isValid).length,
            totalUsers: 0, // Will be updated when user management API is available
            reportsGenerated: 0 // Will be updated when reports API is available
          }

          setStats(dashboardStats)
          setRecentRules(rules.slice(0, 5)) // Show 5 most recent rules
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchDashboardData()
    }
  }, [session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your eCR rules today
          </p>
        </div>
        {canCreateRules && (
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link href="/dashboard/rules/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Rule
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRules || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeRules || 0} published, {stats?.draftRules || 0} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid Rules</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.validRules || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.totalRules > 0 
                ? `${Math.round((stats.validRules / stats.totalRules) * 100)}% validation rate`
                : 'No rules yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testing</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.testingRules || 0}</div>
            <p className="text-xs text-muted-foreground">
              Rules under testing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session?.user?.organizationName || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {session?.user?.role || 'Unknown'} access level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Rules</CardTitle>
            <CardDescription>
              Latest rules and modifications in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRules.length > 0 ? (
                recentRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {rule.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          by {rule.createdBy.name} • {new Date(rule.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(rule.status)}>
                      {rule.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No rules found. {canCreateRules && (
                    <Link href="/dashboard/rules/new" className="text-blue-600 hover:underline">
                      Create your first rule
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/dashboard/rules">
                <Button variant="ghost" className="w-full">
                  View All Rules
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Health and performance of your eCR system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Database Connection</p>
                    <p className="text-xs text-gray-500">PostgreSQL operational</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Healthy
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Authentication</p>
                    <p className="text-xs text-gray-500">NextAuth.js active</p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  Active
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-xs text-gray-500">
                      {session?.user ? 'Currently active' : 'Unknown'}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Online
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {canCreateRules && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get started with rule management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/dashboard/rules/new">
                <Button variant="outline" className="w-full h-auto flex-col py-4">
                  <Plus className="h-6 w-6 mb-2" />
                  <span>Create New Rule</span>
                  <span className="text-xs text-gray-500 mt-1">
                    Start building a new eCR rule
                  </span>
                </Button>
              </Link>
              
              <Link href="/dashboard/rules?status=DRAFT">
                <Button variant="outline" className="w-full h-auto flex-col py-4">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Review Drafts</span>
                  <span className="text-xs text-gray-500 mt-1">
                    {stats?.draftRules || 0} rules need attention
                  </span>
                </Button>
              </Link>
              
              <Link href="/dashboard/rules?status=TESTING">
                <Button variant="outline" className="w-full h-auto flex-col py-4">
                  <Activity className="h-6 w-6 mb-2" />
                  <span>Test Rules</span>
                  <span className="text-xs text-gray-500 mt-1">
                    {stats?.testingRules || 0} rules in testing
                  </span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}