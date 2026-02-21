import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { 
  validateFHIRResource, 
  validateRuleConditionFHIR, 
  validateECRRuleCondition,
  FHIRValidationResult 
} from '@/lib/fhir-validation'

// Rule validation logic
const validateRuleConditions = (conditions: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!conditions || typeof conditions !== 'object') {
    errors.push('Conditions must be a valid object')
    return { isValid: false, errors, warnings }
  }

  // Check for required operator
  if (!conditions.operator) {
    errors.push('Conditions must have an operator (AND, OR, NOT)')
  } else if (!['AND', 'OR', 'NOT', 'SWITCH'].includes(conditions.operator)) {
    errors.push('Invalid operator. Must be one of: AND, OR, NOT, SWITCH')
  }

  // Check for rules array
  if (!Array.isArray(conditions.rules)) {
    errors.push('Conditions must contain a rules array')
  } else {
    if (conditions.rules.length === 0) {
      warnings.push('No condition rules defined')
    }

    // Validate each rule
    conditions.rules.forEach((rule: any, index: number) => {
      if (!rule || typeof rule !== 'object') {
        errors.push(`Rule ${index + 1}: Must be a valid object`)
        return
      }

      // Basic rule validation - allow either field or fhirPath
      if (!rule.field && !rule.fhirPath) {
        errors.push(`Rule ${index + 1}: Must have either 'field' or 'fhirPath'`)
      }

      if (!rule.operator) {
        errors.push(`Rule ${index + 1}: Missing operator property`)
      } else {
        // Validate operator types
        const validOperators = ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'exists']
        if (!validOperators.includes(rule.operator)) {
          warnings.push(`Rule ${index + 1}: Uncommon operator '${rule.operator}'`)
        }
      }

      if (rule.value === undefined || rule.value === null) {
        warnings.push(`Rule ${index + 1}: No value specified`)
      }

      // FHIR-specific validation for eCR rules
      if (rule.fhirPath || rule.resourceType || rule.system) {
        try {
          const fhirValidation = validateECRRuleCondition(rule)
          if (!fhirValidation.isValid) {
            errors.push(...fhirValidation.errors.map(err => `Rule ${index + 1} FHIR: ${err}`))
          }
          warnings.push(...fhirValidation.warnings.map(warn => `Rule ${index + 1} FHIR: ${warn}`))
        } catch (error) {
          warnings.push(`Rule ${index + 1}: FHIR validation error - ${error}`)
        }
      }

      // Validate medical coding systems
      if (rule.code && rule.system) {
        try {
          const fhirConditionValidation = validateRuleConditionFHIR(rule)
          warnings.push(...fhirConditionValidation.warnings.map(warn => `Rule ${index + 1} Coding: ${warn}`))
          if (!fhirConditionValidation.isValid) {
            errors.push(...fhirConditionValidation.errors.map(err => `Rule ${index + 1} Coding: ${err}`))
          }
        } catch (error) {
          warnings.push(`Rule ${index + 1}: Coding validation error - ${error}`)
        }
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

const validateRuleActions = (actions: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!actions || typeof actions !== 'object') {
    errors.push('Actions must be a valid object')
    return { isValid: false, errors, warnings }
  }

  // Check for at least one action type
  const hasNotifications = actions.notifications && Array.isArray(actions.notifications) && actions.notifications.length > 0
  const hasReporting = actions.reporting && typeof actions.reporting === 'object'
  const hasFollowUp = actions.followUp && typeof actions.followUp === 'object'
  const hasValidation = actions.validation && typeof actions.validation === 'object'
  const hasRouting = actions.routing && typeof actions.routing === 'object'

  if (!hasNotifications && !hasReporting && !hasFollowUp && !hasValidation && !hasRouting) {
    warnings.push('No actions defined - rule will not perform any operations')
  }

  // Validate notifications
  if (actions.notifications) {
    if (!Array.isArray(actions.notifications)) {
      errors.push('Notifications must be an array')
    } else {
      actions.notifications.forEach((notification: any, index: number) => {
        if (!notification.type) {
          errors.push(`Notification ${index + 1}: Missing type`)
        }
        if (!notification.recipients || notification.recipients.length === 0) {
          errors.push(`Notification ${index + 1}: No recipients specified`)
        }
      })
    }
  }

  // Validate reporting
  if (actions.reporting) {
    if (actions.reporting.generateECR && !actions.reporting.template) {
      warnings.push('ECR generation enabled but no template specified')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

const validateFhirMapping = (fhirMapping: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!fhirMapping) {
    warnings.push('No FHIR mapping provided - may affect eCR interoperability')
    return { isValid: true, errors, warnings }
  }

  if (typeof fhirMapping !== 'object') {
    errors.push('FHIR mapping must be a valid object')
    return { isValid: false, errors, warnings }
  }

  // Enhanced FHIR resource validation using validation utilities
  Object.keys(fhirMapping).forEach(key => {
    const resource = fhirMapping[key]
    
    if (resource && typeof resource === 'object') {
      // Use the comprehensive FHIR resource validation
      try {
        const validation = validateFHIRResource(resource)
        
        if (!validation.isValid) {
          errors.push(...validation.errors.map(err => `FHIR ${key}: ${err}`))
        }
        warnings.push(...validation.warnings.map(warn => `FHIR ${key}: ${warn}`))
        
        // Additional eCR-specific validations
        if (resource.resourceType) {
          const supportedTypes = ['Patient', 'Encounter', 'Condition', 'Observation', 'DiagnosticReport', 'Composition', 'Bundle']
          if (!supportedTypes.includes(resource.resourceType)) {
            warnings.push(`FHIR ${key}: ResourceType '${resource.resourceType}' is not commonly used in eCR`)
          }
        }

        // Validate specific eCR requirements for Composition
        if (resource.resourceType === 'Composition') {
          if (!resource.type || !resource.type.coding || !resource.type.coding[0]) {
            warnings.push(`FHIR ${key}: Composition should have type.coding for eCR`)
          } else {
            const coding = resource.type.coding[0]
            if (coding.system === 'http://loinc.org' && coding.code === '55751-2') {
              // This is the correct LOINC code for Public health Case report
            } else {
              warnings.push(`FHIR ${key}: Composition type should use LOINC 55751-2 for eCR`)
            }
          }
        }

        // Validate Patient resource for eCR completeness
        if (resource.resourceType === 'Patient') {
          const requiredFields = ['name', 'birthDate', 'gender']
          const missingFields = requiredFields.filter(field => !resource[field])
          if (missingFields.length > 0) {
            warnings.push(`FHIR ${key}: Patient missing recommended fields: ${missingFields.join(', ')}`)
          }
        }

        // Validate Condition resources for proper coding
        if (resource.resourceType === 'Condition') {
          if (!resource.code || !resource.code.coding) {
            errors.push(`FHIR ${key}: Condition must have coded diagnosis`)
          } else {
            const hasSnomedOrIcd = resource.code.coding.some((coding: any) => 
              coding.system === 'http://snomed.info/sct' || 
              coding.system?.includes('icd')
            )
            if (!hasSnomedOrIcd) {
              warnings.push(`FHIR ${key}: Condition should use SNOMED CT or ICD coding for eCR`)
            }
          }
        }

      } catch (error) {
        errors.push(`FHIR ${key}: Validation error - ${error}`)
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// POST /api/rules/[id]/validate - Validate a rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Get the rule
    const rule = await prisma.rule.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      }
    })

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    // Validate conditions
    const conditionsValidation = validateRuleConditions(rule.conditions)
    
    // Validate actions  
    const actionsValidation = validateRuleActions(rule.actions)
    
    // Validate FHIR mapping
    const fhirValidation = validateFhirMapping(rule.fhirMapping)

    // Combine validation results
    const allErrors = [
      ...conditionsValidation.errors,
      ...actionsValidation.errors,
      ...fhirValidation.errors
    ]

    const allWarnings = [
      ...conditionsValidation.warnings,
      ...actionsValidation.warnings,
      ...fhirValidation.warnings
    ]

    const isValid = allErrors.length === 0

    // Update rule validation status
    const validationErrors = allErrors.length > 0 || allWarnings.length > 0 ? {
      errors: allErrors,
      warnings: allWarnings,
      validatedAt: new Date().toISOString()
    } : null

    await prisma.rule.update({
      where: { id },
      data: {
        isValid,
        validationErrors: validationErrors as any,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      isValid,
      validation: {
        conditions: conditionsValidation,
        actions: actionsValidation,
        fhirMapping: fhirValidation,
        overall: {
          errors: allErrors,
          warnings: allWarnings
        }
      }
    })

  } catch (error) {
    console.error('Error validating rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/rules/[id]/validate - Get validation status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const rule = await prisma.rule.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        isValid: true,
        validationErrors: true,
        updatedAt: true
      }
    })

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({
      ruleId: rule.id,
      ruleName: rule.name,
      isValid: rule.isValid,
      validationErrors: rule.validationErrors,
      lastValidated: rule.updatedAt
    })

  } catch (error) {
    console.error('Error getting validation status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}