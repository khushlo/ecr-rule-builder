import { z } from 'zod'

// ============ Auth Schemas ============

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  organizationSlug: z.string().min(2, 'Organization slug must be at least 2 characters').regex(
    /^[a-z0-9-]+$/,
    'Slug can only contain lowercase letters, numbers, and hyphens'
  ),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

// ============ Rule Schemas ============

export const ruleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(255),
  description: z.string().optional(),
  category: z.enum(['CONDITION_DETECTION', 'CASE_CLASSIFICATION', 'REPORTING_TRIGGER']),
  priority: z.number().min(1).max(100),
  definitions: z.object({
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.any(),
    })),
    actions: z.array(z.object({
      type: z.string(),
      parameters: z.record(z.string(), z.any()),
    })),
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type RuleInput = z.infer<typeof ruleSchema>