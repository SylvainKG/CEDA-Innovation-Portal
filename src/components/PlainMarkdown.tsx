import type { ReactNode } from 'react'

/**
 * Renders the small Markdown subset used in seeded content (challenge briefs, content pages): paragraphs,
 * `**bold**` and `- ` lists. Text only: no HTML, links or images are interpreted, so content can never inject
 * markup (React escapes every string). Anything else shows as plain text.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

export function PlainMarkdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => l.trimStart().startsWith('- ')))
          return (
            <ul key={i} className="list-disc pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trimStart().slice(2))}</li>
              ))}
            </ul>
          )
        return <p key={i}>{inline(lines.join(' '))}</p>
      })}
    </div>
  )
}
