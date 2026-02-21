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
        fhirEndpoint: 'https://api.demohealthdept.gov/fhir',
        reportingSettings: {
          autoSubmit: true,
          includePHI: false,
          submitFrequency: 'realtime'
        }
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

  console.log('✅ Created demo users')

  // Create sample rules
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
            value: ['U07.1', 'U07.2', 'Z87.891'],
            system: 'ICD-10'
          },
          {
            field: 'labResult.test',
            operator: 'EQUALS',
            value: 'SARS-CoV-2 RNA',
            system: 'LOINC'
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
            urgency: 'immediate',
            template: 'covid-19-detection'
          }
        ],
        reporting: {
          generateECR: true,
          template: 'covid-19-ecr',
          autoSubmit: true,
          recipients: ['state-health@ca.gov']
        },
        followUp: {
          createTask: true,
          assignTo: 'contact-tracing-team',
          dueDate: 'immediate'
        }
      },
      fhirMapping: {
        condition: {
          resourceType: 'Condition',
          codeableConcept: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '1119349007',
                display: 'COVID-19'
              }
            ]
          }
        },
        observation: {
          resourceType: 'Observation',
          category: 'laboratory',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '94500-6',
                display: 'SARS-CoV-2 RNA [Presence] in Respiratory specimen by NAA with probe detection'
              }
            ]
          }
        }
      },
      isValid: true
    }
  })

  const hepatitisBRule = await prisma.rule.upsert({
    where: { id: 'hepatitis-b-reporting' },
    update: {},
    create: {
      id: 'hepatitis-b-reporting',
      name: 'Hepatitis B Reporting',
      description: 'Automated reporting for acute and chronic Hepatitis B infections.',
      reportableCondition: 'Hepatitis B',
      category: 'CONDITION_DETECTION',
      status: 'DRAFT',
      priority: 7,
      organizationId: demoOrg.id,
      createdById: builderUser.id,
      conditions: {
        operator: 'AND',
        rules: [
          {
            field: 'diagnosis.code',
            operator: 'IN',
            value: ['K72.00', 'K72.01', 'K72.90', 'K72.91'],
            system: 'ICD-10'
          },
          {
            field: 'labResult.test',
            operator: 'CONTAINS',
            value: 'Hepatitis B surface antigen'
          },
          {
            field: 'labResult.result',
            operator: 'EQUALS',
            value: 'reactive'
          }
        ]
      },
      actions: {
        notifications: [
          {
            type: 'email',
            recipients: ['hepatitis@demohealthdept.gov'],
            urgency: 'routine',
            template: 'hepatitis-b-detection'
          }
        ],
        reporting: {
          generateECR: true,
          template: 'hepatitis-b-ecr',
          autoSubmit: false
        }
      },
      fhirMapping: {
        condition: {
          resourceType: 'Condition',
          codeableConcept: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '66071002',
                display: 'Hepatitis B'
              }
            ]
          }
        }
      },
      isValid: false,
      validationErrors: {
        warnings: ['Missing contact tracing workflow'],
        suggestions: ['Add follow-up task assignment']
      }
    }
  })

  const tuberculosisRule = await prisma.rule.upsert({
    where: { id: 'tuberculosis-screening' },
    update: {},
    create: {
      id: 'tuberculosis-screening',
      name: 'Tuberculosis Screening',
      description: 'Identifies suspected TB cases requiring follow-up investigation.',
      reportableCondition: 'Tuberculosis',
      category: 'CONDITION_DETECTION',
      status: 'PUBLISHED',
      priority: 8,
      organizationId: demoOrg.id,
      createdById: adminUser.id,
      conditions: {
        operator: 'OR',
        rules: [
          {
            operator: 'AND',
            rules: [
              {
                field: 'diagnosis.code',
                operator: 'STARTS_WITH',
                value: 'A15',
                system: 'ICD-10'
              }
            ]
          },
          {
            operator: 'AND',
            rules: [
              {
                field: 'labResult.test',
                operator: 'CONTAINS',
                value: 'tuberculosis'
              },
              {
                field: 'labResult.result',
                operator: 'EQUALS',
                value: 'positive'
              }
            ]
          }
        ]
      },
      actions: {
        notifications: [
          {
            type: 'email',
            recipients: ['tb-control@demohealthdept.gov'],
            urgency: 'high',
            template: 'tb-detection'
          },
          {
            type: 'sms',
            recipients: ['+15551234567'],
            urgency: 'high'
          }
        ],
        reporting: {
          generateECR: true,
          template: 'tuberculosis-ecr',
          autoSubmit: true
        },
        followUp: {
          createTask: true,
          assignTo: 'tuberculosis-unit',
          dueDate: '24hours'
        }
      },
      fhirMapping: {
        condition: {
          resourceType: 'Condition',
          codeableConcept: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '56717001',
                display: 'Tuberculosis'
              }
            ]
          }
        }
      },
      isValid: true
    }
  })

  console.log('✅ Created sample rules')

  // Create sample rule executions
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  await prisma.ruleExecution.createMany({
    data: [
      {
        ruleId: covidRule.id,
        inputData: {
          patient: {
            id: 'patient-001',
            name: 'John Doe',
            dateOfBirth: '1985-03-15'
          },
          diagnosis: {
            code: 'U07.1',
            system: 'ICD-10',
            description: 'COVID-19'
          },
          labResult: {
            test: 'SARS-CoV-2 RNA',
            result: 'positive',
            date: yesterday.toISOString()
          }
        },
        outputData: {
          ecrGenerated: true,
          reportId: 'ECR-COVID-001',
          notificationsSent: ['epidemiology@demohealthdept.gov'],
          tasksCreated: ['TASK-CT-001']
        },
        status: 'COMPLETED',
        duration: 245,
        startedAt: yesterday,
        completedAt: yesterday
      },
      {
        ruleId: tuberculosisRule.id,
        inputData: {
          patient: {
            id: 'patient-002',
            name: 'Jane Smith',
            dateOfBirth: '1978-11-22'
          },
          diagnosis: {
            code: 'A15.9',
            system: 'ICD-10',
            description: 'Respiratory tuberculosis unspecified'
          }
        },
        outputData: {
          ecrGenerated: true,
          reportId: 'ECR-TB-001',
          notificationsSent: ['tb-control@demohealthdept.gov'],
          tasksCreated: ['TASK-TB-001']
        },
        status: 'COMPLETED',
        duration: 189,
        startedAt: lastWeek,
        completedAt: lastWeek
      }
    ]
  })

  console.log('✅ Created sample rule executions')

  // Create sample ECR reports
  await prisma.eCRReport.createMany({
    data: [
      {
        reportId: 'ECR-COVID-001',
        organizationId: demoOrg.id,
        patientId: 'patient-001',
        reportableCondition: 'COVID-19',
        reportType: 'INITIAL',
        deliveryStatus: 'SENT',
        targetAgencies: ['state-health@ca.gov', 'county-health@demo.gov'],
        fhirBundle: {
          resourceType: 'Bundle',
          id: 'ecr-covid-001',
          type: 'document',
          timestamp: yesterday.toISOString(),
          entry: [
            {
              resource: {
                resourceType: 'Composition',
                status: 'final',
                type: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '55751-2',
                      display: 'Public health Case report'
                    }
                  ]
                }
              }
            }
          ]
        },
        deliveredAt: yesterday,
        diagnosisDate: yesterday
      },
      {
        reportId: 'ECR-TB-001',
        organizationId: demoOrg.id,
        patientId: 'patient-002',
        reportableCondition: 'Tuberculosis',
        reportType: 'INITIAL',
        deliveryStatus: 'SENT',
        targetAgencies: ['state-health@ca.gov'],
        fhirBundle: {
          resourceType: 'Bundle',
          id: 'ecr-tb-001',
          type: 'document',
          timestamp: lastWeek.toISOString(),
          entry: []
        },
        deliveredAt: lastWeek,
        diagnosisDate: lastWeek
      }
    ]
  })

  console.log('✅ Created sample ECR reports')

  console.log('\n🎉 Database seeding completed!')
  console.log('\nDemo Accounts Created:')
  console.log('👤 Admin: admin@demohealthdept.gov / admin123')
  console.log('👤 Builder: builder@demohealthdept.gov / builder123')
  console.log('\n📊 Sample Data:')
  console.log('• 1 Demo organization')
  console.log('• 3 Sample rules (COVID-19, Hepatitis B, Tuberculosis)')
  console.log('• Rule versions and execution history')
  console.log('• 2 Sample ECR reports')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })