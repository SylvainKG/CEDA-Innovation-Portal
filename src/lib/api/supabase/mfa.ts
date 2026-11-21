import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, fromRpcError, rpcError } from '../errors'
import type { MfaPort } from '../mfa'

/** Supabase two-step sign-in adapter (T02 MFA, D-07). */
export function createSupabaseMfa(client: SupabaseClient): MfaPort {
  return {
    async status() {
      const { data, error } = await client.rpc('my_access')
      if (error) throw new ApiError('Could not check your sign-in', error)
      if (!data) return null
      const access = data as { is_demo: boolean; roles: string[]; mfa_required: boolean }
      const staff = access.roles.some((r) => r !== 'applicant')
      const factors = await client.auth.mfa.listFactors()
      const enrolled = Boolean(factors.data?.totp?.some((f) => f.status === 'verified'))
      return { required: access.mfa_required, demoExempt: staff && access.is_demo && !access.mfa_required, enrolled }
    },

    async enrol() {
      const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp' })
      if (error || !data) throw new ApiError('Could not start setting up your authenticator app', error)
      return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
    },

    async verify({ factorId, code }) {
      let id = factorId
      if (!id) {
        const factors = await client.auth.mfa.listFactors()
        id = factors.data?.totp?.find((f) => f.status === 'verified')?.id
      }
      if (!id) return fromRpcError(rpcError('INVALID_STATE', 'Set up your authenticator app first.'))
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId: id, code: code.trim() })
      if (error) {
        // A wrong or expired code is a definite refusal; nothing changed.
        if ((error as { status?: number }).status === 422 || /invalid|expired/i.test(error.message))
          return fromRpcError(rpcError('VALIDATION', "That code didn't work. Check the time on your phone and try the newest code.", { code: "That code didn't work" }))
        throw new ApiError('Could not check the code', error)
      }
      return { kind: 'ok', data: { verified: true } }
    },
  }
}
