import type { ContentKind, ContentPage } from './types'

/**
 * Help and information content (T03 content variants, HLP-01). Reads the published `content_pages` rows of
 * one kind, in their `position` order (contract §3: public, also `anon`). The privacy notice and the
 * declaration have their own reads on the session and submission ports.
 */
export interface ContentPort {
  list(kind: ContentKind): Promise<ContentPage[]>
}
