import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Floating "Chat with CEDA" button (Figma, 21 Nov): bottom right, always visible.
 * Opens the applicant chat page or staff support inbox.
 */
export function FloatingChatButton({ to = '/support/chat' }: { to?: string }) {
  return (
    <Link
      to={to}
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-2 no-underline hover:bg-ink/90 md:bottom-8 md:right-8"
      data-print="hide"
    >
      <MessageCircle aria-hidden className="h-5 w-5" />
      Chat with CEDA
    </Link>
  )
}
