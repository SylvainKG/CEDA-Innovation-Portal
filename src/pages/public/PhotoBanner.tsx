import type { ReactNode } from 'react'
import type { Photo } from '@/brand/photos'

/**
 * A page header on a photograph of Botswana (post-freeze, ABM 22 Nov): the photo on the right, fading into CEDA's
 * night brown on the left where the text sits (white on the darkest part, above 12:1), and a thin sunrise line along
 * the bottom. The photo is decorative; its place is named in a small label.
 */
export function PhotoBanner({ photo, eyebrow, title, children }: { photo: Photo; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] text-white shadow-2">
      <img src={photo.src} alt="" width={photo.width} height={photo.height} decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(43,29,25,0.86),rgba(43,29,25,0.92))] md:bg-[linear-gradient(100deg,rgba(43,29,25,0.96)_0%,rgba(43,29,25,0.86)_42%,rgba(43,29,25,0.25)_100%)]"
      />
      <div className="flex max-w-2xl flex-col items-start gap-4 px-6 pb-20 pt-10 md:px-12 md:pb-16 md:pt-14">
        <p className="text-sm font-bold uppercase tracking-wider text-[var(--ceda-gold)]">{eyebrow}</p>
        <h1 className="text-[2.25rem] font-normal leading-tight md:text-[2.75rem]">{title}</h1>
        {children}
      </div>
      <p className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-sm text-white">{photo.caption}</p>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-amber),var(--ceda-orange),var(--ceda-maroon))]" />
    </div>
  )
}
