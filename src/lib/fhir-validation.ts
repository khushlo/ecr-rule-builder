import * as fhirpath from 'fhirpath';

// FHIR Resource Types for eCR
export const FHIR_RESOURCE_TYPES = {
  PATIENT: 'Patient',
  ENCOUNTER: 'Encounter', 
  OBSERVATION: 'Observation',
  CONDITION: 'Condition',
  DIAGNOSTIC_REPORT: 'DiagnosticReport',
  MEDICATION_ADMINISTRATION: 'MedicationAdministration',
  PROCEDURE: 'Procedure',
  IMMUNIZATION: 'Immunization',
  COMPOSITION: 'Composition',
  BUNDLE: 'Bundle'
} as const;

// Common FHIR paths for eCR conditions
export const COMMON_FHIR_PATHS = {
  // Patient demographics
  PATIENT_ID: 'Patient.id',
  PATIENT_NAME: 'Patient.name.family',
  PATIENT_BIRTHDATE: 'Patient.birthDate',
  PATIENT_GENDER: 'Patient.gender',
  PATIENT_ADDRESS: 'Patient.address',
  
  // Condition/Diagnosis
  CONDITION_CODE: 'Condition.code.coding.code',
  CONDITION_SYSTEM: 'Condition.code.coding.system',
  CONDITION_DISPLAY: 'Condition.code.coding.display',
  CONDITION_ONSET: 'Condition.onsetDateTime',
  
  // Observations (Lab Results)
  OBSERVATION_CODE: 'Observation.code.coding.code',
  OBSERVATION_VALUE: 'Observation.valueQuantity.value',
  OBSERVATION_UNIT: 'Observation.valueQuantity.unit',
  OBSERVATION_DATE: 'Observation.effectiveDateTime',
  
  // Encounter
  ENCOUNTER_CLASS: 'Encounter.class.code',
  ENCOUNTER_TYPE: 'Encounter.type.coding.code',
  ENCOUNTER_PERIOD: 'Encounter.period'
} as const;

// FHIR validation result interface
export interface FHIRValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extractedData?: any;
}

