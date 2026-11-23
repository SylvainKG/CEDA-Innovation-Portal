/**
 * Small brand glyphs for the footer's "Follow us" (lucide-react 1.x has no brand icons). Drawn in currentColor on a
 * 24 x 24 grid, decorative only: the link around them carries the name.
 */
export function SocialIcon({ platform, className }: { platform: 'facebook' | 'linkedin'; className?: string }) {
  if (platform === 'facebook')
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.6 21v-7.6h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.6V21z" />
      </svg>
    )
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="6.5" cy="6.5" r="1.9" />
      <rect x="4.9" y="9.6" width="3.2" height="10.2" rx="0.4" />
      <path d="M10.4 9.6h3.1v1.4c.5-.9 1.7-1.7 3.4-1.7 2.6 0 3.6 1.7 3.6 4.6v5.9h-3.2v-5.3c0-1.4-.4-2.3-1.6-2.3-1.3 0-1.9.9-1.9 2.3v5.3h-3.4z" />
    </svg>
  )
}
