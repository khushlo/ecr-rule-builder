'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Save, Eye } from 'lucide-react'

interface ConditionRule {
  id: string
  field: string
  operator: string
  value: string | string[]
  system?: string
}

interface RuleConditions {
  operator: 'AND' | 'OR' | 'NOT'
  rules: ConditionRule[]
}

interface NotificationAction {
  type: 'email' | 'sms' | 'system'
  recipients: string[]
  urgency: 'immediate' | 'high' | 'routine'
  template?: string
}

interface RuleActions {
  notifications?: NotificationAction[]
  reporting?: {
    generateECR: boolean
    template?: string
    autoSubmit: boolean
    recipients?: string[]
  }
  followUp?: {
    createTask: boolean
    assignTo?: string
    dueDate?: string
  }
}

interface VisualRuleBuilderProps {
  initialConditions?: RuleConditions
  initialActions?: RuleActions
  onChange?: (conditions: RuleConditions, actions: RuleActions) => void
  onValidate?: (conditions: RuleConditions, actions: RuleActions) => Promise<any>
}

const fieldOptions = [
  { value: 'diagnosis.code', label: 'Diagnosis Code', group: 'Clinical' },
  { value: 'diagnosis.description', label: 'Diagnosis Description', group: 'Clinical' },
  { value: 'labResult.test', label: 'Lab Test Name', group: 'Laboratory' },
  { value: 'labResult.result', label: 'Lab Result', group: 'Laboratory' },
  { value: 'labResult.value', label: 'Lab Value', group: 'Laboratory' },
  { value: 'patient.age', label: 'Patient Age', group: 'Demographics' },
  { value: 'patient.gender', label: 'Patient Gender', group: 'Demographics' },
  { value: 'patient.address.state', label: 'Patient State', group: 'Demographics' },
  { value: 'encounter.class', label: 'Encounter Class', group: 'Encounter' },
  { value: 'encounter.type', label: 'Encounter Type', group: 'Encounter' },
]

const operatorOptions = [
  { value: 'EQUALS', label: 'Equals', description: 'Exact match' },
  { value: 'NOT_EQUALS', label: 'Not Equals', description: 'Does not match' },
  { value: 'CONTAINS', label: 'Contains', description: 'Contains text' },
  { value: 'NOT_CONTAINS', label: 'Does Not Contain', description: 'Does not contain text' },
  { value: 'STARTS_WITH', label: 'Starts With', description: 'Begins with text' },
  { value: 'ENDS_WITH', label: 'Ends With', description: 'Ends with text' },
  { value: 'IN', label: 'In List', description: 'Matches any value in list' },
  { value: 'NOT_IN', label: 'Not In List', description: 'Does not match any value in list' },
  { value: 'GREATER_THAN', label: 'Greater Than', description: 'Numeric comparison' },
  { value: 'LESS_THAN', label: 'Less Than', description: 'Numeric comparison' },
  { value: 'NOT_EMPTY', label: 'Is Not Empty', description: 'Has a value' },
  { value: 'IS_EMPTY', label: 'Is Empty', description: 'Has no value' },
]

