import {
  Atom,
  BookOpen,
  Brain,
  Bus,
  Dumbbell,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Moon,
  Presentation,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Target,
  Timer,
  Users,
  Utensils,
  Monitor,
  type LucideIcon,
} from 'lucide-react'

export type IconItem = { icon: LucideIcon; title: string; description?: string }

export const highlights: IconItem[] = [
  { icon: Snowflake, title: 'AC Hostel' },
  { icon: Moon, title: 'Supervised Night Study' },
  { icon: Brain, title: 'Psychological Counselling' },
  { icon: Monitor, title: 'Smart Digital Classrooms' },
  { icon: ShieldCheck, title: 'Safe & Disciplined Campus' },
]

// TODO: replace placeholder descriptions with final programme copy
export const programmes: IconItem[] = [
  {
    icon: GraduationCap,
    title: 'NEET/JEE/KEAM Integrated Batch',
    description: 'Plus One and Plus Two schooling combined with complete entrance preparation.',
  },
  {
    icon: Timer,
    title: 'Crash Course for +2 Students',
    description: 'An intensive, exam-focused revision programme for final-year students.',
  },
  {
    icon: Sparkles,
    title: 'Foundation Coaching for 8th Std',
    description: 'Building strong fundamentals in science and mathematics, early.',
  },
  {
    icon: Target,
    title: 'Capsule Coaching for SSLC & +2',
    description: 'Short, targeted modules to sharpen board exam performance.',
  },
]

export const focusedProgrammes = [
  'NEET-UG',
  'JEE Main',
  'CUSAT CAT',
  'IISER Aptitude Test (IAT)',
  'NEST (for admission to NISER & UM-DAE CEBS)',
  'National Defence Academy (NDA) Entrance Examination',
  'Kerala Engineering, Architecture & Medical Entrance Examination (KEAM)',
]

export const groups = [
  {
    id: 'bio-language',
    name: 'Bio-Language',
    subjects: ['Physics', 'Chemistry', 'Biology', 'English', 'Language (Arabic / Malayalam / Hindi)'],
  },
  {
    id: 'bio-maths',
    name: 'Bio-Maths',
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
  },
  {
    id: 'computer-science',
    name: 'Computer Science',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English'],
  },
]

export const hostelFacilities: IconItem[] = [
  { icon: ShieldCheck, title: 'Safe, Secure & Disciplined Campus' },
  { icon: Snowflake, title: 'Well-Furnished Air-Conditioned Hostel Rooms' },
  { icon: Utensils, title: 'Healthy, Hygienic & Homely Food' },
  { icon: HeartHandshake, title: 'Dedicated Hostel Mentors for Personal Care and Guidance' },
  { icon: Moon, title: 'Supervised Night Study with Faculty Support' },
  { icon: BookOpen, title: 'Moral and Value-Based Education for Holistic Development' },
]

export const otherFacilities: IconItem[] = [
  { icon: Monitor, title: 'Smart Digital Classrooms' },
  { icon: FlaskConical, title: 'Well-Equipped Science & Computer Laboratories' },
  { icon: Snowflake, title: 'Air-Conditioned Classrooms' },
  { icon: Presentation, title: 'Academic Conference & Seminar Theatre' },
  { icon: Brain, title: 'Professional Psychological Counselling & Student Wellness Support' },
  { icon: Dumbbell, title: 'Modern Gymnasium & Fitness Centre' },
  { icon: Bus, title: 'Safe and Reliable School Transportation' },
]

export const mission: IconItem[] = [
  { icon: Target, title: 'Provide high-quality, student-centric coaching for NEET/JEE entrance exams.' },
  { icon: HeartHandshake, title: 'Foster a nurturing environment that promotes academic excellence, creativity, and emotional intelligence.' },
  { icon: Atom, title: 'Equip students with the skills, knowledge, and confidence to excel in competitive exams.' },
  { icon: Lightbulb, title: 'Continuously innovate and improve teaching methodologies to stay ahead.' },
  { icon: Users, title: 'Build a community of passionate learners and dedicated educators.' },
]
