import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Validation functions (reused from rule validation endpoint)
function validateRuleConditions(conditions: any) {
  const errors: string[] = []
  const warnings: string[] = []

  if (!conditions) {
    errors.push('Rule must have conditions defined')
    return { errors, warnings }
  }

  // Validate operator
  if (!['AND', 'OR', 'NOT'].includes(conditions.operator)) {
    errors.push(`Invalid operator "${conditions.operator}". Must be AND, OR, or NOT`)
  }

  // Validate rules array
  if (!Array.isArray(conditions.rules)) {
    errors.push('Conditions must have a rules array')
    return { errors, warnings }
  }

  if (conditions.rules.length === 0) {
    warnings.push('Rule has no conditions defined')
  }

  // Validate each rule
  conditions.rules.forEach((rule: any, index: number) => {
    const rulePrefix = `Condition ${index + 1}`

    if (!rule.field) {
      errors.push(`${rulePrefix}: field is required`)
    }

    if (!rule.operator) {
      errors.push(`${rulePrefix}: operator is required`)
    } else {
      const validOperators = [
        'EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS',
        'STARTS_WITH', 'ENDS_WITH', 'IN', 'NOT_IN',
        'GREATER_THAN', 'LESS_THAN', 'NOT_EMPTY', 'IS_EMPTY'
      ]
      if (!validOperators.includes(rule.operator)) {
        errors.push(`${rulePrefix}: invalid operator "${rule.operator}"`)
      }
    }

    // Validate value based on operator
    if (!['NOT_EMPTY', 'IS_EMPTY'].includes(rule.operator)) {
      if (rule.value === undefined || rule.value === null || rule.value === '') {
        errors.push(`${rulePrefix}: value is required for operator "${rule.operator}"`)
      }
    }

    // Special validation for list operators
    if (['IN', 'NOT_IN'].includes(rule.operator)) {
      if (!Array.isArray(rule.value) || rule.value.length === 0) {
        errors.push(`${rulePrefix}: "${rule.operator}" operator requires a non-empty array`)
      }
    }

    // Validate field-specific requirements
    if (rule.field && rule.field.includes('diagnosis.code') && !rule.system) {
      warnings.push(`${rulePrefix}: diagnosis code should specify a coding system (ICD-10, SNOMED, etc.)`)
    }
  })

  return { errors, warnings }
}

function validateRuleActions(actions: any) {
  const errors: string[] = []
  const warnings: string[] = []

  if (!actions) {
    warnings.push('Rule has no actions defined')
    return { errors, warnings }
  }

  // Validate notifications
  if (actions.notifications && Array.isArray(actions.notifications)) {
    actions.notifications.forEach((notification: any, index: number) => {
      const notificationPrefix = `Notification ${index + 1}`

      if (!['email', 'sms', 'system'].includes(notification.type)) {
        errors.push(`${notificationPrefix}: invalid type "${notification.type}"`)
      }

      if (!Array.isArray(notification.recipients) || notification.recipients.length === 0) {
        errors.push(`${notificationPrefix}: must have at least one recipient`)
      }

      if (!['immediate', 'high', 'routine'].includes(notification.urgency)) {
        warnings.push(`${notificationPrefix}: invalid urgency "${notification.urgency}", defaulting to "routine"`)
      }

      // Validate email format for email notifications
      if (notification.type === 'email') {
        notification.recipients.forEach((recipient: string, recipientIndex: number) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(recipient)) {
            errors.push(`${notificationPrefix}: invalid email format for recipient ${recipientIndex + 1}`)
          }
        })
      }
    })
  }

  // Validate reporting actions
  if (actions.reporting) {
    if (typeof actions.reporting.generateECR !== 'boolean') {
      errors.push('Reporting: generateECR must be true or false')
    }

    if (actions.reporting.autoSubmit && !actions.reporting.recipients) {
      warnings.push('Reporting: auto-submit enabled but no recipients specified')
    }

    if (actions.reporting.recipients && !Array.isArray(actions.reporting.recipients)) {
      errors.push('Reporting: recipients must be an array')
    }
  }

  // Validate follow-up actions
  if (actions.followUp) {
    if (typeof actions.followUp.createTask !== 'boolean') {
      errors.push('Follow-up: createTask must be true or false')
    }

    if (actions.followUp.createTask && !actions.followUp.assignTo) {
      warnings.push('Follow-up: task creation enabled but no assignment specified')
    }

    if (actions.followUp.dueDate) {
      const validDueDates = ['immediate', '1hour', '4hours', '24hours', '3days', '1week']
      if (!validDueDates.includes(actions.followUp.dueDate)) {
        errors.push(`Follow-up: invalid due date "${actions.followUp.dueDate}"`)
      }
    }
  }

  return { errors, warnings }
}

function validateFhirMapping(ruleDefinition: any) {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for FHIR resource mappings in conditions
  if (ruleDefinition.conditions && ruleDefinition.conditions.rules) {
    ruleDefinition.conditions.rules.forEach((rule: any, index: number) => {
      const fieldMappings: { [key: string]: string } = {
        'diagnosis.code': 'Condition.code',
        'diagnosis.description': 'Condition.code.text',
        'patient.age': 'Patient.birthDate',
        'patient.gender': 'Patient.gender',
        'patient.address.state': 'Patient.address.state',
        'labResult.test': 'Observation.code',
        'labResult.result': 'Observation.valueCodeableConcept',
        'labResult.value': 'Observation.valueQuantity',
        'encounter.class': 'Encounter.class',
        'encounter.type': 'Encounter.type'
      }

      if (rule.field && !fieldMappings[rule.field]) {
        warnings.push(`Condition ${index + 1}: field "${rule.field}" may not have FHIR mapping`)
      }
    })
  }

  return { errors, warnings }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const ruleDefinition = await request.json()

    // Validate structure
    if (!ruleDefinition || typeof ruleDefinition !== 'object') {
      return NextResponse.json({ 
        error: 'Invalid rule definition format' 
      }, { status: 400 })
    }

    // Perform validation
    const conditionsValidation = validateRuleConditions(ruleDefinition.conditions)
    const actionsValidation = validateRuleActions(ruleDefinition.actions)
    const fhirValidation = validateFhirMapping(ruleDefinition)

    // Combine all validation results
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

    return NextResponse.json({
      isValid,
      validation: {
        conditions: conditionsValidation,
        actions: actionsValidation,
        fhir: fhirValidation,
        overall: {
          errors: allErrors,
          warnings: allWarnings
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json({ 
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}