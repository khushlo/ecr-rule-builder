'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, TestTube } from 'lucide-react'
import Link from 'next/link'

interface RuleForm {
  name: string
  description: string
  reportableCondition: string
  category: string
  priority: number
  conditions: string
  actions: string
}

export default function NewRulePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<RuleForm>({
    name: '',
    description: '',
    reportableCondition: '',
    category: '',
    priority: 5,
    conditions: '',
    actions: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          conditions: formData.conditions ? JSON.parse(formData.conditions) : {},
          actions: formData.actions ? JSON.parse(formData.actions) : {},
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create rule')
      }

      router.push('/dashboard/rules')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof RuleForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/rules">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Rules
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Rule</h1>
            <p className="text-gray-600">Build a new eCR rule for case detection</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Provide the basic details for your eCR rule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., COVID-19 Case Detection"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportableCondition">Reportable Condition *</Label>
                <Input
                  id="reportableCondition"
                  value={formData.reportableCondition}
                  onChange={(e) => handleInputChange('reportableCondition', e.target.value)}
                  placeholder="e.g., COVID-19"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this rule detects and when it triggers..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONDITION_DETECTION">Condition Detection</SelectItem>
                    <SelectItem value="DATA_VALIDATION">Data Validation</SelectItem>
                    <SelectItem value="ROUTING">Routing</SelectItem>
                    <SelectItem value="TRANSFORMATION">Transformation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select 
                  value={formData.priority.toString()} 
                  onValueChange={(value) => handleInputChange('priority', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Low</SelectItem>
                    <SelectItem value="3">3 - Medium-Low</SelectItem>
                    <SelectItem value="5">5 - Medium</SelectItem>
                    <SelectItem value="7">7 - High</SelectItem>
                    <SelectItem value="9">9 - Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rule Logic */}
        <Card>
          <CardHeader>
            <CardTitle>Rule Logic</CardTitle>
            <CardDescription>
              Define the conditions that trigger this rule and the resulting actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conditions">IF Conditions (JSON)</Label>
              <Textarea
                id="conditions"
                value={formData.conditions}
                onChange={(e) => handleInputChange('conditions', e.target.value)}
                placeholder={`{\n  "diagnosis": {\n    "code": "U07.1",\n    "system": "ICD-10"\n  },\n  "labResult": {\n    "test": "SARS-CoV-2",\n    "result": "positive"\n  }\n}`}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Define the FHIR-based conditions that will trigger this rule
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actions">THEN Actions (JSON)</Label>
              <Textarea
                id="actions"
                value={formData.actions}
                onChange={(e) => handleInputChange('actions', e.target.value)}
                placeholder={`{\n  "createReport": {\n    "template": "covid-19-initial",\n    "urgency": "immediate"\n  },\n  "notify": {\n    "departments": ["epidemiology"],\n    "method": "email"\n  }\n}`}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Define what actions to take when conditions are met
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link href="/dashboard/rules">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="outline" type="button">
            <TestTube className="mr-2 h-4 w-4" />
            Test Rule
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Creating...' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </div>
  )
}