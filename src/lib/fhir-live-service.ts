/**
 * FHIR Live Data Service
 * Vendor-agnostic service supporting any EHR system with FHIR R4 API
 * Can be easily disabled/removed for customers who don't need live integration
 */

import { FHIRServiceConfig, FHIREndpointConfig, DEFAULT_FHIR_CONFIG } from './fhir-config'
import { RuleExecutionResult } from './fhir-validation'

// Core interfaces for loose coupling
export interface FHIRResource {
  resourceType: string
  id: string
  [key: string]: any
}

export interface LiveFHIRTestResult extends RuleExecutionResult {
  dataSource: string
  patientCount: number
  resourceTypes: string[]
  apiResponseTime: number
}

export interface FHIRDataProvider {
  isEnabled(): boolean
  getAvailableEndpoints(): FHIREndpointConfig[]
  fetchPatientData(endpointId?: string, count?: number): Promise<FHIRResource[]>
  testRuleAgainstLiveData(
    conditions: any[], 
    logicOperator: 'AND' | 'OR', 
    endpointId?: string
  ): Promise<LiveFHIRTestResult>
}

// Cache interface for better performance
interface FHIRCacheEntry {
  data: FHIRResource[]
  timestamp: number
  endpointId: string
}

// Main service implementation
export class FHIRService implements FHIRDataProvider {
  private config: FHIRServiceConfig
  private cache = new Map<string, FHIRCacheEntry>()

  constructor(config?: Partial<FHIRServiceConfig>) {
    this.config = { ...DEFAULT_FHIR_CONFIG, ...config }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.endpoints.some(e => e.enabled)
  }

  getAvailableEndpoints(): FHIREndpointConfig[] {
    return this.config.endpoints.filter(e => e.enabled)
  }

  async fetchPatientData(endpointId?: string, count: number = 10): Promise<FHIRResource[]> {
    if (!this.isEnabled()) {
      throw new Error('FHIR integration is disabled')
    }

    const endpoint = this.getEndpoint(endpointId)
    const cacheKey = `patients-${endpoint.id}-${count}`

    // Check cache first
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (Date.now() - cached.timestamp < this.config.cacheTTL * 60000) {
        return cached.data
      }
    }

