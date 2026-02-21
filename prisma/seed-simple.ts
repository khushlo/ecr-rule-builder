import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-health-dept' },
    update: {},
    create: {
      name: 'Demo Health Department',
      slug: 'demo-health-dept',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      contactEmail: 'admin@demohealthdept.gov',
      contactPhone: '(555) 123-4567',
      address: {
        street: '123 Health Plaza',
        city: 'Demo City',
        state: 'CA',
        zipCode: '90210',
        country: 'USA'
      },
      settings: {
        timezone: 'America/Los_Angeles',
        defaultNotifications: true,
        fhirEndpoint: 'https://api.demohealthdept.gov/fhir'
      }
    }
  })

  console.log('✅ Created demo organization:', demoOrg.name)

  // Create demo admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demohealthdept.gov' },
    update: {},
    create: {
      email: 'admin@demohealthdept.gov',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      organizationId: demoOrg.id,
      emailVerified: new Date(),
      lastLoginAt: new Date()
    }
  })

  // Create demo builder user
  const builderPassword = await bcrypt.hash('builder123', 12)
  const builderUser = await prisma.user.upsert({
    where: { email: 'builder@demohealthdept.gov' },
    update: {},
    create: {
      email: 'builder@demohealthdept.gov',
      name: 'Rule Builder',
      password: builderPassword,
      role: 'BUILDER',
      organizationId: demoOrg.id,
      emailVerified: new Date()
    }
  })

  // Create viewer user
  const viewerPassword = await bcrypt.hash('viewer123', 12)
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@demohealthdept.gov' },
    update: {},
    create: {
      email: 'viewer@demohealthdept.gov',
      name: 'Report Viewer',
      password: viewerPassword,
      role: 'VIEWER',
      organizationId: demoOrg.id,
      emailVerified: new Date()
    }
  })

  console.log('✅ Created demo users')

  // Create sample rules using correct enum values
  const covidRule = await prisma.rule.upsert({
    where: { id: 'covid-19-detection' },
    update: {},
    create: {
      id: 'covid-19-detection',
      name: 'COVID-19 Case Detection',
      description: 'Detects COVID-19 positive cases for immediate reporting based on lab results and diagnosis codes.',
      reportableCondition: 'COVID-19',
      category: 'CONDITION_DETECTION',
      status: 'PUBLISHED',
      priority: 9,
      organizationId: demoOrg.id,
      createdById: adminUser.id,
      conditions: {
        operator: 'AND',
        rules: [
          {
            field: 'diagnosis.code',
            operator: 'IN',
            value: ['U07.1', 'U07.2'],
            system: 'ICD-10'
          },
          {
            field: 'labResult.test',
            operator: 'CONTAINS',
            value: 'SARS-CoV-2'
          },
          {
            field: 'labResult.result',
            operator: 'EQUALS',
            value: 'positive'
          }
        ]
      },
      actions: {
        notifications: [
          {
            type: 'email',
            recipients: ['epidemiology@demohealthdept.gov'],
            urgency: 'immediate'
          }
        ],
        reporting: {
          generateECR: true,
          template: 'covid-19-ecr',
          autoSubmit: true
        }
      },
      fhirMapping: {
        condition: {
          resourceType: 'Condition',
          code: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '1119349007',
                display: 'COVID-19'
              }
            ]
          }
        }
      },
      isValid: true,
      publishedAt: new Date()
    }
  })

  const dataValidationRule = await prisma.rule.upsert({
    where: { id: 'data-validation-rule' },
    update: {},
    create: {
      id: 'data-validation-rule',
      name: 'Patient Data Validation',
      description: 'Validates required patient demographic information before processing.',
      reportableCondition: 'Data Quality',
      category: 'DATA_VALIDATION',
      status: 'PUBLISHED',
      priority: 5,
      organizationId: demoOrg.id,
      createdById: builderUser.id,
      conditions: {
        operator: 'AND',
        rules: [
          {
            field: 'patient.name',
            operator: 'NOT_EMPTY'
          },
          {
            field: 'patient.dateOfBirth',
            operator: 'NOT_EMPTY'
          },
          {
            field: 'patient.identifier',
            operator: 'NOT_EMPTY'
          }
        ]
      },
      actions: {
        validation: {
          rejectIfInvalid: true,
          errorMessage: 'Missing required patient demographics'
        },
        notifications: [
          {
            type: 'system',
            message: 'Data validation failed - manual review required'
          }
        ]
      },
      fhirMapping: {
        patient: {
          resourceType: 'Patient'
        }
      },
      isValid: true,
      publishedAt: new Date()
    }
  })

  const routingRule = await prisma.rule.upsert({
    where: { id: 'state-routing-rule' },
    update: {},
    create: {
      id: 'state-routing-rule',
      name: 'State Health Department Routing',
      description: 'Routes eCR reports to appropriate state health departments based on patient address.',
      reportableCondition: 'Routing Logic',
      category: 'ROUTING',
      status: 'TESTING',
      priority: 6,
      organizationId: demoOrg.id,
      createdById: adminUser.id,
      conditions: {
        operator: 'SWITCH',
        rules: [
          {
            field: 'patient.address.state',
            operator: 'EQUALS',
            value: 'CA',
            action: 'route_to_cdph'
          },
          {
            field: 'patient.address.state',
            operator: 'EQUALS',
            value: 'NY',
            action: 'route_to_nysdoh'
          }
        ]
      },
      actions: {
        routing: {
          CA: {
            endpoint: 'https://cdph.ca.gov/fhir',
            credentials: 'cdph-api-key'
          },
          NY: {
            endpoint: 'https://health.ny.gov/fhir',
            credentials: 'ny-api-key'
          }
        }
      },
      fhirMapping: {
        organization: {
          resourceType: 'Organization'
        }
      },
      isValid: false,
      validationErrors: {
        warnings: ['Testing phase - credentials not verified']
      }
    }
  })

  console.log('✅ Created sample rules')

  console.log('\n🎉 Database seeding completed!')
  console.log('\nDemo Accounts Created:')
  console.log('👤 Admin: admin@demohealthdept.gov / admin123')
  console.log('👤 Builder: builder@demohealthdept.gov / builder123') 
  console.log('👤 Viewer: viewer@demohealthdept.gov / viewer123')
  console.log('\n📊 Sample Data:')
  console.log('• 1 Demo organization')
  console.log('• 3 Demo users with different roles')
  console.log('• 3 Sample rules (COVID detection, data validation, routing)')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })