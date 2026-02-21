/**
 * FHIR Service Configuration
 * Vendor-agnostic configuration supporting any EHR system
 */

export interface FHIREndpointConfig {
  id: string
  name: string
  baseUrl: string
  enabled: boolean
  authType?: 'none' | 'basic' | 'oauth' | 'bearer'
  credentials?: {
    username?: string
    password?: string
    token?: string
    clientId?: string
    clientSecret?: string
  }
  headers?: Record<string, string>
  timeout?: number
  description?: string
}

export interface FHIRServiceConfig {
  enabled: boolean
  defaultEndpoint?: string
  endpoints: FHIREndpointConfig[]
  cacheEnabled: boolean
  cacheTTL: number // Time to live in minutes
  maxRetries: number
  requestTimeout: number
}

// Dynamically parse numbered endpoints from environment
function parseNumberedEndpoints(): FHIREndpointConfig[] {
  const endpoints: FHIREndpointConfig[] = []
  
  // Support up to 20 numbered endpoints
  for (let i = 1; i <= 20; i++) {
    const enabled = process.env[`FHIR_ENDPOINT_${i}_ENABLED`] === 'true'
    const url = process.env[`FHIR_ENDPOINT_${i}_URL`]
    
    if (enabled && url) {
      const authType = process.env[`FHIR_ENDPOINT_${i}_AUTH`] as 'none' | 'basic' | 'oauth' | 'bearer' || 'none'
      
      const endpoint: FHIREndpointConfig = {
        id: `endpoint-${i}`,
        name: process.env[`FHIR_ENDPOINT_${i}_NAME`] || `EHR System ${i}`,
        baseUrl: url,
        enabled: true,
        authType,
        description: process.env[`FHIR_ENDPOINT_${i}_DESCRIPTION`] || `FHIR endpoint ${i}`,
        timeout: 30000
      }
      
      // Configure authentication
      if (authType !== 'none') {
        endpoint.credentials = {}
        
        if (authType === 'basic') {
          endpoint.credentials.username = process.env[`FHIR_ENDPOINT_${i}_USERNAME`]
          endpoint.credentials.password = process.env[`FHIR_ENDPOINT_${i}_PASSWORD`]
        } else if (authType === 'bearer') {
          endpoint.credentials.token = process.env[`FHIR_ENDPOINT_${i}_TOKEN`]
        } else if (authType === 'oauth') {
          endpoint.credentials.clientId = process.env[`FHIR_ENDPOINT_${i}_CLIENT_ID`]
          endpoint.credentials.clientSecret = process.env[`FHIR_ENDPOINT_${i}_CLIENT_SECRET`]
        }
      }
      
      endpoints.push(endpoint)
    }
  }
  
  return endpoints
}

// Default configuration - supports any EHR vendor
export const DEFAULT_FHIR_CONFIG: FHIRServiceConfig = {
  enabled: process.env.FHIR_INTEGRATION_ENABLED === 'true',
  defaultEndpoint: process.env.FHIR_DEFAULT_ENDPOINT || 'hapi-test',
  cacheEnabled: process.env.FHIR_CACHE_ENABLED !== 'false',
  cacheTTL: parseInt(process.env.FHIR_CACHE_TTL || '60'),
  maxRetries: parseInt(process.env.FHIR_MAX_RETRIES || '3'),
  requestTimeout: parseInt(process.env.FHIR_REQUEST_TIMEOUT || '30000'),
  endpoints: [
    // Always include HAPI test server
    {
      id: 'hapi-test',
      name: 'HAPI FHIR Test Server',
      baseUrl: process.env.FHIR_HAPI_URL || 'https://hapi.fhir.org/baseR4',
      enabled: process.env.FHIR_HAPI_ENABLED !== 'false',
      authType: 'none' as const,
      description: 'Public test server with sample data'
    },
    // Add all numbered endpoints dynamically
    ...parseNumberedEndpoints()
  ].filter(endpoint => endpoint.enabled)
}

// Environment validation
export function validateFHIRConfig(config: FHIRServiceConfig): string[] {
  const errors: string[] = []
  
  if (config.enabled) {
    const enabledEndpoints = config.endpoints.filter(e => e.enabled)
    if (enabledEndpoints.length === 0) {
      errors.push('FHIR integration enabled but no endpoints configured')
    }
    
    for (const endpoint of enabledEndpoints) {
      if (!endpoint.baseUrl) {
        errors.push(`FHIR endpoint '${endpoint.id}' missing baseUrl`)
      }
      
      if (endpoint.authType === 'oauth' && (!endpoint.credentials?.clientId || !endpoint.credentials?.clientSecret)) {
        errors.push(`FHIR endpoint '${endpoint.id}' OAuth auth missing credentials`)
      }
    }
  }
  
  return errors
}

// Helper: Get supported EHR vendors for documentation/UI hints
export const EHR_VENDOR_EXAMPLES = [
  'Epic (Epic Systems)',
  'Cerner/Oracle Health',  
  'Paragon (McKesson)',
  'Sunrise (Allscripts)',
  'eClinicalWorks (eCW)',
  'athenahealth',
  'NextGen Healthcare',
  'MEDITECH',
  'CPSI', 
  'Greenway Health',
  'PointClickCare',
  'Veradigm (Allscripts)',
  'Custom/Regional EHR'
] as const