    try {
      const patients = await this.fetchResource(endpoint, 'Patient', count)
      
      // Fetch related resources for complete patient data
      const enrichedData: FHIRResource[] = []
      
      for (const patient of patients.slice(0, Math.min(5, patients.length))) { // Limit to 5 patients for performance
        enrichedData.push(patient)
        
        // Fetch conditions for this patient
        try {
          const conditions = await this.fetchResource(endpoint, 'Condition', 5, `subject=${patient.id}`)
          enrichedData.push(...conditions)
        } catch (e) {
          console.warn(`Failed to fetch conditions for patient ${patient.id}:`, e)
        }

        // Fetch observations for this patient
        try {
          const observations = await this.fetchResource(endpoint, 'Observation', 5, `subject=${patient.id}`)
          enrichedData.push(...observations)
        } catch (e) {
          console.warn(`Failed to fetch observations for patient ${patient.id}:`, e)
        }
      }

      // Cache the result
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, {
          data: enrichedData,
          timestamp: Date.now(),
          endpointId: endpoint.id
        })
      }

      return enrichedData

    } catch (error) {
      console.error(`Failed to fetch data from ${endpoint.name}:`, error)
      throw new Error(`FHIR API request failed: ${error}`)
    }
  }

  async testRuleAgainstLiveData(
    conditions: any[], 
    logicOperator: 'AND' | 'OR', 
    endpointId?: string
  ): Promise<LiveFHIRTestResult> {
    if (!this.isEnabled()) {
      throw new Error('FHIR integration is disabled')
    }

    const endpoint = this.getEndpoint(endpointId)
    const startTime = Date.now()

    try {
      // Fetch live data
      const liveData = await this.fetchPatientData(endpointId, 20) // More data for better testing
      const apiResponseTime = Date.now() - startTime

      // Import the rule execution function (avoid circular dependency)
      const { executeRuleAgainstFHIR } = await import('./fhir-validation')
      
      // Execute rule against live data  
      const executionResult = executeRuleAgainstFHIR(conditions, liveData, logicOperator)

      // Enhance with live data metadata
      const liveResult: LiveFHIRTestResult = {
        ...executionResult,
        dataSource: `${endpoint.name} (${endpoint.id})`,
        patientCount: liveData.filter(r => r.resourceType === 'Patient').length,
        resourceTypes: [...new Set(liveData.map(r => r.resourceType))],
        apiResponseTime
      }

      return liveResult

    } catch (error) {
      console.error('Live FHIR rule testing failed:', error)
      
      // Return failed result with error info
      return {
        conditionMet: false,
        executedConditions: [],
        overallResult: false,
        logicOperator,
        executionTimeMs: Date.now() - startTime,
        dataSource: `${endpoint.name} (ERROR)`,
        patientCount: 0,
        resourceTypes: [],
        apiResponseTime: Date.now() - startTime
      }
    }
  }

  private getEndpoint(endpointId?: string): FHIREndpointConfig {
    const id = endpointId || this.config.defaultEndpoint || this.config.endpoints.find(e => e.enabled)?.id
    const endpoint = this.config.endpoints.find(e => e.id === id && e.enabled)
    
    if (!endpoint) {
      throw new Error(`FHIR endpoint '${id}' not found or disabled`)
    }
    
    return endpoint
  }

  private async fetchResource(
    endpoint: FHIREndpointConfig, 
    resourceType: string, 
    count: number = 10,
    searchParams?: string
  ): Promise<FHIRResource[]> {
    const url = new URL(`${endpoint.baseUrl}/${resourceType}`)
    url.searchParams.set('_count', count.toString())
    url.searchParams.set('_format', 'json')
    
    if (searchParams) {
      const params = new URLSearchParams(searchParams)
      params.forEach((value, key) => url.searchParams.set(key, value))
    }

    const headers: Record<string, string> = {
      'Accept': 'application/fhir+json',
      'Content-Type': 'application/fhir+json',
      ...endpoint.headers
    }

    // Add authentication
    if (endpoint.authType === 'basic' && endpoint.credentials?.username) {
      const auth = Buffer.from(`${endpoint.credentials.username}:${endpoint.credentials.password || ''}`).toString('base64')
      headers['Authorization'] = `Basic ${auth}`
    } else if (endpoint.authType === 'bearer' && endpoint.credentials?.token) {
      headers['Authorization'] = `Bearer ${endpoint.credentials.token}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const bundle = await response.json()
      
      if (bundle.resourceType === 'Bundle' && bundle.entry) {
        return bundle.entry.map((entry: any) => entry.resource).filter(Boolean)
      } else if (bundle.resourceType === resourceType) {
        return [bundle]
      } else {
        return []
      }

    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  // Method to clear cache (useful for testing)
  clearCache(): void {
    this.cache.clear()
  }

  // Health check method
  async healthCheck(endpointId?: string): Promise<{ endpoint: string; status: 'ok' | 'error'; responseTime: number; error?: string }> {
    const endpoint = this.getEndpoint(endpointId)
    const startTime = Date.now()
    
    try {
      await this.fetchResource(endpoint, 'Patient', 1)
      return {
        endpoint: endpoint.name,
        status: 'ok',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        endpoint: endpoint.name,
        status: 'error',
        responseTime: Date.now() - startTime,
        error: String(error)
      }
    }
  }
}

// Factory function for easy instantiation
export function createFHIRService(config?: Partial<FHIRServiceConfig>): FHIRService {
  return new FHIRService(config)
}

// Null object pattern for when FHIR integration is disabled
export class DisabledFHIRService implements FHIRDataProvider {
  isEnabled(): boolean {
    return false
  }

  getAvailableEndpoints(): FHIREndpointConfig[] {
    return []
  }

  async fetchPatientData(): Promise<FHIRResource[]> {
    throw new Error('FHIR integration is disabled')
  }

  async testRuleAgainstLiveData(): Promise<LiveFHIRTestResult> {
    throw new Error('FHIR integration is disabled')  
  }
}

// Global service instance (lazy initialization)
let fhirServiceInstance: FHIRDataProvider | null = null

export function getFHIRService(): FHIRDataProvider {
  if (!fhirServiceInstance) {
    fhirServiceInstance = DEFAULT_FHIR_CONFIG.enabled 
      ? createFHIRService() 
      : new DisabledFHIRService()
  }
  return fhirServiceInstance
}