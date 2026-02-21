/**
 * Mock FHIR Individual Resource Endpoint
 * GET /api/mock-fhir/[resourceType]/[id] - Get a specific resource by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { mockFHIRService } from '@/lib/mock-fhir-service'

interface RouteParams {
  params: Promise<{
    resourceType: string
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { resourceType, id } = await params

    // Check if mock service is enabled
    if (!mockFHIRService.isEnabled()) {
      return NextResponse.json({
        error: 'Mock FHIR service is disabled',
        message: 'Set NODE_ENV=development or USE_TEST_DATA=true to enable'
      }, { status: 503 })
    }

    // Validate resource type
    const supportedTypes = ['Patient', 'Encounter', 'Observation', 'Condition', 'Procedure', 'Immunization']
    if (!supportedTypes.includes(resourceType)) {
      return NextResponse.json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'not-supported',
          diagnostics: `Resource type '${resourceType}' is not supported`
        }]
      }, { status: 400 })
    }

    // Get the specific resource
    const resource = await mockFHIRService.getResource(resourceType, id)
    
    if (!resource) {
      return NextResponse.json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'not-found',
          diagnostics: `${resourceType} with id '${id}' not found`
        }]
      }, { status: 404 })
    }

    return NextResponse.json(resource, {
      headers: {
        'Content-Type': 'application/fhir+json',
        'X-Mock-Data': 'true',
        'X-Resource-Type': resourceType,
        'X-Resource-ID': id
      }
    })

  } catch (error) {
    const { resourceType, id } = await params
    console.error(`Mock FHIR API error for ${resourceType}/${id}:`, error)
    return NextResponse.json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        diagnostics: `Error retrieving ${resourceType}/${id}: ${error}`
      }]
    }, { status: 500 })
  }
}