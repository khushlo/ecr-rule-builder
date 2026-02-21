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
  Copy,
  Play,
  RefreshCw,
  Code,
  Globe,
  Server,
  Database,
  Activity,
  XCircle,
  Loader2
} from 'lucide-react'

// Import enhanced FHIR validation functions
import { 
  validateFHIRPath, 
  testFHIRPathOnResources,
  executeRuleAgainstFHIR,
  generateTestFHIRData,
  FHIRPathTestResult,
  RuleExecutionResult
} from '@/lib/fhir-validation'

// Import FHIR Live Service (loosely coupled)
import { 
  getFHIRService, 
  LiveFHIRTestResult,
  FHIRDataProvider 
} from '@/lib/fhir-live-service'

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
  fhirValidation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
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
  
  // Enhanced state for new features
  const [showPreview, setShowPreview] = useState(false)
  const [realTimeValidation, setRealTimeValidation] = useState(true)
  const [testExecutionResult, setTestExecutionResult] = useState<RuleExecutionResult | null>(null)
  const [fhirPathTestResults, setFhirPathTestResults] = useState<Map<string, FHIRPathTestResult>>(new Map())
  const [isTestingRule, setIsTestingRule] = useState(false)
  
  // Live FHIR integration state (loosely coupled)
  const [fhirService] = useState<FHIRDataProvider>(() => getFHIRService())
  const [liveFhirResult, setLiveFhirResult] = useState<LiveFHIRTestResult | null>(null)
  const [isTestingLiveFhir, setIsTestingLiveFhir] = useState(false)
  const [selectedFhirEndpoint, setSelectedFhirEndpoint] = useState<string>('')
  const [fhirHealthStatus, setFhirHealthStatus] = useState<{[key: string]: 'unknown' | 'ok' | 'error'}>({})

  // Check FHIR service availability on component mount
  useEffect(() => {
    if (fhirService.isEnabled()) {
      const endpoints = fhirService.getAvailableEndpoints()
      if (endpoints.length > 0 && !selectedFhirEndpoint) {
        setSelectedFhirEndpoint(endpoints[0].id)
      }
    }
  }, [fhirService, selectedFhirEndpoint])

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
    
    // Trigger real-time validation if enabled
    if (realTimeValidation) {
      const updatedConditions = conditions.map(c => 
        c.id === id ? { ...c, ...updates } : c
      )
      const condition = updatedConditions.find(c => c.id === id)
      if (condition && condition.path) {
        validateFHIRPathRealTime(condition.path, id)
      }
    }
  }

  // Real-time FHIR path validation
  const validateFHIRPathRealTime = async (fhirPath: string, conditionId: string) => {
    try {
      const pathValidation = validateFHIRPath(fhirPath)
      
      // Update condition with validation results
      setConditions(prev => prev.map(c => 
        c.id === conditionId 
          ? { 
              ...c, 
              fhirValidation: {
                isValid: pathValidation.isValid,
                errors: pathValidation.errors || [],
                warnings: pathValidation.warnings || []
              }
            }
          : c
      ))

      // Test against sample data for better feedback
      const testData = generateTestFHIRData(['Patient', 'Condition', 'Observation', 'Encounter'])
      const testResult = testFHIRPathOnResources(fhirPath, testData)
      
      setFhirPathTestResults(prev => new Map(prev).set(conditionId, testResult))
    } catch (error) {
      console.error('Real-time validation error:', error)
    }
  }

  // Execute rule against test FHIR data
  const testRuleExecution = async () => {
    setIsTestingRule(true)
    try {
      // Generate comprehensive test data 
      const uniqueResourceTypes = new Set(conditions.map(c => c.resourceType))
      const testResourceTypes = Array.from(uniqueResourceTypes)
      const testData = generateTestFHIRData(testResourceTypes)
      
      // Execute rule against test data
      const executionResult = executeRuleAgainstFHIR(conditions, testData, logicOperator)
      setTestExecutionResult(executionResult)
    } catch (error) {
      console.error('Rule execution test failed:', error)
      setTestExecutionResult({
        conditionMet: false,
        executedConditions: [],
        overallResult: false,
        logicOperator,
        executionTimeMs: 0
      })
    } finally {
      setIsTestingRule(false)
    }
  }

  // Generate JSON preview of the rule
  const generateRuleJSON = () => {
    return {
      id: `rule-${Date.now()}`,
      name: 'Generated eCR Rule',
      description: 'Rule created with Enhanced Rule Builder',
      conditions: conditions.map(c => ({
        resourceType: c.resourceType,
        path: c.path,
        operator: c.operator,
        value: c.value,
        description: c.description
      })),
      logicOperator,
      actions: actions,
      created: new Date().toISOString(),
      version: '1.0'
    }
  }

  // Live FHIR testing functions (only available if service is enabled)
  const testRuleAgainstLiveFHIR = async () => {
    if (!fhirService.isEnabled()) {
      alert('Live FHIR integration is disabled. Please check your configuration.')
      return
    }

    setIsTestingLiveFhir(true)
    try {
      const result = await fhirService.testRuleAgainstLiveData(
        conditions, 
        logicOperator, 
        selectedFhirEndpoint || undefined
      )
      setLiveFhirResult(result)
    } catch (error) {
      console.error('Live FHIR testing failed:', error)
      setLiveFhirResult({
        conditionMet: false,
        executedConditions: [],
        overallResult: false,
        logicOperator,
        executionTimeMs: 0,
        dataSource: 'ERROR',
        patientCount: 0,
        resourceTypes: [],
        apiResponseTime: 0
      })
    } finally {
      setIsTestingLiveFhir(false)
    }
  }

  const checkFhirEndpointHealth = async (endpointId: string) => {
    if (!fhirService.isEnabled()) return

    try {
      setFhirHealthStatus(prev => ({ ...prev, [endpointId]: 'unknown' }))
      
      // Type assertion since we know the service is enabled
      const healthResult = await (fhirService as any).healthCheck(endpointId)
      
      setFhirHealthStatus(prev => ({
        ...prev,
        [endpointId]: healthResult.status
      }))
    } catch (error) {
      setFhirHealthStatus(prev => ({ ...prev, [endpointId]: 'error' }))
    }
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
          <p className="text-gray-600">Build eCR rules using FHIR paths with real-time validation and testing</p>
        </div>
        <div className="flex space-x-2">
          <div className="flex items-center space-x-2 mr-4">
            <Switch 
              checked={realTimeValidation}
              onCheckedChange={setRealTimeValidation}
              id="real-time-validation"
            />
            <Label htmlFor="real-time-validation" className="text-sm">
              Real-time validation
            </Label>
          </div>
          <Button 
            variant="outline" 
            onClick={testRuleExecution}
            disabled={isTestingRule || conditions.length === 0}
          >
            {isTestingRule ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Test Rule
          </Button>
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

      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="builder">Rule Builder</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          {fhirService.isEnabled() && (
            <TabsTrigger value="live-fhir">Live FHIR</TabsTrigger>  
          )}
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="fhir-paths">FHIR Paths</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
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
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5 text-blue-500" />
                <span>Rule Testing</span>
              </CardTitle>
              <CardDescription>
                Test your rule against sample FHIR data to verify it works correctly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={testRuleExecution} 
                  disabled={isTestingRule || conditions.length === 0}
                  className="w-full"
                >
                  {isTestingRule ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing Rule...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Test
                    </>
                  )}
                </Button>

                {testExecutionResult && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg border-2 ${
                      testExecutionResult.overallResult 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {testExecutionResult.overallResult ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-semibold">
                          Rule {testExecutionResult.overallResult ? 'PASSED' : 'FAILED'}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({testExecutionResult.executionTimeMs}ms)
                        </span>
                      </div>
                      <p className="text-sm">
                        Logic: {testExecutionResult.logicOperator} | 
                        Conditions: {testExecutionResult.executedConditions.length}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold">Condition Results:</Label>
                      {testExecutionResult.executedConditions.map((condResult, index) => (
                        <div key={index} className={`p-3 rounded border ${
                          condResult.result ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {condResult.condition.resourceType}.{condResult.condition.path}
                            </span>
                            {condResult.result ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="text-xs space-y-1">
                            <p><strong>Expected:</strong> {condResult.condition.operator} "{condResult.condition.value}"</p>
                            <p><strong>Found:</strong> {JSON.stringify(condResult.extractedValue)}</p>
                            {condResult.error && (
                              <p className="text-red-600"><strong>Error:</strong> {condResult.error}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5 text-blue-500" />
                <span>Rule Preview</span>
              </CardTitle>
              <CardDescription>
                Preview the generated rule JSON and copy it for export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Generated Rule JSON</Label>
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(generateRuleJSON(), null, 2))}>
                    <Copy className="mr-1 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={JSON.stringify(generateRuleJSON(), null, 2)}
                  readOnly
                  className="font-mono text-xs min-h-96"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live FHIR Testing Tab - Only shown if service is enabled */}
        {fhirService.isEnabled() && (
          <TabsContent value="live-fhir" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Live FHIR Testing</span>
                </CardTitle>
                <CardDescription>
                  Test rules against live FHIR endpoints with real patient data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* FHIR Endpoint Selection */}
                <div className="space-y-2">
                  <Label>FHIR Endpoint</Label>
                  <Select 
                    value={selectedFhirEndpoint || ""}
                    onValueChange={setSelectedFhirEndpoint}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select FHIR endpoint..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fhirService.getAvailableEndpoints().map((endpoint) => (
                        <SelectItem key={endpoint.id} value={endpoint.id}>
                          <div className="flex items-center space-x-2">
                            <span>{endpoint.name}</span>
                            {fhirHealthStatus[endpoint.id] === 'ok' && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                            {fhirHealthStatus[endpoint.id] === 'error' && (
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                            )}
                            {fhirHealthStatus[endpoint.id] === 'unknown' && (
                              <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedFhirEndpoint && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkFhirEndpointHealth(selectedFhirEndpoint)}
                      disabled={isTestingLiveFhir}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Check Health
                    </Button>
                  )}
                </div>

                {/* Live Testing Controls */}
                <div className="flex space-x-2 pt-2">
                  <Button
                    onClick={testRuleAgainstLiveFHIR}
                    disabled={!selectedFhirEndpoint || isTestingLiveFhir || conditions.length === 0}
                    className="flex-1"
                  >
                    {isTestingLiveFhir && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Test Rule Against Live FHIR
                  </Button>
                </div>

                {/* Live Testing Results */}
                {liveFhirResult && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center space-x-2">
                      {liveFhirResult.conditionMet ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        Live FHIR Test Result: {liveFhirResult.conditionMet ? 'MATCH' : 'NO MATCH'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <Label>Patients Tested</Label>
                        <div className="font-mono">{liveFhirResult.patientCount}</div>
                      </div>
                      <div className="space-y-1">
                        <Label>Execution Time</Label>
                        <div className="font-mono">{liveFhirResult.executionTimeMs}ms</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Resource Types Found</Label>
                      <div className="flex flex-wrap gap-1">
                        {liveFhirResult.resourceTypes.map((type: string) => (
                          <Badge key={type} variant="secondary">{type}</Badge>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      value={JSON.stringify(liveFhirResult, null, 2)}
                      readOnly
                      className="font-mono text-xs min-h-32"
                      placeholder="Live FHIR test results will appear here..."
                    />
                  </div>
                )}

                {/* Configuration Info */}
                <Card className="bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="text-sm space-y-1">
                      <div className="font-medium">Live FHIR Integration Status:</div>
                      <div className="text-blue-700">
                        ✓ Plugin-based architecture for easy removal
                      </div>
                      <div className="text-blue-700">
                        ✓ Customer-configurable FHIR endpoints
                      </div>
                      <div className="text-blue-700">
                        ✓ On-premises deployment support
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* FHIR Paths Tab */}
        <TabsContent value="fhir-paths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>FHIR Field Reference</CardTitle>
              <CardDescription>
                Common FHIR paths for eCR rules with real-time path testing
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto space-y-4">
              {fhirFieldSuggestions.map((category) => (
                <div key={category.category} className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => toggleCategory(category.category)}
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
                        <div key={index} className="p-2 border rounded hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{field.label}</span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                if (conditions.length > 0) {
                                  const lastCondition = conditions[conditions.length - 1]
                                  useFhirPath(lastCondition, field)
                                }
                              }}
                            >
                              Use Path
                            </Button>
                          </div>
                          <p className="text-xs font-mono text-gray-600">{field.path}</p>
                          <p className="text-xs text-gray-500">Example: {field.example}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Results (shown on all tabs) */}
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
      </Tabs>
    </div>
  )
}