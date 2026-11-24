export type EnquiryPayload = {
  studentName: string
  parentName?: string
  phone: string
  email?: string
  programme?: string
  group?: string
  message?: string
  website?: string
}

export const PROGRAMME_OPTIONS = [
  '8th Foundation',
  'SSLC Capsule',
  '+1/+2 NEET/JEE/KEAM Integrated',
  '+2 Crash Course',
]

export const GROUP_OPTIONS = ['Bio-Language', 'Bio-Maths', 'Computer Science']

/**
 * Submits an admission enquiry.
 * 1. Backs up lead locally in browser localStorage (offline safety).
 * 2. Transmits payload to server API route /api/enquiry for Firestore persistence.
 * 3. Propagates server error responses so forms do not falsely report success on failure.
 */
export async function submitEnquiry(payload: EnquiryPayload): Promise<void> {
  // 1. Resilient local backup
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sm_enquiries')
      const enquiries = stored ? JSON.parse(stored) : []
      enquiries.push({ ...payload, submittedAt: new Date().toISOString() })
      localStorage.setItem('sm_enquiries', JSON.stringify(enquiries))
    } catch {
      // Ignore localStorage access or quota errors
    }
  }

  // 2. Submit to API endpoint
  const res = await fetch('/api/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null)
    const message = errorJson?.error || `Submission failed with status ${res.status}`
    throw new Error(message)
  }
}
