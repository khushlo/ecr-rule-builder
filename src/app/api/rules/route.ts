import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  reportableCondition: z.string().min(1, 'Reportable condition is required'),
  category: z.enum(['CONDITION_DETECTION', 'DATA_VALIDATION', 'ROUTING', 'TRANSFORMATION']),
  priority: z.number().min(1).max(10).default(5),
  conditions: z.object({}).passthrough(), // JSON object
  actions: z.object({}).passthrough(), // JSON object
  fhirMapping: z.object({}).passthrough().optional(), // JSON object
})

// GET /api/rules - List all rules for the organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const where: any = {
      organizationId: session.user.organizationId,
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (category && category !== 'ALL') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reportableCondition: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const rules = await prisma.rule.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { executions: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Error fetching rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/rules - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can create rules
    if (!['ADMIN', 'BUILDER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = CreateRuleSchema.parse(body)

    const rule = await prisma.rule.create({
      data: {
        ...validatedData,
        conditions: validatedData.conditions as any,
        actions: validatedData.actions as any,
        fhirMapping: validatedData.fhirMapping as any,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
        status: 'DRAFT', // All new rules start as drafts
        isValid: false, // Requires validation
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Error creating rule:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}