import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseFeedback } from './feedback'

describe('Supabase feedback adapter', () => {
  it('sends tasks only with a revision, and reads FORBIDDEN as not visible', async () => {
    const rpcs: { fn: string; args: unknown }[] = []
    const answers: Record<string, { data: unknown; error: unknown }> = {
      request_feedback: { data: { feedback_request_id: 'f1', kind: 'clarification', status: 'action_required', return_stage: 'in_evaluation', due_at: 'x' }, error: null },
      respond_clarification: { data: { feedback_request_id: 'f1', status: 'answered', responded_at: 'y', case_status: 'in_evaluation' }, error: null },
      get_roadmap: { data: null, error: { message: 'FORBIDDEN', hint: 'No access.', details: null } },
    }
    const client = { rpc: async (fn: string, args: unknown) => (rpcs.push({ fn, args }), answers[fn]) } as unknown as SupabaseClient
    const port = createSupabaseFeedback(client)
    await port.requestFeedback({ proposalId: 'p1', kind: 'clarification', message: 'Q', dueAt: 'd', tasks: ['ignored'] })
    await port.requestFeedback({ proposalId: 'p1', kind: 'revision', message: 'M', tasks: ['T1'] })
    await port.respondClarification({ feedbackRequestId: 'f1', text: 'A long enough reply.' })
    expect(await port.getRoadmap('p1')).toBeNull()
    expect(rpcs.slice(0, 3)).toEqual([
      { fn: 'request_feedback', args: { p_proposal_id: 'p1', p_kind: 'clarification', p_message: 'Q', p_due_at: 'd', p_tasks: null } },
      { fn: 'request_feedback', args: { p_proposal_id: 'p1', p_kind: 'revision', p_message: 'M', p_due_at: null, p_tasks: ['T1'] } },
      { fn: 'respond_clarification', args: { p_feedback_request_id: 'f1', p_text: 'A long enough reply.' } },
    ])
  })
})
