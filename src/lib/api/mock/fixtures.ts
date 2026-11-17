import type { ChallengeForm, DeclarationText } from '../types'

/**
 * MOCK fixtures. Copied from Stacey's seed (`supabase/seed.sql`, branch db/phase-0-foundation) so screens built
 * against the mock show the same fictional content as the real demo. All content is fictional (DEMO).
 * If the seed changes, update this file in the same PR.
 */
export const WATER_SMART_ID = '20000000-0000-4000-8000-000000000001'
export const YOUTH_DIGITAL_ID = '20000000-0000-4000-8000-000000000002'

export const MOCK_CHALLENGE_FORMS: ChallengeForm[] = [
  {
    challenge_id: WATER_SMART_ID,
    challenge_version_id: '21000000-0000-4000-8000-000000000001',
    title: 'Water-Smart Agriculture Challenge 2026',
    status: 'published',
    closes_at: '2026-12-31T14:00:00Z',
    form_version: 1,
    form_schema: {
      sections: [
        {
          key: 'about_you',
          title: 'About you',
          fields: [
            { key: 'applicant_name', label: 'Your full name', type: 'text', required: true, max_length: 120 },
            { key: 'organisation', label: 'Business or organisation', type: 'text', required: false, max_length: 160 },
            { key: 'contact_email', label: 'Contact email', type: 'email', required: true, max_length: 200 },
          ],
        },
        {
          key: 'overview',
          title: 'Idea overview',
          fields: [
            { key: 'title', label: 'Idea title', type: 'text', required: true, max_length: 120 },
            {
              key: 'summary',
              label: 'Summary',
              type: 'textarea',
              required: true,
              max_length: 1000,
              help: 'Two or three sentences a non-expert understands.',
            },
            { key: 'sector', label: 'Farming sector', type: 'select', required: true, options: ['Crops', 'Livestock', 'Horticulture', 'Mixed'] },
          ],
        },
        {
          key: 'innovation',
          title: 'Innovation & feasibility',
          fields: [
            { key: 'problem', label: 'Problem you solve', type: 'textarea', required: true, max_length: 2000 },
            { key: 'solution', label: 'Your solution', type: 'textarea', required: true, max_length: 2000 },
            { key: 'feasibility', label: 'How you will deliver it', type: 'textarea', required: false, max_length: 2000 },
          ],
        },
        {
          key: 'impact',
          title: 'Impact',
          fields: [
            { key: 'impact', label: 'Expected impact', type: 'textarea', required: true, max_length: 2000 },
            { key: 'pilot_site', label: 'Pilot site', type: 'text', required: false, max_length: 200 },
          ],
        },
      ],
    },
    required_docs: [
      { key: 'business_plan', label: 'Business plan (PDF)', required: true },
      { key: 'budget', label: 'Budget (XLSX)', required: false },
    ],
  },
  {
    challenge_id: YOUTH_DIGITAL_ID,
    challenge_version_id: '21000000-0000-4000-8000-000000000002',
    title: 'Youth Digital Services Challenge 2026',
    status: 'closed',
    closes_at: '2026-09-30T14:00:00Z',
    form_version: 1,
    form_schema: {
      sections: [
        {
          key: 'team',
          title: 'Your team',
          fields: [
            { key: 'team_lead', label: 'Team lead', type: 'text', required: true, max_length: 120 },
            { key: 'team_size', label: 'Team size', type: 'select', required: true, options: ['1', '2–3', '4–6', '7+'] },
          ],
        },
        {
          key: 'service',
          title: 'Your service',
          fields: [
            { key: 'title', label: 'Service name', type: 'text', required: true, max_length: 120 },
            { key: 'users', label: 'Who will use it', type: 'textarea', required: true, max_length: 1500 },
            { key: 'channel', label: 'Main channel', type: 'select', required: true, options: ['Mobile app', 'USSD', 'Web', 'WhatsApp'] },
          ],
        },
      ],
    },
    required_docs: [{ key: 'pitch_deck', label: 'Pitch deck (PDF)', required: true }],
  },
]

export const MOCK_DECLARATION: DeclarationText = {
  version: 'sample-2026-11-v1',
  title: 'Confidentiality and IP declaration',
  body_md:
    '**Sample wording — CEDA will supply the final terms (D-22).**\n\nI confirm the information is accurate, that I have the right to submit this idea, and I understand it will be shared only with CEDA staff assigned to assess it.',
  is_sample: true,
}

/** The seed holds 8 cases, so the first idea submitted in the demo is CEDA-2026-0009 (BCR-001 B10). */
export const FIRST_DEMO_REFERENCE_NUMBER = 9
