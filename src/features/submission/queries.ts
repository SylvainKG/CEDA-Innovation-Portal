import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Read hooks for Slice 1. `null` means "not visible", which includes "does not exist" (contract §1). */
export const submissionKeys = {
  challenges: ['challenges'] as const,
  brief: (slug: string) => ['challenge-brief', slug] as const,
  myIdeas: ['my-ideas'] as const,
  challengeForm: (challengeId: string) => ['challenge-form', challengeId] as const,
  declaration: ['declaration'] as const,
  draft: (proposalId: string) => ['draft', proposalId] as const,
  /** Version 1 shares its key with the receipt that submit puts in the cache. */
  receipt: (proposalId: string, versionNo = 1) => (versionNo === 1 ? (['receipt', proposalId] as const) : (['receipt', proposalId, versionNo] as const)),
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

export function useReceipt(proposalId: string | undefined, versionNo = 1) {
  return useQuery({
    queryKey: submissionKeys.receipt(proposalId ?? '', versionNo),
    queryFn: () => api.submission.getSubmissionReceipt({ proposalId: proposalId as string, versionNo }),
    enabled: Boolean(proposalId),
  })
}

export function useChallenges() {
  return useQuery({ queryKey: submissionKeys.challenges, queryFn: () => api.submission.listChallenges(), staleTime: 60_000 })
}

export function useMyIdeas(enabled = true) {
  return useQuery({ queryKey: submissionKeys.myIdeas, queryFn: () => api.submission.listMyIdeas(), enabled })
}

export function useChallengeBrief(slug: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.brief(slug ?? ''),
    queryFn: () => api.submission.getChallengeBrief(slug as string),
    enabled: Boolean(slug),
    staleTime: 60_000,
  })
}
