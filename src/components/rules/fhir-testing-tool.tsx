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
  FileText
} from 'lucide-react'

interface FHIRTestResult {
  testType: string
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
    extractedData?: any
  }
  commonPaths?: Record<string, string>
}

export default function FHIRTestingTool() {
  const [fhirResource, setFhirResource] = useState('')
  const [testType, setTestType] = useState('resource')
  const [fhirPath, setFhirPath] = useState('')
  const [testResult, setTestResult] = useState<FHIRTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [samples, setSamples] = useState<any>(null)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">FHIR Testing Tool</h2>
          <p className="text-gray-600">Test FHIR resource validation and data extraction for eCR rules</p>
        </div>
        <Button onClick={loadSamples} variant="outline" disabled={loading}>
          <FileText className="mr-2 h-4 w-4" />
          Load Samples
        </Button>
      </div>

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
                placeholder="Paste your FHIR resource JSON here..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={runTest} disabled={loading} className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                {loading ? 'Testing...' : 'Run Test'}
              </Button>
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
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Validation Results</CardTitle>
                <CardDescription>
                  FHIR validation output and extracted data
                </CardDescription>
              </div>
              {testResult && (
                <Button variant="ghost" size="sm" onClick={copyResult}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!testResult ? (
              <div className="text-center py-12 text-gray-500">
                Run a test to see validation results
              </div>
            ) : (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="issues">Issues</TabsTrigger>
                  <TabsTrigger value="data">Data</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    {testResult.validation.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {testResult.validation.isValid ? 'Valid' : 'Invalid'}
                    </span>
                    <Badge variant={testResult.validation.isValid ? 'default' : 'destructive'}>
                      {testResult.testType}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Errors</Label>
                      <p className="text-lg font-semibold text-red-600">
                        {testResult.validation.errors.length}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Warnings</Label>
                      <p className="text-lg font-semibold text-yellow-600">
                        {testResult.validation.warnings.length}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="issues" className="space-y-4">
                  {testResult.validation.errors.length > 0 && (
                    <div>
                      <Label className="flex items-center space-x-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>Errors</span>
                      </Label>
                      <div className="space-y-1 mt-2">
                        {testResult.validation.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {testResult.validation.warnings.length > 0 && (
                    <div>
                      <Label className="flex items-center space-x-1 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Warnings</span>
                      </Label>
                      <div className="space-y-1 mt-2">
                        {testResult.validation.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {testResult.validation.errors.length === 0 && testResult.validation.warnings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No issues found
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="data" className="space-y-4">
                  {testResult.validation.extractedData !== undefined && (
                    <div>
                      <Label>Extracted Data</Label>
                      <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                        {JSON.stringify(testResult.validation.extractedData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {testResult.commonPaths && (
                    <div>
                      <Label>Common FHIR Paths</Label>
                      <div className="mt-2 space-y-1 max-h-64 overflow-auto">
                        {Object.entries(testResult.commonPaths).map(([key, path]) => (
                          <div key={key} className="text-xs">
                            <span className="font-mono text-blue-600">{path}</span>
                            <span className="text-gray-500 ml-2">({key})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!testResult.validation.extractedData && !testResult.commonPaths && (
                    <div className="text-center py-8 text-gray-500">
                      No data to display
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}