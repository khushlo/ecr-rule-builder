/**
 * Test Data Service
 * Provides FHIR resources from local JSON files for testing and development
 */

import { readFileSync } from 'fs'
import path from 'path'
import { FHIRResource } from './fhir-live-service'

export interface TestDataConfig {
  enabled: boolean
  dataDir: string
}

export const DEFAULT_TEST_CONFIG: TestDataConfig = {
  enabled: process.env.NODE_ENV === 'development' || process.env.USE_TEST_DATA === 'true',
  dataDir: path.join(process.cwd(), 'src', 'test-data')
}

// Resource type mappings to folders
const RESOURCE_TYPE_FOLDERS = {
  Patient: 'patient',
  Encounter: 'encounter', 
  Observation: 'observation',
  Condition: 'condition',
  Procedure: 'procedure',
  Immunization: 'immunization',
  DiagnosticReport: 'diagnosticreport',
  MedicationAdministration: 'medication',
  Composition: 'composition',
  Bundle: 'bundle'
} as const

export class TestDataService {
  private config: TestDataConfig
  private cache = new Map<string, any[]>()

  constructor(config?: Partial<TestDataConfig>) {
    this.config = { ...DEFAULT_TEST_CONFIG, ...config }
  }

  /**
   * Check if test data service is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Load all resources of a specific type
   */
  loadResourcesByType(resourceType: string): FHIRResource[] {
    if (this.cache.has(resourceType)) {
      return this.cache.get(resourceType) || []
    }

    const folderName = RESOURCE_TYPE_FOLDERS[resourceType as keyof typeof RESOURCE_TYPE_FOLDERS]
    if (!folderName) {
      console.warn(`Unknown resource type: ${resourceType}`)
      return []
    }

    try {
      const folderPath = path.join(this.config.dataDir, folderName)
      const fs = require('fs')
      
      // Check if folder exists
      if (!fs.existsSync(folderPath)) {
        console.warn(`Test data folder not found: ${folderPath}`)
        return []
      }

      const files = fs.readdirSync(folderPath).filter((file: string) => file.endsWith('.json'))
      const resources: FHIRResource[] = []

      for (const file of files) {
        try {
          const filePath = path.join(folderPath, file)
          const content = readFileSync(filePath, 'utf-8')
          const resource = JSON.parse(content)
          
          if (resource.resourceType === resourceType) {
            resources.push(resource)
          }
        } catch (error) {
          console.error(`Error loading test file ${file}:`, error)
        }
      }

      this.cache.set(resourceType, resources)
      return resources
    } catch (error) {
      console.error(`Error loading ${resourceType} resources:`, error)
      return []
    }
  }

  /**
   * Load all available test resources
   */
  loadAllResources(): FHIRResource[] {
    const allResources: FHIRResource[] = []
    
    for (const resourceType of Object.keys(RESOURCE_TYPE_FOLDERS)) {
      const resources = this.loadResourcesByType(resourceType)
      allResources.push(...resources)
    }

    return allResources
  }

  /**
   * Get a specific resource by ID
   */
  getResourceById(resourceType: string, id: string): FHIRResource | null {
    const resources = this.loadResourcesByType(resourceType)
    return resources.find(resource => resource.id === id) || null
  }

  /**
   * Search resources by criteria
   */
  searchResources(resourceType: string, criteria?: {
    patient?: string;
    encounter?: string;
    code?: string;
    system?: string;
    status?: string;
  }): FHIRResource[] {
    const resources = this.loadResourcesByType(resourceType)
    
    if (!criteria) {
      return resources
    }

    return resources.filter(resource => {
      // Filter by patient reference
      if (criteria.patient && resource.subject?.reference) {
        if (!resource.subject.reference.includes(criteria.patient)) {
          return false
        }
      }
      
      // Filter by encounter reference
      if (criteria.encounter && resource.encounter?.reference) {
        if (!resource.encounter.reference.includes(criteria.encounter)) {
          return false
        }
      }

      // Filter by code
      if (criteria.code) {
        const hasCode = this.resourceHasCode(resource, criteria.code, criteria.system)
        if (!hasCode) {
          return false
        }
      }

      // Filter by status
      if (criteria.status && resource.status !== criteria.status) {
        return false
      }

      return true
    })
  }

  /**
   * Check if resource has a specific code
   */
  private resourceHasCode(resource: any, code: string, system?: string): boolean {
    // Check in code field
    if (resource.code?.coding) {
      for (const coding of resource.code.coding) {
        if (coding.code === code && (!system || coding.system === system)) {
          return true
        }
      }
    }

    // Check in category field
    if (resource.category) {
      const categories = Array.isArray(resource.category) ? resource.category : [resource.category]
      for (const category of categories) {
        if (category.coding) {
          for (const coding of category.coding) {
            if (coding.code === code && (!system || coding.system === system)) {
              return true
            }
          }
        }
      }
    }

    // Check in vaccineCode field (for Immunization)
    if (resource.vaccineCode?.coding) {
      for (const coding of resource.vaccineCode.coding) {
        if (coding.code === code && (!system || coding.system === system)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Get summary statistics about test data
   */
  getDataSummary(): { [resourceType: string]: number } {
    const summary: { [resourceType: string]: number } = {}
    
    for (const resourceType of Object.keys(RESOURCE_TYPE_FOLDERS)) {
      const resources = this.loadResourcesByType(resourceType)
      summary[resourceType] = resources.length
    }

    return summary
  }

  /**
   * Clear cache (useful for development)
   */ 
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const testDataService = new TestDataService()