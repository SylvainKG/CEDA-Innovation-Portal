/**
 * Toolkit preview catalogue (docs/plans/toolkit-preview/PLAN.md). Static information only: none of these tools is
 * built. The ids match the tool ids in docs/plans/toolkits (I-01 to I-14, R-01 to R-08).
 */
export interface ToolkitTool {
  id: string
  name: string
  description: string
  status: 'planned'
}

export const INNOVATOR_TOOLS: readonly ToolkitTool[] = [
  { id: 'I-01', name: 'Business Budgeter', description: 'Plan costs and income with three scenarios, a monthly forecast and cash flow.', status: 'planned' },
  { id: 'I-02', name: 'Mini CRM', description: 'Keep track of contacts, conversations, reminders and your sales pipeline.', status: 'planned' },
  { id: 'I-03', name: 'Business Model Canvas', description: 'Describe your business on the nine-block canvas and keep versions as it changes.', status: 'planned' },
  { id: 'I-04', name: 'Business Plan Generator', description: 'Bring your canvas, budget and research together into a business plan you can edit and print.', status: 'planned' },
  { id: 'I-05', name: 'Pitch Deck Builder', description: 'Build pitch slides from the information you have already entered.', status: 'planned' },
  { id: 'I-06', name: 'Market Research and Competitor Analyzer', description: 'Compare competitors, describe customer segments and record your sources.', status: 'planned' },
  { id: 'I-07', name: 'Break-Even & Pricing Calculator', description: 'Work out prices, margins and how many sales you need to break even.', status: 'planned' },
  { id: 'I-08', name: 'SWOT Analysis Builder', description: 'List strengths, weaknesses, opportunities and threats in one place.', status: 'planned' },
  { id: 'I-09', name: 'Customer Survey and Validation', description: 'Ask customers about your idea and see a summary of their answers.', status: 'planned' },
  { id: 'I-10', name: 'Business Name and Branding Studio', description: 'Try out business names, colours and a simple brand description.', status: 'planned' },
  { id: 'I-11', name: 'Innovation Roadmap and Milestone Tracker', description: 'Set milestones for your idea and track progress against them.', status: 'planned' },
  { id: 'I-12', name: 'Funding Readiness Checker', description: 'See what a funding application still needs, as a clear checklist.', status: 'planned' },
  { id: 'I-13', name: 'Inventory and Sales Tracker', description: 'Record stock and sales to see what sells and when to restock.', status: 'planned' },
  { id: 'I-14', name: 'AI Business Mentor', description: 'Ask questions about running your business and get guidance with its sources shown.', status: 'planned' },
]

export const REVIEWER_TOOLS: readonly ToolkitTool[] = [
  { id: 'R-01', name: 'Evidence-to-Criteria Mapper', description: "See the applicant's evidence grouped under each scoring criterion.", status: 'planned' },
  { id: 'R-02', name: 'Guided Evaluation Assistant', description: 'Read guidance for each criterion and prompts for the evidence to look for.', status: 'planned' },
  { id: 'R-03', name: 'Financial Analysis Viewer', description: "Read the applicant's budget, pricing and break-even figures in one view.", status: 'planned' },
  { id: 'R-04', name: 'Structured Feedback Builder', description: 'Write feedback as strengths and next steps, starting from templates.', status: 'planned' },
  { id: 'R-05', name: 'Version and Evidence Comparison', description: 'Compare what changed between versions of an idea and its evidence.', status: 'planned' },
  { id: 'R-06', name: 'Reviewer Learning Hub', description: 'Find guidance and good practice for reviewers in one place.', status: 'planned' },
  { id: 'R-07', name: 'Clarification and Question Builder', description: 'Draft clear questions for the applicant, linked to the evidence they concern.', status: 'planned' },
  { id: 'R-08', name: 'Review Workload Manager', description: 'See your assigned reviews, their deadlines and your progress at a glance.', status: 'planned' },
]

/** The four tools each dashboard shows as cards; the dialog lists them all. */
export const INNOVATOR_HIGHLIGHTED = ['I-03', 'I-01', 'I-07', 'I-12'] as const
export const REVIEWER_HIGHLIGHTED = ['R-01', 'R-03', 'R-04', 'R-02'] as const
