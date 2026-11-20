import type { ContentPort } from '../content'
import type { ContentPage } from '../types'

/** The seed's published help content (supabase/seed.sql), in position order. Fictional sample wording. */
export const MOCK_CONTENT: ContentPage[] = [
  { slug: 'faq-who-can-apply', kind: 'faq', title: 'Who can apply?', body_md: 'Sample answer: registered citizens and businesses with an idea that fits an open challenge.', is_sample: true },
  { slug: 'faq-how-long', kind: 'faq', title: 'How long does a review take?', body_md: 'Sample answer: screening within 5 working days, evaluation within 15 working days.', is_sample: true },
  { slug: 'faq-confidential', kind: 'faq', title: 'Who can see my idea?', body_md: 'Sample answer: only you and the CEDA staff assigned to your case.', is_sample: true },
  { slug: 'faq-revise', kind: 'faq', title: 'Can I change my idea after submitting?', body_md: 'Sample answer: only if CEDA asks for a revision. Each revision is saved as a new version.', is_sample: true },
  { slug: 'faq-files', kind: 'faq', title: 'What files can I attach?', body_md: 'Sample answer: PDF, DOCX, XLSX, PNG or JPG, up to 10 MB each.', is_sample: true },
  { slug: 'contact-companies', kind: 'contact', title: 'Company registration (sample)', body_md: 'Sample — awaiting CEDA confirmation. Fictional registry desk, demo@example.test', is_sample: true },
  { slug: 'contact-licensing', kind: 'contact', title: 'Trade licensing (sample)', body_md: 'Sample — awaiting CEDA confirmation. Fictional licensing office, demo@example.test', is_sample: true },
  { slug: 'contact-standards', kind: 'contact', title: 'Product standards (sample)', body_md: 'Sample — awaiting CEDA confirmation. Fictional standards office, demo@example.test', is_sample: true },
  { slug: 'contact-ip', kind: 'contact', title: 'Intellectual property (sample)', body_md: 'Sample — awaiting CEDA confirmation. Fictional IP office, demo@example.test', is_sample: true },
  { slug: 'referral-ceda', kind: 'referral', title: 'CEDA financing (sample referral information)', body_md: 'Listed for information; not an endorsement.', is_sample: true },
  { slug: 'referral-bif', kind: 'referral', title: 'Innovation fund (sample referral information)', body_md: 'Listed for information; not an endorsement.', is_sample: true },
  { slug: 'referral-lea', kind: 'referral', title: 'Enterprise mentoring (sample referral information)', body_md: 'Listed for information; not an endorsement.', is_sample: true },
  { slug: 'referral-bdih', kind: 'referral', title: 'Digital innovation hub (sample referral information)', body_md: 'Listed for information; not an endorsement.', is_sample: true },
  {
    slug: 'fault-support',
    kind: 'support',
    title: 'Report a problem',
    body_md: 'Sample support page: severity levels, response times and the contact route. Hours 09:00–16:00 CAT, working days.',
    is_sample: true,
  },
]

/** MOCK content adapter: development and demo preview only. */
export const mockContent: ContentPort = {
  async list(kind) {
    return MOCK_CONTENT.filter((c) => c.kind === kind)
  },
}
