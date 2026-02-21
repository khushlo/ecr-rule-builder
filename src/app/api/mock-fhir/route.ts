/**
 * Mock FHIR API Endpoints
 * Provides FHIR-compliant responses using local test data
 * 
 * Endpoints:
 * GET /api/mock-fhir/[resourceType] - Search resources
 * GET /api/mock-fhir/[resourceType]/[id] - Get specific resource
 * GET /api/mock-fhir/metadata - Get capability statement
 */

import { NextRequest, NextResponse } from 'next/server'
import { mockFHIRService } from '@/lib/mock-fhir-service'

// Handle GET requests for FHIR resource searches
export async function GET(request: NextRequest) {
  try {
    const { searchParams, pathname } = new URL(request.url)
    
    // Parse the resource type from the URL
    const pathParts = pathname.split('/')
    const resourceType = pathParts[pathParts.length - 1]

    // Check if mock service is enabled
    if (!mockFHIRService.isEnabled()) {
      return NextResponse.json({
        error: 'Mock FHIR service is disabled',
        message: 'Set NODE_ENV=development or USE_TEST_DATA=true to enable'
      }, { status: 503 })
    }

    // Handle metadata requests
    if (resourceType === 'metadata') {
      return NextResponse.json(getCapabilityStatement())
    }

    // Parse search parameters
    const searchCriteria = {
      patient: searchParams.get('patient') || undefined,
      encounter: searchParams.get('encounter') || undefined,
      code: searchParams.get('code') || undefined,
      system: searchParams.get('system') || undefined,
      status: searchParams.get('status') || undefined,
      _count: searchParams.get('_count') ? parseInt(searchParams.get('_count')!) : undefined
    }

    // Perform the search
    const bundle = await mockFHIRService.searchFHIR(resourceType, searchCriteria)
    
    return NextResponse.json(bundle, {
      headers: {
        'Content-Type': 'application/fhir+json',
        'X-Mock-Data': 'true',
        'X-Resource-Count': bundle.total.toString()
      }
    })

  } catch (error) {
    console.error('Mock FHIR API error:', error)
    return NextResponse.json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        diagnostics: `Error processing request: ${error}`
      }]
    }, { status: 500 })
  }
}

// Mock FHIR Capability Statement
function getCapabilityStatement() {
  return {
    resourceType: 'CapabilityStatement',
    id: 'mock-fhir-server',
    url: 'http://localhost:3000/api/mock-fhir/metadata',
    version: '1.0.0',
    name: 'MockFHIRServer',
    title: 'Mock FHIR Server for eCR Rule Builder',
    status: 'active',
    experimental: true,
    date: new Date().toISOString(),
    publisher: 'eCR Rule Builder',
    description: 'A mock FHIR server that provides test data for development and testing of eCR rules',
    kind: 'instance',
    software: {
      name: 'Mock FHIR Service',
      version: '1.0.0'
    },
    implementation: {
      description: 'Mock FHIR server using local JSON test data'
    },
    fhirVersion: '4.0.1',
    format: ['application/fhir+json'],
    rest: [{
      mode: 'server',
      documentation: 'Main FHIR endpoint for mock data',
      resource: [
        {
          type: 'Patient',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [
            { name: '_id', type: 'token' },
            { name: 'identifier', type: 'token' },
            { name: 'name', type: 'string' }
          ]
        },
        {
          type: 'Encounter', 
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [
            { name: '_id', type: 'token' },
            { name: 'patient', type: 'reference' },
            { name: 'status', type: 'token' }
          ]
        },
        {
          type: 'Observation',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [
            { name: '_id', type: 'token' },
            { name: 'patient', type: 'reference' },
            { name: 'encounter', type: 'reference' },
            { name: 'code', type: 'token' },
            { name: 'status', type: 'token' }
          ]
        },
        {
          type: 'Condition',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [
            { name: '_id', type: 'token' },
            { name: 'patient', type: 'reference' },
            { name: 'encounter', type: 'reference' },
            { name: 'code', type: 'token' }
          ]
        },
        {
          type: 'Procedure',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [
            { name: '_id', type: 'token' },
            { name: 'patient', type: 'reference' },
            { name: 'encounter', type: 'reference' }
          ]
        },
        {
          type: 'Immunization',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [
            { name: '_id', type: 'token' },
            { name: 'patient', type: 'reference' }
          ]
        }
      ]
    }]
  }
}