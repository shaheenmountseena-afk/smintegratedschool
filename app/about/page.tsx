import type { Metadata } from 'next'
import { Card, IconBadge } from '@/components/site/card'
import { CtaBanner } from '@/components/site/cta-banner'
import { PageHero } from '@/components/site/page-hero'
import { Reveal } from '@/components/site/reveal'
import { Section, SectionHeading } from '@/components/site/section'
import { mission } from '@/data/content'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Shaheen – Mount Seena, a residential NEET JEE school in Kerala managed by Learn & Lead Edu.Hub LLP, with the Mount Seena and Shaheen groups of institutions.',
}

const groups = [
  {
    title: 'Mount Seena Group of Educational Institutions',
    body: 'Run under Baithu Shariqa Al-Khairi Trust, a registered public charitable trust, formed by devoted educationalists and social activists. Janab K.K. Mammunni Moulavi, a noted social activist and philanthropic person, spearheading many educational and social institutions/movements, is the chairman of the trust.',
  },
  {
    title: 'Shaheen Group of Institutions',
    body: 'A group of private secondary and tertiary educational institutions founded by Dr. Abdul Qadeer in Bidar, Karnataka, India. The group includes several schools, PU colleges, and graduation colleges in 13 Indian states, and one college in Saudi Arabia. The Group also provides coaching for NEET & JEE Mains, JEE Advanced, UPSC, and similar programs.',
  },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Two trusted names in education, one focused campus"
        description="Shaheen – Mount Seena brings together the academic legacy of the Shaheen Group and the values of the Mount Seena institutions."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Management</p>
            <h2 className="mt-4 text-2xl font-semibold text-secondary md:text-3xl">Learn &amp; Lead Edu.Hub LLP</h2>
          </div>
          <dl className="grid gap-8 sm:grid-cols-2 lg:col-span-8">
            <div className="border-t border-border pt-5">
              <dt className="text-sm text-muted-foreground">Register No.</dt>
              <dd className="mt-2 font-medium text-secondary">LLPIN ACQ-1687</dd>
            </div>
            <div className="border-t border-border pt-5">
              <dt className="text-sm text-muted-foreground">Registered office</dt>
              <dd className="mt-2 leading-relaxed font-medium text-secondary">
                Building No. 13/141A, 2nd Floor, Mount Seena ITI, Mount Seena Campus, Pathiripala, Palakkad, Kerala,
                678642
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-2">
          {groups.map((g, i) => (
            <Reveal key={g.title} delay={i * 100}>
              <Card className="p-8 md:p-10">
                <h3 className="text-xl leading-snug font-semibold text-secondary">{g.title}</h3>
                <p className="mt-4 leading-relaxed text-muted-foreground">{g.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <section className="bg-secondary py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <p className="text-xs font-medium tracking-[0.16em] text-white/60 uppercase">Our vision</p>
          <blockquote className="mt-8">
            <p className="font-heading text-2xl leading-snug font-medium text-balance text-white md:text-4xl md:leading-tight">
              &ldquo;Empowering aspiring medical professionals to achieve their dreams through holistic education,
              innovative learning, and unwavering support.&rdquo;
            </p>
          </blockquote>
        </div>
      </section>

      <Section>
        <SectionHeading eyebrow="Our mission" title="What we commit to, every day" />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mission.map((m, i) => (
            <li key={m.title}>
              <Reveal delay={i * 60} className="h-full">
                <Card>
                  <div className="flex items-center justify-between">
                    <IconBadge icon={m.icon} />
                    <span className="font-heading text-sm text-muted-foreground tabular-nums" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-6 leading-relaxed text-secondary">{m.title}</p>
                </Card>
              </Reveal>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBanner />
    </>
  )
}
