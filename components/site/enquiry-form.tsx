'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { GROUP_OPTIONS, PROGRAMME_OPTIONS, submitEnquiry } from '@/lib/enquiry'
import { btn } from '@/lib/styles'
import { cn } from '@/lib/utils'

type Values = {
  studentName: string
  parentName: string
  phone: string
  email: string
  programme: string
  group: string
  message: string
  website: string // honeypot
}

const empty: Values = {
  studentName: '',
  parentName: '',
  phone: '',
  email: '',
  programme: '',
  group: '',
  message: '',
  website: '',
}

type Field = keyof Values

function validate(values: Values, variant: 'full' | 'compact') {
  const errors: Partial<Record<Field, string>> = {}
  if (!values.studentName.trim()) errors.studentName = 'Please enter the student’s name.'
  if (variant === 'full' && !values.parentName.trim()) errors.parentName = 'Please enter the parent or guardian’s name.'
  const digits = values.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
  if (!/^[6-9]\d{9}$/.test(digits)) errors.phone = 'Enter a valid 10-digit mobile number.'
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.'
  if (variant === 'full' && !values.programme) errors.programme = 'Please choose a class or programme.'
  return errors
}

export function EnquiryForm({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const [values, setValues] = useState<Values>(empty)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const errors = validate(values, variant)
  const showError = (f: Field) => (touched[f] ? errors[f] : undefined)

  const set = (f: Field) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [f]: e.target.value }))
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ studentName: true, parentName: true, phone: true, email: true, programme: true })
    if (Object.keys(errors).length > 0) return
    // Bots fill hidden fields; silently pretend success.
    if (values.website) {
      setStatus('success')
      return
    }
    setStatus('loading')
    try {
      const { website: _honeypot, ...payload } = values
      await submitEnquiry({ ...payload, phone: payload.phone.replace(/\D/g, '').slice(-10) })
      setStatus('success')
      setValues(empty)
      setTouched({})
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div role="status" className="flex flex-col items-start rounded-2xl border border-border bg-card p-10">
        <CheckCircle2 className="size-10 text-[#1f9d55]" aria-hidden="true" />
        <h3 className="mt-6 text-2xl font-semibold text-secondary">Thank you for your enquiry</h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Our admissions team will call you back shortly. For a faster response, message us on WhatsApp.
        </p>
        <button type="button" onClick={() => setStatus('idle')} className={cn(btn.outline, 'mt-8')}>
          Send another enquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 sm:grid-cols-2">
      <FormField id="studentName" label="Student name" required error={showError('studentName')}>
        <input
          id="studentName"
          autoComplete="name"
          value={values.studentName}
          onChange={set('studentName')}
          onBlur={blur('studentName')}
          className={inputClass(showError('studentName'))}
          {...aria('studentName', showError('studentName'))}
        />
      </FormField>

      {variant === 'full' && (
        <FormField id="parentName" label="Parent / Guardian name" required error={showError('parentName')}>
          <input
            id="parentName"
            value={values.parentName}
            onChange={set('parentName')}
            onBlur={blur('parentName')}
            className={inputClass(showError('parentName'))}
            {...aria('parentName', showError('parentName'))}
          />
        </FormField>
      )}

      <FormField id="phone" label="Phone" required error={showError('phone')} hint="10-digit mobile number">
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          value={values.phone}
          onChange={set('phone')}
          onBlur={blur('phone')}
          className={inputClass(showError('phone'))}
          {...aria('phone', showError('phone'))}
        />
      </FormField>

      <FormField id="email" label="Email" error={showError('email')}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          onBlur={blur('email')}
          className={inputClass(showError('email'))}
          {...aria('email', showError('email'))}
        />
      </FormField>

      {variant === 'full' && (
        <>
          <FormField id="programme" label="Class / Programme of interest" required error={showError('programme')}>
            <select
              id="programme"
              value={values.programme}
              onChange={set('programme')}
              onBlur={blur('programme')}
              className={inputClass(showError('programme'))}
              {...aria('programme', showError('programme'))}
            >
              <option value="">Select a programme</option>
              {PROGRAMME_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </FormField>

          <FormField id="group" label="Preferred group">
            <select id="group" value={values.group} onChange={set('group')} className={inputClass()}>
              <option value="">No preference</option>
              {GROUP_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </FormField>
        </>
      )}

      <FormField id="message" label="Message" className="sm:col-span-2">
        <textarea
          id="message"
          rows={4}
          value={values.message}
          onChange={set('message')}
          className={cn(inputClass(), 'h-auto resize-y py-3')}
        />
      </FormField>

      {/* Honeypot: hidden from people and assistive tech, visible to naive bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
      </div>

      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center">
        <button type="submit" disabled={status === 'loading'} className={cn(btn.primary, 'h-12 px-8')}>
          {status === 'loading' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {status === 'loading' ? 'Sending…' : 'Submit enquiry'}
        </button>
        {status === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            Something went wrong. Please try again or call us directly.
          </p>
        )}
      </div>
    </form>
  )
}

function aria(id: string, error?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  } as const
}

function inputClass(error?: string) {
  return cn(
    'h-12 w-full rounded-xl border bg-background px-4 text-[15px] text-secondary transition-colors placeholder:text-muted-foreground/70 focus:outline-none focus-visible:border-secondary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-secondary/15',
    error ? 'border-destructive' : 'border-input hover:border-muted-foreground/40',
  )
}

function FormField({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-medium text-secondary">
        {label}
        {required ? (
          <span className="text-primary" aria-hidden="true">
            {' '}
            *
          </span>
        ) : (
          <span className="font-normal text-muted-foreground"> (optional)</span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