// Validate FHIR resource structure
export function validateFHIRResource(resource: any): FHIRValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!resource) {
    errors.push('Resource is null or undefined');
    return { isValid: false, errors, warnings };
  }

  if (typeof resource !== 'object') {
    errors.push('Resource must be an object');
    return { isValid: false, errors, warnings };
  }

  // Check for required FHIR resource properties
  if (!resource.resourceType) {
    errors.push('Resource missing required resourceType');
  } else if (!Object.values(FHIR_RESOURCE_TYPES).includes(resource.resourceType)) {
    warnings.push(`Uncommon resource type: ${resource.resourceType}`);
  }

  // Validate basic FHIR structure
  if (resource.resourceType !== 'Bundle' && !resource.id) {
    warnings.push('Resource missing id field');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate FHIR path expression
export function validateFHIRPath(path: string): FHIRValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!path || typeof path !== 'string') {
    errors.push('FHIR path must be a non-empty string');
    return { isValid: false, errors, warnings };
  }

  try {
    // Basic syntax validation using fhirpath library
    fhirpath.compile(path);
  } catch (error) {
    errors.push(`Invalid FHIR path syntax: ${error}`);
    return { isValid: false, errors, warnings };
  }

  // Check for common patterns
  if (path.includes('..')) {
    warnings.push('Path contains recursive traversal (..) which may affect performance');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Extract data from FHIR resource using FHIRPath
export function extractFHIRData(resource: any, path: string): any {
  try {
    const result = fhirpath.evaluate(resource, path) as any;
    // fhirpath typically returns an array of results
    if (Array.isArray(result)) {
      return result.length === 1 ? result[0] : result;
    }
    return result;
  } catch (error) {
    console.error('Error extracting FHIR data:', error);
    return null;
  }
}

// Validate rule condition against FHIR resource
export function validateRuleConditionFHIR(
  condition: any,
  fhirResource?: any
): FHIRValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const extractedData: any = {};

  if (!condition || typeof condition !== 'object') {
    errors.push('Condition must be a valid object');
    return { isValid: false, errors, warnings };
  }

  // Validate condition structure for FHIR compatibility
  if (condition.fhirPath) {
    const pathValidation = validateFHIRPath(condition.fhirPath);
    errors.push(...pathValidation.errors);
    warnings.push(...pathValidation.warnings);

    // If we have a FHIR resource, test the path
    if (fhirResource && pathValidation.isValid) {
      try {
        const extracted = extractFHIRData(fhirResource, condition.fhirPath);
        extractedData[condition.fhirPath] = extracted;
        
        if (extracted === null || extracted === undefined) {
          warnings.push(`FHIR path "${condition.fhirPath}" returned no data`);
        }
      } catch (error) {
        errors.push(`Error evaluating FHIR path "${condition.fhirPath}": ${error}`);
      }
    }
  }

  // Validate coding systems (ICD-10, LOINC, SNOMED, etc.)
  if (condition.code && condition.system) {
    const validSystems = [
      'http://hl7.org/fhir/sid/icd-10',
      'http://hl7.org/fhir/sid/icd-9-cm',
      'http://loinc.org',
      'http://snomed.info/sct',
      'http://www.nlm.nih.gov/research/umls/rxnorm'
    ];

    if (!validSystems.includes(condition.system)) {
      warnings.push(`Uncommon coding system: ${condition.system}`);
    }

    // Basic code format validation
    if (condition.system === 'http://hl7.org/fhir/sid/icd-10' && condition.code) {
      if (!/^[A-Z]\d{2}(\.\d+)?$/.test(condition.code)) {
        warnings.push(`Code "${condition.code}" may not be valid ICD-10 format`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    extractedData
  };
}

// Generate FHIR Bundle for eCR
export function generateECRBundle(
  patient: any,
  conditions: any[],
  observations: any[],
  encounter?: any
): any {
  const bundleId = `ecr-bundle-${Date.now()}`;
  
  const bundle: any = {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'document',
    timestamp: new Date().toISOString(),
    entry: [] as any[]
  };

  // Add Composition (required for document bundle)
  const composition = {
    fullUrl: `urn:uuid:composition-${bundleId}`,
    resource: {
      resourceType: 'Composition',
      id: `composition-${bundleId}`,
      status: 'final',
      type: {
        coding: [{
          system: 'http://loinc.org',
          code: '55751-2',
          display: 'Public health Case report'
        }]
      },
      subject: {
        reference: `Patient/${patient?.id || 'unknown'}`
      },
      date: new Date().toISOString(),
      author: [{
        display: 'eCR Rule Builder System'
      }],
      title: 'Electronic Case Report',
      section: []
    }
  };

  bundle.entry.push(composition);

  // Add Patient
  if (patient) {
    bundle.entry.push({
      fullUrl: `urn:uuid:patient-${patient.id}`,
      resource: patient
    });
  }

  // Add Conditions
  conditions.forEach((condition, index) => {
    bundle.entry.push({
      fullUrl: `urn:uuid:condition-${index}`,
      resource: condition
    });
  });

  // Add Observations
  observations.forEach((observation, index) => {
    bundle.entry.push({
      fullUrl: `urn:uuid:observation-${index}`,
      resource: observation
    });
  });

  // Add Encounter if provided
  if (encounter) {
    bundle.entry.push({
      fullUrl: `urn:uuid:encounter-${encounter.id}`,
      resource: encounter
    });
  }

  return bundle;
}

// Validate complete eCR Bundle
export function validateECRBundle(bundle: any): FHIRValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic bundle validation
  const bundleValidation = validateFHIRResource(bundle);
  errors.push(...bundleValidation.errors);
  warnings.push(...bundleValidation.warnings);

  if (bundle.resourceType !== 'Bundle') {
    errors.push('Resource must be a Bundle');
    return { isValid: false, errors, warnings };
  }

  if (bundle.type !== 'document') {
    errors.push('eCR Bundle must be of type "document"');
  }

  if (!bundle.entry || !Array.isArray(bundle.entry)) {
    errors.push('Bundle must contain an entry array');
    return { isValid: false, errors, warnings };
  }

  // Check for required Composition
  const hasComposition = bundle.entry.some((entry: any) => 
    entry.resource?.resourceType === 'Composition'
  );
  if (!hasComposition) {
    errors.push('eCR Bundle must contain a Composition resource');
  }

  // Check for Patient
  const hasPatient = bundle.entry.some((entry: any) => 
    entry.resource?.resourceType === 'Patient'
  );
  if (!hasPatient) {
    warnings.push('eCR Bundle should contain a Patient resource');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Quick validation for rule conditions in eCR context
export function validateECRRuleCondition(condition: any): FHIRValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!condition) {
    errors.push('Condition is required');
    return { isValid: false, errors, warnings };
  }

  // Check for eCR-specific required fields
  const requiredFields = ['resourceType', 'path', 'operator', 'value'];
  const missingFields = requiredFields.filter(field => !condition[field]);
  
  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate FHIR path if present
  if (condition.path) {
    const pathValidation = validateFHIRPath(condition.path);
    errors.push(...pathValidation.errors);
    warnings.push(...pathValidation.warnings);
  }

  // Validate operators
  const validOperators = ['equals', 'contains', 'exists', 'in', 'matches', 'greater', 'less'];
  if (condition.operator && !validOperators.includes(condition.operator)) {
    warnings.push(`Uncommon operator: ${condition.operator}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Enhanced rule execution engine for testing conditions against FHIR data
export interface RuleExecutionResult {
  conditionMet: boolean;
  executedConditions: Array<{
    condition: any;
    result: boolean;
    extractedValue: any;
    error?: string;
  }>;
  overallResult: boolean;
  logicOperator: 'AND' | 'OR';
  executionTimeMs: number;
}

export function executeRuleAgainstFHIR(
  conditions: any[],
  fhirResources: any[],
  logicOperator: 'AND' | 'OR' = 'AND'
): RuleExecutionResult {
  const startTime = Date.now();
  const executedConditions: RuleExecutionResult['executedConditions'] = [];
  
  for (const condition of conditions) {
    const conditionResult = {
      condition,
      result: false,
      extractedValue: null as any,
      error: undefined as string | undefined
    };

    try {
      // Find matching resource type
      const matchingResources = fhirResources.filter(resource => 
        resource.resourceType === condition.resourceType
      );

      if (matchingResources.length === 0) {
        conditionResult.error = `No ${condition.resourceType} resources found`;
        executedConditions.push(conditionResult);
        continue;
      }

      // Test condition against each matching resource
      for (const resource of matchingResources) {
        const extractedValue = extractFHIRData(resource, condition.path);
        conditionResult.extractedValue = extractedValue;

        // Evaluate condition based on operator
        const conditionMet = evaluateCondition(extractedValue, condition.operator, condition.value);
        
        if (conditionMet) {
          conditionResult.result = true;
          break; // If any resource matches, condition is met
        }
      }
    } catch (error) {
      conditionResult.error = `Execution error: ${error}`;
    }

    executedConditions.push(conditionResult);
  }

  // Calculate overall result based on logic operator
  let overallResult: boolean;
  if (logicOperator === 'AND') {
    overallResult = executedConditions.every(c => c.result);
  } else {
    overallResult = executedConditions.some(c => c.result);
  }

  return {
    conditionMet: overallResult,
    executedConditions,
    overallResult,
    logicOperator,
    executionTimeMs: Date.now() - startTime
  };
}

// Helper function to evaluate individual conditions
function evaluateCondition(extractedValue: any, operator: string, expectedValue: any): boolean {
  if (extractedValue === null || extractedValue === undefined) {
    return operator === 'exists' ? false : false;
  }

  switch (operator) {
    case 'equals':
    case '=':
      return extractedValue === expectedValue;
    
    case 'not_equals':
    case '!=':
      return extractedValue !== expectedValue;
    
    case 'contains':
      return String(extractedValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    
    case 'in':
      if (Array.isArray(expectedValue)) {
        return expectedValue.includes(extractedValue);
      }
      return String(expectedValue).split(',').map(v => v.trim()).includes(String(extractedValue));
    
    case 'greater':
    case '>':
      return Number(extractedValue) > Number(expectedValue);
    
    case 'less':
    case '<':
      return Number(extractedValue) < Number(expectedValue);
    
    case 'exists':
      return extractedValue !== null && extractedValue !== undefined;
    
    case 'matches':
      try {
        const regex = new RegExp(expectedValue, 'i');
        return regex.test(String(extractedValue));
      } catch {
        return false;
      }
    
    default:
      return false;
  }
}

// Generate test FHIR data for rule testing
export function generateTestFHIRData(resourceTypes: string[]): any[] {
  const testData: any[] = [];

  resourceTypes.forEach(resourceType => {
    switch (resourceType) {
      case 'Patient':
        testData.push({
          resourceType: 'Patient',
          id: 'test-patient-1',
          name: [{ family: 'Johnson', given: ['Sarah'] }],
          gender: 'female',
          birthDate: '1985-03-15',
          address: [{ state: 'CA', city: 'Los Angeles', postalCode: '90210' }],
          telecom: [{ system: 'phone', value: '555-0123' }]
        });
        break;

      case 'Condition':
        testData.push({
          resourceType: 'Condition',
          id: 'test-condition-1',
          code: {
            coding: [{
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: 'U07.1',
              display: 'COVID-19'
            }]
          },
          subject: { reference: 'Patient/test-patient-1' },
          onsetDateTime: '2024-02-10T08:30:00Z',
          clinicalStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
          }
        });
        break;

      case 'Observation':
        testData.push({
          resourceType: 'Observation',
          id: 'test-observation-1',
          status: 'final',
          code: {
            coding: [{
              system: 'http://loinc.org',
              code: '94500-6',
              display: 'SARS-CoV-2 (COVID-19) RNA [Presence] in Respiratory specimen by NAA with probe detection'
            }]
          },
          subject: { reference: 'Patient/test-patient-1' },
          effectiveDateTime: '2024-02-10T10:30:00Z',
          valueCodeableConcept: {
            coding: [{
              system: 'http://snomed.info/sct',
              code: '260373001',
              display: 'Detected'
            }]
          }
        });
        break;

      case 'Encounter':
        testData.push({
          resourceType: 'Encounter',
          id: 'test-encounter-1',
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          type: [{
            coding: [{
              system: 'http://snomed.info/sct',
              code: '185345009',
              display: 'Encounter for symptom'
            }]
          }],
          subject: { reference: 'Patient/test-patient-1' },
          period: {
            start: '2024-02-10T08:00:00Z',
            end: '2024-02-10T09:00:00Z'
          }
        });
        break;
    }
  });

  return testData;
}

// Advanced FHIRPath testing with detailed results
export interface FHIRPathTestResult {
  isValid: boolean;
  path: string;
  results: Array<{
    resourceId: string;
    resourceType: string;
    extractedValue: any;
    dataType: string;
  }>;
  errors: string[];
  suggestions?: string[];
}

export function testFHIRPathOnResources(
  fhirPath: string,
  resources: any[]
): FHIRPathTestResult {
  const results: FHIRPathTestResult['results'] = [];
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Validate FHIRPath syntax first
  const pathValidation = validateFHIRPath(fhirPath);
  if (!pathValidation.isValid) {
    return {
      isValid: false,
      path: fhirPath,
      results: [],
      errors: pathValidation.errors,
      suggestions
    };
  }

  // Test path against each resource
  for (const resource of resources) {
    try {
      const extractedValue = extractFHIRData(resource, fhirPath);
      
      results.push({
        resourceId: resource.id || 'unknown',
        resourceType: resource.resourceType || 'unknown',
        extractedValue,
        dataType: Array.isArray(extractedValue) 
          ? 'array' 
          : extractedValue === null 
            ? 'null' 
            : typeof extractedValue
      });

      // Add suggestions for empty results
      if (extractedValue === null || extractedValue === undefined) {
        if (!suggestions.includes(`No data found for path "${fhirPath}" in ${resource.resourceType}`)) {
          suggestions.push(`No data found for path "${fhirPath}" in ${resource.resourceType}`);
        }
      }
    } catch (error) {
      errors.push(`Error evaluating path "${fhirPath}" on ${resource.resourceType}: ${error}`);
    }
  }

  return {
    isValid: errors.length === 0,
    path: fhirPath,
    results,
    errors,
    suggestions
  };
}