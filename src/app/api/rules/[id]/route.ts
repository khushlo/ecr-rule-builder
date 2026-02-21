import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  reportableCondition: z.string().min(1).optional(),
  category: z.enum(['CONDITION_DETECTION', 'DATA_VALIDATION', 'ROUTING', 'TRANSFORMATION']).optional(),
  priority: z.number().min(1).max(10).optional(),
  conditions: z.object({}).passthrough().optional(),
  actions: z.object({}).passthrough().optional(),
  fhirMapping: z.object({}).passthrough().optional(),
  status: z.enum(['DRAFT', 'TESTING', 'PUBLISHED', 'ARCHIVED', 'ERROR']).optional(),
  version: z.number().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
})

// GET /api/rules/[id] - Get a specific rule
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
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        versions: {
          select: {
            id: true,
            version: true,
            status: true,
            createdAt: true,
            createdBy: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        executions: {
          select: {
            id: true,
            status: true,
            duration: true,
            startedAt: true
          },
          orderBy: { startedAt: 'desc' },
          take: 5
        }
      }
    })

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Error fetching rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/rules/[id] - Update a rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can edit rules
    if (!['ADMIN', 'BUILDER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params
    // Check if rule exists and belongs to organization
    const existingRule = await prisma.rule.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      }
    })

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = UpdateRuleSchema.parse(body)

    // Create a new version if this is a published rule being updated
    let updateData = { ...validatedData }
    if (existingRule.status === 'PUBLISHED' && Object.keys(validatedData).some(key => 
      ['conditions', 'actions', 'fhirMapping'].includes(key)
    )) {
      // For published rules, create a new rule version by updating version number
      updateData.version = existingRule.version + 1
    }

    const updatedRule = await prisma.rule.update({
      where: { id },
      data: {
        ...updateData,
        conditions: updateData.conditions as any,
        actions: updateData.actions as any,
        fhirMapping: updateData.fhirMapping as any,
        isValid: false, // Requires re-validation after changes
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({ rule: updatedRule })
  } catch (error) {
    console.error('Error updating rule:', error)

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

// DELETE /api/rules/[id] - Delete a rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete rules
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params
    const rule = await prisma.rule.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      }
    })

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    // Soft delete by archiving instead of hard delete
    await prisma.rule.update({
      where: { id },
      data: { 
        status: 'ARCHIVED',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ message: 'Rule archived successfully' })
  } catch (error) {
    console.error('Error deleting rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}