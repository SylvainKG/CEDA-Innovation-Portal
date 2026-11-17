import type { ChallengeBrief, ChallengeForm, ChallengeSummary, DeclarationText, MyIdea } from '../types'

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
    opens_at: '2026-09-30T22:00:00Z',
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
    opens_at: '2026-05-31T22:00:00Z',
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

/** Public listing fields for the same two challenges (seed `challenges`). */
export const MOCK_CHALLENGES: ChallengeSummary[] = [
  {
    id: WATER_SMART_ID,
    slug: 'water-smart-agriculture-2026',
    title: 'Water-Smart Agriculture Challenge 2026',
    summary: 'Fictional demo challenge: ideas that help farmers grow more with less water.',
    audience: 'Citizen-owned businesses and individuals (DEMO)',
    status: 'published',
    opens_at: '2026-09-30T22:00:00Z',
    closes_at: '2026-12-31T14:00:00Z',
  },
  {
    id: YOUTH_DIGITAL_ID,
    slug: 'youth-digital-services-2026',
    title: 'Youth Digital Services Challenge 2026',
    summary: 'Fictional demo challenge (closed): digital services built by young entrepreneurs.',
    audience: 'Entrepreneurs aged 18–35 (DEMO)',
    status: 'closed',
    opens_at: '2026-05-31T22:00:00Z',
    closes_at: '2026-09-30T14:00:00Z',
  },
]

/** Applicant A's earlier idea, seed case 0008: in evaluation, so "My ideas" shows two cards in the demo. */
export const MOCK_SEEDED_IDEA: MyIdea = {
  id: '30000000-0000-4000-8000-000000000008',
  reference: 'CEDA-2026-0008',
  title: 'Rainwater tanks for poultry farms',
  status: 'in_evaluation',
  challenge: { id: WATER_SMART_ID, title: 'Water-Smart Agriculture Challenge 2026', closes_at: '2026-12-31T14:00:00Z' },
  updated_at: '2026-11-09T07:40:00Z',
  open_feedback: null,
  stages: [
    { stage: 'submission', at: '2026-11-08T07:40:00Z' },
    { stage: 'review', at: '2026-11-09T07:40:00Z' },
  ],
}

/** Brief, templates and rubric summary per challenge (seed `challenge_versions`, `rubric_criteria`). */
export const MOCK_BRIEFS: Record<string, Omit<ChallengeBrief, 'challenge'>> = {
  [WATER_SMART_ID]: {
    brief_md: '**Fictional demo challenge.** Propose a product or service that reduces water use on Botswana farms.',
    templates: [{ name: 'Proposal template (sample).docx', path: 'water-smart-agriculture-2026/proposal-template.docx' }],
    criteria: [
      { key: 'innovation', label: 'Innovation', weight: 30, guidance: 'How new is the idea for Botswana agriculture?' },
      { key: 'market_potential', label: 'Market potential', weight: 25, guidance: 'Is there a clear customer and demand?' },
      { key: 'feasibility', label: 'Feasibility', weight: 25, guidance: 'Can the team deliver it with the resources described?' },
      { key: 'economic_impact', label: 'Economic impact', weight: 20, guidance: 'Jobs, income and water savings.' },
    ],
  },
  [YOUTH_DIGITAL_ID]: {
    brief_md: '**Fictional demo challenge (closed).** Digital services that young people can use on a phone.',
    templates: [],
    criteria: [
      { key: 'digital_innovation', label: 'Digital innovation', weight: 40, guidance: 'Use of technology to solve the problem.' },
      { key: 'user_reach', label: 'User reach', weight: 30, guidance: 'How many young people will use it?' },
      { key: 'team_capability', label: 'Team capability', weight: 30, guidance: 'Skills and track record of the team.' },
    ],
  },
}
