# Test Data for eCR Rule Builder

This directory contains test FHIR resources for developing and testing eCR (electronic Case Reporting) rules without requiring access to live EHR systems.

## Directory Structure

```
src/test-data/
├── patient/          # Patient resources
├── encounter/        # Encounter resources  
├── observation/      # Laboratory and clinical observations
├── condition/        # Diagnosis and condition resources
├── procedure/        # Medical procedures
├── immunization/     # Vaccination records
└── README.md         # This file
```

## Usage

### Environment Configuration

The test data service is automatically enabled in development mode. You can control it with environment variables:

```bash
# Enable test data (default in development)
NODE_ENV=development
USE_TEST_DATA=true

# Force enable in any environment
FORCE_TEST_DATA=true

# Disable test data completely
DISABLE_TEST_DATA=true

# Custom test data directory
TEST_DATA_DIR=custom/path/to/test-data
```

### API Endpoints

#### Mock FHIR Server
- Base URL: `http://localhost:3000/api/mock-fhir`
- Metadata: `GET /api/mock-fhir/metadata`
- Search resources: `GET /api/mock-fhir/[resourceType]?[params]`
- Get resource: `GET /api/mock-fhir/[resourceType]/[id]`

#### Examples
```bash
# Get all patients
curl http://localhost:3000/api/mock-fhir/Patient

# Get patient by ID
curl http://localhost:3000/api/mock-fhir/Patient/patient-001

# Search observations by patient
curl "http://localhost:3000/api/mock-fhir/Observation?patient=patient-001"

# Search conditions by code
curl "http://localhost:3000/api/mock-fhir/Condition?code=U07.1"
```

### Rule Testing

Test rules against mock data using the validation API:

```javascript
// Test rule against all test data
const response = await fetch('/api/rules/validate-fhir', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    testType: 'liveData',
    conditions: [
      {
        fhirPath: 'Condition.code.coding.code',
        operator: 'equals',
        value: 'U07.1'
      }
    ],
    logicOperator: 'AND'
  })
})
```

## Test Data Contents

### Patients (3 records)
- **patient-001**: John Smith (Male, 1985) - COVID-19 case
- **patient-002**: Maria Johnson (Female, 1992) - Upper respiratory infection  
- **patient-003**: Robert Davis (Male, 1978) - Shigellosis case

### Conditions
- **COVID-19** (U07.1) - Reportable condition
- **Upper respiratory infection** (J06.9) - Common condition
- **Shigellosis** (A03.9) - Reportable condition

### Observations
- **COVID-19 antigen test** - Positive result
- **White blood cell count** - Elevated
- **Stool culture** - Shigella species detected

### Encounters
- **Inpatient admission** - For severe COVID-19
- **Outpatient visit** - For respiratory symptoms
- **Emergency visit** - For gastroenteritis

## Adding Test Data

### 1. Create FHIR Resource Files

Add JSON files in the appropriate subdirectory:

```json
{
  "resourceType": "Patient",
  "id": "patient-004",
  "name": [
    {
      "family": "Brown",
      "given": ["Alice"]
    }
  ],
  "gender": "female",
  "birthDate": "1990-05-15"
}
```

### 2. Follow FHIR R4 Specification

Ensure resources conform to [FHIR R4](https://hl7.org/fhir/R4/) specification.

### 3. Use Realistic Clinical Codes

Include proper coding systems:
- **ICD-10-CM**: For diagnoses
- **LOINC**: For laboratory tests
- **SNOMED CT**: For clinical concepts
- **CVX**: For vaccines

## eCR-Specific Considerations

The test data includes scenarios relevant to electronic Case Reporting:

### Reportable Conditions
- COVID-19 (U07.1)
- Shigellosis (A03.9)
- Other infectious diseases

### Laboratory Results
- Pathogen detection
- Antimicrobial susceptibility
- Public health markers

### Patient Demographics
- Complete address information
- Contact details for case investigation

## Development Workflow

1. **Start Development Server**: Test data loads automatically
2. **Create Rules**: Use the rule builder to define conditions
3. **Test with Mock Data**: Validate rules against realistic scenarios
4. **Refine Rules**: Iterate based on test results
5. **Deploy**: Switch to live EHR integration when ready

## Troubleshooting

### Test Data Not Loading
- Check console for file system errors
- Verify JSON syntax in test files
- Ensure directory structure is correct

### Mock API Not Working
- Confirm `NODE_ENV=development` or `USE_TEST_DATA=true`
- Check for port conflicts on 3000
- Review API logs for errors

### Rule Testing Issues
- Validate FHIR paths using the extraction test
- Check that condition codes match test data
- Verify logic operators (AND/OR)

## Security Note

This test data contains synthetic information only. No real patient data should ever be stored in this directory.