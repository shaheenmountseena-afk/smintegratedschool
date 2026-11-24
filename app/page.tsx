import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Images, Trophy, Clapperboard } from 'lucide-react'
import { AdmissionsMedia } from '@/components/site/admissions-media'
import { IconCard } from '@/components/site/card'
import { CtaBanner } from '@/components/site/cta-banner'
import { FacultyCard } from '@/components/site/faculty-card'
import { HeroSlider } from '@/components/site/hero-slider'
import { Reveal } from '@/components/site/reveal'
import { Section, SectionHeading } from '@/components/site/section'
import { highlights, programmes } from '@/data/content'
import { heroSlides } from '@/data/homeMedia'
import { getPublicFaculty, getPublicHomeMedia } from '@/lib/public-content'

const quickLinks = [
  { icon: Images, title: 'Photo Gallery', description: 'Life on campus', href: '/gallery' },
  { icon: Trophy, title: 'Results', description: 'Our toppers, year by year', href: '/results' },
  { icon: Clapperboard, title: 'Posters & Videos', description: 'Announcements and films', href: '/gallery' },
]

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const [admissionsMedia, faculty] = await Promise.all([
    getPublicHomeMedia(),
    getPublicFaculty(),
  ])
  return (
    <>
      <HeroSlider slides={heroSlides} />

      <Section>
        <SectionHeading
          eyebrow="Campus Life"
          title="Campus Film & Media"
          description="Watch the campus film and browse our latest posters and announcements."
          action={
            <Link href="/enquiry" className="group inline-flex items-center gap-2 text-sm font-medium text-secondary">
              Start your enquiry
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          }
        />
        <AdmissionsMedia items={admissionsMedia} />
      </Section>

      <Section muted>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-7">
            <p className="mb-5 text-xs font-medium tracking-[0.16em] text-primary uppercase">About the school</p>
            <h2 className="text-3xl leading-tight font-semibold text-secondary md:text-4xl">
              Shaheen – Mount Seena is an integrated residential NEET/JEE school at Mount Seena Campus, Pathiripala,
              Palakkad.
            </h2>
            <Link
              href="/about"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-secondary"
            >
              Read our story
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </Reveal>
          <Reveal className="lg:col-span-5" delay={100}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/classroom.png"
                alt="Students attentive in a smart classroom (dummy photo)"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>

        <ul className="mt-20 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-border pt-12 sm:grid-cols-3 lg:grid-cols-5">
          {highlights.map(({ icon: Icon, title }) => (
            <li key={title} className="flex flex-col gap-4">
              <Icon className="size-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[15px] font-medium text-secondary">{title}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Programmes"
          title="Coaching for every stage"
          description="From early foundations in 8th standard to intensive entrance preparation in Plus Two."
          action={
            <Link href="/academics" className="group inline-flex items-center gap-2 text-sm font-medium text-secondary">
              View academics
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {programmes.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <IconCard {...p} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeading eyebrow="Explore" title="See life at Mount Seena" />
        <ul className="grid gap-6 md:grid-cols-3">
          {quickLinks.map(({ icon: Icon, title, description, href }) => (
            <li key={title}>
              <Link
                href={href}
                className="group flex h-full items-center justify-between gap-6 rounded-2xl border border-border bg-background p-7 transition-shadow hover:shadow-[0_8px_30px_-12px_rgba(11,31,75,0.15)]"
              >
                <span className="flex items-center gap-5">
                  <Icon className="size-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    <span className="block font-heading text-lg font-semibold text-secondary">{title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                  </span>
                </span>
                <ArrowUpRight
                  className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-secondary"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Faculty"
          title="Learn from experienced mentors"
          action={
            <Link href="/faculty" className="group inline-flex items-center gap-2 text-sm font-medium text-secondary">
              Meet all faculty
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          }
        />
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {faculty
            .filter((f) => f.group === 'academic')
            .slice(0, 4)
            .map((m, i) => (
              <Reveal key={m.id} delay={i * 80}>
                <FacultyCard member={m} />
              </Reveal>
            ))}
        </div>
      </Section>

      <CtaBanner />
    </>
  )
}
