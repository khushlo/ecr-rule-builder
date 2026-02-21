'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Copy,
  Download,
  FileText,
  Plus,
  Trash2
} from 'lucide-react'

interface FHIRTestResult {
  testType: string
  validation: {
    isValid?: boolean
    conditionMet?: boolean
    overallResult?: boolean
    errors: string[]
    warnings: string[]
    extractedData?: any
    matchingResources?: any[]
    totalResourcesEvaluated?: number
    testDataSummary?: any
  }
  commonPaths?: Record<string, string>
  mockEndpoints?: any[]
  testDataSummary?: any
}

export default function FHIRTestingTool() {
  const [fhirResource, setFhirResource] = useState('')
  const [testType, setTestType] = useState('resource')
  const [fhirPath, setFhirPath] = useState('')
  const [testResult, setTestResult] = useState<FHIRTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [samples, setSamples] = useState<any>(null)
  
  // New state for rule testing
  const [ruleConditions, setRuleConditions] = useState<any[]>([{
    fhirPath: 'Condition.code.coding.code',
    operator: 'equals',
    value: 'U07.1'
  }])
  const [logicOperator, setLogicOperator] = useState<'AND' | 'OR'>('AND')
  const [activeTab, setActiveTab] = useState('resource-test')

  const loadSamples = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rules/validate-fhir')
      if (response.ok) {
        const data = await response.json()
        setSamples(data.samples)
      }
    } catch (error) {
      console.error('Error loading samples:', error)
    } finally {
      setLoading(false)
    }
  }

  const runTest = async () => {
    if (testType === 'liveData') {
      return runRuleTest()
    }

    if (!fhirResource.trim()) {
      alert('Please provide a FHIR resource')
      return
    }

    try {
      setLoading(true)
      
      let resourceData
      try {
        resourceData = JSON.parse(fhirResource)
      } catch {
        setTestResult({
          testType: 'parse-error',
          validation: {
            isValid: false,
            errors: ['Invalid JSON format'],
            warnings: []
          }
        })
        return
      }

      const requestBody: any = {
        fhirResource: resourceData,
        testType
      }

      if (testType === 'extract' && fhirPath) {
        requestBody.fhirPath = fhirPath
      }

      const response = await fetch('/api/rules/validate-fhir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        setTestResult(result)
      } else {
        const error = await response.json()
        setTestResult({
          testType: 'error',
          validation: {
            isValid: false,
            errors: [error.error || 'Test failed'],
            warnings: []
          }
        })
      }
    } catch (error) {
      setTestResult({
        testType: 'error',
        validation: {
          isValid: false,
          errors: [`Network error: ${error}`],
          warnings: []
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const runRuleTest = async () => {
    if (ruleConditions.length === 0) {
      alert('Please add at least one rule condition')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/rules/validate-fhir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testType: 'liveData',
          conditions: ruleConditions,
          logicOperator
        })
      })

      if (response.ok) {
        const result = await response.json()
        setTestResult(result)
      } else {
        const error = await response.json()
        setTestResult({
          testType: 'error',
          validation: {
            errors: [error.error || 'Rule test failed'],
            warnings: []
          }
        })
      }
    } catch (error) {
      setTestResult({
        testType: 'error',
        validation: {
          errors: [`Network error: ${error}`],
          warnings: []
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (sampleType: string) => {
    if (!samples) return
    const sample = samples[sampleType]
    if (sample) {
      setFhirResource(JSON.stringify(sample, null, 2))
      if (sampleType === 'ecrBundle') {
        setTestType('bundle')
      } else {
        setTestType('resource')
      }
    }
  }

  const copyResult = () => {
    if (testResult) {
      navigator.clipboard.writeText(JSON.stringify(testResult, null, 2))
    }
  }

  const addRuleCondition = () => {
    setRuleConditions([...ruleConditions, {
      fhirPath: '',
      operator: 'equals',
      value: ''
    }])
  }

  const updateRuleCondition = (index: number, field: string, value: string) => {
    const updated = ruleConditions.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    )
    setRuleConditions(updated)
  }

  const removeRuleCondition = (index: number) => {
    setRuleConditions(ruleConditions.filter((_, i) => i !== index))
  }

  const loadPresetRule = (preset: string) => {
    switch (preset) {
      case 'covid-detection':
        setRuleConditions([{
          fhirPath: 'Condition.code.coding.code',
          operator: 'equals',
          value: 'U07.1'
        }])
        break
      case 'lab-positive':
        setRuleConditions([{
          fhirPath: 'Observation.valueCodeableConcept.coding.code',
          operator: 'equals',
          value: '260373001'
        }])
        break
      default:
        break
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">FHIR Testing Tool</h2>
          <p className="text-gray-600">Test FHIR resource validation and eCR rule execution against test data</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadSamples} variant="outline" disabled={loading}>
            <FileText className="mr-2 h-4 w-4" />
            Load Samples
          </Button>
          {samples?.testDataSummary && (
            <Badge variant="outline">
              Test Data: {Object.values(samples.testDataSummary).reduce((a: number, b: unknown) => a + Number(b), 0)} resources
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resource-test">Resource Testing</TabsTrigger>
          <TabsTrigger value="rule-test">Rule Testing</TabsTrigger>
        </TabsList>

        {/* Resource Testing Tab */}
        <TabsContent value="resource-test">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>FHIR Resource Input</CardTitle>
                <CardDescription>
                  Provide a FHIR resource for validation testing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testType">Test Type</Label>
                  <Select value={testType} onValueChange={setTestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resource">Resource Validation</SelectItem>
                      <SelectItem value="bundle">eCR Bundle Validation</SelectItem>
                      <SelectItem value="extract">FHIRPath Extraction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {testType === 'extract' && (
                  <div className="space-y-2">
                    <Label htmlFor="fhirPath">FHIRPath Expression</Label>
                    <Input
                      id="fhirPath"
                      value={fhirPath}
                      onChange={(e) => setFhirPath(e.target.value)}
                      placeholder="e.g., Patient.name.family"
                    />
                    <p className="text-xs text-gray-500">
                      Examples: Patient.name.family, Condition.code.coding.code, Observation.valueQuantity.value
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fhirResource">FHIR Resource (JSON)</Label>
                  <Textarea
                    id="fhirResource"
                    value={fhirResource}
                    onChange={(e) => setFhirResource(e.target.value)}
                    placeholder="Paste your FHIR resource here..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                {samples && (
                  <div className="space-y-2">
                    <Label>Sample Resources</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSample('patient')}
                      >
                        Patient
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSample('condition')}
                      >
                        Condition
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSample('observation')}
                      >
                        Observation
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSample('ecrBundle')}
                      >
                        eCR Bundle
                      </Button>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={runTest} 
                  disabled={loading || !fhirResource.trim()}
                  className="w-full"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {loading ? 'Testing...' : 'Run Test'}
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            {testResult && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Test Results</CardTitle>
                    <CardDescription>
                      {testResult.testType.charAt(0).toUpperCase() + testResult.testType.slice(1)} test results
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResult}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {testResult.validation.isValid ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium text-green-700">Valid</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="text-sm font-medium text-red-700">Invalid</span>
                        </>
                      )}
                    </div>

                    {/* Errors */}
                    {testResult.validation.errors?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-red-700 mb-2">Errors:</h4>
                        <ul className="space-y-1">
                          {testResult.validation.errors.map((error, index) => (
                            <li key={index} className="text-sm text-red-600 flex items-start">
                              <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Warnings */}
                    {testResult.validation.warnings?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-yellow-700 mb-2">Warnings:</h4>
                        <ul className="space-y-1">
                          {testResult.validation.warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-yellow-600 flex items-start">
                              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Extracted Data */}
                    {testResult.validation.extractedData && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Extracted Data:</h4>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(testResult.validation.extractedData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Rule Testing Tab */}
        <TabsContent value="rule-test">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rule Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Rule Configuration</CardTitle>
                <CardDescription>
                  Define rule conditions to test against mock FHIR data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Logic Operator</Label>
                  <Select value={logicOperator} onValueChange={(v) => setLogicOperator(v as 'AND' | 'OR')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND (All conditions must be true)</SelectItem>
                      <SelectItem value="OR">OR (Any condition can be true)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Preset Rules</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPresetRule('covid-detection')}
                    >
                      COVID-19 Detection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPresetRule('lab-positive')}
                    >
                      Positive Lab Result
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Rule Conditions</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addRuleCondition}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {ruleConditions.map((condition, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Condition {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRuleCondition(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          placeholder="FHIR Path (e.g., Condition.code.coding.code)"
                          value={condition.fhirPath}
                          onChange={(e) => updateRuleCondition(index, 'fhirPath', e.target.value)}
                        />
                        <Select 
                          value={condition.operator}
                          onValueChange={(v) => updateRuleCondition(index, 'operator', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="exists">Exists</SelectItem>
                            <SelectItem value="greater_than">Greater Than</SelectItem>
                            <SelectItem value="less_than">Less Than</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Expected value"
                          value={condition.value}
                          onChange={(e) => updateRuleCondition(index, 'value', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={runRuleTest} 
                  disabled={loading || ruleConditions.length === 0}
                  className="w-full"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {loading ? 'Testing Rule...' : 'Test Rule Against Mock Data'}
                </Button>
              </CardContent>
            </Card>

            {/* Rule Test Results */}
            {testResult && testResult.testType === 'liveData' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Rule Test Results</CardTitle>
                    <CardDescription>
                      Results from testing against mock FHIR data
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResult}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Rule Status */}
                    <div className="flex items-center space-x-2">
                      {testResult.validation.overallResult ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium text-green-700">Rule Triggered</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-orange-500" />
                          <span className="text-sm font-medium text-orange-700">No Matches Found</span>
                        </>
                      )}
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Resources Evaluated</p>
                        <p className="text-2xl font-bold">{testResult.validation.totalResourcesEvaluated || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Matching Resources</p>
                        <p className="text-2xl font-bold text-green-600">
                          {testResult.validation.matchingResources?.length || 0}
                        </p>
                      </div>
                    </div>

                    {/* Test Data Summary */}
                    {testResult.validation.testDataSummary && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Test Data Summary:</h4>
                        <div className="bg-gray-50 p-3 rounded">
                          {Object.entries(testResult.validation.testDataSummary).map(([type, count]) => (
                            <div key={type} className="flex justify-between text-sm">
                              <span>{type}:</span>
                              <Badge variant="outline">{String(count)}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {testResult.validation.errors?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-red-700 mb-2">Errors:</h4>
                        <ul className="space-y-1">
                          {testResult.validation.errors.map((error, index) => (
                            <li key={index} className="text-sm text-red-600 flex items-start">
                              <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Matching Resources Preview */}
                    {testResult.validation.matchingResources && testResult.validation.matchingResources.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Matching Resources:</h4>
                        <div className="space-y-2 max-h-48 overflow-auto">
                          {testResult.validation.matchingResources.slice(0, 3).map((resource: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-3 rounded text-xs">
                              <div className="flex justify-between items-center mb-1">
                                <Badge variant="outline">{resource.resourceType}</Badge>
                                <span className="text-gray-600">{resource.id}</span>
                              </div>
                              <pre className="text-xs overflow-hidden">
                                {JSON.stringify(resource, null, 1).slice(0, 200)}...
                              </pre>
                            </div>
                          ))}
                          {testResult.validation.matchingResources.length > 3 && (
                            <p className="text-xs text-gray-500 text-center">
                              +{testResult.validation.matchingResources.length - 3} more resources
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