export default function VisualRuleBuilder({ 
  initialConditions, 
  initialActions, 
  onChange,
  onValidate 
}: VisualRuleBuilderProps) {
  const [conditions, setConditions] = useState<RuleConditions>(
    initialConditions || { operator: 'AND', rules: [] }
  )
  const [actions, setActions] = useState<RuleActions>(initialActions || {})
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)

  const generateRuleId = () => `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const addConditionRule = () => {
    const newRule: ConditionRule = {
      id: generateRuleId(),
      field: '',
      operator: 'EQUALS',
      value: ''
    }
    const updatedConditions = {
      ...conditions,
      rules: [...conditions.rules, newRule]
    }
    setConditions(updatedConditions)
    onChange?.(updatedConditions, actions)
  }

  const updateConditionRule = (id: string, updates: Partial<ConditionRule>) => {
    const updatedConditions = {
      ...conditions,
      rules: conditions.rules.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      )
    }
    setConditions(updatedConditions)
    onChange?.(updatedConditions, actions)
  }

  const removeConditionRule = (id: string) => {
    const updatedConditions = {
      ...conditions,
      rules: conditions.rules.filter(rule => rule.id !== id)
    }
    setConditions(updatedConditions)
    onChange?.(updatedConditions, actions)
  }

  const updateConditionsOperator = (operator: 'AND' | 'OR' | 'NOT') => {
    const updatedConditions = { ...conditions, operator }
    setConditions(updatedConditions)
    onChange?.(updatedConditions, actions)
  }

  const addNotification = () => {
    const newNotification: NotificationAction = {
      type: 'email',
      recipients: [],
      urgency: 'routine'
    }
    const updatedActions = {
      ...actions,
      notifications: [...(actions.notifications || []), newNotification]
    }
    setActions(updatedActions)
    onChange?.(conditions, updatedActions)
  }

  const updateNotification = (index: number, updates: Partial<NotificationAction>) => {
    const updatedActions = {
      ...actions,
      notifications: (actions.notifications || []).map((notification, i) =>
        i === index ? { ...notification, ...updates } : notification
      )
    }
    setActions(updatedActions)
    onChange?.(conditions, updatedActions)
  }

  const removeNotification = (index: number) => {
    const updatedActions = {
      ...actions,
      notifications: (actions.notifications || []).filter((_, i) => i !== index)
    }
    setActions(updatedActions)
    onChange?.(conditions, updatedActions)
  }

  const handleValidate = async () => {
    if (!onValidate) return
    
    setIsValidating(true)
    try {
      const result = await onValidate(conditions, actions)
      setValidationResult(result)
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const getFieldLabel = (fieldValue: string) => {
    const field = fieldOptions.find(f => f.value === fieldValue)
    return field ? field.label : fieldValue
  }

  const getOperatorLabel = (operatorValue: string) => {
    const operator = operatorOptions.find(o => o.value === operatorValue)
    return operator ? operator.label : operatorValue
  }

  const requiresListInput = (operator: string) => {
    return ['IN', 'NOT_IN'].includes(operator)
  }

  const requiresNoInput = (operator: string) => {
    return ['NOT_EMPTY', 'IS_EMPTY'].includes(operator)
  }

  return (
    <div className="space-y-6">
      {/* Conditions Section */}
      <Card>
        <CardHeader>
          <CardTitle>IF Conditions</CardTitle>
          <CardDescription>
            Define the conditions that must be met for this rule to trigger
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Label>When</Label>
            <Select value={conditions.operator} onValueChange={updateConditionsOperator}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">ALL</SelectItem>
                <SelectItem value="OR">ANY</SelectItem>
                <SelectItem value="NOT">NONE</SelectItem>
              </SelectContent>
            </Select>
            <Label>of these conditions are met:</Label>
          </div>

          <div className="space-y-3">
            {conditions.rules.map((rule, index) => (
              <div key={rule.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                <span className="text-sm font-medium text-gray-500 w-8">{index + 1}.</span>
                
                {/* Field Selection */}
                <div className="flex-1">
                  <Select 
                    value={rule.field} 
                    onValueChange={(value) => updateConditionRule(rule.id, { field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.reduce((acc, field) => {
                        const group = field.group
                        if (!acc.find(item => item.group === group)) {
                          acc.push({ group, fields: [] })
                        }
                        acc.find(item => item.group === group)?.fields.push(field)
                        return acc
                      }, [] as any[]).map(group => (
                        <div key={group.group}>
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
                            {group.group}
                          </div>
                          {group.fields.map((field: any) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator Selection */}
                <div className="flex-1">
                  <Select 
                    value={rule.operator} 
                    onValueChange={(operator) => updateConditionRule(rule.id, { operator, value: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map(operator => (
                        <SelectItem key={operator.value} value={operator.value}>
                          <div>
                            <div>{operator.label}</div>
                            <div className="text-xs text-gray-500">{operator.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value Input */}
                {!requiresNoInput(rule.operator) && (
                  <div className="flex-1">
                    {requiresListInput(rule.operator) ? (
                      <Input
                        placeholder="value1, value2, value3"
                        value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}
                        onChange={(e) => {
                          const values = e.target.value.split(',').map(v => v.trim()).filter(v => v)
                          updateConditionRule(rule.id, { value: values })
                        }}
                      />
                    ) : (
                      <Input
                        placeholder="Value"
                        value={Array.isArray(rule.value) ? rule.value[0] || '' : rule.value}
                        onChange={(e) => updateConditionRule(rule.id, { value: e.target.value })}
                      />
                    )}
                  </div>
                )}

                {/* System/Coding Selection */}
                {rule.field.includes('diagnosis.code') && (
                  <div className="w-32">
                    <Select 
                      value={rule.system || ''} 
                      onValueChange={(system) => updateConditionRule(rule.id, { system })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="System" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ICD-10">ICD-10</SelectItem>
                        <SelectItem value="ICD-9">ICD-9</SelectItem>
                        <SelectItem value="SNOMED">SNOMED CT</SelectItem>
                        <SelectItem value="LOINC">LOINC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeConditionRule(rule.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addConditionRule} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Condition
          </Button>
        </CardContent>
      </Card>

      {/* Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle>THEN Actions</CardTitle>
          <CardDescription>
            Define what happens when the conditions are met
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Notifications</Label>
              <Button variant="outline" size="sm" onClick={addNotification}>
                <Plus className="mr-2 h-3 w-3" />
                Add Notification
              </Button>
            </div>
            
            {actions.notifications?.map((notification, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Select 
                    value={notification.type} 
                    onValueChange={(type: any) => updateNotification(index, { type })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="system">System Alert</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="recipient1@example.com, recipient2@example.com"
                    value={notification.recipients.join(', ')}
                    onChange={(e) => {
                      const recipients = e.target.value.split(',').map(r => r.trim()).filter(r => r)
                      updateNotification(index, { recipients })
                    }}
                    className="flex-1"
                  />

                  <Select 
                    value={notification.urgency} 
                    onValueChange={(urgency: any) => updateNotification(index, { urgency })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="routine">Routine</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNotification(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Reporting */}
          <div>
            <Label className="text-base font-medium">eCR Reporting</Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="generateECR"
                  checked={actions.reporting?.generateECR || false}
                  onChange={(e) => setActions({
                    ...actions,
                    reporting: { 
                      ...actions.reporting, 
                      generateECR: e.target.checked,
                      autoSubmit: actions.reporting?.autoSubmit || false
                    }
                  })}
                />
                <Label htmlFor="generateECR" className="text-sm font-normal">
                  Generate eCR Report
                </Label>
              </div>

              {actions.reporting?.generateECR && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoSubmit"
                      checked={actions.reporting?.autoSubmit || false}
                      onChange={(e) => setActions({
                        ...actions,
                        reporting: { 
                          ...actions.reporting, 
                          autoSubmit: e.target.checked,
                          generateECR: actions.reporting?.generateECR || false
                        }
                      })}
                    />
                    <Label htmlFor="autoSubmit" className="text-sm font-normal">
                      Auto-submit to health authorities
                    </Label>
                  </div>

                  <div>
                    <Label className="text-sm">Report Template</Label>
                    <Input
                      placeholder="e.g., covid-19-ecr"
                      value={actions.reporting?.template || ''}
                      onChange={(e) => setActions({
                        ...actions,
                        reporting: { 
                          ...actions.reporting, 
                          template: e.target.value,
                          generateECR: actions.reporting?.generateECR || false,
                          autoSubmit: actions.reporting?.autoSubmit || false
                        }
                      })}
                    />
                  </div>

                  {actions.reporting?.autoSubmit && (
                    <div>
                      <Label className="text-sm">Submit To (comma-separated)</Label>
                      <Input
                        placeholder="state-health@ca.gov, cdc@cdc.gov"
                        value={actions.reporting?.recipients?.join(', ') || ''}
                        onChange={(e) => {
                          const recipients = e.target.value.split(',').map(r => r.trim()).filter(r => r)
                          setActions({
                            ...actions,
                            reporting: { 
                              ...actions.reporting, 
                              recipients,
                              generateECR: actions.reporting?.generateECR || false,
                              autoSubmit: actions.reporting?.autoSubmit || false
                            }
                          })
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Follow-up Tasks */}
          <div>
            <Label className="text-base font-medium">Follow-up Tasks</Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="createTask"
                  checked={actions.followUp?.createTask || false}
                  onChange={(e) => setActions({
                    ...actions,
                    followUp: { ...actions.followUp, createTask: e.target.checked }
                  })}
                />
                <Label htmlFor="createTask" className="text-sm font-normal">
                  Create follow-up task
                </Label>
              </div>

              {actions.followUp?.createTask && (
                <div className="ml-6 space-y-3">
                  <div>
                    <Label className="text-sm">Assign To</Label>
                    <Input
                      placeholder="e.g., contact-tracing-team"
                      value={actions.followUp?.assignTo || ''}
                      onChange={(e) => setActions({
                        ...actions,
                        followUp: { 
                          ...actions.followUp, 
                          assignTo: e.target.value,
                          createTask: actions.followUp?.createTask || false
                        }
                      })}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Due Date</Label>
                    <Select 
                      value={actions.followUp?.dueDate || ''} 
                      onValueChange={(dueDate) => setActions({
                        ...actions,
                        followUp: { 
                          ...actions.followUp, 
                          dueDate,
                          createTask: actions.followUp?.createTask || false
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="1hour">1 Hour</SelectItem>
                        <SelectItem value="4hours">4 Hours</SelectItem>
                        <SelectItem value="24hours">24 Hours</SelectItem>
                        <SelectItem value="3days">3 Days</SelectItem>
                        <SelectItem value="1week">1 Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rule Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Rule Preview
          </CardTitle>
          <CardDescription>
            Visual representation of your rule logic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Conditions Preview */}
            <div>
              <div className="text-sm font-medium mb-2">
                IF {conditions.operator === 'AND' ? 'ALL' : conditions.operator === 'OR' ? 'ANY' : 'NONE'} of:
              </div>
              {conditions.rules.length === 0 ? (
                <div className="text-gray-500 italic">No conditions defined</div>
              ) : (
                <div className="space-y-1">
                  {conditions.rules.map((rule, index) => (
                    <div key={rule.id} className="text-sm pl-4">
                      {index + 1}. {getFieldLabel(rule.field)} {getOperatorLabel(rule.operator)} {
                        requiresNoInput(rule.operator) ? '' : 
                        Array.isArray(rule.value) ? `[${rule.value.join(', ')}]` : 
                        `"${rule.value}"`
                      }
                      {rule.system && ` (${rule.system})`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Preview */}
            <div>
              <div className="text-sm font-medium mb-2">THEN:</div>
              <div className="space-y-1 text-sm pl-4">
                {actions.notifications?.map((notification, index) => (
                  <div key={index}>
                    • Send {notification.type} notification ({notification.urgency} priority) to {notification.recipients.length} recipient(s)
                  </div>
                ))}
                {actions.reporting?.generateECR && (
                  <div>
                    • Generate eCR report {actions.reporting.autoSubmit ? '(auto-submit)' : '(manual review)'}
                  </div>
                )}
                {actions.followUp?.createTask && (
                  <div>
                    • Create follow-up task {actions.followUp.assignTo && `assigned to ${actions.followUp.assignTo}`}
                  </div>
                )}
                {!actions.notifications?.length && !actions.reporting?.generateECR && !actions.followUp?.createTask && (
                  <div className="text-gray-500 italic">No actions defined</div>
                )}
              </div>
            </div>
          </div>

          {/* Validation */}
          {onValidate && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  {isValidating ? 'Validating...' : 'Validate Rule'}
                </Button>
                
                {validationResult && (
                  <div className="flex gap-2">
                    <Badge className={validationResult.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {validationResult.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                    {validationResult.validation?.overall?.warnings?.length > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {validationResult.validation.overall.warnings.length} Warning(s)
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {validationResult && (
                <div className="mt-3 space-y-2">
                  {validationResult.validation?.overall?.errors?.map((error: string, index: number) => (
                    <div key={index} className="text-sm text-red-600">
                      • {error}
                    </div>
                  ))}
                  {validationResult.validation?.overall?.warnings?.map((warning: string, index: number) => (
                    <div key={index} className="text-sm text-yellow-600">
                      • {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}