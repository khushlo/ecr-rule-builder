import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  validateFHIRResource, 
  validateECRBundle, 
  generateECRBundle,
  extractFHIRData,
  COMMON_FHIR_PATHS 
} from '@/lib/fhir-validation'
import { mockFHIRService } from '@/lib/mock-fhir-service'
import { testDataService } from '@/lib/test-data-service'

// POST /api/rules/validate-fhir - Test FHIR validation with sample data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fhirResource, testType = 'resource', conditions, logicOperator = 'AND' } = body

    let validationResult: any = {}

    switch (testType) {
      case 'resource':
        // Validate a single FHIR resource
        if (!fhirResource) {
          return NextResponse.json(
            { error: 'FHIR resource is required for resource validation' },
            { status: 400 }
          )
        }
        validationResult = validateFHIRResource(fhirResource)
        break

      case 'bundle':
        // Validate an eCR Bundle
        if (!fhirResource) {
          return NextResponse.json(
            { error: 'FHIR resource is required for bundle validation' },
            { status: 400 }
          )
        }
        validationResult = validateECRBundle(fhirResource)
        break

      case 'extract':
        // Test FHIRPath extraction
        if (!fhirResource) {
          return NextResponse.json(
            { error: 'FHIR resource is required for extraction test' },
            { status: 400 }
          )
        }
        const { fhirPath } = body
        if (!fhirPath) {
          return NextResponse.json(
            { error: 'fhirPath is required for extraction test' },
            { status: 400 }
          )
        }
        
        const extractedData = extractFHIRData(fhirResource, fhirPath)
        validationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          extractedData,
          fhirPath
        }
        break

      case 'liveData':
        // Test rules against mock live data
        if (!conditions || !Array.isArray(conditions)) {
          return NextResponse.json(
            { error: 'conditions array is required for live data testing' },
            { status: 400 }
          )
        }

        if (!mockFHIRService.isEnabled()) {
          return NextResponse.json(
            { error: 'Mock FHIR service is not enabled. Set NODE_ENV=development or USE_TEST_DATA=true' },
            { status: 503 }
          )
        }

        try {
          validationResult = await mockFHIRService.testRuleAgainstLiveData(
            conditions,
            logicOperator
          )
          validationResult.testDataSummary = mockFHIRService.getTestDataSummary()
        } catch (error) {
          return NextResponse.json(
            { error: `Error testing against mock data: ${error}` },
            { status: 500 }
          )
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid testType. Use: resource, bundle, extract, or liveData' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      testType,
      validation: validationResult,
      commonPaths: testType === 'extract' ? COMMON_FHIR_PATHS : undefined
    })

  } catch (error) {
    console.error('Error in FHIR validation test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/rules/validate-fhir - Get sample FHIR resources for testing
export async function GET() {
  try {
    // Check if test data service is enabled
    if (testDataService.isEnabled()) {
      // Use test data from files
      const patients = testDataService.loadResourcesByType('Patient')
      const conditions = testDataService.loadResourcesByType('Condition')
      const observations = testDataService.loadResourcesByType('Observation')
      const encounters = testDataService.loadResourcesByType('Encounter')
      
      const samplePatient = patients[0]
      const sampleCondition = conditions[0]
      const sampleObservation = observations[0]
      const sampleEncounter = encounters[0]

      // Generate a complete eCR Bundle using test data
      const sampleBundle = generateECRBundle(
        samplePatient || {},
        sampleCondition ? [sampleCondition] : [],
        sampleObservation ? [sampleObservation] : []
      )

      return NextResponse.json({
        samples: {
          patient: samplePatient,
          condition: sampleCondition,
          observation: sampleObservation,
          encounter: sampleEncounter,
          ecrBundle: sampleBundle
        },
        testDataSummary: testDataService.getDataSummary(),
        mockEndpoints: mockFHIRService.getAvailableEndpoints(),
        commonPaths: COMMON_FHIR_PATHS,
        instructions: {
          testResource: 'POST with {"fhirResource": resource, "testType": "resource"}',
          testBundle: 'POST with {"fhirResource": bundle, "testType": "bundle"}', 
          testExtraction: 'POST with {"fhirResource": resource, "fhirPath": "Patient.name.family", "testType": "extract"}',
          testLiveData: 'POST with {"conditions": [conditions], "logicOperator": "AND", "testType": "liveData"}'
        }
      })
    }

    // Fallback to hardcoded samples if test data is not available
    const samplePatient = {
      resourceType: 'Patient',
      id: 'example-patient-001',
      name: [{ family: 'Doe', given: ['John'] }],
      gender: 'male',
      birthDate: '1980-01-15',
      address: [
        {
          line: ['123 Main St'],
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'US'
        }
      ]
    }

    const sampleCondition = {
      resourceType: 'Condition',
      id: 'covid-19-condition',
      subject: { reference: 'Patient/example-patient-001' },
      code: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: 'U07.1',
            display: 'COVID-19'
          }
        ]
      },
      onsetDateTime: '2024-02-10',
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }
        ]
      }
    }

    const sampleObservation = {
      resourceType: 'Observation',
      id: 'covid-test-result',
      status: 'final',
      subject: { reference: 'Patient/example-patient-001' },
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '94500-6',
            display: 'SARS-CoV-2 RNA [Presence] in Respiratory specimen by NAA with probe detection'
          }
        ]
      },
      valueCodeableConcept: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '260373001',
            display: 'Detected'
          }
        ]
      },
      effectiveDateTime: '2024-02-10T10:30:00Z'
    }

    const sampleBundle = generateECRBundle(
      samplePatient,
      [sampleCondition],
      [sampleObservation]
    )

    return NextResponse.json({
      samples: {
        patient: samplePatient,
        condition: sampleCondition,
        observation: sampleObservation,
        ecrBundle: sampleBundle
      },
      testDataAvailable: false,
      commonPaths: COMMON_FHIR_PATHS,
      instructions: {
        testResource: 'POST with {"fhirResource": resource, "testType": "resource"}',
        testBundle: 'POST with {"fhirResource": bundle, "testType": "bundle"}', 
        testExtraction: 'POST with {"fhirResource": resource, "fhirPath": "Patient.name.family", "testType": "extract"}'
      }
    })

  } catch (error) {
    console.error('Error generating sample FHIR resources:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}