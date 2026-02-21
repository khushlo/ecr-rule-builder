/**
 * Mock FHIR API Service
 * Simulates FHIR API responses using local test data
 */

import { testDataService, TestDataService } from './test-data-service'
import { FHIRResource, FHIRDataProvider, LiveFHIRTestResult } from './fhir-live-service'
import { FHIREndpointConfig } from './fhir-config'
import { validateFHIRResource, extractFHIRData } from './fhir-validation'

export interface MockAPIResponse {
  resourceType: 'Bundle'
  id: string
  type: 'searchset'
  total: number
  entry: Array<{
    resource: FHIRResource
    search?: {
      mode: 'match' | 'include'
    }
  }>
}

export class MockFHIRService implements FHIRDataProvider {
  private testDataService: TestDataService
  private mockEndpoints: FHIREndpointConfig[]

  constructor() {
    this.testDataService = testDataService
    this.mockEndpoints = [
      {
        id: 'mock-ehr-1',
        name: 'Mock EHR System 1',
        baseUrl: 'http://localhost:3000/api/mock-fhir',
        enabled: true,
        authType: 'none',
        description: 'Local test data for development'
      },
      {
        id: 'mock-ehr-2',
        name: 'Mock EHR System 2',
        baseUrl: 'http://localhost:3000/api/mock-fhir-2',
        enabled: true,
        authType: 'none',
        description: 'Secondary test data set'
      }
    ]
  }

  /**
   * Check if mock service is enabled
   */
  isEnabled(): boolean {
    return this.testDataService.isEnabled()
  }

  /**
   * Get available mock endpoints
   */
  getAvailableEndpoints(): FHIREndpointConfig[] {
    return this.mockEndpoints
  }

  /**
   * Simulate fetching patient data from FHIR API
   */
  async fetchPatientData(endpointId?: string, count: number = 10): Promise<FHIRResource[]> {
    // Simulate API delay
    await this.simulateDelay(100, 300)

    const allPatients = this.testDataService.loadResourcesByType('Patient')
    
    // Return subset based on count
    return allPatients.slice(0, count)
  }

  /**
   * Create a mock FHIR Bundle response
   */
  createBundle(resources: FHIRResource[], requestUrl?: string): MockAPIResponse {
    return {
      resourceType: 'Bundle',
      id: `bundle-${Date.now()}`,
      type: 'searchset',
      total: resources.length,
      entry: resources.map(resource => ({
        resource,
        search: { mode: 'match' as const }
      }))
    }
  }

  /**
   * Mock FHIR search endpoint
   */
  async searchFHIR(resourceType: string, params?: {
    patient?: string
    encounter?: string
    code?: string
    system?: string
    status?: string
    _count?: number
  }): Promise<MockAPIResponse> {
    // Simulate API delay
    await this.simulateDelay(150, 500)

    const count = params?._count || 20
    let resources = this.testDataService.searchResources(resourceType, params)
    
    // Limit results
    if (count > 0) {
      resources = resources.slice(0, count)
    }

    return this.createBundle(resources)
  }

  /**
   * Mock individual resource fetch
   */
  async getResource(resourceType: string, id: string): Promise<FHIRResource | null> {
    // Simulate API delay
    await this.simulateDelay(50, 200)

    return this.testDataService.getResourceById(resourceType, id)
  }

  /**
   * Test rule against mock live data
   */
  async testRuleAgainstLiveData(
    conditions: any[],
    logicOperator: 'AND' | 'OR' = 'AND',
    endpointId?: string
  ): Promise<LiveFHIRTestResult> {
    const startTime = Date.now()
    
    // Get all test resources
    const allResources = this.testDataService.loadAllResources()
    
    // Group by resource type
    const resourcesByType = allResources.reduce((acc, resource) => {
      const type = resource.resourceType
      if (!acc[type]) acc[type] = []
      acc[type].push(resource)
      return acc
    }, {} as { [key: string]: FHIRResource[] })

    const resourceTypes = Object.keys(resourcesByType)
    const patientCount = resourcesByType.Patient?.length || 0

    // Evaluate conditions against resources
    const matchingResources: FHIRResource[] = []
    const evaluationErrors: string[] = []

    for (const resource of allResources) {
      try {
        let resourceMatches = false

        if (logicOperator === 'AND') {
          resourceMatches = conditions.every(condition => 
            this.evaluateConditionAgainstResource(condition, resource)
          )
        } else {
          resourceMatches = conditions.some(condition => 
            this.evaluateConditionAgainstResource(condition, resource)
          )
        }

        if (resourceMatches) {
          matchingResources.push(resource)
        }
      } catch (error) {
        evaluationErrors.push(`Error evaluating resource ${resource.id}: ${error}`)
      }
    }

    const endTime = Date.now()
    const apiResponseTime = endTime - startTime

    const result: LiveFHIRTestResult = {
      // RuleExecutionResult properties
      conditionMet: matchingResources.length > 0,
      overallResult: matchingResources.length > 0 && evaluationErrors.length === 0,
      executedConditions: conditions.map(condition => ({
        condition,
        result: true, // This would need more detailed evaluation
        extractedValue: null // This would contain the actual extracted values
      })),
      logicOperator,
      executionTimeMs: apiResponseTime,
      
      // LiveFHIRTestResult properties
      dataSource: endpointId || 'mock-test-data',
      patientCount,
      resourceTypes,
      apiResponseTime
    }

    // Add extra properties that are used in the application
    return Object.assign(result, {
      matchingResources,
      totalResourcesEvaluated: allResources.length
    })
  }

  /**
   * Evaluate a single condition against a resource
   */
  private evaluateConditionAgainstResource(condition: any, resource: FHIRResource): boolean {
    try {
      const fhirPath = condition.fhirPath || condition.path
      const expectedValue = condition.value
      const operator = condition.operator || 'equals'

      if (!fhirPath) {
        return false
      }

      // Use FHIR path evaluation
      const result = extractFHIRData(resource, fhirPath)
      
      if (result !== null && result !== undefined) {
        return this.compareValues(result, expectedValue, operator)
      }

      return false
    } catch (error) {
      console.error('Error evaluating condition:', error)
      return false
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actualValue: any, expectedValue: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue
      case 'contains':
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase())
      case 'exists':
        return actualValue !== null && actualValue !== undefined
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue)
      case 'less_than':
        return Number(actualValue) < Number(expectedValue)
      default:
        return actualValue === expectedValue
    }
  }

  /**
   * Simulate API response delay
   */
  private async simulateDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * Get test data summary for debugging
   */
  getTestDataSummary(): { [resourceType: string]: number } {
    return this.testDataService.getDataSummary()
  }

  /**
   * Reset test data cache
   */
  resetTestData(): void {
    this.testDataService.clearCache()
  }
}

// Export singleton instance
export const mockFHIRService = new MockFHIRService()