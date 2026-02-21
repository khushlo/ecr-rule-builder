// ============ Organization & User Types ============

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' | 'STATE_LICENSE'
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL'
  contactEmail?: string
  contactPhone?: string
  address?: object
  settings: object
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name?: string
  role: 'ADMIN' | 'BUILDER' | 'VIEWER'
  emailVerified?: Date
  image?: string
  organizationId: string
  organization?: Organization
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

// ============ Rule Types ============

export interface Rule {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'TESTING'
  priority: number
  category: 'CONDITION_DETECTION' | 'CASE_CLASSIFICATION' | 'REPORTING_TRIGGER'
  definition: object // Rule logic definition
  fhirVersion: string
  organizationId: string
  createdById: string
  organization?: Organization
  createdBy?: User
  versions: RuleVersion[]
  createdAt: Date
  updatedAt: Date
}

export interface RuleVersion {
  id: string
  version: number
  definition: object
  changelog?: string
  isActive: boolean
  ruleId: string
  rule?: Rule
  createdAt: Date
  updatedAt: Date
}

// ============ API Response Types ============

export interface APIResponse<T> {
  success: true
  data: T
  message?: string
}

export interface APIError {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}