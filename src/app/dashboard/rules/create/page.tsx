'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import VisualRuleBuilder from '@/components/rules/visual-rule-builder'
import { Sparkles, FileText, ArrowLeft, Save, AlertTriangle } from 'lucide-react'

const categoryOptions = [
  { value: 'CONDITION_DETECTION', label: 'Condition Detection', description: 'Detect specific medical conditions' },
  { value: 'OUTBREAK_MONITORING', label: 'Outbreak Monitoring', description: 'Monitor for disease outbreaks' },
  { value: 'CONTACT_TRACING', label: 'Contact Tracing', description: 'Track disease transmission' },
  { value: 'VACCINATION_STATUS', label: 'Vaccination Status', description: 'Monitor vaccination compliance' },
  { value: 'LAB_SURVEILLANCE', label: 'Laboratory Surveillance', description: 'Monitor lab results' },
  { value: 'SYNDROMIC_SURVEILLANCE', label: 'Syndromic Surveillance', description: 'Pattern-based monitoring' }
]

const jurisdictionOptions = [
  { value: 'US-CA', label: 'California' },
  { value: 'US-NY', label: 'New York' },
  { value: 'US-TX', label: 'Texas' },
  { value: 'US-FL', label: 'Florida' },
  { value: 'US-federal', label: 'Federal/CDC' }
]

interface RuleConditions {
  operator: 'AND' | 'OR' | 'NOT'
  rules: any[]
}

interface RuleActions {
  notifications?: any[]
  reporting?: any
  followUp?: any
}

export default function CreateRulePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('visual')
  const [isSaving, setIsSaving] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)

  // Rule metadata
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [priority, setPriority] = useState('MEDIUM')

  // Rule content
  const [visualConditions, setVisualConditions] = useState<RuleConditions>({ operator: 'AND', rules: [] })
  const [visualActions, setVisualActions] = useState<RuleActions>({})
  const [jsonRule, setJsonRule] = useState('')

  const convertVisualToJson = (conditions: RuleConditions, actions: RuleActions) => {
    return {
      conditions: {
        operator: conditions.operator,
        rules: conditions.rules.map(rule => ({
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
          system: rule.system
        }))
      },
      actions: {
        notifications: actions.notifications?.map(notification => ({
          type: notification.type,
          recipients: notification.recipients,
          urgency: notification.urgency,
          template: notification.template
        })),
        reporting: actions.reporting ? {
          generateECR: actions.reporting.generateECR,
          template: actions.reporting.template,
          autoSubmit: actions.reporting.autoSubmit,
          recipients: actions.reporting.recipients
        } : undefined,
        followUp: actions.followUp ? {
          createTask: actions.followUp.createTask,
          assignTo: actions.followUp.assignTo,
          dueDate: actions.followUp.dueDate
        } : undefined
      }
    }
  }

  const handleVisualRuleChange = (conditions: RuleConditions, actions: RuleActions) => {
    setVisualConditions(conditions)
    setVisualActions(actions)
    const json = convertVisualToJson(conditions, actions)
    setJsonRule(JSON.stringify(json, null, 2))
  }

  const handleValidateRule = async (conditions: RuleConditions, actions: RuleActions) => {
    try {
      const ruleData = convertVisualToJson(conditions, actions)
      
      const response = await fetch('/api/rules/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      })

      const result = await response.json()
      setValidationResult(result)
      return result
    } catch (error) {
      console.error('Validation error:', error)
      toast({
        title: 'Validation Error',
        description: 'Failed to validate rule. Please check your configuration.',
        variant: 'destructive'
      })
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a name for the rule.',
        variant: 'destructive'
      })
      return
    }

    if (!category) {
      toast({
        title: 'Missing Information',
        description: 'Please select a category for the rule.',
        variant: 'destructive'
      })
      return
    }

    if (visualConditions.rules.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please add at least one condition to the rule.',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)
    
    try {
      const ruleData = {
        name: name.trim(),
        description: description.trim(),
        category,
        jurisdiction: jurisdiction || 'US-federal',
        priority,
        isActive: true,
        ruleDefinition: activeTab === 'visual' 
          ? convertVisualToJson(visualConditions, visualActions)
          : JSON.parse(jsonRule)
      }

      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create rule')
      }

      const result = await response.json()

      toast({
        title: 'Rule Created',
        description: `Successfully created rule "${name}"`,
      })

      router.push(`/dashboard/rules/${result.id}`)
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Save Error',
        description: error instanceof Error ? error.message : 'Failed to save rule',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isValidJson = () => {
    try {
      JSON.parse(jsonRule)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Rule</h1>
            <p className="text-muted-foreground">
              Define conditions and actions for electronic case reporting
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {validationResult && (
            <div className="flex items-center gap-2">
              <Badge 
                className={
                  validationResult.isValid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }
              >
                {validationResult.isValid ? 'Valid' : 'Invalid'}
              </Badge>
              {validationResult.validation?.overall?.warnings?.length > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {validationResult.validation.overall.warnings.length} Warning(s)
                </Badge>
              )}
            </div>
          )}
          
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Rule'}
          </Button>
        </div>
      </div>

      {/* Rule Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Rule Information</CardTitle>
          <CardDescription>
            Basic information about your rule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., COVID-19 Positive Lab Result"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Select value={jurisdiction} onValueChange={setJurisdiction}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  {jurisdictionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this rule does and when it should trigger..."
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rule Builder */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Visual Builder
          </TabsTrigger>
          <TabsTrigger value="json" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            JSON Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual">
          <VisualRuleBuilder
            initialConditions={visualConditions}
            initialActions={visualActions}
            onChange={handleVisualRuleChange}
            onValidate={handleValidateRule}
          />
        </TabsContent>

        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle>JSON Rule Definition</CardTitle>
              <CardDescription>
                Advanced: Edit the rule definition as JSON
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={jsonRule}
                  onChange={(e) => setJsonRule(e.target.value)}
                  placeholder="Paste or edit JSON rule definition..."
                  className="font-mono text-sm"
                  rows={20}
                />
                
                {jsonRule && (
                  <div className="flex items-center gap-2">
                    <Badge className={isValidJson() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {isValidJson() ? 'Valid JSON' : 'Invalid JSON'}
                    </Badge>
                    
                    {isValidJson() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const result = await fetch('/api/rules/validate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: jsonRule,
                            })
                            const validation = await result.json()
                            setValidationResult(validation)
                          } catch (error) {
                            toast({
                              title: 'Validation Error',
                              description: 'Failed to validate JSON rule',
                              variant: 'destructive'
                            })
                          }
                        }}
                      >
                        Validate JSON
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}