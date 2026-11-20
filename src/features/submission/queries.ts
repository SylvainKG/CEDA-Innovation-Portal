import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Read hooks for Slice 1. `null` means "not visible", which includes "does not exist" (contract §1). */
export const submissionKeys = {
  challengeForm: (challengeId: string) => ['challenge-form', challengeId] as const,
  declaration: ['declaration'] as const,
  draft: (proposalId: string) => ['draft', proposalId] as const,
  receipt: (proposalId: string) => ['receipt', proposalId] as const,
}

export function useChallengeForm(challengeId: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.challengeForm(challengeId ?? ''),
    queryFn: () => api.submission.getChallengeForm(challengeId as string),
    enabled: Boolean(challengeId),
  })
}

export function useDeclaration() {
  return useQuery({ queryKey: submissionKeys.declaration, queryFn: () => api.submission.getDeclaration(), staleTime: 5 * 60_000 })
}

export function useDraft(proposalId: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.draft(proposalId ?? ''),
    queryFn: () => api.submission.getDraft(proposalId as string),
    enabled: Boolean(proposalId),
  })
}

export function useReceipt(proposalId: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.receipt(proposalId ?? ''),
    queryFn: () => api.submission.getSubmissionReceipt({ proposalId: proposalId as string }),
    enabled: Boolean(proposalId),
  })
}
