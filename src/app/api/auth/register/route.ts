import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const RegisterSchema = z.object({
  // User fields
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  // Organization fields
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationSlug: z.string().min(1, 'Organization slug is required'),
  plan: z.enum(['FREE', 'PROFESSIONAL', 'ENTERPRISE', 'STATE_LICENSE']).default('FREE'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = RegisterSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check if organization slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: validatedData.organizationSlug }
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization URL is already taken' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create organization and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization first
      const organization = await tx.organization.create({
        data: {
          name: validatedData.organizationName,
          slug: validatedData.organizationSlug,
          plan: validatedData.plan,
          status: 'TRIAL', // Start with trial
        }
      })

      // Create admin user
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          password: hashedPassword,
          role: 'ADMIN',
          organizationId: organization.id,
          emailVerified: new Date(), // Auto-verify for admin during registration
        }
      })

      return { organization, user }
    })

    return NextResponse.json({
      message: 'Account created successfully',
      organizationId: result.organization.id,
      userId: result.user.id,
    })

  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}