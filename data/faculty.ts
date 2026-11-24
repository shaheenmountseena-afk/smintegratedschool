/**
 * Faculty list. TODO: add real photos via the `photo` field.
 */

export type FacultyMember = {
  id: string
  name: string
  role: string
  previous?: string
  group: 'academic' | 'mentorship'
  photo?: string
}

export const faculty: FacultyMember[] = [
 
]
