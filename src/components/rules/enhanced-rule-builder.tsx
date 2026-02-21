'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Move, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Copy
} from 'lucide-react'

// FHIR field suggestions with paths
const fhirFieldSuggestions = [
  {
    category: 'Patient Demographics',
    fields: [
      { label: 'Patient Name', path: 'Patient.name.family', example: 'Smith' },
      { label: 'Patient Birth Date', path: 'Patient.birthDate', example: '1980-01-15' },
      { label: 'Patient Gender', path: 'Patient.gender', example: 'male' },
      { label: 'Patient Address State', path: 'Patient.address.state', example: 'CA' },
      { label: 'Patient Phone', path: 'Patient.telecom.where(system="phone").value', example: '555-1234' },
    ]
  },
  {
    category: 'Clinical Conditions',
    fields: [
      { label: 'Condition Code (ICD-10)', path: 'Condition.code.coding.where(system="http://hl7.org/fhir/sid/icd-10").code', example: 'U07.1' },
      { label: 'Condition Display', path: 'Condition.code.coding.display', example: 'COVID-19' },
      { label: 'Condition Onset', path: 'Condition.onsetDateTime', example: '2024-02-10' },
      { label: 'Condition Status', path: 'Condition.clinicalStatus.coding.code', example: 'active' },
    ]
  },
  {
    category: 'Lab Results',
    fields: [
      { label: 'Lab Test Code (LOINC)', path: 'Observation.code.coding.where(system="http://loinc.org").code', example: '94500-6' },
      { label: 'Lab Test Name', path: 'Observation.code.coding.display', example: 'SARS-CoV-2 RNA' },
      { label: 'Lab Result Value', path: 'Observation.valueCodeableConcept.coding.code', example: '260373001' },
      { label: 'Lab Result Display', path: 'Observation.valueCodeableConcept.coding.display', example: 'Detected' },
      { label: 'Lab Date', path: 'Observation.effectiveDateTime', example: '2024-02-10T10:30:00Z' },
    ]
  },
  {
    category: 'Encounters',
    fields: [
      { label: 'Encounter Type', path: 'Encounter.type.coding.code', example: 'AMB' },
      { label: 'Encounter Class', path: 'Encounter.class.code', example: 'outpatient' },
      { label: 'Encounter Date', path: 'Encounter.period.start', example: '2024-02-10' },
    ]
  }
]

const operatorOptions = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'in' },
  { value: 'greater', label: '>' },
  { value: 'less', label: '<' },
  { value: 'exists', label: 'exists' }
]

interface RuleCondition {
  id: string
  resourceType: string
  path: string
  operator: string
  value: string
  description?: string
}

interface EnhancedRuleBuilderProps {
  onSave?: (conditions: RuleCondition[], actions: any) => void
  onValidate?: (conditions: RuleCondition[], actions: any) => Promise<any>
}

