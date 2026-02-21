import { Rule, APIError } from '@/types'
import { z } from 'zod'

// Define form schemas directly
const CreateRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  reportableCondition: z.string().min(1),
  category: z.enum(['CONDITION_DETECTION', 'DATA_VALIDATION', 'ROUTING', 'TRANSFORMATION']),
  priority: z.number().min(1).max(10).default(5),
  conditions: z.string().min(1),
  actions: z.string().min(1),
  fhirMapping: z.object({}).passthrough().optional(),
})

const UpdateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  reportableCondition: z.string().min(1).optional(),
  category: z.enum(['CONDITION_DETECTION', 'DATA_VALIDATION', 'ROUTING', 'TRANSFORMATION']).optional(),
  priority: z.number().min(1).max(10).optional(),
  conditions: z.string().optional(),
  actions: z.string().optional(),
  fhirMapping: z.object({}).passthrough().optional(),
})

// Infer form types from schemas
type CreateRuleForm = z.infer<typeof CreateRuleSchema>
type UpdateRuleForm = z.infer<typeof UpdateRuleSchema>

// Types for API responses
interface RulesResponse {
  rules: Rule[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Additional API-specific types
interface RuleFilters {
  status?: string
  category?: string
  search?: string
}

const API_BASE = '/api'

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      let errorData: APIError
      try {
        errorData = await response.json()
      } catch {
        errorData = { 
          success: false, 
          error: { 
            code: 'NETWORK_ERROR', 
            message: 'Network error occurred' 
          } 
        }
      }
      throw new Error(errorData.error.message || 'API request failed')
    }

    return response.json()
  }

  // Rules API
  async getRules(filters?: RuleFilters): Promise<RulesResponse> {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.category) params.append('category', filters.category)
    if (filters?.search) params.append('search', filters.search)
    
    const query = params.toString()
    return this.request<RulesResponse>(`/rules${query ? `?${query}` : ''}`)
  }

  async getRule(id: string): Promise<{ rule: Rule }> {
    return this.request<{ rule: Rule }>(`/rules/${id}`)
  }

  async createRule(data: CreateRuleForm): Promise<{ rule: Rule }> {
    return this.request<{ rule: Rule }>('/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRule(id: string, data: UpdateRuleForm): Promise<{ rule: Rule }> {
    return this.request<{ rule: Rule }>(`/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteRule(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/rules/${id}`, {
      method: 'DELETE',
    })
  }

  async validateRule(id: string): Promise<{ rule: Rule }> {
    return this.request<{ rule: Rule }>(`/rules/${id}/validate`, {
      method: 'POST',
    })
  }
}

export const api = new ApiClient()