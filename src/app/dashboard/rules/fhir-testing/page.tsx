'use client'

import { useSession } from 'next-auth/react'
import FHIRTestingTool from '@/components/rules/fhir-testing-tool'

export default function FHIRTestingPage() {
  const { data: session } = useSession()
  
  // Check permissions - FHIR testing should be available to builders and admins
  const canUseFHIRTesting = session?.user?.role === 'ADMIN' || session?.user?.role === 'BUILDER'

  if (!canUseFHIRTesting) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Restricted</h2>
          <p className="text-gray-600 mt-2">
            FHIR testing tools are available to rule builders and administrators only.
          </p>
        </div>
      </div>
    )
  }

  return <FHIRTestingTool />
}