export default function EnhancedRuleBuilder({ onSave, onValidate }: EnhancedRuleBuilderProps) {
  const [conditions, setConditions] = useState<RuleCondition[]>([])
  const [logicOperator, setLogicOperator] = useState<'AND' | 'OR'>('AND')
  const [actions, setActions] = useState<any>({})
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showFhirPaths, setShowFhirPaths] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: `condition-${Date.now()}`,
      resourceType: 'Patient',
      path: '',
      operator: 'equals',
      value: '',
      description: ''
    }
    setConditions([...conditions, newCondition])
  }

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id))
  }

  const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ))
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const useFhirPath = (condition: RuleCondition, field: any) => {
    updateCondition(condition.id, {
      resourceType: field.path.split('.')[0],
      path: field.path,
      description: field.label
    })
  }

  const validateRule = async () => {
    if (onValidate) {
      try {
        const result = await onValidate(conditions, actions)
        setValidationResult(result)
      } catch (error) {
        setValidationResult({
          isValid: false,
          errors: [`Validation failed: ${error}`],
          warnings: []
        })
      }
    }
  }

  const saveRule = () => {
    if (onSave) {
      onSave(conditions, actions)
    }
  }

  const generateJSON = () => {
    const ruleDefinition = {
      operator: logicOperator,
      conditions: conditions.map(c => ({
        resourceType: c.resourceType,
        path: c.path,
        operator: c.operator,
        value: c.value
      })),
      actions
    }
    return JSON.stringify(ruleDefinition, null, 2)
  }

  const copyJSON = () => {
    navigator.clipboard.writeText(generateJSON())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Rule Builder</h2>
          <p className="text-gray-600">Build eCR rules using FHIR paths and visual components</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={validateRule}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Validate
          </Button>
          <Button onClick={saveRule}>
            <Save className="mr-2 h-4 w-4" />
            Save Rule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FHIR Field Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              FHIR Fields
              <Switch 
                checked={showFhirPaths} 
                onCheckedChange={setShowFhirPaths}
              />
            </CardTitle>
            <CardDescription>
              Common FHIR paths for eCR rules
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {fhirFieldSuggestions.map((category) => (
              <div key={category.category} className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCategory(category.category)}
                  className="w-full justify-start p-2"
                >
                  {expandedCategories.has(category.category) ? (
                    <ChevronDown className="mr-2 h-4 w-4" />
                  ) : (
                    <ChevronRight className="mr-2 h-4 w-4" />
                  )}
                  {category.category}
                </Button>
                
                {expandedCategories.has(category.category) && (
                  <div className="ml-4 space-y-2">
                    {category.fields.map((field, index) => (
                      <div key={index} className="p-2 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{field.label}</span>
                            {showFhirPaths && (
                              <div className="text-xs text-gray-600 font-mono">
                                {field.path}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              e.g., {field.example}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const activeCondition = conditions[conditions.length - 1]
                              if (activeCondition) {
                                useFhirPath(activeCondition, field)
                              }
                            }}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Rule Builder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rule Conditions</CardTitle>
            <CardDescription>
              Define the IF conditions for your eCR rule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logic Operator */}
            <div className="flex items-center space-x-4">
              <Label>Logic:</Label>
              <Select value={logicOperator} onValueChange={(value: 'AND' | 'OR') => setLogicOperator(value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditions */}
            <div className="space-y-4">
              {conditions.map((condition, index) => (
                <Card key={condition.id} className="p-4">
                  {index > 0 && (
                    <div className="text-center mb-2">
                      <Badge variant="secondary">{logicOperator}</Badge>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Resource Type</Label>
                      <Select 
                        value={condition.resourceType} 
                        onValueChange={(value) => updateCondition(condition.id, { resourceType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Patient">Patient</SelectItem>
                          <SelectItem value="Condition">Condition</SelectItem>
                          <SelectItem value="Observation">Observation</SelectItem>
                          <SelectItem value="Encounter">Encounter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">FHIR Path</Label>
                      <Input
                        value={condition.path}
                        onChange={(e) => updateCondition(condition.id, { path: e.target.value })}
                        placeholder="e.g., Patient.name.family"
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Operator</Label>
                      <Select 
                        value={condition.operator} 
                        onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operatorOptions.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex space-x-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                          placeholder="Expected value"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(condition.id)}
                        className="mt-5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {condition.description && (
                    <div className="mt-2 text-sm text-gray-600">
                      <Lightbulb className="inline h-3 w-3 mr-1" />
                      {condition.description}
                    </div>
                  )}
                </Card>
              ))}

              <Button onClick={addCondition} variant="outline" className="w-full border-dashed">
                <Plus className="mr-2 h-4 w-4" />
                Add Condition
              </Button>
            </div>

            {/* JSON Preview */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">JSON Preview</CardTitle>
                  <Button variant="ghost" size="sm" onClick={copyJSON}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                  {generateJSON()}
                </pre>
              </CardContent>
            </Card>

            {/* Validation Results */}
            {validationResult && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {validationResult.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span>Validation Result</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-red-600">Errors:</Label>
                      {validationResult.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                  {validationResult.warnings && validationResult.warnings.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <Label className="text-yellow-600">Warnings:</Label>
                      {validationResult.warnings.map((warning: string, index: number) => (
                        <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                          {warning}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}