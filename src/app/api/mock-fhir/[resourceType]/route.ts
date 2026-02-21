/**
 * Mock FHIR Resource Type Endpoint
 * GET /api/mock-fhir/[resourceType] - Search for resources of a specific type
 */

import { NextRequest, NextResponse } from 'next/server'
import { mockFHIRService } from '@/lib/mock-fhir-service'

interface RouteParams {
  params: Promise<{
    resourceType: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { resourceType } = await params
    const { searchParams } = new URL(request.url)

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
        'X-Resource-Count': bundle.total.toString(),
        'X-Resource-Type': resourceType
      }
    })

  } catch (error) {
    const { resourceType } = await params
    console.error(`Mock FHIR API error for ${resourceType}:`, error)
    return NextResponse.json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        diagnostics: `Error processing ${resourceType} search: ${error}`
      }]
    }, { status: 500 })
  }
}