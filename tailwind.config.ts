import type { Config } from 'tailwindcss'

// Every colour, radius and shadow comes from src/styles/tokens.css (CSS variables).
// Components use these semantic names only; no raw hex values in components.
const v = (name: string) => `var(--${name})`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '360px', md: '768px', lg: '1024px', xl: '1280px' },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      brand: {
        DEFAULT: v('brand-primary'),
        hover: v('brand-primary-hover'),
        subtle: v('brand-primary-subtle'),
        on: v('brand-on-primary'),
        text: v('brand-primary-text'),
        accent: v('brand-accent'),
        'accent-subtle': v('brand-accent-subtle'),
      },
      surface: { page: v('surface-page'), card: v('surface-card'), sunken: v('surface-sunken') },
      ink: { DEFAULT: v('text-primary'), muted: v('text-secondary') },
      line: { DEFAULT: v('border-default'), input: v('border-input') },
      focus: v('focus-ring'),
      error: { DEFAULT: v('feedback-error'), fill: v('feedback-error-fill'), subtle: v('feedback-error-subtle') },
      success: { DEFAULT: v('feedback-success'), subtle: v('feedback-success-subtle') },
      warning: { DEFAULT: v('feedback-warning'), subtle: v('feedback-warning-subtle') },
      demo: { DEFAULT: v('demo'), on: v('demo-on'), subtle: v('demo-subtle'), border: v('demo-border') },
      status: {
        'draft-bg': v('status-draft-bg'), 'draft-fg': v('status-draft-fg'),
        'submitted-bg': v('status-submitted-bg'), 'submitted-fg': v('status-submitted-fg'),
        'review-bg': v('status-review-bg'), 'review-fg': v('status-review-fg'), 'review-border': v('status-review-border'),
        'action-bg': v('status-action-bg'), 'action-fg': v('status-action-fg'),
        'approved-bg': v('status-approved-bg'), 'approved-fg': v('status-approved-fg'),
        'closed-bg': v('status-closed-bg'), 'closed-fg': v('status-closed-fg'), 'closed-border': v('status-closed-border'),
        'awarded-bg': v('status-awarded-bg'), 'awarded-fg': v('status-awarded-fg'),
      },
    },
    fontFamily: {
      sans: v('font-sans'),
      // Case references (spec §3.2 type/mono)
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    // Spec §3.2 type scale (F1). Inputs use base (16 px) so mobile browsers do not zoom.
    fontSize: {
      sm: ['14px', '20px'],
      base: ['16px', '24px'],
      h3: ['17px', '24px'],
      h2: ['20px', '28px'],
      h1: ['26px', '32px'],
      display: ['32px', '40px'],
    },
    borderRadius: { none: '0', sm: v('radius-sm'), md: v('radius-md'), full: v('radius-pill') },
    boxShadow: { none: 'none', 1: v('shadow-1'), 2: v('shadow-2') },
    extend: {
      maxWidth: { content: '1200px', form: '720px' },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
} satisfies Config
