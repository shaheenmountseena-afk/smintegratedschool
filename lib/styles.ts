const base =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60'

export const btn = {
  primary: `${base} bg-primary text-primary-foreground hover:bg-primary/90`,
  navy: `${base} bg-secondary text-secondary-foreground hover:bg-secondary/90`,
  outline: `${base} border border-border bg-background text-foreground hover:bg-muted`,
  light: `${base} bg-white text-secondary hover:bg-white/90`,
  ghostLight: `${base} border border-white/40 text-white hover:bg-white/10`,
}

export const container = 'mx-auto w-full max-w-6xl px-5 sm:px-8'
