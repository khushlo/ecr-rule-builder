'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Play,
  Eye,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Rule {
  id: string
  name: string
  description?: string
  reportableCondition: string
  category: string
  status: string
  priority: number
  updatedAt: string
  createdBy: {
    name: string
  }
  version: number
  isValid: boolean
  _count: {
    executions: number
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

const getPriorityColor = (priority: number) => {
  if (priority >= 8) return 'bg-red-100 text-red-800'
  if (priority >= 5) return 'bg-yellow-100 text-yellow-800'
  return 'bg-green-100 text-green-800'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function RulesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [error, setError] = useState('')

  const canCreateRules = session?.user?.role === 'ADMIN' || session?.user?.role === 'BUILDER'

  const fetchRules = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/rules?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch rules')
      }

      const data = await response.json()
      setRules(data.rules)
    } catch (err) {
      setError('Failed to load rules')
      console.error('Error fetching rules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchRules()
    }
  }, [session, statusFilter, categoryFilter])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (session) {
        fetchRules()
      }
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, session])

  const handleArchiveRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to archive this rule?')) return

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to archive rule')
      }

      await fetchRules() // Refresh the list
    } catch (err) {
      alert('Failed to archive rule')
      console.error('Error archiving rule:', err)
    }
  }

  const handleDuplicateRule = async (rule: Rule) => {
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${rule.name} (Copy)`,
          description: rule.description,
          reportableCondition: rule.reportableCondition,
          category: rule.category,
          priority: rule.priority,
          conditions: {},
          actions: {}
        })
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate rule')
      }

      const data = await response.json()
      router.push(`/dashboard/rules/${data.rule.id}/edit`)
    } catch (err) {
      alert('Failed to duplicate rule')
      console.error('Error duplicating rule:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rules Management</h1>
          <p className="text-gray-600">Create and manage your eCR rules</p>
        </div>
        {canCreateRules && (
          <Link href="/dashboard/rules/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Rules</CardTitle>
          <CardDescription>Search and filter your rules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="TESTING">Testing</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="CONDITION_DETECTION">Condition Detection</SelectItem>
                <SelectItem value="DATA_VALIDATION">Data Validation</SelectItem>
                <SelectItem value="ROUTING">Routing</SelectItem>
                <SelectItem value="TRANSFORMATION">Transformation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rules ({rules.length})</CardTitle>
          <CardDescription>
            Manage your electronic case reporting rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">No rules found</div>
              {canCreateRules && (
                <Link href="/dashboard/rules/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Rule
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {rule.description || 'No description'}
                        </div>
                        <div className="text-xs text-gray-400">
                          v{rule.version} • {rule.createdBy.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rule.reportableCondition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {rule.category.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(rule.status)}>
                        {rule.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(rule.priority)}>
                        {rule.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {rule._count.executions} times
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(rule.updatedAt)}
                      </div>
                      <Badge className={rule.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {rule.isValid ? 'Valid' : 'Needs Review'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/rules/${rule.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canCreateRules && (
                            <>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/rules/${rule.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Rule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateRule(rule)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/rules/${rule.id}/test`)}>
                                <Play className="mr-2 h-4 w-4" />
                                Test Rule
                              </DropdownMenuItem>
                              {session?.user?.role === 'ADMIN' && (
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleArchiveRule(rule.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}