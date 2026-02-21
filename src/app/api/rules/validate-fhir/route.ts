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

// POST /api/rules/validate-fhir - Test FHIR validation with sample data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fhirResource, testType = 'resource' } = body

    if (!fhirResource) {
      return NextResponse.json(
        { error: 'FHIR resource is required' },
        { status: 400 }
      )
    }

    let validationResult: any = {}

    switch (testType) {
      case 'resource':
        // Validate a single FHIR resource
        validationResult = validateFHIRResource(fhirResource)
        break

      case 'bundle':
        // Validate an eCR Bundle
        validationResult = validateECRBundle(fhirResource)
        break

      case 'extract':
        // Test FHIRPath extraction
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

      default:
        return NextResponse.json(
          { error: 'Invalid testType. Use: resource, bundle, or extract' },
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
    const samplePatient = {
      resourceType: 'Patient',
      id: 'example-patient-001',
      name: [
        {
          family: 'Doe',
          given: ['John']
        }
      ],
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
      subject: {
        reference: 'Patient/example-patient-001'
      },
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
      subject: {
        reference: 'Patient/example-patient-001'
      },
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

    // Generate a complete eCR Bundle
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